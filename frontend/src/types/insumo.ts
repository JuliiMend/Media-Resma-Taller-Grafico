export interface Insumo {
  id: number;
  nombre: string;
  unidad: string;
  stockActual: number;
  stockMinimo: number;
  precioUnitario: number;
  proveedor: string | null;
  activo: boolean;
}

export type CrearInsumoInput = Omit<Insumo, "id" | "activo">;
