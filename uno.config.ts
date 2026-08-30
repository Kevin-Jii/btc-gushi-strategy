import { defineConfig, presetAttributify, presetIcons, presetUno } from "unocss";

export default defineConfig({
  presets: [presetUno(), presetAttributify(), presetIcons()],
  theme: {
    colors: {
      bg: "#080B12",
      surface: "#0F141D",
      hover: "#141B26",
      line: "#1E293B",
      ink: "#E8EDF5",
      muted: "#7D899B",
      primary: "#3B82F6",
      cyan: "#22D3EE",
      btc: "#F7931A",
      profit: "#22C55E",
      loss: "#EF4444",
      warning: "#F59E0B",
    },
  },
  shortcuts: {
    "terminal-panel": "bg-surface border border-line shadow-[0_12px_40px_rgba(0,0,0,.22)]",
    "terminal-label": "text-[11px] uppercase tracking-[.12em] text-muted",
    "terminal-number": "font-mono tabular-nums text-ink",
  },
});
