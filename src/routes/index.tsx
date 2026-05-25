import { createFileRoute, Link } from "@tanstack/react-router";
import { Spade, Heart, Diamond, Club } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Lovable Poker — Texas Hold'em" },
      {
        name: "description",
        content: "Play multiplayer Texas Hold'em poker with friends. Free play-chip casino.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-felt-radial">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
          backgroundSize: "24px 24px",
        }}
      />
      <nav className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2 font-display text-2xl text-gold">
          <Spade className="h-6 w-6" /> Lovable Poker
        </div>
        <div className="flex gap-3">
          <Link
            to="/login"
            className="rounded-md border border-gold/40 px-4 py-2 text-sm text-foreground hover:bg-felt"
          >
            Sign in
          </Link>
          <Link
            to="/register"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-accent shadow-gold"
          >
            Play free
          </Link>
        </div>
      </nav>

      <main className="relative z-10 mx-auto max-w-5xl px-6 pt-20 pb-32 text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-gold/30 bg-felt/50 px-4 py-1.5 text-xs uppercase tracking-widest text-gold">
          <Heart className="h-3 w-3" /> No-Limit Texas Hold'em <Diamond className="h-3 w-3" />
        </div>
        <h1 className="font-display text-6xl leading-tight text-foreground md:text-8xl">
          The felt is <span className="text-gold">waiting.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          Real-time multiplayer Hold'em with friends. Sign up, grab a seat, and let the cards fall
          where they may.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <Link
            to="/register"
            className="rounded-md bg-primary px-8 py-3 font-medium text-primary-foreground hover:bg-accent shadow-gold"
          >
            Create free account
          </Link>
          <Link
            to="/lobby"
            className="rounded-md border border-gold/40 px-8 py-3 font-medium text-foreground hover:bg-felt"
          >
            Enter lobby
          </Link>
        </div>

        <div className="mt-24 grid gap-6 md:grid-cols-3">
          {[
            {
              icon: Spade,
              title: "Live tables",
              desc: "Up to 6 players per table, blinds posted, dealer button rotating.",
            },
            {
              icon: Club,
              title: "Real-time sync",
              desc: "Every fold, raise, and river card streams instantly to all players.",
            },
            {
              icon: Diamond,
              title: "Play chips",
              desc: "10,000 chips on signup. Top-ups via admin. Pure play money, no risk.",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="rounded-lg border border-gold/20 bg-card/60 p-6 text-left backdrop-blur"
            >
              <f.icon className="mb-3 h-5 w-5 text-gold" />
              <h3 className="font-display text-xl">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
