import React, { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { addMonths, format, startOfMonth, endOfMonth, isWithinInterval, parseISO, differenceInMonths } from "date-fns";

// Working hours per month per person (~160h)
const HOURS_PER_MONTH = 160;

function getMonthsRange(bids, allocations) {
  const today = new Date();
  const months = [];
  for (let i = 0; i < 6; i++) {
    months.push(addMonths(startOfMonth(today), i));
  }
  return months;
}

function getDesignationLabel(role) {
  return (role || "unassigned").replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

// For a bid, spread its hours across its submission_date month onwards, one month per stage
function getBidMonthlyHours(bid, months) {
  const prob = (bid.probability || 0) / 100;
  const stageBreakdown = bid.stage_breakdown || {};
  const stages = Object.entries(stageBreakdown);
  if (stages.length === 0) return {};

  // Start from bid submission date or current month
  const startDate = bid.submission_date ? parseISO(bid.submission_date) : new Date();
  const startMonth = startOfMonth(startDate);

  const result = {}; // { monthKey: { [role]: hours } }
  stages.forEach(([stage, data], idx) => {
    const monthDate = addMonths(startMonth, idx);
    const monthKey = format(monthDate, "yyyy-MM");
    const hours = (Number(data?.hours) || 0) * prob;
    // We distribute bid hours equally across all active employees of relevant roles
    // Tag them under a generic "bid_hours" key since stage doesn't map to employee role
    if (!result[monthKey]) result[monthKey] = 0;
    result[monthKey] += hours;
  });
  return result;
}

// Get allocated hours per employee per month from existing allocations
function getAllocatedHoursPerMonth(allocations, months) {
  const result = {}; // { employee_name: { monthKey: hours } }
  allocations.forEach(a => {
    if (a.status === "completed") return;
    const start = a.start_date ? parseISO(a.start_date) : null;
    const end = a.end_date ? parseISO(a.end_date) : null;
    const monthlyHours = a.allocation_percent ? (a.allocation_percent / 100) * HOURS_PER_MONTH : 0;
    if (!result[a.employee_name]) result[a.employee_name] = {};
    months.forEach(m => {
      const monthKey = format(m, "yyyy-MM");
      const inRange =
        (!start || m >= startOfMonth(start)) &&
        (!end || m <= endOfMonth(end));
      if (inRange) {
        result[a.employee_name][monthKey] = (result[a.employee_name][monthKey] || 0) + monthlyHours;
      }
    });
  });
  return result;
}

export default function ResourceForecast({ allocations, employees, bids, months }) {
  const activeEmployees = employees.filter(e => e.status === "active");
  const pipelineBids = bids.filter(b => ["submitted", "in_progress"].includes(b.status) && (b.probability || 0) > 0);

  const allocatedHours = useMemo(() => getAllocatedHoursPerMonth(allocations, months), [allocations, months]);

  // Group employees by role/designation
  const byDesignation = useMemo(() => {
    const map = {};
    activeEmployees.forEach(emp => {
      const role = emp.role || "unassigned";
      if (!map[role]) map[role] = [];
      map[role].push(emp);
    });
    return map;
  }, [activeEmployees]);

  // For each month, compute total forecasted demand (from bids, probability-weighted)
  const bidDemandByMonth = useMemo(() => {
    const result = {}; // { monthKey: totalHours }
    pipelineBids.forEach(bid => {
      const monthHours = getBidMonthlyHours(bid, months);
      Object.entries(monthHours).forEach(([mk, h]) => {
        result[mk] = (result[mk] || 0) + h;
      });
    });
    return result;
  }, [pipelineBids, months]);

  // For each designation + month: available capacity, used capacity, demand, gap, hires needed
  const forecastTable = useMemo(() => {
    return Object.entries(byDesignation).map(([role, emps]) => {
      const roleFraction = activeEmployees.length > 0 ? emps.length / activeEmployees.length : 0;
      const monthData = months.map(m => {
        const mk = format(m, "yyyy-MM");
        // Total available hours for this designation
        const totalCapacity = emps.length * HOURS_PER_MONTH;
        // Total currently allocated hours
        const usedHours = emps.reduce((s, emp) => s + (allocatedHours[emp.full_name]?.[mk] || 0), 0);
        const availableHours = Math.max(0, totalCapacity - usedHours);
        // Bid demand allocated proportionally by headcount share
        const bidDemand = Math.round((bidDemandByMonth[mk] || 0) * roleFraction);
        const gap = bidDemand - availableHours;
        const hiresNeeded = gap > 0 ? Math.ceil(gap / HOURS_PER_MONTH) : 0;
        return { month: m, mk, totalCapacity, usedHours, availableHours, bidDemand, gap, hiresNeeded };
      });
      return { role, label: getDesignationLabel(role), count: emps.length, monthData };
    });
  }, [byDesignation, months, allocatedHours, bidDemandByMonth, activeEmployees.length]);

  // Summary: total hires needed per month across all designations
  const monthTotals = months.map(m => {
    const mk = format(m, "yyyy-MM");
    return {
      mk,
      month: m,
      totalHires: forecastTable.reduce((s, d) => s + (d.monthData.find(md => md.mk === mk)?.hiresNeeded || 0), 0)
    };
  });

  return (
    <div className="space-y-5">
      {/* Month-wise hire summary bar */}
      <Card className="p-4">
        <h3 className="font-semibold text-sm mb-3">Monthly New Hire Summary</h3>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {monthTotals.map(({ mk, month, totalHires }) => (
            <div key={mk} className={cn(
              "rounded-lg p-3 text-center border",
              totalHires > 0 ? "border-amber-300 bg-amber-50" : "border-emerald-200 bg-emerald-50/50"
            )}>
              <p className="text-xs font-medium text-muted-foreground">{format(month, "MMM yy")}</p>
              <p className={cn("text-2xl font-bold mt-1", totalHires > 0 ? "text-amber-700" : "text-emerald-600")}>{totalHires}</p>
              <p className="text-[10px] text-muted-foreground">{totalHires > 0 ? "hire" + (totalHires > 1 ? "s needed" : " needed") : "sufficient"}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Designation-wise breakdown table */}
      <Card className="p-4">
        <h3 className="font-semibold text-sm mb-3">Hire Requirements by Designation & Month</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left p-2 font-medium text-muted-foreground">Designation</th>
                <th className="text-center p-2 font-medium text-muted-foreground">Staff</th>
                {months.map(m => (
                  <th key={format(m, "yyyy-MM")} className="text-center p-2 font-medium text-muted-foreground min-w-[80px]">
                    {format(m, "MMM yy")}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {forecastTable.map(({ role, label, count, monthData }) => (
                <tr key={role} className="border-b hover:bg-muted/10">
                  <td className="p-2 font-medium capitalize">{label}</td>
                  <td className="p-2 text-center text-muted-foreground">{count}</td>
                  {monthData.map(({ mk, hiresNeeded, availableHours, bidDemand, usedHours, totalCapacity }) => (
                    <td key={mk} className="p-2 text-center">
                      <div className="flex flex-col items-center gap-0.5">
                        {hiresNeeded > 0 ? (
                          <span className="inline-block bg-red-100 text-red-700 font-bold text-sm px-2 py-0.5 rounded">
                            +{hiresNeeded}
                          </span>
                        ) : (
                          <span className="inline-block bg-emerald-50 text-emerald-700 text-sm px-2 py-0.5 rounded">
                            ✓
                          </span>
                        )}
                        <span className="text-[9px] text-muted-foreground">{Math.round(availableHours)}h avail</span>
                        {bidDemand > 0 && <span className="text-[9px] text-amber-600">{Math.round(bidDemand)}h demand</span>}
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[10px] text-muted-foreground mt-3">
          * Demand is probability-weighted from pipeline bids ({pipelineBids.length} active), distributed proportionally by headcount per designation. Capacity = {HOURS_PER_MONTH}h/person/month minus current allocations.
        </p>
      </Card>

      {/* Pipeline bids contributing to demand */}
      <Card className="p-4">
        <h3 className="font-semibold text-sm mb-3">Pipeline Bids Contributing to Demand</h3>
        {pipelineBids.length === 0 ? (
          <p className="text-sm text-muted-foreground">No active pipeline bids with probability set</p>
        ) : (
          <div className="space-y-2">
            {pipelineBids.map(bid => {
              const totalHours = Object.values(bid.stage_breakdown || {}).reduce((s, st) => s + (Number(st?.hours) || 0), 0);
              const weightedHours = Math.round(totalHours * (bid.probability || 0) / 100);
              return (
                <div key={bid.id} className="flex items-center justify-between p-2.5 rounded-lg border">
                  <div>
                    <p className="font-medium text-sm">{bid.title}</p>
                    <p className="text-xs text-muted-foreground">{bid.client_name} · starts {bid.submission_date ? format(parseISO(bid.submission_date), "MMM yy") : "TBD"}</p>
                  </div>
                  <div className="text-right flex items-center gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">{totalHours}h raw</p>
                      <p className="text-sm font-semibold">{weightedHours}h weighted</p>
                    </div>
                    <Badge variant="outline" className={cn(
                      "text-xs",
                      bid.probability >= 70 ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                      bid.probability >= 40 ? "bg-amber-50 text-amber-700 border-amber-200" :
                      "bg-muted text-muted-foreground"
                    )}>
                      {bid.probability}%
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}