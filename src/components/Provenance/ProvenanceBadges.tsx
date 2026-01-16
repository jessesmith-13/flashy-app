import {
  Sparkles,
  BookOpen,
  GraduationCap,
  ShieldCheck,
  Users,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

interface ProvenanceBadgesProps {
  contentSources?: string[];
  creationMethods?: string[];
  confidenceLevel?: "high" | "medium" | "low" | "unverified";
  reviewStatus?:
    | "unreviewed"
    | "in_review"
    | "approved"
    | "needs_changes"
    | "rejected";
  creatorRole?:
    | "educator"
    | "student"
    | "self_learner"
    | "researcher"
    | "org"
    | "other";
  creatorRoleVerified?: boolean;
  compact?: boolean;
}

export function ProvenanceBadges({
  contentSources = [],
  creationMethods = [],
  confidenceLevel,
  reviewStatus,
  creatorRole,
  creatorRoleVerified = false,
  compact = false,
}: ProvenanceBadgesProps) {
  const badges = [];

  // Creator Role Badge (ALWAYS show if role exists, not just when verified)
  if (creatorRole && creatorRole !== "other") {
    const roleConfig = {
      educator: {
        label: "educator",
        icon: GraduationCap,
        className:
          "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
      },
      student: {
        label: "Student",
        icon: GraduationCap,
        className:
          "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
      },
      self_learner: {
        label: "Self Learner",
        icon: BookOpen,
        className:
          "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
      },
      researcher: {
        label: "Researcher",
        icon: ShieldCheck,
        className:
          "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
      },
      org: {
        label: "Organization",
        icon: ShieldCheck,
        className:
          "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
      },
    };

    const config = roleConfig[creatorRole as keyof typeof roleConfig];
    if (config) {
      badges.push({
        key: "role",
        label: compact ? config.label.split(" ")[0] : config.label,
        icon: config.icon,
        className: config.className,
      });
    }
  }

  // Verification Status Badge (separate from role badge)
  if (
    creatorRole &&
    (creatorRole === "educator" ||
      creatorRole === "org" ||
      creatorRole === "researcher")
  ) {
    if (creatorRoleVerified) {
      badges.push({
        key: "verified",
        label: compact ? "✓" : "Verified",
        icon: CheckCircle2,
        className:
          "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
      });
    } else {
      badges.push({
        key: "unverified",
        label: compact ? "?" : "Unverified",
        icon: AlertCircle,
        className:
          "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300",
      });
    }
  }

  // AI-related badges
  if (creationMethods.includes("ai_generated")) {
    badges.push({
      key: "ai-generated",
      label: compact ? "AI" : "AI-Generated",
      icon: Sparkles,
      className:
        "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300",
    });
  } else if (creationMethods.includes("ai_assisted")) {
    badges.push({
      key: "ai-assisted",
      label: compact ? "AI+" : "AI-Assisted",
      icon: Sparkles,
      className:
        "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
    });
  }

  // Content source badges
  if (contentSources.includes("textbook")) {
    badges.push({
      key: "textbook",
      label: compact ? "Book" : "Textbook-Based",
      icon: BookOpen,
      className:
        "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    });
  }

  if (contentSources.includes("lecture")) {
    badges.push({
      key: "lecture",
      label: compact ? "Lecture" : "Lecture-Based",
      icon: GraduationCap,
      className:
        "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    });
  }

  if (contentSources.includes("journal")) {
    badges.push({
      key: "journal",
      label: compact ? "Journal" : "Academic Journal",
      icon: BookOpen,
      className:
        "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300",
    });
  }

  // Review status badge
  if (reviewStatus === "approved") {
    badges.push({
      key: "approved",
      label: compact ? "✓" : "Community-Reviewed",
      icon: CheckCircle2,
      className:
        "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
    });
  } else if (reviewStatus === "in_review") {
    badges.push({
      key: "in-review",
      label: compact ? "Review" : "In Review",
      icon: AlertCircle,
      className:
        "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
    });
  }

  // Community remix badge
  if (creationMethods.includes("community_remix")) {
    badges.push({
      key: "community",
      label: compact ? "Remix" : "Community Remix",
      icon: Users,
      className:
        "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    });
  }

  // Confidence level indicator (only show if explicitly set to low or unverified for CONTENT)
  // Don't show if confidenceLevel wasn't provided (for user profiles)
  if (
    confidenceLevel !== undefined &&
    (confidenceLevel === "low" || confidenceLevel === "unverified")
  ) {
    badges.push({
      key: "confidence",
      label: compact
        ? "⚠"
        : confidenceLevel === "unverified"
        ? "Unverified"
        : "Low Confidence",
      icon: AlertTriangle,
      className:
        "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
    });
  }

  if (badges.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {badges.map((badge) => {
        const Icon = badge.icon;
        return (
          <span
            key={badge.key}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${badge.className}`}
          >
            <Icon className="w-3.5 h-3.5" />
            {badge.label}
          </span>
        );
      })}
    </div>
  );
}
