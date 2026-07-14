# JobPilot AI — Antigravity Build Prompt (MVP, Realistic Scope)

> Paste the "ANTIGRAVITY PROMPT" section (bottom of this doc) directly into Antigravity to start the build. Everything above it is your reference spec — keep it open in a tab while it builds so you can course-correct.

---

## 0. What Changed From Your Original PRD (and why)

| Original feature | Status | Reason |
|---|---|---|
| Scrape LinkedIn / Naukri / Glassdoor / Indeed / Instahyre | ❌ Cut | Violates ToS, gets IP-blocked fast, breaks constantly. Not a good MVP bet. |
| Full auto-apply via Playwright | ❌ Cut for v1 | High effort, fragile selectors, legal grey zone. Revisit after core loop works. |
| Recruiter Finder + LinkedIn messaging | ❌ Cut | Same scraping/ToS problem. |
| Daily monitor / cron alerts | ⏸ Phase 2 | Easy to bolt on later once matching works. |
| Resume parsing, ATS scoring, semantic matching, cover letter/email gen, tracker | ✅ Kept — this is your MVP | This is the actual value: less time per application, not "fully autonomous applying." |
| Job discovery | 🔄 Swapped | Use **free/legit job APIs** instead of scraping (list below). Same outcome (a feed of jobs), zero legal risk. |

**Your real MVP pitch:** *upload resume → get ranked jobs with match % → get a tailored resume + cover letter + email per job in under 2 minutes → track everything in one dashboard.* That alone is a strong portfolio project and solves the "2-4 hours a day" problem you cited.

---

## 1. Tech Stack (matches what you already know)

