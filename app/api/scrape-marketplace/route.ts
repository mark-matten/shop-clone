import { NextRequest, NextResponse } from "next/server";

// Product interface
interface ScrapedProduct {
  name: string;
  brand: string;
  description: string;
  price: number;
  originalPrice?: number;
  category: string;
  gender?: "men" | "women" | "unisex";
  condition: "new" | "used" | "like_new";
  sourceUrl: string;
  sourcePlatform: string;
  imageUrl?: string;
  size?: string;
}

// Get browser instance
async function getBrowser() {
  // For local development, use local Chrome via puppeteer
  if (process.env.NODE_ENV === "development") {
    const puppeteer = await import("puppeteer");
    return puppeteer.default.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
  }

  // For production (Vercel), use @sparticuz/chromium with puppeteer-core
  const puppeteer = await import("puppeteer-core");
  const chromium = await import("@sparticuz/chromium");

  const executablePath = await chromium.default.executablePath();

  return puppeteer.default.launch({
    args: chromium.default.args,
    defaultViewport: { width: 1920, height: 1080 },
    executablePath,
    headless: true,
  });
}

// Scrape Poshmark
async function scrapePoshmark(
  query: string,
  maxItems: number = 50
): Promise<ScrapedProduct[]> {
  const browser = await getBrowser();
  const products: ScrapedProduct[] = [];

  try {
    const page = await browser.newPage();

    await page.setViewport({ width: 1920, height: 1080 });
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    });

    await page.setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });

    const url = `https://poshmark.com/search?query=${encodeURIComponent(query)}&type=listings&availability=available`;
    console.log(`[Poshmark] Navigating to: ${url}`);

    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Scroll multiple times to load more items
    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => window.scrollBy(0, 1000));
      await new Promise(resolve => setTimeout(resolve, 800));
    }

    const pageTitle = await page.title();
    console.log(`[Poshmark] Page title: ${pageTitle}`);

    // Count elements
    const counts = await page.evaluate(() => ({
      listings: document.querySelectorAll('[data-et-name="listing"]').length,
      links: document.querySelectorAll("a[href*='/listing/']").length,
    }));
    console.log(`[Poshmark] Found: ${counts.listings} listings, ${counts.links} links`);

    // Extract using listing links directly (more reliable than data-et-name)
    const listings = await page.evaluate((max: number) => {
      const items: {
        id: string;
        title: string;
        price: string;
        brand?: string;
        size?: string;
        imageUrl?: string;
      }[] = [];

      const seen: Set<string> = new Set();

      // Get all listing links
      const allLinks = document.querySelectorAll("a[href*='/listing/']");

      for (let i = 0; i < allLinks.length && items.length < max; i++) {
        const link = allLinks[i] as HTMLAnchorElement;
        const href = link.href || "";

        const match = href.match(/listing\/([^/?]+)/);
        if (!match) continue;

        const id = match[1];
        if (seen.has(id)) continue;
        seen.add(id);

        // Walk up to find container with price
        let container: HTMLElement | null = link;
        for (let j = 0; j < 8 && container; j++) {
          container = container.parentElement;
          if (!container) break;
          // Check if container has price info
          if (container.textContent?.includes("$")) break;
        }

        if (!container) continue;

        // Get title from image alt (most reliable)
        const img = container.querySelector("img") as HTMLImageElement;
        let title = img?.alt || "";

        // Fallback: get from link text or data attribute
        if (!title || title.length < 3) {
          const titleEl = container.querySelector('[data-et-name="title"]');
          title = titleEl?.textContent?.trim() || link.textContent?.trim() || "";
        }

        // Skip invalid titles
        if (!title || title.length < 3 || title.includes("Search results")) continue;

        // Get price from container text
        let price = "";
        const containerText = container.textContent || "";
        const priceMatch = containerText.match(/\$[\d,.]+/);
        if (priceMatch) {
          price = priceMatch[0];
        }

        // Skip if no price found
        if (!price) continue;

        // Get brand from container
        let brand = "";
        const brandEl = container.querySelector('[class*="creator"], [class*="brand"]');
        if (brandEl) {
          brand = brandEl.textContent?.trim() || "";
        }

        // Get size
        let size = "";
        const sizeEl = container.querySelector('[class*="size"]');
        if (sizeEl) {
          size = sizeEl.textContent?.trim() || "";
        }

        // Get image URL
        const imageUrl = img?.src || img?.getAttribute("data-src") || "";

        items.push({
          id,
          title,
          price,
          brand,
          size,
          imageUrl: imageUrl || undefined,
        });
      }

      return items;
    }, maxItems);

    console.log(`[Poshmark] Found ${listings.length} listings`);

    // Debug: Log first listing
    if (listings.length > 0) {
      console.log(`[Poshmark] Sample listing:`, JSON.stringify(listings[0]));
    }

    for (const listing of listings) {
      const priceMatch = listing.price.match(/\$?([\d,.]+)/);
      if (!priceMatch) {
        console.log(`[Poshmark] No price match for: "${listing.price}"`);
        continue;
      }

      const price = parseFloat(priceMatch[1].replace(/,/g, ""));
      if (isNaN(price) || price <= 0) continue;

      // Determine category from title
      const titleLower = listing.title.toLowerCase();
      let category = "other";
      if (titleLower.includes("shoe") || titleLower.includes("boot") || titleLower.includes("sneaker")) {
        category = "shoes";
      } else if (titleLower.includes("jacket") || titleLower.includes("coat")) {
        category = "outerwear";
      } else if (titleLower.includes("dress")) {
        category = "dresses";
      } else if (titleLower.includes("pant") || titleLower.includes("jean") || titleLower.includes("short")) {
        category = "bottoms";
      } else if (titleLower.includes("shirt") || titleLower.includes("top") || titleLower.includes("blouse")) {
        category = "tops";
      } else if (titleLower.includes("bag") || titleLower.includes("purse")) {
        category = "bags";
      }

      // Determine condition
      let condition: "new" | "used" | "like_new" = "used";
      if (titleLower.includes("nwt") || titleLower.includes("new with tags")) {
        condition = "new";
      } else if (titleLower.includes("nwot") || titleLower.includes("like new")) {
        condition = "like_new";
      }

      products.push({
        name: listing.title,
        brand: listing.brand || query.split(" ")[0] || "Unknown",
        description: listing.title,
        price,
        category,
        gender: "women", // Poshmark is primarily women's
        condition,
        sourceUrl: `https://poshmark.com/listing/${listing.id}`,
        sourcePlatform: "Poshmark",
        imageUrl: listing.imageUrl,
        size: listing.size,
      });
    }
  } catch (error) {
    console.error("[Poshmark] Scrape error:", error);
  } finally {
    await browser.close();
  }

  return products;
}

