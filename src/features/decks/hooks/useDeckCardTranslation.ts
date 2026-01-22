import { useCallback, useState } from "react";
import { toast } from "sonner";
import { translateText as apiTranslateText } from "@/shared/api/ai";

type UserLike = { subscriptionTier?: string };
type DeckLike = { frontLanguage?: string | null; backLanguage?: string | null };

export function useDeckCardTranslation(args: {
  accessToken: string | null | undefined;
  user: UserLike | null | undefined;
  deck: DeckLike | null | undefined;

  // new setters/values
  newFront: string;
  newBack: string;
  setNewFront: (v: string) => void;
  setNewBack: (v: string) => void;

  // edit setters/values
  editFront: string;
  editBack: string;
  setEditFront: (v: string) => void;
  setEditBack: (v: string) => void;

  // upgrade modal
  onRequireUpgrade: () => void;
}) {
  const {
    accessToken,
    user,
    deck,
    newFront,
    newBack,
    setNewFront,
    setNewBack,
    editFront,
    editBack,
    setEditFront,
    setEditBack,
    onRequireUpgrade,
  } = args;

  const [translatingFront, setTranslatingFront] = useState(false);
  const [translatingBack, setTranslatingBack] = useState(false);
  const [translatingEditFront, setTranslatingEditFront] = useState(false);
  const [translatingEditBack, setTranslatingEditBack] = useState(false);

  const ensureAllowed = useCallback((): boolean => {
    if (!accessToken) return false;

    if (user?.subscriptionTier === "free") {
      toast.error("Translation requires a Premium or Pro subscription");
      onRequireUpgrade();
      return false;
    }
    return true;
  }, [accessToken, onRequireUpgrade, user?.subscriptionTier]);

  const translate = useCallback(
    async (text: string, language: string): Promise<string> => {
      if (!accessToken) throw new Error("Not authenticated");
      const result = await apiTranslateText(accessToken, text, language);
      return result.translatedText;
    },
    [accessToken],
  );

  const handleTranslateFront = useCallback(async (): Promise<void> => {
    if (!ensureAllowed()) return;

    if (!newFront.trim()) {
      toast.error("Please enter some text to translate");
      return;
    }

    if (!deck?.frontLanguage) {
      toast.error("Please set a front language for this deck in deck settings");
      return;
    }

    setTranslatingFront(true);
    try {
      const translated = await translate(newFront, deck.frontLanguage);
      setNewFront(translated);
      toast.success("Translation complete!");
    } catch (err: unknown) {
      console.error("Translation error:", err);
      toast.error("Failed to translate text");
    } finally {
      setTranslatingFront(false);
    }
  }, [deck?.frontLanguage, ensureAllowed, newFront, setNewFront, translate]);

  const handleTranslateBack = useCallback(async (): Promise<void> => {
    if (!ensureAllowed()) return;

    if (!newBack.trim()) {
      toast.error("Please enter some text to translate");
      return;
    }

    if (!deck?.backLanguage) {
      toast.error("Please set a back language for this deck in deck settings");
      return;
    }

    setTranslatingBack(true);
    try {
      const translated = await translate(newBack, deck.backLanguage);
      setNewBack(translated);
      toast.success("Translation complete!");
    } catch (err: unknown) {
      console.error("Translation error:", err);
      toast.error("Failed to translate text");
    } finally {
      setTranslatingBack(false);
    }
  }, [deck?.backLanguage, ensureAllowed, newBack, setNewBack, translate]);

  const handleTranslateEditFront = useCallback(async (): Promise<void> => {
    if (!ensureAllowed()) return;

    if (!editFront.trim()) {
      toast.error("Please enter some text to translate");
      return;
    }

    if (!deck?.frontLanguage) {
      toast.error("Please set a front language for this deck in deck settings");
      return;
    }

    setTranslatingEditFront(true);
    try {
      const translated = await translate(editFront, deck.frontLanguage);
      setEditFront(translated);
      toast.success("Translation complete!");
    } catch (err: unknown) {
      console.error("Translation error:", err);
      toast.error("Failed to translate text");
    } finally {
      setTranslatingEditFront(false);
    }
  }, [deck?.frontLanguage, editFront, ensureAllowed, setEditFront, translate]);

  const handleTranslateEditBack = useCallback(async (): Promise<void> => {
    if (!ensureAllowed()) return;

    if (!editBack.trim()) {
      toast.error("Please enter some text to translate");
      return;
    }

    if (!deck?.backLanguage) {
      toast.error("Please set a back language for this deck in deck settings");
      return;
    }

    setTranslatingEditBack(true);
    try {
      const translated = await translate(editBack, deck.backLanguage);
      setEditBack(translated);
      toast.success("Translation complete!");
    } catch (err: unknown) {
      console.error("Translation error:", err);
      toast.error("Failed to translate text");
    } finally {
      setTranslatingEditBack(false);
    }
  }, [deck?.backLanguage, editBack, ensureAllowed, setEditBack, translate]);

  // used by BulkAddCardsDialog
  const handleBulkTranslate = useCallback(
    async (text: string, language: string): Promise<string> =>
      translate(text, language),
    [translate],
  );

  return {
    translatingFront,
    translatingBack,
    translatingEditFront,
    translatingEditBack,

    handleTranslateFront,
    handleTranslateBack,
    handleTranslateEditFront,
    handleTranslateEditBack,

    handleBulkTranslate,
  };
}
