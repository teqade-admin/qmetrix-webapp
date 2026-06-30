import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/**
 * Reporting-level dropdown: L1 (direct reports) … with the deepest level shown as "All".
 * Hidden when there's only one level (nothing to drill into).
 */
export default function LevelFilter({ value, onChange, maxLevel, className = "" }) {
  if (!maxLevel || maxLevel < 2) return null;
  const levels = Array.from({ length: maxLevel }, (_, i) => i + 1);
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="text-xs text-muted-foreground">Levels</span>
      <Select value={String(value)} onValueChange={(v) => onChange(Number(v))}>
        <SelectTrigger className="h-8 w-24"><SelectValue /></SelectTrigger>
        <SelectContent>
          {levels.map((l) => (
            <SelectItem key={l} value={String(l)}>{l === maxLevel ? "All" : `L${l}`}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
