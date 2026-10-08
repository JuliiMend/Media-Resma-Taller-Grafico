import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { SWRConfig } from "swr";
import { AuthProvider } from "@/auth/AuthContext";
import { ProtectedRoute } from "@/auth/ProtectedRoute";
import { Layout } from "@/components/Layout";
import { DashboardPage } from "@/views/DashboardPage";
import { LoginPage } from "@/views/LoginPage";
import { PedidosPage } from "@/views/pedidos/PedidosPage";
import { TareasPage } from "@/views/TareasPage";
import { ClientesPage, GastosPage, InsumosPage, ProductosPage } from "@/views/SimplePages";

export default function App() {
  return (
    <SWRConfig value={{ revalidateOnFocus: false, shouldRetryOnError: false }}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<Layout />}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/pedidos" element={<PedidosPage />} />
                <Route path="/clientes" element={<ClientesPage />} />
                <Route path="/tareas" element={<TareasPage />} />
                <Route path="/productos" element={<ProductosPage />} />
                <Route path="/insumos" element={<InsumosPage />} />
                <Route path="/gastos" element={<GastosPage />} />
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </SWRConfig>
  );
}
