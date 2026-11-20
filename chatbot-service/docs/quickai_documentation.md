# Quick.AI — Complete Application & Knowledge Base Documentation

> **Document Version**: 2.0.0  
> **Target Audience**: Vector DB Embeddings, RAG Semantic Search, System Documentation  
> **Application Scope**: Quick.AI Career Development & Job Search SaaS Platform  
> **Live Web Application**: [https://quickai.store](https://quickai.store)  
> **API Gateway**: [https://api.quickai.store](https://api.quickai.store)  

---

## Table of Contents

- [1. Application Overview](#1-application-overview)
  - [1.1 Purpose & Value Proposition](#11-purpose--value-proposition)
  - [1.2 Architecture & Tech Stack](#12-architecture--tech-stack)
  - [1.3 User Tiers & Credit Quotas](#13-user-tiers--credit-quotas)
  - [1.4 Security, Authentication & Isolation](#14-security-authentication--isolation)
- [2. Feature Documentation](#2-feature-documentation)
  - [2.1 Smart Email Writer (`/ai/write-email`)](#21-smart-email-writer-aiwrite-email)
  - [2.2 Resume Review & ATS Analyzer (`/ai/review-resume`)](#22-resume-review--ats-analyzer-aireview-resume)
  - [2.3 Resume Tailor & JD Matching (`/ai/resume-tailor`)](#23-resume-tailor--jd-matching-airesume-tailor)
  - [2.4 LinkedIn Profile Optimizer (`/ai/linkedin-optimizer`)](#24-linkedin-profile-optimizer-ailinkedin-optimizer)
  - [2.5 Recruiter Outreach (`/ai/recruiter-outreach`)](#25-recruiter-outreach-airecruiter-outreach)
  - [2.6 AI Interview Coach (`/ai/interview-coach`)](#26-ai-interview-coach-aiinterview-coach)
  - [2.7 Career Profile Score (`/ai/career-score`)](#27-career-profile-score-aicareer-score)
  - [2.8 Job Application Tracker & Insights (`/ai/job-tracker`)](#28-job-application-tracker--insights-aijob-tracker)
  - [2.9 Dashboard & Creations Gallery (`/ai`)](#29-dashboard--creations-gallery-ai)
- [3. End-to-End Workflows](#3-end-to-end-workflows)
  - [3.1 Email Writing Workflow](#31-email-writing-workflow)
  - [3.2 Resume Review & ATS Improvement Workflow](#32-resume-review--ats-improvement-workflow)
  - [3.3 Targeted Resume Tailoring Workflow](#33-targeted-resume-tailoring-workflow)
  - [3.4 LinkedIn Profile Optimization Workflow](#34-linkedin-profile-optimization-workflow)
  - [3.5 Interactive Mock Interview Workflow](#35-interactive-mock-interview-workflow)
  - [3.6 Job Application Tracking & Conversion Workflow](#36-job-application-tracking--conversion-workflow)
- [4. Navigation & Route Reference](#4-navigation--route-reference)
  - [4.1 Frontend Route Table](#41-frontend-route-table)
  - [4.2 Backend API Endpoint Mapping](#42-backend-api-endpoint-mapping)
- [5. System Boundaries & Limitations](#5-system-boundaries--limitations)
  - [5.1 Strict Non-Agentic Guardrail](#51-strict-non-agentic-guardrail)
  - [5.2 Quotas, Rate Limits & File Constraints](#52-quotas-rate-limits--file-constraints)
  - [5.3 Scope Enforcement](#53-scope-enforcement)
- [6. Frequently Asked Questions (FAQs)](#6-frequently-asked-questions-faqs)

---

# 1. Application Overview

<!-- doc_metadata: {"section": "overview", "app": "quickai", "keywords": ["overview", "architecture", "tiers", "auth"]} -->

### 1.1 Purpose & Value Proposition
**Quick.AI** is an all-in-one, AI-powered career enablement and job search acceleration SaaS platform. Designed to eliminate the friction in modern job seeking, Quick.AI unifies candidate preparation into a single cohesive workspace:
- **Resume Optimization**: Analyzes resumes for Applicant Tracking System (ATS) compatibility, flags weaknesses, and tailors bullets to specific job descriptions.
- **Social & Networking Presence**: Optimizes LinkedIn profiles and generates high-converting recruiter outreach messages.
- **Career Communication**: Generates formal workplace correspondence and networking emails.
- **Interview Readiness**: Provides an interactive mock interview simulator scoring candidates on technical depth, situational clarity, and the STAR methodology.
- **Application Pipeline Management**: Centralizes job applications in a Kanban/tabular tracker with historical conversion insights and aggregate career readiness scores.

### 1.2 Architecture & Tech Stack
The Quick.AI platform follows a distributed, production-grade microservice architecture:
- **Frontend Client**: React 19 single-page application built with Vite, TailwindCSS, Framer Motion, GSAP animations, Lucide icons, and Clerk React Authentication, hosted on Vercel Edge Network.
- **Backend Core API**: Node.js and Express 5 REST API handling authentication, creation logging, and database operations.
- **Database Layer**: Neon Serverless PostgreSQL providing scalable relational storage for user profiles, historical creations, and job applications.
- **Asynchronous Task Queue**: Redis and BullMQ decoupled job queue processing long-running AI tasks without blocking Node.js event loops, backed by Socket.IO for real-time progress notifications.
- **Multi-Tier AI Fallback Engine**: Primary generation through Google Gemini 2.5 Flash, secondary failover via OpenRouter multi-model array (`gemini-2.0-flash-lite`, `llama-3.3-70b`, `nemotron-3.5`), and graceful demo fallbacks on quota exhaustion.
- **Chatbot & RAG Microservice**: Python/FastAPI microservice ("Fizzi AI") running vector similarity search, query rewriting, guardrail scope enforcement, and LLM-as-a-Judge answer evaluation.
- **Cloud Infrastructure**: Orchestrated on K3s Kubernetes (ARM64 Oracle Cloud Infrastructure) with zero open public inbound ports, routed securely through Cloudflare Zero-Trust Tunnels.

### 1.3 User Tiers & Credit Quotas
Quick.AI uses a transparent subscription tier model:
- **Free Plan**:
  - Automatically assigned upon user registration.
  - Grants a total allowance of **5 free creations** across all generative tools.
  - Full access to ATS resume review, email writing, LinkedIn optimization, interview coach, and job tracker.
  - Usage counter increments with every completed generation.
  - Once `remaining_free_usage == 0`, subsequent generations are blocked until an upgrade.
- **Premium Plan**:
  - Activated via Clerk Pricing Table / subscription checkout.
  - **Unlimited creations** across all career tools.
  - Priority execution in BullMQ job queues.
  - Unlimited access to career score recalculations and deep job search analytics.

### 1.4 Security, Authentication & Isolation
- **Authentication**: Managed through Clerk (`@clerk/clerk-react` and Clerk Express middleware). All user identity is verified via signed JSON Web Tokens (JWT) passed in the `Authorization: Bearer <token>` header.
- **Data Isolation**: Strict multi-tenant row-level boundaries in Neon PostgreSQL (`WHERE user_id = $1`). Users can only query, read, or delete their own creation history, job applications, and career score evaluations.
- **Sliding-Window Rate Limiting**: Redis sorted-set (`ZSET`) sliding-window rate limiter enforcing a strict maximum of **10 requests per rolling 60-second window** per user to prevent denial-of-service abuse.

---

# 2. Feature Documentation

---

## 2.1 Smart Email Writer (`/ai/write-email`)

<!-- doc_metadata: {"feature": "smart_email", "route": "/ai/write-email", "backend_endpoint": "POST /api/ai/generate-email"} -->

### Description & Capabilities
The **Smart Email Writer** drafts professional, context-aware emails tailored to specific business and career scenarios. It eliminates writer's block by transforming bullet points or brief prompts into structured, polished communications.

### Core Options & Input Parameters
- **Recipient Type**: Select recipient category (e.g., Hiring Manager, Recruiter, Colleague, Executive, Client).
- **Email Intent / Purpose**: 
  - Application Follow-Up
  - Cold Professional Inquiry / Networking
  - Interview Thank You Note
  - Offer Negotiation & Acceptance
  - Resignation Letter
  - Project Status Update
- **Tone**: Formal, Professional & Cordial, Persuasive, Assertive, or Direct.
- **Key Details / Prompt**: Plain text field specifying role title, company name, specific accomplishments to mention, dates, or deadlines.
- **Target Length**: Short (100–150 words), Medium (150–250 words), or Detailed (250–400 words).

### Output Structure
The generated output includes:
1. **Subject Line**: Catchy, clear, professional subject line options.
2. **Salutation**: Appropriately addressed greeting based on recipient type.
3. **Email Body**: Cohesive, structured opening, context, value proposition, and closing call-to-action.
4. **Sign-Off & Signature Placeholder**: Formal closing block with candidate contact placeholders.

### Navigation Path
- Direct URL: `https://quickai.store/ai/write-email`
- Sidebar Menu: Click **"Smart Email"** or **"Email Writer"** in the sidebar navigation.

---

## 2.2 Resume Review & ATS Analyzer (`/ai/review-resume`)

<!-- doc_metadata: {"feature": "resume_review", "route": "/ai/review-resume", "backend_endpoint": "POST /api/ai/review-resume"} -->

### Description & Capabilities
The **Resume Reviewer** performs a rigorous Applicant Tracking System (ATS) audit and professional career critique of uploaded resumes. It simulates the screening heuristics used by corporate recruiting platforms (Workday, Greenhouse, Lever).

### Accepted Formats & File Limits
- **File Format**: PDF documents only (`application/pdf`).
- **File Size Limit**: Maximum 5 MB per upload.
- **Parsing Engine**: `pdf-parse` extracts raw text from PDF text layers (scanned image PDFs without selectable text are flagged for OCR pre-processing).

### Output Breakdown & Scoring
The evaluation returns a structured report comprising:
- **ATS Compatibility Score (0–100)**: Quantifies layout readability, keyword density, section headers, and formatting cleanliness.
- **Executive Summary**: High-level overview of candidate seniority, domain alignment, and immediate impression.
- **Identified Strengths**: Bullet points detailing strong action verbs, quantifiable achievements, and technical competencies.
- **Critical Weaknesses & Gaps**: Highlights missing metrics, passive voice, weak bullet openings, date inconsistencies, or buzzword overuse.
- **Actionable Recommendations**: Step-by-step revision guidance for experience bullets, formatting fixes, and skill categorization.

### Navigation Path
- Direct URL: `https://quickai.store/ai/review-resume`
- Sidebar Menu: Click **"Resume Review"** in the left navigation sidebar.

---

## 2.3 Resume Tailor & JD Matching (`/ai/resume-tailor`)

<!-- doc_metadata: {"feature": "resume_tailor", "route": "/ai/resume-tailor", "backend_endpoint": "POST /api/ai/resume-tailor"} -->

### Description & Capabilities
The **Resume Tailor** synchronizes a candidate's existing resume with a specific target Job Description (JD). It identifies exact skill mismatches and rewrites experience statements to mirror the vocabulary and qualifications required by the employer.

### Required Inputs
1. **Resume File**: Uploaded PDF or pre-loaded existing resume from the user's creations archive.
2. **Target Job Description (JD)**: Text area where the user pastes the full job posting (role overview, technical requirements, responsibilities).

### Tailoring Engine & Output
The tool produces:
- **Match Alignment Percentage**: Quantifies how closely the current resume matches the job posting.
- **Keyword & Skill Gap Matrix**:
  - *Hard Skills Present*: Matching technical tools, frameworks, and domain expertise.
  - *Missing Keywords*: Core requirements found in the JD that are absent from the resume.
- **Tailored Bullet Points**: Rewritten experience bullets adopting the Google XYZ formula: *"Accomplished [X] as measured by [Y] by doing [Z]"*.
- **Custom Professional Summary**: A tailored 3-to-4 line summary highlighting alignment with the target company's mission and tech stack.

### Navigation Path
- Direct URL: `https://quickai.store/ai/resume-tailor`
- Sidebar Menu: Click **"Resume Tailor"** under the Career Tools navigation group.

---

## 2.4 LinkedIn Profile Optimizer (`/ai/linkedin-optimizer`)

<!-- doc_metadata: {"feature": "linkedin_optimizer", "route": "/ai/linkedin-optimizer", "backend_endpoint": "POST /api/ai/linkedin-optimizer"} -->

### Description & Capabilities
The **LinkedIn Profile Optimizer** audits and revamps a user's LinkedIn presence to rank higher in recruiter Boolean searches and increase InMail profile views.

### Input Parameters
Users submit their current profile content:
- Current Headline & Target Role.
- Existing "About" Summary.
- Experience Section summaries or raw resume bullets.
- Target Industry and Core Skill Keywords.

### Optimization Deliverables
- **High-Impact Headlines**: 3 targeted headline options combining current role, technical niche, and unique value proposition (e.g., *"Full-Stack Software Engineer \| React 19, Node.js, Distributed Systems \| Scaled Microservices to 2M+ Users"*).
- **Story-Driven "About" Section**: A first-person narrative showcasing career trajectory, technical passions, major milestones, and a clear call-to-action for recruiters.
- **Experience Bullets**: Polished, achievement-oriented bullet points formatted specifically for mobile LinkedIn readability.
- **Recommended Skills to Add**: Top 10 high-demand LinkedIn skills for the user's domain.

### Navigation Path
- Direct URL: `https://quickai.store/ai/linkedin-optimizer` (also available via `/linkedin-optimizer`)
- Sidebar Menu: Click **"LinkedIn Optimizer"**.

---

## 2.5 Recruiter Outreach (`/ai/recruiter-outreach`)

<!-- doc_metadata: {"feature": "recruiter_outreach", "route": "/ai/recruiter-outreach", "backend_endpoint": "POST /api/ai/recruiter-outreach"} -->

### Description & Capabilities
The **Recruiter Outreach** generator crafts short, persuasive, personalized networking messages designed to bypass automated job queues and secure recruiter phone screens.

### Inputs & Filters
- **Outreach Channel**: LinkedIn Connection Request (strict 300-character limit), LinkedIn InMail, Cold Email, or Mutual Connection Referral Request.
- **Target Details**: Recruiter Name, Target Company, Role Title, and Specific Company Hook (e.g., recent product launch, engineering blog post, funding round).
- **Candidate Differentiator**: 1–2 key career highlights or portfolio projects matching the company's tech stack.

### Output
- **Channel-Optimized Messages**: Strictly validated against character constraints (e.g., connection notes never exceed 300 characters).
- **Follow-Up Cadence**: Pre-drafted follow-up messages for Day 4 and Day 8 if no response is received.

### Navigation Path
- Direct URL: `https://quickai.store/ai/recruiter-outreach`
- Sidebar Menu: Click **"Recruiter Outreach"**.

---

## 2.6 AI Interview Coach (`/ai/interview-coach`)

<!-- doc_metadata: {"feature": "interview_coach", "route": "/ai/interview-coach", "backend_endpoints": ["POST /api/ai/interview/start", "POST /api/ai/interview/answer"]} -->

### Description & Capabilities
The **AI Interview Coach** is an interactive, multi-turn mock interview simulator. It tests candidates across technical architecture, behavioral challenges, and leadership principles.

### Operational Mechanics
1. **Session Setup**: User specifies Target Role (e.g., Senior Frontend Engineer), Experience Level (Junior, Mid, Senior, Lead), and Focus Area (Behavioral/STAR, System Design, Coding Concepts, Culture Fit).
2. **Dynamic Questioning**: The simulator generates realistic, company-caliber questions one at a time.
3. **Candidate Response & Critique**: The candidate submits their answer. The coach grades the response in real time on:
   - **Structure & Clarity**: Did the candidate use the STAR framework (Situation, Task, Action, Result)?
   - **Technical Accuracy & Depth**: Were relevant design tradeoffs, algorithms, or metrics cited?
   - **Areas for Improvement**: Actionable suggestions for what to include or remove.
4. **Session History**: Stores overall session score and question-by-question breakdown in PostgreSQL.

### Navigation Path
- Direct URL: `https://quickai.store/ai/interview-coach`
- Sidebar Menu: Click **"Interview Coach"**.

---

## 2.7 Career Profile Score (`/ai/career-score`)

<!-- doc_metadata: {"feature": "career_score", "route": "/ai/career-score", "backend_endpoint": "GET /api/ai/career-score"} -->

### Description & Capabilities
The **Career Profile Score** acts as a unified "credit score" for a candidate's job readiness. It synthesizes all past user creations, evaluations, and job tracking data into a single 0–100 index with four sub-dimension scores.

### Score Dimensions & Weighting
- **Resume Strength (35%)**: Derived from historical ATS scores and resume tailoring iterations.
- **LinkedIn Readiness (20%)**: Evaluates headline quality, about section depth, and skill alignment.
- **Interview Performance (25%)**: Aggregated from mock interview coach session ratings and answer completeness.
- **Job Search Velocity (20%)**: Based on active applications logged, interview progression stages, and activity consistency in the Job Tracker.

### Historical Tracking
- Visualizes score progression over time in a radar and historical line chart.
- Highlights the highest-leverage actions to boost the score (e.g., *"Complete 1 mock interview session to raise your score from 74 to 82"*).

### Navigation Path
- Direct URL: `https://quickai.store/ai/career-score`
- Sidebar Menu: Click **"Career Score"**.

---

## 2.8 Job Application Tracker & Insights (`/ai/job-tracker`)

<!-- doc_metadata: {"feature": "job_tracker", "route": "/ai/job-tracker", "backend_endpoints": ["POST /api/jobs", "GET /api/jobs", "PATCH /api/jobs/:id", "POST /api/jobs/insights/analyze"]} -->

### Description & Capabilities
The **Job Application Tracker** replaces messy spreadsheets with an integrated pipeline management board. Candidates track applications across five lifecycle stages: `Saved` ➔ `Applied` ➔ `Interviewing` ➔ `Offered` ➔ `Rejected`.

### Core Features
- **Application Details**: Stores Company Name, Role Title, Job Description, Salary Range, Applied Date, Recruiter Contact, and Custom Notes.
- **Activity & Status Timeline**: Logs status transitions and records interview round dates and follow-up reminders.
- **AI Job Search Insights (`/insights/analyze`)**:
  - Analyzes application conversion rates (e.g., *Application-to-Interview ratio*).
  - Pinpoints pipeline bottlenecks (e.g., *High rejection at resume stage indicates ATS keyword mismatch; high drop-off at interview stage indicates interview prep need*).
  - Evaluates search velocity and provides strategic recommendations.

### Navigation Path
- Direct URL: `https://quickai.store/ai/job-tracker` (also available via `/job-tracker`)
- Sidebar Menu: Click **"Job Tracker"**.

---

## 2.9 Dashboard & Creations Gallery (`/ai`)

<!-- doc_metadata: {"feature": "dashboard", "route": "/ai", "backend_endpoints": ["GET /api/user/creations", "GET /api/user/account"]} -->

### Description & Capabilities
The **Main Dashboard** serves as the user's primary command center upon logging in:
- Displays total lifetime creations, active subscription plan badge (`Free` vs `Premium`), and remaining free credits counter.
- Quick-launch cards for all seven career tools.
- **Recent Activity Feed**: Chronological list of recently generated emails, resume audits, tailored bullets, and interview sessions.
- **Creations Management**: View, copy to clipboard, or delete past generated content. Cached in Redis for 5 minutes (`user:creations:{userId}`) for sub-millisecond retrieval.

### Navigation Path
- Direct URL: `https://quickai.store/ai`
- Sidebar Menu: Click **"Dashboard"** (or Quick.AI logo).

---

# 3. End-to-End Workflows

<!-- doc_metadata: {"section": "workflows", "keywords": ["workflow", "guide", "steps", "how-to"]} -->

### 3.1 Email Writing Workflow
1. Navigate to `/ai/write-email`.
2. Select recipient type and intent (e.g., *Recipient: Recruiter*, *Intent: Application Follow-Up*).
3. Choose desired tone (*Professional & Cordial*) and target length (*Medium*).
4. Enter key context in the prompt box (Role: *Senior DevOps Engineer*, Company: *Stripe*, Applied: *7 days ago*).
5. Click **"Generate Email"**.
6. System verifies credit balance, executes generation, and logs creation to PostgreSQL.
7. Review draft, edit directly in the text editor, and click **"Copy to Clipboard"**.

### 3.2 Resume Review & ATS Improvement Workflow
1. Navigate to `/ai/review-resume`.
2. Drag and drop the candidate resume PDF into the upload zone (maximum 5 MB).
3. Click **"Analyze Resume"**.
4. The system sends the file via multipart form-data to `POST /api/ai/review-resume`, where `pdf-parse` extracts raw text and passes it to the AI evaluator.
5. Review the ATS Compatibility Score (0–100), identified strengths, missing keywords, and section critiques.
6. Implement recommended revisions in the original resume document.
7. Re-upload revised PDF to verify score improvement and update the Career Profile Score.

### 3.3 Targeted Resume Tailoring Workflow
1. Navigate to `/ai/resume-tailor`.
2. Upload current base resume (PDF) or select from previous uploads.
3. Paste the target Job Description in the text area.
4. Click **"Tailor Resume"**.
5. Inspect the keyword gap analysis to review missing competencies.
6. Copy the tailored XYZ bullet points and paste them directly into the target resume before submission.

### 3.4 LinkedIn Profile Optimization Workflow
1. Navigate to `/ai/linkedin-optimizer`.
2. Enter current headline, about summary, and target industry/skills.
3. Click **"Optimize Profile"**.
4. Review generated headlines and choose the one best balancing keywords and branding.
5. Copy the story-driven "About" section and updated experience bullets into LinkedIn.

### 3.5 Interactive Mock Interview Workflow
1. Navigate to `/ai/interview-coach`.
2. Select target role, seniority level, and question category (e.g., *Behavioral / STAR*).
3. Click **"Start Interview"** to receive Question 1.
4. Type detailed response explaining Situation, Task, Action, and Result.
5. Click **"Submit Answer"**.
6. Review real-time critique, scoring (1–10), and actionable tips.
7. Click **"Next Question"** to proceed through the session.
8. View overall session score and performance breakdown on completion.

### 3.6 Job Application Tracking & Conversion Workflow
1. Navigate to `/ai/job-tracker`.
2. Click **"Add Application"** and input Company Name, Role, Date, Salary, and Status (`Applied`).
3. When an interview is scheduled, drag the card to `Interviewing` or edit the status, adding interview date and interviewer notes.
4. If an offer is extended, update status to `Offered`.
5. Click **"Analyze Pipeline"** to run AI Job Search Insights, identifying conversion bottlenecks and recommended actions.

---

# 4. Navigation & Route Reference

<!-- doc_metadata: {"section": "navigation", "keywords": ["routes", "urls", "pages", "endpoints"]} -->

### 4.1 Frontend Route Table

| Route Path | Page Component | Access Level | Description |
| :--- | :--- | :--- | :--- |
| `/` | `Home.jsx` | Public | Landing page with hero banner, feature demos, pricing tables, and Clerk sign-in/up modal. |
| `/ai` | `Dashboard.jsx` | Protected | Main career dashboard, usage stats, quick actions, and recent activity feed. |
| `/ai/write-email` | `WriteEmail.jsx` | Protected | Smart Email Writer tool page. |
| `/ai/review-resume` | `ReviewResume.jsx` | Protected | Resume Review & ATS Analyzer tool page. |
| `/ai/resume-tailor` | `ResumeTailor.jsx` | Protected | Resume Tailoring & Job Description matching tool page. |
| `/ai/linkedin-optimizer` | `LinkedinOptimizer.jsx` | Protected | LinkedIn profile audit and headline/summary generator. |
| `/ai/recruiter-outreach`| `RecruiterOutreach.jsx` | Protected | InMail and cold email outreach message generator. |
| `/ai/interview-coach` | `InterviewCoach.jsx` | Protected | Interactive mock interview practice simulator. |
| `/ai/career-score` | `CareerScore.jsx` | Protected | Consolidated career readiness index (0–100) and historical charts. |
| `/ai/job-tracker` | `JobTracker.jsx` | Protected | Kanban and tabular job application tracker and pipeline analytics. |
| `/linkedin-optimizer` | `LinkedinOptimizer.jsx` | Protected | Direct standalone alias route for LinkedIn Optimizer. |
| `/job-tracker` | `JobTracker.jsx` | Protected | Direct standalone alias route for Job Application Tracker. |

### 4.2 Backend API Endpoint Mapping

| Method | Endpoint | Auth | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/ai/generate-email` | Required | Generates contextual career and workplace emails. |
| `POST` | `/api/ai/review-resume` | Required | Accepts multipart PDF upload; returns ATS score & audit. |
| `POST` | `/api/ai/resume-tailor` | Required | Accepts PDF + JD; returns tailored bullets & gap matrix. |
| `POST` | `/api/ai/linkedin-optimizer` | Required | Generates optimized LinkedIn headlines, about, and skills. |
| `POST` | `/api/ai/recruiter-outreach` | Required | Generates character-constrained recruiter outreach notes. |
| `POST` | `/api/ai/interview/start` | Required | Initializes a new mock interview session with Question 1. |
| `POST` | `/api/ai/interview/answer` | Required | Grades candidate answer and generates follow-up question. |
| `GET` | `/api/ai/career-score` | Required | Computes aggregate career readiness score and history. |
| `POST` | `/api/jobs` | Required | Creates a new tracked job application record. |
| `GET` | `/api/jobs` | Required | Lists all tracked job applications for authenticated user. |
| `PATCH`| `/api/jobs/:id` | Required | Updates application status, notes, or next action date. |
| `DELETE`| `/api/jobs/:id` | Required | Removes an application record from the tracker. |
| `POST` | `/api/jobs/insights/analyze`| Required | Runs AI diagnostic analysis on job application funnel. |
| `GET` | `/api/user/creations` | Required | Returns user's cached generation history. |
| `GET` | `/api/user/account` | Required | Returns plan tier, usage count, and remaining credits. |
| `POST` | `/api/v1/chat` | Optional | Chatbot microservice Q&A endpoint. |
| `POST` | `/api/v1/chat/trace` | Optional | Chatbot endpoint returning full step-by-step trace nodes. |

---

# 5. System Boundaries & Limitations

<!-- doc_metadata: {"section": "limitations", "keywords": ["limits", "guardrails", "security", "quotas"]} -->

### 5.1 Strict Non-Agentic Guardrail
- **Informational Q&A Only**: The Quick.AI chatbot ("Fizzi AI") is strictly an informational assistant. It does **not execute actions**, send real emails, update databases, or apply to jobs autonomously.
- **Guidance Over Action**: When asked *"Apply to this job for me"* or *"Send this email to recruiter"*, the system politely declines and directs the user to the corresponding tool interface (e.g., `/ai/write-email` or `/ai/job-tracker`).

### 5.2 Quotas, Rate Limits & File Constraints
- **Free Quota**: Exactly 5 lifetime generations for Free tier users. Once reached, tools lock until upgraded to Premium.
- **API Rate Limiting**: Maximum 10 requests per rolling 60-second window per user. Excessive requests return `HTTP 429 Too Many Requests`.
- **File Upload Types**: Resume tools accept **PDF files only** (`application/pdf`). Word documents (`.doc`, `.docx`), images, and plain text files must be converted to PDF prior to upload.
- **File Size**: Maximum 5 MB per upload.
- **Text Layers**: Uploaded PDFs must contain selectable text. Image-only scanned PDFs without text layers cannot be read by `pdf-parse`.

### 5.3 Scope Enforcement
- **Domain Restriction**: The assistant exclusively answers questions about Quick.AI platform capabilities, career tools, and the authenticated user's account records.
- **Rejected Topics**: Inquiries regarding system architecture, source code, database credentials, server endpoints, LeetCode/DSA problems, or general world trivia are intercepted and rejected at the classifier gate.

---

# 6. Frequently Asked Questions (FAQs)

<!-- doc_metadata: {"section": "faqs", "keywords": ["faq", "questions", "answers", "help", "troubleshooting"]} -->

#### Q1: How does the Free Plan credit limit work?
**A**: Every user starts with 5 free creations. Each time you generate an email, review a resume, tailor bullet points, optimize a LinkedIn profile, or run an outreach prompt, your usage increments by 1. When remaining usage hits 0, you must upgrade to Premium for unlimited generations. Viewing past creations, managing job applications, and checking your Career Score do not consume credits.

#### Q2: How do I upgrade to the Premium Plan?
**A**: Click the **"Upgrade Plan"** or **"Get Premium"** button located on your Dashboard (`/ai`) or in the top navigation bar. This opens the Clerk secure checkout dialog. Once confirmed, your account instantly updates to `plan: "premium"`, unlocking unlimited usage.

#### Q3: Why is my ATS resume review score lower than expected?
**A**: ATS scanners penalize non-standard section headers, multi-column tables, missing quantifiable metrics (e.g., percentages, dollar amounts, scale), passive phrasing, and poor keyword match against target industry standards. Follow the specific line-by-line recommendations provided in `/ai/review-resume` to increase your score.

#### Q4: Does Quick.AI store or share my uploaded resume?
**A**: No. Uploaded resumes are processed in memory during the review or tailoring session and saved exclusively within your private account creation history in Neon PostgreSQL. Your data is isolated by user ID and is never shared, publicly displayed, or used to train third-party models.

#### Q5: Can Quick.AI automatically send emails or submit job applications for me?
**A**: No. Quick.AI is designed with strict non-agentic guardrails. It generates content and prepares you for applications, but you retain full control over reviewing, copying, and sending your communications.

#### Q6: What happens if an AI generation fails or times out?
**A**: The backend implements an automated triple-tier fallback system:
1. Retries with backup LLM models on OpenRouter.
2. Falls back to direct Google Gemini API.
3. If an upstream quota error occurs, it provides a high-quality pre-computed demo structure so your workflow is never interrupted. If your generation fails completely, your credit quota is not deducted.

#### Q7: Where can I find and reuse my previous generations?
**A**: Navigate to your **Dashboard** at `/ai` and scroll to the **Recent Activity** or **Creations Gallery** section. You can view, search, copy to clipboard, or delete any past generation at any time.

#### Q8: How is the Career Profile Score calculated?
**A**: The Career Profile Score (0–100) is a weighted composite index: 35% Resume ATS quality, 20% LinkedIn profile strength, 25% AI Interview performance, and 20% Job Search activity. Complete more tool activities and update your tracker to raise your score.

#### Q9: Can I tailor my resume to multiple different job descriptions?
**A**: Yes. You can run `/ai/resume-tailor` as many times as you like with different job descriptions. Each tailored output is saved separately in your history.

#### Q10: How do I track job applications with the Job Tracker?
**A**: Navigate to `/ai/job-tracker`. Click **"Add Application"**, fill in the company and role details, and set its status. As you advance through recruitment rounds, drag and drop the application across the Kanban columns (`Saved` ➔ `Applied` ➔ `Interviewing` ➔ `Offered` ➔ `Rejected`) and use the **"Analyze Pipeline"** button for AI conversion feedback.
