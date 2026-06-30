import React, { useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/AuthContext";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Network, Phone, Plus, Minus } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import LevelFilter from "@/components/shared/LevelFilter";
import { getDirectReports, subtreeDepth, getSubordinatesToDepth } from "@/lib/orgHierarchy";
import { parseISO, isWithinInterval } from "date-fns";

// Live working status: on leave if an approved leave covers today.
function liveStatus(emp, leaves) {
  if (emp.status === "terminated") return "terminated";
  const today = new Date();
  const onLeave = leaves.some(l => {
    if (l.status !== "approved" || l.employee_id !== emp.id || !l.start_date || !l.end_date) return false;
    try { return isWithinInterval(today, { start: parseISO(l.start_date), end: parseISO(l.end_date) }); }
    catch { return false; }
  });
  return onLeave ? "on_leave" : "active";
}

const STATUS_STYLE = {
  active:     { label: "Working",  cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  on_leave:   { label: "On Leave", cls: "bg-amber-100 text-amber-700 border-amber-200" },
  terminated: { label: "Inactive", cls: "bg-slate-100 text-slate-600 border-slate-200" },
};

function StatusPill({ status }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE.active;
  return <Badge variant="outline" className={`text-[11px] ${s.cls}`}>{s.label}</Badge>;
}

const relationStyle = {
  Manager: "bg-blue-50 text-blue-700 border-blue-200",
  Peer:    "bg-slate-50 text-slate-600 border-slate-200",
  You:     "bg-primary/10 text-primary border-primary/30",
  Report:  "bg-violet-50 text-violet-700 border-violet-200",
  "Sub-report": "bg-violet-50 text-violet-500 border-violet-100",
};

// Compact node used inside the org chart.
function OrgNode({ emp, leaves, highlight }) {
  const st = liveStatus(emp, leaves);
  const s = STATUS_STYLE[st] || STATUS_STYLE.active;
  return (
    <span className={`org-node items-center gap-2.5 rounded-lg border bg-card px-3 py-2 shadow-sm text-left ${highlight ? "border-primary ring-1 ring-primary/30 bg-primary/5" : ""}`}>
      <span className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">{(emp.full_name || "?").charAt(0)}</span>
      <span>
        <span className="block text-sm font-semibold leading-tight whitespace-nowrap">{emp.full_name}{highlight && <span className="text-[10px] text-primary ml-1">(You)</span>}</span>
        <span className="block text-[11px] text-muted-foreground leading-tight whitespace-nowrap">{emp.job_title || (emp.role || "").replace(/_/g, " ")}</span>
        <Badge variant="outline" className={`mt-1 text-[10px] ${s.cls}`}>{s.label}</Badge>
      </span>
    </span>
  );
}

// One node + its (collapsible) children, expandable while within `maxLevel`.
function TreeNode({ emp, employees, leaves, depth, maxLevel, highlight }) {
  const children = getDirectReports(employees, emp.id);
  const canExpand = children.length > 0 && depth < maxLevel;
  const [open, setOpen] = useState(false);
  return (
    <li>
      <div className="relative inline-flex">
        <OrgNode emp={emp} leaves={leaves} highlight={highlight} />
        {children.length > 0 && (canExpand ? (
          <button type="button" onClick={() => setOpen(o => !o)} title={open ? "Collapse" : "Expand"}
            className="absolute left-1/2 -translate-x-1/2 -bottom-3 z-10 h-6 w-6 rounded-full border bg-card flex items-center justify-center shadow-sm hover:bg-muted">
            {open ? <Minus className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
          </button>
        ) : (
          <span title={`${children.length} report${children.length > 1 ? "s" : ""}`}
            className="absolute left-1/2 -translate-x-1/2 -bottom-2.5 z-10 h-5 min-w-5 px-1.5 rounded-full border bg-muted text-[10px] text-muted-foreground flex items-center justify-center">{children.length}</span>
        ))}
      </div>
      {canExpand && open && (
        <ul>
          {children.map(c => <TreeNode key={c.id} emp={c} employees={employees} leaves={leaves} depth={depth + 1} maxLevel={maxLevel} />)}
        </ul>
      )}
    </li>
  );
}

export default function Team() {
  const { user } = useAuth();
  const [level, setLevel] = useState(1);
  const { data: employees = [] } = useQuery({ queryKey: ["employees"], queryFn: () => base44.entities.Employee.list() });
  const { data: leaves = [] } = useQuery({ queryKey: ["leaves"], queryFn: () => base44.entities.LeaveRequest.list("-created_date") });

  const me = useMemo(() => {
    const name = user?.user_metadata?.full_name;
    if (!user) return null;
    return employees.find(e => e.email === user.email || (name && e.full_name === name)) || null;
  }, [user, employees]);

  const manager = me?.manager_id ? employees.find(e => e.id === me.manager_id) : null;
  const reportees = useMemo(() => employees.filter(e => me && e.manager_id === me.id), [employees, me]);
  const peers = useMemo(
    () => employees.filter(e => me?.manager_id && e.manager_id === me.manager_id && e.id !== me.id),
    [employees, me]
  );
  const maxLevel = useMemo(() => (me ? subtreeDepth(employees, me.id) : 0), [employees, me]);
  const effLevel = Math.min(level, Math.max(1, maxLevel));
  const reportsAtLevel = useMemo(
    () => (me ? getSubordinatesToDepth(employees, me.id, effLevel) : []),
    [employees, me, effLevel]
  );

  // Roster: manager + peers + you + reports down to the selected level.
  const roster = useMemo(() => {
    const map = new Map();
    const add = (emp, relation) => { if (emp && !map.has(emp.id)) map.set(emp.id, { emp, relation }); };
    add(manager, "Manager");
    peers.forEach(p => add(p, "Peer"));
    add(me, "You");
    reportsAtLevel.forEach(r => add(r, r.manager_id === me?.id ? "Report" : "Sub-report"));
    return [...map.values()];
  }, [manager, peers, me, reportsAtLevel]);

  if (!me) {
    return (
      <div className="space-y-5">
        <PageHeader title="Team" description="Your reporting line and team members" />
        <EmptyState title="No employee record linked to your account" description="Ask HR to link your login to an employee profile." />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Team" description="Your reporting line and team members">
        <LevelFilter value={effLevel} onChange={setLevel} maxLevel={maxLevel} />
      </PageHeader>

      <Tabs defaultValue="list">
        <TabsList>
          <TabsTrigger value="list" className="gap-1.5"><Users className="h-4 w-4" /> My Team</TabsTrigger>
          <TabsTrigger value="chart" className="gap-1.5"><Network className="h-4 w-4" /> Team Chart</TabsTrigger>
        </TabsList>

        {/* ── MY TEAM (roster) ── */}
        <TabsContent value="list" className="mt-4">
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-muted/30">
                  <th className="text-left p-3 font-medium text-muted-foreground">Name</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Role</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Phone</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Relationship</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                </tr></thead>
                <tbody>
                  {roster.map(({ emp, relation }) => (
                    <tr key={emp.id} className={`border-b hover:bg-muted/20 ${relation === "You" ? "bg-primary/5" : ""}`}>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">{(emp.full_name || "?").charAt(0)}</div>
                          <div>
                            <p className="font-medium">{emp.full_name}</p>
                            <p className="text-xs text-muted-foreground capitalize">{(emp.department || "").replace(/_/g, " ")}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-3">{emp.job_title || (emp.role || "").replace(/_/g, " ")}</td>
                      <td className="p-3 text-xs">{emp.phone ? <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3 text-muted-foreground" />{emp.phone}</span> : "—"}</td>
                      <td className="p-3"><Badge variant="outline" className={`text-[10px] ${relationStyle[relation] || ""}`}>{relation === "Report" ? "Reports to you" : relation}</Badge></td>
                      <td className="p-3"><StatusPill status={liveStatus(emp, leaves)} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* ── TEAM CHART (top-down org chart) ── */}
        <TabsContent value="chart" className="mt-4">
          <Card className="p-6 overflow-x-auto">
            {reportees.length === 0 ? (
              <p className="text-sm text-muted-foreground">You have no reportees.</p>
            ) : (
              <>
                {/* key={effLevel} collapses the tree whenever the level changes */}
                <div key={effLevel} className="org-chart min-w-fit pb-2">
                  <ul>
                    <li>
                      <div className="relative inline-flex">
                        <OrgNode emp={me} leaves={leaves} highlight />
                      </div>
                      <ul>
                        {reportees.map(r => (
                          <TreeNode key={r.id} emp={r} employees={employees} leaves={leaves} depth={1} maxLevel={effLevel} />
                        ))}
                      </ul>
                    </li>
                  </ul>
                </div>
                <p className="text-[11px] text-muted-foreground mt-4">
                  Click <Plus className="inline h-3 w-3" /> under a reportee to reveal their team{maxLevel > 1 ? " (within the selected level)" : ""}.
                </p>
              </>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
