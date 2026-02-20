import Root from "./badge.svelte";

export type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

export function badgeVariants({
	variant = "default",
	class: className = "",
}: {
	variant?: BadgeVariant;
	class?: string;
} = {}) {
	const base = "glass-badge";

	const variants: Record<BadgeVariant, string> = {
		default: "bg-accent-dim text-accent",
		secondary: "bg-glass text-text-secondary",
		destructive: "bg-danger text-red-300",
		outline: "border-glass-border text-text-primary",
	};

	return [base, variants[variant], className].filter(Boolean).join(" ");
}

export {
	Root,
	Root as Badge,
};
