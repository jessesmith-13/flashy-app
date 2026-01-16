import { LandingHeader } from "./components/LandingHeader";
import { HeroSection } from "./components/HeroSection";
import { FeaturesSection } from "./components/FeaturesSection";
import { BenefitsFlipCardSection } from "./components/BenefitsFlipCardSection";
import { CtaSection } from "./components/CtaSection";
import { LandingFooter } from "./components/LandingFooter";

export function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800">
      <LandingHeader />
      <HeroSection />
      <FeaturesSection />
      <BenefitsFlipCardSection />
      <CtaSection />
      <LandingFooter />
    </div>
  );
}
