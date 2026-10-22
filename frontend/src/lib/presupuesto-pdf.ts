import { formatMoney } from "@/lib/format";
import { datosNegocio } from "@/lib/presupuesto-config";
import type { DatosPresupuestoPdf } from "@/lib/presupuesto";

type JsPdfDoc = import("jspdf").jsPDF;
type JsPdfClass = typeof import("jspdf").jsPDF;

const PAGE = { width: 210, height: 297 };
const MARGEN = { left: 15, right: 15, top: 14, bottom: 26 };
const CONTENT_WIDTH = PAGE.width - MARGEN.left - MARGEN.right;

/** Texto casi negro: imprime mucho menos que un negro puro y se lee igual. */
const TEXTO: [number, number, number] = [17, 17, 17];
const TEXTO_GRIS: [number, number, number] = [95, 95, 95];
const LINEA_GRIS: [number, number, number] = [200, 200, 200];
const LINEA_SUAVE: [number, number, number] = [222, 222, 222];
const RELLENO_HEAD: [number, number, number] = [242, 242, 242];

const FUENTE = "helvetica";

/** Ancho del logo en el encabezado del PDF. */
const LOGO_ANCHO_MM = 55;

/** Carga diferida de las librerías pesadas (solo se usan al pedir el PDF). */
async function cargarLibs(): Promise<{ jsPDF: JsPdfClass; autoTable: (doc: JsPdfDoc, opts: Record<string, unknown>) => void }> {
  const [{ jsPDF }, autotable] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  return { jsPDF, autoTable: autotable.default as (doc: JsPdfDoc, opts: Record<string, unknown>) => void };
}

