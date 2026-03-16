import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle, Clock, Upload, FileCheck, AlertCircle, Pencil, Trash2 } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import StatCard from "@/components/shared/StatCard";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";

const RIBA_STAGES = ["stage_0", "stage_1", "stage_2", "stage_3", "stage_4", "stage_5", "stage_6", "stage_7"];
const RIBA_LABELS = { stage_0: "Stage 0", stage_1: "Stage 1", stage_2: "Stage 2", stage_3: "Stage 3", stage_4: "Stage 4", stage_5: "Stage 5", stage_6: "Stage 6", stage_7: "Stage 7" };
const DELIVERABLE_TYPES = ["cost_plan", "boq", "feasibility_report", "procurement_strategy", "tender_report", "cost_report", "final_account", "specification", "other"];

const OCRA_STEPS = [
  { key: "originator", label: "Originator", statusKey: "originator_status", color: "bg-blue-100 text-blue-700" },
  { key: "checker", label: "Checker", statusKey: "checker_status", color: "bg-violet-100 text-violet-700" },
  { key: "reviewer", label: "Reviewer", statusKey: "reviewer_status", color: "bg-amber-100 text-amber-700" },
  { key: "authoriser", label: "Authoriser", statusKey: "authoriser_status", color: "bg-emerald-100 text-emerald-700" },
];

const defaultForm = { title: "", project_name: "", riba_stage: "stage_0", deliverable_type: "", due_date: "", originator: "", checker: "", reviewer: "", authoriser: "", overall_status: "not_started", version: "v1.0", comments: "" };

