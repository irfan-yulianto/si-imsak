export type Theme = "light" | "dark";

/** The browser's own UI (address bar, task switcher) takes the page background's colour */
export const THEME_COLORS: Record<Theme, string> = { light: "#F1F5F3", dark: "#0A0E13" };

/**
 * Shows the page in `theme`: the .dark class (which also switches color-scheme, for the
 * browser's own controls) and the theme-color meta. The inline script in layout.tsx
 * does the same before the first paint.
 */
export function applyTheme(theme: Theme): void {
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_COLORS[theme]);
}

/** The inline script for layout.tsx: the saved theme, dark by default, before the first paint */
export const THEME_INIT_SCRIPT = `(function(){var t='dark';try{if(localStorage.getItem('theme')==='light')t='light'}catch(e){}if(t==='dark')document.documentElement.classList.add('dark');var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute('content',t==='dark'?'${THEME_COLORS.dark}':'${THEME_COLORS.light}')})()`;
