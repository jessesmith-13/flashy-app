import { useState } from "react";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Textarea } from "../../ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";
import {
  Link as LinkIcon,
  BookOpen,
  GraduationCap,
  FileText,
  Upload,
  Sparkles,
  HelpCircle,
  Plus,
  Trash2,
  Edit2,
  X,
  Check,
} from "lucide-react";

export interface DeckSource {
  id?: string;
  deck_id?: string;
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
  file_id?: string;
  created_by?: string;
  created_at?: string;
}

interface DeckSourceEditorProps {
  sources: DeckSource[];
  onSourcesChange: (sources: DeckSource[]) => void;
  disabled?: boolean;
}

const SOURCE_KIND_OPTIONS = [
  { value: "url", label: "URL/Link", icon: LinkIcon },
  { value: "book", label: "Book/Textbook", icon: BookOpen },
  { value: "course", label: "Course/Lecture", icon: GraduationCap },
  { value: "user_notes", label: "Personal Notes", icon: FileText },
  { value: "uploaded_file", label: "Uploaded File", icon: Upload },
  { value: "ai", label: "AI Source", icon: Sparkles },
  { value: "other", label: "Other", icon: HelpCircle },
];

export function DeckSourceEditor({
  sources,
  onSourcesChange,
  disabled = false,
}: DeckSourceEditorProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [newSource, setNewSource] = useState<DeckSource>({
    kind: "url",
  });

  const resetNewSource = () => {
    setNewSource({ kind: "url" });
    setIsAdding(false);
    setEditingIndex(null);
  };

  const handleAdd = () => {
    if (!newSource.kind) return;
    onSourcesChange([...sources, { ...newSource }]);
    resetNewSource();
  };

  const handleEdit = (index: number) => {
    setEditingIndex(index);
    setNewSource(sources[index]);
    setIsAdding(true);
  };

  const handleUpdate = () => {
    if (editingIndex === null) return;
    const updated = [...sources];
    updated[editingIndex] = newSource;
    onSourcesChange(updated);
    resetNewSource();
  };

  const handleDelete = (index: number) => {
    onSourcesChange(sources.filter((_, i) => i !== index));
  };

  const renderSourceForm = () => {
    return (
      <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 space-y-3">
        {/* Kind Selector */}
        <div>
          <Label>Source Type</Label>
          <Select
            value={newSource.kind}
            onValueChange={(value: DeckSource["kind"]) =>
              setNewSource({ kind: value })
            }
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SOURCE_KIND_OPTIONS.map((option) => {
                const OptionIcon = option.icon;
                return (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      <OptionIcon className="w-4 h-4" />
                      {option.label}
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        {/* Title (for book, course, other) */}
        {(newSource.kind === "book" ||
          newSource.kind === "course" ||
          newSource.kind === "other") && (
          <div>
            <Label>Title</Label>
            <Input
              placeholder={
                newSource.kind === "book"
                  ? "e.g., Introduction to Psychology, 10th Edition"
                  : newSource.kind === "course"
                  ? "e.g., CS 101 - Intro to Computer Science"
                  : "Source title"
              }
              value={newSource.title || ""}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setNewSource({ ...newSource, title: e.target.value })
              }
              disabled={disabled}
            />
          </div>
        )}

        {/* URL (for url kind) */}
        {newSource.kind === "url" && (
          <div>
            <Label>URL</Label>
            <Input
              type="url"
              placeholder="https://example.com/resource"
              value={newSource.url || ""}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setNewSource({ ...newSource, url: e.target.value })
              }
              disabled={disabled}
            />
          </div>
        )}

        {/* Notes (for all kinds) */}
        <div>
          <Label>Notes (Optional)</Label>
          <Textarea
            placeholder={
              newSource.kind === "book"
                ? "e.g., Chapter 3, ISBN: 978-1234567890"
                : newSource.kind === "course"
                ? "e.g., Fall 2024, Dr. Smith"
                : "Additional details about this source"
            }
            value={newSource.notes || ""}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
              setNewSource({ ...newSource, notes: e.target.value })
            }
            disabled={disabled}
            rows={2}
            className="resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2 justify-end">
          <Button
            size="sm"
            variant="outline"
            onClick={resetNewSource}
            disabled={disabled}
          >
            <X className="w-4 h-4 mr-1" />
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={editingIndex !== null ? handleUpdate : handleAdd}
            disabled={disabled}
          >
            <Check className="w-4 h-4 mr-1" />
            {editingIndex !== null ? "Update" : "Add Source"}
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-base">Deck Sources</Label>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
            Track specific sources used to create this deck.
          </p>
        </div>
        {!isAdding && !disabled && (
          <Button size="sm" onClick={() => setIsAdding(true)}>
            <Plus className="w-4 h-4 mr-1" />
            Add Source
          </Button>
        )}
      </div>

      {/* Existing Sources List */}
      {sources.length > 0 && (
        <div className="space-y-2">
          {sources.map((source, index) => {
            const kindOption = SOURCE_KIND_OPTIONS.find(
              (opt) => opt.value === source.kind
            );
            const Icon = kindOption?.icon || HelpCircle;

            return (
              <div
                key={index}
                className="flex items-start gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50"
              >
                <Icon className="w-5 h-5 text-gray-600 dark:text-gray-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      {kindOption?.label}
                    </span>
                  </div>
                  {source.title && (
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mt-1">
                      {source.title}
                    </p>
                  )}
                  {source.url && (
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 dark:text-blue-400 hover:underline mt-1 block truncate"
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
                {!disabled && (
                  <div className="flex gap-1 flex-shrink-0">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEdit(index)}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(index)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Form */}
      {isAdding && renderSourceForm()}

      {/* Empty State */}
      {sources.length === 0 && !isAdding && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
          No sources added yet. Click "Add Source" to get started.
        </div>
      )}
    </div>
  );
}
