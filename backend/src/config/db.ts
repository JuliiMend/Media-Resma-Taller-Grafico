import { PrismaClient } from "@prisma/client";

// Instancia única de Prisma para toda la app (evita abrir
// muchas conexiones a SQLite en desarrollo con hot-reload).
export const prisma = new PrismaClient();
