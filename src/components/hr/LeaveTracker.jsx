import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, Check, X, CalendarDays, Clock, CalendarCheck, CalendarClock, Lock, Search } from "lucide-react";
import StatusBadge from "@/components/shared/StatusBadge";
import EmptyState from "@/components/shared/EmptyState";
import Pagination, { usePagination } from "@/components/shared/Pagination";
import { format, differenceInBusinessDays, parseISO } from "date-fns";

const LEAVE_TYPES = ["annual", "sick", "maternity", "paternity", "unpaid", "compassionate", "study", "other"];

const defaultForm = {
  employee_name: "", leave_type: "annual", start_date: "", end_date: "",
  days_requested: "", reason: "", status: "pending", notes: ""
};

const leaveTypeColors = {
  annual: "bg-blue-100 text-blue-700 border-blue-200",
  sick: "bg-red-100 text-red-700 border-red-200",
  maternity: "bg-pink-100 text-pink-700 border-pink-200",
  paternity: "bg-purple-100 text-purple-700 border-purple-200",
  unpaid: "bg-gray-100 text-gray-700 border-gray-200",
  compassionate: "bg-orange-100 text-orange-700 border-orange-200",
  study: "bg-green-100 text-green-700 border-green-200",
  other: "bg-slate-100 text-slate-700 border-slate-200",
};

/**
 * LeaveTracker
 * @param {object[]} employees         - employee records (for the request dialog dropdown).
 * @param {"self"|"team"|"all"} scope  - "self": only the signed-in user's requests (no approval);
 *                                        "team": requests by the user's team (approval enabled);
 *                                        "all": every request (default, used by admin/HR views).
 * @param {string} currentEmployeeName - resolved full name of the signed-in user.
 * @param {string[]} teamNames         - employee names visible in "team" scope.
 * @param {number} totalLeaves         - annual leave entitlement (days), used for the Self summary.
 */
