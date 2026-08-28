import assert from "node:assert/strict";
import { createLangChainAdvisorConfig, LangChainAdvisor } from "./langchain-advisor.js";

const baseEnv: NodeJS.ProcessEnv = {
  LANGCHAIN_ENABLED: "true",
  LANGCHAIN_OPENAI_API_KEY: "test-key",
  LANGCHAIN_MODEL: "test-model",
};

const disabled = new LangChainAdvisor(createLangChainAdvisorConfig({
  LANGCHAIN_ENABLED: "false",
  LANGCHAIN_OPENAI_API_KEY: "",
}));
assert.equal(disabled.enabled, false);
assert.equal(await disabled.review({} as never), null);

const advisory = createLangChainAdvisorConfig({ ...baseEnv, LANGCHAIN_DECISION_MODE: "advisory" });
assert.equal(advisory.enabled, true);
assert.equal(advisory.decisionMode, "advisory");
assert.equal(new LangChainAdvisor(advisory).isVetoMode(), false);

const veto = createLangChainAdvisorConfig({ ...baseEnv, LANGCHAIN_DECISION_MODE: "veto", LANGCHAIN_MIN_CONFIDENCE: "0.8" });
assert.equal(veto.decisionMode, "veto");
assert.equal(veto.minConfidence, 0.8);
assert.equal(new LangChainAdvisor(veto).isVetoMode(), true);

console.log("langchain-advisor tests passed");
