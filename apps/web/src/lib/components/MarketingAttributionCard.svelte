<script lang="ts">
  import { SvelteSet } from "svelte/reactivity";

  type Attribution = Record<string, unknown>;

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
      // eslint-disable-next-line security/detect-object-injection
      attribution[ftKey] != null || attribution[ltKey] != null
    )
  );

  // Covered keys for dynamic fallback
  const coveredFtKeys = new SvelteSet([
    "ftUtmSource", "ftUtmMedium", "ftUtmCampaign", "ftUtmContent", "ftUtmTerm",
    "ftLandingPageUrl", "ftReferrerUrl", "ftGclid", "ftGbraid", "ftWbraid",
    "ftFbclid", "ftFbp", "ftFbc", "ftLiFatId", "ftCapturedAt",
  ]);
  const coveredLtKeys = new SvelteSet([
    "ltUtmSource", "ltUtmMedium", "ltUtmCampaign", "ltUtmContent", "ltUtmTerm",
    "ltLandingPageUrl", "ltReferrerUrl", "ltGclid", "ltGbraid", "ltWbraid",
    "ltFbclid", "ltFbp", "ltFbc", "ltLiFatId", "ltCapturedAt",
  ]);

  function toEntries(val: unknown): [string, unknown][] {
    if (typeof val !== "object" || val === null) return [];
     
    return Object.entries(val as Record<string, unknown>);
  }

  function lookupKey(obj: unknown, key: string): unknown {
    if (typeof obj !== "object" || obj === null) return undefined;
    // eslint-disable-next-line security/detect-object-injection -- narrowed to non-null object above
    return (obj as Record<string, unknown>)[key];
  }

  // Extra keys from firstTouch/lastTouch JSONB not already covered
  const extraFtEntries = $derived(
    toEntries(attribution.firstTouch).filter(([k]) => !coveredFtKeys.has(k))
  );
  const extraLtEntries = $derived(
    toEntries(attribution.lastTouch).filter(([k]) => !coveredLtKeys.has(k))
  );
  // Merge extra keys from both sides
  const extraKeys = $derived(() => {
    const keys = new SvelteSet<string>();
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
        <!-- eslint-disable-next-line security/detect-object-injection -->
        {@const ftVal = attribution[ftKey]}
        <!-- eslint-disable-next-line security/detect-object-injection -->
        {@const ltVal = attribution[ltKey]}
        <tr class="border-b border-glass-border/50">
          <td class="py-2 pr-4 text-text-muted font-medium">{label}</td>
          <td class="py-2 pr-4 text-text-primary break-all">
            {#if isUrl(ftVal)}
              <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
              <a href={String(ftVal)} target="_blank" rel="noopener noreferrer" class="text-accent hover:text-[var(--link-hover)] underline">{formatValue(ftVal)}</a>
            {:else}
              {formatValue(ftVal)}
            {/if}
          </td>
          <td class="py-2 text-text-primary break-all">
            {#if isUrl(ltVal)}
              <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
              <a href={String(ltVal)} target="_blank" rel="noopener noreferrer" class="text-accent hover:text-[var(--link-hover)] underline">{formatValue(ltVal)}</a>
            {:else}
              {formatValue(ltVal)}
            {/if}
          </td>
        </tr>
      {/each}
      {#each extraKeys() as key, i (i)}
        <tr class="border-b border-glass-border/50">
          <td class="py-2 pr-4 text-text-muted font-medium">{key}</td>
          <td class="py-2 pr-4 text-text-primary break-all">{formatValue(lookupKey(attribution.firstTouch, key))}</td>
          <td class="py-2 text-text-primary break-all">{formatValue(lookupKey(attribution.lastTouch, key))}</td>
        </tr>
      {/each}
    </tbody>
  </table>
  {#if visibleFields.length === 0 && extraKeys().length === 0}
    <p class="py-4 text-sm text-text-muted italic text-center">No attribution data available.</p>
  {/if}
</div>
