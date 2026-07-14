import os
import json
import math

class ChromaService:
    _db_path = None
    _memory_db = {}  # Cache of {doc_id: vector}

    @classmethod
    def _get_db_path(cls):
        if cls._db_path is None:
            current_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            cls._db_path = os.path.join(current_dir, "vector_store.json")
        return cls._db_path

    @classmethod
    def _load_db(cls):
        path = cls._get_db_path()
        if os.path.exists(path):
            try:
                with open(path, "r") as f:
                    cls._memory_db = json.load(f)
            except Exception as e:
                print(f"Error loading vector store file: {str(e)}")
                cls._memory_db = {}
        else:
            cls._memory_db = {}

    @classmethod
    def upsert_vector(cls, doc_id: str, vector: list[float], metadata: dict = None) -> bool:
        if not cls._memory_db:
            cls._load_db()
            
        cls._memory_db[doc_id] = vector
        
        # Persist to disk
        path = cls._get_db_path()
        try:
            with open(path, "w") as f:
                json.dump(cls._memory_db, f)
            return True
        except Exception as e:
            print(f"Error writing vector store file: {str(e)}")
            return False

    @classmethod
    def get_vector(cls, doc_id: str) -> list[float] | None:
        if not cls._memory_db:
            cls._load_db()
        return cls._memory_db.get(doc_id)

    @staticmethod
    def compute_cosine_similarity(v1: list[float], v2: list[float]) -> float:
        if not v1 or not v2 or len(v1) != len(v2):
            return 0.0
        
        dot_product = sum(a * b for a, b in zip(v1, v2))
        mag1 = math.sqrt(sum(a * a for a in v1))
        mag2 = math.sqrt(sum(b * b for b in v2))
        
        if not mag1 or not mag2:
            return 0.0
            
        return dot_product / (mag1 * mag2)
