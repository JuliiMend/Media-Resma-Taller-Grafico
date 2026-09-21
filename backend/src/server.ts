import { app } from "./app";
import { env } from "./config/env";

app.listen(env.port, "0.0.0.0", () => {
  console.log(`Servidor corriendo en http://localhost:${env.port}`);
  console.log(`También accesible desde la red local en este puerto`);
});