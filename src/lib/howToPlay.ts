export type HowToPlayStep = {
  id: string;
  title: string;
  body: string;
};

export const HOW_TO_PLAY_STEPS: HowToPlayStep[] = [
  {
    id: "goal",
    title: "Win with the lowest score",
    body: "Chinese Rummy is a ten-round contract game. Each round someone goes out by discarding their last card. Everyone else scores deadwood points for cards still in hand. Lowest total after round ten wins.",
  },
  {
    id: "turn",
    title: "Your turn",
    body: "On your turn, draw one card from the stock pile or the top of the discard pile. Then either lay melds (if allowed) or discard one card to end your turn. Tap cards in your hand to select them.",
  },
  {
    id: "opening",
    title: "Open with your contract",
    body: "Each round has a contract — specific sets and runs you must lay all at once on your opening turn. Until you open, you cannot lay partial melds or lay off on other players' melds.",
  },
  {
    id: "layoff",
    title: "Lay off after opening",
    body: "Once opened, you can add cards to any meld on the table on later turns — but you cannot create new melds that round. Jokers and twos are wild; declare what rank they represent when played.",
  },
  {
    id: "finish",
    title: "Go out to end the round",
    body: "When you have one card left, discard it to go out — but jokers and twos cannot be discarded. If your last card is a wild (or opening leaves only a wild), lay it off or open, take the stuck-wild rummy pickup, then discard. You score zero deadwood when you go out. Use the Rules button anytime for contracts, wild adjacency, and scoring details.",
  },
];