// Scrape TheRealReal
async function scrapeTheRealReal(
  query: string,
  maxItems: number = 30
): Promise<ScrapedProduct[]> {
  const browser = await getBrowser();
  const products: ScrapedProduct[] = [];

  try {
    const page = await browser.newPage();

    await page.setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    const url = `https://www.therealreal.com/shop?keywords=${encodeURIComponent(query)}`;
    console.log(`[TRR] Navigating to: ${url}`);

    await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });

    // Wait for product grid
    await page.waitForSelector('[data-testid="product-card"], .product-card, [class*="ProductCard"]', {
      timeout: 10000,
    }).catch(() => {
      console.log("[TRR] No product cards found, trying alternative selectors");
    });

    // Extract product data
    const listings = await page.evaluate((max: number) => {
      const items: Array<{
        id: string;
        name: string;
        designer: string;
        price: string;
        imageUrl?: string;
        href?: string;
      }> = [];

      const productCards = document.querySelectorAll(
        '[data-testid="product-card"], .product-card, [class*="ProductCard"], [data-product-id]'
      );

      productCards.forEach((card, index) => {
        if (index >= max) return;

        const nameEl = card.querySelector('[class*="name"], [class*="title"], h3, h4');
        const designerEl = card.querySelector('[class*="designer"], [class*="brand"]');
        const priceEl = card.querySelector('[class*="price"]');
        const linkEl = card.querySelector("a[href*='/products/']");
        const imgEl = card.querySelector("img");

        const productId = card.getAttribute("data-product-id") || `trr-${index}`;
        const href = linkEl?.getAttribute("href");

        if (nameEl || designerEl) {
          items.push({
            id: productId,
            name: nameEl?.textContent?.trim() || "",
            designer: designerEl?.textContent?.trim() || "",
            price: priceEl?.textContent?.trim() || "",
            imageUrl: imgEl?.getAttribute("src") || imgEl?.getAttribute("data-src"),
            href,
          });
        }
      });

      return items;
    }, maxItems);

    console.log(`[TRR] Found ${listings.length} products`);

    // Debug: Log first listing
    if (listings.length > 0) {
      console.log(`[TRR] Sample listing:`, JSON.stringify(listings[0]));
    }

    for (const listing of listings) {
      const priceMatch = listing.price.match(/\$?([\d,.]+)/);
      if (!priceMatch) {
        console.log(`[TRR] No price match for: "${listing.price}"`);
        continue;
      }

      const price = parseFloat(priceMatch[1].replace(/,/g, ""));
      if (isNaN(price) || price <= 0) continue;

      const fullName = listing.designer
        ? `${listing.designer} ${listing.name}`
        : listing.name;

      // Determine category
      const nameLower = fullName.toLowerCase();
      let category = "other";
      if (nameLower.includes("shoe") || nameLower.includes("boot") || nameLower.includes("heel") || nameLower.includes("sandal")) {
        category = "shoes";
      } else if (nameLower.includes("jacket") || nameLower.includes("coat") || nameLower.includes("blazer")) {
        category = "outerwear";
      } else if (nameLower.includes("dress")) {
        category = "dresses";
      } else if (nameLower.includes("pant") || nameLower.includes("jean") || nameLower.includes("trouser")) {
        category = "bottoms";
      } else if (nameLower.includes("top") || nameLower.includes("blouse") || nameLower.includes("shirt") || nameLower.includes("sweater")) {
        category = "tops";
      } else if (nameLower.includes("bag") || nameLower.includes("handbag") || nameLower.includes("clutch") || nameLower.includes("tote")) {
        category = "bags";
      }

      const sourceUrl = listing.href
        ? `https://www.therealreal.com${listing.href}`
        : `https://www.therealreal.com/products/${listing.id}`;

      products.push({
        name: fullName,
        brand: listing.designer || query.split(" ")[0] || "Designer",
        description: fullName,
        price,
        category,
        gender: "women",
        condition: "used",
        sourceUrl,
        sourcePlatform: "TheRealReal",
        imageUrl: listing.imageUrl,
      });
    }
  } catch (error) {
    console.error("[TRR] Scrape error:", error);
  } finally {
    await browser.close();
  }

  return products;
}

