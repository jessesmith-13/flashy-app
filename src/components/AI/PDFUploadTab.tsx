import React from "react";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { Textarea } from "@/ui/textarea";
import { Upload, FileText, Loader2 } from "lucide-react";

interface CardTypes {
  classicFlip: boolean;
  multipleChoice: boolean;
  typeAnswer: boolean;
}

interface PDFUploadTabClientProps {
  pdfFile: File | null;
  numCards: string;
  customInstructions: string;
  cardTypes: CardTypes;
  includeImages: boolean;
  loading: boolean;
  onFileChange: (file: File | null) => void;
  onNumCardsChange: (value: string) => void;
  onCustomInstructionsChange: (value: string) => void;
  onCardTypesChange: (types: CardTypes) => void;
  onIncludeImagesChange: (value: boolean) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function PDFUploadTab({
  pdfFile,
  numCards,
  customInstructions,
  cardTypes,
  includeImages,
  loading,
  onFileChange,
  onNumCardsChange,
  onCustomInstructionsChange,
  onCardTypesChange,
  onIncludeImagesChange,
  onSubmit,
}: PDFUploadTabClientProps) {
  const handleFileChange = async (file: File | null) => {
    if (!file) {
      onFileChange(null);
      return;
    }

    // Validate file type
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      alert("Please select a PDF file");
      return;
    }

    // Validate file size
    if (file.size > 10_485_760) {
      alert("File too large. Maximum size is 10MB.");
      return;
    }

    onFileChange(file);
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* File Upload */}
      <div>
        <Label htmlFor="pdf-upload-client">Upload PDF File</Label>
        <div className="mt-2">
          <label
            htmlFor="pdf-upload-client"
            className="flex flex-col items-center justify-center w-full h-48 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
          >
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              {loading ? (
                <>
                  <Loader2 className="w-10 h-10 mb-3 text-blue-500 animate-spin" />
                  <p className="text-sm text-blue-600 dark:text-blue-400">
                    Extracting text from PDF...
                  </p>
                </>
              ) : (
                <>
                  <Upload className="w-10 h-10 mb-3 text-gray-400" />
                  <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                    <span className="font-semibold">Click to upload</span> or
                    drag and drop
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    PDF document (Max 10MB)
                  </p>
                  {pdfFile && (
                    <div className="mt-3 flex flex-col items-center gap-1">
                      <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                      <p className="text-sm text-blue-600 dark:text-blue-400">
                        {pdfFile.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {(pdfFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
            <input
              id="pdf-upload-client"
              type="file"
              accept=".pdf"
              className="hidden"
              disabled={loading}
              onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
            />
          </label>
        </div>
      </div>

      {/* Number of Cards */}
      <div>
        <Label htmlFor="pdf-numCards-client">Number of Cards to Generate</Label>
        <Input
          id="pdf-numCards-client"
          type="number"
          min="1"
          max="100"
          value={numCards}
          onChange={(e) => onNumCardsChange(e.target.value)}
          className="mt-1 bg-gray-50 dark:bg-gray-700 dark:border-gray-600"
        />
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Generate between 1-100 cards per request
        </p>
      </div>

      {/* Custom Instructions */}
      <div>
        <Label htmlFor="pdf-customInstructions-client">
          Custom Instructions (Optional)
        </Label>
        <Textarea
          id="pdf-customInstructions-client"
          placeholder="E.g., 'Focus on key concepts', 'Include examples', 'Make questions challenging'..."
          value={customInstructions}
          onChange={(e) => onCustomInstructionsChange(e.target.value)}
          className="mt-1 min-h-[80px] bg-gray-50 dark:bg-gray-700 dark:border-gray-600"
        />
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Provide additional instructions for the AI to follow when generating
          cards from the PDF.
        </p>
      </div>

      {/* Card Types */}
      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-3">
        <Label className="text-sm text-gray-700 dark:text-gray-300">
          Card Types
        </Label>

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="pdf-classicFlip-client"
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
            htmlFor="pdf-classicFlip-client"
            className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer"
          >
            Classic Flip
          </label>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="pdf-multipleChoice-client"
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
            htmlFor="pdf-multipleChoice-client"
            className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer"
          >
            Multiple Choice
          </label>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="pdf-typeAnswer-client"
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
            htmlFor="pdf-typeAnswer-client"
            className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer"
          >
            Type Answer
          </label>
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
          Select one or more card types (at least one required). Multiple types
          will be mixed evenly.
        </p>

        <div className="flex items-center gap-3 opacity-50 cursor-not-allowed">
          <input
            type="checkbox"
            id="includeImages-client"
            checked={includeImages}
            onChange={(e) => onIncludeImagesChange(e.target.checked)}
            disabled
            className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500"
          />
          <label
            htmlFor="includeImages-client"
            className="text-sm text-gray-500 dark:text-gray-500"
          >
            Generate images (Coming soon)
          </label>
        </div>
      </div>

      {/* Info Boxes */}
      <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h3 className="text-sm text-blue-900 dark:text-blue-300 mb-2">
          📄 How it works:
        </h3>
        <ul className="text-xs text-blue-800 dark:text-blue-400 space-y-1">
          <li>• PDF text is extracted in your browser (fast & private)</li>
          <li>• AI analyzes the content and identifies key concepts</li>
          <li>• Flashcards are automatically generated</li>
          <li>• You can review and edit before saving</li>
        </ul>
      </div>

      <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg p-4">
        <p className="text-xs text-green-800 dark:text-green-400">
          ✨ <strong>Client-side processing:</strong> Your PDF is processed
          locally in your browser for speed and privacy. Only the extracted text
          is sent to AI.
        </p>
      </div>

      <div className="bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
        <p className="text-xs text-purple-800 dark:text-purple-400">
          ⚡ Requires Premium or Pro subscription
        </p>
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={!pdfFile || loading}
        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white h-12"
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Generating Cards...
          </>
        ) : (
          <>
            <FileText className="w-5 h-5 mr-2" />
            Generate from PDF
          </>
        )}
      </Button>
    </form>
  );
}
