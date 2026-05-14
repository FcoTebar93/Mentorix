import { LocaleProvider } from "./i18n/LocaleContext";
import { NavBar } from "./sections/NavBar";
import { Hero } from "./sections/Hero";
import { ProvidersStrip } from "./sections/ProvidersStrip";
import { ReplacesStrip } from "./sections/ReplacesStrip";
import { FeaturesGrid } from "./sections/FeaturesGrid";
import { BuilderShowcase } from "./sections/BuilderShowcase";
import { RealtimeVoice } from "./sections/RealtimeVoice";
import { CandidateExperience } from "./sections/CandidateExperience";
import { AccessLinksShowcase } from "./sections/AccessLinksShowcase";
import { TechStack } from "./sections/TechStack";
import { FinalCta } from "./sections/FinalCta";
import "./landing.css";

type Props = {
  onLogin: () => void;
  onCreate: () => void;
  onCandidateAccess: () => void;
};

export function LandingPage({ onLogin, onCreate, onCandidateAccess }: Props) {
  return (
    <LocaleProvider>
      <div className="landing-root">
        <NavBar onLogin={onLogin} onCreate={onCreate} />
        <main>
          <Hero onPrimary={onCreate} onSecondary={onCandidateAccess} />
          <ProvidersStrip />
          <ReplacesStrip />
          <FeaturesGrid />
          <BuilderShowcase />
          <RealtimeVoice />
          <CandidateExperience />
          <AccessLinksShowcase />
          <TechStack />
          <FinalCta onPrimary={onCreate} onSecondary={onCandidateAccess} />
        </main>
      </div>
    </LocaleProvider>
  );
}

export default LandingPage;
