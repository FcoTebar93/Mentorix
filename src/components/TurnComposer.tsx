import { useMemo, useRef, useState } from "react";
import { interviewApi } from "../lib/api/interview";
import { DEFAULT_RUBRIC_DIMENSIONS } from "../lib/interview/rubric";

type Props = {
  sessionId: string;
  initialQuestionId: string;
  initialQuestionText?: string;
  onCompleted: () => void;
};

export function TurnComposer({
  sessionId,
  initialQuestionId,
  initialQuestionText,
  onCompleted,
}: Props) {
  const [questionId, setQuestionId] = useState(initialQuestionId);
  const [questionText, setQuestionText] = useState(initialQuestionText ?? "Pregunta actual");
  const [answerAudioBase64, setAnswerAudioBase64] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [streamingAnswer, setStreamingAnswer] = useState<string>("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamIdRef = useRef<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const ttsChunksRef = useRef<string[]>([]);

  const ENABLE_REALTIME_VOICE =
    ((import.meta as { env?: Record<string, string | undefined> }).env?.VITE_VOICE_STREAMING_ENABLED ?? "true") !==
    "false";

  const canSubmit = useMemo(
    () => !!questionId && !!answerAudioBase64 && !loading && !isRecording,
    [questionId, answerAudioBase64, loading, isRecording]
  );
  const statusText = loading ? "Evaluando..." : isRecording ? "Pensando..." : "Listo para responder";

  async function startRecording() {
    setErrorMsg(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const base64 = await blobToBase64(blob);
        setAnswerAudioBase64(base64);
        setIsRecording(false);
        mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      };

      recorder.start();
      setIsRecording(true);
      setAnswerAudioBase64(null);
      setTranscript(null);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "No se pudo iniciar la grabación");
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
  }

  async function onSubmit() {
    if (!canSubmit) return;
    const audioPayload = answerAudioBase64;
    if (!audioPayload) return;

    setErrorMsg(null);
    setLoading(true);
    setStreamingAnswer("");

    try {
      if (ENABLE_REALTIME_VOICE) {
        await submitRealtime(audioPayload);
      } else {
        await submitLegacy(audioPayload);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Error enviando respuesta");
    } finally {
      setLoading(false);
    }
  }

  async function submitLegacy(audioPayload: string) {
    const res = await interviewApi.voiceTurn(sessionId, {
      questionId,
      answerAudioBase64: audioPayload,
      locale: "es-ES",
      rubricDimensions: DEFAULT_RUBRIC_DIMENSIONS,
    });

    const data = res.data.result;
    setTranscript(res.data.transcript);

    if (data.isCompleted) {
      onCompleted();
      return;
    }

    if (data.nextQuestion?.id) {
      setQuestionId(data.nextQuestion.id);
      setQuestionText(data.nextQuestion.text ?? "Siguiente pregunta");
      setAnswerAudioBase64(null);
      if (res.data.nextQuestionAudioBase64) {
        const audio = new Audio(`data:audio/mpeg;base64,${res.data.nextQuestionAudioBase64}`);
        void audio.play().catch(() => undefined);
      }
      return;
    }
    setErrorMsg("El backend no devolvió la siguiente pregunta.");
  }

  async function submitRealtime(audioPayload: string) {
    closeEventSource();
    ttsChunksRef.current = [];
    const streamId = crypto.randomUUID();
    streamIdRef.current = streamId;

    const pc = new RTCPeerConnection();
    peerConnectionRef.current = pc;
    const channel = pc.createDataChannel("mentorix-realtime");
    dataChannelRef.current = channel;
    attachDataChannelListeners(channel);

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await waitIceGatheringComplete(pc);

    const negotiation = await interviewApi.negotiateRealtime(sessionId, {
      streamId,
      sdpOffer: offer.sdp ?? "browser-offer",
    });
    await pc.setRemoteDescription({ type: "answer", sdp: negotiation.data.sdpAnswer });

    await waitDataChannelOpen(channel);
    channel.send(
      JSON.stringify({
        type: "input.submit",
        data: {
          streamId,
          sessionId,
          questionId,
          answerAudioBase64: audioPayload,
          locale: "es-ES",
          rubricDimensions: DEFAULT_RUBRIC_DIMENSIONS,
        },
      })
    );
  }

  function closeEventSource() {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }

  function attachDataChannelListeners(channel: RTCDataChannel) {
    channel.onmessage = (event) => {
      const message = parseJson<{ event?: string; data?: any }>(String(event.data ?? ""));
      if (!message?.event) return;
      const data = message.data;

      if (message.event === "stt_partial" || message.event === "stt_final") {
        setTranscript(data?.text ?? null);
        return;
      }
      if (message.event === "llm_token") {
        if (data?.token) setStreamingAnswer((prev) => prev + data.token);
        return;
      }
      if (message.event === "tts_chunk") {
        if (data?.audioBase64Chunk) ttsChunksRef.current.push(data.audioBase64Chunk);
        return;
      }
      if (message.event === "tts_done") {
        const audioBase64 = ttsChunksRef.current.join("");
        if (!audioBase64) return;
        const audio = new Audio(`data:audio/mpeg;base64,${audioBase64}`);
        void audio.play().catch(() => undefined);
        return;
      }
      if (message.event === "turn_completed") {
        if (data?.isCompleted) {
          onCompleted();
          return;
        }
        if (data?.nextQuestionId) {
          setQuestionId(data.nextQuestionId);
          setQuestionText(data.nextQuestionText ?? "Siguiente pregunta");
          setAnswerAudioBase64(null);
        }
        return;
      }
      if (message.event === "error") {
        if (data?.message) setErrorMsg(data.message);
      }
    };
  }

  return (
    <section className="interview-panel">
      <header className="interview-panel-header">
        <h2 className="title-reset">Entrevista en curso</h2>
        <span className={`status-pill ${loading || isRecording ? "is-pulsing" : ""}`}>{statusText}</span>
      </header>

      <section className="chat-container">
        <article className="message-row message-ai">
          <div className="message-bubble level-2">
            <p className="message-meta">AI Interviewer</p>
            <p className="text-reset">{questionText}</p>
          </div>
        </article>

        {answerAudioBase64 ? (
          <article className="message-row message-user">
            <div className="message-bubble level-2">
              <p className="message-meta">Tu respuesta</p>
              <p className="text-reset">Audio capturado y listo para enviar.</p>
            </div>
          </article>
        ) : null}

        {transcript ? (
          <article className="message-row message-user">
            <div className="message-bubble level-2">
              <p className="message-meta">Transcripción</p>
              <pre className="code-block">{transcript}</pre>
            </div>
          </article>
        ) : null}

        {streamingAnswer ? (
          <article className="message-row message-ai">
            <div className="message-bubble level-2">
              <p className="message-meta">Respuesta en streaming</p>
              <p className="text-reset">{streamingAnswer}</p>
            </div>
          </article>
        ) : null}

        {errorMsg ? <p className="error-text">{errorMsg}</p> : null}
      </section>

      <section className="composer-sticky">
        <div className="row-actions">
          {!isRecording ? (
            <button type="button" onClick={startRecording} disabled={loading}>
              Grabar respuesta
            </button>
          ) : (
            <button type="button" onClick={stopRecording} disabled={loading}>
              Detener grabación
            </button>
          )}
          <button type="button" onClick={onSubmit} disabled={!canSubmit}>
            {loading ? "Enviando audio..." : "Enviar respuesta por voz"}
          </button>
        </div>
      </section>
    </section>
  );
}

function parseEvent<T>(event: Event): T | null {
  const message = event as MessageEvent<string>;
  try {
    return JSON.parse(message.data) as T;
  } catch {
    return null;
  }
}

function parseJson<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function waitIceGatheringComplete(pc: RTCPeerConnection): Promise<void> {
  if (pc.iceGatheringState === "complete") return;
  await new Promise<void>((resolve) => {
    const handler = () => {
      if (pc.iceGatheringState === "complete") {
        pc.removeEventListener("icegatheringstatechange", handler);
        resolve();
      }
    };
    pc.addEventListener("icegatheringstatechange", handler);
  });
}

async function waitDataChannelOpen(channel: RTCDataChannel): Promise<void> {
  if (channel.readyState === "open") return;
  await new Promise<void>((resolve, reject) => {
    const onOpen = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error("REALTIME_DATA_CHANNEL_OPEN_FAILED"));
    };
    const cleanup = () => {
      channel.removeEventListener("open", onOpen);
      channel.removeEventListener("error", onError);
    };
    channel.addEventListener("open", onOpen);
    channel.addEventListener("error", onError);
  });
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}