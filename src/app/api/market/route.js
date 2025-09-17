export const runtime = "nodejs"; // Optional, depending on deployment

const SANTIMENT_GQL_ENDPOINT = "https://api.santiment.net/graphql";
const SLUGS = ["bitcoin", "ethereum", "solana"];

const buildQuery = (slug) => `
  query {
    price: getMetric(metric: "price_usd") {
      timeseriesData(slug: "${slug}", from: "utc_now-5d", to: "utc_now", interval: "1d") {
        datetime
        value
      }
    }
    marketcap: getMetric(metric: "marketcap_usd") {
      timeseriesData(slug: "${slug}", from: "utc_now-5d", to: "utc_now", interval: "1d") {
        datetime
        value
      }
    }
    volume: getMetric(metric: "volume_usd") {
      timeseriesData(slug: "${slug}", from: "utc_now-5d", to: "utc_now", interval: "1d") {
        datetime
        value
      }
    }
  }
`;

export async function GET(request) {
  try {
    const apiKey = process.env.SAN_API_KEY || process.env.NEXT_PUBLIC_SANTIMENT_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "Missing API key in environment variables" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const results = {};

    for (const slug of SLUGS) {
      const query = buildQuery(slug);
      const santimentResponse = await fetch(SANTIMENT_GQL_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Apikey ${apiKey}`,
        },
        body: JSON.stringify({ query }),
      });

      const responseText = await santimentResponse.text();

      // Log the raw response for debugging
      console.log(`--- RAW RESPONSE FOR ${slug} START ---`);
      console.log(responseText);
      console.log(`--- RAW RESPONSE FOR ${slug} END ---`);

      if (!santimentResponse.ok) {
        throw new Error(
          `Santiment API error ${santimentResponse.status}: ${responseText}`
        );
      }

      const parsedResponse = JSON.parse(responseText);
      const data = parsedResponse.data;

      if (!data) {
        throw new Error(`No data in response for ${slug}: ${responseText}`);
      }

      const { price, marketcap, volume } = data;

      const combinedDataMap = {};

      price.timeseriesData.forEach((d) => {
        if (!combinedDataMap[d.datetime]) combinedDataMap[d.datetime] = { datetime: d.datetime };
        combinedDataMap[d.datetime].price = d.value;
      });

      marketcap.timeseriesData.forEach((d) => {
        if (!combinedDataMap[d.datetime]) combinedDataMap[d.datetime] = { datetime: d.datetime };
        combinedDataMap[d.datetime].marketcap = d.value;
      });

      volume.timeseriesData.forEach((d) => {
        if (!combinedDataMap[d.datetime]) combinedDataMap[d.datetime] = { datetime: d.datetime };
        combinedDataMap[d.datetime].volume = d.value;
      });

      results[slug] = Object.values(combinedDataMap);
    }

    return new Response(JSON.stringify(results), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Santiment API proxy error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Unknown error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
