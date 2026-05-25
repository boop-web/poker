import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { freshDeck, shuffle, evalBest, type Card } from "./poker";

// ---- Types ----
type Phase = "idle" | "preflop" | "flop" | "turn" | "river" | "showdown";

interface TableState {
  phase: Phase;
  hand_id: string | null;
  board: Card[];
  pot: number;
  current_bet: number;
  min_raise: number;
  dealer_seat: number | null;
  current_seat: number | null;
  deck: Card[];
  last_aggressor: number | null;
  contributions: Record<string, number>; // seat_number -> total this hand
}

interface SeatRow {
  id: string;
  table_id: string;
  user_id: string;
  seat_number: number;
  chips: number;
  current_bet: number;
  has_folded: boolean;
  is_all_in: boolean;
  has_acted: boolean;
  sitting_out: boolean;
}

interface TableRow {
  id: string;
  small_blind: number;
  big_blind: number;
  max_seats: number;
  min_buyin: number;
  max_buyin: number;
  status: string;
  state: TableState;
}

function emptyState(): TableState {
  return {
    phase: "idle",
    hand_id: null,
    board: [],
    pot: 0,
    current_bet: 0,
    min_raise: 0,
    dealer_seat: null,
    current_seat: null,
    deck: [],
    last_aggressor: null,
    contributions: {},
  };
}

async function loadTable(tableId: string): Promise<TableRow> {
  const { data, error } = await supabaseAdmin
    .from("poker_tables")
    .select("*")
    .eq("id", tableId)
    .single();
  if (error || !data) throw new Error("Table not found");
  return data as unknown as TableRow;
}

async function loadSeats(tableId: string): Promise<SeatRow[]> {
  const { data, error } = await supabaseAdmin
    .from("table_seats")
    .select("*")
    .eq("table_id", tableId)
    .order("seat_number");
  if (error) throw error;
  return (data ?? []) as unknown as SeatRow[];
}

async function isAdmin(userId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  return !!data;
}

// Find next active seat (chips > 0 and !folded) going clockwise from "from" (exclusive)
function nextActiveSeat(
  seats: SeatRow[],
  from: number,
  maxSeats: number,
  includeAllIn = false,
): number | null {
  for (let i = 1; i <= maxSeats; i++) {
    const sn = (from + i) % maxSeats;
    const s = seats.find((x) => x.seat_number === sn);
    if (!s) continue;
    if (s.has_folded) continue;
    if (!includeAllIn && s.is_all_in) continue;
    return sn;
  }
  return null;
}

function activeInHand(seats: SeatRow[]): SeatRow[] {
  return seats.filter((s) => !s.has_folded);
}

function bettingClosed(seats: SeatRow[]): boolean {
  const active = activeInHand(seats).filter((s) => !s.is_all_in);
  if (active.length === 0) return true; // everyone all-in
  const maxBet = Math.max(...active.map((s) => s.current_bet));
  return active.every((s) => s.has_acted && s.current_bet === maxBet);
}

