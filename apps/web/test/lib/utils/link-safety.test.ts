import { describe, it, expect } from "vitest";
import { classifyLink } from "$lib/utils/link-safety";

describe("classifyLink", () => {
  it("classifies normal URLs as safe", () => {
    expect(classifyLink("https://www.google.com")).toBe("safe");
    expect(classifyLink("https://example.com/path")).toBe("safe");
    expect(classifyLink("https://petairvalet.com")).toBe("safe");
  });

  it("flags IP address URLs as suspicious", () => {
    expect(classifyLink("http://192.168.1.1/login")).toBe("suspicious");
    expect(classifyLink("https://10.0.0.1/admin")).toBe("suspicious");
    expect(classifyLink("http://172.16.0.1:8080/payload")).toBe("suspicious");
  });

  it("flags URL shorteners as suspicious", () => {
    expect(classifyLink("https://bit.ly/abc123")).toBe("suspicious");
    expect(classifyLink("https://t.co/xyz")).toBe("suspicious");
    expect(classifyLink("https://tinyurl.com/something")).toBe("suspicious");
    expect(classifyLink("https://goo.gl/maps/123")).toBe("suspicious");
  });

  it("flags punycode/IDN domains as suspicious", () => {
    expect(classifyLink("https://xn--pple-43d.com/account")).toBe("suspicious");
    expect(classifyLink("https://xn--80ak6aa92e.com")).toBe("suspicious");
  });

  it("flags suspicious TLDs", () => {
    expect(classifyLink("https://freeprize.tk")).toBe("suspicious");
    expect(classifyLink("https://login-bank.xyz/verify")).toBe("suspicious");
    expect(classifyLink("https://offer.buzz/claim")).toBe("suspicious");
    expect(classifyLink("https://update.click/now")).toBe("suspicious");
  });

  it("classifies data URIs as suspicious", () => {
    expect(classifyLink("data:text/html,<script>alert(1)</script>")).toBe("suspicious");
  });

  it("classifies malformed URLs as suspicious", () => {
    expect(classifyLink("not-a-url")).toBe("suspicious");
    expect(classifyLink("")).toBe("suspicious");
  });

  it("does not flag legitimate domains with suspicious TLD substrings", () => {
    // ".com" is not in suspicious TLDs, ".co.uk" is not suspicious
    expect(classifyLink("https://amazon.com")).toBe("safe");
    expect(classifyLink("https://bbc.co.uk")).toBe("safe");
  });
});
