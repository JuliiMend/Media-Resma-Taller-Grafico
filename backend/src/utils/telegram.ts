import { env } from "../config/env";
import {
  dividirMensaje,
  MAX_CARACTERES_TELEGRAM,
  type ResultadoCanal,
} from "./notificaciones";

const TIMEOUT_MS = 15_000;

export function estadoTelegram(): ResultadoCanal {
  const configurado = Boolean(env.telegramBotToken && env.telegramChatIds.length > 0);
  return {
    canal: "telegram",
    ok: configurado,
    configurado,
    ...(configurado ? {} : { error: "No configurado" }),
  };
}

function ocultarSecretos(texto: string): string {
  const token = env.telegramBotToken;
  return token ? texto.split(token).join("[oculto]") : texto;
}

function errorCorto(error: unknown): string {
  if (error instanceof Error && error.name === "AbortError") {
    return "Tiempo de espera agotado";
  }
  const texto = error instanceof Error ? error.message : String(error);
  return ocultarSecretos(texto).replace(/\s+/g, " ").trim().slice(0, 160) || "Error desconocido";
}

async function detalleRespuesta(respuesta: Response): Promise<string> {
  const texto = await respuesta.text().catch(() => "");
  if (!texto) return `HTTP ${respuesta.status}`;
  const seguro = ocultarSecretos(texto);
  try {
    const data = JSON.parse(seguro) as { description?: string };
    const descripcion = data.description ?? seguro;
    return `HTTP ${respuesta.status}: ${String(descripcion).slice(0, 160)}`;
  } catch {
    return `HTTP ${respuesta.status}: ${seguro.slice(0, 160)}`;
  }
}

async function enviarBloque(chatId: string, texto: string): Promise<void> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const respuesta = await fetch(
      `https://api.telegram.org/bot${env.telegramBotToken}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: texto,
          parse_mode: "HTML",
        }),
        signal: controller.signal,
      },
    );

    if (!respuesta.ok) {
      throw new Error(await detalleRespuesta(respuesta));
    }
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Tiempo de espera agotado (15 s)");
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export async function enviarMensajeTelegram(texto: string): Promise<ResultadoCanal> {
  if (!env.telegramBotToken || env.telegramChatIds.length === 0) {
    return { canal: "telegram", ok: false, configurado: false, error: "No configurado" };
  }

  const bloques = dividirMensaje(texto, MAX_CARACTERES_TELEGRAM);
  const errores = new Map<string, string>();

  for (const bloque of bloques) {
    for (const chatId of env.telegramChatIds) {
      if (errores.has(chatId)) continue;
      try {
        await enviarBloque(chatId, bloque);
      } catch (error) {
        errores.set(chatId, errorCorto(error));
      }
    }
  }

  if (errores.size > 0) {
    const detalle = [...errores.entries()]
      .map(([chatId, error]) => `chat ${chatId}: ${error}`)
      .join("; ")
      .slice(0, 300);
    console.error(`[telegram] Error al enviar: ${detalle}`);
    return {
      canal: "telegram",
      ok: false,
      configurado: true,
      error: detalle,
    };
  }

  return { canal: "telegram", ok: true, configurado: true };
}
