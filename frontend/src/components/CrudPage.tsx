import { useState, type FormEvent, type ReactNode } from "react";
import useSWR from "swr";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { api, fetcher, getErrorMessage } from "@/api/client";
import { cn, toDateInput } from "@/lib/format";
import { useRegistrarHistorial } from "@/lib/useHistorial";
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
  Textarea,
} from "./ui";

export type FieldType = "text" | "number" | "textarea" | "select" | "date" | "checkbox";

export interface FieldDef {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: { value: string; label: string }[];
  placeholder?: string;
  step?: string;
  defaultValue?: string | boolean;
  fullWidth?: boolean;
  suggestions?: string[];
}

export interface ColumnDef<T> {
  label: string;
  render: (item: T) => ReactNode;
  align?: "left" | "right";
  primary?: boolean;
}

interface CrudPageProps<T extends { id: number }> {
  title: string;
  description: string;
  endpoint: string;
  singular: string;
  fields: FieldDef[];
  columns: ColumnDef<T>[];
  searchKeys: (keyof T)[];
  rowHighlight?: (item: T) => boolean;
  summary?: (items: T[], filtered: T[]) => ReactNode;
  predicate?: (item: T) => boolean;
  toolbar?: ReactNode;
}

type FormValues = Record<string, string | boolean>;

function itemToForm<T>(item: T | null, fields: FieldDef[]): FormValues {
  const values: FormValues = {};
  for (const f of fields) {
    const raw = item ? (item as Record<string, unknown>)[f.name] : undefined;
    if (f.type === "checkbox") values[f.name] = raw === undefined ? Boolean(f.defaultValue ?? true) : Boolean(raw);
    else if (f.type === "date") values[f.name] = raw ? toDateInput(String(raw)) : String(f.defaultValue ?? "");
    else values[f.name] = raw === null || raw === undefined ? String(f.defaultValue ?? "") : String(raw);
  }
  return values;
}

function formToPayload(values: FormValues, fields: FieldDef[]): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  for (const f of fields) {
    const v = values[f.name];
    if (f.type === "checkbox") payload[f.name] = Boolean(v);
    else if (f.type === "number") {
      if (v !== "") payload[f.name] = Number(v);
    } else if (f.type === "date") {
      if (v) payload[f.name] = new Date(`${v}T00:00:00.000Z`).toISOString();
    } else payload[f.name] = String(v ?? "").trim();
  }
  return payload;
}

