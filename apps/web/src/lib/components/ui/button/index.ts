import Root from "./button.svelte";

export type ButtonVariant = "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
export type ButtonSize = "default" | "sm" | "lg" | "icon";

export function buttonVariants({
	variant = "default",
	size = "default",
	class: className = "",
}: {
	variant?: ButtonVariant;
	size?: ButtonSize;
	class?: string;
} = {}) {
	const base = "inline-flex items-center justify-center whitespace-nowrap font-medium transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50";

	const variants: Record<ButtonVariant, string> = {
		default: "btn-primary",
		destructive: "btn-danger",
		outline: "border border-glass-border bg-transparent text-text-primary hover:bg-glass-hover",
		secondary: "bg-glass text-text-primary hover:bg-glass-hover",
		ghost: "btn-ghost border-0",
		link: "text-accent underline-offset-4 hover:underline",
	};

	const sizes: Record<ButtonSize, string> = {
		default: "h-10 px-4 py-2 text-sm rounded-[0.625rem]",
		sm: "h-9 px-3 text-sm rounded-[0.625rem]",
		lg: "h-11 px-8 text-sm rounded-[0.625rem]",
		icon: "h-10 w-10 rounded-[0.625rem]",
	};

	return [base, variants[variant], sizes[size], className].filter(Boolean).join(" ");
}

export {
	Root,
	Root as Button,
};
