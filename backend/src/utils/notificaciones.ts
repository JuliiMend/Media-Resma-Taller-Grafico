import { timingSafeEqual } from "node:crypto";

export const ZONA_HORARIA_AR = "America/Argentina/Buenos_Aires";

/** Límite de Telegram por mensaje. Se deja margen para no rozar los 4096. */
export const MAX_CARACTERES_TELEGRAM = 3500;

export type Canal = "telegram" | "email";

export interface ResultadoCanal {
  canal: Canal;
  ok: boolean;
  configurado: boolean;
  error?: string;
}

export interface CanalesResultado {
  telegram: ResultadoCanal;
  email: ResultadoCanal;
}

type ValorNumerico = number | string | { toString(): string } | null | undefined;
type FechaAviso = Date | string | null | undefined;

export interface PedidoFechaAviso {
  id: number;
  fechaEntrega?: FechaAviso;
  cliente: { nombre: string };
}

export interface DeudaAviso {
  id: number;
  estado: string;
  restaPagar?: ValorNumerico;
  cliente: { nombre: string };
}

export interface InsumoAviso {
  nombre: string;
  unidad: string;
  stockActual?: ValorNumerico;
  stockMinimo?: ValorNumerico;
}

export interface TareaAviso {
  titulo: string;
  fechaLimite?: FechaAviso;
}

export interface DatosAvisos {
  atrasados: PedidoFechaAviso[];
  proximos: PedidoFechaAviso[];
  deudas: DeudaAviso[];
  stockBajo: InsumoAviso[];
  tareas: TareaAviso[];
  hoy?: string;
}

export interface DeudaAgrupada {
  cliente: string;
  total: number;
  pedidos: number;
}

export interface ResumenAvisos {
  avisos: number;
  asunto: string;
  texto: string;
  html: string;
  conteos: {
    pedidosAtrasados: number;
    pedidosProximos: number;
    pedidosConSaldo: number;
    stockBajo: number;
    tareasPendientes: number;
  };
  deudasAgrupadas: DeudaAgrupada[];
  deudasRestantes: number;
}

const formatoMoneda = new Intl.NumberFormat("es-AR", {
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
});

