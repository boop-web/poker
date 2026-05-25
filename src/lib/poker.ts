// Pure poker game logic — no DB, no I/O. Used by server functions.

export type Suit = "s" | "h" | "d" | "c";
export type Rank = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14;
export type Card = { r: Rank; s: Suit };

export const SUITS: Suit[] = ["s", "h", "d", "c"];
export const RANKS: Rank[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];

export function freshDeck(): Card[] {
  const d: Card[] = [];
  for (const s of SUITS) for (const r of RANKS) d.push({ r, s });
  return d;
}

export function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function cardStr(c: Card): string {
  const rk =
    c.r === 14
      ? "A"
      : c.r === 13
        ? "K"
        : c.r === 12
          ? "Q"
          : c.r === 11
            ? "J"
            : c.r === 10
              ? "T"
              : String(c.r);
  return rk + c.s;
}

export function parseCard(s: string): Card {
  const rmap: Record<string, Rank> = { A: 14, K: 13, Q: 12, J: 11, T: 10 };
  const rch = s[0];
  const r = (rmap[rch] ?? (parseInt(rch, 10) as Rank)) as Rank;
  return { r, s: s[1] as Suit };
}

// Hand evaluator: returns numeric score (higher is better)
// Category (8=SF,7=4kind,6=full,5=flush,4=straight,3=trips,2=two-pair,1=pair,0=high) followed by tiebreaker ranks.
export function evalBest(cards: Card[]): { score: number; name: string } {
  // 5 from up to 7
  const combos = kCombos(cards, 5);
  let best = { score: -1, name: "" };
  for (const c of combos) {
    const r = evalFive(c);
    if (r.score > best.score) best = r;
  }
  return best;
}

function kCombos<T>(arr: T[], k: number): T[][] {
  const out: T[][] = [];
  const rec = (start: number, cur: T[]) => {
    if (cur.length === k) {
      out.push(cur.slice());
      return;
    }
    for (let i = start; i < arr.length; i++) {
      cur.push(arr[i]);
      rec(i + 1, cur);
      cur.pop();
    }
  };
  rec(0, []);
  return out;
}

function evalFive(cards: Card[]): { score: number; name: string } {
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
    if (uniq[0] - uniq[4] === 4) {
      isStraight = true;
      straightHigh = uniq[0];
    }
    // Wheel A-5
    if (uniq[0] === 14 && uniq[1] === 5 && uniq[2] === 4 && uniq[3] === 3 && uniq[4] === 2) {
      isStraight = true;
      straightHigh = 5;
    }
  }

  const pack = (cat: number, ...t: number[]) => {
    let s = cat;
    for (const v of t) s = s * 16 + v;
    return s;
  };

  if (isStraight && isFlush)
    return {
      score: pack(8, straightHigh),
      name: straightHigh === 14 ? "Royal Flush" : "Straight Flush",
    };
  if (groups[0].c === 4)
    return { score: pack(7, groups[0].r, groups[1].r), name: "Four of a Kind" };
  if (groups[0].c === 3 && groups[1].c === 2)
    return { score: pack(6, groups[0].r, groups[1].r), name: "Full House" };
  if (isFlush) return { score: pack(5, ...ranks), name: "Flush" };
  if (isStraight) return { score: pack(4, straightHigh), name: "Straight" };
  if (groups[0].c === 3)
    return { score: pack(3, groups[0].r, groups[1].r, groups[2].r), name: "Three of a Kind" };
  if (groups[0].c === 2 && groups[1].c === 2)
    return { score: pack(2, groups[0].r, groups[1].r, groups[2].r), name: "Two Pair" };
  if (groups[0].c === 2)
    return { score: pack(1, groups[0].r, groups[1].r, groups[2].r, groups[3].r), name: "Pair" };
  return { score: pack(0, ...ranks), name: "High Card" };
}
