import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCurrency } from "@/components/shared/CurrencyContext";
import { projectProgress, stageOptions, stageLabel, RIBA_STAGES } from "@/lib/projectProgress";
import { nextProjectCode } from "@/lib/projectCode";

const SECTORS = ["residential","commercial","infrastructure","healthcare","education","industrial","mixed_use","government","other"];
const STATUSES = ["kick_off","feasibility","design","pre_construction","construction","post_completion","closed"];

const emptyForm = {
  name: "", client_name: "", project_code: "", description: "", sector: "",
  project_value: "", fee_agreed: "", fee_invoiced: "", cost_to_date: "",
  status: "kick_off", riba_stage: "stage_0", project_manager: "",
  start_date: "", end_date: "",
  baseline_start_date: "", baseline_end_date: "",
  actual_start_date: "", actual_end_date: "",
  budgeted_hours: "", actual_hours: "",
};

/**
 * Create or edit a project. Shared so the list can create one and the project's
 * own page can edit it, without the two drifting apart.
 *
 * @param {object|null} project   - the project being edited; null to create.
 * @param {object[]} sections     - the project's work sections (progress + gating).
 * @param {object[]} projects     - all projects, for generating a unique code.
 * @param {object[]} employees
 * @param {(data: object) => void} onSave
 */
export default function ProjectFormDialog({
  open, onOpenChange, project = null, sections = [], projects = [], employees = [], onSave, saving = false,
}) {
  const { currency } = useCurrency();
  const [form, setForm] = useState(emptyForm);
  const [tab, setTab] = useState("details");
  const [error, setError] = useState("");
  const editing = !!project;

  useEffect(() => {
    if (!open) return;
    setError("");
    setTab("details");
    setForm(project
      ? {
          ...emptyForm, ...project,
          project_value: project.project_value ?? "", fee_agreed: project.fee_agreed ?? "",
          fee_invoiced: project.fee_invoiced ?? "", cost_to_date: project.cost_to_date ?? "",
          budgeted_hours: project.budgeted_hours ?? "", actual_hours: project.actual_hours ?? "",
        }
      : emptyForm);
  }, [project, open]);

  const progress = projectProgress(sections, form.riba_stage);
  // Gating is measured against the SAVED stage so picking a value in the
  // dropdown doesn't shift its own baseline. Creating is exempt — a project
  // already underway must be enterable at the stage it has reached.
  const stageChoices = editing
    ? stageOptions({ ...form, work_sections: sections, riba_stage: project.riba_stage })
    : RIBA_STAGES.map(stage => ({ stage, disabled: false, reason: "" }));

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    if (!form.name.trim()) { setTab("details"); return setError("Give the project a name."); }
    if (!form.client_name.trim()) { setTab("details"); return setError("Enter the client."); }
    // Sector is fixed at creation so a project is never filed under nothing.
    if (!editing && !form.sector) {
      setTab("details");
      return setError("Choose a sector — it can be changed later, but a project can't be created without one.");
    }

    const num = (v) => (v !== "" && v != null ? Number(v) : undefined);
    onSave({
      ...form,
      // Codes are generated, never typed, so they stay unique and consistent.
      project_code: form.project_code || nextProjectCode(form.name, projects),
      project_value: num(form.project_value),
      fee_agreed: num(form.fee_agreed),
      fee_invoiced: num(form.fee_invoiced),
      cost_to_date: num(form.cost_to_date),
      budgeted_hours: num(form.budgeted_hours),
      actual_hours: num(form.actual_hours),
      progress_percent: projectProgress(sections, form.riba_stage),
    });
  };

  const previewCode = form.project_code || (form.name ? nextProjectCode(form.name, projects) : "—");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{editing ? "Edit Project" : "New Project"}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit}>
          {error && <p className="text-sm text-destructive mb-3">{error}</p>}
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="programme">Programme</TabsTrigger>
              <TabsTrigger value="financials">Financials</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-1.5">
                  <Label>Project Name *</Label>
                  <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Client *</Label>
                  <Input value={form.client_name} onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Project Code</Label>
                  <Input value={previewCode} readOnly className="bg-muted cursor-not-allowed font-mono" />
                  <p className="text-[11px] text-muted-foreground">Generated from the project name.</p>
                </div>
                <div className="space-y-1.5">
                  <Label>Project Manager</Label>
                  <Select value={form.project_manager} onValueChange={v => setForm(f => ({ ...f, project_manager: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {employees.filter(e => e.status === "active").map(e => (
                        <SelectItem key={e.id} value={e.full_name}>{e.full_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Sector{!editing && " *"}</Label>
                  <Select value={form.sector} onValueChange={v => setForm(f => ({ ...f, sector: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{SECTORS.map(s => <SelectItem key={s} value={s} className="capitalize">{s.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s} className="capitalize">{s.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>RIBA Stage</Label>
                  <Select value={form.riba_stage} onValueChange={v => setForm(f => ({ ...f, riba_stage: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {stageChoices.map(({ stage, disabled, reason }) => (
                        <SelectItem key={stage} value={stage} disabled={disabled}>
                          {stageLabel(stage)}
                          {disabled && <span className="text-[10px] text-muted-foreground ml-1">— {reason}</span>}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Progress (%)</Label>
                  <div className="flex items-center gap-2 h-9">
                    <Progress value={progress ?? 0} className="h-1.5 flex-1" />
                    <span className="text-sm shrink-0">{progress != null ? `${progress}%` : "—"}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">Derived from the stage reached and its work sections.</p>
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label>Description</Label>
                  <Textarea rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="programme" className="mt-4">
              <div className="grid grid-cols-2 gap-4">
                {[
                  ["Start Date", "start_date"], ["End Date", "end_date"],
                  ["Baseline Start", "baseline_start_date"], ["Baseline End", "baseline_end_date"],
                  ["Actual Start", "actual_start_date"], ["Actual End", "actual_end_date"],
                ].map(([label, key]) => (
                  <div key={key} className="space-y-1.5">
                    <Label>{label}</Label>
                    <Input type="date" value={form[key] || ""} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
                  </div>
                ))}
                <div className="space-y-1.5">
                  <Label>Budgeted Hours</Label>
                  <Input type="number" value={form.budgeted_hours} onChange={e => setForm(f => ({ ...f, budgeted_hours: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Actual Hours</Label>
                  <Input type="number" value={form.actual_hours} onChange={e => setForm(f => ({ ...f, actual_hours: e.target.value }))} />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="financials" className="mt-4">
              <div className="grid grid-cols-2 gap-4">
                {[
                  ["Project Value", "project_value"], ["Fee Agreed", "fee_agreed"],
                  ["Fee Invoiced", "fee_invoiced"], ["Cost to Date", "cost_to_date"],
                ].map(([label, key]) => (
                  <div key={key} className="space-y-1.5">
                    <Label>{label} ({currency.symbol})</Label>
                    <Input type="number" value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving…" : (editing ? "Update" : "Create")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
