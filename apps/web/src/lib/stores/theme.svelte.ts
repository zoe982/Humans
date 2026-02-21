import { browser } from "$app/environment";

let current = $state<"light" | "dark">(
  browser && document.documentElement.classList.contains("light") ? "light" : "dark"
);

export function toggleTheme() {
  current = current === "dark" ? "light" : "dark";
  document.documentElement.classList.toggle("light", current === "light");
  localStorage.setItem("theme", current);
}

export function currentTheme(): "light" | "dark" {
  return current;
}
