import { cn } from "@/lib/format";

const LOGO_SRC = "/logo-media-resma.jpeg";

// The source file is a 1081x985 JPEG with the mark centered on a black canvas.
// Each variant crops the canvas with percentages so the logo scales with its container,
// and "lighten" blending makes the black canvas disappear against the dark UI.
const CROPS = {
  full: { aspect: "895 / 270", width: "120.8%", left: "-10.6%", top: "-131.5%" },
  icon: { aspect: "242 / 260", width: "446.7%", left: "-40.5%", top: "-138.5%" },
} as const;

export function Logo({ variant = "full", className }: { variant?: keyof typeof CROPS; className?: string }) {
  const crop = CROPS[variant];
  return (
    <div className={cn("relative overflow-hidden", className)} style={{ aspectRatio: crop.aspect }} role="img" aria-label="Media Resma DTF">
      <img
        src={LOGO_SRC}
        alt=""
        draggable={false}
        className="absolute max-w-none mix-blend-lighten select-none"
        style={{ width: crop.width, left: crop.left, top: crop.top }}
      />
    </div>
  );
}
