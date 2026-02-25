const URL_SHORTENERS = new Set([
  "bit.ly", "t.co", "tinyurl.com", "goo.gl", "ow.ly", "is.gd",
  "buff.ly", "adf.ly", "bl.ink", "lnkd.in", "soo.gd", "s2r.co",
  "clicky.me", "budurl.com", "bc.vc", "rb.gy", "shorturl.at",
]);

const SUSPICIOUS_TLDS = new Set([
  ".tk", ".ml", ".ga", ".cf", ".gq", ".buzz", ".top", ".xyz",
  ".club", ".work", ".date", ".racing", ".win", ".bid", ".stream",
  ".download", ".loan", ".click",
]);

const IP_URL_RE = /^https?:\/\/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/;
const PUNYCODE_RE = /xn--/i;

export type LinkClassification = "safe" | "suspicious";

export function classifyLink(url: string): LinkClassification {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();

    // IP address URLs
    if (IP_URL_RE.test(url)) return "suspicious";

    // URL shorteners
    if (URL_SHORTENERS.has(hostname)) return "suspicious";

    // Punycode / IDN (homograph attacks)
    if (PUNYCODE_RE.test(hostname)) return "suspicious";

    // Suspicious TLDs
    for (const tld of SUSPICIOUS_TLDS) {
      if (hostname.endsWith(tld)) return "suspicious";
    }

    // Data URIs (shouldn't match URL regex, but defense-in-depth)
    if (parsed.protocol === "data:") return "suspicious";

    return "safe";
  } catch {
    // Malformed URL is suspicious
    return "suspicious";
  }
}
