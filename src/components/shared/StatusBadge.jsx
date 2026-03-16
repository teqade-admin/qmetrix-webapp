import React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const colorMap = {
  active: "bg-emerald-100 text-emerald-700 border-emerald-200",
  won: "bg-emerald-100 text-emerald-700 border-emerald-200",
  paid: "bg-emerald-100 text-emerald-700 border-emerald-200",
  completed: "bg-emerald-100 text-emerald-700 border-emerald-200",
  approved: "bg-emerald-100 text-emerald-700 border-emerald-200",
  issued: "bg-emerald-100 text-emerald-700 border-emerald-200",
  in_progress: "bg-blue-100 text-blue-700 border-blue-200",
  submitted: "bg-blue-100 text-blue-700 border-blue-200",
  sent: "bg-blue-100 text-blue-700 border-blue-200",
  under_review: "bg-violet-100 text-violet-700 border-violet-200",
  in_review: "bg-violet-100 text-violet-700 border-violet-200",
  pending: "bg-amber-100 text-amber-700 border-amber-200",
  draft: "bg-slate-100 text-slate-600 border-slate-200",
  planned: "bg-slate-100 text-slate-600 border-slate-200",
  not_started: "bg-slate-100 text-slate-500 border-slate-200",
  lost: "bg-red-100 text-red-700 border-red-200",
  overdue: "bg-red-100 text-red-700 border-red-200",
  rejected: "bg-red-100 text-red-700 border-red-200",
  cancelled: "bg-red-100 text-red-700 border-red-200",
  terminated: "bg-red-100 text-red-700 border-red-200",
  withdrawn: "bg-slate-100 text-slate-500 border-slate-200",
  on_leave: "bg-purple-100 text-purple-700 border-purple-200",
  closed: "bg-slate-100 text-slate-500 border-slate-200",
  kick_off: "bg-indigo-100 text-indigo-700 border-indigo-200",
  feasibility: "bg-cyan-100 text-cyan-700 border-cyan-200",
  design: "bg-violet-100 text-violet-700 border-violet-200",
  pre_construction: "bg-amber-100 text-amber-700 border-amber-200",
  construction: "bg-orange-100 text-orange-700 border-orange-200",
  post_completion: "bg-teal-100 text-teal-700 border-teal-200",
  exceptional: "bg-emerald-100 text-emerald-700 border-emerald-200",
  exceeds_expectations: "bg-blue-100 text-blue-700 border-blue-200",
  meets_expectations: "bg-slate-100 text-slate-700 border-slate-200",
  needs_improvement: "bg-amber-100 text-amber-700 border-amber-200",
  unsatisfactory: "bg-red-100 text-red-700 border-red-200",
};

export default function StatusBadge({ status, className }) {
  if (!status) return null;
  const label = status.replace(/_/g, " ");
  return (
    <Badge variant="outline" className={cn("capitalize text-[11px] font-medium px-2 py-0.5 whitespace-nowrap", colorMap[status] || "bg-secondary text-secondary-foreground", className)}>
      {label}
    </Badge>
  );
}