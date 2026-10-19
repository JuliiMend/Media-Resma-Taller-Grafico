import { cn } from "@/lib/format";

function initials(name: string | undefined): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

export function Avatar({ name, src, className }: { name?: string; src?: string | null; className?: string }) {
  return (
    <span
      className={cn(
        "flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-line bg-raised text-xs font-bold text-ink",
        className,
      )}
    >
      {src ? <img src={src} alt={name ? `Foto de ${name}` : "Foto de perfil"} className="size-full object-cover" /> : <span aria-hidden="true">{initials(name)}</span>}
    </span>
  );
}
