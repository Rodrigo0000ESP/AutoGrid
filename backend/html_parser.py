from bs4 import BeautifulSoup
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
            "linkedin.com": {
                "container": ".jobs-search__job-details--wrapper",
                "description_container": "article.jobs-description__container",
                "job_details": ".jobs-box__html-content#job-details",
                "job_title": ".job-details-jobs-unified-top-card__job-title",
                "company": ".jobs-unified-top-card__company-name, .job-details-jobs-unified-top-card__company-name, .jobs-company__name",
                "location": ".job-details-jobs-unified-top-card__primary-description-container .job-details-jobs-unified-top-card__bullet, .jobs-unified-top-card__bullet",
                "job_type": ".job-details-jobs-unified-top-card__job-insight, .jobs-unified-top-card__job-insight"
            },
            "indeed.com": {
                "container": ".jobsearch-ViewJobLayout-jobDisplay",
                "description_container": ".jobsearch-JobComponent-description",
                "job_details": ".jobsearch-jobDescriptionText",
                "job_title": ".jobsearch-JobInfoHeader-title",
                "company": ".jobsearch-InlineCompanyRating-companyName",
                "location": ".jobsearch-JobInfoHeader-subtitle .jobsearch-JobInfoHeader-locationName",
                "job_type": ".jobsearch-JobDescriptionSection-sectionItem .jobsearch-JobDescriptionSection-sectionItemKey:contains('Job type') + span"
            },
            "glassdoor.com": {
                "container": ".JobDetails_jobDetailsContainer__y9P3L, .jobView, .jobDescriptionContent, [data-test='jobDesc']",
                "description_container": ".desc, .jobDescriptionContent, [data-test='jobDescriptionContent']",
                "job_details": ".jobDescriptionContent, [data-test='jobDesc']",
                "job_title": ".job-title, [data-test='jobTitle'], .css-1j389vi, .css-17x2pwl",
                "company": ".employer-name, [data-test='employerName'], .css-16nw49e, .css-87uc0g",
                "location": ".location, [data-test='location'], .css-56kyx5, .css-1v5elnn",
                "job_type": ".employment-info-details, [data-test='employmentType'], .css-1v5elnn, .css-1wh2oi2"
            },
            "monster.com": {
                "container": "article[data-testid='JobCard'], .jobview-container-styles__JobViewWrapper-sc-59e1f345-0",
                "description_container": ".indexmodern__DescriptionClamp-sc-9vl52l-38, .jobview-content",
                "job_details": "p[data-testid='SingleDescription'], .job-description",
                "job_title": "h3[data-testid='jobTitle'] a, .job-title",
                "company": "span[data-testid='company'], .name",
                "location": "span[data-testid='jobDetailLocation'], .location",
                "job_type": ".job-type"
            },
            "ziprecruiter.com": {
                "container": ".panel-body, .job-body",
                "description_container": ".job-body, .jobDescriptionContent",
                "job_details": ".wysiwyg, .jobDescriptionContent",
                "job_title": "h1.u-mv--remove, .jobTitle",
                "company": ".text-primary.text-large, .hiring-company",
                "location": ".fa-map-marker-alt + span, .location",
                "job_type": ".fa-hourglass + span, .job-type"
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
            # Determine if this is from a known job portal first
            portal = None
            if url:
                domain = self._extract_domain(url)
                # Map of base names to full domain keys in self.job_platforms
                portal_base_names = {
                    "linkedin": "linkedin.com",
                    "indeed": "indeed.com",
                    "glassdoor": "glassdoor.com",
                    "monster": "monster.com",
                    "ziprecruiter": "ziprecruiter.com"
                }
                
                # First try direct match with domain keys
                for portal_domain in self.job_platforms.keys():
                    if portal_domain in domain:
                        portal = portal_domain
                        break
                
                # If no direct match, try matching with base names
                if not portal:
                    for base_name, full_domain in portal_base_names.items():
                        if base_name in domain:
                            portal = full_domain
                            break
            
            # Parse HTML
            soup = BeautifulSoup(html_content, 'html.parser')
            
            # If it's a known portal, preserve styles and use portal-specific selectors
            if portal:
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
        """Extract domain from URL"""
        try:
            parsed_url = urlparse(url)
            domain = parsed_url.netloc
            if domain.startswith('www.'):
                domain = domain[4:]
            return domain
        except:
            return ""
    
    def _parse_known_portal(self, soup: BeautifulSoup, portal: str) -> Dict[str, str]:
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
        
        # Special handling for LinkedIn
        try:
            if portal == "linkedin.com":
                # First try to find the job description container
                description_container = soup.select_one(platform_selectors.get("description_container", ""))
                
                # Direct extraction of the job description container
                if description_container:
                    # Store the complete HTML of the description container
                    result["html_container"] = str(description_container)
                    result["content"] = description_container.get_text(separator='\n', strip=True)
                    
                    # Try to get the job details section for more specific content
                    job_details = description_container.select_one(platform_selectors.get("job_details", ""))
                    if job_details:
                        result["job_details_html"] = str(job_details)
                    
                    # Extract structured data from the main container
                    container = soup.select_one(platform_selectors.get("container", ""))
                    if container:
                        for field, selector in platform_selectors.items():
                            if field not in ["container", "description_container", "job_details"]:
                                try:
                                    element = container.select_one(selector)
                                    if element:
                                        result["structured_data"][field] = element.get_text(strip=True)
                                except Exception as e:
                                    print(f"Error extracting {field}: {str(e)}")
                    
                    # Limit content size to avoid token limits
                    if len(result["content"]) > 10000:
                        result["content"] = result["content"][:10000]
                        
                    return result
        except Exception as e:
            print(f"Error in LinkedIn special handling: {str(e)}")
            # Continue to default handling
        
        # Default handling for other portals or if LinkedIn special handling failed
        container_selector = platform_selectors.get("container", "")
        container = soup.select_one(container_selector)
        
        if container:
            # Store the HTML of the container
            result["html_container"] = str(container)
            # Also extract text for backward compatibility
            result["content"] = container.get_text(separator='\n', strip=True)
            if len(result["content"]) > 10000:
                result["content"] = result["content"][:10000]
            
            # Extract key elements directly FROM WITHIN THE CONTAINER
            # This ensures we're searching within the container, not the entire document
            for field, selector in platform_selectors.items():
                if field not in ["container", "description_container", "job_details"]:
                    # Search within the container element, not the entire document
                    element = container.select_one(selector)
                    if element:
                        result["structured_data"][field] = element.get_text(strip=True)
        
        return result
    
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
