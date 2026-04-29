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
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

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

    try {
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
      } else {
        setErrorMsg("El backend no devolvió la siguiente pregunta.");
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Error enviando respuesta");
    } finally {
      setLoading(false);
    }
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

async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}