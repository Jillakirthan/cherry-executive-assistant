import { createFileRoute, Link } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ArrowUpRight,
  History,
  Mic,
  MicOff,
  Plus,
  Sparkles,
  Square,
  Trash2,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import cherryLogo from "@/assets/cherry-logo.png";
import { PricingPlans } from "@/components/pricing-plans";

import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputFooter,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Button } from "@/components/ui/button";
import {
  cancelSpeech,
  isSpeechRecognitionSupported,
  isSpeechSynthesisSupported,
  speak,
  speakWithFollowup,
  useSpeechRecognition,
} from "@/lib/voice";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Cherry — Executive AI Assistant" },
      {
        name: "description",
        content:
          "Cherry is a precise, executive-grade AI assistant. Strategy, writing, code, and clear answers — on demand.",
      },
      { property: "og:title", content: "Cherry — Executive AI Assistant" },
      {
        property: "og:description",
        content: "Precise answers, executive tone. Built for serious work.",
      },
    ],
  }),
  component: ChatPage,
});

const CAPABILITIES = [
  {
    label: "Strategy",
    prompt: "Give me an executive briefing on the current state of AI infrastructure, in 5 bullet points.",
  },
  {
    label: "Writing",
    prompt: "Draft a concise board-level memo announcing a product delay, taking responsibility without panic.",
  },
  {
    label: "Analysis",
    prompt: "Compare the leadership styles of Sundar Pichai and Elon Musk in 6 lines.",
  },
  {
    label: "Code",
    prompt: "Write a production-grade TypeScript function for debouncing async calls with cancellation.",
  },
];

type HistorySession = {
  id: string;
  title: string;
  updatedAt: number;
  messages: UIMessage[];
};

const HISTORY_KEY = "cherry.history.v1";
const MAX_SESSIONS = 40;

function loadHistory(): HistorySession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveHistory(sessions: HistorySession[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(sessions.slice(0, MAX_SESSIONS)));
  } catch {
    /* ignore quota */
  }
}

function firstText(m: UIMessage): string {
  for (const p of m.parts) if (p.type === "text" && p.text) return p.text;
  return "";
}

function deriveTitle(messages: UIMessage[]): string {
  const firstUser = messages.find((m) => m.role === "user");
  const t = firstUser ? firstText(firstUser) : "";
  const clean = t.replace(/\s+/g, " ").trim();
  if (!clean) return "New conversation";
  return clean.length > 60 ? clean.slice(0, 57) + "…" : clean;
}

