import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, FileText, FolderKanban, DollarSign, AlertTriangle, TrendingUp, Clock, CheckCircle2, Target } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend, AreaChart, Area } from "recharts";
import StatCard from "@/components/shared/StatCard";
import StatusBadge from "@/components/shared/StatusBadge";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useCurrency, formatMoney } from "@/components/shared/CurrencyContext";

const COLORS = ["#1e3a5f", "#f59e0b", "#10b981", "#8b5cf6", "#ef4444", "#06b6d4", "#f97316"];

export default function Dashboard() {
  const { currency } = useCurrency();
  const { data: employees = [] } = useQuery({ queryKey: ["employees"], queryFn: () => base44.entities.Employee.list() });
  const { data: bids = [] } = useQuery({ queryKey: ["bids"], queryFn: () => base44.entities.Bid.list() });
  const { data: projects = [] } = useQuery({ queryKey: ["projects"], queryFn: () => base44.entities.Project.list() });
  const { data: invoices = [] } = useQuery({ queryKey: ["invoices"], queryFn: () => base44.entities.Invoice.list() });
  const { data: allocations = [] } = useQuery({ queryKey: ["allocations"], queryFn: () => base44.entities.ResourceAllocation.list() });
  const { data: timesheets = [] } = useQuery({ queryKey: ["timesheets"], queryFn: () => base44.entities.Timesheet.list() });
  const { data: deliverables = [] } = useQuery({ queryKey: ["deliverables"], queryFn: () => base44.entities.Deliverable.list() });

  const activeEmployees = employees.filter(e => e.status === "active").length;
  const onboardingCount = employees.filter(e => e.onboarding_status !== "completed").length;
  const activeBids = bids.filter(b => ["draft", "in_progress", "submitted"].includes(b.status)).length;
  const pipelineValue = bids.filter(b => ["submitted", "in_progress"].includes(b.status)).reduce((s, b) => s + (b.fee_proposal || 0), 0);
  const activeProjects = projects.filter(p => !["closed"].includes(p.status)).length;
  const totalRevenue = invoices.filter(i => i.status === "paid").reduce((s, i) => s + (i.total_amount || i.amount || 0), 0);
  const outstanding = invoices.filter(i => ["sent", "overdue"].includes(i.status)).reduce((s, i) => s + (i.total_amount || i.amount || 0), 0);
  const overdueInvoices = invoices.filter(i => i.status === "overdue");

  // Resource utilization
  const activeEmployeesList = employees.filter(e => e.status === "active");
  const avgUtilization = activeEmployeesList.length > 0
    ? activeEmployeesList.reduce((s, emp) => {
        const alloc = allocations.filter(a => a.employee_name === emp.full_name && a.status === "active").reduce((t, a) => t + (a.allocation_percent || 0), 0);
        return s + Math.min(alloc, 100);
      }, 0) / activeEmployeesList.length
    : 0;

  // Deliverables pending approval
  const pendingApprovals = deliverables.filter(d => ["under_review", "in_progress"].includes(d.overall_status)).length;

  // Bid pipeline chart
  const bidsByStatus = ["draft", "in_progress", "submitted", "won", "lost"].map(s => ({
    name: s.replace(/_/g, " "),
    value: bids.filter(b => b.status === s).length,
    fee: bids.filter(b => b.status === s).reduce((s, b) => s + (b.fee_proposal || 0), 0),
  })).filter(d => d.value > 0);

  // Projects by RIBA stage
  const ribaData = ["stage_0", "stage_1", "stage_2", "stage_3", "stage_4", "stage_5", "stage_6", "stage_7"].map(s => ({
    name: s.replace("stage_", "S"),
    value: projects.filter(p => p.riba_stage === s).length,
  })).filter(d => d.value > 0);

  // Financial summary
  const totalFeeAgreed = projects.reduce((s, p) => s + (p.fee_agreed || 0), 0);
  const totalCosts = projects.reduce((s, p) => s + (p.cost_to_date || 0), 0);

  // Project status breakdown
  const projectStatusData = ["kick_off", "feasibility", "design", "pre_construction", "construction", "post_completion"].map(s => ({
    name: s.replace(/_/g, " "),
    value: projects.filter(p => p.status === s).length,
  })).filter(d => d.value > 0);

  return (
    <div className="space-y-6">
      {/* Top KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard title="Active Staff" value={activeEmployees} icon={Users} subtitle={`${onboardingCount} onboarding`} color="primary" />
        <StatCard title="Active Bids" value={activeBids} icon={FileText} subtitle={`${currency.symbol}${(pipelineValue/1000).toFixed(0)}k pipeline`} color="accent" />
        <StatCard title="Live Projects" value={activeProjects} icon={FolderKanban} subtitle={`${projects.length} total`} color="blue" />
        <StatCard title="Avg Utilization" value={`${avgUtilization.toFixed(0)}%`} icon={Users} subtitle={`${activeEmployees} staff`} color={avgUtilization > 85 ? "red" : "green"} />
        <StatCard title="Revenue Paid" value={`${currency.symbol}${(totalRevenue/1000).toFixed(0)}k`} icon={DollarSign} subtitle="All time" color="green" />
        <StatCard title="Outstanding" value={`${currency.symbol}${(outstanding/1000).toFixed(0)}k`} icon={AlertTriangle} subtitle={`${overdueInvoices.length} overdue`} color={overdueInvoices.length > 0 ? "red" : "green"} />
      </div>

      {/* Row 2: Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Bid Pipeline */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold">Bid Pipeline</CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-4">
            {bidsByStatus.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={bidsByStatus} margin={{ left: -20 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip formatter={(v, n) => n === "value" ? v : `${currency.symbol}${v.toLocaleString()}`} />
                  <Bar dataKey="value" fill="#1e3a5f" radius={[3,3,0,0]} name="Count" />
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">No bids yet</div>}
          </CardContent>
        </Card>

        {/* Projects by Status */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold">Project Status</CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-4">
            {projectStatusData.length > 0 ? (
              <div className="flex items-center gap-2">
                <ResponsiveContainer width="60%" height={200}>
                  <PieChart>
                    <Pie data={projectStatusData} dataKey="value" cx="50%" cy="50%" outerRadius={70} innerRadius={30}>
                      {projectStatusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1.5">
                  {projectStatusData.map((item, i) => (
                    <div key={item.name} className="flex items-center gap-1.5 text-xs">
                      <div className="h-2 w-2 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                      <span className="capitalize text-muted-foreground truncate">{item.name}</span>
                      <span className="font-semibold ml-auto">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">No projects yet</div>}
          </CardContent>
        </Card>

        {/* Financial Overview */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold">Financial Overview</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-4">
            <div>
              <div className="flex justify-between text-xs mb-1"><span className="text-muted-foreground">Fee Agreed</span><span className="font-semibold">{currency.symbol}{(totalFeeAgreed/1000).toFixed(0)}k</span></div>
              <Progress value={100} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1"><span className="text-muted-foreground">Invoiced</span><span className="font-semibold">{currency.symbol}{(totalRevenue/1000).toFixed(0)}k</span></div>
              <Progress value={totalFeeAgreed > 0 ? (totalRevenue / totalFeeAgreed) * 100 : 0} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1"><span className="text-muted-foreground">Cost to Date</span><span className="font-semibold">{currency.symbol}{(totalCosts/1000).toFixed(0)}k</span></div>
              <Progress value={totalFeeAgreed > 0 ? (totalCosts / totalFeeAgreed) * 100 : 0} className="h-2" />
            </div>
            <div className="pt-2 border-t">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Gross Margin</span>
                <span className={`font-bold ${totalRevenue > totalCosts ? "text-emerald-600" : "text-red-500"}`}>
                  {totalRevenue > 0 ? (((totalRevenue - totalCosts) / totalRevenue) * 100).toFixed(1) : 0}%
                </span>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1"><span className="text-muted-foreground">Outstanding</span><span className="font-semibold text-amber-600">{currency.symbol}{(outstanding/1000).toFixed(0)}k</span></div>
              <Progress value={totalFeeAgreed > 0 ? (outstanding / totalFeeAgreed) * 100 : 0} className="h-2" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Projects + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Active Projects */}
        <Card>
          <CardHeader className="pb-2 pt-4 px-4 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold">Active Projects</CardTitle>
            <Link to={createPageUrl("Projects")} className="text-xs text-primary hover:underline">View all →</Link>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="space-y-3">
              {projects.filter(p => p.status !== "closed").slice(0, 5).map(proj => (
                <div key={proj.id} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium truncate">{proj.name}</p>
                      <StatusBadge status={proj.status} />
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={proj.progress_percent || 0} className="h-1.5 flex-1" />
                      <span className="text-xs text-muted-foreground whitespace-nowrap">{proj.progress_percent || 0}%</span>
                    </div>
                  </div>
                </div>
              ))}
              {projects.filter(p => p.status !== "closed").length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No active projects</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Alerts & Pending Actions */}
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Alerts & Actions Required
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="space-y-2">
              {overdueInvoices.length > 0 && (
                <Link to={createPageUrl("Finance")} className="flex items-center gap-3 p-2.5 rounded-lg bg-red-50 border border-red-100 hover:bg-red-100 transition-colors">
                  <div className="h-8 w-8 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
                    <DollarSign className="h-4 w-4 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-red-800">{overdueInvoices.length} overdue invoice{overdueInvoices.length > 1 ? "s" : ""}</p>
                    <p className="text-xs text-red-600">{formatMoney(overdueInvoices.reduce((s, i) => s + (i.total_amount || i.amount || 0), 0), currency)} outstanding</p>
                  </div>
                </Link>
              )}
              {pendingApprovals > 0 && (
                <Link to={createPageUrl("DeliveryModule")} className="flex items-center gap-3 p-2.5 rounded-lg bg-amber-50 border border-amber-100 hover:bg-amber-100 transition-colors">
                  <div className="h-8 w-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="h-4 w-4 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-amber-800">{pendingApprovals} deliverable{pendingApprovals > 1 ? "s" : ""} awaiting approval</p>
                    <p className="text-xs text-amber-600">OCRA workflow in progress</p>
                  </div>
                </Link>
              )}
              {onboardingCount > 0 && (
                <Link to={createPageUrl("HRModule")} className="flex items-center gap-3 p-2.5 rounded-lg bg-blue-50 border border-blue-100 hover:bg-blue-100 transition-colors">
                  <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                    <Users className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-blue-800">{onboardingCount} employee{onboardingCount > 1 ? "s" : ""} onboarding</p>
                    <p className="text-xs text-blue-600">Complete onboarding tasks</p>
                  </div>
                </Link>
              )}
              {overdueInvoices.length === 0 && pendingApprovals === 0 && onboardingCount === 0 && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" />
                  <p className="text-sm font-medium">All clear — no actions required</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 4: HR Metrics + Recent Bids */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2 pt-4 px-4 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold">HR Metrics</CardTitle>
            <Link to={createPageUrl("HRModule")} className="text-xs text-primary hover:underline">View all →</Link>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Total Headcount", value: employees.length, color: "text-foreground" },
                { label: "Active", value: employees.filter(e => e.status === "active").length, color: "text-emerald-600" },
                { label: "On Leave", value: employees.filter(e => e.status === "on_leave").length, color: "text-amber-600" },
                { label: "Onboarding", value: employees.filter(e => e.onboarding_status === "in_progress").length, color: "text-blue-600" },
              ].map(item => (
                <div key={item.label} className="p-3 rounded-lg border bg-muted/30">
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 pt-4 px-4 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold">Recent Bids</CardTitle>
            <Link to={createPageUrl("BidManagement")} className="text-xs text-primary hover:underline">View all →</Link>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="space-y-2">
              {bids.slice(0, 5).map(bid => (
                <div key={bid.id} className="flex items-center justify-between py-2 border-b last:border-0 gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{bid.title}</p>
                    <p className="text-xs text-muted-foreground">{bid.client_name}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-semibold">{formatMoney(bid.fee_proposal || 0, currency)}</span>
                    <StatusBadge status={bid.status} />
                  </div>
                </div>
              ))}
              {bids.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No bids yet</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}