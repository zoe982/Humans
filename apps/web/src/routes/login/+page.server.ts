import { redirect } from "@sveltejs/kit";
import type { RequestEvent } from "@sveltejs/kit";
import { PUBLIC_API_URL } from "$env/static/public";

const ERROR_MESSAGES = new Map<string, string>([
  ["AUTH_OAUTH_CANCELLED", "Sign-in was cancelled. Click below to try again."],
  [
    "AUTH_ACCESS_DENIED",
    "Your Google account is not authorized to access this application.",
  ],
  [
    "AUTH_ACCOUNT_DEACTIVATED",
    "Your account has been deactivated. Contact an administrator.",
  ],
  ["AUTH_OAUTH_MISSING_PARAMS", "Your sign-in session expired. Please try again."],
  ["AUTH_OAUTH_INVALID_STATE", "Your sign-in session expired. Please try again."],
  ["AUTH_OAUTH_TOKEN_FAILED", "Google sign-in failed. Please try again."],
  ["AUTH_OAUTH_USER_INFO_FAILED", "Google sign-in failed. Please try again."],
]);

const FALLBACK_MESSAGE = "An error occurred during sign-in. Please try again.";

export function load({
  locals,
  url,
}: RequestEvent): { errorCode: string; errorMessage: string } {
  if (locals.user != null) {
    redirect(302, "/dashboard");
  }

  const errorCode = url.searchParams.get("error");

  if (errorCode == null) {
    const apiUrl: string = PUBLIC_API_URL;
    redirect(302, `${apiUrl}/auth/google/login`);
  }

  return {
    errorCode,
    errorMessage: ERROR_MESSAGES.get(errorCode) ?? FALLBACK_MESSAGE,
  };
}
