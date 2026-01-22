// src/features/decks/components/deck-detail/bulk/useBulkAddCardsState.ts
import { useCallback, useMemo, useState } from "react";
import type { SubscriptionTier } from "@/types/users";
import type { CardType } from "@/types/decks";
import type { CardFormData } from "../BulkAddCardsDialog";

type Step = "select-count" | "fill-cards";
type Field = "front" | "back";

type ArrayKey = "correctAnswers" | "incorrectAnswers" | "acceptedAnswers";

function makeCard(id: string): CardFormData {
  return {
    id,
    cardType: "classic-flip",
    front: "",
    back: "",
    frontImageUrl: "",
    frontImageFile: null,
    backImageUrl: "",
    backImageFile: null,
    frontAudio: "",
    backAudio: "",
    correctAnswers: [""],
    incorrectAnswers: ["", "", ""],
    acceptedAnswers: [""],
  };
}

function countFilled(cards: CardFormData[]) {
  return cards.filter((card) => {
    const hasFront = card.front.trim() || card.frontImageFile;
    if (card.cardType === "multiple-choice") {
      const hasCorrect = card.correctAnswers.some((a) => a.trim());
      const hasIncorrect = card.incorrectAnswers.some((a) => a.trim());
      return Boolean(hasFront && hasCorrect && hasIncorrect);
    }
    const hasBack = card.back.trim() || card.backImageFile;
    return Boolean(hasFront && hasBack);
  }).length;
}

