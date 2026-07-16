import "server-only";

import type { SessionEvent, StoryDraft } from "@/lib/schema";
import { storyDraftSchema } from "@/lib/schema";

const DEFAULT_BASE_URL = "https://api.deepseek.com";
const DEFAULT_MODEL = "deepseek-v4-flash";
const GATEWAY_BASE_URL = "https://ai-gateway.vercel.sh/v1";
const GATEWAY_MODEL = "deepseek/deepseek-v4-flash";
const TIMEOUT_MS = 45_000;

type DeepSeekMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type DeepSeekResponse = {
  choices?: Array<{
    finish_reason?: string;
    message?: { content?: string | null };
  }>;
};

const SYSTEM_PROMPT = `
你是 Jizuo 的证据型内容编辑。请把一段 AI Agent 会话事件整理成中文自媒体故事板。

必须遵守：
1. 只能根据输入事件写结论，不得编造工具、指标或成果。
2. 每个节点的 eventIds 只能引用输入中存在的 ID。
3. 恰好输出 8 张卡片，role 依次是 cover, context, problem, process, turning, result, lesson, cta。
4. 每张卡片都必须有 evidenceIds，且只能引用输入事件 ID。
5. 标题尽量具体、有反差，避免“震惊”“必看”等空洞爆款词。
6. 把失败、取舍和证据写出来，不要只写最终答案。
7. 返回一个有效 JSON 对象，不要 Markdown，不要代码块。

JSON 结构：
{
  "title": "整体标题",
  "subtitle": "副标题",
  "audience": "目标受众",
  "thesis": "一句话核心判断",
  "nodes": [{
    "id": "node-1",
    "kind": "goal|attempt|failure|decision|insight|result",
    "title": "节点标题",
    "summary": "节点摘要",
    "eventIds": ["event-1"],
    "order": 0,
    "emphasis": 1
  }],
  "cards": [{
    "id": "card-1",
    "order": 1,
    "role": "cover",
    "eyebrow": "AI 实操记录",
    "title": "卡片标题",
    "body": "卡片正文",
    "nodeIds": ["node-1"],
    "evidenceIds": ["event-1"],
    "accent": "orange|blue|yellow|ink"
  }],
  "quality": { "score": 0, "warnings": [] }
}
`.trim();

function modelConfig(oidcToken?: string | null) {
  const directKey = process.env.DEEPSEEK_API_KEY?.trim();
  if (directKey) {
    return {
      apiKey: directKey,
      baseUrl: process.env.DEEPSEEK_BASE_URL || DEFAULT_BASE_URL,
      model: process.env.DEEPSEEK_MODEL || DEFAULT_MODEL,
      direct: true,
    };
  }

  const gatewayKey = process.env.AI_GATEWAY_API_KEY?.trim()
    || oidcToken?.trim()
    || process.env.VERCEL_OIDC_TOKEN?.trim();
  if (gatewayKey) {
    return {
      apiKey: gatewayKey,
      baseUrl: GATEWAY_BASE_URL,
      model: process.env.AI_GATEWAY_MODEL || GATEWAY_MODEL,
      direct: false,
    };
  }

  return null;
}

async function requestJson(messages: DeepSeekMessage[], oidcToken?: string | null) {
  const config = modelConfig(oidcToken);
  if (!config) throw new Error("DeepSeek credentials are missing");

  const body: Record<string, unknown> = {
    model: config.model,
    messages,
    temperature: 0.3,
    max_tokens: 5_500,
    stream: false,
  };
  if (config.direct) {
    body.response_format = { type: "json_object" };
    body.thinking = { type: "disabled" };
  }

  const response = await fetch(`${config.baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`DeepSeek request failed (${response.status})`);
  }
  const data = (await response.json()) as DeepSeekResponse;
  const choice = data.choices?.[0];
  const content = choice?.message?.content?.trim();
  if (!content) throw new Error("DeepSeek returned empty JSON content");
  if (choice?.finish_reason === "length") throw new Error("DeepSeek JSON output was truncated");
  return content;
}

function validateReferences(draft: StoryDraft, events: SessionEvent[]) {
  const eventIds = new Set(events.map((event) => event.id));
  const nodeIds = new Set(draft.nodes.map((node) => node.id));
  const invalidNodeEvidence = draft.nodes.flatMap((node) => node.eventIds).filter((id) => !eventIds.has(id));
  const invalidCardEvidence = draft.cards.flatMap((card) => card.evidenceIds).filter((id) => !eventIds.has(id));
  const invalidCardNodes = draft.cards.flatMap((card) => card.nodeIds).filter((id) => !nodeIds.has(id));
  if (invalidNodeEvidence.length || invalidCardEvidence.length || invalidCardNodes.length) {
    throw new Error("DeepSeek returned references that do not exist in the source trace");
  }
  return draft;
}

function parseDraft(content: string, events: SessionEvent[]) {
  const parsed = storyDraftSchema.parse(JSON.parse(content));
  return validateReferences(parsed, events);
}

export async function generateStoryWithDeepSeek(
  events: SessionEvent[],
  oidcToken?: string | null,
): Promise<StoryDraft | null> {
  if (!modelConfig(oidcToken)) return null;

  const compactEvents = events.map((event) => ({
    id: event.id,
    kind: event.kind,
    actor: event.actor,
    title: event.title,
    text: event.text,
    evidenceLabel: event.evidenceLabel,
    toolName: event.toolName,
  }));
  const userPrompt = `请根据以下事件生成 JSON 故事板：\n${JSON.stringify(compactEvents)}`;
  const messages: DeepSeekMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: userPrompt },
  ];

  let content = await requestJson(messages, oidcToken);
  try {
    return parseDraft(content, events);
  } catch (error) {
    const repairMessage = error instanceof Error ? error.message : "JSON validation failed";
    content = await requestJson([
      ...messages,
      { role: "assistant", content },
      {
        role: "user",
        content: `上一份 JSON 未通过校验：${repairMessage}。请修复并返回完整 JSON，不要解释。`,
      },
    ], oidcToken);
    return parseDraft(content, events);
  }
}
