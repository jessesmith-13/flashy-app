import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import { Badge } from "@/shared/ui/badge";
import {
  FlipVertical,
  CheckCircle,
  Keyboard,
  ImageIcon,
  Crown,
  X,
  Sparkles,
  Loader2,
  Plus,
} from "lucide-react";
import { CardType } from "@/types/decks";
import { SubscriptionTier } from "@/types/users";
import { canAddImageToCard } from "../../../shared/entitlements/subscription";
import { AudioRecorder } from "./AudioRecorder";

const CARD_TYPES: {
  value: CardType;
  label: string;
  icon: typeof FlipVertical;
  description: string;
}[] = [
  {
    value: "classic-flip",
    label: "Classic Flip",
    icon: FlipVertical,
    description: "Flip card with ✓/✗ rating",
  },
  {
    value: "multiple-choice",
    label: "Multiple Choice",
    icon: CheckCircle,
    description: "Choose correct answer(s)",
  },
  {
    value: "type-answer",
    label: "Type to Answer",
    icon: Keyboard,
    description: "Type the exact answer",
  },
];

interface EditCardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cardType: CardType;
  front: string;
  back: string;
  frontImageUrl: string;
  frontImageFile: File | null;
  backImageUrl: string;
  backImageFile: File | null;
  frontAudio?: string;
  backAudio?: string;
  // New structure for multiple-choice
  correctAnswers: string[]; // Array of correct answers
  incorrectAnswers: string[]; // Array of incorrect options
  // For type-answer
  acceptedAnswers: string[]; // Array of accepted alternative answers
  updating: boolean;
  uploadingImage: boolean;
  uploadingBackImage: boolean;
  userTier?: SubscriptionTier;
  deckFrontLanguage?: string;
  deckBackLanguage?: string;
  onCardTypeChange: (type: CardType) => void;
  onFrontChange: (value: string) => void;
  onBackChange: (value: string) => void;
  onFrontImageChange: (file: File | null, url: string) => void;
  onBackImageChange: (file: File | null, url: string) => void;
  onFrontAudioChange?: (url: string) => void;
  onBackAudioChange?: (url: string) => void;
  onCorrectAnswersChange: (answers: string[]) => void;
  onIncorrectAnswersChange: (answers: string[]) => void;
  onAcceptedAnswersChange: (answers: string[]) => void;
  onSubmit: (e: React.FormEvent) => void;
  onUpgradeClick: () => void;
  onTranslateFront?: () => Promise<void>;
  onTranslateBack?: () => Promise<void>;
  translatingFront?: boolean;
  translatingBack?: boolean;
}

