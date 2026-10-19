import { AlertTriangle } from "lucide-react";
import { CrudPage } from "@/components/CrudPage";
import { Badge } from "@/components/ui";
import { formatMoney, toNumber } from "@/lib/format";
import { UNIDADES_PRODUCTO } from "@/lib/unidades";
import type { Cliente, Insumo, Producto } from "@/types";

export function ClientesPage() {
  return (
    <CrudPage<Cliente>
      title="Clientes"
      description="Personas y empresas que hacen pedidos al taller."
      endpoint="/clientes"
      singular="cliente"
      searchKeys={["nombre", "telefono", "userContacto"]}
      fields={[
        { name: "nombre", label: "Nombre", type: "text", required: true, fullWidth: true },
        { name: "telefono", label: "Teléfono", type: "text", placeholder: "11 5555-5555", fullWidth: true },
        { name: "userContacto", label: "Usuario de contacto", type: "text", fullWidth: true },
        { name: "notas", label: "Notas", type: "textarea" },
      ]}
      columns={[
        { label: "Nombre", render: (c) => c.nombre, primary: true },
        { label: "Teléfono", render: (c) => c.telefono || "—" },
        { label: "Contacto", render: (c) => c.userContacto || "—" },
        { label: "Notas", render: (c) => <span className="line-clamp-1 text-muted">{c.notas || "—"}</span> },
      ]}
    />
  );
}

const isLowStock = (i: Insumo) => toNumber(i.stockActual) <= toNumber(i.stockMinimo);

export function InsumosPage() {
  return (
    <CrudPage<Insumo>
      title="Insumos"
      description="Materiales del taller. Se resaltan los que están en o por debajo del stock mínimo."
      endpoint="/insumos"
      singular="insumo"
      searchKeys={["nombre", "proveedor", "unidad"]}
      rowHighlight={isLowStock}
      summary={(items) => {
        const low = items.filter(isLowStock).length;
        if (low === 0) return null;
        return (
          <div className="flex items-center gap-3 rounded-lg border border-warning/20 bg-warning-soft px-4 py-3 text-sm text-warning" role="status">
            <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
            {low === 1 ? "1 insumo está con stock bajo." : `${low} insumos están con stock bajo.`}
          </div>
        );
      }}
      fields={[
        { name: "nombre", label: "Nombre", type: "text", required: true },
        { name: "unidad", label: "Unidad", type: "text", required: true, placeholder: "hojas, metros, litros…" },
        { name: "stockActual", label: "Stock actual", type: "number", defaultValue: "0" },
        { name: "stockMinimo", label: "Stock mínimo", type: "number", defaultValue: "0" },
        { name: "precioUnitario", label: "Precio unitario", type: "number", defaultValue: "0" },
        { name: "proveedor", label: "Proveedor", type: "text" },
      ]}
      columns={[
        {
          label: "Nombre",
          primary: true,
          render: (i) => (
            <span className="flex items-center gap-2">
              {i.nombre}
              {isLowStock(i) && <Badge tone="danger">Stock bajo</Badge>}
            </span>
          ),
        },
        { label: "Stock", align: "right", render: (i) => `${toNumber(i.stockActual)} ${i.unidad}` },
        { label: "Mínimo", align: "right", render: (i) => `${toNumber(i.stockMinimo)} ${i.unidad}` },
        { label: "Precio unit.", align: "right", render: (i) => formatMoney(i.precioUnitario) },
        { label: "Proveedor", render: (i) => i.proveedor || "—" },
      ]}
    />
  );
}

const margenFormatter = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 1 });

function costoDe(p: Producto): number | null {
  return p.costo === null || p.costo === undefined ? null : toNumber(p.costo);
}

export function ProductosPage() {
  return (
    <CrudPage<Producto>
      title="Productos"
      description="Catálogo de productos propios y tercerizados."
      endpoint="/productos"
      singular="producto"
      searchKeys={["nombre", "descripcion", "tipo"]}
      fields={[
        { name: "nombre", label: "Nombre", type: "text", required: true },
        {
          name: "tipo",
          label: "Tipo",
          type: "select",
          required: true,
          defaultValue: "PROPIO",
          options: [
            { value: "PROPIO", label: "Propio" },
            { value: "TERCERIZADO", label: "Tercerizado" },
          ],
        },
        { name: "precioVenta", label: "Precio de venta", type: "number", required: true },
        { name: "costo", label: "Costo", type: "number", nullable: true },
        {
          name: "unidad",
          label: "Unidad",
          type: "select",
          required: true,
          defaultValue: "u",
          options: UNIDADES_PRODUCTO.map((u) => ({ value: u, label: u })),
        },
        { name: "descripcion", label: "Descripción", type: "textarea" },
        { name: "activo", label: "Producto activo", type: "checkbox", defaultValue: true },
      ]}
      formSummary={(values) => {
        const precio = values.precioVenta === "" ? null : Number(values.precioVenta);
        const costo = values.costo === "" ? null : Number(values.costo);
        const disponible = precio !== null && costo !== null && Number.isFinite(precio) && Number.isFinite(costo);
        const ganancia = disponible ? (precio as number) - (costo as number) : null;
        const margen = disponible && (precio as number) > 0 ? ((ganancia as number) / (precio as number)) * 100 : null;
        return (
          <dl className="grid grid-cols-3 gap-4 rounded-lg bg-background p-4 text-sm">
            <div>
              <dt className="text-xs text-muted">Precio de venta</dt>
              <dd className="font-semibold tabular-nums">{precio === null ? "—" : formatMoney(precio)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Ganancia</dt>
              <dd className={ganancia !== null && ganancia < 0 ? "font-semibold tabular-nums text-danger" : "font-semibold tabular-nums text-success"}>
                {ganancia === null ? "—" : formatMoney(ganancia)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Margen</dt>
              <dd className="font-semibold tabular-nums">{margen === null ? "—" : `${margenFormatter.format(margen)} %`}</dd>
            </div>
          </dl>
        );
      }}
      columns={[
        { label: "Nombre", render: (p) => p.nombre, primary: true },
        { label: "Tipo", render: (p) => <Badge tone={p.tipo === "PROPIO" ? "primary" : "neutral"}>{p.tipo === "PROPIO" ? "Propio" : "Tercerizado"}</Badge> },
        {
          label: "Costo",
          align: "right",
          render: (p) => {
            const costo = costoDe(p);
            return costo === null ? <span className="text-muted">Sin costo</span> : formatMoney(costo);
          },
        },
        { label: "Precio", align: "right", render: (p) => formatMoney(p.precioVenta) },
        {
          label: "Ganancia",
          align: "right",
          render: (p) => {
            const costo = costoDe(p);
            return costo === null ? "—" : formatMoney(toNumber(p.precioVenta) - costo);
          },
        },
        {
          label: "Margen",
          align: "right",
          render: (p) => {
            const costo = costoDe(p);
            const precio = toNumber(p.precioVenta);
            if (costo === null || precio <= 0) return "—";
            return `${margenFormatter.format(((precio - costo) / precio) * 100)} %`;
          },
        },
        { label: "Estado", render: (p) => <Badge tone={p.activo ? "success" : "neutral"}>{p.activo ? "Activo" : "Archivado"}</Badge> },
      ]}
    />
  );
}

