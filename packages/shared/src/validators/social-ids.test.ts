import { describe, it, expect } from "vitest";
import { createSocialIdSchema, updateSocialIdSchema } from "./social-ids";

describe("createSocialIdSchema", () => {
  it("accepts valid handle", () => {
    const result = createSocialIdSchema.parse({ handle: "@john_doe" });
    expect(result.handle).toBe("@john_doe");
  });

  it("accepts handle with slashes and dots", () => {
    const result = createSocialIdSchema.parse({ handle: "user.name/profile" });
    expect(result.handle).toBe("user.name/profile");
  });

  it("rejects handle over 100 chars", () => {
    expect(() => createSocialIdSchema.parse({ handle: "a".repeat(101) })).toThrowError();
  });

  it("rejects handle with script injection", () => {
    expect(() => createSocialIdSchema.parse({ handle: "<script>alert(1)</script>" })).toThrowError();
  });

  it("rejects handle with spaces", () => {
    expect(() => createSocialIdSchema.parse({ handle: "user name" })).toThrowError();
  });

  it("rejects empty handle", () => {
    expect(() => createSocialIdSchema.parse({ handle: "" })).toThrowError();
  });
});

describe("updateSocialIdSchema", () => {
  it("accepts valid handle update", () => {
    const result = updateSocialIdSchema.parse({ handle: "@new_handle" });
    expect(result.handle).toBe("@new_handle");
  });

  it("rejects handle with special characters", () => {
    expect(() => updateSocialIdSchema.parse({ handle: "user<>" })).toThrowError();
  });

  it("accepts empty object", () => {
    expect(updateSocialIdSchema.parse({})).toStrictEqual({});
  });
});
