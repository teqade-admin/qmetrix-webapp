import React, { createContext, useContext, useState } from "react";

export const CURRENCIES = [
  { code: "GBP", symbol: "£", label: "GBP – British Pound" },
  { code: "USD", symbol: "$", label: "USD – US Dollar" },
  { code: "EUR", symbol: "€", label: "EUR – Euro" },
  { code: "AED", symbol: "AED", label: "AED – UAE Dirham" },
  { code: "SAR", symbol: "SAR", label: "SAR – Saudi Riyal" },
  { code: "QAR", symbol: "QAR", label: "QAR – Qatari Riyal" },
];

const CurrencyContext = createContext({ currency: CURRENCIES[0], setCurrency: () => {} });

export function CurrencyProvider({ children }) {
  const [currency, setCurrencyState] = useState(() => {
    try {
      const saved = localStorage.getItem("qmetrix_currency");
      return CURRENCIES.find(c => c.code === saved) || CURRENCIES.find(c => c.code === "AED");
    } catch { return CURRENCIES.find(c => c.code === "AED"); }
  });

  const setCurrency = (c) => {
    try { localStorage.setItem("qmetrix_currency", c.code); } catch {}
    setCurrencyState(c);
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  return useContext(CurrencyContext);
}

export function formatMoney(amount, currency) {
  const n = Number(amount) || 0;
  return `${currency.symbol}${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}