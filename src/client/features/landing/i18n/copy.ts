import type { LandingCopy, Locale } from "./types";

const es: LandingCopy = {
  nav: {
    product: "Producto",
    how: "Cómo funciona",
    devs: "Para devs",
    pricing: "Precios",
    signIn: "Iniciar sesión",
    getStarted: "Empezar gratis",
    localeLabel: "Idioma",
  },
  hero: {
    badge: "v0.4 · Beta abierta",
    title: "Entrevistas técnicas con IA, diseñadas como tu equipo las haría.",
    subtitle:
      "Lanza entrevistas guiadas por voz en tiempo real. Rúbricas explicables, multi-LLM, links para candidatos y reportes que sí leerías.",
    ctaPrimary: "Empezar gratis",
    ctaSecondary: "Tengo un link de entrevista",
    trustNote: "Sin tarjeta. Self-host opcional. Tus datos, tu LLM.",
    monitorUrl: "mentorix.app/interview/live",
    monitorQuestionLabel: "Pregunta 3 de 5",
    monitorQuestion:
      "Explica cómo diseñarías un rate limiter distribuido con tolerancia a fallos.",
    monitorTranscriptLabel: "transcripción en vivo",
    monitorTranscriptText:
      "Usaría un algoritmo de token bucket por nodo, sincronizado vía Redis con TTL...",
    monitorScoreLabels: {
      clarity: "Claridad",
      depth: "Profundidad",
      reasoning: "Razonamiento",
    },
  },
  providers: {
    eyebrow: "Compatible con tu stack de modelos",
    items: ["OpenAI", "Anthropic", "Groq", "Gemini", "Ollama", "Custom HTTP", "Azure (pronto)"],
  },
  replaces: {
    eyebrow: "Reemplaza",
    items: ["HackerRank", "Otter.ai", "Notion docs", "Google Forms", "Zoom screening"],
    note: "Todo en una sola superficie, sin pegar transcripciones a mano.",
  },
  features: {
    eyebrow: "Capacidades",
    title: "Una entrevista. Todo el contexto.",
    subtitle:
      "Mentorix une el flujo completo: generar, conducir, evaluar y reportar. Sin saltos de herramienta.",
    items: [
      {
        icon: "voice",
        title: "Voz en tiempo real",
        body: "WebRTC, STT y TTS en streaming. Pregunta, escucha y evalúa sin esperar al final del turno.",
      },
      {
        icon: "llm",
        title: "Multi-LLM, multi-proveedor",
        body: "OpenAI, Anthropic, Groq, Gemini, Ollama o tu endpoint propio. Cambia de modelo por entrevista.",
      },
      {
        icon: "rubric",
        title: "Rúbricas explicables",
        body: "Define dimensiones, pesos y umbral de aprobación. El feedback cita la rúbrica, no se la inventa.",
      },
      {
        icon: "link",
        title: "Links de acceso",
        body: "Comparte un link único con caducidad y aforo. El candidato entra solo, tú no haces nada.",
      },
      {
        icon: "template",
        title: "Plantillas dinámicas",
        body: "Banco de preguntas fijas o generadas por LLM según el nivel: junior, mid o senior.",
      },
      {
        icon: "report",
        title: "Reportes que importan",
        body: "Score global, breakdown por dimensión, fortalezas, mejoras y recomendación final.",
      },
    ],
  },
  builder: {
    eyebrow: "Para reclutadores",
    title: "Diseña una entrevista en 4 minutos.",
    body: "Sin plantillas rígidas. Configura rol, nivel y rúbrica, y deja que el LLM genere las preguntas o cárgalas tú.",
    steps: [
      {
        title: "Elige rol y nivel",
        hint: "Backend, infra, frontend, data... junior, mid o senior.",
      },
      {
        title: "Carga preguntas o deja que el LLM las genere",
        hint: "Dinámicas por sesión o banco fijo reutilizable.",
      },
      {
        title: "Ajusta rúbrica y umbral",
        hint: "Dimensiones con pesos personalizados y pass threshold.",
      },
      {
        title: "Lanza",
        hint: "Genera un link único o invita por correo. Listo.",
      },
    ],
    mock: {
      title: { label: "Título", value: "Infra Engineer · System Design" },
      role: { label: "Rol", value: "Infrastructure Engineer" },
      level: { label: "Nivel", chips: ["Junior", "Mid", "Senior"], selected: 2 },
      questions: { label: "Preguntas", value: "5 (generadas por LLM)" },
      rubric: { label: "Rúbrica", value: "Claridad · Profundidad · Razonamiento · Comunicación" },
    },
  },
  realtime: {
    eyebrow: "Para devs",
    title: "STT → LLM → TTS, en tu navegador.",
    body: "Pipeline WebRTC con eventos en streaming. Negocia SDP, transmite chunks de audio y recibe tokens del LLM mientras el candidato sigue hablando.",
    checklist: [
      "Idle timeout configurable",
      "ICE servers propios (STUN/TURN)",
      "Fallback automático a turno por texto",
    ],
    codeFilename: "realtime-events.ts",
  },
  candidate: {
    eyebrow: "Experiencia del candidato",
    title: "Entra. Habla. Recibe feedback.",
    body: "El candidato abre el link, da permiso al micrófono y arranca. Sin instalar nada, sin formulario interminable.",
    mock: {
      brandTitle: "Mentorix AI",
      brandSubtitle: "Infra Engineer Interview",
      navItems: ["Entrevista", "Historial", "Ajustes"],
      questionLabel: "Pregunta 2 de 5",
      question: "Cuéntame cómo monitorizarías un cluster de Kubernetes en producción.",
      hint: "Pulsa para grabar tu respuesta. Mentorix transcribirá y evaluará en tiempo real.",
    },
    foot: "Funciona en Chrome, Edge, Firefox y Safari modernos. Sin instalaciones.",
  },
  accessLinks: {
    eyebrow: "Distribución",
    title: "Un link, control total.",
    body: "Genera links únicos por candidato o reutilizables con aforo. Revoca cuando quieras. Cada acceso queda trazado.",
    command:
      'POST /api/access-links { templateId: "infra-senior", maxUses: 3, expiresAt: "2026-06-01" }',
    pills: ["Caducidad por fecha", "Aforo configurable", "Revocable en 1 clic", "Trazabilidad por candidato"],
  },
  stack: {
    eyebrow: "Para engineering leads",
    title: "Open architecture. Self-host friendly.",
    body: "Clean Architecture, SOLID y tests de integración. Despliega tu propia instancia y apunta tus modelos donde quieras.",
    frontend: {
      title: "Frontend",
      items: ["React 19 + TypeScript", "Vite", "WebRTC nativo", "Zero accent colors"],
    },
    backend: {
      title: "Backend",
      items: ["Fastify", "Drizzle ORM + Postgres", "Providers LLM intercambiables", "WebRTC gateway propio"],
    },
  },
  final: {
    title: "Tu próxima entrevista, lista en 5 minutos.",
    subtitle: "Empieza gratis. Self-host cuando quieras.",
    ctaPrimary: "Empezar gratis",
    ctaSecondary: "Tengo un link",
  },
  footer: {
    tagline: "Entrevistas técnicas guiadas por IA. Foco en señal, no en ruido.",
    columns: [
      { title: "Producto", items: ["Características", "Cómo funciona", "Precios", "Changelog"] },
      { title: "Recursos", items: ["Documentación", "Guía de rúbricas", "API", "Status"] },
      { title: "Empresa", items: ["Sobre Mentorix", "Blog", "Contacto", "Empleo"] },
      { title: "Legal", items: ["Privacidad", "Términos", "Cookies", "DPA"] },
    ],
    rights: "© 2026 Mentorix · Hecho con foco en señal, no ruido.",
  },
};

