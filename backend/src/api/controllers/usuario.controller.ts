import { createCrudController } from "./crud.controller";
import { usuarioService } from "../../services/usuario.service";
import { crearUsuarioSchema, actualizarUsuarioSchema } from "../../schemas/usuario.schema";

export const usuarioController = createCrudController(usuarioService, crearUsuarioSchema, actualizarUsuarioSchema);
