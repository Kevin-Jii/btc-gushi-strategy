import { Brain, ClipboardList, SlidersHorizontal, Wallet, Wrench } from "lucide-react";
import type { ReactElement } from "react";

export function TradingToolRail({ onWallet, onAi, onStrategies, onOrders }: { onWallet: () => void; onAi: () => void; onStrategies: () => void; onOrders: () => void }): ReactElement {
  return <aside className="trading-tool-rail"><button title="钱包" onClick={onWallet}><Wallet size={18} /></button><button title="AI 审核" onClick={onAi}><Brain size={18} /></button><button title="策略运行" onClick={onStrategies}><SlidersHorizontal size={18} /></button><button title="订单历史" onClick={onOrders}><ClipboardList size={18} /></button><button title="图表工具"><Wrench size={18} /></button></aside>;
}
