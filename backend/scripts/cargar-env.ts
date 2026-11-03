import path from "node:path";
import dotenv from "dotenv";

// Carga el .env del backend sin depender del directorio desde donde se ejecute.
dotenv.config({ path: path.resolve(__dirname, "..", ".env") });
