import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { createTable, getMyContext, claimFirstAdmin } from "@/lib/poker.functions";
import { toast } from "sonner";
import { Plus, Users, Coins } from "lucide-react";

export const Route = createFileRoute("/_authenticated/lobby")({ component: Lobby });

type TableRow = {
  id: string;
  name: string;
  small_blind: number;
  big_blind: number;
  max_seats: number;
  min_buyin: number;
  max_buyin: number;
  status: string;
};

function Lobby() {
  const qc = useQueryClient();
  const fetchCtx = useServerFn(getMyContext);
  const createFn = useServerFn(createTable);
  const claimAdmin = useServerFn(claimFirstAdmin);
  const { data: ctx } = useQuery({ queryKey: ["my-context"], queryFn: () => fetchCtx() });

  const [tables, setTables] = useState<TableRow[]>([]);
  const [seatCounts, setSeatCounts] = useState<Record<string, number>>({});
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: t } = await supabase.from("poker_tables").select("*").order("created_at");
      const { data: s } = await supabase.from("table_seats").select("table_id");
      setTables((t ?? []) as TableRow[]);
      const counts: Record<string, number> = {};
      (s ?? []).forEach((r) => {
        counts[r.table_id] = (counts[r.table_id] ?? 0) + 1;
      });
      setSeatCounts(counts);
    };
    load();
    const ch = supabase
      .channel("lobby")
      .on("postgres_changes", { event: "*", schema: "public", table: "poker_tables" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "table_seats" }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="font-display text-4xl text-foreground">Lobby</h1>
          <p className="mt-1 text-muted-foreground">Pick a table and grab a seat.</p>
        </div>
        <div className="flex gap-2">
          {ctx && !ctx.isAdmin && (
            <button
              onClick={async () => {
                try {
                  await claimAdmin();
                  toast.success("You are now admin");
                  qc.invalidateQueries();
                } catch (e) {
                  toast.error((e as Error).message);
                }
              }}
              className="rounded-md border border-gold/40 px-4 py-2 text-sm hover:bg-felt"
            >
              Claim admin
            </button>
          )}
          {ctx?.isAdmin && (
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-accent"
            >
              <Plus className="h-4 w-4" /> New table
            </button>
          )}
        </div>
      </div>

      {tables.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gold/30 p-12 text-center">
          <p className="text-muted-foreground">No tables open yet.</p>
          {ctx?.isAdmin && (
            <p className="mt-2 text-sm text-muted-foreground">Create one to get started.</p>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {tables.map((t) => (
            <Link
              key={t.id}
              to="/table/$tableId"
              params={{ tableId: t.id }}
              className="group rounded-xl border border-gold/20 bg-card/70 p-5 backdrop-blur transition hover:border-gold hover:shadow-gold"
            >
              <div className="flex items-start justify-between">
                <h3 className="font-display text-xl text-foreground">{t.name}</h3>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${t.status === "playing" ? "bg-destructive/20 text-destructive" : "bg-felt text-gold"}`}
                >
                  {t.status}
                </span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Coins className="h-4 w-4 text-gold" /> {t.small_blind}/{t.big_blind}
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users className="h-4 w-4 text-gold" /> {seatCounts[t.id] ?? 0}/{t.max_seats}
                </div>
              </div>
              <div className="mt-3 text-xs text-muted-foreground">
                Buy-in: {t.min_buyin}–{t.max_buyin}
              </div>
            </Link>
          ))}
        </div>
      )}

      {showCreate && (
        <CreateTableModal
          onClose={() => setShowCreate(false)}
          onCreate={async (v) => {
            try {
              await createFn({ data: v });
              toast.success("Table created");
              setShowCreate(false);
            } catch (e) {
              toast.error((e as Error).message);
            }
          }}
        />
      )}
    </main>
  );
}

function CreateTableModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (v: {
    name: string;
    smallBlind: number;
    bigBlind: number;
    maxSeats: number;
    minBuyin: number;
    maxBuyin: number;
  }) => Promise<void>;
}) {
  const [name, setName] = useState("New Table");
  const [sb, setSb] = useState(10);
  const [bb, setBb] = useState(20);
  const [seats, setSeats] = useState(6);
  const [minB, setMinB] = useState(400);
  const [maxB, setMaxB] = useState(4000);
  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-xl border border-gold/30 bg-card p-6 shadow-felt"
      >
        <h3 className="font-display text-2xl">Create table</h3>
        <div className="mt-4 space-y-3">
          <Field label="Name">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded border border-input bg-input/50 px-3 py-2"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Small blind">
              <input
                type="number"
                value={sb}
                onChange={(e) => setSb(+e.target.value)}
                className="w-full rounded border border-input bg-input/50 px-3 py-2"
              />
            </Field>
            <Field label="Big blind">
              <input
                type="number"
                value={bb}
                onChange={(e) => setBb(+e.target.value)}
                className="w-full rounded border border-input bg-input/50 px-3 py-2"
              />
            </Field>
            <Field label="Seats">
              <input
                type="number"
                min={2}
                max={9}
                value={seats}
                onChange={(e) => setSeats(+e.target.value)}
                className="w-full rounded border border-input bg-input/50 px-3 py-2"
              />
            </Field>
            <Field label="Min buy-in">
              <input
                type="number"
                value={minB}
                onChange={(e) => setMinB(+e.target.value)}
                className="w-full rounded border border-input bg-input/50 px-3 py-2"
              />
            </Field>
            <Field label="Max buy-in">
              <input
                type="number"
                value={maxB}
                onChange={(e) => setMaxB(+e.target.value)}
                className="w-full rounded border border-input bg-input/50 px-3 py-2"
              />
            </Field>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded border border-border px-4 py-2 hover:bg-felt"
          >
            Cancel
          </button>
          <button
            onClick={() =>
              onCreate({
                name,
                smallBlind: sb,
                bigBlind: bb,
                maxSeats: seats,
                minBuyin: minB,
                maxBuyin: maxB,
              })
            }
            className="rounded bg-primary px-4 py-2 font-medium text-primary-foreground hover:bg-accent"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      {children}
    </label>
  );
}
