<template>
  <button
    class="theme-toggle"
    type="button"
    :aria-label="
      currentTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'
    "
    :title="
      currentTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'
    "
    @click="toggleTheme"
  >
    <svg
      v-if="currentTheme === 'dark'"
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      class="theme-icon"
    >
      <circle
        cx="10"
        cy="10"
        r="4.5"
        stroke="currentColor"
        stroke-width="1.5"
      />
      <path
        d="M10 1.5V3.5M10 16.5V18.5M18.5 10H16.5M3.5 10H1.5M15.9 4.1L14.5 5.5M5.5 14.5L4.1 15.9M15.9 15.9L14.5 14.5M5.5 5.5L4.1 4.1"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
      />
    </svg>
    <svg
      v-else
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      class="theme-icon"
    >
      <path
        d="M17 11.3C16.1 11.7 15.1 12 14 12C10.1 12 7 8.9 7 5C7 3.9 7.3 2.9 7.7 2C4.4 2.9 2 5.9 2 9.5C2 13.6 5.4 17 9.5 17C13.1 17 16.1 14.6 17 11.3Z"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linejoin="round"
      />
    </svg>
    <span class="theme-label">{{
      currentTheme === "dark" ? "Dark" : "Light"
    }}</span>
  </button>
</template>

<script setup>
import { useTheme } from "../composables/useTheme";

const { currentTheme, toggleTheme } = useTheme();
</script>

<style scoped>
.theme-toggle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.875rem;
  background: var(--color-surface, white);
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: inherit;
  font-size: 0.875rem;
  color: var(--color-text-secondary, #334155);
}

.theme-toggle:hover {
  background: var(--color-surface-hover, #f8fafc);
  border-color: var(--color-border-hover, #cbd5e1);
}

.theme-icon {
  color: var(--color-text-muted, #64748b);
  flex-shrink: 0;
}

.theme-label {
  font-weight: 500;
}
</style>
