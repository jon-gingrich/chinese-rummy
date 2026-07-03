import { convexAuthNextjsMiddleware } from "@convex-dev/auth/nextjs/server";
import type { NextFetchEvent, NextRequest } from "next/server";

const handleAuth = convexAuthNextjsMiddleware(async () => {
  return undefined;
});

export function proxy(request: NextRequest, event: NextFetchEvent) {
  return handleAuth(request, event);
}

export const proxyConfig = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
