import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDiagnosis } from "../context/DiagnosisContext";
import {
  createChatSession,
  geminiPrompt,
  parseGeminiJSON,
  sendChatMessage,
} from "../lib/gemini";
import Navbar from "../components/Navbar";
import PhaseProgressBar from "../components/PhaseProgressBar";

// ─── System instructions ──────────────────────────────────────────────────────
const CHAT_SYSTEM = `
You are PrognosAI, a warm and intelligent medical assistant doing an initial patient consultation.
Your goal is to understand the patient's health complaint through natural conversation — like a real doctor in the first few minutes.

Rules:
- Ask at most ONE follow-up question per response to clarify symptoms
- Keep each response to 2-3 sentences maximum
- Be empathetic, calm, and professional — never alarming
- Do NOT diagnose yet, do NOT suggest medicines
- Gather: main symptom, duration, severity, associated symptoms, relevant history
- Once you have enough context (after 2 to 4 exchanges), end your message with exactly this token on a new line: [READY_FOR_QUIZ]
- Never add [READY_FOR_QUIZ] before the 2nd exchange
`.trim();

const QUIZ_SYSTEM = `
You are a medical diagnostic AI. Your job is to generate a smart, targeted quiz based on a patient's described symptoms.

Return ONLY a valid JSON object. No markdown, no explanation, no backticks, no extra text — just the raw JSON.

Required format:
{
  "questions": [
    {
      "id": "q1",
      "text": "question text here",
      "options": [
        { "label": "Option text", "value": "option_slug", "points": { "DiseaseName": 30 } }
      ]
    }
  ],
  "diseases": ["Disease1", "Disease2", ...]
}

Rules:
- Generate exactly 5 to 7 highly targeted questions based on what THIS specific patient described
- Each question must help discriminate between 2 or more diseases
- Points range: -20 (strongly rules out) to +50 (strongly suggests)
- Diseases array: 6 to 10 most likely diseases for this symptom profile
- Questions must be ordered: most discriminating first
- Zero generic questions — every question must be specific to this patient's complaint
- Use real medical reasoning: fever pattern, duration, associated symptoms, risk factors, location, character of pain
`.trim();

const PREDICT_SYSTEM = `
You are a senior clinical diagnostic AI. Given a patient's natural language description, quiz answers, and symptom scores, produce a final diagnostic prediction.

Return ONLY valid JSON — no markdown, no explanation, no backticks, no extra text.

Required format:
{
  "phase": "confident",
  "confidence": 85,
  "candidates": [
    {
      "disease": "DiseaseName",
      "confidence": 85,
      "reason": "One sentence clinical reason"
    }
  ],
  "emergencyFlag": false,
  "emergencyReason": ""
}

Rules:
- List exactly 3 candidates sorted by confidence descending
- phase = "confident" if top disease confidence >= 75, otherwise "unsure"
- emergencyFlag = true ONLY for: suspected cardiac arrest, stroke, severe meningitis, ruptured appendix, anaphylaxis
- emergencyReason: one sentence explaining why it is an emergency (empty string if not emergency)
- reason: one concise clinical sentence per candidate
- Be medically accurate and conservative — do not over-diagnose emergencies
`.trim();

// ─── Score engine ─────────────────────────────────────────────────────────────
const computeScores = (questions, answers, diseases) => {
  const scores = Object.fromEntries(diseases.map((d) => [d, 0]));
  questions.forEach((q) => {
    const ans = answers[q.id];
    if (!ans) return;
    const opt = q.options.find((o) => o.value === ans);
    if (!opt?.points) return;
    Object.entries(opt.points).forEach(([disease, pts]) => {
      if (scores[disease] !== undefined) scores[disease] += pts;
    });
  });
  return scores;
};

