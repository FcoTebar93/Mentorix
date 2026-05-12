import type { ReactNode } from "react";

type Props = {
  filename?: string;
  children: ReactNode;
};

export function CodeBlock({ filename, children }: Props) {
  return (
    <div className="landing-codeblock" role="figure" aria-label={filename ?? "code"}>
      <div className="landing-codeblock__header">
        <span className="landing-codeblock__dots" aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
        {filename ? <span className="landing-codeblock__filename">{filename}</span> : null}
      </div>
      <pre className="landing-codeblock__pre">
        <code>{children}</code>
      </pre>
    </div>
  );
}
