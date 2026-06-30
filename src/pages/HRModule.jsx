import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Pencil, Trash2, UserPlus, Upload, Download, FileText, X, ChevronLeft, ChevronRight, FileArchive } from "lucide-react";
import { format, parseISO } from "date-fns";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import EmptyState from "@/components/shared/EmptyState";
import StatCard from "@/components/shared/StatCard";
import { getInvalidManagerIds } from "@/lib/orgHierarchy";
import Pagination, { usePagination } from "@/components/shared/Pagination";
import { useAuth } from "@/lib/AuthContext";
import { assignableRoles, ROLE_LABELS, canWrite, canDelete } from "@/lib/permissions";
import JSZip from "jszip";
import { useCurrency, formatMoney } from "@/components/shared/CurrencyContext";
import { Users, UserCheck } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { provisionEmployeeAccount, DEFAULT_EMPLOYEE_PASSWORD } from "@/lib/employeeAccounts";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";

const DEPARTMENTS = ["cost_management", "quantity_surveying", "project_management", "commercial", "finance", "administration", "executive"];
const ROLES = ["director", "associate_director", "senior_consultant", "consultant", "junior_consultant", "analyst", "administrator"];
const PERF_RATINGS = ["exceptional", "exceeds_expectations", "meets_expectations", "needs_improvement", "unsatisfactory"];
const NO_MANAGER = "__none__";
const EMP_DOCS_BUCKET = "employee-docs";

const ONBOARDING_STEPS = [
  { key: "document_collection", label: "Document Collection" },
  { key: "contract_upload", label: "Contract Upload" },
  { key: "role_assignment", label: "Role Assignment" },
  { key: "cost_rate", label: "Cost Rate" },
  { key: "system_role", label: "System Role" },
  { key: "project_allocation", label: "Project Allocation", optional: true },
];
const REQUIRED_ONBOARDING_STEPS = ONBOARDING_STEPS.filter(s => !s.optional);

const deriveOnboardingStatus = (checklist = {}) => {
  const done = REQUIRED_ONBOARDING_STEPS.filter(s => checklist[s.key]).length;
  if (done === 0) return "not_started";
  if (done === REQUIRED_ONBOARDING_STEPS.length) return "completed";
  return "in_progress";
};

const defaultForm = {
  full_name: "", email: "", phone: "", department: "", role: "", app_role: "qs", job_title: "",
  hourly_rate: "", cost_rate: "", salary: "", status: "active", start_date: "",
  onboarding_status: "not_started", kpi_score: "", performance_rating: "", manager_id: "", manager_name: "",
  contracts: [], documents: [], allocated_projects: [], notes: "", skills: []
};

const CONTRACTS_PER_PAGE = 5;

const deriveOnboardingChecklist = (e = {}) => ({
  document_collection: (e.documents || []).length > 0,
  contract_upload: (e.contracts || []).length > 0,
  role_assignment: !!e.role,
  cost_rate: e.cost_rate !== "" && e.cost_rate != null,
  system_role: !!e.app_role,
  project_allocation: (e.allocated_projects || []).length > 0,
});

const emptyToNull = (value) => {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
};

