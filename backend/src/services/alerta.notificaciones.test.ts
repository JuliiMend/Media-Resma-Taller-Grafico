import assert from "node:assert/strict";
import {
  agruparDeudas,
  clasificarPedidos,
  compararSecreto,
  construirResumen,
  dividirMensaje,
  escapeHtml,
  formatearFechaBA,
  MAX_CARACTERES_TELEGRAM,
  type DeudaAviso,
  type PedidoFechaAviso,
} from "../utils/notificaciones";

const HOY = "2026-11-02";

const pedido = (id: number, nombre: string, fechaEntrega: string): PedidoFechaAviso => ({
  id,
  cliente: { nombre },
  fechaEntrega: new Date(`${fechaEntrega}T00:00:00.000Z`),
});

const deuda = (
  id: number,
  nombre: string,
  restaPagar: number,
  estado = "LISTO",
): DeudaAviso => ({
  id,
  estado,
  restaPagar,
  cliente: { nombre },
});

const casos: Array<[string, () => void]> = [
  [
    "escape HTML de & y < en nombres",
    () => {
      const resumen = construirResumen({
        atrasados: [pedido(1, "Panadería <A&B>", "2026-11-01")],
        proximos: [],
        deudas: [],
        stockBajo: [],
        tareas: [],
        hoy: HOY,
      });
      assert.match(resumen.texto, /Panadería &lt;A&amp;B&gt;/);
      assert.match(resumen.html, /Panadería &lt;A&amp;B&gt;/);
      assert.doesNotMatch(resumen.texto, /<A&B>/);
      assert.equal(escapeHtml("a & b < c > d"), "a &amp; b &lt; c &gt; d");
    },
  ],
  [
    "mensaje de 10.000 caracteres se parte en bloques de máximo 3500",
    () => {
      const texto = "x".repeat(10_000);
      const bloques = dividirMensaje(texto);
      assert.equal(bloques.length, 3);
      for (const bloque of bloques) {
        assert.ok(bloque.length <= MAX_CARACTERES_TELEGRAM);
      }
      assert.equal(bloques.join(""), texto);
    },
  ],
  [
    "mensaje multilínea conserva el orden y corta entre líneas",
    () => {
      const lineas = Array.from({ length: 500 }, (_, i) => `Línea ${i} con texto suficiente`);
      const bloques = dividirMensaje(lineas.join("\n"));
      for (const bloque of bloques) {
        assert.ok(bloque.length <= MAX_CARACTERES_TELEGRAM);
        assert.ok(!bloque.startsWith("\n"));
      }
      assert.equal(bloques.join("\n"), lineas.join("\n"));
    },
  ],
  [
    "pedido con entrega hoy no es atrasado; ayer sí",
    () => {
      const { atrasados, proximos } = clasificarPedidos(
        [
          pedido(1, "Hoy", HOY),
          pedido(2, "Ayer", "2026-11-01"),
          pedido(3, "En tres días", "2026-11-05"),
          pedido(4, "En cuatro días", "2026-11-06"),
        ],
        HOY,
      );
      assert.deepEqual(
        atrasados.map((p) => p.id),
        [2],
      );
      assert.deepEqual(
        proximos.map((p) => p.id),
        [1, 3],
      );
    },
  ],
  [
    "fecha sin hora conserva el día elegido al formatear en Buenos Aires",
    () => {
      assert.equal(formatearFechaBA(new Date("2026-11-02T00:00:00.000Z")), "02/11/2026");
    },
  ],
  [
    "residuo de 0.004 no aparece como deuda",
    () => {
      const resumen = construirResumen({
        atrasados: [],
        proximos: [],
        deudas: [deuda(1, "Residuo", 0.004)],
        stockBajo: [],
        tareas: [],
        hoy: HOY,
      });
      assert.equal(resumen.avisos, 0);
      assert.equal(resumen.deudasAgrupadas.length, 0);
      assert.doesNotMatch(resumen.texto, /Residuo/);
    },
  ],
  [
    "deudas agrupadas por cliente, top 10 y resto",
    () => {
      const deudas = Array.from({ length: 12 }, (_, i) =>
        deuda(i + 1, `Cliente ${i + 1}`, 100_000 - i * 1_000),
      );
      deudas.push(deuda(99, "En curso", 50_000, "PENDIENTE"));
      const agrupadas = agruparDeudas(deudas);
      assert.equal(agrupadas.grupos.length, 10);
      assert.equal(agrupadas.restantes, 2);
      assert.equal(agrupadas.pedidos, 12);
      const resumen = construirResumen({
        atrasados: [],
        proximos: [],
        deudas,
        stockBajo: [],
        tareas: [],
        hoy: HOY,
      });
      assert.match(resumen.texto, /y 2 clientes más/);
      assert.match(resumen.texto, /\$100\.000/);
      assert.doesNotMatch(resumen.texto, /En curso/);
    },
  ],
  [
    "secreto del cron: igual, distinto y largo distinto",
    () => {
      const secreto = "clave-segura-de-24-o-mas-caracteres";
      assert.equal(compararSecreto(secreto, secreto), true);
      assert.equal(compararSecreto("clave-segura-de-24-o-mas-caracteres!", secreto), false);
      assert.equal(compararSecreto("otra-clave-distinta-1234567890", secreto), false);
      assert.equal(compararSecreto(undefined, secreto), false);
    },
  ],
  [
    "asunto con la fecha del resumen",
    () => {
      const resumen = construirResumen({
        atrasados: [pedido(1, "Cliente", "2026-11-01")],
        proximos: [],
        deudas: [],
        stockBajo: [],
        tareas: [],
        hoy: HOY,
      });
      assert.equal(resumen.asunto, "Resumen de alertas · 2/11");
    },
  ],
];

