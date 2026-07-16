import { describe, expect, it } from "vitest";
import { buildLocalStory, buildSampleStory } from "@/lib/local-story";
import { storyProjectSchema, type SessionEvent } from "@/lib/schema";

const events: SessionEvent[] = [
  { id: "e1", index: 0, timestamp: null, kind: "prompt", actor: "user", title: "\u505a一个创意工具", text: "\u6211想做一个不是 Prompt \u5957壳的工具。", evidenceLabel: "\u539f\u59cb\u9700\u6c42" },
  { id: "e2", index: 1, timestamp: null, kind: "command", actor: "tool", title: "\u641c索项目", text: "rg --files", evidenceLabel: "\u5de5具\u8c03\u7528", toolName: "exec" },
  { id: "e3", index: 2, timestamp: null, kind: "error", actor: "tool", title: "\u4f9d赖缺失", text: "Error: module not found", evidenceLabel: "\u5de5具\u7ed3果", toolName: "exec" },
  { id: "e4", index: 3, timestamp: null, kind: "message", actor: "agent", title: "\u6539变方向", text: "\u5efa议改为会话轨迹到故事板的工具。", evidenceLabel: "Agent \u8f93\u51fa" },
  { id: "e5", index: 4, timestamp: null, kind: "tool_result", actor: "tool", title: "\u6784建通过", text: "Build completed successfully", evidenceLabel: "\u5de5具\u7ed3果", toolName: "exec" },
];

describe("buildLocalStory", () => {
  it("always creates a complete eight-card evidence-backed project", () => {
    const project = buildLocalStory(events, "demo.jsonl");
    expect(project.cards).toHaveLength(8);
    expect(project.nodes.length).toBeGreaterThanOrEqual(6);
    expect(project.cards.every((card) => card.evidenceIds.length > 0)).toBe(true);
    expect(project.source).toBe("local");
  });

  it("keeps the curated sample honest and evidence-linked", () => {
    const sample = buildSampleStory(events, "jizuo-demo-session.jsonl");
    expect(sample.source).toBe("sample");
    expect(sample.cards).toHaveLength(8);
    expect(sample.quality.score).toBeGreaterThan(90);
    expect(sample.cards.every((card) => card.evidenceIds.length > 0)).toBe(true);
  });

  it("rejects empty evidence and an invalid eight-card role sequence", () => {
    const sample = buildSampleStory(events, "jizuo-demo-session.jsonl");
    const invalid = {
      ...sample,
      cards: sample.cards.map((card, index) => index === 0 ? { ...card, role: "context", evidenceIds: [] } : card),
    };
    expect(storyProjectSchema.safeParse(invalid).success).toBe(false);
  });
});
