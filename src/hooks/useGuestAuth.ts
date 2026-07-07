"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useRef } from "react";
import { api } from "../../convex/_generated/api";
import { isOAuthRedirectPending, clearOAuthRedirectPending } from "@/components/AuthErrorBanner";
import { clearGuestUserId, readGuestUserId, rememberGuestUserId } from "../lib/guestSession";

export function useGuestAuth() {
  const { signIn } = useAuthActions();
  const viewer = useQuery(api.users.viewer);
  const mergeGuestAccount = useMutation(api.users.mergeGuestAccount);
  const signingIn = useRef(false);
  const linking = useRef(false);

  useEffect(() => {
    if (viewer && !viewer.isGuest) {
      clearOAuthRedirectPending();
    }
  }, [viewer]);

  useEffect(() => {
    if (viewer === undefined || viewer !== null || signingIn.current || isOAuthRedirectPending()) {
      return;
    }

    signingIn.current = true;
    void signIn("anonymous")
      .catch(() => undefined)
      .finally(() => {
        signingIn.current = false;
      });
  }, [viewer, signIn]);

  useEffect(() => {
    if (!viewer || linking.current) {
      return;
    }

    if (viewer.isGuest) {
      rememberGuestUserId(viewer.userId);
      return;
    }

    const guestUserId = readGuestUserId();
    if (!guestUserId || guestUserId === viewer.userId) {
      clearGuestUserId();
      return;
    }

    linking.current = true;
    void mergeGuestAccount({ guestUserId: guestUserId as typeof viewer.userId })
      .then(() => clearGuestUserId())
      .catch(() => undefined)
      .finally(() => {
        linking.current = false;
      });
  }, [viewer, mergeGuestAccount]);

  return {
    viewer,
    isLoading: viewer === undefined,
    isGuest: viewer?.isGuest ?? false,
  };
}