async function probarEnvios(): Promise<void> {
  process.env.JWT_SECRET = "test-secret-no-real";
  process.env.TELEGRAM_BOT_TOKEN = "123:TEST_TOKEN";
  process.env.TELEGRAM_CHAT_IDS = "111";
  process.env.BREVO_API_KEY = "brevo-test-key";
  process.env.EMAIL_REMITENTE = "remitente@example.com";
  process.env.EMAIL_DESTINOS = "uno@example.com,dos@example.com";
  process.env.CRON_SECRET = "clave-segura-de-24-o-mas-caracteres";

  const { env } = await import("../config/env");
  const { enviarMensajeTelegram } = await import("../utils/telegram");
  const { enviarEmail } = await import("../utils/email");

  const llamadas: Array<{ url: string; init: RequestInit }> = [];
  const fetchOriginal = globalThis.fetch;
  let respuestaBrevo: "ok" | "error" = "ok";

  globalThis.fetch = (async (
    input: Parameters<typeof fetch>[0],
    init?: Parameters<typeof fetch>[1],
  ) => {
    const url = String(input);
    llamadas.push({ url, init: init ?? {} });

    if (url.includes("api.telegram.org")) {
      const body = JSON.parse(String(init?.body ?? "{}")) as { chat_id?: string };
      if (body.chat_id === "malo") {
        return new Response(
          JSON.stringify({ ok: false, description: "Bad Request: chat not found" }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url === "https://api.brevo.com/v3/smtp/email") {
      if (respuestaBrevo === "error") {
        return new Response(
          JSON.stringify({ code: "unauthorized", message: "Key not found" }),
          { status: 401, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response(JSON.stringify({ messageId: "<test@example.com>" }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    }

    throw new Error(`fetch inesperado: ${url}`);
  }) as typeof fetch;

  try {
    // Telegram: 10.000 caracteres se envían en bloques y en orden.
    env.telegramChatIds = ["111"];
    llamadas.length = 0;
    const telegramLargo = await enviarMensajeTelegram("x".repeat(10_000));
    assert.equal(telegramLargo.ok, true);
    assert.equal(telegramLargo.configurado, true);
    assert.equal(llamadas.length, 3);
    for (const llamada of llamadas) {
      const body = JSON.parse(String(llamada.init.body)) as { text: string };
      assert.ok(body.text.length <= MAX_CARACTERES_TELEGRAM);
    }
    console.log("OK Telegram parte mensajes largos con fetch mockeado");

    // Telegram: un chat con error no frena a los demás.
    env.telegramChatIds = ["111", "malo"];
    llamadas.length = 0;
    const telegramParcial = await enviarMensajeTelegram("Hola & <mundo>");
    assert.equal(telegramParcial.ok, false);
    assert.equal(telegramParcial.configurado, true);
    assert.match(telegramParcial.error ?? "", /chat malo/);
    assert.match(telegramParcial.error ?? "", /chat not found/);
    assert.equal(llamadas.length, 2);
    assert.ok(!(telegramParcial.error ?? "").includes("TEST_TOKEN"));
    console.log("OK Telegram informa el chat que falló sin cortar los demás");

    // Email: Brevo por HTTPS con api-key y destinatarios.
    respuestaBrevo = "ok";
    llamadas.length = 0;
    const emailOk = await enviarEmail("Asunto de prueba", "<p>Hola</p>");
    assert.deepEqual(emailOk, { canal: "email", ok: true, configurado: true });
    assert.equal(llamadas.length, 1);
    const llamadaBrevo = llamadas[0];
    assert.equal(llamadaBrevo.url, "https://api.brevo.com/v3/smtp/email");
    const headers = llamadaBrevo.init.headers as Record<string, string>;
    assert.equal(headers["api-key"], "brevo-test-key");
    const bodyBrevo = JSON.parse(String(llamadaBrevo.init.body)) as {
      sender: { name: string; email: string };
      to: Array<{ email: string }>;
      subject: string;
      htmlContent: string;
    };
    assert.deepEqual(bodyBrevo.sender, {
      name: "Media Resma Taller Gráfico",
      email: "remitente@example.com",
    });
    assert.deepEqual(bodyBrevo.to, [
      { email: "uno@example.com" },
      { email: "dos@example.com" },
    ]);
    assert.equal(bodyBrevo.subject, "Asunto de prueba");
    assert.equal(bodyBrevo.htmlContent, "<p>Hola</p>");
    console.log("OK Email usa Brevo por HTTPS con fetch mockeado");

    // Email: el error se devuelve y no filtra la clave.
    respuestaBrevo = "error";
    const emailError = await enviarEmail("Falla", "<p>Falla</p>");
    assert.equal(emailError.ok, false);
    assert.equal(emailError.configurado, true);
    assert.match(emailError.error ?? "", /401/);
    assert.ok(!(emailError.error ?? "").includes("brevo-test-key"));
    console.log("OK Email devuelve el error real sin secretos");

    // Canal sin configurar.
    const keyOriginal = env.brevoApiKey;
    const userOriginal = env.emailUser;
    const passOriginal = env.emailPass;
    env.brevoApiKey = "";
    env.emailUser = "";
    env.emailPass = "";
    const emailSinConfigurar = await enviarEmail("Nada", "<p>Nada</p>");
    assert.deepEqual(emailSinConfigurar, {
      canal: "email",
      ok: false,
      configurado: false,
      error: "No configurado",
    });
    env.brevoApiKey = keyOriginal;
    env.emailUser = userOriginal;
    env.emailPass = passOriginal;
    console.log("OK Canal sin configurar devuelve «No configurado»");
  } finally {
    globalThis.fetch = fetchOriginal;
  }
}

async function main(): Promise<void> {
  for (const [nombre, ejecutar] of casos) {
    ejecutar();
    console.log(`OK ${nombre}`);
  }

  await probarEnvios();

  console.log(`\n${casos.length} casos sincrónicos + 4 pruebas de envío: OK`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
