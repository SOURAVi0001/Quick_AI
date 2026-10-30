import {
  Activity,
  ArrowRight,
  ArrowUp,
  CheckCircle2,
  ChevronDown,
  Database,
  ExternalLink,
  Info,
  Lock,
  LogIn,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  UserCheck,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, useClerk, useUser } from "@clerk/clerk-react";
import { cn } from "../../utils/cn";
import api from "../../lib/api";
import { MessageBubble } from "./MessageBubble";

const DEFAULT_SUGGESTIONS = [
  "How many free generations do I have left?",
  "What does the Resume Reviewer do?",
  "How can I improve based on my past career tool results?",
  "Show me my recent job applications",
  "Free vs Premium — what's the difference?",
];

const CHAT_STORAGE_KEY = "quickai_support_chat_history";
const CONV_STORAGE_KEY = "quickai_support_conversation_id";

const FEATURE_LINKS = [
  { label: "Smart Email Writer", href: "/ai/write-email" },
  { label: "Resume Reviewer", href: "/ai/review-resume" },
  { label: "Resume Tailor", href: "/ai/resume-tailor" },
  { label: "Career Score", href: "/ai/career-score" },
  { label: "LinkedIn Optimizer", href: "/ai/linkedin-optimizer" },
  { label: "Recruiter Outreach", href: "/ai/recruiter-outreach" },
  { label: "AI Interview Coach", href: "/ai/interview-coach" },
  { label: "Job Tracker", href: "/ai/job-tracker" },
];

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

/**
 * Built-in transport adapter that connects cleanly to the Quick.AI Chatbot FastAPI service.
 * Forwards the query, conversational history turns, conversation_id, and dynamic user context.
 */
async function defaultQuickAiTransport({ message, history, user, conversationId }) {
  const userId = user?.id || (window.Clerk?.user?.id) || "user_guest";
  const token = window.Clerk?.session ? await window.Clerk.session.getToken() : null;

  const payload = {
    request_id: `req_${Date.now().toString(36)}`,
    user_id: userId,
    application_id: "quickai",
    conversation_id: conversationId || `conv_${Date.now().toString(36)}`,
    query: message,
    history: history.slice(-20).map((m) => ({ role: m.role, content: m.content })),
    user_info: user
      ? {
          user_id: userId,
          application_id: "quickai",
          full_name: user.name || "Quick.AI User",
          email: user.email || "",
          plan: user.plan || "free",
          free_usage: user.plan === "premium" ? 0 : (user.freeUsage ?? 0),
          max_free_usage: user.plan === "premium" ? "Unlimited" : (user.freeLimit ?? 5),
          remaining_free_usage: user.plan === "premium" ? "Unlimited" : Math.max((user.freeLimit ?? 5) - (user.freeUsage ?? 0), 0),
          total_creations: user.totalCreations ?? user.recentCreations?.length ?? 0,
          recent_creations: user.recentCreations || [],
          recent_activity: user.recentActivity || [],
        }
      : undefined,
  };

  const candidateEndpoints = Array.from(
    new Set([
      "/api/v1/chat",
      `${import.meta.env.VITE_SERVER_URL || import.meta.env.VITE_BASE_URL || ""}/api/chatbot/chat`,
      import.meta.env.VITE_CHATBOT_URL,
      "http://127.0.0.1:8000/api/v1/chat",
      "http://localhost:8000/api/v1/chat",
    ].filter(Boolean))
  );

  let res = null;
  let lastError = null;

  for (const ep of candidateEndpoints) {
    try {
      res = await fetch(ep, {
        method: "POST",
        credentials: "include",
        signal: AbortSignal.timeout(120000),
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });
      if (res.ok) break;
      const errorBody = await res.text().catch(() => "");
      lastError = new Error(`Chat endpoint ${ep} returned ${res.status}: ${errorBody || res.statusText}`);
    } catch (netErr) {
      lastError = netErr;
    }
  }

  if (!res || !res.ok) {
    throw lastError || new Error("Failed to reach Chatbot backend service across candidate endpoints.");
  }

  const data = await res.json();

  // Detect relevant interactive tool links based ONLY on the actual answer content
  const detectedLinks = [];
  const textCorpus = `${message} ${data.answer || ""}`.toLowerCase();

  const toolMappings = [
    { pattern: /recruiter-outreach|outreach|\/ai\/recruiter-outreach/i, label: "Recruiter Outreach", href: "/ai/recruiter-outreach" },
    { pattern: /smart email writer|write-email|email writer|draft.*email|write.*email/i, label: "Smart Email Writer", href: "/ai/write-email" },
    { pattern: /resume-tailor|tailor.*resume|\/ai\/resume-tailor/i, label: "Resume Tailor", href: "/ai/resume-tailor" },
    { pattern: /review-resume|resume.*review|\/ai\/review-resume/i, label: "Resume Reviewer", href: "/ai/review-resume" },
    { pattern: /linkedin-optimizer|linkedin|\/ai\/linkedin-optimizer/i, label: "LinkedIn Optimizer", href: "/ai/linkedin-optimizer" },
    { pattern: /interview-coach|interview|\/ai\/interview-coach/i, label: "Interview Coach", href: "/ai/interview-coach" },
    { pattern: /career-score|\/ai\/career-score/i, label: "Career Score", href: "/ai/career-score" },
    { pattern: /job-tracker|\/ai\/job-tracker/i, label: "Job Tracker", href: "/ai/job-tracker" },
    { pattern: /generate-images|\/ai\/generate-images/i, label: "Generate Images", href: "/ai/generate-images" },
    { pattern: /write-article|\/ai\/write-article/i, label: "Article Writer", href: "/ai/write-article" },
    { pattern: /pricing|upgrade|premium.*plan|plan.*pricing|pricing table/i, label: "View Plans", href: "/#pricing" },
  ];

  for (const tool of toolMappings) {
    if (tool.pattern.test(textCorpus) && !detectedLinks.some((l) => l.href === tool.href)) {
      detectedLinks.push({ label: tool.label, href: tool.href });
    }
  }

  let kind = "answer";
  if (data.status === "rejected") kind = "rejected";
  else if (data.status === "insufficient_context") kind = "unavailable";
  else if (data.status === "error") kind = "error";

  return {
    content: data.answer,
    kind,
    links: detectedLinks.length > 0 ? detectedLinks.slice(0, 3) : undefined,
  };
}

