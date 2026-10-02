-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Pedido" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "clienteId" INTEGER NOT NULL,
    "usuarioId" INTEGER,
    "fecha" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "fechaEntrega" DATETIME,
    "sena" DECIMAL DEFAULT 0,
    "restaPagar" DECIMAL DEFAULT 0,
    "medioPago" TEXT,
    "envio" DECIMAL,
    "observaciones" TEXT,
    "canalVenta" TEXT,
    CONSTRAINT "Pedido_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Pedido_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Pedido" ("canalVenta", "clienteId", "envio", "estado", "fecha", "id", "medioPago", "observaciones", "restaPagar", "sena", "usuarioId") SELECT "canalVenta", "clienteId", "envio", "estado", "fecha", "id", "medioPago", "observaciones", "restaPagar", "sena", "usuarioId" FROM "Pedido";
DROP TABLE "Pedido";
ALTER TABLE "new_Pedido" RENAME TO "Pedido";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
