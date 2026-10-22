import { useEffect, useState, type FormEvent } from "react";
import { api, getErrorMessage } from "@/api/client";
import { Button, ErrorBanner, Field, Input, Modal } from "@/components/ui";
import { SearchSelect } from "@/components/SearchSelect";
import { ProductoQuickModal } from "@/components/QuickCreate";
import { toNumber } from "@/lib/format";
import type { Producto, Trabajo } from "@/types";

export function TrabajoFormModal({
  open,
  onClose,
  onSaved,
  pedidoId,
  trabajo,
  productos,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
  pedidoId: number;
  trabajo?: Trabajo | null;
  productos: Producto[];
}) {
  const [productoId, setProductoId] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [cantidad, setCantidad] = useState("1");
  const [valorUnitario, setValorUnitario] = useState("");
  const [costo, setCosto] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [productoModal, setProductoModal] = useState(false);

  const editando = Boolean(trabajo);
  const productosActivos = productos.filter((p) => p.activo || String(p.id) === productoId);
  const productoOptions = productosActivos.map((p) => ({ value: String(p.id), label: p.nombre }));

  useEffect(() => {
    if (!open) return;
    setError(null);
    setProductoId(trabajo?.productoId ? String(trabajo.productoId) : "");
    setDescripcion(trabajo?.descripcion ?? "");
    setCantidad(String(trabajo ? toNumber(trabajo.cantidad) : 1));
    setValorUnitario(trabajo ? String(toNumber(trabajo.valorUnitario)) : "");
    setCosto(trabajo && trabajo.costoUnitario !== null && trabajo.costoUnitario !== undefined ? String(toNumber(trabajo.costoUnitario)) : "");
  }, [open, trabajo]);

  function selectProducto(value: string) {
    setProductoId(value);
    const producto = productos.find((p) => String(p.id) === value);
    if (!producto) return;
    setDescripcion(producto.nombre);
    setValorUnitario(String(toNumber(producto.precioVenta)));
    setCosto(producto.costo === null || producto.costo === undefined ? "" : String(toNumber(producto.costo)));
  }

  function productoCreado(producto: Producto) {
    setProductoId(String(producto.id));
    setDescripcion(producto.nombre);
    setValorUnitario(producto.precioVenta === null || producto.precioVenta === undefined ? "" : String(toNumber(producto.precioVenta)));
    setCosto(producto.costo === null || producto.costo === undefined ? "" : String(toNumber(producto.costo)));
    setProductoModal(false);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!descripcion.trim()) return setError("Completá la descripción");
    if (toNumber(cantidad) <= 0) return setError("La cantidad debe ser mayor a 0");
    if (valorUnitario === "") return setError("Completá el valor unitario");

    setSaving(true);
    setError(null);
    try {
      const payload = {
        productoId: productoId ? Number(productoId) : null,
        descripcion: descripcion.trim(),
        cantidad: toNumber(cantidad),
        valorUnitario: toNumber(valorUnitario),
        costoUnitario: costo === "" ? null : Number(costo),
      };
      if (trabajo?.id) await api.patch(`/trabajos/${trabajo.id}`, payload);
      else await api.post("/trabajos", { ...payload, pedidoId });
      await onSaved();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={editando ? "Editar trabajo" : "Agregar trabajo"}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="Producto" htmlFor="t-producto">
          <SearchSelect
            id="t-producto"
            options={productoOptions}
            value={productoId}
            onChange={selectProducto}
            placeholder="Buscar producto…"
            emptyLabel="Personalizado"
            clearable
            createLabel="+ Crear producto nuevo"
            onCreate={() => setProductoModal(true)}
          />
        </Field>
        <Field label="Descripción *" htmlFor="t-desc">
          <Input id="t-desc" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Cantidad" htmlFor="t-cant">
            <Input id="t-cant" type="number" min={0} step="any" inputMode="decimal" value={cantidad} onChange={(e) => setCantidad(e.target.value)} className="min-w-[7rem] text-right tabular-nums" />
          </Field>
          <Field label="Valor unitario" htmlFor="t-valor">
            <Input id="t-valor" type="number" min={0} step="0.01" value={valorUnitario} onChange={(e) => setValorUnitario(e.target.value)} />
          </Field>
          <Field label="Costo unitario" htmlFor="t-costo">
            <Input id="t-costo" type="number" min={0} step="0.01" value={costo} onChange={(e) => setCosto(e.target.value)} placeholder="Sin costo" />
          </Field>
        </div>
        {error && <ErrorBanner message={error} />}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" loading={saving}>
            {editando ? "Guardar cambios" : "Agregar trabajo"}
          </Button>
        </div>
      </form>

      <ProductoQuickModal open={productoModal} onClose={() => setProductoModal(false)} onCreated={productoCreado} />
    </Modal>
  );
}
