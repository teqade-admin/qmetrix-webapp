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
import { DollarSign, Receipt, Plus, Pencil, Trash2, Search, AlertTriangle, FileText } from "lucide-react";
import { useCurrency, formatMoney } from "@/components/shared/CurrencyContext";
import CurrencySelector from "@/components/shared/CurrencySelector";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import StatCard from "@/components/shared/StatCard";
import EmptyState from "@/components/shared/EmptyState";
import { format } from "date-fns";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";

const defaultInvoice = { invoice_number: "", project_name: "", client_name: "", amount: "", tax_amount: "", total_amount: "", issue_date: "", due_date: "", status: "draft", description: "", riba_stage: "", billing_hours: "" };
const defaultExpense = { description: "", project_name: "", category: "", amount: "", date: "", submitted_by: "", status: "pending" };
const PROVIDER_NAME = "Qmetrix Consultancy";

const getInvoiceSequence = (invoiceNumber) => {
  const match = String(invoiceNumber || "").match(/\d+/g);
  if (!match) return 0;
  return Number(match[match.length - 1]) || 0;
};

const getNextInvoiceNumber = (invoices) => {
  const maxInvoiceNumber = invoices.reduce((max, invoice) => Math.max(max, getInvoiceSequence(invoice.invoice_number)), 0);
  return String(maxInvoiceNumber + 1);
};

