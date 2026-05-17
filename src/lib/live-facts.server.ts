import type { UIMessage } from "ai";

type LiveFact = {
  officeLabel: string;
  holderLabel: string;
  start?: string;
  source: string;
};

const WIKIDATA_ENTITY_SEARCH = "https://www.wikidata.org/w/api.php";
const WIKIDATA_SPARQL = "https://query.wikidata.org/sparql";

const USER_AGENT = "CherryAI/1.0 (current-fact-check)";

const knownOfficeIds: Record<string, string> = {
  "Chief Minister of Tamil Nadu": "Q24040821",
  "Prime Minister of India": "Q192711",
  "President of India": "Q313383",
};

const getMessageText = (message: UIMessage | undefined): string =>
  message?.parts
    ?.map((part) => (part.type === "text" ? part.text : ""))
    .join(" ")
    .trim() ?? "";

const cleanLocation = (value: string): string =>
  value
    .replace(/\b(current|present|latest|now|today|2026|2025|please|tell me|who is|who's)\b/gi, " ")
    .replace(/[^a-z\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const detectOfficeLabel = (text: string): string | null => {
  const lower = text.toLowerCase();

  if (/\b(cm|chief minister)\b/.test(lower) && lower.includes("tamil nadu")) {
    return "Chief Minister of Tamil Nadu";
  }

  if (lower.includes("prime minister") && lower.includes("india")) {
    return "Prime Minister of India";
  }

  if (lower.includes("president") && lower.includes("india")) {
    return "President of India";
  }

  const chiefMinisterMatch = text.match(/\b(?:cm|chief minister)\s+(?:of\s+)?(.+?)(?:\?|$|\.|,)/i);
  if (chiefMinisterMatch?.[1]) {
    const location = cleanLocation(chiefMinisterMatch[1]);
    if (location) return `Chief Minister of ${location}`;
  }

  const primeMinisterMatch = text.match(/\bprime minister\s+of\s+(.+?)(?:\?|$|\.|,)/i);
  if (primeMinisterMatch?.[1]) {
    const location = cleanLocation(primeMinisterMatch[1]);
    if (location) return `Prime Minister of ${location}`;
  }

  const presidentMatch = text.match(/\bpresident\s+of\s+(.+?)(?:\?|$|\.|,)/i);
  if (presidentMatch?.[1]) {
    const location = cleanLocation(presidentMatch[1]);
    if (location) return `President of ${location}`;
  }

  return null;
};

const searchOfficeId = async (officeLabel: string): Promise<string | null> => {
  if (knownOfficeIds[officeLabel]) return knownOfficeIds[officeLabel];

  const params = new URLSearchParams({
    action: "wbsearchentities",
    search: officeLabel,
    language: "en",
    format: "json",
    limit: "1",
  });

  const response = await fetch(`${WIKIDATA_ENTITY_SEARCH}?${params}`, {
    headers: { "User-Agent": USER_AGENT },
  });

  if (!response.ok) return null;

  const data = (await response.json()) as {
    search?: Array<{ id?: string; label?: string }>;
  };

  const first = data.search?.[0];
  return first?.id ?? null;
};

const queryCurrentOfficeHolder = async (
  officeId: string,
  officeLabel: string
): Promise<LiveFact | null> => {
  const query = `
    SELECT ?holder ?holderLabel ?start WHERE {
      wd:${officeId} wdt:P1308 ?holder.
      OPTIONAL {
        wd:${officeId} p:P1308 ?statement.
        ?statement ps:P1308 ?holder.
        OPTIONAL { ?statement pq:P580 ?start. }
      }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
    }
    ORDER BY DESC(?start)
    LIMIT 1
  `;

  const params = new URLSearchParams({ query, format: "json" });
  const response = await fetch(`${WIKIDATA_SPARQL}?${params}`, {
    headers: { "User-Agent": USER_AGENT },
  });

  if (!response.ok) return null;

  const data = (await response.json()) as {
    results?: {
      bindings?: Array<{
        holder?: { value?: string };
        holderLabel?: { value?: string };
        start?: { value?: string };
      }>;
    };
  };

  const result = data.results?.bindings?.[0];
  const holderLabel = result?.holderLabel?.value;
  if (!holderLabel) return null;

  return {
    officeLabel,
    holderLabel,
    start: result?.start?.value,
    source: result?.holder?.value ?? `https://www.wikidata.org/wiki/${officeId}`,
  };
};

export const buildLiveFactContext = async (
  messages: UIMessage[]
): Promise<string> => {
  const latestUserText = getMessageText([...messages].reverse().find((m) => m.role === "user"));
  if (!latestUserText) return "";

  const officeLabel = detectOfficeLabel(latestUserText);
  if (!officeLabel) return "";

  try {
    const officeId = await searchOfficeId(officeLabel);
    if (!officeId) return "";

    const fact = await queryCurrentOfficeHolder(officeId, officeLabel);
    if (!fact) return "";

    const asOf = new Date().toISOString();
    const startText = fact.start
      ? ` The listed term start date is ${fact.start.slice(0, 10)}.`
      : "";

    return `\n\nLIVE FACT CHECK — fetched from Wikidata at ${asOf}:\n` +
      `User question: ${latestUserText}\n` +
      `Verified current answer: ${fact.holderLabel} is the current ${fact.officeLabel}.${startText}\n` +
      `Source: ${fact.source}\n` +
      `Instruction: For this question, use the verified current answer above as authoritative. If older training data conflicts with it, ignore the older data.`;
  } catch (error) {
    console.error("Live fact check failed:", error);
    return "";
  }
};