export function SupportChat({
  user,
  sendMessage,
  apiUrl,
  getHeaders,
  onNavigate,
  position = "bottom-right",
  defaultOpen = false,
  title = "Fizzi AI",
  welcome,
  suggestions = DEFAULT_SUGGESTIONS,
  className,
}) {
  const routerNavigate = useNavigate();
  const { user: clerkUser } = useUser();
  const { openSignIn } = useClerk();
  const { has, getToken } = useAuth();

  // Temporary demo test bypass state (optional testing toggle)
  const [demoActive, setDemoActive] = useState(false);

  // User creations history fetched live from Quick.AI backend
  const [userCreations, setUserCreations] = useState([]);

  // Fetch creations whenever user is signed in to link user creation history to the chatbot
  useEffect(() => {
    let isMounted = true;
    const fetchCreations = async () => {
      if (!clerkUser?.id) return;
      try {
        const token = await getToken();
        const res = await api.get("/api/user/get-user-creations", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (isMounted && res.data?.success && Array.isArray(res.data.content)) {
          setUserCreations(res.data.content);
        }
      } catch {
        // Fallback gracefully
      }
    };
    fetchCreations();
    return () => {
      isMounted = false;
    };
  }, [clerkUser?.id, getToken]);

  // Derive consolidated user context: Requires real authentication unless explicitly passed or demo activated
  const currentUser = useMemo(() => {
    if (user !== undefined) return user;

    if (!clerkUser) {
      if (!demoActive) return null; // Unauthenticated state!
      // Demo test user
      return {
        id: "user_2yMX02PRbyMtQK6PebpjnxvRNIA",
        name: "Alex Johnson (Demo)",
        email: "alex.johnson@example.com",
        plan: "free",
        freeUsage: 3,
        freeLimit: 5,
        totalCreations: 3,
        recentCreations: [
          {
            id: 9,
            type: "blog-title",
            prompt: "Generate a blog title for Technology",
            publish: false,
            likes_count: 0,
            created_at: "2026-10-09T11:09:50Z",
          },
          {
            id: 7,
            type: "article",
            prompt: "Write an article about AI With Coding",
            publish: true,
            likes_count: 4,
            created_at: "2026-10-08T10:15:30Z",
          },
        ],
        recentActivity: [
          { activity_id: "act_1", action: "Generated blog title for 'Technology'", timestamp: "2026-10-09T11:09:50Z" },
          { activity_id: "act_2", action: "Published AI and Coding article to Community", timestamp: "2026-10-08T10:20:00Z" },
        ],
      };
    }

    const hasPremiumFromAuth = typeof has === "function"
      ? (has({ plan: "premium" }) || has({ permission: "premium" }))
      : false;

    const isPremium =
      hasPremiumFromAuth ||
      clerkUser.publicMetadata?.plan === "premium" ||
      clerkUser.unsafeMetadata?.plan === "premium" ||
      clerkUser.publicMetadata?.isPremium === true ||
      clerkUser.unsafeMetadata?.isPremium === true ||
      (typeof clerkUser.publicMetadata?.role === "string" && clerkUser.publicMetadata.role.toLowerCase() === "premium");

    const plan = isPremium ? "premium" : "free";

    const freeUsage = Number(
      clerkUser.publicMetadata?.free_usage ??
      clerkUser.unsafeMetadata?.free_usage ??
      0
    );

    const formattedCreations = userCreations.slice(0, 6).map((c) => ({
      id: c.id,
      type: c.type,
      prompt: c.prompt,
      content: typeof c.content === "string" ? c.content.slice(0, 160) : "",
      publish: !!c.publish,
      likes_count: Array.isArray(c.likes) ? c.likes.length : 0,
      created_at: c.created_at,
    }));

    const formattedActivity = userCreations.slice(0, 4).map((c) => ({
      activity_id: `act_${c.id}`,
      action: `Generated ${c.type} for "${c.prompt?.slice(0, 35) || "item"}..."`,
      timestamp: c.created_at || new Date().toISOString(),
    }));

    return {
      id: clerkUser.id,
      name: clerkUser.fullName || clerkUser.firstName || "User",
      email: clerkUser.primaryEmailAddress?.emailAddress,
      plan,
      freeUsage: isPremium ? 0 : freeUsage,
      freeLimit: isPremium ? 999999 : 5,
      totalCreations: userCreations.length,
      recentCreations: formattedCreations,
      recentActivity: formattedActivity,
    };
  }, [user, clerkUser, userCreations, demoActive, has]);

  // Session & History persistence
  const [conversationId, setConversationId] = useState(() => {
    return localStorage.getItem(`${CONV_STORAGE_KEY}:${currentUser?.id || "guest"}`) || `conv_${uid()}`;
  });

  const [open, setOpen] = useState(defaultOpen);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [unread, setUnread] = useState(0);

  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem(`${CHAT_STORAGE_KEY}:${currentUser?.id || "guest"}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // Ignore
    }
    return [];
  });

  const storageIdentity = currentUser?.id || "guest";
  const [loadedStorageIdentity, setLoadedStorageIdentity] = useState(storageIdentity);

  useEffect(() => {
    if (loadedStorageIdentity === storageIdentity) return;
    try {
      const saved = localStorage.getItem(`${CHAT_STORAGE_KEY}:${storageIdentity}`);
      setMessages(saved ? JSON.parse(saved) : []);
      setConversationId(localStorage.getItem(`${CONV_STORAGE_KEY}:${storageIdentity}`) || `conv_${uid()}`);
    } catch {
      setMessages([]);
    } finally {
      setLoadedStorageIdentity(storageIdentity);
    }
  }, [storageIdentity, loadedStorageIdentity]);

  // Save messages and conversationId per signed-in user.
  useEffect(() => {
    if (loadedStorageIdentity !== storageIdentity) return;
    try {
      localStorage.setItem(`${CHAT_STORAGE_KEY}:${storageIdentity}`, JSON.stringify(messages.slice(-40)));
      localStorage.setItem(`${CONV_STORAGE_KEY}:${storageIdentity}`, conversationId);
    } catch {
      // Ignore
    }
  }, [messages, conversationId, storageIdentity, loadedStorageIdentity]);

  // Live Backend Connection State & Details
  const [connStatus, setConnStatus] = useState("checking");
  const [connInfo, setConnInfo] = useState(null);

  const checkConnection = useCallback(async () => {
    setConnStatus("checking");
    const start = performance.now();
    const candidateBases = Array.from(
      new Set([
        import.meta.env.VITE_CHATBOT_BASE_URL,
        "",
        "http://127.0.0.1:8000",
        "http://localhost:8000",
      ].filter((x) => typeof x === "string"))
    );

    let health = null;
    let chosenBase = "";

    for (const base of candidateBases) {
      try {
        const url = base ? `${base}/health` : "/health";
        const res = await fetch(url, {
          method: "GET",
          signal: AbortSignal.timeout(3000),
        });
        if (res.ok) {
          health = await res.json();
          chosenBase = base;
          break;
        }
      } catch {
        // try next candidate
      }
    }

    if (!health) {
      setConnStatus("disconnected");
      setConnInfo(null);
      setConnLatency(null);
      return;
    }

    // Endpoint reachable

    let info = null;
    try {
      const infoUrl = chosenBase ? `${chosenBase}/api/v1/info` : "/api/v1/info";
      const infoRes = await fetch(infoUrl, {
        method: "GET",
        signal: AbortSignal.timeout(2500),
      });
      if (infoRes.ok) info = await infoRes.json();
    } catch {
      // optional
    }

    setConnInfo({
      service: health.service || "quickai-chatbot-backend",
      version: health.version || "1.0.0",
      status: health.status || "healthy",
      provider: info?.llm_provider || "mock",
      applicationId: info?.supported_application_id || "quickai",
      maxRetries: info?.max_retries ?? 2,
      topK: info?.retrieval_top_k ?? 5,
      endpoint: chosenBase ? `${chosenBase}/api/v1/chat` : "/api/v1/chat",
    });
    setConnStatus("connected");
  }, []);

  // Check health on mount and every 30s when panel is open
  useEffect(() => {
    checkConnection();
    if (!open) return;
    const interval = setInterval(checkConnection, 30000);
    return () => clearInterval(interval);
  }, [checkConnection, open]);

  const listRef = useRef(null);
  const inputRef = useRef(null);
  const panelRef = useRef(null);

  const greeting = useMemo(
    () =>
      welcome ??
      (currentUser
        ? `Hi ${currentUser.name.split(" ")[0]} — I'm Fizzi AI, focused on Quick.AI. I can answer questions about your career activity and help you choose a tool. Select a feature below or tell me what you want to do.`
        : "Hi — please sign in to access Fizzi AI."),
    [welcome, currentUser],
  );

  const transport = useCallback(
    async (payload) => {
      if (sendMessage) return sendMessage(payload);
      if (apiUrl) {
        const headers = { "Content-Type": "application/json", ...(await getHeaders?.()) };
        const res = await fetch(apiUrl, {
          method: "POST",
          headers,
          body: JSON.stringify({
            message: payload.message,
            history: payload.history.map((m) => ({ role: m.role, content: m.content })),
            user: payload.user,
            conversationId: payload.conversationId,
          }),
        });
        if (!res.ok) throw new Error(`Request failed (${res.status})`);
        return await res.json();
      }
      return defaultQuickAiTransport(payload);
    },
    [sendMessage, apiUrl, getHeaders],
  );

  const navigate = useCallback(
    (href) => {
      if (onNavigate) {
        onNavigate(href);
      } else if (href.startsWith("/#")) {
        routerNavigate("/");
        const hash = href.slice(2);
        setTimeout(() => {
          const target = document.getElementById(hash);
          if (target) target.scrollIntoView({ behavior: "smooth" });
        }, 120);
      } else {
        routerNavigate(href);
      }
    },
    [onNavigate, routerNavigate],
  );

  // Auto-scroll on new messages / typing
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, busy, open]);

  // Focus input when opened; clear unread
  useEffect(() => {
    if (open && currentUser) {
      setUnread(0);
      const t = setTimeout(() => inputRef.current?.focus(), 120);
      return () => clearTimeout(t);
    }
  }, [open, currentUser]);

  // Esc to close
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const submit = useCallback(
    async (text) => {
      if (!currentUser) {
        openSignIn();
        return;
      }

      const content = (text ?? input).trim();
      if (!content || busy) return;

      const userMsg = { id: uid(), role: "user", content, createdAt: Date.now() };
      const nextHistory = [...messages, userMsg];
      setMessages(nextHistory);
      setInput("");
      setBusy(true);
      if (inputRef.current) inputRef.current.style.height = "auto";

      try {
        const reply = await transport({
          message: content,
          history: messages,
          user: currentUser,
          conversationId,
        });
        setMessages((m) => [
          ...m,
          {
            id: uid(),
            role: "assistant",
            content: reply.content,
            kind: reply.kind ?? "answer",
            links: reply.links,
            createdAt: Date.now(),
          },
        ]);
      } catch (err) {
        setMessages((m) => [
          ...m,
          {
            id: uid(),
            role: "assistant",
            kind: "error",
            content: `Something went wrong reaching the assistant${
              err instanceof Error ? ` (${err.message})` : ""
            }. Please check if the Chatbot backend service is running.`,
            createdAt: Date.now(),
          },
        ]);
      } finally {
        setBusy(false);
        if (!open) setUnread((n) => n + 1);
      }
    },
    [input, busy, messages, transport, currentUser, conversationId, open, openSignIn],
  );

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void submit();
    }
  };

  const autoGrow = (el) => {
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  };

  const reset = () => {
    setMessages([]);
    setInput("");
    const newConvId = `conv_${uid()}`;
    setConversationId(newConvId);
    try {
      localStorage.removeItem(`${CHAT_STORAGE_KEY}:${storageIdentity}`);
      localStorage.setItem(`${CONV_STORAGE_KEY}:${storageIdentity}`, newConvId);
    } catch {
      // Ignore
    }
    inputRef.current?.focus();
  };

  const side = position === "bottom-left" ? "left-4 sm:left-6" : "right-4 sm:right-6";
  const origin = position === "bottom-left" ? "origin-bottom-left" : "origin-bottom-right";

  return (
    <div className={cn("fixed bottom-4 z-[9999] sm:bottom-6", side, className)}>
      {/* ---------- Panel ---------- */}
      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label={title}
          className={cn(
            "absolute bottom-[calc(100%+14px)] flex w-[calc(100vw-2rem)] max-w-[400px] flex-col overflow-hidden rounded-[22px] border border-white/[0.08] bg-ink-900/95 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8),0_0_0_1px_rgba(255,255,255,0.02)_inset] backdrop-blur-xl animate-pop-in",
            position === "bottom-left" ? "left-0" : "right-0",
            origin,
          )}
          style={{ height: "min(640px, calc(100vh - 110px))" }}
        >
          {/* ambient glow */}
          <div className="pointer-events-none absolute -top-24 right-0 h-56 w-56 rounded-full bg-ember-500/15 blur-3xl" />

          {/* Header */}
          <header className="relative border-b border-white/[0.06] px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-[#08080d] shadow-[0_0_24px_-4px_rgba(59,130,246,0.5)]">
                {currentUser ? (
                  <img
                    src="/chatbot.png"
                    alt=""
                    aria-hidden="true"
                    className="max-w-none shrink-0"
                    style={{ width: 92, height: 69 }}
                  />
                ) : (
                  <Lock className="h-4 w-4 text-ink-950" strokeWidth={2.4} />
                )}
                <span
                  className={cn(
                    "absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full border-2 border-ink-900 transition-colors",
                    connStatus === "connected"
                      ? "bg-emerald-400"
                      : connStatus === "checking"
                        ? "bg-amber-400 animate-pulse"
                        : "bg-red-500",
                  )}
                />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="truncate text-[14px] font-semibold text-white">{title}</h2>
                  {!currentUser && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-amber-300">
                      <Lock className="h-2 w-2" />
                      Auth Req
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-0.5">
                {currentUser && (
                  <IconBtn
                    label="New conversation (resets history)"
                    onClick={reset}
                    disabled={!messages.length}
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </IconBtn>
                )}
                <IconBtn label="Minimize" onClick={() => setOpen(false)}>
                  <ChevronDown className="h-4 w-4" />
                </IconBtn>
              </div>
            </div>
          </header>

          {/* ---------- Body: Auth Gate VS Chat Conversation ---------- */}
          {!currentUser ? (
            <div className="relative flex flex-1 flex-col items-center justify-center p-6 text-center animate-fade-up">
              {/* Soft ambient background glow */}
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="h-44 w-44 rounded-full bg-ember-500/10 blur-2xl" />
              </div>

              {/* Lock Badge */}
              <div className="relative mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-ember-500/30 bg-ember-500/10 shadow-[0_0_32px_-6px_rgba(224,124,56,0.35)]">
                <Lock className="h-7 w-7 text-ember-400" strokeWidth={2.2} />
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-ember-gradient text-[9px] font-bold text-ink-950">
                  ✦
                </span>
              </div>

              <h3 className="relative text-[16px] font-semibold text-white tracking-tight">
                Sign in to use Fizzi AI
              </h3>
              <p className="relative mt-1.5 max-w-[280px] text-[12px] leading-relaxed text-white/55">
                User authentication is required to access the assistant, query your quota, and link your creation history.
              </p>

              {/* RAG Context benefits list */}
              <div className="relative my-4 w-full max-w-[310px] space-y-2 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3 text-left text-[11.5px] text-white/75">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5 shrink-0 text-ember-400" />
                  <span>Real-time quota tracking &amp; plan gating</span>
                </div>
                <div className="flex items-center gap-2">
                  <Database className="h-3.5 w-3.5 shrink-0 text-amber-400" />
                  <span>Access to your personal creations &amp; drafts</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                  <span>Protected isolated user context</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="relative w-full max-w-[310px] space-y-2">
                <button
                  type="button"
                  onClick={() => openSignIn()}
                  className="group relative flex w-full items-center justify-center gap-2 rounded-xl bg-ember-gradient py-2.5 text-[13px] font-semibold text-ink-950 shadow-[0_10px_26px_-8px_rgba(224,124,56,0.7)] transition-all hover:scale-[1.01] hover:brightness-110 active:scale-[0.99]"
                >
                  <LogIn className="h-4 w-4" />
                  <span>Sign In to Continue</span>
                  <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                </button>

                <button
                  type="button"
                  onClick={() => setDemoActive(true)}
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] py-2 text-[11px] font-medium text-white/60 transition hover:bg-white/[0.07] hover:text-white"
                >
                  <UserCheck className="h-3.5 w-3.5 text-ember-400" />
                  <span>Or try with Demo Account (Alex Johnson)</span>
                </button>
              </div>

              <p className="mt-3 text-[10px] text-white/35">
                New to Quick.AI? Signing in creates a free account automatically.
              </p>
            </div>
          ) : (
            /* Messages list (when authenticated) */
            <div ref={listRef} className="qa-scroll relative flex-1 space-y-3.5 overflow-y-auto px-4 py-4">
              <MessageBubble
                message={{ id: "welcome", role: "assistant", content: greeting, createdAt: 0 }}
                onNavigate={navigate}
              />

              {messages.length === 0 && (
                <div className="animate-fade-up space-y-2 pl-8 pt-1">
                  <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-white/35">Quick links</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {FEATURE_LINKS.map((feature) => (
                      <button
                        key={feature.href}
                        type="button"
                        onClick={() => navigate(feature.href)}
                        className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-2.5 py-2 text-left text-[11px] text-white/75 transition hover:border-ember-500/40 hover:bg-ember-500/10 hover:text-ember-200"
                      >
                        {feature.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.length === 0 && (
                <div className="animate-fade-up space-y-1.5 pl-8 pt-1">
                  <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-white/35">
                    Try asking
                  </p>
                  <div className="flex flex-col items-start gap-1.5">
                    {suggestions.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => void submit(s)}
                        className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-left text-[12px] text-white/75 transition hover:border-ember-500/40 hover:bg-ember-500/10 hover:text-ember-200"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((m) => (
                <MessageBubble key={m.id} message={m} onNavigate={navigate} />
              ))}

              {busy && <TypingIndicator />}
            </div>
          )}

          {/* ---------- Composer / Auth Gate Footer ---------- */}
          {!currentUser ? (
            <div className="relative border-t border-white/[0.06] bg-white/[0.01] px-4 py-2.5 text-center">
              <button
                type="button"
                onClick={() => openSignIn()}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-ember-500/20 bg-ember-500/[0.06] py-2 text-[12px] font-medium text-ember-300 transition hover:bg-ember-500/10 hover:border-ember-500/40"
              >
                <Lock className="h-3 w-3" />
                <span>Chat input locked — please sign in above</span>
              </button>
            </div>
          ) : (
            <div className="relative border-t border-white/[0.06] px-3 pt-3 pb-2.5">
              <div
                className={cn(
                  "flex items-end gap-2 rounded-2xl border bg-white/[0.03] p-1.5 pl-3.5 transition",
                  "border-white/[0.08] focus-within:border-ember-500/50 focus-within:shadow-[0_0_0_3px_rgba(224,124,56,0.12)]",
                )}
              >
                <textarea
                  ref={inputRef}
                  rows={1}
                  value={input}
                  disabled={busy}
                  onChange={(e) => {
                    setInput(e.target.value);
                    autoGrow(e.target);
                  }}
                  onKeyDown={onKeyDown}
                  placeholder="Ask about tools, creations, plan, or updates…"
                  className="qa-scroll max-h-[120px] min-h-[36px] flex-1 resize-none bg-transparent py-2 text-[13.5px] leading-snug text-white placeholder:text-white/30 focus:outline-none disabled:opacity-60"
                />
                <button
                  type="button"
                  aria-label="Send"
                  onClick={() => void submit()}
                  disabled={!input.trim() || busy}
                  className={cn(
                    "mb-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition",
                    input.trim() && !busy
                      ? "bg-ember-gradient text-ink-950 shadow-[0_6px_18px_-6px_rgba(224,124,56,0.8)] hover:brightness-110"
                      : "bg-white/[0.06] text-white/30",
                  )}
                >
                  <ArrowUp className="h-4 w-4" strokeWidth={2.5} />
                </button>
              </div>
              <p className="mt-2 text-center text-[10.5px] text-white/30">
                Answers come only from Quick.AI docs and your authorized account data.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ---------- Launcher Button ---------- */}
      <button
        type="button"
        aria-label={open ? "Close support chat" : "Open support chat"}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "group relative flex h-14 w-14 items-center justify-center rounded-full border border-white/10 transition-all duration-300",
          open
            ? "bg-ink-800 text-white hover:bg-ink-700"
          : "bg-[#08080d] text-white shadow-[0_14px_40px_-10px_rgba(59,130,246,0.55)] hover:scale-105 hover:shadow-[0_18px_48px_-10px_rgba(59,130,246,0.75)]",
        )}
      >
        {!open && (
          <span className="pointer-events-none absolute inset-0 rounded-full bg-ember-500/40 animate-pulse-ring" />
        )}
        <span className="relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-full">
          {open ? (
            <X className="h-5 w-5" strokeWidth={2.2} />
          ) : (
            <img
              src="/chatbot.png"
              alt=""
              aria-hidden="true"
              className="max-w-none shrink-0"
              style={{ width: 144, height: 108 }}
            />
          )}
        </span>
        {!open && unread > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-ink-950 bg-red-500 px-1 text-[10px] font-bold text-white">
            {unread}
          </span>
        )}
      </button>
    </div>
  );
}

function IconBtn({
  children,
  label,
  onClick,
  disabled,
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="flex h-8 w-8 items-center justify-center rounded-lg text-white/50 transition hover:bg-white/[0.06] hover:text-white disabled:pointer-events-none disabled:opacity-30"
    >
      {children}
    </button>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2 animate-fade-up">
      <div className="mb-0.5 flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-[#08080d]">
        <img
          src="/chatbot.png"
          alt=""
          aria-hidden="true"
          className="max-w-none shrink-0"
          style={{ width: 96, height: 72 }}
        />
      </div>
      <div className="flex items-center gap-1 rounded-2xl rounded-bl-md border border-white/[0.07] bg-white/[0.04] px-3.5 py-3">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-ember-300 animate-typing"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  );
}

export default SupportChat;