// Scrape Depop (secondhand marketplace)
async function scrapeDepop(
  query: string,
  maxItems: number = 30
): Promise<ScrapedProduct[]> {
  const browser = await getBrowser();
  const products: ScrapedProduct[] = [];

  try {
    const page = await browser.newPage();

    await page.setViewport({ width: 1920, height: 1080 });
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    });

    await page.setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    // Hide automation
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });

    const url = `https://www.depop.com/search/?q=${encodeURIComponent(query)}`;
    console.log(`[Depop] Navigating to: ${url}`);

    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });

    // Wait for page to load
    await new Promise(resolve => setTimeout(resolve, 3000));

    const pageTitle = await page.title();
    console.log(`[Depop] Page title: ${pageTitle}`);

    // Scroll to load more items
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => window.scrollBy(0, 600));
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Debug: count elements
    const counts = await page.evaluate(() => ({
      products: document.querySelectorAll('[data-testid*="product"], [class*="ProductCard"]').length,
      links: document.querySelectorAll('a[href*="/products/"]').length,
      images: document.querySelectorAll('img').length,
      articles: document.querySelectorAll('article, li').length,
    }));
    console.log(`[Depop] Found: ${counts.products} products, ${counts.links} product links, ${counts.images} images, ${counts.articles} articles`);

    // Debug: sample DOM structure
    const debugInfo = await page.evaluate(() => {
      const productLinks = document.querySelectorAll('a[href*="/products/"]');
      const samples = [];
      for (let i = 0; i < Math.min(2, productLinks.length); i++) {
        const link = productLinks[i] as HTMLAnchorElement;
        // Walk up to find the full product card
        let container: HTMLElement | null = link;
        for (let j = 0; j < 8 && container; j++) {
          container = container.parentElement;
        }
        samples.push({
          href: link.href,
          containerText: container?.textContent?.slice(0, 200) || "",
          containerHTML: container?.outerHTML?.slice(0, 300) || "",
        });
      }
      return samples;
    });
    console.log(`[Depop] Debug sample:`, JSON.stringify(debugInfo[0]?.containerText?.slice(0, 100)));

    // Extract product data - Depop uses data attributes
    const listings = await page.evaluate((max: number) => {
      const items: {
        title: string;
        price: string;
        brand?: string;
        imageUrl?: string;
        href?: string;
      }[] = [];

      const seen: Set<string> = new Set();

      // Look for product links
      const productLinks = document.querySelectorAll('a[href*="/products/"]');

      for (let i = 0; i < productLinks.length && items.length < max; i++) {
        const link = productLinks[i] as HTMLAnchorElement;
        const href = link.href || "";

        if (seen.has(href)) continue;
        seen.add(href);

        // Walk up to find a container that looks like a product card
        let container: HTMLElement | null = link;
        for (let j = 0; j < 10 && container; j++) {
          container = container.parentElement;
          if (!container) break;
          // Check if we've reached a reasonable card size
          const text = container.textContent || "";
          // Depop shows prices - look for price pattern or article element
          if (text.match(/[\$£€][\d]+/) || container.tagName === "ARTICLE" || container.tagName === "LI") {
            break;
          }
        }

        if (!container) container = link.parentElement?.parentElement?.parentElement as HTMLElement;

        // Get title from image alt
        const img = link.querySelector("img") || container?.querySelector("img");
        let title = "";
        if (img) {
          title = (img as HTMLImageElement).alt || "";
        }

        // Also check for aria-label or title attribute on the link
        if (!title) {
          title = link.getAttribute("aria-label") || link.title || "";
        }

        // Fallback: extract from href
        if (!title || title.length < 3) {
          // Extract product slug from href: /products/slug-123456
          const slugMatch = href.match(/\/products\/([^\/]+)/);
          if (slugMatch) {
            title = slugMatch[1]
              .split("-")
              .slice(0, -1) // Remove ID at end
              .join(" ")
              .replace(/\b\w/g, l => l.toUpperCase()); // Capitalize words
          }
        }

        if (!title || title.length < 3) continue;

        // Get price - look in container and nearby elements
        let price = "";
        if (container) {
          const containerText = container.textContent || "";
          const priceMatch = containerText.match(/[\$£€][\d,.]+/);
          if (priceMatch) {
            price = priceMatch[0];
          }
        }

        // If no price found, try looking at sibling elements
        if (!price) {
          const parent = link.parentElement;
          if (parent) {
            const siblings = parent.querySelectorAll("*");
            for (const el of siblings) {
              const text = el.textContent?.trim() || "";
              if (text.match(/^[\$£€][\d,.]+$/)) {
                price = text;
                break;
              }
            }
          }
        }

        // Get image
        let imageUrl = "";
        if (img) {
          imageUrl = (img as HTMLImageElement).src ||
                     (img as HTMLImageElement).getAttribute("data-src") || "";
        }

        items.push({
          title,
          price: price || "$0", // Allow items without visible price
          imageUrl: imageUrl || undefined,
          href,
        });
      }

      return items;
    }, maxItems);

    console.log(`[Depop] Found ${listings.length} listings`);
    if (listings.length > 0) {
      console.log(`[Depop] Sample listing:`, JSON.stringify(listings[0]));
    }

    for (const listing of listings) {
      const priceMatch = listing.price.match(/[\$£]?([\d,.]+)/);
      if (!priceMatch) continue;

      let price = parseFloat(priceMatch[1].replace(/,/g, ""));
      // Convert GBP to USD roughly if needed
      if (listing.price.includes("£")) {
        price = price * 1.27; // Approximate GBP to USD
      }
      if (isNaN(price) || price <= 0) continue;

      // Determine category
      const titleLower = listing.title.toLowerCase();
      let category = "other";
      if (titleLower.includes("shoe") || titleLower.includes("boot") || titleLower.includes("sneaker")) {
        category = "shoes";
      } else if (titleLower.includes("jacket") || titleLower.includes("coat")) {
        category = "outerwear";
      } else if (titleLower.includes("dress")) {
        category = "dresses";
      } else if (titleLower.includes("pant") || titleLower.includes("jean") || titleLower.includes("short")) {
        category = "bottoms";
      } else if (titleLower.includes("shirt") || titleLower.includes("top") || titleLower.includes("tee") || titleLower.includes("blouse")) {
        category = "tops";
      } else if (titleLower.includes("bag") || titleLower.includes("purse")) {
        category = "bags";
      }

      // Determine condition
      let condition: "new" | "used" | "like_new" = "used";
      if (titleLower.includes("nwt") || titleLower.includes("new with tags") || titleLower.includes("brand new")) {
        condition = "new";
      } else if (titleLower.includes("nwot") || titleLower.includes("like new")) {
        condition = "like_new";
      }

      // Upgrade Depop image to full resolution (P10 -> P0)
      let imageUrl = listing.imageUrl;
      if (imageUrl && imageUrl.includes("/P10.jpg")) {
        imageUrl = imageUrl.replace("/P10.jpg", "/P0.jpg");
      } else if (imageUrl && imageUrl.includes("/P8.jpg")) {
        imageUrl = imageUrl.replace("/P8.jpg", "/P0.jpg");
      }

      products.push({
        name: listing.title,
        brand: query.split(" ")[0] || "Unknown",
        description: listing.title,
        price: Math.round(price * 100) / 100,
        category,
        gender: "women",
        condition,
        sourceUrl: listing.href || `https://www.depop.com/search/?q=${encodeURIComponent(query)}`,
        sourcePlatform: "Depop",
        imageUrl,
      });
    }
  } catch (error) {
    console.error("[Depop] Scrape error:", error);
  } finally {
    await browser.close();
  }

  return products;
}

