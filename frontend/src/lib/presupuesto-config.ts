/**
 * Configuración editable del presupuesto.
 * Los campos vacíos de NEGOCIO se omiten al generar el PDF.
 */
export const NEGOCIO = {
  nombre: "Media Resma Taller Gráfico",
  telefono: "",
  email: "",
  instagram: "",
  direccion: "",
} as const;

export const VALIDEZ_DIAS_DEFAULT = 7;

export const CONDICIONES_DEFAULT = "Precios sujetos a cambio luego de la fecha de validez.";

export const LEYENDA_LEGAL = "Presupuesto — documento no válido como factura.";

/** Logo usado en el encabezado del PDF (PNG transparente con letras oscuras). */
export const LOGO_PDF_URL = "/logo-media-resma-pdf.png";

/** Clave del borrador en localStorage. */
export const BORRADOR_KEY = "mr_presupuesto_borrador";

export type NegocioInfo = {
  nombre: string;
  telefono: string;
  email: string;
  instagram: string;
  direccion: string;
};

/** Datos del negocio con los campos vacíos eliminados, listos para el PDF. */
export function datosNegocio(negocio: NegocioInfo = NEGOCIO): string[] {
  return [negocio.nombre, negocio.telefono, negocio.email, negocio.instagram, negocio.direccion].filter(
    (valor) => valor.trim().length > 0,
  );
}
