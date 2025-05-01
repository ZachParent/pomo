import { writable } from "svelte/store";
// Use Vite's import.meta.env.SSR instead of SvelteKit's $app/environment
// import { browser } from "$app/environment"; // Use $app/environment for browser check

type Theme = "light" | "dark";

const KEY = "pomo-theme";

// Function to get the initial theme preference
function getInitialTheme(): Theme {
  // Check if NOT running during Server-Side Rendering (SSR)
  if (import.meta.env.SSR) {
    return "light"; // Default for SSR
  }

  // We are in the browser environment now
  // 1. Check localStorage
  const stored = localStorage.getItem(KEY);
  if (stored === "light" || stored === "dark") {
    return stored;
  }

  // 2. Check system preference
  if (
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  ) {
    return "dark";
  }

  // 3. Default to light
  return "light";
}

// Create the writable store
const initialTheme = getInitialTheme();
export const theme = writable<Theme>(initialTheme);

// Function to apply the theme by enabling/disabling <link> tags
function applyTheme(newTheme: Theme) {
  if (import.meta.env.SSR) return; // Don't run this on the server

  console.log("[Theme] Applying theme:", newTheme);

  const lightThemeLink = document.getElementById(
    "smui-theme-light"
  ) as HTMLLinkElement;
  const darkThemeLink = document.getElementById(
    "smui-theme-dark"
  ) as HTMLLinkElement;

  if (!lightThemeLink || !darkThemeLink) {
    console.error(
      "[Theme] Could not find theme link tags in the document head."
    );
    return;
  }

  if (newTheme === "dark") {
    // Enable dark theme, disable light theme
    lightThemeLink.media = "not all";
    darkThemeLink.media = "all";
    document.body.classList.add("dark"); // Keep body class for potential custom component styles
  } else {
    // Enable light theme, disable dark theme
    lightThemeLink.media = "all";
    darkThemeLink.media = "not all";
    document.body.classList.remove("dark"); // Keep body class consistent
  }

  // Persist choice to localStorage
  localStorage.setItem(KEY, newTheme);
}

// Subscribe to store changes to apply the theme
theme.subscribe(applyTheme);

// Function to toggle the theme
export function toggleTheme() {
  theme.update((currentTheme) => {
    const newTheme = currentTheme === "light" ? "dark" : "light";
    console.log("[Theme] Toggling theme to:", newTheme);
    // ApplyTheme will be called automatically by the subscription
    return newTheme;
  });
}

// Apply the initial theme when the store is first loaded in the browser
if (!import.meta.env.SSR) {
  applyTheme(initialTheme);
}
