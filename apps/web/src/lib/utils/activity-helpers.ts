const SIGNATURE_RE = /(?:^|\n)(-- ?\n|---\n)/;

/** Split email text into body + signature at the first common separator. */
export function splitEmailSignature(text: string): {
  body: string;
  signature: string | null;
} {
  const match = SIGNATURE_RE.exec(text);
  if (match == null) {
    return { body: text, signature: null };
  }
  const body = text.slice(0, match.index).trimEnd();
  // Signature starts at the separator line itself
  const sigStart = match.index === 0 ? 0 : match.index + 1;
  const signature = text.slice(sigStart);
  return { body, signature };
}

const NOTES_PREFIX_RE = /^(?:Inbound|Outbound) from (.+?)(?:\n|$)/;
const NOTES_FULL_RE = /^(Inbound|Outbound) from (.+?)\n([\s\S]*)$/;

/** Extract displayable text, direction, and sender name from an activity */
export function parseActivityContent(activity: {
  body: string | null;
  notes: string | null;
  direction: string | null;
  senderName?: string | null;
  ownerName?: string | null;
  ownerDisplayId?: string | null;
  humanName?: string | null;
  humanDisplayId?: string | null;
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
      activity.ownerDisplayId,
      activity.humanName,
      activity.humanDisplayId,
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
        activity.ownerDisplayId,
        activity.humanName,
        activity.humanDisplayId,
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
 * Priority: 1) senderName column, 2) notes-parsed name,
 *           3) ownerDisplayId+ownerName (outbound), 4) humanDisplayId+humanName (inbound)
 */
function resolveSenderName(
  senderNameColumn: string | null | undefined,
  notesParsedName: string | null,
  direction: string | null,
  ownerName: string | null | undefined,
  ownerDisplayId: string | null | undefined,
  humanName: string | null | undefined,
  humanDisplayId: string | null | undefined,
): string | null {
  // 1. senderName column (from DB, populated by sync)
  if (senderNameColumn != null && senderNameColumn !== "") {
    return senderNameColumn;
  }

  // 2. Parsed from notes (existing backward-compat)
  if (notesParsedName != null && notesParsedName !== "Unknown") {
    return notesParsedName;
  }

  // 3. Outbound fallback: colleague display ID + name
  if (direction === "outbound" && ownerName != null && ownerName !== "") {
    if (ownerDisplayId != null && ownerDisplayId !== "") {
      return `${ownerDisplayId} ${ownerName}`;
    }
    return ownerName;
  }

  // 4. Inbound fallback: human display ID + name
  if (direction === "inbound" && humanName != null && humanName !== "") {
    if (humanDisplayId != null && humanDisplayId !== "") {
      return `${humanDisplayId} ${humanName}`;
    }
    return humanName;
  }

  return null;
}
