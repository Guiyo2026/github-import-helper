interface ShareContent {
  description: string;
  questions: string[];
  vocabulary: string[];
}

interface BuildExerciseShareTextOptions {
  scene: string;
  style: string;
  imageUrl: string | null;
  includeQuestions: boolean;
  content: ShareContent | null;
}

interface NativeShareOptions {
  title: string;
  text: string;
  imageUrl: string | null;
}

const DEFAULT_FILE_NAME = "english-exercise";

export function getDirectShareUrl(imageUrl: string | null) {
  if (!imageUrl) return null;

  return /^https?:\/\//i.test(imageUrl) ? imageUrl : null;
}

export function buildExerciseShareText({
  scene,
  style,
  imageUrl,
  includeQuestions,
  content,
}: BuildExerciseShareTextOptions) {
  const lines = ["English Speaking Exercise", `Scene: ${scene}`, `Style: ${style}`];
  const directShareUrl = getDirectShareUrl(imageUrl);

  if (directShareUrl) {
    lines.push(`Photo: ${directShareUrl}`);
  }

  if (includeQuestions && content) {
    lines.push(
      "",
      `Description: ${content.description}`,
      "",
      "Questions:",
      ...content.questions.map((question, index) => `${index + 1}. ${question}`),
      "",
      `Vocabulary: ${content.vocabulary.join(", ")}`
    );
  }

  return lines.join("\n");
}

export function buildWhatsAppShareUrl(text: string) {
  const encodedText = encodeURIComponent(text);
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  if (isMobile) {
    return `whatsapp://send?text=${encodedText}`;
  }

  return `https://web.whatsapp.com/send?text=${encodedText}`;
}

export function buildTelegramShareUrl(text: string, imageUrl: string | null) {
  const params = new URLSearchParams({ text });
  const directShareUrl = getDirectShareUrl(imageUrl);

  if (directShareUrl) {
    params.set("url", directShareUrl);
  }

  return `https://t.me/share/url?${params.toString()}`;
}

export function buildEmailShareUrl(subject: string, body: string) {
  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function openShareUrl(url: string, targetWindow?: Window | null) {
  if (targetWindow && !targetWindow.closed) {
    targetWindow.location.href = url;
    return;
  }

  window.open(url, "_blank", "noopener,noreferrer");
}

export async function getShareableImageFile(imageUrl: string | null): Promise<File | null> {
  if (!imageUrl) return null;

  try {
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    const extension = blob.type.split("/")[1] || "png";

    return new File([blob], `${DEFAULT_FILE_NAME}.${extension}`, {
      type: blob.type || "image/png",
    });
  } catch {
    return null;
  }
}

export async function shareExerciseNatively({
  title,
  text,
  imageUrl,
}: NativeShareOptions): Promise<boolean> {
  if (!("share" in navigator)) return false;

  const shareData: ShareData = { title, text };
  const file = await getShareableImageFile(imageUrl);

  if (file && navigator.canShare?.({ files: [file] })) {
    shareData.files = [file];
  }

  await navigator.share(shareData);
  return true;
}

export function openWhatsAppShare(text: string, targetWindow?: Window | null) {
  openShareUrl(buildWhatsAppShareUrl(text), targetWindow);
}

export function openTelegramShare(text: string, imageUrl: string | null, targetWindow?: Window | null) {
  openShareUrl(buildTelegramShareUrl(text, imageUrl), targetWindow);
}

export function openEmailShareDraft(subject: string, body: string) {
  window.location.href = buildEmailShareUrl(subject, body);
}