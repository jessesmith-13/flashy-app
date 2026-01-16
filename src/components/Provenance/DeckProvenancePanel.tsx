import { Label } from "@/shared/ui/label";
import { Checkbox } from "@/shared/ui/checkbox";
import { Textarea } from "@/shared/ui/textarea";
import { Info } from "lucide-react";

interface DeckProvenancePanelProps {
  contentSources: string[];
  creationMethods: string[];
  attribution: { [key: string]: any };
  onContentSourcesChange: (sources: string[]) => void;
  onCreationMethodsChange: (methods: string[]) => void;
  onAttributionChange: (attribution: { [key: string]: any }) => void;
  disabled?: boolean;
}

const CONTENT_SOURCE_OPTIONS = [
  { value: "textbook", label: "Textbook" },
  { value: "lecture", label: "Lecture/Course Material" },
  { value: "journal", label: "Academic Journal" },
  { value: "official_docs", label: "Official Documentation" },
  { value: "wikipedia", label: "Wikipedia" },
  { value: "personal_notes", label: "Personal Notes" },
  { value: "ai", label: "AI-Generated" },
  { value: "other", label: "Other" },
];

const CREATION_METHOD_OPTIONS = [
  { value: "manual", label: "Manual Entry" },
  { value: "ai_generated", label: "AI-Generated" },
  { value: "ai_assisted", label: "AI-Assisted" },
  { value: "imported", label: "Imported (CSV/PDF)" },
  { value: "community_remix", label: "Community Remix" },
  { value: "transcribed", label: "Transcribed" },
  { value: "curated", label: "Curated from Multiple Sources" },
];

export function DeckProvenancePanel({
  contentSources,
  creationMethods,
  attribution,
  onContentSourcesChange,
  onCreationMethodsChange,
  onAttributionChange,
  disabled = false,
}: DeckProvenancePanelProps) {
  const toggleContentSource = (value: string) => {
    if (contentSources.includes(value)) {
      onContentSourcesChange(contentSources.filter((s) => s !== value));
    } else {
      onContentSourcesChange([...contentSources, value]);
    }
  };

  const toggleCreationMethod = (value: string) => {
    if (creationMethods.includes(value)) {
      onCreationMethodsChange(creationMethods.filter((m) => m !== value));
    } else {
      onCreationMethodsChange([...creationMethods, value]);
    }
  };

  return (
    <div className="space-y-6 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="flex items-start gap-2">
        <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">
            Content Provenance
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
            Help others understand where this content comes from and how it was
            created.
          </p>
        </div>
      </div>

      {/* Content Sources */}
      <div className="space-y-3">
        <Label className="text-base">Content Sources</Label>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Where did the information come from? (Select all that apply)
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {CONTENT_SOURCE_OPTIONS.map((option) => (
            <div
              key={option.value}
              className="flex items-center gap-2 p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700/50"
            >
              <Checkbox
                id={`source-${option.value}`}
                checked={contentSources.includes(option.value)}
                onCheckedChange={() => toggleContentSource(option.value)}
                disabled={disabled}
              />
              <label
                htmlFor={`source-${option.value}`}
                className="text-sm cursor-pointer flex-1"
              >
                {option.label}
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Creation Methods */}
      <div className="space-y-3">
        <Label className="text-base">Creation Methods</Label>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          How was this deck created? (Select all that apply)
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {CREATION_METHOD_OPTIONS.map((option) => (
            <div
              key={option.value}
              className="flex items-center gap-2 p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700/50"
            >
              <Checkbox
                id={`method-${option.value}`}
                checked={creationMethods.includes(option.value)}
                onCheckedChange={() => toggleCreationMethod(option.value)}
                disabled={disabled}
              />
              <label
                htmlFor={`method-${option.value}`}
                className="text-sm cursor-pointer flex-1"
              >
                {option.label}
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Attribution / Citations */}
      <div className="space-y-3">
        <Label htmlFor="attribution" className="text-base">
          Citations & Attribution (Optional)
        </Label>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Add specific references, ISBN numbers, course names, links, or author
          credits.
        </p>
        <Textarea
          id="attribution"
          placeholder="e.g., 'Introduction to Psychology, 10th Edition (ISBN: 978-1234567890)' or 'Based on lectures from CS 101 by Dr. Smith'"
          value={attribution.notes || ""}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
            onAttributionChange({ ...attribution, notes: e.target.value })
          }
          disabled={disabled}
          rows={3}
          className="resize-none"
        />
      </div>
    </div>
  );
}
