import type { SessionEvent } from "@/lib/schema";
import { redactText } from "@/lib/redact";

type JsonRecord = Record<string, unknown>;

export type ParseResult = {
  events: SessionEvent[];
  format: "codex-jsonl" | "plain-text";
  redactionCount: number;
  skippedLines: number;
};

const MAX_EVENT_TEXT = 2_200;
const MAX_EVENTS = 120;

function asRecord(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : null;
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function contentText(value: unknown): string {
  if (typeof value === "string") return value;
  if (!Array.isArray(value)) return "";
  return value
    .map((block) => {
      const record = asRecord(block);
      if (!record) return "";
      return stringValue(record.text) || stringValue(record.output_text);
    })
    .filter(Boolean)
    .join("\n");
}

function outputText(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") return item;
        const record = asRecord(item);
        return record ? contentText(record.content) || stringValue(record.text) : "";
      })
      .filter(Boolean)
      .join("\n");
  }
  if (value == null) return "";
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function cleanText(value: string) {
  return value.replace(/\u0000/g, "").replace(/\n{3,}/g, "\n\n").trim().slice(0, MAX_EVENT_TEXT);
}

function eventTitle(text: string, fallback: string) {
  const firstLine = text.split("\n").find((line) => line.trim())?.trim() || fallback;
  return firstLine.replace(/^#+\s*/, "").slice(0, 120);
}

function looksLikeError(text: string) {
  return /\b(error|failed|failure|fatal|exception|exit[_ ]code["']?\s*[:=]\s*[1-9])\b|\u5931\u8d25|\u62a5\u9519|\u5f02\u5e38/i.test(text);
}

function classifyTool(name: string, input: string): SessionEvent["kind"] {
  if (name === "apply_patch" || /apply_patch|\*\*\* Begin Patch/.test(input)) return "file_change";
  if (name === "exec" || name === "exec_command" || name === "write_stdin") return "command";
  return "tool_call";
}

function parseJsonl(text: string) {
  const events: SessionEvent[] = [];
  const callNames = new Map<string, string>();
  let redactionCount = 0;
  let skippedLines = 0;

  const pushEvent = (event: Omit<SessionEvent, "id" | "index">) => {
    if (!event.text.trim()) return;
    const redacted = redactText(cleanText(event.text));
    redactionCount += redacted.count;
    if (!redacted.text) return;
    const index = events.length;
    events.push({ ...event, id: `event-${index + 1}`, index, text: redacted.text });
  };

  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    let row: JsonRecord;
    try {
      row = JSON.parse(line) as JsonRecord;
    } catch {
      skippedLines += 1;
      continue;
    }

    if (row.type !== "response_item") continue;
    const payload = asRecord(row.payload);
    if (!payload) continue;
    const payloadType = stringValue(payload.type);
    const timestamp = stringValue(row.timestamp) || null;

    if (payloadType === "message" || payloadType === "agent_message") {
      const role = stringValue(payload.role);
      if (role === "developer" || role === "system") continue;
      const textValue = contentText(payload.content) || stringValue(payload.message);
      const actor = role === "user" ? "user" : "agent";
      pushEvent({
        timestamp,
        kind: role === "user" ? "prompt" : "message",
        actor,
        title: eventTitle(textValue, actor === "user" ? "\u7528\u6237\u63d0\u51fa\u4efb\u52a1" : "Agent \u56de\u5e94"),
        text: textValue,
        evidenceLabel: actor === "user" ? "\u539f\u59cb\u9700\u6c42" : "Agent \u8f93\u51fa",
      });
      continue;
    }

    if (payloadType === "custom_tool_call" || payloadType === "function_call") {
      const name = stringValue(payload.name) || "tool";
      const callId = stringValue(payload.call_id) || stringValue(payload.id);
      if (callId) callNames.set(callId, name);
      const input = stringValue(payload.input) || stringValue(payload.arguments) || "{}";
      pushEvent({
        timestamp,
        kind: classifyTool(name, input),
        actor: "tool",
        title: `\u8c03\u7528 ${name}`,
        text: input,
        evidenceLabel: `\u5de5\u5177\u8c03\u7528 \u00b7 ${name}`,
        toolName: name,
      });
      continue;
    }

    if (payloadType === "custom_tool_call_output" || payloadType === "function_call_output") {
      const callId = stringValue(payload.call_id);
      const name = callNames.get(callId) || "tool";
      const result = outputText(payload.output);
      pushEvent({
        timestamp,
        kind: looksLikeError(result) ? "error" : "tool_result",
        actor: "tool",
        title: looksLikeError(result) ? `${name} \u6267\u884c\u5f02\u5e38` : `${name} \u8fd4\u56de\u7ed3\u679c`,
        text: result,
        evidenceLabel: `\u5de5\u5177\u7ed3\u679c \u00b7 ${name}`,
        toolName: name,
      });
    }
  }

  return { events, redactionCount, skippedLines };
}

function parsePlainText(text: string) {
  const chunks = text
    .split(/\n\s*\n+/)
    .map((chunk) => chunk.trim())
    .filter(Boolean);
  let redactionCount = 0;
  const events = chunks.slice(0, MAX_EVENTS).map((chunk, index): SessionEvent => {
    const roleMatch = chunk.match(/^(user|\u7528\u6237|assistant|agent|\u52a9\u624b)\s*[:\uff1a]\s*/i);
    const actor = roleMatch && /assistant|agent|\u52a9\u624b/i.test(roleMatch[1]) ? "agent" : "user";
    const raw = roleMatch ? chunk.slice(roleMatch[0].length) : chunk;
    const redacted = redactText(cleanText(raw));
    redactionCount += redacted.count;
    return {
      id: `event-${index + 1}`,
      index,
      timestamp: null,
      kind: actor === "user" ? "prompt" : "message",
      actor,
      title: eventTitle(redacted.text, actor === "user" ? "\u7528\u6237\u8f93\u5165" : "Agent \u56de\u5e94"),
      text: redacted.text,
      evidenceLabel: actor === "user" ? "\u539f\u59cb\u9700\u6c42" : "Agent \u8f93\u51fa",
    };
  });
  return { events, redactionCount, skippedLines: 0 };
}

function compactEvents(events: SessionEvent[]) {
  if (events.length <= MAX_EVENTS) return events;
  const important = events.filter(
    (event) => event.actor !== "tool" || event.kind === "error" || event.kind === "file_change",
  );
  const remaining = events.filter((event) => !important.includes(event));
  const selected = [...important, ...remaining.slice(0, Math.max(0, MAX_EVENTS - important.length))]
    .sort((a, b) => a.index - b.index)
    .slice(0, MAX_EVENTS);
  return selected.map((event, index) => ({ ...event, index }));
}

export function parseSessionText(text: string): ParseResult {
  const trimmed = text.trim();
  if (!trimmed) throw new Error("\u6587\u4ef6\u5185\u5bb9\u4e3a\u7a7a");
  const firstLine = trimmed.split(/\r?\n/, 1)[0];
  let jsonl = false;
  try {
    const first = JSON.parse(firstLine) as JsonRecord;
    jsonl = typeof first.type === "string";
  } catch {
    jsonl = false;
  }

  const parsed = jsonl ? parseJsonl(trimmed) : parsePlainText(trimmed);
  const events = compactEvents(parsed.events);
  if (events.length < 2) throw new Error("\u6ca1\u6709\u627e\u5230\u8db3\u591f\u7684\u5bf9\u8bdd\u6216\u5de5\u5177\u4e8b\u4ef6");
  return {
    ...parsed,
    events,
    format: jsonl ? "codex-jsonl" : "plain-text",
  };
}
