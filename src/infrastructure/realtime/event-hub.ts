type Listener = (event: RealtimeEventEnvelope) => void;

export type RealtimeEventEnvelope = {
  streamId: string;
  event: string;
  data: unknown;
};

export class RealtimeEventHub {
  private readonly listeners = new Map<string, Set<Listener>>();

  subscribe(streamId: string, listener: Listener): () => void {
    const set = this.listeners.get(streamId) ?? new Set<Listener>();
    set.add(listener);
    this.listeners.set(streamId, set);
    return () => {
      const current = this.listeners.get(streamId);
      if (!current) return;
      current.delete(listener);
      if (current.size === 0) this.listeners.delete(streamId);
    };
  }

  publish(streamId: string, event: string, data: unknown): void {
    const current = this.listeners.get(streamId);
    if (!current) return;
    const envelope: RealtimeEventEnvelope = { streamId, event, data };
    for (const listener of current) listener(envelope);
  }
}
