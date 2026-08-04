import React, { useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/AuthContext";
import { canWrite } from "@/lib/permissions";
import { createPageUrl } from "@/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, FolderKanban } from "lucide-react";
import StatusBadge from "@/components/shared/StatusBadge";
import EmptyState from "@/components/shared/EmptyState";
import { useCurrency, formatMoney } from "@/components/shared/CurrencyContext";
import StageTree from "@/components/projects/StageTree";
import WorkSectionsTracker from "@/components/projects/WorkSectionsTracker";
import DateComparison from "@/components/projects/DateComparison";
import { projectProgress, stageLabel } from "@/lib/projectProgress";

export default function ProjectDetail() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { currency } = useCurrency();
  const { userRole } = useAuth();
  const canEdit = canWrite(userRole, "Projects");
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
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <Card className="p-4 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div><p className="text-xs text-muted-foreground">Start</p><p className="font-medium">{project.start_date || project.baseline_start_date || "—"}</p></div>
              <div><p className="text-xs text-muted-foreground">End</p><p className="font-medium">{project.end_date || project.baseline_end_date || "—"}</p></div>
              <div><p className="text-xs text-muted-foreground">Budgeted Hours</p><p className="font-medium">{project.budgeted_hours || "—"}</p></div>
              <div><p className="text-xs text-muted-foreground">Actual Hours</p><p className="font-medium">{project.actual_hours || "—"}</p></div>
            </div>
            {project.description && (
              <p className="text-sm text-muted-foreground border-t pt-3">{project.description}</p>
            )}
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
      </Tabs>
    </div>
  );
}
