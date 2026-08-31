import { defineConfig, presetAttributify, presetIcons, presetUno } from "unocss";

const panel = "bg-surface border border-line rounded-lg text-ink";
export default defineConfig({
  presets: [presetUno(), presetAttributify(), presetIcons()],
  theme: {
    colors: {
      bg: "#080B12", surface: "#0F141D", hover: "#141B26", line: "#1E293B", ink: "#E8EDF5", muted: "#7D899B",
      primary: "#3B82F6", cyan: "#22D3EE", btc: "#F7931A", profit: "#22C55E", loss: "#EF4444", warning: "#F59E0B",
    },
    fontFamily: { sans: "Inter, ui-sans-serif, system-ui, -apple-system, PingFang SC, sans-serif", mono: "DM Mono, ui-monospace, SFMono-Regular, Menlo, monospace" },
  },
  shortcuts: {
    "app-container": "min-h-screen w-screen bg-bg text-ink font-sans antialiased",
    "app-header": "sticky top-0 z-100 flex h-16 w-full items-center gap-6 border-b border-line bg-surface/92 px-6 backdrop-blur-md",
    "header-brand": "flex shrink-0 items-center gap-2.5 text-ink",
    "brand-logo": "grid h-8 w-8 place-items-center rounded-lg bg-btc font-bold text-[#16100a] shadow-[0_0_22px_rgba(247,147,26,.2)]",
    "brand-text": "flex flex-col", "brand-title": "m-0! text-ink! font-bold! leading-tight!", "brand-subtitle": "m-0! mt-0.5! text-[10px]! text-muted! tracking-wide",
    "header-nav": "flex-1 justify-center bg-transparent! border-0!", "header-right": "flex items-center gap-2.5", "header-actions": "flex items-center gap-0.5",
    "connection-status": "flex items-center gap-3", "mode-indicator": "flex items-center gap-2", "header-connection": "inline-flex items-center gap-1.5 text-[11px] text-muted",
    "status-dot": "h-1.5 w-1.5 rounded-full bg-current shadow-[0_0_0_3px_rgba(34,197,94,.12)]", "connected": "text-profit!", "disconnected": "text-muted!",
    "symbol-selector": "min-w-37", "app-content": "mx-auto w-full max-w-screen-2xl min-w-0 bg-bg px-5 pb-6",
    "error-card": "mx-auto my-3.5 flex max-w-400 items-center gap-2.5 rounded-md border border-loss/30 bg-loss/8 px-3 py-2.5 text-loss",
    "chart-stage": "relative min-h-[calc(100vh-110px)] w-full min-w-0 overflow-hidden rounded-lg border border-line bg-surface pr-12",
    "market-toolbar": "flex h-15.5 items-center gap-5 border-b border-line px-0.5", "market-identity": "flex items-center gap-2.5", "market-price": "ml-auto flex items-center gap-2", "market-stats": "flex items-center gap-4 text-[11px] text-muted",
    "asset-logo": "grid h-8 w-8 place-items-center rounded-full bg-btc font-bold text-[#1b1208]", "market-price": "ml-auto flex items-center gap-2", "market-price strong": "font-mono text-xl font-medium text-profit",
    "trade-actions": "flex items-center gap-1.5", "trade-button": "inline-flex items-center gap-1.5 rounded border px-2.5 py-1.5 text-[11px] font-semibold cursor-pointer transition", "buy": "border-profit/35 bg-profit/18 text-profit", "sell": "border-loss/35 bg-loss/16 text-loss",
    "chart-card": "min-h-[calc(100vh-110px)] border-0! bg-transparent! p-0! shadow-none!", "metric-card": "flex min-h-22.5 flex-1 items-start gap-3 border-0! rounded-none! bg-transparent! p-3.5! shadow-none!", "metric-icon-wrapper": "grid h-8 w-8 shrink-0 place-items-center rounded bg-hover text-muted", "metric-content": "min-w-0 flex-1", "metrics-grid": "mx-auto mb-3.5 flex max-w-screen-2xl border border-line bg-surface", "equity": "border-t-2! border-btc!", "strategy": "border-t-2! border-primary!", "balance": "border-t-2! border-profit!", "position": "border-t-2! border-cyan!",  "card-header": "my-3.5 flex items-start justify-between", "card-title": "flex flex-col gap-1", "price-display": "flex items-baseline gap-1.5", "current-price": "font-mono text-2xl font-medium text-ink", "quote-asset": "text-xs text-muted",
    "signal-indicators": "flex gap-3", "signal-item": "flex flex-col items-end gap-1", "market-chart-host": "relative h-[calc(100vh-220px)] min-h-130 w-full", "market-chart": "h-full w-full", "chart-shell": "min-w-0", "empty-chart": "absolute inset-0 grid place-items-center text-xs text-muted pointer-events-none", "chart-legend": "text-[11px] text-muted", "chart-window": "text-muted",
    "trading-tool-rail": "absolute right-0 top-15.5 bottom-0 z-4 flex w-12 flex-col items-center gap-2 border-l border-line bg-bg/72 pt-3.5", "trading-tool-rail button": "grid h-8 w-8 place-items-center rounded text-muted bg-transparent cursor-pointer",
    "semi-card": panel, "account-card": "p-4", "position-card": "p-4", "ai-card": "p-4", "activity-card": "p-4", "account-header": "mb-3 flex items-center justify-between", "position-header": "mb-3 flex items-center justify-between", "activity-header": "mb-3 flex items-center justify-between",
    "account-summary": "rounded-md border border-btc/25 bg-btc/7 p-3", "asset-list": "flex flex-col gap-2", "asset-item": "flex items-center justify-between border-b border-line py-2.5", "asset-info": "flex items-center gap-2", "asset-value": "flex flex-col gap-0.5 text-right", "asset-icon": "grid h-7 w-7 place-items-center rounded text-xs font-bold", "btc": "bg-btc/16 text-btc", "usdt": "bg-profit/12 text-profit",
    "position-empty": "flex flex-col items-center justify-center gap-2 p-9 text-center text-muted", "ai-empty": "flex flex-col items-center justify-center gap-2 p-9 text-center text-muted", "activity-empty": "flex flex-col items-center justify-center gap-2 p-9 text-center text-muted", "position-main": "grid grid-cols-3 gap-3.5", "position-details": "grid grid-cols-3 gap-3.5", "detail-item": "flex flex-col gap-1", "pnl-value": "flex items-center gap-2",
    "data-panel": "p-2 text-ink", "data-panel-title": "border-b border-line pb-3 pt-2 text-sm font-bold", "strategy-row": "grid grid-cols-[minmax(190px,1fr)_100px_145px] items-center gap-3 border-b border-line px-1.5 py-2.5", "order-row": "grid grid-cols-[1.4fr_1fr_.8fr_.8fr_1fr] items-center gap-3 border-b border-line px-1.5 py-2.5", "order-table-head": "grid grid-cols-[1.4fr_1fr_.8fr_.8fr_1fr] gap-3 border-b border-line px-1.5 py-2.5 text-[11px] text-muted", "panel-empty": "p-10 text-center text-muted",
    "drawer-stack": "flex flex-col gap-3.5", "ai-header": "mb-4 flex items-start justify-between", "ai-title": "flex items-center gap-3 text-cyan", "ai-recommendation": "mb-3 flex items-center gap-4 rounded-md bg-hover p-3", "recommendation-icon": "grid h-12 w-12 place-items-center rounded-lg", "recommendation-info": "flex-1", "confidence": "min-w-30 text-right", "confidence-value": "flex flex-col gap-1", "ai-tags": "mb-3 flex gap-2", "ai-summary": "leading-relaxed text-[#A7B1C2]", "ai-insights": "grid grid-cols-2 gap-3.5", "insight-section": "flex flex-col gap-2", "text-secondary": "text-[#A7B1C2]", "section-heading": "flex items-end justify-between", "section-note": "text-[11px] text-muted", "eyebrow": "text-[10px] font-bold tracking-[.16em] text-btc", "eyebrow-dot": "mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-profit", "status-bar": "mx-auto mb-3.5 flex max-w-screen-2xl items-center gap-5 rounded border border-line bg-surface px-3 py-2 text-xs text-muted", "status-item": "flex items-center gap-1", "update-time": "ml-auto", "order-table": "w-full", "positive": "text-profit!", "negative": "text-loss!", "warning": "text-warning!", "activity-list": "flex max-h-52 flex-col gap-2 overflow-y-auto", "activity-item": "flex items-center gap-3 rounded px-2 py-2", "activity-content": "min-w-0 flex-1", "activity-icon": "grid h-8 w-8 shrink-0 place-items-center rounded bg-hover text-muted", "confidence-value span": "font-mono text-xl font-bold",
    "terminal-header": "sticky top-0 z-20 flex min-h-18 items-center gap-6 border-b border-line bg-[#080B12]/95 px-5 backdrop-blur-md",
    "terminal-btc-logo": "grid h-10 w-10 shrink-0 place-items-center rounded-full bg-btc text-xl font-bold text-[#16100a] shadow-[0_0_24px_rgba(247,147,26,.22)]",
    "terminal-panel": "rounded-lg border border-line bg-surface shadow-[0_10px_30px_rgba(0,0,0,.12)]",
    "terminal-icon-button": "grid h-8 w-8 place-items-center rounded text-muted transition hover:bg-hover hover:text-ink",
    "terminal-trade-button": "inline-flex h-10 items-center justify-center gap-2 rounded border text-xs font-semibold transition hover:brightness-125 disabled:cursor-not-allowed disabled:opacity-35",
    "terminal-eyebrow": "block text-[10px] font-bold tracking-[.16em] text-cyan",
    "terminal-title": "m-0 mt-1 text-base font-semibold text-ink",
    "terminal-label": "block text-[10px] text-muted",
    "terminal-status-pill": "rounded px-2 py-1 text-[10px] font-medium",
  },
  preflights: [{
    layer: "base",
    getCSS: () => `
      *,*::before,*::after { box-sizing: border-box; }
      html,body,#root { width: 100%; min-width: 0; min-height: 100%; margin: 0; background: #080B12; }
      body { font-family: Inter, ui-sans-serif, system-ui, -apple-system, "PingFang SC", sans-serif; color: #E8EDF5; -webkit-font-smoothing: antialiased; }
      button { font-family: inherit; }
      .semi-typography,.semi-typography-text,.semi-typography-paragraph { color: #E8EDF5; }
      .semi-typography-tertiary,.semi-typography-secondary { color: #A7B1C2 !important; }
      .semi-typography-heading { color: #E8EDF5 !important; }
      .semi-card { color: #E8EDF5 !important; }
      .semi-card:hover { transform: none !important; }
      .semi-sidesheet-inner { background: #0F141D !important; color: #E8EDF5 !important; }
      .semi-sidesheet-header { border-color: #1E293B !important; }
      @media (max-width: 720px) {
        .app-header { padding-left: 10px !important; padding-right: 10px !important; }
        .brand-subtitle,.header-nav,.connection-status,.header-right>.semi-divider,.mode-indicator>.semi-tag { display: none; }
        .app-content { padding-left: 8px; padding-right: 8px; }
        .market-stats { display: none; }
        .metrics-grid { display: grid; grid-template-columns: 1fr 1fr; }
        .chart-stage { padding-right: 42px; }
        .trading-tool-rail { width: 42px; }
        .position-main,.position-details { grid-template-columns: 1fr 1fr; }
      }
    `,
  }],
});
