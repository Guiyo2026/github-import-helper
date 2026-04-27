import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StyleSelector, type ImageStyle } from "@/components/StyleSelector";
import { ImageDisplay } from "@/components/ImageDisplay";
import { QuestionsPanel, type GeneratedContent } from "@/components/QuestionsPanel";
import { ShareMenu } from "@/components/ShareMenu";
import { VoiceInput } from "@/components/VoiceInput";
import { supabase } from "@/integrations/supabase/client";
import {
  buildExerciseShareText,
  getDirectShareUrl,
  openEmailShareDraft,
  openTelegramShare,
  openWhatsAppShare,
  shareExerciseNatively,
} from "@/lib/exercise-share";
import { toast } from "sonner";
import { Shuffle, Sparkles, HelpCircle, Download, RotateCcw, BookOpen } from "lucide-react";

const randomScenes = [
  "A busy farmer's market on a sunny morning",
  "Children playing in a park with a dog",
  "A cozy kitchen with someone cooking dinner",
  "A train station with people waiting on the platform",
  "A beach with surfers and a lifeguard tower",
  "A classroom with students working on a project",
  "A campfire scene in the forest at night",
  "A city street with shops and people walking",
  "A birthday party in a backyard garden",
  "A doctor's office waiting room",
];

export default function Index() {
  const [style, setStyle] = useState<ImageStyle>("realistic");
  const [sceneText, setSceneText] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const [content, setContent] = useState<GeneratedContent | null>(null);
  const [currentScene, setCurrentScene] = useState("");
  const [shareableImageUrl, setShareableImageUrl] = useState<string | null>(null);

  const generateImage = useCallback(
    async (scene: string) => {
      setImageLoading(true);
      setContent(null);
      setCurrentScene(scene);
      setShareableImageUrl(null);
      try {
        const { data, error } = await supabase.functions.invoke("generate-image", {
          body: { scene, style },
        });
        if (error) throw error;
        if (data?.error) {
          toast.error(data.error);
          return;
        }
        if (data?.imageUrl) {
          setImageUrl(data.imageUrl);
          setShareableImageUrl(getDirectShareUrl(data.imageUrl));
        } else {
          throw new Error("No image returned");
        }
      } catch (e: any) {
        toast.error(e.message || "Failed to generate image");
      } finally {
        setImageLoading(false);
      }
    },
    [style]
  );

  const handleGenerate = () => {
    const scene = sceneText.trim() || "A simple everyday scene";
    generateImage(scene);
  };

  const handleRandom = () => {
    const scene = randomScenes[Math.floor(Math.random() * randomScenes.length)];
    setSceneText(scene);
    generateImage(scene);
  };

  const handleGenerateQuestions = async () => {
    if (!imageUrl) return;
    setQuestionsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-questions", {
        body: { scene: currentScene, style },
      });
      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
        return;
      }
      setContent(data as GeneratedContent);
    } catch (e: any) {
      toast.error(e.message || "Failed to generate questions");
    } finally {
      setQuestionsLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!imageUrl) return;
    try {
      const res = await fetch(imageUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `english-exercise-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Failed to download image");
    }
  };

  const ensureShareableImageUrl = useCallback(async () => {
    if (!imageUrl) return null;

    if (shareableImageUrl) {
      return shareableImageUrl;
    }

    const directShareUrl = getDirectShareUrl(imageUrl);

    if (directShareUrl) {
      setShareableImageUrl(directShareUrl);
      return directShareUrl;
    }

    setShareLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("share-image", {
        body: { imageUrl },
      });

      if (error) throw error;
      if (!data?.imageUrl) throw new Error("No share image returned");

      setShareableImageUrl(data.imageUrl);
      return data.imageUrl as string;
    } catch (error: any) {
      toast.error(error.message || "Failed to prepare image for sharing");
      return null;
    } finally {
      setShareLoading(false);
    }
  }, [imageUrl, shareableImageUrl]);

  const buildShareText = (includeQuestions: boolean, shareUrl?: string | null) =>
    buildExerciseShareText({
      scene: currentScene,
      style,
      imageUrl: shareUrl ?? shareableImageUrl ?? imageUrl,
      includeQuestions,
      content,
    });

  const handleShare = async (includeQuestions: boolean) => {
    const publicImageUrl = await ensureShareableImageUrl();
    const text = buildShareText(includeQuestions, publicImageUrl);

    try {
      const shared = await shareExerciseNatively({
        title: "English Exercise",
        text,
        imageUrl,
      });

      if (!shared) {
        await navigator.clipboard.writeText(text);
        toast.success("Texto copiado. Usa WhatsApp, Telegram o email para enviarlo.");
      }
    } catch (error: any) {
      if (error?.name !== "AbortError") {
        toast.error("No se pudo abrir el menú de compartir");
      }
    }
  };

  const handleWhatsAppShare = async (includeQuestions: boolean) => {
    const text = buildShareText(includeQuestions);
    openWhatsAppShare(text);
  };

  const handleTelegramShare = async (includeQuestions: boolean) => {
    const text = buildShareText(includeQuestions);
    openTelegramShare(text, shareableImageUrl ?? imageUrl);
  };

  const handleEmailShare = async (includeQuestions: boolean) => {
    const publicImageUrl = await ensureShareableImageUrl();
    openEmailShareDraft(
      "English Speaking Exercise",
      buildShareText(includeQuestions, publicImageUrl)
    );
    toast.success("Borrador de email abierto con el enlace de la foto.");
  };

  const handleReset = () => {
    setImageUrl(null);
    setContent(null);
    setSceneText("");
    setCurrentScene("");
    setShareableImageUrl(null);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">SpeakSnap</h1>
            <p className="text-xs text-muted-foreground">AI Image & Speaking Exercises for ESL</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-6 px-4 py-6">
        {/* Controls */}
        <section className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-sm">
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">Image Style</label>
            <StyleSelector selected={style} onSelect={setStyle} />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">
              Scene Description <span className="text-muted-foreground">(optional)</span>
            </label>
            <div className="flex gap-2">
              <Input
                placeholder="e.g. A busy farmer's market on a sunny morning"
                value={sceneText}
                onChange={(e) => setSceneText(e.target.value)}
                className="bg-background flex-1"
              />
              <VoiceInput onResult={(text) => setSceneText(text)} />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={handleRandom} variant="outline" disabled={imageLoading}>
              <Shuffle className="mr-1.5 h-4 w-4" />
              Random Image
            </Button>
            <Button onClick={handleGenerate} disabled={imageLoading}>
              <Sparkles className="mr-1.5 h-4 w-4" />
              Generate Image
            </Button>
            <Button
              onClick={handleGenerateQuestions}
              variant="success"
              disabled={!imageUrl || questionsLoading || imageLoading}
            >
              <HelpCircle className="mr-1.5 h-4 w-4" />
              Generate Questions
            </Button>
          </div>
        </section>

        {/* Image */}
        <ImageDisplay imageUrl={imageUrl} isLoading={imageLoading} />

        {/* Action buttons */}
        {imageUrl && (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="mr-1.5 h-3.5 w-3.5" />
              Download
            </Button>

            <ShareMenu
              label={shareLoading ? "Preparing..." : "Share"}
              disabled={shareLoading}
              onDeviceShare={() => handleShare(false)}
              onWhatsApp={() => handleWhatsAppShare(false)}
              onTelegram={() => handleTelegramShare(false)}
              onEmail={() => handleEmailShare(false)}
            />

            {content && (
              <ShareMenu
                label={shareLoading ? "Preparing..." : "Share + Questions"}
                disabled={shareLoading}
                onDeviceShare={() => handleShare(true)}
                onWhatsApp={() => handleWhatsAppShare(true)}
                onTelegram={() => handleTelegramShare(true)}
                onEmail={() => handleEmailShare(true)}
              />
            )}

            <Button variant="ghost" size="sm" onClick={handleReset}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              Reset
            </Button>
          </div>
        )}

        {/* Questions */}
        <QuestionsPanel content={content} isLoading={questionsLoading} />
      </main>
    </div>
  );
}
