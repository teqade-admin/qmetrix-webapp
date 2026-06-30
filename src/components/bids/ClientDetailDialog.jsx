import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, Mail, Phone, Globe, MapPin, User } from "lucide-react";

const statusColors = {
  active: "bg-emerald-100 text-emerald-700 border-emerald-200",
  prospect: "bg-amber-100 text-amber-700 border-amber-200",
  inactive: "bg-slate-100 text-slate-600 border-slate-200",
};

const Row = ({ icon: Icon, label, value }) => (
  <div className="flex items-start gap-2.5">
    <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
    <div className="min-w-0">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="text-sm font-medium break-words">{value || "—"}</p>
    </div>
  </div>
);

/**
 * Small read-only popup with a client's details. Edit icon sits top-left.
 */
export default function ClientDetailDialog({ open, onOpenChange, client, onEdit }) {
  if (!client) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        {/* Edit icon — top-left */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute left-3 top-3 h-7 w-7"
          title="Edit client"
          onClick={() => onEdit(client)}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>

        <DialogHeader className="pt-6">
          <DialogTitle className="flex items-center gap-2 justify-center text-center">
            {client.company_name}
          </DialogTitle>
        </DialogHeader>

        <div className="flex justify-center -mt-1 mb-2">
          <Badge variant="outline" className={`capitalize ${statusColors[client.status] || statusColors.inactive}`}>
            {client.status || "active"}
          </Badge>
          {client.sector && (
            <Badge variant="outline" className="ml-2 capitalize">{(client.sector || "").replace(/_/g, " ")}</Badge>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 pt-1">
          <Row icon={User} label="Contact Person" value={client.contact_person} />
          <Row icon={Phone} label="Contact Number" value={client.phone} />
          <Row icon={Mail} label="Email" value={client.email} />
          <Row icon={Globe} label="Website" value={client.website} />
          <div className="col-span-2"><Row icon={MapPin} label="Address" value={client.address} /></div>
        </div>

        {client.notes && (
          <div className="mt-3 rounded-md bg-muted/40 p-3">
            <p className="text-[11px] text-muted-foreground mb-1">Notes</p>
            <p className="text-sm">{client.notes}</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
