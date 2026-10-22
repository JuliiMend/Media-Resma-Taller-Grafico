import { useEffect, useState, type FormEvent } from "react";
import { mutate } from "swr";
import { api, getErrorMessage } from "@/api/client";
import { Button, ErrorBanner, Field, Input, Modal, Select, Textarea } from "@/components/ui";
import { UNIDADES_PRODUCTO } from "@/lib/unidades";
import { useRegistrarHistorial } from "@/lib/useHistorial";
import type { Cliente, Insumo, Producto, TipoProducto } from "@/types";

export function ClienteQuickModal({
  open,
  onClose,
  onCreated,
  initialNombre = "",
  initialTelefono = "",
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (cliente: Cliente) => void;
  initialNombre?: string;
  initialTelefono?: string;
}) {
  const registrar = useRegistrarHistorial();
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [userContacto, setUserContacto] = useState("");
  const [notas, setNotas] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setNombre(initialNombre);
      setTelefono(initialTelefono);
      setUserContacto("");
      setNotas("");
      setError(null);
    }
  }, [open, initialNombre, initialTelefono]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!nombre.trim()) return setError("Completá el nombre");
    setSaving(true);
    setError(null);
    try {
      const { data } = await api.post<Cliente>("/clientes", {
        nombre: nombre.trim(),
        telefono: telefono.trim() || undefined,
        userContacto: userContacto.trim() || undefined,
        notas: notas.trim() || undefined,
      });
      await mutate("/clientes");
      void registrar("CREAR", "cliente", data.id, `Creó cliente "${data.nombre}"`);
      onCreated(data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Nuevo cliente">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="Nombre *" htmlFor="qc-cliente-nombre">
          <Input
            id="qc-cliente-nombre"
            autoFocus
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Nombre o razón social"
          />
        </Field>
        <Field label="Teléfono" htmlFor="qc-cliente-tel">
          <Input id="qc-cliente-tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="11 5555-5555" />
        </Field>
        <Field label="Usuario de contacto" htmlFor="qc-cliente-contacto">
          <Input id="qc-cliente-contacto" value={userContacto} onChange={(e) => setUserContacto(e.target.value)} />
        </Field>
        <Field label="Notas" htmlFor="qc-cliente-notas">
          <Textarea id="qc-cliente-notas" value={notas} onChange={(e) => setNotas(e.target.value)} />
        </Field>
        {error && <ErrorBanner message={error} />}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" loading={saving}>
            Crear cliente
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export function ProductoQuickModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (producto: Producto) => void;
}) {
  const registrar = useRegistrarHistorial();
  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState<TipoProducto>("PROPIO");
  const [precioVenta, setPrecioVenta] = useState("");
  const [costo, setCosto] = useState("");
  const [unidad, setUnidad] = useState<string>("u");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setNombre("");
      setTipo("PROPIO");
      setPrecioVenta("");
      setCosto("");
      setUnidad("u");
      setError(null);
    }
  }, [open]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!nombre.trim()) return setError("Completá el nombre");
    setSaving(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        nombre: nombre.trim(),
        tipo,
        unidad,
        activo: true,
      };
      if (precioVenta !== "") payload.precioVenta = Number(precioVenta);
      if (costo !== "") payload.costo = Number(costo);
      const { data } = await api.post<Producto>("/productos", payload);
      await mutate("/productos");
      void registrar("CREAR", "producto", data.id, `Creó producto "${data.nombre}"`);
      onCreated(data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Nuevo producto">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="Nombre *" htmlFor="qc-prod-nombre">
          <Input id="qc-prod-nombre" autoFocus value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre del producto" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Tipo" htmlFor="qc-prod-tipo">
            <Select id="qc-prod-tipo" value={tipo} onChange={(e) => setTipo(e.target.value as TipoProducto)}>
              <option value="PROPIO">Propio</option>
              <option value="TERCERIZADO">Tercerizado</option>
            </Select>
          </Field>
          <Field label="Unidad" htmlFor="qc-prod-unidad">
            <Select id="qc-prod-unidad" value={unidad} onChange={(e) => setUnidad(e.target.value)}>
              {UNIDADES_PRODUCTO.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Precio de venta" htmlFor="qc-prod-precio">
            <Input id="qc-prod-precio" type="number" min={0} step="0.01" value={precioVenta} onChange={(e) => setPrecioVenta(e.target.value)} />
          </Field>
          <Field label="Costo" htmlFor="qc-prod-costo">
            <Input id="qc-prod-costo" type="number" min={0} step="0.01" value={costo} onChange={(e) => setCosto(e.target.value)} />
          </Field>
        </div>
        {error && <ErrorBanner message={error} />}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" loading={saving}>
            Crear producto
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export function InsumoQuickModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (insumo: Insumo) => void;
}) {
  const registrar = useRegistrarHistorial();
  const [nombre, setNombre] = useState("");
  const [unidad, setUnidad] = useState<string>("u");
  const [stockMinimo, setStockMinimo] = useState("");
  const [precioUnitario, setPrecioUnitario] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setNombre("");
      setUnidad("u");
      setStockMinimo("");
      setPrecioUnitario("");
      setError(null);
    }
  }, [open]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!nombre.trim()) return setError("Completá el nombre");
    setSaving(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        nombre: nombre.trim(),
        unidad,
        stockActual: 0,
        stockMinimo: stockMinimo === "" ? 0 : Number(stockMinimo),
        precioUnitario: precioUnitario === "" ? 0 : Number(precioUnitario),
        activo: true,
      };
      const { data } = await api.post<Insumo>("/insumos", payload);
      await mutate("/insumos");
      void registrar("CREAR", "insumo", data.id, `Creó insumo "${data.nombre}"`);
      onCreated(data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Nuevo insumo">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="Nombre *" htmlFor="qc-insumo-nombre">
          <Input id="qc-insumo-nombre" autoFocus value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre del insumo" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Unidad" htmlFor="qc-insumo-unidad">
            <Select id="qc-insumo-unidad" value={unidad} onChange={(e) => setUnidad(e.target.value)}>
              {UNIDADES_PRODUCTO.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Stock mínimo" htmlFor="qc-insumo-minimo">
            <Input id="qc-insumo-minimo" type="number" min={0} step="any" inputMode="decimal" value={stockMinimo} onChange={(e) => setStockMinimo(e.target.value)} />
          </Field>
          <Field label="Precio unitario" htmlFor="qc-insumo-precio">
            <Input
              id="qc-insumo-precio"
              type="number"
              min={0}
              step="0.01"
              value={precioUnitario}
              onChange={(e) => setPrecioUnitario(e.target.value)}
            />
          </Field>
        </div>
        {error && <ErrorBanner message={error} />}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" loading={saving}>
            Crear insumo
          </Button>
        </div>
      </form>
    </Modal>
  );
}
