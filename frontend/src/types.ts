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
}

export interface Insumo {
  id: number;
  nombre: string;
  unidad: string;
  stockActual: Decimal;
  stockMinimo: Decimal;
  precioUnitario: Decimal;
  proveedor?: string | null;
}

export type TipoProducto = "PROPIO" | "TERCERIZADO";

export interface Producto {
  id: number;
  tipo: TipoProducto;
  nombre: string;
  descripcion?: string | null;
  precioVenta: Decimal;
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
