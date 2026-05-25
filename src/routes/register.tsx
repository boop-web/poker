import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Spade } from "lucide-react";

export const Route = createFileRoute("/register")({ component: RegisterPage });

function RegisterPage() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) return toast.error("Password must be at least 6 characters");
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username))
      return toast.error("Username: 3-20 letters, digits, underscores");
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin + "/lobby",
        data: { username, display_name: username },
      },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Account created — check your email to confirm");
    nav({ to: "/login" });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-felt-radial px-4 py-12">
      <div className="w-full max-w-md rounded-xl border border-gold/20 bg-card/80 p-8 backdrop-blur shadow-felt">
        <Link to="/" className="mb-6 flex items-center gap-2 font-display text-2xl text-gold">
          <Spade className="h-5 w-5" /> Poker
        </Link>
        <h1 className="font-display text-3xl">Join the table</h1>
        <p className="mt-1 text-sm text-muted-foreground">10,000 free chips on signup.</p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <input
            required
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full rounded-md border border-input bg-input/50 px-4 py-2.5 focus:border-gold focus:outline-none"
          />
          <input
            type="email"
            required
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-input bg-input/50 px-4 py-2.5 focus:border-gold focus:outline-none"
          />
          <input
            type="password"
            required
            placeholder="Password (min 6)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-input bg-input/50 px-4 py-2.5 focus:border-gold focus:outline-none"
          />
          <button
            disabled={loading}
            type="submit"
            className="w-full rounded-md bg-primary py-2.5 font-medium text-primary-foreground hover:bg-accent disabled:opacity-50"
          >
            {loading ? "Creating…" : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link to="/login" className="text-gold hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
