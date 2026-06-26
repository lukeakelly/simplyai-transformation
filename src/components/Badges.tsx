import { STATUS_COLORS, PRIORITY_COLORS } from "@/lib/constants";

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function StatusBadge({ status }: { status: string }) {
  const color = STATUS_COLORS[status] ?? "#94a3b8";
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap"
      style={{ background: hexToRgba(color, 0.14), color }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ background: color }}
      />
      {status}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority?: string | null }) {
  if (!priority) return <span className="text-xs text-slate-400">&mdash;</span>;
  const color = PRIORITY_COLORS[priority] ?? "#94a3b8";
  return (
    <span
      className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold whitespace-nowrap"
      style={{ background: hexToRgba(color, 0.14), color }}
    >
      {priority}
    </span>
  );
}

export function OriginBadge({ origin }: { origin?: string | null }) {
  if (!origin) return null;
  const isDora = origin === "Dora";
  const color = isDora ? "#7c3aed" : "#0891b2";
  return (
    <span
      className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold whitespace-nowrap"
      style={{ background: hexToRgba(color, 0.14), color }}
      title={
        isDora
          ? "Sourced from the Project Dora sheet"
          : "From the Transformation Plan only"
      }
    >
      {isDora ? "Dora" : "Transformation Plan"}
    </span>
  );
}

export function Pill({
  children,
  color,
}: {
  children: React.ReactNode;
  color?: string;
}) {
  const c = color ?? "#64748b";
  return (
    <span
      className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap"
      style={{ background: hexToRgba(c, 0.12), color: c }}
    >
      {children}
    </span>
  );
}
