import {
  FlipVertical,
  CheckCircle,
  Keyboard,
  type LucideIcon,
} from "lucide-react";
import type { CardType } from "@/types/decks";

export const CARD_TYPES: {
  value: CardType;
  label: string;
  icon: LucideIcon;
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
    description: "Choose from 4 options",
  },
  {
    value: "type-answer",
    label: "Type to Answer",
    icon: Keyboard,
    description: "Type the exact answer",
  },
];
