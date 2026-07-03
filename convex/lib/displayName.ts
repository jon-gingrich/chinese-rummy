export function formatTableDisplayName(firstName: string, lastName?: string): string {
  const first = firstName.trim();
  if (!first) {
    return "";
  }
  const last = lastName?.trim();
  if (!last) {
    return first;
  }
  const lastInitial = last[0]?.toUpperCase();
  return lastInitial ? `${first} ${lastInitial}` : first;
}

export function displayNameFromOAuthProfile(
  profile: Record<string, unknown>,
): string | undefined {
  const givenName = typeof profile.given_name === "string" ? profile.given_name : undefined;
  const familyName = typeof profile.family_name === "string" ? profile.family_name : undefined;

  if (givenName) {
    const formatted = formatTableDisplayName(givenName, familyName);
    return formatted.length >= 2 ? formatted : undefined;
  }

  if (typeof profile.name === "string") {
    const parts = profile.name.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      const formatted = formatTableDisplayName(parts[0]!, parts[parts.length - 1]!);
      return formatted.length >= 2 ? formatted : undefined;
    }
    if (parts.length === 1 && parts[0]!.length >= 2) {
      return parts[0];
    }
  }

  return undefined;
}
