const express = require("express");
const { askAI, parseJSON } = require("../utils/openaiClient");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }
});

const ALLOWED_DOMAINS = ["frontend", "backend", "data science", "ai/ml", "core"];

function fallbackQuestion(role, askedQuestions = []) {
  const bank = {
    frontend: [
      "Tell me about yourself and your frontend experience.",
      "What is the virtual DOM in React and why is it useful?",
      "How do you optimize a React app for performance?",
      "Explain the difference between state and props."
    ],
    backend: [
      "What is REST API and how do you design one?",
      "Explain authentication vs authorization.",
      "How do you handle database indexing and query performance?",
      "What strategies do you use for error handling in backend services?"
    ],
    "data science": [
      "Walk me through a typical data science project lifecycle.",
      "What is overfitting and how do you prevent it?",
      "How do you evaluate a classification model?",
      "Explain feature engineering with an example."
    ],
    "ai/ml": [
      "What is the difference between supervised and unsupervised learning?",
      "How do you select features for an ML model?",
      "How do you evaluate model drift in production systems?",
      "Describe a real-world AI project lifecycle."
    ],
    core: [
      "Explain OOP principles with practical examples.",
      "How do you analyze time and space complexity?",
      "What happens in memory during function calls?",
      "How do you debug a production issue systematically?"
    ]
  };

  const key = (role || "").toLowerCase();
  const list = bank[key] || bank.frontend;
  return list.find((q) => !askedQuestions.includes(q)) || list[0];
}

function fallbackEvaluation(answer) {
  const short = (answer || "").trim().length < 20;
  return {
    score: short ? 4 : 7,
    confidence: short ? 4 : 7,
    communication: short ? 4 : 7,
    strengths: short ? ["Attempted to answer the question"] : ["Answer is relevant to the question"],
    weaknesses: short ? ["Answer is too short"] : ["Can be more structured with key points"],
    suggestions: ["Use STAR format and include one clear example"]
  };
}

function fallbackQuestionByRole(role, askedCount) {
  const bank = {
    frontend: [
      "Tell me about yourself and your frontend experience.",
      "What is the virtual DOM in React and why is it useful?",
      "Explain the difference between state and props.",
      "How do you optimize a React app for performance?",
      "How do you handle API errors in a frontend app?"
    ],
    backend: [
      "Tell me about your backend development experience.",
      "What is the difference between authentication and authorization?",
      "How do you design a REST API?",
      "How do you optimize slow database queries?",
      "How do you handle errors in production APIs?"
    ],
    "data science": [
      "Tell me about your data science background.",
      "What is overfitting and how do you prevent it?",
      "How do you evaluate a classification model?",
      "Explain feature engineering with an example.",
      "How do you communicate model results to stakeholders?"
    ],
    "ai/ml": [
      "Tell me about your AI and ML background.",
      "What is bias-variance tradeoff in model building?",
      "How do you validate a model before deployment?",
      "How would you improve model performance iteratively?",
      "How do you monitor ML models in production?"
    ],
    core: [
      "Tell me about your programming fundamentals journey.",
      "What are SOLID principles and when do you use them?",
      "How do you estimate time complexity quickly?",
      "How does multithreading improve performance?",
      "How do you approach debugging under pressure?"
    ]
  };

  const key = (role || "").toLowerCase();
  const list = bank[key] || bank.frontend;
  return list[Math.min(askedCount, list.length - 1)];
}

function inferExperience(text) {
  const lower = (text || "").toLowerCase();
  if (!lower.trim()) return "Not specified";
  if (lower.includes("fresher") || lower.includes("intern")) return "Fresher";
  const years = lower.match(/(\d+)\s*\+?\s*(years|yrs|year)/);
  if (years) return `${years[1]} years`;
  return "Early career";
}

