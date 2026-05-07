import { useEffect, useMemo, useRef, useState } from "react";
import { interviewApi } from "../lib/api/interview";
import { DEFAULT_RUBRIC_DIMENSIONS } from "../lib/interview/rubric";
import type { RealtimeClientEvent, RealtimeServerEvent } from "../lib/interview/types";

const VAD_VOICE_RMS = 0.02;
const VAD_SILENCE_MS = 1500;
const VAD_MIN_SPEECH_MS = 600;
const VAD_MAX_DURATION_MS = 60_000;
const VAD_SAMPLE_INTERVAL_MS = 120;

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
  const [realtimePhase, setRealtimePhase] = useState<"idle" | "listening" | "thinking" | "speaking">("speaking");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamIdRef = useRef<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const ttsChunksRef = useRef<string[]>([]);
  const questionAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const vadIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const vadStartedAtRef = useRef<number>(0);
  const lastVoiceAtRef = useRef<number>(0);
  const voiceMsAccumRef = useRef<number>(0);
  const closedByVadRef = useRef<boolean>(false);

  const ENABLE_REALTIME_VOICE =
    ((import.meta as { env?: Record<string, string | undefined> }).env?.VITE_VOICE_STREAMING_ENABLED ?? "true") !==
    "false";
  const ENABLE_REALTIME_CHUNKED_AUDIO =
    ((import.meta as { env?: Record<string, string | undefined> }).env?.VITE_REALTIME_CHUNKED_AUDIO_ENABLED ?? "true") !==
    "false";

  const canSubmit = useMemo(
    () => !!questionId && !!answerAudioBase64 && !loading && !isRecording,
    [questionId, answerAudioBase64, loading, isRecording]
  );
  const canRecord = !loading && !isRecording && realtimePhase !== "speaking";
  const statusText =
    realtimePhase === "listening"
      ? "Escuchando..."
      : realtimePhase === "thinking"
        ? "Pensando..."
        : realtimePhase === "speaking"
          ? "Hablando..."
          : loading
            ? "Evaluando..."
            : isRecording
              ? "Grabando..."
              : "Listo para responder";

  useEffect(() => {
    return () => {
      closeRealtimeConnection();
      closeEventSource();
      stopQuestionAudio();
      stopVad();
    };
  }, []);

  useEffect(() => {
    let active = true;
    setRealtimePhase("speaking");

    async function playQuestionAudio() {
      try {
        const res = await interviewApi.synthesizeQuestionAudio({ sessionId, questionId });
        if (!active) return;
        const audio = new Audio(`data:audio/mpeg;base64,${res.data.audioBase64}`);
        questionAudioRef.current = audio;
        audio.onended = () => {
          if (!active) return;
          setRealtimePhase("idle");
        };
        audio.onerror = () => {
          if (!active) return;
          setRealtimePhase("idle");
        };
        await audio.play();
      } catch {
        if (!active) return;
        setRealtimePhase("idle");
      }
    }

    void playQuestionAudio();

    return () => {
      active = false;
      stopQuestionAudio();
    };
  }, [sessionId, questionId]);

  async function startRecording() {
    setErrorMsg(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];
      closedByVadRef.current = false;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onstop = async () => {
        stopVad();
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const base64 = await blobToBase64(blob);
        setAnswerAudioBase64(base64);
        setIsRecording(false);
        mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;

        const wasVadStop = closedByVadRef.current;
        closedByVadRef.current = false;
        if (wasVadStop) {
          await onSubmit(base64);
        }
      };

      recorder.start();
      setIsRecording(true);
      setRealtimePhase("listening");
      setAnswerAudioBase64(null);
      setTranscript(null);
      startVad(stream);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "No se pudo iniciar la grabación");
    }
  }

  function stopRecording() {
    closedByVadRef.current = false;
    mediaRecorderRef.current?.stop();
    setRealtimePhase("idle");
  }

  async function onSubmit(audioPayloadOverride?: string) {
    const audioPayload = audioPayloadOverride ?? answerAudioBase64;
    if (!audioPayload) return;
    if (!questionId) return;
    if (loading) return;

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
    closeRealtimeConnection();
    closeEventSource();
    ttsChunksRef.current = [];
    const streamId = crypto.randomUUID();
    streamIdRef.current = streamId;

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });
    peerConnectionRef.current = pc;
    const channel = pc.createDataChannel("mentorix-realtime");
    dataChannelRef.current = channel;
    attachDataChannelListeners(channel);

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await waitIceGatheringComplete(pc);

    const finalNegotiation = await interviewApi.negotiateRealtime(sessionId, {
      streamId,
      sdpOffer: offer.sdp ?? "browser-offer",
    });
    await pc.setRemoteDescription({ type: "answer", sdp: finalNegotiation.data.sdpAnswer });

    await waitDataChannelOpen(channel);
    await waitRealtimeReady(channel, streamId);
    setRealtimePhase("thinking");
    if (ENABLE_REALTIME_CHUNKED_AUDIO) {
      sendRealtimeMessage(channel, {
        type: "input.start",
        data: {
          streamId,
          sessionId,
          questionId,
          locale: "es-ES",
          rubricDimensions: DEFAULT_RUBRIC_DIMENSIONS,
        },
      });
      const chunkSize = 12_000;
      for (let i = 0; i < audioPayload.length; i += chunkSize) {
        sendRealtimeMessage(channel, {
          type: "input.audio_chunk",
          data: {
            streamId,
            audioBase64Chunk: audioPayload.slice(i, i + chunkSize),
          },
        });
      }
      sendRealtimeMessage(channel, {
        type: "input.end",
        data: { streamId },
      });
      return;
    }
    sendRealtimeMessage(channel, {
      type: "input.start",
      data: {
        streamId,
        sessionId,
        questionId,
        locale: "es-ES",
        rubricDimensions: DEFAULT_RUBRIC_DIMENSIONS,
      },
    });
    sendRealtimeMessage(channel, {
      type: "input.audio_chunk",
      data: {
        streamId,
        audioBase64Chunk: audioPayload,
      },
    });
    sendRealtimeMessage(channel, {
      type: "input.end",
      data: { streamId },
    });
  }

  function closeEventSource() {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }

  function stopQuestionAudio() {
    const audio = questionAudioRef.current;
    if (!audio) return;
    try {
      audio.pause();
      audio.src = "";
    } catch {
      // no-op
    }
    questionAudioRef.current = null;
  }

  function startVad(stream: MediaStream) {
    stopVad();
    const AudioContextCtor =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return;

    const audioContext = new AudioContextCtor();
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 1024;
    source.connect(analyser);

    audioContextRef.current = audioContext;
    analyserRef.current = analyser;

    const bufferLength = analyser.fftSize;
    const buffer = new Uint8Array(bufferLength);
    vadStartedAtRef.current = Date.now();
    lastVoiceAtRef.current = 0;
    voiceMsAccumRef.current = 0;

    vadIntervalRef.current = setInterval(() => {
      analyser.getByteTimeDomainData(buffer);
      const rms = computeRmsFromTimeDomain(buffer);
      const now = Date.now();

      if (rms >= VAD_VOICE_RMS) {
        if (lastVoiceAtRef.current > 0) {
          voiceMsAccumRef.current += now - lastVoiceAtRef.current;
        }
        lastVoiceAtRef.current = now;
      }

      const elapsed = now - vadStartedAtRef.current;
      if (elapsed >= VAD_MAX_DURATION_MS) {
        triggerVadStop();
        return;
      }

      const hasEnoughSpeech = voiceMsAccumRef.current >= VAD_MIN_SPEECH_MS;
      const silenceMs = lastVoiceAtRef.current === 0 ? 0 : now - lastVoiceAtRef.current;
      if (hasEnoughSpeech && silenceMs >= VAD_SILENCE_MS) {
        triggerVadStop();
      }
    }, VAD_SAMPLE_INTERVAL_MS);
  }

  function stopVad() {
    if (vadIntervalRef.current) {
      clearInterval(vadIntervalRef.current);
      vadIntervalRef.current = null;
    }
    if (analyserRef.current) {
      try {
        analyserRef.current.disconnect();
      } catch {
        // no-op
      }
      analyserRef.current = null;
    }
    if (audioContextRef.current) {
      void audioContextRef.current.close().catch(() => undefined);
      audioContextRef.current = null;
    }
    vadStartedAtRef.current = 0;
    lastVoiceAtRef.current = 0;
    voiceMsAccumRef.current = 0;
  }

  function triggerVadStop() {
    if (!mediaRecorderRef.current) return;
    if (mediaRecorderRef.current.state !== "recording") return;
    closedByVadRef.current = true;
    mediaRecorderRef.current.stop();
  }

  function closeRealtimeConnection() {
    if (dataChannelRef.current) {
      try {
        dataChannelRef.current.close();
      } catch {
        // no-op
      }
      dataChannelRef.current = null;
    }
    if (peerConnectionRef.current) {
      try {
        peerConnectionRef.current.close();
      } catch {
        // no-op
      }
      peerConnectionRef.current = null;
    }
    streamIdRef.current = null;
    setRealtimePhase("idle");
  }

  function attachDataChannelListeners(channel: RTCDataChannel) {
    channel.onmessage = (event) => {
      const message = parseJson<RealtimeServerEvent>(String(event.data ?? ""));
      if (!message?.event) return;
      const data = message.data as any;

      if (message.event === "stt_partial" || message.event === "stt_final") {
        setTranscript(data?.text ?? null);
        return;
      }
      if (message.event === "llm_token") {
        if (data?.token) setStreamingAnswer((prev) => prev + data.token);
        return;
      }
      if (message.event === "tts_chunk") {
        setRealtimePhase("speaking");
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
        closeRealtimeConnection();
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
        closeRealtimeConnection();
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
            <button type="button" onClick={startRecording} disabled={!canRecord}>
              {realtimePhase === "speaking" ? "Esperando al AI..." : "Grabar respuesta"}
            </button>
          ) : (
            <button type="button" onClick={stopRecording} disabled={loading}>
              Detener grabación
            </button>
          )}
          <button type="button" onClick={() => void onSubmit()} disabled={!canSubmit}>
            {loading ? "Enviando audio..." : "Enviar respuesta por voz"}
          </button>
        </div>
      </section>
    </section>
  );
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

async function waitRealtimeReady(channel: RTCDataChannel, expectedStreamId: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error("REALTIME_READY_TIMEOUT"));
    }, 5000);
    const onMessage = (event: MessageEvent<string>) => {
      const payload = parseJson<{ event?: string; data?: { streamId?: string } }>(String(event.data ?? ""));
      if (payload?.event !== "ready") return;
      if (payload.data?.streamId !== expectedStreamId) return;
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error("REALTIME_READY_FAILED"));
    };
    const cleanup = () => {
      clearTimeout(timeout);
      channel.removeEventListener("message", onMessage as EventListener);
      channel.removeEventListener("error", onError);
    };
    channel.addEventListener("message", onMessage as EventListener);
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

function computeRmsFromTimeDomain(buffer: Uint8Array): number {
  if (buffer.length === 0) return 0;
  let sumSquares = 0;
  for (let i = 0; i < buffer.length; i += 1) {
    const normalized = (buffer[i]! - 128) / 128;
    sumSquares += normalized * normalized;
  }
  return Math.sqrt(sumSquares / buffer.length);
}

function sendRealtimeMessage(channel: RTCDataChannel, message: RealtimeClientEvent): void {
  channel.send(JSON.stringify(message));
}