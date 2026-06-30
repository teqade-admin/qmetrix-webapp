import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import StatusBadge from "@/components/shared/StatusBadge";
import { Pencil, User, Phone, Mail, Briefcase } from "lucide-react";
import { format } from "date-fns";

const Field = ({ label, value }) => (
  <div>
    <p className="text-[11px] text-muted-foreground">{label}</p>
    <p className="text-sm font-medium break-words">{value || "—"}</p>
  </div>
);

/**
 * Read-only view of a bid. Edit icon sits top-left.
 * @param {string} feePrimary   - fee in base currency (already formatted).
 * @param {string} feeSecondary - original fee + code when currency differs (optional).
 */
export default function BidDetailDialog({ open, onOpenChange, bid, onEdit, feePrimary, feeSecondary }) {
  if (!bid) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <Button
          variant="ghost"
          size="icon"
          className="absolute left-3 top-3 h-7 w-7"
          title="Edit bid"
          onClick={() => onEdit(bid)}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>

        <DialogHeader className="pt-6">
          <DialogTitle className="text-center">{bid.title}</DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-center gap-2 -mt-1 mb-3">
          <StatusBadge status={bid.status} />
          {bid.sector && <Badge variant="outline" className="capitalize">{(bid.sector || "").replace(/_/g, " ")}</Badge>}
        </div>

        {/* Fee */}
        <div className="rounded-lg border bg-muted/20 p-3 text-center mb-3">
          <p className="text-[11px] text-muted-foreground">Fee Proposal</p>
          <p className="text-xl font-bold">{feePrimary}</p>
          {feeSecondary && <p className="text-xs text-muted-foreground">{feeSecondary}</p>}
        </div>

        {/* Client + contact */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <Field label="Client" value={bid.client_name} />
          <Field label="Currency" value={bid.currency || "—"} />
          <div className="flex items-start gap-2"><User className="h-4 w-4 text-muted-foreground mt-0.5" /><Field label="Contact Person" value={bid.client_contact} /></div>
          <div className="flex items-start gap-2"><Phone className="h-4 w-4 text-muted-foreground mt-0.5" /><Field label="Phone" value={bid.client_phone} /></div>
          <div className="flex items-start gap-2 col-span-2"><Mail className="h-4 w-4 text-muted-foreground mt-0.5" /><Field label="Email" value={bid.client_email} /></div>
        </div>

        {/* Bid meta */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="flex items-start gap-2"><Briefcase className="h-4 w-4 text-muted-foreground mt-0.5" /><Field label="Lead Consultant" value={bid.lead_consultant} /></div>
          <Field label="Submission Date" value={bid.submission_date ? format(new Date(bid.submission_date), "dd MMM yyyy") : null} />
        </div>

        {bid.probability != null && (
          <div className="mb-3">
            <p className="text-[11px] text-muted-foreground mb-1">Win Probability</p>
            <div className="flex items-center gap-2"><Progress value={bid.probability} className="h-2 flex-1" /><span className="text-xs font-medium">{bid.probability}%</span></div>
          </div>
        )}

        {bid.notes && (
          <div className="rounded-md bg-muted/40 p-3">
            <p className="text-[11px] text-muted-foreground mb-1">Notes</p>
            <p className="text-sm">{bid.notes}</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
