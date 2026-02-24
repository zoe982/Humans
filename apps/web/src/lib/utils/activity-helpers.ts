/** Extract displayable text, direction, and sender name from an activity */
export function parseActivityContent(activity: {
  body: string | null;
  notes: string | null;
  direction: string | null;
}): { text: string | null; direction: string | null; senderName: string | null } {
  // If body exists, use it directly
  if (activity.body) {
    const senderMatch = activity.notes?.match(/^(?:Inbound|Outbound) from (.+?)(?:\n|$)/);
    const senderName = senderMatch?.[1] ?? null;
    return {
      text: activity.body,
      direction: activity.direction,
      senderName: senderName !== "Unknown" ? senderName : null,
    };
  }

  // Parse notes: strip direction prefix, extract sender name
  if (activity.notes) {
    const match = activity.notes.match(/^(Inbound|Outbound) from (.+?)\n([\s\S]*)$/);
    if (match) {
      return {
        text: match[3],
        direction: activity.direction ?? match[1].toLowerCase(),
        senderName: match[2] !== "Unknown" ? match[2] : null,
      };
    }
    return { text: activity.notes, direction: activity.direction, senderName: null };
  }

  return { text: null, direction: activity.direction, senderName: null };
}