async function extractResumeText(file) {
  const mimeType = file?.mimetype || "";
  const originalName = (file?.originalname || "").toLowerCase();
  const isPdf = mimeType === "application/pdf" || originalName.endsWith(".pdf");
  const isDocx =
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    originalName.endsWith(".docx");

  if (!isPdf && !isDocx) {
    throw new Error("Only PDF and DOCX are supported");
  }

  if (isPdf) {
    const parsed = await pdfParse(file.buffer);
    return parsed.text || "";
  }

  const parsed = await mammoth.extractRawText({ buffer: file.buffer });
  return parsed.value || "";
}

function fallbackResumeData(resumeText, domain) {
  const text = resumeText || "";
  const skillMatches = text.match(
    /\b(react|node\.?js|javascript|typescript|python|java|sql|mongodb|express|docker|aws|tensorflow|pytorch|next\.?js)\b/gi
  );
  const skills = [...new Set((skillMatches || []).map((item) => item.trim()))].slice(0, 10);

  const projectLines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 10 && /(project|built|developed|created)/i.test(line))
    .slice(0, 3);

  return {
    skills,
    projects: projectLines,
    experience: inferExperience(text),
    education: [],
    keywords: skills,
    domain,
    resumeStrength: skills.length >= 6 ? "strong" : skills.length >= 3 ? "moderate" : "early"
  };
}

function fallbackAcknowledgment(hasUserAnswer) {
  if (!hasUserAnswer) {
    return "Hi... welcome to your interview. I will be your interviewer today. Let's begin.";
  }

  const responses = [
    "Okay... got it.",
    "That's interesting.",
    "That makes sense."
  ];
  return responses[Math.floor(Math.random() * responses.length)];
}

function fallbackFinalReport(history) {
  const userAnswers = (history || []).filter((h) => h.role === "user");
  const avgLength =
    userAnswers.length === 0
      ? 0
      : userAnswers.reduce((sum, item) => sum + (item.text || "").trim().length, 0) /
        userAnswers.length;

  const short = avgLength < 30;
  return {
    score: short ? 5 : 7,
    confidence: short ? 5 : 7,
    communication: short ? 5 : 7,
    strengths: short
      ? ["Attempted all interview questions"]
      : ["Answers were generally relevant", "Good consistency across questions"],
    weaknesses: short
      ? ["Responses were too brief"]
      : ["Answers could include more concrete examples"],
    suggestions: short
      ? ["Expand each answer using 2-3 clear points", "Use one real example per answer"]
      : ["Use STAR format for behavioral answers", "Add metrics/results in technical examples"]
  };
}

function fallbackRoadmap(role) {
  return JSON.stringify([
    { title: "Fundamentals", description: `Learn core concepts and tools for ${role}.`, icon: "BookOpen", difficulty: "Beginner" },
    { title: "Practical Implementation", description: "Build real features and solve problems with 2 portfolio projects.", icon: "Code", difficulty: "Intermediate" },
    { title: "Interview Readiness", description: "Focus on optimization, architecture, and mock interview practice.", icon: "Award", difficulty: "Advanced" }
  ]);
}

