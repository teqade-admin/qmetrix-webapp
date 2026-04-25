import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calculator, ChevronDown, ChevronUp, Plus, Trash2, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useCurrency } from "@/components/shared/CurrencyContext";

const STAGES = [
  { value: "pre_concept", label: "Pre-Concept" },
  { value: "concept", label: "Concept" },
  { value: "schematic", label: "Schematic" },
  { value: "detailed_design", label: "Detailed Design" },
  { value: "boq_preparation", label: "BOQ Preparation" },
];

// stageBreakdown shape per stage:
// { employees: [{ name, hours, rate }] }

function formatCurrency(amount, symbol) {
  if (!amount) return `${symbol}0`;
  return `${symbol}${Number(amount).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export default function FeeCalculator({ stageBreakdown, setStageBreakdown, employees = [] }) {
  const { currency: globalCurrency } = useCurrency();
  const [open, setOpen] = useState(false);
  const [expandedStages, setExpandedStages] = useState({});

  const sym = globalCurrency.symbol;

  const getStageEmployees = (stage) => stageBreakdown[stage]?.employees || [];

  const setStageEmployees = (stage, employees) => {
    setStageBreakdown(prev => ({
      ...prev,
      [stage]: {
        ...prev[stage],
        employees,
        // Recalculate totals
        hours: employees.reduce((s, e) => s + (Number(e.hours) || 0), 0),
        fee: employees.reduce((s, e) => s + ((Number(e.hours) || 0) * (Number(e.rate) || 0)), 0),
      }
    }));
  };

  const addEmployee = (stage) => {
    const emps = getStageEmployees(stage);
    setStageEmployees(stage, [...emps, { name: "", hours: "", rate: "" }]);
  };

  const updateEmployee = (stage, idx, field, value) => {
    const emps = [...getStageEmployees(stage)];
    emps[idx] = { ...emps[idx], [field]: value };
    setStageEmployees(stage, emps);
  };

  const removeEmployee = (stage, idx) => {
    const emps = getStageEmployees(stage).filter((_, i) => i !== idx);
    setStageEmployees(stage, emps);
  };

  const toggleStage = (stage) => setExpandedStages(prev => ({ ...prev, [stage]: !prev[stage] }));

  const stageFee = (stage) => {
    return getStageEmployees(stage).reduce((s, e) => s + ((Number(e.hours) || 0) * (Number(e.rate) || 0)), 0);
  };

  const stageHours = (stage) => {
    return getStageEmployees(stage).reduce((s, e) => s + (Number(e.hours) || 0), 0);
  };

  const totalFee = STAGES.reduce((s, st) => s + stageFee(st.value), 0);
  const totalHours = STAGES.reduce((s, st) => s + stageHours(st.value), 0);

  return (
    <div className="border rounded-lg bg-muted/20">
      {/* Header */}
      <button
        type="button"
        className="flex items-center justify-between w-full p-4"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-2 font-semibold text-sm">
          <Calculator className="h-4 w-4" />
          Fee Calculator by Stage
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            {totalHours > 0 && `${totalHours}h · `}
            <span className="font-semibold text-foreground">{formatCurrency(totalFee, sym)}</span>
          </span>
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t pt-3">
          {/* Summary totals row */}
          <div className="grid grid-cols-5 gap-2 text-xs font-medium text-muted-foreground border-b pb-2">
            <span className="col-span-2">Stage</span>
            <span className="text-right">Total Hours</span>
            <span className="text-right">Total Fee</span>
            <span className="text-right">% of Total</span>
          </div>

          {/* Stage rows */}
          {STAGES.map(({ value: stage, label }) => {
            const fee = stageFee(stage);
            const hrs = stageHours(stage);
            const pct = totalFee > 0 ? ((fee / totalFee) * 100).toFixed(0) : 0;
            const expanded = expandedStages[stage];
            const emps = getStageEmployees(stage);

            return (
              <div key={stage} className="border rounded-md bg-background overflow-hidden">
                {/* Stage header */}
                <div
                  className="grid grid-cols-5 gap-2 items-center px-3 py-2 cursor-pointer hover:bg-muted/30"
                  onClick={() => toggleStage(stage)}
                >
                  <div className="col-span-2 flex items-center gap-1.5">
                    <ChevronRight className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${expanded ? "rotate-90" : ""}`} />
                    <span className="text-sm font-medium">{label}</span>
                    {emps.length > 0 && (
                      <Badge variant="outline" className="text-[10px] py-0 h-4">{emps.length} staff</Badge>
                    )}
                  </div>
                  <span className="text-xs text-right text-muted-foreground">{hrs > 0 ? `${hrs}h` : "—"}</span>
                  <span className={`text-xs text-right font-semibold ${fee > 0 ? "text-foreground" : "text-muted-foreground"}`}>
                    {fee > 0 ? formatCurrency(fee, sym) : "—"}
                  </span>
                  <span className="text-xs text-right text-muted-foreground">{pct > 0 ? `${pct}%` : "—"}</span>
                </div>

                {/* Expanded employee rows */}
                {expanded && (
                  <div className="border-t bg-muted/10 px-3 py-2 space-y-2">
                    {/* Column headers */}
                    <div className="grid grid-cols-[1fr_100px_90px_80px_32px] gap-2 text-[10px] font-medium text-muted-foreground uppercase tracking-wide pb-1">
                      <span>Employee</span>
                      <span>Hours</span>
                      <span>Rate ({sym}/hr)</span>
                      <span>Fee</span>
                      <span></span>
                    </div>

                    {emps.map((emp, idx) => {
                      const empFee = (Number(emp.hours) || 0) * (Number(emp.rate) || 0);
                      return (
                        <div key={idx} className="grid grid-cols-[1fr_100px_90px_80px_32px] gap-2 items-center">
                          <Select
                            value={emp.name}
                            onValueChange={v => {
                              const found = employees.find(e => e.full_name === v);
                              updateEmployee(stage, idx, "name", v);
                              if (found?.hourly_rate) updateEmployee(stage, idx, "rate", found.hourly_rate);
                            }}
                          >
                            <SelectTrigger className="h-7 text-xs">
                              <SelectValue placeholder="Select employee" />
                            </SelectTrigger>
                            <SelectContent>
                              {employees.filter(e => e.status !== "terminated").map(e => (
                                <SelectItem key={e.id} value={e.full_name}>
                                  <span>{e.full_name}</span>
                                  {e.hourly_rate && <span className="text-muted-foreground ml-1 text-xs">({sym}{e.hourly_rate}/hr)</span>}
                                </SelectItem>
                              ))}
                              {employees.length === 0 && (
                                <div>
                                  <Input
                                    className="h-7 text-xs m-1 w-[calc(100%-8px)]"
                                    placeholder="Type name..."
                                    value={emp.name}
                                    onClick={e => e.stopPropagation()}
                                    onChange={e => updateEmployee(stage, idx, "name", e.target.value)}
                                  />
                                </div>
                              )}
                            </SelectContent>
                          </Select>
                          {employees.length === 0 && !emp.name && (
                            <Input className="h-7 text-xs col-start-1" placeholder="Name" value={emp.name} onChange={e => updateEmployee(stage, idx, "name", e.target.value)} />
                          )}
                          <Input
                            type="number"
                            className="h-7 text-xs"
                            placeholder="hrs"
                            min="0"
                            step="0.5"
                            value={emp.hours}
                            onChange={e => updateEmployee(stage, idx, "hours", e.target.value)}
                          />
                          <Input
                            type="number"
                            className="h-7 text-xs"
                            placeholder="rate"
                            min="0"
                            value={emp.rate}
                            onChange={e => updateEmployee(stage, idx, "rate", e.target.value)}
                          />
                          <span className={`text-xs font-medium text-right ${empFee > 0 ? "text-foreground" : "text-muted-foreground"}`}>
                            {empFee > 0 ? formatCurrency(empFee, sym) : "—"}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => removeEmployee(stage, idx)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      );
                    })}

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground mt-1"
                      onClick={() => addEmployee(stage)}
                    >
                      <Plus className="h-3 w-3" /> Add Employee
                    </Button>
                  </div>
                )}
              </div>
            );
          })}

          {/* Grand Total */}
          <div className="pt-2 border-t flex justify-between items-center">
            <div className="text-sm font-semibold">Grand Total</div>
            <div className="text-right">
              <div className="text-lg font-bold text-primary">{formatCurrency(totalFee, sym)}</div>
              {totalHours > 0 && <div className="text-xs text-muted-foreground">{totalHours} hours</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}