from bs4 import BeautifulSoup, Comment
import re
from typing import Dict, Optional, List, Tuple
from urllib.parse import urlparse

class HtmlParser:
    """
    HTML Parser that prepares job listing HTML for LLM processing.
    This class handles the pre-processing stage, extracting and cleaning
    the main content area of job listings.
    """
    
    def __init__(self):
        # Job containers and key element selectors for top job platforms
        self.job_platforms = {
            "linkedin": {
                "container": ".jobs-search__job-details--wrapper",
                "description_container": "article.jobs-description__container",
                "job_details": ".jobs-box__html-content#job-details",
                "job_title": "h2.t-16.t-black.t-bold.truncate, .text-heading-large",
                "company": ".t-14.truncate",
                "location": ".t-14.truncate",
                "job_type": ".t-14.truncate",
            },
            "indeed": {
                "container": ".jobsearch-ViewJobLayout-jobDisplay",
                "description_container": ".jobsearch-JobComponent-description",
                "job_details": ".jobsearch-jobDescriptionText",
                "job_title": ".jcs-JobTitle css-1baag51 eu4oa1w0",
                "company": ".jobsearch-InlineCompanyRating-companyName",
                "location": ".css-fa4tq9 eu4oa1w0",
                "job_type": ".jobsearch-JobDescriptionSection-sectionItem .jobsearch-JobDescriptionSection-sectionItemKey:contains('Job type') + span"
            },
            "glassdoor": {
                "container": ".JobDetails_jobDetailsContainer__y9P3L, .jobView, .jobDescriptionContent, [data-test='jobDesc']",
                "description_container": ".JobDetails_jobDescription__uW_fK, .JobDetails_blurDescription__vN7nh",
                "job_details": ".JobDetails_jobDescription__uW_fK, .JobDetails_blurDescription__vN7nh",
                "job_title": ".JobCard_jobTitle__GLyJ1",
                "company": ".employer-name, [data-test='employerName'], .css-16nw49e, .css-87uc0g",
                "location": ".JobCard_location__Ds1fM",
                "job_type": ".employment-info-details, [data-test='employmentType'], .css-1v5elnn, .css-1wh2oi2"
            },
            "ziprecruiter": {
                "container": ".panel-body, .job-body",
                "description_container": ".panel-body",
                "job_details": "",
                "job_title": "",
                "company": "",
                "location": "",
                "job_type": ""
            }
        }
        
        # Generic selectors for other job sites
        self.main_content_selectors = [
            # Common job listing content selectors
            ".job-description",
            ".description",
            ".job-details",
            "#job-description",
            ".job-content",
            "article",
            "main",
            # Fallback to broader content areas
            ".content", 
            "#content",
            ".container"
        ]
        
        # Elements that are typically noise in job listings
        self.noise_selectors = [
            "header", "footer", "nav", 
            ".sidebar", ".related-jobs", 
            ".advertisement", ".ads", 
            ".cookie-banner", ".popup",
            ".social-share", ".apply-button",
            ".similar-jobs", ".job-alert"
        ]
    
    def preparse_html(self, html_content: str, url: Optional[str] = None) -> Dict[str, str]:
        """
        For LinkedIn: Simply extracts the job container with class 'jobs-search__job-details--wrapper'
        For other sites: Extracts and cleans the main content area
        
        Args:
            html_content: Raw HTML content from the job listing page
            url: URL of the job listing page
            
        Returns:
            Dictionary with portal info, content text, and HTML container (for LinkedIn)
        """
        if not html_content:
            return {"content": "", "portal": None}
        
        try:
            # Create BeautifulSoup object
            soup = BeautifulSoup(html_content, 'html.parser')
            
            # Determine if this is from a known job portal
            portal = None
            if url:
                # _extract_domain now returns the base portal name if known
                portal = self._extract_domain(url)
                
                # If we got a base portal name, use its specific parser
                if portal and portal in self.job_platforms:
                    # For known portals, only remove script, iframe and noscript elements
                    # but preserve style elements to maintain CSS classes
                    for element in soup(["script", "iframe", "noscript"]):
                        element.decompose()
                    return self._parse_known_portal(soup, portal)
            
            # For generic portals, remove all non-essential elements including styles
            for element in soup(["script", "style", "iframe", "noscript"]):
                element.decompose()
                
            # Use the generic approach
            return self._parse_generic_portal(soup)
            
        except Exception as e:
            print(f"Error parsing HTML: {str(e)}")
            # Fallback to basic text extraction
            if html_content:
                # Create a simple fallback response with the raw HTML content (truncated)
                soup = BeautifulSoup(html_content, 'html.parser')
                return {"content": soup.get_text(separator='\n', strip=True)[:5000], "portal": None}
            return {"content": "", "portal": None}
    
    def _extract_structured_text(self, element) -> str:
        """
        Extracts text from HTML while preserving some structure.
        Converts important HTML elements to markdown-like format.
        """
        result = []
        
        # Process headings, paragraphs, lists, etc.
        for child in element.children:
            if child.name is None:  # Text node
                text = child.string
                if text and text.strip():
                    result.append(text.strip())
            
            elif child.name in ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']:
                # Convert headings to markdown-style
                level = int(child.name[1])
                prefix = '#' * level
                result.append(f"\n{prefix} {child.get_text(strip=True)}\n")
            
            elif child.name == 'p':
                result.append(f"\n{child.get_text(strip=True)}\n")
            
            elif child.name in ['ul', 'ol']:
                result.append(self._process_list(child))
            
            elif child.name == 'div':
                # Recursively process div content
                result.append(self._extract_structured_text(child))
            
            elif child.name in ['br', 'hr']:
                result.append("\n")
            
            elif child.name == 'strong' or child.name == 'b':
                result.append(f"**{child.get_text(strip=True)}**")
            
            elif child.name == 'a':
                text = child.get_text(strip=True)
                href = child.get('href', '')
                if text and href:
                    result.append(f"{text} ({href})")
                elif text:
                    result.append(text)
        
        return "\n".join(result)
    
    def _process_list(self, list_element) -> str:
        """Process ul/ol elements to preserve list structure"""
        result = ["\n"]
        
        for i, item in enumerate(list_element.find_all('li', recursive=False)):
            prefix = "- " if list_element.name == 'ul' else f"{i+1}. "
            text = item.get_text(strip=True)
            result.append(f"{prefix}{text}\n")
        
        return "".join(result)
    
    def _clean_text(self, text: str) -> str:
        """Clean up extracted text"""
        # Replace multiple newlines with double newline
        text = re.sub(r'\n{3,}', '\n\n', text)
        
        # Replace multiple spaces with single space
        text = re.sub(r' {2,}', ' ', text)
        
        # Fix spacing after punctuation
        text = re.sub(r'([.!?])([A-Za-z])', r'\1 \2', text)
        
        return text.strip()
        
    def _extract_domain(self, url: str) -> str:
        """
        Extracts the portal name from a URL by checking against a list of known job platforms.
        Handles various subdomains and TLDs (e.g., 'es.indeed.com' -> 'indeed').
        """
        try:
            parsed_url = urlparse(url)
            # e.g., 'es.indeed.com' from 'https://es.indeed.com/jobs?q=python'
            domain = parsed_url.netloc.lower()

            # Split the domain into parts
            domain_parts = domain.split('.')

            # Check if any part of the domain matches a known platform
            for part in domain_parts:
                if part in self.job_platforms:
                    return part

            # If no match is found, return the second-to-last part as a fallback (e.g., 'google' from 'jobs.google.com')
            if len(domain_parts) >= 2:
                return domain_parts[-2]

            # Otherwise, return the full domain
            return domain

            
        except Exception as e:
            print(f"Error extracting domain from {url}: {str(e)}")
            return ""
    
    def _parse_known_portal(self, soup: BeautifulSoup, portal: str) -> Dict[str, any]:
        """Extract job container and key elements for known portals"""
        result = {
            "portal": portal, 
            "content": "", 
            "html_container": "",
            "structured_data": {}
        }
        
        # Get the selectors for this portal
        platform_selectors = self.job_platforms.get(portal, {})
        if not platform_selectors:
            return self._parse_generic_portal(soup)
        
        description_container = soup.select_one(platform_selectors.get("description_container", ""))
        if description_container:
            # Clean up the description container HTML
            for comment in description_container.find_all(string=lambda text: isinstance(text, Comment)):
                comment.extract()
            
            # Remove empty elements and script/style tags
            for element in description_container.find_all():
                # Remove comments
                if isinstance(element, Comment):
                    element.extract()
                # Remove empty elements
                elif not element.get_text(strip=True) and not element.find(True):
                    element.decompose()
            
            # Clean up whitespace in text nodes
            for text_node in description_container.find_all(string=True):
                if text_node.strip() == '':
                    text_node.extract()
                else:
                    text_node.replace_with(' '.join(text_node.split()))
            
            # Store the cleaned HTML
            result["html_container"] = str(description_container)
            
            # Get clean text content
            result["content"] = description_container.get_text(separator='\n', strip=True)
            
            # Extract structured data from the entire document
            # Extract job title
            title_elem = soup.select_one(platform_selectors.get("job_title", ""))
            if title_elem:
                result["structured_data"]["job_title"] = title_elem.get_text(strip=True)
            
            # Extract company and location (they might be in the same element)
            company_elem = soup.select_one(platform_selectors.get("company", ""))
            if company_elem:
                company_text = company_elem.get_text(strip=True)
                # If company and location are in the same element, split them
                if '·' in company_text:
                    company_parts = [p.strip() for p in company_text.split('·', 1)]
                    result["structured_data"]["company"] = company_parts[0]
                    if len(company_parts) > 1:
                        result["structured_data"]["location"] = company_parts[1]
                else:
                    result["structured_data"]["company"] = company_text
            
            # Extract location if not already extracted
            if "location" not in result["structured_data"]:
                location_elem = soup.select_one(platform_selectors.get("location", ""))
                if location_elem:
                    result["structured_data"]["location"] = location_elem.get_text(strip=True)
            
            # Extract job type if available
            job_type_elem = soup.select_one(platform_selectors.get("job_type", ""))
            if job_type_elem:
                result["structured_data"]["job_type"] = job_type_elem.get_text(strip=True)
            
            # Try to get the job details section for more specific content
            job_details = description_container.select_one(platform_selectors.get("job_details", ""))
            if job_details:
                # Clean up job details HTML
                for comment in job_details.find_all(string=lambda text: isinstance(text, Comment)):
                    comment.extract()
                result["job_details_html"] = str(job_details)
            
            return result
        # Fallback for other known portals that don't have specific parsing logic yet
        else:
            return self._parse_generic_portal(soup)
    
    def _parse_generic_portal(self, soup: BeautifulSoup) -> Dict[str, str]:
        """Parse HTML from a generic job portal"""
        # Remove noise elements
        for selector in self.noise_selectors:
            for element in soup.select(selector):
                element.decompose()
        
        # Try to find the main content area
        main_content = None
        for selector in self.main_content_selectors:
            main_content = soup.select_one(selector)
            if main_content and len(main_content.get_text(strip=True)) > 200:
                break
        
        # If no main content found, use body
        if not main_content or len(main_content.get_text(strip=True)) < 200:
            main_content = soup.body
        
        if not main_content:
            return {"content": "", "portal": None}
        
        # Extract text with preserved structure
        text_content = self._extract_structured_text(main_content)
        
        # Clean up text
        text_content = self._clean_text(text_content)
        
        # Limit content size to avoid token limits
        if len(text_content) > 10000:
            text_content = text_content[:10000]
        
        return {"content": text_content, "portal": None}
