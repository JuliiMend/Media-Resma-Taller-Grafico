import { AsyncLocalStorage } from "node:async_hooks";

type RequestContext = {
  usuarioId: number;
};

export const requestContext = new AsyncLocalStorage<RequestContext>();

export function getUsuarioId(): number | undefined {
  return requestContext.getStore()?.usuarioId;
}
