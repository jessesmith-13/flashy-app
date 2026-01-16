import React from "react";
import { Button } from "@/shared/ui/button";
import { Label } from "@/shared/ui/label";
import { Upload, FileSpreadsheet } from "lucide-react";

interface CSVUploadTabProps {
  csvFile: File | null;
  loading: boolean;
  onFileChange: (file: File | null) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function CSVUploadTab({
  csvFile,
  loading,
  onFileChange,
  onSubmit,
}: CSVUploadTabProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div>
        <Label htmlFor="csv-upload">Upload CSV File</Label>
        <div className="mt-2">
          <label
            htmlFor="csv-upload"
            className="flex flex-col items-center justify-center w-full h-48 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
          >
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <Upload className="w-10 h-10 mb-3 text-gray-400" />
              <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                <span className="font-semibold">Click to upload</span> or drag
                and drop
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                CSV file (supports all card types)
              </p>
              {csvFile && (
                <p className="mt-2 text-sm text-emerald-600 dark:text-emerald-400">
                  Selected: {csvFile.name}
                </p>
              )}
            </div>
            <input
              id="csv-upload"
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => onFileChange(e.target.files?.[0] || null)}
            />
          </label>
        </div>
      </div>

      <div className="bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4">
        <h3 className="text-sm text-emerald-900 dark:text-emerald-300 mb-2">
          📊 CSV Format Guide:
        </h3>
        <div className="text-xs text-emerald-800 dark:text-emerald-400 space-y-3">
          <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded p-2 mb-3">
            <p className="font-semibold mb-1">🎨 Mixed Card Types (NEW!):</p>
            <ul className="space-y-1 ml-2">
              <li>
                • Add a{" "}
                <code className="bg-yellow-100 dark:bg-yellow-800 px-1 rounded">
                  Card Type
                </code>{" "}
                column to mix all card types in one CSV!
              </li>
              <li>
                • Values:{" "}
                <code className="bg-yellow-100 dark:bg-yellow-800 px-1 rounded">
                  classic-flip
                </code>
                ,{" "}
                <code className="bg-yellow-100 dark:bg-yellow-800 px-1 rounded">
                  multiple-choice
                </code>
                , or{" "}
                <code className="bg-yellow-100 dark:bg-yellow-800 px-1 rounded">
                  type-answer
                </code>
              </li>
              <li>
                • Include ALL columns:{" "}
                <code className="bg-yellow-100 dark:bg-yellow-800 px-1 rounded">
                  Card Type,Front,Back,Correct Answers,Incorrect
                  Answers,Accepted Answers
                </code>
              </li>
              <li>
                • Leave unused columns empty for each row based on card type
              </li>
            </ul>
          </div>

          <div>
            <p className="font-semibold mb-1">🃏 Classic Flip Cards:</p>
            <ul className="space-y-1 ml-2">
              <li>
                • Headers:{" "}
                <code className="bg-emerald-100 dark:bg-emerald-800 px-1 rounded">
                  Front,Back
                </code>
              </li>
              <li>
                • Example:{" "}
                <code className="bg-emerald-100 dark:bg-emerald-800 px-1 rounded">
                  What is 2+2?,4
                </code>
              </li>
            </ul>
          </div>

          <div>
            <p className="font-semibold mb-1">✅ Multiple Choice Cards:</p>
            <ul className="space-y-1 ml-2">
              <li>
                • Headers:{" "}
                <code className="bg-emerald-100 dark:bg-emerald-800 px-1 rounded">
                  Front,Correct Answers,Incorrect Answers
                </code>
              </li>
              <li>
                • Correct Answers: One or more correct answers (separated by{" "}
                <code className="bg-emerald-100 dark:bg-emerald-800 px-1 rounded">
                  ;
                </code>{" "}
                or{" "}
                <code className="bg-emerald-100 dark:bg-emerald-800 px-1 rounded">
                  |
                </code>
                )
              </li>
              <li>
                • Incorrect Answers: At least 2 wrong answers (separated by{" "}
                <code className="bg-emerald-100 dark:bg-emerald-800 px-1 rounded">
                  ;
                </code>{" "}
                or{" "}
                <code className="bg-emerald-100 dark:bg-emerald-800 px-1 rounded">
                  |
                </code>
                )
              </li>
              <li>
                • If you provide less than 3 incorrect answers, generic options
                will be auto-filled
              </li>
              <li>
                • Single correct:{" "}
                <code className="bg-emerald-100 dark:bg-emerald-800 px-1 rounded">
                  What is 2+2?,4,3;5;6
                </code>
              </li>
              <li>
                • Multiple correct:{" "}
                <code className="bg-emerald-100 dark:bg-emerald-800 px-1 rounded">
                  Which are prime?,2;3;5,1;4;6
                </code>
              </li>
            </ul>
          </div>

          <div>
            <p className="font-semibold mb-1">⌨️ Type Answer Cards:</p>
            <ul className="space-y-1 ml-2">
              <li>
                • Headers:{" "}
                <code className="bg-emerald-100 dark:bg-emerald-800 px-1 rounded">
                  Front,Back,Accepted Answers
                </code>{" "}
                (Accepted Answers optional)
              </li>
              <li>
                • Accepted Answers: Alternative spellings/formats (separated by{" "}
                <code className="bg-emerald-100 dark:bg-emerald-800 px-1 rounded">
                  ;
                </code>{" "}
                or{" "}
                <code className="bg-emerald-100 dark:bg-emerald-800 px-1 rounded">
                  |
                </code>
                )
              </li>
              <li>
                • With alternatives:{" "}
                <code className="bg-emerald-100 dark:bg-emerald-800 px-1 rounded">
                  Capital of France?,Paris,paris;PARIS
                </code>
              </li>
              <li>
                • Without alternatives:{" "}
                <code className="bg-emerald-100 dark:bg-emerald-800 px-1 rounded">
                  Capital of France?,Paris,
                </code>
              </li>
            </ul>
          </div>

          <div className="pt-2 border-t border-emerald-200 dark:border-emerald-700">
            <p className="font-semibold mb-1">💡 Tips:</p>
            <ul className="space-y-1 ml-2">
              <li>
                • Use quotes for values containing commas:{" "}
                <code className="bg-emerald-100 dark:bg-emerald-800 px-1 rounded">
                  "Question, with comma",Answer
                </code>
              </li>
              <li>
                • Card type is auto-detected (or use Card Type column for mixed)
              </li>
              <li>• Maximum file size: 1MB</li>
            </ul>
          </div>
        </div>
      </div>

      <Button
        type="submit"
        disabled={!csvFile || loading}
        className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white h-12"
      >
        {loading ? (
          <>Importing...</>
        ) : (
          <>
            <FileSpreadsheet className="w-5 h-5 mr-2" />
            Import from CSV
          </>
        )}
      </Button>
    </form>
  );
}
