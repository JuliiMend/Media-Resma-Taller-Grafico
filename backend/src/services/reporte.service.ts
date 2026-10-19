import { reporteRepository } from "../repositories/reporte.repository";
import { VentasQueryInput } from "../schemas/reporte.schema";

const formatearFecha = (fecha: Date) => {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");
  return `${anio}-${mes}-${dia}`;
};

export const reporteService = {
  ventas: ({ desde, hasta, productoId }: VentasQueryInput) => {
    const hastaFinal = hasta ?? formatearFecha(new Date());

    let desdeFinal = desde;
    if (!desdeFinal) {
      const fechaDesde = new Date(`${hastaFinal}T00:00:00`);
      fechaDesde.setMonth(fechaDesde.getMonth() - 6);
      desdeFinal = formatearFecha(fechaDesde);
    }

    return reporteRepository.ventas(desdeFinal, hastaFinal, productoId);
  },
};
