import React, { useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/AuthContext";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronDown, ChevronRight, ScrollText } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import FilterBar from "@/components/shared/FilterBar";
import LevelFilter from "@/components/shared/LevelFilter";
import Pagination, { usePagination } from "@/components/shared/Pagination";
import { subtreeDepth } from "@/lib/orgHierarchy";
import {
  AUDIT_SCOPES, availableScopes, visibleActorIds, filterAuditLogs, describeChanges,
} from "@/lib/auditScope";
import { format, parseISO } from "date-fns";

const ACTION_STYLES = {
  create: "bg-emerald-50 text-emerald-700 border-emerald-200",
  update: "bg-blue-50 text-blue-700 border-blue-200",
  delete: "bg-red-50 text-red-700 border-red-200",
};

const SCOPE_LABELS = {
  [AUDIT_SCOPES.SELF]: "My actions",
  [AUDIT_SCOPES.TEAM]: "My team",
  [AUDIT_SCOPES.EVERYONE]: "Everyone",
};

export default function AuditLog() {
  const { user, userRole } = useAuth();
  const [scope, setScope] = useState(AUDIT_SCOPES.SELF);
  const [level, setLevel] = useState(0); // 0 = every level below me
  const [module, setModule] = useState("all");
  const [action, setAction] = useState("all");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState(null);

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["audit_logs"],
    queryFn: () => base44.entities.AuditLog.list("-occurred_at"),
  });
  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => base44.entities.Employee.list(),
  });

  const me = useMemo(() => {
    if (!user) return null;
    const fullName = user?.user_metadata?.full_name;
    return employees.find(e => e.email === user.email || (fullName && e.full_name === fullName)) || null;
  }, [user, employees]);

  const scopes = useMemo(
    () => availableScopes(userRole, employees, me?.id),
    [userRole, employees, me]
  );
  // If the chosen scope isn't open to this user, fall back to their own actions.
  const activeScope = scopes.includes(scope) ? scope : AUDIT_SCOPES.SELF;

  const maxLevel = useMemo(
    () => (me ? subtreeDepth(employees, me.id) : 0),
    [employees, me]
  );

  const actorIds = useMemo(
    () => visibleActorIds({ scope: activeScope, role: userRole, employees, employeeId: me?.id, depth: level }),
    [activeScope, userRole, employees, me, level]
  );

  const modules = useMemo(
    () => [...new Set(logs.map(l => l.module).filter(Boolean))].sort(),
    [logs]
  );

  const filtered = useMemo(
    () => filterAuditLogs(logs, { actorIds, module, action, search }),
    [logs, actorIds, module, action, search]
  );
  const pager = usePagination(filtered, 20);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Audit Log"
        description="Who changed what, and when"
      />

      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <Tabs value={activeScope} onValueChange={setScope}>
          <TabsList className="bg-muted/50">
            {scopes.map(s => <TabsTrigger key={s} value={s}>{SCOPE_LABELS[s]}</TabsTrigger>)}
          </TabsList>
        </Tabs>
        {activeScope === AUDIT_SCOPES.TEAM && maxLevel > 1 && (
          <LevelFilter value={level || maxLevel} onChange={setLevel} maxLevel={maxLevel} />
        )}
      </div>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        placeholder="Search by person, record or field changed…"
        filters={[
          { value: module, onChange: setModule, allLabel: "All modules", options: modules },
          { value: action, onChange: setAction, allLabel: "All actions", options: ["create", "update", "delete"], width: "w-36" },
        ]}
      />

      <Card>
        {isLoading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Loading…</div>
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No activity recorded"
            description="Changes made from here on will appear in this log."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="w-8"></th>
                  <th className="text-left p-3 font-medium text-muted-foreground">When</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Who</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Action</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Module</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Record</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Changed</th>
                </tr>
              </thead>
              <tbody>
                {pager.pageItems.map(log => {
                  const changes = describeChanges(log.changes);
                  const isOpen = expanded === log.id;
                  return (
                    <React.Fragment key={log.id}>
                      <tr
                        className={`border-b hover:bg-muted/20 ${changes.length ? "cursor-pointer" : ""}`}
                        onClick={() => changes.length && setExpanded(isOpen ? null : log.id)}
                      >
                        <td className="pl-3 text-muted-foreground">
                          {changes.length > 0 && (isOpen
                            ? <ChevronDown className="h-3.5 w-3.5" />
                            : <ChevronRight className="h-3.5 w-3.5" />)}
                        </td>
                        <td className="p-3 text-xs whitespace-nowrap">
                          {log.occurred_at ? format(parseISO(log.occurred_at), "dd MMM yy HH:mm") : "—"}
                        </td>
                        <td className="p-3 font-medium">{log.actor_name || "Unknown"}</td>
                        <td className="p-3">
                          <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-medium border capitalize ${ACTION_STYLES[log.action] || ""}`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="p-3 text-xs">{log.module}</td>
                        <td className="p-3 text-xs text-muted-foreground max-w-[200px] truncate">
                          {log.record_label || "—"}
                        </td>
                        <td className="p-3 text-xs text-muted-foreground">
                          {changes.length ? `${changes.length} field${changes.length === 1 ? "" : "s"}` : "—"}
                        </td>
                      </tr>
                      {isOpen && (
                        <tr className="border-b bg-muted/10">
                          <td></td>
                          <td colSpan={6} className="p-3">
                            <div className="space-y-1">
                              {changes.map(({ field, from, to }) => (
                                <div key={field} className="flex items-center gap-2 text-xs">
                                  <Badge variant="secondary" className="capitalize font-normal">{field}</Badge>
                                  <span className="text-muted-foreground line-through">{from}</span>
                                  <span>→</span>
                                  <span className="font-medium">{to}</span>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
            <Pagination {...pager} />
          </div>
        )}
      </Card>

      <p className="text-xs text-muted-foreground flex items-start gap-1.5">
        <ScrollText className="h-3.5 w-3.5 mt-0.5 shrink-0" />
        Entries are written by the database on every change, so they cover edits made
        outside these screens too. The log is append-only — it cannot be edited or deleted from the app.
      </p>
    </div>
  );
}
