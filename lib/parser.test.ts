import { describe, expect, it } from "vitest";
import { parseSessionText } from "@/lib/parser";

describe("parseSessionText", () => {
  it("parses Codex JSONL and pairs tool results", () => {
    const rows = [
      { timestamp: "2026-07-16T00:00:00Z", type: "session_meta", payload: { id: "session" } },
      { timestamp: "2026-07-16T00:00:01Z", type: "response_item", payload: { type: "message", role: "user", content: [{ type: "input_text", text: "\u5e2e\u6211\u5206\u6790这个项目" }] } },
      { timestamp: "2026-07-16T00:00:02Z", type: "response_item", payload: { type: "custom_tool_call", call_id: "call-1", name: "exec", input: "rg --files /Users/xzx/project" } },
      { timestamp: "2026-07-16T00:00:03Z", type: "response_item", payload: { type: "custom_tool_call_output", call_id: "call-1", output: "README.md\npackage.json" } },
      { timestamp: "2026-07-16T00:00:04Z", type: "response_item", payload: { type: "message", role: "assistant", content: [{ type: "output_text", text: "\u7ed3\u8bba：这是一个可用的工具。" }] } },
    ];
    const result = parseSessionText(rows.map((row) => JSON.stringify(row)).join("\n"));

    expect(result.format).toBe("codex-jsonl");
    expect(result.events).toHaveLength(4);
    expect(result.events[1]).toMatchObject({ kind: "command", toolName: "exec" });
    expect(result.events[2]).toMatchObject({ kind: "tool_result", toolName: "exec" });
    expect(result.events[1].text).toContain("~/project");
  });

  it("redacts secrets before returning events", () => {
    const text = [
      "\u7528\u6237：\u8bf7检查 DEEPSEEK_API_KEY=secret-value",
      "Agent：\u8054系 me@example.com，密钥 sk-1234567890abcdefghij",
    ].join("\n\n");
    const result = parseSessionText(text);

    expect(result.redactionCount).toBeGreaterThanOrEqual(3);
    expect(result.events.map((event) => event.text).join(" ")).not.toContain("secret-value");
    expect(result.events.map((event) => event.text).join(" ")).not.toContain("me@example.com");
  });

  it("parses standard JSON message collections", () => {
    const result = parseSessionText(JSON.stringify({
      messages: [
        { role: "user", content: "帮我把实操变成内容" },
        { role: "assistant", content: "我会先找出失败和转折。" },
      ],
    }));

    expect(result.format).toBe("json");
    expect(result.events).toHaveLength(2);
    expect(result.events.map((event) => event.actor)).toEqual(["user", "agent"]);
  });

  it("rejects content without enough events", () => {
    expect(() => parseSessionText("\u53ea有一段文字")).toThrow("\u6ca1\u6709\u627e\u5230\u8db3\u591f");
  });
});