function dibujarEncabezado(doc: JsPdfDoc, datos: DatosPresupuestoPdf, logoDataUrl: string | null): number {
  const bordeDerecho = PAGE.width - MARGEN.right;
  let y = MARGEN.top;

  let logoDibujado = false;
  if (logoDataUrl) {
    try {
      const props = doc.getImageProperties(logoDataUrl);
      const ratio = props.width > 0 && props.height > 0 ? props.height / props.width : 0.3;
      doc.addImage(logoDataUrl, "PNG", MARGEN.left, y, LOGO_ANCHO_MM, LOGO_ANCHO_MM * ratio, undefined, "FAST");
      logoDibujado = true;
    } catch {
      // Si el logo no se puede leer se usa el nombre como respaldo.
    }
  }
  if (!logoDibujado) {
    doc.setFont(FUENTE, "bold");
    doc.setFontSize(16);
    doc.setTextColor(...TEXTO);
    doc.text("MEDIA RESMA", MARGEN.left, y + 10);
  }

  doc.setFont(FUENTE, "bold");
  doc.setFontSize(19);
  doc.setTextColor(...TEXTO);
  doc.text("PRESUPUESTO", bordeDerecho, y + 6, { align: "right" });

  doc.setFont(FUENTE, "normal");
  doc.setFontSize(9.5);
  doc.text(`Nº ${datos.numero}`, bordeDerecho, y + 12.5, { align: "right" });
  doc.text(`Fecha: ${datos.fechaEmision}`, bordeDerecho, y + 17.5, { align: "right" });
  doc.text(`Válido hasta: ${datos.validoHasta}`, bordeDerecho, y + 22.5, { align: "right" });

  const separadorY = 40;
  doc.setDrawColor(...LINEA_GRIS);
  doc.setLineWidth(0.2);
  doc.line(MARGEN.left, separadorY, bordeDerecho, separadorY);

  let cursor = separadorY + 5;
  if (datos.clienteNombre) {
    doc.setFont(FUENTE, "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(...TEXTO);
    doc.text(`Para: ${datos.clienteNombre}`, MARGEN.left, cursor);
    cursor += 4.6;
    if (datos.clienteTelefono) {
      doc.setFont(FUENTE, "normal");
      doc.setFontSize(9.5);
      doc.text(`Tel: ${datos.clienteTelefono}`, MARGEN.left, cursor);
      cursor += 4.6;
    }
  }

  return cursor + 1.5;
}

function dibujarTabla(doc: JsPdfDoc, autoTable: (doc: JsPdfDoc, opts: Record<string, unknown>) => void, datos: DatosPresupuestoPdf, startY: number): number {
  const body = datos.lineas.map((l) => [
    l.descripcion,
    l.cantidadTexto,
    l.unidad,
    formatMoney(l.precioUnitario),
    formatMoney(l.subtotal),
  ]);

  autoTable(doc, {
    startY,
    head: [["Descripción", "Cant.", "Unidad", "Precio unit.", "Subtotal"]],
    body,
    theme: "plain",
    showHead: "everyPage",
    margin: { left: MARGEN.left, right: MARGEN.right, top: startY, bottom: MARGEN.bottom },
    styles: {
      font: FUENTE,
      fontSize: 9.5,
      textColor: TEXTO,
      cellPadding: { top: 2.1, bottom: 2.1, left: 2, right: 2 },
      lineWidth: 0,
      lineColor: LINEA_SUAVE,
      overflow: "linebreak",
    },
    headStyles: {
      fillColor: RELLENO_HEAD,
      textColor: TEXTO,
      fontStyle: "bold",
      lineWidth: 0,
      cellPadding: { top: 2.3, bottom: 2.3, left: 2, right: 2 },
    },
    bodyStyles: { lineWidth: 0 },
    columnStyles: {
      0: { cellWidth: 82, halign: "left" },
      1: { cellWidth: 16, halign: "right" },
      2: { cellWidth: 17, halign: "center" },
      3: { cellWidth: 32, halign: "right" },
      4: { cellWidth: 33, halign: "right" },
    },
    didDrawCell: (data: { section: string; cell: { x: number; y: number; width: number; height: number }; doc: JsPdfDoc }) => {
      if (data.section === "foot") return;
      const { cell } = data;
      const d = data.doc;
      d.setDrawColor(...(data.section === "head" ? LINEA_GRIS : LINEA_SUAVE));
      d.setLineWidth(0.1);
      const y = cell.y + cell.height;
      d.line(cell.x, y, cell.x + cell.width, y);
    },
  });

  const finalY = (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY;
  return typeof finalY === "number" ? finalY : startY;
}

function dibujarTotales(doc: JsPdfDoc, datos: DatosPresupuestoPdf, y: number): number {
  const bordeDerecho = PAGE.width - MARGEN.right;
  const xEtiqueta = 130;

  const filas: Array<[string, string, boolean]> = [];
  filas.push(["Subtotal", formatMoney(datos.subtotal), false]);
  if (datos.descuento > 0) {
    const etiqueta = datos.descuentoTexto ? `Descuento (${datos.descuentoTexto})` : "Descuento";
    filas.push([etiqueta, `-${formatMoney(datos.descuento)}`, false]);
  }
  if (datos.envio > 0) filas.push(["Envío", formatMoney(datos.envio), false]);
  filas.push(["TOTAL", formatMoney(datos.total), true]);

  let cursor = y;
  filas.forEach(([etiqueta, valor, fuerte], index) => {
    const esTotal = fuerte;
    if (esTotal) {
      doc.setDrawColor(...LINEA_GRIS);
      doc.setLineWidth(0.2);
      doc.line(xEtiqueta, cursor - 4.6, bordeDerecho, cursor - 4.6);
    }
    doc.setFont(FUENTE, esTotal ? "bold" : "normal");
    doc.setFontSize(esTotal ? 11 : 9.5);
    doc.setTextColor(...TEXTO);
    doc.text(etiqueta, xEtiqueta, cursor, { align: "right" });
    doc.text(valor, bordeDerecho, cursor, { align: "right" });
    cursor += index === filas.length - 1 ? 0 : 5.4;
  });

  return cursor + 6;
}

function dibujarBloqueTexto(doc: JsPdfDoc, etiqueta: string, texto: string, y: number): number {
  const bordeDerecho = PAGE.width - MARGEN.right;
  doc.setFont(FUENTE, "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(...TEXTO);
  const etiquetaConDosPuntos = `${etiqueta}:`;
  doc.text(etiquetaConDosPuntos, MARGEN.left, y);
  const anchoEtiqueta = doc.getTextWidth(etiquetaConDosPuntos);

  doc.setFont(FUENTE, "normal");
  const lineas = doc.splitTextToSize(texto, CONTENT_WIDTH - anchoEtiqueta - 2);
  const arreglo = Array.isArray(lineas) ? lineas : [String(lineas)];
  arreglo.forEach((linea, i) => {
    doc.text(linea, i === 0 ? MARGEN.left + anchoEtiqueta + 2 : MARGEN.left, y + i * 4.2);
  });

  return y + Math.max(1, arreglo.length) * 4.2 + 3.4;
}

function dibujarPies(doc: JsPdfDoc, datos: DatosPresupuestoPdf): void {
  const bordeDerecho = PAGE.width - MARGEN.right;
  const total = doc.getNumberOfPages();
  const yPie = PAGE.height - 18;

  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setDrawColor(...LINEA_GRIS);
    doc.setLineWidth(0.2);
    doc.line(MARGEN.left, yPie - 4, bordeDerecho, yPie - 4);

    doc.setFont(FUENTE, "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...TEXTO_GRIS);
    const negocio = datosNegocio(datos.negocio).join(" · ");
    if (negocio) doc.text(negocio, MARGEN.left, yPie);

    doc.setFontSize(7);
    doc.text(datos.leyendaLegal, MARGEN.left, yPie + 4);

    doc.setFontSize(8);
    doc.text(`Página ${i} de ${total}`, bordeDerecho, yPie + 4, { align: "right" });
  }
}

async function crearDocumento(datos: DatosPresupuestoPdf, logoDataUrl: string | null): Promise<JsPdfDoc> {
  const { jsPDF, autoTable } = await cargarLibs();
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait", compress: true });

  const startY = dibujarEncabezado(doc, datos, logoDataUrl);
  const finalTabla = dibujarTabla(doc, autoTable, datos, startY);

  // Bloques de texto posterior a la tabla (se calculan para saber si entra en la página).
  const bloques: Array<{ etiqueta: string; texto: string; lineas: string[] }> = [];
  if (datos.plazoEntrega) bloques.push({ etiqueta: "Plazo de entrega", texto: datos.plazoEntrega, lineas: [] });
  if (datos.condiciones) bloques.push({ etiqueta: "Condiciones", texto: datos.condiciones, lineas: [] });
  if (datos.observaciones) bloques.push({ etiqueta: "Observaciones", texto: datos.observaciones, lineas: [] });

  doc.setFont(FUENTE, "normal");
  doc.setFontSize(9.5);
  for (const bloque of bloques) {
    const lineas = doc.splitTextToSize(bloque.texto, CONTENT_WIDTH - 30);
    bloque.lineas = Array.isArray(lineas) ? lineas : [String(lineas)];
  }

  const filasTotales = 2 + (datos.descuento > 0 ? 1 : 0) + (datos.envio > 0 ? 1 : 0);
  const altoTotales = filasTotales * 5.4 + 8;
  const altoBloques = bloques.reduce((suma, b) => suma + Math.max(1, b.lineas.length) * 4.2 + 3.4, 0);
  const limite = PAGE.height - MARGEN.bottom - 6;

  let cursor = finalTabla + 7;
  if (cursor + altoTotales + altoBloques > limite) {
    doc.addPage();
    cursor = MARGEN.top + 6;
  }

  cursor = dibujarTotales(doc, datos, cursor);

  for (const bloque of bloques) {
    const altoBloque = Math.max(1, bloque.lineas.length) * 4.2 + 3.4;
    if (cursor + altoBloque > limite) {
      doc.addPage();
      cursor = MARGEN.top + 6;
    }
    cursor = dibujarBloqueTexto(doc, bloque.etiqueta, bloque.texto, cursor);
  }

  dibujarPies(doc, datos);
  return doc;
}

/**
 * Genera el PDF del presupuesto. Función pura: no toca la base de datos ni el estado de la app.
 * Devuelve el PDF como Blob para poder descargarlo o compartirlo.
 */
export async function generarPresupuestoPdf(datos: DatosPresupuestoPdf, logoDataUrl: string | null): Promise<Blob> {
  const doc = await crearDocumento(datos, logoDataUrl);
  return doc.output("blob") as Blob;
}

/**
 * Igual que generarPresupuestoPdf pero además informa cuántas páginas tiene el PDF.
 * Se usa en el script de prueba (scripts/test-presupuesto-pdf.ts).
 */
export async function generarPresupuestoPdfConPaginas(
  datos: DatosPresupuestoPdf,
  logoDataUrl: string | null,
): Promise<{ blob: Blob; paginas: number }> {
  const doc = await crearDocumento(datos, logoDataUrl);
  return { blob: doc.output("blob") as Blob, paginas: doc.getNumberOfPages() };
}

/** Genera el PDF y lo descarga con doc.save() (sin iframes ni object embebidos). */
export async function descargarPresupuestoPdf(
  datos: DatosPresupuestoPdf,
  logoDataUrl: string | null,
  nombreArchivo: string,
): Promise<void> {
  const doc = await crearDocumento(datos, logoDataUrl);
  doc.save(nombreArchivo);
}
