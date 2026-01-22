import { useCallback, useState } from "react";
import type { UICard, CardType } from "@/types/decks";

export function useCardDraftState() {
  // -----------------------
  // New card draft state
  // -----------------------
  const [newCardType, setNewCardType] = useState<CardType>("classic-flip");
  const [newCardFront, setNewCardFront] = useState("");
  const [newCardBack, setNewCardBack] = useState("");

  const [newCardFrontImageUrl, setNewCardFrontImageUrl] = useState("");
  const [newCardImageFile, setNewCardImageFile] = useState<File | null>(null);

  const [newCardBackImageUrl, setNewCardBackImageUrl] = useState("");
  const [newCardBackImageFile, setNewCardBackImageFile] = useState<File | null>(
    null,
  );

  const [newCardFrontAudio, setNewCardFrontAudio] = useState("");
  const [newCardBackAudio, setNewCardBackAudio] = useState("");

  const [newCardCorrectAnswers, setNewCardCorrectAnswers] = useState<string[]>([
    "",
  ]);
  const [newCardIncorrectAnswers, setNewCardIncorrectAnswers] = useState<
    string[]
  >(["", "", ""]);
  const [newCardAcceptedAnswers, setNewCardAcceptedAnswers] = useState<
    string[]
  >([]);

  const resetNewCardDraft = useCallback(() => {
    setNewCardType("classic-flip");
    setNewCardFront("");
    setNewCardBack("");

    setNewCardFrontImageUrl("");
    setNewCardImageFile(null);

    setNewCardBackImageUrl("");
    setNewCardBackImageFile(null);

    setNewCardFrontAudio("");
    setNewCardBackAudio("");

    setNewCardAcceptedAnswers([""]);
    setNewCardCorrectAnswers([""]);
    setNewCardIncorrectAnswers(["", "", ""]);
  }, []);

  // -----------------------
  // Edit card draft state
  // -----------------------
  const [editingCardId, setEditingCardId] = useState<string | null>(null);

  const [editCardType, setEditCardType] = useState<CardType>("classic-flip");
  const [editCardFront, setEditCardFront] = useState("");
  const [editCardBack, setEditCardBack] = useState("");

  const [editCardFrontImageUrl, setEditCardFrontImageUrl] = useState("");
  const [editCardImageFile, setEditCardImageFile] = useState<File | null>(null);

  const [editCardBackImageUrl, setEditCardBackImageUrl] = useState("");
  const [editCardBackImageFile, setEditCardBackImageFile] =
    useState<File | null>(null);

  const [editCardFrontAudio, setEditCardFrontAudio] = useState("");
  const [editCardBackAudio, setEditCardBackAudio] = useState("");

  const [editCardIncorrectAnswers, setEditCardIncorrectAnswers] = useState<
    string[]
  >(["", "", ""]);

  const [
    editCardTypeAnswerAcceptedAnswers,
    setEditCardTypeAnswerAcceptedAnswers,
  ] = useState<string[]>([""]);

  const [editCardCorrectAnswers, setEditCardCorrectAnswers] = useState<
    string[]
  >([""]);

  const resetEditCardDraft = useCallback(() => {
    setEditingCardId(null);

    setEditCardType("classic-flip");
    setEditCardFront("");
    setEditCardBack("");

    setEditCardFrontImageUrl("");
    setEditCardImageFile(null);

    setEditCardBackImageUrl("");
    setEditCardBackImageFile(null);

    setEditCardFrontAudio("");
    setEditCardBackAudio("");

    setEditCardIncorrectAnswers(["", "", ""]);
    setEditCardTypeAnswerAcceptedAnswers([""]);
    setEditCardCorrectAnswers([""]);
  }, []);

  /**
   * Fill edit state from an existing card (used by handleOpenEditCard).
   * Keeps behavior identical to your current implementation.
   */
  const openEditFromCard = useCallback((card: UICard) => {
    setEditingCardId(card.id);

    setEditCardType(card.cardType);
    setEditCardFront(card.front || "");
    setEditCardBack(card.back || "");

    setEditCardFrontImageUrl(card.frontImageUrl || "");
    setEditCardImageFile(null);

    setEditCardBackImageUrl(card.backImageUrl || "");
    setEditCardBackImageFile(null);

    setEditCardFrontAudio(card.frontAudio || "");
    setEditCardBackAudio(card.backAudio || "");

    if (card.cardType === "multiple-choice") {
      const correctAnswers = card.correctAnswers || [""];
      const incorrectAnswers = card.incorrectAnswers || ["", "", ""];

      setEditCardCorrectAnswers(
        correctAnswers.length > 0 ? correctAnswers : [""],
      );
      setEditCardIncorrectAnswers(
        incorrectAnswers.length > 0 ? incorrectAnswers : ["", "", ""],
      );

      // keep accepted answers stable
      setEditCardTypeAnswerAcceptedAnswers([""]);
    } else if (card.cardType === "type-answer") {
      const acceptedAnswers = card.acceptedAnswers || [""];

      setEditCardTypeAnswerAcceptedAnswers(
        acceptedAnswers.length > 0 ? acceptedAnswers : [""],
      );

      // keep MC arrays stable
      setEditCardCorrectAnswers([""]);
      setEditCardIncorrectAnswers(["", "", ""]);
    } else {
      // classic-flip defaults
      setEditCardCorrectAnswers([""]);
      setEditCardIncorrectAnswers(["", "", ""]);
      setEditCardTypeAnswerAcceptedAnswers([""]);
    }
  }, []);

  return {
    // new draft
    newCardType,
    setNewCardType,
    newCardFront,
    setNewCardFront,
    newCardBack,
    setNewCardBack,
    newCardFrontImageUrl,
    setNewCardFrontImageUrl,
    newCardImageFile,
    setNewCardImageFile,
    newCardBackImageUrl,
    setNewCardBackImageUrl,
    newCardBackImageFile,
    setNewCardBackImageFile,
    newCardFrontAudio,
    setNewCardFrontAudio,
    newCardBackAudio,
    setNewCardBackAudio,
    newCardCorrectAnswers,
    setNewCardCorrectAnswers,
    newCardIncorrectAnswers,
    setNewCardIncorrectAnswers,
    newCardAcceptedAnswers,
    setNewCardAcceptedAnswers,
    resetNewCardDraft,

    // edit draft
    editingCardId,
    setEditingCardId,
    editCardType,
    setEditCardType,
    editCardFront,
    setEditCardFront,
    editCardBack,
    setEditCardBack,
    editCardFrontImageUrl,
    setEditCardFrontImageUrl,
    editCardImageFile,
    setEditCardImageFile,
    editCardBackImageUrl,
    setEditCardBackImageUrl,
    editCardBackImageFile,
    setEditCardBackImageFile,
    editCardFrontAudio,
    setEditCardFrontAudio,
    editCardBackAudio,
    setEditCardBackAudio,
    editCardCorrectAnswers,
    setEditCardCorrectAnswers,
    editCardIncorrectAnswers,
    setEditCardIncorrectAnswers,
    editCardTypeAnswerAcceptedAnswers,
    setEditCardTypeAnswerAcceptedAnswers,
    resetEditCardDraft,

    // helpers
    openEditFromCard,
  };
}
