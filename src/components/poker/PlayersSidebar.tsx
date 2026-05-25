import { memo } from "react";
import { ChipAmount } from "./ChipStack";

interface SeatRow {
  id: string;
  user_id: string;
  seat_number: number;
  chips: number;
  current_bet: number;
  has_folded: boolean;
  is_all_in: boolean;
  has_acted: boolean;
}

export const PlayersSidebar = memo(function PlayersSidebar({
  seats,
  profiles,
  myUserId,
  dealerSeat,
  currentSeat,
  phase,
}: {
  seats: SeatRow[];
  profiles: Record<string, { username: string }>;
  myUserId?: string;
  dealerSeat: number | null;
  currentSeat: number | null;
  phase: string;
}) {
  return (
    <div className="gpu overflow-hidden rounded-2xl border border-gold/15 bg-card/40 shadow-xl backdrop-blur">
      <div className="border-b border-gold/10 px-5 py-3">
        <h3 className="font-display text-sm tracking-wider text-gold/80">Players</h3>
      </div>
      <div className="divide-y divide-border/20">
        {seats.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-muted-foreground/60">
            No players yet
          </div>
        ) : (
          seats.map((seat) => {
            const profile = profiles[seat.user_id];
            const isMe = seat.user_id === myUserId;
            const isDealer = dealerSeat === seat.seat_number;
            const isActive = currentSeat === seat.seat_number && phase !== "idle";

            const statusText = seat.has_folded
              ? "Folded"
              : seat.is_all_in
                ? "All-in"
                : isActive
                  ? "Action"
                  : phase !== "idle"
                    ? "In hand"
                    : "Waiting";

            const statusColor = seat.has_folded
              ? "bg-red-900/20 text-red-400/70"
              : seat.is_all_in
                ? "bg-orange-900/20 text-orange-400/70"
                : isActive
                  ? "bg-emerald-900/25 text-emerald-400"
                  : phase !== "idle"
                    ? "bg-blue-900/20 text-blue-400/60"
                    : "bg-muted/20 text-muted-foreground/50";

            return (
              <div
                key={seat.id}
                className={`flex items-center gap-3 px-5 py-3 smooth-transition ${
                  isActive ? "bg-gold/5" : "hover:bg-gold/3"
                }`}
              >
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-gold to-amber-700 text-xs font-bold text-background shadow-lg ${
                  isActive ? "ring-2 ring-gold/50 ring-offset-1 ring-offset-background" : ""
                }`}>
                  {profile?.username?.charAt(0).toUpperCase() ?? "?"}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-semibold text-foreground/90">
                      {profile?.username ?? "…"}
                      {isMe && <span className="ml-1 text-[9px] text-gold/70">(you)</span>}
                    </span>
                    {isDealer && (
                      <span className="rounded-full bg-foreground/90 px-1.5 py-0.5 text-[8px] font-bold text-background">
                        D
                      </span>
                    )}
                  </div>
                  <span className={`inline-block rounded-full px-2 py-0.5 text-[9px] font-medium ${statusColor}`}>
                    {statusText}
                  </span>
                </div>

                <div className="text-right">
                  <ChipAmount amount={seat.chips} className="text-xs" />
                  {seat.current_bet > 0 && (
                    <div className="text-[9px] text-gold/50">
                      bet {seat.current_bet.toLocaleString()}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
});
