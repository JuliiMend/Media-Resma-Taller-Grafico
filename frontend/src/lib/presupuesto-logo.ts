import { LOGO_PDF_URL } from "@/lib/presupuesto-config";

let cache: Promise<string | null> | null = null;

/**
 * Descarga el logo del PDF y lo devuelve como dataURL (se cachea en memoria).
 * Si falla se devuelve null y el PDF se genera igual, sin logo.
 */
export function cargarLogoDataUrl(): Promise<string | null> {
  if (!cache) {
    cache = (async () => {
      try {
        const res = await fetch(LOGO_PDF_URL);
        if (!res.ok) return null;
        const blob = await res.blob();
        return await new Promise<string | null>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : null);
          reader.onerror = () => resolve(null);
          reader.readAsDataURL(blob);
        });
      } catch {
        return null;
      }
    })();
  }
  return cache;
}
