import { memo } from "react";
import { PlayingCard } from "./PlayingCard";
import { ChipStack } from "./ChipStack";
import type { Card as CardType } from "@/lib/poker";

interface SeatData {
  id: string;
  user_id: string;
  seat_number: number;
  chips: number;
  current_bet: number;
  has_folded: boolean;
  is_all_in: boolean;
  has_acted: boolean;
}

export const Seat = memo(function Seat({
  seat,
  isMe,
  isDealer,
  isActive,
  username,
  myHole,
  phase,
}: {
  seat: SeatData;
  isMe: boolean;
  isDealer: boolean;
  isActive: boolean;
  username: string;
  myHole: CardType[];
  phase: string;
}) {
  return (
    <div
      className={`gpu relative rounded-xl border-2 px-3 py-2.5 text-center smooth-transition ${
        isActive
          ? "animate-active-pulse bg-card shadow-gold"
          : seat.has_folded
            ? "border-transparent bg-card/20 opacity-35"
            : "glass hover:border-gold/40"
      }`}
    >
      {isDealer && (
        <div className="absolute -top-2.5 -right-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-foreground text-[8px] font-bold text-background shadow-lg ring-2 ring-background/80 z-10">
          D
        </div>
      )}

      {seat.is_all_in && !seat.has_folded && phase !== "idle" && (
        <div className="absolute -top-2.5 -left-2.5 rounded-full bg-gradient-to-b from-orange-500 to-orange-600 px-1.5 py-0.5 text-[8px] font-bold text-white shadow-lg z-10">
          AI
        </div>
      )}

      <div className="mb-0.5 text-xs font-bold tracking-tight text-foreground/90">
        {username}
        {isMe && <span className="ml-0.5 text-[9px] text-gold">(you)</span>}
      </div>

      <div className="flex items-center justify-center gap-1">
        <ChipStack amount={Math.min(seat.chips, 50000)} size="sm" />
        <span className="font-mono text-xs font-bold text-gold">{seat.chips.toLocaleString()}</span>
      </div>

      {seat.current_bet > 0 && (
        <div className="absolute -bottom-3.5 left-1/2 -translate-x-1/2 pointer-events-none z-10">
          <span className="inline-block rounded-full bg-gradient-to-b from-gold to-amber-600 px-2 py-0.5 font-mono text-[9px] font-bold text-background shadow-lg">
            {seat.current_bet.toLocaleString()}
          </span>
        </div>
      )}

      <div className="mt-1.5 flex justify-center gap-1">
        {isMe && myHole.length > 0
          ? myHole.map((c, idx) => (
              <PlayingCard key={idx} card={c} size="sm" dealDelay={idx * 80} />
            ))
          : phase !== "idle" && !seat.has_folded && (
              <div className="flex gap-1">
                <PlayingCard hidden size="sm" dealDelay={0} />
                <PlayingCard hidden size="sm" dealDelay={50} />
              </div>
            )
        }
      </div>

      {seat.has_folded && phase !== "idle" && (
        <div className="mt-1 text-[9px] font-semibold uppercase tracking-widest text-red-400/70">
          Folded
        </div>
      )}
    </div>
  );
});
