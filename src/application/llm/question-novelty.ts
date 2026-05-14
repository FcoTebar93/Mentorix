import type {
  GenerateQuestionInput,
  ILlmService,
  LlmUsage,
  QuestionSimilarityInput,
  QuestionSimilarityResult,
} from "../ports/services.js";

const MAX_QUESTION_GENERATION_ATTEMPTS = 4;
const LOCAL_SIMILARITY_THRESHOLD = 0.78;
const LOCAL_KEYWORD_COVERAGE_THRESHOLD = 0.85;
const LOCAL_BIGRAM_THRESHOLD = 0.88;

const STOP_WORDS = new Set([
  "a",
  "al",
  "algo",
  "an",
  "and",
  "ante",
  "as",
  "at",
  "bajo",
  "cual",
  "como",
  "con",
  "contra",
  "cual",
  "cuenta",
  "de",
  "del",
  "desde",
  "do",
  "donde",
  "el",
  "en",
  "entre",
  "es",
  "esta",
  "este",
  "for",
  "from",
  "how",
  "la",
  "las",
  "lo",
  "los",
  "mejor",
  "or",
  "para",
  "por",
  "que",
  "se",
  "sin",
  "sobre",
  "the",
  "to",
  "tu",
  "un",
  "una",
  "uno",
  "using",
  "what",
  "when",
  "where",
  "would",
  "y",
]);

function stripDiacritics(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function normalizeQuestionForComparison(value: string): string {
  return stripDiacritics(value)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenizeQuestion(value: string): string[] {
  return normalizeQuestionForComparison(value)
    .split(" ")
    .filter((token) => token.length >= 3 && !STOP_WORDS.has(token));
}

function buildBigrams(value: string): Set<string> {
  const normalized = normalizeQuestionForComparison(value);
  const compact = normalized.replace(/\s+/g, " ").trim();
  const bigrams = new Set<string>();

  for (let index = 0; index < compact.length - 1; index += 1) {
    bigrams.add(compact.slice(index, index + 2));
  }

  return bigrams;
}

function ratio(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return numerator / denominator;
}

function overlapSize<T>(left: Set<T>, right: Set<T>): number {
  let count = 0;
  for (const item of left) {
    if (right.has(item)) count += 1;
  }
  return count;
}

function roundScore(value: number): number {
  return Math.round(value * 100) / 100;
}

export function detectQuestionSimilarity(
  candidateQuestion: string,
  previousQuestions: string[]
): QuestionSimilarityResult {
  const normalizedCandidate = normalizeQuestionForComparison(candidateQuestion);
  const candidateTokens = new Set(tokenizeQuestion(candidateQuestion));
  const candidateBigrams = buildBigrams(candidateQuestion);

  for (const previousQuestion of previousQuestions) {
    const normalizedPrevious = normalizeQuestionForComparison(previousQuestion);
    if (!normalizedPrevious) continue;

    if (normalizedCandidate === normalizedPrevious) {
      return {
        isTooSimilar: true,
        matchedQuestion: previousQuestion,
        reason: "duplicate_exact",
        overlapScore: 1,
      };
    }

    const previousTokens = new Set(tokenizeQuestion(previousQuestion));
    const previousBigrams = buildBigrams(previousQuestion);
    const sharedKeywordCount = overlapSize(candidateTokens, previousTokens);
    const tokenUnionCount = new Set([...candidateTokens, ...previousTokens]).size;
    const keywordJaccard = ratio(sharedKeywordCount, tokenUnionCount);
    const keywordCoverage = ratio(
      sharedKeywordCount,
      Math.max(1, Math.min(candidateTokens.size, previousTokens.size))
    );
    const sharedBigramCount = overlapSize(candidateBigrams, previousBigrams);
    const bigramDice = ratio(sharedBigramCount * 2, candidateBigrams.size + previousBigrams.size);
    const maxScore = Math.max(keywordJaccard, keywordCoverage, bigramDice);

    const looksTooSimilar =
      (keywordJaccard >= LOCAL_SIMILARITY_THRESHOLD &&
        keywordCoverage >= LOCAL_KEYWORD_COVERAGE_THRESHOLD) ||
      bigramDice >= LOCAL_BIGRAM_THRESHOLD ||
      (sharedKeywordCount >= 4 && keywordCoverage >= 0.9);

    if (looksTooSimilar) {
      return {
        isTooSimilar: true,
        matchedQuestion: previousQuestion,
        reason: "duplicate_topic_local",
        overlapScore: roundScore(maxScore),
      };
    }
  }

  return { isTooSimilar: false, overlapScore: 0 };
}

async function judgeQuestionSimilarityWithLlm(
  llm: ILlmService,
  input: QuestionSimilarityInput
): Promise<QuestionSimilarityResult> {
  if (typeof llm.judgeQuestionSimilarity !== "function") {
    return { isTooSimilar: false, overlapScore: 0 };
  }

  try {
    return await llm.judgeQuestionSimilarity(input);
  } catch {
    return { isTooSimilar: false, overlapScore: 0 };
  }
}

export async function generateDistinctQuestion(
  llm: ILlmService,
  input: GenerateQuestionInput
): Promise<{ text: string; usage?: LlmUsage }> {
  const rejectedQuestions: string[] = [];

  for (let attempt = 0; attempt < MAX_QUESTION_GENERATION_ATTEMPTS; attempt += 1) {
    const generated = await llm.generateQuestion({
      ...input,
      rejectedQuestions,
    });

    const localSimilarity = detectQuestionSimilarity(generated.text, input.previousQuestions);
    if (localSimilarity.isTooSimilar) {
      rejectedQuestions.push(generated.text);
      continue;
    }

    if (input.previousQuestions.length > 0) {
      const semanticSimilarity = await judgeQuestionSimilarityWithLlm(llm, {
        candidateQuestion: generated.text,
        previousQuestions: input.previousQuestions,
        language: input.language,
        role: input.role,
        level: input.level,
        prompt: input.prompt,
      });

      if (semanticSimilarity.isTooSimilar) {
        rejectedQuestions.push(generated.text);
        continue;
      }
    }

    return generated;
  }

  throw new Error("LLM_QUESTION_GENERATION_FAILED");
}
