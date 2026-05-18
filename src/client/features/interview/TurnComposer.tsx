import { useEffect, useMemo, useRef, useState } from "react";
import { useInterviewApi } from "../../app/providers/ApiClientsProvider";
import { DEFAULT_RUBRIC_DIMENSIONS } from "../../../lib/interview/rubric";
import { ErrorBanner } from "../../shared/components/ErrorBanner";
import { humanizeError, type HumanError } from "../../../lib/errors/humanize";
import { HttpError } from "../../../lib/api/client";
import type { InterviewAnswer } from "../../../lib/interview/types";
import {
  blobToBase64,
  parseRealtimeServerEvent,
  sendRealtimeMessage,
  waitDataChannelOpen,
  waitIceGatheringComplete,
  waitRealtimeReady,
} from "./turn-composer/turn-utils.js";
import { useVoiceActivity } from "./turn-composer/voice-activity.js";

const AUTO_START_RECORDING_DELAY_MS = 500;
const REALTIME_TURN_TIMEOUT_MS = 120_000;

type AdvancePayload = {
  questionId: string;
  questionText: string;
  prefetchedQuestionAudioBase64?: string | null;
};

type Props = {
  sessionId: string;
  activeQuestionId: string;
  prefetchedQuestionAudioBase64?: string | null;
  onTurnPendingChange: (pending: boolean) => void;
  onUserAnswer: (answer: Pick<InterviewAnswer, "questionId" | "text" | "source">) => void;
  onNextQuestion: (next: AdvancePayload) => void;
  onCompleted: () => void;
  onSwitchToText?: () => void;
};