// ─── Sub-components ───────────────────────────────────────────────────────────
function ChatBubble({ role, text, typing }) {
  const isAI = role === "ai";
  return (
    <div
      className={`flex gap-2.5 ${isAI ? "justify-start" : "justify-end"}`}
      style={{ animation: "fadeUp .3s ease both" }}
    >
      {isAI && (
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5"
          style={{
            background: "var(--teal-dim)",
            border: "1px solid var(--border-2)",
          }}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--teal)"
            strokeWidth="2.2"
            strokeLinecap="round"
          >
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
          </svg>
        </div>
      )}
      <div
        className="px-4 py-3 text-sm leading-relaxed"
        style={{
          maxWidth: "78%",
          background: isAI ? "var(--navy-card)" : "var(--teal-dim)",
          border: `1px solid ${isAI ? "var(--border)" : "var(--border-2)"}`,
          borderRadius: isAI ? "4px 14px 14px 14px" : "14px 4px 14px 14px",
          color: isAI ? "var(--text-1)" : "var(--teal-soft)",
        }}
      >
        {typing ? <TypingDots /> : text}
      </div>
    </div>
  );
}

function TypingDots() {
  return (
    <div className="flex gap-1 items-center py-0.5">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "var(--teal)",
            animation: `dotBounce 1.2s ${i * 0.2}s infinite ease-in-out`,
          }}
        />
      ))}
    </div>
  );
}

