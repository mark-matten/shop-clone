import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Run price check every 12 hours
crons.interval(
  "check tracked prices",
  { hours: 12 },
  internal.priceChecker.checkAllTrackedPrices
);

export default crons;
