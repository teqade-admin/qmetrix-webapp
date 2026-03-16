import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  LayoutDashboard, Users, FileText, FolderKanban, DollarSign,
  BarChart3, UserCheck, GitBranch, Database, ChevronLeft,
  Menu, LogOut, Building2, Clock, ClipboardCheck, ChevronDown,
  Settings, Bell, Search, User
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/AuthContext";  // ← changed
import { Badge } from "@/components/ui/badge";
import CurrencySelector from "@/components/shared/CurrencySelector";

const navGroups = [
  {
    label: "Overview",
    items: [
      { name: "Dashboard", page: "Dashboard", icon: LayoutDashboard },
    ]
  },
  {
    label: "Operations",
    items: [
      { name: "HR Module", page: "HRModule", icon: Users },
      { name: "Timesheets", page: "Timesheets", icon: Clock },
      { name: "Bid Management", page: "BidManagement", icon: FileText },
      { name: "Projects", page: "Projects", icon: FolderKanban },
      { name: "Deliverables", page: "DeliveryModule", icon: ClipboardCheck },
    ]
  },
  {
    label: "Planning",
    items: [
      { name: "Resource Allocation", page: "ResourceAllocation", icon: UserCheck },
      { name: "Resource Monitor", page: "ResourceMonitor", icon: BarChart3 },
      { name: "Workflow", page: "WorkflowDashboard", icon: GitBranch },
    ]
  },
  {
    label: "Finance",
    items: [
      { name: "Cost & Value", page: "CostValueDashboard", icon: DollarSign },
      { name: "Finance", page: "Finance", icon: DollarSign },
    ]
  },
  {
    label: "Data",
    items: [
      { name: "Data Management", page: "DataManagement", icon: Database },
    ]
  }
];

export default function Layout({ children, currentPageName }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout } = useAuth();  // ← changed

  const allItems = navGroups.flatMap(g => g.items);
  const currentItem = allItems.find(i => i.page === currentPageName);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed lg:static inset-y-0 left-0 z-50 flex flex-col transition-all duration-300 border-r border-border bg-card",
        collapsed ? "w-[64px]" : "w-60",
        mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        {/* Logo */}
        <div className={cn(
          "flex items-center h-14 border-b border-border shrink-0 px-3 gap-3",
          collapsed && "justify-center"
        )}>
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <span className="text-primary-foreground font-bold text-sm">Q</span>
          </div>
          {!collapsed && (
            <div>
              <p className="font-bold text-sm leading-tight">QMetrix</p>
              <p className="text-[10px] text-muted-foreground leading-tight">Operations Suite</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
          {navGroups.map((group) => (
            <div key={group.label}>
              {!collapsed && (
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground px-2 mb-1">{group.label}</p>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive = currentPageName === item.page;
                  return (
                    <Link
                      key={item.page}
                      to={createPageUrl(item.page)}
                      onClick={() => setMobileOpen(false)}
                      title={collapsed ? item.name : undefined}
                      className={cn(
                        "flex items-center gap-2.5 px-2 py-2 rounded-md text-sm font-medium transition-all",
                        collapsed && "justify-center",
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-accent/10 hover:text-foreground"
                      )}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span className="truncate">{item.name}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User + collapse */}
        <div className="border-t border-border p-2 space-y-1">
          {!collapsed && user && (
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-md">
              <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-xs font-bold text-primary">
                  {(user.user_metadata?.full_name || user.email || "U").charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium truncate">{user.user_metadata?.full_name || user.email}</p>
                <p className="text-[10px] text-muted-foreground truncate capitalize">{user.role || "user"}</p>
              </div>
            </div>
          )}
          <div className="flex gap-1">
            <Button
              variant="ghost" size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={() => logout()}  // ← changed
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="hidden lg:flex h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => setCollapsed(!collapsed)}>
              <ChevronLeft className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")} />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <header className="h-14 border-b bg-card flex items-center justify-between px-4 shrink-0 gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="lg:hidden h-8 w-8" onClick={() => setMobileOpen(true)}>
              <Menu className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="font-semibold text-sm leading-tight">{currentItem?.name || currentPageName}</h1>
              <p className="text-xs text-muted-foreground hidden sm:block">QMetrix Operations Suite</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <CurrencySelector className="h-8 text-xs" />
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
              <Bell className="h-4 w-4" />
            </Button>
            {user && (
              <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-xs">
                  {(user.user_metadata?.full_name || user.email || "U").charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="p-4 lg:p-6 max-w-[1600px] mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}