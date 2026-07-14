import json
import requests
from app.config import MISTRAL_API_KEY

class MistralService:
    @staticmethod
    def chat_complete(messages: list, response_format: dict = None) -> str:
        if not MISTRAL_API_KEY:
            raise ValueError("MISTRAL_API_KEY environment variable is not set")
        
        headers = {
            "Authorization": f"Bearer {MISTRAL_API_KEY}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": "mistral-large-latest",
            "messages": messages
        }
        
        if response_format:
            payload["response_format"] = response_format
            
        url = "https://api.mistral.ai/v1/chat/completions"
        response = requests.post(url, headers=headers, json=payload)
        response.raise_for_status()
        
        data = response.json()
        return data["choices"][0]["message"]["content"]

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
  }}
}}

Ensure that you match this structure exactly. Do not add any text outside of the JSON object.
Extract all links (especially GitHub, LinkedIn, portfolio/personal website links) and put them in the "links" object. If none are found, set them to empty strings.

Resume Text:
{raw_text}
"""
        messages = [
            {"role": "system", "content": "You are an expert resume parsing AI. Extract clean structured data from the provided resume text. Always reply with a valid JSON object matching the requested schema."},
            {"role": "user", "content": prompt}
        ]
        
        response_text = cls.chat_complete(messages, response_format={"type": "json_object"})
        try:
            profile_data = json.loads(response_text)
            return profile_data
        except Exception as e:
            print("Failed to parse JSON response:", response_text)
            raise e

    @staticmethod
    def get_embeddings(texts: list[str]) -> list[list[float]]:
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
        response = requests.post(url, headers=headers, json=payload)
        response.raise_for_status()
        
        data = response.json()
        return [item["embedding"] for item in data["data"]]

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
            {"role": "system", "content": "You are a professional recruiting coordinator. Perform a skill gap and fit analysis between the resume and job description. Always reply with a valid JSON object matching the requested schema."},
            {"role": "user", "content": prompt}
        ]
        
        response_text = cls.chat_complete(messages, response_format={"type": "json_object"})
        try:
            analysis = json.loads(response_text)
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
            {"role": "system", "content": "You are an ATS parsing expert. Always reply with a valid JSON object matching the requested schema. Do not add markdown fences or explanatory text outside the JSON."},
            {"role": "user", "content": prompt}
        ]
        response_text = cls.chat_complete(messages, response_format={"type": "json_object"})
        try:
            return json.loads(response_text)
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
            {"role": "system", "content": "You are an expert resume writer specializing in ATS optimization. Always reply with a valid JSON object matching the requested schema. Do not add markdown fences or text outside the JSON."},
            {"role": "user", "content": prompt}
        ]
        response_text = cls.chat_complete(messages, response_format={"type": "json_object"})
        try:
            return json.loads(response_text)
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
            {"role": "system", "content": "You are an expert career coach and cover letter writer. Always reply with a valid JSON object. No markdown fences or extra text."},
            {"role": "user", "content": prompt}
        ]
        response_text = cls.chat_complete(messages, response_format={"type": "json_object"})
        try:
            return json.loads(response_text)
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
            {"role": "system", "content": "You are an expert career coach and email writer. Always reply with a valid JSON object. No markdown fences or extra text."},
            {"role": "user", "content": prompt}
        ]
        response_text = cls.chat_complete(messages, response_format={"type": "json_object"})
        try:
            return json.loads(response_text)
        except Exception as e:
            print(f"Failed to parse {email_type} email JSON:", response_text)
            raise e
