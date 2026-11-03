import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { alertaService } from "../../services/alerta.service";
import { env } from "../../config/env";
import { proveedorEmail } from "../../utils/email";
import { compararSecreto, type ResultadoCanal } from "../../utils/notificaciones";

const LIMITE_POR_HORA = 10;
const VENTANA_MS = 60 * 60 * 1000;
const intentosPorIp = new Map<string, number[]>();

function superaRateLimit(ip: string): boolean {
  const ahora = Date.now();
  const desde = ahora - VENTANA_MS;
  const previos = (intentosPorIp.get(ip) ?? []).filter((t) => t > desde);

  if (previos.length >= LIMITE_POR_HORA) {
    intentosPorIp.set(ip, previos);
    return true;
  }

  previos.push(ahora);
  intentosPorIp.set(ip, previos);

  if (intentosPorIp.size > 500) {
    for (const [clave, marcas] of intentosPorIp) {
      if (marcas.every((t) => t <= desde)) intentosPorIp.delete(clave);
    }
  }

  return false;
}

export const chequearAlertas = asyncHandler(async (_req: Request, res: Response) => {
  const resultado = await alertaService.chequear();
  res.json(resultado);
});

export const probarAlertas = asyncHandler(async (_req: Request, res: Response) => {
  const resultado = await alertaService.probar();
  res.json(resultado);
});

export const estadoAlertas = asyncHandler(async (_req: Request, res: Response) => {
  res.json({
    telegram: {
      token: Boolean(env.telegramBotToken),
      destinos: env.telegramChatIds.length,
    },
    email: {
      proveedor: proveedorEmail(),
      destinos: env.emailDestinos.length,
    },
    cron: {
      secret: env.cronSecret.length >= 24,
    },
  });
});

export const cronAlertas = asyncHandler(async (req: Request, res: Response) => {
  if (env.cronSecret.length < 24) {
    res.status(503).json({ error: "Cron deshabilitado" });
    return;
  }

  const recibido = req.header("x-cron-secret") ?? undefined;
  if (!compararSecreto(recibido, env.cronSecret)) {
    res.status(401).json({ error: "No autorizado" });
    return;
  }

  const ip = req.ip ?? req.socket.remoteAddress ?? "desconocida";
  if (superaRateLimit(ip)) {
    res.status(429).json({ error: "Demasiadas solicitudes" });
    return;
  }

  const resultado = await alertaService.chequear();
  const configurados = Object.values(resultado.canales).filter(
    (canal: ResultadoCanal) => canal.configurado,
  );
  const todosFallaron = configurados.length > 0 && configurados.every((canal) => !canal.ok);

  res.status(todosFallaron ? 500 : 200).json(resultado);
});
