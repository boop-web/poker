import { useState } from "react";
import { toast } from "sonner";

interface SitButtonProps {
  tableId: string;
  seat: number;
  minBuyin: number;
  maxBuyin: number;
  myChips: number;
  joinFn: any;
  disabled: boolean;
}

export function SitButton({
  tableId,
  seat,
  minBuyin,
  maxBuyin,
  myChips,
  joinFn,
  disabled,
}: SitButtonProps) {
  const [open, setOpen] = useState(false);
  const [buyin, setBuyin] = useState(minBuyin);

  if (disabled) {
    return (
      <div className="gpu rounded-xl border border-dashed border-border/20 bg-black/10 px-4 py-3 text-xs text-muted-foreground/50 backdrop-blur">
        Seat {seat + 1}
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="gpu group rounded-xl border-2 border-dashed border-gold/25 bg-black/15 px-4 py-5 text-xs text-gold/60 backdrop-blur transition-all duration-200 hover:border-gold/50 hover:bg-gold/5 hover:text-gold hover:shadow-gold active:scale-[0.97]"
      >
        <div className="mb-1 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/50 group-hover:text-gold/50">
          Seat {seat + 1}
        </div>
        <div className="font-bold">Sit here</div>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm animate-fade-in-up rounded-2xl border border-gold/20 bg-card p-8 shadow-2xl"
            style={{ animation: "fade-in-up 0.25s ease-out both" }}
          >
            <h3 className="font-display text-2xl text-gold">Buy in</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Available: <span className="font-mono text-foreground">{myChips.toLocaleString()}</span>
            </p>
            <div className="mt-6">
              <label className="mb-2 block text-xs text-muted-foreground">Amount</label>
              <div className="flex gap-2">
                {[minBuyin, Math.floor((minBuyin + Math.min(maxBuyin, myChips)) / 2), Math.min(maxBuyin, myChips)]
                  .filter((v, i, a) => a.indexOf(v) === i)
                  .map((v) => (
                    <button
                      key={v}
                      onClick={() => setBuyin(v)}
                      className={`btn-premium rounded-lg border px-3 py-1.5 text-xs font-mono transition-all ${
                        buyin === v
                          ? "border-gold bg-gold/15 text-gold"
                          : "border-border/50 text-muted-foreground hover:border-gold/30"
                      }`}
                    >
                      {v.toLocaleString()}
                    </button>
                  ))}
              </div>
              <input
                type="number"
                min={minBuyin}
                max={Math.min(maxBuyin, myChips)}
                value={buyin}
                onChange={(e) => setBuyin(+e.target.value)}
                className="mt-3 w-full rounded-xl border border-input bg-background/30 px-4 py-3 font-mono text-foreground outline-none transition-all focus:border-gold/50 focus:ring-1 focus:ring-gold/30"
              />
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setOpen(false)}
                className="btn-premium rounded-xl border border-border/50 px-5 py-2.5 text-sm text-muted-foreground hover:bg-muted/30 active:scale-95"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  try {
                    await joinFn({ data: { tableId, seatNumber: seat, buyin } });
                    setOpen(false);
                    toast.success("Seated at the table!");
                  } catch (e) {
                    toast.error((e as Error).message);
                  }
                }}
                className="btn-premium rounded-xl bg-gradient-to-b from-gold to-amber-600 px-6 py-2.5 font-bold text-background shadow-lg active:shadow-md"
              >
                Sit
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
