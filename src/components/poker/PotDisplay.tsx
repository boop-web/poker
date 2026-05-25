import { memo } from "react";

export const PotDisplay = memo(function PotDisplay({
  pot,
  phase,
}: {
  pot: number;
  phase: string;
}) {
  if (phase === "idle") return null;

  return (
    <div
      className="flex flex-col items-center gap-1 pointer-events-none"
      style={{ animation: "fade-in-up 0.3s ease-out both" }}
    >
      <div className="animate-pot-glow rounded-2xl bg-black/25 px-5 py-2 backdrop-blur">
        <span className="text-[9px] font-semibold uppercase tracking-[0.25em] text-gold/80">
          Pot
        </span>
        <div className="font-display text-2xl font-bold tabular-nums text-foreground">
          {pot.toLocaleString()}
        </div>
      </div>
    </div>
  );
});
