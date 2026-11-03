import { app } from "./app";
import { env } from "./config/env";
import { iniciarJobAlertas } from "./jobs/chequeo-alertas.job";

app.listen(env.port, "0.0.0.0", () => {
  console.log(`Servidor escuchando en el puerto ${env.port}`);

  // Por defecto el cron vive fuera del proceso (GitHub Actions) para que Render free no lo duerma.
  iniciarJobAlertas();
});