// Scrape Phia (price comparison and secondhand aggregator)
async function scrapePhia(
  query: string,
  maxItems: number = 50
): Promise<ScrapedProduct[]> {
  const browser = await getBrowser();
  const products: ScrapedProduct[] = [];

  try {
    const page = await browser.newPage();

    await page.setViewport({ width: 1920, height: 1080 });
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    });

    await page.setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    // Hide automation
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });

    const url = `https://www.phia.com/search?q=${encodeURIComponent(query)}`;
    console.log(`[Phia] Navigating to: ${url}`);

    await page.goto(url, { waitUntil: "networkidle0", timeout: 45000 });

    // Wait for page to hydrate
    await new Promise(resolve => setTimeout(resolve, 4000));

    const pageTitle = await page.title();
    console.log(`[Phia] Page title: ${pageTitle}`);

    // Scroll to load more items
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => window.scrollBy(0, 800));
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Debug: count elements
    const counts = await page.evaluate(() => ({
      cards: document.querySelectorAll('[class*="card"], [class*="Card"], [class*="product"]').length,
      links: document.querySelectorAll('a[href*="/p/"], a[href*="/product/"]').length,
      images: document.querySelectorAll('img').length,
      articles: document.querySelectorAll('article').length,
      divs: document.querySelectorAll('div').length,
    }));
    console.log(`[Phia] Found: ${counts.cards} cards, ${counts.links} product links, ${counts.images} images, ${counts.divs} divs`);

    // Debug: Get DOM sample
    const debugInfo = await page.evaluate(() => {
      const imgs = document.querySelectorAll("img");
      const imgSamples = Array.from(imgs).slice(0, 3).map(img => ({
        alt: img.alt,
        src: img.src?.slice(0, 100),
      }));
      const allLinks = document.querySelectorAll("a");
      const linkSamples = Array.from(allLinks)
        .filter(a => a.href && a.href.length > 30)
        .slice(0, 5)
        .map(a => a.href);
      return { imgSamples, linkSamples, bodyText: document.body?.innerText?.slice(0, 500) };
    });
    console.log(`[Phia] Debug: images:`, JSON.stringify(debugInfo.imgSamples), `links:`, debugInfo.linkSamples.join(", "));
    console.log(`[Phia] Body text preview:`, debugInfo.bodyText?.slice(0, 200));

    // Extract product data
    const listings = await page.evaluate((max: number) => {
      const items: {
        title: string;
        price: string;
        brand?: string;
        platform?: string;
        imageUrl?: string;
        href?: string;
      }[] = [];

      const seen: Set<string> = new Set();

      // Strategy: Find images with alt text and walk up to find containers with prices
      const images = document.querySelectorAll("img[alt]");
      for (let i = 0; i < images.length && items.length < max; i++) {
        const img = images[i] as HTMLImageElement;
        const alt = img.alt || "";
        const src = img.src || "";

        // Skip small icons, logo images
        if (!alt || alt.length < 5) continue;
        if (src.includes("logo") || src.includes("icon") || src.includes("svg")) continue;

        // Walk up to find a container with price
        let container: HTMLElement | null = img;
        let href = "";
        for (let j = 0; j < 8 && container; j++) {
          container = container.parentElement;
          if (!container) break;

          // Check for link
          const linkEl = container.querySelector("a") as HTMLAnchorElement;
          if (linkEl?.href && linkEl.href.length > 20) {
            href = linkEl.href;
          }
          if (container.tagName === "A") {
            href = (container as HTMLAnchorElement).href;
          }

          // Check if this looks like a product card
          const hasPrice = container.textContent?.includes("$");
          if (hasPrice && href) break;
        }

        if (!container) continue;

        // Skip duplicates
        const key = href || alt;
        if (seen.has(key)) continue;
        seen.add(key);

        const title = alt;

        // Get price
        let price = "";
        const containerText = container.textContent || "";
        const priceMatch = containerText.match(/\$[\d,.]+/);
        if (priceMatch) {
          price = priceMatch[0];
        }

        if (!price) continue;

        // Determine platform
        let platform = "";
        if (href.includes("poshmark")) platform = "Poshmark";
        else if (href.includes("depop")) platform = "Depop";
        else if (href.includes("ebay")) platform = "eBay";
        else if (href.includes("mercari")) platform = "Mercari";
        else if (href.includes("therealreal")) platform = "TheRealReal";
        else if (href.includes("phia")) platform = "Phia";

        items.push({
          title,
          price,
          platform,
          imageUrl: src || undefined,
          href: href || undefined,
        });
      }

      return items;
    }, maxItems);

    console.log(`[Phia] Found ${listings.length} listings`);
    if (listings.length > 0) {
      console.log(`[Phia] Sample listing:`, JSON.stringify(listings[0]));
    }

    for (const listing of listings) {
      const priceMatch = listing.price.match(/\$?([\d,.]+)/);
      if (!priceMatch) continue;

      const price = parseFloat(priceMatch[1].replace(/,/g, ""));
      if (isNaN(price) || price <= 0) continue;

      // Determine category
      const titleLower = listing.title.toLowerCase();
      let category = "other";
      if (titleLower.includes("shoe") || titleLower.includes("boot") || titleLower.includes("sneaker")) {
        category = "shoes";
      } else if (titleLower.includes("jacket") || titleLower.includes("coat")) {
        category = "outerwear";
      } else if (titleLower.includes("dress")) {
        category = "dresses";
      } else if (titleLower.includes("pant") || titleLower.includes("jean") || titleLower.includes("short")) {
        category = "bottoms";
      } else if (titleLower.includes("shirt") || titleLower.includes("top") || titleLower.includes("tee") || titleLower.includes("blouse")) {
        category = "tops";
      } else if (titleLower.includes("bag") || titleLower.includes("purse")) {
        category = "bags";
      }

      // Determine condition
      let condition: "new" | "used" | "like_new" = "used";
      if (titleLower.includes("nwt") || titleLower.includes("new with tags")) {
        condition = "new";
      } else if (titleLower.includes("nwot") || titleLower.includes("like new")) {
        condition = "like_new";
      }

      products.push({
        name: listing.title,
        brand: query.split(" ")[0] || "Unknown",
        description: listing.title,
        price,
        category,
        gender: "women",
        condition,
        sourceUrl: listing.href || `https://www.phia.com/search?q=${encodeURIComponent(query)}`,
        sourcePlatform: listing.platform || "Phia",
        imageUrl: listing.imageUrl,
      });
    }
  } catch (error) {
    console.error("[Phia] Scrape error:", error);
  } finally {
    await browser.close();
  }

  return products;
}