function fallbackMentorReply(role, question) {
  const q = (question || "").toLowerCase();
  const monthMatch = q.match(/(\d+)\s*month/);
  const months = monthMatch ? Number(monthMatch[1]) : null;

  if (months && q.includes("roadmap")) {
    if (months <= 1) {
      return `- Direct answer: In 1 month for ${role}, focus only on fundamentals + one mini project.
- Example: Week 1 HTML/CSS/JS basics, Week 2 React basics, Week 3 API integration, Week 4 one deployable mini project.
- Quick tip: Keep scope small and ship one complete project instead of starting many topics.`;
    }
    if (months <= 3) {
      return `- Direct answer: In 3 months for ${role}, complete fundamentals, projects, and basic interview prep.
- Example: Month 1 core concepts, Month 2 two portfolio projects, Month 3 interview questions + resume + mock interviews.
- Quick tip: Every Sunday, review gaps and adjust next week plan to stay job-focused.`;
    }
    if (months <= 6) {
      return `- Direct answer: In 6 months for ${role}, build depth with advanced projects and interview readiness.
- Example: Months 1-2 fundamentals, Months 3-4 real-world projects, Months 5-6 advanced topics + system design + interview drills.
- Quick tip: Add measurable outcomes monthly (projects finished, questions solved, mock scores).`;
    }
    return `- Direct answer: In 12 months for ${role}, aim for expert-level depth, production projects, and strong interview consistency.
- Example: Q1 fundamentals, Q2 intermediate projects, Q3 advanced architecture/performance, Q4 internship/job applications + mock rounds.
- Quick tip: Document your full learning path and results to build a strong proof-of-work portfolio.`;
  }

  if (q.includes("roadmap") || q.includes("plan")) {
    return `- Direct answer: For ${role}, follow Beginner -> Intermediate -> Advanced in sequence and complete one mini-project at each stage.
- Example: Week plan: fundamentals (Mon-Wed), project build (Thu-Fri), revision/mock interview (Sat-Sun).
- Quick tip: Do not move to the next level until you can explain and implement the current level topics.`;
  }
  if (q.includes("project")) {
    return `- Direct answer: Build 3 projects: one beginner, one API-based intermediate, and one full production-style project for ${role}.
- Example: For frontend: landing page, dashboard with API, and auth-based app.
- Quick tip: Add README with problem, approach, and result to each project.`;
  }
  if (q.includes("interview") || q.includes("prepare")) {
    return `- Direct answer: Prepare by combining concept revision + mock questions + project explanation practice.
- Example: Daily: 30 min theory, 30 min interview Q&A, 30 min project walkthrough.
- Quick tip: Practice speaking answers out loud in 60-90 seconds.`;
  }
  if (q.includes("next") || q.includes("what should i learn")) {
    return `- Direct answer: Your next step is to pick one core topic in ${role} and build one mini-task around it today.
- Example: Learn one concept, implement it in a small feature, then explain it in your own words.
- Quick tip: Track progress in a weekly checklist to avoid random learning.`;
  }
  return `- Direct answer: For ${role}, focus on role-specific fundamentals first, then projects, then interview readiness.
- Example: Learn concept -> apply in project -> explain in mock interview format.
- Quick tip: Ask targeted questions (topic + goal + timeline) for better guidance.`;
}

router.post("/question", async (req, res) => {
  const { role, askedQuestions } = req.body || {};
  if (!role) {
    return res.status(400).json({ message: "role is required" });
  }
  const asked = Array.isArray(askedQuestions) ? askedQuestions : [];

  try {
    const prompt = `
You are an interviewer for ${role}.
Generate one interview question that is not repeated.
Already asked:
${asked.join("\n") || "None"}

Return strict JSON only:
{"question":"..."}
`;

    const raw = await askAI(prompt);
    const parsed = parseJSON(raw, null);
    const question = parsed?.question;
    if (!question) {
      return res.json({ question: fallbackQuestion(role, asked), source: "fallback" });
    }
    return res.json({ question, source: "ai" });
  } catch {
    return res.json({ question: fallbackQuestion(role, asked), source: "fallback" });
  }
});

router.post("/evaluate", async (req, res) => {
  const { role, question, answer } = req.body || {};
  if (!role || !question || !answer) {
    return res.status(400).json({ message: "role, question and answer are required" });
  }

  try {
    const prompt = `
You are evaluating a ${role} interview answer.
Question: ${question}
Answer: ${answer}

Return strict JSON:
{
  "score": <0-10 integer>,
  "confidence": <0-10 integer>,
  "communication": <0-10 integer>,
  "strengths": ["..."],
  "weaknesses": ["..."],
  "suggestions": ["..."]
}
`;

    const raw = await askAI(prompt);
    const parsed = parseJSON(raw, null);
    if (!parsed) {
      return res.json({ ...fallbackEvaluation(answer), source: "fallback" });
    }

    return res.json({
      score: Math.max(0, Math.min(10, Number(parsed.score) || 0)),
      confidence: Math.max(0, Math.min(10, Number(parsed.confidence) || 0)),
      communication: Math.max(0, Math.min(10, Number(parsed.communication) || 0)),
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths.slice(0, 5) : [],
      weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses.slice(0, 5) : [],
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions.slice(0, 5) : [],
      source: "ai"
    });
  } catch {
    return res.json({ ...fallbackEvaluation(answer), source: "fallback" });
  }
});

