import React, { useState } from "react";

import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Pencil, Trash2, Users, UserCheck } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import EmptyState from "@/components/shared/EmptyState";
import StatCard from "@/components/shared/StatCard";
import ResourceForecast from "@/components/resources/ResourceForecast";
import { format, addMonths, startOfMonth } from "date-fns";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";

const defaultForm = { employee_name: "", project_name: "", role_on_project: "", allocation_percent: "", hours_budgeted: "", hours_spent: "", start_date: "", end_date: "", riba_stage: "", status: "active" };

export default function ResourceAllocation() {
  const [tab, setTab] = useState("allocations");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const queryClient = useQueryClient();

  const { data: allocations = [] } = useQuery({ queryKey: ["allocations"], queryFn: () => base44.entities.ResourceAllocation.list("-created_date") });
  const { data: employees = [] } = useQuery({ queryKey: ["employees"], queryFn: () => base44.entities.Employee.list() });
  const { data: projects = [] } = useQuery({ queryKey: ["projects"], queryFn: () => base44.entities.Project.list() });
  const { data: bids = [] } = useQuery({ queryKey: ["bids"], queryFn: () => base44.entities.Bid.list() });

  const createMut = useMutation({ mutationFn: d => base44.entities.ResourceAllocation.create(d), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["allocations"] }); setDialogOpen(false); } });
  const updateMut = useMutation({ mutationFn: ({ id, data }) => base44.entities.ResourceAllocation.update(id, data), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["allocations"] }); setDialogOpen(false); setEditing(null); } });
  const deleteMut = useMutation({ mutationFn: id => base44.entities.ResourceAllocation.delete(id), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["allocations"] }); setDeleteId(null); } });

  const openNew = () => { setEditing(null); setForm(defaultForm); setDialogOpen(true); };
  const openEdit = a => { setEditing(a); setForm({ ...defaultForm, ...a, allocation_percent: a.allocation_percent || "", hours_budgeted: a.hours_budgeted || "", hours_spent: a.hours_spent || "" }); setDialogOpen(true); };
  const handleSave = e => { e.preventDefault(); const data = { ...form, allocation_percent: Number(form.allocation_percent), hours_budgeted: form.hours_budgeted ? Number(form.hours_budgeted) : undefined, hours_spent: form.hours_spent ? Number(form.hours_spent) : undefined }; editing ? updateMut.mutate({ id: editing.id, data }) : createMut.mutate(data); };

  const activeAllocations = allocations.filter(a => a.status === "active");
  const activeEmployees = employees.filter(e => e.status === "active");

  // Resource utilization per employee
  const utilization = activeEmployees.map(emp => {
    const empAllocs = activeAllocations.filter(a => a.employee_name === emp.full_name);
    const total = empAllocs.reduce((s, a) => s + (a.allocation_percent || 0), 0);
    return { ...emp, totalAllocation: total, projects: empAllocs.map(a => a.project_name) };
  });

  // 6-month window for forecast
  const forecastMonths = Array.from({ length: 6 }, (_, i) => addMonths(startOfMonth(new Date()), i));

  return (
    <div className="space-y-4">
      <PageHeader title="Resource Allocation" description="Assign staff, track utilization and forecast resource needs" actionLabel="New Allocation" onAction={openNew} />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard title="Active Allocations" value={activeAllocations.length} icon={UserCheck} color="primary" />
        <StatCard title="Fully Allocated" value={utilization.filter(u => u.totalAllocation >= 80 && u.totalAllocation <= 100).length} icon={Users} color="green" />
        <StatCard title="Over-Allocated" value={utilization.filter(u => u.totalAllocation > 100).length} icon={Users} color="red" />
        <StatCard title="Under-Utilized" value={utilization.filter(u => u.totalAllocation < 50).length} icon={Users} color="accent" />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="allocations">Allocations</TabsTrigger>
          <TabsTrigger value="workload">Workload Planner</TabsTrigger>
          <TabsTrigger value="forecast">Resource Forecast</TabsTrigger>
        </TabsList>

        <TabsContent value="allocations" className="mt-4">
          <Card>
            {allocations.length === 0 ? <EmptyState title="No allocations yet" actionLabel="New Allocation" onAction={openNew} /> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b bg-muted/30">
                    <th className="text-left p-3 font-medium text-muted-foreground">Employee</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Project</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Role</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Allocation</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Hours</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Period</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                    <th className="p-3 w-20"></th>
                  </tr></thead>
                  <tbody>
                    {allocations.map(a => (
                      <tr key={a.id} className="border-b hover:bg-muted/20">
                        <td className="p-3 font-medium">{a.employee_name}</td>
                        <td className="p-3 text-muted-foreground">{a.project_name}</td>
                        <td className="p-3 text-xs">{a.role_on_project || "—"}</td>
                        <td className="p-3">
                          <div className="flex items-center gap-2 w-24"><Progress value={a.allocation_percent || 0} className="h-1.5 flex-1" /><span className="text-xs">{a.allocation_percent}%</span></div>
                        </td>
                        <td className="p-3 text-xs">{a.hours_spent || 0}/{a.hours_budgeted || 0}h</td>
                        <td className="p-3 text-xs">{a.start_date ? format(new Date(a.start_date), "dd MMM") : "—"} – {a.end_date ? format(new Date(a.end_date), "dd MMM") : "—"}</td>
                        <td className="p-3"><StatusBadge status={a.status} /></td>
                        <td className="p-3">
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(a)}><Pencil className="h-3.5 w-3.5" /></Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(a.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="workload" className="mt-4">
          <div className="space-y-3">
            {utilization.sort((a, b) => b.totalAllocation - a.totalAllocation).map(emp => (
              <Card key={emp.id} className="p-4">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary shrink-0">{(emp.full_name || "?").charAt(0)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-sm">{emp.full_name}</p>
                      <Badge variant="outline" className={cn("text-[10px]", emp.totalAllocation > 100 ? "bg-red-50 text-red-700 border-red-200" : emp.totalAllocation >= 80 ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200")}>
                        {emp.totalAllocation}%
                      </Badge>
                      <span className="text-xs text-muted-foreground capitalize">{(emp.role || "").replace(/_/g, " ")}</span>
                    </div>
                    <Progress value={Math.min(emp.totalAllocation, 100)} className={cn("h-2", emp.totalAllocation > 100 ? "[&>div]:bg-red-500" : emp.totalAllocation >= 80 ? "[&>div]:bg-emerald-500" : "")} />
                    {emp.projects.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {emp.projects.map((p, i) => <span key={i} className="text-[10px] bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded">{p}</span>)}
                      </div>
                    )}
                  </div>
                  <div className="text-right text-xs text-muted-foreground shrink-0">
                    <p>{emp.projects.length} project{emp.projects.length !== 1 ? "s" : ""}</p>
                    <p>{emp.hourly_rate || 0}/hr</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="forecast" className="mt-4">
          <ResourceForecast
            allocations={allocations}
            employees={employees}
            bids={bids}
            months={forecastMonths}
          />
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? "Edit Allocation" : "New Allocation"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-1.5"><Label>Employee *</Label><Select value={form.employee_name} onValueChange={v => setForm(f => ({...f, employee_name: v}))}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{employees.filter(e => e.status === "active").map(e => <SelectItem key={e.id} value={e.full_name}>{e.full_name}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1.5"><Label>Project *</Label><Select value={form.project_name} onValueChange={v => setForm(f => ({...f, project_name: v}))}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{projects.filter(p => p.status !== "closed").map(p => <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>)}</SelectContent></Select></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Role on Project</Label><Input value={form.role_on_project} onChange={e => setForm(f => ({...f, role_on_project: e.target.value}))} /></div>
              <div className="space-y-1.5"><Label>Allocation % *</Label><Input type="number" min="0" max="200" value={form.allocation_percent} onChange={e => setForm(f => ({...f, allocation_percent: e.target.value}))} required /></div>
              <div className="space-y-1.5"><Label>Budgeted Hours</Label><Input type="number" value={form.hours_budgeted} onChange={e => setForm(f => ({...f, hours_budgeted: e.target.value}))} /></div>
              <div className="space-y-1.5"><Label>Hours Spent</Label><Input type="number" value={form.hours_spent} onChange={e => setForm(f => ({...f, hours_spent: e.target.value}))} /></div>
              <div className="space-y-1.5"><Label>Start Date</Label><Input type="date" value={form.start_date} onChange={e => setForm(f => ({...f, start_date: e.target.value}))} /></div>
              <div className="space-y-1.5"><Label>End Date</Label><Input type="date" value={form.end_date} onChange={e => setForm(f => ({...f, end_date: e.target.value}))} /></div>
            </div>
            <div className="space-y-1.5"><Label>Status</Label><Select value={form.status} onValueChange={v => setForm(f => ({...f, status: v}))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="planned">Planned</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="completed">Completed</SelectItem></SelectContent></Select></div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button><Button type="submit">{editing ? "Update" : "Create"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete Allocation</AlertDialogTitle><AlertDialogDescription>This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteMut.mutate(deleteId)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}