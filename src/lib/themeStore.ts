import { writable } from "svelte/store";

type Theme = "light" | "dark";

const STORAGE_KEY = "pomo-theme";

const getInitialTheme = (): Theme => {
  if (import.meta.env.SSR) {
    return "light";
  }

  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark") {
    return stored;
  }

  if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }

  return "light";
};

const applyTheme = (theme: Theme): void => {
  if (import.meta.env.SSR) {
    return;
  }

  document.documentElement.dataset.theme = theme;
  localStorage.setItem(STORAGE_KEY, theme);
};

const initialTheme = getInitialTheme();
export const theme = writable<Theme>(initialTheme);

theme.subscribe((nextTheme) => {
  applyTheme(nextTheme);
});

export const toggleTheme = (): void => {
  theme.update((current) => (current === "light" ? "dark" : "light"));
};

if (!import.meta.env.SSR) {
  applyTheme(initialTheme);
}
