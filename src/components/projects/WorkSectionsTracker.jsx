import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Plus, Trash2, GripVertical, CheckCircle2, Circle, Clock, PauseCircle } from "lucide-react";

const STATUS_OPTS = ["not_started", "in_progress", "completed", "on_hold"];
const STATUS_ICONS = {
  not_started: <Circle className="h-3.5 w-3.5 text-muted-foreground" />,
  in_progress: <Clock className="h-3.5 w-3.5 text-blue-500" />,
  completed: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />,
  on_hold: <PauseCircle className="h-3.5 w-3.5 text-amber-500" />,
};
const STATUS_COLORS = {
  not_started: "bg-muted/50 text-muted-foreground",
  in_progress: "bg-blue-50 text-blue-700 border-blue-200",
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  on_hold: "bg-amber-50 text-amber-700 border-amber-200",
};

function newSection() {
  return { id: crypto.randomUUID(), title: "", start_date: "", end_date: "", progress_percent: 0, status: "not_started", assigned_to: "", notes: "" };
}

export default function WorkSectionsTracker({ sections = [], onChange, readOnly = false }) {
  const [expandedId, setExpandedId] = useState(null);

  const update = (id, field, value) => onChange(sections.map(s => s.id === id ? { ...s, [field]: value } : s));
  const add = () => { const s = newSection(); onChange([...sections, s]); setExpandedId(s.id); };
  const remove = (id) => onChange(sections.filter(s => s.id !== id));

  const overallProgress = sections.length > 0
    ? Math.round(sections.reduce((sum, s) => sum + (Number(s.progress_percent) || 0), 0) / sections.length)
    : 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold">Work Sections</h3>
          {sections.length > 0 && (
            <div className="flex items-center gap-1.5">
              <Progress value={overallProgress} className="h-1.5 w-20" />
              <span className="text-xs text-muted-foreground">{overallProgress}% overall</span>
            </div>
          )}
        </div>
        {!readOnly && <Button size="sm" variant="outline" onClick={add}><Plus className="h-3.5 w-3.5 mr-1" />Add Section</Button>}
      </div>

      {sections.length === 0 && (
        <p className="text-xs text-muted-foreground py-3 text-center border border-dashed rounded-lg">
          {readOnly ? "No work sections defined." : "Add work sections to track progress by area."}
        </p>
      )}

      <div className="space-y-2">
        {sections.map(section => (
          <div key={section.id} className="border rounded-lg overflow-hidden">
            {/* Row header */}
            <div
              className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-muted/20 bg-card"
              onClick={() => setExpandedId(expandedId === section.id ? null : section.id)}
            >
              <GripVertical className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                {readOnly ? (
                  <span className="text-sm font-medium">{section.title || "Untitled"}</span>
                ) : (
                  <Input
                    value={section.title}
                    onChange={e => { e.stopPropagation(); update(section.id, "title", e.target.value); }}
                    onClick={e => e.stopPropagation()}
                    placeholder="Section title…"
                    className="h-6 text-sm border-0 bg-transparent p-0 focus-visible:ring-0 font-medium"
                  />
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-[10px] px-1.5 py-0.5 rounded border flex items-center gap-1 ${STATUS_COLORS[section.status]}`}>
                  {STATUS_ICONS[section.status]}
                  {(section.status || "not_started").replace(/_/g, " ")}
                </span>
                <div className="flex items-center gap-1 w-20">
                  <Progress value={Number(section.progress_percent) || 0} className="h-1.5 flex-1" />
                  <span className="text-xs w-6 text-right">{section.progress_percent || 0}%</span>
                </div>
                {section.start_date && section.end_date && (
                  <span className="text-xs text-muted-foreground hidden sm:block">
                    {section.start_date} → {section.end_date}
                  </span>
                )}
                {!readOnly && (
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive shrink-0"
                    onClick={e => { e.stopPropagation(); remove(section.id); }}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>

            {/* Expanded details */}
            {expandedId === section.id && (
              <div className="px-3 pb-3 pt-2 border-t bg-muted/10 grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Start Date</label>
                  {readOnly
                    ? <p className="text-sm">{section.start_date || "—"}</p>
                    : <Input type="date" value={section.start_date} onChange={e => update(section.id, "start_date", e.target.value)} className="h-7 text-xs" />}
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">End Date</label>
                  {readOnly
                    ? <p className="text-sm">{section.end_date || "—"}</p>
                    : <Input type="date" value={section.end_date} onChange={e => update(section.id, "end_date", e.target.value)} className="h-7 text-xs" />}
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Progress (%)</label>
                  {readOnly
                    ? <p className="text-sm">{section.progress_percent || 0}%</p>
                    : <Input type="number" min="0" max="100" value={section.progress_percent} onChange={e => update(section.id, "progress_percent", Number(e.target.value))} className="h-7 text-xs" />}
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Status</label>
                  {readOnly
                    ? <p className="text-sm capitalize">{(section.status || "").replace(/_/g, " ")}</p>
                    : <Select value={section.status} onValueChange={v => update(section.id, "status", v)}>
                        <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>{STATUS_OPTS.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                      </Select>}
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Assigned To</label>
                  {readOnly
                    ? <p className="text-sm">{section.assigned_to || "—"}</p>
                    : <Input value={section.assigned_to} onChange={e => update(section.id, "assigned_to", e.target.value)} className="h-7 text-xs" placeholder="Name…" />}
                </div>
                <div className="space-y-1 col-span-2 sm:col-span-1">
                  <label className="text-xs text-muted-foreground">Notes</label>
                  {readOnly
                    ? <p className="text-sm">{section.notes || "—"}</p>
                    : <Input value={section.notes} onChange={e => update(section.id, "notes", e.target.value)} className="h-7 text-xs" placeholder="Notes…" />}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}