"use client";

import { useState, useEffect } from "react";
import { Mic, MicOff, Volume2, VolumeX } from "lucide-react";

interface VoiceInputProps {
  language?: "en" | "hi" | "gu";
  onTranscript: (text: string) => void;
  disabled?: boolean;
}

export function VoiceInput({ language = "en", onTranscript, disabled = false }: VoiceInputProps) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window)) {
      setSupported(true);
    }
  }, []);

  if (!supported) return null;

  const startListening = () => {
    try {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();

      const langMap: Record<string, string> = {
        en: "en-IN",
        hi: "hi-IN",
        gu: "gu-IN",
      };

      recognition.lang = langMap[language] || "en-IN";
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setListening(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          onTranscript(transcript);
        }
      };

      recognition.onerror = () => {
        setListening(false);
      };

      recognition.onend = () => {
        setListening(false);
      };

      recognition.start();
    } catch (err) {
      console.warn("Speech recognition error:", err);
      setListening(false);
    }
  };

  return (
    <button
      type="button"
      onClick={startListening}
      disabled={disabled || listening}
      title={listening ? "Listening..." : "Speak question in your language"}
      className={`p-2 rounded-lg border transition-colors flex items-center justify-center ${
        listening
          ? "bg-red-50 text-red-600 border-red-300 animate-pulse"
          : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
      }`}
    >
      {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
    </button>
  );
}

interface ReadAloudButtonProps {
  text: string;
  language?: "en" | "hi" | "gu";
}

export function ReadAloudButton({ text, language = "en" }: ReadAloudButtonProps) {
  const [speaking, setSpeaking] = useState(false);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      setSupported(true);
    }
  }, []);

  if (!supported || !text) return null;

  const toggleSpeech = () => {
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);

    const langMap: Record<string, string> = {
      en: "en-IN",
      hi: "hi-IN",
      gu: "gu-IN",
    };
    utterance.lang = langMap[language] || "en-IN";
    utterance.rate = 0.95;

    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);

    window.speechSynthesis.speak(utterance);
    setSpeaking(true);
  };

  return (
    <button
      type="button"
      onClick={toggleSpeech}
      className={`p-1 rounded hover:bg-slate-200 text-slate-500 transition-colors ${
        speaking ? "text-blue-600 animate-pulse" : ""
      }`}
      title={speaking ? "Stop reading" : "Read aloud"}
    >
      {speaking ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
    </button>
  );
}
