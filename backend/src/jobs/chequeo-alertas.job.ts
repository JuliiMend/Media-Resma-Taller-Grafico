import cron from "node-cron";
import { alertaService } from "../services/alerta.service";
import { env } from "../config/env";

export function iniciarJobAlertas() {
  if (!env.enableInternalCron) {
    console.log(
      "[alertas] Cron interno desactivado. Usá POST /api/alertas/cron desde GitHub Actions o definí ENABLE_INTERNAL_CRON=true.",
    );
    return;
  }

  cron.schedule(
    "0 12 * * *",
    async () => {
      console.log("Chequeando alertas...");
      await alertaService.chequear();
    },
    { timezone: "America/Argentina/Buenos_Aires" },
  );
}
