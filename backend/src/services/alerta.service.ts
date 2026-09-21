import { insumoService } from "./insumo.service";
import { pedidoService } from "./pedido.service";
import { tareaService } from "./tarea.service";
import { enviarMensajeTelegram } from "../utils/telegram";
import { enviarEmail } from "../utils/email";

export const alertaService = {
  chequear: async () => {
    const hoy = new Date();
    const hasta = new Date();
    hasta.setDate(hasta.getDate() + 3);

    const [insumosStockBajo, tareasPendientes, pedidosConSaldo, pedidosProximos] = await Promise.all([
      insumoService.listarConStockBajo(),
      tareaService.listarParaAlertas(new Date(0), hasta),
      pedidoService.listarConSaldo(),
      pedidoService.listarProximosAEntregar(hoy, hasta),
    ]);

    const avisos = insumosStockBajo.length + tareasPendientes.length + pedidosConSaldo.length + pedidosProximos.length;

    if (avisos === 0) {
      return { avisos: 0 };
    }

    const secciones: string[] = [];

    if (insumosStockBajo.length > 0) {
      secciones.push(
          ["<b>⚠ Stock bajo</b>", ...insumosStockBajo.map(
              (i) => `• ${i.nombre}: quedan ${i.stockActual} ${i.unidad} (mínimo ${i.stockMinimo})`
          )].join("\n")
      );
    }

    if (tareasPendientes.length > 0) {
      secciones.push(
          ["<b>⚠ Tareas pendientes</b>", ...tareasPendientes.map((t) => {
            const vencida = t.fechaLimite && t.fechaLimite < hoy ? "🚨 ¡VENCIDA! " : "";
            const fechaStr = t.fechaLimite?.toLocaleDateString("es-AR") ?? "sin fecha";
            return `• ${vencida}${t.titulo}: ${fechaStr}`;
          })].join("\n")
      );
    }

    if (pedidosProximos.length > 0) {
      secciones.push(
          ["<b>⚠ Pedidos a entregar pronto</b>", ...pedidosProximos.map((p) => {
            const vencido = p.fechaEntrega && p.fechaEntrega < hoy ? "🚨 ¡ATRASADO! " : "";
            const fechaStr = p.fechaEntrega?.toLocaleDateString("es-AR") ?? "sin fecha";
            return `• ${vencido}Pedido #${p.id} (${p.cliente.nombre}): Entregar el ${fechaStr}`;
          })].join("\n")
      );
    }

    if (pedidosConSaldo.length > 0) {
      secciones.push(
          ["<b>⚠ Pedidos con saldo</b>", ...pedidosConSaldo.map(
              (p) => `• Pedido #${p.id} (${p.cliente.nombre}): resta $${p.restaPagar}`
          )].join("\n")
      );
    }

    const mensajeTelegram = secciones.join("\n\n");
    const mensajeEmail = `
      ${secciones.map((seccion) => `<p>${seccion.replace(/\n/g, "<br>")}</p>`).join("")}
    `;

    await Promise.all([
      enviarMensajeTelegram(mensajeTelegram),
      enviarEmail("Aviso de alertas - Media Resma", mensajeEmail),
    ]);

    return {
      avisos,
      stockBajo: insumosStockBajo.length,
      tareasPendientes: tareasPendientes.length,
      pedidosProximos: pedidosProximos.length,
      pedidosConSaldo: pedidosConSaldo.length,
    };
  },
};