import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Users, UserCheck, AlertTriangle, Clock } from "lucide-react";
import StatCard from "@/components/shared/StatCard";
import { cn } from "@/lib/utils";

const COLORS = ["#1e3a5f", "#f59e0b", "#10b981", "#8b5cf6", "#ef4444", "#06b6d4"];

export default function ResourceMonitor() {
  const { data: employees = [] } = useQuery({ queryKey: ["employees"], queryFn: () => base44.entities.Employee.list() });
  const { data: allocations = [] } = useQuery({ queryKey: ["allocations"], queryFn: () => base44.entities.ResourceAllocation.list() });
  const { data: timesheets = [] } = useQuery({ queryKey: ["timesheets"], queryFn: () => base44.entities.Timesheet.list() });

  const activeEmployees = employees.filter(e => e.status === "active");
  const activeAllocations = allocations.filter(a => a.status === "active");

  const utilization = activeEmployees.map(emp => {
    const empAllocs = activeAllocations.filter(a => a.employee_name === emp.full_name);
    const totalAlloc = empAllocs.reduce((s, a) => s + (a.allocation_percent || 0), 0);
    const thisWeekHours = timesheets.filter(t => t.employee_name === emp.full_name).reduce((s, t) => s + (t.hours || 0), 0);
    return { ...emp, totalAllocation: totalAlloc, weekHours: thisWeekHours, projectCount: empAllocs.length, projects: empAllocs.map(a => ({ name: a.project_name, alloc: a.allocation_percent })) };
  });

  const avgUtil = utilization.length > 0 ? utilization.reduce((s, u) => s + u.totalAllocation, 0) / utilization.length : 0;
  const overAllocated = utilization.filter(u => u.totalAllocation > 100);
  const underUtilized = utilization.filter(u => u.totalAllocation < 50);
  const fullyAllocated = utilization.filter(u => u.totalAllocation >= 80 && u.totalAllocation <= 100);

  const deptUtil = Object.entries(
    utilization.reduce((acc, u) => {
      const d = u.department || "other";
      if (!acc[d]) acc[d] = { total: 0, count: 0 };
      acc[d].total += u.totalAllocation;
      acc[d].count += 1;
      return acc;
    }, {})
  ).map(([name, { total, count }]) => ({ name: name.replace(/_/g, " "), utilization: Math.round(total / count), headcount: count }));

  const utilBands = [
    { name: "0–25%", value: utilization.filter(u => u.totalAllocation <= 25).length, color: "#ef4444" },
    { name: "26–50%", value: utilization.filter(u => u.totalAllocation > 25 && u.totalAllocation <= 50).length, color: "#f59e0b" },
    { name: "51–75%", value: utilization.filter(u => u.totalAllocation > 50 && u.totalAllocation <= 75).length, color: "#06b6d4" },
    { name: "76–100%", value: utilization.filter(u => u.totalAllocation > 75 && u.totalAllocation <= 100).length, color: "#10b981" },
    { name: ">100%", value: utilization.filter(u => u.totalAllocation > 100).length, color: "#8b5cf6" },
  ].filter(b => b.value > 0);

  const getUtilColor = (pct) => {
    if (pct > 100) return "text-purple-600";
    if (pct >= 80) return "text-emerald-600";
    if (pct >= 50) return "text-blue-600";
    return "text-amber-600";
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-bold text-xl">Resource Monitor</h1>
        <p className="text-sm text-muted-foreground">Real-time team utilization, availability, and workload indicators</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard title="Avg Utilization" value={`${avgUtil.toFixed(0)}%`} icon={UserCheck} color={avgUtil > 90 ? "red" : "green"} />
        <StatCard title="Fully Allocated" value={fullyAllocated.length} icon={Users} subtitle="80–100%" color="green" />
        <StatCard title="Under-Utilized" value={underUtilized.length} icon={Clock} subtitle="< 50%" color="accent" />
        <StatCard title="Over-Allocated" value={overAllocated.length} icon={AlertTriangle} subtitle="> 100%" color="red" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="py-3 px-4 border-b"><CardTitle className="text-sm font-semibold">Utilization by Department</CardTitle></CardHeader>
          <CardContent className="px-2 py-4">
            {deptUtil.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={deptUtil} layout="vertical" margin={{ left: 0 }}>
                  <XAxis type="number" domain={[0, 120]} tick={{ fontSize: 10 }} tickFormatter={v => `${v}%`} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={100} />
                  <Tooltip formatter={v => `${v}%`} />
                  <Bar dataKey="utilization" fill="#1e3a5f" radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">No data</div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="py-3 px-4 border-b"><CardTitle className="text-sm font-semibold">Utilization Distribution</CardTitle></CardHeader>
          <CardContent className="py-4">
            {utilBands.length > 0 ? (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="55%" height={200}>
                  <PieChart>
                    <Pie data={utilBands} dataKey="value" cx="50%" cy="50%" outerRadius={75} innerRadius={30}>
                      {utilBands.map((b, i) => <Cell key={i} fill={b.color} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2">
                  {utilBands.map(b => (
                    <div key={b.name} className="flex items-center gap-2 text-xs">
                      <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: b.color }} />
                      <span className="text-muted-foreground">{b.name}</span>
                      <span className="font-bold">{b.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">No data</div>}
          </CardContent>
        </Card>
      </div>

      {/* Overload / Underload Alerts */}
      {(overAllocated.length > 0 || underUtilized.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {overAllocated.length > 0 && (
            <Card className="border-red-200 bg-red-50">
              <CardHeader className="py-3 px-4 border-b border-red-200"><CardTitle className="text-sm font-semibold text-red-800 flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Over-Allocated Staff</CardTitle></CardHeader>
              <CardContent className="p-4 space-y-2">
                {overAllocated.map(emp => (
                  <div key={emp.id} className="flex items-center justify-between text-sm">
                    <span className="font-medium">{emp.full_name}</span>
                    <Badge variant="outline" className="bg-red-100 text-red-700 border-red-200">{emp.totalAllocation}%</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
          {underUtilized.length > 0 && (
            <Card className="border-amber-200 bg-amber-50">
              <CardHeader className="py-3 px-4 border-b border-amber-200"><CardTitle className="text-sm font-semibold text-amber-800 flex items-center gap-2"><Clock className="h-4 w-4" /> Under-Utilized Staff</CardTitle></CardHeader>
              <CardContent className="p-4 space-y-2">
                {underUtilized.map(emp => (
                  <div key={emp.id} className="flex items-center justify-between text-sm">
                    <span className="font-medium">{emp.full_name}</span>
                    <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-200">{emp.totalAllocation}%</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Full Team List */}
      <Card>
        <CardHeader className="py-3 px-4 border-b"><CardTitle className="text-sm font-semibold">All Staff — Real-Time Utilization</CardTitle></CardHeader>
        <CardContent className="p-4 space-y-3">
          {utilization.sort((a, b) => b.totalAllocation - a.totalAllocation).map(emp => (
            <div key={emp.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary shrink-0">{(emp.full_name || "?").charAt(0)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-medium">{emp.full_name}</p>
                  <span className="text-xs text-muted-foreground capitalize">{(emp.department || "").replace(/_/g, " ")}</span>
                </div>
                <Progress value={Math.min(emp.totalAllocation, 100)} className={cn("h-1.5", emp.totalAllocation > 100 ? "[&>div]:bg-red-500" : emp.totalAllocation >= 80 ? "[&>div]:bg-emerald-500" : emp.totalAllocation >= 50 ? "[&>div]:bg-blue-500" : "[&>div]:bg-amber-500")} />
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {emp.projects.map((p, i) => <span key={i} className="text-[10px] bg-secondary text-secondary-foreground px-1 py-0.5 rounded">{p.name} {p.alloc}%</span>)}
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className={cn("text-sm font-bold", getUtilColor(emp.totalAllocation))}>{emp.totalAllocation}%</p>
                <p className="text-xs text-muted-foreground">{emp.weekHours.toFixed(1)}h</p>
              </div>
            </div>
          ))}
          {utilization.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No employees found</p>}
        </CardContent>
      </Card>
    </div>
  );
}