export default function HRModule() {
  const { currency } = useCurrency();
  const { userRole } = useAuth();
  const canEditEmp = canWrite(userRole, "HRModule");
  const canDeleteEmp = canDelete(userRole, "HRModule");
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("employees");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  // Roles the current user may grant, plus the editing employee's current role so it still shows.
  const roleOptions = Array.from(new Set([...assignableRoles(userRole), ...(editing?.app_role ? [editing.app_role] : [])]));
  const [deleteId, setDeleteId] = useState(null);
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [formTab, setFormTab] = useState("personal");
  const [detailTab, setDetailTab] = useState("personal");
  const [skillInput, setSkillInput] = useState("");
  const [uploadingContract, setUploadingContract] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const contractInputRef = useRef(null);
  const docInputRef = useRef(null);
  const [provisionMessage, setProvisionMessage] = useState("");
  const [provisionError, setProvisionError] = useState("");
  const queryClient = useQueryClient();

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ["employees"],
    queryFn: () => base44.entities.Employee.list("-created_date"),
  });
  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: () => base44.entities.Project.list(),
  });

  const createMut = useMutation({
    mutationFn: async (data) => {
      const employee = await base44.entities.Employee.create(data);

      // Login provisioning is best-effort: if it fails we keep the employee
      // record (no destructive rollback that could leave a ghost row), and
      // surface a warning so HR can retry provisioning later.
      try {
        await provisionEmployeeAccount({
          employeeId: employee.id,
          email: employee.email,
          fullName: employee.full_name,
          appRole: employee.app_role,
        });
        return { employee, provisionWarning: null };
      } catch (error) {
        return { employee, provisionWarning: error.message };
      }
    },
    onSuccess: ({ employee, provisionWarning }) => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      setDialogOpen(false);
      if (provisionWarning) {
        setProvisionMessage("");
        setProvisionError(`Employee onboarded, but the login account could not be created: ${provisionWarning}`);
      } else {
        setProvisionError("");
        setProvisionMessage(
          `${employee.email} can now sign in with the temporary password "${DEFAULT_EMPLOYEE_PASSWORD}" and then change or reset it.`
        );
      }
    },
    onError: (error) => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      setProvisionMessage("");
      const dup = /duplicate key|employees_email_key/i.test(error.message || "");
      setProvisionError(dup ? "An employee with this email already exists (it may be from a previous attempt — check the Onboarding tab)." : error.message);
    },
  });
  const updateMut = useMutation({ mutationFn: ({ id, data }) => base44.entities.Employee.update(id, data), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["employees"] }); setDialogOpen(false); setEditing(null); } });
  const deleteMut = useMutation({ mutationFn: id => base44.entities.Employee.delete(id), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["employees"] }); setDeleteId(null); } });

  const openNew = () => { setEditing(null); setForm(defaultForm); setFormTab("personal"); setDialogOpen(true); };
  const openEdit = (e) => { setEditing(e); setForm({ ...defaultForm, ...e, hourly_rate: e.hourly_rate || "", cost_rate: e.cost_rate || "", salary: e.salary || "", kpi_score: e.kpi_score || "", contracts: e.contracts || [], documents: e.documents || [], allocated_projects: e.allocated_projects || [] }); setFormTab("personal"); setDialogOpen(true); };
  const openDetail = (e) => { setSelectedEmp(e); setDetailTab("personal"); };

  // ── File uploads (contract + documents) → PRIVATE "employee-docs" bucket ──
  // We store the storage *path* (not a public URL) and mint a short-lived signed
  // URL on click, so sensitive HR files are never publicly reachable.
  const uploadContract = async (file) => {
    if (!file) return;
    setUploadingContract(true);
    try {
      const { file_path } = await base44.integrations.Core.UploadFile({ file, bucket: EMP_DOCS_BUCKET, folder: "contracts" });
      // New contract becomes active; any previous ones become inactive.
      setForm(f => ({
        ...f,
        contracts: [
          { name: file.name, path: file_path, status: "active", uploaded_at: new Date().toISOString() },
          ...(f.contracts || []).map(c => ({ ...c, status: "inactive" })),
        ],
      }));
    } catch (err) { setProvisionError(err.message || "Contract upload failed."); }
    finally { setUploadingContract(false); }
  };
  const removeContract = (path) => setForm(f => ({ ...f, contracts: (f.contracts || []).filter(c => c.path !== path) }));
  const uploadDocument = async (file) => {
    if (!file) return;
    setUploadingDoc(true);
    try {
      const { file_path } = await base44.integrations.Core.UploadFile({ file, bucket: EMP_DOCS_BUCKET, folder: "documents" });
      setForm(f => ({ ...f, documents: [...(f.documents || []), { name: file.name, url: file_path }] }));
    } catch (err) { setProvisionError(err.message || "Document upload failed."); }
    finally { setUploadingDoc(false); }
  };
  const removeDocument = (i) => setForm(f => ({ ...f, documents: (f.documents || []).filter((_, idx) => idx !== i) }));
  const openSignedDoc = async (path) => {
    try {
      const url = await base44.integrations.Core.CreateSignedUrl({ bucket: EMP_DOCS_BUCKET, path, expiresIn: 3600 });
      window.open(url, "_blank", "noopener");
    } catch (err) { setProvisionError(err.message || "Could not open document."); }
  };
  // Zip every collected document and download it (view mode).
  const downloadAllDocuments = async (emp) => {
    const docs = emp.documents || [];
    if (docs.length === 0) return;
    try {
      const zip = new JSZip();
      for (const d of docs) {
        const url = await base44.integrations.Core.CreateSignedUrl({ bucket: EMP_DOCS_BUCKET, path: d.url, expiresIn: 600 });
        const res = await fetch(url);
        zip.file(d.name || d.url.split("/").pop(), await res.blob());
      }
      const blob = await zip.generateAsync({ type: "blob" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${(emp.full_name || "employee").replace(/\s+/g, "_")}-documents.zip`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (err) { setProvisionError(err.message || "Could not build zip."); }
  };
  const toggleProject = (name) => setForm(f => {
    const set = new Set(f.allocated_projects || []);
    set.has(name) ? set.delete(name) : set.add(name);
    return { ...f, allocated_projects: [...set] };
  });
  const handleSave = (ev) => {
    ev.preventDefault();
    setProvisionMessage("");
    setProvisionError("");
    // Manual validation — required fields live across tabs that may be unmounted.
    if (!form.full_name || !form.email || !form.department) {
      setFormTab("personal");
      setProvisionError("Full name, email and department are required.");
      return;
    }
    if (!form.role) {
      setFormTab("role");
      setProvisionError("Seniority (role) is required.");
      return;
    }
    // Email must be unique across employees (DB enforces it too).
    const emailLower = form.email.trim().toLowerCase();
    const emailClash = employees.some(e => (e.email || "").toLowerCase() === emailLower && e.id !== editing?.id);
    if (emailClash) {
      setFormTab("personal");
      setProvisionError(`An employee with the email "${form.email.trim()}" already exists.`);
      return;
    }
    const checklist = deriveOnboardingChecklist(form);
    const data = {
      ...form,
      phone: emptyToNull(form.phone),
      job_title: emptyToNull(form.job_title),
      hourly_rate: form.hourly_rate ? Number(form.hourly_rate) : undefined,
      cost_rate: form.cost_rate ? Number(form.cost_rate) : undefined,
      salary: form.salary ? Number(form.salary) : undefined,
      start_date: form.start_date || null,
      kpi_score: form.kpi_score ? Number(form.kpi_score) : undefined,
      performance_rating: form.performance_rating || null,
      manager_id: form.manager_id || null,
      manager_name: emptyToNull(employees.find(e => e.id === form.manager_id)?.full_name),
      contracts: form.contracts || [],
      documents: form.documents || [],
      allocated_projects: form.allocated_projects || [],
      onboarding_checklist: checklist,
      onboarding_status: deriveOnboardingStatus(checklist),
      notes: emptyToNull(form.notes),
      skills: Array.isArray(form.skills) && form.skills.length > 0 ? form.skills : null,
    };
    if (editing) {
      const { id, ...updateData } = data;
      updateMut.mutate({ id: editing.id, data: updateData });
    } else {
      createMut.mutate(data);
    }
  };
  const addSkill = () => { if (skillInput.trim()) { setForm(f => ({ ...f, skills: [...(f.skills || []), skillInput.trim()] })); setSkillInput(""); } };
  const removeSkill = i => setForm(f => ({ ...f, skills: (f.skills || []).filter((_, idx) => idx !== i) }));

  // Only fully-onboarded employees count as part of the workforce / appear in the list.
  const onboardedEmployees = employees.filter(e => e.onboarding_status === "completed");
  const filtered = onboardedEmployees.filter(e =>
    (e.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
    (e.department || "").toLowerCase().includes(search.toLowerCase()) ||
    (e.role || "").toLowerCase().includes(search.toLowerCase())
  );
  const empPager = usePagination(filtered, 10);
  // Exclude self and anyone already reporting under this employee (would create a cycle).
  const invalidManagerIds = getInvalidManagerIds(employees, editing?.id);
  const managerOptions = employees.filter((employee) => !invalidManagerIds.has(employee.id));

  const active = onboardedEmployees.filter(e => e.status === "active").length;
  const onboarding = employees.filter(e => e.onboarding_status !== "completed").length;

  return (
    <div className="space-y-4">
      <PageHeader title="HR Module" description="Manage employees and onboarding" />

      {provisionMessage && (
        <Alert>
          <AlertDescription>{provisionMessage}</AlertDescription>
        </Alert>
      )}

      {provisionError && (
        <Alert variant="destructive">
          <AlertDescription>{provisionError}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-3 gap-3">
        <StatCard title="Total Staff" value={onboardedEmployees.length} icon={Users} color="primary" />
        <StatCard title="Active" value={active} icon={UserCheck} color="green" />
        <StatCard title="Onboarding" value={onboarding} icon={UserPlus} color="blue" />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <TabsList>
            <TabsTrigger value="employees">All Employees</TabsTrigger>
            <TabsTrigger value="onboarding">Onboarding</TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 w-48" />
            </div>
            {canEditEmp && <Button size="sm" onClick={openNew}><UserPlus className="h-4 w-4 mr-1.5" />Onboard Employee</Button>}
          </div>
        </div>

        <TabsContent value="employees" className="mt-4">
          <Card>
            {filtered.length === 0 && !isLoading ? (
              <EmptyState title="No onboarded employees yet" actionLabel={canEditEmp ? "Onboard Employee" : undefined} onAction={canEditEmp ? openNew : undefined} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b bg-muted/30">
                    <th className="text-left p-3 font-medium text-muted-foreground">Employee</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Department</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Role</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Rate/hr</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">System Role</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                    <th className="p-3 w-20"></th>
                  </tr></thead>
                  <tbody>
                    {empPager.pageItems.map(emp => (
                      <tr key={emp.id} className="border-b hover:bg-muted/20 cursor-pointer" onClick={() => openDetail(emp)}>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">{(emp.full_name || "?").charAt(0)}</div>
                            <div><p className="font-medium">{emp.full_name}</p><p className="text-xs text-muted-foreground">{emp.email}</p></div>
                          </div>
                        </td>
                        <td className="p-3 capitalize">{(emp.department || "").replace(/_/g, " ")}</td>
                        <td className="p-3 capitalize">{(emp.role || "").replace(/_/g, " ")}</td>
                        <td className="p-3 font-medium">{emp.hourly_rate ? formatMoney(emp.hourly_rate, currency) + "/hr" : "—"}</td>
                        <td className="p-3"><Badge variant="outline" className="text-xs">{ROLE_LABELS[emp.app_role] || emp.app_role || "—"}</Badge></td>
                        <td className="p-3"><StatusBadge status={emp.status} /></td>
                        <td className="p-3" onClick={e => e.stopPropagation()}>
                          <div className="flex gap-1">
                            {canEditEmp && <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(emp)}><Pencil className="h-3.5 w-3.5" /></Button>}
                            {canDeleteEmp && <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(emp.id)}><Trash2 className="h-3.5 w-3.5" /></Button>}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <Pagination {...empPager} />
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="onboarding" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {employees.filter(e => e.onboarding_status !== "completed").map(emp => {
              const checklist = deriveOnboardingChecklist(emp);
              const requiredDone = REQUIRED_ONBOARDING_STEPS.filter(s => checklist[s.key]).length;
              const pct = Math.round((requiredDone / REQUIRED_ONBOARDING_STEPS.length) * 100);
              return (
                <Card key={emp.id} className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">{(emp.full_name || "?").charAt(0)}</div>
                      <div><p className="font-medium text-sm">{emp.full_name}</p><p className="text-xs text-muted-foreground capitalize">{(emp.role || "").replace(/_/g, " ")}</p></div>
                    </div>
                    <StatusBadge status={emp.onboarding_status || "not_started"} />
                  </div>

                  <div className="flex items-center gap-2 mb-3">
                    <Progress value={pct} className="h-1.5 flex-1" />
                    <span className="text-[11px] text-muted-foreground w-16 text-right">{requiredDone}/{REQUIRED_ONBOARDING_STEPS.length} steps</span>
                  </div>

                  <div className="space-y-2 mb-3">
                    {ONBOARDING_STEPS.map(step => (
                      <div key={step.key} className="flex items-center gap-2.5 text-sm">
                        <Checkbox checked={!!checklist[step.key]} disabled className="data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600" />
                        <span>
                          {step.label}{step.optional && <span className="text-[10px] text-muted-foreground ml-1">(optional)</span>}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => openEdit(emp)}>Open Details</Button>
                    {canDeleteEmp && <Button variant="outline" size="sm" className="text-destructive" title="Delete" onClick={() => setDeleteId(emp.id)}><Trash2 className="h-3.5 w-3.5" /></Button>}
                  </div>
                </Card>
              );
            })}
            {employees.filter(e => e.onboarding_status !== "completed").length === 0 && (
              <div className="col-span-3 py-12 text-center text-sm text-muted-foreground">All employees fully onboarded</div>
            )}
          </div>
        </TabsContent>

      </Tabs>

      {/* Employee Detail Drawer */}
      {selectedEmp && (
        <Dialog open={!!selectedEmp} onOpenChange={() => setSelectedEmp(null)}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <Button variant="ghost" size="icon" className="absolute left-3 top-3 h-7 w-7" title="Edit employee" onClick={() => { const e = selectedEmp; setSelectedEmp(null); openEdit(e); }}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <DialogHeader className="pt-5"><DialogTitle className="sr-only">Employee Profile</DialogTitle></DialogHeader>
            <div className="flex items-center gap-4 mb-3">
              <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary">{(selectedEmp.full_name || "?").charAt(0)}</div>
              <div>
                <h3 className="font-bold text-lg">{selectedEmp.full_name}</h3>
                <p className="text-sm text-muted-foreground capitalize">{(selectedEmp.role || "").replace(/_/g, " ")} · {(selectedEmp.department || "").replace(/_/g, " ")}</p>
                <StatusBadge status={selectedEmp.status} className="mt-1" />
              </div>
            </div>

            <Tabs value={detailTab} onValueChange={setDetailTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="personal">Personal</TabsTrigger>
                <TabsTrigger value="role">Role</TabsTrigger>
                <TabsTrigger value="contracts">Contracts</TabsTrigger>
                <TabsTrigger value="documents">Documents</TabsTrigger>
              </TabsList>

              <TabsContent value="personal" className="mt-4 space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {[
                    ["Email", selectedEmp.email], ["Phone", selectedEmp.phone],
                    ["Job Title", selectedEmp.job_title], ["Start Date", selectedEmp.start_date],
                    ["Manager", selectedEmp.manager_name],
                  ].map(([l, v]) => (
                    <div key={l}><p className="text-xs text-muted-foreground">{l}</p><p className="font-medium">{v || "—"}</p></div>
                  ))}
                </div>
                {(selectedEmp.skills || []).length > 0 && (
                  <div><p className="text-xs text-muted-foreground mb-2">Skills</p>
                    <div className="flex flex-wrap gap-1.5">{selectedEmp.skills.map((s, i) => <Badge key={i} variant="secondary" className="text-xs">{s}</Badge>)}</div>
                  </div>
                )}
                {selectedEmp.notes && <div><p className="text-xs text-muted-foreground mb-1">Notes</p><p className="text-sm">{selectedEmp.notes}</p></div>}
              </TabsContent>

              <TabsContent value="role" className="mt-4 space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {[
                    ["Seniority", (selectedEmp.role || "").replace(/_/g, " ")],
                    ["System Role", ROLE_LABELS[selectedEmp.app_role] || selectedEmp.app_role],
                    ["Charge Rate", selectedEmp.hourly_rate ? formatMoney(selectedEmp.hourly_rate, currency) + "/hr" : "—"],
                    ["Cost Rate", selectedEmp.cost_rate ? formatMoney(selectedEmp.cost_rate, currency) + "/hr" : "—"],
                    ["Annual Salary", selectedEmp.salary ? formatMoney(selectedEmp.salary, currency) : "—"],
                  ].map(([l, v]) => (
                    <div key={l}><p className="text-xs text-muted-foreground">{l}</p><p className="font-medium capitalize">{v || "—"}</p></div>
                  ))}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Project Allocation</p>
                  {(selectedEmp.allocated_projects || []).length > 0
                    ? <div className="flex flex-wrap gap-1.5">{selectedEmp.allocated_projects.map((p, i) => <Badge key={i} variant="outline" className="text-xs">{p}</Badge>)}</div>
                    : <p className="text-sm text-muted-foreground">Not allocated to any project.</p>}
                </div>
              </TabsContent>

              <TabsContent value="contracts" className="mt-4">
                <ContractList contracts={selectedEmp.contracts} onDownload={openSignedDoc} />
              </TabsContent>

              <TabsContent value="documents" className="mt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">Collected Documents</p>
                  {(selectedEmp.documents || []).length > 0 && (
                    <Button type="button" variant="outline" size="sm" onClick={() => downloadAllDocuments(selectedEmp)}>
                      <FileArchive className="h-4 w-4 mr-1.5" /> Download all (zip)
                    </Button>
                  )}
                </div>
                {(selectedEmp.documents || []).length > 0 ? (
                  <div className="space-y-1.5">
                    {selectedEmp.documents.map((d, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm rounded-md border px-3 py-2"><FileText className="h-4 w-4 shrink-0 text-muted-foreground" /><span className="truncate">{d.name}</span></div>
                    ))}
                  </div>
                ) : <p className="text-sm text-muted-foreground">No documents collected.</p>}
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      )}

      {/* Form Dialog — 3 steps */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Employee" : "Onboard Employee"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <Tabs value={formTab} onValueChange={setFormTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="personal">1. Personal</TabsTrigger>
                <TabsTrigger value="role">2. Role</TabsTrigger>
                <TabsTrigger value="contracts">3. Contracts</TabsTrigger>
                <TabsTrigger value="documents">4. Documents</TabsTrigger>
              </TabsList>

              {/* STEP 1 — Personal */}
              <TabsContent value="personal" className="mt-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5 col-span-2 sm:col-span-1"><Label>Full Name *</Label><Input value={form.full_name} onChange={e => setForm(f => ({...f, full_name: e.target.value}))} /></div>
                  <div className="space-y-1.5 col-span-2 sm:col-span-1"><Label>Email *</Label><Input type="email" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} /></div>
                  <div className="space-y-1.5"><Label>Phone</Label><Input value={form.phone} onChange={e => setForm(f => ({...f, phone: e.target.value}))} /></div>
                  <div className="space-y-1.5"><Label>Job Title</Label><Input value={form.job_title} onChange={e => setForm(f => ({...f, job_title: e.target.value}))} /></div>
                  <div className="space-y-1.5"><Label>Department *</Label><Select value={form.department} onValueChange={v => setForm(f => ({...f, department: v}))}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d.replace(/_/g, " ")}</SelectItem>)}</SelectContent></Select></div>
                  <div className="space-y-1.5"><Label>Start Date</Label><Input type="date" value={form.start_date} onChange={e => setForm(f => ({...f, start_date: e.target.value}))} /></div>
                  <div className="space-y-1.5 col-span-2">
                    <Label>Manager</Label>
                    <Select value={form.manager_id || NO_MANAGER} onValueChange={v => setForm(f => ({ ...f, manager_id: v === NO_MANAGER ? "" : v }))}>
                      <SelectTrigger><SelectValue placeholder="Select manager" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NO_MANAGER}>No manager</SelectItem>
                        {managerOptions.map((employee) => (
                          <SelectItem key={employee.id} value={employee.id}>{employee.full_name}{employee.job_title ? ` · ${employee.job_title}` : ""}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Skills</Label>
                  <div className="flex gap-2"><Input value={skillInput} onChange={e => setSkillInput(e.target.value)} placeholder="Add skill" onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addSkill(); } }} /><Button type="button" variant="outline" size="sm" onClick={addSkill}>Add</Button></div>
                  <div className="flex flex-wrap gap-1.5">{(form.skills || []).map((s, i) => <span key={i} className="inline-flex items-center gap-1 bg-secondary text-xs px-2 py-1 rounded-md">{s}<button type="button" onClick={() => removeSkill(i)}>×</button></span>)}</div>
                </div>
              </TabsContent>

              {/* STEP 2 — Role & Allocation */}
              <TabsContent value="role" className="mt-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5"><Label>Seniority (Role) *</Label><Select value={form.role} onValueChange={v => setForm(f => ({...f, role: v}))}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{ROLES.map(r => <SelectItem key={r} value={r}>{r.replace(/_/g, " ")}</SelectItem>)}</SelectContent></Select></div>
                  <div className="space-y-1.5"><Label>System Role</Label><Select value={form.app_role} onValueChange={v => setForm(f => ({...f, app_role: v}))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{roleOptions.map(r => <SelectItem key={r} value={r}>{ROLE_LABELS[r] || r}</SelectItem>)}</SelectContent></Select></div>
                  <div className="space-y-1.5"><Label>Charge Rate ({currency.symbol}/hr)</Label><Input type="number" value={form.hourly_rate} onChange={e => setForm(f => ({...f, hourly_rate: e.target.value}))} /></div>
                  <div className="space-y-1.5"><Label>Cost Rate ({currency.symbol}/hr)</Label><Input type="number" value={form.cost_rate} onChange={e => setForm(f => ({...f, cost_rate: e.target.value}))} /></div>
                  <div className="space-y-1.5"><Label>Annual Salary ({currency.symbol})</Label><Input type="number" value={form.salary} onChange={e => setForm(f => ({...f, salary: e.target.value}))} /></div>
                  <div className="space-y-1.5"><Label>Status</Label><Select value={form.status} onValueChange={v => setForm(f => ({...f, status: v}))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="on_leave">On Leave</SelectItem><SelectItem value="terminated">Terminated</SelectItem></SelectContent></Select></div>
                </div>
                <div className="space-y-2">
                  <Label>Project Allocation <span className="text-xs text-muted-foreground font-normal">(optional)</span></Label>
                  {projects.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No projects available to allocate.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {projects.map(p => {
                        const on = (form.allocated_projects || []).includes(p.name);
                        return (
                          <button type="button" key={p.id} onClick={() => toggleProject(p.name)}
                            className={`text-xs px-2.5 py-1 rounded-md border transition-colors ${on ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"}`}>
                            {p.name}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* STEP 3 — Contracts */}
              <TabsContent value="contracts" className="mt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Contracts <span className="text-xs text-muted-foreground font-normal">(newest is marked active)</span></Label>
                  <div>
                    <input ref={contractInputRef} type="file" className="hidden" onChange={e => { uploadContract(e.target.files?.[0]); if (contractInputRef.current) contractInputRef.current.value = ""; }} />
                    <Button type="button" variant="outline" size="sm" disabled={uploadingContract} onClick={() => contractInputRef.current?.click()}>
                      <Upload className="h-4 w-4 mr-1.5" />{uploadingContract ? "Uploading…" : "Upload Contract"}
                    </Button>
                  </div>
                </div>
                <ContractList contracts={form.contracts} onRemove={removeContract} />
              </TabsContent>

              {/* STEP 4 — Documents */}
              <TabsContent value="documents" className="mt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Document Collection</Label>
                  <div>
                    <input ref={docInputRef} type="file" className="hidden" onChange={e => { uploadDocument(e.target.files?.[0]); if (docInputRef.current) docInputRef.current.value = ""; }} />
                    <Button type="button" variant="outline" size="sm" disabled={uploadingDoc} onClick={() => docInputRef.current?.click()}>
                      <Upload className="h-4 w-4 mr-1.5" />{uploadingDoc ? "Uploading…" : "Add Document"}
                    </Button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  {(form.documents || []).length === 0 && <p className="text-sm text-muted-foreground">No documents uploaded.</p>}
                  {(form.documents || []).map((d, i) => (
                    <div key={i} className="flex items-center justify-between rounded-md border px-3 py-2">
                      <span className="flex items-center gap-2 text-sm min-w-0"><FileText className="h-4 w-4 shrink-0 text-muted-foreground" /><span className="truncate">{d.name}</span></span>
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeDocument(i)}><X className="h-3.5 w-3.5" /></Button>
                    </div>
                  ))}
                </div>
                <div className="space-y-1.5"><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} rows={2} /></div>
              </TabsContent>
            </Tabs>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              {/* Edit mode: Update directly. Onboarding (new): step Next → Next → Next → Update. */}
              {!editing && formTab !== "documents"
                ? <Button type="button" onClick={() => setFormTab({ personal: "role", role: "contracts", contracts: "documents" }[formTab])}>Next</Button>
                : <Button type="submit" disabled={createMut.isPending || updateMut.isPending}>{createMut.isPending || updateMut.isPending ? "Saving…" : (editing ? "Update" : "Onboard")}</Button>}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete Employee</AlertDialogTitle><AlertDialogDescription>This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteMut.mutate(deleteId)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Paginated list of contracts. Read-only with download when `onDownload` is given
// (view mode); shows a remove action in the form when `onRemove` is given.
function ContractList({ contracts = [], onDownload, onRemove }) {
  const [page, setPage] = useState(0);
  const sorted = [...contracts].sort((a, b) => (b.uploaded_at || "").localeCompare(a.uploaded_at || ""));
  const pages = Math.max(1, Math.ceil(sorted.length / CONTRACTS_PER_PAGE));
  const safePage = Math.min(page, pages - 1);
  const slice = sorted.slice(safePage * CONTRACTS_PER_PAGE, safePage * CONTRACTS_PER_PAGE + CONTRACTS_PER_PAGE);

  if (contracts.length === 0) return <p className="text-sm text-muted-foreground">No contracts uploaded.</p>;

  return (
    <div className="space-y-2">
      {slice.map((c, i) => (
        <div key={c.path || i} className="flex items-center justify-between rounded-md border px-3 py-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm truncate">{c.name}</span>
              <Badge variant="outline" className={`text-[10px] capitalize ${c.status === "active" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "text-muted-foreground"}`}>{c.status || "active"}</Badge>
            </div>
            {c.uploaded_at && <p className="text-[11px] text-muted-foreground ml-6">{format(parseISO(c.uploaded_at), "dd MMM yyyy")}</p>}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {onDownload && <Button type="button" variant="ghost" size="icon" className="h-7 w-7" title="Download" onClick={() => onDownload(c.path)}><Download className="h-3.5 w-3.5" /></Button>}
            {onRemove && <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onRemove(c.path)}><X className="h-3.5 w-3.5" /></Button>}
          </div>
        </div>
      ))}
      {pages > 1 && (
        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-muted-foreground">Page {safePage + 1} of {pages}</span>
          <div className="flex gap-1">
            <Button type="button" variant="outline" size="icon" className="h-7 w-7" disabled={safePage === 0} onClick={() => setPage(safePage - 1)}><ChevronLeft className="h-3.5 w-3.5" /></Button>
            <Button type="button" variant="outline" size="icon" className="h-7 w-7" disabled={safePage >= pages - 1} onClick={() => setPage(safePage + 1)}><ChevronRight className="h-3.5 w-3.5" /></Button>
          </div>
        </div>
      )}
    </div>
  );
}
