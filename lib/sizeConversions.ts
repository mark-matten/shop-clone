// Size conversion data for shoes and clothing
// Sources: International sizing standards

export type SizeSystem = "US" | "UK" | "EU";
export type Gender = "men" | "women";
export type ClothingType = "shoes" | "tops" | "bottoms" | "dresses";

interface SizeConversion {
  US: string;
  UK: string;
  EU: string;
}

// Women's shoe sizes
export const womenShoesSizes: SizeConversion[] = [
  { US: "5", UK: "2.5", EU: "35" },
  { US: "5.5", UK: "3", EU: "35.5" },
  { US: "6", UK: "3.5", EU: "36" },
  { US: "6.5", UK: "4", EU: "36.5" },
  { US: "7", UK: "4.5", EU: "37" },
  { US: "7.5", UK: "5", EU: "37.5" },
  { US: "8", UK: "5.5", EU: "38" },
  { US: "8.5", UK: "6", EU: "38.5" },
  { US: "9", UK: "6.5", EU: "39" },
  { US: "9.5", UK: "7", EU: "39.5" },
  { US: "10", UK: "7.5", EU: "40" },
  { US: "10.5", UK: "8", EU: "40.5" },
  { US: "11", UK: "8.5", EU: "41" },
  { US: "11.5", UK: "9", EU: "41.5" },
  { US: "12", UK: "9.5", EU: "42" },
];

// Men's shoe sizes
export const menShoesSizes: SizeConversion[] = [
  { US: "6", UK: "5.5", EU: "39" },
  { US: "6.5", UK: "6", EU: "39.5" },
  { US: "7", UK: "6.5", EU: "40" },
  { US: "7.5", UK: "7", EU: "40.5" },
  { US: "8", UK: "7.5", EU: "41" },
  { US: "8.5", UK: "8", EU: "41.5" },
  { US: "9", UK: "8.5", EU: "42" },
  { US: "9.5", UK: "9", EU: "42.5" },
  { US: "10", UK: "9.5", EU: "43" },
  { US: "10.5", UK: "10", EU: "43.5" },
  { US: "11", UK: "10.5", EU: "44" },
  { US: "11.5", UK: "11", EU: "44.5" },
  { US: "12", UK: "11.5", EU: "45" },
  { US: "12.5", UK: "12", EU: "45.5" },
  { US: "13", UK: "12.5", EU: "46" },
  { US: "14", UK: "13.5", EU: "47" },
  { US: "15", UK: "14.5", EU: "48" },
];

// Women's tops/general clothing sizes
export const womenTopsSizes: SizeConversion[] = [
  { US: "0", UK: "4", EU: "32" },
  { US: "2", UK: "6", EU: "34" },
  { US: "4", UK: "8", EU: "36" },
  { US: "6", UK: "10", EU: "38" },
  { US: "8", UK: "12", EU: "40" },
  { US: "10", UK: "14", EU: "42" },
  { US: "12", UK: "16", EU: "44" },
  { US: "14", UK: "18", EU: "46" },
  { US: "16", UK: "20", EU: "48" },
  { US: "18", UK: "22", EU: "50" },
  { US: "20", UK: "24", EU: "52" },
];

// Women's letter sizes mapping
export const womenLetterSizes: { letter: string; usNumeric: string[] }[] = [
  { letter: "XXS", usNumeric: ["0"] },
  { letter: "XS", usNumeric: ["0", "2"] },
  { letter: "S", usNumeric: ["4", "6"] },
  { letter: "M", usNumeric: ["8", "10"] },
  { letter: "L", usNumeric: ["12", "14"] },
  { letter: "XL", usNumeric: ["16", "18"] },
  { letter: "XXL", usNumeric: ["20"] },
];

// Men's tops sizes
export const menTopsSizes: SizeConversion[] = [
  { US: "XS", UK: "34", EU: "44" },
  { US: "S", UK: "36", EU: "46" },
  { US: "M", UK: "38-40", EU: "48-50" },
  { US: "L", UK: "42-44", EU: "52-54" },
  { US: "XL", UK: "46", EU: "56" },
  { US: "XXL", UK: "48", EU: "58" },
];

