# Drag-and-drop play with card motion

Card play moves from tap-to-select as the primary gesture to drag-and-drop onto the felt, with tap retained as fallback for accessibility and multi-step flows. Legal drop targets are **insertion gaps** — a slot between two neighbors (or edge and neighbor) — including mid-run wild-replacement slots where a natural replaces a wild in place. Opening uses dashed **contract slots** on the player's board (one per remaining contract meld); lay-off uses the same gap model on table melds.

**Animation:** cards landing on melds or the discard pile animate; draws into hand stay instant. The local player's drag *is* the travel (optimistic placement, snap back on reject); remote plays fly in from the actor's seat via layout animation. Discard remains tap-only in v1.

**Gap validity** is computed on the client using shared `convex/lib/rules` helpers so hover feedback stays instant; the server remains authoritative on submit (mutations unchanged initially — no `insertIndex` in the API). Wild rank declaration and wild relocation use a drop-then-modal wizard (destination meld picked from a list, not a second drag).

**Stack:** `@dnd-kit` for drag sources and gap drop zones; Motion (`motion/react`) for fly-ins and meld layout shifts. Rejected alternatives: drag-only (poor mobile and wild flows), server round-trips per hover gap, FLIP-only without Motion, and second-drag relocation.
