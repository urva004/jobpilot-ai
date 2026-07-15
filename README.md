# JobPilot AI Webapp

🚀 **Live Application URL**: [https://jobpilot-ai-1-ioik.onrender.com/](https://jobpilot-ai-1-ioik.onrender.com/)

JobPilot AI is a full-stack job search and resume optimization web app. It combines a Python FastAPI backend with a React + Vite frontend to offer resume parsing, AI-powered job matching, ATS analysis, application tracking, and notification scheduling.

## Key Features

- Resume upload and parsing for PDF/DOCX files
- AI-powered candidate profile extraction using Mistral
- Job discovery from Adzuna and JSearch APIs with mock fallback results
- Semantic resume-to-job matching via embeddings and cosine similarity
- ATS analysis, tailored resume suggestions, and writing assistant support
- Application tracker with status updates and notes
- Notification scheduler for periodic job matching
- Neon Serverless PostgreSQL persistence with SQLAlchemy

## Tech Stack

- Backend: Python, FastAPI, SQLAlchemy, Uvicorn
- Frontend: React, Vite, Tailwind CSS
- AI integrations: Mistral API
- Vector matching: local JSON vector store
- Database: Neon PostgreSQL (Production) / SQLite (Local)

## Repository Structure

- `backend/` - FastAPI server, models, services, scheduler, resume parser
- `frontend/` - React + Vite UI
- `frontend/src/` - React app components and pages
- `backend/app/` - API routes, services, database setup

## Prerequisites

- Python 3.10+ (recommended)
- Node.js 18+ / npm or pnpm
- Git (optional)

## Backend Setup

1. Create a Python virtual environment:

```bash
python -m venv backend/venv
```

2. Activate the environment:

Windows PowerShell:
```powershell
cd backend
test -Path .\venv\Scripts\Activate.ps1; if ($?) { . .\venv\Scripts\Activate.ps1 }
```

Windows CMD:
```cmd
cd backend
venv\Scripts\activate.bat
```

3. Install dependencies:

```bash
pip install -r backend/requirements.txt
```

4. Create a `.env` file inside `backend/` with the required keys:

```env
MISTRAL_API_KEY=your_mistral_api_key
DATABASE_URL=sqlite:///./jobpilot.db
ADZUNA_APP_ID=your_adzuna_app_id
ADZUNA_APP_KEY=your_adzuna_app_key
RAPIDAPI_KEY=your_rapidapi_key
```

5. Start the backend server:

```bash
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The backend will automatically create the SQLite database and initialize tables on startup.

## Frontend Setup

1. Install dependencies:

```bash
cd frontend
npm install
```

2. Start the development server:

```bash
npm run dev
```

3. Open the URL shown by Vite, typically `http://localhost:5173`.

## API Endpoints

- `POST /resume/upload` - Upload resume file and parse candidate profile
- `GET /resume/active` - Get the latest uploaded resume profile
- `POST /jobs/search` - Search and save jobs
- `POST /jobs/match` - Match a saved job against the active resume profile
- `GET /notifications` - Retrieve scheduler notifications
- `POST /notifications/{notif_id}/read` - Mark a notification as read
- `POST /notifications/read-all` - Mark all notifications as read
- `GET /scheduler/settings` - Read scheduler settings
- `POST /scheduler/settings` - Update scheduler settings
- `POST /scheduler/trigger` - Run the scheduler matching cycle manually
- `POST /tracker` - Create a new application tracker entry
- `PATCH /tracker/{app_id}` - Update an application tracker entry
- `DELETE /tracker/{app_id}` - Delete an application tracker entry

## Environment Variables

- `MISTRAL_API_KEY` - Required for resume parsing, embeddings, and job match analysis
- `DATABASE_URL` - Optional; defaults to `sqlite:///./jobpilot.db`
- `ADZUNA_APP_ID` / `ADZUNA_APP_KEY` - Optional for Adzuna job search
- `RAPIDAPI_KEY` - Optional for JSearch job search

> If job search API keys are missing, the app uses a mock fallback job search implementation.

## Notes

- Vector embeddings are stored in `backend/app/vector_store.json`.
- Scheduler background matching runs automatically at startup and checks for new matches.
- The project uses Neon Serverless PostgreSQL for permanent data persistence in production, and can fall back to local SQLite for local testing.

## Future Improvements

- Add authentication and user accounts
- Replace local vector store with a production-grade vector database
- Add more robust job import sources and pagination
- Improve frontend error handling and user onboarding flow

---

Enjoy using JobPilot AI for resume-driven job discovery and personalized job matching.#
