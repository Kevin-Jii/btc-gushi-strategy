import { ChatPromptTemplate } from "@langchain/core/prompts";
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";
import type { AiDecisionMode, AiReviewInput, AiValidation } from "./ai-types.js";

const validationSchema = z.object({
  recommendation: z.enum(["BUY", "SELL", "HOLD"]),
  confidence: z.number().min(0).max(1),
  ruleStatus: z.enum(["PASS", "FAIL", "UNCERTAIN"]),
  summary: z.string().min(1).max(500),
  evidence: z.array(z.string().min(1).max(180)).max(6),
  risks: z.array(z.string().min(1).max(180)).max(6),
  invalidation: z.string().min(1).max(220),
});

type ModelValidation = z.infer<typeof validationSchema>;

export interface LangChainAdvisorConfig {
  enabled: boolean;
  decisionMode: AiDecisionMode;
  apiKey: string;
  model: string;
  baseUrl?: string;
  minIntervalMs: number;
  minConfidence: number;
}

function numberEnv(value: string | undefined, fallback: number): number {
  if (!value || value.trim() === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/** 从环境变量创建 LangChain 审核器；没有模型密钥时保持关闭，不影响原策略。 */
export function createLangChainAdvisorConfig(env: NodeJS.ProcessEnv = process.env): LangChainAdvisorConfig {
  const apiKey = (env.LANGCHAIN_OPENAI_API_KEY ?? env.OPENAI_API_KEY ?? "").trim();
  const requestedMode = (env.LANGCHAIN_DECISION_MODE ?? "advisory").trim().toLowerCase();
  const decisionMode: AiDecisionMode = requestedMode === "veto" ? "veto" : "advisory";
  const enabled = env.LANGCHAIN_ENABLED === "true" && apiKey !== "";
  const minConfidence = Math.min(1, Math.max(0, numberEnv(env.LANGCHAIN_MIN_CONFIDENCE, 0.7)));
  return {
    enabled,
    decisionMode,
    apiKey,
    model: (env.LANGCHAIN_MODEL ?? "gpt-4o-mini").trim(),
    ...(env.LANGCHAIN_BASE_URL?.trim() ? { baseUrl: env.LANGCHAIN_BASE_URL.trim() } : {}),
    minIntervalMs: Math.max(0, numberEnv(env.LANGCHAIN_MIN_INTERVAL_MS, 15 * 60 * 1000)),
    minConfidence,
  };
}

/** 使用 LangChain 结构化输出持续复核策略，不直接拥有下单工具。 */
export class LangChainAdvisor {
  public readonly enabled: boolean;
  public readonly decisionMode: AiDecisionMode;
  public readonly modelName: string;
  private readonly minIntervalMs: number;
  private readonly minConfidence: number;
  private readonly chain: ReturnType<ChatPromptTemplate["pipe"]> | null;
  private lastReviewAt = 0;
  private inFlight: Promise<AiValidation> | null = null;

  public constructor(private readonly config: LangChainAdvisorConfig) {
    this.enabled = config.enabled;
    this.decisionMode = config.decisionMode;
    this.modelName = config.model;
    this.minIntervalMs = config.minIntervalMs;
    this.minConfidence = config.minConfidence;
    if (!config.enabled) {
      this.chain = null;
      return;
    }
    const model = new ChatOpenAI({
      apiKey: config.apiKey,
      model: config.model,
      temperature: 0,
      ...(config.baseUrl ? { configuration: { baseURL: config.baseUrl } } : {}),
    });
    const structuredModel = model.withStructuredOutput(validationSchema, { name: "gushi_strategy_validation", strict: true });
    const prompt = ChatPromptTemplate.fromMessages([
      ["system", `你是一个严格、保守的量化策略审核器。你正在审核 BTC 葛氏八法则的确定性结果，不是自由发挥的交易员。

只使用用户消息提供的数据，不得假设新闻、订单簿、未来价格或未提供的指标。先检查规则信号、MA 趋势过滤、成交量确认、当前持仓和风险信息是否互相一致，再给出 BUY、SELL 或 HOLD 建议。

重要约束：
- 你的输出只用于审核和建议，不能创建订单、修改仓位或绕过止损。
- 当数据不足、指标矛盾或模型无法确认时，使用 HOLD 和 UNCERTAIN。
- BUY 只有在确定性策略已经给出买入信号且证据一致时才允许；模型不能凭空创造买入信号。
- 风险说明必须具体，invalidation 写出什么变化会使当前判断失效。
- confidence 是 0 到 1 的小数。`],
      ["human", `请审核以下一根已收盘 K 线和最近上下文：

交易平台：{platform}
运行模式：{mode}
交易对：{symbol}
当前 K 线：{candle}
最近 K 线摘要：{recentCandles}
确定性策略评估：{evaluation}
当前策略持仓：{position}

请严格返回结构化结果。`],
    ]);
    this.chain = prompt.pipe(structuredModel);
  }

  public isVetoMode(): boolean {
    return this.enabled && this.decisionMode === "veto";
  }

  public async review(input: AiReviewInput, force = false): Promise<AiValidation | null> {
    if (!this.enabled || !this.chain) return null;
    const now = Date.now();
    if (!force && now - this.lastReviewAt < this.minIntervalMs) return null;
    if (this.inFlight) return this.inFlight;
    this.lastReviewAt = now;
    this.inFlight = this.invoke(input).finally(() => { this.inFlight = null; });
    return this.inFlight;
  }

  private async invoke(input: AiReviewInput): Promise<AiValidation> {
    const recentCandles = input.recentCandles.slice(-30).map((candle) => ({
      time: new Date(candle.timestamp).toISOString(),
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
      volume: candle.volume,
    }));
    try {
      const result = await this.chain!.invoke({
        platform: input.platform,
        mode: input.mode,
        symbol: input.symbol,
        candle: JSON.stringify(input.candle),
        recentCandles: JSON.stringify(recentCandles),
        evaluation: JSON.stringify({
          signal: input.evaluation.signal,
          trendFilter: input.evaluation.trendFilter,
          entrySignal: input.evaluation.entrySignal,
          context: input.evaluation.context,
        }),
        position: JSON.stringify(input.position),
      }) as ModelValidation;
      return this.normalize(result, "langchain");
    } catch (error) {
      return {
        generatedAt: Date.now(),
        recommendation: "HOLD",
        confidence: 0,
        ruleStatus: "UNCERTAIN",
        summary: "LangChain 审核失败，已回退为 HOLD；确定性策略仍由原有风控控制。",
        evidence: [],
        risks: [error instanceof Error ? error.message : String(error)],
        invalidation: "模型服务恢复并完成下一次审核后重新判断。",
        allowEntry: false,
        source: "error",
        model: this.modelName,
      };
    }
  }

  private normalize(result: ModelValidation, source: "langchain" | "error"): AiValidation {
    const allowEntry = result.recommendation === "BUY" && result.ruleStatus === "PASS" && result.confidence >= this.minConfidence;
    return { ...result, generatedAt: Date.now(), allowEntry, source, model: this.modelName };
  }
}
