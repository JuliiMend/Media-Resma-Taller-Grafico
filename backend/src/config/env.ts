// src/config/env.ts
import "dotenv/config";

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  throw new Error("Falta JWT_SECRET en las variables de entorno");
}

export const env = {
  port: Number(process.env.PORT ?? 4000),
  apiKey: process.env.API_KEY ?? "",

  jwtSecret,

  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN ?? "",
  telegramChatIds: (process.env.TELEGRAM_CHAT_IDS ?? "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean),

  corsOrigin: process.env.CORS_ORIGIN ?? "*",

  emailUser: process.env.EMAIL_USER ?? "",
  emailPass: process.env.EMAIL_PASS ?? "",
  emailDestinos: (process.env.EMAIL_DESTINOS ?? "")
      .split(",")
      .map((mail) => mail.trim())
      .filter(Boolean),
};