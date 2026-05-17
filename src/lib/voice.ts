import { useCallback, useEffect, useRef, useState } from "react";

// Minimal types for the Web Speech API (not in lib.dom for TS).
type SRConstructor = new () => SpeechRecognitionLike;
interface SpeechRecognitionLike extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
  onend: (() => void) | null;
}
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<{
    0: { transcript: string };
    isFinal: boolean;
    length: number;
  }>;
}

function getSR(): SRConstructor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SRConstructor;
    webkitSpeechRecognition?: SRConstructor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function isSpeechRecognitionSupported() {
  return getSR() !== null;
}

export function useSpeechRecognition({
  onFinal,
  onInterim,
}: {
  onFinal: (text: string) => void;
  onInterim?: (text: string) => void;
}) {
  const [listening, setListening] = useState(false);
  const recRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    return () => {
      recRef.current?.abort();
      recRef.current = null;
    };
  }, []);

  const start = useCallback(() => {
    const SR = getSR();
    if (!SR) return false;
    if (recRef.current) recRef.current.abort();

    const rec = new SR();
    rec.lang = navigator.language || "en-US";
    rec.continuous = false;
    rec.interimResults = true;

    let finalText = "";
    rec.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        const txt = r[0].transcript;
        if (r.isFinal) finalText += txt;
        else interim += txt;
      }
      if (interim && onInterim) onInterim(interim);
    };
    rec.onerror = () => {
      setListening(false);
    };
    rec.onend = () => {
      setListening(false);
      const text = finalText.trim();
      if (text) onFinal(text);
    };

    try {
      rec.start();
      recRef.current = rec;
      setListening(true);
      return true;
    } catch {
      setListening(false);
      return false;
    }
  }, [onFinal, onInterim]);

  const stop = useCallback(() => {
    recRef.current?.stop();
  }, []);

  return { listening, start, stop };
}

// ---- Text-to-Speech (browser SpeechSynthesis) ----

export function isSpeechSynthesisSupported() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

function pickVoice(): SpeechSynthesisVoice | null {
  if (!isSpeechSynthesisSupported()) return null;
  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) return null;
  const preferred = [
    "Google UK English Female",
    "Microsoft Aria Online (Natural)",
    "Samantha",
    "Karen",
    "Google US English",
  ];
  for (const name of preferred) {
    const v = voices.find((v) => v.name === name);
    if (v) return v;
  }
  return (
    voices.find((v) => v.lang?.startsWith("en") && /female/i.test(v.name)) ??
    voices.find((v) => v.lang?.startsWith("en")) ??
    voices[0]
  );
}

export function speak(text: string) {
  if (!isSpeechSynthesisSupported() || !text.trim()) return;
  const synth = window.speechSynthesis;
  synth.cancel();
  // strip markdown noise for cleaner speech
  const clean = text
    .replace(/```[\s\S]*?```/g, " code block ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/[*_#>~]/g, "")
    .replace(/\[(.*?)\]\((.*?)\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
  if (!clean) return;
  const utter = new SpeechSynthesisUtterance(clean);
  const voice = pickVoice();
  if (voice) utter.voice = voice;
  utter.rate = 1.02;
  utter.pitch = 1.05;
  synth.speak(utter);
}

export function cancelSpeech() {
  if (isSpeechSynthesisSupported()) window.speechSynthesis.cancel();
}
