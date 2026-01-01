import type { ScrapedProduct, ScraperResult, ScraperConfig } from "./types";

const POSHMARK_API = "https://poshmark.com/vm-rest/posts";

interface PoshmarkListing {
  id: string;
  title: string;
  description: string;
  brand: { name: string };
  price_amount: { val: string };
  size: string;
  category: string;
  department: string;
  condition: string;
  cover_shot: { url_small: string };
}

async function fetchPoshmarkListings(
  query: string,
  maxItems: number = 50
): Promise<PoshmarkListing[]> {
  const listings: PoshmarkListing[] = [];

  try {
    // Poshmark uses a specific API endpoint for search
    const searchUrl = `https://poshmark.com/search?query=${encodeURIComponent(query)}&type=listings&src=dir`;

    const response = await fetch(searchUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
    });

    if (!response.ok) {
      console.log(`Poshmark search returned ${response.status}`);
      return [];
    }

    const html = await response.text();

    // Extract JSON data from the page
    const dataMatch = html.match(/__NEXT_DATA__.*?<\/script>/s);
    if (dataMatch) {
      const jsonStr = dataMatch[0].replace('__NEXT_DATA__" type="application/json">', '').replace('</script>', '');
      try {
        const data = JSON.parse(jsonStr);
        // Navigate to listings in the data structure
        const tiles = data?.props?.pageProps?.tiles || [];
        for (const tile of tiles.slice(0, maxItems)) {
          if (tile.type === "listing") {
            listings.push(tile.data);
          }
        }
      } catch (e) {
        console.log("Failed to parse Poshmark JSON data");
      }
    }
  } catch (error) {
    console.error("Error fetching Poshmark listings:", error);
  }

  return listings;
}

function mapCondition(condition: string): "new" | "used" | "like_new" {
  const lower = condition?.toLowerCase() || "";
  if (lower.includes("nwt") || lower.includes("new")) return "new";
  if (lower.includes("like new") || lower.includes("excellent")) return "like_new";
  return "used";
}

function mapGender(department: string): "men" | "women" | "unisex" | undefined {
  const lower = department?.toLowerCase() || "";
  if (lower.includes("women") || lower.includes("female")) return "women";
  if (lower.includes("men") || lower.includes("male")) return "men";
  if (lower.includes("unisex")) return "unisex";
  return undefined;
}

function mapCategory(category: string): string {
  const lower = category?.toLowerCase() || "";
  if (lower.includes("shoe") || lower.includes("boot") || lower.includes("sneaker")) return "shoes";
  if (lower.includes("bag") || lower.includes("purse") || lower.includes("handbag")) return "bags";
  if (lower.includes("dress")) return "dresses";
  if (lower.includes("jacket") || lower.includes("coat")) return "outerwear";
  if (lower.includes("jean") || lower.includes("pant")) return "pants";
  if (lower.includes("top") || lower.includes("shirt") || lower.includes("blouse")) return "tops";
  if (lower.includes("sweater")) return "sweaters";
  if (lower.includes("skirt")) return "skirts";
  return category || "other";
}

export async function scrapePoshmark(config: ScraperConfig = {}): Promise<ScraperResult> {
  const maxProducts = config.maxProducts || 100;
  const searchTerms = config.searchTerms || [
    "designer handbag",
    "leather boots",
    "vintage denim",
    "cashmere sweater",
    "silk dress",
  ];

  const products: ScrapedProduct[] = [];
  const errors: string[] = [];
  const seenIds = new Set<string>();

  console.log("Starting Poshmark scraper...");

  for (const term of searchTerms) {
    if (products.length >= maxProducts) break;

    console.log(`  Searching for: ${term}`);
    try {
      const listings = await fetchPoshmarkListings(term, Math.ceil(maxProducts / searchTerms.length));

      for (const listing of listings) {
        if (seenIds.has(listing.id)) continue;
        seenIds.add(listing.id);

        const price = parseFloat(listing.price_amount?.val || "0");
        if (price <= 0) continue;

        products.push({
          name: listing.title || "Unknown Product",
          description: listing.description || "",
          brand: listing.brand?.name || "Unknown",
          price,
          size: listing.size || undefined,
          category: mapCategory(listing.category),
          gender: mapGender(listing.department),
          condition: mapCondition(listing.condition),
          sourceUrl: `https://poshmark.com/listing/${listing.id}`,
          sourcePlatform: "Poshmark",
          imageUrl: listing.cover_shot?.url_small,
        });

        if (products.length >= maxProducts) break;
      }

      // Rate limiting
      await new Promise((r) => setTimeout(r, 1000));
    } catch (error) {
      errors.push(`Failed to search "${term}": ${error}`);
    }
  }

  console.log(`Poshmark: Found ${products.length} products`);

  return {
    products,
    source: "Poshmark",
    scrapedAt: new Date(),
    errors: errors.length > 0 ? errors : undefined,
  };
}
