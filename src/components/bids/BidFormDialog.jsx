import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const SECTORS = ["residential", "commercial", "infrastructure", "healthcare", "education", "industrial", "mixed_use", "government", "other"];
const STATUSES = ["draft", "in_progress", "submitted", "won", "lost", "withdrawn"];

export default function BidFormDialog({ open, onOpenChange, bid, onSave }) {
  const [form, setForm] = useState({
    title: "", client_name: "", client_contact: "", description: "", sector: "",
    estimated_value: "", fee_proposal: "", submission_date: "", status: "draft",
    probability: "", lead_consultant: "", notes: ""
  });

  useEffect(() => {
    if (bid) setForm({ ...bid, estimated_value: bid.estimated_value || "", fee_proposal: bid.fee_proposal || "", probability: bid.probability || "" });
    else setForm({ title: "", client_name: "", client_contact: "", description: "", sector: "", estimated_value: "", fee_proposal: "", submission_date: "", status: "draft", probability: "", lead_consultant: "", notes: "" });
  }, [bid, open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...form,
      estimated_value: form.estimated_value ? Number(form.estimated_value) : undefined,
      fee_proposal: form.fee_proposal ? Number(form.fee_proposal) : undefined,
      probability: form.probability ? Number(form.probability) : undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading">{bid ? "Edit Bid" : "New Bid"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1.5">
              <Label>Title *</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
            </div>
            <div className="space-y-1.5">
              <Label>Client Name *</Label>
              <Input value={form.client_name} onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))} required />
            </div>
            <div className="space-y-1.5">
              <Label>Client Contact</Label>
              <Input value={form.client_contact} onChange={e => setForm(f => ({ ...f, client_contact: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Sector</Label>
              <Select value={form.sector} onValueChange={v => setForm(f => ({ ...f, sector: v }))}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {SECTORS.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Estimated Project Value (£)</Label>
              <Input type="number" value={form.estimated_value} onChange={e => setForm(f => ({ ...f, estimated_value: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Fee Proposal (£)</Label>
              <Input type="number" value={form.fee_proposal} onChange={e => setForm(f => ({ ...f, fee_proposal: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Submission Date</Label>
              <Input type="date" value={form.submission_date} onChange={e => setForm(f => ({ ...f, submission_date: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Win Probability (%)</Label>
              <Input type="number" min="0" max="100" value={form.probability} onChange={e => setForm(f => ({ ...f, probability: e.target.value }))} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Lead Consultant</Label>
              <Input value={form.lead_consultant} onChange={e => setForm(f => ({ ...f, lead_consultant: e.target.value }))} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" className="bg-accent text-accent-foreground hover:bg-accent/90">{bid ? "Update" : "Create"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}