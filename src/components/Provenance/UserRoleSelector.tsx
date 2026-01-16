import { useState } from "react";
import { Button } from "@/shared/ui/button";
import {
  GraduationCap,
  BookOpen,
  Lightbulb,
  Microscope,
  Building2,
  HelpCircle,
  ShieldCheck,
} from "lucide-react";

type UserRole =
  | "educator"
  | "student"
  | "self_learner"
  | "researcher"
  | "org"
  | "other";

interface UserRoleSelectorProps {
  selectedRole?: UserRole;
  onRoleSelect: (role: UserRole) => void;
  onContinue: () => void;
  showVerificationCTA?: boolean;
  onRequestVerification?: () => void;
}

const ROLE_OPTIONS = [
  {
    value: "educator" as UserRole,
    label: "Educator",
    description: "I teach courses or create educational content",
    icon: GraduationCap,
    verifiable: true,
  },
  {
    value: "student" as UserRole,
    label: "Student",
    description: "I'm studying and using flashcards for learning",
    icon: BookOpen,
    verifiable: false,
  },
  {
    value: "self_learner" as UserRole,
    label: "Self-Learner",
    description: "I'm learning independently outside of formal education",
    icon: Lightbulb,
    verifiable: false,
  },
  {
    value: "researcher" as UserRole,
    label: "Researcher",
    description: "I conduct research and need flashcards for my work",
    icon: Microscope,
    verifiable: true,
  },
  {
    value: "org" as UserRole,
    label: "Organization",
    description: "I represent a company, institution, or organization",
    icon: Building2,
    verifiable: true,
  },
  {
    value: "other" as UserRole,
    label: "Other",
    description: "I use Flashy for something else",
    icon: HelpCircle,
    verifiable: false,
  },
];

export function UserRoleSelector({
  selectedRole,
  onRoleSelect,
  onContinue,
  showVerificationCTA = true,
  onRequestVerification,
}: UserRoleSelectorProps) {
  const [hoveredRole, setHoveredRole] = useState<UserRole | null>(null);

  const selectedOption = ROLE_OPTIONS.find((opt) => opt.value === selectedRole);
  const canRequestVerification =
    selectedOption?.verifiable && showVerificationCTA && onRequestVerification;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          How are you using Flashy?
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          This helps us personalize your experience and show you relevant
          content.
        </p>
      </div>

      {/* Role Options Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {ROLE_OPTIONS.map((option) => {
          const Icon = option.icon;
          const isSelected = selectedRole === option.value;
          const isHovered = hoveredRole === option.value;

          return (
            <button
              key={option.value}
              onClick={() => onRoleSelect(option.value)}
              onMouseEnter={() => setHoveredRole(option.value)}
              onMouseLeave={() => setHoveredRole(null)}
              className={`
                relative p-5 rounded-lg border-2 transition-all text-left
                ${
                  isSelected
                    ? "border-blue-600 dark:border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                    : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600"
                }
                ${isHovered && !isSelected ? "shadow-md" : ""}
              `}
            >
              {/* Verification Badge */}
              {option.verifiable && (
                <div className="absolute top-3 right-3">
                  <div className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                    <ShieldCheck className="w-3 h-3" />
                    Verifiable
                  </div>
                </div>
              )}

              <div className="flex items-start gap-4">
                <div
                  className={`
                  p-3 rounded-lg
                  ${
                    isSelected
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                  }
                `}
                >
                  <Icon className="w-6 h-6" />
                </div>

                <div className="flex-1 min-w-0 pt-1">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                    {option.label}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {option.description}
                  </p>
                </div>
              </div>

              {/* Selected Indicator */}
              {isSelected && (
                <div className="absolute top-3 left-3 w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center">
                  <svg
                    className="w-3 h-3 text-white"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="3"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path d="M5 13l4 4L19 7"></path>
                  </svg>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Verification CTA */}
      {canRequestVerification && (
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                Get Verified
              </h4>
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                Verified {selectedOption.label.toLowerCase()}s gain trust
                badges, higher visibility, and can create high-confidence decks.
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={onRequestVerification}
                className="border-blue-600 text-blue-600 hover:bg-blue-50 dark:border-blue-500 dark:text-blue-400 dark:hover:bg-blue-900/30"
              >
                Request Verification
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Continue Button */}
      <div className="flex justify-end pt-4">
        <Button
          size="lg"
          onClick={onContinue}
          disabled={!selectedRole}
          className="min-w-[200px]"
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
