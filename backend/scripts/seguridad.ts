/**
 * Evita correr scripts contra la base de producción por accidente.
 */
export function exigirBaseLocal(permitirRemoto = false): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("Falta DATABASE_URL en backend/.env");
    process.exit(1);
  }

  let hostname = "";
  let protocolo = "";
  try {
    const parsed = new URL(url);
    hostname = parsed.hostname;
    protocolo = parsed.protocol;
  } catch {
    console.error("DATABASE_URL no es una URL válida");
    process.exit(1);
  }

  const local =
    protocolo === "file:" ||
    ["localhost", "127.0.0.1", "::1", "[::1]"].includes(hostname);

  if (!local && !permitirRemoto) {
    console.error(
      `DATABASE_URL apunta a "${hostname}", que no es local.\n` +
        "Este script no se ejecuta contra una base remota. " +
        "Usá una base local o pasá --permitir-remoto si sabés lo que hacés."
    );
    process.exit(1);
  }

  return url;
}
