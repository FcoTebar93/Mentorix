import { describe, expect, it } from "vitest";
import { auth, buildHttpTestServer } from "./tests/helpers.js";
import { RTCPeerConnection } from "@roamhq/wrtc";

describe("HTTP realtime routes", { timeout: 15000 }, () => {
  it("emits ready event after negotiation", async () => {
    const app = buildHttpTestServer();
    try {
      const pc = new RTCPeerConnection();
      const channel = pc.createDataChannel("mentorix-realtime");
      const readyPromise = new Promise<{ event?: string; data?: { streamId?: string } }>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("READY_TIMEOUT")), 4000);
        channel.onmessage = (event) => {
          try {
            const payload = JSON.parse(String(event.data ?? "")) as { event?: string; data?: { streamId?: string } };
            if (payload.event === "ready") {
              clearTimeout(timeout);
              resolve(payload);
            }
          } catch {
            // ignore parsing errors
          }
        };
      });

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const negotiate = await app.inject({
        method: "POST",
        url: "/v1/realtime/sessions/s1/negotiate",
        headers: auth("u1"),
        payload: {
          streamId: "stream-ready",
          sdpOffer: offer.sdp,
        },
      });

      expect(negotiate.statusCode).toBe(200);
      const negotiationData = negotiate.json().data as { sdpAnswer: string };
      await pc.setRemoteDescription({ type: "answer", sdp: negotiationData.sdpAnswer });

      const ready = await readyPromise;
      expect(ready.event).toBe("ready");
      expect(ready.data?.streamId).toBe("stream-ready");
    } finally {
      await app.close();
    }
  });

  it("negotiates and accepts realtime input", async () => {
    const app = buildHttpTestServer();
    try {
      const pc = new RTCPeerConnection();
      pc.createDataChannel("mentorix-realtime");
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const negotiate = await app.inject({
        method: "POST",
        url: "/v1/realtime/sessions/s1/negotiate",
        headers: auth("u1"),
        payload: {
          streamId: "stream-1",
          sdpOffer: offer.sdp,
        },
      });

      expect(negotiate.statusCode).toBe(200);
      expect(negotiate.json().code).toBe("OK");

      const submit = await app.inject({
        method: "POST",
        url: "/v1/realtime/sessions/s1/input",
        headers: auth("u1"),
        payload: {
          streamId: "stream-1",
          questionId: "q1",
          locale: "es-ES",
          answerText: "respuesta de prueba",
          rubricDimensions: [{ key: "clarity", weight: 1 }],
        },
      });

      expect(submit.statusCode).toBe(202);
      expect(submit.json().code).toBe("OK");
    } finally {
      await app.close();
    }
  });

  it("rejects stream access from a different session id", async () => {
    const app = buildHttpTestServer();
    try {
      const pc = new RTCPeerConnection();
      pc.createDataChannel("mentorix-realtime");
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const negotiate = await app.inject({
        method: "POST",
        url: "/v1/realtime/sessions/s1/negotiate",
        headers: auth("u1"),
        payload: {
          streamId: "stream-cross-session",
          sdpOffer: offer.sdp,
        },
      });
      expect(negotiate.statusCode).toBe(200);

      const events = await app.inject({
        method: "GET",
        url: "/v1/realtime/sessions/s2/events?streamId=stream-cross-session",
        headers: auth("u1"),
      });
      expect(events.statusCode).toBe(404);
      expect(events.json().code).toBe("REALTIME_STREAM_NOT_FOUND");
    } finally {
      await app.close();
    }
  });
});
