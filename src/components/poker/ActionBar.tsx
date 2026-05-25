import { memo, useMemo } from "react";
import { HandStrength, PotOdds } from "./PotOdds";
import type { Card as CardType } from "@/lib/poker";

interface ActionBarProps {
  isMyTurn: boolean;
  toCall: number;
  myChips: number;
  myCurrentBet: number;
  currentBet: number;
  minRaise: number;
  bigBlind: number;
  phase: string;
  board: CardType[];
  holeCards: CardType[];
  raiseAmt: number;
  setRaiseAmt: (v: number) => void;
  onAct: (action: "fold" | "check" | "call" | "raise" | "allin", amount?: number) => void;
}

export const ActionBar = memo(function ActionBar({
  isMyTurn,
  toCall,
  myChips,
  currentBet,
  minRaise,
  bigBlind,
  phase,
  board,
  holeCards,
  raiseAmt,
  setRaiseAmt,
  onAct,
}: ActionBarProps) {
  const effectiveChips = myChips + (currentBet > 0 ? 0 : 0);
  const defaultRaise = Math.max(currentBet + (minRaise || bigBlind), currentBet + bigBlind);

  const quickRaises = useMemo(() => {
    if (!isMyTurn) return [];
    const pot = currentBet + (currentBet > 0 ? currentBet : 0);
    return [
      { label: "2x", value: currentBet + bigBlind * 2 },
      { label: "3x", value: currentBet + bigBlind * 3 },
      { label: "½P", value: currentBet + Math.floor(pot / 2) },
      { label: "Pot", value: currentBet + pot },
    ].filter((q) => q.value > currentBet + bigBlind && q.value < effectiveChips);
  }, [isMyTurn, currentBet, bigBlind, effectiveChips]);

  if (!isMyTurn) return null;

  return (
    <div className="mx-auto mt-6 w-full max-w-3xl" style={{ animation: "fade-in-up 0.25s ease-out both" }}>
      <div className="glass-dark rounded-2xl p-4 shadow-2xl">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {phase !== "idle" && holeCards.length > 0 && (
            <HandStrength holeCards={holeCards} board={board} />
          )}
          <PotOdds pot={currentBet + (currentBet > 0 ? 0 : 0)} toCall={toCall} />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onAct("fold")}
            className="btn-premium rounded-xl bg-gradient-to-b from-red-500 to-red-700 px-5 py-2.5 font-bold text-white shadow-lg shadow-red-900/30 active:shadow-md"
          >
            Fold
          </button>

          {toCall === 0 ? (
            <button
              onClick={() => onAct("check")}
              className="btn-premium rounded-xl bg-gradient-to-b from-emerald-500 to-emerald-700 px-5 py-2.5 font-bold text-white shadow-lg shadow-emerald-900/30 active:shadow-md"
            >
              Check
            </button>
          ) : (
            <button
              onClick={() => onAct("call")}
              className="btn-premium rounded-xl bg-gradient-to-b from-emerald-500 to-emerald-700 px-5 py-2.5 font-bold text-white shadow-lg shadow-emerald-900/30 active:shadow-md"
            >
              Call {Math.min(toCall, myChips).toLocaleString()}
            </button>
          )}

          <div className="flex items-center gap-1 rounded-xl bg-black/30 px-2 py-1 shadow-inner">
            <input
              type="number"
              min={defaultRaise}
              max={myChips + (currentBet > 0 ? 0 : 0)}
              value={raiseAmt || defaultRaise}
              onChange={(e) => setRaiseAmt(+e.target.value)}
              className="w-16 rounded-lg border-0 bg-transparent px-2 py-1.5 text-center font-mono text-sm text-foreground outline-none focus:ring-1 focus:ring-gold/50"
            />
            <button
              onClick={() => onAct("raise", raiseAmt || defaultRaise)}
              className="btn-premium rounded-lg bg-gradient-to-b from-gold to-amber-600 px-3.5 py-1.5 font-bold text-background shadow-md active:shadow-sm"
            >
              {currentBet > 0 ? "Raise" : "Bet"}
            </button>
          </div>

          {quickRaises.length > 0 && (
            <div className="flex gap-1">
              {quickRaises.map((q) => (
                <button
                  key={q.label}
                  onClick={() => setRaiseAmt(q.value)}
                  className="btn-premium rounded-lg border border-gold/25 px-2 py-1.5 text-[10px] font-semibold text-gold/80 hover:bg-gold/10 hover:text-gold active:bg-gold/20"
                >
                  {q.label}
                </button>
              ))}
            </div>
          )}

          <button
            onClick={() => onAct("allin")}
            className="btn-premium rounded-xl border-2 border-orange-500/40 px-4 py-2 font-bold text-orange-400 shadow-md hover:bg-orange-500/10 active:shadow-sm"
          >
            All-in
          </button>
        </div>
      </div>
    </div>
  );
});
