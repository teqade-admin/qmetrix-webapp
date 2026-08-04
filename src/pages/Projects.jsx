import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/AuthContext";
import { canWrite } from "@/lib/permissions";
import { visibleProjects } from "@/lib/projectAccess";
import Pagination, { usePagination } from "@/components/shared/Pagination";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, FolderKanban, TrendingUp, DollarSign, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ProjectFormDialog from "@/components/projects/ProjectFormDialog";
import { createPageUrl } from "@/utils";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import StatCard from "@/components/shared/StatCard";
import EmptyState from "@/components/shared/EmptyState";
import { useCurrency, formatMoney } from "@/components/shared/CurrencyContext";

const STATUSES = ["kick_off","feasibility","design","pre_construction","construction","post_completion","closed"];

export default function Projects() {
  const navigate = useNavigate();
  const { currency } = useCurrency();
  const { user, userRole } = useAuth();
  const canEdit = canWrite(userRole, "Projects");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);

  const queryClient = useQueryClient();

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: () => base44.entities.Project.list("-created_date")
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => base44.entities.Employee.list()
  });

  const me = React.useMemo(() => {
    if (!user) return null;
    const fullName = user?.user_metadata?.full_name;
    return employees.find(e => e.user_id && e.user_id === user.id)
      || employees.find(e => e.email && e.email.toLowerCase() === (user.email || "").toLowerCase())
      || employees.find(e => fullName && e.full_name === fullName)
      || null;
  }, [user, employees]);


  // Work sections live in their own table now, assigned and tracked in the
  // Work Sections module. Projects reads them; it no longer owns them.
  const { data: allSections = [] } = useQuery({
    queryKey: ["work_sections"],
    queryFn: () => base44.entities.WorkSection.list()
  });
  const sectionsByProject = React.useMemo(() => {
    const map = new Map();
    for (const s of allSections) {
      if (!map.has(s.project_id)) map.set(s.project_id, []);
      map.get(s.project_id).push(s);
    }
    return map;
  }, [allSections]);
  const sectionsFor = React.useCallback(
    (projectId) => sectionsByProject.get(projectId) || [],
    [sectionsByProject]
  );

  const createMut = useMutation({
    mutationFn: d => base44.entities.Project.create(d),
    meta: { successMessage: "Project created" },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["projects"] }); setDialogOpen(false); }
  });

  const openNew = () => setDialogOpen(true);

  // Ops Admin sees the portfolio; everyone else sees only projects they manage,
  // created, or have work assigned on.
  const scoped = visibleProjects(projects, { role: userRole, employee: me, sections: allSections });

  const filtered = scoped.filter(p => {
    const matchSearch = !search || p.name?.toLowerCase().includes(search.toLowerCase()) || p.client_name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    return matchSearch && matchStatus;
  });
  const pager = usePagination(filtered, 9);

  const activeProjects = projects.filter(p => p.status !== "closed");
  const totalFee = projects.reduce((s, p) => s + (p.fee_agreed || 0), 0);
  const totalInvoiced = projects.reduce((s, p) => s + (p.fee_invoiced || 0), 0);
  // Average only over projects that have measurable progress, so projects
  // without work sections don't drag the figure down to 0%.
  const measured = projects.filter(p => p.progress_percent != null);
  const avgProgress = measured.length
    ? Math.round(measured.reduce((s, p) => s + p.progress_percent, 0) / measured.length)
    : null;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Projects"
        description="Manage active projects, track programme and work sections"
        actionLabel={canEdit ? "New Project" : undefined}
        onAction={canEdit ? openNew : undefined}
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard title="Active Projects" value={activeProjects.length} icon={FolderKanban} color="primary" />
        <StatCard title="Avg Progress" value={avgProgress != null ? `${avgProgress}%` : "—"} icon={TrendingUp} color="green" />
        <StatCard title="Total Fee Agreed" value={`${currency.symbol}${(totalFee/1000).toFixed(0)}k`} icon={DollarSign} color="accent" />
        <StatCard title="Total Invoiced" value={`${currency.symbol}${(totalInvoiced/1000).toFixed(0)}k`} icon={DollarSign} color="blue" />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search projects or clients…" value={search} onChange={e => setSearch(e.target.value)} className="pl-8" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Project List */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading…</div>
      ) : filtered.length === 0 ? (
        <EmptyState title="No projects found" actionLabel={canEdit ? "New Project" : undefined} onAction={canEdit ? openNew : undefined} />
      ) : (
        <div className="space-y-3">
          {pager.pageItems.map(project => (
            <Card key={project.id} className="overflow-hidden">
              {/* Project row header */}
              <div
                className="flex items-start gap-4 p-4 cursor-pointer hover:bg-muted/20 transition-colors"
                onClick={() => navigate(`${createPageUrl("Projects")}/${project.project_code || project.id}`)}
              >
                <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm truncate">{project.name}</p>
                      {project.project_code && <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground font-mono">{project.project_code}</span>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{project.client_name}</p>
                    {project.project_manager && <p className="text-xs text-muted-foreground">PM: {project.project_manager}</p>}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={project.status} />
                    {project.riba_stage && <Badge variant="outline" className="text-[10px]">{project.riba_stage?.replace(/_/g, " ").replace("stage", "Stage")}</Badge>}
                    {project.sector && <span className="text-[10px] text-muted-foreground capitalize">{project.sector.replace(/_/g, " ")}</span>}
                  </div>
                  <div className="space-y-1">
                    {/* No sections yet = progress isn't measurable, so show "—" rather than a misleading 0%. */}
                    <div className="flex items-center gap-2">
                      <Progress value={project.progress_percent || 0} className="h-1.5 flex-1" />
                      <span className="text-xs text-muted-foreground shrink-0">
                        {project.progress_percent != null
                          ? `${project.progress_percent}%`
                          : (sectionsFor(project.id).length ? "0%" : "— no sections")}
                      </span>
                    </div>
                    {project.fee_agreed && (
                      <p className="text-xs text-muted-foreground">{formatMoney(project.fee_agreed, currency)} fee</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </Card>
          ))}
          <Pagination {...pager} className="rounded-md border bg-card" />
        </div>
      )}

      {/* Create / Edit Dialog */}
      <ProjectFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        project={null}
        sections={[]}
        projects={projects}
        employees={employees}
        saving={createMut.isPending}
        onSave={(data) => createMut.mutate({
          ...data,
          created_by: me?.id || null,
          created_by_name: me?.full_name || null,
        })}
      />

    </div>
  );
}