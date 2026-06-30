import React from "react";
import { ShieldAlert } from "lucide-react";

export default function AccessDenied() {
  return (
    <div className="max-w-md mx-auto mt-20 text-center space-y-3">
      <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center mx-auto">
        <ShieldAlert className="h-6 w-6 text-muted-foreground" />
      </div>
      <h2 className="font-semibold text-lg">Access denied</h2>
      <p className="text-sm text-muted-foreground">
        You don't have permission to view this page. Contact an administrator if you think this is a mistake.
      </p>
    </div>
  );
}
