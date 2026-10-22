/**
 * Prueba del generador de PDF de presupuestos.
 * Uso: npx tsx scripts/test-presupuesto-pdf.ts
 *
 * Genera un presupuesto con 30 líneas y verifica que:
 *  - el PDF se arma sin errores,
 *  - tiene 2 o más páginas (la tabla debe cortar y continuar),
 *  - el logo real del proyecto se puede incrustar.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  borradorVacio,
  calcularTotales,
  fechaCorta,
  hoyISO,
  nuevaLinea,
  numeroPresupuesto,
  resumenLineas,
  sumarDias,
  type BorradorPresupuesto,
  type DatosPresupuestoPdf,
} from "@/lib/presupuesto";
import { generarPresupuestoPdfConPaginas } from "@/lib/presupuesto-pdf";
import { BORRADOR_KEY, LEYENDA_LEGAL, NEGOCIO, VALIDEZ_DIAS_DEFAULT } from "@/lib/presupuesto-config";

const DESCRIPCIONES = [
  "DTF 60x40",
  "Vinilo adhesivo 3M",
  "Lámina UV",
  "Banner 2m x 1m",
  "Sticker en vinilo brillante",
  "Papel adhesivo 120g",
  "Plotter de 1,54m",
  "Serigrafía 1 tinta",
  "Offset A4 a full color",
  "Troquel de gasket",
];

function datosDePrueba(): BorradorPresupuesto {
  const base = borradorVacio();
  return {
    ...base,
    clienteNombre: "Estudio Cliente de Prueba",
    clienteTelefono: "11 5555-0000",
    fechaEmision: hoyISO(),
    validezDias: String(VALIDEZ_DIAS_DEFAULT),
    envio: "3500",
    modoDescuento: "porcentaje",
    descuentoValor: "10",
    plazoEntrega: "5 días hábiles",
    condiciones: "Precios sujetos a cambio luego de la fecha de validez. 50% de anticipo.",
    observaciones: "Entrega en el domicilio del cliente. Incluye instalación básica.",
    lineas: Array.from({ length: 30 }, (_, i) => ({
      ...nuevaLinea(),
      descripcion: `${DESCRIPCIONES[i % DESCRIPCIONES.length]} - lote ${i + 1}`,
      cantidad: String((i % 5) + 1),
      unidad: i % 3 === 0 ? "m2" : "u",
      precioUnitario: String(1500 + i * 175.5),
      costoUnitario: String(900 + i * 90.25),
      personalizado: true,
    })),
  };
}

function datosParaPdf(borrador: BorradorPresupuesto): DatosPresupuestoPdf {
  const totales = calcularTotales(borrador);
  return {
    numero: numeroPresupuesto(),
    negocio: NEGOCIO,
    leyendaLegal: LEYENDA_LEGAL,
    clienteNombre: borrador.clienteNombre,
    clienteTelefono: borrador.clienteTelefono,
    fechaEmision: fechaCorta(borrador.fechaEmision),
    validoHasta: fechaCorta(sumarDias(borrador.fechaEmision, Number(borrador.validezDias) || 7)),
    lineas: resumenLineas(borrador),
    subtotal: totales.subtotal,
    descuento: totales.descuento,
    descuentoTexto: "10 %",
    envio: totales.envio,
    total: totales.total,
    plazoEntrega: borrador.plazoEntrega,
    condiciones: borrador.condiciones,
    observaciones: borrador.observaciones,
  };
}

function logoComoDataUrl(): string {
  const ruta = resolve(process.cwd(), "public", "logo-media-resma-pdf.png");
  const base64 = readFileSync(ruta).toString("base64");
  return `data:image/png;base64,${base64}`;
}

async function main() {
  const borrador = datosDePrueba();
  const datos = datosParaPdf(borrador);
  if (datos.lineas.length !== 30) throw new Error(`Se esperaban 30 líneas y llegaron ${datos.lineas.length}`);

  const { blob, paginas } = await generarPresupuestoPdfConPaginas(datos, logoComoDataUrl());
  const bytes = new Uint8Array(await blob.arrayBuffer());

  const salida = resolve(process.cwd(), ".tmp-presupuesto-prueba.pdf");
  writeFileSync(salida, bytes);

  console.log(`Clave de borrador en la app: ${BORRADOR_KEY}`);
  console.log(`Líneas: ${datos.lineas.length} · Páginas: ${paginas} · Tamaño: ${bytes.length} bytes`);
  console.log(`PDF de prueba escrito en: ${salida}`);

  if (bytes.length < 5000) throw new Error("El PDF salió demasiado chico, algo falló al generarlo.");
  if (paginas < 2) throw new Error(`Se esperaban 2 o más páginas y se generaron ${paginas}.`);
  if (blob.type !== "application/pdf") throw new Error(`Tipo MIME inesperado: ${blob.type}`);

  console.log("OK: el PDF se genera con 30 líneas en 2 o más páginas.");
}

main().catch((error) => {
  console.error("FALLA:", error);
  process.exit(1);
});
