import React, { useState } from "react";
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
import { Search, Upload, FileText, Trash2, ExternalLink, FolderOpen, FolderClosed } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import { format } from "date-fns";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/lib/AuthContext";

const CATEGORIES = ["contract", "proposal", "report", "drawing", "specification", "correspondence", "financial", "hr", "bid", "other"];
const FOLDERS = ["Projects", "Bids", "HR", "Finance", "Templates", "General"];
const CAT_COLORS = { contract: "bg-blue-100 text-blue-700", proposal: "bg-violet-100 text-violet-700", report: "bg-amber-100 text-amber-700", drawing: "bg-cyan-100 text-cyan-700", specification: "bg-indigo-100 text-indigo-700", correspondence: "bg-slate-100 text-slate-700", financial: "bg-emerald-100 text-emerald-700", hr: "bg-pink-100 text-pink-700", bid: "bg-orange-100 text-orange-700", other: "bg-slate-100 text-slate-600" };

const defaultForm = { title: "", project_name: "", category: "", folder: "", version: "v1.0", description: "", tags: [], uploaded_by: "" };

export default function DataManagement() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [folderFilter, setFolderFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [form, setForm] = useState(defaultForm);
  const [tagInput, setTagInput] = useState("");
  const [file, setFile] = useState(null);
  const [view, setView] = useState("list");
  const queryClient = useQueryClient();

  const { data: documents = [] } = useQuery({ queryKey: ["documents"], queryFn: () => base44.entities.Document.list("-created_date") });
  const { data: projects = [] } = useQuery({ queryKey: ["projects"], queryFn: () => base44.entities.Project.list() });
  const uploadedBy = user?.user_metadata?.full_name || user?.email || "";

  const createMut = useMutation({ mutationFn: d => base44.entities.Document.create(d), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["documents"] }); setDialogOpen(false); setFile(null); } });
  const deleteMut = useMutation({ mutationFn: id => base44.entities.Document.delete(id), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["documents"] }); setDeleteId(null); } });

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!form.title || !form.category) return;
    setUploading(true);
    setUploadError("");
    try {
      let file_url = "";
      if (file) {
        const res = await base44.integrations.Core.UploadFile({ file });
        file_url = res.file_url;
      }
      await createMut.mutateAsync({ ...form, file_url, uploaded_by: uploadedBy });
    } catch (error) {
      console.error("Document upload failed:", error);
      setUploadError(error.message || "Document upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const addTag = () => { if (tagInput.trim()) { setForm(f => ({ ...f, tags: [...(f.tags || []), tagInput.trim()] })); setTagInput(""); } };
  const removeTag = i => setForm(f => ({ ...f, tags: (f.tags || []).filter((_, idx) => idx !== i) }));

  const filtered = documents.filter(d => {
    const ms = (d.title || "").toLowerCase().includes(search.toLowerCase()) || (d.project_name || "").toLowerCase().includes(search.toLowerCase());
    const mc = categoryFilter === "all" || d.category === categoryFilter;
    const mf = folderFilter === "all" || (d.folder || "").includes(folderFilter);
    return ms && mc && mf;
  });

  // Folder structure
  const folders = ["Projects", "Bids", "HR", "Finance", "Templates", "General"];
  const docsByFolder = folders.reduce((acc, f) => { acc[f] = documents.filter(d => (d.folder || "General").includes(f)); return acc; }, {});

  return (
    <div className="space-y-4">
      <PageHeader title="Data Management" description="Centralized document repository with version control" actionLabel="Upload Document" onAction={() => { setForm({ ...defaultForm, uploaded_by: uploadedBy }); setFile(null); setDialogOpen(true); }}>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}><SelectTrigger className="w-32"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All Types</SelectItem>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
          <Select value={folderFilter} onValueChange={setFolderFilter}><SelectTrigger className="w-32"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All Folders</SelectItem>{folders.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent></Select>
          <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 w-44" /></div>
        </div>
      </PageHeader>

      <Tabs value={view} onValueChange={setView}>
        <TabsList><TabsTrigger value="list">List View</TabsTrigger><TabsTrigger value="folders">Folder View</TabsTrigger></TabsList>

        <TabsContent value="list" className="mt-4">
          <Card>
            {filtered.length === 0 ? <EmptyState icon={FolderOpen} title="No documents found" description="Upload your first document" actionLabel="Upload" onAction={() => setDialogOpen(true)} /> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b bg-muted/30">
                    <th className="text-left p-3 font-medium text-muted-foreground">Title</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Category</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Folder</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Project</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Version</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Uploaded</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Tags</th>
                    <th className="p-3 w-20"></th>
                  </tr></thead>
                  <tbody>
                    {filtered.map(doc => (
                      <tr key={doc.id} className="border-b hover:bg-muted/20">
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span className="font-medium">{doc.title}</span>
                          </div>
                        </td>
                        <td className="p-3"><span className={`text-[11px] px-2 py-0.5 rounded-full font-medium capitalize ${CAT_COLORS[doc.category] || "bg-slate-100 text-slate-600"}`}>{doc.category}</span></td>
                        <td className="p-3 text-xs text-muted-foreground">{doc.folder || "General"}</td>
                        <td className="p-3 text-xs text-muted-foreground">{doc.project_name || "—"}</td>
                        <td className="p-3 text-xs">{doc.version || "—"}</td>
                        <td className="p-3 text-xs">{doc.created_date ? format(new Date(doc.created_date), "dd MMM yy") : "—"}</td>
                        <td className="p-3"><div className="flex flex-wrap gap-1">{(doc.tags || []).slice(0, 2).map((t, i) => <span key={i} className="text-[10px] bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded">{t}</span>)}{(doc.tags || []).length > 2 && <span className="text-[10px] text-muted-foreground">+{doc.tags.length - 2}</span>}</div></td>
                        <td className="p-3">
                          <div className="flex gap-1">
                            {doc.file_url && <a href={doc.file_url} target="_blank" rel="noopener noreferrer"><Button variant="ghost" size="icon" className="h-7 w-7"><ExternalLink className="h-3.5 w-3.5" /></Button></a>}
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(doc.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="folders" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {folders.map(folder => {
              const docs = docsByFolder[folder] || [];
              return (
                <Card key={folder} className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <FolderClosed className="h-5 w-5 text-amber-500" />
                    <h3 className="font-semibold text-sm">{folder}</h3>
                    <Badge variant="outline" className="ml-auto text-xs">{docs.length}</Badge>
                  </div>
                  <div className="space-y-1.5">
                    {docs.slice(0, 5).map(doc => (
                      <div key={doc.id} className="flex items-center gap-2 p-2 rounded hover:bg-muted/50 transition-colors">
                        <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="text-xs truncate flex-1">{doc.title}</span>
                        {doc.file_url && <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground"><ExternalLink className="h-3 w-3" /></a>}
                      </div>
                    ))}
                    {docs.length === 0 && <p className="text-xs text-muted-foreground py-2">No documents</p>}
                    {docs.length > 5 && <p className="text-xs text-muted-foreground">+{docs.length - 5} more</p>}
                  </div>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* Upload Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Upload Document</DialogTitle></DialogHeader>
          <form onSubmit={handleUpload} className="space-y-4">
            <div className="space-y-1.5"><Label>Title *</Label><Input value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))} required /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Category *</Label><Select value={form.category} onValueChange={v => setForm(f => ({...f, category: v}))}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-1.5"><Label>Folder</Label><Select value={form.folder} onValueChange={v => setForm(f => ({...f, folder: v}))}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{FOLDERS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-1.5"><Label>Project</Label><Select value={form.project_name} onValueChange={v => setForm(f => ({...f, project_name: v}))}><SelectTrigger><SelectValue placeholder="None" /></SelectTrigger><SelectContent>{projects.map(p => <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-1.5"><Label>Version</Label><Input value={form.version} onChange={e => setForm(f => ({...f, version: e.target.value}))} placeholder="v1.0" /></div>
              <div className="space-y-1.5 col-span-2"><Label>Uploaded By</Label><Input value={uploadedBy} readOnly className="bg-muted cursor-not-allowed" /></div>
            </div>
            <div className="space-y-1.5">
              <Label>File</Label>
              <div className="border-2 border-dashed rounded-lg p-6 text-center hover:bg-muted/20 transition-colors">
                <input type="file" onChange={e => setFile(e.target.files?.[0])} className="hidden" id="file-upload" />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <Upload className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm">{file ? <span className="text-primary font-medium">{file.name}</span> : <span className="text-muted-foreground">Click to select file</span>}</p>
                </label>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Tags</Label>
              <div className="flex gap-2"><Input value={tagInput} onChange={e => setTagInput(e.target.value)} placeholder="Add tag" onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }} /><Button type="button" variant="outline" size="sm" onClick={addTag}>Add</Button></div>
              <div className="flex flex-wrap gap-1.5">{(form.tags || []).map((t, i) => <span key={i} className="inline-flex items-center gap-1 bg-secondary text-xs px-2 py-1 rounded">{t}<button type="button" onClick={() => removeTag(i)}>×</button></span>)}</div>
            </div>
            <div className="space-y-1.5"><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} rows={2} /></div>
            {uploadError && <p className="text-sm text-destructive">{uploadError}</p>}
            <DialogFooter><Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button><Button type="submit" disabled={uploading}>{uploading ? "Uploading..." : "Upload"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete Document</AlertDialogTitle><AlertDialogDescription>This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteMut.mutate(deleteId)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
