import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, ArrowRight, Clock, Plus, AlertTriangle } from "lucide-react";
import StatusBadge from "@/components/shared/StatusBadge";
import StatCard from "@/components/shared/StatCard";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const RIBA_STAGES = [
  { key: "stage_0", label: "Stage 0", sub: "Strategic Definition" },
  { key: "stage_1", label: "Stage 1", sub: "Preparation & Brief" },
  { key: "stage_2", label: "Stage 2", sub: "Concept Design" },
  { key: "stage_3", label: "Stage 3", sub: "Spatial Coordination" },
  { key: "stage_4", label: "Stage 4", sub: "Technical Design" },
  { key: "stage_5", label: "Stage 5", sub: "Manufacturing & Construction" },
  { key: "stage_6", label: "Stage 6", sub: "Handover" },
  { key: "stage_7", label: "Stage 7", sub: "Use" },
];
const PHASES = ["kick_off", "feasibility", "design", "pre_construction", "construction", "post_completion", "deliverable"];

const defaultForm = { title: "", project_name: "", phase: "kick_off", riba_stage: "stage_0", due_date: "", assigned_to: "", description: "", status: "pending" };

export default function WorkflowDashboard() {
  const [projectFilter, setProjectFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const queryClient = useQueryClient();

  const { data: projects = [] } = useQuery({ queryKey: ["projects"], queryFn: () => base44.entities.Project.list() });
  const { data: milestones = [] } = useQuery({ queryKey: ["milestones"], queryFn: () => base44.entities.Milestone.list("-created_date") });
  const { data: deliverables = [] } = useQuery({ queryKey: ["deliverables"], queryFn: () => base44.entities.Deliverable.list() });

  const createMut = useMutation({ mutationFn: d => base44.entities.Milestone.create(d), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["milestones"] }); setDialogOpen(false); } });
  const updateMut = useMutation({ mutationFn: ({ id, data }) => base44.entities.Milestone.update(id, data), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["milestones"] }) });

  const filtered = projectFilter === "all" ? milestones : milestones.filter(m => m.project_name === projectFilter);
  const overdue = filtered.filter(m => m.due_date && new Date(m.due_date) < new Date() && m.status !== "completed");
  const completed = filtered.filter(m => m.status === "completed");
  const pending = filtered.filter(m => m.status !== "completed");

  // Group by RIBA stage
  const byRiba = RIBA_STAGES.reduce((acc, s) => { acc[s.key] = filtered.filter(m => m.riba_stage === s.key || (m.phase && s.key === `stage_${PHASES.indexOf(m.phase)}`)); return acc; }, {});

  const toggleMilestone = m => {
    updateMut.mutate({ id: m.id, data: { status: m.status === "completed" ? "pending" : "completed", completed_date: m.status !== "completed" ? new Date().toISOString().split("T")[0] : null } });
  };

  const activeProjectList = projects.filter(p => p.status !== "closed");

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div><h1 className="font-bold text-xl">Workflow Dashboard</h1><p className="text-sm text-muted-foreground">Project lifecycle tracking aligned to RIBA Plan of Work 2020</p></div>
        <div className="flex items-center gap-2">
          <Select value={projectFilter} onValueChange={setProjectFilter}>
            <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">All Projects</SelectItem>{projects.map(p => <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>)}</SelectContent>
          </Select>
          <Button size="sm" onClick={() => { setForm(defaultForm); setDialogOpen(true); }}><Plus className="h-4 w-4 mr-1" /> Milestone</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard title="Total Milestones" value={filtered.length} icon={Circle} color="primary" />
        <StatCard title="Completed" value={completed.length} icon={CheckCircle2} color="green" />
        <StatCard title="Pending" value={pending.length} icon={Clock} color="accent" />
        <StatCard title="Overdue" value={overdue.length} icon={AlertTriangle} color="red" />
      </div>

      {/* Active Projects RIBA Overview */}
      <Card>
        <CardHeader className="py-3 px-4 border-b"><CardTitle className="text-sm font-semibold">Active Projects — RIBA Stage Progress</CardTitle></CardHeader>
        <CardContent className="p-4">
          {activeProjectList.length > 0 ? (
            <div className="space-y-4">
              {activeProjectList.map(proj => (
                <div key={proj.id} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{proj.name}</span>
                    <StatusBadge status={proj.status} />
                  </div>
                  <div className="flex items-center gap-1 overflow-x-auto">
                    {RIBA_STAGES.map((s, i) => {
                      const stageNum = parseInt(s.key.replace("stage_", ""));
                      const projStageNum = parseInt((proj.riba_stage || "stage_0").replace("stage_", ""));
                      const isPast = stageNum < projStageNum;
                      const isCurrent = stageNum === projStageNum;
                      return (
                        <React.Fragment key={s.key}>
                          <div className={cn("flex flex-col items-center justify-center px-2 py-1.5 rounded text-center min-w-[48px]", isPast ? "bg-emerald-100 text-emerald-700" : isCurrent ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                            <span className="text-[10px] font-bold">S{stageNum}</span>
                          </div>
                          {i < RIBA_STAGES.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />}
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-muted-foreground">No active projects</p>}
        </CardContent>
      </Card>

      {/* Milestones by RIBA Stage */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {RIBA_STAGES.map(stage => {
          const stageMilestones = filtered.filter(m => m.riba_stage === stage.key || m.phase === PHASES[parseInt(stage.key.replace("stage_", ""))]);
          if (stageMilestones.length === 0) return null;
          return (
            <Card key={stage.key}>
              <CardHeader className="py-3 px-4 border-b">
                <CardTitle className="text-sm font-semibold">{stage.label} — {stage.sub}</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {stageMilestones.map(m => {
                    const isOverdue = m.due_date && new Date(m.due_date) < new Date() && m.status !== "completed";
                    return (
                      <div key={m.id} className="flex items-start gap-3 p-3 hover:bg-muted/20 transition-colors">
                        <button onClick={() => toggleMilestone(m)} className="mt-0.5 shrink-0">
                          {m.status === "completed" ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : isOverdue ? <AlertTriangle className="h-5 w-5 text-red-500" /> : <Circle className="h-5 w-5 text-muted-foreground" />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className={cn("text-sm font-medium", m.status === "completed" && "line-through text-muted-foreground")}>{m.title}</p>
                          <div className="flex flex-wrap items-center gap-2 mt-0.5">
                            {projectFilter === "all" && <span className="text-[10px] bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded">{m.project_name}</span>}
                            {m.assigned_to && <span className="text-[10px] text-muted-foreground">{m.assigned_to}</span>}
                            {m.due_date && <span className={cn("text-[10px] flex items-center gap-0.5", isOverdue ? "text-red-500" : "text-muted-foreground")}><Clock className="h-3 w-3" />{format(new Date(m.due_date), "dd MMM yyyy")}</span>}
                          </div>
                        </div>
                        <StatusBadge status={m.status} />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Pending deliverables for selected project */}
      {projectFilter !== "all" && (
        <Card>
          <CardHeader className="py-3 px-4 border-b"><CardTitle className="text-sm font-semibold">Deliverables — {projectFilter}</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {deliverables.filter(d => d.project_name === projectFilter).map(d => (
                <div key={d.id} className="flex items-center justify-between p-3 hover:bg-muted/20">
                  <div>
                    <p className="text-sm font-medium">{d.title}</p>
                    <p className="text-xs text-muted-foreground capitalize">{(d.deliverable_type || "").replace(/_/g, " ")} · {d.riba_stage?.replace("stage_", "Stage ")}</p>
                  </div>
                  <StatusBadge status={d.overall_status} />
                </div>
              ))}
              {deliverables.filter(d => d.project_name === projectFilter).length === 0 && (
                <p className="p-4 text-sm text-muted-foreground">No deliverables for this project</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {filtered.length === 0 && (
        <Card className="p-10 text-center">
          <p className="text-muted-foreground">No milestones found. Create one to track your workflow.</p>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New Milestone</DialogTitle></DialogHeader>
          <form onSubmit={e => { e.preventDefault(); createMut.mutate(form); }} className="space-y-4">
            <div className="space-y-1.5"><Label>Title *</Label><Input value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))} required /></div>
            <div className="space-y-1.5"><Label>Project *</Label><Select value={form.project_name} onValueChange={v => setForm(f => ({...f, project_name: v}))}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{projects.map(p => <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>)}</SelectContent></Select></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>RIBA Stage</Label><Select value={form.riba_stage} onValueChange={v => setForm(f => ({...f, riba_stage: v}))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{RIBA_STAGES.map(s => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-1.5"><Label>Phase</Label><Select value={form.phase} onValueChange={v => setForm(f => ({...f, phase: v}))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{PHASES.map(p => <SelectItem key={p} value={p}>{p.replace(/_/g, " ")}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-1.5"><Label>Due Date</Label><Input type="date" value={form.due_date} onChange={e => setForm(f => ({...f, due_date: e.target.value}))} /></div>
              <div className="space-y-1.5"><Label>Assigned To</Label><Input value={form.assigned_to} onChange={e => setForm(f => ({...f, assigned_to: e.target.value}))} /></div>
            </div>
            <div className="space-y-1.5"><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} rows={2} /></div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button><Button type="submit">Create</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}