const en: LandingCopy = {
  nav: {
    product: "Product",
    how: "How it works",
    devs: "For devs",
    pricing: "Pricing",
    signIn: "Sign in",
    getStarted: "Get started free",
    localeLabel: "Language",
  },
  hero: {
    badge: "v0.4 · Open Beta",
    title: "Technical interviews, AI-guided the way your team would run them.",
    subtitle:
      "Launch voice-driven interviews in real time. Explainable rubrics, multi-LLM, candidate links and reports you will actually read.",
    ctaPrimary: "Get started free",
    ctaSecondary: "I have an interview link",
    trustNote: "No card. Self-host optional. Your data, your LLM.",
    monitorUrl: "mentorix.app/interview/live",
    monitorQuestionLabel: "Question 3 of 5",
    monitorQuestion:
      "Explain how you would design a fault-tolerant distributed rate limiter.",
    monitorTranscriptLabel: "live transcript",
    monitorTranscriptText:
      "I'd use a per-node token bucket synced through Redis with TTL...",
    monitorScoreLabels: {
      clarity: "Clarity",
      depth: "Depth",
      reasoning: "Reasoning",
    },
  },
  providers: {
    eyebrow: "Bring your own model",
    items: ["OpenAI", "Anthropic", "Groq", "Gemini", "Ollama", "Custom HTTP", "Azure (soon)"],
  },
  replaces: {
    eyebrow: "Replaces",
    items: ["HackerRank", "Otter.ai", "Notion docs", "Google Forms", "Zoom screening"],
    note: "Everything on a single surface, no transcript stitching.",
  },
  features: {
    eyebrow: "Capabilities",
    title: "One interview. All the context.",
    subtitle:
      "Mentorix unifies the full flow: generate, run, evaluate and report. No tool switching.",
    items: [
      {
        icon: "voice",
        title: "Realtime voice",
        body: "WebRTC, streaming STT and TTS. Ask, listen and evaluate without waiting for the turn to end.",
      },
      {
        icon: "llm",
        title: "Multi-LLM, multi-provider",
        body: "OpenAI, Anthropic, Groq, Gemini, Ollama or your own endpoint. Swap model per interview.",
      },
      {
        icon: "rubric",
        title: "Explainable rubrics",
        body: "Define dimensions, weights and pass threshold. Feedback cites the rubric, not vibes.",
      },
      {
        icon: "link",
        title: "Access links",
        body: "Share a unique link with expiry and capacity. The candidate walks in, you do nothing.",
      },
      {
        icon: "template",
        title: "Dynamic templates",
        body: "Fixed question bank or LLM-generated per session, tailored to level: junior, mid or senior.",
      },
      {
        icon: "report",
        title: "Reports that matter",
        body: "Overall score, dimension breakdown, strengths, improvements and final recommendation.",
      },
    ],
  },
  builder: {
    eyebrow: "For recruiters",
    title: "Design an interview in 4 minutes.",
    body: "No rigid templates. Configure role, level and rubric, then let the LLM generate questions or load your own.",
    steps: [
      {
        title: "Pick role and level",
        hint: "Backend, infra, frontend, data... junior, mid or senior.",
      },
      {
        title: "Load questions or let the LLM generate them",
        hint: "Dynamic per session or reusable fixed bank.",
      },
      {
        title: "Tune rubric and threshold",
        hint: "Custom-weighted dimensions and pass threshold.",
      },
      {
        title: "Launch",
        hint: "Generate a unique link or invite by email. Done.",
      },
    ],
    mock: {
      title: { label: "Title", value: "Infra Engineer · System Design" },
      role: { label: "Role", value: "Infrastructure Engineer" },
      level: { label: "Level", chips: ["Junior", "Mid", "Senior"], selected: 2 },
      questions: { label: "Questions", value: "5 (LLM-generated)" },
      rubric: { label: "Rubric", value: "Clarity · Depth · Reasoning · Communication" },
    },
  },
  realtime: {
    eyebrow: "For devs",
    title: "STT → LLM → TTS, right in the browser.",
    body: "WebRTC pipeline with streaming events. Negotiate SDP, stream audio chunks and receive LLM tokens while the candidate keeps speaking.",
    checklist: [
      "Configurable idle timeout",
      "Bring your own ICE servers (STUN/TURN)",
      "Automatic fallback to text turn",
    ],
    codeFilename: "realtime-events.ts",
  },
  candidate: {
    eyebrow: "Candidate experience",
    title: "Walk in. Speak. Get feedback.",
    body: "The candidate opens the link, grants mic access and starts. No installs, no endless forms.",
    mock: {
      brandTitle: "Mentorix AI",
      brandSubtitle: "Infra Engineer Interview",
      navItems: ["Interview", "History", "Settings"],
      questionLabel: "Question 2 of 5",
      question: "Walk me through how you'd monitor a production Kubernetes cluster.",
      hint: "Press to record your answer. Mentorix transcribes and evaluates in realtime.",
    },
    foot: "Works on modern Chrome, Edge, Firefox and Safari. No installs.",
  },
  accessLinks: {
    eyebrow: "Distribution",
    title: "One link, full control.",
    body: "Generate per-candidate links or reusable ones with capacity. Revoke anytime. Every access is traced.",
    command:
      'POST /api/access-links { templateId: "infra-senior", maxUses: 3, expiresAt: "2026-06-01" }',
    pills: ["Expires by date", "Configurable capacity", "Revoke in one click", "Per-candidate traceability"],
  },
  stack: {
    eyebrow: "For engineering leads",
    title: "Open architecture. Self-host friendly.",
    body: "Clean Architecture, SOLID and integration tests. Deploy your own instance and point your models wherever you want.",
    frontend: {
      title: "Frontend",
      items: ["React 19 + TypeScript", "Vite", "Native WebRTC", "Zero accent colors"],
    },
    backend: {
      title: "Backend",
      items: ["Fastify", "Drizzle ORM + Postgres", "Swappable LLM providers", "Custom WebRTC gateway"],
    },
  },
  final: {
    title: "Your next interview, ready in 5 minutes.",
    subtitle: "Start free. Self-host whenever you want.",
    ctaPrimary: "Get started free",
    ctaSecondary: "I have a link",
  },
  footer: {
    tagline: "AI-guided technical interviews. Focus on signal, not noise.",
    columns: [
      { title: "Product", items: ["Features", "How it works", "Pricing", "Changelog"] },
      { title: "Resources", items: ["Docs", "Rubric guide", "API", "Status"] },
      { title: "Company", items: ["About Mentorix", "Blog", "Contact", "Careers"] },
      { title: "Legal", items: ["Privacy", "Terms", "Cookies", "DPA"] },
    ],
    rights: "© 2026 Mentorix · Built for signal, not noise.",
  },
};

export const copy: Record<Locale, LandingCopy> = { es, en };
