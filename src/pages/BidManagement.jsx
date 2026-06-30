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
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Search, Pencil, Trash2, Rocket, Plus, UserPlus, ChevronLeft, Check } from "lucide-react";
import FeeCalculator from "@/components/bids/FeeCalculator";
import KickOffProjectDialog from "@/components/bids/KickOffProjectDialog";
import ClientFormDialog from "@/components/bids/ClientFormDialog";
import ClientDetailDialog from "@/components/bids/ClientDetailDialog";
import BidDetailDialog from "@/components/bids/BidDetailDialog";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import EmptyState from "@/components/shared/EmptyState";
import StatCard from "@/components/shared/StatCard";
import Pagination, { usePagination } from "@/components/shared/Pagination";
import { DollarSign, FileText, TrendingUp, Users } from "lucide-react";
import { format } from "date-fns";
import { formatMoney, CURRENCIES } from "@/components/shared/CurrencyContext";
import { useExchangeRates, convertToBase } from "@/lib/useExchangeRates";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";

const SECTORS = ["residential", "commercial", "infrastructure", "healthcare", "education", "industrial", "mixed_use", "government", "other"];
const STATUSES = ["draft", "in_progress", "submitted", "won", "lost", "withdrawn"];

const defaultForm = {
  title: "", client_id: "", client_name: "", client_contact: "", client_phone: "", client_email: "",
  description: "", sector: "", currency: "GBP", estimated_value: "", fee_proposal: "", submission_date: "",
  status: "draft", probability: "", lead_consultant: "", notes: "", stage_breakdown: {},
};

const sanitizeBidUpdatePayload = (payload) => {
  const { id, created_at, updated_at, created_date, updated_date, ...rest } = payload;
  return rest;
};