**Frontend:** React + Vite + Tailwind CSS (skip Next.js/shadcn — you don't need SSR for this, keep it simple)
**Backend:** FastAPI (Python)
**LLM + Embeddings:** Mistral API (you already have this working from your RAG project)
**Vector store:** ChromaDB (local, no Pinecone cost/signup needed for MVP)
**Database:** SQLite for MVP (upgrade to PostgreSQL later if you deploy multi-user)
**Resume parsing:** `pdfplumber` (PDF) + `python-docx` (DOCX)
**Job data source:** Free APIs (see §5) instead of scraping
**Auth:** Skip for MVP — single-user local tool first. Add Clerk/JWT only if you turn this into a SaaS.

---

## 2. Architecture

```
React (Vite) SPA
      │
      ▼
FastAPI backend
 ├── /resume/upload      → parse + extract structured profile (Mistral)
 ├── /jobs/search         → hit job APIs, normalize results
 ├── /jobs/match          → embed resume + JD, cosine similarity via ChromaDB
 ├── /ats/score            → LLM-based ATS scoring + missing keywords
 ├── /resume/tailor        → generate tailored resume bullets
 ├── /generate/cover-letter
 ├── /generate/email       (cold, referral, follow-up, thank-you)
 └── /tracker/*            CRUD for application tracking
      │
      ▼
SQLite (candidate profile, jobs, applications, tracker)
ChromaDB (resume + JD embeddings)
```

---

## 3. Data Models

```python
# candidate_profile
{
  "id": str,
  "raw_resume_text": str,
  "skills": list[str],
  "projects": list[{"name": str, "description": str, "tech": list[str]}],
  "education": list[{"degree": str, "institution": str, "year": str}],
  "experience": list[{"role": str, "company": str, "duration": str, "highlights": list[str]}],
  "certifications": list[str],
  "links": {"github": str, "linkedin": str, "portfolio": str}
}

# job
{
  "id": str,
  "source": str,          # "adzuna" | "jsearch" | "remotive" | "arbeitnow"
  "title": str,
  "company": str,
  "location": str,
  "remote": bool,
  "salary_range": str,
  "description": str,
  "apply_url": str,
  "fetched_at": datetime
}

# match_result
{
  "job_id": str,
  "match_percent": float,
  "missing_skills": list[str],
  "strengths": list[str],
  "weaknesses": list[str]
}

# application (tracker row)
{
  "id": str,
  "job_id": str,
  "company": str,
  "position": str,
  "match_percent": float,
  "status": str,   # applied | interview | rejected | offer | follow_up
  "applied_date": date,
  "notes": str
}
```

---

## 4. API Endpoints (FastAPI)

```
POST   /resume/upload              -> multipart file -> candidate_profile JSON
POST   /jobs/search                -> {keywords, location, remote} -> job[]
POST   /jobs/match                 -> {job_id} -> match_result
POST   /ats/score                  -> {job_id} -> {score, missing_keywords, suggestions}
POST   /resume/tailor              -> {job_id} -> tailored resume section text
POST   /generate/cover-letter      -> {job_id} -> cover letter text
POST   /generate/email             -> {job_id, type: cold|referral|followup|thankyou} -> email text
GET    /tracker                    -> application[]
POST   /tracker                    -> create application
PATCH  /tracker/{id}                -> update status
```

---

## 5. Job Data Sources (free, legal, no scraping)

| API | Free tier | Notes |
|---|---|---|
| **Adzuna API** | Yes, free key | Good India coverage, structured JSON |
| **JSearch (RapidAPI)** | Free tier (~2500 req/mo) | Aggregates Indeed/LinkedIn/Glassdoor listings *legally* via licensed access |
| **Remotive API** | Free, no key | Remote jobs, mostly tech |
| **Arbeitnow API** | Free, no key | Tech-focused, EU-leaning but has remote roles |

Start with **Adzuna + JSearch** — best India + tech coverage combo. Get free API keys before starting the build.

---

## 6. Build Phases (tell Antigravity to do these in order, not all at once)

1. **Phase 1 — Resume Intelligence:** Upload endpoint, parsing, Mistral-based structured extraction, store in SQLite.
2. **Phase 2 — Job Discovery:** Adzuna + JSearch integration, normalize into common `job` schema, dedupe.
3. **Phase 3 — Semantic Matching:** Embed resume + JD text (Mistral embeddings or `sentence-transformers` if you want it free/local), store in ChromaDB, cosine similarity → match %.
4. **Phase 4 — ATS + Tailoring:** LLM prompt that scores resume against JD, lists missing keywords, generates tailored bullet points.
5. **Phase 5 — Writing Agent:** Cover letter + 4 email templates (cold, referral, follow-up, thank-you), all JD-specific.
6. **Phase 6 — Tracker Dashboard:** React table (Company, Position, Match %, Status, Applied Date), CRUD against `/tracker`.
7. **Phase 7 (stretch, only if time permits):** Daily cron job hitting job APIs for new matches, simple email/notification.

Do **not** attempt browser automation or LinkedIn/Naukri scraping in this build — explicitly told Antigravity to skip it below.

---

## 7. ANTIGRAVITY PROMPT — Paste This In

```
Build "JobPilot AI" — a job search assistant web app. Use this exact stack:
- Backend: FastAPI (Python), SQLite via SQLAlchemy
- Frontend: React + Vite + Tailwind CSS
- LLM: Mistral API for text generation and embeddings (I will provide MISTRAL_API_KEY as env var)
- Vector store: ChromaDB (local, embedded mode)
- Job data: Adzuna API and JSearch (RapidAPI) — I will provide ADZUNA_APP_ID, ADZUNA_APP_KEY, RAPIDAPI_KEY as env vars
- Resume parsing: pdfplumber for PDF, python-docx for DOCX

Build in this order, and pause for my review after each phase:

PHASE 1 - Resume Intelligence
- POST /resume/upload accepts a PDF or DOCX file
- Extract raw text, then call Mistral to parse into structured JSON: skills, projects, education, experience, certifications, github/linkedin/portfolio links
- Store result in SQLite `candidate_profile` table
- Return the structured profile to frontend

PHASE 2 - Job Discovery
- POST /jobs/search takes {keywords, location, remote} and queries both Adzuna and JSearch APIs
- Normalize both responses into one common job schema: id, source, title, company, location, remote, salary_range, description, apply_url, fetched_at
- Dedupe by title+company, store in SQLite `jobs` table

PHASE 3 - Semantic Matching
- POST /jobs/match takes a job_id, embeds the job description and the candidate's resume text using Mistral embeddings, stores vectors in ChromaDB, computes cosine similarity
- Also have Mistral generate: missing_skills, strengths, weaknesses as structured JSON
- Return match_percent (0-100) plus the above

PHASE 4 - ATS Analyzer + Resume Tailoring
- POST /ats/score takes job_id, prompts Mistral to score the resume against the JD like an ATS system, returns score, missing_keywords, and 3-5 concrete suggestions
- POST /resume/tailor takes job_id, generates tailored resume bullet points (not a full rewrite) targeted at that specific JD

PHASE 5 - Writing Agent
- POST /generate/cover-letter takes job_id, generates a personalized, company-specific, human-sounding cover letter (not generic)
- POST /generate/email takes job_id and type (cold | referral | followup | thankyou), generates the appropriate email

PHASE 6 - Application Tracker
- Full CRUD for GET/POST/PATCH /tracker with fields: company, position, match_percent, status (applied/interview/rejected/offer/follow_up), applied_date, notes
- React dashboard page: sortable table, status dropdown, add/edit modal

FRONTEND PAGES:
1. Upload Resume (drag-and-drop, shows parsed profile after upload)
2. Job Search (search bar + filters, results as cards showing match % once matched)
3. Job Detail (JD + match breakdown + tailored resume + cover letter + email generator buttons)
4. Tracker Dashboard (table view described above)

DO NOT build browser automation, auto-apply, or any LinkedIn/Naukri/Glassdoor scraping — these are explicitly out of scope for this build. Job data comes only from the Adzuna and JSearch APIs.

Keep the UI clean and minimal — Tailwind utility classes only, no heavy component library needed. Use a simple sidebar nav for the four pages above.

Start with Phase 1 and show me the working resume upload + parsing flow before moving to Phase 2.
```

---

## 8. Before You Start — Checklist

- [ ] Sign up for free Mistral API key (you already have this)
- [ ] Sign up for Adzuna API (free): https://developer.adzuna.com/
- [ ] Sign up for JSearch on RapidAPI (free tier): https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch
- [ ] Have a sample resume PDF ready to test upload flow
- [ ] Decide: local-only tool for yourself, or do you want it deployable (Netlify + Render/Railway) — mention this to Antigravity upfront if deploy matters, changes how it structures env vars/CORS

---

## 9. After MVP Works — Good Next Additions (in priority order)

1. Daily job monitor (cron + email/Telegram notification — you already know Telegram bots from your RAG project)
2. Resume version A/B/C generation (Backend/AI/Data role variants)
3. Interview prep generator (technical + HR + coding questions from JD)
4. Salary intelligence (scrape-free — use Levels.fyi/Glassdoor public salary APIs if available, or LLM estimate with disclaimer)
5. Chrome extension for one-click "save this job" from any site (much lower risk than full auto-apply)

Skip recruiter-finder and LinkedIn automation permanently unless you're comfortable with manual, ToS-compliant outreach — automate the writing (already in scope), not the messaging.
