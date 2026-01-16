import { Checkbox } from "@/shared/ui/checkbox";
import { useNavigation } from "../../../shared/hooks/useNavigation";

interface TermsAcceptanceCheckboxesProps {
  acceptedTerms: boolean;
  acceptedPrivacy: boolean;
  onTermsChange: (checked: boolean) => void;
  onPrivacyChange: (checked: boolean) => void;
}

export function TermsAcceptanceCheckboxes({
  acceptedTerms,
  acceptedPrivacy,
  onTermsChange,
  onPrivacyChange,
}: TermsAcceptanceCheckboxesProps) {
  const { navigateTo } = useNavigation();

  const handleTermsClick = (e: React.MouseEvent) => {
    e.preventDefault();
    // Set flag so privacy/terms screen knows to return to signup
    sessionStorage.setItem("viewingPolicyFromSignup", "true");
    navigateTo("terms");
  };

  const handlePrivacyClick = (e: React.MouseEvent) => {
    e.preventDefault();
    // Set flag so privacy/terms screen knows to return to signup
    sessionStorage.setItem("viewingPolicyFromSignup", "true");
    navigateTo("privacy");
  };

  return (
    <div className="space-y-3">
      {/* Terms of Use Checkbox */}
      <div className="flex items-start space-x-2">
        <Checkbox
          id="terms"
          checked={acceptedTerms}
          onCheckedChange={(checked) => onTermsChange(checked as boolean)}
          className="mt-0.5"
        />
        <label
          htmlFor="terms"
          className="text-sm text-gray-700 dark:text-gray-300 leading-tight cursor-pointer"
        >
          I agree to the{" "}
          <button
            type="button"
            onClick={handleTermsClick}
            className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 underline"
          >
            Terms of Use
          </button>
        </label>
      </div>

      {/* Privacy Policy Checkbox */}
      <div className="flex items-start space-x-2">
        <Checkbox
          id="privacy"
          checked={acceptedPrivacy}
          onCheckedChange={(checked) => onPrivacyChange(checked as boolean)}
          className="mt-0.5"
        />
        <label
          htmlFor="privacy"
          className="text-sm text-gray-700 dark:text-gray-300 leading-tight cursor-pointer"
        >
          I agree to the{" "}
          <button
            type="button"
            onClick={handlePrivacyClick}
            className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 underline"
          >
            Privacy Policy
          </button>
        </label>
      </div>
    </div>
  );
}
