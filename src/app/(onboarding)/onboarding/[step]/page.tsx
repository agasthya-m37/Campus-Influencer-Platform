import { OnboardingScreen } from "@/features/onboarding/onboarding-screen";

export default async function OnboardingStepPage({
  params,
}: PageProps<"/onboarding/[step]">) {
  const { step } = await params;
  return <OnboardingScreen step={step} />;
}
