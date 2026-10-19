-- AlterTable
ALTER TABLE "Cliente" ADD COLUMN     "activo" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Producto" ADD COLUMN     "costo" DECIMAL(65,30),
ADD COLUMN     "unidad" TEXT NOT NULL DEFAULT 'u';
