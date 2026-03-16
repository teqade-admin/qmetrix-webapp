import React, { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const DEPARTMENTS = ["cost_management", "quantity_surveying", "project_management", "commercial", "finance", "administration", "executive"];
const ROLES = ["director", "associate_director", "senior_consultant", "consultant", "junior_consultant", "analyst", "administrator"];

export default function EmployeeFormDialog({ open, onOpenChange, employee, onSave }) {
  const [form, setForm] = useState({
    full_name: "", email: "", phone: "", department: "", role: "",
    hourly_rate: "", cost_rate: "", status: "active", start_date: "", skills: []
  });
  const [skillInput, setSkillInput] = useState("");

  useEffect(() => {
    if (employee) {
      setForm({ ...employee, hourly_rate: employee.hourly_rate || "", cost_rate: employee.cost_rate || "" });
    } else {
      setForm({ full_name: "", email: "", phone: "", department: "", role: "", hourly_rate: "", cost_rate: "", status: "active", start_date: "", skills: [] });
    }
  }, [employee, open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...form,
      hourly_rate: form.hourly_rate ? Number(form.hourly_rate) : undefined,
      cost_rate: form.cost_rate ? Number(form.cost_rate) : undefined,
    });
  };

  const addSkill = () => {
    if (skillInput.trim()) {
      setForm(f => ({ ...f, skills: [...(f.skills || []), skillInput.trim()] }));
      setSkillInput("");
    }
  };

  const removeSkill = (idx) => {
    setForm(f => ({ ...f, skills: (f.skills || []).filter((_, i) => i !== idx) }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading">{employee ? "Edit Employee" : "Add Employee"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Full Name *</Label>
              <Input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} required />
            </div>
            <div className="space-y-1.5">
              <Label>Email *</Label>
              <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Start Date</Label>
              <Input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Department *</Label>
              <Select value={form.department} onValueChange={v => setForm(f => ({ ...f, department: v }))}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d.replace(/_/g, " ")}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Role *</Label>
              <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v }))}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {ROLES.map(r => <SelectItem key={r} value={r}>{r.replace(/_/g, " ")}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Hourly Rate (£)</Label>
              <Input type="number" value={form.hourly_rate} onChange={e => setForm(f => ({ ...f, hourly_rate: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Cost Rate (£)</Label>
              <Input type="number" value={form.cost_rate} onChange={e => setForm(f => ({ ...f, cost_rate: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="on_leave">On Leave</SelectItem>
                  <SelectItem value="terminated">Terminated</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Skills</Label>
            <div className="flex gap-2">
              <Input value={skillInput} onChange={e => setSkillInput(e.target.value)} placeholder="Add a skill" onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addSkill(); } }} />
              <Button type="button" variant="outline" size="sm" onClick={addSkill}>Add</Button>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {(form.skills || []).map((s, i) => (
                <span key={i} className="inline-flex items-center gap-1 bg-secondary text-secondary-foreground text-xs px-2 py-1 rounded-md">
                  {s}
                  <button type="button" onClick={() => removeSkill(i)} className="text-muted-foreground hover:text-foreground">×</button>
                </span>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" className="bg-accent text-accent-foreground hover:bg-accent/90">
              {employee ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}