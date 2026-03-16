import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Clock, CheckCircle2, XCircle, Pencil, Trash2, Plus,
  ChevronLeft, ChevronRight, Send, AlertCircle
} from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import StatCard from "@/components/shared/StatCard";
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, parseISO, isWithinInterval } from "date-fns";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

const RIBA_STAGES = [
  { value: "pre_concept", label: "Pre-Concept" },
  { value: "concept", label: "Concept" },
  { value: "schematic", label: "Schematic" },
  { value: "detailed_design", label: "Detailed Design" },
  { value: "boq_preparation", label: "BOQ Preparation" },
  { value: "construction", label: "Construction" },
  { value: "post_completion", label: "Post Completion" },
  { value: "general", label: "General / Admin" },
];

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const defaultForm = {
  employee_name: "", project_name: "", date: "", hours: "",
  task_description: "", riba_stage: "general", billable: true, status: "draft", week_ending: ""
};

function getWeekDates(weekStart) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });
}

export default function Timesheets() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [tab, setTab] = useState("week");
  const [currentWeekStart, setCurrentWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const queryClient = useQueryClient();

  const { data: timesheets = [] } = useQuery({
    queryKey: ["timesheets"],
    queryFn: () => base44.entities.Timesheet.list("-date")
  });
  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => base44.entities.Employee.list()
  });
  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: () => base44.entities.Project.list()
  });

  const createMut = useMutation({
    mutationFn: d => base44.entities.Timesheet.create(d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["timesheets"] }); setDialogOpen(false); }
  });
  const updateMut = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Timesheet.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["timesheets"] }); setDialogOpen(false); setEditing(null); }
  });
  const deleteMut = useMutation({
    mutationFn: id => base44.entities.Timesheet.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["timesheets"] }); setDeleteId(null); }
  });

  const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
  const weekDates = getWeekDates(currentWeekStart);

  const weekTimesheets = useMemo(() =>
    timesheets.filter(t => {
      if (!t.date) return false;
      try {
        const d = parseISO(t.date);
        return isWithinInterval(d, { start: currentWeekStart, end: weekEnd });
      } catch { return false; }
    }), [timesheets, currentWeekStart, weekEnd]);

  // Stats
  const totalHours = timesheets.reduce((s, t) => s + (t.hours || 0), 0);
  const billableHours = timesheets.filter(t => t.billable).reduce((s, t) => s + (t.hours || 0), 0);
  const pendingApproval = timesheets.filter(t => t.status === "submitted").length;
  const weekTotal = weekTimesheets.reduce((s, t) => s + (t.hours || 0), 0);

  // Chart data — hours per day this week
  const dailyData = weekDates.map((d, i) => {
    const dayTs = weekTimesheets.filter(t => t.date === format(d, "yyyy-MM-dd"));
    return {
      day: DAYS[i],
      hours: dayTs.reduce((s, t) => s + (t.hours || 0), 0),
      date: format(d, "yyyy-MM-dd"),
      isToday: format(d, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd"),
    };
  });

  // All tab filter
  const [allFilter, setAllFilter] = useState("all");
  const filteredAll = allFilter === "all" ? timesheets : timesheets.filter(t => t.status === allFilter);

  const openNew = (date = "") => {
    setEditing(null);
    setForm({ ...defaultForm, date });
    setDialogOpen(true);
  };
  const openEdit = ts => {
    setEditing(ts);
    setForm({ ...defaultForm, ...ts, hours: ts.hours || "" });
    setDialogOpen(true);
  };
  const handleSave = e => {
    e.preventDefault();
    const data = { ...form, hours: Number(form.hours) };
    editing ? updateMut.mutate({ id: editing.id, data }) : createMut.mutate(data);
  };

  const submitWeek = () => {
    const draftIds = weekTimesheets.filter(t => t.status === "draft").map(t => t.id);
    Promise.all(draftIds.map(id => base44.entities.Timesheet.update(id, { status: "submitted" })))
      .then(() => queryClient.invalidateQueries({ queryKey: ["timesheets"] }));
  };

  const weekHasDrafts = weekTimesheets.some(t => t.status === "draft");

  return (
    <div className="space-y-5">
      <PageHeader
        title="Timesheets"
        description="Log and approve billable and non-billable hours"
        actionLabel="Log Hours"
        actionIcon={Plus}
        onAction={() => openNew()}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard title="This Week" value={`${weekTotal.toFixed(1)}h`} subtitle="of 40h target" icon={Clock} color="primary" />
        <StatCard title="Total Billable" value={`${billableHours.toFixed(1)}h`} icon={Clock} color="green" />
        <StatCard title="Non-Billable" value={`${(totalHours - billableHours).toFixed(1)}h`} icon={Clock} color="accent" />
        <StatCard title="Pending Approval" value={pendingApproval} icon={AlertCircle} color="blue" />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="week">Weekly View</TabsTrigger>
          <TabsTrigger value="all">All Entries</TabsTrigger>
        </TabsList>

        {/* ── WEEKLY VIEW ── */}
        <TabsContent value="week" className="mt-4 space-y-4">
          {/* Week nav */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentWeekStart(w => subWeeks(w, 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium min-w-[180px] text-center">
                {format(currentWeekStart, "d MMM")} – {format(weekEnd, "d MMM yyyy")}
              </span>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentWeekStart(w => addWeeks(w, 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" className="text-xs" onClick={() => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}>
                Today
              </Button>
            </div>
            {weekHasDrafts && (
              <Button size="sm" variant="outline" className="gap-2 border-amber-300 text-amber-700 hover:bg-amber-50" onClick={submitWeek}>
                <Send className="h-3.5 w-3.5" /> Submit Week for Approval
              </Button>
            )}
          </div>

          {/* Daily chart */}
          <Card>
            <CardContent className="pt-4 pb-2">
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={dailyData} barSize={36}>
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={28} />
                  <Tooltip formatter={(v) => [`${v}h`, "Hours"]} />
                  <Bar dataKey="hours" radius={[4, 4, 0, 0]}>
                    {dailyData.map((d, i) => (
                      <Cell key={i} fill={d.isToday ? "hsl(var(--primary))" : d.hours >= 7.5 ? "#10b981" : d.hours > 0 ? "#93c5fd" : "#e2e8f0"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="flex items-center justify-between mt-1">
                <p className="text-xs text-muted-foreground">Weekly hours: <span className="font-semibold text-foreground">{weekTotal.toFixed(1)}h</span></p>
                <Progress value={Math.min((weekTotal / 40) * 100, 100)} className="w-32 h-1.5" />
              </div>
            </CardContent>
          </Card>

          {/* Day-by-day entries */}
          <div className="grid gap-3">
            {weekDates.map((d, di) => {
              const dateStr = format(d, "yyyy-MM-dd");
              const dayEntries = weekTimesheets.filter(t => t.date === dateStr);
              const dayTotal = dayEntries.reduce((s, t) => s + (t.hours || 0), 0);
              const isToday = dateStr === format(new Date(), "yyyy-MM-dd");
              return (
                <Card key={dateStr} className={isToday ? "border-primary/40 shadow-sm" : ""}>
                  <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/60">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-semibold ${isToday ? "text-primary" : ""}`}>
                        {DAYS[di]} {format(d, "d MMM")}
                      </span>
                      {isToday && <Badge className="text-[10px] py-0 h-4 bg-primary/10 text-primary border-0">Today</Badge>}
                    </div>
                    <div className="flex items-center gap-3">
                      {dayTotal > 0 && (
                        <span className={`text-xs font-medium ${dayTotal >= 7.5 ? "text-emerald-600" : "text-amber-600"}`}>
                          {dayTotal}h logged
                        </span>
                      )}
                      <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => openNew(dateStr)}>
                        <Plus className="h-3 w-3" /> Add
                      </Button>
                    </div>
                  </div>
                  {dayEntries.length === 0 ? (
                    <p className="text-xs text-muted-foreground px-4 py-3">No entries — click Add to log hours</p>
                  ) : (
                    <div className="divide-y divide-border/40">
                      {dayEntries.map(ts => (
                        <div key={ts.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/20">
                          <div className="w-12 text-center">
                            <span className="text-sm font-bold">{ts.hours}h</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{ts.project_name}</p>
                            <p className="text-xs text-muted-foreground truncate">{ts.task_description || RIBA_STAGES.find(r => r.value === ts.riba_stage)?.label}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {ts.billable
                              ? <Badge variant="outline" className="text-[10px] py-0 h-4 bg-emerald-50 text-emerald-700 border-emerald-200">Billable</Badge>
                              : <Badge variant="outline" className="text-[10px] py-0 h-4">Non-Bill</Badge>
                            }
                            <StatusBadge status={ts.status} />
                            {ts.status === "submitted" && (
                              <Button variant="ghost" size="icon" className="h-6 w-6 text-emerald-600" title="Approve"
                                onClick={() => updateMut.mutate({ id: ts.id, data: { status: "approved" } })}>
                                <CheckCircle2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEdit(ts)}>
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => setDeleteId(ts.id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* ── ALL ENTRIES ── */}
        <TabsContent value="all" className="mt-4">
          <div className="flex gap-2 mb-3">
            {["all", "draft", "submitted", "approved", "rejected"].map(s => (
              <Button key={s} size="sm" variant={allFilter === s ? "default" : "outline"} className="h-7 text-xs capitalize" onClick={() => setAllFilter(s)}>
                {s}
              </Button>
            ))}
          </div>
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left p-3 font-medium text-muted-foreground">Employee</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Project</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Date</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Hours</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">RIBA Stage</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Billable</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                    <th className="p-3 w-28"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAll.map(ts => (
                    <tr key={ts.id} className="border-b hover:bg-muted/20">
                      <td className="p-3 font-medium">{ts.employee_name}</td>
                      <td className="p-3 text-muted-foreground text-xs">{ts.project_name}</td>
                      <td className="p-3 text-xs">{ts.date ? format(parseISO(ts.date), "dd MMM yyyy") : "—"}</td>
                      <td className="p-3 font-semibold">{ts.hours}h</td>
                      <td className="p-3 text-xs capitalize">{RIBA_STAGES.find(r => r.value === ts.riba_stage)?.label || ts.riba_stage}</td>
                      <td className="p-3">
                        {ts.billable
                          ? <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">Billable</Badge>
                          : <Badge variant="outline" className="text-xs">Non-Billable</Badge>
                        }
                      </td>
                      <td className="p-3"><StatusBadge status={ts.status} /></td>
                      <td className="p-3">
                        <div className="flex gap-1">
                          {ts.status === "submitted" && (
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-600" title="Approve"
                              onClick={() => updateMut.mutate({ id: ts.id, data: { status: "approved" } })}>
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(ts)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(ts.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredAll.length === 0 && (
                    <tr><td colSpan={8} className="p-8 text-center text-muted-foreground text-sm">No timesheets found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Log Hours Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Timesheet Entry" : "Log Hours"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 col-span-2">
                <Label>Employee *</Label>
                <Select value={form.employee_name} onValueChange={v => setForm(f => ({ ...f, employee_name: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                  <SelectContent>
                    {employees.filter(e => e.status !== "terminated").map(e => (
                      <SelectItem key={e.id} value={e.full_name}>{e.full_name}</SelectItem>
                    ))}
                    {employees.length === 0 && <SelectItem value={form.employee_name || "Me"}>{form.employee_name || "Me"}</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>Project *</Label>
                <Select value={form.project_name} onValueChange={v => setForm(f => ({ ...f, project_name: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                  <SelectContent>
                    {projects.map(p => <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>)}
                    {projects.length === 0 && <SelectItem value={form.project_name || "General"}>General</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Date *</Label>
                <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required />
              </div>
              <div className="space-y-1.5">
                <Label>Hours *</Label>
                <Input type="number" step="0.5" min="0.5" max="24" placeholder="0.0" value={form.hours} onChange={e => setForm(f => ({ ...f, hours: e.target.value }))} required />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>RIBA Stage</Label>
                <Select value={form.riba_stage} onValueChange={v => setForm(f => ({ ...f, riba_stage: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{RIBA_STAGES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>Task Description</Label>
                <Input placeholder="Describe the work done..." value={form.task_description} onChange={e => setForm(f => ({ ...f, task_description: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="submitted">Submitted</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end pb-1 space-y-1.5">
                <div className="flex items-center gap-2">
                  <Switch checked={form.billable} onCheckedChange={v => setForm(f => ({ ...f, billable: v }))} />
                  <Label>Billable</Label>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createMut.isPending || updateMut.isPending}>
                {editing ? "Update" : "Save Entry"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Entry</AlertDialogTitle>
            <AlertDialogDescription>This timesheet entry will be permanently deleted.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteMut.mutate(deleteId)} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}