export default function DeliveryModule() {
  const [tab, setTab] = useState("deliverables");
  const [projectFilter, setProjectFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [selectedDeliverable, setSelectedDeliverable] = useState(null);
  const queryClient = useQueryClient();

  const { data: deliverables = [] } = useQuery({ queryKey: ["deliverables"], queryFn: () => base44.entities.Deliverable.list("-created_date") });
  const { data: projects = [] } = useQuery({ queryKey: ["projects"], queryFn: () => base44.entities.Project.list() });
  const { data: employees = [] } = useQuery({ queryKey: ["employees"], queryFn: () => base44.entities.Employee.list() });

  const createMut = useMutation({ mutationFn: d => base44.entities.Deliverable.create(d), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["deliverables"] }); setDialogOpen(false); } });
  const updateMut = useMutation({ mutationFn: ({ id, data }) => base44.entities.Deliverable.update(id, data), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["deliverables"] }); setDialogOpen(false); setEditing(null); if (selectedDeliverable?.id === id) { queryClient.invalidateQueries(); } } });
  const deleteMut = useMutation({ mutationFn: id => base44.entities.Deliverable.delete(id), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["deliverables"] }); setDeleteId(null); } });

  const openNew = () => { setEditing(null); setForm(defaultForm); setDialogOpen(true); };
  const openEdit = d => { setEditing(d); setForm({ ...defaultForm, ...d }); setDialogOpen(true); };
  const handleSave = e => { e.preventDefault(); editing ? updateMut.mutate({ id: editing.id, data: form }) : createMut.mutate(form); };

  const advanceOCRA = (deliverable, step) => {
    const updates = { [step.statusKey]: step.statusKey === "authoriser_status" ? "approved" : "approved" };
    if (step.key === "authoriser") updates.overall_status = "approved";
    else if (step.key === "originator") updates.overall_status = "in_progress";
    else if (step.key === "checker") updates.overall_status = "under_review";
    updateMut.mutate({ id: deliverable.id, data: updates });
  };

  const filtered = deliverables.filter(d => projectFilter === "all" || d.project_name === projectFilter);
  const byRiba = RIBA_STAGES.reduce((acc, s) => { acc[s] = filtered.filter(d => d.riba_stage === s); return acc; }, {});

  const pending = deliverables.filter(d => ["under_review", "in_progress"].includes(d.overall_status)).length;
  const approved = deliverables.filter(d => d.overall_status === "approved").length;
  const overdue = deliverables.filter(d => d.due_date && new Date(d.due_date) < new Date() && d.overall_status !== "approved").length;

  return (
    <div className="space-y-4">
      <PageHeader title="Delivery Module" description="QA/QC workflow using OCRA — Originator, Checker, Reviewer, Authoriser" actionLabel="New Deliverable" onAction={openNew}>
        <Select value={projectFilter} onValueChange={setProjectFilter}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All Projects</SelectItem>{projects.map(p => <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>)}</SelectContent>
        </Select>
      </PageHeader>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard title="Total" value={deliverables.length} icon={FileCheck} color="primary" />
        <StatCard title="In Progress" value={pending} icon={Clock} color="accent" />
        <StatCard title="Approved" value={approved} icon={CheckCircle2} color="green" />
        <StatCard title="Overdue" value={overdue} icon={AlertCircle} color="red" />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="deliverables">All Deliverables</TabsTrigger>
          <TabsTrigger value="by_stage">By RIBA Stage</TabsTrigger>
          <TabsTrigger value="approvals">Pending Approvals</TabsTrigger>
        </TabsList>

        <TabsContent value="deliverables" className="mt-4">
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-muted/30">
                  <th className="text-left p-3 font-medium text-muted-foreground">Deliverable</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Project</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">RIBA</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Type</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Due</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">OCRA Status</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Overall</th>
                  <th className="p-3 w-20"></th>
                </tr></thead>
                <tbody>
                  {filtered.map(d => (
                    <tr key={d.id} className="border-b hover:bg-muted/20 cursor-pointer" onClick={() => setSelectedDeliverable(d)}>
                      <td className="p-3 font-medium">{d.title}</td>
                      <td className="p-3 text-muted-foreground text-xs">{d.project_name}</td>
                      <td className="p-3 text-xs">{(d.riba_stage || "").replace("stage_", "S")}</td>
                      <td className="p-3 text-xs capitalize">{(d.deliverable_type || "").replace(/_/g, " ")}</td>
                      <td className="p-3 text-xs">{d.due_date ? format(new Date(d.due_date), "dd MMM yy") : "—"}</td>
                      <td className="p-3">
                        <div className="flex gap-1">
                          {OCRA_STEPS.map(step => {
                            const status = d[step.statusKey];
                            return <span key={step.key} title={`${step.label}: ${status || "pending"}`} className={cn("h-2 w-2 rounded-full", status === "approved" || status === "completed" ? "bg-emerald-500" : status === "in_progress" ? "bg-blue-500" : "bg-slate-200")} />;
                          })}
                        </div>
                      </td>
                      <td className="p-3"><StatusBadge status={d.overall_status} /></td>
                      <td className="p-3" onClick={e => e.stopPropagation()}>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(d)}><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(d.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">No deliverables found</td></tr>}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="by_stage" className="mt-4">
          <div className="space-y-4">
            {RIBA_STAGES.map(stage => {
              const stageDels = byRiba[stage];
              if (stageDels.length === 0) return null;
              return (
                <Card key={stage}>
                  <CardHeader className="py-3 px-4 border-b"><CardTitle className="text-sm font-semibold">{RIBA_LABELS[stage]} — {stageDels.length} deliverable{stageDels.length > 1 ? "s" : ""}</CardTitle></CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y">
                      {stageDels.map(d => (
                        <div key={d.id} className="flex items-center justify-between p-3 hover:bg-muted/20">
                          <div>
                            <p className="text-sm font-medium">{d.title}</p>
                            <p className="text-xs text-muted-foreground">{d.project_name} · {d.due_date ? format(new Date(d.due_date), "dd MMM yyyy") : "No due date"}</p>
                          </div>
                          <StatusBadge status={d.overall_status} />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="approvals" className="mt-4">
          <div className="space-y-4">
            {deliverables.filter(d => ["under_review", "in_progress", "not_started"].includes(d.overall_status)).map(d => (
              <Card key={d.id} className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div><p className="font-semibold">{d.title}</p><p className="text-sm text-muted-foreground">{d.project_name} · {RIBA_LABELS[d.riba_stage]}</p></div>
                  <StatusBadge status={d.overall_status} />
                </div>
                {/* OCRA Workflow */}
                <div className="flex items-center gap-2 flex-wrap">
                  {OCRA_STEPS.map((step, i) => {
                    const status = d[step.statusKey];
                    const isActive = status === "in_progress" || (status === "pending" && OCRA_STEPS.slice(0, i).every(s => d[s.statusKey] === "approved" || d[s.statusKey] === "completed"));
                    const isDone = status === "approved" || status === "completed";
                    return (
                      <React.Fragment key={step.key}>
                        <div className={cn("flex flex-col items-center p-2 rounded-lg border min-w-[80px] text-center", isDone ? "bg-emerald-50 border-emerald-200" : isActive ? "bg-amber-50 border-amber-200" : "bg-muted border-border")}>
                          {isDone ? <CheckCircle2 className="h-4 w-4 text-emerald-600 mb-1" /> : isActive ? <Clock className="h-4 w-4 text-amber-600 mb-1" /> : <Circle className="h-4 w-4 text-muted-foreground mb-1" />}
                          <p className="text-[10px] font-semibold">{step.label}</p>
                          <p className="text-[10px] text-muted-foreground capitalize">{d[step.key] || "—"}</p>
                          {isActive && !isDone && (
                            <Button size="sm" variant="outline" className="mt-1 h-6 text-[10px] px-2" onClick={() => advanceOCRA(d, step)}>Approve</Button>
                          )}
                        </div>
                        {i < OCRA_STEPS.length - 1 && <div className="text-muted-foreground text-xs">→</div>}
                      </React.Fragment>
                    );
                  })}
                </div>
              </Card>
            ))}
            {deliverables.filter(d => ["under_review", "in_progress", "not_started"].includes(d.overall_status)).length === 0 && (
              <Card className="p-8 text-center"><p className="text-muted-foreground">No pending approvals</p></Card>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Deliverable Detail Dialog */}
      {selectedDeliverable && (
        <Dialog open={!!selectedDeliverable} onOpenChange={() => setSelectedDeliverable(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{selectedDeliverable.title}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[["Project", selectedDeliverable.project_name], ["RIBA Stage", RIBA_LABELS[selectedDeliverable.riba_stage]], ["Type", (selectedDeliverable.deliverable_type || "").replace(/_/g, " ")], ["Due Date", selectedDeliverable.due_date ? format(new Date(selectedDeliverable.due_date), "dd MMM yyyy") : "—"], ["Version", selectedDeliverable.version || "—"]].map(([l, v]) => (
                  <div key={l}><p className="text-xs text-muted-foreground">{l}</p><p className="font-medium capitalize">{v || "—"}</p></div>
                ))}
              </div>
              <div>
                <p className="text-xs font-semibold mb-2">OCRA Workflow</p>
                <div className="space-y-2">
                  {OCRA_STEPS.map(step => (
                    <div key={step.key} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        {(selectedDeliverable[step.statusKey] === "approved" || selectedDeliverable[step.statusKey] === "completed") ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <Circle className="h-4 w-4 text-muted-foreground" />}
                        <span className="font-medium">{step.label}</span>
                        <span className="text-muted-foreground">{selectedDeliverable[step.key] || "Unassigned"}</span>
                      </div>
                      <StatusBadge status={selectedDeliverable[step.statusKey] || "pending"} />
                    </div>
                  ))}
                </div>
              </div>
              {selectedDeliverable.comments && <div><p className="text-xs text-muted-foreground mb-1">Comments</p><p className="text-sm">{selectedDeliverable.comments}</p></div>}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Form Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Deliverable" : "New Deliverable"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 col-span-2"><Label>Title *</Label><Input value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))} required /></div>
              <div className="space-y-1.5"><Label>Project *</Label><Select value={form.project_name} onValueChange={v => setForm(f => ({...f, project_name: v}))}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{projects.map(p => <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-1.5"><Label>RIBA Stage *</Label><Select value={form.riba_stage} onValueChange={v => setForm(f => ({...f, riba_stage: v}))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{RIBA_STAGES.map(s => <SelectItem key={s} value={s}>{RIBA_LABELS[s]}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-1.5"><Label>Deliverable Type</Label><Select value={form.deliverable_type} onValueChange={v => setForm(f => ({...f, deliverable_type: v}))}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{DELIVERABLE_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-1.5"><Label>Due Date</Label><Input type="date" value={form.due_date} onChange={e => setForm(f => ({...f, due_date: e.target.value}))} /></div>
              <div className="space-y-1.5"><Label>Version</Label><Input value={form.version} onChange={e => setForm(f => ({...f, version: e.target.value}))} placeholder="v1.0" /></div>
              <div className="space-y-1.5"><Label>Overall Status</Label><Select value={form.overall_status} onValueChange={v => setForm(f => ({...f, overall_status: v}))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["not_started","in_progress","under_review","approved","rejected","issued"].map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div className="border rounded-lg p-4 space-y-3 bg-muted/20">
              <p className="text-sm font-semibold">OCRA Assignments</p>
              <div className="grid grid-cols-2 gap-3">
                {OCRA_STEPS.map(step => (
                  <div key={step.key} className="space-y-1.5">
                    <Label>{step.label}</Label>
                    <Select value={form[step.key]} onValueChange={v => setForm(f => ({...f, [step.key]: v}))}>
                      <SelectTrigger><SelectValue placeholder="Assign" /></SelectTrigger>
                      <SelectContent>{employees.map(e => <SelectItem key={e.id} value={e.full_name}>{e.full_name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-1.5"><Label>Comments</Label><Textarea value={form.comments} onChange={e => setForm(f => ({...f, comments: e.target.value}))} rows={2} /></div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button><Button type="submit">{editing ? "Update" : "Create"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete Deliverable</AlertDialogTitle><AlertDialogDescription>This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteMut.mutate(deleteId)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}