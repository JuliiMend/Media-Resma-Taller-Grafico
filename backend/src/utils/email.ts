import nodemailer from "nodemailer";
import { env } from "../config/env";
import type { ResultadoCanal } from "./notificaciones";

const NOMBRE_REMITENTE = "Media Resma Taller Gráfico";
const TIMEOUT_MS = 15_000;

export type ProveedorEmail = "brevo" | "smtp" | null;

let avisoSmtpMostrado = false;

function remitente(): string {
  return env.emailRemitente || env.emailUser;
}

export function proveedorEmail(): ProveedorEmail {
  if (env.brevoApiKey && remitente() && env.emailDestinos.length > 0) return "brevo";
  if (env.emailUser && env.emailPass && env.emailDestinos.length > 0) return "smtp";
  return null;
}

export function estadoEmail(): ResultadoCanal {
  const proveedor = proveedorEmail();
  return {
    canal: "email",
    ok: proveedor !== null,
    configurado: proveedor !== null,
    ...(proveedor === null ? { error: "No configurado" } : {}),
  };
}

function ocultarSecretos(texto: string): string {
  let resultado = texto;
  for (const secreto of [env.brevoApiKey, env.emailPass]) {
    if (secreto) resultado = resultado.split(secreto).join("[oculto]");
  }
  return resultado;
}

function errorCorto(error: unknown): string {
  if (error instanceof Error && error.name === "AbortError") {
    return "Tiempo de espera agotado";
  }
  const texto = error instanceof Error ? error.message : String(error);
  return ocultarSecretos(texto).replace(/\s+/g, " ").trim().slice(0, 200) || "Error desconocido";
}

async function respuestaBreve(respuesta: Response): Promise<string> {
  const texto = await respuesta.text().catch(() => "");
  if (!texto) return `HTTP ${respuesta.status}`;
  try {
    const data = JSON.parse(texto) as { message?: string; code?: string };
    const mensaje = data.message ?? data.code ?? texto;
    return `HTTP ${respuesta.status}: ${String(mensaje).slice(0, 160)}`;
  } catch {
    return `HTTP ${respuesta.status}: ${texto.slice(0, 160)}`;
  }
}

async function enviarPorBrevo(asunto: string, html: string, remitenteEmail: string): Promise<void> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const respuesta = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": env.brevoApiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        sender: { name: NOMBRE_REMITENTE, email: remitenteEmail },
        to: env.emailDestinos.map((email) => ({ email })),
        subject: asunto,
        htmlContent: html,
      }),
      signal: controller.signal,
    });

    if (!respuesta.ok) {
      throw new Error(await respuestaBreve(respuesta));
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

async function enviarPorSmtp(asunto: string, html: string): Promise<void> {
  if (!avisoSmtpMostrado) {
    avisoSmtpMostrado = true;
    console.warn(
      "[email] Sin BREVO_API_KEY: se usa SMTP. En Render free los puertos SMTP salientes pueden estar bloqueados.",
    );
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: env.emailUser,
      pass: env.emailPass,
    },
    connectionTimeout: TIMEOUT_MS,
    greetingTimeout: TIMEOUT_MS,
    socketTimeout: TIMEOUT_MS,
  });

  try {
    await transporter.sendMail({
      from: `"${NOMBRE_REMITENTE}" <${env.emailUser}>`,
      to: env.emailDestinos.join(","),
      subject: asunto,
      html,
    });
  } finally {
    transporter.close();
  }
}

export async function enviarEmail(asunto: string, textoHtml: string): Promise<ResultadoCanal> {
  const proveedor = proveedorEmail();
  if (!proveedor) {
    return { canal: "email", ok: false, configurado: false, error: "No configurado" };
  }

  try {
    if (proveedor === "brevo") {
      await enviarPorBrevo(asunto, textoHtml, remitente());
    } else {
      await enviarPorSmtp(asunto, textoHtml);
    }
    return { canal: "email", ok: true, configurado: true };
  } catch (error) {
    console.error(`[email] Error al enviar con ${proveedor}:`, errorCorto(error));
    return {
      canal: "email",
      ok: false,
      configurado: true,
      error: errorCorto(error),
    };
  }
}