async function endHand(table: TableRow, seats: SeatRow[], reason: "fold" | "showdown") {
  const state = table.state;
  // Move current_bet -> contributions
  for (const s of seats) {
    state.contributions[s.seat_number] = (state.contributions[s.seat_number] ?? 0) + s.current_bet;
  }
  const remaining = activeInHand(seats);

  // Compute pots (main + side pots)
  // Levels = distinct total contributions of players who reached showdown (or fold-winners get all)
  let summary = "";
  if (remaining.length === 1) {
    const winner = remaining[0];
    const total = Object.values(state.contributions).reduce((a, b) => a + b, 0);
    await supabaseAdmin
      .from("table_seats")
      .update({ chips: winner.chips + total })
      .eq("id", winner.id);
    summary = `${winner.user_id.slice(0, 8)} wins ${total} (uncontested)`;
    if (state.hand_id) {
      await supabaseAdmin
        .from("hands")
        .update({
          ended_at: new Date().toISOString(),
          pot: total,
          winner_user_id: winner.user_id,
          winner_seat: winner.seat_number,
          summary,
        })
        .eq("id", state.hand_id);
    }
  } else {
    // Showdown — fetch hole cards for remaining
    const { data: holes } = await supabaseAdmin
      .from("seat_holes")
      .select("*")
      .in(
        "seat_id",
        remaining.map((s) => s.id),
      );
    const handsBySeat: Record<number, { score: number; name: string; cards: Card[] }> = {};
    for (const r of remaining) {
      const h = holes?.find((x) => x.seat_id === r.id);
      const hc = (h?.hole_cards as Card[]) ?? [];
      const ev = evalBest([...hc, ...state.board]);
      handsBySeat[r.seat_number] = { ...ev, cards: hc };
    }

    // Build pot levels
    const allContribs = Object.entries(state.contributions).map(([sn, amt]) => ({
      sn: Number(sn),
      amt,
    }));
    const levels = Array.from(new Set(allContribs.map((c) => c.amt))).sort((a, b) => a - b);
    const winnings: Record<number, number> = {};
    let prevLevel = 0;
    for (const level of levels) {
      const slice = level - prevLevel;
      const potSize = allContribs.reduce(
        (sum, c) => sum + Math.min(Math.max(c.amt - prevLevel, 0), slice),
        0,
      );
      const eligible = remaining.filter((s) => (state.contributions[s.seat_number] ?? 0) >= level);
      if (eligible.length === 0 || potSize === 0) {
        prevLevel = level;
        continue;
      }
      const bestScore = Math.max(...eligible.map((s) => handsBySeat[s.seat_number].score));
      const winners = eligible.filter((s) => handsBySeat[s.seat_number].score === bestScore);
      const share = Math.floor(potSize / winners.length);
      const remainder = potSize - share * winners.length;
      winners.forEach((w, i) => {
        winnings[w.seat_number] =
          (winnings[w.seat_number] ?? 0) + share + (i === 0 ? remainder : 0);
      });
      prevLevel = level;
    }

    const summaries: string[] = [];
    for (const [sn, amt] of Object.entries(winnings)) {
      const seat = seats.find((s) => s.seat_number === Number(sn))!;
      await supabaseAdmin
        .from("table_seats")
        .update({ chips: seat.chips + amt })
        .eq("id", seat.id);
      summaries.push(`Seat ${sn} wins ${amt} (${handsBySeat[Number(sn)].name})`);
    }
    summary = summaries.join(" · ");
    const topWinnerSn = Number(Object.entries(winnings).sort((a, b) => b[1] - a[1])[0]?.[0] ?? -1);
    const topWinner = seats.find((s) => s.seat_number === topWinnerSn);
    if (state.hand_id) {
      await supabaseAdmin
        .from("hands")
        .update({
          ended_at: new Date().toISOString(),
          pot: Object.values(winnings).reduce((a, b) => a + b, 0),
          winner_user_id: topWinner?.user_id ?? null,
          winner_seat: topWinnerSn,
          summary,
          board: state.board,
        })
        .eq("id", state.hand_id);
    }
  }

  // Reset per-hand fields
  await supabaseAdmin
    .from("table_seats")
    .update({
      current_bet: 0,
      has_folded: false,
      is_all_in: false,
      has_acted: false,
    })
    .eq("table_id", table.id);
  await supabaseAdmin.from("seat_holes").delete().eq("table_id", table.id);

  // Remove broke players (chips = 0)
  const fresh = await loadSeats(table.id);
  const broke = fresh.filter((s) => s.chips <= 0);
  if (broke.length) {
    await supabaseAdmin
      .from("table_seats")
      .delete()
      .in(
        "id",
        broke.map((b) => b.id),
      );
  }

  // Set table to waiting; mark winner/summary into state for clients
  const newState = { ...emptyState(), dealer_seat: state.dealer_seat };
  await supabaseAdmin
    .from("poker_tables")
    .update({
      status: "waiting",
      state: { ...newState, last_summary: summary, last_board: state.board } as never,
    })
    .eq("id", table.id);
}

