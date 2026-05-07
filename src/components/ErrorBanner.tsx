import type { HumanError } from "../lib/errors/humanize";

type Props = {
  error: HumanError;
  onRetry?: () => void;
  onSwitchToText?: () => void;
  className?: string;
};

export function ErrorBanner({ error, onRetry, onSwitchToText, className }: Props) {
  const showRetry = error.retry && onRetry;
  const showSwitchToText = error.fallbackToText && onSwitchToText;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`error-banner ${className ?? ""}`.trim()}
    >
      <div className="error-banner-body">
        <strong className="error-banner-title">{error.title}</strong>
        <p className="error-banner-message">{error.message}</p>
        {error.technicalCode ? (
          <span className="error-banner-code">{error.technicalCode}</span>
        ) : null}
      </div>

      {showRetry || showSwitchToText ? (
        <div className="error-banner-actions">
          {showRetry ? (
            <button type="button" className="btn-ghost" onClick={onRetry}>
              Reintentar
            </button>
          ) : null}
          {showSwitchToText ? (
            <button type="button" onClick={onSwitchToText}>
              Cambiar a texto
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
