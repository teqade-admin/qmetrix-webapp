import React from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";

export default function StatCard({ title, value, subtitle, icon: Icon, trend, trendUp, color = "primary", className }) {
  const colorMap = {
    primary: "bg-primary/10 text-primary",
    accent: "bg-amber-100 text-amber-600",
    green: "bg-emerald-100 text-emerald-600",
    red: "bg-red-100 text-red-600",
    blue: "bg-blue-100 text-blue-600",
    purple: "bg-purple-100 text-purple-600",
  };

  return (
    <Card className={cn("p-5 hover:shadow-sm transition-shadow", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider truncate">{title}</p>
          <p className="text-2xl font-bold tracking-tight">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {Icon && (
          <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shrink-0", colorMap[color] || colorMap.primary)}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
      {trend && (
        <div className={cn("flex items-center gap-1 mt-3 text-xs font-medium", trendUp ? "text-emerald-600" : "text-red-500")}>
          {trendUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {trend}
        </div>
      )}
    </Card>
  );
}