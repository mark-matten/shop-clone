export const mockProducts = [
  {
    _id: "mock_1",
    name: "Women's Black Leather Ankle Boots",
    description: "Classic black leather ankle boots with block heel",
    brand: "Sam Edelman",
    price: 149.99,
    material: "Leather",
    size: "8",
    category: "boots",
    gender: "women" as const,
    condition: "new" as const,
    sourceUrl: "https://example.com/boots-1",
    sourcePlatform: "Poshmark",
    imageUrl: "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=400&h=400&fit=crop",
  },
  {
    _id: "mock_2",
    name: "Vintage Levi's 501 Denim Jacket",
    description: "Classic vintage Levi's trucker jacket in medium wash",
    brand: "Levi's",
    price: 89.00,
    material: "Denim",
    size: "M",
    category: "jacket",
    gender: "unisex" as const,
    condition: "used" as const,
    sourceUrl: "https://example.com/jacket-1",
    sourcePlatform: "eBay",
    imageUrl: "https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=400&h=400&fit=crop",
  },
  {
    _id: "mock_3",
    name: "Gucci Marmont Shoulder Bag",
    description: "GG Marmont small matelassé shoulder bag in black",
    brand: "Gucci",
    price: 1450.00,
    material: "Leather",
    size: undefined,
    category: "bag",
    gender: "women" as const,
    condition: "like_new" as const,
    sourceUrl: "https://example.com/bag-1",
    sourcePlatform: "TheRealReal",
    imageUrl: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=400&h=400&fit=crop",
  },
  {
    _id: "mock_4",
    name: "Nike Air Max 90 Running Shoes",
    description: "Classic Nike Air Max 90 in white/black colorway",
    brand: "Nike",
    price: 129.99,
    material: "Mesh/Leather",
    size: "10",
    category: "sneakers",
    gender: "men" as const,
    condition: "new" as const,
    sourceUrl: "https://example.com/shoes-1",
    sourcePlatform: "eBay",
    imageUrl: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=400&fit=crop",
  },
  {
    _id: "mock_5",
    name: "Cashmere Crewneck Sweater",
    description: "Luxurious 100% cashmere crewneck in navy blue",
    brand: "Everlane",
    price: 165.00,
    material: "Cashmere",
    size: "L",
    category: "sweater",
    gender: "men" as const,
    condition: "new" as const,
    sourceUrl: "https://example.com/sweater-1",
    sourcePlatform: "Poshmark",
    imageUrl: "https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=400&h=400&fit=crop",
  },
  {
    _id: "mock_6",
    name: "Reformation Midi Dress",
    description: "Floral print midi dress with adjustable straps",
    brand: "Reformation",
    price: 178.00,
    material: "Viscose",
    size: "S",
    category: "dress",
    gender: "women" as const,
    condition: "like_new" as const,
    sourceUrl: "https://example.com/dress-1",
    sourcePlatform: "TheRealReal",
    imageUrl: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400&h=400&fit=crop",
  },
];

export type MockProduct = typeof mockProducts[number];

// Simple mock search function
export function mockSearch(searchText: string) {
  const query = searchText.toLowerCase();

  // Parse simple filters from query
  const filter: Record<string, unknown> = { query: searchText };

  if (query.includes("women")) filter.gender = "women";
  if (query.includes("men") && !query.includes("women")) filter.gender = "men";
  if (query.includes("under $")) {
    const match = query.match(/under \$(\d+)/);
    if (match) filter.maxPrice = parseInt(match[1]);
  }
  if (query.includes("over $")) {
    const match = query.match(/over \$(\d+)/);
    if (match) filter.minPrice = parseInt(match[1]);
  }

  // Filter products
  let results = mockProducts.filter((product) => {
    const searchableText = `${product.name} ${product.description} ${product.brand} ${product.category} ${product.material}`.toLowerCase();
    const matchesQuery = searchableText.includes(query.split(" ")[0]);

    if (filter.gender && product.gender !== filter.gender) return false;
    if (filter.maxPrice && product.price > (filter.maxPrice as number)) return false;
    if (filter.minPrice && product.price < (filter.minPrice as number)) return false;

    return matchesQuery || Object.keys(filter).length > 1;
  });

  // If no specific matches, return all products
  if (results.length === 0) {
    results = mockProducts;
  }

  return {
    products: results,
    filter,
    totalResults: results.length,
  };
}
