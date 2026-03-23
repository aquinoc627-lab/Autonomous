"""
Autonomous — Memory Palace (Vector Database Service)

Provides long-term semantic memory for agents using ChromaDB and Gemini embeddings.
Includes ingestion, storage, and retrieval of missions, banter, and code.
"""

import logging
import os
import uuid
import chromadb
from chromadb.config import Settings
from typing import List, Dict, Any, Optional
from google import genai
from google.genai import types

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Memory Configuration
# ---------------------------------------------------------------------------
CHROMA_DB_PATH = os.path.join(os.getcwd(), "data", "chroma")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# Initialize Gemini client for embeddings
client = genai.Client(api_key=GEMINI_API_KEY) if GEMINI_API_KEY else None

class MemoryPalace:
    """
    A persistent, semantic memory service for agents.
    """
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(MemoryPalace, cls).__new__(cls)
            cls._instance._init_db()
        return cls._instance

    def _init_db(self):
        """
        Initialize the ChromaDB client and collections.
        """
        os.makedirs(CHROMA_DB_PATH, exist_ok=True)
        self.chroma_client = chromadb.PersistentClient(path=CHROMA_DB_PATH)
        
        # Create or get collections
        self.missions_collection = self.chroma_client.get_or_create_collection(name="missions")
        self.banter_collection = self.chroma_client.get_or_create_collection(name="banter")
        self.code_collection = self.chroma_client.get_or_create_collection(name="code")

    async def _get_embedding(self, text: str) -> List[float]:
        """
        Generate a vector embedding for the given text using Gemini.
        """
        if not client:
            logger.warning("Gemini API key not set. Cannot generate embeddings.")
            return []

        try:
            response = client.models.embed_content(
                model="text-embedding-004",
                contents=text
            )
            return response.embeddings[0].values
        except Exception as e:
            logger.error(f"Error generating embedding: {str(e)}")
            return []

    async def store_memory(self, collection_name: str, text: str, metadata: Dict[str, Any]):
        """
        Store a new memory in the specified collection.
        """
        embedding = await self._get_embedding(text)
        if not embedding:
            return

        collection = getattr(self, f"{collection_name}_collection", None)
        if not collection:
            logger.error(f"Collection '{collection_name}' not found.")
            return

        memory_id = str(uuid.uuid4())
        collection.add(
            ids=[memory_id],
            embeddings=[embedding],
            documents=[text],
            metadatas=[metadata]
        )
        logger.info(f"Stored memory in '{collection_name}': {memory_id}")

    async def recall_memories(self, collection_name: str, query_text: str, n_results: int = 3) -> List[Dict[str, Any]]:
        """
        Retrieve the most relevant memories for the given query.
        """
        embedding = await self._get_embedding(query_text)
        if not embedding:
            return []

        collection = getattr(self, f"{collection_name}_collection", None)
        if not collection:
            logger.error(f"Collection '{collection_name}' not found.")
            return []

        results = collection.query(
            query_embeddings=[embedding],
            n_results=n_results
        )

        memories = []
        if results["documents"]:
            for i in range(len(results["documents"][0])):
                memories.append({
                    "text": results["documents"][0][i],
                    "metadata": results["metadatas"][0][i],
                    "distance": results["distances"][0][i]
                })
        
        return memories

# Singleton instance
memory_palace = MemoryPalace()