// Scrape Gem.app (aggregates from multiple marketplaces)
async function scrapeGem(
  query: string,
  maxItems: number = 50
): Promise<ScrapedProduct[]> {
  const browser = await getBrowser();
  const products: ScrapedProduct[] = [];

  try {
    const page = await browser.newPage();

    await page.setViewport({ width: 1920, height: 1080 });
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    });

    await page.setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    // Hide automation
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });

    const url = `https://gem.app/search?q=${encodeURIComponent(query)}`;
    console.log(`[Gem] Navigating to: ${url}`);

    await page.goto(url, { waitUntil: "networkidle0", timeout: 45000 });

    // Wait for page to fully hydrate - Gem uses heavy client-side rendering
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Wait for product elements to appear
    await page.waitForSelector('img[alt*="dress"], img[alt*="Dress"], a[href*="/item/"]', { timeout: 10000 }).catch(() => {
      console.log("[Gem] No product elements found after waiting");
    });

    const pageTitle = await page.title();
    console.log(`[Gem] Page title: ${pageTitle}`);

    // Scroll to load more items
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => window.scrollBy(0, 800));
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Try to extract from window.__STATE__ first
    const stateData = await page.evaluate(() => {
      // @ts-ignore
      const state = window.__STATE__;
      if (!state) return null;

      // Look for search results in state
      for (const key of Object.keys(state)) {
        const value = state[key];
        if (value && typeof value === 'object') {
          // Look for arrays that might be search results
          for (const innerKey of Object.keys(value)) {
            const innerValue = value[innerKey];
            if (Array.isArray(innerValue) && innerValue.length > 0) {
              // Check if it looks like product data
              const first = innerValue[0];
              if (first && (first.title || first.name || first.price)) {
                return innerValue;
              }
            }
          }
        }
      }
      return null;
    });

    console.log(`[Gem] State data found: ${stateData ? stateData.length + ' items' : 'none'}`);

    // Debug: count elements on page
    const counts = await page.evaluate(() => ({
      cards: document.querySelectorAll('[class*="card"], [class*="Card"]').length,
      links: document.querySelectorAll('a[href*="/item/"], a[href*="/listing/"]').length,
      images: document.querySelectorAll('img[src*="gem"], img[alt]').length,
      articles: document.querySelectorAll('article').length,
      divs: document.querySelectorAll('div[role="listitem"], div[class*="item"]').length,
    }));
    console.log(`[Gem] Found: ${counts.cards} cards, ${counts.links} links, ${counts.images} images, ${counts.articles} articles, ${counts.divs} list items`);

    // Debug: dump DOM structure to understand layout
    const debugInfo = await page.evaluate(() => {
      // Look at all div with role or class containing "list"
      const listItems = document.querySelectorAll('div[role="listitem"], div[class*="item"]');
      const sampleContainer = listItems[0];
      if (sampleContainer) {
        return {
          sample: sampleContainer.outerHTML.slice(0, 1000),
          firstImgSrc: document.querySelector("img")?.src || "",
          allDivs: document.querySelectorAll("div").length,
          hasImages: document.querySelectorAll("img").length,
        };
      }
      return { sample: "none", allDivs: document.querySelectorAll("div").length };
    });
    console.log(`[Gem] Debug: ${debugInfo.allDivs} divs, ${debugInfo.hasImages} images, sample: ${debugInfo.sample?.slice(0, 200)}`);

    // Extract from DOM - try using image containers as anchors
    const listings = await page.evaluate((max: number) => {
      const items: {
        title: string;
        price: string;
        brand?: string;
        platform?: string;
        imageUrl?: string;
        href?: string;
      }[] = [];

      const seen: Set<string> = new Set();

      // Strategy 1: Find images and walk up to find product containers
      const images = document.querySelectorAll("img[alt]");
      for (let i = 0; i < images.length && items.length < max; i++) {
        const img = images[i] as HTMLImageElement;
        const alt = img.alt || "";
        const src = img.src || "";

        // Skip small icons, logo images, etc.
        if (!alt || alt.length < 5) continue;
        if (src.includes("logo") || src.includes("icon")) continue;

        // Walk up to find a container with a link
        let container: HTMLElement | null = img;
        let href = "";
        for (let j = 0; j < 8 && container; j++) {
          container = container.parentElement;
          if (!container) break;

          // Check for link
          const linkEl = container.querySelector("a") as HTMLAnchorElement;
          if (linkEl?.href) {
            href = linkEl.href;
          }
          if (container.tagName === "A") {
            href = (container as HTMLAnchorElement).href;
          }

          // Check if this looks like a product card (has both image and text)
          const hasText = container.textContent && container.textContent.length > 20;
          const hasPrice = container.textContent?.includes("$");
          if (hasText && hasPrice && href) break;
        }

        if (!container) continue;

        // Skip if we've already processed this item
        const key = href || alt;
        if (seen.has(key)) continue;
        seen.add(key);

        // Get title from alt text (preferred) or from container text
        let title = alt;

        // Get price
        let price = "";
        const allText = container.querySelectorAll("span, div, p");
        for (const el of allText) {
          const text = el.textContent?.trim() || "";
          // Match price pattern like $XX or $XX.XX
          const priceMatch = text.match(/^\$[\d,.]+$/);
          if (priceMatch) {
            price = priceMatch[0];
            break;
          }
        }

        // Also try finding $ anywhere in text
        if (!price) {
          const containerText = container.textContent || "";
          const priceMatch = containerText.match(/\$[\d,.]+/);
          if (priceMatch) {
            price = priceMatch[0];
          }
        }

        // Skip if no price
        if (!price) continue;

        // Try to determine platform from URL
        let platform = "";
        if (href.includes("poshmark")) platform = "Poshmark";
        else if (href.includes("depop")) platform = "Depop";
        else if (href.includes("ebay")) platform = "eBay";
        else if (href.includes("mercari")) platform = "Mercari";
        else if (href.includes("therealreal")) platform = "TheRealReal";
        else if (href.includes("grailed")) platform = "Grailed";
        else if (href.includes("gem.app")) platform = "Gem";

        items.push({
          title,
          price,
          platform,
          imageUrl: src || undefined,
          href: href || undefined,
        });
      }

      // Strategy 2: Find all links with prices nearby
      if (items.length < max / 2) {
        const links = document.querySelectorAll("a");
        for (let i = 0; i < links.length && items.length < max; i++) {
          const link = links[i] as HTMLAnchorElement;
          const href = link.href || "";

          // Skip already seen
          if (seen.has(href)) continue;

          // Skip nav/footer links
          if (!href || href.length < 20) continue;
          if (href.includes("#") || href.includes("mailto:")) continue;

          // Find container with price
          let container: HTMLElement | null = link;
          for (let j = 0; j < 5 && container; j++) {
            container = container.parentElement;
            if (!container) break;
            if (container.textContent?.includes("$")) break;
          }

          if (!container?.textContent?.includes("$")) continue;

          seen.add(href);

          // Get title
          let title = link.textContent?.trim() || "";
          const img = container.querySelector("img");
          if (!title && img?.alt) title = img.alt;
          if (!title || title.length < 5) continue;

          // Get price
          const containerText = container.textContent || "";
          const priceMatch = containerText.match(/\$[\d,.]+/);
          const price = priceMatch ? priceMatch[0] : "";
          if (!price) continue;

          // Skip if title looks like navigation
          if (title.toLowerCase().includes("sign in") || title.toLowerCase().includes("create account")) continue;

          let platform = "";
          if (href.includes("poshmark")) platform = "Poshmark";
          else if (href.includes("depop")) platform = "Depop";
          else if (href.includes("ebay")) platform = "eBay";
          else if (href.includes("mercari")) platform = "Mercari";

          items.push({
            title,
            price,
            platform,
            imageUrl: img?.src || undefined,
            href,
          });
        }
      }

      return items;
    }, maxItems);

    console.log(`[Gem] Found ${listings.length} listings`);
    if (listings.length > 0) {
      console.log(`[Gem] Sample listing:`, JSON.stringify(listings[0]));
    }

    for (const listing of listings) {
      const priceMatch = listing.price.match(/\$?([\d,.]+)/);
      if (!priceMatch) continue;

      const price = parseFloat(priceMatch[1].replace(/,/g, ""));
      if (isNaN(price) || price <= 0) continue;

      // Determine category
      const titleLower = listing.title.toLowerCase();
      let category = "other";
      if (titleLower.includes("shoe") || titleLower.includes("boot") || titleLower.includes("sneaker")) {
        category = "shoes";
      } else if (titleLower.includes("jacket") || titleLower.includes("coat")) {
        category = "outerwear";
      } else if (titleLower.includes("dress")) {
        category = "dresses";
      } else if (titleLower.includes("pant") || titleLower.includes("jean") || titleLower.includes("short")) {
        category = "bottoms";
      } else if (titleLower.includes("shirt") || titleLower.includes("top") || titleLower.includes("tee") || titleLower.includes("blouse")) {
        category = "tops";
      } else if (titleLower.includes("bag") || titleLower.includes("purse")) {
        category = "bags";
      }

      // Determine condition
      let condition: "new" | "used" | "like_new" = "used";
      if (titleLower.includes("nwt") || titleLower.includes("new with tags")) {
        condition = "new";
      } else if (titleLower.includes("nwot") || titleLower.includes("like new")) {
        condition = "like_new";
      }

      products.push({
        name: listing.title,
        brand: query.split(" ")[0] || "Unknown",
        description: listing.title,
        price,
        category,
        gender: "women",
        condition,
        sourceUrl: listing.href || `https://gem.app/search?q=${encodeURIComponent(query)}`,
        sourcePlatform: listing.platform || "Gem",
        imageUrl: listing.imageUrl,
      });
    }
  } catch (error) {
    console.error("[Gem] Scrape error:", error);
  } finally {
    await browser.close();
  }

  return products;
}

