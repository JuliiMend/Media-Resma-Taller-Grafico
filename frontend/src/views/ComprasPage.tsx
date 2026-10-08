import { useMemo, useState, type FormEvent } from "react";
import useSWR from "swr";
import { Plus, Search, Trash2 } from "lucide-react";
import { api, fetcher, getErrorMessage } from "@/api/client";
import {
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorBanner,
  Field,
  Input,
  LoadingState,
  Modal,
  PageHeader,
  Select,
} from "@/components/ui";
import { formatDate, formatMoney, toNumber } from "@/lib/format";
import { MEDIOS_PAGO_SUGERIDOS } from "@/lib/medios-pago";
import { useRegistrarHistorial } from "@/lib/useHistorial";
import type { Compra, Insumo } from "@/types";

const round3 = (n: number) => Math.round(n * 1000) / 1000;
const round2 = (n: number) => Math.round(n * 100) / 100;
const today = () => new Date().toISOString().slice(0, 10);

interface FormState {
  insumoId: string;
  cantidad: string;
  precio: string;
  fecha: string;
  medioPago: string;
  actualizarPrecio: boolean;
}

const emptyForm = (): FormState => ({ insumoId: "", cantidad: "", precio: "", fecha: today(), medioPago: "", actualizarPrecio: true });

