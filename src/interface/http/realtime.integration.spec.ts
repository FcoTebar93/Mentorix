import { describe, expect, it } from "vitest";
import { auth, buildHttpTestServer } from "./tests/helpers.js";
import { RTCPeerConnection } from "@roamhq/wrtc";

describe("HTTP realtime routes", { timeout: 15000 }, () => {
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
});
