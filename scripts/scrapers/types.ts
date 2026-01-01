// Product type for scraped data
export interface ScrapedProduct {
  name: string;
  description: string;
  brand: string;
  price: number;
  material?: string;
  size?: string;
  category: string;
  gender?: "men" | "women" | "unisex";
  condition: "new" | "used" | "like_new";
  sourceUrl: string;
  sourcePlatform: string;
  imageUrl?: string;
}

export interface ScraperResult {
  products: ScrapedProduct[];
  source: string;
  scrapedAt: Date;
  errors?: string[];
}

export interface ScraperConfig {
  maxProducts?: number;
  categories?: string[];
  searchTerms?: string[];
}
