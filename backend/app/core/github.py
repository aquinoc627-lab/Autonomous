"""
Autonomous — GitHub API Integration

Provides a bridge for agents to interact with GitHub repositories.
Includes repository analysis, file fetching, and Pull Request generation.
"""

import logging
import os
import aiohttp
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# GitHub Configuration
# ---------------------------------------------------------------------------
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN", "")
GITHUB_API_URL = "https://api.github.com"

class GitHubBridge:
    """
    A bridge for interacting with GitHub repositories.
    """

    @staticmethod
    async def _request(method: str, endpoint: str, data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Make an authenticated request to the GitHub API.
        """
        if not GITHUB_TOKEN:
            logger.warning("GitHub Token not provided. API calls will be unauthenticated.")

        headers = {
            "Accept": "application/vnd.github.v3+json",
            "Authorization": f"token {GITHUB_TOKEN}" if GITHUB_TOKEN else ""
        }

        async with aiohttp.ClientSession() as session:
            async with session.request(method, f"{GITHUB_API_URL}/{endpoint}", json=data, headers=headers) as response:
                if response.status >= 400:
                    error_msg = await response.text()
                    logger.error(f"GitHub API Error ({response.status}): {error_msg}")
                    return {"error": f"GitHub API Error ({response.status})", "details": error_msg}
                return await response.json()

    @classmethod
    async def fetch_repo_contents(cls, owner: str, repo: str, path: str = "") -> List[Dict[str, Any]]:
        """
        List contents of a repository path.
        """
        endpoint = f"repos/{owner}/{repo}/contents/{path}"
        return await cls._request("GET", endpoint)

    @classmethod
    async def fetch_file_content(cls, owner: str, repo: str, path: str) -> str:
        """
        Fetch the raw content of a file.
        """
        endpoint = f"repos/{owner}/{repo}/contents/{path}"
        result = await cls._request("GET", endpoint)
        if "content" in result:
            import base64
            return base64.b64decode(result["content"]).decode()
        return ""

    @classmethod
    async def create_pull_request(cls, owner: str, repo: str, title: str, body: str, head: str, base: str = "main") -> Dict[str, Any]:
        """
        Create a new Pull Request.
        """
        endpoint = f"repos/{owner}/{repo}/pulls"
        data = {
            "title": title,
            "body": body,
            "head": head,
            "base": base
        }
        return await cls._request("POST", endpoint, data)

    @classmethod
    async def create_branch(cls, owner: str, repo: str, branch_name: str, base_branch: str = "main") -> Dict[str, Any]:
        """
        Create a new branch from a base branch.
        """
        # 1. Get the SHA of the base branch
        endpoint = f"repos/{owner}/{repo}/git/ref/heads/{base_branch}"
        base_ref = await cls._request("GET", endpoint)
        if "object" not in base_ref:
            return {"error": "Could not find base branch SHA"}
        
        sha = base_ref["object"]["sha"]

        # 2. Create the new branch
        endpoint = f"repos/{owner}/{repo}/git/refs"
        data = {
            "ref": f"refs/heads/{branch_name}",
            "sha": sha
        }
        return await cls._request("POST", endpoint, data)

    @classmethod
    async def commit_file(cls, owner: str, repo: str, path: str, content: str, message: str, branch: str) -> Dict[str, Any]:
        """
        Commit a file to a specific branch.
        """
        import base64
        
        # 1. Get the current file SHA (if it exists)
        endpoint = f"repos/{owner}/{repo}/contents/{path}?ref={branch}"
        current_file = await cls._request("GET", endpoint)
        sha = current_file.get("sha")

        # 2. Commit the new content
        endpoint = f"repos/{owner}/{repo}/contents/{path}"
        data = {
            "message": message,
            "content": base64.b64encode(content.encode()).decode(),
            "branch": branch
        }
        if sha:
            data["sha"] = sha
            
        return await cls._request("PUT", endpoint, data)
