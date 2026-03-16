import React from "react";
import { differenceInCalendarDays, parseISO, isValid } from "date-fns";
import { AlertTriangle, CheckCircle2, Calendar } from "lucide-react";

function safeParse(d) {
  if (!d) return null;
  const parsed = parseISO(d);
  return isValid(parsed) ? parsed : null;
}

function DeltaBadge({ baseline, actual, label }) {
  const b = safeParse(baseline);
  const a = safeParse(actual);
  if (!b || !a) return null;
  const diff = differenceInCalendarDays(a, b);
  if (diff === 0) return <span className="text-[10px] text-emerald-600 font-medium">On schedule</span>;
  if (diff > 0) return <span className="text-[10px] text-red-500 font-medium">+{diff}d late</span>;
  return <span className="text-[10px] text-emerald-600 font-medium">{Math.abs(diff)}d early</span>;
}

export default function DateComparison({ project }) {
  const rows = [
    { label: "Start", baseline: project.baseline_start_date, actual: project.actual_start_date },
    { label: "Finish", baseline: project.baseline_end_date, actual: project.actual_end_date },
  ];

  return (
    <div className="rounded-lg border bg-card p-3 space-y-2">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
        <Calendar className="h-3.5 w-3.5" /> Programme
      </p>
      <div className="grid grid-cols-2 gap-2">
        {rows.map(row => (
          <div key={row.label} className="space-y-1">
            <p className="text-[10px] text-muted-foreground font-medium">{row.label}</p>
            <div className="flex flex-col gap-0.5">
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-muted-foreground">Baseline</span>
                <span className="text-xs font-medium">{row.baseline || "—"}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-muted-foreground">Actual</span>
                <span className="text-xs font-medium">{row.actual || "—"}</span>
              </div>
              <DeltaBadge baseline={row.baseline} actual={row.actual} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}