import React from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";

/**
 * Search box plus optional dropdown filters, styled to match the bars already
 * on Projects, Finance and Bid Management so every section filters the same way.
 *
 * @param {string} search
 * @param {(value: string) => void} onSearchChange
 * @param {string} placeholder
 * @param {{value: string, onChange: (v: string) => void, allLabel: string,
 *          options: ({value: string, label: string}|string)[], width?: string}[]} filters
 */
export default function FilterBar({ search, onSearchChange, placeholder = "Search…", filters = [] }) {
  const label = (opt) =>
    typeof opt === "string" ? opt.replace(/_/g, " ") : opt.label;
  const value = (opt) => (typeof opt === "string" ? opt : opt.value);

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="relative flex-1">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={placeholder}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-8"
        />
      </div>
      {filters.map((filter, i) => (
        <Select key={i} value={filter.value} onValueChange={filter.onChange}>
          <SelectTrigger className={filter.width || "w-44"}><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{filter.allLabel}</SelectItem>
            {filter.options.map((opt) => (
              <SelectItem key={value(opt)} value={value(opt)} className="capitalize">
                {label(opt)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ))}
    </div>
  );
}
