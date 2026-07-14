import re
import uuid
import hashlib
import requests
import datetime
from sqlalchemy.orm import Session
from app.config import ADZUNA_APP_ID, ADZUNA_APP_KEY, RAPIDAPI_KEY
from app.models import Job

# Helper to clean HTML tags from string
def clean_html(text: str) -> str:
    if not text:
        return ""
    clean = re.sub(r'<[^<]+?>', '', text)
    clean = clean.replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">").replace("&quot;", '"')
    return clean.strip()

# Helper to generate a deterministic UUID based on title and company
def generate_job_id(title: str, company: str) -> str:
    normalized = f"{title.lower().strip()}|{company.lower().strip()}"
    return hashlib.md5(normalized.encode('utf-8')).hexdigest()

def get_country_code(location: str) -> str:
    loc = location.lower() if location else ""
    if "united states" in loc or "us" == loc or "usa" in loc or "california" in loc or "new york" in loc:
        return "us"
    if "united kingdom" in loc or "uk" == loc or "london" in loc:
        return "gb"
    if "canada" in loc or "ca" == loc:
        return "ca"
    return "in"

class JobService:
    @staticmethod
    def fetch_adzuna_jobs(keywords: str, location: str, remote: bool) -> list[dict]:
        if not ADZUNA_APP_ID or not ADZUNA_APP_KEY:
            print("Adzuna credentials missing. Skipping Adzuna search.")
            return []

        country = get_country_code(location)
        url = f"https://api.adzuna.com/v1/api/jobs/{country}/search/1"
        
        params = {
            "app_id": ADZUNA_APP_ID,
            "app_key": ADZUNA_APP_KEY,
            "what": keywords,
            "results_per_page": 15,
            "content-type": "application/json"
        }
        
        if location:
            params["where"] = location
        if remote:
            params["what"] = f"{keywords} remote"

        try:
            response = requests.get(url, params=params, timeout=10)
            if response.status_code == 403 or response.status_code == 401:
                print("Adzuna API key is invalid or rate limited.")
                return []
            response.raise_for_status()
            data = response.json()
            
            results = data.get("results", [])
            normalized_jobs = []
            
            for item in results:
                title = clean_html(item.get("title", ""))
                company = clean_html(item.get("company", {}).get("display_name", ""))
                if not title or not company:
                    continue
                
                item_loc = item.get("location", {}).get("display_name", "")
                is_remote_loc = "remote" in item_loc.lower() or remote
                
                sal_min = item.get("salary_min")
                sal_max = item.get("salary_max")
                salary_range = "Not Specified"
                if sal_min and sal_max:
                    salary_range = f"{int(sal_min):,} - {int(sal_max):,} INR" if country == "in" else f"${int(sal_min):,} - ${int(sal_max):,}"
                elif sal_min:
                    salary_range = f"{int(sal_min):,}+"
                
                normalized_jobs.append({
                    "id": generate_job_id(title, company),
                    "source": "adzuna",
                    "title": title,
                    "company": company,
                    "location": item_loc,
                    "remote": is_remote_loc,
                    "salary_range": salary_range,
                    "description": clean_html(item.get("description", "")),
                    "apply_url": item.get("redirect_url", ""),
                    "fetched_at": datetime.datetime.utcnow()
                })
            return normalized_jobs
        except Exception as e:
            print(f"Error fetching from Adzuna: {str(e)}")
            return []

    @staticmethod
    def fetch_jsearch_jobs(keywords: str, location: str, remote: bool) -> list[dict]:
        if not RAPIDAPI_KEY:
            print("RapidAPI key missing. Skipping JSearch.")
            return []

        url = "https://jsearch.p.rapidapi.com/search"
        headers = {
            "x-rapidapi-key": RAPIDAPI_KEY,
            "x-rapidapi-host": "jsearch.p.rapidapi.com"
        }
        
        query = keywords
        if location:
            query += f" in {location}"
        if remote:
            query += " remote"
            
        params = {
            "query": query,
            "num_pages": 1,
            "page": 1
        }
        
        try:
            response = requests.get(url, headers=headers, params=params, timeout=10)
            if response.status_code == 403 or response.status_code == 401:
                print("RapidAPI JSearch key is invalid or rate limited.")
                return []
            response.raise_for_status()
            data = response.json()
            
            results = data.get("data", [])
            normalized_jobs = []
            
            for item in results:
                title = clean_html(item.get("job_title", ""))
                company = clean_html(item.get("employer_name", ""))
                if not title or not company:
                    continue
                
                city = item.get("job_city")
                state = item.get("job_state")
                country = item.get("job_country")
                loc_parts = [p for p in [city, state, country] if p]
                item_loc = ", ".join(loc_parts) if loc_parts else "Not Specified"
                
                is_remote = item.get("job_is_remote", False) or remote
                
                min_sal = item.get("job_min_salary")
                max_sal = item.get("job_max_salary")
                currency = item.get("job_salary_currency", "USD")
                salary_range = "Not Specified"
                if min_sal and max_sal:
                    salary_range = f"{int(min_sal):,} - {int(max_sal):,} {currency}"
                
                normalized_jobs.append({
                    "id": generate_job_id(title, company),
                    "source": "jsearch",
                    "title": title,
                    "company": company,
                    "location": item_loc,
                    "remote": is_remote,
                    "salary_range": salary_range,
                    "description": clean_html(item.get("job_description", "")),
                    "apply_url": item.get("job_apply_link", ""),
                    "fetched_at": datetime.datetime.utcnow()
                })
            return normalized_jobs
        except Exception as e:
            print(f"Error fetching from JSearch: {str(e)}")
            return []

    @staticmethod
    def get_mock_jobs(keywords: str, location: str, remote: bool) -> list[dict]:
        print("Using mock fallback job search results.")
        mock_data = [
            {
                "title": f"Senior Frontend Engineer ({keywords})",
                "company": "TechVantage India",
                "location": location or "Bangalore, India",
                "remote": remote,
                "salary_range": "1,500,000 - 2,200,000 INR",
                "description": f"We are looking for a Senior Frontend Engineer specialized in {keywords}. You will build and scale our client-facing web applications. Required: 5+ years experience, React, Tailwind CSS, and excellent communication.",
                "apply_url": "https://example.com/apply/techvantage-frontend"
            },
            {
                "title": f"Full Stack Python Developer",
                "company": "Cognitive Solutions",
                "location": location or "Mumbai, India",
                "remote": True,
                "salary_range": "1,200,000 - 1,800,000 INR",
                "description": f"Join our RAG platform team. You will write clean FastAPI backend code and interface with LLMs. Requirements: FastAPI, SQL, Docker, React. Keywords matching: {keywords}",
                "apply_url": "https://example.com/apply/cognitive-python"
            },
            {
                "title": f"Lead Software Engineer - React & Node",
                "company": "Global Innovators Inc",
                "location": location or "Hyderabad, India",
                "remote": remote,
                "salary_range": "2,400,000 - 3,200,000 INR",
                "description": "Looking for a technical lead to guide our UI developers. Deep knowledge of React component patterns, state management, CSS architectures, and team mentoring is required.",
                "apply_url": "https://example.com/apply/global-lead"
            },
            {
                "title": f"Generative AI Engineer",
                "company": "Nebula Labs",
                "location": location or "San Francisco, CA",
                "remote": True,
                "salary_range": "$140,000 - $180,000",
                "description": f"Build next-gen LLM workflows and vector search pipelines. Must have experience with LangChain, ChromaDB/Pinecone, OpenAI, and Python. Matches query: {keywords}",
                "apply_url": "https://example.com/apply/nebula-ai"
            }
        ]

        normalized_mock = []
        for item in mock_data:
            title = item["title"]
            company = item["company"]
            normalized_mock.append({
                "id": generate_job_id(title, company),
                "source": "mock_fallback",
                "title": title,
                "company": company,
                "location": item["location"],
                "remote": item["remote"],
                "salary_range": item["salary_range"],
                "description": item["description"],
                "apply_url": item["apply_url"],
                "fetched_at": datetime.datetime.utcnow()
            })
        return normalized_mock

    @classmethod
    def search_and_save(cls, db: Session, keywords: str, location: str, remote: bool) -> list[Job]:
        adzuna_results = cls.fetch_adzuna_jobs(keywords, location, remote)
        jsearch_results = cls.fetch_jsearch_jobs(keywords, location, remote)
        
        all_results = adzuna_results + jsearch_results
        
        if not all_results:
            all_results = cls.get_mock_jobs(keywords, location, remote)

        seen_ids = set()
        unique_results = []
        for job_dict in all_results:
            if job_dict["id"] not in seen_ids:
                seen_ids.add(job_dict["id"])
                unique_results.append(job_dict)

        saved_jobs = []
        for job_data in unique_results:
            db_job = db.query(Job).filter(Job.id == job_data["id"]).first()
            if db_job:
                db_job.description = job_data["description"]
                db_job.apply_url = job_data["apply_url"]
                db_job.fetched_at = datetime.datetime.utcnow()
                saved_jobs.append(db_job)
            else:
                new_job = Job(**job_data)
                db.add(new_job)
                saved_jobs.append(new_job)

        try:
            db.commit()
            for job in saved_jobs:
                db.refresh(job)
        except Exception as e:
            db.rollback()
            print(f"Error saving jobs to database: {str(e)}")

        return saved_jobs
