import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway";

type ChatRequestBody = { messages?: unknown };

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const { messages } = (await request.json()) as ChatRequestBody;
        if (!Array.isArray(messages)) {
          return new Response("Messages are required", { status: 400 });
        }

        const key = process.env.LOVABLE_API_KEY;
        if (!key) {
          return new Response("Missing LOVABLE_API_KEY", { status: 500 });
        }

        const gateway = createLovableAiGatewayProvider(key);
        const model = gateway("google/gemini-3.1-pro-preview");

        const today = new Date().toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        });

        try {
          const result = streamText({
            model,
            system:
              `You are Cherry, a thoughtful, concise, and up-to-date general-purpose AI assistant. ` +
              `Today's date is ${today}. Always reason with this as the current date when answering time-sensitive questions. ` +
              `If a question requires information beyond your training cutoff (recent news, live prices, sports scores, weather, etc.), clearly say you may not have the very latest data and recommend the user verify with a live source — do not fabricate. ` +
              `Prefer recent, well-sourced facts over older ones. When uncertain, say so explicitly. ` +
              `Use clean Markdown. Be friendly, direct, and helpful. ` +
              `When asked about code, use fenced code blocks with language tags.`,
            messages: await convertToModelMessages(messages as UIMessage[]),
          });

          return result.toUIMessageStreamResponse({
            originalMessages: messages as UIMessage[],
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
