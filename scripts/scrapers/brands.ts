import puppeteer, { Browser, Page } from "puppeteer";
import type { ScrapedProduct, ScraperResult, ScraperConfig } from "./types";

interface BrandConfig {
  name: string;
  baseUrl: string;
  categories: { url: string; category: string; gender?: "men" | "women" | "unisex" }[];
  selectors: {
    productCard: string;
    name: string;
    price: string;
    link: string;
    image: string;
    brand?: string;
  };
}

const BRAND_CONFIGS: BrandConfig[] = [
  {
    name: "J.Crew",
    baseUrl: "https://www.jcrew.com",
    categories: [
      { url: "/c/womens_category/sweaters", category: "sweaters", gender: "women" },
      { url: "/c/womens_category/dresses", category: "dresses", gender: "women" },
      { url: "/c/womens_category/blazers", category: "outerwear", gender: "women" },
      { url: "/c/mens_category/sweaters", category: "sweaters", gender: "men" },
      { url: "/c/mens_category/shirts", category: "tops", gender: "men" },
    ],
    selectors: {
      productCard: "[data-testid='product-card'], .product-tile, .c-product-tile",
      name: ".product-tile__name, .c-product-tile__name, [class*='name']",
      price: ".product-tile__price, .c-product-tile__price, [class*='price']",
      link: "a",
      image: "img",
    },
  },
  {
    name: "GAP",
    baseUrl: "https://www.gap.com",
    categories: [
      { url: "/browse/category.do?cid=5736", category: "dresses", gender: "women" },
      { url: "/browse/category.do?cid=5739", category: "tops", gender: "women" },
      { url: "/browse/category.do?cid=6998", category: "jeans", gender: "women" },
      { url: "/browse/category.do?cid=65289", category: "tops", gender: "men" },
      { url: "/browse/category.do?cid=65290", category: "pants", gender: "men" },
    ],
    selectors: {
      productCard: ".product-card, [data-testid='product-card'], .cat-product-card",
      name: ".product-card__name, [class*='product-name'], [class*='ProductName']",
      price: ".product-card__price, [class*='product-price'], [class*='Price']",
      link: "a",
      image: "img",
    },
  },
  {
    name: "Banana Republic",
    baseUrl: "https://bananarepublic.gap.com",
    categories: [
      { url: "/browse/category.do?cid=69883", category: "dresses", gender: "women" },
      { url: "/browse/category.do?cid=35286", category: "pants", gender: "women" },
      { url: "/browse/category.do?cid=32643", category: "shirts", gender: "men" },
      { url: "/browse/category.do?cid=32641", category: "suits", gender: "men" },
    ],
    selectors: {
      productCard: ".product-card, [data-testid='product-card']",
      name: ".product-card__name, [class*='product-name']",
      price: ".product-card__price, [class*='product-price']",
      link: "a",
      image: "img",
    },
  },
  {
    name: "Madewell",
    baseUrl: "https://www.madewell.com",
    categories: [
      { url: "/c/womens_category/jeans", category: "jeans", gender: "women" },
      { url: "/c/womens_category/dresses", category: "dresses", gender: "women" },
      { url: "/c/womens_category/sweaters", category: "sweaters", gender: "women" },
      { url: "/c/womens_category/tees_702", category: "tops", gender: "women" },
    ],
    selectors: {
      productCard: "[data-testid='product-card'], .product-tile, .c-product-tile",
      name: ".product-tile__name, [class*='name']",
      price: ".product-tile__price, [class*='price']",
      link: "a",
      image: "img",
    },
  },
  {
    name: "Anthropologie",
    baseUrl: "https://www.anthropologie.com",
    categories: [
      { url: "/shop/dresses", category: "dresses", gender: "women" },
      { url: "/shop/tops", category: "tops", gender: "women" },
      { url: "/shop/sweaters", category: "sweaters", gender: "women" },
      { url: "/shop/jackets-coats", category: "outerwear", gender: "women" },
    ],
    selectors: {
      productCard: ".c-pwa-tile, [class*='product-tile'], .o-pwa-product-tile",
      name: ".c-pwa-tile__name, [class*='product-name']",
      price: ".c-pwa-tile__price, [class*='price']",
      link: "a",
      image: "img",
    },
  },
  {
    name: "Everlane",
    baseUrl: "https://www.everlane.com",
    categories: [
      { url: "/collections/womens-sweaters", category: "sweaters", gender: "women" },
      { url: "/collections/womens-dresses", category: "dresses", gender: "women" },
      { url: "/collections/womens-denim", category: "jeans", gender: "women" },
      { url: "/collections/mens-sweaters", category: "sweaters", gender: "men" },
      { url: "/collections/mens-tees", category: "tops", gender: "men" },
    ],
    selectors: {
      productCard: "[data-testid='product-card'], .product-card, [class*='ProductCard']",
      name: "[class*='product-name'], [class*='ProductName'], h3",
      price: "[class*='price'], [class*='Price']",
      link: "a",
      image: "img",
    },
  },
  {
    name: "Reformation",
    baseUrl: "https://www.thereformation.com",
    categories: [
      { url: "/dresses", category: "dresses", gender: "women" },
      { url: "/tops", category: "tops", gender: "women" },
      { url: "/jeans", category: "jeans", gender: "women" },
      { url: "/sweaters", category: "sweaters", gender: "women" },
    ],
    selectors: {
      productCard: ".product-tile, [class*='product-card'], [class*='ProductCard']",
      name: ".product-tile__name, [class*='product-name']",
      price: ".product-tile__price, [class*='price']",
      link: "a",
      image: "img",
    },
  },
  {
    name: "Free People",
    baseUrl: "https://www.freepeople.com",
    categories: [
      { url: "/shop/dresses", category: "dresses", gender: "women" },
      { url: "/shop/tops", category: "tops", gender: "women" },
      { url: "/shop/sweaters", category: "sweaters", gender: "women" },
      { url: "/shop/jackets", category: "outerwear", gender: "women" },
    ],
    selectors: {
      productCard: ".c-pwa-tile, [class*='product-tile']",
      name: ".c-pwa-tile__name, [class*='product-name']",
      price: ".c-pwa-tile__price, [class*='price']",
      link: "a",
      image: "img",
    },
  },
];

