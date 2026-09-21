import express from "express";
import cors from "cors";
import { apiRouter } from "./api/routes";
import { errorHandler } from "./api/middlewares/error.middleware";

export const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send("API del backend de Media Resma funcionando correctamente");
});

app.get('/api/health', (req, res) => {
    res.json({
        ok: true,
        mensaje: "El motor de Media Resma está corriendo perfecto"
    });
});

app.use("/api", apiRouter);
app.use(errorHandler);