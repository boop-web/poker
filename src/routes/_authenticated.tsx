import { createFileRoute, Outlet, redirect, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { getMyContext } from "@/lib/poker.functions";
import { Spade, LogOut, Shield } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/login" });
  },
  component: AuthLayout,
});

function AuthLayout() {
  const fetchCtx = useServerFn(getMyContext);
  const nav = useNavigate();
  const { data: ctx } = useQuery({ queryKey: ["my-context"], queryFn: () => fetchCtx() });

  const signOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out");
    nav({ to: "/" });
  };

  if (ctx?.profile?.is_banned) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-felt-radial px-4">
        <div className="max-w-md rounded-xl border border-destructive/30 bg-card/80 p-8 text-center">
          <h1 className="font-display text-2xl text-destructive">Account banned</h1>
          <p className="mt-2 text-muted-foreground">
            Your account has been suspended by an administrator.
          </p>
          <button onClick={signOut} className="mt-6 rounded-md bg-secondary px-5 py-2">
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-felt-radial">
      <header className="sticky top-0 z-20 border-b border-gold/20 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <Link to="/lobby" className="flex items-center gap-2 font-display text-xl text-gold">
            <Spade className="h-5 w-5" /> Lovable Poker
          </Link>
          <div className="flex items-center gap-4">
            {ctx?.profile && (
              <div className="hidden text-sm md:block">
                <span className="text-muted-foreground">{ctx.profile.username}</span>
                <span className="ml-3 font-mono text-gold">
                  {ctx.profile.chips.toLocaleString()} chips
                </span>
              </div>
            )}
            {ctx?.isAdmin && (
              <Link
                to="/admin"
                className="flex items-center gap-1.5 rounded-md border border-gold/40 px-3 py-1.5 text-sm hover:bg-felt"
              >
                <Shield className="h-4 w-4" /> Admin
              </Link>
            )}
            <button
              onClick={signOut}
              className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-felt"
            >
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>
        </div>
      </header>
      <Outlet />
    </div>
  );
}
