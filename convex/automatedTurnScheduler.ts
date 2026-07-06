import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { activeAutomatedPlayerId } from "./lib/rules/automated";
import type { GameState } from "./lib/rules";

export const AUTOMATED_TURN_DELAY_MS = 900;

export async function scheduleAutomatedTurnIfNeeded(
  ctx: MutationCtx,
  gameId: Id<"games">,
  state: GameState,
) {
  const automatedPlayerId = activeAutomatedPlayerId(state);
  if (!automatedPlayerId) {
    return;
  }

  await ctx.scheduler.runAfter(AUTOMATED_TURN_DELAY_MS, internal.automatedTurns.runStep, {
    gameId,
    expectedPlayerId: automatedPlayerId,
  });
}
