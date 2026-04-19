This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Environment Variables

To run the project locally, you need to set up your environment variables. 

1. Copy the `.env.example` file to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
2. Open `.env.local` and fill in your actual credentials.

> [!WARNING]
> Please do not commit your `.env.local` file to Git. It is already included in `.gitignore`.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Known Risks & Deferred Hardening

Currently, there are a few active architectural risks and missing security features that have been deliberately deferred from the Phase 1 MVP. We strongly recommend resolving these before any broader public release:

- **No Rate Limiting:** The AI endpoint (`/api/ai`) currently has no explicit, IP-based or user-based rate limiting built natively into the route. Abuse could potentially exhaust project quotas or cause minor denial-of-service issues. Note: Basic payload caps (string length validation) *are* implemented.
- **API Keys are not Encrypted-At-Rest:** User's Bring-Your-Own API Keys are securely obscured from the frontend, locked down with Postgres Row Level Security (RLS) policies, and stripped from auth JWT payloads. However, they are stored as standard `TEXT` in the generic database instance instead of being cryptographically hashed or processed via a dedicated secrets vault natively (such as Supabase Vault / pgsodium).

**Action Required:** Revisit and apply a secure DDOS / rate limiting framework (such as Vercel Edge KV or Upstash) alongside Enterprise database encryption parameters before scaling to a wider audience....Test
