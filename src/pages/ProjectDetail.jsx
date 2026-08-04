import React, { useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/AuthContext";
import { projectPermissions } from "@/lib/projectAccess";
import { createPageUrl } from "@/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, FolderKanban, Pencil, Trash2 } from "lucide-react";
import StatusBadge from "@/components/shared/StatusBadge";
import EmptyState from "@/components/shared/EmptyState";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useCurrency, formatMoney } from "@/components/shared/CurrencyContext";
import StageTree from "@/components/projects/StageTree";
import WorkSectionsTracker from "@/components/projects/WorkSectionsTracker";
import DateComparison from "@/components/projects/DateComparison";
import ProjectFormDialog from "@/components/projects/ProjectFormDialog";
import { projectProgress, stageLabel } from "@/lib/projectProgress";
import { describeChanges } from "@/lib/auditScope";
import Pagination, { usePagination } from "@/components/shared/Pagination";
import { format, parseISO } from "date-fns";

export default function ProjectDetail() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { currency } = useCurrency();
  const { user, userRole } = useAuth();
  // The creator owns the project; the manager may edit but not delete, since
  // deleting takes the work sections with it.
  const me = React.useMemo(() => {
    if (!user) return null;
    const fullName = user?.user_metadata?.full_name;
    return employees.find(e => e.user_id && e.user_id === user.id)
      || employees.find(e => e.email && e.email.toLowerCase() === (user.email || "").toLowerCase())
      || employees.find(e => fullName && e.full_name === fullName)
      || null;
  }, [user, employees]);
  const queryClient = useQueryClient();

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["projects"], queryFn: () => base44.entities.Project.list(),
  });
  const { data: allSections = [] } = useQuery({
    queryKey: ["work_sections"], queryFn: () => base44.entities.WorkSection.list(),
  });
  const { data: bids = [] } = useQuery({
    queryKey: ["bids"], queryFn: () => base44.entities.Bid.list(),
  });
  const { data: employees = [] } = useQuery({
    queryKey: ["employees"], queryFn: () => base44.entities.Employee.list(),
  });
  const { data: auditLogs = [] } = useQuery({
    queryKey: ["audit_logs"], queryFn: () => base44.entities.AuditLog.list("-occurred_at"),
  });
  const [editOpen, setEditOpen] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  const project = projects.find(p => p.id === projectId) || null;
  const sections = useMemo(
    () => allSections.filter(s => s.project_id === projectId),
    [allSections, projectId]
  );
  const bid = project?.bid_id ? bids.find(b => b.id === project.bid_id) : null;

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Project.update(id, data),
    meta: { successMessage: (_r, v) => v?.toastMessage || "Project updated" },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["projects"] }),
  });
  const deleteMut = useMutation({
    mutationFn: (id) => base44.entities.Project.delete(id),
    meta: { successMessage: "Project deleted" },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      navigate(createPageUrl("Projects"));
    },
  });

  if (isLoading) {
    return <div className="py-16 text-center text-sm text-muted-foreground">Loading…</div>;
  }
  if (!project) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => navigate(createPageUrl("Projects"))}>
          <ArrowLeft className="h-4 w-4" />Back to Projects
        </Button>
        <EmptyState title="Project not found" description="It may have been deleted." />
      </div>
    );
  }

  const { canEdit, canDelete: canRemove, isOwner, isManager } = projectPermissions(project, { role: userRole, employee: me });
  const sectionIds = new Set(sections.map(s => s.id));
  const projectLogs = auditLogs.filter(
    l => l.record_id === project.id || sectionIds.has(l.record_id)
  );
  const progress = projectProgress(sections, project.riba_stage);
  const withSections = { ...project, work_sections: sections };

  return (
    <div className="space-y-4">
      <div>
        <Link
          to={createPageUrl("Projects")}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-2"
        >
          <ArrowLeft className="h-4 w-4" />Projects
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <FolderKanban className="h-5 w-5 text-primary shrink-0" />
              <h1 className="font-bold text-xl truncate">{project.name}</h1>
              {project.project_code && (
                <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground font-mono">
                  {project.project_code}
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {project.client_name}
              {project.project_manager ? ` · PM: ${project.project_manager}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {canEdit && (
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setEditOpen(true)}>
                <Pencil className="h-3.5 w-3.5" />Edit
              </Button>
            )}
            {canRemove && (
              <Button variant="outline" size="sm" className="gap-1.5 text-destructive" onClick={() => setConfirmDelete(true)}>
                <Trash2 className="h-3.5 w-3.5" />Delete
              </Button>
            )}
            <StatusBadge status={project.status} />
            {project.riba_stage && <Badge variant="outline" className="text-[10px]">{stageLabel(project.riba_stage)}</Badge>}
            {project.sector && (
              <span className="text-[10px] text-muted-foreground capitalize">{project.sector.replace(/_/g, " ")}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 mt-3 max-w-md">
          <Progress value={progress || 0} className="h-1.5 flex-1" />
          <span className="text-xs text-muted-foreground shrink-0">
            {progress != null ? `${progress}%` : (sections.length ? "0%" : "— no work sections")}
          </span>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="stages">Stages</TabsTrigger>
          <TabsTrigger value="programme">Programme</TabsTrigger>
          <TabsTrigger value="sections">Work Sections</TabsTrigger>
          <TabsTrigger value="financials">Financials</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <Card className="p-4 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-3 text-sm">
              {[
                ["Project Code", project.project_code, "font-mono"],
                ["Client", project.client_name],
                ["Project Manager", project.project_manager],
                ["Sector", project.sector?.replace(/_/g, " "), "capitalize"],
                ["Status", project.status?.replace(/_/g, " "), "capitalize"],
                ["RIBA Stage", project.riba_stage ? stageLabel(project.riba_stage) : null],
                ["Start", project.start_date],
                ["End", project.end_date],
                ["Baseline Start", project.baseline_start_date],
                ["Baseline End", project.baseline_end_date],
                ["Actual Start", project.actual_start_date],
                ["Actual End", project.actual_end_date],
                ["Budgeted Hours", project.budgeted_hours],
                ["Actual Hours", project.actual_hours],
                ["Created By", project.created_by_name],
                ["Created", project.created_at ? project.created_at.slice(0, 10) : null],
                ["Work Sections", sections.length],
                ["Progress", progress != null ? `${progress}%` : null],
              ].map(([label, value, cls = ""]) => (
                <div key={label}>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className={`font-medium ${cls}`}>
                    {value === 0 || value ? value : "—"}
                  </p>
                </div>
              ))}
            </div>
            <div className="border-t pt-3">
              <p className="text-xs text-muted-foreground mb-1">Description</p>
              <p className="text-sm">{project.description || "—"}</p>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="stages" className="mt-4">
          <Card className="p-4 space-y-3">
            <p className="text-xs text-muted-foreground">
              Each stage&apos;s progress is the average of the work sections mapped to it.
              A stage with unfinished sections locks the ones after it.
            </p>
            <StageTree
              project={withSections}
              readOnly={!canEdit}
              onSelect={(stage) => updateMut.mutate({
                id: project.id,
                data: { riba_stage: stage, progress_percent: projectProgress(sections, stage) },
                toastMessage: `Moved to ${stageLabel(stage)}`,
              })}
            />
          </Card>
        </TabsContent>

        <TabsContent value="programme" className="mt-4">
          <Card className="p-4"><DateComparison project={project} /></Card>
        </TabsContent>

        <TabsContent value="sections" className="mt-4">
          <Card className="p-4 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                Work is assigned and updated in the Work Sections module; this is a read-only view.
              </p>
              <Link to={createPageUrl("WorkSections")}>
                <Button variant="outline" size="sm">Open Work Sections</Button>
              </Link>
            </div>
            <WorkSectionsTracker sections={sections} defaultStage={project.riba_stage} onChange={() => {}} readOnly />
          </Card>
        </TabsContent>

        <TabsContent value="financials" className="mt-4">
          <Card className="p-4 space-y-3">
            {bid && (
              <div className="rounded-lg border bg-muted/20 p-3">
                <p className="text-xs text-muted-foreground mb-2">
                  Won from bid <span className="font-medium text-foreground">{bid.title}</span>
                  {bid.client_name ? ` · ${bid.client_name}` : ""}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                  <div><p className="text-xs text-muted-foreground">Fee Proposed</p><p className="font-medium">{formatMoney(bid.fee_proposal || 0, currency)}</p></div>
                  <div><p className="text-xs text-muted-foreground">Fee Agreed</p><p className="font-medium">{formatMoney(project.fee_agreed || 0, currency)}</p></div>
                  <div><p className="text-xs text-muted-foreground">Cost to Date</p><p className="font-medium">{formatMoney(project.cost_to_date || 0, currency)}</p></div>
                  <div>
                    <p className="text-xs text-muted-foreground">Agreed vs Proposed</p>
                    <p className="font-medium">
                      {bid.fee_proposal
                        ? `${(((project.fee_agreed || 0) - bid.fee_proposal) / bid.fee_proposal * 100).toFixed(1)}%`
                        : "—"}
                    </p>
                  </div>
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div><p className="text-xs text-muted-foreground">Project Value</p><p className="font-medium">{formatMoney(project.project_value || 0, currency)}</p></div>
              <div><p className="text-xs text-muted-foreground">Fee Agreed</p><p className="font-medium">{formatMoney(project.fee_agreed || 0, currency)}</p></div>
              <div><p className="text-xs text-muted-foreground">Fee Invoiced</p><p className="font-medium">{formatMoney(project.fee_invoiced || 0, currency)}</p></div>
              <div><p className="text-xs text-muted-foreground">Cost to Date</p><p className="font-medium">{formatMoney(project.cost_to_date || 0, currency)}</p></div>
            </div>
          </Card>
        </TabsContent>
        <TabsContent value="logs" className="mt-4">
          <Card className="p-4 space-y-3">
            <p className="text-xs text-muted-foreground">
              Every change to this project and its work sections — who, when, and what moved.
            </p>
            <ProjectLogs logs={projectLogs} />
          </Card>
        </TabsContent>
      </Tabs>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {project.name}</AlertDialogTitle>
            <AlertDialogDescription>
              Its {sections.length} work section{sections.length === 1 ? "" : "s"} go with it.
              Deliverables, milestones and invoices that reference the project by name stay,
              but will no longer resolve to it. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep project</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={() => deleteMut.mutate(project.id)}
            >
              Delete project
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ProjectFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        project={project}
        sections={sections}
        projects={projects}
        employees={employees}
        saving={updateMut.isPending}
        onSave={(data) => {
          const { id, created_at, updated_at, created_date, updated_date, ...rest } = data;
          updateMut.mutate({ id: project.id, data: rest, toastMessage: "Project updated" });
          setEditOpen(false);
        }}
      />
    </div>
  );
}

/** Paginated audit entries for a project and the work under it. */
function ProjectLogs({ logs }) {
  const pager = usePagination(logs, 12);
  if (logs.length === 0) {
    return <p className="text-xs text-muted-foreground py-6 text-center">Nothing recorded yet.</p>;
  }
  return (
    <>
      <div className="space-y-2">
        {pager.pageItems.map(log => {
          const changes = describeChanges(log.changes);
          return (
            <div key={log.id} className="text-xs border-b pb-2 last:border-0">
              <p>
                <span className="font-medium">{log.actor_name || "Unknown"}</span>
                <span className="text-muted-foreground">
                  {" "}{log.action}d {log.record_label || log.table_name}
                  {log.occurred_at ? ` · ${format(parseISO(log.occurred_at), "dd MMM yy HH:mm")}` : ""}
                </span>
              </p>
              {changes.length > 0 && (
                <div className="mt-1 space-y-0.5">
                  {changes.map(({ field, from, to }) => (
                    <p key={field} className="text-muted-foreground">
                      <span className="capitalize">{field}</span>: {from} → <span className="text-foreground">{to}</span>
                    </p>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <Pagination {...pager} />
    </>
  );
}
