import MicrosoftEntraID from "@auth/core/providers/microsoft-entra-id";

const MICROSOFT_ISSUER = "https://login.microsoftonline.com/common/v2.0";

/**
 * Microsoft Entra ID for Hotmail/Outlook sign-in.
 *
 * - Scopes: openid profile email only (no Graph User.Read).
 * - Explicit OAuth endpoints so Convex Auth keeps PKCE enabled. Microsoft's
 *   discovery doc omits code_challenge_methods_supported, which otherwise
 *   causes Convex Auth to strip PKCE while still sending a bogus verifier.
 */
export default function Microsoft() {
  return MicrosoftEntraID({
    issuer: MICROSOFT_ISSUER,
    authorization: {
      url: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
      params: { scope: "openid profile email" },
    },
    token: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    userinfo: "https://graph.microsoft.com/oidc/userinfo",
    checks: ["pkce", "nonce"],
    profile(profile) {
      return {
        id: profile.sub,
        name: profile.name,
        email: profile.email,
        given_name: profile.given_name,
        family_name: profile.family_name,
      };
    },
  });
}
