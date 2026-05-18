export type Locale = "es" | "en";

export type LandingCopy = {
  nav: {
    product: string;
    how: string;
    devs: string;
    pricing: string;
    signIn: string;
    getStarted: string;
    localeLabel: string;
  };
  hero: {
    badge: string;
    title: string;
    subtitle: string;
    ctaPrimary: string;
    ctaSecondary: string;
    trustNote: string;
    monitorUrl: string;
    monitorQuestionLabel: string;
    monitorQuestion: string;
    monitorTranscriptLabel: string;
    monitorTranscriptText: string;
    monitorScoreLabels: { clarity: string; depth: string; reasoning: string };
  };
  providers: {
    eyebrow: string;
    items: string[];
  };
  replaces: {
    eyebrow: string;
    items: string[];
    note: string;
  };
  features: {
    eyebrow: string;
    title: string;
    subtitle: string;
    items: Array<{ icon: FeatureIcon; title: string; body: string }>;
  };
  builder: {
    eyebrow: string;
    title: string;
    body: string;
    steps: Array<{ title: string; hint: string }>;
    mock: {
      title: { label: string; value: string };
      role: { label: string; value: string };
      level: { label: string; chips: string[]; selected: number };
      questions: { label: string; value: string };
      rubric: { label: string; value: string };
    };
  };
  realtime: {
    eyebrow: string;
    title: string;
    body: string;
    checklist: string[];
    codeFilename: string;
  };
  candidate: {
    eyebrow: string;
    title: string;
    body: string;
    mock: {
      brandTitle: string;
      brandSubtitle: string;
      navItems: string[];
      questionLabel: string;
      question: string;
      hint: string;
    };
    foot: string;
  };
  accessLinks: {
    eyebrow: string;
    title: string;
    body: string;
    command: string;
    pills: string[];
  };
  stack: {
    eyebrow: string;
    title: string;
    body: string;
    frontend: { title: string; items: string[] };
    backend: { title: string; items: string[] };
  };
  final: {
    title: string;
    subtitle: string;
    ctaPrimary: string;
    ctaSecondary: string;
  };
};

export type FeatureIcon =
  | "voice"
  | "llm"
  | "rubric"
  | "link"
  | "template"
  | "report";
