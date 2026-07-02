import { describe, expect, it } from "vitest";
import { RULES_SECTIONS } from "../../src/lib/rulesReference";

describe("rules reference content", () => {
  it("covers contract schedule, wild adjacency, lay off, and deadwood scoring", () => {
    const ids = RULES_SECTIONS.map((section) => section.id);
    expect(ids).toEqual(["contractSchedule", "wildAdjacency", "layOff", "deadwoodScoring"]);
  });

  it("uses CONTEXT.md domain language", () => {
    const body = RULES_SECTIONS.map((section) => `${section.title}\n${section.body}`).join("\n");
    expect(body).toContain("Contract schedule");
    expect(body).toContain("Wild adjacency");
    expect(body).toContain("Lay off");
    expect(body).toContain("Deadwood scoring");
    expect(body).toContain("Opening turn");
    expect(body).toContain("Wild relocation");
    expect(body).toMatch(/2 sets of 3/);
    expect(body).toContain("Ace 15");
    expect(body).toContain("Two and Joker 20");
  });
});
