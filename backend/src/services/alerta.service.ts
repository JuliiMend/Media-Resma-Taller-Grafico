import { insumoService } from "./insumo.service";
import { pedidoService } from "./pedido.service";
import { tareaService } from "./tarea.service";
import { enviarMensajeTelegram, estadoTelegram } from "../utils/telegram";
import { enviarEmail, estadoEmail } from "../utils/email";
import {
  clasificarPedidos,
  construirResumen,
  hoyBA,
  sumarDiasISO,
  type CanalesResultado,
} from "../utils/notificaciones";

const TEXTO_PRUEBA = "✅ Prueba de notificaciones — Media Resma";
const HTML_PRUEBA = [
  "<!doctype html>",
  '<html lang="es"><body style="margin:0;padding:24px;background:#f6f4ef;font-family:Arial,Helvetica,sans-serif;color:#2c2925">',
  '<div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e4ded3;border-radius:12px;padding:24px">',
  '<h2 style="margin:0 0 8px;font-size:18px">✅ Prueba de notificaciones</h2>',
  '<p style="margin:0;font-size:14px">Media Resma Taller Gráfico</p>',
  "</div></body></html>",
].join("");

function canalesSinEnvio(): CanalesResultado {
  return { telegram: estadoTelegram(), email: estadoEmail() };
}

export const alertaService = {
  chequear: async () => {
    const hoy = hoyBA();
    const hasta = new Date(`${sumarDiasISO(hoy, 3)}T23:59:59.999Z`);

    const [insumosStockBajo, tareasPendientes, pedidosConSaldo, pedidosActivos] =
      await Promise.all([
        insumoService.listarConStockBajo(),
        tareaService.listarParaAlertas(new Date(0), hasta),
        pedidoService.listarConSaldo(),
        pedidoService.listarActivosConEntrega(),
      ]);

    const { atrasados, proximos } = clasificarPedidos(pedidosActivos, hoy);
    const resumen = construirResumen({
      atrasados,
      proximos,
      deudas: pedidosConSaldo,
      stockBajo: insumosStockBajo,
      tareas: tareasPendientes,
      hoy,
    });

    const base = {
      avisos: resumen.avisos,
      pedidosAtrasados: resumen.conteos.pedidosAtrasados,
      pedidosProximos: resumen.conteos.pedidosProximos,
      pedidosConSaldo: resumen.conteos.pedidosConSaldo,
      stockBajo: resumen.conteos.stockBajo,
      tareasPendientes: resumen.conteos.tareasPendientes,
      deudasAgrupadas: resumen.deudasAgrupadas,
      deudasRestantes: resumen.deudasRestantes,
    };

    // Sin avisos no se molesta a nadie: se devuelve el estado de los canales.
    if (resumen.avisos === 0) {
      return { ...base, canales: canalesSinEnvio() };
    }

    const [telegram, email] = await Promise.all([
      enviarMensajeTelegram(resumen.texto),
      enviarEmail(resumen.asunto, resumen.html),
    ]);

    return {
      ...base,
      canales: {
        telegram,
        email,
      } satisfies CanalesResultado,
    };
  },

  probar: async () => {
    const [telegram, email] = await Promise.all([
      enviarMensajeTelegram(TEXTO_PRUEBA),
      enviarEmail("Prueba de notificaciones — Media Resma", HTML_PRUEBA),
    ]);

    return {
      canales: {
        telegram,
        email,
      } satisfies CanalesResultado,
    };
  },
};