async function advanceStreet(table: TableRow, seats: SeatRow[]) {
  const state = table.state;
  // Sweep current_bet -> contributions, reset current_bet for next street
  for (const s of seats) {
    state.contributions[s.seat_number] = (state.contributions[s.seat_number] ?? 0) + s.current_bet;
  }
  await supabaseAdmin
    .from("table_seats")
    .update({ current_bet: 0, has_acted: false })
    .eq("table_id", table.id);
  // Re-mark all-in players as acted (they can't act)
  for (const s of seats) {
    if (s.is_all_in) {
      await supabaseAdmin.from("table_seats").update({ has_acted: true }).eq("id", s.id);
    }
  }

  state.current_bet = 0;
  state.min_raise = table.big_blind;
  state.last_aggressor = null;

  const nextPhase: Record<Phase, Phase> = {
    idle: "idle",
    preflop: "flop",
    flop: "turn",
    turn: "river",
    river: "showdown",
    showdown: "showdown",
  };
  state.phase = nextPhase[state.phase];

  if (state.phase === "flop") {
    state.board.push(state.deck.pop()!, state.deck.pop()!, state.deck.pop()!);
  } else if (state.phase === "turn" || state.phase === "river") {
    state.board.push(state.deck.pop()!);
  }

  if (state.phase === "showdown") {
    await supabaseAdmin
      .from("poker_tables")
      .update({ state: state as never })
      .eq("id", table.id);
    const fresh = await loadSeats(table.id);
    await endHand({ ...table, state }, fresh, "showdown");
    return;
  }

  // Set current_seat to first active player left of dealer
  const fresh = await loadSeats(table.id);
  const next = nextActiveSeat(fresh, state.dealer_seat ?? 0, table.max_seats);
  state.current_seat = next;
  await supabaseAdmin
    .from("poker_tables")
    .update({ state: state as never })
    .eq("id", table.id);

  // If everyone's all-in, auto-advance until showdown
  const stillCanAct = fresh.filter((s) => !s.has_folded && !s.is_all_in);
  if (stillCanAct.length <= 1) {
    const t2 = await loadTable(table.id);
    const s2 = await loadSeats(table.id);
    await advanceStreet(t2, s2);
  }
}

// ---- Server functions ----

const Empty = z.object({}).optional();

export const getMyContext = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const userId = context.userId;
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    return {
      profile,
      isAdmin: !!roles?.find((r) => r.role === "admin"),
      roles: roles?.map((r) => r.role) ?? [],
    };
  });

export const createTable = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        name: z.string().min(1).max(60),
        smallBlind: z.number().int().min(1).max(10000),
        bigBlind: z.number().int().min(2).max(20000),
        maxSeats: z.number().int().min(2).max(9),
        minBuyin: z.number().int().min(10),
        maxBuyin: z.number().int().min(10),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    if (!(await isAdmin(context.userId))) throw new Error("Admin only");
    const { data: row, error } = await supabaseAdmin
      .from("poker_tables")
      .insert({
        name: data.name,
        small_blind: data.smallBlind,
        big_blind: data.bigBlind,
        max_seats: data.maxSeats,
        min_buyin: data.minBuyin,
        max_buyin: data.maxBuyin,
      })
      .select()
      .single();
    if (error) throw error;
    return row;
  });

export const deleteTable = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ tableId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    if (!(await isAdmin(context.userId))) throw new Error("Admin only");
    // Refund seated chips
    const seats = await loadSeats(data.tableId);
    for (const s of seats) {
      const { data: p } = await supabaseAdmin
        .from("profiles")
        .select("chips")
        .eq("id", s.user_id)
        .single();
      await supabaseAdmin
        .from("profiles")
        .update({ chips: (p?.chips ?? 0) + s.chips })
        .eq("id", s.user_id);
    }
    await supabaseAdmin.from("poker_tables").delete().eq("id", data.tableId);
    return { ok: true };
  });