export function EditCardModal({
  open,
  onOpenChange,
  cardType,
  front,
  back,
  frontImageUrl,
  backImageUrl,
  frontAudio,
  backAudio,
  correctAnswers,
  incorrectAnswers,
  acceptedAnswers,
  updating,
  uploadingImage,
  uploadingBackImage,
  userTier,
  onCardTypeChange,
  onFrontChange,
  onBackChange,
  onFrontImageChange,
  onBackImageChange,
  onFrontAudioChange,
  onBackAudioChange,
  onCorrectAnswersChange,
  onIncorrectAnswersChange,
  onAcceptedAnswersChange,
  onSubmit,
  onUpgradeClick,
  onTranslateFront,
  onTranslateBack,
  translatingFront,
  translatingBack,
}: EditCardModalProps) {
  // Multiple choice handlers
  const handleAddCorrectAnswer = () => {
    onCorrectAnswersChange([...correctAnswers, ""]);
  };

  const handleRemoveCorrectAnswer = (index: number) => {
    const newAnswers = correctAnswers.filter((_, i) => i !== index);
    onCorrectAnswersChange(newAnswers.length > 0 ? newAnswers : [""]);
  };

  const handleCorrectAnswerChange = (index: number, value: string) => {
    const newAnswers = [...correctAnswers];
    newAnswers[index] = value;
    onCorrectAnswersChange(newAnswers);
  };

  const handleAddIncorrectAnswer = () => {
    onIncorrectAnswersChange([...incorrectAnswers, ""]);
  };

  const handleRemoveIncorrectAnswer = (index: number) => {
    const newAnswers = incorrectAnswers.filter((_, i) => i !== index);
    onIncorrectAnswersChange(newAnswers);
  };

  const handleIncorrectAnswerChange = (index: number, value: string) => {
    const newAnswers = [...incorrectAnswers];
    newAnswers[index] = value;
    onIncorrectAnswersChange(newAnswers);
  };

  // Type-answer handlers
  const handleAddTypeAnswer = () => {
    onAcceptedAnswersChange([...acceptedAnswers, ""]);
  };

  const handleRemoveTypeAnswer = (index: number) => {
    const newAnswers = acceptedAnswers.filter((_, i) => i !== index);
    onAcceptedAnswersChange(newAnswers);
  };

  const handleTypeAnswerChange = (index: number, value: string) => {
    const newAnswers = [...acceptedAnswers];
    newAnswers[index] = value;
    onAcceptedAnswersChange(newAnswers);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Card</DialogTitle>
          <DialogDescription>Update your flashcard details.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4 mt-4">
          <div>
            <Label>Card Type</Label>
            <div className="grid grid-cols-1 gap-2 mt-2">
              {CARD_TYPES.map((type) => {
                const Icon = type.icon;
                return (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => onCardTypeChange(type.value)}
                    className={`p-3 rounded-lg border-2 transition-all text-left ${
                      cardType === type.value
                        ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-900/30"
                        : "border-gray-200 dark:border-gray-700 hover:border-emerald-300 dark:hover:border-emerald-600"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Icon
                        className={`w-5 h-5 mt-0.5 ${
                          cardType === type.value
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-gray-600 dark:text-gray-400"
                        }`}
                      />
                      <div>
                        <div className="text-sm text-gray-900 dark:text-gray-100">
                          {type.label}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {type.description}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <Label htmlFor="editCardFront">
              {cardType === "classic-flip" ? "Front (Question)" : "Question"}
            </Label>
            <Textarea
              id="editCardFront"
              placeholder={
                cardType === "classic-flip"
                  ? "What is the capital of France? (or add an image below)"
                  : cardType === "multiple-choice"
                  ? "Which city is the capital of France?"
                  : "What is the capital of France?"
              }
              value={front}
              onChange={(e) => onFrontChange(e.target.value)}
              className="mt-1 min-h-[80px] text-gray-900 dark:text-gray-100"
            />
            {onTranslateFront && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onTranslateFront}
                className="mt-2 h-7 text-xs border-amber-300 text-amber-700 hover:bg-amber-100"
                disabled={translatingFront}
              >
                <Sparkles className="w-3 h-3 mr-1" />
                {translatingFront ? "Translating..." : "Translate"}
              </Button>
            )}
          </div>

          {/* Question Image */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-2">
              <Label
                htmlFor="editCardFrontImage"
                className="text-sm flex items-center gap-2"
              >
                <ImageIcon className="w-4 h-4" />
                Question Image{" "}
                <span className="text-xs text-gray-500">(optional)</span>
              </Label>
              {userTier === "free" && (
                <Crown className="w-4 h-4 text-amber-500" />
              )}
            </div>
            {userTier === "free" ? (
              <div className="p-3 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <Crown className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-amber-900">Premium Feature</p>
                    <p className="text-xs text-amber-700 mt-0.5">
                      Upgrade to add images to your flashcards
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={onUpgradeClick}
                      className="mt-2 h-7 text-xs border-amber-300 text-amber-700 hover:bg-amber-100"
                    >
                      <Crown className="w-3 h-3 mr-1" />
                      Upgrade Now
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <Input
                  id="editCardFrontImage"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const previewUrl = URL.createObjectURL(file);
                      onFrontImageChange(file, previewUrl);
                    }
                  }}
                  className="mt-1"
                  disabled={uploadingImage}
                />
                {uploadingImage && (
                  <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      Uploading image...
                    </p>
                  </div>
                )}
                {frontImageUrl && !uploadingImage && (
                  <div className="mt-2 space-y-2">
                    <div className="rounded-lg overflow-hidden border">
                      <img
                        src={frontImageUrl}
                        alt="Question preview"
                        className="w-full h-32 object-cover"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => onFrontImageChange(null, "")}
                      className="w-full"
                    >
                      Remove Image
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Front Audio Section */}
          {canAddImageToCard(userTier) && onFrontAudioChange && (
            <div>
              <AudioRecorder
                onAudioSave={(url) => onFrontAudioChange(url)}
                currentAudioUrl={frontAudio}
                onAudioRemove={() => onFrontAudioChange("")}
                disabled={updating}
                label="Question Audio (Optional)"
              />
            </div>
          )}

          {/* Multiple Choice Options */}
          {cardType === "multiple-choice" && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm mb-2 block">Correct Answer(s)</Label>
                <div className="space-y-2">
                  {correctAnswers.map((answer, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className="bg-green-50 text-green-700 border-green-300 flex-shrink-0"
                      >
                        Correct
                      </Badge>
                      <Input
                        value={answer}
                        onChange={(e) =>
                          handleCorrectAnswerChange(index, e.target.value)
                        }
                        placeholder={`Correct answer ${index + 1}`}
                        className="flex-1"
                      />
                      {correctAnswers.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveCorrectAnswer(index)}
                          className="flex-shrink-0"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddCorrectAnswer}
                  className="mt-2 w-full"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Another Correct Answer
                </Button>
              </div>

              <div>
                <Label className="text-sm mb-2 block">Incorrect Options</Label>
                <div className="space-y-2">
                  {incorrectAnswers.map((answer, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className="bg-red-50 text-red-700 border-red-300 flex-shrink-0"
                      >
                        Wrong
                      </Badge>
                      <Input
                        value={answer}
                        onChange={(e) =>
                          handleIncorrectAnswerChange(index, e.target.value)
                        }
                        placeholder={`Incorrect option ${index + 1}`}
                        className="flex-1"
                      />
                      {incorrectAnswers.length > 0 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveIncorrectAnswer(index)}
                          className="flex-shrink-0"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddIncorrectAnswer}
                  className="mt-2 w-full"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Incorrect Option
                </Button>
              </div>
            </div>
          )}

          {/* Classic Flip Back */}
          {cardType === "classic-flip" && (
            <>
              <div>
                <Label htmlFor="editCardBack">Back (Answer)</Label>
                <Textarea
                  id="editCardBack"
                  placeholder="Paris (or add an image below)"
                  value={back}
                  onChange={(e) => onBackChange(e.target.value)}
                  className="mt-1 min-h-[80px] text-gray-900 dark:text-gray-100"
                />
                {onTranslateBack && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onTranslateBack}
                    className="mt-2 h-7 text-xs border-amber-300 text-amber-700 hover:bg-amber-100"
                    disabled={translatingBack}
                  >
                    <Sparkles className="w-3 h-3 mr-1" />
                    {translatingBack ? "Translating..." : "Translate"}
                  </Button>
                )}
              </div>

              {/* Answer Image */}
              {canAddImageToCard(userTier) && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label
                      htmlFor="editCardBackImage"
                      className="text-sm flex items-center gap-2"
                    >
                      <ImageIcon className="w-4 h-4" />
                      Answer Image{" "}
                      <span className="text-xs text-gray-500">(optional)</span>
                    </Label>
                  </div>
                  <Input
                    id="editCardBackImage"
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const previewUrl = URL.createObjectURL(file);
                        onBackImageChange(file, previewUrl);
                      }
                    }}
                    className="mt-1"
                    disabled={uploadingBackImage}
                  />
                  {uploadingBackImage && (
                    <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        Uploading image...
                      </p>
                    </div>
                  )}
                  {backImageUrl && !uploadingBackImage && (
                    <div className="mt-2 space-y-2">
                      <div className="rounded-lg overflow-hidden border">
                        <img
                          src={backImageUrl}
                          alt="Answer preview"
                          className="w-full h-32 object-cover"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => onBackImageChange(null, "")}
                        className="w-full"
                      >
                        Remove Image
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Back Audio Section */}
              {canAddImageToCard(userTier) && onBackAudioChange && (
                <div>
                  <AudioRecorder
                    onAudioSave={(url) => onBackAudioChange(url)}
                    currentAudioUrl={backAudio}
                    onAudioRemove={() => onBackAudioChange("")}
                    disabled={updating}
                    label="Answer Audio (Optional)"
                  />
                </div>
              )}
            </>
          )}

          {/* Type-Answer Accepted Answers */}
          {cardType === "type-answer" && (
            <>
              <div>
                <Label htmlFor="cardBack">Answer *</Label>
                <Textarea
                  id="cardBack"
                  placeholder="The correct answer (e.g., 'Paris')"
                  value={back}
                  onChange={(e) => onBackChange(e.target.value)}
                  className="mt-1 min-h-[80px] text-gray-900 dark:text-gray-100"
                />
                {onTranslateBack && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onTranslateBack}
                    className="mt-2 h-7 text-xs border-amber-300 text-amber-700 hover:bg-amber-100"
                    disabled={translatingBack}
                  >
                    <Sparkles className="w-3 h-3 mr-1" />
                    {translatingBack ? "Translating..." : "Translate"}
                  </Button>
                )}
              </div>

              {/* Answer Image */}
              {canAddImageToCard(userTier) && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label
                      htmlFor="cardBackImage"
                      className="text-sm flex items-center gap-2"
                    >
                      <ImageIcon className="w-4 h-4" />
                      Answer Image{" "}
                      <span className="text-xs text-gray-500">(optional)</span>
                    </Label>
                  </div>
                  <Input
                    id="cardBackImage"
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const previewUrl = URL.createObjectURL(file);
                        onBackImageChange(file, previewUrl);
                      }
                    }}
                    className="mt-1"
                    disabled={uploadingBackImage}
                  />
                  {uploadingBackImage && (
                    <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        Uploading image...
                      </p>
                    </div>
                  )}
                  {backImageUrl && !uploadingBackImage && (
                    <div className="mt-2 space-y-2">
                      <div className="rounded-lg overflow-hidden border">
                        <img
                          src={backImageUrl}
                          alt="Answer preview"
                          className="w-full h-32 object-cover"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => onBackImageChange(null, "")}
                        className="w-full"
                      >
                        Remove Image
                      </Button>
                    </div>
                  )}
                </div>
              )}

              <div>
                <Label className="text-sm mb-2 block">
                  Accepted Alternatives{" "}
                  <span className="text-xs text-gray-500">(optional)</span>
                </Label>
                {acceptedAnswers.length > 0 && (
                  <div className="space-y-2 mb-2">
                    {acceptedAnswers.map((answer, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Input
                          value={answer}
                          onChange={(e) =>
                            handleTypeAnswerChange(index, e.target.value)
                          }
                          placeholder={`Alternative answer ${
                            index + 1
                          } (e.g., "paris", "París")`}
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveTypeAnswer(index)}
                          className="flex-shrink-0"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddTypeAnswer}
                  className="w-full"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Alternative Answer
                </Button>
                <p className="text-xs text-gray-500 mt-2">
                  Add alternative spellings or phrasings that should be accepted
                  as correct (e.g., "correct", "corect").
                </p>
              </div>
            </>
          )}

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={updating}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={updating || uploadingImage || uploadingBackImage}
              className="flex-1"
            >
              {updating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
