<script lang="ts">
  type Attribution = {
    ftUtmSource: string | null;
    ltUtmSource: string | null;
    ftUtmMedium: string | null;
    ltUtmMedium: string | null;
    ftUtmCampaign: string | null;
    ltUtmCampaign: string | null;
    ftUtmContent: string | null;
    ltUtmContent: string | null;
    ftUtmTerm: string | null;
    ltUtmTerm: string | null;
    ftLandingPageUrl: string | null;
    ltLandingPageUrl: string | null;
    ftReferrerUrl: string | null;
    ltReferrerUrl: string | null;
    ftGclid: string | null;
    ltGclid: string | null;
    ftGbraid: string | null;
    ltGbraid: string | null;
    ftWbraid: string | null;
    ltWbraid: string | null;
    ftFbclid: string | null;
    ltFbclid: string | null;
    ftFbp: string | null;
    ltFbp: string | null;
    ftFbc: string | null;
    ltFbc: string | null;
    ftLiFatId: string | null;
    ltLiFatId: string | null;
    ftCapturedAt: string | null;
    ltCapturedAt: string | null;
    firstTouch: Record<string, unknown> | null;
    lastTouch: Record<string, unknown> | null;
  };

  let { attribution }: { attribution: Attribution } = $props();

  // Known field pairs: [label, ftKey, ltKey]
  const knownFields: [string, keyof Attribution, keyof Attribution][] = [
    ["Source", "ftUtmSource", "ltUtmSource"],
    ["Medium", "ftUtmMedium", "ltUtmMedium"],
    ["Campaign", "ftUtmCampaign", "ltUtmCampaign"],
    ["Content", "ftUtmContent", "ltUtmContent"],
    ["Term", "ftUtmTerm", "ltUtmTerm"],
    ["Landing Page", "ftLandingPageUrl", "ltLandingPageUrl"],
    ["Referrer", "ftReferrerUrl", "ltReferrerUrl"],
    ["Google Click ID", "ftGclid", "ltGclid"],
    ["Google Gbraid", "ftGbraid", "ltGbraid"],
    ["Google Wbraid", "ftWbraid", "ltWbraid"],
    ["Facebook Click ID", "ftFbclid", "ltFbclid"],
    ["Facebook FBP", "ftFbp", "ltFbp"],
    ["Facebook FBC", "ftFbc", "ltFbc"],
    ["LinkedIn FAT ID", "ftLiFatId", "ltLiFatId"],
    ["Captured At", "ftCapturedAt", "ltCapturedAt"],
  ];

  // Filter to only rows where at least one side is non-null
  const visibleFields = $derived(
    knownFields.filter(([, ftKey, ltKey]) =>
      attribution[ftKey] != null || attribution[ltKey] != null
    )
  );

  // Covered keys for dynamic fallback
  const coveredFtKeys = new Set([
    "ftUtmSource", "ftUtmMedium", "ftUtmCampaign", "ftUtmContent", "ftUtmTerm",
    "ftLandingPageUrl", "ftReferrerUrl", "ftGclid", "ftGbraid", "ftWbraid",
    "ftFbclid", "ftFbp", "ftFbc", "ftLiFatId", "ftCapturedAt",
  ]);
  const coveredLtKeys = new Set([
    "ltUtmSource", "ltUtmMedium", "ltUtmCampaign", "ltUtmContent", "ltUtmTerm",
    "ltLandingPageUrl", "ltReferrerUrl", "ltGclid", "ltGbraid", "ltWbraid",
    "ltFbclid", "ltFbp", "ltFbc", "ltLiFatId", "ltCapturedAt",
  ]);

  // Extra keys from firstTouch/lastTouch JSONB not already covered
  const extraFtEntries = $derived(
    attribution.firstTouch != null
      ? Object.entries(attribution.firstTouch).filter(([k]) => !coveredFtKeys.has(k))
      : []
  );
  const extraLtEntries = $derived(
    attribution.lastTouch != null
      ? Object.entries(attribution.lastTouch).filter(([k]) => !coveredLtKeys.has(k))
      : []
  );
  // Merge extra keys from both sides
  const extraKeys = $derived(() => {
    const keys = new Set<string>();
    for (const [k] of extraFtEntries) keys.add(k);
    for (const [k] of extraLtEntries) keys.add(k);
    return [...keys];
  });

  function formatValue(val: unknown): string {
    if (val == null) return "—";
    if (typeof val === "string") {
      // Format timestamps
      if (/^\d{4}-\d{2}-\d{2}T/.test(val)) {
        const d = new Date(val);
        return d.toLocaleDateString() + " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      }
      return val;
    }
    return String(val);
  }

  function isUrl(val: unknown): boolean {
    return typeof val === "string" && (val.startsWith("http://") || val.startsWith("https://"));
  }
</script>

<div class="overflow-x-auto">
  <table class="w-full text-sm">
    <thead>
      <tr class="border-b border-glass-border">
        <th class="py-2 pr-4 text-left text-xs font-medium text-text-muted uppercase tracking-wider w-1/4">Field</th>
        <th class="py-2 pr-4 text-left text-xs font-medium text-text-muted uppercase tracking-wider w-[37.5%]">First Touch</th>
        <th class="py-2 text-left text-xs font-medium text-text-muted uppercase tracking-wider w-[37.5%]">Last Touch</th>
      </tr>
    </thead>
    <tbody>
      {#each visibleFields as [label, ftKey, ltKey], i (i)}
        <tr class="border-b border-glass-border/50">
          <td class="py-2 pr-4 text-text-muted font-medium">{label}</td>
          <td class="py-2 pr-4 text-text-primary break-all">
            {#if isUrl(attribution[ftKey])}
              <a href={String(attribution[ftKey])} target="_blank" rel="noopener noreferrer" class="text-accent hover:text-[var(--link-hover)] underline">{formatValue(attribution[ftKey])}</a>
            {:else}
              {formatValue(attribution[ftKey])}
            {/if}
          </td>
          <td class="py-2 text-text-primary break-all">
            {#if isUrl(attribution[ltKey])}
              <a href={String(attribution[ltKey])} target="_blank" rel="noopener noreferrer" class="text-accent hover:text-[var(--link-hover)] underline">{formatValue(attribution[ltKey])}</a>
            {:else}
              {formatValue(attribution[ltKey])}
            {/if}
          </td>
        </tr>
      {/each}
      {#each extraKeys() as key, i (i)}
        <tr class="border-b border-glass-border/50">
          <td class="py-2 pr-4 text-text-muted font-medium">{key}</td>
          <td class="py-2 pr-4 text-text-primary break-all">{formatValue(attribution.firstTouch?.[key])}</td>
          <td class="py-2 text-text-primary break-all">{formatValue(attribution.lastTouch?.[key])}</td>
        </tr>
      {/each}
    </tbody>
  </table>
  {#if visibleFields.length === 0 && extraKeys().length === 0}
    <p class="py-4 text-sm text-text-muted italic text-center">No attribution data available.</p>
  {/if}
</div>
