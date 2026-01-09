import { NextResponse } from "next/server";

// DuckDuckGo image search - no API key required
async function searchDuckDuckGo(query: string): Promise<{
  imageUrl: string;
  sourceUrl?: string;
  title?: string;
} | null> {
  try {
    // First, get a vqd token from DuckDuckGo
    const tokenResponse = await fetch(
      `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
      }
    );

    const tokenHtml = await tokenResponse.text();

    // Extract vqd token from the page
    const vqdMatch = tokenHtml.match(/vqd=['"]([^'"]+)['"]/);
    if (!vqdMatch) {
      console.error("Could not find vqd token");
      return null;
    }
    const vqd = vqdMatch[1];

    // Now search for images
    const imageResponse = await fetch(
      `https://duckduckgo.com/i.js?l=us-en&o=json&q=${encodeURIComponent(query)}&vqd=${vqd}&f=,,,,,&p=1`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "application/json",
          "Referer": "https://duckduckgo.com/",
        },
      }
    );

    if (!imageResponse.ok) {
      console.error("DuckDuckGo image search failed:", imageResponse.status);
      return null;
    }

    const data = await imageResponse.json();

    if (!data.results || data.results.length === 0) {
      return null;
    }

    // Get the first result that looks like a product image
    // Prefer images from retail sites
    const retailDomains = ["nordstrom", "shopbop", "ssense", "net-a-porter", "farfetch", "bloomingdales", "saks", "neiman", "jcrew", "everlane", "uniqlo", "zara", "hm.com", "nike", "adidas"];

    let bestResult = data.results[0];

    // Try to find an image from a retail site
    for (const result of data.results.slice(0, 10)) {
      const source = (result.source || result.url || "").toLowerCase();
      if (retailDomains.some(domain => source.includes(domain))) {
        bestResult = result;
        break;
      }
    }

    return {
      imageUrl: bestResult.image,
      sourceUrl: bestResult.url,
      title: bestResult.title,
    };
  } catch (error) {
    console.error("DuckDuckGo search error:", error);
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const { brand, description } = await request.json();

    if (!brand || !description) {
      return NextResponse.json(
        { error: "Brand and description are required" },
        { status: 400 }
      );
    }

    // Build search query: brand + description + "product"
    const searchQuery = `${brand} ${description} product`;

    const result = await searchDuckDuckGo(searchQuery);

    return NextResponse.json({ result });
  } catch (error) {
    console.error("Image search error:", error);
    return NextResponse.json({ result: null });
  }
}
