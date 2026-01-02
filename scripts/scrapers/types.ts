// Variant type for size/color availability
export interface ProductVariant {
  id: string;
  title: string; // e.g., "31 / 28" or "M"
  available: boolean;
  price?: number;
  option1?: string; // e.g., waist size "31"
  option2?: string; // e.g., length "28"
  option3?: string;
}

// Option type for product options (Size, Waist, Length, etc.)
export interface ProductOption {
  name: string; // e.g., "Waist", "Length", "Size"
  values: string[]; // e.g., ["28", "29", "30", ...]
}

// Product type for scraped data
export interface ScrapedProduct {
  name: string;
  description: string;
  brand: string;
  price: number;
  originalPrice?: number; // For sale items - the original/compare-at price
  material?: string;
  size?: string;
  sizes?: string[]; // All available sizes (legacy)
  // Variant data
  variants?: ProductVariant[];
  options?: ProductOption[];
  // Color grouping
  colorGroupId?: string; // YGroup ID to link related colors
  colorName?: string; // e.g., "Graphite", "Black"
  colorHex?: string; // e.g., "#4a4a4a"
  category: string;
  gender?: "men" | "women" | "unisex";
  condition: "new" | "used" | "like_new";
  sourceUrl: string;
  sourcePlatform: string;
  imageUrl?: string;
  imageUrls?: string[];
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
