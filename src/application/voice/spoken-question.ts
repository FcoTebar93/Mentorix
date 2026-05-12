const MAX_SPOKEN_CHARS = 280;

export function extractSpokenQuestion(rawText: string): string {
  const text = (rawText ?? "").trim();
  if (!text) return "";

  const lastQuestionMark = text.lastIndexOf("?");
  if (lastQuestionMark === -1) {
    return clampSentence(text);
  }

  const slice = text.slice(0, lastQuestionMark + 1);
  const sentenceStart = findSentenceStart(slice);
  const spoken = slice.slice(sentenceStart).trim();
  return clampSentence(spoken || text);
}

function findSentenceStart(slice: string): number {
  const stops = [". ", "! ", "? ", "\n"];
  let cut = -1;
  for (const stop of stops) {
    const idx = slice.lastIndexOf(stop, slice.length - 2);
    if (idx > cut) cut = idx;
  }
  return cut >= 0 ? cut + 1 : 0;
}

function clampSentence(text: string): string {
  if (text.length <= MAX_SPOKEN_CHARS) return text;
  return `${text.slice(0, MAX_SPOKEN_CHARS - 1).trimEnd()}…`;
}
