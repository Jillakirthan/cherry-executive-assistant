import { createFileRoute } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowUpRight, Mic, MicOff, Plus, Square, Volume2, VolumeX } from "lucide-react";

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

  useEffect(() => {
    textareaRef.current?.focus();
  }, [resetKey, status]);

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
    setResetKey((k) => k + 1);
  };

  const canSend = input.trim().length > 0 && !isBusy;

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <span className="font-serif text-xl leading-none">C</span>
            </div>
            <div className="leading-tight">
              <div className="text-[15px] font-semibold tracking-tight">Cherry</div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                Executive Assistant
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
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
                      <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-card">
                        <span className="font-serif text-base leading-none text-foreground">C</span>
                      </div>
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
                  <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-card">
                    <span className="font-serif text-base leading-none text-foreground">C</span>
                  </div>
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
              : "Cherry verifies live facts. Always confirm before high-stakes decisions."}
          </p>
        </div>
      </main>
    </div>
  );
}
