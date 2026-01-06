import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const url = searchParams.get("url");
  const platform = searchParams.get("platform");

  console.log("[API/scrape] Request received - URL:", url, "Platform:", platform);

  if (!url) {
    console.log("[API/scrape] Error: URL is required");
    return NextResponse.json({ error: "URL is required" }, { status: 400 });
  }

  try {
    if (platform === "everlane") {
      console.log("[API/scrape] Scraping Everlane...");
      const product = await scrapeEverlane(url);
      console.log("[API/scrape] Everlane success:", product.name);
      return NextResponse.json(product);
    } else if (platform === "jcrew") {
      console.log("[API/scrape] Scraping J.Crew...");
      const product = await scrapeJCrew(url);
      console.log("[API/scrape] J.Crew success:", product.name);
      return NextResponse.json(product);
    } else {
      console.log("[API/scrape] Error: Unsupported platform");
      return NextResponse.json(
        { error: "Unsupported platform. Use everlane or jcrew." },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("[API/scrape] Scrape error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to scrape product" },
      { status: 500 }
    );
  }
}

async function scrapeEverlane(url: string) {
  // Extract the product slug from URL
  const urlObj = new URL(url);
  const pathParts = urlObj.pathname.split("/").filter(Boolean);

  // Find products in path (e.g., /products/womens-day-glove-reknit or /products/womens-the-glove-boot)
  const productsIndex = pathParts.indexOf("products");
  if (productsIndex === -1 || productsIndex >= pathParts.length - 1) {
    throw new Error("Could not find product slug in URL");
  }

  const productSlug = pathParts[productsIndex + 1];

  // Everlane now uses Shopify - use the .json endpoint
  const apiUrl = `https://www.everlane.com/products/${productSlug}.json`;
  console.log("[scrapeEverlane] Fetching:", apiUrl);

  const response = await fetch(apiUrl, {
    headers: {
      "Accept": "application/json",
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch Everlane product: ${response.status}`);
  }

  const data = await response.json();
  const product = data.product;

  if (!product) {
    throw new Error("Product not found in API response");
  }

  // Extract sizes from variants or options
  const sizes: string[] = [];
  const sizeSet = new Set<string>();

  // Try to get sizes from options first (Shopify format)
  const sizeOption = product.options?.find((opt: { name: string }) =>
    opt.name.toLowerCase() === "size"
  );
  if (sizeOption?.values) {
    for (const size of sizeOption.values) {
      if (!sizeSet.has(size)) {
        sizeSet.add(size);
        sizes.push(size);
      }
    }
  } else if (product.variants) {
    // Fallback to variants
    for (const variant of product.variants) {
      const size = variant.option1 || variant.title;
      if (size && !sizeSet.has(size)) {
        sizeSet.add(size);
        sizes.push(size);
      }
    }
  }

  // Get color from title or tags
  let colorName = "";
  const titleParts = (product.title || "").split("|");
  if (titleParts.length > 1) {
    colorName = titleParts[1].trim();
  }

  // Determine category from product_type or tags
  let category = "other";
  const productType = (product.product_type || "").toLowerCase();
  const tags = (product.tags || "").toLowerCase();
  const name = (product.title || "").toLowerCase();

  if (productType.includes("shoe") || productType.includes("boot") || tags.includes("shoes") || name.includes("boot") || name.includes("shoe") || name.includes("sneaker") || name.includes("loafer") || name.includes("flat")) {
    category = "shoes";
  } else if (productType.includes("jacket") || productType.includes("coat") || productType.includes("outerwear") || tags.includes("outerwear") || name.includes("jacket") || name.includes("coat") || name.includes("blazer")) {
    category = "outerwear";
  } else if (productType.includes("dress") || tags.includes("dresses") || name.includes("dress")) {
    category = "dresses";
  } else if (productType.includes("pant") || productType.includes("jean") || productType.includes("short") || productType.includes("skirt") || tags.includes("bottoms") || name.includes("pant") || name.includes("jean") || name.includes("short") || name.includes("skirt")) {
    category = "bottoms";
  } else if (productType.includes("sweater") || productType.includes("shirt") || productType.includes("top") || productType.includes("tee") || tags.includes("tops") || name.includes("shirt") || name.includes("blouse") || name.includes("top") || name.includes("sweater") || name.includes("tee") || name.includes("crew") || name.includes("pullover")) {
    category = "tops";
  } else if (productType.includes("bag") || tags.includes("bags") || name.includes("bag") || name.includes("tote") || name.includes("backpack")) {
    category = "bags";
  }

  // Extract material from tags if available
  let material = "";
  const fabricMatch = tags.match(/fabric:\s*(\w+)/);
  if (fabricMatch) {
    material = fabricMatch[1].charAt(0).toUpperCase() + fabricMatch[1].slice(1);
  }

  // Get image URL from Shopify format
  const imageUrl = product.image?.src || product.images?.[0]?.src;

  // Clean up title (remove color suffix after |)
  const cleanTitle = titleParts[0].trim();

  return {
    name: cleanTitle,
    brand: "Everlane",
    imageUrl,
    sizes,
    colors: colorName ? [colorName] : [],
    category,
    material,
  };
}

async function scrapeJCrew(url: string) {
  // Extract product code from J.Crew URL
  // Format: https://www.jcrew.com/p/womens/categories/shoes/boots/classic-chelsea-lug-sole-leather-boots/BQ282
  const urlObj = new URL(url);
  const pathParts = urlObj.pathname.split("/").filter(Boolean);
  const productCode = pathParts[pathParts.length - 1];

  // Fetch product page
  const response = await fetch(url, {
    headers: {
      "Accept": "text/html",
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch J.Crew product: ${response.status}`);
  }

  const html = await response.text();

  // Extract JSON-LD data
  const jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  let productData: {
    name?: string;
    brand?: { name?: string };
    image?: string | string[];
    offers?: { price?: string } | Array<{ price?: string }>;
    color?: string;
    material?: string;
  } | null = null;

  if (jsonLdMatch) {
    try {
      const jsonLd = JSON.parse(jsonLdMatch[1]);
      if (jsonLd["@type"] === "Product") {
        productData = jsonLd;
      }
    } catch {
      // Ignore JSON parse errors
    }
  }

  // Extract product name
  const nameMatch = html.match(/<h1[^>]*class="[^"]*product-name[^"]*"[^>]*>([^<]+)<\/h1>/i) ||
                    html.match(/<meta property="og:title" content="([^"]+)"/);
  const name = productData?.name || nameMatch?.[1] || "Unknown Product";

  // Extract image
  const imageMatch = html.match(/<meta property="og:image" content="([^"]+)"/);
  const imageUrl = (Array.isArray(productData?.image) ? productData?.image[0] : productData?.image) || imageMatch?.[1];

  // Extract sizes from the page
  const sizes: string[] = [];
  const sizeMatches = html.matchAll(/data-size="([^"]+)"/g);
  const sizeSet = new Set<string>();
  for (const match of sizeMatches) {
    if (!sizeSet.has(match[1])) {
      sizeSet.add(match[1]);
      sizes.push(match[1]);
    }
  }

  // Extract colors
  const colors: string[] = [];
  const colorMatches = html.matchAll(/data-color-name="([^"]+)"/g);
  const colorSet = new Set<string>();
  for (const match of colorMatches) {
    if (!colorSet.has(match[1])) {
      colorSet.add(match[1]);
      colors.push(match[1]);
    }
  }

  // Determine category from URL path
  let category = "other";
  const urlLower = url.toLowerCase();

  if (urlLower.includes("/shoes/") || urlLower.includes("/boots/")) {
    category = "shoes";
  } else if (urlLower.includes("/outerwear/") || urlLower.includes("/coats/") || urlLower.includes("/jackets/")) {
    category = "outerwear";
  } else if (urlLower.includes("/dresses/")) {
    category = "dresses";
  } else if (urlLower.includes("/pants/") || urlLower.includes("/jeans/") || urlLower.includes("/shorts/") || urlLower.includes("/skirts/")) {
    category = "bottoms";
  } else if (urlLower.includes("/shirts/") || urlLower.includes("/sweaters/") || urlLower.includes("/tops/") || urlLower.includes("/tees/")) {
    category = "tops";
  } else if (urlLower.includes("/bags/") || urlLower.includes("/accessories/")) {
    category = urlLower.includes("/bags/") ? "bags" : "accessories";
  }

  return {
    name: name.replace(/\s*\|.*$/, "").trim(),
    brand: "J.Crew",
    imageUrl,
    sizes,
    colors,
    category,
  };
}
