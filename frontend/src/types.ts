// Prisma Decimal fields arrive as strings in JSON.
export type Decimal = number | string;

export interface Usuario {
  id: number;
  nombre: string;
  email: string;
  fotoPerfil?: string | null;
  activo?: boolean;
}

export interface Compra {
  id: number;
  insumoId: number;
  fecha: string;
  cantidad: Decimal;
  precio: Decimal;
  medioPago?: string | null;
  insumo?: { nombre: string; unidad: string };
}

export interface HistorialEntry {
  id: number;
  fecha: string;
  accion: string;
  entidad: string;
  entidadId: number;
  detalle: string;
  usuarioId: number;
  usuario?: { id: number; nombre: string; email: string } | null;
}

export interface Cliente {
  id: number;
  nombre: string;
  telefono?: string | null;
  userContacto?: string | null;
  notas?: string | null;
  activo?: boolean;
}

export interface Insumo {
  id: number;
  nombre: string;
  unidad: string;
  stockActual: Decimal;
  stockMinimo: Decimal;
  precioUnitario: Decimal;
  proveedor?: string | null;
  activo?: boolean;
}

export type TipoProducto = "PROPIO" | "TERCERIZADO";

export interface Producto {
  id: number;
  tipo: TipoProducto;
  nombre: string;
  descripcion?: string | null;
  precioVenta: Decimal;
  costo?: Decimal | null;
  unidad: string;
  activo: boolean;
}

export interface Gasto {
  id: number;
  concepto: string;
  monto: Decimal;
  fecha: string;
  medioPago?: string | null;
}

export interface Trabajo {
  id?: number;
  pedidoId?: number;
  productoId?: number | null;
  descripcion: string;
  cantidad: Decimal;
  valorUnitario: Decimal;
  costoUnitario?: Decimal | null;
  estadoProducto?: string | null;
  producto?: { nombre: string } | null;
}

/** Datos mínimos de un pedido para armar etiquetas en tareas y selectores. */
export interface PedidoEtiquetaData {
  id: number;
  estado?: string | null;
  fechaEntrega?: string | null;
  observaciones?: string | null;
  cliente?: { nombre: string } | null;
  trabajos?: Array<{
    descripcion?: string | null;
    producto?: { nombre: string } | null;
  }> | null;
}

export interface Pedido {
  id: number;
  clienteId: number;
  usuarioId?: number | null;
  fecha: string;
  estado: string;
  sena?: Decimal | null;
  restaPagar?: Decimal | null;
  medioPago?: string | null;
  fechaEntrega?: string | null;
  envio?: Decimal | null;
  observaciones?: string | null;
  cliente?: Cliente;
  trabajos?: Trabajo[];
  total?: Decimal | null;
  ventaConCosto?: Decimal | null;
  costoTotal?: Decimal | null;
  ganancia?: Decimal | null;
  margen?: Decimal | null;
  recargo?: Decimal | null;
  costoCompleto?: boolean;
}

export interface PaginaPedidos {
  data: Pedido[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ResumenPedidos {
  activos: number;
  saldoPendiente: Decimal;
  conDeuda: number;
}

export interface FilaVenta {
  productoId: number | null;
  producto: string;
  unidad: string;
  cantidad: Decimal;
  ingresos: Decimal;
  costo: Decimal;
  ganancia: Decimal;
  margen: number | null;
  costoCompleto: boolean;
  trabajosSinCosto: number;
}

export interface FilaRanking extends FilaVenta {
  gananciaUnidad: number | null;
  porcentajeGanancia: number | null;
}

export interface PaginaRanking {
  data: FilaRanking[];
  total: number;
  page: number;
  pageSize: number;
}

export interface TotalesReporte {
  ingresos: Decimal;
  costo: Decimal;
  ganancia: Decimal;
  margen: number | null;
  pedidos: number;
  costoCompleto: boolean;
  trabajosSinCosto: number;
}

export interface VariacionReporte {
  ingresos: number | null;
  costo: number | null;
  ganancia: number | null;
}

export interface ResumenReporte {
  actual: TotalesReporte;
  anterior: TotalesReporte | null;
  variacion: VariacionReporte | null;
}

export interface GastoPorCategoria {
  categoria: string;
  monto: Decimal;
}

export interface BalanceResumen {
  ingresos: Decimal;
  costoTrabajos: Decimal;
  gananciaBruta: Decimal;
  gastos: Decimal;
  comprasInsumos: Decimal;
  resultado: Decimal;
  cajaEstimada: Decimal;
  costoCompleto: boolean;
  trabajosSinCosto: number;
}

export interface VariacionBalance {
  ingresos: number | null;
  costoTrabajos: number | null;
  gananciaBruta: number | null;
  gastos: number | null;
  comprasInsumos: number | null;
  resultado: number | null;
  cajaEstimada: number | null;
}

export interface BalanceReporte {
  actual: BalanceResumen;
  anterior: BalanceResumen | null;
  variacion: VariacionBalance | null;
  gastosPorCategoria: GastoPorCategoria[];
  compras: Compra[];
  gastos: Gasto[];
  margen?: number | null;
}

export interface Tarea {
  id: number;
  pedidoId?: number | null;
  usuarioId?: number | null;
  titulo: string;
  descripcion?: string | null;
  estado: string;
  fechaLimite?: string | null;
  creadoEn: string;
  pedido?: PedidoEtiquetaData | null;
}
