import { useCallback, useRef, useState, type MutableRefObject } from "react";
import { computeRmsFromTimeDomain } from "./turn-utils.js";

export type VadStatus = "idle" | "waiting" | "voice" | "silent_pause";

const VAD_VOICE_RMS = 0.02;
const VAD_SILENCE_MS = 1500;
const VAD_MIN_SPEECH_MS = 600;
const VAD_MAX_DURATION_MS = 60_000;
const VAD_SAMPLE_INTERVAL_MS = 120;

export function useVoiceActivity(
  mediaRecorderRef: MutableRefObject<MediaRecorder | null>,
  closedByVadRef: MutableRefObject<boolean>
) {
  const [vadStatus, setVadStatus] = useState<VadStatus>("idle");
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const vadIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const vadStartedAtRef = useRef<number>(0);
  const lastVoiceAtRef = useRef<number>(0);
  const voiceMsAccumRef = useRef<number>(0);
  const lastVadStatusRef = useRef<VadStatus>("idle");

  const applyVadStatus = useCallback((next: VadStatus) => {
    if (lastVadStatusRef.current === next) return;
    lastVadStatusRef.current = next;
    setVadStatus(next);
  }, []);

  const stopVad = useCallback(() => {
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
    applyVadStatus("idle");
  }, [applyVadStatus]);

  const triggerVadStop = useCallback(() => {
    const rec = mediaRecorderRef.current;
    if (!rec) return;
    if (rec.state !== "recording") return;
    closedByVadRef.current = true;
    rec.stop();
  }, [closedByVadRef, mediaRecorderRef]);

  const startVad = useCallback(
    (stream: MediaStream) => {
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

      applyVadStatus("waiting");

      vadIntervalRef.current = setInterval(() => {
        analyser.getByteTimeDomainData(buffer);
        const rms = computeRmsFromTimeDomain(buffer);
        const now = Date.now();
        const isVoice = rms >= VAD_VOICE_RMS;

        if (isVoice) {
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
          return;
        }

        if (isVoice) {
          applyVadStatus("voice");
        } else if (lastVoiceAtRef.current > 0) {
          applyVadStatus("silent_pause");
        } else {
          applyVadStatus("waiting");
        }
      }, VAD_SAMPLE_INTERVAL_MS);
    },
    [applyVadStatus, stopVad, triggerVadStop]
  );

  return { vadStatus, startVad, stopVad };
}
