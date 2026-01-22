import React, { useState } from "react";
import { useStore } from "@/shared/state/useStore";
import { useNavigation } from "@/shared/hooks/useNavigation";
import {
  generateCardsWithAI,
  generateCardsFromCSV,
  generateCardsFromPDF,
} from "@/shared/api/ai";
import { uploadCardAudio } from "@/shared/api/storage";
import { getSession } from "@/shared/api/auth";
import { createCardsBatch } from "@/shared/api/decks";
import { AppLayout } from "@/components/Layout/AppLayout";
import { Button } from "@/shared/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import {
  ArrowLeft,
  Sparkles,
  MessageSquare,
  FileSpreadsheet,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import * as audioSynthesis from "@/shared/lib/audioSynthesis";
import { GeneratedCard } from "@/components/AI/GeneratedCardItem";
import { ReviewCardsScreen } from "@/components/AI/ReviewCardsScreen";
import { LoadingOverlay } from "@/components/AI/LoadingOverlay";
import { PremiumWarningBanner } from "@/components/AI/PremiumWarningBanner";
import { AIChatTab } from "@/components/AI/AIChatTab";
import { CSVUploadTab } from "@/components/AI/CSVUploadTab";
import { PDFUploadTab } from "@/components/AI/PDFUploadTab";
import { mapApiCardToStoreCard } from "@/features/decks/mappers/cardMapper";
import { ApiCard } from "@/types/decks";
import { AI_API_BASE } from "@/supabase/runtime";

const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

type AIGeneratedCardWithNotes = GeneratedCard & {
  note?: unknown;
  notes?: unknown;
};

