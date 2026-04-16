import { ImageIcon, Loader2 } from "lucide-react";

interface ImageDisplayProps {
  imageUrl: string | null;
  isLoading: boolean;
}

export function ImageDisplay({ imageUrl, isLoading }: ImageDisplayProps) {
  return (
    <div className="relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      {isLoading ? (
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm font-medium">Generating image…</p>
        </div>
      ) : imageUrl ? (
        <img
          src={imageUrl}
          alt="Generated scene for English practice"
          className="h-full w-full object-contain"
        />
      ) : (
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <ImageIcon className="h-16 w-16 opacity-30" />
          <p className="text-sm">Your generated image will appear here</p>
        </div>
      )}
    </div>
  );
}
