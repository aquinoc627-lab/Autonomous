import aiohttp
from bs4 import BeautifulSoup
from typing import List, Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)

class ToolService:
    """
    Service for providing agents with real-world tools like web search and content fetching.
    """

    @staticmethod
    async def web_search(query: str, limit: int = 5) -> List[Dict[str, str]]:
        """
        Simulate a web search using a public search API or scraping.
        For this implementation, we'll use a mock search that returns relevant results.
        In a production environment, this would call Google Search API, Bing, or Serper.
        """
        logger.info(f"Performing web search for: {query}")
        
        # Mock search results for demonstration
        # In a real app, you'd use an async HTTP client against a search API.
        mock_results = [
            {
                "title": f"Latest news on {query}",
                "url": f"https://news.example.com/search?q={query}",
                "snippet": f"This is a summary of the latest developments regarding {query}. Significant progress has been made in the field recently."
            },
            {
                "title": f"Understanding {query}: A Comprehensive Guide",
                "url": f"https://guide.example.com/{query.replace(' ', '-')}",
                "snippet": f"Everything you need to know about {query}, from basic concepts to advanced applications and future trends."
            },
            {
                "title": f"Top 10 facts about {query}",
                "url": f"https://facts.example.com/{query.replace(' ', '-')}",
                "snippet": f"Discover the most interesting and surprising facts about {query} that you probably didn't know."
            }
        ]
        
        return mock_results[:limit]

    @staticmethod
    async def fetch_content(url: str) -> Optional[str]:
        """
        Fetch and extract the main text content from a given URL.
        Uses aiohttp for non-blocking async I/O to avoid stalling the event loop.
        """
        logger.info(f"Fetching content from: {url}")
        try:
            # Basic sanitization
            if not url.startswith(("http://", "https://")):
                return "Error: Invalid URL protocol. Must be http or https."

            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
            }
            async with aiohttp.ClientSession() as session:
                async with session.get(url, timeout=aiohttp.ClientTimeout(total=10), headers=headers) as response:
                    response.raise_for_status()
                    html = await response.text()

            soup = BeautifulSoup(html, 'html.parser')
            
            # Remove script and style elements
            for script in soup(["script", "style"]):
                script.decompose()

            # Get text and clean up whitespace
            text = soup.get_text()
            lines = (line.strip() for line in text.splitlines())
            chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
            text = '\n'.join(chunk for chunk in chunks if chunk)
            
            # Limit content length for LLM processing
            return text[:5000]
            
        except Exception as e:
            logger.error(f"Error fetching content from {url}: {str(e)}")
            return f"Error: Failed to fetch content. {str(e)}"

    @staticmethod
    async def summarize(text: str, max_length: int = 500) -> str:
        """
        Summarize a given text. This is a placeholder for a more advanced summarization tool.
        The actual summarization will be handled by the Agent Brain (Gemini).
        """
        if len(text) <= max_length:
            return text
        return text[:max_length] + "..."

# Registry of available tools for the Agent Brain
AVAILABLE_TOOLS = {
    "web_search": {
        "description": "Search the internet for real-time information, news, or facts.",
        "parameters": {"query": "string (The search query string)"}
    },
    "fetch_content": {
        "description": "Retrieve the text content from a specific URL for analysis.",
        "parameters": {"url": "string (The full URL to fetch content from)"}
    }
}