// Scrape eBay
async function scrapeEbay(
  query: string,
  maxItems: number = 30
): Promise<ScrapedProduct[]> {
  const browser = await getBrowser();
  const products: ScrapedProduct[] = [];

  try {
    const page = await browser.newPage();

    // Set viewport to realistic desktop size
    await page.setViewport({ width: 1920, height: 1080 });

    // Set more realistic headers
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Cache-Control': 'max-age=0',
    });

    await page.setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    // Emulate permissions - disable automation detection
    await page.evaluateOnNewDocument(() => {
      // Overwrite the navigator properties to hide automation
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
      // @ts-ignore
      window.chrome = { runtime: {} };
    });

    // Buy It Now only
    const url = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(query)}&_sacat=0&LH_BIN=1&rt=nc`;
    console.log(`[eBay] Navigating to: ${url}`);

    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });

    // Wait a bit for JavaScript to execute
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Debug: Log page title
    const pageTitle = await page.title();
    console.log(`[eBay] Page title: ${pageTitle}`);

    // Wait for search results to appear
    await page.waitForSelector(".srp-results, .s-item, [data-view]", { timeout: 10000 }).catch(() => {
      console.log("[eBay] No items found with any selector");
    });

    // Give more time for items to render
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log(`[eBay] Page ready, extracting data...`);

    // Debug: Count items found
    const counts = await page.evaluate(() => ({
      sItems: document.querySelectorAll(".s-item").length,
      links: document.querySelectorAll("a[href*='/itm/']").length,
      srpResults: document.querySelectorAll(".srp-results li").length,
    }));
    console.log(`[eBay] Found: ${counts.sItems} .s-item, ${counts.links} item links, ${counts.srpResults} srp results`);

    // Extract listing data using multiple strategies
    const listings = await page.evaluate((max: number) => {
      const items: {
        id: string;
        title: string;
        price: string;
        imageUrl?: string;
        condition?: string;
      }[] = [];

      const seen: {[key: string]: boolean} = {};

      // Strategy 1: Look for all item links and extract data from their containers
      const allLinks = document.querySelectorAll("a[href*='/itm/']");

      for (let i = 0; i < allLinks.length && items.length < max; i++) {
        const link = allLinks[i] as HTMLAnchorElement;
        const href = link.href || "";
        const match = href.match(/itm\/(\d+)/);
        if (!match) continue;

        const id = match[1];
        if (seen[id]) continue;
        seen[id] = true;

        // Find the item container - walk up until we find an li or div with data
        let container: HTMLElement | null = link;
        for (let j = 0; j < 10 && container; j++) {
          container = container.parentElement;
          if (!container) break;
          // Check if this container has price info
          const hasPrice = container.querySelector("[class*='price']");
          const hasTitle = container.querySelector("[class*='title'], h3, span");
          if (hasPrice && hasTitle) break;
        }

        if (!container) continue;

        // Get title from the container
        const titleEl = container.querySelector("[class*='title'], h3 span, .s-item__title");
        let title = titleEl?.textContent?.trim() || link.textContent?.trim() || "";

        // Clean up title - remove "Opens in new window" suffix
        title = title.replace(/Opens in a new window or tab$/i, "").trim();

        // Skip invalid titles
        if (!title || title.length < 5 || title.includes("Shop on eBay")) continue;

        // Get price
        const priceEl = container.querySelector("[class*='price'], .s-item__price");
        const price = priceEl?.textContent?.trim() || "";

        // Get image
        const imgEl = container.querySelector("img");
        const imageUrl = imgEl?.src || imgEl?.getAttribute("data-src") || "";

        // Get condition
        const condEl = container.querySelector("[class*='condition'], .SECONDARY_INFO");
        const condition = condEl?.textContent?.trim() || "";

        items.push({
          id,
          title,
          price,
          imageUrl: imageUrl || undefined,
          condition: condition || undefined
        });
      }

      return items;
    }, maxItems);

    console.log(`[eBay] Found ${listings.length} listings`);

    // Debug: Log first few listings
    if (listings.length > 0) {
      console.log(`[eBay] Sample listing:`, JSON.stringify(listings[0]));
    }

    for (const listing of listings) {
      const priceMatch = listing.price.match(/\$?([\d,.]+)/);
      if (!priceMatch) {
        console.log(`[eBay] No price match for: "${listing.price}"`);
        continue;
      }

      const price = parseFloat(priceMatch[1].replace(/,/g, ""));
      if (isNaN(price) || price <= 0) {
        console.log(`[eBay] Invalid price: ${price} from "${listing.price}"`);
        continue;
      }

      // Determine category
      const titleLower = listing.title.toLowerCase();
      let category = "other";
      if (titleLower.includes("shoe") || titleLower.includes("boot") || titleLower.includes("sneaker")) {
        category = "shoes";
      } else if (titleLower.includes("jacket") || titleLower.includes("coat")) {
        category = "outerwear";
      } else if (titleLower.includes("dress")) {
        category = "dresses";
      } else if (titleLower.includes("pant") || titleLower.includes("jean") || titleLower.includes("short")) {
        category = "bottoms";
      } else if (titleLower.includes("shirt") || titleLower.includes("top") || titleLower.includes("tee")) {
        category = "tops";
      } else if (titleLower.includes("bag") || titleLower.includes("purse")) {
        category = "bags";
      }

      // Determine condition
      let condition: "new" | "used" | "like_new" = "used";
      const condLower = (listing.condition || "").toLowerCase();
      if (condLower.includes("new with tags") || condLower.includes("brand new")) {
        condition = "new";
      } else if (condLower.includes("new without") || condLower.includes("like new") || condLower.includes("pre-owned")) {
        condition = "like_new";
      }

      products.push({
        name: listing.title,
        brand: query.split(" ")[0] || "Unknown",
        description: listing.title,
        price,
        category,
        condition,
        sourceUrl: `https://www.ebay.com/itm/${listing.id}`,
        sourcePlatform: "eBay",
        imageUrl: listing.imageUrl,
      });
    }
  } catch (error) {
    console.error("[eBay] Scrape error:", error);
  } finally {
    await browser.close();
  }

  return products;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { marketplace, query, maxItems = 30 } = body;

    if (!marketplace || !query) {
      return NextResponse.json(
        { error: "marketplace and query are required" },
        { status: 400 }
      );
    }

    console.log(`[API/scrape-marketplace] Scraping ${marketplace} for "${query}"...`);

    let products: ScrapedProduct[] = [];

    switch (marketplace.toLowerCase()) {
      case "poshmark":
        products = await scrapePoshmark(query, maxItems);
        break;
      case "therealreal":
        products = await scrapeTheRealReal(query, maxItems);
        break;
      case "ebay":
        products = await scrapeEbay(query, maxItems);
        break;
      case "gem":
        products = await scrapeGem(query, maxItems);
        break;
      case "phia":
        products = await scrapePhia(query, maxItems);
        break;
      case "depop":
        products = await scrapeDepop(query, maxItems);
        break;
      default:
        return NextResponse.json(
          { error: `Unknown marketplace: ${marketplace}` },
          { status: 400 }
        );
    }

    console.log(`[API/scrape-marketplace] Found ${products.length} products`);

    return NextResponse.json({
      success: true,
      marketplace,
      query,
      count: products.length,
      products,
    });
  } catch (error) {
    console.error("[API/scrape-marketplace] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to scrape" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    availableMarketplaces: ["poshmark", "therealreal", "ebay", "depop", "gem", "phia"],
    usage: "POST { marketplace: 'poshmark', query: 'everlane dress', maxItems: 30 }",
    note: "poshmark, ebay, and depop work best. gem and phia have bot detection.",
  });
}
