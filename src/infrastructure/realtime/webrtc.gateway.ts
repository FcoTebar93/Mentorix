import wrtc from "@roamhq/wrtc";

const { RTCPeerConnection, RTCSessionDescription } = wrtc;

type RealtimeSignalInput = {
  streamId: string;
  sessionId: string;
  sdpOffer: string;
  onInputMessage: (streamId: string, message: unknown) => Promise<void>;
};

type RealtimeSignalResult = {
  streamId: string;
  sdpAnswer: string;
  iceServers: Array<{ urls: string }>;
};

type SessionState = {
  sessionId: string;
  peer: InstanceType<typeof RTCPeerConnection>;
  dataChannel: RTCDataChannel | null;
  idleTimer: ReturnType<typeof setTimeout> | null;
};

export class WebRtcRealtimeGateway {
  private readonly sessions = new Map<string, SessionState>();
  private readonly idleMs = Number(process.env.REALTIME_IDLE_TIMEOUT_MS ?? 90_000);
  private readonly iceServers = parseIceServers(process.env.REALTIME_ICE_SERVERS);

  async negotiate(input: RealtimeSignalInput): Promise<RealtimeSignalResult> {
    this.close(input.streamId);
    const peer = new RTCPeerConnection({
      iceServers: this.iceServers,
    });
    const state: SessionState = { sessionId: input.sessionId, peer, dataChannel: null, idleTimer: null };
    this.sessions.set(input.streamId, state);
    this.bumpIdleTimer(input.streamId);

    peer.ondatachannel = (event) => {
      const channel = event.channel;
      state.dataChannel = channel;
      channel.onopen = () => {
        this.bumpIdleTimer(input.streamId);
        channel.send(JSON.stringify({ event: "ready", data: { streamId: input.streamId } }));
      };
      channel.onclose = () => this.close(input.streamId);
      channel.onerror = () => this.close(input.streamId);
      channel.onmessage = (messageEvent) => {
        this.bumpIdleTimer(input.streamId);
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
      iceServers: this.iceServers,
    };
  }

  send(streamId: string, event: string, data: unknown): void {
    const state = this.sessions.get(streamId);
    const channel = state?.dataChannel;
    if (!channel || channel.readyState !== "open") return;
    this.bumpIdleTimer(streamId);
    channel.send(JSON.stringify({ event, data }));
  }

  close(streamId: string): void {
    const state = this.sessions.get(streamId);
    if (!state) return;
    if (state.idleTimer) {
      clearTimeout(state.idleTimer);
      state.idleTimer = null;
    }
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

  matchesSession(streamId: string, sessionId: string): boolean {
    return this.sessions.get(streamId)?.sessionId === sessionId;
  }

  private bumpIdleTimer(streamId: string): void {
    const state = this.sessions.get(streamId);
    if (!state) return;
    if (state.idleTimer) clearTimeout(state.idleTimer);
    state.idleTimer = setTimeout(() => {
      this.close(streamId);
    }, this.idleMs);
  }

  private async waitIceGatheringComplete(peer: InstanceType<typeof RTCPeerConnection>): Promise<void> {
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

function parseIceServers(rawValue: string | undefined): Array<{ urls: string }> {
  if (!rawValue?.trim()) {
    return [{ urls: "stun:stun.l.google.com:19302" }];
  }
  const parsed = rawValue
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((urls) => ({ urls }));
  return parsed.length > 0 ? parsed : [{ urls: "stun:stun.l.google.com:19302" }];
}