function ChatPage() {
  const [input, setInput] = useState("");
  const [resetKey, setResetKey] = useState(0);
  const [currentId, setCurrentId] = useState<string>(() =>
    typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now()),
  );
  const [voiceOut, setVoiceOut] = useState(false);
  const [history, setHistory] = useState<HistorySession[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [pricingOpen, setPricingOpen] = useState(false);
  const lastSpokenIdRef = useRef<string | null>(null);
  const voiceTurnRef = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const sttSupported = isSpeechRecognitionSupported();
  const ttsSupported = isSpeechSynthesisSupported();

  const { messages, sendMessage, status, stop, setMessages } = useChat({
    id: `cherry-${resetKey}`,
    transport: new DefaultChatTransport({ api: "/api/chat" }),
    onError: (err) => {
      console.error(err);
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(
        msg.includes("Unauthorized") || msg.includes("401")
          ? "Cherry endpoint isn't authorized. The AI key needs to be refreshed."
          : "Couldn't reach Cherry. Please try again.",
      );
    },
  });

  const isBusy = status === "submitted" || status === "streaming";

  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  // Persist current conversation into history whenever it changes
  useEffect(() => {
    if (messages.length === 0) return;
    setHistory((prev) => {
      const next = [...prev];
      const idx = next.findIndex((s) => s.id === currentId);
      const session: HistorySession = {
        id: currentId,
        title: deriveTitle(messages),
        updatedAt: Date.now(),
        messages,
      };
      if (idx >= 0) next[idx] = session;
      else next.unshift(session);
      next.sort((a, b) => b.updatedAt - a.updatedAt);
      const trimmed = next.slice(0, MAX_SESSIONS);
      saveHistory(trimmed);
      return trimmed;
    });
  }, [messages, currentId]);

  useEffect(() => {
    textareaRef.current?.focus();
  }, [resetKey, status]);

  useEffect(() => {
    if (status !== "ready") return;
    const last = messages[messages.length - 1];
    if (!last || last.role !== "assistant") return;
    if (lastSpokenIdRef.current === last.id) return;
    const text = last.parts
      .map((p) => (p.type === "text" ? p.text : ""))
      .join(" ")
      .trim();
    if (!text) return;
    lastSpokenIdRef.current = last.id;
    if (voiceTurnRef.current) {
      voiceTurnRef.current = false;
      speakWithFollowup(text);
    } else if (voiceOut) {
      speak(text);
    }
  }, [voiceOut, status, messages]);

  useEffect(() => {
    if (!voiceOut) cancelSpeech();
    return () => cancelSpeech();
  }, [voiceOut]);

  const handleVoiceFinal = useCallback(
    (text: string) => {
      if (!text || isBusy) return;
      voiceTurnRef.current = true;
      void sendMessage({ text });
      setInput("");
    },
    [isBusy, sendMessage],
  );

  const { listening, start: startListening, stop: stopListening } =
    useSpeechRecognition({
      onFinal: handleVoiceFinal,
      onInterim: (t) => setInput(t),
    });

  const toggleMic = () => {
    if (!sttSupported) {
      toast.error("Voice input isn't supported in this browser. Try Chrome.");
      return;
    }
    if (listening) {
      stopListening();
    } else {
      cancelSpeech();
      const ok = startListening();
      if (!ok) toast.error("Couldn't start microphone.");
    }
  };

  const toggleVoiceOut = () => {
    if (!ttsSupported) {
      toast.error("Voice output isn't supported in this browser.");
      return;
    }
    setVoiceOut((v) => {
      if (v) cancelSpeech();
      return !v;
    });
  };

  const handleSubmit = useCallback(
    (message: PromptInputMessage) => {
      const text = message.text?.trim();
      if (!text || isBusy) return;
      void sendMessage({ text });
      setInput("");
    },
    [isBusy, sendMessage],
  );

  const sendPrompt = (text: string) => {
    if (isBusy) return;
    void sendMessage({ text });
  };

  const newChat = () => {
    cancelSpeech();
    stopListening();
    setMessages([]);
    setInput("");
    lastSpokenIdRef.current = null;
    setCurrentId(
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : String(Date.now()),
    );
    setResetKey((k) => k + 1);
    setHistoryOpen(false);
  };

  const openSession = (s: HistorySession) => {
    cancelSpeech();
    stopListening();
    lastSpokenIdRef.current = null;
    setCurrentId(s.id);
    setResetKey((k) => k + 1);
    // setMessages after the new useChat instance mounts
    setTimeout(() => setMessages(s.messages), 0);
    setHistoryOpen(false);
  };

  const deleteSession = (id: string) => {
    setHistory((prev) => {
      const next = prev.filter((s) => s.id !== id);
      saveHistory(next);
      return next;
    });
    if (id === currentId) newChat();
  };

  const clearAllHistory = () => {
    saveHistory([]);
    setHistory([]);
    newChat();
  };

  const canSend = input.trim().length > 0 && !isBusy;

  const historyGroups = useMemo(() => {
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    const groups: { label: string; items: HistorySession[] }[] = [
      { label: "Today", items: [] },
      { label: "Previous 7 days", items: [] },
      { label: "Earlier", items: [] },
    ];
    for (const s of history) {
      const age = now - s.updatedAt;
      if (age < day) groups[0].items.push(s);
      else if (age < 7 * day) groups[1].items.push(s);
      else groups[2].items.push(s);
    }
    return groups.filter((g) => g.items.length > 0);
  }, [history]);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setHistoryOpen(true)}
              title="History"
              className="text-muted-foreground hover:text-foreground"
            >
              <History className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-3">
              <img
                src={cherryLogo}
                alt="Cherry logo"
                width={36}
                height={36}
                className={`h-9 w-9 ${isBusy ? "animate-cherry-pulse" : ""}`}
              />
              <div className="leading-tight">
                <div className="text-[15px] font-semibold tracking-tight">Cherry</div>
                <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  EXECUTIVE AI ASSISTANT
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPricingOpen(true)}
              className="gap-1.5 text-muted-foreground hover:text-foreground"
              title="Upgrade plan"
            >
              <Sparkles className="h-4 w-4" />
              <span className="hidden sm:inline">Upgrade</span>
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={toggleVoiceOut}
              title={voiceOut ? "Mute voice" : "Read replies aloud"}
              aria-pressed={voiceOut}
              className={
                voiceOut
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }
            >
              {voiceOut ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={newChat}
              className="gap-2 text-muted-foreground hover:text-foreground"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">New session</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Pricing modal */}
      {pricingOpen && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-background/70 backdrop-blur-sm"
            onClick={() => setPricingOpen(false)}
            aria-hidden
          />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-elegant sm:p-8">
              <button
                type="button"
                onClick={() => setPricingOpen(false)}
                className="absolute right-4 top-4 rounded-md p-1 text-muted-foreground transition hover:bg-accent hover:text-foreground"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="mb-6 text-center">
                <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                  <Sparkles className="h-3 w-3" />
                  Upgrade Cherry
                </div>
                <h2 className="mt-4 font-serif text-3xl leading-tight sm:text-4xl">
                  Get more out of Cherry.
                </h2>
                <p className="mx-auto mt-2 max-w-md text-[13.5px] leading-6 text-muted-foreground">
                  Pick a plan that fits your work. Upgrade anytime, cancel anytime.
                </p>
              </div>
              <PricingPlans
                onChoose={(plan) => {
                  toast.success(
                    `${plan.name} selected — billing isn't wired up yet, but your choice is noted.`,
                  );
                  setPricingOpen(false);
                }}
              />
              <div className="mt-6 text-center">
                <Link
                  to="/pricing"
                  onClick={() => setPricingOpen(false)}
                  className="text-[12px] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                >
                  See full pricing page →
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* History drawer */}
      {historyOpen && (
        <div className="fixed inset-0 z-40">
          <div
            className="absolute inset-0 bg-background/70 backdrop-blur-sm"
            onClick={() => setHistoryOpen(false)}
            aria-hidden
          />
          <aside className="absolute inset-y-0 left-0 flex w-[88%] max-w-sm flex-col border-r border-border bg-card shadow-elegant">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  Sessions
                </div>
                <div className="font-serif text-lg leading-tight">History</div>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setHistoryOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="border-b border-border px-3 py-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={newChat}
                className="w-full justify-start gap-2"
              >
                <Plus className="h-4 w-4" />
                New session
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto px-2 py-3">
              {history.length === 0 ? (
                <p className="px-3 py-6 text-center text-[13px] text-muted-foreground">
                  No conversations yet.
                </p>
              ) : (
                historyGroups.map((g) => (
                  <div key={g.label} className="mb-4">
                    <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      {g.label}
                    </div>
                    <ul className="space-y-0.5">
                      {g.items.map((s) => (
                        <li key={s.id}>
                          <div
                            className={`group flex items-center gap-1 rounded-md px-2 py-1.5 transition ${
                              s.id === currentId
                                ? "bg-accent text-foreground"
                                : "hover:bg-accent/60"
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => openSession(s)}
                              className="min-w-0 flex-1 text-left"
                            >
                              <div className="truncate text-[13.5px] leading-5 text-foreground">
                                {s.title}
                              </div>
                              <div className="truncate text-[11px] text-muted-foreground">
                                {new Date(s.updatedAt).toLocaleString()} ·{" "}
                                {s.messages.length} msg
                              </div>
                            </button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => deleteSession(s.id)}
                              title="Delete"
                              className="opacity-0 transition group-hover:opacity-100"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))
              )}
            </div>
            {history.length > 0 && (
              <div className="border-t border-border px-3 py-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllHistory}
                  className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
                >
                  <Trash2 className="h-4 w-4" />
                  Clear all history
                </Button>
              </div>
            )}
          </aside>
        </div>
      )}

      {/* Main */}
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6">
        <Conversation className="flex-1">
          <ConversationContent className="gap-6 px-0 py-10">
            {messages.length === 0 ? (
              <ConversationEmptyState className="items-start justify-start px-0 py-8 text-left">
                <div className="w-full space-y-10">
                  <div className="space-y-5">
                    <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                      Live · Verified facts
                    </div>
                    <h1 className="font-serif text-5xl leading-[1.05] tracking-tight text-foreground sm:text-6xl">
                      Good day.
                      <br />
                      <span className="italic text-muted-foreground">How may I assist?</span>
                    </h1>
                    <p className="max-w-xl text-[15px] leading-7 text-muted-foreground">
                      Cherry answers with the precision of a chief of staff —
                      grounded, concise, and decisive. Ask for strategy, drafts,
                      analysis, or code.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2">
                    {CAPABILITIES.map((c) => (
                      <button
                        key={c.label}
                        type="button"
                        onClick={() => sendPrompt(c.prompt)}
                        className="group flex flex-col gap-2 bg-card p-5 text-left transition hover:bg-accent"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                            {c.label}
                          </span>
                          <ArrowUpRight className="h-4 w-4 text-muted-foreground transition group-hover:text-foreground" />
                        </div>
                        <span className="text-[14px] leading-6 text-foreground">
                          {c.prompt}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </ConversationEmptyState>
            ) : (
              messages.map((m: UIMessage) => (
                <Message key={m.id} from={m.role} className="max-w-full">
                  {m.role === "user" ? (
                    <MessageContent className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-4 py-3 text-[14.5px] leading-6 text-primary-foreground">
                      {m.parts.map((p, i) =>
                        p.type === "text" ? <span key={i}>{p.text}</span> : null,
                      )}
                    </MessageContent>
                  ) : (
                    <div className="flex w-full gap-4">
                      <img
                        src={cherryLogo}
                        alt="Cherry"
                        width={32}
                        height={32}
                        loading="lazy"
                        className="mt-1 h-8 w-8 shrink-0 rounded-md border border-border bg-card p-1"
                      />
                      <div className="min-w-0 flex-1 pt-1">
                        <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                          Cherry
                        </div>
                        <MessageContent className="min-w-0 max-w-none border-0 bg-transparent p-0 text-[15px] leading-7 text-foreground">
                          {m.parts.map((p, i) =>
                            p.type === "text" ? (
                              <MessageResponse key={i}>{p.text}</MessageResponse>
                            ) : null,
                          )}
                        </MessageContent>
                      </div>
                    </div>
                  )}
                </Message>
              ))
            )}

            {status === "submitted" && (
              <Message from="assistant" className="max-w-full">
                <div className="flex w-full gap-4">
                  <img
                    src={cherryLogo}
                    alt="Cherry thinking"
                    width={32}
                    height={32}
                    loading="lazy"
                    className="mt-1 h-8 w-8 shrink-0 rounded-md border border-border bg-card p-1 animate-cherry-pulse"
                  />
                  <div className="pt-1">
                    <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Cherry
                    </div>
                    <Shimmer>Thinking…</Shimmer>
                  </div>
                </div>
              </Message>
            )}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>

        {/* Composer */}
        <div className="sticky bottom-0 bg-gradient-to-t from-background via-background to-transparent pb-6 pt-4">
          <PromptInput
            onSubmit={handleSubmit}
            globalDrop={false}
            multiple={false}
            className="overflow-hidden rounded-2xl border border-border bg-card shadow-elegant"
          >
            <PromptInputTextarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Brief Cherry — strategy, draft, analysis, or code…"
              autoFocus
              className="min-h-14 text-[15px] leading-7"
            />
            <PromptInputFooter className="justify-between border-t border-border/60 bg-card px-3 py-2">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={toggleMic}
                aria-pressed={listening}
                title={listening ? "Stop listening" : "Dictate"}
                className={
                  listening
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }
              >
                {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </Button>
              <Button
                type={isBusy ? "button" : "submit"}
                size="sm"
                onClick={isBusy ? () => stop() : undefined}
                disabled={!isBusy && !canSend}
                className="h-9 gap-1.5 rounded-lg bg-primary px-4 text-[13px] font-medium text-primary-foreground hover:bg-primary/90"
              >
                {isBusy ? (
                  <>
                    <Square className="h-3.5 w-3.5 fill-current" />
                    Stop
                  </>
                ) : (
                  <>
                    Send
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </>
                )}
              </Button>
            </PromptInputFooter>
          </PromptInput>
          <p className="mt-3 text-center text-[11px] tracking-wide text-muted-foreground">
            {listening
              ? "Listening — speak clearly."
              : "Jilla Kirthan @ Cherry verifies live facts. Always confirm before high-stakes decisions."}
          </p>
        </div>
      </main>
    </div>
  );
}
