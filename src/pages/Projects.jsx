import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { Pencil, Trash2, Search, FolderKanban, TrendingUp, DollarSign, ChevronDown, ChevronUp } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import StatCard from "@/components/shared/StatCard";
import EmptyState from "@/components/shared/EmptyState";
import WorkSectionsTracker from "@/components/projects/WorkSectionsTracker";
import DateComparison from "@/components/projects/DateComparison";

const SECTORS = ["residential","commercial","infrastructure","healthcare","education","industrial","mixed_use","government","other"];
const STATUSES = ["kick_off","feasibility","design","pre_construction","construction","post_completion","closed"];
const RIBA_STAGES = ["stage_0","stage_1","stage_2","stage_3","stage_4","stage_5","stage_6","stage_7"];

const defaultForm = {
  name: "", client_name: "", project_code: "", description: "", sector: "",
  project_value: "", fee_agreed: "", fee_invoiced: "", cost_to_date: "",
  status: "kick_off", riba_stage: "stage_0", project_manager: "",
  start_date: "", end_date: "",
  baseline_start_date: "", baseline_end_date: "",
  actual_start_date: "", actual_end_date: "",
  progress_percent: "", budgeted_hours: "", actual_hours: "",
  work_sections: []
};

export default function Projects() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [expandedId, setExpandedId] = useState(null);
  const [formTab, setFormTab] = useState("details");

  const queryClient = useQueryClient();

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: () => base44.entities.Project.list("-created_date")
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => base44.entities.Employee.list()
  });

  const createMut = useMutation({
    mutationFn: d => base44.entities.Project.create(d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["projects"] }); setDialogOpen(false); }
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Project.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["projects"] }); setDialogOpen(false); setEditing(null); }
  });

  const deleteMut = useMutation({
    mutationFn: id => base44.entities.Project.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["projects"] }); setDeleteId(null); }
  });

  const openNew = () => { setEditing(null); setForm(defaultForm); setFormTab("details"); setDialogOpen(true); };
  const openEdit = p => {
    setEditing(p);
    setForm({ ...defaultForm, ...p,
      project_value: p.project_value ?? "", fee_agreed: p.fee_agreed ?? "",
      fee_invoiced: p.fee_invoiced ?? "", cost_to_date: p.cost_to_date ?? "",
      progress_percent: p.progress_percent ?? "", budgeted_hours: p.budgeted_hours ?? "",
      actual_hours: p.actual_hours ?? "", work_sections: p.work_sections || []
    });
    setFormTab("details");
    setDialogOpen(true);
  };

  const handleSave = e => {
    e.preventDefault();
    const data = {
      ...form,
      project_value: form.project_value !== "" ? Number(form.project_value) : undefined,
      fee_agreed: form.fee_agreed !== "" ? Number(form.fee_agreed) : undefined,
      fee_invoiced: form.fee_invoiced !== "" ? Number(form.fee_invoiced) : undefined,
      cost_to_date: form.cost_to_date !== "" ? Number(form.cost_to_date) : undefined,
      progress_percent: form.progress_percent !== "" ? Number(form.progress_percent) : undefined,
      budgeted_hours: form.budgeted_hours !== "" ? Number(form.budgeted_hours) : undefined,
      actual_hours: form.actual_hours !== "" ? Number(form.actual_hours) : undefined,
    };
    if (editing) {
      const { id, ...updateData } = data;
      updateMut.mutate({ id: editing.id, data: updateData });
    } else {
      createMut.mutate(data);
    }
  };

  const filtered = projects.filter(p => {
    const matchSearch = !search || p.name?.toLowerCase().includes(search.toLowerCase()) || p.client_name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const activeProjects = projects.filter(p => p.status !== "closed");
  const totalFee = projects.reduce((s, p) => s + (p.fee_agreed || 0), 0);
  const totalInvoiced = projects.reduce((s, p) => s + (p.fee_invoiced || 0), 0);
  const avgProgress = projects.length ? Math.round(projects.reduce((s, p) => s + (p.progress_percent || 0), 0) / projects.length) : 0;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Projects"
        description="Manage active projects, track programme and work sections"
        actionLabel="New Project"
        onAction={openNew}
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard title="Active Projects" value={activeProjects.length} icon={FolderKanban} color="primary" />
        <StatCard title="Avg Progress" value={`${avgProgress}%`} icon={TrendingUp} color="green" />
        <StatCard title="Total Fee Agreed" value={`£${(totalFee/1000).toFixed(0)}k`} icon={DollarSign} color="accent" />
        <StatCard title="Total Invoiced" value={`£${(totalInvoiced/1000).toFixed(0)}k`} icon={DollarSign} color="blue" />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search projects or clients…" value={search} onChange={e => setSearch(e.target.value)} className="pl-8" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Project List */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading…</div>
      ) : filtered.length === 0 ? (
        <EmptyState title="No projects found" actionLabel="New Project" onAction={openNew} />
      ) : (
        <div className="space-y-3">
          {filtered.map(project => (
            <Card key={project.id} className="overflow-hidden">
              {/* Project row header */}
              <div
                className="flex items-start gap-4 p-4 cursor-pointer hover:bg-muted/20 transition-colors"
                onClick={() => setExpandedId(expandedId === project.id ? null : project.id)}
              >
                <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm truncate">{project.name}</p>
                      {project.project_code && <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground font-mono">{project.project_code}</span>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{project.client_name}</p>
                    {project.project_manager && <p className="text-xs text-muted-foreground">PM: {project.project_manager}</p>}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={project.status} />
                    {project.riba_stage && <Badge variant="outline" className="text-[10px]">{project.riba_stage?.replace(/_/g, " ").replace("stage", "Stage")}</Badge>}
                    {project.sector && <span className="text-[10px] text-muted-foreground capitalize">{project.sector.replace(/_/g, " ")}</span>}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Progress value={project.progress_percent || 0} className="h-1.5 flex-1" />
                      <span className="text-xs text-muted-foreground shrink-0">{project.progress_percent || 0}%</span>
                    </div>
                    {project.fee_agreed && (
                      <p className="text-xs text-muted-foreground">£{(project.fee_agreed).toLocaleString()} fee</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => { e.stopPropagation(); openEdit(project); }}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={e => { e.stopPropagation(); setDeleteId(project.id); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                  {expandedId === project.id ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </div>
              </div>

              {/* Expanded detail panel */}
              {expandedId === project.id && (
                <div className="border-t bg-muted/10 p-4 space-y-4">
                  <Tabs defaultValue="overview">
                    <TabsList className="h-8">
                      <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
                      <TabsTrigger value="programme" className="text-xs">Programme</TabsTrigger>
                      <TabsTrigger value="sections" className="text-xs">Work Sections</TabsTrigger>
                      <TabsTrigger value="financials" className="text-xs">Financials</TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview" className="mt-3">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                        <div><p className="text-xs text-muted-foreground">Start</p><p className="font-medium">{project.start_date || project.baseline_start_date || "—"}</p></div>
                        <div><p className="text-xs text-muted-foreground">End</p><p className="font-medium">{project.end_date || project.baseline_end_date || "—"}</p></div>
                        <div><p className="text-xs text-muted-foreground">Budgeted Hours</p><p className="font-medium">{project.budgeted_hours || "—"}</p></div>
                        <div><p className="text-xs text-muted-foreground">Actual Hours</p><p className="font-medium">{project.actual_hours || "—"}</p></div>
                      </div>
                      {project.description && <p className="text-xs text-muted-foreground mt-3 border-t pt-3">{project.description}</p>}
                    </TabsContent>

                    <TabsContent value="programme" className="mt-3">
                      <DateComparison project={project} />
                    </TabsContent>

                    <TabsContent value="sections" className="mt-3">
                      <WorkSectionsTracker
                        sections={project.work_sections || []}
                        onChange={async (updated) => {
                          await base44.entities.Project.update(project.id, { work_sections: updated });
                          queryClient.invalidateQueries({ queryKey: ["projects"] });
                        }}
                        readOnly={false}
                      />
                    </TabsContent>

                    <TabsContent value="financials" className="mt-3">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                        <div><p className="text-xs text-muted-foreground">Project Value</p><p className="font-medium">£{(project.project_value || 0).toLocaleString()}</p></div>
                        <div><p className="text-xs text-muted-foreground">Fee Agreed</p><p className="font-medium">£{(project.fee_agreed || 0).toLocaleString()}</p></div>
                        <div><p className="text-xs text-muted-foreground">Fee Invoiced</p><p className="font-medium">£{(project.fee_invoiced || 0).toLocaleString()}</p></div>
                        <div><p className="text-xs text-muted-foreground">Cost to Date</p><p className="font-medium">£{(project.cost_to_date || 0).toLocaleString()}</p></div>
                      </div>
                      {project.fee_agreed > 0 && (
                        <div className="mt-3 space-y-1">
                          <p className="text-xs text-muted-foreground">Invoice Recovery ({Math.round(((project.fee_invoiced || 0) / project.fee_agreed) * 100)}%)</p>
                          <Progress value={Math.min(((project.fee_invoiced || 0) / project.fee_agreed) * 100, 100)} className="h-2" />
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Project" : "New Project"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSave}>
            <Tabs value={formTab} onValueChange={setFormTab}>
              <TabsList className="h-8 mb-4">
                <TabsTrigger value="details" className="text-xs">Details</TabsTrigger>
                <TabsTrigger value="programme" className="text-xs">Programme</TabsTrigger>
                <TabsTrigger value="financials" className="text-xs">Financials</TabsTrigger>
                <TabsTrigger value="sections" className="text-xs">Work Sections</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-3 mt-0">
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2 space-y-1.5"><Label>Project Name *</Label><Input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} required /></div>
                  <div className="space-y-1.5"><Label>Client *</Label><Input value={form.client_name} onChange={e => setForm(f => ({...f, client_name: e.target.value}))} required /></div>
                  <div className="space-y-1.5"><Label>Project Code</Label><Input value={form.project_code} onChange={e => setForm(f => ({...f, project_code: e.target.value}))} placeholder="e.g. PRJ-001" /></div>
                  <div className="space-y-1.5">
                    <Label>Project Manager</Label>
                    <Select value={form.project_manager} onValueChange={v => setForm(f => ({...f, project_manager: v}))}>
                      <SelectTrigger><SelectValue placeholder="Select PM" /></SelectTrigger>
                      <SelectContent>{employees.filter(e => e.status === "active").map(e => <SelectItem key={e.id} value={e.full_name}>{e.full_name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Sector</Label>
                    <Select value={form.sector} onValueChange={v => setForm(f => ({...f, sector: v}))}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>{SECTORS.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Status</Label>
                    <Select value={form.status} onValueChange={v => setForm(f => ({...f, status: v}))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>RIBA Stage</Label>
                    <Select value={form.riba_stage} onValueChange={v => setForm(f => ({...f, riba_stage: v}))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{RIBA_STAGES.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, " ").replace("stage", "Stage")}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5"><Label>Progress (%)</Label><Input type="number" min="0" max="100" value={form.progress_percent} onChange={e => setForm(f => ({...f, progress_percent: e.target.value}))} /></div>
                  <div className="col-span-2 space-y-1.5"><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} rows={2} /></div>
                </div>
              </TabsContent>

              <TabsContent value="programme" className="space-y-3 mt-0">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5"><Label>Baseline Start</Label><Input type="date" value={form.baseline_start_date} onChange={e => setForm(f => ({...f, baseline_start_date: e.target.value}))} /></div>
                  <div className="space-y-1.5"><Label>Baseline End</Label><Input type="date" value={form.baseline_end_date} onChange={e => setForm(f => ({...f, baseline_end_date: e.target.value}))} /></div>
                  <div className="space-y-1.5"><Label>Actual Start</Label><Input type="date" value={form.actual_start_date} onChange={e => setForm(f => ({...f, actual_start_date: e.target.value}))} /></div>
                  <div className="space-y-1.5"><Label>Actual End</Label><Input type="date" value={form.actual_end_date} onChange={e => setForm(f => ({...f, actual_end_date: e.target.value}))} /></div>
                  <div className="space-y-1.5"><Label>Start Date (legacy)</Label><Input type="date" value={form.start_date} onChange={e => setForm(f => ({...f, start_date: e.target.value}))} /></div>
                  <div className="space-y-1.5"><Label>End Date (legacy)</Label><Input type="date" value={form.end_date} onChange={e => setForm(f => ({...f, end_date: e.target.value}))} /></div>
                </div>
              </TabsContent>

              <TabsContent value="financials" className="space-y-3 mt-0">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5"><Label>Project Value (£)</Label><Input type="number" value={form.project_value} onChange={e => setForm(f => ({...f, project_value: e.target.value}))} /></div>
                  <div className="space-y-1.5"><Label>Fee Agreed (£)</Label><Input type="number" value={form.fee_agreed} onChange={e => setForm(f => ({...f, fee_agreed: e.target.value}))} /></div>
                  <div className="space-y-1.5"><Label>Fee Invoiced (£)</Label><Input type="number" value={form.fee_invoiced} onChange={e => setForm(f => ({...f, fee_invoiced: e.target.value}))} /></div>
                  <div className="space-y-1.5"><Label>Cost to Date (£)</Label><Input type="number" value={form.cost_to_date} onChange={e => setForm(f => ({...f, cost_to_date: e.target.value}))} /></div>
                  <div className="space-y-1.5"><Label>Budgeted Hours</Label><Input type="number" value={form.budgeted_hours} onChange={e => setForm(f => ({...f, budgeted_hours: e.target.value}))} /></div>
                  <div className="space-y-1.5"><Label>Actual Hours</Label><Input type="number" value={form.actual_hours} onChange={e => setForm(f => ({...f, actual_hours: e.target.value}))} /></div>
                </div>
              </TabsContent>

              <TabsContent value="sections" className="mt-0">
                <WorkSectionsTracker
                  sections={form.work_sections}
                  onChange={updated => setForm(f => ({...f, work_sections: updated}))}
                />
              </TabsContent>
            </Tabs>

            <DialogFooter className="mt-4 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit">{editing ? "Update" : "Create"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete Project</AlertDialogTitle><AlertDialogDescription>This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteMut.mutate(deleteId)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}