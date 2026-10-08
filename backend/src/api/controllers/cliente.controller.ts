import { createCrudController } from "./crud.controller";
import { clienteService } from "../../services/cliente.service";
import { crearClienteSchema, actualizarClienteSchema } from "../../schemas/cliente.schema";

export const clienteController = createCrudController(clienteService, crearClienteSchema, actualizarClienteSchema);