export const joinSeat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        tableId: z.string().uuid(),
        seatNumber: z.number().int().min(0).max(8),
        buyin: z.number().int().min(1),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const userId = context.userId;
    const { data: prof } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    if (!prof) throw new Error("Profile missing");
    if (prof.is_banned) throw new Error("Account banned");
    const table = await loadTable(data.tableId);
    if (data.buyin < table.min_buyin || data.buyin > table.max_buyin)
      throw new Error("Buy-in out of range");
    if (data.buyin > prof.chips) throw new Error("Not enough chips");

    const seats = await loadSeats(data.tableId);
    if (seats.find((s) => s.user_id === userId)) throw new Error("Already seated at this table");
    if (seats.find((s) => s.seat_number === data.seatNumber)) throw new Error("Seat taken");
    if (data.seatNumber >= table.max_seats) throw new Error("Invalid seat");

    await supabaseAdmin
      .from("profiles")
      .update({ chips: prof.chips - data.buyin })
      .eq("id", userId);
    const { error } = await supabaseAdmin.from("table_seats").insert({
      table_id: data.tableId,
      user_id: userId,
      seat_number: data.seatNumber,
      chips: data.buyin,
    });
    if (error) throw error;
    return { ok: true };
  });

export const leaveSeat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ tableId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const userId = context.userId;
    const { data: seat } = await supabaseAdmin
      .from("table_seats")
      .select("*")
      .eq("table_id", data.tableId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!seat) return { ok: true };
    // Forfeit any current_bet (already committed to pot)
    const { data: prof } = await supabaseAdmin
      .from("profiles")
      .select("chips")
      .eq("id", userId)
      .single();
    await supabaseAdmin
      .from("profiles")
      .update({ chips: (prof?.chips ?? 0) + seat.chips })
      .eq("id", userId);
    // Mark folded if a hand is in progress
    const table = await loadTable(data.tableId);
    if (table.state.phase !== "idle" && table.state.current_seat === seat.seat_number) {
      // Auto-fold and advance
      await supabaseAdmin
        .from("table_seats")
        .update({ has_folded: true, has_acted: true, chips: 0 })
        .eq("id", seat.id);
      const seats = await loadSeats(data.tableId);
      if (activeInHand(seats).length <= 1) {
        await endHand(table, seats, "fold");
      } else {
        const next = nextActiveSeat(seats, seat.seat_number, table.max_seats);
        table.state.current_seat = next;
        await supabaseAdmin
          .from("poker_tables")
          .update({ state: table.state as never })
          .eq("id", table.id);
      }
    }
    await supabaseAdmin.from("table_seats").delete().eq("id", seat.id);
    return { ok: true };
  });

