This is a simple Next.js app that displays the last 5 days of USD price, market cap, and volume for Bitcoin, Ethereum, and Solana using the Santiment GraphQL API.

## Setup

1) Create an API key at Santiment and set it as an environment variable in a `.env.local` file in the project root:

```
SAN_API_KEY=your_santiment_api_key_here
```

2) Install dependencies and run the dev server:

```
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Notes

- Data is fetched server-side via the API route at `src/app/api/market/route.js` and then displayed on the homepage in `src/app/page.js`.
- You can also set `NEXT_PUBLIC_SAN_API_KEY` if you prefer; the API route will fall back to it, but keeping keys server-side is recommended.