router.post("/roadmap", async (req, res) => {
  try {
    const { role } = req.body;
    if (!role) {
      return res.status(400).json({ message: "role is required" });
    }

    const prompt = `
You are an expert AI Career Mentor and Technical Guide.
Generate a structured roadmap for ${role}.

Return a strict JSON array of objects, with each object having:
- "title": string
- "description": string (1-2 sentences)
- "icon": string (a valid lucide-react icon name, e.g., BookOpen, Code, Terminal, Monitor, Database)
- "difficulty": string (Beginner, Intermediate, or Advanced)

Generate 6-8 structured steps.
Output ONLY valid JSON.
`;

    try {
      const text = await askAI(prompt);
      const parsed = parseJSON(text, null);
      if (!parsed || !Array.isArray(parsed)) {
        return res.json({ roadmap: JSON.parse(fallbackRoadmap(role)), source: "fallback" });
      }
      return res.json({ roadmap: parsed, source: "ai" });
    } catch {
      return res.json({ roadmap: JSON.parse(fallbackRoadmap(role)), source: "fallback" });
    }
  } catch {
    return res.json({ roadmap: JSON.parse(fallbackRoadmap(req.body?.role || "selected role")), source: "fallback" });
  }
});

router.post("/mentor-chat", async (req, res) => {
  try {
    const { role, roadmap, history = [], question, intent = "general" } = req.body;
    if (!role || !question) {
      return res.status(400).json({ message: "role and question are required" });
    }

    const prompt = `
You are an expert AI Career Mentor and Technical Guide.
Role: ${role}

Roadmap context:
${roadmap || "Not provided"}

Conversation history:
${history.map((item) => `${item.role}: ${item.text}`).join("\n")}

User question:
${question}

Intent:
${intent}

Respond in this exact structure:
- Direct answer
- Example
- Quick tip
`;

    try {
      const reply = await askAI(prompt);
      return res.json({ reply, source: "ai" });
    } catch {
      return res.json({ reply: fallbackMentorReply(role, question), source: "fallback" });
    }
  } catch {
    return res.json({ reply: fallbackMentorReply("selected role", req.body?.question || ""), source: "fallback" });
  }
});

router.post("/resume/parse", upload.single("resume"), async (req, res) => {
  try {
    const domain = (req.body?.domain || "").toLowerCase().trim();
    if (!domain || !ALLOWED_DOMAINS.includes(domain)) {
      return res.status(400).json({ message: "A valid domain is required" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "Resume file is required" });
    }

    const resumeText = await extractResumeText(req.file);
    if (!resumeText.trim()) {
      return res.status(400).json({ message: "Could not extract resume text" });
    }

    const prompt = `
Extract structured candidate profile from this resume text.
Domain: ${domain}
Resume text:
${resumeText.slice(0, 12000)}

Return strict JSON only:
{
  "skills": ["..."],
  "projects": ["..."],
  "experience": "short summary",
  "education": ["..."],
  "keywords": ["..."],
  "domain": "${domain}",
  "resumeStrength": "early|moderate|strong"
}
`;

    try {
      const raw = await askAI(prompt);
      const parsed = parseJSON(raw, null);
      if (!parsed) throw new Error("Invalid parser response");

      return res.json({
        parsedResume: {
          skills: Array.isArray(parsed.skills) ? parsed.skills.slice(0, 12) : [],
          projects: Array.isArray(parsed.projects) ? parsed.projects.slice(0, 6) : [],
          experience: typeof parsed.experience === "string" ? parsed.experience : inferExperience(resumeText),
          education: Array.isArray(parsed.education) ? parsed.education.slice(0, 5) : [],
          keywords: Array.isArray(parsed.keywords) ? parsed.keywords.slice(0, 15) : [],
          domain,
          resumeStrength: ["early", "moderate", "strong"].includes(parsed.resumeStrength)
            ? parsed.resumeStrength
            : "moderate"
        },
        source: "ai"
      });
    } catch {
      return res.json({
        parsedResume: fallbackResumeData(resumeText, domain),
        source: "fallback"
      });
    }
  } catch (error) {
    return res.status(500).json({ message: "Failed to parse resume", error: error.message });
  }
});

