import { memo, useMemo } from "react";
import type { Card as CardType, Suit, Rank } from "@/lib/poker";

const HAND_EMOJIS: Record<string, string> = {
  "Royal Flush": "♛", "Straight Flush": "✧", "Four of a Kind": "◇",
  "Full House": "⊞", "Flush": "♢", "Straight": "▣",
  "Three of a Kind": "△", "Two Pair": "⊡", "Pair": "○", "High Card": "⋅",
};

const SUITS: Suit[] = ["s", "h", "d", "c"];
const RANKS: Rank[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];

function freshDeck(): CardType[] {
  const d: CardType[] = [];
  for (const s of SUITS) for (const r of RANKS) d.push({ r, s });
  return d;
}

function evalFive(cards: CardType[]): { score: number; name: string } {
  const ranks = cards.map((c) => c.r).sort((a, b) => b - a);
  const suits = cards.map((c) => c.s);
  const counts: Record<number, number> = {};
  ranks.forEach((r) => (counts[r] = (counts[r] || 0) + 1));
  const groups = Object.entries(counts)
    .map(([r, c]) => ({ r: Number(r) as Rank, c }))
    .sort((a, b) => b.c - a.c || b.r - a.r);
  const isFlush = suits.every((s) => s === suits[0]);
  const uniq = Array.from(new Set(ranks)).sort((a, b) => b - a);
  let isStraight = false;
  let straightHigh = 0;
  if (uniq.length === 5) {
    if (uniq[0] - uniq[4] === 4) { isStraight = true; straightHigh = uniq[0]; }
    if (uniq[0] === 14 && uniq[1] === 5 && uniq[2] === 4 && uniq[3] === 3 && uniq[4] === 2) { isStraight = true; straightHigh = 5; }
  }
  const pack = (cat: number, ...t: number[]) => { let s = cat; for (const v of t) s = s * 16 + v; return s; };
  if (isStraight && isFlush) return { score: pack(8, straightHigh), name: "Straight Flush" };
  if (groups[0].c === 4) return { score: pack(7, groups[0].r, groups[1].r), name: "Four of a Kind" };
  if (groups[0].c === 3 && groups[1].c === 2) return { score: pack(6, groups[0].r, groups[1].r), name: "Full House" };
  if (isFlush) return { score: pack(5, ...ranks), name: "Flush" };
  if (isStraight) return { score: pack(4, straightHigh), name: "Straight" };
  if (groups[0].c === 3) return { score: pack(3, groups[0].r, groups[1].r, groups[2].r), name: "Three of a Kind" };
  if (groups[0].c === 2 && groups[1].c === 2) return { score: pack(2, groups[0].r, groups[1].r, groups[2].r), name: "Two Pair" };
  if (groups[0].c === 2) return { score: pack(1, groups[0].r, groups[1].r, groups[2].r, groups[3].r), name: "Pair" };
  return { score: pack(0, ...ranks), name: "High Card" };
}

function kCombos<T>(arr: T[], k: number): T[][] {
  const out: T[][] = [];
  const rec = (start: number, cur: T[]) => {
    if (cur.length === k) { out.push(cur.slice()); return; }
    for (let i = start; i < arr.length; i++) { cur.push(arr[i]); rec(i + 1, cur); cur.pop(); }
  };
  rec(0, []);
  return out;
}

function evalBest(cards: CardType[]): { score: number; name: string } {
  const combos = kCombos(cards, 5);
  let best = { score: -1, name: "" };
  for (const c of combos) {
    const r = evalFive(c);
    if (r.score > best.score) best = r;
  }
  return best;
}

function estimateEquity(holeCards: CardType[], board: CardType[], iterations = 500): number {
  if (holeCards.length < 2) return 0;
  const deck = freshDeck().filter(
    (c) => !holeCards.some((h) => h.r === c.r && h.s === c.s) && !board.some((b) => b.r === c.r && b.s === c.s)
  );
  const used = holeCards.length + board.length;
  const needed = 7 - used;
  if (needed <= 0) {
    const ev = evalBest([...holeCards, ...board]);
    return ev.score;
  }
  let wins = 0;
  for (let i = 0; i < iterations; i++) {
    const shuffled = [...deck].sort(() => Math.random() - 0.5);
    const drawn = shuffled.slice(0, needed + 2);
    const my7 = [...holeCards, ...board, ...drawn.slice(0, needed)];
    const opp7 = [drawn[needed], drawn[needed + 1], ...board];
    const myEv = evalBest(my7);
    const oppEv = evalBest(opp7);
    if (myEv.score > oppEv.score) wins++;
    else if (myEv.score === oppEv.score) wins += 0.5;
  }
  return wins / iterations;
}

export const HandStrength = memo(function HandStrength({
  holeCards,
  board,
}: {
  holeCards: CardType[];
  board: CardType[];
}) {
  const result = useMemo(() => {
    if (holeCards.length < 2) return null;
    const ev = evalBest([...holeCards, ...board]);
    const totalPossible = 8 * 16 ** 5;
    const pct = Math.min(Math.round((ev.score / totalPossible) * 100), 100);
    return { ...ev, pct };
  }, [holeCards, board]);

  const equity = useMemo(() => {
    if (holeCards.length < 2 || board.length >= 5) return null;
    return estimateEquity(holeCards, board, 200);
  }, [holeCards, board]);

  if (!result) return null;

  const color = result.pct >= 80 ? "text-emerald-400" : result.pct >= 60 ? "text-lime-400" : result.pct >= 40 ? "text-yellow-400" : result.pct >= 20 ? "text-orange-400" : "text-red-400";

  return (
    <div className="inline-flex items-center gap-2 rounded-lg bg-black/25 px-2.5 py-1.5 text-xs">
      <span className="text-gold/70">{HAND_EMOJIS[result.name] ?? "♦"}</span>
      <span className="font-medium text-foreground/90">{result.name}</span>
      <span className={`font-mono font-bold ${color}`}>{result.pct}%</span>
      {equity !== null && (
        <span className="text-muted-foreground/60">· vs {Math.round(equity * 100)}%</span>
      )}
    </div>
  );
});

export const PotOdds = memo(function PotOdds({
  pot,
  toCall,
}: {
  pot: number;
  toCall: number;
}) {
  if (toCall <= 0) return null;
  const odds = Math.round((toCall / (pot + toCall)) * 100);

  return (
    <div className="inline-flex items-center gap-2 rounded-lg bg-black/25 px-2.5 py-1.5 text-xs text-muted-foreground">
      <span>
        Pot: <span className="font-mono text-foreground">{pot.toLocaleString()}</span>
      </span>
      <span className="text-muted-foreground/40">·</span>
      <span>
        Call: <span className="font-mono text-gold">{toCall.toLocaleString()}</span>
      </span>
      <span className="text-muted-foreground/40">·</span>
      <span>
        Odds: <span className="font-mono text-foreground">{odds}%</span>
      </span>
    </div>
  );
});
