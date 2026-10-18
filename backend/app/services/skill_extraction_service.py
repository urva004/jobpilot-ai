"""Lightweight deterministic skill extraction used when structured LLM output is unavailable."""

import re
from collections.abc import Iterable


DEFAULT_SKILLS = (
    "Python", "Java", "JavaScript", "TypeScript", "C++", "C#", "Go", "Rust",
    "React", "Next.js", "Node.js", "FastAPI", "Django", "Flask", "Spring",
    "SQL", "PostgreSQL", "MySQL", "MongoDB", "Redis", "ChromaDB",
    "AWS", "Azure", "GCP", "Docker", "Kubernetes", "Terraform", "Git",
    "Machine Learning", "NLP", "LLM", "REST API", "GraphQL", "CI/CD",
)


class SkillExtractionService:
    """Extract known skill terms without requiring an optional model package."""

    def __init__(self, skills: Iterable[str] | None = None):
        self.skills = tuple(skills or DEFAULT_SKILLS)

    def extract_skills(self, text: str) -> list[str]:
        if not text:
            return []

        matches = []
        for skill in self.skills:
            pattern = rf"(?<![\w]){re.escape(skill)}(?![\w])"
            if re.search(pattern, text, flags=re.IGNORECASE):
                matches.append(skill)
        return matches
