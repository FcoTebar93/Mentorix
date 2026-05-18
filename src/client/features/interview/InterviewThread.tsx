import { useEffect, useRef, type ReactNode } from "react";
import type { InterviewThreadMessage } from "./interview-thread";

type Props = {
  messages: InterviewThreadMessage[];
  pending?: boolean;
  footer?: ReactNode;
};

export function InterviewThread({ messages, pending = false, footer }: Props) {
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, pending]);

  return (
    <section className="chat-container" aria-label="Historial de la entrevista">
      {messages.map((message) => (
        <article
          key={message.id}
          className={`message-row ${message.role === "assistant" ? "message-ai" : "message-user"}`}
        >
          <ThreadBubble message={message} />
        </article>
      ))}

      {pending ? (
        <article className="message-row message-ai" aria-live="polite">
          <ThreadBubble
            message={{
              id: "pending",
              role: "assistant",
              text: "Preparando la siguiente pregunta...",
              questionId: "",
            }}
            isPending
          />
        </article>
      ) : null}

      {footer}

      <div ref={endRef} aria-hidden="true" />
    </section>
  );
}

function ThreadBubble({
  message,
  isPending = false,
}: {
  message: InterviewThreadMessage;
  isPending?: boolean;
}) {
  const meta =
    message.role === "assistant"
      ? "AI Interviewer"
      : message.source === "voice"
        ? "Tu respuesta (voz)"
        : "Tu respuesta";

  return (
    <div className={`message-bubble level-2${isPending ? " is-pending" : ""}`}>
      <p className="message-meta">{meta}</p>
      <p className="text-reset">{message.text}</p>
    </div>
  );
}