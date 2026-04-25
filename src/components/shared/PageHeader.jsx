import React from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function PageHeader({ title, description, actionLabel, onAction, children }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
      <div>
        <h1 className="font-bold text-xl tracking-tight">{title}</h1>
        {description && <p className="text-sm text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {children}
        {actionLabel && onAction && (
          <Button onClick={onAction} size="sm">
            <Plus className="h-4 w-4 mr-1.5" />
            {actionLabel}
          </Button>
        )}
      </div>
    </div>
  );
}