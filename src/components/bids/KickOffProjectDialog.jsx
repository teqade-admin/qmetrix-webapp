import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Rocket } from "lucide-react";

const RIBA_STAGES = ["stage_0", "stage_1", "stage_2", "stage_3", "stage_4", "stage_5", "stage_6", "stage_7"];
const RIBA_LABELS = { stage_0: "Stage 0 — Strategic Definition", stage_1: "Stage 1 — Preparation & Brief", stage_2: "Stage 2 — Concept Design", stage_3: "Stage 3 — Spatial Coordination", stage_4: "Stage 4 — Technical Design", stage_5: "Stage 5 — Manufacturing & Construction", stage_6: "Stage 6 — Handover", stage_7: "Stage 7 — Use" };

export default function KickOffProjectDialog({ open, onOpenChange, bid, employees = [], onConfirm, loading }) {
  const today = new Date().toISOString().split("T")[0];

  const [form, setForm] = useState({
    project_code: "",
    project_manager: bid?.lead_consultant || "",
    riba_stage: "stage_0",
    baseline_start_date: today,
    baseline_end_date: "",
    actual_start_date: today,
  });

  const handleConfirm = () => {
    onConfirm({
      name: bid?.title || "",
      client_name: bid?.client_name || "",
      sector: bid?.sector || "",
      fee_agreed: bid?.fee_proposal || 0,
      project_value: bid?.estimated_value || 0,
      status: "kick_off",
      bid_id: bid?.id || "",
      description: bid?.description || "",
      ...form,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Rocket className="h-4 w-4 text-primary" /> Kick Off Project
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-1.5 bg-muted/30 rounded-lg p-3 text-sm">
          <p className="font-semibold">{bid?.title}</p>
          <p className="text-muted-foreground">{bid?.client_name} · £{(bid?.fee_proposal || 0).toLocaleString()} fee</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Project Code</Label>
            <Input value={form.project_code} onChange={e => setForm(f => ({ ...f, project_code: e.target.value }))} placeholder="e.g. PRJ-001" />
          </div>
          <div className="space-y-1.5">
            <Label>Project Manager</Label>
            <Select value={form.project_manager} onValueChange={v => setForm(f => ({ ...f, project_manager: v }))}>
              <SelectTrigger><SelectValue placeholder="Select PM" /></SelectTrigger>
              <SelectContent>{employees.map(e => <SelectItem key={e.id} value={e.full_name}>{e.full_name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 col-span-2">
            <Label>Starting RIBA Stage</Label>
            <Select value={form.riba_stage} onValueChange={v => setForm(f => ({ ...f, riba_stage: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{RIBA_STAGES.map(s => <SelectItem key={s} value={s}>{RIBA_LABELS[s]}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Baseline Start Date</Label>
            <Input type="date" value={form.baseline_start_date} onChange={e => setForm(f => ({ ...f, baseline_start_date: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Baseline End Date</Label>
            <Input type="date" value={form.baseline_end_date} onChange={e => setForm(f => ({ ...f, baseline_end_date: e.target.value }))} />
          </div>
          <div className="space-y-1.5 col-span-2">
            <Label>Actual Start Date</Label>
            <Input type="date" value={form.actual_start_date} onChange={e => setForm(f => ({ ...f, actual_start_date: e.target.value }))} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleConfirm} disabled={loading}>
            <Rocket className="h-3.5 w-3.5 mr-1" /> {loading ? "Creating…" : "Kick Off Project"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}