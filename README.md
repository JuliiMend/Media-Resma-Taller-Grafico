# Media Resma Taller Gráfico

## Alertas

Las alertas se envían por Telegram y por email. En Render free el proceso puede dormirse y los
puertos SMTP salientes están bloqueados, así que el chequeo corre desde GitHub Actions y el mail
sale por la API HTTPS de Brevo.

### Variables del backend

| Variable | Uso |
| --- | --- |
| `TELEGRAM_BOT_TOKEN` | Token del bot de Telegram. |
| `TELEGRAM_CHAT_IDS` | Uno o varios chat ids separados por coma. |
| `BREVO_API_KEY` | API key de Brevo para enviar por HTTPS. |
| `EMAIL_REMITENTE` | Remitente verificado en Brevo. |
| `EMAIL_DESTINOS` | Destinatarios separados por coma. |
| `CRON_SECRET` | Secreto de al menos 24 caracteres para `POST /api/alertas/cron`. |
| `ENABLE_INTERNAL_CRON` | Opcional. Solo `true` activa el cron interno de node-cron (por defecto está apagado). |

Si no hay `BREVO_API_KEY`, se usa el fallback SMTP con `EMAIL_USER` y `EMAIL_PASS`. Ese camino
puede fallar en Render free.

### Secretos de GitHub

En el repositorio: **Settings → Secrets and variables → Actions → New repository secret**.

- `BACKEND_URL`: URL pública del backend, sin barra final (por ejemplo `https://mi-backend.onrender.com`).
- `CRON_SECRET`: el mismo valor configurado en el backend.

El workflow `.github/workflows/alertas.yml` se ejecuta todos los días a las 12:00 UTC (09:00 de
Argentina) y también se puede lanzar a mano con **Run workflow**. Si la respuesta no es 2xx, el job
falla. El secreto nunca se imprime.

### Prueba manual

```bash
curl -X POST "$BACKEND_URL/api/alertas/cron" -H "x-cron-secret: $CRON_SECRET"
```

Sin header o con un secreto incorrecto responde 401. Si `CRON_SECRET` no está configurado o tiene
menos de 24 caracteres, responde 503.
