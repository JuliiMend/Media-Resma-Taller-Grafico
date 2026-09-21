import { useEffect } from "react";
import InsumosPage from "./pages/InsumosPage";
import { alertasApi } from "./api/alertas";

export default function App() {
  useEffect(() => {
    alertasApi.chequear().catch(() => {
    });
  }, []);

  return <InsumosPage />;
}
