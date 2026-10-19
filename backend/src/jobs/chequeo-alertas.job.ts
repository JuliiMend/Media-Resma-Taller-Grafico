import cron from "node-cron";
import { alertaService } from "../services/alerta.service";

export function iniciarJobAlertas() {
    cron.schedule("0 12 * * *", async () => {
        console.log("Chequeando alertas...");
        await alertaService.chequear();
    });
}