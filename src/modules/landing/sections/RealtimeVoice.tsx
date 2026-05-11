import { CheckIcon } from "../components/CheckIcon";
import { CodeBlock } from "../components/CodeBlock";
import { useLandingCopy } from "../i18n/LocaleContext";

export function RealtimeVoice() {
  const t = useLandingCopy();

  return (
    <section id="devs" className="landing-section" aria-labelledby="realtime-title">
      <div className="landing-container landing-showcase__inner landing-showcase__inner--reverse">
        <div className="landing-showcase__copy">
          <span className="landing-section__eyebrow">{t.realtime.eyebrow}</span>
          <h2 id="realtime-title">{t.realtime.title}</h2>
          <p>{t.realtime.body}</p>
          <ul className="landing-checklist">
            {t.realtime.checklist.map((item) => (
              <li key={item}>
                <CheckIcon />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <CodeBlock filename={t.realtime.codeFilename}>
            <RealtimeEventsSnippet />
          </CodeBlock>
        </div>
      </div>
    </section>
  );
}

function RealtimeEventsSnippet() {
  return (
    <>
      <span className="tk-muted">// streaming events received by the client</span>
      {"\n"}
      <span className="tk-key">type</span> <span className="tk-event">RealtimeServerEvent</span> ={"\n"}
      {"  | { "}<span className="tk-key">event</span>: <span className="tk-str">{`"stt_partial"`}</span>; <span className="tk-key">data</span>: {`{ text: string }`} {"}"}
      {"\n"}
      {"  | { "}<span className="tk-key">event</span>: <span className="tk-str">{`"stt_final"`}</span>;   <span className="tk-key">data</span>: {`{ text: string }`} {"}"}
      {"\n"}
      {"  | { "}<span className="tk-key">event</span>: <span className="tk-str">{`"llm_token"`}</span>;   <span className="tk-key">data</span>: {`{ token: string }`} {"}"}
      {"\n"}
      {"  | { "}<span className="tk-key">event</span>: <span className="tk-str">{`"llm_done"`}</span>;    <span className="tk-key">data</span>: {`{}`} {"}"}
      {"\n"}
      {"  | { "}<span className="tk-key">event</span>: <span className="tk-str">{`"tts_chunk"`}</span>;   <span className="tk-key">data</span>: {`{ audioBase64Chunk, chunkIndex }`} {"}"}
      {"\n"}
      {"  | { "}<span className="tk-key">event</span>: <span className="tk-str">{`"tts_done"`}</span>;    <span className="tk-key">data</span>: {`{}`} {"}"}
      {"\n"}
      {"  | { "}<span className="tk-key">event</span>: <span className="tk-str">{`"turn_completed"`}</span>; <span className="tk-key">data</span>: {`{ nextQuestionId, nextQuestionText }`} {"}"}
      <span className="tk-punct">;</span>
    </>
  );
}
