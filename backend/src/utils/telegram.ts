import { env } from "../config/env";

export async function enviarMensajeTelegram(texto: string): Promise<void> {
  if (!env.telegramBotToken || env.telegramChatIds.length === 0) {
    console.warn("[telegram] Falta TELEGRAM_BOT_TOKEN o TELEGRAM_CHAT_IDS, no se envía:", texto);
    return;
  }

  const url = `https://api.telegram.org/bot${env.telegramBotToken}/sendMessage`;

  await Promise.all(
    env.telegramChatIds.map(async (chatId) => {
      const respuesta = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: texto,
          parse_mode: "HTML",
        }),
      });

      if (!respuesta.ok) {
        const detalle = await respuesta.text();
        console.error(`[telegram] Error al enviar a ${chatId}:`, detalle);
      }
    })
  );
}
