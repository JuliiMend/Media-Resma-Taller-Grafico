import assert from "node:assert/strict";
import test from "node:test";
import {
  gananciaUnitaria,
  margenSobreVenta,
  precioAlCambiarCosto,
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

test("costo 5000 con precio vacío: el precio queda igual al costo y el recargo es 0%", () => {
  const precio = precioAlCambiarCosto(5000, null, null);
  assert.equal(precio, 5000);
  assert.equal(recargoDesdePrecio(5000, precio), 0);
});

test("costo 5000 con recargo 50% da un precio de 7500", () => {
  assert.equal(precioDesdeCosto(5000, 50), 7500);
  assert.equal(precioAlCambiarCosto(5000, null, 50), 7500);
});

test("un precio cargado de 8000 no se pisa al cambiar el costo a 6000 y el recargo se recalcula", () => {
  const precio = precioAlCambiarCosto(6000, 8000, 50);
  assert.equal(precio, 8000);
  const recargo = recargoDesdePrecio(6000, precio);
  assert.ok(recargo !== null);
  assert.ok(Math.abs(recargo - 33.33333333333333) < 0.000001);
});

test("un precio vacío o en 0 no genera -100% ni se marca bajo costo", () => {
  assert.equal(recargoDesdePrecio(5000, 0), null);
  assert.equal(recargoDesdePrecio(5000, -1), null);
  assert.equal(precioAlCambiarCosto(5000, 0, null), 5000);
});

test("los porcentajes devuelven null cuando la base no es válida", () => {
  assert.equal(recargoDesdePrecio(0, 100), null);
  assert.equal(recargoDesdePrecio(-10, 100), null);
  assert.equal(margenSobreVenta(100, 0), null);
  assert.equal(margenSobreVenta(100, -1), null);
});
