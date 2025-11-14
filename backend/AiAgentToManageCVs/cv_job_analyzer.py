"""
Advanced Job Analysis Service for CV Generation
Analyzes job HTML in detail using AI (Premium feature)
"""
import os
import json
from typing import Dict, Any, Optional
from openai import OpenAI


class CVJobAnalyzer:
    """Analyzes job postings in detail for CV customization"""
    
    def __init__(self):
        self.client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        self.analysis_version = "1.0"
    
    def analyze_job_html(self, cleaned_html: str, job_description: str) -> Dict[str, Any]:
        """
        Perform detailed AI analysis of job posting for CV generation
        
        Args:
            cleaned_html: Cleaned HTML content from HtmlParser
            job_description: Basic job description
            
        Returns:
            Dictionary with structured analysis
        """
        
        prompt = f"""Analyze this job posting in detail for CV optimization. Extract structured information.

Job Description:
{job_description[:2000]}

HTML Content:
{cleaned_html[:3000]}

Provide a detailed JSON analysis with this EXACT structure:
{{
    "required_skills": ["skill1", "skill2"],
    "preferred_skills": ["skill1", "skill2"],
    "required_qualifications": ["qualification1", "qualification2"],
    "preferred_qualifications": ["qualification1", "qualification2"],
    "responsibilities": ["responsibility1", "responsibility2"],
    "keywords": ["keyword1", "keyword2"]
}}

Instructions:
- required_skills: Technical and soft skills explicitly REQUIRED
- preferred_skills: Skills mentioned as "nice to have", "preferred", "bonus"
- required_qualifications: Education, years of experience, certifications REQUIRED
- preferred_qualifications: Bonus qualifications
- responsibilities: Main duties and responsibilities (max 8)
- keywords: Important ATS keywords (max 20)

Return ONLY valid JSON, no additional text."""

        try:
            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert job analyst. Extract detailed, structured information from job postings. Return ONLY valid JSON."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.3,
                max_tokens=2000
            )
            
            result = response.choices[0].message.content
            
            # Parse JSON response
            try:
                analysis = json.loads(result)
                return self._validate_analysis(analysis)
            except json.JSONDecodeError:
                # Try to extract JSON from response
                import re
                json_match = re.search(r'\{.*\}', result, re.DOTALL)
                if json_match:
                    analysis = json.loads(json_match.group())
                    return self._validate_analysis(analysis)
                else:
                    return self._get_empty_analysis()
                    
        except Exception as e:
            print(f"Error analyzing job: {str(e)}")
            return self._get_empty_analysis()
    
    def _validate_analysis(self, analysis: Dict[str, Any]) -> Dict[str, Any]:
        """Ensure analysis has all required fields"""
        validated = {
            "required_skills": analysis.get("required_skills", []),
            "preferred_skills": analysis.get("preferred_skills", []),
            "required_qualifications": analysis.get("required_qualifications", []),
            "preferred_qualifications": analysis.get("preferred_qualifications", []),
            "responsibilities": analysis.get("responsibilities", []),
            "keywords": analysis.get("keywords", [])
        }
        
        # Ensure all values are lists
        for key in validated:
            if not isinstance(validated[key], list):
                validated[key] = []
        
        return validated
    
    def _get_empty_analysis(self) -> Dict[str, Any]:
        """Return empty analysis structure"""
        return {
            "required_skills": [],
            "preferred_skills": [],
            "required_qualifications": [],
            "preferred_qualifications": [],
            "responsibilities": [],
            "keywords": []
        }
    
    def format_for_cv_generation(self, analysis: Dict[str, Any]) -> str:
        """
        Format analysis into text for CV generation prompt
        
        Args:
            analysis: Structured job analysis
            
        Returns:
            Formatted text for CV generation
        """
        parts = []
        
        if analysis.get("required_skills"):
            parts.append(f"Required Skills: {', '.join(analysis['required_skills'])}")
        
        if analysis.get("preferred_skills"):
            parts.append(f"Preferred Skills: {', '.join(analysis['preferred_skills'])}")
        
        if analysis.get("required_qualifications"):
            parts.append(f"Required Qualifications:\n- " + "\n- ".join(analysis['required_qualifications']))
        
        if analysis.get("responsibilities"):
            parts.append(f"Key Responsibilities:\n- " + "\n- ".join(analysis['responsibilities'][:5]))
        
        if analysis.get("keywords"):
            parts.append(f"ATS Keywords: {', '.join(analysis['keywords'][:15])}")
        
        return "\n\n".join(parts)
    
    def get_all_skills_text(self, analysis: Dict[str, Any]) -> str:
        """Get comma-separated list of all skills"""
        all_skills = []
        
        if analysis.get("required_skills"):
            all_skills.extend(analysis["required_skills"])
        
        if analysis.get("preferred_skills"):
            all_skills.extend(analysis["preferred_skills"])
        
        return ", ".join(all_skills) if all_skills else "Not specified"