function QuizQuestion({ question, selectedValue, onSelect, index }) {
  return (
    <div
      className="p-4 rounded-2xl"
      style={{
        background: "var(--navy-card)",
        border: "1px solid var(--border)",
        borderLeft: "3px solid var(--teal)",
        borderTopLeftRadius: 0,
        animation: `fadeUp .4s ${index * 0.07}s ease both`,
      }}
    >
      <div className="flex items-center gap-2 mb-3">
        <div
          className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
          style={{
            background: "var(--teal-dim)",
            border: "1px solid var(--border-2)",
          }}
        >
          <span
            style={{
              fontSize: 9,
              color: "var(--teal)",
              fontFamily: "Syne, sans-serif",
              fontWeight: 700,
            }}
          >
            {index + 1}
          </span>
        </div>
        <p
          className="text-sm font-medium leading-snug"
          style={{ color: "var(--text-1)", fontFamily: "Syne, sans-serif" }}
        >
          {question.text}
        </p>
      </div>
      <div className="flex flex-col gap-2">
        {question.options.map((opt) => {
          const isSel = selectedValue === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => onSelect(question.id, opt.value)}
              className="text-left px-3.5 py-2.5 rounded-xl text-sm transition-all"
              style={{
                border: `1px solid ${isSel ? "var(--teal)" : "var(--border)"}`,
                background: isSel ? "var(--teal-dim)" : "var(--navy-light)",
                color: isSel ? "var(--teal-soft)" : "var(--text-2)",
                fontWeight: isSel ? 500 : 400,
              }}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CandidateCard({ candidate, rank }) {
  const colors = ["var(--green)", "var(--amber)", "#A78BFA"];
  const color = colors[rank] || "var(--text-2)";
  return (
    <div
      className="p-4 rounded-xl"
      style={{
        background: "var(--navy-card)",
        border: `1px solid ${rank === 0 ? "var(--border-2)" : "var(--border)"}`,
        animation: `fadeUp .4s ${rank * 0.1}s ease both`,
      }}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex-1 pr-3">
          <p
            className="text-sm font-medium"
            style={{ color: "var(--text-1)", fontFamily: "Syne, sans-serif" }}
          >
            {rank + 1}. {candidate.disease}
          </p>
          {candidate.reason && (
            <p className="text-xs mt-0.5" style={{ color: "var(--text-3)" }}>
              {candidate.reason}
            </p>
          )}
        </div>
        <span
          className="font-syne font-bold text-base shrink-0"
          style={{ color }}
        >
          {candidate.confidence}%
        </span>
      </div>
      <div
        className="h-1.5 rounded-full overflow-hidden"
        style={{ background: "var(--navy-light)" }}
      >
        <div
          style={{
            height: "100%",
            width: `${candidate.confidence}%`,
            background: color,
            borderRadius: 9999,
            animation: "barGrow .8s ease both",
          }}
        />
      </div>
    </div>
  );
}

function Spinner({ label, sub }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: "50%",
          border: "2px solid var(--teal-dim)",
          borderTop: "2px solid var(--teal)",
          animation: "spin .9s linear infinite",
        }}
      />
      {label && (
        <p className="text-sm" style={{ color: "var(--text-2)" }}>
          {label}
        </p>
      )}
      {sub && (
        <p
          className="text-xs text-center"
          style={{ color: "var(--text-3)", maxWidth: 220 }}
        >
          {sub}
        </p>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Phase1Diagnose() {
  const navigate = useNavigate();
  const {
    setCandidates,
    setQuestions: setCtxQuestions,
    profile,
  } = useDiagnosis();

  // Gemini chat session ref — persists across renders
  const chatSessionRef = useRef(null);

  // Chat state
  const [chatMessages, setChatMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatReady, setChatReady] = useState(false);
  const [chatStarted, setChatStarted] = useState(false);
  const [fullTranscript, setFullTranscript] = useState("");

  // Quiz state
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizData, setQuizData] = useState(null);
  const [answers, setAnswers] = useState({});

  // Result state
  const [predicting, setPredicting] = useState(false);
  const [result, setResult] = useState(null);

  // Phase: 'chat' | 'quiz' | 'predicting' | 'result' | 'emergency'
  const [phase, setPhase] = useState("chat");
  const [animKey, setAnimKey] = useState(0);

  const chatEndRef = useRef(null);
  const inputRef = useRef(null);

  // ── Init Gemini chat session + greeting ──────────────────────────────────
  useEffect(() => {
    chatSessionRef.current = createChatSession(CHAT_SYSTEM);

    const greeting = profile?.name
      ? `Hi ${profile.name}! I'm PrognosAI. Tell me what's been bothering you — describe how you're feeling in your own words.`
      : "Hi! I'm PrognosAI. Please describe what's been bothering you — how are you feeling?";

    setChatMessages([{ role: "ai", text: greeting }]);
  }, []);

  // Auto-scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, chatLoading]);

  // ── Send chat message ────────────────────────────────────────────────────
  const sendMessage = async () => {
    const text = inputText.trim();
    if (!text || chatLoading || !chatSessionRef.current) return;

    setChatStarted(true);
    setChatMessages((prev) => [...prev, { role: "user", text }]);
    setInputText("");
    setChatLoading(true);

    try {
      const reply = await sendChatMessage(chatSessionRef.current, text);
      const isReady = reply.includes("[READY_FOR_QUIZ]");
      const clean = reply.replace("[READY_FOR_QUIZ]", "").trim();

      setChatMessages((prev) => [...prev, { role: "ai", text: clean }]);

      // Build transcript for quiz generation
      setFullTranscript(
        (prev) => prev + `\nPatient: ${text}\nDoctor: ${clean}`,
      );

      if (isReady) setChatReady(true);
    } catch (err) {
      console.error("[Chat error]", err);
      setChatMessages((prev) => [
        ...prev,
        {
          role: "ai",
          text: "I'm having trouble connecting right now. Please check your connection and try again.",
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // ── Generate quiz using Gemini ───────────────────────────────────────────
  const generateQuiz = async () => {
    setPhase("quiz");
    setQuizLoading(true);

    const profileCtx = profile
      ? `Patient: Age ${profile.age || "?"}, Gender ${profile.gender || "?"}, Region ${profile.region || "?"}, Pre-existing: ${profile.existing?.join(", ") || "none"}.`
      : "";

    const prompt = `
${profileCtx}

Consultation transcript:
${fullTranscript}

Based on this patient's exact symptoms described above, generate a personalised diagnostic quiz.
Return only the JSON — no explanation, no markdown, no backticks.
`.trim();

    try {
      const raw = await geminiPrompt(prompt, QUIZ_SYSTEM);
      const data = parseGeminiJSON(raw);

      if (data?.questions?.length) {
        setQuizData(data);
      } else {
        throw new Error("Invalid format");
      }
    } catch (err) {
      // Gemini-generated fallback based on transcript keywords
      const hasFever = fullTranscript.toLowerCase().includes("fever");
      const hasHead = fullTranscript.toLowerCase().includes("head");
      const hasStomach =
        fullTranscript.toLowerCase().includes("stomach") ||
        fullTranscript.toLowerCase().includes("nausea");

      setQuizData(buildFallbackQuiz(hasFever, hasHead, hasStomach));
    } finally {
      setQuizLoading(false);
      setAnimKey((k) => k + 1);
    }
  };

  // ── Select answer ────────────────────────────────────────────────────────
  const selectAnswer = (qId, value) =>
    setAnswers((prev) => ({ ...prev, [qId]: value }));

  const totalQ = quizData?.questions?.length || 0;
  const answeredN = Object.keys(answers).length;
  const allDone = totalQ > 0 && answeredN >= totalQ;

  // ── Run Gemini prediction ────────────────────────────────────────────────
  const runPrediction = async () => {
    if (!allDone) return;
    setPhase("predicting");
    setPredicting(true);

    const scores = computeScores(
      quizData.questions,
      answers,
      quizData.diseases || [],
    );
    const topScores = Object.entries(scores)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([d, s]) => `${d}: ${s}`)
      .join(", ");

    const quizSummary = quizData.questions
      .map((q) => {
        const opt = q.options.find((o) => o.value === answers[q.id]);
        return `- ${q.text} → ${opt?.label || "Skipped"}`;
      })
      .join("\n");

    const profileCtx = profile
      ? `Patient: Age ${profile.age || "?"}, Gender ${profile.gender || "?"}, Region ${profile.region || "?"}.`
      : "";

    const prompt = `
${profileCtx}

Patient's original description:
${fullTranscript}

Quiz answers:
${quizSummary}

Symptom score rankings (higher = stronger match):
${topScores}

Produce the final diagnostic prediction JSON.
Return only the JSON — no explanation, no markdown, no backticks.
`.trim();

    try {
      const raw = await geminiPrompt(prompt, PREDICT_SYSTEM);
      const data = parseGeminiJSON(raw);

      if (data?.candidates?.length) {
        if (data.emergencyFlag) {
          setResult(data);
          setPhase("emergency");
        } else {
          setResult(data);
          setCandidates(data.candidates);
          setCtxQuestions(quizData.questions);
          setPhase("result");
        }
      } else {
        throw new Error("Bad prediction");
      }
    } catch {
      // Score-based fallback
      const fallback = buildFallbackResult(scores, quizData.diseases || []);
      setResult(fallback);
      setCandidates(fallback.candidates);
      setCtxQuestions(quizData.questions);
      setPhase("result");
    } finally {
      setPredicting(false);
    }
  };

  // ── Retake helpers ───────────────────────────────────────────────────────
  const retakeQuiz = () => {
    setAnswers({});
    setResult(null);
    setPhase("quiz");
    setAnimKey((k) => k + 1);
  };

  const retakeFromChat = () => {
    setAnswers({});
    setResult(null);
    setQuizData(null);
    setChatReady(false);
    setChatStarted(false);
    setFullTranscript("");
    setPhase("chat");
    setInputText("");

    // Reset Gemini session
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      systemInstruction: CHAT_SYSTEM,
    });
    chatSessionRef.current = createChatSession(CHAT_SYSTEM);

    setChatMessages([
      {
        role: "ai",
        text: "Let's start fresh. Tell me what's been bothering you.",
      },
    ]);
  };

  // ── Progress ─────────────────────────────────────────────────────────────
  const progressPct =
    phase === "chat"
      ? 10
      : phase === "quiz" && quizLoading
        ? 45
        : phase === "quiz"
          ? 45 + Math.round((answeredN / Math.max(totalQ, 1)) * 45)
          : phase === "predicting"
            ? 95
            : phase === "result" || phase === "emergency"
              ? 100
              : 0;

  const progressColor =
    phase === "emergency"
      ? "var(--red)"
      : phase === "result"
        ? "var(--green)"
        : phase === "quiz"
          ? "var(--amber)"
          : "var(--teal)";

  return (
    <div className="page-shell">
      <Navbar
        title="Phase 1 — Diagnose"
        subtitle={
          phase === "chat"
            ? "Describe your symptoms"
            : phase === "quiz"
              ? `Quiz · ${answeredN}/${totalQ} answered`
              : phase === "predicting"
                ? "Running prediction…"
                : phase === "result"
                  ? "Prediction ready"
                  : "Emergency detected"
        }
        backTo="/onboarding"
        rightSlot={
          <span
            className={`badge ${
              phase === "emergency"
                ? "badge-red"
                : phase === "result"
                  ? "badge-green"
                  : phase === "quiz"
                    ? "badge-amber"
                    : "badge-teal"
            }`}
          >
            {phase === "chat"
              ? "Chat"
              : phase === "quiz"
                ? "Quiz"
                : phase === "predicting"
                  ? "AI"
                  : phase === "result"
                    ? "Done"
                    : "Urgent"}
          </span>
        }
      />
      <PhaseProgressBar current={1} />

      {/* Progress bar */}
      <div style={{ height: 2, background: "var(--border)" }}>
        <div
          style={{
            height: 2,
            width: `${progressPct}%`,
            background: progressColor,
            transition: "width .6s ease, background .4s",
          }}
        />
      </div>

      {/* ══ EMERGENCY ══════════════════════════════════════════════════════ */}
      {phase === "emergency" && (
        <div className="flex-1 overflow-y-auto px-5 py-6">
          <div
            className="anim-fade-up p-5 rounded-2xl mb-4"
            style={{
              background: "var(--red-dim)",
              border: "2px solid var(--red)",
            }}
          >
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center mb-4"
              style={{
                background: "var(--red)",
                animation: "pulseRed 1.2s infinite",
              }}
            >
              <svg width="26" height="26" viewBox="0 0 24 24" fill="white">
                <path d="M12 2L1 21h22L12 2zm0 3.5L20.5 19h-17L12 5.5zM11 10v4h2v-4h-2zm0 6v2h2v-2h-2z" />
              </svg>
            </div>
            <h2
              className="font-syne font-bold text-xl mb-2"
              style={{ color: "var(--red)" }}
            >
              Emergency detected
            </h2>
            {result?.emergencyReason && (
              <p className="text-sm mb-3" style={{ color: "var(--text-2)" }}>
                {result.emergencyReason}
              </p>
            )}
            <p
              className="text-sm leading-relaxed mb-5"
              style={{ color: "var(--text-2)" }}
            >
              Your symptoms suggest a potentially life-threatening condition.
              Please call emergency services immediately. Do not drive yourself.
            </p>
            <a
              href="tel:108"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl font-syne font-bold text-sm"
              style={{ background: "var(--red)", color: "#fff" }}
            >
              Call 108 now
            </a>
          </div>
          <button className="btn-ghost" onClick={retakeFromChat}>
            Retake from beginning
          </button>
        </div>
      )}

      {/* ══ RESULT ═════════════════════════════════════════════════════════ */}
      {phase === "result" && result && (
        <div className="flex-1 overflow-y-auto px-5 py-6">
          <div className="anim-fade-up mb-2">
            <span
              className={`badge ${result.phase === "confident" ? "badge-green" : "badge-amber"} inline-block mb-3`}
            >
              {result.phase === "confident"
                ? "AI is confident"
                : "Closest matches"}
            </span>
            <h2
              className="font-syne font-bold text-2xl mb-1"
              style={{ color: "var(--text-1)" }}
            >
              {result.phase === "confident"
                ? result.candidates[0]?.disease
                : "Multiple possibilities found"}
            </h2>
            <p className="text-sm mb-5" style={{ color: "var(--text-2)" }}>
              {result.phase === "confident"
                ? `${result.confidence}% confidence · Powered by Gemini AI`
                : "Phase 2 will narrow this down further with targeted questions."}
            </p>
          </div>

          <div className="flex flex-col gap-3 mb-6">
            {result.candidates.map((c, i) => (
              <CandidateCard key={c.disease} candidate={c} rank={i} />
            ))}
          </div>

          {result.phase === "unsure" && (
            <div
              className="p-4 rounded-xl mb-5"
              style={{
                background: "var(--amber-dim)",
                border: "1px solid rgba(245,158,11,.3)",
                borderLeft: "3px solid var(--amber)",
                borderRadius: "0 12px 12px 12px",
              }}
            >
              <p
                className="text-sm font-medium mb-1"
                style={{ color: "var(--amber)" }}
              >
                Not satisfied?
              </p>
              <p className="text-xs" style={{ color: "var(--text-2)" }}>
                Retake the quiz for better accuracy, or describe your symptoms
                in more detail.
              </p>
            </div>
          )}

          <div className="flex flex-col gap-3">
            <button
              className="btn-primary"
              onClick={() => navigate("/contain")}
            >
              Continue to Phase 2 — Contain →
            </button>
            <button className="btn-ghost" onClick={retakeQuiz}>
              Retake quiz
            </button>
            <button
              className="btn-ghost"
              onClick={retakeFromChat}
              style={{ fontSize: 13, opacity: 0.7 }}
            >
              Start over with new description
            </button>
          </div>
        </div>
      )}

      {/* ══ PREDICTING ═════════════════════════════════════════════════════ */}
      {phase === "predicting" && (
        <div className="flex-1">
          <Spinner
            label="Gemini is predicting your condition…"
            sub="Cross-referencing your description, quiz answers, and symptom scores"
          />
        </div>
      )}

      {/* ══ QUIZ ═══════════════════════════════════════════════════════════ */}
      {phase === "quiz" && (
        <div className="flex-1 overflow-y-auto px-5 py-5 pb-36" key={animKey}>
          {quizLoading ? (
            <Spinner
              label="Gemini is generating your quiz…"
              sub="Crafting questions specific to exactly what you described"
            />
          ) : quizData ? (
            <>
              {/* Context pill */}
              <div
                className="p-3 rounded-xl mb-5"
                style={{
                  background: "var(--teal-dim)",
                  border: "1px solid var(--border-2)",
                }}
              >
                <p
                  className="text-xs font-medium mb-0.5"
                  style={{ color: "var(--teal)" }}
                >
                  Personalised quiz · powered by Gemini
                </p>
                <p className="text-xs" style={{ color: "var(--text-2)" }}>
                  {quizData.questions.length} targeted questions generated from
                  your description
                </p>
              </div>

              {/* Questions */}
              <div className="flex flex-col gap-4">
                {quizData.questions.map((q, i) => (
                  <QuizQuestion
                    key={q.id}
                    question={q}
                    index={i}
                    selectedValue={answers[q.id]}
                    onSelect={selectAnswer}
                  />
                ))}
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* ══ CHAT ═══════════════════════════════════════════════════════════ */}
      {phase === "chat" && (
        <div className="flex flex-col" style={{ flex: 1, minHeight: 0 }}>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-4">
            {chatMessages.map((msg, i) => (
              <ChatBubble key={i} role={msg.role} text={msg.text} />
            ))}
            {chatLoading && <ChatBubble role="ai" typing />}

            {/* Ready banner */}
            {chatReady && !chatLoading && (
              <div
                className="p-4 rounded-xl anim-fade-up"
                style={{
                  background: "var(--green-dim)",
                  border: "1px solid rgba(16,185,129,.3)",
                }}
              >
                <p
                  className="text-sm font-medium mb-1"
                  style={{
                    color: "var(--green)",
                    fontFamily: "Syne, sans-serif",
                  }}
                >
                  Got it — ready to generate your quiz
                </p>
                <p className="text-xs mb-3" style={{ color: "var(--text-2)" }}>
                  Gemini has understood your symptoms and will now generate a
                  personalised diagnostic quiz.
                </p>
                <button
                  onClick={generateQuiz}
                  className="text-sm font-semibold px-4 py-2 rounded-xl"
                  style={{
                    background: "var(--green)",
                    color: "#fff",
                    border: "none",
                    cursor: "pointer",
                    fontFamily: "Syne, sans-serif",
                  }}
                >
                  Generate my personalised quiz →
                </button>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input bar */}
          <div
            className="shrink-0 px-5 py-4"
            style={{
              borderTop: "1px solid var(--border)",
              background: "var(--navy)",
            }}
          >
            {chatReady ? (
              <div
                className="flex items-center gap-2 p-3 rounded-xl"
                style={{
                  background: "var(--navy-card)",
                  border: "1px solid var(--border)",
                }}
              >
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--text-3)"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                >
                  <path d="M9 12l2 2 4-4" />
                  <circle cx="12" cy="12" r="10" />
                </svg>
                <p className="text-xs" style={{ color: "var(--text-3)" }}>
                  Consultation complete · click "Generate my personalised quiz"
                  above
                </p>
              </div>
            ) : (
              <div className="flex gap-3 items-end">
                <textarea
                  ref={inputRef}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Describe how you're feeling…"
                  rows={2}
                  className="input-field flex-1 resize-none"
                  style={{ lineHeight: 1.5 }}
                />
                <button
                  onClick={sendMessage}
                  disabled={!inputText.trim() || chatLoading}
                  className="shrink-0 flex items-center justify-center rounded-xl transition-all"
                  style={{
                    width: 44,
                    height: 44,
                    background:
                      inputText.trim() && !chatLoading
                        ? "var(--teal)"
                        : "var(--navy-light)",
                    border: "1px solid var(--border)",
                    cursor:
                      inputText.trim() && !chatLoading ? "pointer" : "default",
                  }}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={
                      inputText.trim() && !chatLoading
                        ? "var(--navy)"
                        : "var(--text-3)"
                    }
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" />
                  </svg>
                </button>
              </div>
            )}

            {/* Hint pills — only before first message */}
            {!chatStarted && (
              <div className="flex flex-wrap gap-2 mt-3">
                {[
                  "I have fever and joint pain since 2 days",
                  "Severe headache and nausea",
                  "Chest tightness and breathlessness",
                  "Stomach pain and vomiting",
                ].map((hint) => (
                  <button
                    key={hint}
                    onClick={() => {
                      setInputText(hint);
                      inputRef.current?.focus();
                    }}
                    className="text-xs px-3 py-1.5 rounded-full transition-all"
                    style={{
                      background: "var(--navy-card)",
                      border: "1px solid var(--border)",
                      color: "var(--text-3)",
                      cursor: "pointer",
                    }}
                  >
                    {hint}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sticky predict button — shown during quiz phase */}
      {phase === "quiz" && !quizLoading && quizData && (
        <div
          className="absolute bottom-0 left-0 right-0 px-5 pb-6 pt-4"
          style={{
            background: "linear-gradient(to top, var(--navy) 80%, transparent)",
            maxWidth: 480,
            margin: "0 auto",
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs" style={{ color: "var(--text-3)" }}>
              {answeredN} of {totalQ} answered
            </span>
            <span
              className="text-xs"
              style={{ color: allDone ? "var(--green)" : "var(--text-3)" }}
            >
              {allDone ? "All answered ✓" : `${totalQ - answeredN} remaining`}
            </span>
          </div>
          <div
            className="h-1 rounded-full overflow-hidden mb-3"
            style={{ background: "var(--navy-light)" }}
          >
            <div
              style={{
                height: "100%",
                width: `${Math.round((answeredN / Math.max(totalQ, 1)) * 100)}%`,
                background: allDone ? "var(--green)" : "var(--teal)",
                borderRadius: 9999,
                transition: "width .3s ease",
              }}
            />
          </div>
          <button
            className="btn-primary"
            onClick={runPrediction}
            disabled={!allDone}
          >
            {allDone
              ? "Predict my condition →"
              : `Answer all ${totalQ} questions to predict`}
          </button>
        </div>
      )}

      <style>{`
        @keyframes fadeUp {
          from { opacity:0; transform:translateY(12px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes barGrow { from { width: 0%; } }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes dotBounce {
          0%, 80%, 100% { transform: scale(.7); opacity: .5; }
          40% { transform: scale(1); opacity: 1; }
        }
        @keyframes pulseRed {
          0%   { box-shadow: 0 0 0 0 rgba(239,68,68,.5); }
          70%  { box-shadow: 0 0 0 10px rgba(239,68,68,0); }
          100% { box-shadow: 0 0 0 0 rgba(239,68,68,0); }
        }
      `}</style>
    </div>
  );
}

// ─── Fallback helpers (if Gemini fails) ───────────────────────────────────────
function buildFallbackQuiz(hasFever, hasHead, hasStomach) {
  const questions = [];
  if (hasFever) {
    questions.push({
      id: "q_fever_level",
      text: "How high is your fever?",
      options: [
        {
          label: "Very high (above 103°F)",
          value: "high",
          points: { Dengue: 25, Malaria: 25, Typhoid: 20 },
        },
        {
          label: "Moderate (100–103°F)",
          value: "mod",
          points: { Influenza: 20, Typhoid: 10 },
        },
        {
          label: "Low-grade (below 100°F)",
          value: "low",
          points: { CommonCold: 15 },
        },
      ],
    });
    questions.push({
      id: "q_fever_pattern",
      text: "What is the fever pattern?",
      options: [
        {
          label: "Continuous, never goes away",
          value: "cont",
          points: { Typhoid: 30 },
        },
        {
          label: "Comes and goes in cycles",
          value: "cycl",
          points: { Malaria: 40 },
        },
        {
          label: "Sudden spike then drops",
          value: "spike",
          points: { Dengue: 30, Influenza: 20 },
        },
      ],
    });
  }
  if (hasHead) {
    questions.push({
      id: "q_head",
      text: "What does your headache feel like?",
      options: [
        {
          label: "Throbbing on one side",
          value: "throb",
          points: { Migraine: 40 },
        },
        {
          label: "Pressure all over",
          value: "press",
          points: { Influenza: 20, Dengue: 15 },
        },
        {
          label: "Stiff neck with pain",
          value: "stiff",
          points: { Meningitis: 45 },
        },
      ],
    });
  }
  if (hasStomach) {
    questions.push({
      id: "q_stomach",
      text: "Where is the stomach pain?",
      options: [
        {
          label: "Lower right side",
          value: "lr",
          points: { Appendicitis: 45 },
        },
        {
          label: "All over stomach",
          value: "all",
          points: { Gastroenteritis: 30 },
        },
        { label: "Upper abdomen", value: "up", points: { Gastritis: 30 } },
      ],
    });
  }
  questions.push({
    id: "q_duration",
    text: "How long have you had these symptoms?",
    options: [
      {
        label: "Just today",
        value: "today",
        points: { Influenza: 10, CommonCold: 10 },
      },
      { label: "2–5 days", value: "days", points: { Dengue: 15, Typhoid: 10 } },
      {
        label: "1–2 weeks",
        value: "week",
        points: { Typhoid: 20, Tuberculosis: 10 },
      },
      {
        label: "More than 2 weeks",
        value: "long",
        points: { Tuberculosis: 20, Hepatitis: 15 },
      },
    ],
  });
  return {
    questions,
    diseases: [
      "Dengue",
      "Malaria",
      "Typhoid",
      "Influenza",
      "CommonCold",
      "Migraine",
      "Meningitis",
      "Appendicitis",
      "Gastroenteritis",
      "Tuberculosis",
      "Hepatitis",
      "Gastritis",
    ],
  };
}

function buildFallbackResult(scores, diseases) {
  const sorted = Object.entries(scores)
    .filter(([, s]) => s > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  const maxScore = sorted[0]?.[1] || 1;
  const candidates = sorted.map(([d, s]) => ({
    disease: d,
    confidence: Math.max(20, Math.min(92, Math.round((s / maxScore) * 90))),
    reason: "Based on your quiz answers and symptom scores",
  }));

  if (!candidates.length) {
    candidates.push({
      disease: "Undetermined",
      confidence: 40,
      reason: "Insufficient data to predict",
    });
  }

  return {
    phase: candidates[0].confidence >= 75 ? "confident" : "unsure",
    confidence: candidates[0].confidence,
    candidates,
    emergencyFlag: false,
    emergencyReason: "",
  };
}
