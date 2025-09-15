export const runtime = "nodejs";

const SANTIMENT_GQL_ENDPOINT = "https://api.santiment.net/graphql";

function getISODateNDaysAgo(days) {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

async function fetchSantimentTimeseries(slug, fromIso, toIso) {
  const apiKey = process.env.SAN_API_KEY || process.env.NEXT_PUBLIC_SAN_API_KEY;
  if (!apiKey) {
    throw new Error("Missing SAN_API_KEY in environment");
  }

  const query = `
    query MarketData($slug: String!, $from: DateTime!, $to: DateTime!) {
      price: getMetric(metric: "price_usd") {
        timeseriesData(selector: { slug: $slug }, from: $from, to: $to, interval: "1d") {
          datetime
          value
        }
      }
      marketcap: getMetric(metric: "marketcap_usd") {
        timeseriesData(selector: { slug: $slug }, from: $from, to: $to, interval: "1d") {
          datetime
          value
        }
      }
      volume: getMetric(metric: "volume_usd") {
        timeseriesData(selector: { slug: $slug }, from: $from, to: $to, interval: "1d") {
          datetime
          value
        }
      }
    }
  `;

  const res = await fetch(SANTIMENT_GQL_ENDPOINT, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      Authorization: `Apikey ${apiKey}`,
    },
    body: JSON.stringify({
      query,
      variables: { slug, from: fromIso, to: toIso },
    }),
    // Next.js edge caches by default; this is dynamic data
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Santiment API error ${res.status}: ${text}`);
  }

  const json = await res.json();
  
  if (json.errors) {
    throw new Error(JSON.stringify(json.errors));
  }

  const price = json.data.price.timeseriesData;
  const marketcap = json.data.marketcap.timeseriesData;
  const volume = json.data.volume.timeseriesData;

  // Align by datetime
  const byDate = new Map();
  for (const p of price) byDate.set(p.datetime, { datetime: p.datetime, price: p.value });
  for (const m of marketcap) {
    const row = byDate.get(m.datetime) || { datetime: m.datetime };
    row.marketcap = m.value;
    byDate.set(m.datetime, row);
  }
  for (const v of volume) {
    const row = byDate.get(v.datetime) || { datetime: v.datetime };
    row.volume = v.value;
    byDate.set(v.datetime, row);
  }

  return Array.from(byDate.values()).sort((a, b) => a.datetime.localeCompare(b.datetime));
}

export async function GET() {
  try {
    const toIso = new Date().toISOString();
    // last 5 full days (5 data points). Fetch 6 to be safe and slice last 5
    const fromIso = getISODateNDaysAgo(6);
    const slugs = ["bitcoin", "ethereum", "solana"];

    const results = await Promise.all(
      slugs.map(async (slug) => ({ slug, data: await fetchSantimentTimeseries(slug, fromIso, toIso) }))
    );

    // Keep last 5 entries per asset
    const payload = Object.fromEntries(
      results.map(({ slug, data }) => [
        slug,
        data.slice(-5).map((d) => ({
          datetime: d.datetime,
          price: d.price ?? null,
          marketcap: d.marketcap ?? null,
          volume: d.volume ?? null,
        })),
      ])
    );

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err?.message || err) }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}


