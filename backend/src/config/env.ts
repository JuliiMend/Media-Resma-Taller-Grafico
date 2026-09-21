import "dotenv/config";

export const env = {
  port: Number(process.env.PORT ?? 4000),
  apiKey: process.env.API_KEY ?? "",

  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN ?? "",
  telegramChatIds: (process.env.TELEGRAM_CHAT_IDS ?? process.env.TELEGRAM_CHAT_ID ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean),

  emailUser: process.env.EMAIL_USER ?? "",
  emailPass: process.env.EMAIL_PASS ?? "",
  emailDestinos: (process.env.EMAIL_DESTINOS ?? "")
    .split(",")
    .map((mail) => mail.trim())
    .filter(Boolean),
};
