import React from "react";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { Textarea } from "@/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/ui/select";
import { Sparkles, Music, Volume2 } from "lucide-react";
import { DECK_LANGUAGES } from "../../../utils/languages";

export interface CardTypes {
  classicFlip: boolean;
  multipleChoice: boolean;
  typeAnswer: boolean;
}

interface AIChatTabProps {
  topic: string;
  numCards: string;
  cardTypes: CardTypes;
  includeImages: boolean;
  difficulty: string;
  frontLanguage: string;
  backLanguage: string;
  generateAudio: boolean;
  loading: boolean;
  onTopicChange: (value: string) => void;
  onNumCardsChange: (value: string) => void;
  onCardTypesChange: (types: CardTypes) => void;
  onIncludeImagesChange: (value: boolean) => void;
  onDifficultyChange: (value: string) => void;
  onFrontLanguageChange: (value: string) => void;
  onBackLanguageChange: (value: string) => void;
  onGenerateAudioChange: (value: boolean) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function AIChatTab({
  topic,
  numCards,
  cardTypes,
  includeImages,
  difficulty,
  frontLanguage,
  backLanguage,
  generateAudio,
  loading,
  onTopicChange,
  onNumCardsChange,
  onCardTypesChange,
  onIncludeImagesChange,
  onDifficultyChange,
  onFrontLanguageChange,
  onBackLanguageChange,
  onGenerateAudioChange,
  onSubmit,
}: AIChatTabProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div>
        <Label htmlFor="topic">Topic or Subject</Label>
        <Textarea
          id="topic"
          placeholder="E.g., 'Spanish verbs', 'World War 2 dates', 'Python functions'..."
          value={topic}
          onChange={(e) => onTopicChange(e.target.value)}
          required
          className="mt-1 min-h-[100px] bg-gray-50 dark:bg-gray-700 dark:border-gray-600"
        />
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Describe what you want to learn. Be as specific as possible for better
          results.
        </p>
      </div>

      <div>
        <Label htmlFor="numCards">Number of Cards</Label>
        <Input
          id="numCards"
          type="number"
          min="1"
          max="100"
          value={numCards}
          onChange={(e) => onNumCardsChange(e.target.value)}
          required
          className="mt-1 bg-gray-50 dark:bg-gray-700 dark:border-gray-600"
        />
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Generate between 1-100 cards per request
        </p>
      </div>

      <div>
        <Label
          htmlFor="difficulty"
          className="text-gray-700 dark:text-gray-300"
        >
          Difficulty Level
        </Label>
        <Select value={difficulty} onValueChange={onDifficultyChange}>
          <SelectTrigger className="mt-1 bg-gray-50 dark:bg-gray-700 dark:border-gray-600">
            <SelectValue placeholder="Select difficulty..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="beginner">
              🟢 Beginner - Simple concepts and definitions
            </SelectItem>
            <SelectItem value="intermediate">
              🟡 Intermediate - Moderate complexity
            </SelectItem>
            <SelectItem value="advanced">
              🟠 Advanced - Complex concepts and applications
            </SelectItem>
            <SelectItem value="expert">
              🔴 Expert - Mastery-level knowledge
            </SelectItem>
            <SelectItem value="mixed">
              🌈 Mixed - Progressive difficulty
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h3 className="text-sm text-blue-900 dark:text-blue-300 mb-2">
          💡 Pro Tips:
        </h3>
        <ul className="text-xs text-blue-800 dark:text-blue-400 space-y-1">
          <li>• Be specific about the difficulty level</li>
          <li>• Include context (e.g., "for beginners", "advanced level")</li>
          <li>• Mention the format you prefer</li>
        </ul>
      </div>

      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-4">
        <div className="flex items-start gap-2">
          <Music className="w-5 h-5 text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm text-indigo-900 dark:text-indigo-300 mb-2 flex items-center gap-2">
              <Volume2 className="w-4 h-4" />
              Music & Sound Generation
            </h3>
            <p className="text-xs text-indigo-800 dark:text-indigo-400 mb-2">
              You can now request musical notes and chords! Just type your
              request naturally:
            </p>
            <ul className="text-xs text-indigo-700 dark:text-indigo-400 space-y-1">
              <li>• "Play an A note" or "Generate C# note"</li>
              <li>• "C major chord" or "D minor chord"</li>
              <li>• "G5 note" (specify octave) or "E major"</li>
              <li>
                • Supported chords: major, minor, diminished, augmented, sus2,
                sus4
              </li>
            </ul>
            <p className="text-xs text-indigo-600 dark:text-indigo-500 mt-2 italic">
              Sounds will play instantly and be saved to your cards!
            </p>
          </div>
        </div>
      </div>

      <div className="bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
        <p className="text-xs text-purple-800 dark:text-purple-400">
          ⚡ Requires Premium or Pro subscription
        </p>
      </div>

      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-3">
        <Label className="text-sm text-gray-700 dark:text-gray-300">
          Card Types
        </Label>
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="classicFlip"
            checked={cardTypes.classicFlip}
            onChange={(e) => {
              // Prevent unchecking if it's the only one selected
              if (
                !e.target.checked &&
                !cardTypes.multipleChoice &&
                !cardTypes.typeAnswer
              ) {
                return;
              }
              onCardTypesChange({
                ...cardTypes,
                classicFlip: e.target.checked,
              });
            }}
            className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500"
          />
          <label
            htmlFor="classicFlip"
            className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer"
          >
            Classic Flip
          </label>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="multipleChoice"
            checked={cardTypes.multipleChoice}
            onChange={(e) => {
              // Prevent unchecking if it's the only one selected
              if (
                !e.target.checked &&
                !cardTypes.classicFlip &&
                !cardTypes.typeAnswer
              ) {
                return;
              }
              onCardTypesChange({
                ...cardTypes,
                multipleChoice: e.target.checked,
              });
            }}
            className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500"
          />
          <label
            htmlFor="multipleChoice"
            className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer"
          >
            Multiple Choice
          </label>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="typeAnswer"
            checked={cardTypes.typeAnswer}
            onChange={(e) => {
              // Prevent unchecking if it's the only one selected
              if (
                !e.target.checked &&
                !cardTypes.classicFlip &&
                !cardTypes.multipleChoice
              ) {
                return;
              }
              onCardTypesChange({ ...cardTypes, typeAnswer: e.target.checked });
            }}
            className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500"
          />
          <label
            htmlFor="typeAnswer"
            className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer"
          >
            Type Answer
          </label>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
          Select one or more card types (at least one required). Multiple types
          will be mixed evenly.
        </p>

        {/* ✅ ENABLED IMAGE CHECKBOX WITH UNSPLASH */}
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="includeImages"
            checked={includeImages}
            onChange={(e) => onIncludeImagesChange(e.target.checked)}
            className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500"
          />
          <label
            htmlFor="includeImages"
            className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer flex items-center gap-1"
          >
            📸 Add images from Unsplash (free stock photos)
          </label>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 pl-7">
          Automatically finds relevant free stock photos for each flashcard
        </p>

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="generateAudio"
            checked={generateAudio}
            onChange={(e) => onGenerateAudioChange(e.target.checked)}
            className="w-4 h-4 text-emerald-600 bg-gray-100 border-gray-300 rounded focus:ring-emerald-500"
          />
          <label
            htmlFor="generateAudio"
            className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer flex items-center gap-1"
          >
            <Music className="w-4 h-4" />
            Generate audio for musical notes/chords
          </label>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 pl-7">
          Automatically detects and generates audio playback for musical content
          (e.g., "C major chord", "A4 note")
        </p>
      </div>

      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-4">
        <Label className="text-sm text-gray-700 dark:text-gray-300">
          Language Settings (Optional)
        </Label>

        <div>
          <Label
            htmlFor="frontLanguage"
            className="text-xs text-gray-600 dark:text-gray-400"
          >
            Front Language (Question)
          </Label>
          <Select value={frontLanguage} onValueChange={onFrontLanguageChange}>
            <SelectTrigger className="mt-1 bg-white dark:bg-gray-800 dark:border-gray-600">
              <SelectValue placeholder="Select language for questions..." />
            </SelectTrigger>
            <SelectContent>
              {DECK_LANGUAGES.map((lang) => (
                <SelectItem key={lang.code} value={lang.name}>
                  {lang.flag} {lang.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Language for the front/question side (e.g., English, Spanish)
          </p>
        </div>

        <div>
          <Label
            htmlFor="backLanguage"
            className="text-xs text-gray-600 dark:text-gray-400"
          >
            Back Language (Answer)
          </Label>
          <Select value={backLanguage} onValueChange={onBackLanguageChange}>
            <SelectTrigger className="mt-1 bg-white dark:bg-gray-800 dark:border-gray-600">
              <SelectValue placeholder="Select language for answers..." />
            </SelectTrigger>
            <SelectContent>
              {DECK_LANGUAGES.map((lang) => (
                <SelectItem key={lang.code} value={lang.name}>
                  {lang.flag} {lang.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Language for the back/answer side (e.g., Spanish, English)
          </p>
        </div>
      </div>

      <Button
        type="submit"
        disabled={loading}
        className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white h-12"
      >
        {loading ? (
          <>Generating...</>
        ) : (
          <>
            <Sparkles className="w-5 h-5 mr-2" />
            Generate Flashcards
          </>
        )}
      </Button>
    </form>
  );
}
