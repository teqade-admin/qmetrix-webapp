import React, { useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/AuthContext";
import { canWrite } from "@/lib/permissions";
import { createPageUrl } from "@/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, MessageSquare, History, Send } from "lucide-react";
import EmptyState from "@/components/shared/EmptyState";
import Pagination, { usePagination } from "@/components/shared/Pagination";
import { getSubordinates } from "@/lib/orgHierarchy";
import { describeChanges } from "@/lib/auditScope";
import {
  RIBA_STAGES, stageLabel, projectProgress,
  WORK_SECTION_STATUSES, WORK_SECTION_STATUS_LABELS,
} from "@/lib/projectProgress";
import { format, parseISO } from "date-fns";

const STATUS_STYLE = {
  todo: "bg-slate-100 text-slate-700 border-slate-200",
  in_progress: "bg-blue-50 text-blue-700 border-blue-200",
  blocked: "bg-amber-50 text-amber-800 border-amber-200",
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

export default function WorkSectionDetail() {
  const { sectionId } = useParams();
  const navigate = useNavigate();
  const { user, userRole } = useAuth();
  const queryClient = useQueryClient();
  const [comment, setComment] = useState("");
  const [draft, setDraft] = useState(null); // null = not editing

  const { data: sections = [], isLoading } = useQuery({
    queryKey: ["work_sections"], queryFn: () => base44.entities.WorkSection.list(),
  });
  const { data: projects = [] } = useQuery({
    queryKey: ["projects"], queryFn: () => base44.entities.Project.list(),
  });
  const { data: employees = [] } = useQuery({
    queryKey: ["employees"], queryFn: () => base44.entities.Employee.list(),
  });
  const { data: comments = [] } = useQuery({
    queryKey: ["work_section_comments"],
    queryFn: () => base44.entities.WorkSectionComment.list("-created_date"),
  });
  const { data: auditLogs = [] } = useQuery({
    queryKey: ["audit_logs"], queryFn: () => base44.entities.AuditLog.list("-occurred_at"),
  });

  const section = sections.find(s => s.id === sectionId) || null;
  const project = section ? projects.find(p => p.id === section.project_id) : null;

  const me = useMemo(() => {
    if (!user) return null;
    const fullName = user?.user_metadata?.full_name;
    return employees.find(e => e.user_id && e.user_id === user.id)
      || employees.find(e => e.email && e.email.toLowerCase() === (user.email || "").toLowerCase())
      || employees.find(e => fullName && e.full_name === fullName)
      || null;
  }, [user, employees]);

  // The assignee updates their own work; a manager updates their reports'.
  const reports = useMemo(() => (me ? getSubordinates(employees, me.id) : []), [employees, me]);
  const canEdit = canWrite(userRole, "Projects")
    || (!!section && (section.assignee_id === me?.id || reports.some(r => r.id === section.assignee_id)));

  const sectionComments = useMemo(
    () => comments.filter(c => c.work_section_id === sectionId),
    [comments, sectionId]
  );
  const activity = useMemo(
    () => auditLogs.filter(l => l.record_id === sectionId
      || (l.table_name === "work_section_comments" && sectionComments.some(c => c.id === l.record_id))),
    [auditLogs, sectionId, sectionComments]
  );
  const activityPager = usePagination(activity, 10);
  const commentPager = usePagination(sectionComments, 10);

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => base44.entities.WorkSection.update(id, data),
    meta: { successMessage: "Work section updated" },
    onSuccess: async (updated) => {
      await queryClient.invalidateQueries({ queryKey: ["work_sections"] });
      await queryClient.invalidateQueries({ queryKey: ["audit_logs"] });
      // The project's stored progress is derived from its sections.
      if (project) {
        const next = sections.map(s => (s.id === updated.id ? updated : s))
          .filter(s => s.project_id === project.id);
        await base44.entities.Project.update(project.id, {
          progress_percent: projectProgress(next, project.riba_stage),
        });
        queryClient.invalidateQueries({ queryKey: ["projects"] });
      }
      setDraft(null);
    },
  });

  const commentMut = useMutation({
    mutationFn: (body) => base44.entities.WorkSectionComment.create({
      work_section_id: sectionId, author_id: me?.id || null,
      author_name: me?.full_name || user?.email || "Unknown", body,
    }),
    meta: { successMessage: "Comment added" },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["work_section_comments"] });
      queryClient.invalidateQueries({ queryKey: ["audit_logs"] });
      setComment("");
    },
  });

  if (isLoading) return <div className="py-16 text-center text-sm text-muted-foreground">Loading…</div>;
  if (!section) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => navigate(createPageUrl("WorkSections"))}>
          <ArrowLeft className="h-4 w-4" />Back
        </Button>
        <EmptyState title="Work section not found" description="It may have been removed." />
      </div>
    );
  }

  const value = (key) => (draft ? draft[key] : section[key]) ?? "";
  const setValue = (key, v) => setDraft(d => ({ ...(d ?? section), [key]: v }));
  const startEdit = () => setDraft({ ...section });

  const save = () => {
    const d = draft;
    const { id, created_at, updated_at, created_date, updated_date, ...rest } = d;
    updateMut.mutate({
      id: section.id,
      data: {
        ...rest,
        assignee_name: employees.find(e => e.id === d.assignee_id)?.full_name || null,
        reporter_name: employees.find(e => e.id === d.reporter_id)?.full_name || null,
        planned_hours: d.planned_hours !== "" && d.planned_hours != null ? Number(d.planned_hours) : null,
        progress_percent: d.status === "completed"
          ? 100
          : (d.progress_percent !== "" && d.progress_percent != null ? Number(d.progress_percent) : 0),
        work_date: d.work_date || null,
        start_date: d.start_date || null,
        end_date: d.end_date || null,
      },
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <Link to={createPageUrl("WorkSections")} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-2">
          <ArrowLeft className="h-4 w-4" />Work Sections
        </Link>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <h1 className="font-bold text-xl">{section.title}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {project ? (
                <Link to={`${createPageUrl("Projects")}/${project.project_code || project.id}`} className="hover:underline">{project.name}</Link>
              ) : "No project"}
              {section.riba_stage ? ` · ${stageLabel(section.riba_stage)}` : ""}
            </p>
          </div>
          <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-medium border ${STATUS_STYLE[section.status]}`}>
            {WORK_SECTION_STATUS_LABELS[section.status]}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Discussion and history */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Description</p>
            <p className="text-sm whitespace-pre-line">{section.description || "—"}</p>
            {section.notes && (
              <>
                <p className="text-xs text-muted-foreground mt-3 mb-1">Notes</p>
                <p className="text-sm whitespace-pre-line">{section.notes}</p>
              </>
            )}
          </Card>

          <Card className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">Comments</h2>
              <span className="text-xs text-muted-foreground">{sectionComments.length}</span>
            </div>
            <div className="flex gap-2">
              <Textarea
                rows={2} value={comment} onChange={e => setComment(e.target.value)}
                placeholder="Add a comment…" className="flex-1"
              />
              <Button
                className="self-end gap-1.5"
                disabled={!comment.trim() || commentMut.isPending}
                onClick={() => commentMut.mutate(comment.trim())}
              >
                <Send className="h-3.5 w-3.5" />Post
              </Button>
            </div>
            {sectionComments.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">No comments yet.</p>
            ) : (
              <>
                <div className="space-y-3">
                  {commentPager.pageItems.map(c => (
                    <div key={c.id} className="border-l-2 border-muted pl-3">
                      <p className="text-xs">
                        <span className="font-medium">{c.author_name || "Unknown"}</span>
                        <span className="text-muted-foreground">
                          {c.created_at ? ` · ${format(parseISO(c.created_at), "dd MMM yy HH:mm")}` : ""}
                        </span>
                      </p>
                      <p className="text-sm whitespace-pre-line mt-0.5">{c.body}</p>
                    </div>
                  ))}
                </div>
                <Pagination {...commentPager} />
              </>
            )}
          </Card>

          <Card className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">Activity</h2>
              <span className="text-xs text-muted-foreground">{activity.length}</span>
            </div>
            {activity.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">
                Nothing recorded yet. Changes made from here on appear in this log.
              </p>
            ) : (
              <>
                <div className="space-y-2">
                  {activityPager.pageItems.map(log => {
                    const changes = describeChanges(log.changes);
                    return (
                      <div key={log.id} className="text-xs border-b pb-2 last:border-0">
                        <p>
                          <span className="font-medium">{log.actor_name || "Unknown"}</span>
                          <span className="text-muted-foreground"> {log.action}d this
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
                <Pagination {...activityPager} />
              </>
            )}
          </Card>
        </div>

        {/* Details: always visible, edited in place rather than in a dialog. */}
        <Card className="p-4 space-y-3 h-fit lg:sticky lg:top-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Details</h2>
            {canEdit && !draft && <Button variant="outline" size="sm" onClick={startEdit}>Edit</Button>}
          </div>

          {!draft ? (
            <div className="space-y-2.5 text-sm">
              {[
                ["Project", project?.name],
                ["Stage", section.riba_stage ? stageLabel(section.riba_stage) : null],
                ["Assignee", section.assignee_name],
                ["Reporter", section.reporter_name],
                ["Status", WORK_SECTION_STATUS_LABELS[section.status]],
                ["Planned Hours", section.planned_hours],
                ["Date of Work", section.work_date],
                ["Start", section.start_date],
                ["End", section.end_date],
              ].map(([label, v]) => (
                <div key={label} className="flex justify-between gap-3">
                  <span className="text-xs text-muted-foreground">{label}</span>
                  <span className="font-medium text-right">{v === 0 || v ? v : "—"}</span>
                </div>
              ))}
              <div className="pt-2">
                <div className="flex items-center gap-2">
                  <Progress value={section.status === "completed" ? 100 : (section.progress_percent || 0)} className="h-1.5 flex-1" />
                  <span className="text-xs">{section.status === "completed" ? 100 : (section.progress_percent || 0)}%</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Title</Label>
                <Input value={value("title")} onChange={e => setValue("title", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Stage</Label>
                <Select value={value("riba_stage") || undefined} onValueChange={v => setValue("riba_stage", v)}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{RIBA_STAGES.map(s => <SelectItem key={s} value={s}>{stageLabel(s)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Assignee</Label>
                <Select value={value("assignee_id") || undefined} onValueChange={v => setValue("assignee_id", v)}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{employees.map(e => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Status</Label>
                <Select value={value("status")} onValueChange={v => setValue("status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {WORK_SECTION_STATUSES.map(s => <SelectItem key={s} value={s}>{WORK_SECTION_STATUS_LABELS[s]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Progress (%)</Label>
                <Input
                  type="number" min="0" max="100"
                  value={value("status") === "completed" ? 100 : value("progress_percent")}
                  disabled={value("status") === "completed"}
                  onChange={e => setValue("progress_percent", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Planned Hours</Label>
                <Input type="number" min="0" step="0.5" value={value("planned_hours")} onChange={e => setValue("planned_hours", e.target.value)} />
              </div>
              {[["Date of Work", "work_date"], ["Start", "start_date"], ["End", "end_date"]].map(([label, key]) => (
                <div key={key} className="space-y-1.5">
                  <Label className="text-xs">{label}</Label>
                  <Input type="date" value={value(key)} onChange={e => setValue(key, e.target.value)} />
                </div>
              ))}
              <div className="space-y-1.5">
                <Label className="text-xs">Description</Label>
                <Textarea rows={3} value={value("description")} onChange={e => setValue("description", e.target.value)} />
              </div>
              <div className="flex gap-2 pt-1">
                <Button size="sm" className="flex-1" onClick={save} disabled={updateMut.isPending}>
                  {updateMut.isPending ? "Saving…" : "Save"}
                </Button>
                <Button size="sm" variant="outline" className="flex-1" onClick={() => setDraft(null)}>Cancel</Button>
              </div>
            </div>
          )}

          {project && (
            <div className="pt-2 border-t">
              <Badge variant="secondary" className="text-[10px]">
                {project.project_code || project.name}
              </Badge>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
