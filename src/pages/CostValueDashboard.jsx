import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, Legend, ComposedChart, Area } from "recharts";
import { DollarSign, TrendingUp, TrendingDown, Target, AlertTriangle } from "lucide-react";
import StatCard from "@/components/shared/StatCard";
import StatusBadge from "@/components/shared/StatusBadge";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useCurrency, formatMoney } from "@/components/shared/CurrencyContext";

export default function CostValueDashboard() {
  const { currency } = useCurrency();
  const { data: projects = [] } = useQuery({ queryKey: ["projects"], queryFn: () => base44.entities.Project.list() });
  const { data: invoices = [] } = useQuery({ queryKey: ["invoices"], queryFn: () => base44.entities.Invoice.list() });
  const { data: expenses = [] } = useQuery({ queryKey: ["expenses"], queryFn: () => base44.entities.Expense.list() });
  const { data: timesheets = [] } = useQuery({ queryKey: ["timesheets"], queryFn: () => base44.entities.Timesheet.list() });
  const { data: allocations = [] } = useQuery({ queryKey: ["allocations"], queryFn: () => base44.entities.ResourceAllocation.list() });
  const { data: employees = [] } = useQuery({ queryKey: ["employees"], queryFn: () => base44.entities.Employee.list() });

  const activeProjects = projects.filter(p => p.status !== "closed");
  const totalFeeAgreed = projects.reduce((s, p) => s + (p.fee_agreed || 0), 0);
  const totalInvoiced = invoices.reduce((s, i) => s + (i.total_amount || i.amount || 0), 0);
  const totalPaid = invoices.filter(i => i.status === "paid").reduce((s, i) => s + (i.total_amount || i.amount || 0), 0);
  const totalCosts = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const outstanding = invoices.filter(i => ["sent", "overdue"].includes(i.status)).reduce((s, i) => s + (i.total_amount || i.amount || 0), 0);
  const margin = totalPaid > 0 ? ((totalPaid - totalCosts) / totalPaid * 100) : 0;

  // Calculate earned value per project
  const projectMetrics = activeProjects.map(p => {
    const feeAgreed = p.fee_agreed || 0;
    const feeInvoiced = p.fee_invoiced || 0;
    const costToDate = p.cost_to_date || 0;
    const progress = (p.progress_percent || 0) / 100;
    const earnedValue = feeAgreed * progress;
    const variance = earnedValue - costToDate;
    const projectInvoices = invoices.filter(i => i.project_name === p.name);
    const paid = projectInvoices.filter(i => i.status === "paid").reduce((s, i) => s + (i.total_amount || i.amount || 0), 0);
    const projectMargin = feeAgreed > 0 ? ((feeAgreed - costToDate) / feeAgreed * 100) : null;
    return { ...p, earnedValue, variance, paid, projectMargin, invoiceCount: projectInvoices.length };
  });

  // Chart data for Fee vs Cost vs Invoiced
  const chartData = projectMetrics.slice(0, 8).map(p => ({
    name: (p.name || "").substring(0, 12),
    fee: p.fee_agreed || 0,
    cost: p.cost_to_date || 0,
    invoiced: p.fee_invoiced || 0,
    earned: Math.round(p.earnedValue),
  }));

  // Cost to complete
  const totalEarned = projectMetrics.reduce((s, p) => s + p.earnedValue, 0);
  const totalActualCost = projectMetrics.reduce((s, p) => s + (p.cost_to_date || 0), 0);
  const costVariance = totalEarned - totalActualCost;

  return (
    <div className="space-y-6">
      <div><h1 className="font-bold text-xl">Cost & Value Monitoring</h1><p className="text-sm text-muted-foreground">Earned value, profitability, variance analysis across all projects</p></div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard title="Fee Agreed" value={`${currency.symbol}${(totalFeeAgreed/1000).toFixed(0)}k`} icon={Target} color="primary" />
        <StatCard title="Total Invoiced" value={`${currency.symbol}${(totalInvoiced/1000).toFixed(0)}k`} icon={DollarSign} color="blue" />
        <StatCard title="Received" value={`${currency.symbol}${(totalPaid/1000).toFixed(0)}k`} icon={TrendingUp} color="green" />
        <StatCard title="Outstanding" value={`${currency.symbol}${(outstanding/1000).toFixed(0)}k`} icon={AlertTriangle} color={outstanding > 0 ? "red" : "green"} />
        <StatCard title="Total Costs" value={`${currency.symbol}${(totalCosts/1000).toFixed(0)}k`} icon={TrendingDown} color="accent" />
        <StatCard title="Gross Margin" value={`${margin.toFixed(1)}%`} icon={TrendingUp} color={margin >= 20 ? "green" : "red"} trendUp={margin >= 0} />
      </div>

      {/* Earned Value Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Earned Value (BCWP)</p>
          <p className="text-2xl font-bold">{currency.symbol}{(totalEarned/1000).toFixed(0)}k</p>
          <p className="text-xs text-muted-foreground mt-1">Budget × % complete</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Actual Cost (ACWP)</p>
          <p className="text-2xl font-bold">{currency.symbol}{(totalActualCost/1000).toFixed(0)}k</p>
          <p className="text-xs text-muted-foreground mt-1">Cost incurred to date</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Cost Variance (CV)</p>
          <p className={`text-2xl font-bold ${costVariance >= 0 ? "text-emerald-600" : "text-red-500"}`}>{currency.symbol}{(costVariance/1000).toFixed(0)}k</p>
          <p className="text-xs text-muted-foreground mt-1">{costVariance >= 0 ? "Under budget" : "Over budget"}</p>
        </Card>
      </div>

      {/* Fee vs Cost Bar Chart */}
      <Card>
        <CardHeader className="py-3 px-4 border-b"><CardTitle className="text-sm font-semibold">Fee vs Cost vs Earned — By Project</CardTitle></CardHeader>
        <CardContent className="px-2 py-4">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData} margin={{ bottom: 40 }}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${currency.symbol}${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={v => `${currency.symbol}${v.toLocaleString()}`} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="fee" name="Fee Agreed" fill="#1e3a5f" radius={[2,2,0,0]} />
                <Bar dataKey="earned" name="Earned Value" fill="#10b981" radius={[2,2,0,0]} />
                <Bar dataKey="cost" name="Cost to Date" fill="#ef4444" radius={[2,2,0,0]} />
                <Bar dataKey="invoiced" name="Invoiced" fill="#f59e0b" radius={[2,2,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">No project data</div>}
        </CardContent>
      </Card>

      {/* Project Profitability Table */}
      <Card>
        <CardHeader className="py-3 px-4 border-b"><CardTitle className="text-sm font-semibold">Project Profitability Analysis</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/30">
                <th className="text-left p-3 font-medium text-muted-foreground">Project</th>
                <th className="text-right p-3 font-medium text-muted-foreground">Fee</th>
                <th className="text-right p-3 font-medium text-muted-foreground">Cost</th>
                <th className="text-right p-3 font-medium text-muted-foreground">Earned</th>
                <th className="text-right p-3 font-medium text-muted-foreground">Variance</th>
                <th className="text-right p-3 font-medium text-muted-foreground">Margin</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Progress</th>
              </tr></thead>
              <tbody>
                {projectMetrics.map(p => (
                  <tr key={p.id} className="border-b hover:bg-muted/20">
                    <td className="p-3"><p className="font-medium">{p.name}</p><p className="text-xs text-muted-foreground">{p.client_name}</p></td>
                    <td className="p-3 text-right font-medium">{formatMoney(p.fee_agreed || 0, currency)}</td>
                    <td className="p-3 text-right">{formatMoney(p.cost_to_date || 0, currency)}</td>
                    <td className="p-3 text-right text-blue-600">{formatMoney(Math.round(p.earnedValue), currency)}</td>
                    <td className={`p-3 text-right font-semibold ${p.variance >= 0 ? "text-emerald-600" : "text-red-500"}`}>{formatMoney(Math.round(p.variance), currency)}</td>
                    <td className={`p-3 text-right font-semibold ${(p.projectMargin || 0) >= 20 ? "text-emerald-600" : (p.projectMargin || 0) >= 0 ? "text-amber-600" : "text-red-500"}`}>{p.projectMargin !== null ? `${p.projectMargin.toFixed(1)}%` : "—"}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-2 w-28"><Progress value={p.progress_percent || 0} className="h-1.5 flex-1" /><span className="text-xs">{p.progress_percent || 0}%</span></div>
                    </td>
                  </tr>
                ))}
                {projectMetrics.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">No active projects</td></tr>}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}