function parsePrice(priceStr: string): number {
  const match = priceStr.match(/[\d,]+\.?\d*/);
  if (match) {
    return parseFloat(match[0].replace(",", ""));
  }
  return 0;
}

async function scrapeBrandPage(
  browser: Browser,
  brand: BrandConfig,
  categoryConfig: { url: string; category: string; gender?: "men" | "women" | "unisex" },
  maxProducts: number
): Promise<ScrapedProduct[]> {
  const products: ScrapedProduct[] = [];
  let page: Page | null = null;

  try {
    page = await browser.newPage();

    // Set a realistic viewport and user agent
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    const url = `${brand.baseUrl}${categoryConfig.url}`;
    console.log(`    Loading: ${url}`);

    await page.goto(url, {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    // Wait for products to load
    await page.waitForSelector(brand.selectors.productCard, { timeout: 10000 }).catch(() => {
      console.log(`    No products found with selector: ${brand.selectors.productCard}`);
    });

    // Scroll to load more products
    await page.evaluate(() => {
      window.scrollBy(0, window.innerHeight * 2);
    });
    await new Promise((r) => setTimeout(r, 2000));

    // Extract product data
    const productData = await page.evaluate(
      (selectors: typeof brand.selectors) => {
        const items: {
          name: string;
          price: string;
          link: string;
          image: string;
        }[] = [];

        document.querySelectorAll(selectors.productCard).forEach((card) => {
          const nameEl = card.querySelector(selectors.name);
          const priceEl = card.querySelector(selectors.price);
          const linkEl = card.querySelector(selectors.link) as HTMLAnchorElement;
          const imgEl = card.querySelector(selectors.image) as HTMLImageElement;

          if (nameEl && priceEl && linkEl) {
            items.push({
              name: nameEl.textContent?.trim() || "",
              price: priceEl.textContent?.trim() || "",
              link: linkEl.href || "",
              image: imgEl?.src || imgEl?.dataset?.src || "",
            });
          }
        });

        return items;
      },
      brand.selectors
    );

    for (const item of productData.slice(0, maxProducts)) {
      const price = parsePrice(item.price);
      if (price <= 0 || !item.name) continue;

      products.push({
        name: item.name,
        description: `${item.name} from ${brand.name}`,
        brand: brand.name,
        price,
        category: categoryConfig.category,
        gender: categoryConfig.gender,
        condition: "new",
        sourceUrl: item.link,
        sourcePlatform: brand.name,
        imageUrl: item.image,
      });
    }
  } catch (error) {
    console.log(`    Error: ${error}`);
  } finally {
    if (page) await page.close();
  }

  return products;
}

export async function scrapeBrands(config: ScraperConfig = {}): Promise<ScraperResult> {
  const maxProducts = config.maxProducts || 200;
  const productsPerBrand = Math.ceil(maxProducts / BRAND_CONFIGS.length);

  const products: ScrapedProduct[] = [];
  const errors: string[] = [];

  console.log("Starting brand scrapers...");
  console.log(`  Scraping ${BRAND_CONFIGS.length} brands, ~${productsPerBrand} products each`);

  let browser: Browser | null = null;

  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    });

    for (const brand of BRAND_CONFIGS) {
      if (products.length >= maxProducts) break;

      console.log(`  Scraping ${brand.name}...`);
      const brandProducts: ScrapedProduct[] = [];

      for (const category of brand.categories) {
        if (brandProducts.length >= productsPerBrand) break;

        try {
          const categoryProducts = await scrapeBrandPage(
            browser,
            brand,
            category,
            productsPerBrand - brandProducts.length
          );
          brandProducts.push(...categoryProducts);

          // Rate limiting between categories
          await new Promise((r) => setTimeout(r, 2000));
        } catch (error) {
          errors.push(`${brand.name} - ${category.category}: ${error}`);
        }
      }

      products.push(...brandProducts);
      console.log(`    Found ${brandProducts.length} products from ${brand.name}`);

      // Rate limiting between brands
      await new Promise((r) => setTimeout(r, 3000));
    }
  } catch (error) {
    errors.push(`Browser error: ${error}`);
  } finally {
    if (browser) await browser.close();
  }

  console.log(`Brands: Found ${products.length} total products`);

  return {
    products,
    source: "Brand Websites",
    scrapedAt: new Date(),
    errors: errors.length > 0 ? errors : undefined,
  };
}
