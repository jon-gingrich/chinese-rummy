import type { OAuthConfig, OAuthUserConfig } from "@auth/core/providers";

type YahooProfile = {
  sub: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  email?: string;
  picture?: string;
};

const YAHOO_ISSUER = "https://api.login.yahoo.com";

export default function Yahoo(
  options: OAuthUserConfig<YahooProfile> = {},
): OAuthConfig<YahooProfile> {
  return {
    id: "yahoo",
    name: "Yahoo",
    type: "oidc",
    issuer: YAHOO_ISSUER,
    authorization: {
      url: `${YAHOO_ISSUER}/oauth2/request_auth`,
      params: { scope: "openid email" },
    },
    token: `${YAHOO_ISSUER}/oauth2/get_token`,
    userinfo: `${YAHOO_ISSUER}/openid/v1/userinfo`,
    // Yahoo recommends PKCE for confidential clients; nonce is required for OIDC.
    checks: ["pkce", "state", "nonce"],
    profile(profile) {
      return {
        id: profile.sub,
        name: profile.name,
        email: profile.email,
        given_name: profile.given_name,
        family_name: profile.family_name,
      };
    },
    client: {
      token_endpoint_auth_method: "client_secret_post",
      id_token_signed_response_alg: "ES256",
    },
    options,
  };
}
