import { describe, expect, it } from "vitest";
import {
  displayNameFromOAuthProfile,
  formatTableDisplayName,
} from "../../convex/lib/displayName";

describe("formatTableDisplayName", () => {
  it("formats first name and last initial", () => {
    expect(formatTableDisplayName("Jon", "Gingrich")).toBe("Jon G");
  });

  it("returns first name only when last name is missing", () => {
    expect(formatTableDisplayName("Jon")).toBe("Jon");
  });
});

describe("displayNameFromOAuthProfile", () => {
  it("prefers given_name and family_name", () => {
    expect(
      displayNameFromOAuthProfile({
        given_name: "Jon",
        family_name: "Gingrich",
        name: "Someone Else",
      }),
    ).toBe("Jon G");
  });

  it("parses a full name when structured fields are missing", () => {
    expect(
      displayNameFromOAuthProfile({
        name: "Jon Gingrich",
      }),
    ).toBe("Jon G");
  });
});
