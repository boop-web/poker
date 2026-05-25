import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Spade } from "lucide-react";

export const Route = createFileRoute("/login")({ component: LoginPage });

function LoginPage() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Welcome back");
    nav({ to: "/lobby" });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-felt-radial px-4">
      <div className="w-full max-w-md rounded-xl border border-gold/20 bg-card/80 p-8 backdrop-blur shadow-felt">
        <Link to="/" className="mb-6 flex items-center gap-2 font-display text-2xl text-gold">
          <Spade className="h-5 w-5" /> Poker
        </Link>
        <h1 className="font-display text-3xl">Sign in</h1>
        <p className="mt-1 text-sm text-muted-foreground">Welcome back to the table.</p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <input
            type="email"
            required
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-input bg-input/50 px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:border-gold focus:outline-none"
          />
          <input
            type="password"
            required
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-input bg-input/50 px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:border-gold focus:outline-none"
          />
          <button
            disabled={loading}
            type="submit"
            className="w-full rounded-md bg-primary py-2.5 font-medium text-primary-foreground hover:bg-accent disabled:opacity-50"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          New here?{" "}
          <Link to="/register" className="text-gold hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
