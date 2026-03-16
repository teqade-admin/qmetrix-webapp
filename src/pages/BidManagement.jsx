import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Search, Pencil, Trash2, Rocket } from "lucide-react";
import FeeCalculator from "@/components/bids/FeeCalculator";
import KickOffProjectDialog from "@/components/bids/KickOffProjectDialog";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import EmptyState from "@/components/shared/EmptyState";
import StatCard from "@/components/shared/StatCard";
import { DollarSign, FileText, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { useCurrency, formatMoney } from "@/components/shared/CurrencyContext";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";

const SECTORS = ["residential", "commercial", "infrastructure", "healthcare", "education", "industrial", "mixed_use", "government", "other"];
const STATUSES = ["draft", "in_progress", "submitted", "won", "lost", "withdrawn"];

const defaultForm = { title: "", client_name: "", client_contact: "", client_email: "", description: "", sector: "", estimated_value: "", fee_proposal: "", submission_date: "", status: "draft", probability: "", lead_consultant: "", client_onboarding_status: "pending", notes: "", stage_breakdown: {} };

export default function BidManagement() {
  const { currency } = useCurrency();
  const [tab, setTab] = useState("pipeline");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBid, setEditingBid] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [stageBreakdown, setStageBreakdown] = useState({});
  const [kickOffBid, setKickOffBid] = useState(null);

  const queryClient = useQueryClient();

  const { data: bids = [] } = useQuery({ queryKey: ["bids"], queryFn: () => base44.entities.Bid.list("-created_date") });
  const { data: employees = [] } = useQuery({ queryKey: ["employees"], queryFn: () => base44.entities.Employee.list() });

  const createMut = useMutation({ mutationFn: d => base44.entities.Bid.create(d), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["bids"] }); setDialogOpen(false); } });
  const updateMut = useMutation({ mutationFn: ({ id, data }) => base44.entities.Bid.update(id, data), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["bids"] }); setDialogOpen(false); setEditingBid(null); } });
  const deleteMut = useMutation({ mutationFn: id => base44.entities.Bid.delete(id), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["bids"] }); setDeleteId(null); } });
  const kickOffMut = useMutation({
    mutationFn: async ({ bidId, projectData }) => {
      const project = await base44.entities.Project.create(projectData);
      await base44.entities.Bid.update(bidId, { status: "won" });
      return project;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bids"] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setKickOffBid(null);
    }
  });

  const openNew = () => { setEditingBid(null); setForm(defaultForm); setStageBreakdown({}); setDialogOpen(true); };
  const openEdit = b => { setEditingBid(b); setForm({ ...defaultForm, ...b, estimated_value: b.estimated_value ?? "", fee_proposal: b.fee_proposal ?? "", probability: b.probability ?? "" }); setStageBreakdown(b.stage_breakdown || {}); setDialogOpen(true); };

  const handleSave = e => {
    e.preventDefault();
    const totalFee = Object.values(stageBreakdown).reduce((s, st) => s + (st ? (Number(st.fee) || 0) : 0), 0);
    const data = { ...form, estimated_value: form.estimated_value ? Number(form.estimated_value) : undefined, fee_proposal: totalFee > 0 ? totalFee : (form.fee_proposal ? Number(form.fee_proposal) : undefined), probability: form.probability ? Number(form.probability) : undefined, stage_breakdown: stageBreakdown };
    editingBid ? updateMut.mutate({ id: editingBid.id, data }) : createMut.mutate(data);
  };

  const totalCalcFee = Object.values(stageBreakdown).reduce((s, sb) => {
    const emps = sb?.employees || [];
    return s + emps.reduce((es, e) => es + ((Number(e.hours) || 0) * (Number(e.rate) || 0)), 0);
  }, 0);

  const filtered = bids.filter(b => {
    const matchSearch = (b.title || "").toLowerCase().includes(search.toLowerCase()) || (b.client_name || "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || b.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const pipelineValue = bids.filter(b => ["submitted", "in_progress"].includes(b.status)).reduce((s, b) => s + (b.fee_proposal || 0), 0);
  const wonValue = bids.filter(b => b.status === "won").reduce((s, b) => s + (b.fee_proposal || 0), 0);
  const winRate = bids.length > 0 ? (bids.filter(b => b.status === "won").length / bids.filter(b => ["won","lost"].includes(b.status)).length * 100) || 0 : 0;

  return (
    <div className="space-y-4">
      <PageHeader title="Bid Management" description="Track proposals, calculate fees, and manage your pipeline" actionLabel="New Bid" onAction={openNew}>
        <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-36"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All Statuses</SelectItem>{STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}</SelectContent></Select>
        <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 w-52" /></div>
      </PageHeader>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard title="Total Bids" value={bids.length} icon={FileText} color="primary" />
        <StatCard title="Pipeline Value" value={`${currency.symbol}${(pipelineValue/1000).toFixed(0)}k`} icon={DollarSign} color="accent" />
        <StatCard title="Won Value" value={`${currency.symbol}${(wonValue/1000).toFixed(0)}k`} icon={TrendingUp} color="green" />
        <StatCard title="Win Rate" value={`${winRate.toFixed(0)}%`} icon={TrendingUp} color={winRate >= 50 ? "green" : "red"} />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="client_onboarding">Client Onboarding</TabsTrigger>
        </TabsList>

        <TabsContent value="pipeline" className="mt-4">
          <Card>
            {filtered.length === 0 ? <EmptyState title="No bids found" actionLabel="New Bid" onAction={openNew} /> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b bg-muted/30">
                    <th className="text-left p-3 font-medium text-muted-foreground">Title</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Client</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Sector</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Fee</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Probability</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Submission</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                    <th className="p-3 w-20"></th>
                  </tr></thead>
                  <tbody>
                    {filtered.map(bid => (
                      <tr key={bid.id} className="border-b hover:bg-muted/20">
                        <td className="p-3 font-medium">{bid.title}</td>
                        <td className="p-3 text-muted-foreground">{bid.client_name}</td>
                        <td className="p-3 capitalize text-xs">{(bid.sector || "—").replace(/_/g, " ")}</td>
                        <td className="p-3 font-semibold">{formatMoney(bid.fee_proposal || 0, currency)}</td>
                        <td className="p-3">
                          {bid.probability != null ? (
                            <div className="flex items-center gap-1.5 w-24"><Progress value={bid.probability} className="h-1.5 flex-1" /><span className="text-xs">{bid.probability}%</span></div>
                          ) : "—"}
                        </td>
                        <td className="p-3 text-xs">{bid.submission_date ? format(new Date(bid.submission_date), "dd MMM yy") : "—"}</td>
                        <td className="p-3"><StatusBadge status={bid.status} /></td>
                        <td className="p-3">
                          <div className="flex gap-1 items-center">
                            {bid.status === "won" && (
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-primary" title="Kick Off Project" onClick={() => setKickOffBid(bid)}>
                                <Rocket className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(bid)}><Pencil className="h-3.5 w-3.5" /></Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(bid.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
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

        <TabsContent value="client_onboarding" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {bids.map(bid => (
              <Card key={bid.id} className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div><p className="font-semibold text-sm">{bid.client_name}</p><p className="text-xs text-muted-foreground">{bid.client_contact}</p></div>
                  <StatusBadge status={bid.client_onboarding_status || "pending"} />
                </div>
                <p className="text-xs text-muted-foreground mb-3">{bid.title}</p>
                <div className="flex gap-2">
                  {bid.client_onboarding_status !== "approved" && (
                    <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => updateMut.mutate({ id: bid.id, data: { client_onboarding_status: "approved" } })}>Approve</Button>
                  )}
                  {bid.client_onboarding_status !== "rejected" && (
                    <Button size="sm" variant="outline" className="flex-1 text-xs text-destructive" onClick={() => updateMut.mutate({ id: bid.id, data: { client_onboarding_status: "rejected" } })}>Reject</Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* New/Edit Bid Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingBid ? "Edit Bid" : "New Bid"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 col-span-2"><Label>Title *</Label><Input value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))} required /></div>
              <div className="space-y-1.5"><Label>Client Name *</Label><Input value={form.client_name} onChange={e => setForm(f => ({...f, client_name: e.target.value}))} required /></div>
              <div className="space-y-1.5"><Label>Client Contact</Label><Input value={form.client_contact} onChange={e => setForm(f => ({...f, client_contact: e.target.value}))} /></div>
              <div className="space-y-1.5"><Label>Client Email</Label><Input type="email" value={form.client_email} onChange={e => setForm(f => ({...f, client_email: e.target.value}))} /></div>
              <div className="space-y-1.5"><Label>Lead Consultant</Label><Select value={form.lead_consultant} onValueChange={v => setForm(f => ({...f, lead_consultant: v}))}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{employees.map(e => <SelectItem key={e.id} value={e.full_name}>{e.full_name}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-1.5"><Label>Sector</Label><Select value={form.sector} onValueChange={v => setForm(f => ({...f, sector: v}))}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{SECTORS.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-1.5"><Label>Status</Label><Select value={form.status} onValueChange={v => setForm(f => ({...f, status: v}))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-1.5"><Label>Estimated Project Value (£)</Label><Input type="number" value={form.estimated_value} onChange={e => setForm(f => ({...f, estimated_value: e.target.value}))} /></div>
              <div className="space-y-1.5"><Label>Win Probability (%)</Label><Input type="number" min="0" max="100" value={form.probability} onChange={e => setForm(f => ({...f, probability: e.target.value}))} /></div>
              <div className="space-y-1.5"><Label>Submission Date</Label><Input type="date" value={form.submission_date} onChange={e => setForm(f => ({...f, submission_date: e.target.value}))} /></div>
            </div>

            {/* Stage Fee Calculator */}
            <FeeCalculator
              stageBreakdown={stageBreakdown}
              setStageBreakdown={setStageBreakdown}
              employees={employees}
            />

            <div className="space-y-1.5"><Label>Fee Proposal</Label><Input type="number" value={form.fee_proposal !== "" ? form.fee_proposal : (totalCalcFee > 0 ? totalCalcFee : "")} onChange={e => setForm(f => ({...f, fee_proposal: e.target.value}))} placeholder="Auto-calculated from stages above" /></div>
            <div className="space-y-1.5"><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} rows={2} /></div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button><Button type="submit">{editingBid ? "Update" : "Create"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {kickOffBid && (
        <KickOffProjectDialog
          open={!!kickOffBid}
          onOpenChange={() => setKickOffBid(null)}
          bid={kickOffBid}
          employees={employees}
          loading={kickOffMut.isPending}
          onConfirm={projectData => kickOffMut.mutate({ bidId: kickOffBid.id, projectData })}
        />
      )}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete Bid</AlertDialogTitle><AlertDialogDescription>This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteMut.mutate(deleteId)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}