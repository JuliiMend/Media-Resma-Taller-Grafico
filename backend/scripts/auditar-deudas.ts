import "./cargar-env";
import { PrismaClient } from "@prisma/client";
import { exigirBaseLocal } from "./seguridad";

/**
 * Lista pedidos sin trabajos con restaPagar > 0 (solo lectura).
 *
 * Esos pedidos son los que la lógica vieja de `pagar` no podía saldar. El
 * script no modifica nada: sirve para revisarlos a mano.
 *
 * Uso:
 *   pnpm --filter backend auditar:deudas
 *   pnpm --filter backend auditar:deudas -- --permitir-remoto
 */
async function main() {
  const permitirRemoto = process.argv.includes("--permitir-remoto");
  exigirBaseLocal(permitirRemoto);

  const prisma = new PrismaClient();
  try {
    const pedidos = await prisma.pedido.findMany({
      where: {
        estado: { not: "CANCELADO" },
        restaPagar: { gt: 0 },
        trabajos: { none: {} },
      },
      orderBy: { id: "asc" },
      include: {
        cliente: { select: { nombre: true } },
        _count: { select: { trabajos: true } },
      },
    });

    if (pedidos.length === 0) {
      console.log("No hay pedidos sin trabajos con saldo pendiente.");
      return;
    }

    console.log(
      `Pedidos sin trabajos con restaPagar > 0: ${pedidos.length}\n`
    );
    console.table(
      pedidos.map((p) => ({
        id: p.id,
        cliente: p.cliente.nombre,
        sena: Number(p.sena ?? 0),
        restaPagar: Number(p.restaPagar ?? 0),
        trabajos: p._count.trabajos,
        estado: p.estado,
      }))
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
