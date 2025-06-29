from bs4 import BeautifulSoup
import re
from typing import Dict, Optional, List, Tuple


class HtmlParser:
    """
    HTML Parser that prepares job listing HTML for LLM processing.
    This class handles the pre-processing stage, extracting and cleaning
    the main content area of job listings.
    """
    
    def __init__(self):
        self.main_content_selectors = [
            # Common job listing content selectors
            ".job-description",
            ".description",
            ".job-details",
            "#job-description",
            ".jobsearch-jobDescriptionText",  # Indeed
            ".description__text",  # LinkedIn
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
    
    def preparse_html(self, html_content: str) -> str:
        """
        Prepares HTML for LLM processing by:
        1. Extracting the main content area
        2. Removing noise elements
        3. Cleaning and formatting the HTML
        4. Converting to optimized text for NLP
        
        Args:
            html_content: Raw HTML content from the job listing page
            
        Returns:
            Cleaned and optimized text content for LLM processing
        """
        if not html_content:
            return ""
        
        try:
            # Parse HTML
            soup = BeautifulSoup(html_content, 'html.parser')
            
            # Remove script and style elements
            for element in soup(["script", "style", "iframe", "noscript"]):
                element.decompose()
            
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
                return ""
            
            # Extract text with preserved structure
            text_content = self._extract_structured_text(main_content)
            
            # Clean up text
            text_content = self._clean_text(text_content)
            
            # Limit content size to avoid token limits
            if len(text_content) > 10000:
                text_content = text_content[:10000]
            
            return text_content
            
        except Exception as e:
            print(f"Error parsing HTML: {str(e)}")
            # Fallback to basic text extraction
            if html_content:
                soup = BeautifulSoup(html_content, 'html.parser')
                return soup.get_text(separator='\n', strip=True)[:5000]
            return ""
    
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
