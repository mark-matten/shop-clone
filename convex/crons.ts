import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Run price check every 12 hours
crons.interval(
  "check tracked prices",
  { hours: 12 },
  internal.priceChecker.checkAllTrackedPrices
);

// Run legacy scrapers every 6 hours to update inventory
crons.interval(
  "update inventory from scrapers",
  { hours: 6 },
  internal.scraper.runScrapers
);

// Run product scrapers daily to discover new products
crons.daily(
  "scrape brand catalogs and marketplaces",
  { hourUTC: 6, minuteUTC: 0 }, // 6 AM UTC
  internal.productScraper.runAllScrapers,
  {} // empty args
);

export default crons;
