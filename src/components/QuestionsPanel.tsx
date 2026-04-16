import { Loader2, Volume2, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export interface GeneratedContent {
  description: string;
  questions: string[];
  vocabulary: string[];
}

interface QuestionsPanelProps {
  content: GeneratedContent | null;
  isLoading: boolean;
}

export function QuestionsPanel({ content, isLoading }: QuestionsPanelProps) {
  const [copied, setCopied] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-border bg-card p-8 shadow-sm">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <p className="text-sm font-medium">Generating questions…</p>
        </div>
      </div>
    );
  }

  if (!content) return null;

  const handleSpeak = () => {
    if (speaking) {
      speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(content.description);
    utterance.lang = "en-US";
    utterance.rate = 0.85;
    utterance.onend = () => setSpeaking(false);
    speechSynthesis.speak(utterance);
    setSpeaking(true);
  };

  const handleCopy = async () => {
    const text = [
      "📝 Description:",
      content.description,
      "",
      "❓ Questions:",
      ...content.questions.map((q, i) => `${i + 1}. ${q}`),
      "",
      "📚 Vocabulary:",
      content.vocabulary.join(", "),
    ].join("\n");
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-5 rounded-xl border border-border bg-card p-6 shadow-sm">
      {/* Description */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Description
          </h3>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" onClick={handleSpeak} title="Read aloud">
              <Volume2 className={speaking ? "text-primary" : ""} />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleCopy} title="Copy all">
              {copied ? <Check className="text-accent" /> : <Copy />}
            </Button>
          </div>
        </div>
        <p className="text-base leading-relaxed text-foreground">{content.description}</p>
      </div>

      {/* Questions */}
      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Questions
        </h3>
        <ol className="space-y-2">
          {content.questions.map((q, i) => (
            <li key={i} className="flex gap-3 text-foreground">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                {i + 1}
              </span>
              <span className="text-sm leading-relaxed">{q}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* Vocabulary */}
      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Vocabulary
        </h3>
        <div className="flex flex-wrap gap-2">
          {content.vocabulary.map((word) => (
            <span
              key={word}
              className="rounded-full bg-muted px-3 py-1 text-sm font-medium text-foreground"
            >
              {word}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
