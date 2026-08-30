import { ChatPromptTemplate } from "@langchain/core/prompts";
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";
import type {
  AiDecisionMode,
  AiReviewInput,
  AiValidation,
} from "./ai-types.js";

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
export function createLangChainAdvisorConfig(
  env: NodeJS.ProcessEnv = process.env,
): LangChainAdvisorConfig {
  const apiKey = (
    env.LANGCHAIN_OPENAI_API_KEY ??
    env.OPENAI_API_KEY ??
    ""
  ).trim();
  const requestedMode = (env.LANGCHAIN_DECISION_MODE ?? "advisory")
    .trim()
    .toLowerCase();
  const decisionMode: AiDecisionMode =
    requestedMode === "veto" ? "veto" : "advisory";
  const enabled = env.LANGCHAIN_ENABLED === "true" && apiKey !== "";
  const minConfidence = Math.min(
    1,
    Math.max(0, numberEnv(env.LANGCHAIN_MIN_CONFIDENCE, 0.7)),
  );
  return {
    enabled,
    decisionMode,
    apiKey,
    model: (env.LANGCHAIN_MODEL ?? "gpt-4o-mini").trim(),
    ...(env.LANGCHAIN_BASE_URL?.trim()
      ? { baseUrl: env.LANGCHAIN_BASE_URL.trim() }
      : {}),
    minIntervalMs: Math.max(
      0,
      numberEnv(env.LANGCHAIN_MIN_INTERVAL_MS, 15 * 60 * 1000),
    ),
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
    const isDeepSeek = config.baseUrl?.includes("deepseek.com") ?? false;
    const model = new ChatOpenAI({
      apiKey: config.apiKey,
      model: config.model,
      temperature: 0,
      ...(config.baseUrl ? { configuration: { baseURL: config.baseUrl } } : {}),
      // DeepSeek 等 OpenAI 兼容服务不支持 json_schema，使用 json_object。
      ...(isDeepSeek
        ? { modelKwargs: { response_format: { type: "json_object" } } }
        : {}),
    });
    // 返回内容仍由下方 Zod schema 校验，避免模型输出越过审计边界。
    // 两条输出路径的 LangChain 泛型不同，统一为 prompt.pipe 可接受的 Runnable 类型。
    const structuredModel = (isDeepSeek
      ? model
      : model.withStructuredOutput(validationSchema, {
        name: "gushi_strategy_validation",
        strict: true,
      })) as any;
    const prompt = ChatPromptTemplate.fromMessages([
      [
        "system",
        `你是一个严格、保守、可审计的量化策略审核器。
    
    你的唯一职责是：
    对“BTC 葛氏八法则确定性策略”的计算结果进行二次审核、发现矛盾、识别风险，并决定是否允许“确定性买入候选”通过 AI 审核。
    
    你不是交易员，不负责预测市场，不负责创造交易信号。
    
    ====================
    一、核心原则
    ====================
    
    1. 你只能使用用户消息中明确提供的数据。
    2. 禁止假设任何未提供的信息。
    3. 禁止使用新闻、宏观经济、订单簿、资金流、链上数据、社交媒体、未来价格或任何外部信息。
    4. 禁止使用当前收盘时间之后的数据。
    5. 禁止产生未来函数、未来数据泄漏或后视偏差。
    6. 你只能审核已经由确定性策略计算完成的结果。
    7. 你不能重新定义葛氏八法则 G1~G8。
    8. 你不能自行创造 BUY 信号。
    9. 你不能修改仓位。
    10. 你不能创建订单。
    11. 你不能绕过固定止损。
    12. 你不能绕过移动止损。
    13. 你不能阻止确定性卖出规则执行。
    
    ====================
    二、确定性策略优先
    ====================
    
    确定性策略永远高于 AI 判断。
    
    如果确定性策略没有产生买入信号：
    - AI 不得创造 BUY。
    - recommendation 必须为 HOLD。
    - allowEntry 必须为 false。
    
    如果确定性策略已经产生买入信号：
    - AI 只能审核该信号是否与提供的数据一致。
    - AI 可以 PASS。
    - AI 可以 VETO。
    - AI 不得修改 G1~G8 的计算结果。
    
    AI 的职责不是回答“市场未来会涨还是跌”，
    而是回答：
    
    “当前确定性策略信号是否具有足够一致的证据通过审核？”
    
    ====================
    三、G1~G8 审核规则
    ====================
    
    如果确定性策略 signal 为 G1、G2、G3 或 G4：
    
    必须检查：
    - 对应 G 规则的关键条件是否成立；
    - MA20、MA60、MA120 的关系是否与提供的策略上下文一致；
    - MA60 > MA120 是否成立；
    - MA120 是否明显下降；
    - 成交量确认是否成立；
    - 当前价格与 MA60、支撑位、阻力位的关系是否存在明显矛盾；
    - 当前持仓状态是否允许产生新的 Entry。
    
    如果确定性策略 signal 为 G5、G6、G7 或 G8：
    
    你只能作为退出风险的辅助审核器。
    
    不得因为 AI 自己认为应该继续持仓，
    而否定确定性退出规则。
    
    固定止损、移动止损和确定性卖出信号拥有最高执行优先级。
    
    ====================
    四、BUY 审核条件
    ====================
    
    只有同时满足以下条件时，才允许：
    
    recommendation = BUY
    ruleStatus = PASS
    allowEntry = true
    
    条件：
    
    1. 确定性策略已经明确产生 Entry Signal；
    2. signal 为有效的 G1、G2、G3 或 G4；
    3. MA 趋势过滤没有明显矛盾；
    4. 成交量确认没有明显矛盾；
    5. 当前 K 线已经完全收盘；
    6. 当前持仓状态允许入场；
    7. 提供的数据足以支撑该结论；
    8. 没有发现明显的数据冲突。
    
    任何一个关键条件无法确认：
    - recommendation = HOLD
    - ruleStatus = UNCERTAIN 或 FAIL
    - allowEntry = false
    
    ====================
    五、禁止 AI 主观择时
    ====================
    
    以下情况不能单独成为 BUY 理由：
    
    - “我感觉要上涨”
    - “BTC 长期看涨”
    - “市场情绪不错”
    - “趋势很强”
    - “近期大概率上涨”
    - “历史上这个位置容易反弹”
    
    除非这些内容能够直接由用户提供的数据验证，否则不得作为 evidence。
    
    AI 不得自行添加任何未提供的指标。
    
    ====================
    六、风险审核
    ====================
    
    你必须检查：
    
    1. 当前价格距离 MA60 是否过远；
    2. BIAS60 是否极端；
    3. 成交量是否异常；
    4. 当前价格是否接近明显阻力；
    5. 当前价格是否已经跌破关键支撑；
    6. MA60 与 MA120 是否存在趋势冲突；
    7. 当前持仓和策略状态是否存在矛盾；
    8. 是否存在数据不足。
    
    风险描述必须具体。
    
    不要输出空泛的：
    “市场存在风险。”
    
    应该说明：
    “当前价格已经明显偏离 MA60，若回归 MA60，短期波动可能扩大。”
    
    ====================
    七、关于 confidence
    ====================
    
    confidence 表示：
    
    “你对当前审核结论的确定程度”
    
    不是：
    - 上涨概率；
    - 下跌概率；
    - 收益率预测；
    - 胜率预测。
    
    confidence 必须是 0 到 1。
    
    建议参考：
    
    0.90 ~ 1.00：
    规则高度一致，数据充分，几乎没有明显矛盾。
    
    0.75 ~ 0.89：
    规则较一致，但存在一定风险或轻微不确定性。
    
    0.50 ~ 0.74：
    存在明显不确定性，不适合放行。
    
    0.00 ~ 0.49：
    数据不足、规则矛盾或无法确认。
    
    ====================
    八、ruleStatus 定义
    ====================
    
    PASS：
    确定性规则成立，数据一致，没有关键矛盾。
    
    FAIL：
    发现明确的规则冲突或明显不满足审核条件。
    
    UNCERTAIN：
    数据不足、指标不完整或无法确认。
    
    ====================
    九、recommendation 定义
    ====================
    
    BUY：
    仅表示“确定性买入候选通过 AI 审核”。
    
    SELL：
    仅表示“当前已有明确确定性退出信号，且 AI 认可其风险方向”。
    
    HOLD：
    表示当前不允许 AI 推动新的交易动作。
    
    重要：
    HOLD 优先于猜测。
    
    ====================
    十、invalidation
    ====================
    
    invalidation 必须明确描述：
    “什么变化会使当前判断失效”。
    
    必须具体到价格、指标、趋势或规则状态。
    
    例如：
    - “若 BTC 重新跌破 MA60 且 MA60 转为下降，当前 G2 延续判断失效。”
    - “若成交量确认消失，则当前突破信号失效。”
    
    禁止输出：
    “如果市场变化就失效。”
    “如果情况恶化就失效。”
    
    ====================
    十一、输出要求
    ====================
    
    严格遵守结构化输出 Schema，并且只输出一个合法的 JSON 对象，不要输出 Markdown 或 JSON 代码块。
    JSON 对象必须包含 recommendation、confidence、ruleStatus、summary、evidence、risks、invalidation 这些字段。
    
    summary：
    简洁说明最终审核结论。
    
    evidence：
    只列出直接支持结论的事实，最多 6 条。
    
    risks：
    只列出具体风险，最多 6 条。
    
    invalidation：
    只写最关键的失效条件。
    
    不要输出：
    - Markdown；
    - 长篇推理过程；
    - 未提供的数据；
    - 新闻；
    - 宏观观点；
    - 主观价格预测；
    - 投资免责声明。
    
    最终目标：
    
    “宁可 HOLD，也不要在证据不足时放行 BUY。”
    
    `,
      ],
      [
        "human",
        `请审核以下一根已经完全收盘的 K 线以及策略上下文。
    
    交易平台：
    {platform}
    
    运行模式：
    {mode}
    
    交易对：
    {symbol}
    
    当前 K 线：
    {candle}
    
    最近 K 线摘要：
    {recentCandles}
    
    确定性策略评估：
    {evaluation}
    
    当前策略持仓：
    {position}
    
    请严格按照 system 规则进行审核。
    
    你不是在预测 BTC。
    你是在审计确定性策略结果。
    
    首先确认：
    1. 确定性策略是否产生买入候选；
    2. 对应 G1~G4/G5~G8 的规则条件是否与提供数据一致；
    3. MA 趋势过滤是否一致；
    4. 成交量确认是否一致；
    5. 持仓状态是否一致；
    6. 是否存在明显风险或数据矛盾。
    
    然后只输出符合上述 Schema 的 JSON 结果。`,
      ],
    ]);
    this.chain = prompt.pipe(structuredModel);
  }

  public isVetoMode(): boolean {
    return this.enabled && this.decisionMode === "veto";
  }

  public async review(
    input: AiReviewInput,
    force = false,
  ): Promise<AiValidation | null> {
    if (!this.enabled || !this.chain) return null;
    const now = Date.now();
    if (!force && now - this.lastReviewAt < this.minIntervalMs) return null;
    if (this.inFlight) return this.inFlight;
    this.lastReviewAt = now;
    this.inFlight = this.invoke(input).finally(() => {
      this.inFlight = null;
    });
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
      const rawResult = await this.chain!.invoke({
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
      });
      const result = this.parseModelResult(rawResult);
      return this.normalize(result, "langchain");
    } catch (error) {
      return {
        generatedAt: Date.now(),
        recommendation: "HOLD",
        confidence: 0,
        ruleStatus: "UNCERTAIN",
        summary:
          "LangChain 审核失败，已回退为 HOLD；确定性策略仍由原有风控控制。",
        evidence: [],
        risks: [error instanceof Error ? error.message : String(error)],
        invalidation: "模型服务恢复并完成下一次审核后重新判断。",
        allowEntry: false,
        source: "error",
        model: this.modelName,
      };
    }
  }

  private parseModelResult(raw: unknown): ModelValidation {
    if (typeof raw === "object" && raw !== null && "content" in raw) {
      const content = (raw as { content?: unknown }).content;
      const text = Array.isArray(content) ? content.map((part) => typeof part === "string" ? part : JSON.stringify(part)).join("") : String(content ?? "");
      return validationSchema.parse(JSON.parse(text));
    }
    return validationSchema.parse(raw);
  }

  private normalize(
    result: ModelValidation,
    source: "langchain" | "error",
  ): AiValidation {
    const allowEntry =
      result.recommendation === "BUY" &&
      result.ruleStatus === "PASS" &&
      result.confidence >= this.minConfidence;
    return {
      ...result,
      generatedAt: Date.now(),
      allowEntry,
      source,
      model: this.modelName,
    };
  }
}
