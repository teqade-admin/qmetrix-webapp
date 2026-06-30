import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, CalendarDays } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import TimesheetView from "@/components/timesheets/TimesheetView";
import LeaveTracker from "@/components/hr/LeaveTracker";
import { getSubordinates, getDirectReports, getSubordinatesToDepth, subtreeDepth } from "@/lib/orgHierarchy";
import { isManagerRole, canWrite, normalizeRole } from "@/lib/permissions";
import LevelFilter from "@/components/shared/LevelFilter";

// Default annual leave entitlement (days) when an employee has no explicit allocation.
const DEFAULT_ANNUAL_LEAVE = 25;
// HR-privileged roles whose records an HR User may NOT see under the Employees tab.
const HR_PRIVILEGED = new Set(["super_admin", "hr_admin", "hr_user"]);

export default function TimeManagement() {
  const [section, setSection] = useState("timesheet"); // timesheet | leaves
  const [tsScope, setTsScope] = useState("self");       // self | team | employees
  const [leaveScope, setLeaveScope] = useState("self");  // self | team | employees
  const { user, userRole } = useAuth();

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => base44.entities.Employee.list(),
  });

  // Resolve the signed-in user to an employee record.
  const currentEmployee = useMemo(() => {
    const userFullName = user?.user_metadata?.full_name;
    if (!user) return null;
    return employees.find(e => e.email === user.email || (userFullName && e.full_name === userFullName)) || null;
  }, [user, employees]);
  const currentEmployeeName = currentEmployee?.full_name || user?.user_metadata?.full_name || user?.email || "";

  // HR Admin / HR User / Super Admin get the extra "Employees" tab.
  const showEmployeesTab = isManagerRole(userRole);

  // Team depth filter (L1 = direct reports … LN = deepest level).
  const [teamLevel, setTeamLevel] = useState(1);
  const maxTeamLevel = useMemo(() => (currentEmployee ? subtreeDepth(employees, currentEmployee.id) : 0), [employees, currentEmployee]);
  const effLevel = Math.min(teamLevel, Math.max(1, maxTeamLevel));

  const directReportNames = useMemo(
    () => (currentEmployee ? getDirectReports(employees, currentEmployee.id).map(e => e.full_name) : []),
    [employees, currentEmployee]
  );
  // Team = reports down to the selected level (default: direct reports only).
  const teamNames = useMemo(
    () => (currentEmployee ? getSubordinatesToDepth(employees, currentEmployee.id, effLevel).map(e => e.full_name) : []),
    [employees, currentEmployee, effLevel]
  );

  // Employees tab membership:
  //  • HR (admin/user): oversight of EVERY employee, except HR Admins/Users & Super Admins.
  //  • Super Admin: your indirect reports only (subtree minus direct) — never equals/superiors.
  const employeeNames = useMemo(() => {
    if (!showEmployeesTab || !currentEmployee) return [];
    const role = normalizeRole(userRole);
    const directSet = new Set(directReportNames);
    if (role === "hr_admin" || role === "hr_user") {
      return employees
        .filter(e => e.id !== currentEmployee.id && !directSet.has(e.full_name))
        .filter(e => !HR_PRIVILEGED.has(normalizeRole(e.app_role)))
        .map(e => e.full_name);
    }
    return getSubordinates(employees, currentEmployee.id)
      .filter(e => !directSet.has(e.full_name))
      .map(e => e.full_name);
  }, [employees, showEmployeesTab, currentEmployee, directReportNames, userRole]);

  const teamCanApprove = teamNames.length > 0;                 // you manage them
  const employeesCanApprove = canWrite(userRole, "TimeManagement"); // HR write

  // Annual leave entitlement for the signed-in user (per-employee override, else default).
  const selfTotalLeaves = currentEmployee?.annual_leave_entitlement ?? DEFAULT_ANNUAL_LEAVE;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Time Management"
        description="Track and approve timesheets and leave in one place"
      />

      <Tabs value={section} onValueChange={setSection}>
        <TabsList>
          <TabsTrigger value="timesheet" className="gap-1.5"><Clock className="h-4 w-4" /> Timesheet</TabsTrigger>
          <TabsTrigger value="leaves" className="gap-1.5"><CalendarDays className="h-4 w-4" /> Leaves</TabsTrigger>
        </TabsList>

        {/* ── TIMESHEET ── */}
        <TabsContent value="timesheet" className="mt-4">
          <Tabs value={tsScope} onValueChange={setTsScope}>
            <TabsList className="bg-muted/50">
              <TabsTrigger value="self">Self</TabsTrigger>
              <TabsTrigger value="team">Team</TabsTrigger>
              {showEmployeesTab && <TabsTrigger value="employees">Employees</TabsTrigger>}
            </TabsList>
            <TabsContent value="self" className="mt-4">
              <TimesheetView scope="self" currentEmployeeName={currentEmployeeName} canApprove={false} />
            </TabsContent>
            <TabsContent value="team" className="mt-4 space-y-3">
              {maxTeamLevel > 1 && <div className="flex justify-end"><LevelFilter value={effLevel} onChange={setTeamLevel} maxLevel={maxTeamLevel} /></div>}
              <TimesheetView scope="team" currentEmployeeName={currentEmployeeName} teamNames={teamNames} canApprove={teamCanApprove} />
            </TabsContent>
            {showEmployeesTab && (
              <TabsContent value="employees" className="mt-4">
                <TimesheetView scope="team" currentEmployeeName={currentEmployeeName} teamNames={employeeNames} canApprove={employeesCanApprove} />
              </TabsContent>
            )}
          </Tabs>
        </TabsContent>

        {/* ── LEAVES ── */}
        <TabsContent value="leaves" className="mt-4">
          <Tabs value={leaveScope} onValueChange={setLeaveScope}>
            <TabsList className="bg-muted/50">
              <TabsTrigger value="self">Self</TabsTrigger>
              <TabsTrigger value="team">Team</TabsTrigger>
              {showEmployeesTab && <TabsTrigger value="employees">Employees</TabsTrigger>}
            </TabsList>
            <TabsContent value="self" className="mt-4">
              <LeaveTracker scope="self" employees={employees} currentEmployeeName={currentEmployeeName} totalLeaves={selfTotalLeaves} />
            </TabsContent>
            <TabsContent value="team" className="mt-4 space-y-3">
              {maxTeamLevel > 1 && <div className="flex justify-end"><LevelFilter value={effLevel} onChange={setTeamLevel} maxLevel={maxTeamLevel} /></div>}
              <LeaveTracker scope="team" employees={employees} currentEmployeeName={currentEmployeeName} teamNames={teamNames} />
            </TabsContent>
            {showEmployeesTab && (
              <TabsContent value="employees" className="mt-4">
                <LeaveTracker scope="team" employees={employees} currentEmployeeName={currentEmployeeName} teamNames={employeeNames} />
              </TabsContent>
            )}
          </Tabs>
        </TabsContent>
      </Tabs>
    </div>
  );
}
