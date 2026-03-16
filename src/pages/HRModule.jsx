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
import { Search, Pencil, Trash2, Star, UserPlus, ChevronRight } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import EmptyState from "@/components/shared/EmptyState";
import StatCard from "@/components/shared/StatCard";
import LeaveTracker from "@/components/hr/LeaveTracker";
import { useCurrency, formatMoney } from "@/components/shared/CurrencyContext";
import { Users, UserCheck, Clock } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";

const DEPARTMENTS = ["cost_management", "quantity_surveying", "project_management", "commercial", "finance", "administration", "executive"];
const ROLES = ["director", "associate_director", "senior_consultant", "consultant", "junior_consultant", "analyst", "administrator"];
const APP_ROLES = ["admin", "hr", "qs", "billing", "project_manager", "finance", "reviewer", "approver"];
const PERF_RATINGS = ["exceptional", "exceeds_expectations", "meets_expectations", "needs_improvement", "unsatisfactory"];

const defaultForm = {
  full_name: "", email: "", phone: "", department: "", role: "", app_role: "qs", job_title: "",
  hourly_rate: "", cost_rate: "", salary: "", status: "active", start_date: "",
  onboarding_status: "not_started", kpi_score: "", performance_rating: "", manager_name: "", notes: "", skills: []
};

