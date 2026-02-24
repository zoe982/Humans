import Root from "./badge.svelte";

export type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

export function badgeVariants({
	variant = "default",
	class: className = "",
}: {
	variant?: BadgeVariant;
	class?: string;
} = {}): string {
	const base = "glass-badge";

	const variants: Record<BadgeVariant, string> = {
		default: "bg-accent-dim text-accent",
		secondary: "bg-glass text-text-secondary",
		destructive: "bg-danger text-destructive-foreground",
		outline: "border-glass-border text-text-primary",
	};

	// eslint-disable-next-line security/detect-object-injection
	return [base, variants[variant], className].filter(Boolean).join(" ");
}

export {
	Root,
	Root as Badge,
};