const formatoFecha = new Intl.DateTimeFormat("en-CA", {
  timeZone: ZONA_HORARIA_AR,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function numero(valor: ValorNumerico): number {
  if (valor === null || valor === undefined) return 0;
  const n = typeof valor === "number" ? valor : Number(valor.toString());
  return Number.isFinite(n) ? n : 0;
}

export function formatoMonedaAR(valor: number): string {
  return `$${formatoMoneda.format(Math.round(valor))}`;
}

/** Escapa el texto dinámico para que un "&" o "<" no rompa Telegram ni el mail. */
export function escapeHtml(texto: string): string {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Parte un mensaje en bloques de `max` caracteres como máximo.
 * Prefiere cortar entre líneas; solo parte una línea sola si es más larga.
 */
export function dividirMensaje(texto: string, max = MAX_CARACTERES_TELEGRAM): string[] {
  if (!texto) return [];

  const bloques: string[] = [];
  let actual = "";

  const volcar = () => {
    if (actual !== "") {
      bloques.push(actual);
      actual = "";
    }
  };

  for (const linea of texto.split("\n")) {
    if (linea.length <= max) {
      const candidato = actual === "" ? linea : `${actual}\n${linea}`;
      if (candidato.length <= max) {
        actual = candidato;
      } else {
        volcar();
        actual = linea;
      }
      continue;
    }

    volcar();
    let resto = linea;
    while (resto.length > max) {
      bloques.push(resto.slice(0, max));
      resto = resto.slice(max);
    }
    actual = resto;
  }

  volcar();
  return bloques;
}

/** Compara el secreto del cron sin filtrar su largo ni su contenido. */
export function compararSecreto(recibido: string | undefined, esperado: string): boolean {
  if (!recibido || !esperado) return false;
  const a = Buffer.from(recibido, "utf8");
  const b = Buffer.from(esperado, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function fechaValida(fecha: Date): boolean {
  return !Number.isNaN(fecha.getTime());
}

function esSoloFechaUTC(fecha: Date): boolean {
  return (
    fecha.getUTCHours() === 0 &&
    fecha.getUTCMinutes() === 0 &&
    fecha.getUTCSeconds() === 0 &&
    fecha.getUTCMilliseconds() === 0
  );
}

/**
 * Las fechas de entrega/vencimiento se guardan como fecha sin hora a las 00:00 UTC.
 * Se corren al mediodía UTC para que al formatearlas en Buenos Aires conserven
 * el día elegido por el usuario. Los timestamps reales se formatean tal cual.
 */
function fechaDeCalendario(fecha: Date): Date {
  return esSoloFechaUTC(fecha) ? new Date(fecha.getTime() + 12 * 60 * 60 * 1000) : fecha;
}

export function hoyBA(ahora: Date = new Date()): string {
  return formatoFecha.format(ahora);
}

/** Día calendario en Buenos Aires de una fecha guardada. */
export function diaBA(fecha: FechaAviso): string {
  if (!fecha) return "";
  const valor = fecha instanceof Date ? fecha : new Date(fecha);
  if (!fechaValida(valor)) return "";
  return formatoFecha.format(fechaDeCalendario(valor));
}

export function formatearFechaBA(fecha: FechaAviso): string {
  if (!fecha) return "sin fecha";
  const valor = fecha instanceof Date ? fecha : new Date(fecha);
  if (!fechaValida(valor)) return "sin fecha";
  return fechaDeCalendario(valor).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: ZONA_HORARIA_AR,
  });
}

export function sumarDiasISO(fecha: string, dias: number): string {
  const ms = Date.parse(`${fecha}T12:00:00.000Z`);
  return new Date(ms + dias * 86_400_000).toISOString().slice(0, 10);
}

export function clasificarPedidos(
  pedidos: PedidoFechaAviso[],
  hoy: string = hoyBA(),
  diasProximos = 3,
): { atrasados: PedidoFechaAviso[]; proximos: PedidoFechaAviso[] } {
  const limite = sumarDiasISO(hoy, diasProximos);
  const atrasados: PedidoFechaAviso[] = [];
  const proximos: PedidoFechaAviso[] = [];

  for (const pedido of pedidos) {
    const dia = diaBA(pedido.fechaEntrega);
    if (!dia) continue;
    if (dia < hoy) {
      atrasados.push(pedido);
    } else if (dia <= limite) {
      proximos.push(pedido);
    }
  }

  const ordenar = (a: PedidoFechaAviso, b: PedidoFechaAviso) =>
    diaBA(a.fechaEntrega).localeCompare(diaBA(b.fechaEntrega)) || a.id - b.id;

  atrasados.sort(ordenar);
  proximos.sort(ordenar);
  return { atrasados, proximos };
}

export function agruparDeudas(deudas: DeudaAviso[]): {
  grupos: DeudaAgrupada[];
  restantes: number;
  total: number;
  pedidos: number;
} {
  const mapa = new Map<string, DeudaAgrupada>();
  let pedidosConDeuda = 0;

  for (const pedido of deudas) {
    if (pedido.estado !== "LISTO" && pedido.estado !== "ENTREGADO") continue;
    const resta = numero(pedido.restaPagar);
    // Debajo de un centavo es residuo, no deuda.
    if (resta < 0.01) continue;

    pedidosConDeuda += 1;
    const cliente = pedido.cliente.nombre.trim() || "Sin cliente";
    const grupo = mapa.get(cliente) ?? { cliente, total: 0, pedidos: 0 };
    grupo.total += resta;
    grupo.pedidos += 1;
    mapa.set(cliente, grupo);
  }

  const ordenadas = [...mapa.values()].sort(
    (a, b) => b.total - a.total || a.cliente.localeCompare(b.cliente, "es"),
  );
  const grupos = ordenadas.slice(0, 10);

  return {
    grupos,
    restantes: Math.max(0, ordenadas.length - grupos.length),
    total: ordenadas.reduce((suma, grupo) => suma + grupo.total, 0),
    pedidos: pedidosConDeuda,
  };
}

function fechaCortaDesdeISO(fecha: string): string {
  const [anio, mes, dia] = fecha.split("-").map(Number);
  if (!anio || !mes || !dia) return fecha;
  return `${dia}/${mes}`;
}

export function construirResumen(datos: DatosAvisos): ResumenAvisos {
  const hoy = datos.hoy ?? hoyBA();
  const deudas = agruparDeudas(datos.deudas);
  const secciones: Array<{ titulo: string; items: string[] }> = [];

  if (datos.atrasados.length > 0) {
    secciones.push({
      titulo: "🚨 Pedidos atrasados",
      items: datos.atrasados.map(
        (p) =>
          `Pedido #${p.id} (${p.cliente.nombre}): entregar el ${formatearFechaBA(p.fechaEntrega)}`,
      ),
    });
  }

  if (datos.proximos.length > 0) {
    secciones.push({
      titulo: "📦 Entregas próximas",
      items: datos.proximos.map((p) => {
        const dia = diaBA(p.fechaEntrega);
        const cuando = dia === hoy ? "hoy" : formatearFechaBA(p.fechaEntrega);
        return `Pedido #${p.id} (${p.cliente.nombre}): entregar ${cuando}`;
      }),
    });
  }

  if (deudas.grupos.length > 0) {
    const items = deudas.grupos.map((grupo) => {
      const cantidad = `${grupo.pedidos} ${grupo.pedidos === 1 ? "pedido" : "pedidos"}`;
      return `${grupo.cliente}: ${formatoMonedaAR(grupo.total)} (${cantidad})`;
    });
    if (deudas.restantes > 0) {
      items.push(
        `… y ${deudas.restantes} ${deudas.restantes === 1 ? "cliente más" : "clientes más"}`,
      );
    }
    secciones.push({ titulo: "💰 Deudas", items });
  }

  if (datos.stockBajo.length > 0) {
    secciones.push({
      titulo: "⚠ Stock bajo",
      items: datos.stockBajo.map(
        (i) =>
          `${i.nombre}: quedan ${numero(i.stockActual)} ${i.unidad} (mínimo ${numero(i.stockMinimo)})`,
      ),
    });
  }

  if (datos.tareas.length > 0) {
    secciones.push({
      titulo: "✅ Tareas",
      items: datos.tareas.map((t) => {
        const vencida = diaBA(t.fechaLimite) && diaBA(t.fechaLimite) < hoy ? "¡VENCIDA! " : "";
        return `${vencida}${t.titulo}: ${formatearFechaBA(t.fechaLimite)}`;
      }),
    });
  }

  const texto = secciones
    .map(
      (seccion) =>
        `<b>${escapeHtml(seccion.titulo)}</b>\n` +
        seccion.items.map((item) => `• ${escapeHtml(item)}`).join("\n"),
    )
    .join("\n\n");

  const html = [
    "<!doctype html>",
    '<html lang="es"><body style="margin:0;padding:24px;background:#f6f4ef;font-family:Arial,Helvetica,sans-serif;color:#2c2925">',
    '<div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e4ded3;border-radius:12px;padding:28px">',
    '<h2 style="margin:0 0 6px;font-size:20px">Resumen de alertas</h2>',
    `<p style="margin:0 0 20px;color:#6b655d;font-size:14px">Media Resma Taller Gráfico · ${escapeHtml(
      fechaCortaDesdeISO(hoy),
    )}</p>`,
    ...secciones.map((seccion) => {
      const items = seccion.items
        .map(
          (item) =>
            `<li style="margin:0 0 6px;line-height:1.4;font-size:14px">${escapeHtml(item)}</li>`,
        )
        .join("");
      return `<section style="margin:0 0 20px"><h3 style="margin:0 0 8px;font-size:15px">${escapeHtml(
        seccion.titulo,
      )}</h3><ul style="margin:0;padding-left:20px">${items}</ul></section>`;
    }),
    '<p style="margin:24px 0 0;color:#8a8379;font-size:12px">Enviado automáticamente por Media Resma.</p>',
    "</div></body></html>",
  ].join("");

  const conteos = {
    pedidosAtrasados: datos.atrasados.length,
    pedidosProximos: datos.proximos.length,
    pedidosConSaldo: deudas.pedidos,
    stockBajo: datos.stockBajo.length,
    tareasPendientes: datos.tareas.length,
  };

  return {
    avisos:
      datos.atrasados.length +
      datos.proximos.length +
      conteos.pedidosConSaldo +
      datos.stockBajo.length +
      datos.tareas.length,
    asunto: `Resumen de alertas · ${fechaCortaDesdeISO(hoy)}`,
    texto,
    html,
    conteos,
    deudasAgrupadas: deudas.grupos,
    deudasRestantes: deudas.restantes,
  };
}
