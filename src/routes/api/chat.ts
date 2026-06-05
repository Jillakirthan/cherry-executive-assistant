import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway";
import { buildLiveFactContext } from "@/lib/live-facts.server";

const MAX_MESSAGES = 50;
const MAX_TEXT_LEN = 10_000;
const MAX_BODY_BYTES = 256 * 1024; // 256 KB

const partSchema = z
  .object({
    type: z.string().max(64).optional(),
    text: z.string().max(MAX_TEXT_LEN).optional(),
  })
  .passthrough();

const messageSchema = z
  .object({
    role: z.enum(["user", "assistant"]),
    content: z.string().max(MAX_TEXT_LEN).optional(),
    parts: z.array(partSchema).max(32).optional(),
  })
  .passthrough();

const bodySchema = z.object({
  messages: z.array(messageSchema).min(1).max(MAX_MESSAGES),
});

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const raw = await request.text();
        if (raw.length > MAX_BODY_BYTES) {
          return new Response("Payload too large", { status: 413 });
        }

        let parsedJson: unknown;
        try {
          parsedJson = JSON.parse(raw);
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        const parsed = bodySchema.safeParse(parsedJson);
        if (!parsed.success) {
          return new Response(
            JSON.stringify({ error: "Invalid request payload", issues: parsed.error.issues }),
            { status: 400, headers: { "Content-Type": "application/json" } },
          );
        }
        const { messages } = parsed.data;

        const key = process.env.LOVABLE_API_KEY;
        if (!key) {
          return new Response(
            JSON.stringify({ error: "Cherry isn't authorized: missing LOVABLE_API_KEY on the server." }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }

        const gateway = createLovableAiGatewayProvider(key);
        const model = gateway("google/gemini-3-flash-preview");
        const typedMessages = messages as unknown as UIMessage[];
        const liveFactContext = await buildLiveFactContext(typedMessages);

        const today = new Date().toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        });

        try {
          const result = streamText({
            model,
            maxOutputTokens: 8192,
            temperature: 0.4,
            system:
              `You are Cherry Executive AI Assistant — a precise, professional, current general-purpose AI assistant. Speak with the calm clarity and conviction of a world-class executive communicator (think Sundar Pichai or Elon Musk): direct, structured, confident, and warm. Match the polish of leading assistants like ChatGPT, Gemini, and Grok. ` +
              `Today's date is ${today}. Reason with this as the current date for time-sensitive questions. ` +
              `Before answering current officials, politics, leadership, elections, dates, prices, sports, or news, check whether live fact context is provided. If provided, trust it over older model memory. ` +
              `Never guess or invent current facts. If no live context is available for a time-sensitive question, say what you can verify and what may need a live source. ` +
              `For writing tasks, produce the requested text directly and completely. ` +
              `FORMATTING RULES (strict):\n` +
              `- Output clean Markdown that renders to HTML. Never leave raw asterisks, underscores, hashes, tildes, or backticks visible in the answer.\n` +
              `- Use **bold** for emphasis on key terms, names, and labels. Use proper Markdown headings (##, ###) for section titles when the answer has multiple sections. Use real bullet lists (- item) and numbered lists (1. item) — never fake bullets with "*" or "•" inline.\n` +
              `- Do NOT sprinkle stand-alone "*" or "**" characters in the middle of sentences. Either wrap a complete phrase in **bold** or leave it plain. Every "*" or "**" you open must be closed on the same line around the word/phrase you're emphasizing.\n` +
              `- Do NOT use ALL-CAPS for emphasis, do NOT use decorative symbols (★, ➤, ✦, etc.), and do NOT mix bold and italic markers unnecessarily.\n` +
              `- For code, use fenced code blocks with a language tag.\n` +
              `- For links, use [text](url) syntax.\n` +
              `Keep replies focused, well-structured, and free of filler. End most replies with one short, natural follow-up offer (e.g. "Want me to go deeper on any part?") unless the user asked for a one-shot answer.` +
              liveFactContext,
            messages: await convertToModelMessages(typedMessages),
          });

          return result.toUIMessageStreamResponse({
            originalMessages: typedMessages,
          });
        } catch (error) {
          console.error("Chat stream error:", error);
          const detail = error instanceof Error ? error.message : "Unknown error";
          return new Response(
            JSON.stringify({ error: `AI service unavailable: ${detail}` }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }
      },
    },
  },
});
