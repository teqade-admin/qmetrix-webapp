import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, ImageOff, ShieldAlert, Check } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import { CURRENCIES } from "@/components/shared/CurrencyContext";
import { canWrite } from "@/lib/permissions";
import { DEFAULT_KPI_CONFIG, resolveKpiConfig } from "@/lib/kpiScorecard";

const BRANDING_BUCKET = "branding";

export default function Settings() {
  const { userRole } = useAuth();
  const isAdmin = canWrite(userRole, "Settings");
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["app_settings"],
    queryFn: () => base44.entities.AppSettings.list(),
    enabled: isAdmin,
  });
  const settings = rows[0] || null;

  const [form, setForm] = useState({ company_name: "", company_subtitle: "", logo_url: "", base_currency: "GBP" });
  const [kpi, setKpi] = useState(DEFAULT_KPI_CONFIG);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (settings) {
      setForm({
        company_name: settings.company_name || "",
        company_subtitle: settings.company_subtitle || "",
        logo_url: settings.logo_url || "",
        base_currency: settings.base_currency || "GBP",
      });
      setKpi(resolveKpiConfig(settings.kpi_config));
    }
  }, [settings]);

  const saveMut = useMutation({
    mutationFn: (data) => base44.entities.AppSettings.update(settings.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["app_settings"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    },
    onError: (e) => setError(e.message || "Failed to save settings."),
  });

  const handleLogoFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file (PNG, JPG, or SVG).");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("Logo must be under 2 MB.");
      return;
    }
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({
        file,
        bucket: BRANDING_BUCKET,
        folder: "logo",
      });
      setForm((f) => ({ ...f, logo_url: file_url }));
    } catch (err) {
      setError(err.message || "Logo upload failed.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSave = (e) => {
    e.preventDefault();
    setError("");
    if (!settings) {
      setError("Settings record not found. Run the branding migration in Supabase.");
      return;
    }
    saveMut.mutate({
      company_name: form.company_name.trim() || "QMetrix",
      company_subtitle: form.company_subtitle.trim() || null,
      logo_url: form.logo_url || null,
      base_currency: form.base_currency || "GBP",
      kpi_config: {
        utilisation_target: Number(kpi.utilisation_target) || DEFAULT_KPI_CONFIG.utilisation_target,
        billable_weekly: Number(kpi.billable_weekly) || DEFAULT_KPI_CONFIG.billable_weekly,
        weight_utilisation: Number(kpi.weight_utilisation) || 0,
        weight_billable: Number(kpi.weight_billable) || 0,
        weight_revenue: Number(kpi.weight_revenue) || 0,
      },
    });
  };

  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto mt-16 text-center space-y-3">
        <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center mx-auto">
          <ShieldAlert className="h-6 w-6 text-muted-foreground" />
        </div>
        <h2 className="font-semibold text-lg">Admins only</h2>
        <p className="text-sm text-muted-foreground">You don't have permission to manage organisation settings.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-5">
      <PageHeader title="Settings" description="Manage your organisation's branding" />

      {error && (
        <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>
      )}
      {saved && (
        <Alert className="border-emerald-200 bg-emerald-50 text-emerald-800">
          <AlertDescription className="flex items-center gap-2"><Check className="h-4 w-4" /> Settings saved.</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSave} className="space-y-6">
            {/* Logo */}
            <div className="space-y-2">
              <Label>Company Logo</Label>
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-xl border bg-muted/30 flex items-center justify-center overflow-hidden shrink-0">
                  {form.logo_url
                    ? <img src={form.logo_url} alt="Logo preview" className="h-full w-full object-contain" />
                    : <ImageOff className="h-6 w-6 text-muted-foreground" />}
                </div>
                <div className="space-y-1.5">
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoFile} />
                  <div className="flex items-center gap-2">
                    <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => fileInputRef.current?.click()}>
                      <Upload className="h-4 w-4 mr-1.5" />{uploading ? "Uploading…" : "Upload Logo"}
                    </Button>
                    {form.logo_url && (
                      <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={() => setForm((f) => ({ ...f, logo_url: "" }))}>
                        Remove
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">PNG, JPG or SVG, up to 2 MB. Square works best.</p>
                </div>
              </div>
            </div>

            {/* Company name + subtitle */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Company Name</Label>
                <Input value={form.company_name} onChange={(e) => setForm((f) => ({ ...f, company_name: e.target.value }))} placeholder="QMetrix" />
              </div>
              <div className="space-y-1.5">
                <Label>Subtitle</Label>
                <Input value={form.company_subtitle} onChange={(e) => setForm((f) => ({ ...f, company_subtitle: e.target.value }))} placeholder="Operations Suite" />
              </div>
            </div>

            {/* Base currency */}
            <div className="space-y-1.5 sm:max-w-xs">
              <Label>Base Currency</Label>
              <Select value={form.base_currency} onValueChange={(v) => setForm((f) => ({ ...f, base_currency: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CURRENCIES.map((c) => <SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>)}</SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Reporting currency. Bid fees in other currencies are converted to this using live exchange rates.</p>
            </div>

            {/* KPI scorecard targets */}
            <div className="space-y-3 border-t pt-5">
              <div>
                <Label className="text-sm font-semibold">KPI Scorecard Targets</Label>
                <p className="text-xs text-muted-foreground">KPI scores are computed as the weighted attainment of these targets from timesheet data.</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5"><Label>Utilisation Target (%)</Label><Input type="number" min="0" max="100" value={kpi.utilisation_target} onChange={(e) => setKpi(k => ({ ...k, utilisation_target: e.target.value }))} /></div>
                <div className="space-y-1.5"><Label>Billable Hours / Week</Label><Input type="number" min="0" value={kpi.billable_weekly} onChange={(e) => setKpi(k => ({ ...k, billable_weekly: e.target.value }))} /></div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Weights (relative)</Label>
                <div className="grid grid-cols-3 gap-4 mt-1">
                  <div className="space-y-1.5"><Label className="text-xs">Utilisation</Label><Input type="number" min="0" value={kpi.weight_utilisation} onChange={(e) => setKpi(k => ({ ...k, weight_utilisation: e.target.value }))} /></div>
                  <div className="space-y-1.5"><Label className="text-xs">Billable</Label><Input type="number" min="0" value={kpi.weight_billable} onChange={(e) => setKpi(k => ({ ...k, weight_billable: e.target.value }))} /></div>
                  <div className="space-y-1.5"><Label className="text-xs">Revenue</Label><Input type="number" min="0" value={kpi.weight_revenue} onChange={(e) => setKpi(k => ({ ...k, weight_revenue: e.target.value }))} /></div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Revenue target per employee = billable-hours target × their charge-out rate.</p>
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={saveMut.isPending || uploading || isLoading}>
                {saveMut.isPending ? "Saving…" : "Save Changes"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
