/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as alerts from "../alerts.js";
import type * as analytics from "../analytics.js";
import type * as closet from "../closet.js";
import type * as collections from "../collections.js";
import type * as coupons from "../coupons.js";
import type * as crons from "../crons.js";
import type * as dashboard from "../dashboard.js";
import type * as favorites from "../favorites.js";
import type * as http from "../http.js";
import type * as priceChecker from "../priceChecker.js";
import type * as products from "../products.js";
import type * as recommendations from "../recommendations.js";
import type * as referrals from "../referrals.js";
import type * as savedSearches from "../savedSearches.js";
import type * as scraper from "../scraper.js";
import type * as search from "../search.js";
import type * as searchHistory from "../searchHistory.js";
import type * as tracking from "../tracking.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  alerts: typeof alerts;
  analytics: typeof analytics;
  closet: typeof closet;
  collections: typeof collections;
  coupons: typeof coupons;
  crons: typeof crons;
  dashboard: typeof dashboard;
  favorites: typeof favorites;
  http: typeof http;
  priceChecker: typeof priceChecker;
  products: typeof products;
  recommendations: typeof recommendations;
  referrals: typeof referrals;
  savedSearches: typeof savedSearches;
  scraper: typeof scraper;
  search: typeof search;
  searchHistory: typeof searchHistory;
  tracking: typeof tracking;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