export default function Finance() {
  const { currency } = useCurrency();
  const [tab, setTab] = useState("invoices");
  const [invoiceDialog, setInvoiceDialog] = useState(false);
  const [expenseDialog, setExpenseDialog] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [editingExpense, setEditingExpense] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [invForm, setInvForm] = useState(defaultInvoice);
  const [expForm, setExpForm] = useState(defaultExpense);
  const queryClient = useQueryClient();

  const { data: invoices = [] } = useQuery({ queryKey: ["invoices"], queryFn: () => base44.entities.Invoice.list("-created_date") });
  const { data: expenses = [] } = useQuery({ queryKey: ["expenses"], queryFn: () => base44.entities.Expense.list("-created_date") });
  const { data: projects = [] } = useQuery({ queryKey: ["projects"], queryFn: () => base44.entities.Project.list() });
  const { data: timesheets = [] } = useQuery({ queryKey: ["timesheets"], queryFn: () => base44.entities.Timesheet.list() });

  const invCreate = useMutation({ mutationFn: d => base44.entities.Invoice.create(d), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["invoices"] }); setInvoiceDialog(false); } });
  const invUpdate = useMutation({ mutationFn: ({ id, data }) => base44.entities.Invoice.update(id, data), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["invoices"] }); setInvoiceDialog(false); setEditingInvoice(null); } });
  const invDelete = useMutation({ mutationFn: id => base44.entities.Invoice.delete(id), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["invoices"] }); setDeleteTarget(null); } });
  const expCreate = useMutation({ mutationFn: d => base44.entities.Expense.create(d), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["expenses"] }); setExpenseDialog(false); } });
  const expUpdate = useMutation({ mutationFn: ({ id, data }) => base44.entities.Expense.update(id, data), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["expenses"] }); setExpenseDialog(false); setEditingExpense(null); } });
  const expDelete = useMutation({ mutationFn: id => base44.entities.Expense.delete(id), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["expenses"] }); setDeleteTarget(null); } });

  const totalInvoiced = invoices.reduce((s, i) => s + (i.total_amount || i.amount || 0), 0);
  const totalPaid = invoices.filter(i => i.status === "paid").reduce((s, i) => s + (i.total_amount || i.amount || 0), 0);
  const outstanding = invoices.filter(i => ["sent", "overdue"].includes(i.status)).reduce((s, i) => s + (i.total_amount || i.amount || 0), 0);
  const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const overdue = invoices.filter(i => i.status === "overdue");
  const clientOptions = Array.from(new Set([
    ...projects.map(p => p.client_name).filter(Boolean),
    ...invoices.map(i => i.client_name).filter(Boolean),
  ])).sort((a, b) => a.localeCompare(b));
  const filteredInvoiceProjects = invForm.client_name
    ? projects.filter(p => p.client_name === invForm.client_name)
    : projects;

  const openNewInvoice = () => {
    setEditingInvoice(null);
    setInvForm({ ...defaultInvoice, invoice_number: getNextInvoiceNumber(invoices) });
    setInvoiceDialog(true);
  };
  const openEditInvoice = inv => { setEditingInvoice(inv); setInvForm({ ...defaultInvoice, ...inv, amount: inv.amount || "", tax_amount: inv.tax_amount || "", total_amount: inv.total_amount || "", billing_hours: inv.billing_hours || "" }); setInvoiceDialog(true); };
  const openNewExpense = () => { setEditingExpense(null); setExpForm(defaultExpense); setExpenseDialog(true); };
  const openEditExpense = exp => { setEditingExpense(exp); setExpForm({ ...defaultExpense, ...exp, amount: exp.amount || "" }); setExpenseDialog(true); };

  const filteredInvoices = invoices.filter(i => {
    const ms = (i.invoice_number || "").toLowerCase().includes(search.toLowerCase()) || (i.client_name || "").toLowerCase().includes(search.toLowerCase());
    const mst = statusFilter === "all" || i.status === statusFilter;
    return ms && mst;
  });

  const filteredExpenses = expenses.filter(e => (e.description || "").toLowerCase().includes(search.toLowerCase()) || (e.project_name || "").toLowerCase().includes(search.toLowerCase()));

  const downloadInvoicePdf = async (invoice) => {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 48;
    const amount = Number(invoice.amount) || 0;
    const tax = Number(invoice.tax_amount) || 0;
    const total = Number(invoice.total_amount) || amount + tax;
    const money = (value) => formatMoney(Number(value) || 0, currency);

    doc.setFillColor(30, 58, 95);
    doc.rect(0, 0, pageWidth, 118, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(24);
    doc.text(PROVIDER_NAME, margin, 54);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("Professional Quantity Surveying and Project Controls", margin, 75);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(28);
    doc.text("INVOICE", pageWidth - margin, 58, { align: "right" });
    doc.setFontSize(11);
    doc.text(`#${invoice.invoice_number}`, pageWidth - margin, 82, { align: "right" });

    doc.setTextColor(17, 24, 39);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Bill To", margin, 160);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(invoice.client_name || "Client", margin, 180);
    if (invoice.project_name) doc.text(`Project: ${invoice.project_name}`, margin, 198);

    doc.setFont("helvetica", "bold");
    doc.text("Invoice Details", pageWidth - 210, 160);
    doc.setFont("helvetica", "normal");
    doc.text(`Issue Date: ${invoice.issue_date ? format(new Date(invoice.issue_date), "dd MMM yyyy") : "-"}`, pageWidth - 210, 180);
    doc.text(`Due Date: ${invoice.due_date ? format(new Date(invoice.due_date), "dd MMM yyyy") : "-"}`, pageWidth - 210, 198);
    doc.text(`Status: ${(invoice.status || "draft").toUpperCase()}`, pageWidth - 210, 216);

    const tableTop = 260;
    doc.setFillColor(243, 244, 246);
    doc.rect(margin, tableTop, pageWidth - margin * 2, 34, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Description", margin + 14, tableTop + 22);
    doc.text("Hours", pageWidth - 235, tableTop + 22, { align: "right" });
    doc.text("Amount", pageWidth - margin - 14, tableTop + 22, { align: "right" });

    doc.setDrawColor(229, 231, 235);
    doc.rect(margin, tableTop, pageWidth - margin * 2, 100);
    doc.line(margin, tableTop + 34, pageWidth - margin, tableTop + 34);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const description = invoice.description || `${invoice.project_name || "Professional services"}${invoice.riba_stage ? ` - ${invoice.riba_stage.replace(/_/g, " ")}` : ""}`;
    const lines = doc.splitTextToSize(description, pageWidth - 250);
    doc.text(lines, margin + 14, tableTop + 58);
    doc.text(invoice.billing_hours ? String(invoice.billing_hours) : "-", pageWidth - 235, tableTop + 58, { align: "right" });
    doc.text(money(amount), pageWidth - margin - 14, tableTop + 58, { align: "right" });

    const totalsX = pageWidth - 240;
    const totalsY = tableTop + 140;
    doc.setFont("helvetica", "normal");
    doc.text("Subtotal", totalsX, totalsY);
    doc.text(money(amount), pageWidth - margin, totalsY, { align: "right" });
    doc.text("Tax", totalsX, totalsY + 24);
    doc.text(money(tax), pageWidth - margin, totalsY + 24, { align: "right" });
    doc.setDrawColor(30, 58, 95);
    doc.line(totalsX, totalsY + 40, pageWidth - margin, totalsY + 40);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("Total Due", totalsX, totalsY + 64);
    doc.text(money(total), pageWidth - margin, totalsY + 64, { align: "right" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text("Thank you for your business.", margin, 720);
    doc.text(`${PROVIDER_NAME} | Generated by QMetrix Operations Suite`, margin, 740);

    doc.save(`invoice-${invoice.invoice_number || invoice.id}.pdf`);
  };

  return (
    <div className="space-y-4">
      <PageHeader title="Finance Module" description="Invoice preparation, expense tracking, and payment management">
        <div className="flex items-center gap-2">
          <CurrencySelector />
          <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 w-48" /></div>
        </div>
      </PageHeader>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard title="Total Invoiced" value={`${currency.symbol}${(totalInvoiced/1000).toFixed(0)}k`} icon={DollarSign} color="primary" />
        <StatCard title="Received" value={`${currency.symbol}${(totalPaid/1000).toFixed(0)}k`} icon={DollarSign} color="green" />
        <StatCard title="Outstanding" value={`${currency.symbol}${(outstanding/1000).toFixed(0)}k`} icon={AlertTriangle} color={outstanding > 0 ? "red" : "green"} />
        <StatCard title="Expenses" value={`${currency.symbol}${(totalExpenses/1000).toFixed(0)}k`} icon={Receipt} color="accent" />
      </div>

      {overdue.length > 0 && (
        <Card className="border-red-200 bg-red-50 p-3">
          <div className="flex items-center gap-2 text-red-700">
            <AlertTriangle className="h-4 w-4" />
            <p className="text-sm font-semibold">{overdue.length} overdue invoice{overdue.length > 1 ? "s" : ""} — {formatMoney(overdue.reduce((s, i) => s + (i.total_amount || i.amount || 0), 0), currency)} outstanding</p>
          </div>
        </Card>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="invoices">Invoices</TabsTrigger>
            <TabsTrigger value="expenses">Expenses</TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2">
            {tab === "invoices" && (
              <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-32"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem>{["draft","sent","paid","overdue","cancelled"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
            )}
            <Button size="sm" onClick={tab === "invoices" ? openNewInvoice : openNewExpense}>
              <Plus className="h-4 w-4 mr-1" />{tab === "invoices" ? "Invoice" : "Expense"}
            </Button>
          </div>
        </div>

        <TabsContent value="invoices" className="mt-4">
          <Card>
            {filteredInvoices.length === 0 ? <EmptyState title="No invoices" actionLabel="New Invoice" onAction={openNewInvoice} /> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b bg-muted/30">
                    <th className="text-left p-3 font-medium text-muted-foreground">Invoice #</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Client</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Project</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">Amount</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Issued</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Due</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                    <th className="p-3 w-24"></th>
                  </tr></thead>
                  <tbody>
                    {filteredInvoices.map(inv => (
                      <tr key={inv.id} className="border-b hover:bg-muted/20">
                        <td className="p-3 font-medium">{inv.invoice_number}</td>
                        <td className="p-3">{inv.client_name}</td>
                        <td className="p-3 text-muted-foreground text-xs">{inv.project_name || "—"}</td>
                        <td className="p-3 text-right font-semibold">{formatMoney(inv.total_amount || inv.amount || 0, currency)}</td>
                        <td className="p-3 text-xs">{inv.issue_date ? format(new Date(inv.issue_date), "dd MMM yy") : "—"}</td>
                        <td className="p-3 text-xs">{inv.due_date ? format(new Date(inv.due_date), "dd MMM yy") : "—"}</td>
                        <td className="p-3"><StatusBadge status={inv.status} /></td>
                        <td className="p-3">
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => downloadInvoicePdf(inv)} title="Download PDF"><FileText className="h-3.5 w-3.5" /></Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditInvoice(inv)}><Pencil className="h-3.5 w-3.5" /></Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteTarget({ type: "invoice", id: inv.id })}><Trash2 className="h-3.5 w-3.5" /></Button>
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

        <TabsContent value="expenses" className="mt-4">
          <Card>
            {filteredExpenses.length === 0 ? <EmptyState title="No expenses" actionLabel="New Expense" onAction={openNewExpense} /> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b bg-muted/30">
                    <th className="text-left p-3 font-medium text-muted-foreground">Description</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Category</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Project</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">Amount</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Date</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Submitted By</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                    <th className="p-3 w-24"></th>
                  </tr></thead>
                  <tbody>
                    {filteredExpenses.map(exp => (
                      <tr key={exp.id} className="border-b hover:bg-muted/20">
                        <td className="p-3 font-medium">{exp.description}</td>
                        <td className="p-3 capitalize text-xs">{(exp.category || "").replace(/_/g, " ")}</td>
                        <td className="p-3 text-muted-foreground text-xs">{exp.project_name || "—"}</td>
                        <td className="p-3 text-right font-semibold">{formatMoney(exp.amount || 0, currency)}</td>
                        <td className="p-3 text-xs">{exp.date ? format(new Date(exp.date), "dd MMM yy") : "—"}</td>
                        <td className="p-3 text-xs">{exp.submitted_by || "—"}</td>
                        <td className="p-3"><StatusBadge status={exp.status} /></td>
                        <td className="p-3">
                          <div className="flex gap-1">
                            {exp.status === "pending" && <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-600" onClick={() => expUpdate.mutate({ id: exp.id, data: { status: "approved" } })} title="Approve"><Receipt className="h-3.5 w-3.5" /></Button>}
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditExpense(exp)}><Pencil className="h-3.5 w-3.5" /></Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteTarget({ type: "expense", id: exp.id })}><Trash2 className="h-3.5 w-3.5" /></Button>
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
      </Tabs>

      {/* Invoice Dialog */}
      <Dialog open={invoiceDialog} onOpenChange={setInvoiceDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingInvoice ? "Edit Invoice" : "New Invoice"}</DialogTitle></DialogHeader>
          <form onSubmit={e => { e.preventDefault(); const d = { ...invForm, amount: Number(invForm.amount)||0, tax_amount: Number(invForm.tax_amount)||0, total_amount: Number(invForm.total_amount)||Number(invForm.amount)||0, billing_hours: invForm.billing_hours ? Number(invForm.billing_hours) : undefined }; editingInvoice ? invUpdate.mutate({ id: editingInvoice.id, data: d }) : invCreate.mutate(d); }} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Invoice # *</Label><Input value={invForm.invoice_number} readOnly className="bg-muted cursor-not-allowed" required /></div>
              <div className="space-y-1.5"><Label>Client *</Label><Select value={invForm.client_name} onValueChange={v => setInvForm(f => ({...f, client_name: v, project_name: projects.find(p => p.name === f.project_name)?.client_name === v ? f.project_name : ""}))}><SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger><SelectContent>{clientOptions.map(client => <SelectItem key={client} value={client}>{client}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-1.5"><Label>Project</Label><Select value={invForm.project_name} onValueChange={v => { const proj = projects.find(p => p.name === v); setInvForm(f => ({...f, project_name: v, client_name: proj?.client_name || f.client_name})); }}><SelectTrigger><SelectValue placeholder={invForm.client_name ? "Select" : "Select client first"} /></SelectTrigger><SelectContent>{filteredInvoiceProjects.map(p => <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-1.5"><Label>Status</Label><Select value={invForm.status} onValueChange={v => setInvForm(f => ({...f, status: v}))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["draft","sent","paid","overdue","cancelled"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-1.5"><Label>Amount ({currency.symbol}) *</Label><Input type="number" value={invForm.amount} onChange={e => setInvForm(f => ({...f, amount: e.target.value}))} required /></div>
              <div className="space-y-1.5"><Label>Tax ({currency.symbol})</Label><Input type="number" value={invForm.tax_amount} onChange={e => setInvForm(f => ({...f, tax_amount: e.target.value}))} /></div>
              <div className="space-y-1.5"><Label>Total ({currency.symbol})</Label><Input type="number" value={invForm.total_amount} onChange={e => setInvForm(f => ({...f, total_amount: e.target.value}))} /></div>
              <div className="space-y-1.5"><Label>Billing Hours</Label><Input type="number" value={invForm.billing_hours} onChange={e => setInvForm(f => ({...f, billing_hours: e.target.value}))} /></div>
              <div className="space-y-1.5"><Label>Issue Date</Label><Input type="date" value={invForm.issue_date} onChange={e => setInvForm(f => ({...f, issue_date: e.target.value}))} /></div>
              <div className="space-y-1.5"><Label>Due Date</Label><Input type="date" value={invForm.due_date} onChange={e => setInvForm(f => ({...f, due_date: e.target.value}))} /></div>
            </div>
            <div className="space-y-1.5"><Label>Description</Label><Textarea value={invForm.description} onChange={e => setInvForm(f => ({...f, description: e.target.value}))} rows={2} /></div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setInvoiceDialog(false)}>Cancel</Button><Button type="submit">{editingInvoice ? "Update" : "Create"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Expense Dialog */}
      <Dialog open={expenseDialog} onOpenChange={setExpenseDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editingExpense ? "Edit Expense" : "New Expense"}</DialogTitle></DialogHeader>
          <form onSubmit={e => { e.preventDefault(); const d = { ...expForm, amount: Number(expForm.amount)||0 }; editingExpense ? expUpdate.mutate({ id: editingExpense.id, data: d }) : expCreate.mutate(d); }} className="space-y-4">
            <div className="space-y-1.5"><Label>Description *</Label><Input value={expForm.description} onChange={e => setExpForm(f => ({...f, description: e.target.value}))} required /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Category *</Label><Select value={expForm.category} onValueChange={v => setExpForm(f => ({...f, category: v}))}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{["travel","accommodation","materials","software","subcontractor","office","training","other"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-1.5"><Label>Project</Label><Select value={expForm.project_name} onValueChange={v => setExpForm(f => ({...f, project_name: v}))}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{projects.map(p => <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-1.5"><Label>Amount ({currency.symbol}) *</Label><Input type="number" value={expForm.amount} onChange={e => setExpForm(f => ({...f, amount: e.target.value}))} required /></div>
              <div className="space-y-1.5"><Label>Date</Label><Input type="date" value={expForm.date} onChange={e => setExpForm(f => ({...f, date: e.target.value}))} /></div>
              <div className="space-y-1.5"><Label>Submitted By</Label><Input value={expForm.submitted_by} onChange={e => setExpForm(f => ({...f, submitted_by: e.target.value}))} /></div>
              <div className="space-y-1.5"><Label>Status</Label><Select value={expForm.status} onValueChange={v => setExpForm(f => ({...f, status: v}))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["pending","approved","rejected","paid"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setExpenseDialog(false)}>Cancel</Button><Button type="submit">{editingExpense ? "Update" : "Create"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Confirm Delete</AlertDialogTitle><AlertDialogDescription>This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => { if (deleteTarget?.type === "invoice") invDelete.mutate(deleteTarget.id); else expDelete.mutate(deleteTarget.id); }} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
