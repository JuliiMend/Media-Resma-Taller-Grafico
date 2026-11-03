import "./cargar-env";
import { PrismaClient } from "@prisma/client";
import { pedidoService } from "../src/services/pedido.service";
import { requestContext } from "../src/utils/request-context";
import { exigirBaseLocal } from "./seguridad";

/**
 * Reproduce el bug de Deudas contra una base LOCAL y muestra el antes/después.
 *
 * Crea datos de prueba, ejecuta pedidoService.pagar y los borra al final.
 * Nunca corre contra una base remota.
 *
 * Uso:
 *   pnpm --filter backend reproducir:pago-deuda
 */
const prisma = new PrismaClient();

type TrabajoSimple = { cantidad: unknown; valorUnitario: unknown };

type PedidoParaSimular = {
  sena: unknown;
  restaPagar: unknown;
  envio: unknown;
  trabajos: TrabajoSimple[];
};

/** Copia de la lógica vieja, para mostrar qué pasaba antes del fix. */
function logicaAnterior(pedido: PedidoParaSimular, monto?: number) {
  const total =
    pedido.trabajos.reduce(
      (acc, t) => acc + Number(t.cantidad) * Number(t.valorUnitario),
      0
    ) + Number(pedido.envio ?? 0);
  const senaActual = Number(pedido.sena ?? 0);
  const saldoRestante = Math.max(0, total - senaActual);
  const montoAPagar = monto ?? saldoRestante;
  const tope = Math.max(total, senaActual);
  const nuevaSena = Math.min(senaActual + montoAPagar, tope);
  // recalcularPedido devolvía sin tocar los pedidos sin trabajos.
  const restaPagar =
    pedido.trabajos.length === 0
      ? Number(pedido.restaPagar ?? 0)
      : Math.max(0, total - nuevaSena);

  return { sena: nuevaSena, restaPagar };
}

async function estadoPedido(id: number) {
  const p = await prisma.pedido.findUniqueOrThrow({ where: { id } });
  return { sena: Number(p.sena ?? 0), restaPagar: Number(p.restaPagar ?? 0) };
}

async function main() {
  exigirBaseLocal(false);

  const sufijo = Date.now();
  const pedidoIds: number[] = [];
  let clienteId: number | undefined;
  let usuarioId: number | undefined;

  try {
    const usuario = await prisma.usuario.create({
      data: {
        nombre: "Test deudas",
        email: `test-deudas-${sufijo}@example.com`,
        passwordHash: "test",
      },
    });
    usuarioId = usuario.id;

    const cliente = await prisma.cliente.create({
      data: { nombre: `Cliente test deudas ${sufijo}` },
    });
    clienteId = cliente.id;

    const sinTrabajos = await prisma.pedido.create({
      data: {
        clienteId,
        usuarioId,
        estado: "PENDIENTE",
        sena: 0,
        restaPagar: 50000,
      },
    });
    pedidoIds.push(sinTrabajos.id);

    const sinTrabajosParcial = await prisma.pedido.create({
      data: {
        clienteId,
        usuarioId,
        estado: "PENDIENTE",
        sena: 10000,
        restaPagar: 40000,
      },
    });
    pedidoIds.push(sinTrabajosParcial.id);

    const conTrabajos = await prisma.pedido.create({
      data: {
        clienteId,
        usuarioId,
        estado: "PENDIENTE",
        sena: 500,
        envio: 500,
        trabajos: {
          create: [
            {
              descripcion: "Trabajo de prueba",
              cantidad: 2,
              valorUnitario: 1000,
            },
          ],
        },
      },
    });
    pedidoIds.push(conTrabajos.id);

    const pedidoCompleto = await prisma.pedido.findUniqueOrThrow({
      where: { id: conTrabajos.id },
      include: { trabajos: true },
    });

    await requestContext.run({ usuarioId }, async () => {
      console.log("== 1) Pedido SIN trabajos, restaPagar 50000, pago total sin monto ==");
      console.log("antes:              ", await estadoPedido(sinTrabajos.id));
      console.log(
        "lógica anterior:    ",
        logicaAnterior({
          sena: sinTrabajos.sena,
          restaPagar: sinTrabajos.restaPagar,
          envio: sinTrabajos.envio,
          trabajos: [],
        })
      );
      await pedidoService.pagar(sinTrabajos.id);
      console.log("después (fix):      ", await estadoPedido(sinTrabajos.id));

      console.log("\n== 2) Pedido SIN trabajos, restaPagar 40000, pago parcial de 15000 ==");
      console.log("antes:              ", await estadoPedido(sinTrabajosParcial.id));
      console.log(
        "lógica anterior:    ",
        logicaAnterior(
          {
            sena: sinTrabajosParcial.sena,
            restaPagar: sinTrabajosParcial.restaPagar,
            envio: sinTrabajosParcial.envio,
            trabajos: [],
          },
          15000
        )
      );
      await pedidoService.pagar(sinTrabajosParcial.id, 15000);
      console.log("después (fix):      ", await estadoPedido(sinTrabajosParcial.id));

      console.log("\n== 3) Pedido CON trabajos + envío, pago total ==");
      console.log("antes:              ", await estadoPedido(conTrabajos.id));
      console.log(
        "lógica anterior:    ",
        logicaAnterior({
          sena: pedidoCompleto.sena,
          restaPagar: pedidoCompleto.restaPagar,
          envio: pedidoCompleto.envio,
          trabajos: pedidoCompleto.trabajos,
        })
      );
      await pedidoService.pagar(conTrabajos.id);
      console.log("después (fix):      ", await estadoPedido(conTrabajos.id));
    });
  } finally {
    if (pedidoIds.length > 0) {
      await prisma.historial.deleteMany({
        where: { entidad: "pedido", entidadId: { in: pedidoIds } },
      });
      await prisma.trabajo.deleteMany({ where: { pedidoId: { in: pedidoIds } } });
      await prisma.pedido.deleteMany({ where: { id: { in: pedidoIds } } });
    }
    if (clienteId !== undefined) {
      await prisma.cliente.deleteMany({ where: { id: clienteId } });
    }
    if (usuarioId !== undefined) {
      await prisma.usuario.deleteMany({ where: { id: usuarioId } });
    }
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
