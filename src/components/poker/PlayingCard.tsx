import { memo } from "react";
import type { Card as CardType } from "@/lib/poker";

const SUIT_GLYPH: Record<string, string> = { s: "♠", h: "♥", d: "♦", c: "♣" };
const RANK_STR: Record<number, string> = { 14: "A", 13: "K", 12: "Q", 11: "J", 10: "T" };

export const PlayingCard = memo(function PlayingCard({
  card,
  hidden,
  size = "md",
  dealDelay = 0,
}: {
  card?: CardType;
  hidden?: boolean;
  size?: "sm" | "md" | "lg";
  dealDelay?: number;
}) {
  const dims =
    size === "sm" ? "h-12 w-9" : size === "lg" ? "h-24 w-16" : "h-16 w-12";

  const isRed = card?.s === "h" || card?.s === "d";
  const rank = card ? (RANK_STR[card.r] ?? String(card.r)) : "";
  const suit = card ? SUIT_GLYPH[card.s] : "";

  if (hidden || !card) {
    return (
      <div
        className={`${dims} gpu relative overflow-hidden rounded-md border border-gold/30 bg-gradient-to-br from-[#5c1a1a] to-[#2a0a0a] shadow-lg`}
        style={{
          animation: dealDelay >= 0 ? `card-deal 0.45s cubic-bezier(0.25, 0.46, 0.45, 0.94) ${dealDelay}ms both` : undefined,
        }}
      >
        <div className="card-back-pattern h-full w-full rounded-md" />
        <div className="absolute inset-1 rounded border border-gold/10" />
      </div>
    );
  }

  return (
    <div
      className={`${dims} gpu relative flex flex-col items-center justify-center rounded-md border border-amber-900/15 bg-gradient-to-b from-[#fffef5] to-[#f0ead6] font-bold shadow-lg transition-transform duration-150 hover:-translate-y-1 hover:shadow-xl select-none`}
      style={{
        color: isRed ? "#dc2626" : "#1a1a1a",
        animation: dealDelay >= 0 ? `card-deal 0.45s cubic-bezier(0.25, 0.46, 0.45, 0.94) ${dealDelay}ms both` : undefined,
      }}
    >
      <div className="absolute left-0.5 top-0.5 flex flex-col items-center leading-none">
        <span className="text-[9px]">{rank}</span>
        <span className="text-[7px] -mt-0.5">{suit}</span>
      </div>
      <span className={`${size === "sm" ? "text-lg" : size === "lg" ? "text-3xl" : "text-xl"}`}>{suit}</span>
      <div className="absolute right-0.5 bottom-0.5 flex flex-col items-center leading-none rotate-180">
        <span className="text-[9px]">{rank}</span>
        <span className="text-[7px] -mt-0.5">{suit}</span>
      </div>
    </div>
  );
});
