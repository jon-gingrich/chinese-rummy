import { formatContract } from "../../convex/lib/rules/contracts";

export type RulesSection = {
  id: string;
  title: string;
  body: string;
};

const CONTEXT_CONTRACT_LABELS: Record<number, string> = {
  1: "2 sets of 3",
  2: "2 runs of 3",
  3: "1 set of 3, 1 run of 4",
  4: "2 sets of 4",
  5: "2 runs of 4",
  6: "1 set of 4, 1 run of 5",
  7: "2 sets of 5",
  8: "2 runs of 5",
  9: "1 set of 3, 1 run of 7",
  10: "2 sets of 3, 1 run of 7",
};

const CONTRACT_ROWS = Array.from({ length: 10 }, (_, index) => {
  const round = index + 1;
  const label = CONTEXT_CONTRACT_LABELS[round] ?? formatContract(round);
  return `Round ${round}: ${label}`;
}).join("\n");

export const RULES_SECTIONS: RulesSection[] = [
  {
    id: "contractSchedule",
    title: "Contract schedule",
    body: `Each round has an exact opening contract. Meld sizes must match precisely — not merely meet a minimum. All required contract melds go down together on your Opening turn.

${CONTRACT_ROWS}`,
  },
  {
    id: "wildAdjacency",
    title: "Wild adjacency",
    body: `A Wild is a joker or a two played as a substitute for another rank. Declare what rank a wild represents when it is first played in a meld.

Wild adjacency: wilds may not occupy adjacent slots in a meld. No joker-next-to-joker, no two-next-to-two, and no joker-next-to-two.

Wild relocation: when a natural card replaces a wild during lay-off, the displaced wild must move to a set or run on the same player's board (including extending the same meld). Adjacency rules do not apply during relocation.`,
  },
  {
    id: "layOff",
    title: "Lay off",
    body: `Opening turn: the first turn on which you lay your contract melds. You are Opened after completing that turn.

Before you open, you cannot lay partial contracts across multiple turns.

If someone goes out before you open, you keep the same contract requirement on the next hand. Players who opened advance to the next contract on the deal.

After you open, you cannot create new melds for the rest of the round — only lay off on existing melds.

Lay off adds a card to an existing meld after your opening turn. You may lay off on any player's melds on your next turn and every turn after (not the same turn you opened).

Going out ends the round by discarding your last card, leaving zero cards in hand.

Stuck wild resolution: jokers and twos cannot be discarded. If your only remaining card is a joker or two, lay it off on a meld — then take a rummy penalty from the discard pile (two cards on first offense, entire pile on later offenses) and discard again. The same pickup applies when your Opening turn leaves only a joker or two in hand.`,
  },
  {
    id: "deadwoodScoring",
    title: "Deadwood scoring",
    body: `Deadwood is unmelded cards remaining in your hand when someone goes out.

When a player goes out, everyone scores deadwood for cards still in hand:
- Ace 15
- King, Queen, Jack, Ten 10 each
- Three through Nine 5 each
- Two and Joker 20 each

The player who went out scores zero deadwood for that round. Lowest cumulative total after round 10 wins the game.`,
  },
];
