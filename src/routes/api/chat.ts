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
    role: z.enum(["system", "user", "assistant", "data"]),
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
          return new Response("Missing LOVABLE_API_KEY", { status: 500 });
        }

        const gateway = createLovableAiGatewayProvider(key);
        const model = gateway("google/gemini-3.1-pro-preview");
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
            temperature: 0.35,
            system:
              `You are Cherry AI Assist, a precise, professional, and current general-purpose AI assistant with an expert executive tone: clear, rigorous, practical, and concise. ` +
              `Today's date is ${today}. Always reason with this as the current date when answering time-sensitive questions. ` +
              `Before answering current officials, politics, leadership, elections, dates, prices, sports, or news, check whether live fact context is provided. If provided, use it over older model memory. ` +
              `Never guess or invent current facts. If no live context is available for a time-sensitive question, say what you can verify and what may need checking with a live source. ` +
              `For writing tasks, produce the requested text directly and completely; do not give vague instructions unless asked. ` +
              `Use clean Markdown, simple language, and a confident professional style. ` +
              `When asked about code, use fenced code blocks with language tags.` +
              liveFactContext,
            messages: await convertToModelMessages(typedMessages),
          });

          return result.toUIMessageStreamResponse({
            originalMessages: typedMessages,
          });
        } catch (error) {
          console.error("Chat stream error:", error);
          return new Response(
            JSON.stringify({ error: "AI service unavailable. Please try again." }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }
      },
    },
  },
});
