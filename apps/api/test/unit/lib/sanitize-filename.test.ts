import { describe, it, expect } from "vitest";
import { sanitizeFilename, ALLOWED_UPLOAD_CONTENT_TYPES } from "../../../src/lib/sanitize-filename";

describe("sanitizeFilename", () => {
  it("passes through clean filenames", () => {
    expect(sanitizeFilename("document.pdf")).toBe("document.pdf");
    expect(sanitizeFilename("my-file_v2.docx")).toBe("my-file_v2.docx");
  });

  it("strips path separators", () => {
    expect(sanitizeFilename("../../etc/passwd")).toBe("....etcpasswd");
    expect(sanitizeFilename("uploads\\evil.exe")).toBe("uploadsevil.exe");
  });

  it("strips null bytes", () => {
    expect(sanitizeFilename("file\x00.pdf")).toBe("file.pdf");
  });

  it("strips control characters", () => {
    expect(sanitizeFilename("file\x01\x02\x1f.pdf")).toBe("file.pdf");
  });

  it("returns 'unnamed' for empty result after sanitization", () => {
    expect(sanitizeFilename("")).toBe("unnamed");
    expect(sanitizeFilename("///")).toBe("unnamed");
    expect(sanitizeFilename("\x00\x01")).toBe("unnamed");
  });

  it("preserves unicode characters in filenames", () => {
    expect(sanitizeFilename("résumé.pdf")).toBe("résumé.pdf");
    expect(sanitizeFilename("文档.pdf")).toBe("文档.pdf");
  });

  it("preserves spaces and dots", () => {
    expect(sanitizeFilename("my document.v2.pdf")).toBe("my document.v2.pdf");
  });
});

describe("ALLOWED_UPLOAD_CONTENT_TYPES", () => {
  it("includes common document types", () => {
    expect(ALLOWED_UPLOAD_CONTENT_TYPES).toContain("application/pdf");
    expect(ALLOWED_UPLOAD_CONTENT_TYPES).toContain("image/jpeg");
    expect(ALLOWED_UPLOAD_CONTENT_TYPES).toContain("image/png");
    expect(ALLOWED_UPLOAD_CONTENT_TYPES).toContain("image/webp");
  });

  it("includes office document types", () => {
    expect(ALLOWED_UPLOAD_CONTENT_TYPES).toContain("application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    expect(ALLOWED_UPLOAD_CONTENT_TYPES).toContain("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  });

  it("does NOT include HTML or SVG (XSS vectors)", () => {
    expect(ALLOWED_UPLOAD_CONTENT_TYPES).not.toContain("text/html");
    expect(ALLOWED_UPLOAD_CONTENT_TYPES).not.toContain("image/svg+xml");
    expect(ALLOWED_UPLOAD_CONTENT_TYPES).not.toContain("application/xhtml+xml");
  });
});
