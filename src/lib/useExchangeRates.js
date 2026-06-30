import { useQuery } from "@tanstack/react-query";

/**
 * Live exchange rates relative to `base`, from the free, no-key open.er-api.com.
 * Rates are cached for an hour. `rates[X]` = how many X per 1 unit of base.
 */
export function useExchangeRates(base = "GBP") {
  return useQuery({
    queryKey: ["fx", base],
    queryFn: async () => {
      const res = await fetch(`https://open.er-api.com/v6/latest/${base}`);
      if (!res.ok) throw new Error(`FX request failed (${res.status})`);
      const json = await res.json();
      if (json.result !== "success" || !json.rates) throw new Error("FX rates unavailable");
      return json.rates;
    },
    staleTime: 1000 * 60 * 60,      // 1 hour
    gcTime: 1000 * 60 * 60 * 6,
    retry: 1,
    enabled: !!base,
  });
}

/**
 * Convert `amount` from `from` currency into the base currency that `rates`
 * was fetched for. Returns null when conversion isn't possible yet.
 */
export function convertToBase(amount, from, base, rates) {
  const n = Number(amount) || 0;
  if (!from || from === base) return n;          // already base
  if (!rates || !rates[from]) return null;        // rates not ready / unknown currency
  return n / rates[from];
}
