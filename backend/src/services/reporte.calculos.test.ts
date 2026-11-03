import assert from "node:assert/strict";
import {
  cajaEstimada,
  margenSobreVenta,
  periodoAnterior,
  resultadoMensual,
  variacionPorcentual,
} from "./reporte.calculos";

const casos: Array<[string, () => void]> = [
  [
    "variación normal",
    () => assert.equal(variacionPorcentual(120, 100), 20),
  ],
  [
    "variación con anterior 0 devuelve null",
    () => assert.equal(variacionPorcentual(120, 0), null),
  ],
  [
    "mes de febrero: período anterior es enero",
    () =>
      assert.deepEqual(periodoAnterior("2026-02-01", "2026-02-28"), {
        desde: "2026-01-01",
        hasta: "2026-01-31",
      }),
  ],
  [
    "febrero bisiesto: período anterior es enero",
    () =>
      assert.deepEqual(periodoAnterior("2024-02-01", "2024-02-29"), {
        desde: "2024-01-01",
        hasta: "2024-01-31",
      }),
  ],
  [
    "marzo completo: período anterior es febrero, no 31 días",
    () =>
      assert.deepEqual(periodoAnterior("2026-03-01", "2026-03-31"), {
        desde: "2026-02-01",
        hasta: "2026-02-28",
      }),
  ],
  [
    "rango de 1 día",
    () =>
      assert.deepEqual(periodoAnterior("2026-03-01", "2026-03-01"), {
        desde: "2026-02-28",
        hasta: "2026-02-28",
      }),
  ],
  [
    "rango de 10 días conserva la duración sin solaparse",
    () =>
      assert.deepEqual(periodoAnterior("2026-03-10", "2026-03-19"), {
        desde: "2026-02-28",
        hasta: "2026-03-09",
      }),
  ],
  [
    "rango que cruza de mes conserva la duración",
    () =>
      assert.deepEqual(periodoAnterior("2026-01-15", "2026-02-14"), {
        desde: "2025-12-15",
        hasta: "2026-01-14",
      }),
  ],
  [
    "margen sobre venta",
    () => assert.equal(margenSobreVenta(100, 1000), 10),
  ],
  [
    "margen sin ingresos devuelve null",
    () => assert.equal(margenSobreVenta(100, 0), null),
  ],
  [
    "resultado negativo",
    () => assert.equal(resultadoMensual(100, 250), -150),
  ],
  [
    "caja estimada",
    () => assert.equal(cajaEstimada(1000, 200, 300), 500),
  ],
];

for (const [nombre, ejecutar] of casos) {
  ejecutar();
  console.log(`✔ ${nombre}`);
}

console.log(`\n${casos.length} casos OK`);
