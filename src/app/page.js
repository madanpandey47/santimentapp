"use client";

import { useEffect, useState } from "react";

const SLUGS = [
  { key: "bitcoin", label: "Bitcoin" },
  { key: "ethereum", label: "Ethereum" },
  { key: "solana", label: "Solana" },
];

export default function Home() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/market", { cache: "no-store" });
        if (!res.ok) throw new Error(`Request failed: ${res.status}`);
        const json = await res.json();
        console.log("API /api/market response", json);
        setData(json);
      } catch (e) {
        setError(String(e?.message || e));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const formatMoney = (n, digits = 2) =>
    n != null ? `$${Number(n).toLocaleString(undefined, { maximumFractionDigits: digits })}` : "-";

  return (
    <div className="min-h-screen  p-6 sm:p-10 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-semibold">Crypto Market Snapshot</h1>
        <p className="opacity-70 text-sm mt-1">Last 5 full days • Source: Santiment API</p>
      </div>

      {loading && <p className="opacity-80">Loading…</p>}
      {error && <p className="text-red-600">{error}</p>}

      {!loading && !error && data && (
        <div className="space-y-6">
          {SLUGS.map((s) => {
            const rows = data[s.key] || [];
            const latest = rows[rows.length - 1];
            return (
              <section key={s.key} className="rounded-xl border bg-white/5 overflow-hidden">
                <header className="px-5 py-4 border-b flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-medium">{s.label}</h2>
                    <p className="text-xs opacity-70">Slug: {s.key}</p>
                  </div>
                  {latest && (
                    <div className="text-right">
                      <div className="text-sm opacity-70">Latest</div>
                      <div className="text-xl font-semibold">{formatMoney(latest.price)}</div>
                    </div>
                  )}
                </header>

                <div className="px-5 py-4 grid grid-cols-3 gap-3">
                  <div className="rounded-lg border p-3 bg-white/5">
                    <div className="text-xs opacity-70 mb-1">Price (USD)</div>
                    <div className="text-base font-medium">{formatMoney(latest?.price)}</div>
                  </div>
                  <div className="rounded-lg border p-3 bg-white/5">
                    <div className="text-xs opacity-70 mb-1">Market Cap</div>
                    <div className="text-base font-medium">{formatMoney(latest?.marketcap, 0)}</div>
                  </div>
                  <div className="rounded-lg border p-3 bg-white/5">
                    <div className="text-xs opacity-70 mb-1">Volume (24h)</div>
                    <div className="text-base font-medium">{formatMoney(latest?.volume, 0)}</div>
                  </div>
                </div>

                <div className="px-5 pb-5">
                  <h3 className="text-sm font-medium mb-2 opacity-80">Last 5 days</h3>
                  <div className="overflow-x-auto -mx-5 px-5">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left opacity-70">
                          <th className="py-2">Date</th>
                          <th className="py-2">Price</th>
                          <th className="py-2">Mkt Cap</th>
                          <th className="py-2">Volume</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row) => (
                          <tr key={row.datetime} className="border-t border-white/10">
                            <td className="py-2 pr-2">{new Date(row.datetime).toLocaleDateString()}</td>
                            <td className="py-2 pr-2">{formatMoney(row.price)}</td>
                            <td className="py-2 pr-2">{formatMoney(row.marketcap, 0)}</td>
                            <td className="py-2 pr-2">{formatMoney(row.volume, 0)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      )}

      <p className="mt-8 text-xs opacity-60">Data from Santiment GraphQL API. Set env var SAN_API_KEY.</p>
    </div>
  );
}
