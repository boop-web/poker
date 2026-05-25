import { useState, useEffect, useRef, memo } from "react";
import { PlayingCard } from "./PlayingCard";
import type { Card as CardType } from "@/lib/poker";

export const CommunityCards = memo(function CommunityCards({
  board,
  phase,
}: {
  board: CardType[];
  phase: string;
}) {
  const [revealedCount, setRevealedCount] = useState(0);
  const prevLen = useRef(0);

  useEffect(() => {
    if (board.length > prevLen.current) {
      const newCards = board.length - prevLen.current;
      setRevealedCount(prevLen.current);
      let i = 0;
      const t = setInterval(() => {
        i++;
        setRevealedCount((p) => Math.min(p + 1, board.length));
        if (i >= newCards) clearInterval(t);
      }, 120);
      return () => clearInterval(t);
    }
    setRevealedCount(board.length);
    prevLen.current = board.length;
  }, [board.length]);

  useEffect(() => { prevLen.current = board.length; }, [board.length]);

  const totalSlots = phase === "flop" ? 3 : phase === "turn" ? 4 : phase === "river" || phase === "showdown" ? 5 : 0;

  return (
    <div className="flex items-center justify-center gap-1.5">
      {[0, 1, 2, 3, 4].map((i) => {
        const show = i < totalSlots;
        const revealed = i < revealedCount && i < board.length;
        return (
          <div
            key={i}
            className="smooth-transition"
            style={{
              width: show ? "3rem" : "0",
              opacity: show ? 1 : 0,
              overflow: "hidden",
            }}
          >
            {show && (
              <PlayingCard
                card={revealed ? board[i] : undefined}
                hidden={!revealed}
                size="md"
                dealDelay={i * 60}
              />
            )}
          </div>
        );
      })}
    </div>
  );
});
