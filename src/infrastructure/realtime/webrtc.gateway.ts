import {
  RTCDataChannel,
  RTCPeerConnection,
  RTCSessionDescription,
} from "@roamhq/wrtc";

type RealtimeSignalInput = {
  streamId: string;
  sdpOffer: string;
  onInputMessage: (streamId: string, message: unknown) => Promise<void>;
};

type RealtimeSignalResult = {
  streamId: string;
  sdpAnswer: string;
  iceServers: Array<{ urls: string }>;
};

type SessionState = {
  peer: RTCPeerConnection;
  dataChannel: RTCDataChannel | null;
};

export class WebRtcRealtimeGateway {
  private readonly sessions = new Map<string, SessionState>();

  async negotiate(input: RealtimeSignalInput): Promise<RealtimeSignalResult> {
    this.close(input.streamId);
    const peer = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });
    const state: SessionState = { peer, dataChannel: null };
    this.sessions.set(input.streamId, state);

    peer.ondatachannel = (event) => {
      const channel = event.channel;
      state.dataChannel = channel;
      channel.onmessage = (messageEvent) => {
        const text = String(messageEvent.data ?? "");
        let payload: unknown = text;
        try {
          payload = JSON.parse(text);
        } catch {
          payload = { type: "raw", data: text };
        }
        void input.onInputMessage(input.streamId, payload);
      };
    };

    peer.onconnectionstatechange = () => {
      if (peer.connectionState === "failed" || peer.connectionState === "closed" || peer.connectionState === "disconnected") {
        this.close(input.streamId);
      }
    };

    await peer.setRemoteDescription(new RTCSessionDescription({ type: "offer", sdp: input.sdpOffer }));
    const answer = await peer.createAnswer();
    await peer.setLocalDescription(answer);
    await this.waitIceGatheringComplete(peer);

    const local = peer.localDescription;
    if (!local?.sdp) {
      throw new Error("REALTIME_NEGOTIATION_FAILED");
    }

    return {
      streamId: input.streamId,
      sdpAnswer: local.sdp,
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    };
  }

  send(streamId: string, event: string, data: unknown): void {
    const state = this.sessions.get(streamId);
    const channel = state?.dataChannel;
    if (!channel || channel.readyState !== "open") return;
    channel.send(JSON.stringify({ event, data }));
  }

  close(streamId: string): void {
    const state = this.sessions.get(streamId);
    if (!state) return;
    try {
      state.dataChannel?.close();
    } catch {
      // ignore close errors
    }
    try {
      state.peer.close();
    } catch {
      // ignore close errors
    }
    this.sessions.delete(streamId);
  }

  has(streamId: string): boolean {
    return this.sessions.has(streamId);
  }

  private async waitIceGatheringComplete(peer: RTCPeerConnection): Promise<void> {
    if (peer.iceGatheringState === "complete") return;
    await new Promise<void>((resolve) => {
      const timeout = setTimeout(() => {
        peer.removeEventListener("icegatheringstatechange", onChange);
        resolve();
      }, 1200);
      const onChange = () => {
        if (peer.iceGatheringState === "complete") {
          clearTimeout(timeout);
          peer.removeEventListener("icegatheringstatechange", onChange);
          resolve();
        }
      };
      peer.addEventListener("icegatheringstatechange", onChange);
    });
  }
}
