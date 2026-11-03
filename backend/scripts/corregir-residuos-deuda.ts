import "./cargar-env";
import { PrismaClient } from "@prisma/client";
import { UMBRAL_DEUDA } from "../src/utils/dinero";
import { exigirBaseLocal } from "./seguridad";

/**
 * Corrige los residuos de deuda de menos de un centavo (0 < restaPagar < 0.01).
 *
 * Por defecto corre en modo dry-run y solo lista los pedidos. Para aplicar:
 *
 *   CONFIRMO=SI pnpm --filter backend corregir:residuos -- --aplicar
 *
 * En PowerShell:
 *   $env:CONFIRMO="SI"; corepack pnpm corregir:residuos -- --aplicar
 *
 * Solo corre contra una base local.
 */
async function main() {
  exigirBaseLocal(false);

  const aplicar =
    process.argv.includes("--aplicar") && !process.argv.includes("--dry-run");

  if (aplicar && process.env.CONFIRMO !== "SI") {
    console.error(
      "Para aplicar los cambios tenés que definir CONFIRMO=SI.\n" +
        "Sin eso el script corre en modo dry-run."
    );
    process.exit(1);
  }

  const prisma = new PrismaClient();
  try {
    const where = {
      restaPagar: { gt: 0, lt: UMBRAL_DEUDA },
    };

    const pedidos = await prisma.pedido.findMany({
      where,
      orderBy: { id: "asc" },
      include: { cliente: { select: { nombre: true } } },
    });

    if (pedidos.length === 0) {
      console.log("No hay residuos de deuda menores a $0,01.");
      return;
    }

    console.log(
      `Pedidos con 0 < restaPagar < ${UMBRAL_DEUDA}: ${pedidos.length}\n`
    );
    console.table(
      pedidos.map((p) => ({
        id: p.id,
        cliente: p.cliente.nombre,
        sena: Number(p.sena ?? 0),
        restaPagar: Number(p.restaPagar ?? 0),
      }))
    );

    if (!aplicar) {
      console.log(
        "Dry run: no se modificó ningún dato.\n" +
          "Para aplicar: CONFIRMO=SI ... --aplicar"
      );
      return;
    }

    const corregidos = await prisma.$transaction(async (tx) => {
      const resultado = await tx.pedido.updateMany({
        where: {
          id: { in: pedidos.map((p) => p.id) },
          restaPagar: { gt: 0, lt: UMBRAL_DEUDA },
        },
        data: { restaPagar: 0 },
      });
      return resultado.count;
    });

    console.log(`Se corrigieron ${corregidos} pedidos.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
