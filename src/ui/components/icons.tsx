import {
  Bird, BookOpenText, Brain, Croissant, Inbox, PenLine, Plane, Plug, RotateCcw, ScanSearch, ScrollText, Search, Send, ShieldCheck, ShoppingCart, Umbrella, UserCheck, Wrench,
  type LucideIcon,
} from 'lucide-react';
import type { Hue } from '../../game/data';
import type { CardId, MissionDef } from '../../game/types';

export const CARD_ICON: Record<CardId, LucideIcon> = {
  tool: Wrench,
  validate: ScanSearch,
  retry: RotateCcw,
  guard: ShieldCheck,
  human: UserCheck,
  memory: Brain,
  log: ScrollText,
};

export const STEP_ICON: Record<string, LucideIcon> = {
  inbox: Inbox,
  read: BookOpenText,
  lookup: Search,
  draft: PenLine,
  send: Send,
};

export const CLIENT_ICON: Record<MissionDef['icon'], LucideIcon> = {
  croissant: Croissant,
  bird: Bird,
  plane: Plane,
  plug: Plug,
  umbrella: Umbrella,
  cart: ShoppingCart,
};

/** 色相ごとの淡い背景と濃い文字 */
export const HUE: Record<Hue, { soft: string; text: string; ring: string; solid: string }> = {
  blue: { soft: 'bg-sky-soft', text: 'text-sky', ring: 'border-sky/30', solid: 'bg-sky' },
  violet: { soft: 'bg-lav-soft', text: 'text-lav', ring: 'border-lav/30', solid: 'bg-lav' },
  amber: { soft: 'bg-butter-soft', text: 'text-butter', ring: 'border-butter/30', solid: 'bg-butter' },
  green: { soft: 'bg-sage-soft', text: 'text-sage', ring: 'border-sage/30', solid: 'bg-sage' },
  rose: { soft: 'bg-rose-soft', text: 'text-rose', ring: 'border-rose/30', solid: 'bg-rose' },
  teal: { soft: 'bg-teal-soft', text: 'text-teal', ring: 'border-teal/30', solid: 'bg-teal' },
  slate: { soft: 'bg-slate-soft', text: 'text-slate', ring: 'border-slate/30', solid: 'bg-slate' },
};

/** 依頼主ごとの色 */
export const CLIENT_HUE: Record<MissionDef['icon'], Hue> = {
  croissant: 'amber',
  bird: 'green',
  plane: 'blue',
  plug: 'violet',
  umbrella: 'rose',
  cart: 'teal',
};
