import type { RealtimeClientEvent, RealtimeServerEvent } from "../../../../lib/interview/types.js";

export function parseJson<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function parseRealtimeServerEvent(raw: string): RealtimeServerEvent | null {
  const parsed = parseJson<unknown>(raw);
  if (!parsed || typeof parsed !== "object") return null;
  if (!("event" in parsed)) return null;
  const ev = (parsed as { event: unknown }).event;
  if (typeof ev !== "string") return null;
  return parsed as RealtimeServerEvent;
}

export async function waitIceGatheringComplete(pc: RTCPeerConnection): Promise<void> {
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

export async function waitDataChannelOpen(channel: RTCDataChannel): Promise<void> {
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

export async function waitRealtimeReady(channel: RTCDataChannel, expectedStreamId: string): Promise<void> {
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

export async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export function computeRmsFromTimeDomain(buffer: Uint8Array): number {
  if (buffer.length === 0) return 0;
  let sumSquares = 0;
  for (let i = 0; i < buffer.length; i += 1) {
    const normalized = (buffer[i]! - 128) / 128;
    sumSquares += normalized * normalized;
  }
  return Math.sqrt(sumSquares / buffer.length);
}

export function sendRealtimeMessage(channel: RTCDataChannel, message: RealtimeClientEvent): void {
  channel.send(JSON.stringify(message));
}