export default function LeaveTracker({ employees = [], scope = "all", currentEmployeeName = "", teamNames = [], totalLeaves = 0 }) {
  const isSelf = scope === "self";
  const isTeam = scope === "team";
  const canApprove = scope === "team" || scope === "all";
  const canRequest = !isTeam; // Team view is approve/reject only.
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [rejectId, setRejectId] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [formError, setFormError] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();

  const { data: allLeaves = [] } = useQuery({
    queryKey: ["leaves"],
    queryFn: () => base44.entities.LeaveRequest.list("-created_date"),
  });

  // Restrict to the active scope.
  const leaves = React.useMemo(() => {
    if (isSelf) return allLeaves.filter(l => l.employee_name === currentEmployeeName);
    if (scope === "team") return allLeaves.filter(l => teamNames.includes(l.employee_name));
    return allLeaves;
  }, [allLeaves, isSelf, scope, currentEmployeeName, teamNames]);

  const createMut = useMutation({ mutationFn: d => base44.entities.LeaveRequest.create(d), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["leaves"] }); setDialogOpen(false); } });
  const updateMut = useMutation({ mutationFn: ({ id, data }) => base44.entities.LeaveRequest.update(id, data), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["leaves"] }); setDialogOpen(false); setEditing(null); } });
  const deleteMut = useMutation({ mutationFn: id => base44.entities.LeaveRequest.delete(id), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["leaves"] }); setRejectId(null); } });

  const openNew = () => { setFormError(""); setEditing(null); setForm({ ...defaultForm, employee_name: isSelf ? currentEmployeeName : "" }); setDialogOpen(true); };
  const openEdit = (l) => { setFormError(""); setEditing(l); setForm({ ...defaultForm, ...l }); setDialogOpen(true); };

  const calcDays = (start, end) => {
    if (!start || !end) return "";
    const d = differenceInBusinessDays(parseISO(end), parseISO(start)) + 1;
    return d > 0 ? d : "";
  };

  // Stats
  const pending = leaves.filter(l => l.status === "pending").length;
  const approved = leaves.filter(l => l.status === "approved").length;
  const approvedDays = leaves.filter(l => l.status === "approved").reduce((s, l) => s + (l.days_requested || 0), 0);
  const pendingDays = leaves.filter(l => l.status === "pending").reduce((s, l) => s + (l.days_requested || 0), 0);
  // Remaining = entitlement − already-approved − still-pending.
  const remainingLeaves = totalLeaves - approvedDays - pendingDays;

  const handleSave = (e) => {
    e.preventDefault();
    setFormError("");

    // Approved leave is locked and cannot be modified.
    if (editing && editing.status === "approved") {
      setFormError("This leave has been approved and can no longer be edited.");
      return;
    }

    // End date must not be before the start date.
    if (form.start_date && form.end_date && parseISO(form.end_date) < parseISO(form.start_date)) {
      setFormError("End date can't be before the start date.");
      return;
    }

    const days = Number(form.days_requested) || calcDays(form.start_date, form.end_date) || 1;

    // Self requests can't exceed the remaining balance. When editing a request that
    // already counts toward "pending", add its current days back before comparing.
    if (isSelf) {
      const editingPendingDays = editing && editing.status === "pending" ? (editing.days_requested || 0) : 0;
      const available = remainingLeaves + editingPendingDays;
      if (days > available) {
        const left = Math.max(available, 0);
        setFormError(
          `You only have ${left} day${left === 1 ? "" : "s"} of leave left, so a ${days}-day request can't be submitted. Please shorten the dates or contact HR.`
        );
        return;
      }
    }

    const data = { ...form, days_requested: days };
    editing ? updateMut.mutate({ id: editing.id, data }) : createMut.mutate(data);
  };

  const approve = (id) => updateMut.mutate({ id, data: { status: "approved", approved_by: currentEmployeeName } });
  const reject = (id) => updateMut.mutate({ id, data: { status: "rejected", approved_by: currentEmployeeName } });

  const statusFiltered = statusFilter === "all" ? leaves : leaves.filter(l => l.status === statusFilter);
  const filtered = statusFiltered.filter(l => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (l.employee_name || "").toLowerCase().includes(q)
      || (l.leave_type || "").toLowerCase().includes(q)
      || (l.reason || "").toLowerCase().includes(q);
  });
  const pager = usePagination(filtered, 8);

  return (
    <div className="space-y-4">
      <div className={`grid grid-cols-2 gap-3 ${isSelf ? "sm:grid-cols-3 lg:grid-cols-5" : "sm:grid-cols-3"}`}>
        {isSelf && (
          <>
            <Card className="p-4 flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-indigo-100 flex items-center justify-center"><CalendarCheck className="h-4 w-4 text-indigo-600" /></div>
              <div><p className="text-xs text-muted-foreground">Total Leaves</p><p className="text-xl font-bold">{totalLeaves}</p></div>
            </Card>
            <Card className="p-4 flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-teal-100 flex items-center justify-center"><CalendarClock className="h-4 w-4 text-teal-600" /></div>
              <div><p className="text-xs text-muted-foreground">Remaining Leaves</p><p className={`text-xl font-bold ${remainingLeaves < 0 ? "text-destructive" : ""}`}>{remainingLeaves}</p></div>
            </Card>
          </>
        )}
        <Card className="p-4 flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-amber-100 flex items-center justify-center"><Clock className="h-4 w-4 text-amber-600" /></div>
          <div><p className="text-xs text-muted-foreground">Pending</p><p className="text-xl font-bold">{pending}</p></div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-green-100 flex items-center justify-center"><Check className="h-4 w-4 text-green-600" /></div>
          <div><p className="text-xs text-muted-foreground">Approved</p><p className="text-xl font-bold">{approved}</p></div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-blue-100 flex items-center justify-center"><CalendarDays className="h-4 w-4 text-blue-600" /></div>
          <div><p className="text-xs text-muted-foreground">Days Approved</p><p className="text-xl font-bold">{approvedDays}</p></div>
        </Card>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-2">
          {["all", "pending", "approved", "rejected"].map(s => (
            <Button key={s} size="sm" variant={statusFilter === s ? "default" : "outline"} onClick={() => setStatusFilter(s)} className="capitalize text-xs h-8">
              {s}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9 w-44 h-8" />
          </div>
          {canRequest && <Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1" />Request Leave</Button>}
        </div>
      </div>

      <Card>
        {filtered.length === 0 ? (
          <EmptyState title="No leave requests" actionLabel={canRequest ? "Request Leave" : undefined} onAction={canRequest ? openNew : undefined} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left p-3 font-medium text-muted-foreground">Employee</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Type</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">From</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">To</th>
                  <th className="text-center p-3 font-medium text-muted-foreground">Days</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Reason</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                  <th className="p-3 w-28"></th>
                </tr>
              </thead>
              <tbody>
                {pager.pageItems.map(l => (
                  <tr key={l.id} className="border-b hover:bg-muted/20">
                    <td className="p-3 font-medium">{l.employee_name}</td>
                    <td className="p-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-medium border capitalize ${leaveTypeColors[l.leave_type] || leaveTypeColors.other}`}>
                        {(l.leave_type || "").replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="p-3 text-xs">{l.start_date ? format(parseISO(l.start_date), "dd MMM yy") : "—"}</td>
                    <td className="p-3 text-xs">{l.end_date ? format(parseISO(l.end_date), "dd MMM yy") : "—"}</td>
                    <td className="p-3 text-center font-semibold">{l.days_requested || "—"}</td>
                    <td className="p-3 text-xs text-muted-foreground max-w-[160px] truncate">{l.reason || "—"}</td>
                    <td className="p-3"><StatusBadge status={l.status} /></td>
                    <td className="p-3">
                      <div className="flex gap-1">
                        {canApprove && l.status === "pending" && (
                          <>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600 hover:text-green-700" onClick={() => approve(l.id)} title="Approve">
                              <Check className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => reject(l.id)} title="Reject">
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                        {/* Only the employee can edit/delete their own request; managers approve/reject only. */}
                        {isSelf && (l.status === "approved" ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground px-1"><Lock className="h-3 w-3" />Locked</span>
                        ) : (
                          <>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(l)} title="Edit">
                              <CalendarDays className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setRejectId(l.id)} title="Delete">
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination {...pager} />
          </div>
        )}
      </Card>

      {/* Request Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? "Edit Leave Request" : "Request Leave"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            {isSelf && (
              <div className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2 text-xs">
                <span className="text-muted-foreground">Leave balance</span>
                <span className={`font-semibold ${remainingLeaves < 0 ? "text-destructive" : ""}`}>{Math.max(remainingLeaves, 0)} of {totalLeaves} days remaining</span>
              </div>
            )}
            {formError && (
              <Alert variant="destructive">
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-1.5">
              <Label>Employee *</Label>
              {isSelf ? (
                <Input value={currentEmployeeName} disabled />
              ) : (
                <Select value={form.employee_name} onValueChange={v => setForm(f => ({...f, employee_name: v}))}>
                  <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                  <SelectContent>
                    {employees.length > 0
                      ? employees.map(e => <SelectItem key={e.id} value={e.full_name}>{e.full_name}</SelectItem>)
                      : <SelectItem value={form.employee_name || "—"} disabled>No employees found</SelectItem>
                    }
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Leave Type *</Label>
              <Select value={form.leave_type} onValueChange={v => setForm(f => ({...f, leave_type: v}))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{LEAVE_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Start Date *</Label>
                <Input type="date" value={form.start_date} onChange={e => {
                  const sd = e.target.value;
                  const days = calcDays(sd, form.end_date);
                  setForm(f => ({...f, start_date: sd, days_requested: days || f.days_requested}));
                }} required />
              </div>
              <div className="space-y-1.5">
                <Label>End Date *</Label>
                <Input type="date" value={form.end_date} onChange={e => {
                  const ed = e.target.value;
                  const days = calcDays(form.start_date, ed);
                  setForm(f => ({...f, end_date: ed, days_requested: days || f.days_requested}));
                }} required />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Working Days</Label>
              <Input type="number" min="0.5" step="0.5" value={form.days_requested} onChange={e => setForm(f => ({...f, days_requested: e.target.value}))} placeholder="Auto-calculated" />
            </div>
            <div className="space-y-1.5">
              <Label>Reason</Label>
              <Textarea value={form.reason} onChange={e => setForm(f => ({...f, reason: e.target.value}))} rows={2} placeholder="Optional reason..." />
            </div>
            {editing && (
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({...f, status: v}))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["pending","approved","rejected","cancelled"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit">{editing ? "Update" : "Submit Request"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!rejectId} onOpenChange={() => setRejectId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete Leave Request</AlertDialogTitle><AlertDialogDescription>This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteMut.mutate(rejectId)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}