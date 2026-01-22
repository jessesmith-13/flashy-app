import type { SubscriptionTier } from "@/types/users";
import type { CardType } from "@/types/decks";

import { Dialog, DialogContent } from "@/shared/ui/dialog";

import { useBulkAddCardsState } from "./bulk/useBulkAddCardsState";
import { SelectCountStep } from "./bulk/SelectCountStep";
import { BulkCardsStep } from "./bulk/BulkCardsStep";
import { BulkCardItem } from "./bulk/BulkCardItem";
import { BulkCardFields } from "./bulk/BulkCardFields";

export interface CardFormData {
  id: string;
  cardType: CardType;

  front: string;
  back: string;

  frontImageUrl: string;
  frontImageFile: File | null;

  backImageUrl: string;
  backImageFile: File | null;

  frontAudio?: string;
  backAudio?: string;

  correctAnswers: string[];
  incorrectAnswers: string[];
  acceptedAnswers: string[];
}

export interface BulkAddCardsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (cards: CardFormData[]) => Promise<void>;

  deckFrontLanguage?: string;
  deckBackLanguage?: string;
  userTier?: SubscriptionTier;

  onTranslate?: (text: string, language: string) => Promise<string>;
  onUploadImage?: (file: File) => Promise<string>;
  onUploadAudio?: (file: File) => Promise<string>;
}

export function BulkAddCardsDialog(props: BulkAddCardsDialogProps) {
  const {
    open,
    onOpenChange,
    onSubmit,
    deckFrontLanguage,
    deckBackLanguage,
    userTier,
    onTranslate,
    onUploadImage,
    onUploadAudio,
  } = props;

  const s = useBulkAddCardsState({
    deckFrontLanguage,
    deckBackLanguage,
    userTier,
    onTranslate,
    onUploadImage,
    onUploadAudio,
    onSubmit,
    onOpenChange,
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) s.close();
        else onOpenChange(true);
      }}
    >
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        {s.step === "select-count" ? (
          <SelectCountStep
            cardCount={s.cardCount}
            setCardCount={s.setCardCount}
            onCancel={s.close}
            onNext={s.handleCountSubmit}
          />
        ) : (
          <BulkCardsStep
            cards={s.cards}
            filledCount={s.filledCount}
            submitting={s.submitting}
            onBack={s.backToCount}
            onCancel={s.close}
            onAddCard={s.addCard}
            onSubmit={s.submit}
            renderCard={(card, index) => (
              <BulkCardItem
                key={card.id}
                index={index}
                canRemove={s.cards.length > 1}
                onRemove={() => s.removeCard(card.id)}
              >
                <BulkCardFields
                  card={card}
                  userTier={userTier}
                  deckFrontLanguage={deckFrontLanguage}
                  deckBackLanguage={deckBackLanguage}
                  isPremium={s.isPremium}
                  submitting={s.submitting}
                  // translate
                  translating={
                    s.translatingCardId === card.id ? s.translatingField : null
                  }
                  onTranslate={(field) => s.translate(card.id, field)}
                  // images
                  uploadingImage={
                    s.uploadingImageCardId === card.id
                      ? s.uploadingImageField
                      : null
                  }
                  onUploadImage={(field, file) =>
                    s.uploadImage(card.id, field, file)
                  }
                  onRemoveImage={(field) => s.removeImage(card.id, field)}
                  // audio
                  uploadingAudio={
                    s.uploadingAudioCardId === card.id
                      ? s.uploadingAudioField
                      : null
                  }
                  onUploadAudio={(field, file) =>
                    s.uploadAudio(card.id, field, file)
                  }
                  // basic edits
                  onPatch={(patch) => s.patchCard(card.id, patch)}
                  onSetType={(t) => s.setCardType(card.id, t)}
                  // arrays
                  onSetArrayItem={(key, idx, value) =>
                    s.setArrayItem(card.id, key, idx, value)
                  }
                  onAddArrayItem={(key, max) =>
                    s.addArrayItem(card.id, key, max)
                  }
                  onRemoveArrayItem={(key, idx, min) =>
                    s.removeArrayItem(card.id, key, idx, min)
                  }
                />
              </BulkCardItem>
            )}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
