import { useEffect, useMemo, useRef, useState } from "react";
import useSWR, { mutate } from "swr";
import { useNavigate } from "react-router-dom";
import {
  Check,
  ClipboardList,
  Copy,
  Download,
  FileText,
  Lock,
  Plus,
  RotateCcw,
  Share2,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { api, fetcher, getErrorMessage } from "@/api/client";
import { useAuth } from "@/auth/AuthContext";
import { Button, Card, ConfirmDialog, ErrorBanner, Field, Input, Modal, PageHeader, Select, Textarea } from "@/components/ui";
import { SearchSelect } from "@/components/SearchSelect";
import { ClienteQuickModal, ProductoQuickModal } from "@/components/QuickCreate";
import { cn, formatMoney, toNumber } from "@/lib/format";
import { UNIDADES_PRODUCTO } from "@/lib/unidades";
import { BORRADOR_KEY, LEYENDA_LEGAL, NEGOCIO } from "@/lib/presupuesto-config";
import {
  borradorVacio,
  calcularTotales,
  fechaCorta,
  formatMargen,
  lineasValidas,
  nombreArchivoPresupuesto,
  numeroPresupuesto,
  nuevaLinea,
  repartirDescuento,
  resumenLineas,
  sumarDias,
  textoWhatsApp,
  type BorradorPresupuesto,
  type DatosPresupuestoPdf,
  type LineaPresupuesto,
  type ModoCliente,
  type ModoDescuento,
} from "@/lib/presupuesto";
import { descargarPresupuestoPdf, generarPresupuestoPdf } from "@/lib/presupuesto-pdf";
import { cargarLogoDataUrl } from "@/lib/presupuesto-logo";
import type { Cliente, Pedido, Producto } from "@/types";

const BORRADOR_DEBOUNCE_MS = 400;

function leerBorrador(): BorradorPresupuesto | null {
  try {
    const raw = localStorage.getItem(BORRADOR_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<BorradorPresupuesto> | null;
    if (!parsed || typeof parsed !== "object") return null;
    const base = borradorVacio();
    const lineas = Array.isArray(parsed.lineas)
      ? (parsed.lineas as Partial<LineaPresupuesto>[])
          .filter((l): l is Partial<LineaPresupuesto> => Boolean(l) && typeof l === "object")
          .map((l) => ({
            key: typeof l.key === "string" && l.key ? l.key : nuevaLinea().key,
            productoId: typeof l.productoId === "number" ? l.productoId : null,
            descripcion: String(l.descripcion ?? ""),
            cantidad: String(l.cantidad ?? "1"),
            unidad: String(l.unidad ?? "unidad"),
            precioUnitario: String(l.precioUnitario ?? ""),
            costoUnitario: String(l.costoUnitario ?? ""),
            personalizado: l.personalizado !== false,
          }))
      : base.lineas;

    return {
      modoCliente: parsed.modoCliente === "libre" ? "libre" : "existente",
      clienteId: String(parsed.clienteId ?? ""),
      clienteNombre: String(parsed.clienteNombre ?? ""),
      clienteTelefono: String(parsed.clienteTelefono ?? ""),
      fechaEmision: typeof parsed.fechaEmision === "string" && parsed.fechaEmision ? parsed.fechaEmision : base.fechaEmision,
      validezDias: String(parsed.validezDias ?? base.validezDias),
      envio: String(parsed.envio ?? ""),
      modoDescuento: parsed.modoDescuento === "monto" ? "monto" : "porcentaje",
      descuentoValor: String(parsed.descuentoValor ?? ""),
      plazoEntrega: String(parsed.plazoEntrega ?? ""),
      condiciones: typeof parsed.condiciones === "string" ? parsed.condiciones : base.condiciones,
      observaciones: String(parsed.observaciones ?? ""),
      lineas: lineas.length > 0 ? lineas : base.lineas,
    };
  } catch {
    return null;
  }
}

function copiarAlPortapapeles(texto: string): boolean {
  try {
    const area = document.createElement("textarea");
    area.value = texto;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}

function detectarSoporteCompartir(): boolean {
  if (typeof navigator === "undefined") return false;
  if (typeof navigator.share !== "function" || typeof navigator.canShare !== "function") return false;
  try {
    const sonda = new File([new Blob([new Uint8Array([37, 80, 68, 70])], { type: "application/pdf" })], "presupuesto.pdf", {
      type: "application/pdf",
    });
    return navigator.canShare({ files: [sonda] });
  } catch {
    return false;
  }
}

function Toggle<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
}) {
  return (
    <div className="inline-flex flex-wrap rounded-xl border border-line bg-background p-1" role="group" aria-label={label}>
      {options.map((opcion) => (
        <button
          key={opcion.value}
          type="button"
          aria-pressed={value === opcion.value}
          onClick={() => onChange(opcion.value)}
          className={cn(
            "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
            value === opcion.value ? "bg-ink text-background" : "text-muted hover:text-ink",
          )}
        >
          {opcion.label}
        </button>
      ))}
    </div>
  );
}

export function PresupuestoPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: clientes } = useSWR<Cliente[]>("/clientes", fetcher);
  const { data: productos } = useSWR<Producto[]>("/productos", fetcher);

  const [borrador, setBorrador] = useState<BorradorPresupuesto>(() => leerBorrador() ?? borradorVacio());
  const [numero, setNumero] = useState(() => numeroPresupuesto());
  const [restaurado, setRestaurado] = useState(false);
  const omitirGuardado = useRef(false);

  const [error, setError] = useState<string | null>(null);
  const [logoError, setLogoError] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [generandoPdf, setGenerandoPdf] = useState(false);
  const [compartiendo, setCompartiendo] = useState(false);
  const [creandoPedido, setCreandoPedido] = useState(false);
  const [pedidoError, setPedidoError] = useState<string | null>(null);

  const [confirmNuevo, setConfirmNuevo] = useState(false);
  const [confirmPedido, setConfirmPedido] = useState(false);
  const [pedidoCreado, setPedidoCreado] = useState<{ id: number; total: number } | null>(null);

  const [clienteModal, setClienteModal] = useState(false);
  const [productoModal, setProductoModal] = useState(false);
  const [lineaProducto, setLineaProducto] = useState<string | null>(null);
  const [crearClienteParaPedido, setCrearClienteParaPedido] = useState(false);

  const [puedeCompartir] = useState(detectarSoporteCompartir);
  const avisoCopiado = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setRestaurado(Boolean(leerBorrador()));
  }, []);

  useEffect(() => {
    let activo = true;
    void cargarLogoDataUrl().then((logo) => {
      if (activo && !logo) setLogoError(true);
    });
    return () => {
      activo = false;
    };
  }, []);

  // Borrador en localStorage (con debounce) para no perder lo cargado al recargar.
  useEffect(() => {
    if (omitirGuardado.current) {
      omitirGuardado.current = false;
      return;
    }
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(BORRADOR_KEY, JSON.stringify(borrador));
      } catch {
        // Si localStorage no está disponible se sigue trabajando sin borrador.
      }
    }, BORRADOR_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [borrador]);

  useEffect(() => {
    return () => {
      if (avisoCopiado.current) clearTimeout(avisoCopiado.current);
    };
  }, []);

  const totales = useMemo(() => calcularTotales(borrador), [borrador]);
  const lineas = useMemo(() => resumenLineas(borrador), [borrador]);
  const items = lineasValidas(borrador.lineas);

  const clientesActivos = useMemo(() => (clientes ?? []).filter((c) => c.activo !== false), [clientes]);
  const productosActivos = useMemo(() => (productos ?? []).filter((p) => p.activo), [productos]);
  const clienteOptions = clientesActivos.map((c) => ({ value: String(c.id), label: c.nombre }));
  const productoOptions = productosActivos.map((p) => ({ value: String(p.id), label: p.nombre }));

  const clienteSeleccionado = clientesActivos.find((c) => String(c.id) === borrador.clienteId) ?? null;
  const clienteNombre =
    borrador.modoCliente === "existente" ? (clienteSeleccionado?.nombre ?? "") : borrador.clienteNombre.trim();
  const clienteTelefono =
    borrador.modoCliente === "existente" ? (clienteSeleccionado?.telefono ?? "") : borrador.clienteTelefono.trim();

  const diasValidez = Math.max(0, Math.round(toNumber(borrador.validezDias)));
  const validoHasta = fechaCorta(sumarDias(borrador.fechaEmision, diasValidez));

  const datosPdf: DatosPresupuestoPdf = useMemo(
    () => ({
      numero,
      negocio: NEGOCIO,
      leyendaLegal: LEYENDA_LEGAL,
      clienteNombre,
      clienteTelefono,
      fechaEmision: fechaCorta(borrador.fechaEmision),
      validoHasta,
      lineas,
      subtotal: totales.subtotal,
      descuento: totales.descuento,
      descuentoTexto: totales.descuento > 0 && borrador.modoDescuento === "porcentaje" ? `${borrador.descuentoValor} %` : "",
      envio: totales.envio,
      total: totales.total,
      plazoEntrega: borrador.plazoEntrega.trim(),
      condiciones: borrador.condiciones.trim(),
      observaciones: borrador.observaciones.trim(),
    }),
    [numero, clienteNombre, clienteTelefono, borrador, validoHasta, lineas, totales],
  );

  const nombreArchivo = nombreArchivoPresupuesto(clienteNombre, borrador.fechaEmision);
  const hayItems = items.length > 0;
  const puedePasarAPedido = hayItems && (borrador.modoCliente === "existente" ? Boolean(clienteSeleccionado) : clienteNombre !== "");

  /** Precio unitario de cada línea con el descuento global repartido (el pedido no tiene descuento). */
  const valoresConDescuento = useMemo(
    () => repartirDescuento(items, totales.subtotal, totales.descuento),
    [items, totales.subtotal, totales.descuento],
  );
  const totalPedido = useMemo(
    () =>
      items.reduce(
        (suma, l) => suma + (valoresConDescuento.find((v) => v.key === l.key)?.valorUnitario ?? 0) * toNumber(l.cantidad),
        0,
      ) + totales.envio,
    [items, valoresConDescuento, totales.envio],
  );

  function patchBorrador(patch: Partial<BorradorPresupuesto>) {
    setBorrador((actual) => ({ ...actual, ...patch }));
  }

  function patchLinea(key: string, patch: Partial<LineaPresupuesto>) {
    setBorrador((actual) => ({
      ...actual,
      lineas: actual.lineas.map((l) => (l.key === key ? { ...l, ...patch } : l)),
    }));
  }

  function seleccionarProducto(key: string, productoId: string) {
    const producto = productosActivos.find((p) => String(p.id) === productoId);
    if (!producto) {
      patchLinea(key, { productoId: null, personalizado: true, costoUnitario: "" });
      return;
    }
    patchLinea(key, {
      productoId: producto.id,
      personalizado: false,
      descripcion: producto.nombre,
      unidad: producto.unidad ?? "unidad",
      precioUnitario: String(toNumber(producto.precioVenta)),
      costoUnitario: producto.costo === null || producto.costo === undefined ? "" : String(toNumber(producto.costo)),
    });
  }

  function productoCreado(producto: Producto) {
    if (lineaProducto) {
      patchLinea(lineaProducto, {
        productoId: producto.id,
        personalizado: false,
        descripcion: producto.nombre,
        unidad: producto.unidad ?? "unidad",
        precioUnitario:
          producto.precioVenta === null || producto.precioVenta === undefined ? "" : String(toNumber(producto.precioVenta)),
        costoUnitario: producto.costo === null || producto.costo === undefined ? "" : String(toNumber(producto.costo)),
      });
    }
    setProductoModal(false);
    setLineaProducto(null);
  }

  function clienteCreado(cliente: Cliente) {
    setClienteModal(false);
    patchBorrador({
      modoCliente: "existente",
      clienteId: String(cliente.id),
      clienteNombre: cliente.nombre,
      clienteTelefono: cliente.telefono ?? "",
    });
    if (crearClienteParaPedido) {
      setCrearClienteParaPedido(false);
      setConfirmPedido(true);
    }
  }

  function limpiarPresupuesto() {
    try {
      localStorage.removeItem(BORRADOR_KEY);
    } catch {
      // sinStorage no hay nada que limpiar
    }
    omitirGuardado.current = true;
    setBorrador(borradorVacio());
    setNumero(numeroPresupuesto());
    setRestaurado(false);
    setPedidoCreado(null);
  }

  function confirmarNuevo() {
    setConfirmNuevo(false);
    limpiarPresupuesto();
  }

  async function descargarPdf() {
    setGenerandoPdf(true);
    setError(null);
    try {
      const logo = await cargarLogoDataUrl();
      setLogoError(!logo);
      await descargarPresupuestoPdf(datosPdf, logo, nombreArchivo);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setGenerandoPdf(false);
    }
  }

  async function copiarParaWhatsApp() {
    const texto = textoWhatsApp({
      numero,
      negocio: NEGOCIO.nombre,
      clienteNombre,
      clienteTelefono,
      fechaEmision: datosPdf.fechaEmision,
      validoHasta,
      lineas,
      subtotal: totales.subtotal,
      descuento: totales.descuento,
      descuentoTexto: datosPdf.descuentoTexto,
      envio: totales.envio,
      total: totales.total,
      plazoEntrega: borrador.plazoEntrega.trim(),
      condiciones: borrador.condiciones.trim(),
    });

    let ok = false;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(texto);
        ok = true;
      }
    } catch {
      ok = false;
    }
    if (!ok) ok = copiarAlPortapapeles(texto);

    if (ok) {
      setCopiado(true);
      if (avisoCopiado.current) clearTimeout(avisoCopiado.current);
      avisoCopiado.current = setTimeout(() => setCopiado(false), 2500);
    } else {
      setError("No se pudo copiar al portapapeles. Copiá el texto manualmente.");
    }
  }

  async function compartirPdf() {
    setCompartiendo(true);
    setError(null);
    try {
      const logo = await cargarLogoDataUrl();
      setLogoError(!logo);
      const blob = await generarPresupuestoPdf(datosPdf, logo);
      const archivo = new File([blob], nombreArchivo, { type: "application/pdf" });
      if (!navigator.canShare?.({ files: [archivo] })) {
        setError("Este navegador no permite compartir archivos PDF.");
        return;
      }
      await navigator.share({ files: [archivo], title: "Presupuesto" });
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError(getErrorMessage(err));
    } finally {
      setCompartiendo(false);
    }
  }

  function iniciarPasajeAPedido() {
    setPedidoError(null);
    if (borrador.modoCliente === "libre") {
      setCrearClienteParaPedido(true);
      setClienteModal(true);
      return;
    }
    setConfirmPedido(true);
  }

  async function crearPedido() {
    const clienteId = Number(borrador.clienteId);
    if (!clienteId) {
      setPedidoError("Elegí un cliente");
      return;
    }
    if (items.length === 0) {
      setPedidoError("Agregá al menos un ítem con descripción y cantidad");
      return;
    }

    const valores = valoresConDescuento;
    const valorPorLinea = new Map(valores.map((v) => [v.key, v.valorUnitario]));
    const totalPedido = items.reduce(
      (suma, l) => suma + (valorPorLinea.get(l.key) ?? 0) * toNumber(l.cantidad),
      0,
    ) + totales.envio;

    setCreandoPedido(true);
    setPedidoError(null);
    try {
      const { data } = await api.post<Pedido>("/pedidos", {
        clienteId,
        usuarioId: user?.id ?? null,
        estado: "PENDIENTE",
        envio: totales.envio > 0 ? totales.envio : null,
        observaciones: `Desde presupuesto del ${fechaCorta(borrador.fechaEmision)}. ${borrador.observaciones.trim()}`.trim(),
        trabajos: items.map((l) => ({
          productoId: l.productoId,
          descripcion: l.descripcion.trim(),
          cantidad: toNumber(l.cantidad),
          valorUnitario: valorPorLinea.get(l.key) ?? toNumber(l.precioUnitario),
          ...(l.personalizado && l.costoUnitario !== "" ? { costoUnitario: toNumber(l.costoUnitario) } : {}),
        })),
      });
      setConfirmPedido(false);
      setPedidoCreado({ id: data.id, total: totalPedido });
      void mutate("/pedidos");
    } catch (err) {
      setPedidoError(getErrorMessage(err));
    } finally {
      setCreandoPedido(false);
    }
  }

  function limpiarYNavegar() {
    limpiarPresupuesto();
    navigate("/pedidos");
  }

  const avisoDebajoDeCosto =
    totales.lineasBajoCosto > 0 || totales.totalBajoCosto;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Presupuestos"
        description="Armá un presupuesto, descargalo como PDF o mandalo por WhatsApp. El presupuesto no se guarda en el sistema."
        action={
          <Button variant="secondary" onClick={() => setConfirmNuevo(true)}>
            <RotateCcw className="size-4" aria-hidden="true" />
            Nuevo presupuesto
          </Button>
        }
      />

      {restaurado && (
        <div className="rounded-lg border border-line bg-surface px-4 py-3 text-sm text-muted">
          Se restauró el borrador del presupuesto que quedó cargado.
        </div>
      )}

      {error && <ErrorBanner message={error} />}

      {logoError && (
        <div
          role="status"
          className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning-soft/40 px-4 py-3 text-sm text-warning"
        >
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p>No se pudo cargar el logo. El PDF se genera con “MEDIA RESMA” como respaldo.</p>
        </div>
      )}

      <Card title="Datos del presupuesto" icon={<FileText className="size-4" aria-hidden="true" />}>
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-3">
            <span className="text-sm font-semibold text-ink">Cliente</span>
            <Toggle<ModoCliente>
              label="Tipo de cliente"
              value={borrador.modoCliente}
              onChange={(modo) => patchBorrador({ modoCliente: modo })}
              options={[
                { value: "existente", label: "Cliente existente" },
                { value: "libre", label: "Nombre libre" },
              ]}
            />
            {borrador.modoCliente === "existente" ? (
              <Field label="Cliente" htmlFor="pres-cliente">
                <SearchSelect
                  id="pres-cliente"
                  options={clienteOptions}
                  value={borrador.clienteId}
                  onChange={(value) => patchBorrador({ clienteId: value })}
                  placeholder="Buscar cliente…"
                  createLabel="+ Crear cliente nuevo"
                  onCreate={() => setClienteModal(true)}
                />
              </Field>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Nombre"
                  htmlFor="pres-nombre"
                  hint={'Opcional. Si queda vacío el PDF no muestra "Para:".'}
                >
                  <Input
                    id="pres-nombre"
                    value={borrador.clienteNombre}
                    onChange={(e) => patchBorrador({ clienteNombre: e.target.value })}
                    placeholder="Nombre o razón social"
                  />
                </Field>
                <Field label="Teléfono" htmlFor="pres-tel" hint="Opcional.">
                  <Input
                    id="pres-tel"
                    value={borrador.clienteTelefono}
                    onChange={(e) => patchBorrador({ clienteTelefono: e.target.value })}
                    placeholder="11 5555-5555"
                  />
                </Field>
              </div>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Fecha de emisión" htmlFor="pres-fecha">
              <Input
                id="pres-fecha"
                type="date"
                value={borrador.fechaEmision}
                onChange={(e) => patchBorrador({ fechaEmision: e.target.value })}
              />
            </Field>
            <Field label="Validez (días)" htmlFor="pres-validez" hint={`Válido hasta ${validoHasta || "—"}.`}>
              <Input
                id="pres-validez"
                type="number"
                min={0}
                step={1}
                value={borrador.validezDias}
                onChange={(e) => patchBorrador({ validezDias: e.target.value })}
              />
            </Field>
            <Field label="Nº de presupuesto" htmlFor="pres-numero">
              <Input id="pres-numero" value={numero} readOnly className="text-muted" />
            </Field>
          </div>
        </div>
      </Card>

      <Card
        title="Ítems"
        icon={<ClipboardList className="size-4" aria-hidden="true" />}
        action={
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setBorrador((actual) => ({ ...actual, lineas: [...actual.lineas, nuevaLinea()] }))}
          >
            <Plus className="size-4" aria-hidden="true" />
            Agregar ítem
          </Button>
        }
      >
        <div className="flex flex-col gap-4">
          {borrador.lineas.map((linea, indice) => {
            const costo = linea.costoUnitario === "" ? null : toNumber(linea.costoUnitario);
            const precio = toNumber(linea.precioUnitario);
            const cantidad = toNumber(linea.cantidad);
            const ganancia = costo === null ? null : (precio - costo) * cantidad;
            const margen = costo === null || precio <= 0 ? null : ((precio - costo) / precio) * 100;
            const bajoCosto = costo !== null && precio < costo;

            return (
              <div key={linea.key} className="rounded-xl border border-line bg-background/40 p-4">
                <div className="grid gap-3 sm:grid-cols-12">
                  <div className="sm:col-span-7">
                    <Field label="Producto" htmlFor={`l-prod-${linea.key}`}>
                      <SearchSelect
                        id={`l-prod-${linea.key}`}
                        options={productoOptions}
                        value={linea.productoId === null ? "" : String(linea.productoId)}
                        onChange={(value) => seleccionarProducto(linea.key, value)}
                        placeholder="Buscar producto…"
                        emptyLabel="Personalizado"
                        clearable
                        createLabel="+ Crear producto nuevo"
                        onCreate={() => {
                          setLineaProducto(linea.key);
                          setProductoModal(true);
                        }}
                      />
                    </Field>
                  </div>
                  <div className="sm:col-span-5">
                    <Field label="Descripción" htmlFor={`l-desc-${linea.key}`}>
                      <Input
                        id={`l-desc-${linea.key}`}
                        value={linea.descripcion}
                        onChange={(e) => patchLinea(linea.key, { descripcion: e.target.value })}
                        placeholder="Detalle del trabajo"
                      />
                    </Field>
                  </div>
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-12 sm:items-end">
                  <div className="sm:col-span-2">
                    <Field label="Unidad" htmlFor={`l-uni-${linea.key}`}>
                      <Select
                        id={`l-uni-${linea.key}`}
                        value={linea.unidad}
                        onChange={(e) => patchLinea(linea.key, { unidad: e.target.value })}
                      >
                        {UNIDADES_PRODUCTO.map((u) => (
                          <option key={u} value={u}>
                            {u}
                          </option>
                        ))}
                      </Select>
                    </Field>
                  </div>
                  <div className="sm:col-span-3">
                    <Field label="Cantidad" htmlFor={`l-cant-${linea.key}`}>
                      <Input
                        id={`l-cant-${linea.key}`}
                        type="number"
                        min={0}
                        step="any"
                        inputMode="decimal"
                        value={linea.cantidad}
                        onChange={(e) => patchLinea(linea.key, { cantidad: e.target.value })}
                        className="min-w-[7rem] text-right tabular-nums"
                      />
                    </Field>
                  </div>
                  <div className="sm:col-span-3">
                    <Field label="Precio unitario" htmlFor={`l-precio-${linea.key}`}>
                      <Input
                        id={`l-precio-${linea.key}`}
                        type="number"
                        min={0}
                        step="0.01"
                        value={linea.precioUnitario}
                        onChange={(e) => patchLinea(linea.key, { precioUnitario: e.target.value })}
                      />
                    </Field>
                  </div>
                  <div className="sm:col-span-3">
                    <Field label="Subtotal" htmlFor={`l-sub-${linea.key}`}>
                      <Input
                        id={`l-sub-${linea.key}`}
                        readOnly
                        value={formatMoney(cantidad * precio)}
                        className="text-muted"
                      />
                    </Field>
                  </div>
                  <div className="flex justify-end sm:col-span-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        setBorrador((actual) => ({
                          ...actual,
                          lineas: actual.lineas.length > 1 ? actual.lineas.filter((l) => l.key !== linea.key) : [nuevaLinea()],
                        }))
                      }
                      aria-label={`Quitar ítem ${indice + 1}`}
                      className="text-danger hover:bg-danger-soft"
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                    </Button>
                  </div>
                </div>

                <div className="mt-3 rounded-lg border border-warning/25 bg-warning-soft/40 p-3">
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-warning">
                    <Lock className="size-3.5" aria-hidden="true" />
                    Solo interno — no sale en el PDF
                  </p>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div>
                      <span className="text-xs text-muted">Costo unitario</span>
                      {linea.personalizado ? (
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          aria-label="Costo unitario (interno)"
                          value={linea.costoUnitario}
                          onChange={(e) => patchLinea(linea.key, { costoUnitario: e.target.value })}
                          placeholder="Sin costo"
                          className="mt-1 h-9"
                        />
                      ) : (
                        <p className={cn("mt-1 text-sm font-semibold tabular-nums", bajoCosto && "text-danger")}>
                          {costo === null ? <span className="text-muted">Sin costo</span> : formatMoney(costo)}
                        </p>
                      )}
                    </div>
                    <div>
                      <span className="text-xs text-muted">Ganancia (línea)</span>
                      <p className={cn("mt-1 text-sm font-semibold tabular-nums", ganancia !== null && ganancia < 0 && "text-danger")}>
                        {ganancia === null ? "—" : formatMoney(ganancia)}
                      </p>
                    </div>
                    <div>
                      <span className="text-xs text-muted">Margen</span>
                      <p className={cn("mt-1 text-sm font-semibold tabular-nums", margen !== null && margen < 0 && "text-danger")}>
                        {formatMargen(margen)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card title="Envío, descuento y condiciones">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Envío" htmlFor="pres-envio">
            <Input
              id="pres-envio"
              type="number"
              min={0}
              step="0.01"
              value={borrador.envio}
              onChange={(e) => patchBorrador({ envio: e.target.value })}
            />
          </Field>
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-ink">Descuento global</span>
            <div className="flex flex-wrap items-center gap-2">
              <Toggle<ModoDescuento>
                label="Tipo de descuento"
                value={borrador.modoDescuento}
                onChange={(modo) => patchBorrador({ modoDescuento: modo })}
                options={[
                  { value: "porcentaje", label: "%" },
                  { value: "monto", label: "$" },
                ]}
              />
              <Input
                aria-label="Valor del descuento"
                type="number"
                min={0}
                step="0.01"
                value={borrador.descuentoValor}
                onChange={(e) => patchBorrador({ descuentoValor: e.target.value })}
                placeholder="Sin descuento"
                className="w-32"
              />
            </div>
            <p className="text-xs text-muted">Vacío = sin descuento.</p>
          </div>
          <div className="sm:col-span-2">
            <Field label="Plazo de entrega" htmlFor="pres-plazo">
              <Input
                id="pres-plazo"
                value={borrador.plazoEntrega}
                onChange={(e) => patchBorrador({ plazoEntrega: e.target.value })}
                placeholder="5 días hábiles"
              />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Condiciones" htmlFor="pres-condiciones">
              <Textarea
                id="pres-condiciones"
                value={borrador.condiciones}
                onChange={(e) => patchBorrador({ condiciones: e.target.value })}
              />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Observaciones" htmlFor="pres-obs">
              <Textarea
                id="pres-obs"
                value={borrador.observaciones}
                onChange={(e) => patchBorrador({ observaciones: e.target.value })}
              />
            </Field>
          </div>
        </div>
      </Card>

      <Card title="Totales">
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <dt className="text-xs text-muted">Subtotal</dt>
            <dd className="text-lg font-semibold tabular-nums">{formatMoney(totales.subtotal)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Descuento</dt>
            <dd className="text-lg font-semibold tabular-nums">-{formatMoney(totales.descuento)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Envío</dt>
            <dd className="text-lg font-semibold tabular-nums">{formatMoney(totales.envio)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">TOTAL</dt>
            <dd className="text-lg font-bold tabular-nums text-primary">{formatMoney(totales.total)}</dd>
          </div>
        </dl>
      </Card>

      <section className="rounded-2xl border border-warning/30 bg-warning-soft/30 p-5">
        <header className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-base font-bold text-warning">
            <Lock className="size-4" aria-hidden="true" />
            Solo interno — no sale en el PDF ni en el texto
          </h2>
        </header>

        {avisoDebajoDeCosto && (
          <div role="alert" className="mb-4 flex items-start gap-3 rounded-lg border border-danger/25 bg-danger-soft p-3 text-sm text-danger">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <p>
              {totales.totalBajoCosto && "El total con descuento está por debajo del costo. "}
              {totales.lineasBajoCosto > 0 &&
                `${totales.lineasBajoCosto} ${totales.lineasBajoCosto === 1 ? "ítem está" : "ítems están"} por debajo del costo.`}
            </p>
          </div>
        )}

        <dl className="grid grid-cols-3 gap-4">
          <div>
            <dt className="text-xs text-muted">Costo total</dt>
            <dd className="text-lg font-semibold tabular-nums">{formatMoney(totales.costoTotal)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Ganancia</dt>
            <dd className={cn("text-lg font-semibold tabular-nums", totales.ganancia < 0 && "text-danger")}>
              {formatMoney(totales.ganancia)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Margen</dt>
            <dd className={cn("text-lg font-semibold tabular-nums", totales.margen !== null && totales.margen < 0 && "text-danger")}>
              {formatMargen(totales.margen)}
            </dd>
          </div>
        </dl>
        <p className="mt-3 text-xs text-muted">
          Margen y ganancia calculados sobre el subtotal con descuento. Esta información nunca se comparte.
        </p>
      </section>

      <Card title="Salidas" icon={<Download className="size-4" aria-hidden="true" />}>
        <div className="flex flex-col gap-4">
          {!hayItems && <p className="text-sm text-muted">Agregá al menos un ítem para poder generar el presupuesto.</p>}
          <div className="flex flex-wrap gap-2">
            <Button onClick={descargarPdf} loading={generandoPdf} disabled={!hayItems}>
              <Download className="size-4" aria-hidden="true" />
              Descargar PDF
            </Button>
            <Button variant="secondary" onClick={copiarParaWhatsApp} disabled={!hayItems}>
              <Copy className="size-4" aria-hidden="true" />
              Copiar para WhatsApp
            </Button>
            {puedeCompartir && (
              <Button variant="secondary" onClick={compartirPdf} loading={compartiendo} disabled={!hayItems}>
                <Share2 className="size-4" aria-hidden="true" />
                Compartir PDF
              </Button>
            )}
            <Button variant="dark" onClick={iniciarPasajeAPedido} disabled={!puedePasarAPedido}>
              <ClipboardList className="size-4" aria-hidden="true" />
              Pasar a pedido
            </Button>
          </div>
          {copiado && (
            <p className="flex items-center gap-2 text-sm font-medium text-success" role="status">
              <Check className="size-4" aria-hidden="true" />
              Copiado
            </p>
          )}
          {pedidoError && <ErrorBanner message={pedidoError} />}
        </div>
      </Card>

      <ConfirmDialog
        open={confirmNuevo}
        title="Nuevo presupuesto"
        message="Se borra el borrador actual y se empieza de cero. ¿Continuás?"
        onConfirm={confirmarNuevo}
        onCancel={() => setConfirmNuevo(false)}
        confirmLabel="Empezar de nuevo"
        confirmVariant="primary"
      />

      <ConfirmDialog
        open={confirmPedido}
        title="Pasar a pedido"
        message={
          `Se crea un pedido PENDIENTE para ${clienteNombre || "el cliente"} con ${
            totales.descuento > 0 ? "el descuento repartido en los precios unitarios" : "los precios del presupuesto"
          }. Total del pedido: ${formatMoney(totalPedido)}.${totales.envio > 0 ? ` Incluye envío de ${formatMoney(totales.envio)}.` : ""}`
        }
        onConfirm={crearPedido}
        onCancel={() => setConfirmPedido(false)}
        loading={creandoPedido}
        confirmLabel="Crear pedido"
        confirmVariant="primary"
      />

      <Modal open={pedidoCreado !== null} onClose={() => setPedidoCreado(null)} title="Pedido creado">
        <p className="text-sm text-pretty">
          Se creó el pedido <strong className="text-ink">#{pedidoCreado?.id}</strong> con un total de{" "}
          <strong className="text-ink">{formatMoney(pedidoCreado?.total ?? 0)}</strong>.
        </p>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={() => setPedidoCreado(null)}>
            Seguir con el presupuesto
          </Button>
          <Button onClick={limpiarYNavegar}>Limpiar y ver pedidos</Button>
        </div>
      </Modal>

      <ClienteQuickModal
        open={clienteModal}
        onClose={() => {
          setClienteModal(false);
          setCrearClienteParaPedido(false);
        }}
        onCreated={clienteCreado}
        initialNombre={crearClienteParaPedido ? borrador.clienteNombre : ""}
        initialTelefono={crearClienteParaPedido ? borrador.clienteTelefono : ""}
      />

      <ProductoQuickModal open={productoModal} onClose={() => setProductoModal(false)} onCreated={productoCreado} />
    </div>
  );
}
