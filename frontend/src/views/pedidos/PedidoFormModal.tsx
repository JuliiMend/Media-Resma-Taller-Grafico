import { useEffect, useState, type FormEvent } from "react";
import { Plus, Trash2 } from "lucide-react";
import { api, getErrorMessage } from "@/api/client";
import { useAuth } from "@/auth/AuthContext";
import { Button, ErrorBanner, Field, Input, Modal, Select, Textarea } from "@/components/ui";
import { SearchSelect } from "@/components/SearchSelect";
import { ClienteQuickModal, ProductoQuickModal } from "@/components/QuickCreate";
import { cn, formatMoney, toDateInput, toNumber } from "@/lib/format";
import type { Cliente, Pedido, Producto } from "@/types";
import { ESTADOS_PEDIDO } from "./estados";

interface Linea {
  key: number;
  productoId: string;
  descripcion: string;
  cantidad: string;
  valorUnitario: string;
}

let lineaKey = 0;
const nuevaLinea = (): Linea => ({ key: ++lineaKey, productoId: "", descripcion: "", cantidad: "1", valorUnitario: "" });

export function PedidoFormModal({
  open,
  onClose,
  onCreated,
  clientes,
  productos,
  pedido,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  clientes: Cliente[];
  productos: Producto[];
  pedido?: Pedido | null;
}) {
  const { user } = useAuth();
  const [clienteId, setClienteId] = useState("");
  const [estado, setEstado] = useState("PENDIENTE");
  const [fechaEntrega, setFechaEntrega] = useState("");
  const [sena, setSena] = useState("");
  const [envio, setEnvio] = useState("");
  const [medioPago, setMedioPago] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [lineas, setLineas] = useState<Linea[]>(() => [nuevaLinea()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clienteModal, setClienteModal] = useState(false);
  const [productoModal, setProductoModal] = useState(false);
  const [lineaProducto, setLineaProducto] = useState<number | null>(null);

  const editando = Boolean(pedido);
  const clientesActivos = clientes.filter((c) => c.activo !== false);
  const productosActivos = productos.filter((p) => p.activo);
  const clienteOptions = clientesActivos.map((c) => ({ value: String(c.id), label: c.nombre }));
  const productoOptions = productosActivos.map((p) => ({ value: String(p.id), label: p.nombre }));

  const subtotal = lineas.reduce((s, l) => s + toNumber(l.cantidad) * toNumber(l.valorUnitario), 0);
  const total = subtotal + toNumber(envio);
  const resta = Math.max(0, total - toNumber(sena));

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (pedido) {
      setClienteId(String(pedido.clienteId));
      setEstado(pedido.estado);
      setFechaEntrega(toDateInput(pedido.fechaEntrega));
      setEnvio(pedido.envio === null || pedido.envio === undefined ? "" : String(toNumber(pedido.envio)));
      setMedioPago(pedido.medioPago ?? "");
      setObservaciones(pedido.observaciones ?? "");
      setSena("");
    } else {
      setClienteId("");
      setEstado("PENDIENTE");
      setFechaEntrega("");
      setSena("");
      setEnvio("");
      setMedioPago("");
      setObservaciones("");
      setLineas([nuevaLinea()]);
    }
  }, [open, pedido]);

  function updateLinea(key: number, patch: Partial<Linea>) {
    setLineas((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  function selectProducto(key: number, productoId: string) {
    const producto = productos.find((p) => String(p.id) === productoId);
    updateLinea(key, {
      productoId,
      ...(producto && { descripcion: producto.nombre, valorUnitario: String(toNumber(producto.precioVenta)) }),
    });
  }

  function productoCreado(producto: Producto) {
    if (lineaProducto !== null) {
      updateLinea(lineaProducto, {
        productoId: String(producto.id),
        descripcion: producto.nombre,
        valorUnitario: producto.precioVenta === null || producto.precioVenta === undefined ? "" : String(toNumber(producto.precioVenta)),
      });
    }
    setProductoModal(false);
    setLineaProducto(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!clienteId) return setError("Elegí un cliente");

    if (pedido) {
      setSaving(true);
      setError(null);
      try {
        await api.patch(`/pedidos/${pedido.id}`, {
          clienteId: Number(clienteId),
          estado,
          fechaEntrega: fechaEntrega ? new Date(`${fechaEntrega}T00:00:00.000Z`).toISOString() : undefined,
          envio: envio !== "" ? toNumber(envio) : null,
          medioPago: medioPago.trim() || undefined,
          observaciones: observaciones.trim() || undefined,
        });
        onCreated();
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setSaving(false);
      }
      return;
    }

    const lineasValidas = lineas.filter((l) => l.descripcion.trim());
    if (lineasValidas.some((l) => toNumber(l.cantidad) <= 0)) return setError("La cantidad de cada trabajo debe ser mayor a 0");
    if (lineasValidas.some((l) => l.valorUnitario === "")) return setError("Completá el valor unitario de cada trabajo");

    setSaving(true);
    setError(null);
    try {
      await api.post("/pedidos", {
        clienteId: Number(clienteId),
        usuarioId: user?.id ?? null,
        estado,
        fechaEntrega: fechaEntrega ? new Date(`${fechaEntrega}T00:00:00.000Z`).toISOString() : undefined,
        sena: sena ? toNumber(sena) : 0,
        envio: envio ? toNumber(envio) : null,
        medioPago: medioPago.trim() || undefined,
        observaciones: observaciones.trim() || undefined,
        trabajos: lineasValidas.map((l) => ({
          productoId: l.productoId ? Number(l.productoId) : null,
          descripcion: l.descripcion.trim(),
          cantidad: toNumber(l.cantidad),
          valorUnitario: toNumber(l.valorUnitario),
        })),
      });
      onCreated();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={editando ? `Editar pedido #${pedido?.id}` : "Nuevo pedido"} size="lg">
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Cliente *" htmlFor="p-cliente">
            <SearchSelect
              id="p-cliente"
              options={clienteOptions}
              value={clienteId}
              onChange={setClienteId}
              placeholder="Buscar cliente…"
              createLabel="+ Crear cliente nuevo"
              onCreate={() => setClienteModal(true)}
            />
          </Field>
          <Field label="Estado" htmlFor="p-estado">
            <Select id="p-estado" value={estado} onChange={(e) => setEstado(e.target.value)}>
              {ESTADOS_PEDIDO.map((e) => (
                <option key={e.value} value={e.value}>
                  {e.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Fecha de entrega" htmlFor="p-entrega">
            <Input id="p-entrega" type="date" value={fechaEntrega} onChange={(e) => setFechaEntrega(e.target.value)} />
          </Field>
          <Field label="Medio de pago" htmlFor="p-medio">
            <Input id="p-medio" value={medioPago} onChange={(e) => setMedioPago(e.target.value)} placeholder="Efectivo, transferencia…" />
          </Field>
        </div>

        {!editando && (
          <fieldset className="flex flex-col gap-3">
            <legend className="mb-2 text-sm font-semibold">Trabajos</legend>
            {lineas.map((l, idx) => (
              <div
                key={l.key}
                className="grid gap-3 rounded-lg border border-line bg-background/50 p-3 sm:grid-cols-2 lg:grid-cols-[minmax(10rem,1.5fr)_minmax(10rem,1.5fr)_7rem_9rem_2.5rem] lg:items-end"
              >
                <div className="min-w-0">
                  <Field label="Producto" htmlFor={`l-prod-${l.key}`}>
                    <SearchSelect
                      id={`l-prod-${l.key}`}
                      options={productoOptions}
                      value={l.productoId}
                      onChange={(value) => selectProducto(l.key, value)}
                      placeholder="Buscar producto…"
                      emptyLabel="Personalizado"
                      clearable
                      createLabel="+ Crear producto nuevo"
                      onCreate={() => {
                        setLineaProducto(l.key);
                        setProductoModal(true);
                      }}
                    />
                  </Field>
                </div>
                <div className="min-w-0">
                  <Field label="Descripción" htmlFor={`l-desc-${l.key}`}>
                    <Input id={`l-desc-${l.key}`} value={l.descripcion} onChange={(e) => updateLinea(l.key, { descripcion: e.target.value })} />
                  </Field>
                </div>
                <div className="min-w-0">
                  <Field label="Cant." htmlFor={`l-cant-${l.key}`}>
                    <Input
                      id={`l-cant-${l.key}`}
                      type="number"
                      min={0}
                      step="any"
                      inputMode="decimal"
                      value={l.cantidad}
                      onChange={(e) => updateLinea(l.key, { cantidad: e.target.value })}
                      className="min-w-[7rem] text-right tabular-nums"
                    />
                  </Field>
                </div>
                <div className="min-w-0">
                  <Field label="Valor unit." htmlFor={`l-val-${l.key}`}>
                    <Input
                      id={`l-val-${l.key}`}
                      type="number"
                      min={0}
                      step="0.01"
                      value={l.valorUnitario}
                      onChange={(e) => updateLinea(l.key, { valorUnitario: e.target.value })}
                      className="text-right tabular-nums"
                    />
                  </Field>
                </div>
                <div className="flex justify-end lg:justify-self-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setLineas((ls) => (ls.length > 1 ? ls.filter((x) => x.key !== l.key) : [nuevaLinea()]))}
                    aria-label={`Quitar trabajo ${idx + 1}`}
                    className="text-danger hover:bg-danger-soft"
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            ))}
            <Button type="button" variant="secondary" size="sm" className="self-start" onClick={() => setLineas((ls) => [...ls, nuevaLinea()])}>
              <Plus className="size-4" aria-hidden="true" />
              Agregar trabajo
            </Button>
          </fieldset>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          {!editando && (
            <Field label="Seña" htmlFor="p-sena">
              <Input id="p-sena" type="number" min={0} step="0.01" value={sena} onChange={(e) => setSena(e.target.value)} />
            </Field>
          )}
          <Field label="Envío" htmlFor="p-envio">
            <Input id="p-envio" type="number" min={0} step="0.01" value={envio} onChange={(e) => setEnvio(e.target.value)} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Observaciones" htmlFor="p-obs">
              <Textarea id="p-obs" value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
            </Field>
          </div>
        </div>

        {!editando && (
          <dl className="grid grid-cols-3 gap-4 rounded-lg bg-background p-4 text-sm">
            <div>
              <dt className="text-xs text-muted">Total</dt>
              <dd className="font-semibold tabular-nums">{formatMoney(total)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Seña</dt>
              <dd className="font-semibold tabular-nums">{formatMoney(sena)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Resta pagar</dt>
              <dd className={cn("font-semibold tabular-nums", resta > 0 ? "text-danger" : "text-success")}>{formatMoney(resta)}</dd>
            </div>
          </dl>
        )}

        {error && <ErrorBanner message={error} />}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" loading={saving}>
            {editando ? "Guardar cambios" : "Crear pedido"}
          </Button>
        </div>
      </form>

      <ClienteQuickModal
        open={clienteModal}
        onClose={() => setClienteModal(false)}
        onCreated={(cliente) => {
          setClienteId(String(cliente.id));
          setClienteModal(false);
        }}
      />
      <ProductoQuickModal open={productoModal} onClose={() => setProductoModal(false)} onCreated={productoCreado} />
    </Modal>
  );
}
