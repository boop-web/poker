import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { adminListUsers, adminUpdateUser, getMyContext, deleteTable } from "@/lib/poker.functions";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin")({ component: AdminPage });

function AdminPage() {
  const fetchCtx = useServerFn(getMyContext);
  const listUsers = useServerFn(adminListUsers);
  const updateUser = useServerFn(adminUpdateUser);
  const delTable = useServerFn(deleteTable);
  const qc = useQueryClient();
  const { data: ctx, isLoading } = useQuery({
    queryKey: ["my-context"],
    queryFn: () => fetchCtx(),
  });
  const { data: users } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => listUsers(),
    enabled: !!ctx?.isAdmin,
  });
  const [tables, setTables] = useState<any[]>([]);

  useEffect(() => {
    if (!ctx?.isAdmin) return;
    supabase
      .from("poker_tables")
      .select("*")
      .order("created_at")
      .then(({ data }) => setTables(data ?? []));
  }, [ctx?.isAdmin, users]);

  if (isLoading) return <div className="p-10 text-muted-foreground">Loading…</div>;
  if (!ctx?.isAdmin) return <div className="p-10 text-center text-destructive">Admin only.</div>;

  return (
    <main className="mx-auto max-w-6xl space-y-10 px-6 py-10">
      <section>
        <h1 className="mb-6 font-display text-4xl text-foreground">Admin</h1>

        <h2 className="mb-3 font-display text-xl text-gold">Users</h2>
        <div className="overflow-x-auto rounded-xl border border-gold/20 bg-card/70">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="p-3 text-left">User</th>
                <th className="p-3 text-right">Chips</th>
                <th className="p-3">Roles</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(users ?? []).map((u: any) => (
                <tr key={u.id} className="border-b border-border/40">
                  <td className="p-3">
                    {u.username}
                    <div className="text-xs text-muted-foreground">{u.id.slice(0, 8)}</div>
                  </td>
                  <td className="p-3 text-right font-mono text-gold">{u.chips.toLocaleString()}</td>
                  <td className="p-3 text-center">{u.roles.join(", ")}</td>
                  <td className="p-3 text-center">
                    {u.is_banned ? <span className="text-destructive">banned</span> : "active"}
                  </td>
                  <td className="p-3 text-right space-x-1">
                    <button
                      onClick={async () => {
                        const v = prompt("Set chips to:", String(u.chips));
                        if (v == null) return;
                        try {
                          await updateUser({ data: { userId: u.id, chips: parseInt(v) } });
                          qc.invalidateQueries();
                          toast.success("Updated");
                        } catch (e) {
                          toast.error((e as Error).message);
                        }
                      }}
                      className="rounded border border-border px-2 py-1 text-xs hover:bg-felt"
                    >
                      Chips
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          await updateUser({ data: { userId: u.id, isBanned: !u.is_banned } });
                          qc.invalidateQueries();
                        } catch (e) {
                          toast.error((e as Error).message);
                        }
                      }}
                      className="rounded border border-border px-2 py-1 text-xs hover:bg-felt"
                    >
                      {u.is_banned ? "Unban" : "Ban"}
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          await updateUser({
                            data: { userId: u.id, makeAdmin: !u.roles.includes("admin") },
                          });
                          qc.invalidateQueries();
                        } catch (e) {
                          toast.error((e as Error).message);
                        }
                      }}
                      className="rounded border border-gold/40 px-2 py-1 text-xs hover:bg-felt"
                    >
                      {u.roles.includes("admin") ? "Demote" : "Promote"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-display text-xl text-gold">Tables</h2>
        <div className="space-y-2">
          {tables.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between rounded border border-border bg-card/60 p-3"
            >
              <div>
                <div className="font-medium">{t.name}</div>
                <div className="text-xs text-muted-foreground">
                  {t.small_blind}/{t.big_blind} · {t.status}
                </div>
              </div>
              <button
                onClick={async () => {
                  if (!confirm(`Delete ${t.name}? Seated players will be refunded.`)) return;
                  try {
                    await delTable({ data: { tableId: t.id } });
                    setTables(tables.filter((x) => x.id !== t.id));
                    toast.success("Deleted");
                  } catch (e) {
                    toast.error((e as Error).message);
                  }
                }}
                className="rounded border border-destructive/40 px-3 py-1 text-xs text-destructive hover:bg-destructive/10"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
