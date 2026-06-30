import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Gauge, ClipboardList, Star } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import EmptyState from "@/components/shared/EmptyState";
import { useCurrency, formatMoney } from "@/components/shared/CurrencyContext";
import { getSubordinates, getDirectReports, getSubordinatesToDepth, subtreeDepth } from "@/lib/orgHierarchy";
import { isManagerRole, normalizeRole, canWrite } from "@/lib/permissions";
import LevelFilter from "@/components/shared/LevelFilter";
import { computeScorecard, periodOptions, periodRange, resolveKpiConfig } from "@/lib/kpiScorecard";
import { format } from "date-fns";

const PERF_RATINGS = ["exceptional", "exceeds_expectations", "meets_expectations", "needs_improvement", "unsatisfactory"];
const HR_PRIVILEGED = new Set(["super_admin", "hr_admin", "hr_user"]);

export default function KPIPerformance() {
  const { user, userRole } = useAuth();
  const { currency } = useCurrency();
  const queryClient = useQueryClient();

  const periods = useMemo(() => periodOptions(), []);
  const [period, setPeriod] = useState(periods[0].key);
  const [section, setSection] = useState("scorecard"); // scorecard | reviews
  const [scoreScope, setScoreScope] = useState("self");
  const [reviewScope, setReviewScope] = useState("self");
  const [reviewEmp, setReviewEmp] = useState(null);
  const [reviewForm, setReviewForm] = useState({ rating: "", comments: "", objectives: "" });

  const { data: employees = [] } = useQuery({ queryKey: ["employees"], queryFn: () => base44.entities.Employee.list() });
  const { data: timesheets = [] } = useQuery({ queryKey: ["timesheets"], queryFn: () => base44.entities.Timesheet.list("-date") });
  const { data: settingsRows = [] } = useQuery({ queryKey: ["app_settings"], queryFn: () => base44.entities.AppSettings.list() });
  const { data: reviews = [] } = useQuery({ queryKey: ["performance_reviews"], queryFn: () => base44.entities.PerformanceReview.list("-created_date") });

  const config = resolveKpiConfig(settingsRows[0]?.kpi_config);
  const range = useMemo(() => periodRange(period), [period]);

  const currentEmployee = useMemo(() => {
    const userFullName = user?.user_metadata?.full_name;
    if (!user) return null;
    return employees.find(e => e.email === user.email || (userFullName && e.full_name === userFullName)) || null;
  }, [user, employees]);

  const showEmployeesTab = isManagerRole(userRole);
  const canReview = canWrite(userRole, "KPIPerformance");

  // Team depth filter (L1 = direct reports … LN = deepest level).
  const [teamLevel, setTeamLevel] = useState(1);
  const maxTeamLevel = useMemo(() => (currentEmployee ? subtreeDepth(employees, currentEmployee.id) : 0), [employees, currentEmployee]);
  const effLevel = Math.min(teamLevel, Math.max(1, maxTeamLevel));

  const directReports = useMemo(() => (currentEmployee ? getDirectReports(employees, currentEmployee.id) : []), [employees, currentEmployee]);
  // Team = reports down to the selected level (default: direct reports).
  const teamMembers = useMemo(
    () => (currentEmployee ? getSubordinatesToDepth(employees, currentEmployee.id, effLevel) : []),
    [employees, currentEmployee, effLevel]
  );

  // HR (admin/user): every employee except HR Admins/Users & Super Admins.
  // Super Admin: indirect reports only (subtree minus direct); never equals/superiors.
  const employeeMembers = useMemo(() => {
    if (!showEmployeesTab || !currentEmployee) return [];
    const role = normalizeRole(userRole);
    const directIds = new Set(directReports.map(m => m.id));
    if (role === "hr_admin" || role === "hr_user") {
      return employees
        .filter(e => e.id !== currentEmployee.id && !directIds.has(e.id))
        .filter(e => !HR_PRIVILEGED.has(normalizeRole(e.app_role)));
    }
    return getSubordinates(employees, currentEmployee.id).filter(e => !directIds.has(e.id));
  }, [employees, showEmployeesTab, currentEmployee, directReports, userRole]);

  const reviewFor = (empId) => reviews.find(r => r.employee_id === empId && r.period_label === range.label);

  const saveMut = useMutation({
    mutationFn: async ({ existing, data }) =>
      existing ? base44.entities.PerformanceReview.update(existing.id, data) : base44.entities.PerformanceReview.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["performance_reviews"] }); setReviewEmp(null); },
  });

  const openReview = (emp) => {
    const existing = reviewFor(emp.id);
    setReviewEmp(emp);
    setReviewForm({
      rating: existing?.rating || "",
      comments: existing?.comments || "",
      objectives: existing?.objectives || "",
    });
  };

  const submitReview = (e) => {
    e.preventDefault();
    const sc = computeScorecard(reviewEmp, timesheets, range, config);
    const existing = reviewFor(reviewEmp.id);
    saveMut.mutate({
      existing,
      data: {
        employee_id: reviewEmp.id,
        employee_name: reviewEmp.full_name,
        period_label: range.label,
        period_start: format(range.start, "yyyy-MM-dd"),
        period_end: format(range.end, "yyyy-MM-dd"),
        utilisation: Math.round(sc.utilisation),
        billable_hours: sc.billableHours,
        non_billable_hours: sc.nonBillableHours,
        revenue: sc.revenue,
        kpi_score: sc.kpiScore,
        rating: reviewForm.rating || null,
        comments: reviewForm.comments || null,
        objectives: reviewForm.objectives || null,
        reviewed_by: currentEmployee?.full_name || user?.email || "",
      },
    });
  };

  const reviewSnapshot = reviewEmp ? computeScorecard(reviewEmp, timesheets, range, config) : null;

  return (
    <div className="space-y-5">
      <PageHeader title="KPI & Performance" description="Data-driven scorecards and periodic performance reviews">
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>{periods.map(p => <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>)}</SelectContent>
        </Select>
      </PageHeader>

      <Tabs value={section} onValueChange={setSection}>
        <TabsList>
          <TabsTrigger value="scorecard" className="gap-1.5"><Gauge className="h-4 w-4" /> Scorecard</TabsTrigger>
          <TabsTrigger value="reviews" className="gap-1.5"><ClipboardList className="h-4 w-4" /> Reviews</TabsTrigger>
        </TabsList>

        {/* ── SCORECARD ── */}
        <TabsContent value="scorecard" className="mt-4">
          <Tabs value={scoreScope} onValueChange={setScoreScope}>
            <TabsList className="bg-muted/50">
              <TabsTrigger value="self">Self</TabsTrigger>
              <TabsTrigger value="team">Team</TabsTrigger>
              {showEmployeesTab && <TabsTrigger value="employees">Employees</TabsTrigger>}
            </TabsList>

            <TabsContent value="self" className="mt-4">
              {!currentEmployee
                ? <EmptyState title="No employee record linked to your account" />
                : <ScorecardCard sc={computeScorecard(currentEmployee, timesheets, range, config)} currency={currency} rating={reviewFor(currentEmployee.id)?.rating} />}
            </TabsContent>
            <TabsContent value="team" className="mt-4 space-y-3">
              {maxTeamLevel > 1 && <div className="flex justify-end"><LevelFilter value={effLevel} onChange={setTeamLevel} maxLevel={maxTeamLevel} /></div>}
              <ScorecardTable members={teamMembers} timesheets={timesheets} range={range} config={config} currency={currency}
                reviewFor={reviewFor} canReview={canReview} onReview={openReview} emptyText="You don't have any direct reports." />
            </TabsContent>
            {showEmployeesTab && (
              <TabsContent value="employees" className="mt-4">
                <ScorecardTable members={employeeMembers} timesheets={timesheets} range={range} config={config} currency={currency}
                  reviewFor={reviewFor} canReview={canReview} onReview={openReview} emptyText="No employees to show here." />
              </TabsContent>
            )}
          </Tabs>
        </TabsContent>

        {/* ── REVIEWS ── */}
        <TabsContent value="reviews" className="mt-4">
          <Tabs value={reviewScope} onValueChange={setReviewScope}>
            <TabsList className="bg-muted/50">
              <TabsTrigger value="self">Self</TabsTrigger>
              <TabsTrigger value="team">Team</TabsTrigger>
              {showEmployeesTab && <TabsTrigger value="employees">Employees</TabsTrigger>}
            </TabsList>

            <TabsContent value="self" className="mt-4">
              <ReviewsList reviews={reviews.filter(r => r.employee_id === currentEmployee?.id)} currency={currency} showEmployee={false} />
            </TabsContent>
            <TabsContent value="team" className="mt-4 space-y-3">
              {maxTeamLevel > 1 && <div className="flex justify-end"><LevelFilter value={effLevel} onChange={setTeamLevel} maxLevel={maxTeamLevel} /></div>}
              <ReviewsList reviews={reviews.filter(r => teamMembers.some(m => m.id === r.employee_id))} currency={currency} showEmployee />
            </TabsContent>
            {showEmployeesTab && (
              <TabsContent value="employees" className="mt-4">
                <ReviewsList reviews={reviews.filter(r => employeeMembers.some(m => m.id === r.employee_id))} currency={currency} showEmployee />
              </TabsContent>
            )}
          </Tabs>
        </TabsContent>
      </Tabs>

      {/* Record review dialog */}
      <Dialog open={!!reviewEmp} onOpenChange={() => setReviewEmp(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Review — {reviewEmp?.full_name} · {range.label}</DialogTitle></DialogHeader>
          {reviewSnapshot && (
            <form onSubmit={submitReview} className="space-y-4">
              {/* Computed snapshot */}
              <div className="rounded-lg border bg-muted/20 p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">Computed KPI Score</span>
                  <span className="text-lg font-bold">{reviewSnapshot.kpiScore}</span>
                </div>
                <div className="space-y-1.5">
                  {reviewSnapshot.metrics.map(m => (
                    <MetricRow key={m.key} m={m} currency={currency} />
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Overall Rating</Label>
                <Select value={reviewForm.rating} onValueChange={v => setReviewForm(f => ({ ...f, rating: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select rating" /></SelectTrigger>
                  <SelectContent>{PERF_RATINGS.map(r => <SelectItem key={r} value={r}>{r.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Objectives (next period)</Label><Textarea rows={2} value={reviewForm.objectives} onChange={e => setReviewForm(f => ({ ...f, objectives: e.target.value }))} placeholder="Development goals / objectives..." /></div>
              <div className="space-y-1.5"><Label>Comments</Label><Textarea rows={3} value={reviewForm.comments} onChange={e => setReviewForm(f => ({ ...f, comments: e.target.value }))} placeholder="Manager comments..." /></div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setReviewEmp(null)}>Cancel</Button>
                <Button type="submit" disabled={saveMut.isPending}>{saveMut.isPending ? "Saving…" : "Save Review"}</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MetricRow({ m, currency }) {
  const fmt = (v) => m.unit === "money" ? formatMoney(v, currency) : `${Math.round(v)}${m.unit === "%" ? "%" : m.unit === "h" ? "h" : ""}`;
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-24 text-muted-foreground">{m.label}</span>
      <Progress value={m.attainment * 100} className="h-1.5 flex-1" />
      <span className="w-28 text-right tabular-nums">{fmt(m.actual)} / {fmt(m.target)}</span>
    </div>
  );
}

function ScorecardCard({ sc, currency, rating }) {
  return (
    <Card className="max-w-xl">
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">KPI Score</p>
            <p className={`text-3xl font-bold ${sc.kpiScore >= 80 ? "text-emerald-600" : sc.kpiScore >= 50 ? "text-blue-600" : "text-red-600"}`}>{sc.kpiScore}</p>
          </div>
          {rating && <div className="text-right"><p className="text-xs text-muted-foreground mb-1">Last Rating</p><StatusBadge status={rating} /></div>}
        </div>
        <div className="space-y-2">
          {sc.metrics.map(m => <MetricRow key={m.key} m={m} currency={currency} />)}
        </div>
        <div className="grid grid-cols-3 gap-3 pt-2 border-t text-center">
          <div><p className="text-xs text-muted-foreground">Billable</p><p className="font-semibold">{sc.billableHours.toFixed(1)}h</p></div>
          <div><p className="text-xs text-muted-foreground">Non-Billable</p><p className="font-semibold">{sc.nonBillableHours.toFixed(1)}h</p></div>
          <div><p className="text-xs text-muted-foreground">Projects</p><p className="font-semibold">{sc.projectCount}</p></div>
        </div>
      </CardContent>
    </Card>
  );
}

function ScorecardTable({ members, timesheets, range, config, currency, reviewFor, canReview, onReview, emptyText }) {
  if (members.length === 0) return <EmptyState title="No employees" description={emptyText} />;
  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b bg-muted/30">
            <th className="text-left p-3 font-medium text-muted-foreground">Employee</th>
            <th className="text-left p-3 font-medium text-muted-foreground">KPI Score</th>
            <th className="text-left p-3 font-medium text-muted-foreground">Utilisation</th>
            <th className="text-left p-3 font-medium text-muted-foreground">Billable</th>
            <th className="text-left p-3 font-medium text-muted-foreground">Revenue</th>
            <th className="text-left p-3 font-medium text-muted-foreground">Rating</th>
            {canReview && <th className="p-3 w-20"></th>}
          </tr></thead>
          <tbody>
            {members.map(emp => {
              const sc = computeScorecard(emp, timesheets, range, config);
              const rev = reviewFor(emp.id);
              return (
                <tr key={emp.id} className="border-b hover:bg-muted/20">
                  <td className="p-3 font-medium">{emp.full_name}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-2 w-28">
                      <Progress value={sc.kpiScore} className="h-2 flex-1" />
                      <span className="text-xs font-semibold w-7">{sc.kpiScore}</span>
                    </div>
                  </td>
                  <td className="p-3 text-xs">{sc.utilisation.toFixed(0)}%</td>
                  <td className="p-3 text-xs">{sc.billableHours.toFixed(1)}h</td>
                  <td className="p-3 text-xs font-medium">{formatMoney(sc.revenue, currency)}</td>
                  <td className="p-3">{rev?.rating ? <StatusBadge status={rev.rating} /> : <span className="text-xs text-muted-foreground">—</span>}</td>
                  {canReview && (
                    <td className="p-3">
                      <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => onReview(emp)}><Star className="h-3.5 w-3.5" />{rev ? "Edit" : "Review"}</Button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function ReviewsList({ reviews, currency, showEmployee }) {
  if (reviews.length === 0) return <EmptyState title="No reviews yet" description="Recorded performance reviews will appear here." />;
  return (
    <div className="space-y-3">
      {reviews.map(r => (
        <Card key={r.id} className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                {showEmployee && <span className="font-semibold text-sm">{r.employee_name}</span>}
                <span className="text-xs text-muted-foreground">{r.period_label}</span>
                {r.rating && <StatusBadge status={r.rating} />}
              </div>
              {r.comments && <p className="text-sm mt-1.5 whitespace-pre-wrap">{r.comments}</p>}
              {r.objectives && <p className="text-xs text-muted-foreground mt-1.5"><span className="font-medium">Objectives:</span> {r.objectives}</p>}
              <p className="text-[11px] text-muted-foreground mt-1.5">By {r.reviewed_by || "—"}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-[11px] text-muted-foreground">KPI</p>
              <p className="text-lg font-bold">{r.kpi_score ?? "—"}</p>
              <p className="text-[11px] text-muted-foreground">Util {Math.round(r.utilisation || 0)}% · {formatMoney(r.revenue || 0, currency)}</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
