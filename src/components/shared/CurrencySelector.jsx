import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CURRENCIES, useCurrency } from "@/components/shared/CurrencyContext";

export default function CurrencySelector({ className = "" }) {
  const { currency, setCurrency } = useCurrency();

  return (
    <Select value={currency.code} onValueChange={v => setCurrency(CURRENCIES.find(c => c.code === v))}>
      <SelectTrigger className={`w-36 ${className}`}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {CURRENCIES.map(c => (
          <SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}