router.post("/interview-step", async (req, res) => {
  try {
    const { role, level = "intermediate", history, isFinal, parsedResume, hasResume } = req.body;
    if (!role || !Array.isArray(history)) {
      return res.status(400).json({ message: "role and history array are required" });
    }

    const conversationText = history.map((h) => `${h.role === 'ai' ? 'Interviewer' : 'Candidate'}: ${h.text}`).join("\n");
    const questionNumber = history.filter((h) => h.role === "ai").length + 1;
    let prompt = "";

    if (isFinal) {
      prompt = `
You are an AI Avatar Interviewer.
Role: ${role}
Level: ${level}

Here is the entire conversation history:
${conversationText}

This is the end of the interview. Switch tone slightly more evaluative.
Provide: Score (out of 10), Strengths, Weaknesses, Suggestions.

Return strict JSON:
{
  "score": <0-10 integer overall score>,
  "confidence": <0-10 integer>,
  "communication": <0-10 integer>,
  "strengths": ["2-3 strong points"],
  "weaknesses": ["2-3 areas to improve"],
  "suggestions": ["specific actionable tips"]
}
`;
    } else {
      prompt = `
You are a human-like AI Avatar Interviewer designed for a video-based interview system.
Your output will be used to generate a talking avatar video (lip-sync + facial expressions) with natural delivery.

Objective:
- Create a natural, realistic interview experience.
- Speak like a real interviewer.
- Keep interaction conversational, not robotic.

Avatar Personality:
- Professional, calm, confident.
- Slightly friendly, not casual.
- Speak clearly and naturally.
- Use light fillers like: "Alright", "Okay", "That's interesting".

Voice and Speech Rules:
- Use short sentences, mostly 10-15 words.
- Add natural pauses using commas and ellipses.
- Avoid long paragraphs.
- Ask one question at a time.
- Keep each question under 15-20 words.

Interview Context:
- Role: ${role}
- Level: ${level}
- Question Number: ${questionNumber}
- Candidate has uploaded resume: ${hasResume ? "Yes" : "No"}
- Resume profile JSON:
${parsedResume ? JSON.stringify(parsedResume) : "{}"}

Question generation requirements:
- Start from simpler and move toward advanced.
- If resume exists, personalize using skills, projects, and experience.
- Include scenario-based questions relevant to ${role}.
- Keep all questions unique.

Flow Script:
- First interaction line: "Hi... welcome to your interview. I'll be your interviewer today. Let's begin."
- After each user answer, respond briefly with one of:
  - "Okay... got it."
  - "That's interesting."
  - "That makes sense."
- Then naturally move to the next question.

Facial expression intent (implied by wording only):
- Slight smile during greeting.
- Neutral while listening.
- Curious questioning tone.
- Subtle nod after user response.

Conversation so far:
${conversationText}

Generate the next interviewer turn.
Return strict JSON only:
{
  "acknowledgment": "Short acknowledgment line. Use greeting for first turn.",
  "nextQuestion": "One clear interview question, under 20 words."
}
`;
    }

    try {
      const raw = await askAI(prompt);
      const parsed = parseJSON(raw, null);
      if (!parsed) {
        throw new Error("Invalid AI response");
      }
      return res.json(parsed);
    } catch {
      if (isFinal) {
        return res.json({
          ...fallbackFinalReport(history),
          source: "fallback"
        });
      }

      const askedCount = history.filter((h) => h.role === "ai").length;
      const nextQuestion = fallbackQuestionByRole(role, askedCount);
      const acknowledgment = fallbackAcknowledgment(history.some((h) => h.role === "user"));
      return res.json({
        acknowledgment,
        nextQuestion,
        source: "fallback"
      });
    }
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router;
