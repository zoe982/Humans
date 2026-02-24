const NOTES_PREFIX_RE = /^(?:Inbound|Outbound) from (.+?)(?:\n|$)/;
const NOTES_FULL_RE = /^(Inbound|Outbound) from (.+?)\n([\s\S]*)$/;

/** Extract displayable text, direction, and sender name from an activity */
export function parseActivityContent(activity: {
  body: string | null;
  notes: string | null;
  direction: string | null;
  senderName?: string | null;
  ownerName?: string | null;
  humanName?: string | null;
}): { text: string | null; direction: string | null; senderName: string | null } {
  // If body exists, use it directly
  if (activity.body != null && activity.body !== "") {
    const senderMatch = activity.notes != null ? NOTES_PREFIX_RE.exec(activity.notes) : null;
    const notesParsedName = senderMatch?.[1] ?? null;
    const resolvedName = resolveSenderName(
      activity.senderName,
      notesParsedName,
      activity.direction,
      activity.ownerName,
      activity.humanName,
    );
    return {
      text: activity.body,
      direction: activity.direction,
      senderName: resolvedName,
    };
  }

  // Parse notes: strip direction prefix, extract sender name
  if (activity.notes != null && activity.notes !== "") {
    const match = NOTES_FULL_RE.exec(activity.notes);
    if (match != null) {
      const resolvedName = resolveSenderName(
        activity.senderName,
        match[2],
        activity.direction ?? match[1].toLowerCase(),
        activity.ownerName,
        activity.humanName,
      );
      return {
        text: match[3],
        direction: activity.direction ?? match[1].toLowerCase(),
        senderName: resolvedName,
      };
    }
    return { text: activity.notes, direction: activity.direction, senderName: activity.senderName ?? null };
  }

  return { text: null, direction: activity.direction, senderName: activity.senderName ?? null };
}

/**
 * Resolve the best sender name from available sources.
 * Priority: 1) senderName column, 2) notes-parsed name, 3) ownerName (outbound), 4) humanName (inbound)
 */
function resolveSenderName(
  senderNameColumn: string | null | undefined,
  notesParsedName: string | null,
  direction: string | null,
  ownerName: string | null | undefined,
  humanName: string | null | undefined,
): string | null {
  // 1. senderName column (from DB, populated by sync)
  if (senderNameColumn != null && senderNameColumn !== "") {
    return senderNameColumn;
  }

  // 2. Parsed from notes (existing backward-compat)
  if (notesParsedName != null && notesParsedName !== "Unknown") {
    return notesParsedName;
  }

  // 3. Outbound fallback: ownerName (colleague name from API join)
  if (direction === "outbound" && ownerName != null && ownerName !== "") {
    return ownerName;
  }

  // 4. Inbound fallback: humanName (linked human name from API join)
  if (direction === "inbound" && humanName != null && humanName !== "") {
    return humanName;
  }

  return null;
}
