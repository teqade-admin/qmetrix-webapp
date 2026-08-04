import React from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Bell } from "lucide-react";
import { canRead, canWrite } from "@/lib/permissions";
import { isOverdue } from "@/lib/invoiceLifecycle";

/**
 * What is waiting for you, derived from records already loaded elsewhere —
 * there is no notifications table, and this needs none. Each entry is a link to
 * the page where the work is actioned.
 *
 * Everything is scoped by permission and, for OCRA, by ownership: you are only
 * told about steps you can actually action.
 */
export default function NotificationsBell({ user, userRole }) {
  const enabled = !!user;
  const canApprove = canWrite(userRole, "TimeManagement");

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"], queryFn: () => base44.entities.Employee.list(), enabled,
  });
  const { data: timesheets = [] } = useQuery({
    queryKey: ["timesheets"], queryFn: () => base44.entities.Timesheet.list(), enabled: enabled && canApprove,
  });
  const { data: leaves = [] } = useQuery({
    queryKey: ["leaves"], queryFn: () => base44.entities.LeaveRequest.list(), enabled: enabled && canApprove,
  });
  const { data: deliverables = [] } = useQuery({
    queryKey: ["deliverables"], queryFn: () => base44.entities.Deliverable.list(),
    enabled: enabled && canRead(userRole, "DeliveryModule"),
  });
  const { data: invoices = [] } = useQuery({
    queryKey: ["invoices"], queryFn: () => base44.entities.Invoice.list(),
    enabled: enabled && canRead(userRole, "Finance"),
  });

  const me = React.useMemo(() => {
    if (!user) return null;
    const fullName = user?.user_metadata?.full_name;
    return employees.find(e => e.email === user.email || (fullName && e.full_name === fullName)) || null;
  }, [user, employees]);

  const items = React.useMemo(() => {
    const out = [];
    const pending = (list, status = "pending") => list.filter(x => x.status === status).length;

    const submitted = timesheets.filter(t => t.status === "submitted").length;
    if (submitted) out.push({ page: "TimeManagement", label: `${submitted} timesheet${submitted === 1 ? "" : "s"} awaiting approval` });

    const leaveCount = pending(leaves);
    if (leaveCount) out.push({ page: "TimeManagement", label: `${leaveCount} leave request${leaveCount === 1 ? "" : "s"} awaiting approval` });

    // Only steps this employee owns and that are next in the OCRA sequence.
    const STEPS = ["originator", "checker", "reviewer", "authoriser"];
    const DONE = ["approved", "completed"];
    const mine = me ? deliverables.filter(d => {
      const idx = STEPS.findIndex(s => !DONE.includes(d[`${s}_status`]));
      if (idx < 0) return false;
      return d[`${STEPS[idx]}_id`] === me.id;
    }).length : 0;
    if (mine) out.push({ page: "DeliveryModule", label: `${mine} deliverable${mine === 1 ? "" : "s"} awaiting your sign-off` });

    const overdue = invoices.filter(i => isOverdue(i)).length;
    if (overdue) out.push({ page: "Finance", label: `${overdue} overdue invoice${overdue === 1 ? "" : "s"}` });

    return out;
  }, [timesheets, leaves, deliverables, invoices, me]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground relative" title="Notifications">
          <Bell className="h-4 w-4" />
          {items.length > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
              {items.length}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <div className="px-3 py-2 border-b">
          <p className="text-sm font-semibold">Awaiting you</p>
        </div>
        {items.length === 0 ? (
          <p className="px-3 py-4 text-xs text-muted-foreground text-center">Nothing needs your attention.</p>
        ) : (
          <div className="py-1">
            {items.map((item, i) => (
              <Link key={i} to={createPageUrl(item.page)}
                className="block px-3 py-2 text-xs hover:bg-muted/50 transition-colors">
                {item.label}
              </Link>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
