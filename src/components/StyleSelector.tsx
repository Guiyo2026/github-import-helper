import { cn } from "@/lib/utils";

const styles = [
  { id: "realistic", label: "Realistic", emoji: "📷", color: "from-slate-500 to-slate-700" },
  { id: "disney", label: "Disney", emoji: "🏰", color: "from-blue-400 to-purple-500" },
  { id: "pixar", label: "Pixar", emoji: "🎬", color: "from-orange-400 to-red-500" },
  { id: "ghibli", label: "Ghibli", emoji: "🍃", color: "from-emerald-400 to-teal-500" },
  { id: "cartoon", label: "Cartoon", emoji: "🎨", color: "from-pink-400 to-rose-500" },
  { id: "sketch", label: "Sketch", emoji: "✏️", color: "from-gray-400 to-gray-600" },
  { id: "simpsons", label: "Simpsons", emoji: "🟡", color: "from-yellow-300 to-yellow-500" },
  { id: "rickandmorty", label: "Rick & Morty", emoji: "🛸", color: "from-lime-400 to-cyan-500" },
  { id: "gta", label: "GTA", emoji: "🔫", color: "from-amber-500 to-orange-600" },
  { id: "ligneclaire", label: "Ligne Claire", emoji: "🖊️", color: "from-sky-300 to-blue-500" },
  { id: "gavarni", label: "Gavarni", emoji: "🎩", color: "from-stone-400 to-amber-700" },
  { id: "lego", label: "Lego", emoji: "🧱", color: "from-red-400 to-yellow-400" },
  { id: "muppets", label: "Muppets", emoji: "🐸", color: "from-green-400 to-emerald-500" },
  { id: "corporate", label: "Corporate Portrait", emoji: "💼", color: "from-indigo-500 to-blue-700" },
  { id: "corporate-cartoon", label: "Corporate Cartoon", emoji: "🧑‍💼", color: "from-indigo-400 to-cyan-500" },
] as const;

export type ImageStyle = (typeof styles)[number]["id"];

interface StyleSelectorProps {
  selected: ImageStyle;
  onSelect: (style: ImageStyle) => void;
}

export function StyleSelector({ selected, onSelect }: StyleSelectorProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {styles.map((style) => (
        <button
          key={style.id}
          type="button"
          onClick={() => onSelect(style.id)}
          className={cn(
            "flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-all duration-200",
            selected === style.id
              ? `border-transparent bg-gradient-to-r ${style.color} text-white shadow-md scale-105`
              : "border-border bg-card text-card-foreground hover:border-primary/50 hover:bg-muted hover:scale-[1.02]"
          )}
        >
          <span className="text-base">{style.emoji}</span>
          {style.label}
        </button>
      ))}
    </div>
  );
}
