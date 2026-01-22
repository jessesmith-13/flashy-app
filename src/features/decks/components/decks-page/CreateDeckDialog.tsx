import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Button } from "@/shared/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { DECK_CATEGORIES } from "@/shared/catelog/categories";
import { DECK_LANGUAGES } from "@/shared/catelog/languages";
import { ColorPicker } from "@/components/ColorPicker";
import { EmojiPicker } from "@/components/EmojiPicker";

export type CreateDeckPayload = {
  name: string;
  emoji: string;
  color: string;
  category?: string;
  subtopic?: string;
  difficulty?: string;
  frontLanguage?: string;
  backLanguage?: string;
};

interface CreateDeckDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateDeck: (data: CreateDeckPayload) => Promise<void>;
}

export function CreateDeckDialog({
  open,
  onOpenChange,
  onCreateDeck,
}: CreateDeckDialogProps) {
  const [newDeckName, setNewDeckName] = useState("");
  const [selectedEmoji, setSelectedEmoji] = useState("📚");
  const [selectedColor, setSelectedColor] = useState("#10B981");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSubtopic, setSelectedSubtopic] = useState("");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("");
  const [selectedFrontLanguage, setSelectedFrontLanguage] =
    useState<string>("");
  const [selectedBackLanguage, setSelectedBackLanguage] = useState<string>("");
  const [creating, setCreating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeckName.trim()) return;

    setCreating(true);
    try {
      await onCreateDeck({
        name: newDeckName,
        emoji: selectedEmoji,
        color: selectedColor,
        category: selectedCategory || undefined,
        subtopic: selectedSubtopic || undefined,
        difficulty: selectedDifficulty || undefined,
        frontLanguage: selectedFrontLanguage || undefined,
        backLanguage: selectedBackLanguage || undefined,
      });

      // Reset form
      setNewDeckName("");
      setSelectedEmoji("📚");
      setSelectedColor("#10B981");
      setSelectedCategory("");
      setSelectedSubtopic("");
      setSelectedDifficulty("");
      setSelectedFrontLanguage("");
      setSelectedBackLanguage("");
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to create deck:", error);
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[75vh] sm:max-h-[90vh] overflow-y-auto overscroll-contain">
        <DialogHeader>
          <DialogTitle>Create New Deck</DialogTitle>
          <DialogDescription>
            Create a new flashcard deck with a name, emoji, color, category, and
            languages.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4 pb-4">
          {/* Added pb-4 for bottom padding */}
          <div>
            <Label htmlFor="deckName">Deck Name</Label>
            <Input
              id="deckName"
              placeholder="e.g., Spanish Vocabulary"
              value={newDeckName}
              onChange={(e) => setNewDeckName(e.target.value)}
              required
              className="mt-1"
            />
          </div>

          <EmojiPicker emoji={selectedEmoji} onChange={setSelectedEmoji} />

          <ColorPicker color={selectedColor} onChange={setSelectedColor} />

          <div>
            <Label htmlFor="category">Category (Optional)</Label>
            <Select
              value={selectedCategory}
              onValueChange={(value) => {
                setSelectedCategory(value);
                setSelectedSubtopic("");
              }}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select a category..." />
              </SelectTrigger>
              <SelectContent
                position="popper"
                className="max-h-[200px] overflow-y-auto"
                sideOffset={4}
              >
                {[...DECK_CATEGORIES]
                  .sort((a, b) => a.category.localeCompare(b.category))
                  .map((cat) => (
                    <SelectItem key={cat.category} value={cat.category}>
                      {cat.category}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {selectedCategory && (
            <div>
              <Label htmlFor="subtopic">Subtopic (Optional)</Label>
              <Select
                value={selectedSubtopic}
                onValueChange={setSelectedSubtopic}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select a subtopic..." />
                </SelectTrigger>
                <SelectContent
                  position="popper"
                  className="max-h-[200px] overflow-y-auto"
                  sideOffset={4}
                >
                  {[
                    ...(DECK_CATEGORIES.find(
                      (c) => c.category === selectedCategory,
                    )?.subtopics || []),
                  ]
                    .sort((a, b) => a.localeCompare(b))
                    .map((subtopic) => (
                      <SelectItem key={subtopic} value={subtopic}>
                        {subtopic}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label htmlFor="difficulty">Difficulty (Optional)</Label>
            <Select
              value={selectedDifficulty}
              onValueChange={setSelectedDifficulty}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select difficulty level..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="beginner">🟢 Beginner</SelectItem>
                <SelectItem value="intermediate">🟡 Intermediate</SelectItem>
                <SelectItem value="advanced">🟠 Advanced</SelectItem>
                <SelectItem value="expert">🔴 Expert</SelectItem>
                <SelectItem value="mixed">🌈 Mixed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="frontLanguage">Front Language (Optional)</Label>
            <Select
              value={selectedFrontLanguage}
              onValueChange={setSelectedFrontLanguage}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select a language..." />
              </SelectTrigger>
              <SelectContent
                position="popper"
                className="max-h-[200px] overflow-y-auto"
                sideOffset={4}
              >
                {DECK_LANGUAGES.map((lang) => (
                  <SelectItem key={lang.code} value={lang.name}>
                    {lang.flag} {lang.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="backLanguage">Back Language (Optional)</Label>
            <Select
              value={selectedBackLanguage}
              onValueChange={setSelectedBackLanguage}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select a language..." />
              </SelectTrigger>
              <SelectContent
                position="popper"
                className="max-h-[200px] overflow-y-auto"
                sideOffset={4}
              >
                {DECK_LANGUAGES.map((lang) => (
                  <SelectItem key={lang.code} value={lang.name}>
                    {lang.flag} {lang.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            type="submit"
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
            disabled={creating}
          >
            {creating ? "Creating..." : "Create Deck"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
