import { buildLocalStory, buildSampleStory } from "@/lib/local-story";
import { generateStoryWithDeepSeek } from "@/lib/deepseek";
import { analysisRequestSchema, storyProjectSchema } from "@/lib/schema";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const WINDOW_MS = 10 * 60 * 1_000;
const MAX_REQUESTS = 6;
const MAX_BODY_LENGTH = 360_000;

type Bucket = { count: number; resetAt: number };
const globalForRateLimit = globalThis as typeof globalThis & {
  jizuoRateLimits?: Map<string, Bucket>;
};
const rateLimits = globalForRateLimit.jizuoRateLimits || new Map<string, Bucket>();
globalForRateLimit.jizuoRateLimits = rateLimits;

function clientIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}

function allowed(ip: string) {
  const now = Date.now();
  const current = rateLimits.get(ip);
  if (!current || current.resetAt <= now) {
    rateLimits.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (current.count >= MAX_REQUESTS) return false;
  current.count += 1;
  return true;
}

export async function POST(request: Request) {
  const raw = await request.text();
  if (raw.length > MAX_BODY_LENGTH) {
    return NextResponse.json({ error: "会话内容过大，请精简后重试。" }, { status: 413 });
  }

  let input: unknown;
  try {
    input = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "请求格式无效。" }, { status: 400 });
  }
  const parsed = analysisRequestSchema.safeParse(input);
  if (!parsed.success) {
    return NextResponse.json({ error: "会话事件未通过校验。" }, { status: 400 });
  }

  if (parsed.data.sourceName === "jizuo-demo-session.jsonl") {
    return NextResponse.json({
      project: buildSampleStory(parsed.data.events, parsed.data.sourceName),
      mode: "sample",
      notice: "已加载内置示例；上传你的日志即可调用 DeepSeek 分析。",
    });
  }

  if (!allowed(clientIp(request))) {
    return NextResponse.json({ error: "请求过于频繁，请 10 分钟后再试。" }, { status: 429 });
  }

  const local = buildLocalStory(parsed.data.events, parsed.data.sourceName);
  try {
    const draft = await generateStoryWithDeepSeek(parsed.data.events);
    if (!draft) {
      return NextResponse.json({
        project: local,
        mode: "local",
        notice: "DeepSeek 尚未配置，已使用本地基础模式生成。",
      });
    }
    const project = storyProjectSchema.parse({
      ...draft,
      id: crypto.randomUUID(),
      sourceName: parsed.data.sourceName,
      createdAt: new Date().toISOString(),
      source: "deepseek",
    });
    return NextResponse.json({ project, mode: "deepseek", notice: "DeepSeek 已生成证据故事板。" });
  } catch {
    return NextResponse.json({
      project: local,
      mode: "local",
      notice: "DeepSeek 暂时不可用，已安全切换到本地基础模式。",
    });
  }
}
