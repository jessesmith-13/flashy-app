// src/features/decks/components/deck-detail/bulk/BulkCardFields.tsx
import type { CardType } from "@/types/decks";
import type { SubscriptionTier } from "@/types/users";
import type { CardFormData } from "../BulkAddCardsDialog";

import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";

import { Loader2, Plus, Sparkles, Trash2, Upload, X } from "lucide-react";
import { AudioRecorder } from "../AudioRecorder";
import { canAddImageToCard } from "@/shared/entitlements/subscription";

type Field = "front" | "back";
type ArrayKey = "correctAnswers" | "incorrectAnswers" | "acceptedAnswers";

export function BulkCardFields(props: {
  card: CardFormData;

  userTier?: SubscriptionTier;
  deckFrontLanguage?: string;
  deckBackLanguage?: string;
  isPremium: boolean;

  submitting: boolean;

  translating: Field | null;
  onTranslate: (field: Field) => void;

  uploadingImage: Field | null;
  onUploadImage: (field: Field, file: File) => void;
  onRemoveImage: (field: Field) => void;

  uploadingAudio: Field | null;
  onUploadAudio: (field: Field, file: File) => Promise<void>;

  onPatch: (patch: Partial<CardFormData>) => void;
  onSetType: (t: CardType) => void;

  onSetArrayItem: (key: ArrayKey, idx: number, value: string) => void;
  onAddArrayItem: (key: ArrayKey, max: number) => void;
  onRemoveArrayItem: (key: ArrayKey, idx: number, min: number) => void;
}) {
  const {
    card,
    userTier,
    deckFrontLanguage,
    deckBackLanguage,
    isPremium,
    submitting,
    translating,
    onTranslate,
    uploadingImage,
    onUploadImage,
    onRemoveImage,
    uploadingAudio,
    onUploadAudio,
    onPatch,
    onSetType,
    onSetArrayItem,
    onAddArrayItem,
    onRemoveArrayItem,
  } = props;

  const canTranslateFront = isPremium && !!deckFrontLanguage;
  const canTranslateBack = isPremium && !!deckBackLanguage;

  const showClassicImages = card.cardType === "classic-flip";
  const canAudio = canAddImageToCard(userTier); // (kept same gating you had)

  return (
    <div className="space-y-3">
      {/* Card Type */}
      <div>
        <Label className="text-sm">Card Type</Label>
        <Select
          value={card.cardType}
          onValueChange={(v) => onSetType(v as CardType)}
        >
          <SelectTrigger className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="classic-flip">🔄 Classic Flip</SelectItem>
            <SelectItem value="multiple-choice">✅ Multiple Choice</SelectItem>
            <SelectItem value="type-answer">⌨️ Type Answer</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* FRONT */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <Label className="text-sm">
            {card.cardType === "multiple-choice"
              ? "Question"
              : "Front (Question)"}
          </Label>

          {canTranslateFront && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onTranslate("front")}
              disabled={!card.front.trim() || translating === "front"}
              className="h-6 px-2 text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-900/20"
            >
              {translating === "front" ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <>
                  <Sparkles className="w-3 h-3 mr-1" />
                  Translate
                </>
              )}
            </Button>
          )}
        </div>

        <Textarea
          placeholder="Enter question..."
          value={card.front}
          onChange={(e) => onPatch({ front: e.target.value })}
          className="min-h-[60px] text-sm"
        />

        {/* Front image (classic-flip only) */}
        {showClassicImages && (
          <div className="mt-2">
            {card.frontImageUrl || card.frontImageFile ? (
              <div className="relative inline-block">
                <img
                  src={
                    card.frontImageFile
                      ? URL.createObjectURL(card.frontImageFile)
                      : card.frontImageUrl
                  }
                  alt="Front"
                  className="max-w-full h-32 object-cover rounded border border-gray-300 dark:border-gray-600"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemoveImage("front")}
                  className="absolute top-1 right-1 h-6 w-6 p-0 bg-red-600 hover:bg-red-700 text-white rounded-full"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ) : (
              <div>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) onUploadImage("front", file);
                  }}
                  className="hidden"
                  id={`${card.id}-front-image`}
                  disabled={uploadingImage === "front"}
                />
                <Label htmlFor={`${card.id}-front-image`}>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    asChild
                    disabled={uploadingImage === "front"}
                  >
                    <span>
                      {uploadingImage === "front" ? (
                        <>
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="w-3 h-3 mr-1" />
                          Add Image (Optional)
                        </>
                      )}
                    </span>
                  </Button>
                </Label>
              </div>
            )}
          </div>
        )}

        {/* Front audio (classic-flip only, keep your gating) */}
        {canAudio && card.cardType === "classic-flip" && (
          <div className="mt-2">
            <AudioRecorder
              onAudioSave={(url) => onPatch({ frontAudio: url })}
              currentAudioUrl={card.frontAudio}
              onAudioRemove={() => onPatch({ frontAudio: "" })}
              disabled={submitting || uploadingAudio === "front"}
              label="Question Audio (Optional)"
              onUploadAudio={(file) => onUploadAudio("front", file)}
            />
          </div>
        )}
      </div>

      {/* TYPE-SPECIFIC */}
      {card.cardType === "multiple-choice" ? (
        <>
          {/* Correct answers */}
          <div>
            <Label className="text-sm text-emerald-600 dark:text-emerald-400">
              Correct Answer(s) ✓
            </Label>

            <div className="space-y-2 mt-1">
              {card.correctAnswers.map((answer, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input
                    placeholder={`Correct answer ${idx + 1}...`}
                    value={answer}
                    onChange={(e) =>
                      onSetArrayItem("correctAnswers", idx, e.target.value)
                    }
                    className="flex-1 text-sm border-emerald-300 dark:border-emerald-700"
                  />
                  {card.correctAnswers.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        onRemoveArrayItem("correctAnswers", idx, 1)
                      }
                      className="h-8 w-8 p-0 text-red-600"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            {card.correctAnswers.length < 3 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onAddArrayItem("correctAnswers", 3)}
                className="mt-2 text-xs text-emerald-600 border-emerald-300"
              >
                <Plus className="w-3 h-3 mr-1" />
                Add Correct Answer
              </Button>
            )}
          </div>

          {/* Incorrect answers */}
          <div>
            <Label className="text-sm text-red-600 dark:text-red-400">
              Incorrect Options ✗
            </Label>

            <div className="space-y-2 mt-1">
              {card.incorrectAnswers.map((answer, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input
                    placeholder={`Incorrect option ${idx + 1}...`}
                    value={answer}
                    onChange={(e) =>
                      onSetArrayItem("incorrectAnswers", idx, e.target.value)
                    }
                    className="flex-1 text-sm border-red-300 dark:border-red-700"
                  />
                  {card.incorrectAnswers.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        onRemoveArrayItem("incorrectAnswers", idx, 1)
                      }
                      className="h-8 w-8 p-0 text-red-600"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            {card.incorrectAnswers.length < 5 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onAddArrayItem("incorrectAnswers", 5)}
                className="mt-2 text-xs text-red-600 border-red-300"
              >
                <Plus className="w-3 h-3 mr-1" />
                Add Incorrect Option
              </Button>
            )}
          </div>
        </>
      ) : card.cardType === "type-answer" ? (
        <>
          {/* Back text (correct answer) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label className="text-sm">Correct Answer</Label>

              {canTranslateBack && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onTranslate("back")}
                  disabled={!card.back.trim() || translating === "back"}
                  className="h-6 px-2 text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                >
                  {translating === "back" ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <>
                      <Sparkles className="w-3 h-3 mr-1" />
                      Translate
                    </>
                  )}
                </Button>
              )}
            </div>

            <Textarea
              placeholder="Enter the correct answer..."
              value={card.back}
              onChange={(e) => onPatch({ back: e.target.value })}
              className="min-h-[60px] text-sm"
            />
          </div>

          {/* Accepted answers */}
          <div>
            <Label className="text-sm text-gray-600 dark:text-gray-400">
              Accepted Answers (Alternative spellings - optional)
            </Label>

            <div className="space-y-2 mt-1">
              {card.acceptedAnswers.map((answer, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input
                    placeholder={`Alternative answer ${idx + 1}...`}
                    value={answer}
                    onChange={(e) =>
                      onSetArrayItem("acceptedAnswers", idx, e.target.value)
                    }
                    className="flex-1 text-sm"
                  />
                  {card.acceptedAnswers.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        onRemoveArrayItem("acceptedAnswers", idx, 1)
                      }
                      className="h-8 w-8 p-0 text-red-600"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            {card.acceptedAnswers.length < 10 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onAddArrayItem("acceptedAnswers", 10)}
                className="mt-2 text-xs"
              >
                <Plus className="w-3 h-3 mr-1" />
                Add Alternative Answer
              </Button>
            )}
          </div>
        </>
      ) : (
        <>
          {/* Classic flip back */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label className="text-sm">Back (Answer)</Label>

              {canTranslateBack && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onTranslate("back")}
                  disabled={!card.back.trim() || translating === "back"}
                  className="h-6 px-2 text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                >
                  {translating === "back" ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <>
                      <Sparkles className="w-3 h-3 mr-1" />
                      Translate
                    </>
                  )}
                </Button>
              )}
            </div>

            <Textarea
              placeholder="Enter answer..."
              value={card.back}
              onChange={(e) => onPatch({ back: e.target.value })}
              className="min-h-[60px] text-sm"
            />

            {/* Back image */}
            <div className="mt-2">
              {card.backImageUrl || card.backImageFile ? (
                <div className="relative inline-block">
                  <img
                    src={
                      card.backImageFile
                        ? URL.createObjectURL(card.backImageFile)
                        : card.backImageUrl
                    }
                    alt="Back"
                    className="max-w-full h-32 object-cover rounded border border-gray-300 dark:border-gray-600"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemoveImage("back")}
                    className="absolute top-1 right-1 h-6 w-6 p-0 bg-red-600 hover:bg-red-700 text-white rounded-full"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ) : (
                <div>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) onUploadImage("back", file);
                    }}
                    className="hidden"
                    id={`${card.id}-back-image`}
                    disabled={uploadingImage === "back"}
                  />
                  <Label htmlFor={`${card.id}-back-image`}>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      asChild
                      disabled={uploadingImage === "back"}
                    >
                      <span>
                        {uploadingImage === "back" ? (
                          <>
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Upload className="w-3 h-3 mr-1" />
                            Add Image (Optional)
                          </>
                        )}
                      </span>
                    </Button>
                  </Label>
                </div>
              )}
            </div>

            {/* Back audio */}
            {canAudio && (
              <div className="mt-2">
                <AudioRecorder
                  onAudioSave={(url) => onPatch({ backAudio: url })}
                  currentAudioUrl={card.backAudio}
                  onAudioRemove={() => onPatch({ backAudio: "" })}
                  disabled={submitting || uploadingAudio === "back"}
                  label="Answer Audio (Optional)"
                  onUploadAudio={(file) => onUploadAudio("back", file)}
                />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
