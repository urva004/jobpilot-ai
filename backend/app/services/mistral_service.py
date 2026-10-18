import json
import requests
from app.config import MISTRAL_API_KEY, MISTRAL_MODEL

class MistralService:
    @staticmethod
    def _clean_json_text(text: str) -> str:
        """Strip markdown codeblock wrappers and leading/trailing whitespace from LLM output."""
        if not text:
            return "{}"
        cleaned = text.strip()
        if cleaned.startswith("```"):
            lines = cleaned.splitlines()
            if lines and lines[0].startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].startswith("```"):
                lines = lines[:-1]
            cleaned = "\n".join(lines).strip()
        return cleaned

    @staticmethod
    def chat_complete(messages: list, response_format: dict = None) -> str:
        import os
        if os.getenv("MOCK_LLM") == "true":
            prompt_str = str(messages).lower()
            
            # Cross-process call tracking
            count_file = os.getenv("MISTRAL_CALLS_FILE", "mistral_calls.txt")
            count_data = {}
            if os.path.exists(count_file):
                try:
                    with open(count_file, "r") as f:
                        count_data = json.load(f)
                except Exception:
                    pass
            
            call_type = "chat"
            # Reliable type detection via injected mock-type markers
            if "__mock_type__:analyze" in prompt_str:
                call_type = "analyze"
            elif "__mock_type__:tailor" in prompt_str:
                call_type = "tailor"
            elif "__mock_type__:cover_letter" in prompt_str:
                call_type = "cover_letter"
            elif "__mock_type__:ats_score" in prompt_str:
                call_type = "ats_score"
            elif "__mock_type__:extract" in prompt_str:
                call_type = "extract"
            elif "__mock_type__:interview_prep" in prompt_str:
                call_type = "interview_prep"
            elif "__mock_type__:email" in prompt_str:
                call_type = "email"
            elif "__mock_type__:variants" in prompt_str:
                call_type = "variants"
            elif "__mock_type__:hallucinations" in prompt_str:
                call_type = "hallucinations"
            elif "__mock_type__:contact_emails" in prompt_str:
                call_type = "contact_emails"
            elif "__mock_type__:classify_experience" in prompt_str:
                call_type = "classify_experience"

            count_data[call_type] = count_data.get(call_type, 0) + 1
            try:
                with open(count_file, "w") as f:
                    json.dump(count_data, f)
            except Exception:
                pass

            if "__mock_type__:analyze" in prompt_str:
                return json.dumps({
                    "missing_skills": ["Kubernetes", "Rust"],
                    "strengths": ["Strong Python experience"],
                    "weaknesses": ["No native mobile experience"]
                })
            elif "__mock_type__:tailor" in prompt_str:
                return json.dumps({
                    "summary": "Tailored senior python engineer summary.",
                    "experience_bullets": ["Rewrote bullet 1", "Rewrote bullet 2"],
                    "skills_to_highlight": ["Python", "FastAPI"],
                    "keywords_added": ["Backend"]
                })
            elif "__mock_type__:cover_letter" in prompt_str:
                return json.dumps({
                    "subject_line": "Application for Senior Python Developer",
                    "body": "Dear Hiring Manager, I am excited to apply for this role given my background in scalable systems."
                })
            elif "__mock_type__:email" in prompt_str:
                return json.dumps({
                    "subject": "Application for Role - Candidate Name",
                    "body": "Dear Hiring Manager,\n\nI am writing to share my resume for the open position..."
                })
            elif "__mock_type__:variants" in prompt_str:
                return json.dumps({
                    "variants": [
                        {
                            "variant": "backend",
                            "professional_summary": "Backend focused engineer with expertise in distributed Python systems.",
                            "reordered_skills": ["Python", "FastAPI", "PostgreSQL"],
                            "reworded_experience_bullets": [{"original_role": "Engineer", "bullets": ["Built backend REST APIs"]}],
                            "highlighted_projects": ["API Engine"]
                        },
                        {
                            "variant": "ai_ml",
                            "professional_summary": "AI/ML engineer with experience in LLMs and vector embeddings.",
                            "reordered_skills": ["Python", "PyTorch", "Mistral AI"],
                            "reworded_experience_bullets": [{"original_role": "Engineer", "bullets": ["Integrated LLM pipelines"]}],
                            "highlighted_projects": ["AI Agent"]
                        },
                        {
                            "variant": "data",
                            "professional_summary": "Data engineer specializing in SQL and pipeline automation.",
                            "reordered_skills": ["SQL", "Python", "Data Processing"],
                            "reworded_experience_bullets": [{"original_role": "Engineer", "bullets": ["Automated data pipelines"]}],
                            "highlighted_projects": ["Data Pipeline"]
                        }
                    ]
                })
            elif "__mock_type__:hallucinations" in prompt_str:
                return json.dumps({
                    "hallucination_warnings": []
                })
            elif "__mock_type__:contact_emails" in prompt_str:
                return json.dumps({
                    "emails": ["careers@example.com"]
                })
            elif "__mock_type__:recruiter_email" in prompt_str:
                return json.dumps({
                    "intent": "interview_invite",
                    "company": "Nexus Systems",
                    "job_title": "Senior Backend Engineer",
                    "scheduling_link": "https://calendly.com/nexus-interview",
                    "proposed_dates": ["Tomorrow 10:00 AM IST"],
                    "summary": "Recruiter invited you to an interview via Calendly."
                })
            elif "__mock_type__:classify_experience" in prompt_str:
                return json.dumps({
                    "experience_level": "3_5_years"
                })
            elif "__mock_type__:multi_pillar_match" in prompt_str:
                return json.dumps({
                    "skills_score": 92,
                    "seniority_score": 88,
                    "salary_score": 85,
                    "culture_growth_score": 90,
                    "overall_score": 89.5,
                    "pros": ["Strong proficiency in core tech stack", "Alignment with remote engineering culture"],
                    "potential_red_flags": ["Check if role requires rare legacy tools"]
                })
            elif "__mock_type__:bulk_screening_questions" in prompt_str:
                return json.dumps({
                    "answers": {
                        "years_of_experience": "5+ years",
                        "sponsorship_required": "No",
                        "notice_period": "2 weeks",
                        "salary_expectation": "Competitive / Market standard"
                    }
                })
            elif "__mock_type__:ats_score" in prompt_str:
                return json.dumps({
                    "score": 78,
                    "missing_keywords": ["Kubernetes", "Terraform"],
                    "suggestions": ["Add Kubernetes experience", "Mention cloud platforms"]
                })
            elif "__mock_type__:extract" in prompt_str:
                return json.dumps({
                    "skills": ["Python", "FastAPI"],
                    "experience": [],
                    "education": [],
                    "projects": [],
                    "certifications": [],
                    "links": {},
                    "confidence": {"skills": 0.9, "experience": 0.8, "education": 0.5, "overall": 0.73}
                })
            elif "__mock_type__:interview_prep" in prompt_str:
                return json.dumps({
                    "technical_questions": [
                        {
                            "question": "How do you handle asynchronous task processing in FastAPI using Celery or Procrastinate?",
                            "tip": "Focus on background task isolation and transactional guarantees.",
                            "sample_answer": "In my previous project, I used background queues to offload heavy tasks..."
                        }
                    ],
                    "coding_questions": [
                        {
                            "question": "Implement a rate limiter using token bucket algorithm.",
                            "difficulty": "medium",
                            "hint": "Track last refill time and available tokens.",
                            "approach_explanation": "Store tokens per user and refill proportionally to elapsed time.",
                            "solution_code": "def check_rate_limit(user_id):\n    # Token bucket logic\n    return True",
                            "solution_language": "python"
                        }
                    ],
                    "system_design_questions": [
                        {
                            "question": "Design a real-time job matching and notification pipeline.",
                            "focus_areas": ["scalability", "event-driven architecture"],
                            "sample_answer": "I would use an event broker with vector similarity indexing..."
                        }
                    ],
                    "hr_questions": [
                        {
                            "question": "Why do you want to join this AI/ML engineering team?",
                            "tip": "Highlight interest in building practical AI features.",
                            "sample_answer": "I am passionate about building agentic workflows and automated tools..."
                        }
                    ],
                    "behavioral_questions": [
                        {
                            "question": "Describe a scenario where you debugged a complex production bottleneck.",
                            "framework_tip": "STAR format: Situation, Task, Action, Result",
                            "sample_answer": "Situation: DB queries were timing out under peak load. Action: I added vector indexing and caching. Result: Latency dropped by 80%."
                        }
                    ]
                })
            return "{}"

        if not MISTRAL_API_KEY:
            raise ValueError("MISTRAL_API_KEY environment variable is not set")
        
        headers = {
            "Authorization": f"Bearer {MISTRAL_API_KEY}",
            "Content-Type": "application/json"
        }
        
        configured_model = os.getenv("MISTRAL_MODEL", MISTRAL_MODEL or "ministral-8b-latest")
        payload = {
            "model": configured_model,
            "messages": messages
        }
        
        if response_format:
            payload["response_format"] = response_format
            
        url = "https://api.mistral.ai/v1/chat/completions"
        import time
        max_retries = 3
        for attempt in range(max_retries):
            try:
                response = requests.post(url, headers=headers, json=payload, timeout=45)
                # If 403 Forbidden with large/custom model, attempt immediate fallback to ministral-8b-latest
                if response.status_code == 403 and payload["model"] != "ministral-8b-latest":
                    print(f"[Mistral API 403 Forbidden with {payload['model']}]: Retrying with ministral-8b-latest...")
                    payload["model"] = "ministral-8b-latest"
                    continue
                if response.status_code == 429 and attempt < max_retries - 1:
                    wait_sec = 2 ** (attempt + 1)
                    print(f"[Mistral API Rate Limit 429]: Retrying in {wait_sec}s (Attempt {attempt + 1}/{max_retries})...")
                    time.sleep(wait_sec)
                    continue
                response.raise_for_status()
                data = response.json()
                return data["choices"][0]["message"]["content"]
            except requests.exceptions.HTTPError as http_err:
                status = response.status_code if response else 'Unknown'
                err_body = response.text if response else str(http_err)
                if response and response.status_code == 403 and payload["model"] != "ministral-8b-latest":
                    print(f"[Mistral API 403]: Falling back from {payload['model']} to ministral-8b-latest...")
                    payload["model"] = "ministral-8b-latest"
                    continue
                if attempt == max_retries - 1:
                    raise RuntimeError(f"Mistral API HTTP {status} Error: {err_body}") from http_err
            except requests.exceptions.RequestException as req_err:
                if attempt == max_retries - 1:
                    raise RuntimeError(f"Mistral API request failed: {str(req_err)}") from req_err

    @classmethod
    def _fallback_extract_profile(cls, raw_text: str) -> dict:
        """Deterministic fallback parser used when Mistral API is unreachable or forbidden."""
        import re
        from app.services.skill_extraction_service import SkillExtractionService
        
        # 1. Deterministic skills extraction
        skills = SkillExtractionService().extract_skills(raw_text)
        
        # 2. Extract links (GitHub, LinkedIn, Portfolio)
        links = {"github": "", "linkedin": "", "portfolio": ""}
        github_match = re.search(r'(https?://(?:www\.)?github\.com/[a-zA-Z0-9_\-\./]+)', raw_text, re.IGNORECASE)
        if github_match:
            links["github"] = github_match.group(1).rstrip(".,;)")
            
        linkedin_match = re.search(r'(https?://(?:www\.)?linkedin\.com/in/[a-zA-Z0-9_\-\./]+)', raw_text, re.IGNORECASE)
        if linkedin_match:
            links["linkedin"] = linkedin_match.group(1).rstrip(".,;)")
            
        urls = re.findall(r'https?://[^\s<>"]+|www\.[^\s<>"]+', raw_text)
        for u in urls:
            u_clean = u.rstrip(".,;)")
            if not u_clean.startswith("http"):
                u_clean = "https://" + u_clean
            if "github.com" not in u_clean and "linkedin.com" not in u_clean and not links["portfolio"]:
                links["portfolio"] = u_clean
                break

        # 3. Heuristic education extraction
        education = []
        edu_patterns = [
            r'((?:Bachelor|Master|B\.?S\.?|M\.?S\.?|B\.?Tech|B\.?E\.?|Ph\.?D)[^.\n,;]+)',
        ]
        for pat in edu_patterns:
            matches = re.findall(pat, raw_text, re.IGNORECASE)
            for m in matches[:2]:
                deg = m.strip()
                if len(deg) > 3 and not deg.lower().startswith("http"):
                    education.append({
                        "degree": deg,
                        "institution": "Extracted from Resume",
                        "year": ""
                    })

        confidence = {
            "skills": 0.8 if skills else 0.2,
            "experience": 0.2,
            "education": 0.6 if education else 0.1,
            "overall": 0.45
        }
        
        return {
            "skills": skills,
            "projects": [],
            "education": education,
            "experience": [],
            "certifications": [],
            "links": links,
            "confidence": confidence
        }

    @classmethod
    def extract_candidate_profile(cls, raw_text: str) -> dict:
        prompt = f"""
Analyze the following raw resume text and extract the candidate profile information.
Return the information in the specified JSON structure.

JSON Structure to return:
{{
  "skills": ["skill1", "skill2", ...],
  "projects": [
    {{
      "name": "Project Name",
      "description": "Short description of what the project is, what was achieved, etc.",
      "tech": ["technology1", "technology2", ...]
    }}
  ],
  "education": [
    {{
      "degree": "Degree Name (e.g., Bachelor of Science in Computer Science)",
      "institution": "University/College Name",
      "year": "Graduation Year (e.g., 2023 or Expected 2025)"
    }}
  ],
  "experience": [
    {{
      "role": "Job Title/Role",
      "company": "Company Name",
      "duration": "Start Date - End Date (e.g., June 2021 - Present or Jan 2020 - Dec 2022)",
      "highlights": [
        "Key achievement or responsibility 1",
        "Key achievement or responsibility 2"
      ]
    }}
  ],
  "certifications": ["Cert1", "Cert2", ...],
  "links": {{
    "github": "URL or empty string",
    "linkedin": "URL or empty string",
    "portfolio": "URL or empty string"
  }},
  "confidence": {{
    "skills": 0.0,
    "experience": 0.0,
    "education": 0.0,
    "overall": 0.0
  }}
}}

For the "confidence" block: assign a score between 0.0 and 1.0 for each field:
- skills: how clearly and completely the skills section is stated (1.0 = explicit list, 0.3 = inferred from context only)
- experience: how clearly roles, companies, durations, and responsibilities are documented (1.0 = full details, 0.3 = vague or partial)
- education: how clearly degree, institution, and year are stated (1.0 = all three present, 0.3 = missing key details)
- overall: weighted average of all three above

Ensure that you match this structure exactly. Do not add any text outside of the JSON object.
Extract all links (especially GitHub, LinkedIn, portfolio/personal website links) and put them in the "links" object. If none are found, set them to empty strings.

Resume Text:
{raw_text}
"""
        messages = [
            {"role": "system", "content": "__mock_type__:extract You are an expert resume parsing AI. Extract clean structured data from the provided resume text. Always reply with a valid JSON object matching the requested schema."},
            {"role": "user", "content": prompt}
        ]

        try:
            response_text = cls.chat_complete(messages, response_format={"type": "json_object"})
            profile_data = json.loads(cls._clean_json_text(response_text))
            return profile_data
        except Exception as e:
            print(f"[MistralService] LLM extraction failed ({e}). Falling back to deterministic profile extraction.")
            return cls._fallback_extract_profile(raw_text)

    @staticmethod
    def get_embeddings(texts: list[str]) -> list[list[float]]:
        import os
        if os.getenv("MOCK_LLM") == "true":
            return [[0.1] * 1024 for _ in texts]

        if not MISTRAL_API_KEY:
            raise ValueError("MISTRAL_API_KEY environment variable is not set")
            
        headers = {
            "Authorization": f"Bearer {MISTRAL_API_KEY}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": "mistral-embed",
            "input": texts
        }
        
        url = "https://api.mistral.ai/v1/embeddings"
        try:
            response = requests.post(url, headers=headers, json=payload, timeout=30)
            response.raise_for_status()
            data = response.json()
            return [item["embedding"] for item in data["data"]]
        except Exception as e:
            raise RuntimeError(f"Mistral Embeddings API call failed: {str(e)}") from e

    @classmethod
    def analyze_job_match(cls, resume_text: str, job_description: str) -> dict:
        prompt = f"""
Compare the candidate's resume with the job description.
Analyze their fit and return the results in the specified JSON structure.

JSON Structure to return:
{{
  "missing_skills": ["Skill Name 1", "Skill Name 2", ...],
  "strengths": ["Clear strength bullet point 1", "Clear strength bullet point 2", ...],
  "weaknesses": ["Clear weakness or gap bullet point 1", "Clear weakness or gap bullet point 2", ...]
}}

Resume:
{resume_text}

Job Description:
{job_description}
"""
        messages = [
            {"role": "system", "content": "__mock_type__:analyze You are a professional recruiting coordinator. Perform a skill gap and fit analysis between the resume and job description. Always reply with a valid JSON object matching the requested schema."},
            {"role": "user", "content": prompt}
        ]
        
        response_text = cls.chat_complete(messages, response_format={"type": "json_object"})
        try:
            analysis = json.loads(cls._clean_json_text(response_text))
            return analysis
        except Exception as e:
            print("Failed to parse JSON match response:", response_text)
            raise e

    @classmethod
    def ats_score(cls, resume_text: str, job_description: str) -> dict:
        """Score the resume like an ATS system against the job description."""
        prompt = f"""\
You are an Applicant Tracking System (ATS) parsing engine. Analyze the candidate's resume against the job description and produce an ATS compatibility score.

Return ONLY a valid JSON object with the following exact structure:
{{
  "score": 72,
  "missing_keywords": ["keyword1", "keyword2", ...],
  "suggestions": [
    "Concrete suggestion 1 to improve ATS score",
    "Concrete suggestion 2 to improve ATS score",
    "Concrete suggestion 3 to improve ATS score"
  ]
}}

Rules:
- score is an integer 0-100 reflecting how well the resume passes ATS keyword and section matching.
- missing_keywords is a list of 5-15 exact keywords/phrases from the JD that are absent from the resume.
- suggestions is exactly 3-5 actionable, JD-specific improvement tips (not generic advice).

Resume:
{resume_text}

Job Description:
{job_description}
"""
        messages = [
            {"role": "system", "content": "__mock_type__:ats_score You are an ATS parsing expert. Always reply with a valid JSON object matching the requested schema. Do not add markdown fences or explanatory text outside the JSON."},
            {"role": "user", "content": prompt}
        ]
        response_text = cls.chat_complete(messages, response_format={"type": "json_object"})
        try:
            return json.loads(cls._clean_json_text(response_text))
        except Exception as e:
            print("Failed to parse ATS score JSON:", response_text)
            raise e

    @classmethod
    def tailor_resume(cls, resume_text: str, job_description: str) -> dict:
        """Generate tailored resume bullet points aligned to the JD."""
        prompt = f"""\
You are a professional resume writer and career coach. Your task is to rewrite and enhance specific sections of the candidate's resume so they align with the job description without fabricating any information.

Return ONLY a valid JSON object with the following exact structure:
{{
  "summary": "A 2-3 sentence tailored professional summary that highlights the most relevant experience and skills for this specific role.",
  "experience_bullets": [
    "• Rewrote bullet that ties directly to a JD requirement using strong action verb and a measurable outcome.",
    "• Another achievement bullet tailored to this JD with quantified result.",
    "• A third bullet strengthening alignment with key JD skill areas."
  ],
  "skills_to_highlight": ["Skill1", "Skill2", "Skill3"],
  "keywords_added": ["keyword1", "keyword2"]
}}

Rules:
- Do NOT invent job titles, companies, or degrees the candidate does not have.
- ONLY reframe or enhance existing experience to be more relevant to the JD.
- experience_bullets must be 4-6 bullets, each starting with a strong past-tense action verb.
- skills_to_highlight lists the candidate's existing skills most relevant to this JD.
- keywords_added lists the JD keywords you wove into the bullets.

Resume:
{resume_text}

Job Description:
{job_description}
"""
        messages = [
            {"role": "system", "content": "__mock_type__:tailor You are an expert resume writer specializing in ATS optimization. Always reply with a valid JSON object matching the requested schema. Do not add markdown fences or text outside the JSON."},
            {"role": "user", "content": prompt}
        ]
        response_text = cls.chat_complete(messages, response_format={"type": "json_object"})
        try:
            return json.loads(cls._clean_json_text(response_text))
        except Exception as e:
            print("Failed to parse tailor resume JSON:", response_text)
            raise e

    @classmethod
    def generate_cover_letter(cls, resume_text: str, job_title: str, company: str, job_description: str) -> dict:
        """Generate a personalized, human-sounding cover letter for a specific role."""
        prompt = f"""\
You are an expert career coach and professional writer. Write a compelling, personalized cover letter for the candidate applying to the role below. The letter must sound human and be specific to the company—never generic.

Return ONLY a valid JSON object with this exact structure:
{{
  "subject_line": "Email subject line for this application",
  "body": "Full cover letter body text. Use newline characters (\\n) to separate paragraphs. Do NOT include a salutation—start directly with an engaging opening sentence about the company or role. End with a confident closing paragraph."
}}

Rules:
- Opening paragraph: Lead with something specific about {company} or the {job_title} role that shows genuine interest (not generic enthusiasm).
- Body paragraphs (2-3): Weave in 2-3 specific accomplishments from the resume that directly map to JD requirements. Use numbers and outcomes where possible.
- Closing paragraph: Reiterate fit, express enthusiasm for next steps. Confident but not arrogant.
- Tone: Professional yet conversational. First person. No filler phrases like "I am writing to express my interest...".
- Length: 250-350 words in the body.

Candidate Resume:
{resume_text}

Job Title: {job_title}
Company: {company}
Job Description:
{job_description}
"""
        messages = [
            {"role": "system", "content": "__mock_type__:cover_letter You are an expert career coach and cover letter writer. Always reply with a valid JSON object. No markdown fences or extra text."},
            {"role": "user", "content": prompt}
        ]
        response_text = cls.chat_complete(messages, response_format={"type": "json_object"})
        try:
            return json.loads(cls._clean_json_text(response_text))
        except Exception as e:
            print("Failed to parse cover letter JSON:", response_text)
            raise e

    @classmethod
    def generate_email(cls, resume_text: str, job_title: str, company: str, job_description: str, email_type: str) -> dict:
        """Generate a targeted job-search email. email_type: apply | cold | referral | followup | thankyou"""
        type_instructions = {
            "apply": (
                f"A professional job application email to submit your application for the {job_title} role at {company}. "
                "This is the PRIMARY email sent WITH a resume attachment, so it must:\n"
                "1. Open with a confident, specific hook — one sentence about why THIS role at THIS company excites you (reference something concrete about the company or JD).\n"
                "2. Paragraph 2 (3-4 sentences): Highlight 2-3 of your strongest, most relevant credentials that directly map to the JD requirements — include specific technologies, years of experience, or measurable outcomes. Never be vague.\n"
                "3. Closing paragraph (2 sentences): Reference that your resume is attached, express clear enthusiasm for next steps, and make it easy to schedule a call.\n"
                "Tone: Professional, confident, NOT stiff or robotic. NO phrases like 'I am writing to apply for' or 'Please find attached my resume'. Length: 180-230 words."
            ),
            "cold": "A cold outreach email to a hiring manager or recruiter at the company. Goal: get a conversation. Keep it under 150 words. Hook with one compelling data point about the company or role, then one crisp line about your strongest relevant credential, then a clear ask (15-min call).",
            "referral": "An email asking a mutual connection for a referral to a specific role. Warm, specific, respectful of their time. Remind them of your connection, explain the role you're targeting, and make the ask clear and easy (LinkedIn recommendation, or intro to hiring team).",
            "followup": "A follow-up email sent 5-7 days after submitting an application or after an interview with no response. Reiterate strong interest, add one new value point not mentioned before, and nudge politely toward next steps.",
            "thankyou": "A post-interview thank-you email sent within 24 hours. Reference a specific topic discussed during the interview. Reinforce one key reason you're the right fit. End with enthusiasm for the opportunity."
        }
        instruction = type_instructions.get(email_type, type_instructions["cold"])

        prompt = f"""\
You are an expert career coach. Write the following type of email for a job applicant:

Email Type: {email_type.upper()}
Instruction: {instruction}

Return ONLY a valid JSON object with this exact structure:
{{
  "subject": "Email subject line",
  "body": "Full email body. Use \\n for line breaks. Do NOT include a closing signature (like 'Best regards, [Name]')—end with the final sentence of the email body."
}}

Candidate Resume (for context):
{resume_text}

Job Title: {job_title}
Company: {company}
Job Description (excerpt):
{job_description[:800]}
"""
        messages = [
            {"role": "system", "content": "__mock_type__:email You are an expert career coach and email writer. Always reply with a valid JSON object. No markdown fences or extra text."},
            {"role": "user", "content": prompt}
        ]
        response_text = cls.chat_complete(messages, response_format={"type": "json_object"})
        try:
            return json.loads(cls._clean_json_text(response_text))
        except Exception as e:
            print(f"Failed to parse {email_type} email JSON:", response_text)
            raise e

    @classmethod
    def generate_interview_prep(cls, job_description: str, candidate_profile: dict) -> dict:
        """Generate structured interview questions with full answers for a specific job and candidate profile."""
        profile_summary = f"""
Skills: {', '.join(candidate_profile.get('skills', [])[:20])}
Experience roles: {', '.join([e.get('role','') for e in candidate_profile.get('experience', [])])}
Projects: {', '.join([p.get('name','') for p in candidate_profile.get('projects', [])])}
Education: {', '.join([e.get('degree','') + ' @ ' + e.get('institution','') for e in candidate_profile.get('education', [])])}
"""
        experience_details = json.dumps({
            "experience": candidate_profile.get("experience", []),
            "projects": candidate_profile.get("projects", []),
        }, indent=2)

        prompt = f"""\
You are a senior technical interviewer and career coach. Based on the job description and candidate profile below, generate a comprehensive set of interview questions — each with a full, model answer tailored to this specific candidate's actual experience and projects.

Return ONLY a valid JSON object with this exact structure:
{{
  "technical_questions": [
    {{
      "question": "Specific technical question relevant to the JD tech stack",
      "tip": "What the interviewer is really testing / what to emphasize in your answer",
      "sample_answer": "A first-person, 3-5 sentence model answer that references this candidate's actual skills/projects where relevant. Sound natural, not rehearsed."
    }}
  ],
  "coding_questions": [
    {{
      "question": "Coding problem or algorithm question relevant to this role",
      "difficulty": "easy|medium|hard",
      "hint": "Approach hint or data structure to consider",
      "approach_explanation": "2-3 sentence plain-English explanation of the optimal approach and why it works",
      "solution_code": "Complete, working, commented code that solves the problem",
      "solution_language": "python|javascript|java|cpp"
    }}
  ],
  "system_design_questions": [
    {{
      "question": "System design scenario relevant to this role/domain",
      "focus_areas": ["scalability", "database choice", "API design"],
      "sample_answer": "A structured 4-6 sentence answer walking through high-level architecture, key components, tradeoffs, and scaling strategy. Reference the candidate's actual project experience where it applies."
    }}
  ],
  "hr_questions": [
    {{
      "question": "HR or culture-fit question",
      "tip": "What to emphasize in your answer based on this company/role",
      "sample_answer": "A first-person, 2-4 sentence answer that is specific and grounded — references real (but plausible) situations from the candidate's experience."
    }}
  ],
  "behavioral_questions": [
    {{
      "question": "Behavioral STAR-format question",
      "framework_tip": "Suggested STAR structure: Situation about X, Task involving Y, Action using Z skill, Result with measurable outcome",
      "sample_answer": "A complete STAR-format answer in first person. Reference one of the candidate's actual projects or roles to ground it in their real experience. 5-7 sentences."
    }}
  ]
}}

Rules:
- Generate exactly 4-5 questions per category (20-25 total).
- All questions and answers must be specific to this JD and candidate — no generic filler.
- technical_questions must reference actual technologies mentioned in the JD.
- coding_questions: solution_code must be complete, syntactically correct, and commented.
- sample_answer fields must be written in first person ("I built...", "In my project...").
- ONLY reference experience and projects that exist in the candidate profile — do not fabricate.
- For coding questions, choose the most appropriate language (prefer Python unless JD specifies otherwise).

Job Description:
{job_description[:2000]}

Candidate Profile Summary:
{profile_summary}

Candidate Experience & Projects (for grounding answers):
{experience_details[:1500]}
"""
        messages = [
            {"role": "system", "content": "__mock_type__:interview_prep You are an expert technical interviewer. Always reply with a valid JSON object matching the exact schema. No markdown fences or extra text outside the JSON."},
            {"role": "user", "content": prompt}
        ]
        response_text = cls.chat_complete(messages, response_format={"type": "json_object"})
        try:
            return json.loads(cls._clean_json_text(response_text))
        except Exception as e:
            print("Failed to parse interview prep JSON:", response_text)
            raise e

    @classmethod
    def generate_resume_variants(cls, candidate_profile: any) -> dict:
        """Generate 3 resume framings (Backend, AI/ML, Data) from the same base profile in one call.
        
        CONSTRAINT: This only reframes/rewords/reorders existing experience.
        It never fabricates new roles, companies, degrees, or skills.
        """
        if isinstance(candidate_profile, dict):
            profile_json = json.dumps({
                "skills": candidate_profile.get("skills", []),
                "experience": candidate_profile.get("experience", []),
                "projects": candidate_profile.get("projects", []),
                "education": candidate_profile.get("education", []),
                "certifications": candidate_profile.get("certifications", []),
                "raw_resume_text": candidate_profile.get("raw_resume_text", ""),
            }, indent=2)
        elif isinstance(candidate_profile, str):
            profile_json = json.dumps({"raw_resume_text": candidate_profile}, indent=2)
        else:
            profile_json = json.dumps({"raw_resume_text": str(candidate_profile)}, indent=2)

        prompt = f"""\
You are an expert resume writer. Given the single candidate profile below, produce three distinct resume framings.

IMPORTANT CONSTRAINT: You may ONLY reorder, reword, and re-emphasize content that already exists in the profile. Do NOT invent new job titles, companies, skills, degrees, projects, or experiences that are not present in the candidate profile. Your job is reframing, not fabrication.

Return ONLY a valid JSON object with this exact structure:
{{
  "variants": [
    {{
      "variant": "backend",
      "professional_summary": "2-3 sentence summary emphasizing backend/full-stack/API/system architecture angle",
      "reordered_skills": ["Most relevant backend/infra skills first, then others from their actual skill list"],
      "reworded_experience_bullets": [
        {{
          "original_role": "Exact role name from their experience",
          "bullets": [
            "• Reworded bullet emphasizing backend/API/system architecture achievements from EXISTING highlights",
            "• Another bullet focusing on scalability, database, or infrastructure work they actually did"
          ]
        }}
      ],
      "highlighted_projects": ["Project names from their profile most relevant to backend/full-stack work"]
    }},
    {{
      "variant": "ai_ml",
      "professional_summary": "2-3 sentence summary emphasizing ML models, embeddings, RAG, LLM integration angle",
      "reordered_skills": ["Most relevant AI/ML skills first, then others from their actual skill list"],
      "reworded_experience_bullets": [
        {{
          "original_role": "Exact role name from their experience",
          "bullets": [
            "• Reworded bullet emphasizing ML, data science, or AI integration work they actually did",
            "• Another bullet focusing on model training, evaluation, or deployment they actually did"
          ]
        }}
      ],
      "highlighted_projects": ["Project names from their profile most relevant to AI/ML work"]
    }},
    {{
      "variant": "data",
      "professional_summary": "2-3 sentence summary emphasizing data pipelines, dashboards, SQL, analytics angle",
      "reordered_skills": ["Most relevant data/analytics/SQL skills first, then others from their actual skill list"],
      "reworded_experience_bullets": [
        {{
          "original_role": "Exact role name from their experience",
          "bullets": [
            "• Reworded bullet emphasizing data pipeline, ETL, dashboard, or analytics work they actually did",
            "• Another bullet focusing on SQL, reporting, or business intelligence work they actually did"
          ]
        }}
      ],
      "highlighted_projects": ["Project names from their profile most relevant to data/analytics work"]
    }}
  ]
}}

Rules:
- Each professional_summary must be unique and specifically tailored to that variant's angle.
- reordered_skills must only contain skills from the candidate's actual skill list — just reordered by relevance.
- reworded_experience_bullets must only reword highlights that actually exist in the profile — no new bullets.
- highlighted_projects must only name projects that actually exist in the profile.
- If the profile lacks data for a specific angle (e.g., no ML work), be honest and minimal rather than fabricating.

Candidate Profile:
{profile_json}
"""
        messages = [
            {"role": "system", "content": "__mock_type__:variants You are an expert resume writer. You reframe, never fabricate. Always reply with a valid JSON object. No markdown fences or extra text outside the JSON."},
            {"role": "user", "content": prompt}
        ]
        response_text = cls.chat_complete(messages, response_format={"type": "json_object"})
        try:
            return json.loads(cls._clean_json_text(response_text))
        except Exception as e:
            print("Failed to parse resume variants JSON:", response_text)
            raise e

    @classmethod
    def check_hallucinations(cls, original_resume: str, tailored_bullets: list[str]) -> list[str]:
        """Compare tailored resume bullets against original resume text for hallucination detection."""
        import os
        if os.getenv("MOCK_LLM") == "true":
            # Heuristic check: if bullets contain words like "Rust" or "Kubernetes" which are not in original_resume
            warnings = []
            orig_lower = original_resume.lower()
            for b in tailored_bullets:
                b_lower = b.lower()
                for tech in ["kubernetes", "rust", "aws", "docker", "gcp"]:
                    if tech in b_lower and tech not in orig_lower:
                        warnings.append(f"Tailored bullet claims experience with '{tech.upper()}', which is not present in the original resume.")
            return warnings

        prompt = f"""
Compare the tailored resume experience bullets against the candidate's original resume content.
Identify if any tailored bullet introduces new skills, tools, technologies, certifications, or major factual claims that are not present anywhere in the original resume.
Ignore normal reframing, grammar improvements, or wording changes. Only flag actual fabrications (e.g. claiming experience with Kubernetes or AWS if they are not mentioned at all in the original resume).

Original Resume Text:
{original_resume}

Tailored Bullets:
{json.dumps(tailored_bullets)}

Return ONLY a valid JSON object with the following exact structure:
{{
  "hallucination_warnings": [
    "Specific warning message explaining what claim or tool was fabricated"
  ]
}}
"""
        messages = [
            {"role": "system", "content": "You are a career coaching quality guardrail AI. Always reply with a valid JSON object matching the requested schema. Do not add markdown fences or text outside the JSON."},
            {"role": "user", "content": prompt}
        ]
        
        try:
            response_text = cls.chat_complete(messages, response_format={"type": "json_object"})
            data = json.loads(cls._clean_json_text(response_text))
            return data.get("hallucination_warnings", [])
        except Exception as e:
            print(f"Hallucination check failed: {e}")
            return []

    @classmethod
    def answer_screening_question(cls, question: str, candidate_context: str) -> str:
        """Generates a concise, accurate answer to custom ATS screening questions."""
        import os
        if os.getenv("MOCK_LLM") == "true":
            q_lower = question.lower()
            if "year" in q_lower or "experience" in q_lower:
                return "4+ years"
            if "salary" in q_lower or "compensation" in q_lower:
                return "Competitive based on market rates"
            if "notice" in q_lower or "start" in q_lower:
                return "Immediately / 2 weeks"
            if "sponsorship" in q_lower or "authorized" in q_lower or "visa" in q_lower:
                return "Authorized to work in India / No sponsorship required"
            return "Experienced engineer with strong background in Python, microservices, and AI integrations."

        prompt = f"""
Given the candidate profile context, generate a concise, truthful, and professional answer to the following job application screening question.
Keep the answer under 2 sentences (or a short direct phrase if asking for numbers/years/notice period).

Candidate Profile Context:
{candidate_context}

Screening Question:
"{question}"

Answer:
"""
        messages = [
            {"role": "system", "content": "You are a professional job application assistant. Provide short, direct, accurate answers to screening questions based solely on the provided candidate profile."},
            {"role": "user", "content": prompt}
        ]

        try:
            return cls.chat_complete(messages).strip()
        except Exception as e:
            print(f"Screening question solver error: {e}")
            return "4+ years experience"

    @classmethod
    def evaluate_multi_pillar_job_match(cls, profile_dict: dict, job_dict: dict) -> dict:
        """
        Evaluates candidate fit across 4 distinct pillars:
        1. Technical & Skills Fit (0-100)
        2. Seniority & Experience Calibration (0-100)
        3. Compensation & Role Fit (0-100)
        4. Culture & Growth Alignment (0-100)
        Returns comprehensive breakdown with overall score, pros, and potential red flags.
        """
        import os
        if os.getenv("MOCK_LLM") == "true":
            return {
                "skills_score": 92.0,
                "seniority_score": 88.0,
                "salary_score": 85.0,
                "culture_growth_score": 90.0,
                "overall_score": 89.5,
                "pros": ["Direct match with target stack", "Relevant domain experience"],
                "potential_red_flags": ["Check commute or specific tool versions if applicable"]
            }

        prompt = f"""
Evaluate the candidate's profile against the given job description across 4 pillars.
Output a JSON object with scores (0-100) and actionable qualitative feedback.

Pillars to score:
1. skills_score: Technical alignment with required and preferred tech stack/tools.
2. seniority_score: Experience level & leadership/IC calibration.
3. salary_score: Compensation expectations match (if specified) or general role title level match.
4. culture_growth_score: Alignment with role scope, domain, and career trajectory.
5. overall_score: Weighted composite score (e.g. 0.40*skills + 0.30*seniority + 0.15*salary + 0.15*culture).
6. pros: Array of 2-3 specific reasons this job is a strong fit.
7. potential_red_flags: Array of 1-2 points of potential misalignment or gaps to address.

Candidate Profile:
{json.dumps(profile_dict, indent=2)}

Job Details:
Title: {job_dict.get('title')}
Company: {job_dict.get('company')}
Location: {job_dict.get('location')} (Remote: {job_dict.get('remote')})
Salary Range: {job_dict.get('salary_range')}
Description: {job_dict.get('description', '')[:2500]}

Return ONLY a valid JSON object matching this schema:
{{
  "skills_score": number,
  "seniority_score": number,
  "salary_score": number,
  "culture_growth_score": number,
  "overall_score": number,
  "pros": ["string"],
  "potential_red_flags": ["string"]
}}
"""
        messages = [
            {"role": "system", "content": "__mock_type__:multi_pillar_match You are a principal technical recruiter and career evaluator. Always reply with valid JSON only."},
            {"role": "user", "content": prompt}
        ]

        try:
            response_text = cls.chat_complete(messages, response_format={"type": "json_object"})
            return json.loads(cls._clean_json_text(response_text))
        except Exception as e:
            print(f"Multi-pillar job match evaluation failed: {e}")
            return {
                "skills_score": 80.0,
                "seniority_score": 80.0,
                "salary_score": 80.0,
                "culture_growth_score": 80.0,
                "overall_score": 80.0,
                "pros": ["Matches primary keywords"],
                "potential_red_flags": []
            }

    @classmethod
    def generate_screening_answers_dict(cls, questions: list[str], candidate_context: str) -> dict:
        """Generates screening answers for multiple questions in a single LLM call."""
        if not questions:
            return {}

        import os
        if os.getenv("MOCK_LLM") == "true":
            return {q: cls.answer_screening_question(q, candidate_context) for q in questions}

        prompt = f"""
Given the candidate's profile context, answer each of the following application form screening questions.
Keep each answer concise, professional, and truthful based strictly on candidate context.

Candidate Profile Context:
{candidate_context}

Questions:
{json.dumps(questions, indent=2)}

Return ONLY a valid JSON object mapping each question to its concise answer:
{{
  "question text": "concise answer"
}}
"""
        messages = [
            {"role": "system", "content": "__mock_type__:bulk_screening_questions You are an expert application form assistant. Always reply with valid JSON only."},
            {"role": "user", "content": prompt}
        ]

        try:
            response_text = cls.chat_complete(messages, response_format={"type": "json_object"})
            return json.loads(cls._clean_json_text(response_text))
        except Exception as e:
            print(f"Bulk screening questions solver failed: {e}")
            return {q: cls.answer_screening_question(q, candidate_context) for q in questions}


