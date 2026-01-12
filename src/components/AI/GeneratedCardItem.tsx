import { useState } from "react";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Textarea } from "../../ui/textarea";
import { Edit2, X, Check, Image as ImageIcon } from "lucide-react";
import { UnsplashAttribution } from "./UnsplashAttribution";

type CardType = "classic-flip" | "multiple-choice" | "type-answer";

export interface GeneratedCard {
  front: string;
  back: string;
  cardType: CardType;
  correctAnswers?: string[];
  incorrectAnswers?: string[];
  acceptedAnswers?: string[];
  frontAudio?: string;
  backAudio?: string;
  frontImageUrl?: string; // 📸 Image for front/question (all card types)
  backImageUrl?: string; // 📸 Image for back/answer (classic-flip only)
  frontImageAttribution?: {
    photographerName: string;
    photographerUsername: string;
    photographerUrl: string;
    unsplashUrl: string;
    downloadUrl: string; // ← Critical for tracking
  };
  backImageAttribution?: {
    photographerName: string;
    photographerUsername: string;
    photographerUrl: string;
    unsplashUrl: string;
    downloadUrl: string; // ← Critical for tracking
  };
}

interface GeneratedCardItemProps {
  card: GeneratedCard;
  index: number;
  onEdit: (updatedCard: GeneratedCard) => void;
  onRemove: () => void;
}

const cardTypeBadgeStyles: Record<CardType, string> = {
  "classic-flip":
    "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  "multiple-choice":
    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  "type-answer":
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
};

const cardTypeLabels: Record<CardType, string> = {
  "classic-flip": "Classic Flip",
  "multiple-choice": "Multiple Choice",
  "type-answer": "Type Answer",
};

