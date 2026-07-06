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
import type * as automatedTurnScheduler from "../automatedTurnScheduler.js";
import type * as automatedTurns from "../automatedTurns.js";
import type * as games from "../games.js";
import type * as http from "../http.js";
import type * as lib_accountLinking from "../lib/accountLinking.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_automatedPlayers from "../lib/automatedPlayers.js";
import type * as lib_createOrUpdateUser from "../lib/createOrUpdateUser.js";
import type * as lib_displayName from "../lib/displayName.js";
import type * as lib_games from "../lib/games.js";
import type * as lib_mergeGuestUserData from "../lib/mergeGuestUserData.js";
import type * as lib_microsoftProvider from "../lib/microsoftProvider.js";
import type * as lib_persistGame from "../lib/persistGame.js";
import type * as lib_playerPreferences from "../lib/playerPreferences.js";
import type * as lib_rooms from "../lib/rooms.js";
import type * as lib_rules_automated from "../lib/rules/automated.js";
import type * as lib_rules_automatedOpening from "../lib/rules/automatedOpening.js";
import type * as lib_rules_cards from "../lib/rules/cards.js";
import type * as lib_rules_contracts from "../lib/rules/contracts.js";
import type * as lib_rules_engine from "../lib/rules/engine.js";
import type * as lib_rules_index from "../lib/rules/index.js";
import type * as lib_rules_layoffs from "../lib/rules/layoffs.js";
import type * as lib_rules_melds from "../lib/rules/melds.js";
import type * as lib_rules_rummy from "../lib/rules/rummy.js";
import type * as lib_rules_scoring from "../lib/rules/scoring.js";
import type * as lib_rules_types from "../lib/rules/types.js";
import type * as lib_rules_validators from "../lib/rules/validators.js";
import type * as lib_substitution from "../lib/substitution.js";
import type * as lib_userByVerifiedEmail from "../lib/userByVerifiedEmail.js";
import type * as lib_yahooProvider from "../lib/yahooProvider.js";
import type * as practice from "../practice.js";
import type * as rooms from "../rooms.js";
import type * as stockReshuffle from "../stockReshuffle.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  automatedTurnScheduler: typeof automatedTurnScheduler;
  automatedTurns: typeof automatedTurns;
  games: typeof games;
  http: typeof http;
  "lib/accountLinking": typeof lib_accountLinking;
  "lib/auth": typeof lib_auth;
  "lib/automatedPlayers": typeof lib_automatedPlayers;
  "lib/createOrUpdateUser": typeof lib_createOrUpdateUser;
  "lib/displayName": typeof lib_displayName;
  "lib/games": typeof lib_games;
  "lib/mergeGuestUserData": typeof lib_mergeGuestUserData;
  "lib/microsoftProvider": typeof lib_microsoftProvider;
  "lib/persistGame": typeof lib_persistGame;
  "lib/playerPreferences": typeof lib_playerPreferences;
  "lib/rooms": typeof lib_rooms;
  "lib/rules/automated": typeof lib_rules_automated;
  "lib/rules/automatedOpening": typeof lib_rules_automatedOpening;
  "lib/rules/cards": typeof lib_rules_cards;
  "lib/rules/contracts": typeof lib_rules_contracts;
  "lib/rules/engine": typeof lib_rules_engine;
  "lib/rules/index": typeof lib_rules_index;
  "lib/rules/layoffs": typeof lib_rules_layoffs;
  "lib/rules/melds": typeof lib_rules_melds;
  "lib/rules/rummy": typeof lib_rules_rummy;
  "lib/rules/scoring": typeof lib_rules_scoring;
  "lib/rules/types": typeof lib_rules_types;
  "lib/rules/validators": typeof lib_rules_validators;
  "lib/substitution": typeof lib_substitution;
  "lib/userByVerifiedEmail": typeof lib_userByVerifiedEmail;
  "lib/yahooProvider": typeof lib_yahooProvider;
  practice: typeof practice;
  rooms: typeof rooms;
  stockReshuffle: typeof stockReshuffle;
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
