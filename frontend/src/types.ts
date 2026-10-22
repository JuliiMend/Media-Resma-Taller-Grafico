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
  costoTotal?: Decimal | null;
  ganancia?: Decimal | null;
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
  mes: string;
  productoId: number | null;
  producto: string;
  unidad: string;
  cantidad: Decimal;
  ingresos: Decimal;
  costo: Decimal;
  ganancia: Decimal;
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
}
