# ShopClone Project Rules

## Stack
- Next.js (App Router)
- Convex (Backend)
- Clerk (Auth)
- Tailwind CSS

## Auth Flow
SMS-only OTP via Clerk.

## Database
Convex with Vector Search enabled for natural language queries.

## Data Sources
Retail brands + marketplaces (eBay, Poshmark, TheRealReal).

## Features
- Natural language search with LLM parsing
- Price tracking with 12-hour cron job
- Comparison tables
- User size profiles
- Price alerts (target reached, significant drops)

## Pages
- `/` - Home with product search
- `/profile` - User profile, size preferences, tracked items
- `/product/[id]` - Product detail with price history chart
- `/sign-in` - SMS OTP authentication

## Convex Tables
- `users` - clerkId, phoneNumber, preferences
- `products` - name, brand, price, category, embedding (vector)
- `tracked_items` - userId, productId, targetPrice
- `price_history` - productId, price, checkedAt
- `price_alerts` - userId, productId, alertType, prices

## Key Convex Functions
- `search.searchProducts` - Natural language product search
- `products.addProduct` - Add product with auto-embedding
- `tracking.trackProduct` - Track item for price changes
- `alerts.getUserAlerts` - Get user's price alerts
- `seed.seedProductsQuick` - Seed test data

## Development Commands
- `npm run dev` - Runs Next.js and Convex dev servers in parallel
- `npm run dev:next` - Next.js dev server only
- `npm run dev:convex` - Convex dev server only

## Environment Variables
Copy `.env.local.example` to `.env.local` and fill in:
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - From Clerk dashboard
- `CLERK_SECRET_KEY` - From Clerk dashboard
- `NEXT_PUBLIC_CONVEX_URL` - From `npx convex dev`
- `CLERK_WEBHOOK_SECRET` - From Clerk webhook settings
- `OPENAI_API_KEY` - For embeddings and search parsing

## Webhook Setup
Clerk webhook endpoint: `<CONVEX_URL>/clerk-webhook`
Subscribe to: `user.created`

## Mock Mode
App runs without env vars using mock data for UI preview.