export const startHand = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ tableId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const table = await loadTable(data.tableId);
    if (table.state.phase !== "idle") throw new Error("Hand already in progress");
    const seats = (await loadSeats(data.tableId)).filter((s) => s.chips > 0 && !s.sitting_out);
    if (seats.length < 2) throw new Error("Need at least 2 players");

    // Reset per-hand fields
    await supabaseAdmin
      .from("table_seats")
      .update({
        current_bet: 0,
        has_folded: false,
        is_all_in: false,
        has_acted: false,
      })
      .eq("table_id", data.tableId);

    // Rotate dealer
    const prevDealer = table.state.dealer_seat ?? -1;
    const seatNums = seats.map((s) => s.seat_number).sort((a, b) => a - b);
    let dealer = seatNums.find((n) => n > prevDealer) ?? seatNums[0];

    // Deal
    const deck = shuffle(freshDeck());
    const fresh = await loadSeats(data.tableId);
    const seated = fresh
      .filter((s) => seats.find((x) => x.id === s.id))
      .sort((a, b) => a.seat_number - b.seat_number);
    for (const s of seated) {
      const hc = [deck.pop()!, deck.pop()!];
      await supabaseAdmin
        .from("seat_holes")
        .upsert({ seat_id: s.id, user_id: s.user_id, table_id: data.tableId, hole_cards: hc });
    }

    // Determine SB/BB and first to act
    const order = (() => {
      const idx = seated.findIndex((s) => s.seat_number === dealer);
      return seated.slice(idx).concat(seated.slice(0, idx));
    })();
    const isHeadsUp = seated.length === 2;
    const sbSeat = isHeadsUp ? order[0] : order[1];
    const bbSeat = isHeadsUp ? order[1] : order[2 % order.length];
    const firstToAct = isHeadsUp ? sbSeat : (order[3 % order.length] ?? order[0]);

    // Post blinds (cap by chips for all-in)
    const sb = Math.min(table.small_blind, sbSeat.chips);
    const bb = Math.min(table.big_blind, bbSeat.chips);
    await supabaseAdmin
      .from("table_seats")
      .update({
        chips: sbSeat.chips - sb,
        current_bet: sb,
        is_all_in: sbSeat.chips - sb === 0,
      })
      .eq("id", sbSeat.id);
    await supabaseAdmin
      .from("table_seats")
      .update({
        chips: bbSeat.chips - bb,
        current_bet: bb,
        is_all_in: bbSeat.chips - bb === 0,
      })
      .eq("id", bbSeat.id);

    const { data: hand, error: hErr } = await supabaseAdmin
      .from("hands")
      .insert({
        table_id: data.tableId,
        board: [],
        pot: 0,
      })
      .select()
      .single();
    if (hErr) throw hErr;

    const state: TableState = {
      phase: "preflop",
      hand_id: hand.id,
      board: [],
      pot: sb + bb,
      current_bet: table.big_blind,
      min_raise: table.big_blind,
      dealer_seat: dealer,
      current_seat: firstToAct.seat_number,
      deck,
      last_aggressor: bbSeat.seat_number,
      contributions: {},
    };
    await supabaseAdmin
      .from("poker_tables")
      .update({ status: "playing", state: state as never })
      .eq("id", table.id);
    return { ok: true };
  });

