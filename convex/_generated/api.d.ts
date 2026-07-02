/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as games from "../games.js";
import type * as http from "../http.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_games from "../lib/games.js";
import type * as lib_rooms from "../lib/rooms.js";
import type * as lib_rules_cards from "../lib/rules/cards.js";
import type * as lib_rules_contracts from "../lib/rules/contracts.js";
import type * as lib_rules_engine from "../lib/rules/engine.js";
import type * as lib_rules_index from "../lib/rules/index.js";
import type * as lib_rules_layoffs from "../lib/rules/layoffs.js";
import type * as lib_rules_melds from "../lib/rules/melds.js";
import type * as lib_rules_scoring from "../lib/rules/scoring.js";
import type * as lib_rules_types from "../lib/rules/types.js";
import type * as lib_rules_validators from "../lib/rules/validators.js";
import type * as rooms from "../rooms.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  games: typeof games;
  http: typeof http;
  "lib/auth": typeof lib_auth;
  "lib/games": typeof lib_games;
  "lib/rooms": typeof lib_rooms;
  "lib/rules/cards": typeof lib_rules_cards;
  "lib/rules/contracts": typeof lib_rules_contracts;
  "lib/rules/engine": typeof lib_rules_engine;
  "lib/rules/index": typeof lib_rules_index;
  "lib/rules/layoffs": typeof lib_rules_layoffs;
  "lib/rules/melds": typeof lib_rules_melds;
  "lib/rules/scoring": typeof lib_rules_scoring;
  "lib/rules/types": typeof lib_rules_types;
  "lib/rules/validators": typeof lib_rules_validators;
  rooms: typeof rooms;
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
