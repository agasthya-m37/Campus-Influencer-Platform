import { OnboardingScreen } from "@/features/onboarding/onboarding-screen";
import { ONBOARDING_STEPS } from "@/lib/static-params";

export default async function OnboardingStepPage({
  params,
}: PageProps<"/onboarding/[step]">) {
  const { step } = await params;
  return <OnboardingScreen step={step} />;
}

/** The static export pre-renders every seeded record. */
export function generateStaticParams() {
  return ONBOARDING_STEPS.map((step) => ({ step }));
}