export default function BidManagement() {
  const [tab, setTab] = useState("pipeline");
  const queryClient = useQueryClient();

  // ── Pipeline (bids) state ──
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBid, setEditingBid] = useState(null);
  const [bidStep, setBidStep] = useState(1);          // 1 = select client, 2 = details
  const [bidInnerTab, setBidInnerTab] = useState("details");
  const [clientPick, setClientPick] = useState("");   // step-1 client search
  const [deleteId, setDeleteId] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [stageBreakdown, setStageBreakdown] = useState({});
  const [kickOffBid, setKickOffBid] = useState(null);
  const [viewBid, setViewBid] = useState(null);

  // ── Clients state ──
  const [clientSearch, setClientSearch] = useState("");
  const [clientFormOpen, setClientFormOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [clientDetail, setClientDetail] = useState(null);

  const { data: bids = [] } = useQuery({ queryKey: ["bids"], queryFn: () => base44.entities.Bid.list("-created_date") });
  const { data: employees = [] } = useQuery({ queryKey: ["employees"], queryFn: () => base44.entities.Employee.list() });
  const { data: clients = [] } = useQuery({ queryKey: ["clients"], queryFn: () => base44.entities.Client.list("-created_date") });
  const { data: settingsRows = [] } = useQuery({ queryKey: ["app_settings"], queryFn: () => base44.entities.AppSettings.list() });

  // Base (reporting) currency + live FX rates for converting bid fees.
  const baseCurrency = settingsRows[0]?.base_currency || "GBP";
  const baseCurrencyObj = CURRENCIES.find(c => c.code === baseCurrency) || CURRENCIES[0];
  const { data: rates, isError: ratesError } = useExchangeRates(baseCurrency);
  const toBase = (amount, cur) => convertToBase(amount, cur || baseCurrency, baseCurrency, rates);
  const currencyObj = (code) => CURRENCIES.find(c => c.code === code) || baseCurrencyObj;

  const createMut = useMutation({ mutationFn: d => base44.entities.Bid.create(d), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["bids"] }); setDialogOpen(false); } });
  const updateMut = useMutation({ mutationFn: ({ id, data }) => base44.entities.Bid.update(id, data), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["bids"] }); setDialogOpen(false); setEditingBid(null); } });
  const deleteMut = useMutation({ mutationFn: id => base44.entities.Bid.delete(id), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["bids"] }); setDeleteId(null); } });

  const clientCreateMut = useMutation({ mutationFn: d => base44.entities.Client.create(d), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["clients"] }); setClientFormOpen(false); setEditingClient(null); } });
  const clientUpdateMut = useMutation({ mutationFn: ({ id, data }) => base44.entities.Client.update(id, data), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["clients"] }); setClientFormOpen(false); setEditingClient(null); } });

  const kickOffMut = useMutation({
    mutationFn: async ({ bidId, projectData, bidUpdateData }) => {
      const project = await base44.entities.Project.create(projectData);
      const bidUpdates = { status: "won", ...bidUpdateData };
      await base44.entities.Bid.update(bidId, sanitizeBidUpdatePayload(bidUpdates));
      return project;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bids"] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setKickOffBid(null);
    }
  });

  // ── Bid dialog open helpers ──
  const openNewBid = () => {
    setEditingBid(null);
    setForm({ ...defaultForm, currency: baseCurrency });
    setStageBreakdown({});
    setClientPick("");
    setBidInnerTab("details");
    setBidStep(1);
    setDialogOpen(true);
  };

  const openEditBid = (b) => {
    setEditingBid(b);
    setForm({ ...defaultForm, ...b, estimated_value: b.estimated_value ?? "", fee_proposal: b.fee_proposal ?? "", probability: b.probability ?? "" });
    setStageBreakdown(b.stage_breakdown || {});
    setBidInnerTab("details");
    setBidStep(2); // editing skips client selection
    setDialogOpen(true);
  };

  // Step 1 → pick a client and prefill the bid's contact details (editable).
  const selectClientForBid = (client) => {
    setForm(f => ({
      ...f,
      client_id: client.id,
      client_name: client.company_name,
      client_contact: client.contact_person || "",
      client_phone: client.phone || "",
      client_email: client.email || "",
      sector: f.sector || client.sector || "",
    }));
    setBidStep(2);
    setBidInnerTab("details");
  };

  const totalCalcFee = Object.values(stageBreakdown).reduce((s, sb) => {
    const emps = sb?.employees || [];
    return s + emps.reduce((es, e) => es + ((Number(e.hours) || 0) * (Number(e.rate) || 0)), 0);
  }, 0);

  const handleSaveBid = (e) => {
    e.preventDefault();
    const totalFee = Object.values(stageBreakdown).reduce((s, st) => s + (st ? (Number(st.fee) || 0) : 0), 0);
    const data = {
      ...form,
      estimated_value: form.estimated_value ? Number(form.estimated_value) : undefined,
      fee_proposal: totalFee > 0 ? totalFee : (form.fee_proposal ? Number(form.fee_proposal) : undefined),
      probability: form.probability ? Number(form.probability) : undefined,
      stage_breakdown: stageBreakdown,
    };

    if (editingBid) {
      const statusChangingToWon = editingBid.status !== "won" && data.status === "won";
      if (statusChangingToWon) {
        setForm(data);
        setKickOffBid({ ...editingBid, ...data });
        setDialogOpen(false);
      } else {
        updateMut.mutate({ id: editingBid.id, data: sanitizeBidUpdatePayload(data) });
      }
    } else {
      createMut.mutate(data);
    }
  };

  // ── Client helpers ──
  const openOnboardClient = () => { setEditingClient(null); setClientFormOpen(true); };
  const openEditClient = (c) => { setClientDetail(null); setEditingClient(c); setClientFormOpen(true); };
  const saveClient = (data) => {
    if (editingClient) clientUpdateMut.mutate({ id: editingClient.id, data });
    else clientCreateMut.mutate(data);
  };

  // ── Derived ──
  const filtered = bids.filter(b => {
    const matchSearch = (b.title || "").toLowerCase().includes(search.toLowerCase()) || (b.client_name || "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || b.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const filteredClients = clients.filter(c =>
    (c.company_name || "").toLowerCase().includes(clientSearch.toLowerCase()) ||
    (c.contact_person || "").toLowerCase().includes(clientSearch.toLowerCase()) ||
    (c.email || "").toLowerCase().includes(clientSearch.toLowerCase())
  );
  const bidPager = usePagination(filtered, 10);
  const clientPager = usePagination(filteredClients, 10);

  const pickClients = clients.filter(c => (c.company_name || "").toLowerCase().includes(clientPick.toLowerCase()));

  const pipelineValue = bids.filter(b => ["submitted", "in_progress"].includes(b.status)).reduce((s, b) => s + (toBase(b.fee_proposal || 0, b.currency) ?? 0), 0);
  const wonValue = bids.filter(b => b.status === "won").reduce((s, b) => s + (toBase(b.fee_proposal || 0, b.currency) ?? 0), 0);
  const winRate = bids.length > 0 ? (bids.filter(b => b.status === "won").length / bids.filter(b => ["won","lost"].includes(b.status)).length * 100) || 0 : 0;

  return (
    <div className="space-y-4">
      <PageHeader title="Bid Management" description="Track proposals, manage clients, and calculate fees" />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard title="Total Bids" value={bids.length} icon={FileText} color="primary" />
        <StatCard title={`Pipeline (${baseCurrency})`} value={`${baseCurrencyObj.symbol}${(pipelineValue/1000).toFixed(0)}k`} icon={DollarSign} color="accent" />
        <StatCard title={`Won (${baseCurrency})`} value={`${baseCurrencyObj.symbol}${(wonValue/1000).toFixed(0)}k`} icon={TrendingUp} color="green" />
        <StatCard title="Clients" value={clients.length} icon={Users} color="blue" />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="clients">Clients</TabsTrigger>
        </TabsList>

        {/* ── PIPELINE ── */}
        <TabsContent value="pipeline" className="mt-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="all">All Statuses</SelectItem>{STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
              </Select>
              <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search bids..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 w-52" /></div>
            </div>
            <Button size="sm" onClick={openNewBid}><Plus className="h-4 w-4 mr-1.5" />New Bid</Button>
          </div>

          <Card>
            {filtered.length === 0 ? <EmptyState title="No bids found" actionLabel="New Bid" onAction={openNewBid} /> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b bg-muted/30">
                    <th className="text-left p-3 font-medium text-muted-foreground">Title</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Client</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Sector</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Currency</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Fee ({baseCurrency})</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Probability</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Submission</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                    <th className="p-3 w-20"></th>
                  </tr></thead>
                  <tbody>
                    {bidPager.pageItems.map(bid => (
                      <tr key={bid.id} className="border-b hover:bg-muted/30 cursor-pointer" onClick={() => setViewBid(bid)}>
                        <td className="p-3 font-medium">{bid.title}</td>
                        <td className="p-3 text-muted-foreground">{bid.client_name}</td>
                        <td className="p-3 capitalize text-xs">{(bid.sector || "—").replace(/_/g, " ")}</td>
                        <td className="p-3 text-xs font-medium">{bid.currency || baseCurrency}</td>
                        <td className="p-3">
                          {(() => {
                            const converted = toBase(bid.fee_proposal || 0, bid.currency);
                            const sameCur = (bid.currency || baseCurrency) === baseCurrency;
                            return (
                              <div>
                                <div className="font-semibold">
                                  {converted == null
                                    ? formatMoney(bid.fee_proposal || 0, currencyObj(bid.currency || baseCurrency))
                                    : formatMoney(converted, baseCurrencyObj)}
                                  {converted == null && ratesError && <span className="ml-1 text-[10px] text-amber-600">(no rate)</span>}
                                </div>
                                {!sameCur && (
                                  <div className="text-[11px] text-muted-foreground">
                                    {formatMoney(bid.fee_proposal || 0, currencyObj(bid.currency))} {bid.currency}
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </td>
                        <td className="p-3">
                          {bid.probability != null ? (
                            <div className="flex items-center gap-1.5 w-24"><Progress value={bid.probability} className="h-1.5 flex-1" /><span className="text-xs">{bid.probability}%</span></div>
                          ) : "—"}
                        </td>
                        <td className="p-3 text-xs">{bid.submission_date ? format(new Date(bid.submission_date), "dd MMM yy") : "—"}</td>
                        <td className="p-3"><StatusBadge status={bid.status} /></td>
                        <td className="p-3" onClick={e => e.stopPropagation()}>
                          <div className="flex gap-1 items-center">
                            {bid.status === "won" && (
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-primary" title="Kick Off Project" onClick={() => setKickOffBid(bid)}>
                                <Rocket className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditBid(bid)}><Pencil className="h-3.5 w-3.5" /></Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(bid.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <Pagination {...bidPager} />
              </div>
            )}
          </Card>
        </TabsContent>

        {/* ── CLIENTS ── */}
        <TabsContent value="clients" className="mt-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search clients..." value={clientSearch} onChange={e => setClientSearch(e.target.value)} className="pl-9 w-64" /></div>
            <Button size="sm" onClick={openOnboardClient}><UserPlus className="h-4 w-4 mr-1.5" />Onboard</Button>
          </div>

          <Card>
            {filteredClients.length === 0 ? (
              <EmptyState title={clients.length === 0 ? "No clients yet" : "No clients match your search"} actionLabel={clients.length === 0 ? "Onboard Client" : undefined} onAction={clients.length === 0 ? openOnboardClient : undefined} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b bg-muted/30">
                    <th className="text-left p-3 font-medium text-muted-foreground">Company / Client</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Contact Person</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Phone</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Email</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Sector</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                  </tr></thead>
                  <tbody>
                    {clientPager.pageItems.map(c => (
                      <tr key={c.id} className="border-b hover:bg-muted/30 cursor-pointer" onClick={() => setClientDetail(c)}>
                        <td className="p-3 font-medium">{c.company_name}</td>
                        <td className="p-3 text-muted-foreground">{c.contact_person || "—"}</td>
                        <td className="p-3 text-xs">{c.phone || "—"}</td>
                        <td className="p-3 text-xs">{c.email || "—"}</td>
                        <td className="p-3 capitalize text-xs">{(c.sector || "—").replace(/_/g, " ")}</td>
                        <td className="p-3"><Badge variant="outline" className="capitalize text-xs">{c.status || "active"}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <Pagination {...clientPager} />
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {/* New/Edit Bid Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingBid ? "Edit Bid" : bidStep === 1 ? "New Bid · Select Client" : "New Bid · Details"}
            </DialogTitle>
          </DialogHeader>

          {/* Step 1 — select an existing client */}
          {!editingBid && bidStep === 1 ? (
            <div className="space-y-3">
              <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input autoFocus placeholder="Search clients..." value={clientPick} onChange={e => setClientPick(e.target.value)} className="pl-9" /></div>
              {clients.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  No clients onboarded yet. Add one in the <span className="font-medium">Clients</span> tab first.
                </div>
              ) : (
                <div className="max-h-72 overflow-y-auto rounded-md border divide-y">
                  {pickClients.map(c => (
                    <button type="button" key={c.id} onClick={() => selectClientForBid(c)} className="w-full text-left px-3 py-2.5 hover:bg-muted/40 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{c.company_name}</p>
                        <p className="text-xs text-muted-foreground">{[c.contact_person, c.email].filter(Boolean).join(" · ") || "—"}</p>
                      </div>
                      {c.sector && <Badge variant="outline" className="capitalize text-xs">{(c.sector || "").replace(/_/g, " ")}</Badge>}
                    </button>
                  ))}
                  {pickClients.length === 0 && <p className="px-3 py-6 text-center text-sm text-muted-foreground">No clients match your search.</p>}
                </div>
              )}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              </DialogFooter>
            </div>
          ) : (
            /* Step 2 — bid details with Details / Fee Calculator tabs */
            <form onSubmit={handleSaveBid} className="space-y-4">
              {/* Selected client banner */}
              <div className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2">
                <div className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-emerald-600" />
                  <span className="font-medium">{form.client_name || "Client"}</span>
                </div>
                {!editingBid && (
                  <Button type="button" variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => setBidStep(1)}>
                    <ChevronLeft className="h-3.5 w-3.5" /> Change client
                  </Button>
                )}
              </div>

              <Tabs value={bidInnerTab} onValueChange={setBidInnerTab}>
                <TabsList>
                  <TabsTrigger value="details">Details</TabsTrigger>
                  <TabsTrigger value="fee">Fee Calculator</TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="mt-4 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5 col-span-2"><Label>Title *</Label><Input value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))} required /></div>

                    {/* Bid-specific contact person (prefilled from client, editable) */}
                    <div className="space-y-1.5"><Label>Contact Person</Label><Input value={form.client_contact} onChange={e => setForm(f => ({...f, client_contact: e.target.value}))} /></div>
                    <div className="space-y-1.5"><Label>Phone Number</Label><Input value={form.client_phone} onChange={e => setForm(f => ({...f, client_phone: e.target.value}))} /></div>
                    <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={form.client_email} onChange={e => setForm(f => ({...f, client_email: e.target.value}))} /></div>
                    <div className="space-y-1.5"><Label>Lead Consultant</Label><Select value={form.lead_consultant} onValueChange={v => setForm(f => ({...f, lead_consultant: v}))}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{employees.map(e => <SelectItem key={e.id} value={e.full_name}>{e.full_name}</SelectItem>)}</SelectContent></Select></div>
                    <div className="space-y-1.5"><Label>Sector</Label><Select value={form.sector} onValueChange={v => setForm(f => ({...f, sector: v}))}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{SECTORS.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}</SelectContent></Select></div>
                    <div className="space-y-1.5"><Label>Status</Label><Select value={form.status} onValueChange={v => setForm(f => ({...f, status: v}))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}</SelectContent></Select></div>
                    <div className="space-y-1.5"><Label>Bid Currency</Label><Select value={form.currency || baseCurrency} onValueChange={v => setForm(f => ({...f, currency: v}))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CURRENCIES.map(c => <SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>)}</SelectContent></Select></div>
                    <div className="space-y-1.5"><Label>Estimated Project Value ({currencyObj(form.currency || baseCurrency).symbol})</Label><Input type="number" value={form.estimated_value} onChange={e => setForm(f => ({...f, estimated_value: e.target.value}))} /></div>
                    <div className="space-y-1.5"><Label>Win Probability (%)</Label><Input type="number" min="0" max="100" value={form.probability} onChange={e => setForm(f => ({...f, probability: e.target.value}))} /></div>
                    <div className="space-y-1.5"><Label>Submission Date</Label><Input type="date" value={form.submission_date} onChange={e => setForm(f => ({...f, submission_date: e.target.value}))} /></div>
                  </div>
                  <div className="space-y-1.5"><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} rows={2} /></div>
                </TabsContent>

                <TabsContent value="fee" className="mt-4 space-y-4">
                  <FeeCalculator stageBreakdown={stageBreakdown} setStageBreakdown={setStageBreakdown} employees={employees} />
                  <div className="space-y-1.5">
                    <Label>Fee Proposal ({currencyObj(form.currency || baseCurrency).symbol})</Label>
                    <Input type="number" value={form.fee_proposal !== "" ? form.fee_proposal : (totalCalcFee > 0 ? totalCalcFee : "")} onChange={e => setForm(f => ({...f, fee_proposal: e.target.value}))} placeholder="Auto-calculated from stages above" />
                    {(() => {
                      const feeVal = form.fee_proposal !== "" ? form.fee_proposal : totalCalcFee;
                      const cur = form.currency || baseCurrency;
                      if (!feeVal || cur === baseCurrency) return null;
                      const converted = toBase(feeVal, cur);
                      return <p className="text-xs text-muted-foreground">{converted == null ? "Live rate unavailable" : `≈ ${formatMoney(converted, baseCurrencyObj)} in ${baseCurrency} (live rate)`}</p>;
                    })()}
                  </div>
                </TabsContent>
              </Tabs>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button type="submit">{editingBid ? "Update" : "Create"}</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Client onboard/edit + detail dialogs */}
      <ClientFormDialog
        open={clientFormOpen}
        onOpenChange={setClientFormOpen}
        client={editingClient}
        onSave={saveClient}
        saving={clientCreateMut.isPending || clientUpdateMut.isPending}
      />
      <ClientDetailDialog
        open={!!clientDetail}
        onOpenChange={() => setClientDetail(null)}
        client={clientDetail}
        onEdit={openEditClient}
      />
      <BidDetailDialog
        open={!!viewBid}
        onOpenChange={() => setViewBid(null)}
        bid={viewBid}
        onEdit={(b) => { setViewBid(null); openEditBid(b); }}
        feePrimary={viewBid ? (() => { const v = toBase(viewBid.fee_proposal || 0, viewBid.currency); return v == null ? formatMoney(viewBid.fee_proposal || 0, currencyObj(viewBid.currency || baseCurrency)) : formatMoney(v, baseCurrencyObj); })() : ""}
        feeSecondary={viewBid && (viewBid.currency || baseCurrency) !== baseCurrency ? `${formatMoney(viewBid.fee_proposal || 0, currencyObj(viewBid.currency))} ${viewBid.currency}` : ""}
      />

      {kickOffBid && (
        <KickOffProjectDialog
          open={!!kickOffBid}
          onOpenChange={() => setKickOffBid(null)}
          bid={kickOffBid}
          employees={employees}
          loading={kickOffMut.isPending}
          onConfirm={projectData => {
            const bidUpdateData = sanitizeBidUpdatePayload({ ...form });
            kickOffMut.mutate({ bidId: kickOffBid.id, projectData, bidUpdateData });
          }}
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
