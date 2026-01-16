import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Info,
  Calendar,
  ShieldCheck,
} from "lucide-react";
import { ProvenanceBadges } from "./ProvenanceBadges";

export interface DeckSource {
  id?: string;
  kind:
    | "url"
    | "book"
    | "course"
    | "user_notes"
    | "uploaded_file"
    | "ai"
    | "other";
  title?: string;
  url?: string;
  notes?: string;
}

interface AboutThisDeckProps {
  contentSources?: string[];
  creationMethods?: string[];
  attribution?: { [key: string]: any };
  confidenceLevel?: "high" | "medium" | "low" | "unverified";
  reviewStatus?:
    | "unreviewed"
    | "in_review"
    | "approved"
    | "needs_changes"
    | "rejected";
  lastReviewedAt?: string;
  reviewedBy?: string;
  sources?: DeckSource[];
  creatorRole?:
    | "professor"
    | "student"
    | "self_learner"
    | "researcher"
    | "org"
    | "other";
  creatorRoleVerified?: boolean;
  creatorName?: string;
  defaultExpanded?: boolean;
}

const SOURCE_LABELS: Record<string, string> = {
  textbook: "Textbook",
  lecture: "Lecture/Course Material",
  journal: "Academic Journal",
  official_docs: "Official Documentation",
  wikipedia: "Wikipedia",
  personal_notes: "Personal Notes",
  ai: "AI-Generated",
  other: "Other",
};

const METHOD_LABELS: Record<string, string> = {
  manual: "Manual Entry",
  ai_generated: "AI-Generated",
  ai_assisted: "AI-Assisted",
  imported: "Imported (CSV/PDF)",
  community_remix: "Community Remix",
  transcribed: "Transcribed",
  curated: "Curated from Multiple Sources",
};

const CONFIDENCE_LABELS: Record<string, { label: string; color: string }> = {
  high: { label: "High", color: "text-green-700 dark:text-green-400" },
  medium: { label: "Medium", color: "text-yellow-700 dark:text-yellow-400" },
  low: { label: "Low", color: "text-orange-700 dark:text-orange-400" },
  unverified: {
    label: "Unverified",
    color: "text-gray-700 dark:text-gray-400",
  },
};

const REVIEW_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  unreviewed: {
    label: "Not Reviewed",
    color: "text-gray-700 dark:text-gray-400",
  },
  in_review: {
    label: "In Review",
    color: "text-yellow-700 dark:text-yellow-400",
  },
  approved: { label: "Approved", color: "text-green-700 dark:text-green-400" },
  needs_changes: {
    label: "Needs Changes",
    color: "text-orange-700 dark:text-orange-400",
  },
  rejected: { label: "Rejected", color: "text-red-700 dark:text-red-400" },
};

export function AboutThisDeck({
  contentSources = [],
  creationMethods = [],
  attribution,
  confidenceLevel = "unverified",
  reviewStatus = "unreviewed",
  lastReviewedAt,
  sources = [],
  creatorRole,
  creatorRoleVerified,
  creatorName,
  defaultExpanded = false,
}: AboutThisDeckProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const hasProvenanceData =
    contentSources.length > 0 ||
    creationMethods.length > 0 ||
    sources.length > 0 ||
    (attribution?.notes && attribution.notes.trim() !== "") ||
    creatorRole;

  if (!hasProvenanceData) return null;

  const confidenceConfig = CONFIDENCE_LABELS[confidenceLevel];
  const reviewConfig = REVIEW_STATUS_LABELS[reviewStatus];

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      {/* Header - Always Visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Info className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <span className="font-semibold text-gray-900 dark:text-gray-100">
            About This Deck
          </span>
        </div>
        <div className="flex items-center gap-3">
          {/* Show badges when collapsed */}
          {!isExpanded && (
            <div className="mr-2">
              <ProvenanceBadges
                contentSources={contentSources}
                creationMethods={creationMethods}
                confidenceLevel={confidenceLevel}
                reviewStatus={reviewStatus}
                creatorRole={creatorRole}
                creatorRoleVerified={creatorRoleVerified}
                compact
              />
            </div>
          )}
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          )}
        </div>
      </button>

      {/* Expandable Content */}
      {isExpanded && (
        <div className="p-4 space-y-4 bg-white dark:bg-gray-900">
          {/* Badges */}
          <div>
            <ProvenanceBadges
              contentSources={contentSources}
              creationMethods={creationMethods}
              confidenceLevel={confidenceLevel}
              reviewStatus={reviewStatus}
              creatorRole={creatorRole}
              creatorRoleVerified={creatorRoleVerified}
            />
          </div>

          {/* Creator Info */}
          {creatorName && (
            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Creator
              </h4>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {creatorName}
                </span>
                {creatorRoleVerified && (
                  <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                )}
                {creatorRole && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    ({creatorRole.replace("_", " ")})
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Content Sources */}
          {contentSources.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Content Sources
              </h4>
              <ul className="list-disc list-inside space-y-1">
                {contentSources.map((source) => (
                  <li
                    key={source}
                    className="text-sm text-gray-700 dark:text-gray-300"
                  >
                    {SOURCE_LABELS[source] || source}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Creation Methods */}
          {creationMethods.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Creation Methods
              </h4>
              <ul className="list-disc list-inside space-y-1">
                {creationMethods.map((method) => (
                  <li
                    key={method}
                    className="text-sm text-gray-700 dark:text-gray-300"
                  >
                    {METHOD_LABELS[method] || method}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Detailed Sources */}
          {sources.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Detailed Sources
              </h4>
              <div className="space-y-2">
                {sources.map((source, index) => (
                  <div
                    key={index}
                    className="p-2 bg-gray-50 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700"
                  >
                    {source.title && (
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {source.title}
                      </p>
                    )}
                    {source.url && (
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 dark:text-blue-400 hover:underline truncate block"
                      >
                        {source.url}
                      </a>
                    )}
                    {source.notes && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {source.notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Attribution / Citations */}
          {attribution?.notes && attribution.notes.trim() !== "" && (
            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Citations & Attribution
              </h4>
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {attribution.notes}
              </p>
            </div>
          )}

          {/* Confidence & Review Status */}
          <div className="grid grid-cols-2 gap-4 pt-3 border-t border-gray-200 dark:border-gray-700">
            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
                Confidence Level
              </h4>
              <p className={`text-sm font-medium ${confidenceConfig.color}`}>
                {confidenceConfig.label}
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
                Review Status
              </h4>
              <p className={`text-sm font-medium ${reviewConfig.color}`}>
                {reviewConfig.label}
              </p>
            </div>
          </div>

          {/* Last Reviewed */}
          {lastReviewedAt && (
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-700">
              <Calendar className="w-4 h-4" />
              <span>
                Last reviewed on {new Date(lastReviewedAt).toLocaleDateString()}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
