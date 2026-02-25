import { describe, it, expect } from "vitest";
import { isRedirect, Redirect } from "@sveltejs/kit";
import { mockEvent } from "../../helpers";
import { load } from "../../../src/routes/login/+page.server";

describe("login +page.server load", () => {
  it("redirects to /dashboard when user is authenticated", () => {
    const event = mockEvent({
      user: { id: "u1", email: "a@b.com", role: "agent", name: "A" },
      url: "http://localhost/login",
    });
    try {
      load(event as any);
      expect.fail("should have redirected");
    } catch (e) {
      expect(isRedirect(e)).toBe(true);
      expect((e as Redirect).status).toBe(302);
      expect((e as Redirect).location).toBe("/dashboard");
    }
  });

  it("auto-redirects to Google OAuth when no error param", () => {
    const event = mockEvent({
      user: null,
      url: "http://localhost/login",
    });
    try {
      load(event as any);
      expect.fail("should have redirected");
    } catch (e) {
      expect(isRedirect(e)).toBe(true);
      expect((e as Redirect).status).toBe(302);
      expect((e as Redirect).location).toContain("/auth/google/login");
    }
  });

  it("returns error message for AUTH_OAUTH_CANCELLED", () => {
    const event = mockEvent({
      user: null,
      url: "http://localhost/login?error=AUTH_OAUTH_CANCELLED",
    });
    const result = load(event as any);
    expect(result).toMatchObject({
      errorCode: "AUTH_OAUTH_CANCELLED",
      errorMessage: "Sign-in was cancelled. Click below to try again.",
    });
  });

  it("returns error message for AUTH_ACCESS_DENIED", () => {
    const event = mockEvent({
      user: null,
      url: "http://localhost/login?error=AUTH_ACCESS_DENIED",
    });
    const result = load(event as any);
    expect(result).toMatchObject({
      errorCode: "AUTH_ACCESS_DENIED",
      errorMessage: "Your Google account is not authorized to access this application.",
    });
  });

  it("returns error message for AUTH_ACCOUNT_DEACTIVATED", () => {
    const event = mockEvent({
      user: null,
      url: "http://localhost/login?error=AUTH_ACCOUNT_DEACTIVATED",
    });
    const result = load(event as any);
    expect(result).toMatchObject({
      errorCode: "AUTH_ACCOUNT_DEACTIVATED",
      errorMessage: "Your account has been deactivated. Contact an administrator.",
    });
  });

  it("returns session-expired message for AUTH_OAUTH_MISSING_PARAMS", () => {
    const event = mockEvent({
      user: null,
      url: "http://localhost/login?error=AUTH_OAUTH_MISSING_PARAMS",
    });
    const result = load(event as any);
    expect(result).toMatchObject({
      errorCode: "AUTH_OAUTH_MISSING_PARAMS",
      errorMessage: "Your sign-in session expired. Please try again.",
    });
  });

  it("returns session-expired message for AUTH_OAUTH_INVALID_STATE", () => {
    const event = mockEvent({
      user: null,
      url: "http://localhost/login?error=AUTH_OAUTH_INVALID_STATE",
    });
    const result = load(event as any);
    expect(result).toMatchObject({
      errorCode: "AUTH_OAUTH_INVALID_STATE",
      errorMessage: "Your sign-in session expired. Please try again.",
    });
  });

  it("returns Google-failed message for AUTH_OAUTH_TOKEN_FAILED", () => {
    const event = mockEvent({
      user: null,
      url: "http://localhost/login?error=AUTH_OAUTH_TOKEN_FAILED",
    });
    const result = load(event as any);
    expect(result).toMatchObject({
      errorCode: "AUTH_OAUTH_TOKEN_FAILED",
      errorMessage: "Google sign-in failed. Please try again.",
    });
  });

  it("returns fallback message for unknown error codes", () => {
    const event = mockEvent({
      user: null,
      url: "http://localhost/login?error=SOME_UNKNOWN_CODE",
    });
    const result = load(event as any);
    expect(result).toMatchObject({
      errorCode: "SOME_UNKNOWN_CODE",
      errorMessage: "An error occurred during sign-in. Please try again.",
    });
  });
});
