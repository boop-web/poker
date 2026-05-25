import { memo } from "react";

const CHIPS_DISPLAY = [
  { value: 10000, color: "from-orange-500 to-orange-700", label: "10K" },
  { value: 5000, color: "from-violet-500 to-violet-700", label: "5K" },
  { value: 1000, color: "from-blue-500 to-blue-700", label: "1K" },
  { value: 500, color: "from-emerald-500 to-emerald-700", label: "500" },
  { value: 100, color: "from-stone-300 to-stone-400", label: "100", text: "text-stone-800" },
  { value: 25, color: "from-cyan-500 to-cyan-700", label: "25" },
  { value: 5, color: "from-rose-500 to-rose-700", label: "5" },
  { value: 1, color: "from-white to-stone-200", label: "1", text: "text-stone-700" },
];

export const ChipStack = memo(function ChipStack({
  amount,
  size = "sm",
  animate = false,
}: {
  amount: number;
  size?: "sm" | "md";
  animate?: boolean;
}) {
  if (amount <= 0) return null;

  const chips: { value: number; count: number }[] = [];
  let remaining = amount;
  for (const chip of CHIPS_DISPLAY) {
    if (remaining <= 0) break;
    const count = Math.floor(remaining / chip.value);
    if (count > 0) {
      chips.push({ value: chip.value, count });
      remaining -= count * chip.value;
    }
  }

  const chipH = size === "md" ? "h-8" : "h-5";
  const chipW = size === "md" ? "w-8" : "w-5";
  const maxShow = size === "md" ? 4 : 3;
  const shown = chips.slice(0, maxShow);

  return (
    <div className="flex items-end gap-px">
      {shown.map((chip, i) => {
        const color = CHIPS_DISPLAY.find((c) => c.value === chip.value)!;
        return (
          <div
            key={chip.value}
            className={`${chipH} ${chipW} gpu relative flex items-center justify-center rounded-full border border-white/15 bg-gradient-to-b ${color.color} shadow-sm`}
            style={{
              zIndex: shown.length - i,
              marginLeft: i > 0 ? "-3px" : "0",
              opacity: animate ? 0 : 1,
              animation: animate ? `chip-stack 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94) ${i * 0.04}s both` : undefined,
            }}
          >
            <span className={`font-bold leading-none ${color.text ?? "text-white/90"}`}
              style={{ fontSize: chipH === "h-5" ? "5px" : "6px" }}
            >
              {color.label}
            </span>
          </div>
        );
      })}
      {chips.length > maxShow && (
        <div className={`${chipH} flex items-center text-[8px] tracking-tighter text-gold/70`}>+{chips.length - maxShow}</div>
      )}
    </div>
  );
});

export const ChipAmount = memo(function ChipAmount({
  amount,
  className = "",
}: {
  amount: number;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-1.5 font-mono font-bold tracking-tight ${className}`}>
      <span className="inline-block h-2 w-2 rounded-full bg-gradient-to-br from-gold to-amber-600 ring-1 ring-white/20 shrink-0" />
      <span className="chip-counter">{amount.toLocaleString()}</span>
    </span>
  );
});
