import { LOGO_PDF_DATA_URL } from "@/lib/presupuesto-logo-data";

let cache: Promise<string | null> | null = null;

/**
 * Devuelve el logo embebido como dataURL (se cachea en memoria).
 * Si el archivo no es válido se devuelve null y el PDF usa el texto de respaldo.
 */
export function cargarLogoDataUrl(): Promise<string | null> {
  if (!cache) {
    const valido =
      LOGO_PDF_DATA_URL.startsWith("data:image/png;base64,") &&
      LOGO_PDF_DATA_URL.length > 100;
    cache = Promise.resolve(valido ? LOGO_PDF_DATA_URL : null);
  }
  return cache;
}
