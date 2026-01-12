# ShopWatch Project Rules

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
- `/compare` - Side-by-side product comparison
- `/favorites` - User's saved/favorited items
- `/sign-in` - SMS OTP authentication

## Components
- `components/layout/Header` - Navigation with mobile menu, notifications, user dropdown
- `components/search/ProductSearch` - Main search with filters and skeleton loading
- `components/search/ProductCard` - Product card with track/favorite buttons
- `components/search/FilterSidebar` - Advanced filter panel
- `components/comparison/ProductComparison` - Product comparison table
- `components/ui/Skeleton` - Loading skeleton components

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

---

## Recent Changes & Implementation Notes

### Product Deduplication (Jan 2026)
**Problem:** ~2000 duplicate products in database (same sourceUrl, multiple entries)

**Solution:**
- Added `findDuplicates` query in `convex/products.ts` - identifies products with same sourceUrl
- Added `removeDuplicates` mutation - cleans duplicates by platform (use `platform` arg to batch)
- Updated `addProduct` mutation - now checks for existing products before inserting
- Updated `bulkAddProducts` mutation - skips products that already exist, returns action status

**Usage:**
```bash
npx convex run products:findDuplicates
npx convex run products:removeDuplicates '{"platform": "Depop", "batchSize": 500}'
```

### Search Fixes (Jan 2026)
**Problem:** Material searches (cashmere, wool) not returning used products

**Fixes in `convex/search.ts`:**
1. Brand detection uses word boundary matching to avoid false positives (e.g., "hm" in "cashmere" → H&M)
2. `filterProductsInternal` now receives `condition` filter from `searchProducts`
3. Material matching uses `materialMatchesTargets()` which checks name, description, AND synonyms
4. Increased fetch limit to 1500+ before grouping to get mix of new/used products
5. Added price-based tiebreaker to sort to mix new and used products

**Frontend fix in `components/search/ProductSearch.tsx`:**
- Removed client-side material re-filtering that excluded products without `material` field
- Backend handles material matching (checks name, description, material field, and synonyms)

### In Stock Only Filter (Jan 2026)
**Location:** `components/search/FilterSidebar.tsx`, `components/search/ProductSearch.tsx`

**Implementation:**
- Added `inStockOnly: boolean` to `FilterState` interface
- Checkbox in FilterSidebar under Condition section
- `applyFilters()` excludes products where all variants have `available: false`
- Added to `saved_searches` schema in `convex/schema.ts`

### Key Search Architecture
1. Frontend sends query text to `searchProducts` action
2. Backend parses query via Claude LLM into `SearchFilter` object
3. `filterProductsInternal` applies filters (gender, condition, material, etc.)
4. `groupByColor` collapses products by color group
5. Frontend applies additional sidebar filters (price, brand, platform, in-stock)

### Material Synonym System
Located in `convex/search.ts`:
- `MATERIAL_SYNONYMS` map: wool → [merino, lambswool, virgin wool, etc.]
- `materialMatchesTargets()` function checks material field, name, and description with synonym expansion
- `ALL_MATERIAL_WORDS` Set contains all known material terms for detection

### Stock/Availability Tracking
- Products have optional `variants` array with `available: boolean` per variant
- New `colorVariants` structure also has `sizes[].available` per size
- `isProductSoldOut()` helper in `convex/search.ts` returns true if all variants unavailable
- Search prioritizes in-stock items first in results

### Deployment Notes
- Frontend uses dev Convex URL (`npx convex dev --once` deploys to dev)
- For production: `npx convex deploy --yes`
- Vercel auto-deploys on git push
