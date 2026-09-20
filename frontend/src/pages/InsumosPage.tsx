import { useEffect, useState } from "react";
import { insumosApi } from "../api/insumos";
import { Insumo } from "../types/insumo";

// Página de ejemplo: lista los insumos y marca en rojo los que
// están por debajo del stock mínimo. Usá esto como plantilla
// para las páginas de Clientes, Productos y Pedidos.
export default function InsumosPage() {
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    insumosApi
      .listar()
      .then(setInsumos)
      .catch(() => setError("No se pudo conectar con el backend"))
      .finally(() => setCargando(false));
  }, []);

  if (cargando) return <p className="p-4">Cargando insumos...</p>;
  if (error) return <p className="p-4 text-red-600">{error}</p>;

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-xl font-medium mb-4">Insumos</h1>
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="text-left border-b">
            <th className="py-2">Nombre</th>
            <th>Stock</th>
            <th>Mínimo</th>
            <th>Unidad</th>
          </tr>
        </thead>
        <tbody>
          {insumos.map((i) => {
            const bajo = Number(i.stockActual) <= Number(i.stockMinimo);
            return (
              <tr key={i.id} className={`border-b ${bajo ? "text-red-600" : ""}`}>
                <td className="py-2">{i.nombre}</td>
                <td>{i.stockActual}</td>
                <td>{i.stockMinimo}</td>
                <td>{i.unidad}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {insumos.length === 0 && (
        <p className="text-gray-500 mt-4">
          Todavía no cargaste insumos. Probá el endpoint POST /api/insumos.
        </p>
      )}
    </div>
  );
}
