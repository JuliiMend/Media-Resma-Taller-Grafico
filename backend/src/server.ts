import { app } from "./app";
import { env } from "./config/env";
import { iniciarJobAlertas } from "./jobs/chequeo-alertas.job";

app.listen(env.port, "0.0.0.0", () => {
  console.log(`Servidor escuchando en el puerto ${env.port}`);

  iniciarJobAlertas();
});


