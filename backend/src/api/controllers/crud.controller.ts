import { Request, Response } from "express";
import { ZodType, ZodTypeDef } from "zod";
import { asyncHandler } from "../../utils/asyncHandler";

export interface CrudService<Create, Update, Entity> {
  listar: () => Promise<Entity[]>;
  obtener: (id: number) => Promise<Entity>;
  crear: (data: Create) => Promise<Entity>;
  actualizar: (id: number, data: Update) => Promise<Entity>;
  eliminar: (id: number) => Promise<unknown>;
}

export function createCrudController<Create, Update, Entity>(
  service: CrudService<Create, Update, Entity>,
  createSchema: ZodType<Create, ZodTypeDef, unknown>,
  updateSchema: ZodType<Update, ZodTypeDef, unknown>
) {
  return {
    listar: asyncHandler(async (_req: Request, res: Response) => {
      res.json(await service.listar());
    }),
    obtener: asyncHandler(async (req: Request, res: Response) => {
      res.json(await service.obtener(Number(req.params.id)));
    }),
    crear: asyncHandler(async (req: Request, res: Response) => {
      res.status(201).json(await service.crear(createSchema.parse(req.body)));
    }),
    actualizar: asyncHandler(async (req: Request, res: Response) => {
      res.json(await service.actualizar(Number(req.params.id), updateSchema.parse(req.body)));
    }),
    eliminar: asyncHandler(async (req: Request, res: Response) => {
      await service.eliminar(Number(req.params.id));
      res.status(204).send();
    }),
  };
}