export const performAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        tableId: z.string().uuid(),
        action: z.enum(["fold", "check", "call", "bet", "raise", "allin"]),
        amount: z.number().int().min(0).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const userId = context.userId;
    let table = await loadTable(data.tableId);
    let seats = await loadSeats(data.tableId);
    const me = seats.find((s) => s.user_id === userId);
    if (!me) throw new Error("Not at this table");
    if (table.state.current_seat !== me.seat_number) throw new Error("Not your turn");
    if (me.has_folded) throw new Error("Already folded");

    const state = table.state;
    const toCall = Math.max(0, state.current_bet - me.current_bet);
    const updates: Partial<SeatRow> = { has_acted: true };

    switch (data.action) {
      case "fold":
        updates.has_folded = true;
        break;
      case "check":
        if (toCall > 0) throw new Error("Cannot check, must call or fold");
        break;
      case "call": {
        const pay = Math.min(toCall, me.chips);
        updates.current_bet = me.current_bet + pay;
        updates.chips = me.chips - pay;
        if (updates.chips === 0) updates.is_all_in = true;
        state.pot += pay;
        break;
      }
      case "bet":
      case "raise": {
        const amount = data.amount ?? 0;
        if (amount > me.chips + me.current_bet) throw new Error("Not enough chips");
        if (amount <= state.current_bet) throw new Error("Raise must exceed current bet");
        const minTotal = state.current_bet + state.min_raise;
        if (amount < minTotal && amount !== me.chips + me.current_bet)
          throw new Error(`Min raise to ${minTotal}`);
        const pay = amount - me.current_bet;
        updates.current_bet = amount;
        updates.chips = me.chips - pay;
        if (updates.chips === 0) updates.is_all_in = true;
        state.pot += pay;
        state.min_raise = amount - state.current_bet;
        state.current_bet = amount;
        state.last_aggressor = me.seat_number;
        // Reset has_acted for others still in
        await supabaseAdmin
          .from("table_seats")
          .update({ has_acted: false })
          .eq("table_id", data.tableId)
          .neq("id", me.id)
          .eq("has_folded", false)
          .eq("is_all_in", false);
        break;
      }
      case "allin": {
        const newTotal = me.current_bet + me.chips;
        const pay = me.chips;
        updates.current_bet = newTotal;
        updates.chips = 0;
        updates.is_all_in = true;
        state.pot += pay;
        if (newTotal > state.current_bet) {
          state.min_raise = Math.max(state.min_raise, newTotal - state.current_bet);
          state.current_bet = newTotal;
          state.last_aggressor = me.seat_number;
          await supabaseAdmin
            .from("table_seats")
            .update({ has_acted: false })
            .eq("table_id", data.tableId)
            .neq("id", me.id)
            .eq("has_folded", false)
            .eq("is_all_in", false);
        }
        break;
      }
    }

    await supabaseAdmin.from("table_seats").update(updates).eq("id", me.id);
    if (state.hand_id) {
      await supabaseAdmin.from("hand_actions").insert({
        hand_id: state.hand_id,
        user_id: userId,
        action: data.action,
        amount: updates.current_bet ?? 0,
        phase: state.phase,
      });
    }

    seats = await loadSeats(data.tableId);
    // Only one left?
    if (activeInHand(seats).length === 1) {
      await supabaseAdmin
        .from("poker_tables")
        .update({ state: state as never })
        .eq("id", table.id);
      const fresh = await loadTable(table.id);
      await endHand(fresh, seats, "fold");
      return { ok: true };
    }

    if (bettingClosed(seats)) {
      await supabaseAdmin
        .from("poker_tables")
        .update({ state: state as never })
        .eq("id", table.id);
      const t2 = await loadTable(table.id);
      const s2 = await loadSeats(table.id);
      await advanceStreet(t2, s2);
      return { ok: true };
    }

    // Next seat
    const next = nextActiveSeat(seats, me.seat_number, table.max_seats);
    state.current_seat = next;
    await supabaseAdmin
      .from("poker_tables")
      .update({ state: state as never })
      .eq("id", table.id);
    return { ok: true };
  });

// ---- Admin ----

export const adminListUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    if (!(await isAdmin(context.userId))) throw new Error("Admin only");
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });
    const { data: roles } = await supabaseAdmin.from("user_roles").select("*");
    return (profiles ?? []).map((p) => ({
      ...p,
      roles: roles?.filter((r) => r.user_id === p.id).map((r) => r.role) ?? [],
    }));
  });

export const adminUpdateUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        userId: z.string().uuid(),
        chips: z.number().int().min(0).optional(),
        isBanned: z.boolean().optional(),
        makeAdmin: z.boolean().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    if (!(await isAdmin(context.userId))) throw new Error("Admin only");
    const patch: { chips?: number; is_banned?: boolean } = {};
    if (data.chips !== undefined) patch.chips = data.chips;
    if (data.isBanned !== undefined) patch.is_banned = data.isBanned;
    if (Object.keys(patch).length) {
      await supabaseAdmin.from("profiles").update(patch).eq("id", data.userId);
    }
    if (data.makeAdmin) {
      await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: data.userId, role: "admin" }, { onConflict: "user_id,role" });
    } else if (data.makeAdmin === false) {
      await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", data.userId)
        .eq("role", "admin");
    }
    return { ok: true };
  });

// Bootstrap: first ever user becomes admin
export const claimFirstAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { count } = await supabaseAdmin
      .from("user_roles")
      .select("*", { count: "exact", head: true })
      .eq("role", "admin");
    if ((count ?? 0) > 0) throw new Error("Admin already exists");
    await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: context.userId, role: "admin" }, { onConflict: "user_id,role" });
    return { ok: true };
  });