export function AIGenerateScreen() {
  const { selectedDeckId, decks, addCard, accessToken, updateDeck, user } =
    useStore();
  const { navigateTo } = useNavigation();
  const [activeTab, setActiveTab] = useState("chat");

  // AI Chat state
  const [topic, setTopic] = useState("");
  const [numCards, setNumCards] = useState("10");
  const [cardTypes, setCardTypes] = useState({
    classicFlip: true,
    multipleChoice: false,
    typeAnswer: false,
  });
  const [includeImages, setIncludeImages] = useState(false);
  const [difficulty, setDifficulty] = useState("mixed");
  const [frontLanguage, setFrontLanguage] = useState("");
  const [backLanguage, setBackLanguage] = useState("");
  const [generateAudio, setGenerateAudio] = useState(false);
  const [loading, setLoading] = useState(false);

  // CSV Upload state
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvLoading, setCsvLoading] = useState(false);

  // PDF Upload state
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfNumCards, setPdfNumCards] = useState("15");
  const [pdfCustomInstructions, setPdfCustomInstructions] = useState("");
  const [pdfCardTypes, setPdfCardTypes] = useState({
    classicFlip: true,
    multipleChoice: false,
    typeAnswer: false,
  });
  const [pdfLoading, setPdfLoading] = useState(false);

  // Generated cards state
  const [generatedCards, setGeneratedCards] = useState<GeneratedCard[]>([]);
  const [saving, setSaving] = useState(false);
  const [generatingStatus, setGeneratingStatus] = useState("");

  // Get the current deck if navigated from deck detail
  const currentDeck = decks.find((d) => d.id === selectedDeckId);
  const backButtonText = currentDeck ? "Back to Deck" : "Back to Decks";
  const backView = currentDeck ? "deck-detail" : "decks";

  // Check if user is on free tier
  const isFreeUser =
    !user?.subscriptionTier || user.subscriptionTier === "free";

  const handleAIGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setGeneratingStatus("Generating flashcards with AI...");

    try {
      // Validate card count limit
      const cardCount = parseInt(numCards);
      if (cardCount > 100) {
        toast.error("Maximum 100 cards can be generated at once");
        setLoading(false);
        setGeneratingStatus("");
        return;
      }

      console.log("AI Generation Request:", {
        topic,
        numCards,
        cardTypes,
        difficulty,
        frontLanguage,
        backLanguage,
      });
      const response = await generateCardsWithAI(
        topic,
        cardCount,
        cardTypes,
        includeImages,
        difficulty,
        frontLanguage,
        backLanguage,
      );

      if (response.cards && response.cards.length > 0) {
        // DEBUG: Check if any cards have note fields
        const cardsWithNotes = (
          response.cards as AIGeneratedCardWithNotes[]
        ).filter(
          (c: AIGeneratedCardWithNotes) =>
            c.note !== undefined || c.notes !== undefined,
        );
        if (cardsWithNotes.length > 0) {
          console.warn(
            "⚠️ WARNING: OpenAI generated cards with note fields:",
            cardsWithNotes,
          );
        }

        console.log("Generated Cards!!", response.cards);

        // ✅ DEBUG: Check if attribution is present
        console.log("🖼️ AI Response - First card with attribution:", {
          frontImageUrl: response.cards[0]?.frontImageUrl,
          frontImageAttribution: response.cards[0]?.frontImageAttribution,
          backImageUrl: response.cards[0]?.backImageUrl,
          backImageAttribution: response.cards[0]?.backImageAttribution,
        });

        // Process cards to detect and generate audio for musical notes/chords (only if enabled)
        if (generateAudio) {
          setGeneratingStatus("Processing audio for musical content...");
        }
        const processedCards = generateAudio
          ? await processCardsWithAudio(response.cards)
          : response.cards;
        console.log(
          "=== FINAL PROCESSED CARDS ===",
          processedCards.map((c: AIGeneratedCardWithNotes) => ({
            front: c.front,
            frontAudio: c.frontAudio,
            backAudio: c.backAudio,
          })),
        );
        setGeneratedCards(processedCards);
        toast.success(`Generated ${processedCards.length} flashcards!`);
      } else {
        toast.error("No cards were generated. Please try again.");
      }
    } catch (error) {
      console.error("AI generation error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      if (
        errorMessage.includes("Premium") ||
        errorMessage.includes("subscription")
      ) {
        toast.error("AI generation requires a Premium or Pro subscription");
      } else if (errorMessage.includes("API key")) {
        toast.error("AI service not configured. Please contact support.");
      } else {
        toast.error(errorMessage || "Failed to generate cards");
      }
    } finally {
      setLoading(false);
      setGeneratingStatus("");
    }
  };

  // Process cards to detect musical content and generate audio
  const processCardsWithAudio = async (
    cards: GeneratedCard[],
  ): Promise<GeneratedCard[]> => {
    const processedCards = await Promise.all(
      cards.map(async (card) => {
        try {
          // Check if the card front or back contains a musical note/chord request
          const frontRequest = audioSynthesis.parseMusicRequest(card.front);
          const backRequest = audioSynthesis.parseMusicRequest(card.back);

          let frontAudio: string | undefined;
          let backAudio: string | undefined;

          // Generate audio for front if detected
          if (frontRequest) {
            console.log(`Detected music in front: ${card.front}`, frontRequest);
            const audioBlob = await audioSynthesis.generateAudioFile(
              card.front,
              2,
            );
            if (audioBlob && accessToken) {
              // Upload to Supabase storage
              const audioUrl = await uploadAudioToStorage(
                audioBlob,
                `generated-${Date.now()}-front.wav`,
              );
              if (audioUrl) {
                frontAudio = audioUrl;
                console.log(
                  `Generated and uploaded audio for front: ${audioUrl}`,
                );
              }
            }
          }

          // Generate audio for back if detected
          if (backRequest) {
            console.log(`Detected music in back: ${card.back}`, backRequest);
            const audioBlob = await audioSynthesis.generateAudioFile(
              card.back,
              2,
            );
            if (audioBlob && accessToken) {
              // Upload to Supabase storage
              const audioUrl = await uploadAudioToStorage(
                audioBlob,
                `generated-${Date.now()}-back.wav`,
              );
              if (audioUrl) {
                backAudio = audioUrl;
                console.log(
                  `Generated and uploaded audio for back: ${audioUrl}`,
                );
              }
            }
          }

          return {
            ...card,
            frontAudio,
            backAudio,
          };
        } catch (error) {
          console.error("Error processing card audio:", error);
          return card;
        }
      }),
    );

    return processedCards;
  };

  // Upload audio blob to Supabase storage
  const uploadAudioToStorage = async (
    audioBlob: Blob,
    filename: string,
  ): Promise<string | null> => {
    try {
      if (!accessToken) return null;

      // Convert blob to file
      const audioFile = new File([audioBlob], filename, { type: "audio/wav" });

      // Use the existing API function to upload audio
      const audioUrl = await uploadCardAudio(audioFile);

      if (audioUrl) {
        return audioUrl;
      }
      return null;
    } catch (error) {
      console.error("Error uploading generated audio:", error);
      return null;
    }
  };

  const handleCSVUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvFile) return;

    setCsvLoading(true);

    try {
      const session = await getSession();
      if (!session?.access_token) {
        throw new Error("Not authenticated");
      }

      const response = await generateCardsFromCSV(
        session.access_token,
        csvFile,
      );

      if (response.cards && response.cards.length > 0) {
        setGeneratedCards(response.cards);
        toast.success(`Imported ${response.cards.length} flashcards!`);
      } else {
        toast.error("No cards were found in the CSV file.");
      }
    } catch (error) {
      console.error("CSV import error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to import CSV";
      toast.error(errorMessage);
    } finally {
      setCsvLoading(false);
    }
  };

  const handlePDFUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pdfFile) return;

    setPdfLoading(true);
    setGeneratingStatus("Processing PDF and generating flashcards...");

    try {
      // Validate card count limit
      const cardCount = parseInt(pdfNumCards);
      if (cardCount > 100) {
        toast.error("Maximum 100 cards can be generated at once");
        setPdfLoading(false);
        setGeneratingStatus("");
        return;
      }

      const response = await generateCardsFromPDF(
        pdfFile,
        cardCount,
        pdfCustomInstructions,
        pdfCardTypes,
      );

      if (response.cards && response.cards.length > 0) {
        setGeneratedCards(response.cards);
        toast.success(`Generated ${response.cards.length} flashcards!`);
      } else if (response.error) {
        toast.error(response.error);
      } else {
        toast.error(
          "Failed to process PDF. Please try using AI Chat with extracted text.",
        );
      }
    } catch (error) {
      console.error("PDF import error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      if (
        errorMessage.includes("Premium") ||
        errorMessage.includes("subscription")
      ) {
        toast.error("PDF import requires a Premium or Pro subscription");
      } else {
        toast.error(
          errorMessage || "Failed to process PDF. Try using AI Chat instead.",
        );
      }
    } finally {
      setPdfLoading(false);
      setGeneratingStatus("");
    }
  };

  const handleUpdateCard = (index: number, updatedCard: GeneratedCard) => {
    setGeneratedCards((prev) =>
      prev.map((card, i) => (i === index ? updatedCard : card)),
    );
    toast.success("Card updated");
  };

  const handleRemoveCard = (index: number) => {
    setGeneratedCards((prev) => prev.filter((_, i) => i !== index));
    toast.success("Card removed");
  };

  const handleSaveAllCards = async () => {
    if (!selectedDeckId) {
      toast.error("Please select a deck first");
      return;
    }

    if (!accessToken) {
      toast.error("You must be logged in to save cards");
      return;
    }

    if (generatedCards.length === 0) {
      toast.error("No cards to save");
      return;
    }

    setSaving(true);
    try {
      // ✅ Collect download URLs BEFORE saving cards
      const downloadUrls = generatedCards
        .flatMap((card) => [
          card.frontImageAttribution?.downloadUrl,
          card.backImageAttribution?.downloadUrl,
        ])
        .filter((url): url is string => Boolean(url)); // Type-safe filter

      // ✅ Trigger Unsplash download tracking
      if (downloadUrls.length > 0) {
        console.log(
          `📸 Triggering Unsplash download tracking for ${downloadUrls.length} images`,
        );
        try {
          const response = await fetch(
            `${AI_API_BASE}/ai/unsplash/download-batch`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${anonKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ downloadUrls }),
            },
          );

          if (!response.ok) {
            console.error(
              "❌ Failed to track Unsplash downloads:",
              await response.text(),
            );
          } else {
            console.log("✅ Successfully tracked Unsplash downloads");
          }
        } catch (error) {
          console.error("❌ Error tracking Unsplash downloads:", error);
          // Don't fail card creation if tracking fails
        }
      }

      // Prepare all cards for batch creation
      const cardsToSave = generatedCards.map((card) => {
        const cardData: {
          front: string;
          back: string;
          cardType: string;
          correctAnswers?: string[];
          incorrectAnswers?: string[];
          acceptedAnswers?: string[];
          frontAudio?: string;
          backAudio?: string;
          frontImageUrl?: string;
          backImageUrl?: string;
          frontImageAttribution?: {
            photographerName: string;
            photographerUsername: string;
            photographerUrl: string;
            unsplashUrl: string;
            downloadUrl: string;
          };
          backImageAttribution?: {
            photographerName: string;
            photographerUsername: string;
            photographerUrl: string;
            unsplashUrl: string;
            downloadUrl: string;
          };
        } = {
          front: card.front || "",
          back: card.back || "",
          cardType: card.cardType || "classic-flip",
        };

        // Add correct/incorrect answers for multiple-choice cards
        if (card.cardType === "multiple-choice") {
          cardData.correctAnswers = card.correctAnswers;
          cardData.incorrectAnswers = card.incorrectAnswers;
        }

        // Add accepted answers for type-answer cards
        if (card.cardType === "type-answer" && card.acceptedAnswers) {
          cardData.acceptedAnswers = card.acceptedAnswers;
        }

        // Add audio URLs if present
        if (card.frontAudio) {
          cardData.frontAudio = card.frontAudio;
        }
        if (card.backAudio) {
          cardData.backAudio = card.backAudio;
        }

        // Add image URLs if present (from AI-generated cards)
        if (card.frontImageUrl) {
          cardData.frontImageUrl = card.frontImageUrl;
        }
        if (card.backImageUrl) {
          cardData.backImageUrl = card.backImageUrl;
        }

        // ✅ Add image attribution if present
        if (card.frontImageAttribution) {
          cardData.frontImageAttribution = card.frontImageAttribution;
          console.log(
            "📸 Saving front image attribution:",
            card.frontImageAttribution,
          );
        }
        if (card.backImageAttribution) {
          cardData.backImageAttribution = card.backImageAttribution;
          console.log(
            "📸 Saving back image attribution:",
            card.backImageAttribution,
          );
        }

        return cardData;
      });

      console.log(
        "💾 Saving cards with attribution:",
        cardsToSave.filter(
          (c) => c.frontImageAttribution || c.backImageAttribution,
        ),
      );

      // Use batch API for much faster saving
      const newCards: ApiCard[] = await createCardsBatch(
        accessToken,
        selectedDeckId,
        cardsToSave,
      );

      // Add all cards to store
      newCards.forEach((card) => {
        addCard(mapApiCardToStoreCard(card));
      });

      // Update deck card count
      if (currentDeck) {
        updateDeck(currentDeck.id, {
          cardCount: (currentDeck.cardCount || 0) + newCards.length,
        });
      }

      toast.success(
        `Saved ${newCards.length} cards to ${currentDeck?.name || "deck"}`,
      );

      // Reset state and navigate back
      setGeneratedCards([]);
      setTopic("");
      setCsvFile(null);
      setPdfFile(null);

      navigateTo("deck-detail");
    } catch (error) {
      console.error("Error saving cards:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to save cards";
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleDiscardCards = () => {
    setGeneratedCards([]);
    toast.success("Cards discarded");
  };

  // Show review screen if we have generated cards
  if (generatedCards.length > 0) {
    return (
      <ReviewCardsScreen
        cards={generatedCards}
        deckName={currentDeck?.name}
        saving={saving}
        onBack={handleDiscardCards}
        onSaveAll={handleSaveAllCards}
        onDiscard={handleDiscardCards}
        onUpdateCard={handleUpdateCard}
        onRemoveCard={handleRemoveCard}
      />
    );
  }

  return (
    <AppLayout>
      <LoadingOverlay status={generatingStatus} />

      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4 lg:p-8">
        <div className="max-w-3xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => navigateTo(backView)}
            className="mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {backButtonText}
          </Button>

          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl text-gray-900 dark:text-gray-100">
                  AI Deck Generator
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Create flashcards with AI or upload files
                </p>
              </div>
            </div>

            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-3 mb-6">
                <TabsTrigger value="chat" className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  <span className="hidden sm:inline">AI Chat</span>
                  <span className="sm:hidden">Chat</span>
                </TabsTrigger>
                <TabsTrigger value="csv" className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4" />
                  <span className="hidden sm:inline">CSV</span>
                  <span className="sm:hidden">CSV</span>
                </TabsTrigger>
                <TabsTrigger value="pdf" className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  <span className="hidden sm:inline">PDF</span>
                  <span className="sm:hidden">PDF</span>
                </TabsTrigger>
              </TabsList>

              {/* Free User Warning Banner */}
              {isFreeUser && (
                <PremiumWarningBanner
                  onUpgradeClick={() => navigateTo("upgrade")}
                />
              )}

              {/* AI Chat Tab */}
              <TabsContent value="chat">
                <AIChatTab
                  topic={topic}
                  numCards={numCards}
                  cardTypes={cardTypes}
                  includeImages={includeImages}
                  difficulty={difficulty}
                  frontLanguage={frontLanguage}
                  backLanguage={backLanguage}
                  generateAudio={generateAudio}
                  loading={loading}
                  onTopicChange={setTopic}
                  onNumCardsChange={setNumCards}
                  onCardTypesChange={setCardTypes}
                  onIncludeImagesChange={setIncludeImages}
                  onDifficultyChange={setDifficulty}
                  onFrontLanguageChange={setFrontLanguage}
                  onBackLanguageChange={setBackLanguage}
                  onGenerateAudioChange={setGenerateAudio}
                  onSubmit={handleAIGenerate}
                />
              </TabsContent>

              {/* CSV Upload Tab */}
              <TabsContent value="csv">
                <CSVUploadTab
                  csvFile={csvFile}
                  loading={csvLoading}
                  onFileChange={setCsvFile}
                  onSubmit={handleCSVUpload}
                />
              </TabsContent>

              {/* PDF Upload Tab */}
              <TabsContent value="pdf">
                <PDFUploadTab
                  pdfFile={pdfFile}
                  numCards={pdfNumCards}
                  customInstructions={pdfCustomInstructions}
                  cardTypes={pdfCardTypes}
                  includeImages={includeImages}
                  loading={pdfLoading}
                  onFileChange={setPdfFile}
                  onNumCardsChange={setPdfNumCards}
                  onCustomInstructionsChange={setPdfCustomInstructions}
                  onCardTypesChange={setPdfCardTypes}
                  onIncludeImagesChange={setIncludeImages}
                  onSubmit={handlePDFUpload}
                />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
