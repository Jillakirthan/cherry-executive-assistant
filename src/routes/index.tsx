import { createFileRoute } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Mic, MicOff, Plus, Sparkles, Volume2, VolumeX } from "lucide-react";

import cherryLogo from "@/assets/cherry-logo.svg";
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
  PromptInputSubmit,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Button } from "@/components/ui/button";
import {
  cancelSpeech,
  isSpeechRecognitionSupported,
  isSpeechSynthesisSupported,
  speak,
  useSpeechRecognition,
} from "@/lib/voice";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Cherry — AI Chat Assistant" },
      {
        name: "description",
        content:
          "Chat with Cherry, a fast, thoughtful AI assistant. Ask questions, draft text, write code, and more.",
      },
      { property: "og:title", content: "Cherry — AI Chat Assistant" },
      {
        property: "og:description",
        content: "A fast, thoughtful AI assistant for everyday questions.",
      },
    ],
  }),
  component: ChatPage,
});

const SUGGESTIONS = [
  "Who is the present CM of Tamil Nadu in 2026?",
  "Write a professional email about a project delay",
  "Summarize this idea into a clear business plan",
  "Explain this topic like a senior expert",
];

function ChatPage() {
  const [input, setInput] = useState("");
  const [resetKey, setResetKey] = useState(0);
  const [voiceOut, setVoiceOut] = useState(false);
  const lastSpokenIdRef = useRef<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const sttSupported = isSpeechRecognitionSupported();
  const ttsSupported = isSpeechSynthesisSupported();

  const { messages, sendMessage, status, stop, setMessages } = useChat({
    id: `cherry-${resetKey}`,
    transport: new DefaultChatTransport({ api: "/api/chat" }),
    onError: (err) => {
      console.error(err);
      toast.error("Couldn't reach Cherry. Please try again.");
    },
  });

  const isBusy = status === "submitted" || status === "streaming";

  // Keep textarea focused
  useEffect(() => {
    textareaRef.current?.focus();
  }, [resetKey, status]);

  // Speak assistant replies when voice output is on
  useEffect(() => {
    if (!voiceOut || status !== "ready") return;
    const last = messages[messages.length - 1];
    if (!last || last.role !== "assistant") return;
    if (lastSpokenIdRef.current === last.id) return;
    const text = last.parts
      .map((p) => (p.type === "text" ? p.text : ""))
      .join(" ")
      .trim();
    if (text) {
      lastSpokenIdRef.current = last.id;
      speak(text);
    }
  }, [voiceOut, status, messages]);

  // Stop speech when toggled off / unmounted
  useEffect(() => {
    if (!voiceOut) cancelSpeech();
    return () => cancelSpeech();
  }, [voiceOut]);

  const handleVoiceFinal = useCallback(
    (text: string) => {
      if (!text || isBusy) return;
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

  const sendSuggestion = (text: string) => {
    if (isBusy) return;
    void sendMessage({ text });
  };

  const newChat = () => {
    cancelSpeech();
    stopListening();
    setMessages([]);
    setInput("");
    lastSpokenIdRef.current = null;
    setResetKey((k) => k + 1);
  };

  return (
    <div className="relative flex min-h-screen flex-col bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b border-border/50 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <img
              src={cherryLogo}
              alt="Cherry AI Assist"
              width={40}
              height={40}
              className="h-10 w-10 rounded-full shadow-glow"
            />
            <div className="min-w-0 leading-tight">
              <h1 className="truncate text-base font-semibold">Cherry AI Assist</h1>
              <p className="truncate text-xs text-muted-foreground">Professional chat</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={toggleVoiceOut}
              title={voiceOut ? "Mute voice" : "Read replies aloud"}
              aria-pressed={voiceOut}
              className={
                voiceOut
                  ? "text-primary hover:text-primary"
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
              <span className="hidden sm:inline">New chat</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-6xl flex-1 grid-cols-1 gap-6 px-4 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="hidden border-r border-border/40 py-6 pr-6 lg:block">
          <div className="sticky top-20 space-y-4">
            <div className="rounded-2xl border border-border/60 bg-card/55 p-4 shadow-glow">
              <div className="mb-3 flex items-center gap-2 text-sm font-medium">
                <Sparkles className="h-4 w-4 text-primary" />
                Expert mode
              </div>
              <div className="space-y-3 text-sm text-muted-foreground">
                <div className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>Direct answers for current facts.</span>
                </div>
                <div className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>Cleaner writing for emails, plans, and notes.</span>
                </div>
                <div className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>Voice input and spoken replies.</span>
                </div>
              </div>
            </div>
          </div>
        </aside>

        <section className="flex min-h-[calc(100vh-65px)] min-w-0 flex-col">
          <Conversation className="flex-1">
            <ConversationContent className="gap-5 px-0 py-8">
              {messages.length === 0 ? (
                <ConversationEmptyState className="items-start justify-start px-0 py-6 text-left">
                  <div className="w-full max-w-3xl space-y-6">
                    <div className="space-y-3">
                      <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/50 px-3 py-1 text-xs text-muted-foreground">
                        <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                        Live verification for current office-holder questions
                      </div>
                      <h2 className="text-3xl font-semibold leading-tight sm:text-4xl">
                        Ask clearly. Get a precise answer.
                      </h2>
                      <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                        Cherry now checks supported current facts before answering and writes in a cleaner professional style.
                      </p>
                    </div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {SUGGESTIONS.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => sendSuggestion(s)}
                          className="min-h-16 rounded-xl border border-border/60 bg-card/55 px-4 py-3 text-left text-sm leading-5 text-foreground/90 transition hover:border-primary/50 hover:bg-card/80 hover:shadow-glow"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                </ConversationEmptyState>
              ) : (
                messages.map((m: UIMessage) => (
                  <Message key={m.id} from={m.role} className="max-w-full">
                    {m.role === "user" ? (
                      <MessageContent className="max-w-[88%] rounded-2xl bg-primary px-4 py-3 text-primary-foreground">
                        {m.parts.map((p, i) =>
                          p.type === "text" ? <span key={i}>{p.text}</span> : null,
                        )}
                      </MessageContent>
                    ) : (
                      <div className="flex gap-3">
                        <img
                          src={cherryLogo}
                          alt=""
                          width={28}
                          height={28}
                          className="mt-1 h-7 w-7 shrink-0 rounded-full"
                        />
                        <MessageContent className="min-w-0 max-w-none rounded-2xl border border-border/60 bg-card/45 px-4 py-3 text-foreground">
                          {m.parts.map((p, i) =>
                            p.type === "text" ? (
                              <MessageResponse key={i}>{p.text}</MessageResponse>
                            ) : null,
                          )}
                        </MessageContent>
                      </div>
                    )}
                  </Message>
                ))
              )}

              {status === "submitted" && (
                <Message from="assistant" className="max-w-full">
                  <div className="flex gap-3">
                    <img
                      src={cherryLogo}
                      alt=""
                      width={28}
                      height={28}
                      className="mt-1 h-7 w-7 shrink-0 rounded-full"
                    />
                    <MessageContent className="rounded-2xl border border-border/60 bg-card/45 px-4 py-3">
                      <Shimmer>Checking and thinking…</Shimmer>
                    </MessageContent>
                  </div>
                </Message>
              )}
            </ConversationContent>
            <ConversationScrollButton />
          </Conversation>

          <div className="sticky bottom-0 bg-gradient-to-t from-background via-background to-transparent pb-6 pt-4">
            <PromptInput
              onSubmit={handleSubmit}
              globalDrop={false}
              multiple={false}
              className="overflow-hidden rounded-2xl border-border/70 bg-card/80 shadow-glow backdrop-blur-xl"
            >
              <PromptInputTextarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask Cherry anything…"
                autoFocus
              />
              <PromptInputFooter className="justify-between">
                <Button
                  type="button"
                  variant={listening ? "default" : "ghost"}
                  size="icon-sm"
                  onClick={toggleMic}
                  aria-pressed={listening}
                  title={listening ? "Stop listening" : "Speak to Cherry"}
                  className={
                    listening
                      ? "animate-pulse bg-primary text-primary-foreground shadow-glow"
                      : "text-muted-foreground hover:text-foreground"
                  }
                >
                  {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>
                <PromptInputSubmit
                  status={status}
                  disabled={!input.trim() && !isBusy}
                  onClick={isBusy ? () => stop() : undefined}
                />
              </PromptInputFooter>
            </PromptInput>
            <p className="mt-2 text-center text-[11px] text-muted-foreground">
              {listening ? "Listening… speak now" : "Cherry checks supported live facts and may still need verification for critical decisions."}
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
