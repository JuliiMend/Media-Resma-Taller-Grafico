import nodemailer from "nodemailer";
import { env } from "../config/env";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: env.emailUser,
    pass: env.emailPass,
  },
});

export async function enviarEmail(asunto: string, textoHtml: string): Promise<void> {
  if (!env.emailUser || !env.emailPass || env.emailDestinos.length === 0) {
    console.warn("[email] Falta EMAIL_USER/EMAIL_PASS/EMAIL_DESTINOS, no se envía:", asunto);
    return;
  }

  try {
    await transporter.sendMail({
      from: `"Media Resma Taller Gráfico" <${env.emailUser}>`,
      to: env.emailDestinos.join(","),
      subject: asunto,
      html: textoHtml,
    });
  } catch (error) {
    console.error("[email] Error al enviar:", error);
  }
}
