import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const url = searchParams.get("url");
  const platform = searchParams.get("platform");

  if (!url) {
    return NextResponse.json({ error: "URL is required" }, { status: 400 });
  }

  try {
    if (platform === "everlane") {
      const product = await scrapeEverlane(url);
      return NextResponse.json(product);
    } else if (platform === "jcrew") {
      const product = await scrapeJCrew(url);
      return NextResponse.json(product);
    } else {
      return NextResponse.json(
        { error: "Unsupported platform. Use everlane or jcrew." },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Scrape error:", error);
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

  // Fetch the product JSON from Everlane API
  const apiUrl = `https://www.everlane.com/api/v2/products/${productSlug}`;
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

  // Extract sizes from variants
  const sizes: string[] = [];
  const sizeSet = new Set<string>();

  if (product.variants) {
    for (const variant of product.variants) {
      // Try different option fields for size
      const size = variant.option1 || variant.option2 || variant.title;
      if (size && !sizeSet.has(size)) {
        sizeSet.add(size);
        sizes.push(size);
      }
    }
  }

  // Get color from product
  const colorName = product.color?.name || product.colorDisplayName;

  // Determine category from product data
  let category = "other";
  const name = (product.title || product.name || "").toLowerCase();
  const productCategory = (product.category || "").toLowerCase();

  if (name.includes("boot") || name.includes("shoe") || name.includes("sneaker") || name.includes("loafer") || name.includes("flat") || productCategory.includes("shoes")) {
    category = "shoes";
  } else if (name.includes("jacket") || name.includes("coat") || name.includes("blazer") || productCategory.includes("outerwear")) {
    category = "outerwear";
  } else if (name.includes("dress") || productCategory.includes("dresses")) {
    category = "dresses";
  } else if (name.includes("pant") || name.includes("jean") || name.includes("short") || name.includes("skirt") || productCategory.includes("bottoms")) {
    category = "bottoms";
  } else if (name.includes("shirt") || name.includes("blouse") || name.includes("top") || name.includes("sweater") || name.includes("tee") || productCategory.includes("tops")) {
    category = "tops";
  } else if (name.includes("bag") || name.includes("tote") || name.includes("backpack")) {
    category = "bags";
  }

  return {
    name: product.title || product.name,
    brand: "Everlane",
    imageUrl: product.photos?.[0]?.src || product.primaryPhoto?.src,
    sizes,
    colors: colorName ? [colorName] : [],
    category,
    material: product.fabric || product.material,
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
