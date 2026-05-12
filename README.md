# Mentorix

Plataforma de entrevistas técnicas guiadas por IA. Un reclutador crea una plantilla (rol, nivel, rúbrica), genera un link de acceso y el candidato hace la entrevista por **texto o voz** contra un LLM que pregunta, escucha, evalúa y emite un reporte.

## Stack

- **Backend:** Node + TypeScript, Fastify, Drizzle ORM, Postgres.
- **Frontend:** React + Vite.
- **LLM:** Configurable a OpenAI/Anthropic/Gemini/Ollama/Groq.
- **Voz local:** `faster-whisper` (STT) y `piper-tts` (TTS) en contenedores propios. Realtime sobre WebRTC.

## Requisitos

- Node 20+
- Docker Desktop
- Una API key de Groq (o equivalente)

## Puesta en marcha

1. Clona el repo e instala dependencias.

   ```bash
   npm install
   ```

2. Configura `.env` (ya hay un ejemplo). Mínimo:

   ```env
   LLM_PROVIDER=nombre_proveedor(ejemplo: groq)
   LLM_API_KEY=api_key_proveedor_llm
   LLM_MODEL=nombre_modelo_usado
   DATABASE_URL=postgres://mentorix:mentorix@127.0.0.1:55433/mentorix

   STT_PROVIDER=custom
   TTS_PROVIDER=custom
   CUSTOM_STT_BASE_URL=http://127.0.0.1:8081
   CUSTOM_TTS_BASE_URL=http://127.0.0.1:8082
   WHISPER_MODEL_SIZE=tiny
   ```

3. Descarga el modelo de Piper en `models/piper/`:

   - `es_ES-carlfm-x_low.onnx`
   - `es_ES-carlfm-x_low.onnx.json`

   Disponible en [rhasspy/piper-voices](https://huggingface.co/rhasspy/piper-voices/tree/main/es/es_ES/carlfm/x_low).

4. Levanta los servicios de infraestructura:

   ```bash
   docker compose up -d postgres whisper-service piper-service
   npm run db:migrate
   ```

5. Arranca backend y frontend en dos terminales:

   ```bash
   npm run dev:api   # http://localhost:4000
   npm run dev:web   # http://localhost:5173
   ```

## Tests

```bash
npm test
```

## Estado actual

> **STT y TTS están en desarrollo.** El flujo funciona de extremo a extremo (TTS de pregunta, captura de audio, STT de respuesta, evaluación y siguiente pregunta), pero quedan piezas pendientes:
>
> - Whisper `tiny` prioriza velocidad sobre exactitud; transcripciones cortas o ruidosas pueden fallar.
> - Piper usa un modelo `x_low` de baja fidelidad; la voz suena robótica.
> - El streaming realtime sobre WebRTC sintetiza/transcribe en un único bloque, no chunk a chunk (la UI prepara los chunks pero el backend los concatena antes de procesar).
> - No hay aún VAD del lado servidor; el cliente decide cuándo cortar.
>
> Se está trabajando en mejorar calidad (modelos más grandes, streaming real) y en abrir la opción de delegar voz a proveedores cloud (OpenAI Realtime, etc.) sin tocar el dominio.

El resto de la app (plantillas, links, sesiones, evaluación, reportes) está estable.
