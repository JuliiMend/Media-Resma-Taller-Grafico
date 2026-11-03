import assert from "node:assert/strict";
import { HttpError } from "../utils/http-error";
import { calcularPago, type DatosPago } from "./pedido.pagos";

const trabajo = (cantidad: number, valorUnitario: number) => ({
  cantidad,
  valorUnitario,
});

const base: DatosPago = {
  estado: "PENDIENTE",
  trabajos: [],
  envio: 0,
  sena: 0,
  restaPagar: 0,
};

const casos: Array<[string, () => void]> = [
  [
    "pedido con trabajos: pago total calcula desde trabajos",
    () => {
      const pago = calcularPago({
        ...base,
        trabajos: [trabajo(2, 1000)],
        sena: 500,
        restaPagar: 1500,
      });
      assert.deepEqual(pago, {
        sena: 2000,
        restaPagar: 0,
        montoAplicado: 1500,
      });
    },
  ],
  [
    "pedido con trabajos + envío: el envío entra en el saldo",
    () => {
      const pago = calcularPago({
        ...base,
        trabajos: [trabajo(2, 1000)],
        envio: 500,
        sena: 500,
        restaPagar: 2000,
      });
      assert.deepEqual(pago, {
        sena: 2500,
        restaPagar: 0,
        montoAplicado: 2000,
      });
    },
  ],
  [
    "pedido sin trabajos: usa el restaPagar guardado y lo salda",
    () => {
      const pago = calcularPago({
        ...base,
        sena: 0,
        restaPagar: 50000,
      });
      assert.deepEqual(pago, {
        sena: 50000,
        restaPagar: 0,
        montoAplicado: 50000,
      });
    },
  ],
  [
    "pedido sin trabajos: pago parcial descuenta del restaPagar guardado",
    () => {
      const pago = calcularPago({
        ...base,
        sena: 10000,
        restaPagar: 40000,
        monto: 15000,
      });
      assert.deepEqual(pago, {
        sena: 25000,
        restaPagar: 25000,
        montoAplicado: 15000,
      });
    },
  ],
  [
    "pedido con trabajos: pago parcial mantiene el saldo restante",
    () => {
      const pago = calcularPago({
        ...base,
        trabajos: [trabajo(1, 3000)],
        sena: 500,
        restaPagar: 2500,
        monto: 1000,
      });
      assert.deepEqual(pago, {
        sena: 1500,
        restaPagar: 1500,
        montoAplicado: 1000,
      });
    },
  ],
  [
    "pago mayor al saldo: 400 con mensaje claro",
    () => {
      assert.throws(
        () =>
          calcularPago({
            ...base,
            sena: 0,
            restaPagar: 50000,
            monto: 50001,
          }),
        (err: unknown) => {
          assert.ok(err instanceof HttpError);
          assert.equal(err.status, 400);
          assert.match(err.message, /no puede superar el saldo pendiente/i);
          return true;
        },
      );
    },
  ],
  [
    "pedido cancelado: 409 aunque tenga saldo",
    () => {
      assert.throws(
        () =>
          calcularPago({
            ...base,
            estado: "CANCELADO",
            restaPagar: 50000,
          }),
        (err: unknown) => {
          assert.ok(err instanceof HttpError);
          assert.equal(err.status, 409);
          assert.match(err.message, /cancelado/i);
          return true;
        },
      );
    },
  ],
  [
    "pedido sin saldo y sin monto: 409, no 200 sin cambios",
    () => {
      assert.throws(
        () => calcularPago({ ...base, trabajos: [trabajo(1, 1000)], sena: 1000 }),
        (err: unknown) => {
          assert.ok(err instanceof HttpError);
          assert.equal(err.status, 409);
          assert.match(err.message, /no tiene saldo pendiente/i);
          return true;
        },
      );
    },
  ],
  [
    "pedido sin saldo con monto: 400, nunca registra un pago de $0",
    () => {
      assert.throws(
        () => calcularPago({ ...base, restaPagar: 0, monto: 1000 }),
        (err: unknown) => {
          assert.ok(err instanceof HttpError);
          assert.equal(err.status, 400);
          return true;
        },
      );
    },
  ],
];

for (const [nombre, ejecutar] of casos) {
  ejecutar();
  console.log(`OK ${nombre}`);
}

console.log(`\n${casos.length} casos OK`);
