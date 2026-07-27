import { ref } from "vue";

// Load saved theme from localStorage, default to 'light'
const savedTheme = localStorage.getItem("app-theme") || "light";
const currentTheme = ref(savedTheme);

// Apply theme attribute to <html> so global CSS variables in App.vue can react
const applyTheme = (theme) => {
  document.documentElement.setAttribute("data-theme", theme);
};

// Apply immediately on module load so there's no flash of wrong theme
applyTheme(currentTheme.value);

export function useTheme() {
  const setTheme = (theme) => {
    currentTheme.value = theme;
    localStorage.setItem("app-theme", theme);
    applyTheme(theme);
  };

  const toggleTheme = () => {
    setTheme(currentTheme.value === "light" ? "dark" : "light");
  };

  return {
    currentTheme,
    setTheme,
    toggleTheme,
  };
}
