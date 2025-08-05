import os
import json
import openai
from typing import Dict, Optional, List, Any
from enum import Enum
from models import JobType


class LlmJobParser:
    """
    LLM-based job parser that uses OpenAI's GPT-3.5 Turbo to extract structured job data.
    This class handles the second stage of parsing, taking pre-processed HTML/text
    and using an LLM to extract key job details.
    """
    
    def __init__(self, test_mode=False):
        # Flag to enable test mode (no API calls)
        self.test_mode = test_mode
        self.client = None
        
        # Only initialize OpenAI client if not in test mode
        if not test_mode:
            try:
                # Initialize OpenAI client with API key from environment variables
                api_key = os.getenv("OPENAI_API_KEY")
                if not api_key:
                    print("WARNING: OPENAI_API_KEY environment variable not set. Using test mode.")
                    self.test_mode = True
                else:
                    self.client = openai.OpenAI(api_key=api_key)
                    self.model = "gpt-3.5-turbo"  # Best balance of performance, cost, and speed for this task
            except Exception as e:
                print(f"Error initializing OpenAI client: {str(e)}. Using test mode.")
                self.test_mode = True
    
    def parse_job_listing(self, parsed_text: Dict[str, Any], url: Optional[str] = None, title: Optional[str] = None,company: Optional[str] = None,location: Optional[str] = None,job_type: Optional[str] = None,portal: Optional[str] = None) -> Dict[str, Any]:
        """
        Parse job listing text using GPT-3.5 Turbo to extract structured job data.
        For known job portals, uses both structured data and content.
        
        Args:
            parsed_text: Dictionary containing parsed HTML data
            url: URL of the job listing (optional)
            title: Title of the job listing page (optional)
            company: Company name (optional)
            location: Location (optional)
            job_type: Job type (optional)
            
        Returns:
            Dictionary containing structured job data
        """        
            
        # Extract company name from URL if not in structured data
        if not company and url:
            company_from_url = self._extract_company_from_url(url)
            if company_from_url:
                company = company_from_url
        
        if isinstance(parsed_text, str):
            parsed_text = {"content": parsed_text}

        if not parsed_text.get("content"):
            # Return basic info if no content to parse
            return {
                "position": title or "Untitled Position",
                "company": company or "Untitled Company",
                "location": location or "Untitled Location",
                "salary": "",
                "job_type": job_type or "Untitled Job Type",
                "description": "",
                "link": url or ""
            }
        
        
        # Create prompt for the LLM
        prompt = self._create_extraction_prompt(parsed_text, url, title, portal, company, location, job_type)
        
        if not self.client:
            print("API key not set or client not initialized. Falling back to test mode.")
            return self._get_mock_job_data(parsed_text, url, title)

        try:
            # Call OpenAI API
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a specialized job listing parser. Extract structured information from job listings accurately."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1,  # Low temperature for more deterministic results
                max_tokens=1000
            )
            
            # Extract and parse the response
            result = response.choices[0].message.content
            
            # Parse the JSON response
            try:
                parsed_data = json.loads(result)
                # Merge with prefilled data, giving preference to LLM results
                result_data = self._normalize_job_data(parsed_data, url, title)
                # For any fields that are empty in the result but present in prefilled_data, use prefilled_data
                for key, value in parsed_text.items():
                    if not result_data.get(key) and value:
                        result_data[key] = value
                return result_data
            except json.JSONDecodeError:
                # If JSON parsing fails, try to extract data using regex or other methods
                fallback_data = self._fallback_extraction(result, url, title)
                # Merge with prefilled data, giving preference to fallback results
                for key, value in parsed_text.items():
                    if not fallback_data.get(key) and value:
                        fallback_data[key] = value
                return fallback_data
                
        except Exception as e:
            print(f"Error calling OpenAI API: {str(e)}")
            # Fallback to mock data on error
            print("Falling back to test mode after API error")
            return self._get_mock_job_data(parsed_text, url, title)

    
    def _extract_company_from_url(self, url: str) -> Optional[str]:
        """Extract company name from URL for known job portals"""
        try:
            parsed_url = urlparse(url)
            domain = parsed_url.netloc.lower()
            
            # For LinkedIn URLs
            if "linkedin.com" in domain:
                path_parts = parsed_url.path.strip('/').split('/')
                if len(path_parts) > 2 and path_parts[0] == 'company':
                    return path_parts[1].replace('-', ' ').title()
                    
            # For other job sites, try to extract from path or query
            company_indicators = ['company', 'employer', 'hiring']
            query_params = parse_qs(parsed_url.query)
            
            for indicator in company_indicators:
                if indicator in query_params:
                    return query_params[indicator][0].replace('-', ' ').replace('_', ' ').title()
                    
            return None
        except:
            return None
    
    def _create_extraction_prompt(self, parsed_data: Dict, url: Optional[str], title: Optional[str], portal: Optional[str] = None, company: Optional[str] = None, location: Optional[str] = None, job_type: Optional[str] = None) -> str:
        """Create a structured prompt for the LLM"""
        context = ""
        if url:
            context += f"URL: {url}\n"
        if title:
            context += f"Page Title: {title}\n"
        if portal:
            context += f"Job Portal: {portal}\n"
        if company:
            context += f"Company: {company}\n"
        if location:
            context += f"Location: {location}\n"
        if job_type:
            context += f"Job Type: {job_type}\n"

        job_description = parsed_data.get("content", "")
            
        # Add any prefilled data to the context
        if company or location or job_type:
            context += "\nPre-extracted information (verify and use if accurate):\n"
            if company:
                context += f"Company: {company}\n"
            if location:
                context += f"Location: {location}\n"
            if job_type:
                context += f"Job Type: {job_type}\n"

        
        prompt = f"""
{context}
Below is the content of a job listing. Please extract the following information in JSON format:

1. Position/Job Title (if available, if not use the job description to provide a propper job title)
2. Company Name
3. Location (city, state, country, or remote)
4. Salary Range (if available)
5. Job Type (full-time, part-time, contract, freelance, internship, temporary, or other)
6. Job Description (summarized in 2-3 sentences)

Important instructions:
- Pay special attention to extracting the company name correctly
- If the company name is not explicitly mentioned, check if it appears in the URL or page title
- For LinkedIn job listings, look for the company name near the job title or in the top card section
- Return all responses in English, even if the original content is in another language
- The 'position' field MUST contain only the job title. Do NOT include work model details like 'remote' or 'hybrid'.
- The 'job_type' field should include the work model (e.g., Remote, Hybrid, On-site) and the employment type (e.g., Full-time, Contract). Combine them if multiple are found.
- You MUST provide a 2-3 sentence summary for the 'description' field. It cannot be empty.

Return ONLY a valid JSON object with the following structure:
{{
    "position": "extracted job title",
    "company": "extracted company name",
    "location": "extracted location",
    "salary": "extracted salary range",
    "job_type": "extracted job type",
    "description": "extracted job description summary"
}}

If any field is not found in the text, use an empty string for that field.

Job Listing Content:
{job_description[:4000]}  # Limit content to avoid token limits
"""
        return prompt
    
    def _normalize_job_data(self, parsed_data: Dict[str, Any], url: Optional[str], title: Optional[str]) -> Dict[str, Any]:
        """Normalize the extracted job data"""
        # Ensure all expected fields are present
        normalized = {
            "position": parsed_data.get("position", title or "Untitled Position"),
            "company": parsed_data.get("company", ""),
            "location": parsed_data.get("location", ""),
            "salary": parsed_data.get("salary", ""),
            "job_type": self._normalize_job_type(parsed_data.get("job_type", "")),
            "description": parsed_data.get("description", ""),
            "link": url or ""
        }
        
        # Use title as fallback for position if empty
        if not normalized["position"] and title:
            normalized["position"] = title
            
        return normalized
    
    def _normalize_job_type(self, job_type_text: str) -> str:
        """Map extracted job type text to JobType enum values"""
        job_type_text = job_type_text.lower()
        
        # Map common variations to standard job types
        if not job_type_text:
            return ""
            
        if "full" in job_type_text and "time" in job_type_text:
            return JobType.FULL_TIME.value
        elif "part" in job_type_text and "time" in job_type_text:
            return JobType.PART_TIME.value
        elif "contract" in job_type_text:
            return JobType.CONTRACT.value
        elif "freelance" in job_type_text:
            return JobType.FREELANCE.value
        elif "intern" in job_type_text:
            return JobType.INTERNSHIP.value
        elif "temp" in job_type_text:
            return JobType.TEMPORARY.value
        else:
            return JobType.OTHER.value
    
    def _fallback_extraction(self, text: str, url: Optional[str], title: Optional[str]) -> Dict[str, Any]:
        """Fallback method to extract data if JSON parsing fails"""
        # Try to extract key-value pairs from the text
        data = {
            "position": title or "Untitled Position",
            "company": "",
            "location": "",
            "salary": "",
            "job_type": "",
            "description": "",
            "link": url or ""
        }
        
        # Simple extraction based on line prefixes
        lines = text.split('\n')
        for line in lines:
            line = line.strip()
            if "position" in line.lower() or "job title" in line.lower():
                parts = line.split(':', 1)
                if len(parts) > 1:
                    data["position"] = parts[1].strip().strip('"')
            elif "company" in line.lower():
                parts = line.split(':', 1)
                if len(parts) > 1:
                    data["company"] = parts[1].strip().strip('"')
            elif "location" in line.lower():
                parts = line.split(':', 1)
                if len(parts) > 1:
                    data["location"] = parts[1].strip().strip('"')
            elif "salary" in line.lower():
                parts = line.split(':', 1)
                if len(parts) > 1:
                    data["salary"] = parts[1].strip().strip('"')
            elif "job type" in line.lower():
                parts = line.split(':', 1)
                if len(parts) > 1:
                    data["job_type"] = self._normalize_job_type(parts[1].strip().strip('"'))
            elif "description" in line.lower():
                parts = line.split(':', 1)
                if len(parts) > 1:
                    data["description"] = parts[1].strip().strip('"')
        
        return data
        
    def _get_mock_job_data(self, text_content: str, url: Optional[str], title: Optional[str]) -> Dict[str, Any]:
        """Generate mock job data for testing or when API is unavailable"""
        # Extract some basic information from the text content
        position = title or "Software Developer"
        
        # Try to extract company name from URL or title
        company = ""
        if url:
            # Try to extract domain name
            try:
                from urllib.parse import urlparse
                domain = urlparse(url).netloc
                if "www." in domain:
                    domain = domain.split("www.")[1]
                if "." in domain:
                    company = domain.split(".")[0].capitalize()
            except:
                pass
        
        if not company and title:
            # Try to extract company from title
            if " at " in title:
                company = title.split(" at ")[1].strip()
            elif " - " in title:
                company = title.split(" - ")[1].strip()
                
        if not company:
            company = "Example Company"
            
        # Generate sample job data
        job_types = ["Full-time", "Part-time", "Contract", "Freelance"]
        locations = ["Remote", "New York, NY", "San Francisco, CA", "London, UK"]
        
        import random
        
        # Extract a snippet of the description from the text content
        description = ""
        if text_content and len(text_content) > 50:
            # Get a random paragraph from the text
            paragraphs = [p for p in text_content.split('\n\n') if len(p) > 30]
            if paragraphs:
                description = random.choice(paragraphs)[:150] + "..."
            else:
                description = text_content[:150] + "..."
        else:
            description = "This is a job opportunity at " + company
            
        return {
            "position": position,
            "company": company,
            "location": random.choice(locations),
            "salary": "$" + str(random.randint(50, 150)) + "K - $" + str(random.randint(150, 200)) + "K",
            "job_type": self._normalize_job_type(random.choice(job_types)),
            "description": description,
            "link": url or ""
        }
