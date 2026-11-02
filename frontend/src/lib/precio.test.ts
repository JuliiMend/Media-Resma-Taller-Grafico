import assert from "node:assert/strict";
import test from "node:test";
import {
  gananciaUnitaria,
  margenSobreVenta,
  precioDesdeCosto,
  recargoDesdePrecio,
} from "./precio";

test("precioDesdeCosto: costo 30000 con +50% da 45000", () => {
  assert.equal(precioDesdeCosto(30000, 50), 45000);
});

test("recargoDesdePrecio: costo 30000 y precio 110000 da 266,7%", () => {
  const recargo = recargoDesdePrecio(30000, 110000);
  assert.ok(recargo !== null);
  assert.ok(Math.abs(recargo - 266.6666666666667) < 0.000001);
});

test("margenSobreVenta: costo 30000 y precio 110000 da 72,7%", () => {
  const margen = margenSobreVenta(30000, 110000);
  assert.ok(margen !== null);
  assert.ok(Math.abs(margen - 72.72727272727273) < 0.000001);
});

test("gananciaUnitaria redondea el dinero a 2 decimales", () => {
  assert.equal(gananciaUnitaria(100.005, 150.009), 50);
  assert.equal(gananciaUnitaria(30000, 110000), 80000);
});

test("los porcentajes devuelven null cuando la base no es válida", () => {
  assert.equal(recargoDesdePrecio(0, 100), null);
  assert.equal(recargoDesdePrecio(-10, 100), null);
  assert.equal(margenSobreVenta(100, 0), null);
  assert.equal(margenSobreVenta(100, -1), null);
});
