type Props = {
  prompt?: string;
  line: string;
  withCaret?: boolean;
};

export function CommandLine({ prompt = "$", line, withCaret = true }: Props) {
  return (
    <div className="landing-commandline" role="figure" aria-label="command example">
      <span className="landing-commandline__prompt" aria-hidden="true">
        {prompt}
      </span>
      <span className="landing-commandline__line">
        {line}
        {withCaret ? <span className="landing-commandline__caret" aria-hidden="true" /> : null}
      </span>
    </div>
  );
}
