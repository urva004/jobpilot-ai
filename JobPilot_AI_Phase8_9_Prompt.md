# JobPilot AI — Phase 8 & 9 Build Prompt

Paste the "ANTIGRAVITY PROMPT" block below directly into Antigravity. It's written to slot into your existing codebase (same file names/patterns as Phases 1-7) rather than restart anything.

---

## Phase 8: Interview Prep Generator

**New method** in `mistral_service.py`: `generate_interview_prep(job_description, candidate_profile)`
Returns structured JSON:
```json
{
  "technical_questions": [{"question": str, "tip": str}],
  "coding_questions": [{"question": str, "difficulty": "easy|medium|hard", "hint": str}],
  "system_design_questions": [{"question": str, "focus_areas": [str]}],
  "hr_questions": [{"question": str, "tip": str}],
  "behavioral_questions": [{"question": str, "framework_tip": str}]
}
```

**New endpoint** in `main.py`: `POST /interview/prep` — takes `job_id`, pulls the stored JD + candidate profile, calls the above, returns the structured result. Cache result per job_id in a new `interview_prep` table so re-visiting the page doesn't re-call the LLM.

**New schemas** in `schemas.py`: `InterviewPrepRequest`, `InterviewPrepResponse` matching the JSON shape above.

**New frontend component** `InterviewPrep.jsx`: tab switcher (Technical / Coding / System Design / HR / Behavioral), each tab shows a list of expandable cards — question on top, tip/hint revealed on click ("Show tip" toggle so it's usable as flashcard-style practice, not just a wall of text). Add to sidebar nav.

---

## Phase 9: Resume Variants (A/B/C)

**New method** in `mistral_service.py`: `generate_resume_variants(candidate_profile)`
Generates 3 tailored resume framings from the same base profile:
- **Variant A — Backend/Full-Stack**: emphasizes FastAPI/API design/database/system architecture projects and bullets
- **Variant B — AI/ML**: emphasizes ML models, embeddings, RAG, LLM integration projects and bullets
- **Variant C — Data/Analytics**: emphasizes data pipelines, dashboards, clustering/segmentation, SQL-heavy work

Each variant returns:
```json
{
  "variant": "backend|ai_ml|data",
  "professional_summary": str,
  "reordered_skills": [str],
  "reworded_experience_bullets": [{"original_role": str, "bullets": [str]}],
  "highlighted_projects": [str]
}
```
This is a *reframing* of the existing profile (reorder, reword, re-emphasize) — not fabricating new experience.

**New endpoint** in `main.py`: `POST /resume/variants` — takes candidate profile id, returns all 3 variants in one call (batch the 3 Mistral calls, don't make the user trigger each separately).

**New schema** in `schemas.py`: `ResumeVariantsResponse` with a list of the 3 variant objects above.

**New frontend component** `ResumeVariants.jsx`: 3-tab layout (Backend / AI-ML / Data), each tab shows summary + skills + bullets in the same styled card pattern as `ATSAnalyzer.jsx`, with a copy-to-clipboard button per section and a "Generate all 3" trigger button. Add to sidebar nav, place next to the ATS Analyzer since it's a related resume tool.

---

## Phase 10: Automated Email Job Application (Gmail-based, Human-Approved)

**Why email, not browser auto-apply:** Many SME/startup listings (and Indian job posts especially) list a direct "apply via email" contact instead of a portal. This is far more reliable to automate than form-filling on LinkedIn/Naukri, and doesn't touch anyone's ToS — you're just sending an email through your own account.

**Guardrail (non-negotiable):** Nothing sends without you clicking "Send" on a review screen. This is a drafting + one-click-send tool, not a mass-mailer. Building it any other way risks your own email getting flagged as spam and burns goodwill with recruiters you actually want to talk to.

### What it does
1. **Gmail connection:** OAuth flow so the app can send email as you (scope: `gmail.send` only — not full inbox access).
2. **Email contact extraction:** For each job, check if `apply_url` is a `mailto:` link or if the JD text contains a contact email (regex + LLM fallback for messier postings). If no email is found, this job is skipped — no attempt to reach it another way.
3. **Draft generation:** Reuse the existing `generate_email` (Phase 5) output — subject + body — and attach the tailored resume (Phase 9 variant matching the job's category, or the base resume if no variant selected).
4. **Review screen:** Shows the exact email as it will be sent — to, subject, body, attachment — with an editable text area. Nothing sends until you click "Send."
5. **Rate limiting:** Hard cap (e.g. 15/day, configurable) to avoid spam-flag risk on your own Gmail account, and a duplicate check so you can't accidentally email the same company twice for the same job.
6. **Tracker integration:** On send, auto-create/update the `applications` row: status → "applied", applied_date → now, and log the sent email content for reference.

### Backend additions
- `gmail_service.py`: OAuth flow (store refresh token securely, not in plaintext in the repo — use `.env` / local encrypted storage), `send_email(to, subject, body, attachment_path)` using Gmail API.
- New method in a service file: `extract_contact_email(job_description, apply_url)` — regex first, Mistral fallback if regex finds nothing.
- New model `SentEmail`: job_id, to_email, subject, body, sent_at, attachment_name.
- Endpoints:
  - `GET /gmail/auth` — kicks off OAuth flow
  - `GET /gmail/callback` — OAuth redirect handler
  - `POST /jobs/{job_id}/draft-application-email` — generates the draft (does NOT send)
  - `POST /jobs/{job_id}/send-application-email` — sends the already-drafted email, requires the draft to have been explicitly confirmed by the frontend request
  - `GET /gmail/daily-count` — for rate-limit display in UI

### Frontend additions
- `EmailApply.jsx`: per-job "Apply via Email" button (only shown if a contact email was found) → opens review modal with editable To/Subject/Body + attached resume preview → "Send Email" button → success toast + tracker auto-updates.
- Gmail connect/disconnect control in settings/sidebar, with the daily send count visible so you know how much headroom you have left.

---

## ANTIGRAVITY PROMPT — Paste This In

```
Continue building JobPilot AI (existing codebase at e:/projects/job find webapp). Add two new features, Phase 8 and Phase 9, following the exact same patterns already used in this project (FastAPI + SQLAlchemy backend, Mistral service methods, React components matching the styling of ATSAnalyzer.jsx and WritingAgent.jsx).

PHASE 8 - Interview Prep Generator
- Add generate_interview_prep(job_description, candidate_profile) to backend/app/services/mistral_service.py. It should call Mistral to produce structured JSON with 5 categories: technical_questions, coding_questions, system_design_questions, hr_questions, behavioral_questions. Each technical/hr/behavioral question includes a short "tip" field; each coding question includes difficulty and a hint; each system design question includes focus_areas.
- Add a new SQLAlchemy model `InterviewPrep` to store cached results keyed by job_id, so we don't re-call the LLM every time the same job is revisited.
- Add InterviewPrepRequest/InterviewPrepResponse to backend/app/schemas.py matching that JSON shape.
- Add POST /interview/prep to backend/app/main.py: takes job_id, checks cache first, otherwise generates and caches.
- Build frontend/src/components/InterviewPrep.jsx: tab switcher across the 5 categories, each showing expandable question cards with a "Show tip/hint" toggle (flashcard style, not everything visible at once). Add a nav item in the sidebar.

PHASE 9 - Resume Variants (A/B/C)
- Add generate_resume_variants(candidate_profile) to mistral_service.py. Generate 3 variants from ONE Mistral call if possible (or 3 parallel calls): Backend/Full-Stack, AI/ML, and Data/Analytics framings. Each variant reorders skills, rewrites the professional summary, rewords experience bullets to emphasize the relevant angle, and highlights the most relevant projects. This is reframing existing resume content, not inventing new experience - be explicit about that constraint in the prompt to Mistral.
- Add ResumeVariantsResponse schema with a list of 3 variant objects: variant, professional_summary, reordered_skills, reworded_experience_bullets, highlighted_projects.
- Add POST /resume/variants to main.py, takes candidate profile id, returns all 3 variants in one response.
- Build frontend/src/components/ResumeVariants.jsx: 3-tab layout (Backend / AI-ML / Data), styled consistently with ATSAnalyzer.jsx, copy-to-clipboard per section, single "Generate all 3" button. Add nav item next to ATS Analyzer.

Build Phase 8 first, show me a working demo, then move to Phase 9.
```

## ANTIGRAVITY PROMPT (Phase 10) — Paste This Separately, After 8 & 9 Are Working

```
Add Phase 10 to JobPilot AI: automated email job applications via Gmail, with a mandatory human-approval step before anything sends. This is NOT a fully autonomous auto-apply feature - it drafts, I review, I click send.

- Add backend/app/services/gmail_service.py: implement Gmail OAuth (scope: gmail.send only) and a send_email(to, subject, body, attachment_path) function using the Gmail API. Store OAuth tokens in .env / local encrypted storage, never hardcoded or committed.
- Add extract_contact_email(job_description, apply_url) - regex-based extraction first (mailto: links, email patterns in JD text), falling back to a Mistral call only if regex finds nothing. If no email is found, do not attempt any other application method for that job - just mark it as "no email contact available."
- Add a SentEmail SQLAlchemy model: job_id, to_email, subject, body, sent_at, attachment_name.
- Add endpoints to main.py:
  - GET /gmail/auth and GET /gmail/callback for the OAuth flow
  - POST /jobs/{job_id}/draft-application-email - generates the draft only, does not send, reuses the existing generate_email logic from Phase 5 and attaches the best-matching resume variant from Phase 9
  - POST /jobs/{job_id}/send-application-email - sends an already-drafted email. This endpoint must require the frontend to pass back the exact reviewed/possibly-edited subject and body as confirmation - never send from server-side cached state alone, to guarantee the user saw the final version.
  - GET /gmail/daily-count - returns how many emails sent today, enforce a hard daily cap (default 15, configurable in settings) and block sends past the cap with a clear error.
  - Add a duplicate-send check: block sending to the same to_email + job_id combination twice.
- Build frontend/src/components/EmailApply.jsx: shows an "Apply via Email" button on job cards only when a contact email was found. Clicking it opens a modal with editable To/Subject/Body fields and the attached resume filename, plus a visible "X of 15 sent today" counter. Only clicking "Send Email" inside this modal triggers the actual send endpoint. On success, auto-update the tracker (Phase 6) to status "applied" with today's date and log the SentEmail record.
- Add Gmail connect/disconnect UI in the sidebar/settings area.

Do not build any functionality that sends an email without the user viewing and confirming that exact draft first. Do not attempt to apply through web forms or portals in this phase - email contact only.
```