export default function HRModule() {
  const { currency } = useCurrency();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("employees");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [skillInput, setSkillInput] = useState("");
  const queryClient = useQueryClient();

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ["employees"],
    queryFn: () => base44.entities.Employee.list("-created_date"),
  });

  const createMut = useMutation({ mutationFn: d => base44.entities.Employee.create(d), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["employees"] }); setDialogOpen(false); } });
  const updateMut = useMutation({ mutationFn: ({ id, data }) => base44.entities.Employee.update(id, data), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["employees"] }); setDialogOpen(false); setEditing(null); } });
  const deleteMut = useMutation({ mutationFn: id => base44.entities.Employee.delete(id), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["employees"] }); setDeleteId(null); } });

  const openNew = () => { setEditing(null); setForm(defaultForm); setDialogOpen(true); };
  const openEdit = (e) => { setEditing(e); setForm({ ...defaultForm, ...e, hourly_rate: e.hourly_rate || "", cost_rate: e.cost_rate || "", salary: e.salary || "", kpi_score: e.kpi_score || "" }); setDialogOpen(true); };
  const handleSave = (ev) => {
    ev.preventDefault();
    const data = { ...form, hourly_rate: form.hourly_rate ? Number(form.hourly_rate) : undefined, cost_rate: form.cost_rate ? Number(form.cost_rate) : undefined, salary: form.salary ? Number(form.salary) : undefined, kpi_score: form.kpi_score ? Number(form.kpi_score) : undefined };
    editing ? updateMut.mutate({ id: editing.id, data }) : createMut.mutate(data);
  };
  const addSkill = () => { if (skillInput.trim()) { setForm(f => ({ ...f, skills: [...(f.skills || []), skillInput.trim()] })); setSkillInput(""); } };
  const removeSkill = i => setForm(f => ({ ...f, skills: (f.skills || []).filter((_, idx) => idx !== i) }));

  const filtered = employees.filter(e =>
    (e.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
    (e.department || "").toLowerCase().includes(search.toLowerCase()) ||
    (e.role || "").toLowerCase().includes(search.toLowerCase())
  );

  const active = employees.filter(e => e.status === "active").length;
  const onLeave = employees.filter(e => e.status === "on_leave").length;
  const onboarding = employees.filter(e => e.onboarding_status === "in_progress").length;

  return (
    <div className="space-y-4">
      <PageHeader title="HR Module" description="Manage employees, onboarding, KPIs and performance" actionLabel="Add Employee" onAction={openNew}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 w-52" />
        </div>
      </PageHeader>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard title="Total Staff" value={employees.length} icon={Users} color="primary" />
        <StatCard title="Active" value={active} icon={UserCheck} color="green" />
        <StatCard title="On Leave" value={onLeave} icon={Clock} color="accent" />
        <StatCard title="Onboarding" value={onboarding} icon={UserPlus} color="blue" />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="employees">All Employees</TabsTrigger>
          <TabsTrigger value="onboarding">Onboarding</TabsTrigger>
          <TabsTrigger value="kpi">KPI & Performance</TabsTrigger>
          <TabsTrigger value="leave">Leave Tracker</TabsTrigger>
        </TabsList>

        <TabsContent value="employees" className="mt-4">
          <Card>
            {filtered.length === 0 && !isLoading ? (
              <EmptyState title="No employees found" actionLabel="Add Employee" onAction={openNew} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b bg-muted/30">
                    <th className="text-left p-3 font-medium text-muted-foreground">Employee</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Department</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Role</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Rate/hr</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">System Role</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                    <th className="p-3 w-20"></th>
                  </tr></thead>
                  <tbody>
                    {filtered.map(emp => (
                      <tr key={emp.id} className="border-b hover:bg-muted/20 cursor-pointer" onClick={() => setSelectedEmp(emp)}>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">{(emp.full_name || "?").charAt(0)}</div>
                            <div><p className="font-medium">{emp.full_name}</p><p className="text-xs text-muted-foreground">{emp.email}</p></div>
                          </div>
                        </td>
                        <td className="p-3 capitalize">{(emp.department || "").replace(/_/g, " ")}</td>
                        <td className="p-3 capitalize">{(emp.role || "").replace(/_/g, " ")}</td>
                        <td className="p-3 font-medium">{emp.hourly_rate ? formatMoney(emp.hourly_rate, currency) + "/hr" : "—"}</td>
                        <td className="p-3"><Badge variant="outline" className="capitalize text-xs">{emp.app_role || "qs"}</Badge></td>
                        <td className="p-3"><StatusBadge status={emp.status} /></td>
                        <td className="p-3" onClick={e => e.stopPropagation()}>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(emp)}><Pencil className="h-3.5 w-3.5" /></Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(emp.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
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

        <TabsContent value="onboarding" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {employees.filter(e => e.onboarding_status !== "completed").map(emp => (
              <Card key={emp.id} className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">{(emp.full_name || "?").charAt(0)}</div>
                    <div><p className="font-medium text-sm">{emp.full_name}</p><p className="text-xs text-muted-foreground capitalize">{(emp.role || "").replace(/_/g, " ")}</p></div>
                  </div>
                  <StatusBadge status={emp.onboarding_status || "not_started"} />
                </div>
                <div className="space-y-2 text-xs text-muted-foreground">
                  <div className="flex items-center justify-between"><span>Start Date</span><span className="text-foreground">{emp.start_date || "Not set"}</span></div>
                  <div className="flex items-center justify-between"><span>Department</span><span className="text-foreground capitalize">{(emp.department || "").replace(/_/g, " ")}</span></div>
                </div>
                <Button variant="outline" size="sm" className="w-full mt-3" onClick={() => {
                  updateMut.mutate({ id: emp.id, data: { onboarding_status: emp.onboarding_status === "not_started" ? "in_progress" : "completed" } });
                }}>
                  {emp.onboarding_status === "not_started" ? "Start Onboarding" : "Mark Complete"}
                </Button>
              </Card>
            ))}
            {employees.filter(e => e.onboarding_status !== "completed").length === 0 && (
              <div className="col-span-3 py-12 text-center text-sm text-muted-foreground">All employees fully onboarded</div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="kpi" className="mt-4">
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-muted/30">
                  <th className="text-left p-3 font-medium text-muted-foreground">Employee</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">KPI Score</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Performance Rating</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Department</th>
                  <th className="p-3"></th>
                </tr></thead>
                <tbody>
                  {employees.filter(e => e.status === "active").map(emp => (
                    <tr key={emp.id} className="border-b hover:bg-muted/20">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">{(emp.full_name || "?").charAt(0)}</div>
                          <p className="font-medium">{emp.full_name}</p>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2 w-40">
                          <Progress value={emp.kpi_score || 0} className="h-2 flex-1" />
                          <span className="text-xs font-medium w-8">{emp.kpi_score || 0}</span>
                        </div>
                      </td>
                      <td className="p-3"><StatusBadge status={emp.performance_rating} /></td>
                      <td className="p-3 capitalize text-muted-foreground">{(emp.department || "").replace(/_/g, " ")}</td>
                      <td className="p-3">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(emp)} className="text-xs">Update KPI</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>
        <TabsContent value="leave" className="mt-4">
          <LeaveTracker employees={employees} />
        </TabsContent>
      </Tabs>

      {/* Employee Detail Drawer */}
      {selectedEmp && (
        <Dialog open={!!selectedEmp} onOpenChange={() => setSelectedEmp(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Employee Profile</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary">{(selectedEmp.full_name || "?").charAt(0)}</div>
                <div>
                  <h3 className="font-bold text-lg">{selectedEmp.full_name}</h3>
                  <p className="text-sm text-muted-foreground capitalize">{(selectedEmp.role || "").replace(/_/g, " ")} · {(selectedEmp.department || "").replace(/_/g, " ")}</p>
                  <StatusBadge status={selectedEmp.status} className="mt-1" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  ["Email", selectedEmp.email], ["Phone", selectedEmp.phone],
                  ["Charge Rate", selectedEmp.hourly_rate ? formatMoney(selectedEmp.hourly_rate, currency) + "/hr" : "—"],
                  ["Cost Rate", selectedEmp.cost_rate ? formatMoney(selectedEmp.cost_rate, currency) + "/hr" : "—"],
                  ["Start Date", selectedEmp.start_date || "—"], ["Manager", selectedEmp.manager_name || "—"],
                ].map(([l, v]) => (
                  <div key={l}><p className="text-xs text-muted-foreground">{l}</p><p className="font-medium">{v || "—"}</p></div>
                ))}
              </div>
              {(selectedEmp.skills || []).length > 0 && (
                <div><p className="text-xs text-muted-foreground mb-2">Skills</p>
                  <div className="flex flex-wrap gap-1.5">{selectedEmp.skills.map((s, i) => <Badge key={i} variant="secondary" className="text-xs">{s}</Badge>)}</div>
                </div>
              )}
              {selectedEmp.notes && <div><p className="text-xs text-muted-foreground mb-1">Notes</p><p className="text-sm">{selectedEmp.notes}</p></div>}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Form Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Employee" : "Add Employee"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 col-span-2 sm:col-span-1"><Label>Full Name *</Label><Input value={form.full_name} onChange={e => setForm(f => ({...f, full_name: e.target.value}))} required /></div>
              <div className="space-y-1.5 col-span-2 sm:col-span-1"><Label>Email *</Label><Input type="email" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} required /></div>
              <div className="space-y-1.5"><Label>Phone</Label><Input value={form.phone} onChange={e => setForm(f => ({...f, phone: e.target.value}))} /></div>
              <div className="space-y-1.5"><Label>Job Title</Label><Input value={form.job_title} onChange={e => setForm(f => ({...f, job_title: e.target.value}))} /></div>
              <div className="space-y-1.5"><Label>Department *</Label><Select value={form.department} onValueChange={v => setForm(f => ({...f, department: v}))}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d.replace(/_/g, " ")}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-1.5"><Label>Seniority *</Label><Select value={form.role} onValueChange={v => setForm(f => ({...f, role: v}))}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{ROLES.map(r => <SelectItem key={r} value={r}>{r.replace(/_/g, " ")}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-1.5"><Label>System Role</Label><Select value={form.app_role} onValueChange={v => setForm(f => ({...f, app_role: v}))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{APP_ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-1.5"><Label>Status</Label><Select value={form.status} onValueChange={v => setForm(f => ({...f, status: v}))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="on_leave">On Leave</SelectItem><SelectItem value="terminated">Terminated</SelectItem></SelectContent></Select></div>
              <div className="space-y-1.5"><Label>Charge Rate ({currency.symbol}/hr)</Label><Input type="number" value={form.hourly_rate} onChange={e => setForm(f => ({...f, hourly_rate: e.target.value}))} /></div>
              <div className="space-y-1.5"><Label>Cost Rate ({currency.symbol}/hr)</Label><Input type="number" value={form.cost_rate} onChange={e => setForm(f => ({...f, cost_rate: e.target.value}))} /></div>
              <div className="space-y-1.5"><Label>Annual Salary ({currency.symbol})</Label><Input type="number" value={form.salary} onChange={e => setForm(f => ({...f, salary: e.target.value}))} /></div>
              <div className="space-y-1.5"><Label>Start Date</Label><Input type="date" value={form.start_date} onChange={e => setForm(f => ({...f, start_date: e.target.value}))} /></div>
              <div className="space-y-1.5"><Label>Manager</Label><Input value={form.manager_name} onChange={e => setForm(f => ({...f, manager_name: e.target.value}))} /></div>
              <div className="space-y-1.5"><Label>Onboarding Status</Label><Select value={form.onboarding_status} onValueChange={v => setForm(f => ({...f, onboarding_status: v}))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="not_started">Not Started</SelectItem><SelectItem value="in_progress">In Progress</SelectItem><SelectItem value="completed">Completed</SelectItem></SelectContent></Select></div>
              <div className="space-y-1.5"><Label>KPI Score (0–100)</Label><Input type="number" min="0" max="100" value={form.kpi_score} onChange={e => setForm(f => ({...f, kpi_score: e.target.value}))} /></div>
              <div className="space-y-1.5"><Label>Performance Rating</Label><Select value={form.performance_rating} onValueChange={v => setForm(f => ({...f, performance_rating: v}))}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{PERF_RATINGS.map(r => <SelectItem key={r} value={r}>{r.replace(/_/g, " ")}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div className="space-y-1.5">
              <Label>Skills</Label>
              <div className="flex gap-2"><Input value={skillInput} onChange={e => setSkillInput(e.target.value)} placeholder="Add skill" onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addSkill(); } }} /><Button type="button" variant="outline" size="sm" onClick={addSkill}>Add</Button></div>
              <div className="flex flex-wrap gap-1.5">{(form.skills || []).map((s, i) => <span key={i} className="inline-flex items-center gap-1 bg-secondary text-xs px-2 py-1 rounded-md">{s}<button type="button" onClick={() => removeSkill(i)}>×</button></span>)}</div>
            </div>
            <div className="space-y-1.5"><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} rows={2} /></div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button><Button type="submit">{editing ? "Update" : "Create"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete Employee</AlertDialogTitle><AlertDialogDescription>This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteMut.mutate(deleteId)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}