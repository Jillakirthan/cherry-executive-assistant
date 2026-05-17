import { createFileRoute } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";

import novaLogo from "@/assets/nova-logo.png";
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

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Nova — AI Chat Assistant" },
      {
        name: "description",
        content:
          "Chat with Nova, a fast, thoughtful AI assistant. Ask questions, draft text, write code, and more.",
      },
      { property: "og:title", content: "Nova — AI Chat Assistant" },
      {
        property: "og:description",
        content: "A fast, thoughtful AI assistant for everyday questions.",
      },
    ],
  }),
  component: ChatPage,
});

const SUGGESTIONS = [
  "Explain quantum entanglement like I'm 12",
  "Draft a friendly out-of-office email",
  "Write a regex for an email address in JS",
  "Give me 5 dinner ideas using chickpeas",
];

function ChatPage() {
  const [input, setInput] = useState("");
  const [resetKey, setResetKey] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const { messages, sendMessage, status, stop, setMessages } = useChat({
    id: `nova-${resetKey}`,
    transport: new DefaultChatTransport({ api: "/api/chat" }),
    onError: (err) => {
      console.error(err);
      toast.error("Couldn't reach Nova. Please try again.");
    },
  });

  const isBusy = status === "submitted" || status === "streaming";

  // Keep textarea focused
  useEffect(() => {
    textareaRef.current?.focus();
  }, [resetKey, status]);

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
    setMessages([]);
    setInput("");
    setResetKey((k) => k + 1);
  };

  return (
    <div className="relative flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 border-b border-border/50 bg-background/60 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <img
              src={novaLogo}
              alt="Nova"
              width={36}
              height={36}
              className="h-9 w-9 rounded-full shadow-glow"
            />
            <div className="leading-tight">
              <h1 className="text-base font-semibold tracking-tight">Nova</h1>
              <p className="text-xs text-muted-foreground">AI assistant</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={newChat}
            className="gap-2 text-muted-foreground hover:text-foreground"
          >
            <Plus className="h-4 w-4" />
            New chat
          </Button>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4">
        <Conversation className="flex-1">
          <ConversationContent className="space-y-6 py-8">
            {messages.length === 0 ? (
              <ConversationEmptyState
                icon={
                  <img
                    src={novaLogo}
                    alt=""
                    width={72}
                    height={72}
                    className="h-18 w-18 rounded-full shadow-glow"
                  />
                }
                title="Hi, I'm Nova."
                description="Ask me anything — I'll do my best to help."
              >
                <div className="mt-6 grid w-full max-w-xl grid-cols-1 gap-2 sm:grid-cols-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => sendSuggestion(s)}
                      className="rounded-xl border border-border/60 bg-card/40 px-4 py-3 text-left text-sm text-foreground/90 transition hover:border-primary/50 hover:bg-card/70 hover:shadow-glow"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </ConversationEmptyState>
            ) : (
              messages.map((m: UIMessage) => (
                <Message key={m.id} from={m.role}>
                  {m.role === "user" ? (
                    <MessageContent className="bg-primary text-primary-foreground">
                      {m.parts.map((p, i) =>
                        p.type === "text" ? <span key={i}>{p.text}</span> : null,
                      )}
                    </MessageContent>
                  ) : (
                    <MessageContent
                     
                      className="bg-transparent px-0 py-0 text-foreground"
                    >
                      {m.parts.map((p, i) =>
                        p.type === "text" ? (
                          <MessageResponse key={i}>{p.text}</MessageResponse>
                        ) : null,
                      )}
                    </MessageContent>
                  )}
                </Message>
              ))
            )}

            {status === "submitted" && (
              <Message from="assistant">
                <MessageContent
                 
                  className="bg-transparent px-0 py-0"
                >
                  <Shimmer>Thinking…</Shimmer>
                </MessageContent>
              </Message>
            )}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>

        <div className="sticky bottom-0 pb-6 pt-2">
          <PromptInput
            onSubmit={handleSubmit}
            globalDrop={false}
            multiple={false}
            className="overflow-hidden rounded-2xl border-border/60 bg-card/60 backdrop-blur-xl shadow-glow"
          >
            <PromptInputTextarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Message Nova…"
              autoFocus
            />
            <PromptInputFooter className="justify-end">
              <PromptInputSubmit
                status={status}
                disabled={!input.trim() && !isBusy}
                onClick={isBusy ? () => stop() : undefined}
              />
            </PromptInputFooter>
          </PromptInput>
          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            Nova can make mistakes. Verify important info.
          </p>
        </div>
      </main>
    </div>
  );
}