// Women's bottoms (pants) - waist sizes
export const womenBottomsSizes: SizeConversion[] = [
  { US: "24", UK: "6", EU: "32" },
  { US: "25", UK: "6", EU: "34" },
  { US: "26", UK: "8", EU: "36" },
  { US: "27", UK: "10", EU: "38" },
  { US: "28", UK: "10", EU: "38" },
  { US: "29", UK: "12", EU: "40" },
  { US: "30", UK: "12", EU: "40" },
  { US: "31", UK: "14", EU: "42" },
  { US: "32", UK: "14", EU: "44" },
  { US: "33", UK: "16", EU: "46" },
  { US: "34", UK: "18", EU: "48" },
];

// Men's bottoms (pants) - waist sizes
export const menBottomsSizes: SizeConversion[] = [
  { US: "28", UK: "28", EU: "44" },
  { US: "29", UK: "29", EU: "44" },
  { US: "30", UK: "30", EU: "46" },
  { US: "31", UK: "31", EU: "46" },
  { US: "32", UK: "32", EU: "48" },
  { US: "33", UK: "33", EU: "48" },
  { US: "34", UK: "34", EU: "50" },
  { US: "36", UK: "36", EU: "52" },
  { US: "38", UK: "38", EU: "54" },
  { US: "40", UK: "40", EU: "56" },
];

// Women's dress sizes
export const womenDressSizes: SizeConversion[] = [
  { US: "0", UK: "4", EU: "30" },
  { US: "2", UK: "6", EU: "32" },
  { US: "4", UK: "8", EU: "34" },
  { US: "6", UK: "10", EU: "36" },
  { US: "8", UK: "12", EU: "38" },
  { US: "10", UK: "14", EU: "40" },
  { US: "12", UK: "16", EU: "42" },
  { US: "14", UK: "18", EU: "44" },
  { US: "16", UK: "20", EU: "46" },
  { US: "18", UK: "22", EU: "48" },
];

// Get the appropriate size chart
export function getSizeChart(
  gender: Gender,
  clothingType: ClothingType
): SizeConversion[] {
  if (gender === "women") {
    switch (clothingType) {
      case "shoes":
        return womenShoesSizes;
      case "tops":
        return womenTopsSizes;
      case "bottoms":
        return womenBottomsSizes;
      case "dresses":
        return womenDressSizes;
    }
  } else {
    switch (clothingType) {
      case "shoes":
        return menShoesSizes;
      case "tops":
        return menTopsSizes;
      case "bottoms":
        return menBottomsSizes;
      case "dresses":
        return []; // Men don't have dress sizes
    }
  }
}

// Convert a size from one system to another
export function convertSize(
  size: string,
  fromSystem: SizeSystem,
  toSystem: SizeSystem,
  gender: Gender,
  clothingType: ClothingType
): string | null {
  const chart = getSizeChart(gender, clothingType);
  const entry = chart.find(
    (s) => s[fromSystem].toLowerCase() === size.toLowerCase()
  );
  return entry ? entry[toSystem] : null;
}

// Find all matching sizes for a given size
export function findMatchingSizes(
  size: string,
  system: SizeSystem,
  gender: Gender,
  clothingType: ClothingType
): SizeConversion | null {
  const chart = getSizeChart(gender, clothingType);
  return (
    chart.find((s) => s[system].toLowerCase() === size.toLowerCase()) || null
  );
}

// Get letter size equivalent for women's numeric size
export function getLetterSize(usNumericSize: string): string | null {
  for (const mapping of womenLetterSizes) {
    if (mapping.usNumeric.includes(usNumericSize)) {
      return mapping.letter;
    }
  }
  return null;
}

// Get numeric size range for a letter size
export function getNumericFromLetter(letter: string): string[] | null {
  const mapping = womenLetterSizes.find(
    (m) => m.letter.toLowerCase() === letter.toLowerCase()
  );
  return mapping ? mapping.usNumeric : null;
}
