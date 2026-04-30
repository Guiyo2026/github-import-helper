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
  const networkRetryRef = useRef(0);

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
        const err = event.error;
        if (err === "not-allowed" || err === "service-not-allowed") {
          toast.error("Permiso denegado. Habilita el micrófono en los ajustes del navegador.");
          stopListening("abort");
        } else if (err === "audio-capture") {
          toast.error("No se detectó ningún micrófono.");
          stopListening("abort");
        } else if (err === "network") {
          // El reconocimiento de voz del navegador requiere conectarse a los
          // servidores de Google. Reintentamos una vez antes de rendirnos.
          if (networkRetryRef.current < 1 && navigator.onLine) {
            networkRetryRef.current += 1;
            // onend se encargará de reiniciar automáticamente
            return;
          }
          networkRetryRef.current = 0;
          if (!navigator.onLine) {
            toast.error("Sin conexión a internet. El dictado por voz necesita estar online.");
          } else {
            toast.error(
              "El dictado por voz no está disponible. Usa Chrome/Edge en escritorio y desactiva VPN, AdBlock o restricciones de red.",
              { duration: 6000 },
            );
          }
          stopListening("abort");
        } else if (err === "no-speech") {
          // ignore — onend will restart automatically
        } else if (err && err !== "aborted") {
          console.warn("Speech recognition error:", err);
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
      {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
    </Button>
  );
}
