import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { getMyContext, joinSeat, leaveSeat, startHand, performAction } from "@/lib/poker.functions";
import { PlayingCard } from "@/components/poker/PlayingCard";
import { PotDisplay } from "@/components/poker/PotDisplay";
import { CommunityCards } from "@/components/poker/CommunityCards";
import { ActionBar } from "@/components/poker/ActionBar";
import { Seat } from "@/components/poker/Seat";
import { SitButton } from "@/components/poker/SitButton";
import { PlayersSidebar } from "@/components/poker/PlayersSidebar";
import { ChipAmount } from "@/components/poker/ChipStack";
import type { Card as CardType } from "@/lib/poker";
import { toast } from "sonner";
import { Spade, MessageCircle, SendHorizontal } from "lucide-react";

export const Route = createFileRoute("/_authenticated/table/$tableId")({ component: TablePage });

interface TableRow {
  id: string;
  name: string;
  small_blind: number;
  big_blind: number;
  max_seats: number;
  min_buyin: number;
  max_buyin: number;
  status: string;
  state: any;
}
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

function TablePage() {
  const { tableId } = Route.useParams();
  const fetchCtx = useServerFn(getMyContext);
  const joinFn = useServerFn(joinSeat);
  const leaveFn = useServerFn(leaveSeat);
  const startFn = useServerFn(startHand);
  const actFn = useServerFn(performAction);
  const { data: ctx } = useQuery({ queryKey: ["my-context"], queryFn: () => fetchCtx() });

  const [table, setTable] = useState<TableRow | null>(null);
  const [seats, setSeats] = useState<SeatRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, { username: string }>>({});
  const [myHole, setMyHole] = useState<CardType[]>([]);
  const [chats, setChats] = useState<
    { id: string; user_id: string; message: string; created_at: string }[]
  >([]);
  const [chatInput, setChatInput] = useState("");
  const [raiseAmt, setRaiseAmt] = useState(0);
  const [chatOpen, setChatOpen] = useState(false);

  const reload = async () => {
    const { data: t } = await supabase
      .from("poker_tables")
      .select("*")
      .eq("id", tableId)
      .maybeSingle();
    const { data: s } = await supabase
      .from("table_seats")
      .select("*")
      .eq("table_id", tableId)
      .order("seat_number");
    setTable(t as TableRow);
    setSeats((s ?? []) as SeatRow[]);
    const userIds = Array.from(new Set((s ?? []).map((x) => x.user_id)));
    if (userIds.length) {
      const { data: p } = await supabase.from("profiles").select("id, username").in("id", userIds);
      const m: Record<string, { username: string }> = {};
      (p ?? []).forEach((x) => {
        m[x.id] = { username: x.username };
      });
      setProfiles(m);
    }
    if (ctx?.profile?.id) {
      const { data: h } = await supabase
        .from("seat_holes")
        .select("hole_cards")
        .eq("user_id", ctx.profile.id)
        .eq("table_id", tableId)
        .maybeSingle();
      setMyHole((h?.hole_cards as CardType[]) ?? []);
    }
    const { data: c } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("table_id", tableId)
      .order("created_at", { ascending: false })
      .limit(50);
    setChats(((c ?? []) as any).reverse());
  };

  useEffect(() => {
    reload();
    const ch = supabase
      .channel(`table:${tableId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "poker_tables", filter: `id=eq.${tableId}` },
        reload,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "table_seats", filter: `table_id=eq.${tableId}` },
        reload,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "seat_holes", filter: `table_id=eq.${tableId}` },
        reload,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_messages", filter: `table_id=eq.${tableId}` },
        reload,
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [tableId, ctx?.profile?.id]);

  if (!table) return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-gold/30 border-t-gold" />
        <span className="font-display text-gold">Loading table…</span>
      </div>
    </div>
  );
  const mySeat = seats.find((s) => s.user_id === ctx?.profile?.id);
  const state = table.state || {};
  const isMyTurn = mySeat && state.current_seat === mySeat.seat_number && state.phase !== "idle";
  const toCall = mySeat ? Math.max(0, (state.current_bet ?? 0) - mySeat.current_bet) : 0;
  const board = (state.board ?? []) as CardType[];

  const act = async (action: "fold" | "check" | "call" | "raise" | "allin", amount?: number) => {
    try {
      await actFn({ data: { tableId, action, amount } });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const sendChat = async () => {
    if (!chatInput.trim() || !ctx?.profile?.id) return;
    await supabase
      .from("chat_messages")
      .insert({ table_id: tableId, user_id: ctx.profile.id, message: chatInput.trim() });
    setChatInput("");
  };

  const seatPositions = (() => {
    const out: { left: string; top: string }[] = [];
    const n = table.max_seats;
    for (let i = 0; i < n; i++) {
      const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
      out.push({ left: `${50 + 40 * Math.cos(angle)}%`, top: `${50 + 38 * Math.sin(angle)}%` });
    }
    return out;
  })();

  return (
    <div className="mx-auto flex min-h-[calc(100vh-64px)] max-w-7xl flex-col px-4 py-4">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-2xl text-foreground lg:text-3xl">{table.name}</h1>
            <span className="rounded-full bg-gold/15 px-3 py-0.5 font-mono text-[11px] text-gold">
              {table.small_blind}/{table.big_blind}
            </span>
            {state.phase !== "idle" && (
              <span className="rounded-full bg-emerald-900/30 px-3 py-0.5 font-mono text-[11px] text-emerald-400 uppercase tracking-wider">
                {state.phase}
              </span>
            )}
          </div>
          {state.last_summary && (
            <p className="mt-1 animate-fade-in-up text-xs text-muted-foreground">
              {state.last_summary}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {state.phase === "idle" && seats.length >= 2 && (
            <button
              onClick={async () => {
                try {
                  await startFn({ data: { tableId } });
                } catch (e) {
                  toast.error((e as Error).message);
                }
              }}
              className="rounded-xl bg-gradient-to-b from-gold to-amber-700 px-5 py-2.5 font-bold text-foreground shadow-lg transition-all hover:from-gold-bright hover:to-amber-600 active:scale-95"
            >
              Deal hand
            </button>
          )}
          {mySeat && (
            <button
              onClick={async () => {
                try {
                  await leaveFn({ data: { tableId } });
                  toast.success("Left table");
                } catch (e) {
                  toast.error((e as Error).message);
                }
              }}
              className="rounded-xl border border-destructive/30 px-4 py-2.5 text-sm font-medium text-destructive transition-all hover:bg-destructive/10 active:scale-95"
            >
              Stand up
            </button>
          )}
          <button
            onClick={() => setChatOpen(!chatOpen)}
            className="rounded-xl border border-gold/20 p-2.5 text-gold transition-all hover:bg-gold/10 lg:hidden"
          >
            <MessageCircle className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Main layout */}
      <div className="flex flex-1 gap-6">
        {/* Table area */}
        <div className="flex flex-1 flex-col">
          {/* Table */}
          <div className="relative mx-auto aspect-[16/10] w-full max-w-3xl rounded-[50%] border-[8px] border-[#3a1f0e] bg-felt-radial shadow-felt felt-texture">
            {/* Inner ring */}
            <div className="absolute inset-8 rounded-[50%] border border-gold/15" />
            <div className="absolute inset-12 rounded-[50%] border border-gold/5" />

            {/* Pot + community cards */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
              <PotDisplay pot={state.pot ?? 0} phase={state.phase} />
              {state.phase !== "idle" && state.phase !== "preflop" && (
                <div className="mt-2">
                  <CommunityCards board={board} phase={state.phase} />
                </div>
              )}
            </div>

            {/* Seats */}
            {seatPositions.map((pos, i) => {
              const seat = seats.find((s) => s.seat_number === i);
              const isMe = seat?.user_id === ctx?.profile?.id;
              const isActive = state.current_seat === i;
              const isDealer = state.dealer_seat === i;
              return (
                <div
                  key={i}
                  className="absolute -translate-x-1/2 -translate-y-1/2"
                  style={{ left: pos.left, top: pos.top }}
                >
                  {seat ? (
                    <Seat
                      seat={seat}
                      isMe={isMe}
                      isDealer={isDealer}
                      isActive={isActive}
                      username={profiles[seat.user_id]?.username ?? "…"}
                      myHole={isMe ? myHole : []}
                      phase={state.phase}
                      index={i}
                    />
                  ) : (
                    <SitButton
                      tableId={tableId}
                      seat={i}
                      minBuyin={table.min_buyin}
                      maxBuyin={table.max_buyin}
                      myChips={ctx?.profile?.chips ?? 0}
                      joinFn={joinFn}
                      disabled={!!mySeat}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Action bar */}
          <ActionBar
            isMyTurn={!!isMyTurn}
            toCall={toCall}
            myChips={mySeat?.chips ?? 0}
            myCurrentBet={mySeat?.current_bet ?? 0}
            currentBet={state.current_bet ?? 0}
            minRaise={state.min_raise ?? table.big_blind}
            bigBlind={table.big_blind}
            phase={state.phase}
            board={board}
            holeCards={myHole}
            raiseAmt={raiseAmt}
            setRaiseAmt={setRaiseAmt}
            onAct={act}
          />
        </div>

        {/* Right sidebar - desktop */}
        <aside className="hidden w-80 shrink-0 flex-col gap-4 lg:flex">
          {/* Players */}
          <PlayersSidebar
            seats={seats}
            profiles={profiles}
            myUserId={ctx?.profile?.id}
            dealerSeat={state.dealer_seat}
            currentSeat={state.current_seat}
            phase={state.phase}
          />

          {/* Chat */}
          <div className="flex flex-1 flex-col rounded-xl border border-gold/20 bg-card/60 shadow-lg backdrop-blur">
            <div className="flex items-center gap-2 border-b border-gold/10 px-5 py-3">
              <MessageCircle className="h-4 w-4 text-gold" />
              <h3 className="font-display text-sm tracking-wider text-gold">Chat</h3>
            </div>
            <div className="flex-1 space-y-1.5 overflow-y-auto px-4 py-3 text-sm" style={{ maxHeight: "280px" }}>
              {chats.length === 0 ? (
                <p className="py-8 text-center text-xs text-muted-foreground">No messages yet</p>
              ) : (
                chats.map((m) => (
                  <div key={m.id} className="animate-fade-in-up rounded-lg bg-black/10 px-2.5 py-1.5">
                    <span className="text-xs font-semibold text-gold">
                      {profiles[m.user_id]?.username ?? "…"}:
                    </span>{" "}
                    <span className="text-xs text-muted-foreground">{m.message}</span>
                  </div>
                ))
              )}
            </div>
            <div className="flex items-center gap-2 border-t border-gold/10 px-4 py-3">
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendChat()}
                placeholder="Say something…"
                className="flex-1 rounded-lg border border-input bg-background/50 px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:border-gold focus:ring-1 focus:ring-gold"
              />
              <button
                onClick={sendChat}
                className="rounded-lg bg-gradient-to-b from-gold to-amber-700 p-2 text-foreground transition-all hover:from-gold-bright hover:to-amber-600 active:scale-95"
              >
                <SendHorizontal className="h-4 w-4" />
              </button>
            </div>
          </div>
        </aside>
      </div>

      {/* Mobile chat drawer */}
      {chatOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setChatOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex h-2/3 w-full flex-col rounded-t-2xl border border-gold/20 bg-card p-4 shadow-2xl animate-fade-in-up"
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-display text-lg text-gold">Table chat</h3>
              <button onClick={() => setChatOpen(false)} className="text-muted-foreground">✕</button>
            </div>
            <div className="flex-1 space-y-1.5 overflow-y-auto text-sm">
              {chats.map((m) => (
                <div key={m.id}>
                  <span className="text-gold">{profiles[m.user_id]?.username ?? "…"}:</span>{" "}
                  <span className="text-muted-foreground">{m.message}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendChat()}
                placeholder="Say something…"
                className="flex-1 rounded-lg border border-input bg-background/50 px-3 py-2 text-sm outline-none focus:border-gold"
              />
              <button
                onClick={sendChat}
                className="rounded-lg bg-gold px-3 font-medium text-foreground"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
