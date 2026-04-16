import { Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

type BrowserSpeechRecognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives?: number;
  onresult: ((event: any) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type SpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

interface VoiceInputProps {
  onResult: (text: string) => void;
}

export function VoiceInput({ onResult }: VoiceInputProps) {
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const shouldKeepListeningRef = useRef(false);
  const transcriptRef = useRef("");

  const stopListening = useCallback((mode: "stop" | "abort" = "stop") => {
    shouldKeepListeningRef.current = false;

    const recognition = recognitionRef.current;
    recognitionRef.current = null;
    setListening(false);

    if (!recognition) return;

    try {
      if (mode === "abort") {
        recognition.abort();
        return;
      }

      recognition.stop();
    } catch {
      recognition.abort();
    }
  }, []);

  useEffect(() => {
    return () => {
      stopListening("abort");
    };
  }, [stopListening]);

  const toggle = () => {
    const SpeechRecognition = ((window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition) as SpeechRecognitionConstructor | undefined;

    if (!SpeechRecognition) {
      toast.error("Speech recognition not supported in this browser");
      return;
    }

    if (listening && recognitionRef.current) {
      stopListening();
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognitionRef.current?.abort();
      recognitionRef.current = recognition;
      shouldKeepListeningRef.current = true;
      transcriptRef.current = "";

      recognition.lang = navigator.language || "en-US";
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onresult = (event: any) => {
        let fullTranscript = transcriptRef.current;
        let interimTranscript = "";

        for (let index = event.resultIndex; index < event.results.length; index += 1) {
          const result = event.results[index];
          const transcript = result?.[0]?.transcript?.trim();

          if (!transcript) continue;

          if (result.isFinal) {
            fullTranscript = `${fullTranscript} ${transcript}`.trim();
          } else {
            interimTranscript = `${interimTranscript} ${transcript}`.trim();
          }
        }

        transcriptRef.current = fullTranscript;

        const nextTranscript = `${fullTranscript} ${interimTranscript}`.trim();

        if (nextTranscript) {
          onResult(nextTranscript);
        }
      };

      recognition.onerror = (event) => {
        if (event.error === "not-allowed") {
          toast.error("Allow microphone access to use voice input");
          stopListening("abort");
        } else if (event.error === "audio-capture") {
          toast.error("No microphone was detected");
          stopListening("abort");
        } else if (event.error && event.error !== "aborted" && event.error !== "no-speech") {
          toast.error("Voice input stopped unexpectedly. Try again.");
          stopListening("abort");
        }
      };

      recognition.onend = () => {
        if (!shouldKeepListeningRef.current) {
          recognitionRef.current = null;
          setListening(false);
          return;
        }

        try {
          recognition.start();
        } catch {
          recognitionRef.current = null;
          shouldKeepListeningRef.current = false;
          setListening(false);
          toast.error("Couldn't keep the microphone active. Try tapping again.");
        }
      };

      setListening(true);
      recognition.start();
    } catch {
      stopListening("abort");
      toast.error("Couldn't start voice input. Try tapping again.");
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      onClick={toggle}
      aria-label={listening ? "Stop listening" : "Start voice input"}
      aria-pressed={listening}
      title={listening ? "Stop listening" : "Speak your scene"}
      className={
        listening
          ? "animate-pulse border-green-500 bg-green-500 text-white hover:bg-green-600 hover:text-white"
          : "border-red-400 text-red-500 hover:bg-red-50 hover:text-red-600"
      }
    >
      {listening ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
    </Button>
  );
}
