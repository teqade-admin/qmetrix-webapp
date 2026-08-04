import React, { useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/AuthContext";
import { canWrite } from "@/lib/permissions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Pencil, Trash2, CircleDot, Clock, Ban, CheckCircle2 } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import StatCard from "@/components/shared/StatCard";
import EmptyState from "@/components/shared/EmptyState";
import FilterBar from "@/components/shared/FilterBar";
import Pagination, { usePagination } from "@/components/shared/Pagination";
import { getSubordinates } from "@/lib/orgHierarchy";
import {
  RIBA_STAGES, stageLabel, projectProgress,
  WORK_SECTION_STATUSES, WORK_SECTION_STATUS_LABELS,
} from "@/lib/projectProgress";
import { format, parseISO } from "date-fns";

const STATUS_STYLE = {
  todo: "bg-slate-100 text-slate-700 border-slate-200",
  in_progress: "bg-blue-50 text-blue-700 border-blue-200",
  blocked: "bg-amber-50 text-amber-800 border-amber-200",
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
};
const STATUS_ICON = {
  todo: CircleDot,
  in_progress: Clock,
  blocked: Ban,
  completed: CheckCircle2,
};

const SCOPES = { MINE: "mine", TEAM: "team", ALL: "all" };

const defaultForm = {
  project_id: "", title: "", description: "", riba_stage: "",
  assignee_id: "", reporter_id: "", status: "todo",
  planned_hours: "", work_date: "", start_date: "", end_date: "", notes: "",
  progress_percent: "",
};

export default function WorkSections() {
  const { user, userRole } = useAuth();
  const queryClient = useQueryClient();
  const [scope, setScope] = useState(SCOPES.MINE);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [formError, setFormError] = useState("");

  const { data: sections = [], isLoading } = useQuery({
    queryKey: ["work_sections"], queryFn: () => base44.entities.WorkSection.list("-created_date"),
  });
  const { data: projects = [] } = useQuery({
    queryKey: ["projects"], queryFn: () => base44.entities.Project.list(),
  });
  const { data: employees = [] } = useQuery({
    queryKey: ["employees"], queryFn: () => base44.entities.Employee.list(),
  });

  const me = useMemo(() => {
    if (!user) return null;
    const fullName = user?.user_metadata?.full_name;
    return employees.find(e => e.user_id && e.user_id === user.id)
      || employees.find(e => e.email && e.email.toLowerCase() === (user.email || "").toLowerCase())
      || employees.find(e => fullName && e.full_name === fullName)
      || null;
  }, [user, employees]);

  // Managers assign work to their reporting line; anyone with Projects write
  // access can assign across the business.
  const reports = useMemo(() => (me ? getSubordinates(employees, me.id) : []), [employees, me]);
  const canAssignAnyone = canWrite(userRole, "Projects");
  const canAssign = canAssignAnyone || reports.length > 0;
  const assignableTo = canAssignAnyone ? employees : [me, ...reports].filter(Boolean);

  const projectById = useMemo(() => new Map(projects.map(p => [p.id, p])), [projects]);
  const employeeById = useMemo(() => new Map(employees.map(e => [e.id, e])), [employees]);

  // Keep the project's stored progress in step whenever its sections change,
  // since the Dashboard and Cost & Value read that column.
  const syncProjectProgress = async (projectId, nextSections) => {
    const project = projectById.get(projectId);
    if (!project) return;
    const forProject = nextSections.filter(s => s.project_id === projectId);
    await base44.entities.Project.update(projectId, {
      progress_percent: projectProgress(forProject, project.riba_stage),
    });
    queryClient.invalidateQueries({ queryKey: ["projects"] });
  };

  const createMut = useMutation({
    mutationFn: d => base44.entities.WorkSection.create(d),
    meta: { successMessage: (_r, d) => `Work assigned${d?.assignee_name ? ` to ${d.assignee_name}` : ""}` },
    onSuccess: async (created) => {
      await queryClient.invalidateQueries({ queryKey: ["work_sections"] });
      await syncProjectProgress(created.project_id, [...sections, created]);
      setDialogOpen(false);
    },
  });
  const updateMut = useMutation({
    mutationFn: ({ id, data }) => base44.entities.WorkSection.update(id, data),
    meta: { successMessage: "Work section updated" },
    onSuccess: async (updated) => {
      await queryClient.invalidateQueries({ queryKey: ["work_sections"] });
      await syncProjectProgress(updated.project_id, sections.map(s => s.id === updated.id ? updated : s));
      setDialogOpen(false); setEditing(null);
    },
  });
  const deleteMut = useMutation({
    mutationFn: id => base44.entities.WorkSection.delete(id),
    meta: { successMessage: "Work section removed" },
    onSuccess: async (_r, id) => {
      const removed = sections.find(s => s.id === id);
      await queryClient.invalidateQueries({ queryKey: ["work_sections"] });
      if (removed) await syncProjectProgress(removed.project_id, sections.filter(s => s.id !== id));
      setDeleteId(null);
    },
  });

  const openNew = () => {
    setFormError(""); setEditing(null);
    setForm({ ...defaultForm, reporter_id: me?.id || "" });
    setDialogOpen(true);
  };
  const openEdit = (s) => {
    setFormError(""); setEditing(s);
    setForm({
      ...defaultForm, ...s,
      project_id: s.project_id || "", assignee_id: s.assignee_id || "", reporter_id: s.reporter_id || "",
      planned_hours: s.planned_hours ?? "", progress_percent: s.progress_percent ?? "",
      work_date: s.work_date || "", start_date: s.start_date || "", end_date: s.end_date || "",
    });
    setDialogOpen(true);
  };

  const handleSave = (e) => {
    e.preventDefault();
    setFormError("");
    if (!form.project_id) return setFormError("Choose the project this work belongs to.");
    if (!form.title.trim()) return setFormError("Give the work a title.");
    if (!form.assignee_id) return setFormError("Choose who will do the work.");
    if (form.start_date && form.end_date && parseISO(form.end_date) < parseISO(form.start_date)) {
      return setFormError("End date can't be before the start date.");
    }

    const data = {
      ...form,
      title: form.title.trim(),
      description: form.description?.trim() || null,
      riba_stage: form.riba_stage || null,
      assignee_name: employeeById.get(form.assignee_id)?.full_name || null,
      reporter_id: form.reporter_id || null,
      reporter_name: employeeById.get(form.reporter_id)?.full_name || null,
      planned_hours: form.planned_hours !== "" ? Number(form.planned_hours) : null,
      work_date: form.work_date || null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      notes: form.notes?.trim() || null,
      // Completed always reads 100 so the status and the bar agree.
      progress_percent: form.status === "completed"
        ? 100
        : (form.progress_percent !== "" ? Number(form.progress_percent) : 0),
    };
    if (editing) {
      const { id, created_at, updated_at, created_date, updated_date, ...rest } = data;
      updateMut.mutate({ id: editing.id, data: rest });
    } else {
      createMut.mutate(data);
    }
  };

  const visible = useMemo(() => {
    const reportIds = new Set(reports.map(r => r.id));
    return sections.filter(s => {
      if (scope === SCOPES.MINE && s.assignee_id !== me?.id) return false;
      if (scope === SCOPES.TEAM && !(reportIds.has(s.assignee_id) || s.assignee_id === me?.id)) return false;
      if (statusFilter !== "all" && s.status !== statusFilter) return false;
      if (projectFilter !== "all" && s.project_id !== projectFilter) return false;
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return [s.title, s.description, s.assignee_name, s.reporter_name, projectById.get(s.project_id)?.name]
        .some(v => (v || "").toLowerCase().includes(q));
    });
  }, [sections, scope, me, reports, statusFilter, projectFilter, search, projectById]);

  const pager = usePagination(visible, 12);
  const countBy = (st) => visible.filter(s => s.status === st).length;

  const scopes = [
    { key: SCOPES.MINE, label: "Assigned to me" },
    ...(reports.length > 0 ? [{ key: SCOPES.TEAM, label: "My team" }] : []),
    ...(canAssignAnyone ? [{ key: SCOPES.ALL, label: "All" }] : []),
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Work Sections"
        description="Packages of work on a project, assigned to a person"
        actionLabel={canAssign ? "Assign Work" : undefined}
        onAction={canAssign ? openNew : undefined}
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard title="To Do" value={countBy("todo")} icon={CircleDot} color="primary" />
        <StatCard title="In Progress" value={countBy("in_progress")} icon={Clock} color="blue" />
        <StatCard title="Blocked" value={countBy("blocked")} icon={Ban} color="red" />
        <StatCard title="Completed" value={countBy("completed")} icon={CheckCircle2} color="green" />
      </div>

      <Tabs value={scope} onValueChange={setScope}>
        <TabsList className="bg-muted/50">
          {scopes.map(s => <TabsTrigger key={s.key} value={s.key}>{s.label}</TabsTrigger>)}
        </TabsList>
      </Tabs>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        placeholder="Search work, project or person…"
        filters={[
          {
            value: projectFilter, onChange: setProjectFilter, allLabel: "All projects",
            options: projects.map(p => ({ value: p.id, label: p.name })), width: "w-48",
          },
          {
            value: statusFilter, onChange: setStatusFilter, allLabel: "All statuses",
            options: WORK_SECTION_STATUSES.map(s => ({ value: s, label: WORK_SECTION_STATUS_LABELS[s] })),
            width: "w-40",
          },
        ]}
      />

      <Card>
        {isLoading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Loading…</div>
        ) : visible.length === 0 ? (
          <EmptyState
            title="No work sections"
            description={scope === SCOPES.MINE ? "Nothing is assigned to you yet." : "Assign work to get started."}
            actionLabel={canAssign ? "Assign Work" : undefined}
            onAction={canAssign ? openNew : undefined}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left p-3 font-medium text-muted-foreground">Work</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Project</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Stage</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Assignee</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Reporter</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Hours</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Due</th>
                  <th className="p-3 w-20"></th>
                </tr>
              </thead>
              <tbody>
                {pager.pageItems.map(s => {
                  const Icon = STATUS_ICON[s.status] || CircleDot;
                  return (
                    <tr key={s.id} className="border-b hover:bg-muted/20">
                      <td className="p-3">
                        <p className="font-medium">{s.title}</p>
                        {s.description && <p className="text-xs text-muted-foreground truncate max-w-[220px]">{s.description}</p>}
                      </td>
                      <td className="p-3 text-xs text-muted-foreground">{projectById.get(s.project_id)?.name || "—"}</td>
                      <td className="p-3 text-xs">{s.riba_stage ? stageLabel(s.riba_stage) : "—"}</td>
                      <td className="p-3 text-xs">{s.assignee_name || "—"}</td>
                      <td className="p-3 text-xs text-muted-foreground">{s.reporter_name || "—"}</td>
                      <td className="p-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border ${STATUS_STYLE[s.status]}`}>
                          <Icon className="h-3 w-3" />{WORK_SECTION_STATUS_LABELS[s.status]}
                        </span>
                      </td>
                      <td className="p-3 text-xs text-right">{s.planned_hours ?? "—"}</td>
                      <td className="p-3 text-xs">{s.work_date ? format(parseISO(s.work_date), "dd MMM yy") : "—"}</td>
                      <td className="p-3">
                        {canAssign && (
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(s)}><Pencil className="h-3.5 w-3.5" /></Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(s.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <Pagination {...pager} />
          </div>
        )}
      </Card>

      {/* Assign / edit */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Work Section" : "Assign Work"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            {formError && <p className="text-sm text-destructive">{formError}</p>}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <Label>Title *</Label>
                <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. M&E services measurement" />
              </div>
              <div className="space-y-1.5">
                <Label>Project *</Label>
                <Select value={form.project_id} onValueChange={v => setForm(f => ({ ...f, project_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                  <SelectContent>{projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>RIBA Stage</Label>
                <Select value={form.riba_stage} onValueChange={v => setForm(f => ({ ...f, riba_stage: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select stage" /></SelectTrigger>
                  <SelectContent>{RIBA_STAGES.map(s => <SelectItem key={s} value={s}>{stageLabel(s)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Assignee *</Label>
                <Select value={form.assignee_id} onValueChange={v => setForm(f => ({ ...f, assignee_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Who does the work" /></SelectTrigger>
                  <SelectContent>{assignableTo.map(e => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Reporter</Label>
                <Select value={form.reporter_id} onValueChange={v => setForm(f => ({ ...f, reporter_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Who raised it" /></SelectTrigger>
                  <SelectContent>{employees.map(e => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {WORK_SECTION_STATUSES.map(s => <SelectItem key={s} value={s}>{WORK_SECTION_STATUS_LABELS[s]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Progress (%)</Label>
                <Input
                  type="number" min="0" max="100"
                  value={form.status === "completed" ? 100 : form.progress_percent}
                  disabled={form.status === "completed"}
                  onChange={e => setForm(f => ({ ...f, progress_percent: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Total Hours of Work</Label>
                <Input type="number" min="0" step="0.5" value={form.planned_hours} onChange={e => setForm(f => ({ ...f, planned_hours: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Date of Work</Label>
                <Input type="date" value={form.work_date} onChange={e => setForm(f => ({ ...f, work_date: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Start Date</Label>
                <Input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>End Date</Label>
                <Input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Description</Label>
                <Textarea rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Notes</Label>
                <Textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createMut.isPending || updateMut.isPending}>
                {createMut.isPending || updateMut.isPending ? "Saving…" : (editing ? "Update" : "Assign")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove work section</AlertDialogTitle>
            <AlertDialogDescription>
              Timesheets booked against it keep their hours but lose the link. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteMut.mutate(deleteId)} className="bg-destructive text-destructive-foreground">Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
