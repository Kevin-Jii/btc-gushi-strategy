export function formatMoney(value: number, digits = 2): string {
  return new Intl.NumberFormat("zh-CN", { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value);
}

export function formatAsset(value: number): string {
  return new Intl.NumberFormat("zh-CN", { minimumFractionDigits: 0, maximumFractionDigits: 8 }).format(value);
}

export function formatTime(timestamp: number): string {
  if (!timestamp) return "--";
  return new Date(timestamp).toLocaleString("zh-CN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}