export function GeneratedCardItem({
  card,
  index,
  onEdit,
  onRemove,
}: GeneratedCardItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [front, setFront] = useState(card.front);
  const [back, setBack] = useState(card.back);
  const [correctAnswers, setCorrectAnswers] = useState<string[]>(
    card.correctAnswers ?? []
  );
  const [incorrectAnswers, setIncorrectAnswers] = useState<string[]>(
    card.incorrectAnswers ?? []
  );
  const [acceptedAnswers, setAcceptedAnswers] = useState<string[]>(
    card.acceptedAnswers ?? []
  );
  const [frontImageUrl, setFrontImageUrl] = useState(card.frontImageUrl ?? "");
  const [backImageUrl, setBackImageUrl] = useState(card.backImageUrl ?? "");

  const startEdit = () => setIsEditing(true);

  const saveEdit = () => {
    onEdit({
      ...card,
      front,
      back,
      correctAnswers,
      incorrectAnswers,
      acceptedAnswers,
      frontImageUrl: frontImageUrl || undefined,
      backImageUrl: backImageUrl || undefined,
    });
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-800 space-y-3">
        <div>
          <Label>Front</Label>
          <Textarea value={front} onChange={(e) => setFront(e.target.value)} />
        </div>

        {/* 📸 FRONT IMAGE EDITOR (all card types) */}
        <div>
          <Label>Front Image URL (Optional)</Label>
          <Input
            value={frontImageUrl}
            onChange={(e) => setFrontImageUrl(e.target.value)}
            placeholder="https://images.unsplash.com/..."
          />
          {frontImageUrl && (
            <div className="mt-2">
              <img
                src={frontImageUrl}
                alt="Front preview"
                className="w-full max-h-48 object-cover rounded-lg"
                onError={(e) => {
                  e.currentTarget.src = "";
                  e.currentTarget.alt = "Image failed to load";
                }}
              />
            </div>
          )}
        </div>

        {/* CLASSIC FLIP */}
        {card.cardType === "classic-flip" && (
          <>
            <div>
              <Label>Back</Label>
              <Textarea
                value={back}
                onChange={(e) => setBack(e.target.value)}
              />
            </div>

            {/* 📸 BACK IMAGE EDITOR (classic-flip only) */}
            <div>
              <Label>Back Image URL (Optional)</Label>
              <Input
                value={backImageUrl}
                onChange={(e) => setBackImageUrl(e.target.value)}
                placeholder="https://images.unsplash.com/..."
              />
              {backImageUrl && (
                <div className="mt-2">
                  <img
                    src={backImageUrl}
                    alt="Back preview"
                    className="w-full max-h-48 object-cover rounded-lg"
                    onError={(e) => {
                      e.currentTarget.src = "";
                      e.currentTarget.alt = "Image failed to load";
                    }}
                  />
                </div>
              )}
            </div>
          </>
        )}

        {/* MULTIPLE CHOICE */}
        {card.cardType === "multiple-choice" && (
          <>
            <div>
              <Label>Correct Answers</Label>
              {correctAnswers.map((ans, i) => (
                <Input
                  key={i}
                  value={ans}
                  onChange={(e) => {
                    const next = [...correctAnswers];
                    next[i] = e.target.value;
                    setCorrectAnswers(next);
                  }}
                  className="mb-2"
                />
              ))}
              <Button
                size="sm"
                onClick={() => setCorrectAnswers([...correctAnswers, ""])}
              >
                Add Correct Answer
              </Button>
            </div>

            <div>
              <Label>Incorrect Answers</Label>
              {incorrectAnswers.map((ans, i) => (
                <Input
                  key={i}
                  value={ans}
                  onChange={(e) => {
                    const next = [...incorrectAnswers];
                    next[i] = e.target.value;
                    setIncorrectAnswers(next);
                  }}
                  className="mb-2"
                />
              ))}
              <Button
                size="sm"
                onClick={() => setIncorrectAnswers([...incorrectAnswers, ""])}
              >
                Add Incorrect Answer
              </Button>
            </div>
          </>
        )}

        {/* TYPE ANSWER */}
        {card.cardType === "type-answer" && (
          <>
            <div>
              <Label>Back (Primary Answer)</Label>
              <Textarea
                value={back}
                onChange={(e) => setBack(e.target.value)}
              />
            </div>

            <div>
              <Label>Accepted Answers</Label>
              {acceptedAnswers.map((ans, i) => (
                <Input
                  key={i}
                  value={ans}
                  onChange={(e) => {
                    const next = [...acceptedAnswers];
                    next[i] = e.target.value;
                    setAcceptedAnswers(next);
                  }}
                  className="mb-2"
                />
              ))}
              <Button
                size="sm"
                onClick={() => setAcceptedAnswers([...acceptedAnswers, ""])}
              >
                Add Accepted Answer
              </Button>
            </div>
          </>
        )}

        <div className="flex gap-2">
          <Button size="sm" onClick={saveEdit}>
            <Check className="w-3 h-3 mr-1" />
            Save
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsEditing(false)}
          >
            <X className="w-3 h-3 mr-1" />
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  /* ---------- READ MODE ---------- */

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
      {/* Header with card number, badge, and action buttons */}
      <div className="flex items-center justify-between p-4 pb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Card {index + 1}
          </span>
          <span
            className={`text-xs px-2 py-0.5 rounded ${
              cardTypeBadgeStyles[card.cardType]
            }`}
          >
            {cardTypeLabels[card.cardType]}
          </span>
          {/* 📸 Image indicators */}
          {card.frontImageUrl && (
            <span className="text-xs px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 flex items-center gap-1">
              <ImageIcon className="w-3 h-3" />
              Front
            </span>
          )}
          {card.backImageUrl && (
            <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 flex items-center gap-1">
              <ImageIcon className="w-3 h-3" />
              Back
            </span>
          )}
        </div>
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" onClick={startEdit}>
            <Edit2 className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={onRemove}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* 📸 FRONT IMAGE DISPLAY (if present) */}
      {card.frontImageUrl && (
        <div className="px-4 pb-3">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
            Front Image:
          </div>
          <img
            src={card.frontImageUrl}
            alt={card.front}
            className="w-full max-h-64 object-cover rounded-lg"
            onError={(e) => {
              // Hide image if it fails to load
              e.currentTarget.style.display = "none";
            }}
          />
          {card.frontImageAttribution && (
            <UnsplashAttribution
              attribution={card.frontImageAttribution}
              className="mt-2 px-2 py-1 bg-gray-50 dark:bg-gray-900/50 rounded"
            />
          )}
        </div>
      )}

      {/* Front */}
      <div className="px-4 pb-3">
        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
          Front:
        </div>
        <div className="text-sm text-gray-900 dark:text-gray-100">
          {card.front}
        </div>
        {/* 🎵 SHOW AUDIO IF PRESENT */}
        {card.frontAudio && (
          <audio controls src={card.frontAudio} className="mt-2 w-full h-8" />
        )}
      </div>

      {/* Divider */}
      <div className="border-t border-gray-200 dark:border-gray-700"></div>

      {/* Classic-Flip Back (with optional back image) */}
      {card.cardType === "classic-flip" && (
        <>
          {/* 📸 BACK IMAGE DISPLAY (classic-flip only) */}
          {card.backImageUrl && (
            <div className="px-4 pt-3">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                Back Image:
              </div>
              <img
                src={card.backImageUrl}
                alt={card.back}
                className="w-full max-h-64 object-cover rounded-lg"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
              {card.backImageAttribution && (
                <UnsplashAttribution
                  attribution={card.backImageAttribution}
                  className="mt-2 px-2 py-1 bg-gray-50 dark:bg-gray-900/50 rounded"
                />
              )}
            </div>
          )}

          <div className="px-4 py-3">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              Back:
            </div>
            <div className="text-sm text-gray-900 dark:text-gray-100">
              {card.back}
            </div>
            {card.backAudio && (
              <audio
                controls
                src={card.backAudio}
                className="mt-2 w-full h-8"
              />
            )}
          </div>
        </>
      )}

      {/* Type Answer Back (no back image) */}
      {card.cardType === "type-answer" && (
        <div className="px-4 py-3">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
            Answer:
          </div>
          <div className="text-sm text-gray-900 dark:text-gray-100">
            {card.back}
          </div>
          {card.backAudio && (
            <audio controls src={card.backAudio} className="mt-2 w-full h-8" />
          )}
        </div>
      )}

      {/* Multiple Choice - Show all correct answers (no back image) */}
      {card.cardType === "multiple-choice" &&
        card.correctAnswers &&
        card.correctAnswers.length >= 1 && (
          <>
            <div className="border-t border-gray-200 dark:border-gray-700"></div>
            <div className="px-4 py-3">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                Correct Answers:
              </div>
              <ul className="list-disc list-inside text-sm text-gray-900 dark:text-gray-100 space-y-0.5">
                {card.correctAnswers.map((ans, i) => (
                  <li key={i}>{ans}</li>
                ))}
              </ul>
            </div>
          </>
        )}

      {/* Multiple Choice - Show incorrect options */}
      {card.cardType === "multiple-choice" &&
        card.incorrectAnswers &&
        card.incorrectAnswers.length > 0 && (
          <>
            <div className="border-t border-gray-200 dark:border-gray-700"></div>
            <div className="px-4 py-3">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                Incorrect Answers:
              </div>
              <ul className="list-disc list-inside text-sm text-gray-900 dark:text-gray-100 space-y-0.5">
                {card.incorrectAnswers.map((opt, i) => (
                  <li key={i}>{opt}</li>
                ))}
              </ul>
            </div>
          </>
        )}

      {/* Type Answer - Show accepted answers */}
      {card.cardType === "type-answer" &&
        card.acceptedAnswers &&
        card.acceptedAnswers.length > 0 && (
          <>
            <div className="border-t border-gray-200 dark:border-gray-700"></div>
            <div className="px-4 py-3">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                Accepted Answers:
              </div>
              <ul className="list-disc list-inside text-sm text-gray-900 dark:text-gray-100 space-y-0.5">
                {card.acceptedAnswers.map((ans, i) => (
                  <li key={i}>{ans}</li>
                ))}
              </ul>
            </div>
          </>
        )}
    </div>
  );
}