export function TurnComposer({
  sessionId,
  activeQuestionId,
  prefetchedQuestionAudioBase64,
  onTurnPendingChange,
  onUserAnswer,
  onNextQuestion,
  onCompleted,
  onSwitchToText,
}: Props) {
  const interviewApi = useInterviewApi();
  const questionId = activeQuestionId;
  const [answerAudioBase64, setAnswerAudioBase64] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorState, setErrorState] = useState<HumanError | null>(null);
  const [errorSource, setErrorSource] = useState<"recording" | "submit" | "realtime" | null>(null);
  const [realtimePhase, setRealtimePhase] = useState<"idle" | "listening" | "thinking" | "speaking">("speaking");
  const [questionAudioUnavailable, setQuestionAudioUnavailable] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamIdRef = useRef<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const ttsChunksRef = useRef<string[]>([]);
  const questionAudioRef = useRef<HTMLAudioElement | null>(null);
  const closedByVadRef = useRef<boolean>(false);
  const startRecordingRef = useRef<() => Promise<void>>(async () => {});
  const realtimeTurnTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const readyNextQuestionAudioRef = useRef<string | null>(null);
  const transcriptRef = useRef<string | null>(null);

  const { vadStatus, startVad, stopVad } = useVoiceActivity(mediaRecorderRef, closedByVadRef);

  const ENABLE_REALTIME_VOICE = import.meta.env.VITE_VOICE_STREAMING_ENABLED !== "false";
  const ENABLE_REALTIME_CHUNKED_AUDIO = import.meta.env.VITE_REALTIME_CHUNKED_AUDIO_ENABLED !== "false";

  useEffect(() => {
    onTurnPendingChange(loading);
  }, [loading, onTurnPendingChange]);

  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  const canSubmit = useMemo(
    () => !!questionId && !!answerAudioBase64 && !loading && !isRecording,
    [questionId, answerAudioBase64, loading, isRecording]
  );
  const canRecord = !loading && !isRecording && realtimePhase !== "speaking";
  const statusText = useMemo(() => {
    if (realtimePhase === "speaking") return "Entrevistador hablando...";
    if (loading) return "Procesando respuesta...";
    if (realtimePhase === "thinking") return "Preparando siguiente pregunta...";
    if (isRecording) {
      switch (vadStatus) {
        case "voice":
          return "Te escucho...";
        case "silent_pause":
          return "ContinÃºa o termina...";
        case "waiting":
        default:
          return "Tu turno, habla...";
      }
    }
    return "Listo para responder";
  }, [realtimePhase, loading, isRecording, vadStatus]);
  const statusDetail = useMemo(() => {
    if (realtimePhase === "speaking") {
      return "La grabaciÃ³n empezarÃ¡ automÃ¡ticamente cuando termine el audio. TambiÃ©n puedes leer la pregunta en pantalla.";
    }
    if (loading || realtimePhase === "thinking") {
      return "Estamos transcribiendo, evaluando y preparando la siguiente pregunta. Si algo se queda bloqueado, mostraremos una opciÃ³n de reintento.";
    }
    if (isRecording) {
      return vadStatus === "silent_pause"
        ? "Si ya terminaste, puedes detener la grabaciÃ³n manualmente."
        : "Habla con naturalidad; detectaremos el silencio final.";
    }
    if (answerAudioBase64) return "Audio capturado. EnvÃ­alo para continuar o vuelve a grabar si quieres corregirlo.";
    return "Puedes responder por voz o cambiar a texto si el audio no va fino.";
  }, [answerAudioBase64, loading, realtimePhase, isRecording, vadStatus]);

  useEffect(() => {
    return () => {
      closeRealtimeConnection();
      closeEventSource();
      stopQuestionAudio();
      stopVad();
    };
  }, []);

  useEffect(() => {
    startRecordingRef.current = startRecording;
  });

  useEffect(() => {
    let active = true;
    let autoStartTimer: ReturnType<typeof setTimeout> | null = null;
    setRealtimePhase("speaking");

    function scheduleAutoStartRecording() {
      if (!active) return;
      autoStartTimer = setTimeout(() => {
        if (!active) return;
        void startRecordingRef.current();
      }, AUTO_START_RECORDING_DELAY_MS);
    }

    function handleQuestionAudioFinished() {
      if (!active) return;
      setRealtimePhase("idle");
      scheduleAutoStartRecording();
    }

    async function playQuestionAudio() {
      try {
        setQuestionAudioUnavailable(false);
        const audioBase64 =
          prefetchedQuestionAudioBase64 ??
          (await interviewApi.synthesizeQuestionAudio({ sessionId, questionId })).data.audioBase64;
        if (!active) return;
        const audio = new Audio(`data:audio/mpeg;base64,${audioBase64}`);
        questionAudioRef.current = audio;
        audio.onended = handleQuestionAudioFinished;
        audio.onerror = () => {
          setQuestionAudioUnavailable(true);
          handleQuestionAudioFinished();
        };
        await audio.play();
      } catch {
        if (active) setQuestionAudioUnavailable(true);
        handleQuestionAudioFinished();
      }
    }

    void playQuestionAudio();

    return () => {
      active = false;
      if (autoStartTimer !== null) {
        clearTimeout(autoStartTimer);
        autoStartTimer = null;
      }
      stopQuestionAudio();
    };
  }, [sessionId, questionId, prefetchedQuestionAudioBase64]);

  async function startRecording() {
    if (mediaRecorderRef.current?.state === "recording") return;
    setErrorState(null);
    setErrorSource(null);
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
      setErrorState(humanizeError(err));
      setErrorSource("recording");
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

    setErrorState(null);
    setErrorSource(null);
    setLoading(true);
    readyNextQuestionAudioRef.current = null;

    try {
      if (ENABLE_REALTIME_VOICE) {
        await submitRealtime(audioPayload);
      } else {
        await submitLegacy(audioPayload);
      }
    } catch (err) {
      setErrorState(humanizeError(err));
      setErrorSource("submit");
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
    const transcriptText = res.data.transcript?.trim();
    setTranscript(res.data.transcript);

    if (transcriptText) {
      onUserAnswer({ questionId, text: transcriptText, source: "voice" });
    }

    if (data.isCompleted) {
      onCompleted();
      return;
    }

    if (data.nextQuestion?.id) {
      const nextId = data.nextQuestion.id;
      const nextText = data.nextQuestion.text ?? "Siguiente pregunta";
      setAnswerAudioBase64(null);
      setTranscript(null);
      onNextQuestion({
        questionId: nextId,
        questionText: nextText,
        prefetchedQuestionAudioBase64: res.data.nextQuestionAudioBase64,
      });
      return;
    }
    setErrorState({
      title: "Respuesta sin continuaciÃ³n",
      message: "El servidor no devolviÃ³ la siguiente pregunta. Intenta de nuevo.",
      retry: true,
      fallbackToText: true,
    });
    setErrorSource("submit");
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
    armRealtimeTurnTimeout();
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

  function closeRealtimeConnection() {
    clearRealtimeTurnTimeout();
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

  function clearRealtimeTurnTimeout() {
    if (realtimeTurnTimeoutRef.current) {
      clearTimeout(realtimeTurnTimeoutRef.current);
      realtimeTurnTimeoutRef.current = null;
    }
  }

  function armRealtimeTurnTimeout() {
    clearRealtimeTurnTimeout();
    realtimeTurnTimeoutRef.current = setTimeout(() => {
      realtimeTurnTimeoutRef.current = null;
      closeRealtimeConnection();
      setLoading(false);
      setErrorState({
        title: "El servidor no respondiÃ³ a tiempo",
        message:
          "No se recibiÃ³ la siguiente pregunta antes del tiempo lÃ­mite. Puedes reintentar o continuar por texto.",
        retry: true,
        fallbackToText: true,
      });
      setErrorSource("realtime");
    }, REALTIME_TURN_TIMEOUT_MS);
  }

  function attachDataChannelListeners(channel: RTCDataChannel) {
    channel.onmessage = (event) => {
      const message = parseRealtimeServerEvent(String(event.data ?? ""));
      if (!message) return;

      switch (message.event) {
        case "stt_partial":
        case "stt_final":
          armRealtimeTurnTimeout();
          setTranscript(message.data.text);
          return;
        case "llm_token":
          return;
        case "tts_chunk":
          armRealtimeTurnTimeout();
          setRealtimePhase("speaking");
          ttsChunksRef.current.push(message.data.audioBase64Chunk);
          return;
        case "tts_done": {
          const audioBase64 = ttsChunksRef.current.join("");
          if (!audioBase64) return;
          readyNextQuestionAudioRef.current = audioBase64;
          return;
        }
        case "turn_completed": {
          closeRealtimeConnection();
          const transcriptText = transcriptRef.current?.trim();
          if (transcriptText) {
            onUserAnswer({ questionId, text: transcriptText, source: "voice" });
          }
          if (message.data.isCompleted) {
            onCompleted();
            return;
          }
          if (message.data.nextQuestionId) {
            const nextId = message.data.nextQuestionId;
            const nextText = message.data.nextQuestionText ?? "Siguiente pregunta";
            setAnswerAudioBase64(null);
            setTranscript(null);
            onNextQuestion({
              questionId: nextId,
              questionText: nextText,
              prefetchedQuestionAudioBase64: readyNextQuestionAudioRef.current,
            });
            readyNextQuestionAudioRef.current = null;
          }
          return;
        }
        case "error":
          closeRealtimeConnection();
          setErrorState(
            humanizeError(
              new HttpError({
                status: 502,
                code: message.data.code,
                message: message.data.message,
              })
            )
          );
          setErrorSource("realtime");
          return;
        case "ready":
        case "input_started":
        case "llm_done":
          return;
        default:
          return;
      }
    };
  }

  return (
    <>
      <header className="interview-panel-header interview-panel-header--voice">
        <p className="composer-hint">{statusDetail}</p>
        <span className={`status-pill ${loading || isRecording || realtimePhase !== "idle" ? "is-pulsing" : ""}`}>
          {statusText}
        </span>
      </header>

      {(questionAudioUnavailable || answerAudioBase64 || transcript) ? (
        <section className="voice-draft" aria-label="Estado del turno actual">
          {questionAudioUnavailable ? (
            <p className="voice-draft-line">Audio de la pregunta no disponible. Puedes leerla en el historial.</p>
          ) : null}
          {answerAudioBase64 ? (
            <p className="voice-draft-line">Audio capturado. Enviarlo para continuar o graba de nuevo.</p>
          ) : null}
          {transcript ? <pre className="code-block voice-draft-transcript">{transcript}</pre> : null}
        </section>
      ) : null}

      {errorState ? (
        <div className="composer-error">
          <ErrorBanner
            error={errorState}
            onRetry={
              errorState.retry
                ? () => {
                    if (errorSource === "recording") void startRecording();
                    else void onSubmit();
                  }
                : undefined
            }
            onSwitchToText={errorState.fallbackToText ? onSwitchToText : undefined}
          />
        </div>
      ) : null}

      <section className="composer-sticky">
        <div className="row-actions">
          {!isRecording ? (
            <button type="button" onClick={startRecording} disabled={!canRecord}>
              {realtimePhase === "speaking"
                ? "Esperando pregunta..."
                : answerAudioBase64
                ? "Grabar de nuevo"
                : "Grabar respuesta"}
            </button>
          ) : (
            <button type="button" onClick={stopRecording} disabled={loading}>
              Detener grabaciÃ³n
            </button>
          )}
          <button type="button" onClick={() => void onSubmit()} disabled={!canSubmit}>
            {loading ? "Enviando audio..." : "Enviar respuesta por voz"}
          </button>
        </div>
      </section>
    </>
  );
}