export function useBulkAddCardsState(args: {
  deckFrontLanguage?: string;
  deckBackLanguage?: string;
  userTier?: SubscriptionTier;

  onTranslate?: (text: string, language: string) => Promise<string>;
  onUploadImage?: (file: File) => Promise<string>;
  onUploadAudio?: (file: File) => Promise<string>;

  onSubmit: (cards: CardFormData[]) => Promise<void>;
  onOpenChange: (open: boolean) => void;
}) {
  const {
    deckFrontLanguage,
    deckBackLanguage,
    userTier,
    onTranslate,
    onUploadImage,
    onUploadAudio,
    onSubmit,
    onOpenChange,
  } = args;

  const [step, setStep] = useState<Step>("select-count");
  const [cardCount, setCardCount] = useState("10");
  const [cards, setCards] = useState<CardFormData[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const [translatingCardId, setTranslatingCardId] = useState<string | null>(
    null,
  );
  const [translatingField, setTranslatingField] = useState<Field | null>(null);

  const [uploadingImageCardId, setUploadingImageCardId] = useState<
    string | null
  >(null);
  const [uploadingImageField, setUploadingImageField] = useState<Field | null>(
    null,
  );

  const [uploadingAudioCardId, setUploadingAudioCardId] = useState<
    string | null
  >(null);
  const [uploadingAudioField, setUploadingAudioField] = useState<Field | null>(
    null,
  );

  const isPremium = userTier !== "free";

  const filledCount = useMemo(() => countFilled(cards), [cards]);

  const handleCountSubmit = useCallback(() => {
    const count = parseInt(cardCount, 10);
    if (Number.isNaN(count) || count < 1 || count > 50) return;

    const newCards = Array.from({ length: count }, (_, i) =>
      makeCard(`card-${i}`),
    );
    setCards(newCards);
    setStep("fill-cards");
  }, [cardCount]);

  const patchCard = useCallback(
    (id: string, updates: Partial<CardFormData>) => {
      setCards((prev) =>
        prev.map((c) => (c.id === id ? { ...c, ...updates } : c)),
      );
    },
    [],
  );

  const setCardType = useCallback(
    (id: string, cardType: CardType) => {
      patchCard(id, { cardType });
    },
    [patchCard],
  );

  const removeCard = useCallback((id: string) => {
    setCards((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const addCard = useCallback(() => {
    setCards((prev) => {
      if (prev.length >= 50) return prev;
      return [...prev, makeCard(`card-${Date.now()}`)];
    });
  }, []);

  const translate = useCallback(
    async (cardId: string, field: Field) => {
      if (!onTranslate) return;

      const card = cards.find((c) => c.id === cardId);
      if (!card) return;

      const text = field === "front" ? card.front : card.back;
      const language = field === "front" ? deckFrontLanguage : deckBackLanguage;

      if (!text.trim() || !language) return;

      setTranslatingCardId(cardId);
      setTranslatingField(field);
      try {
        const translated = await onTranslate(text, language);
        patchCard(cardId, { [field]: translated } as Partial<CardFormData>);
      } finally {
        setTranslatingCardId(null);
        setTranslatingField(null);
      }
    },
    [cards, deckBackLanguage, deckFrontLanguage, onTranslate, patchCard],
  );

  const uploadImage = useCallback(
    async (cardId: string, field: Field, file: File) => {
      if (!onUploadImage) return;

      setUploadingImageCardId(cardId);
      setUploadingImageField(field);
      try {
        const url = await onUploadImage(file);
        if (field === "front") {
          patchCard(cardId, { frontImageFile: file, frontImageUrl: url });
        } else {
          patchCard(cardId, { backImageFile: file, backImageUrl: url });
        }
      } finally {
        setUploadingImageCardId(null);
        setUploadingImageField(null);
      }
    },
    [onUploadImage, patchCard],
  );

  const removeImage = useCallback(
    (cardId: string, field: Field) => {
      if (field === "front") {
        patchCard(cardId, { frontImageFile: null, frontImageUrl: "" });
      } else {
        patchCard(cardId, { backImageFile: null, backImageUrl: "" });
      }
    },
    [patchCard],
  );

  const uploadAudio = useCallback(
    async (cardId: string, field: Field, file: File) => {
      if (!onUploadAudio) return;

      setUploadingAudioCardId(cardId);
      setUploadingAudioField(field);
      try {
        const url = await onUploadAudio(file);
        if (field === "front") patchCard(cardId, { frontAudio: url });
        else patchCard(cardId, { backAudio: url });
      } finally {
        setUploadingAudioCardId(null);
        setUploadingAudioField(null);
      }
    },
    [onUploadAudio, patchCard],
  );

  const setArrayItem = useCallback(
    (cardId: string, key: ArrayKey, idx: number, value: string) => {
      const card = cards.find((c) => c.id === cardId);
      if (!card) return;
      const nextArr = [...(card[key] ?? [])];
      nextArr[idx] = value;
      patchCard(cardId, { [key]: nextArr } as Partial<CardFormData>);
    },
    [cards, patchCard],
  );

  const addArrayItem = useCallback(
    (cardId: string, key: ArrayKey, max: number) => {
      const card = cards.find((c) => c.id === cardId);
      if (!card) return;
      const arr = card[key] ?? [];
      if (arr.length >= max) return;
      patchCard(cardId, { [key]: [...arr, ""] } as Partial<CardFormData>);
    },
    [cards, patchCard],
  );

  const removeArrayItem = useCallback(
    (cardId: string, key: ArrayKey, idx: number, min: number) => {
      const card = cards.find((c) => c.id === cardId);
      if (!card) return;
      const arr = card[key] ?? [];
      if (arr.length <= min) return;
      patchCard(cardId, {
        [key]: arr.filter((_, i) => i !== idx),
      } as Partial<CardFormData>);
    },
    [cards, patchCard],
  );

  const submit = useCallback(async () => {
    const filledCards = cards.filter((card) => {
      const hasFront = card.front.trim() || card.frontImageFile;

      if (card.cardType === "multiple-choice") {
        const hasCorrect = card.correctAnswers.some((a) => a.trim());
        const hasIncorrect = card.incorrectAnswers.some((a) => a.trim());
        return hasFront && hasCorrect && hasIncorrect;
      }

      const hasBack = card.back.trim() || card.backImageFile;
      return hasFront && hasBack;
    });

    if (filledCards.length === 0) return;

    setSubmitting(true);
    try {
      await onSubmit(filledCards);
      setStep("select-count");
      setCardCount("10");
      setCards([]);
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  }, [cards, onOpenChange, onSubmit]);

  const backToCount = useCallback(() => {
    setStep("select-count");
    setCards([]);
  }, []);

  const close = useCallback(() => {
    setStep("select-count");
    setCardCount("10");
    setCards([]);
    onOpenChange(false);
  }, [onOpenChange]);

  return {
    step,
    cardCount,
    setCardCount,
    cards,
    submitting,

    translatingCardId,
    translatingField,
    uploadingImageCardId,
    uploadingImageField,
    uploadingAudioCardId,
    uploadingAudioField,

    isPremium,
    filledCount,

    handleCountSubmit,
    patchCard,
    setCardType,
    removeCard,
    addCard,

    translate,
    uploadImage,
    removeImage,
    uploadAudio,

    setArrayItem,
    addArrayItem,
    removeArrayItem,

    submit,
    backToCount,
    close,
  };
}