export function ComprasPage() {
  const compras = useSWR<Compra[]>("/compras", fetcher);
  const insumos = useSWR<Insumo[]>("/insumos", fetcher);
  const registrar = useRegistrarHistorial();

  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<Compra | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const insumoById = useMemo(() => new Map((insumos.data ?? []).map((i) => [i.id, i])), [insumos.data]);
  const lista = useMemo(
    () => [...(compras.data ?? [])].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime() || b.id - a.id),
    [compras.data],
  );
  const filtered = query
    ? lista.filter((c) => {
        const q = query.toLowerCase();
        return (insumoById.get(c.insumoId)?.nombre ?? "").toLowerCase().includes(q) || (c.medioPago ?? "").toLowerCase().includes(q);
      })
    : lista;

  const selected = insumoById.get(Number(form.insumoId));
  const cantidadNum = Number(form.cantidad);
  const precioNum = Number(form.precio);
  const stockNuevo = selected && cantidadNum > 0 ? round3(toNumber(selected.stockActual) + cantidadNum) : null;
  const unitario = cantidadNum > 0 && precioNum >= 0 && form.precio !== "" ? round2(precioNum / cantidadNum) : null;
  const totalFiltrado = filtered.reduce((s, c) => s + toNumber(c.precio), 0);

  function openForm() {
    setForm(emptyForm());
    setFormError(null);
    setFormOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const insumoId = Number(form.insumoId);
    if (!insumoId) return setFormError("Elegí un insumo");
    if (!(cantidadNum > 0)) return setFormError("La cantidad debe ser mayor a 0");
    if (form.precio === "" || !(precioNum >= 0)) return setFormError("Ingresá el precio total de la compra");

    setSaving(true);
    setFormError(null);
    let compraId: number | undefined;
    let insumo: Insumo;
    try {
      // The backend only stores the purchase, so stock is replenished here from the freshest stock value.
      insumo = (await api.get<Insumo>(`/insumos/${insumoId}`)).data;
      const created = await api.post<Compra>("/compras", {
        insumoId,
        cantidad: cantidadNum,
        precio: precioNum,
        fecha: new Date(`${form.fecha || today()}T00:00:00.000Z`).toISOString(),
        medioPago: form.medioPago.trim() || undefined,
      });
      compraId = created.data.id;
      const changes: Record<string, number> = { stockActual: round3(toNumber(insumo.stockActual) + cantidadNum) };
      if (form.actualizarPrecio) changes.precioUnitario = round2(precioNum / cantidadNum);
      await api.patch(`/insumos/${insumoId}`, changes);
    } catch (err) {
      if (compraId) await api.delete(`/compras/${compraId}`).catch(() => undefined);
      setFormError(getErrorMessage(err));
      setSaving(false);
      return;
    }

    const stockMessage = `${toNumber(insumo.stockActual)} → ${round3(toNumber(insumo.stockActual) + cantidadNum)} ${insumo.unidad}`;
    await api.post("/movimientos-stock", { insumoId, tipo: "COMPRA", cantidad: cantidadNum }).catch(() => undefined);
    void registrar("CREAR", "compra", compraId, `Compra de ${cantidadNum} ${insumo.unidad} de "${insumo.nombre}" por ${formatMoney(precioNum)} (stock ${stockMessage})`);
    await Promise.all([compras.mutate(), insumos.mutate()]);
    setNotice(`Compra registrada. Stock de ${insumo.nombre}: ${stockMessage}.`);
    setSaving(false);
    setFormOpen(false);
  }

  async function handleDelete() {
    if (!toDelete) return;
    setDeleting(true);
    setActionError(null);
    setNotice(null);
    try {
      const insumo = await api
        .get<Insumo>(`/insumos/${toDelete.insumoId}`)
        .then((r) => r.data)
        .catch(() => null);
      await api.delete(`/compras/${toDelete.id}`);
      if (insumo) {
        const stock = Math.max(0, round3(toNumber(insumo.stockActual) - toNumber(toDelete.cantidad)));
        await api.patch(`/insumos/${insumo.id}`, { stockActual: stock });
      }
      void registrar("ELIMINAR", "compra", toDelete.id, `Eliminó la compra de ${toNumber(toDelete.cantidad)} ${insumo?.unidad ?? ""} de "${insumo?.nombre ?? `insumo #${toDelete.insumoId}`}" y descontó ese stock`);
      await Promise.all([compras.mutate(), insumos.mutate()]);
    } catch (err) {
      setActionError(getErrorMessage(err));
    } finally {
      setDeleting(false);
      setToDelete(null);
    }
  }

  const loading = compras.isLoading || insumos.isLoading;
  const error = compras.error ?? insumos.error;

  return (
    <div>
      <PageHeader
        title="Compras"
        description="Compras de insumos. Cada compra suma su cantidad al stock del insumo."
        action={
          <Button onClick={openForm}>
            <Plus className="size-4" aria-hidden="true" />
            Nueva compra
          </Button>
        }
      />

      {notice && (
        <div role="status" className="mb-4 rounded-lg border border-success/20 bg-success-soft px-4 py-3 text-sm text-success">
          {notice}
        </div>
      )}
      {actionError && (
        <div className="mb-4">
          <ErrorBanner message={actionError} />
        </div>
      )}

      {compras.data && (
        <div className="mb-6 inline-flex flex-col rounded-xl border border-line bg-surface px-5 py-4">
          <span className="text-xs text-muted">{query ? "Total filtrado" : "Total comprado"}</span>
          <span className="text-xl font-semibold tabular-nums">{formatMoney(totalFiltrado)}</span>
          <span className="mt-1 text-xs text-muted">
            {filtered.length} {filtered.length === 1 ? "compra" : "compras"}
          </span>
        </div>
      )}

      <div className="relative mb-4 max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
        <Input type="search" placeholder="Buscar por insumo o medio de pago…" aria-label="Buscar compras" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9" />
      </div>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorBanner
          message={getErrorMessage(error)}
          onRetry={() => {
            void compras.mutate();
            void insumos.mutate();
          }}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={lista.length ? "Sin resultados" : "Todavía no hay compras"}
          description={lista.length ? "Probá con otra búsqueda." : "Registrá la primera compra para reponer stock."}
        />
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-xl border border-line bg-surface md:block">
            <table className="w-full text-sm">
              <thead className="border-b border-line bg-background/60 text-left text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">Fecha</th>
                  <th scope="col" className="px-4 py-3 font-medium">Insumo</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">Cantidad</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">Precio total</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">Precio unit.</th>
                  <th scope="col" className="px-4 py-3 font-medium">Medio de pago</th>
                  <th scope="col" className="px-4 py-3"><span className="sr-only">Acciones</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filtered.map((c) => {
                  const insumo = insumoById.get(c.insumoId);
                  const cant = toNumber(c.cantidad);
                  return (
                    <tr key={c.id} className="hover:bg-ink/5">
                      <td className="px-4 py-3">{formatDate(c.fecha)}</td>
                      <td className="px-4 py-3 font-medium">{insumo?.nombre ?? `Insumo #${c.insumoId}`}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{cant} {insumo?.unidad}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{formatMoney(c.precio)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-muted">{cant > 0 ? formatMoney(toNumber(c.precio) / cant) : "—"}</td>
                      <td className="px-4 py-3">{c.medioPago || "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end">
                          <DeleteButton onClick={() => setToDelete(c)} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <ul className="flex flex-col gap-3 md:hidden">
            {filtered.map((c) => {
              const insumo = insumoById.get(c.insumoId);
              return (
                <li key={c.id} className="rounded-xl border border-line bg-surface p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium">{insumo?.nombre ?? `Insumo #${c.insumoId}`}</p>
                      <p className="text-xs text-muted">{formatDate(c.fecha)}</p>
                    </div>
                    <DeleteButton onClick={() => setToDelete(c)} />
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <div>
                      <dt className="text-xs text-muted">Cantidad</dt>
                      <dd>{toNumber(c.cantidad)} {insumo?.unidad}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted">Precio total</dt>
                      <dd>{formatMoney(c.precio)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted">Medio de pago</dt>
                      <dd>{c.medioPago || "—"}</dd>
                    </div>
                  </dl>
                </li>
              );
            })}
          </ul>
        </>
      )}

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title="Nueva compra">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field label="Insumo *" htmlFor="c-insumo">
            <Select id="c-insumo" required value={form.insumoId} onChange={(e) => setForm((f) => ({ ...f, insumoId: e.target.value }))}>
              <option value="">Elegí un insumo…</option>
              {(insumos.data ?? []).map((i) => (
                <option key={i.id} value={i.id}>
                  {i.nombre} ({toNumber(i.stockActual)} {i.unidad})
                </option>
              ))}
            </Select>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={`Cantidad *${selected ? ` (${selected.unidad})` : ""}`} htmlFor="c-cantidad">
              <Input id="c-cantidad" type="number" required min="0" step="0.01" value={form.cantidad} onChange={(e) => setForm((f) => ({ ...f, cantidad: e.target.value }))} />
            </Field>
            <Field label="Precio total *" htmlFor="c-precio" hint={unitario !== null ? `Equivale a ${formatMoney(unitario)} por unidad` : undefined}>
              <Input id="c-precio" type="number" required min="0" step="0.01" value={form.precio} onChange={(e) => setForm((f) => ({ ...f, precio: e.target.value }))} />
            </Field>
            <Field label="Fecha" htmlFor="c-fecha">
              <Input id="c-fecha" type="date" value={form.fecha} onChange={(e) => setForm((f) => ({ ...f, fecha: e.target.value }))} />
            </Field>
            <Field label="Medio de pago" htmlFor="c-medio">
              <Input id="c-medio" list="c-medio-options" value={form.medioPago} placeholder="Efectivo, transferencia…" onChange={(e) => setForm((f) => ({ ...f, medioPago: e.target.value }))} />
              <datalist id="c-medio-options">
                {MEDIOS_PAGO_SUGERIDOS.map((m) => (
                  <option key={m} value={m} />
                ))}
              </datalist>
            </Field>
          </div>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" className="size-4 accent-primary" checked={form.actualizarPrecio} onChange={(e) => setForm((f) => ({ ...f, actualizarPrecio: e.target.checked }))} />
            Actualizar el precio unitario del insumo con esta compra
          </label>
          {selected && stockNuevo !== null && (
            <p className="rounded-lg border border-line bg-background px-3 py-2 text-sm text-muted" role="status">
              Stock de <span className="font-medium text-ink">{selected.nombre}</span>: {toNumber(selected.stockActual)} →{" "}
              <span className="font-semibold text-ink">{stockNuevo}</span> {selected.unidad}
            </p>
          )}
          {formError && <ErrorBanner message={formError} />}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setFormOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" loading={saving}>
              Registrar compra
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={toDelete !== null}
        title="Eliminar compra"
        message={
          toDelete
            ? `Se eliminará la compra y se descontarán ${toNumber(toDelete.cantidad)} ${insumoById.get(toDelete.insumoId)?.unidad ?? ""} del stock de "${insumoById.get(toDelete.insumoId)?.nombre ?? "este insumo"}". ¿Continuar?`
            : ""
        }
        onConfirm={handleDelete}
        onCancel={() => setToDelete(null)}
        loading={deleting}
      />
    </div>
  );
}

function DeleteButton({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="ghost" size="icon" onClick={onClick} aria-label="Eliminar compra" className="text-danger hover:bg-danger-soft">
      <Trash2 className="size-4" aria-hidden="true" />
    </Button>
  );
}