export function CrudPage<T extends { id: number }>({
  title,
  description,
  endpoint,
  singular,
  fields,
  columns,
  searchKeys,
  rowHighlight,
  summary,
  predicate,
  toolbar,
}: CrudPageProps<T>) {
  const { data, error, isLoading, mutate } = useSWR<T[]>(endpoint, fetcher);
  const registrar = useRegistrarHistorial();
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<T | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [values, setValues] = useState<FormValues>({});
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<T | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const items = data ?? [];
  const byPredicate = predicate ? items.filter(predicate) : items;
  const filtered = query
    ? byPredicate.filter((item) =>
        searchKeys.some((k) => String(item[k] ?? "").toLowerCase().includes(query.toLowerCase())),
      )
    : byPredicate;
  const labelOf = (values: Record<string, unknown>) => String(values[fields[0].name] ?? "").trim();

  function openForm(item: T | null) {
    setEditing(item);
    setValues(itemToForm(item, fields));
    setFormError(null);
    setFormOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      const payload = formToPayload(values, fields);
      const response = editing ? await api.patch(`${endpoint}/${editing.id}`, payload) : await api.post(endpoint, payload);
      const savedId = editing ? editing.id : (response.data as { id?: number }).id;
      const label = labelOf(payload);
      void registrar(
        editing ? "EDITAR" : "CREAR",
        singular,
        savedId,
        `${editing ? "Editó" : "Creó"} ${singular}${label ? ` "${label}"` : ""}`,
      );
      await mutate();
      setFormOpen(false);
    } catch (err) {
      setFormError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!toDelete) return;
    setDeleting(true);
    setActionError(null);
    try {
      await api.delete(`${endpoint}/${toDelete.id}`);
      const label = labelOf(toDelete as Record<string, unknown>);
      void registrar("ELIMINAR", singular, toDelete.id, `Eliminó ${singular}${label ? ` "${label}"` : ""}`);
      await mutate();
      setToDelete(null);
    } catch (err) {
      setActionError(getErrorMessage(err));
      setToDelete(null);
    } finally {
      setDeleting(false);
    }
  }

  const primaryColumn = columns.find((c) => c.primary) ?? columns[0];
  const secondaryColumns = columns.filter((c) => c !== primaryColumn);

  return (
    <div>
      <PageHeader
        title={title}
        description={description}
        action={
          <Button onClick={() => openForm(null)}>
            <Plus className="size-4" aria-hidden="true" />
            Nuevo {singular}
          </Button>
        }
      />

      {summary && data && <div className="mb-6">{summary(items, filtered)}</div>}

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
          <Input
            type="search"
            placeholder="Buscar…"
            aria-label={`Buscar ${title.toLowerCase()}`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        {toolbar}
      </div>

      {actionError && (
        <div className="mb-4">
          <ErrorBanner message={actionError} />
        </div>
      )}

      {isLoading ? (
        <LoadingState />
      ) : error ? (
        <ErrorBanner message={getErrorMessage(error)} onRetry={() => mutate()} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={items.length > 0 ? "Sin resultados" : `Todavía no hay ${title.toLowerCase()}`}
          description={items.length > 0 ? "Probá con otra búsqueda o ajustá los filtros." : `Creá el primer ${singular} para empezar.`}
        />
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-xl border border-line bg-surface md:block">
            <table className="w-full text-sm">
              <thead className="border-b border-line bg-background/60 text-left text-xs uppercase tracking-wide text-muted">
                <tr>
                  {columns.map((c) => (
                    <th key={c.label} scope="col" className={cn("px-4 py-3 font-medium", c.align === "right" && "text-right")}>
                      {c.label}
                    </th>
                  ))}
                  <th scope="col" className="px-4 py-3">
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filtered.map((item) => (
                  <tr key={item.id} className={cn("hover:bg-ink/5", rowHighlight?.(item) && "bg-danger-soft/60")}>
                    {columns.map((c) => (
                      <td key={c.label} className={cn("px-4 py-3", c.align === "right" && "text-right tabular-nums")}>
                        {c.render(item)}
                      </td>
                    ))}
                    <td className="px-4 py-3">
                      <RowActions onEdit={() => openForm(item)} onDelete={() => setToDelete(item)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="flex flex-col gap-3 md:hidden">
            {filtered.map((item) => (
              <li
                key={item.id}
                className={cn(
                  "rounded-xl border border-line bg-surface p-4",
                  rowHighlight?.(item) && "border-danger/30 bg-danger-soft/60",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 font-medium">{primaryColumn.render(item)}</div>
                  <RowActions onEdit={() => openForm(item)} onDelete={() => setToDelete(item)} />
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  {secondaryColumns.map((c) => (
                    <div key={c.label} className="min-w-0">
                      <dt className="text-xs text-muted">{c.label}</dt>
                      <dd className="truncate">{c.render(item)}</dd>
                    </div>
                  ))}
                </dl>
              </li>
            ))}
          </ul>
        </>
      )}

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editing ? `Editar ${singular}` : `Nuevo ${singular}`}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {fields.map((f) => {
              const id = `field-${f.name}`;
              const value = values[f.name];
              if (f.type === "checkbox") {
                return (
                  <label key={f.name} className="flex items-center gap-2 text-sm font-medium sm:col-span-2">
                    <input
                      type="checkbox"
                      className="size-4 accent-primary"
                      checked={Boolean(value)}
                      onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.checked }))}
                    />
                    {f.label}
                  </label>
                );
              }
              const common = {
                id,
                name: f.name,
                required: f.required,
                value: String(value ?? ""),
                placeholder: f.placeholder,
              };
              const onChange = (e: { target: { value: string } }) => setValues((v) => ({ ...v, [f.name]: e.target.value }));
              return (
                <div key={f.name} className={cn((f.fullWidth || f.type === "textarea") && "sm:col-span-2")}>
                  <Field label={f.required ? `${f.label} *` : f.label} htmlFor={id}>
                    {f.type === "textarea" ? (
                      <Textarea {...common} onChange={onChange} />
                    ) : f.type === "select" ? (
                      <Select {...common} onChange={onChange}>
                        {f.options?.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </Select>
                    ) : (
                      <>
                        <Input
                          {...common}
                          type={f.type}
                          step={f.type === "number" ? (f.step ?? "0.01") : undefined}
                          min={f.type === "number" ? 0 : undefined}
                          list={f.suggestions ? `${id}-options` : undefined}
                          onChange={onChange}
                        />
                        {f.suggestions && (
                          <datalist id={`${id}-options`}>
                            {f.suggestions.map((s) => (
                              <option key={s} value={s} />
                            ))}
                          </datalist>
                        )}
                      </>
                    )}
                  </Field>
                </div>
              );
            })}
          </div>
          {formError && <ErrorBanner message={formError} />}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setFormOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" loading={saving}>
              {editing ? "Guardar cambios" : "Crear"}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={toDelete !== null}
        title={`Eliminar ${singular}`}
        message={`¿Seguro que querés eliminar este ${singular}? Esta acción no se puede deshacer.`}
        onConfirm={handleDelete}
        onCancel={() => setToDelete(null)}
        loading={deleting}
      />
    </div>
  );
}

function RowActions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="flex shrink-0 justify-end gap-1">
      <Button variant="ghost" size="icon" onClick={onEdit} aria-label="Editar">
        <Pencil className="size-4" aria-hidden="true" />
      </Button>
      <Button variant="ghost" size="icon" onClick={onDelete} aria-label="Eliminar" className="text-danger hover:bg-danger-soft">
        <Trash2 className="size-4" aria-hidden="true" />
      </Button>
    </div>
  );
}
