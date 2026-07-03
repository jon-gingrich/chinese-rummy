export type OAuthProviderId = "google" | "microsoft-entra-id" | "yahoo";

export const OAUTH_PROVIDERS: ReadonlyArray<{
  id: OAuthProviderId;
  label: string;
}> = [
  { id: "google", label: "Continue with Google" },
  { id: "microsoft-entra-id", label: "Continue with Microsoft" },
  { id: "yahoo", label: "Continue with Yahoo" },
];
