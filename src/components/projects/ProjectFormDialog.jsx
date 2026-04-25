import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const SECTORS = ["residential", "commercial", "infrastructure", "healthcare", "education", "industrial", "mixed_use", "government", "other"];
const STATUSES = ["kick_off", "feasibility", "design", "pre_construction", "construction", "post_completion", "closed"];

export default function ProjectFormDialog({ open, onOpenChange, project, onSave }) {
  const [form, setForm] = useState({
    name: "", client_name: "", description: "", sector: "", project_value: "",
    fee_agreed: "", status: "kick_off", start_date: "", end_date: "", project_manager: "", progress_percent: ""
  });

  useEffect(() => {
    if (project) setForm({ ...project, project_value: project.project_value || "", fee_agreed: project.fee_agreed || "", progress_percent: project.progress_percent || "" });
    else setForm({ name: "", client_name: "", description: "", sector: "", project_value: "", fee_agreed: "", status: "kick_off", start_date: "", end_date: "", project_manager: "", progress_percent: "" });
  }, [project, open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...form,
      project_value: form.project_value ? Number(form.project_value) : undefined,
      fee_agreed: form.fee_agreed ? Number(form.fee_agreed) : undefined,
      progress_percent: form.progress_percent ? Number(form.progress_percent) : undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="font-heading">{project ? "Edit Project" : "New Project"}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1.5"><Label>Project Name *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required /></div>
            <div className="space-y-1.5"><Label>Client *</Label><Input value={form.client_name} onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))} required /></div>
            <div className="space-y-1.5"><Label>Project Manager</Label><Input value={form.project_manager} onChange={e => setForm(f => ({ ...f, project_manager: e.target.value }))} /></div>
            <div className="space-y-1.5">
              <Label>Sector</Label>
              <Select value={form.sector} onValueChange={v => setForm(f => ({ ...f, sector: v }))}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{SECTORS.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="space-y-1.5"><Label>Project Value (£)</Label><Input type="number" value={form.project_value} onChange={e => setForm(f => ({ ...f, project_value: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Agreed Fee (£)</Label><Input type="number" value={form.fee_agreed} onChange={e => setForm(f => ({ ...f, fee_agreed: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Start Date</Label><Input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>End Date</Label><Input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Progress (%)</Label><Input type="number" min="0" max="100" value={form.progress_percent} onChange={e => setForm(f => ({ ...f, progress_percent: e.target.value }))} /></div>
            <div className="col-span-2 space-y-1.5"><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} /></div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" className="bg-accent text-accent-foreground hover:bg-accent/90">{project ? "Update" : "Create"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}