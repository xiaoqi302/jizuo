import type { SessionEvent, StoryCard, StoryNode, StoryProject } from "@/lib/schema";

function short(text: string, length: number) {
  const normalized = text.replace(/\s+/g, " ").replace(/^#+\s*/, "").trim();
  return normalized.length > length ? `${normalized.slice(0, length).trim()}\u2026` : normalized;
}

function firstOf(events: SessionEvent[], predicate: (event: SessionEvent) => boolean) {
  return events.find(predicate) || events[0];
}

function lastOf(events: SessionEvent[], predicate: (event: SessionEvent) => boolean) {
  return [...events].reverse().find(predicate) || events.at(-1) || events[0];
}

export function buildLocalStory(events: SessionEvent[], sourceName: string): StoryProject {
  const goal = firstOf(events, (event) => event.actor === "user");
  const firstTool = firstOf(events, (event) => event.actor === "tool");
  const failure = firstOf(events, (event) => event.kind === "error");
  const decision = firstOf(
    events,
    (event) => event.actor === "agent" && /\u7ed3\u8bba|\u51b3\u5b9a|\u5efa\u8bae|\u6539\u4e3a|\u9009\u62e9/.test(event.text),
  );
  const result = lastOf(events, (event) => event.actor === "agent" || event.kind === "tool_result");
  const evidence = lastOf(events, (event) => event.kind === "tool_result" || event.kind === "file_change");

  const nodes: StoryNode[] = [
    { id: "node-goal", kind: "goal", title: "\u8d77\u70b9", summary: short(goal.text, 160), eventIds: [goal.id], order: 0, emphasis: 3 },
    { id: "node-attempt", kind: "attempt", title: "\u7b2c\u4e00\u6b21\u884c\u52a8", summary: short(firstTool.text, 160), eventIds: [firstTool.id], order: 1, emphasis: 1 },
    { id: "node-failure", kind: "failure", title: failure.kind === "error" ? "\u9047\u5230\u963b\u529b" : "\u9700\u8981\u53d6\u820d", summary: short(failure.text, 160), eventIds: [failure.id], order: 2, emphasis: 2 },
    { id: "node-decision", kind: "decision", title: "\u5173\u952e\u8f6c\u6298", summary: short(decision.text, 160), eventIds: [decision.id], order: 3, emphasis: 3 },
    { id: "node-insight", kind: "insight", title: "\u53ef\u9a8c\u8bc1\u7684\u8bc1\u636e", summary: short(evidence.text, 160), eventIds: [evidence.id], order: 4, emphasis: 2 },
    { id: "node-result", kind: "result", title: "\u6700\u7ec8\u7ed3\u679c", summary: short(result.text, 180), eventIds: [result.id], order: 5, emphasis: 3 },
  ];

  const title = short(goal.title || goal.text, 48);
  const cards: StoryCard[] = [
    { id: "card-1", order: 1, role: "cover", eyebrow: "AI \u5b9e\u64cd\u8bb0\u5f55", title, body: "\u6211\u628a\u4e00\u6b21\u5b8c\u6574\u7684 AI \u5b9e\u64cd，\u62c6\u6210\u4e86\u53ef\u9a8c\u8bc1\u7684\u51b3\u7b56\u8f68\u8ff9。", nodeIds: ["node-goal"], evidenceIds: [goal.id], accent: "orange" },
    { id: "card-2", order: 2, role: "context", eyebrow: "01 / CONTEXT", title: "\u6211\u771f\u6b63\u60f3\u89e3\u51b3\u4ec0\u4e48？", body: short(goal.text, 210), nodeIds: ["node-goal"], evidenceIds: [goal.id], accent: "blue" },
    { id: "card-3", order: 3, role: "problem", eyebrow: "02 / FRICTION", title: "\u7b2c\u4e00\u4e2a\u96be\u70b9\u5f88\u5feb\u51fa\u73b0", body: short(failure.text, 210), nodeIds: ["node-failure"], evidenceIds: [failure.id], accent: "yellow" },
    { id: "card-4", order: 4, role: "process", eyebrow: "03 / PROCESS", title: "\u5148让工具替我完成机械劳动", body: short(firstTool.text, 210), nodeIds: ["node-attempt"], evidenceIds: [firstTool.id], accent: "ink" },
    { id: "card-5", order: 5, role: "turning", eyebrow: "04 / TURN", title: "\u8f6c\u6298点不是更强的 Prompt", body: short(decision.text, 220), nodeIds: ["node-decision"], evidenceIds: [decision.id], accent: "orange" },
    { id: "card-6", order: 6, role: "result", eyebrow: "05 / PROOF", title: "\u6bcf个结论都应该有来源", body: short(evidence.text, 220), nodeIds: ["node-insight"], evidenceIds: [evidence.id], accent: "blue" },
    { id: "card-7", order: 7, role: "lesson", eyebrow: "06 / RESULT", title: "\u6700后得到的不只是一段回答", body: short(result.text, 220), nodeIds: ["node-result"], evidenceIds: [result.id], accent: "yellow" },
    { id: "card-8", order: 8, role: "cta", eyebrow: "KEEP THE TRACE", title: "\u8ba9每一次 AI \u63a2索都留下作品", body: "Jizuo \u4fdd\u7559过程、转折与证据，而不只保留最后一句答案。", nodeIds: ["node-goal", "node-result"], evidenceIds: [goal.id, result.id], accent: "orange" },
  ];

  const warnings = events.some((event) => event.kind === "error") ? [] : ["\u65e5\u5fd7\u4e2d\u672a\u8bc6\u522b\u5230\u660e\u786e\u5931\u8d25节点，\u5efa\u8bae人工检查\u7b2c 3 \u9875。"];
  return {
    id: crypto.randomUUID(),
    sourceName,
    title,
    subtitle: "\u4ece对\u8bdd日志到有证据的内容故事板",
    audience: "\u5173\u6ce8 AI \u5de5具与真实工作流的内容创作者",
    thesis: "AI \u5b9e\u64cd的价值不只在最终答案，更在可追溯的失败、取舍与证据。",
    createdAt: new Date().toISOString(),
    source: "local",
    nodes,
    cards,
    quality: { score: warnings.length ? 78 : 86, warnings },
  };
}

export function buildSampleStory(events: SessionEvent[], sourceName: string): StoryProject {
  const eventMatching = (pattern: RegExp, fallbackIndex: number) =>
    events.find((event) => pattern.test(event.text)) || events[fallbackIndex] || events[0];
  const goal = eventMatching(/校园 AI 创造营/, 0);
  const firstIdea = eventMatching(/重录折叠器/, 1);
  const competitorProof = eventMatching(/Descript.*Remove Retakes/i, 3);
  const rejected = eventMatching(/竞品排雷推翻/, 4);
  const realPain = eventMatching(/很多过程没有变成可发布的内容/, 5);
  const traceProof = eventMatching(/structured sessions/i, 7);
  const turn = eventMatching(/关键转折/, 8);
  const implementation = eventMatching(/evidence schema/i, 11);
  const verification = eventMatching(/Tests 4 passed/i, 13);
  const result = eventMatching(/最终方向变成 Jizuo/, events.length - 1);

  const nodes: StoryNode[] = [
    { id: "node-goal", kind: "goal", title: "不做 Prompt 套壳", summary: short(goal.text, 160), eventIds: [goal.id], order: 0, emphasis: 3 },
    { id: "node-attempt", kind: "attempt", title: "第一个假设", summary: short(firstIdea.text, 160), eventIds: [firstIdea.id], order: 1, emphasis: 1 },
    { id: "node-failure", kind: "failure", title: "竞品排雷", summary: "Descript 与 Vidio 已经覆盖了原方向。", eventIds: [competitorProof.id, rejected.id], order: 2, emphasis: 3 },
    { id: "node-insight", kind: "insight", title: "回到真实摩擦", summary: short(realPain.text, 170), eventIds: [realPain.id, traceProof.id], order: 3, emphasis: 2 },
    { id: "node-decision", kind: "decision", title: "原材料早已存在", summary: short(turn.text, 180), eventIds: [turn.id], order: 4, emphasis: 3 },
    { id: "node-build", kind: "attempt", title: "做成可操纵工作台", summary: short(implementation.text, 160), eventIds: [implementation.id], order: 5, emphasis: 2 },
    { id: "node-result", kind: "result", title: "用测试证明结果", summary: short(result.text, 180), eventIds: [verification.id, result.id], order: 6, emphasis: 3 },
  ];

  const cards: StoryCard[] = [
    { id: "card-1", order: 1, role: "cover", eyebrow: "AI 产品实验", title: "我砍掉了第一个 AI 创意，然后找到了真正的问题", body: "一次竞品排雷，如何把“自动剪口播”改造成有证据的内容工具。", nodeIds: ["node-goal", "node-failure"], evidenceIds: [goal.id, competitorProof.id], accent: "orange" },
    { id: "card-2", order: 2, role: "context", eyebrow: "01 / THE BRIEF", title: "起点：我要的不是 Prompt 套壳", body: short(goal.text, 210), nodeIds: ["node-goal"], evidenceIds: [goal.id], accent: "blue" },
    { id: "card-3", order: 3, role: "problem", eyebrow: "02 / DEAD END", title: "第一个点子，竞品早就做了", body: "Descript 已能移除重录片段，Vidio 也能自动选最佳 take。听起来新，不等于真的新。", nodeIds: ["node-attempt", "node-failure"], evidenceIds: [firstIdea.id, competitorProof.id], accent: "yellow" },
    { id: "card-4", order: 4, role: "process", eyebrow: "03 / KILL IT", title: "没有硬保创意，先承认它不成立", body: short(rejected.text, 220), nodeIds: ["node-failure"], evidenceIds: [rejected.id], accent: "ink" },
    { id: "card-5", order: 5, role: "turning", eyebrow: "04 / REAL FRICTION", title: "真正的浪费：AI 过程没有变成内容", body: "我每天用 Codex 查仓库、试工具，有价值的失败和取舍却散落在会话日志里。", nodeIds: ["node-insight"], evidenceIds: [realPain.id, traceProof.id], accent: "orange" },
    { id: "card-6", order: 6, role: "result", eyebrow: "05 / THE TURN", title: "内容的原材料，其实一直在 Agent 轨迹里", body: "目标、工具调用、失败、取舍和结果都已经结构化存在；缺的只是把它们重组成故事。", nodeIds: ["node-decision"], evidenceIds: [turn.id], accent: "blue" },
    { id: "card-7", order: 7, role: "lesson", eyebrow: "06 / SHIPPED", title: "不是一段总结，而是 8 页有出处的作品", body: "Jizuo 让你拖动决策节点、绑定原始证据、编辑卡片，并直接导出 3:4 图文。", nodeIds: ["node-build", "node-result"], evidenceIds: [implementation.id, verification.id], accent: "yellow" },
    { id: "card-8", order: 8, role: "cta", eyebrow: "KEEP THE TRACE", title: "让每一次 AI 探索都留下作品", body: "导入一次会话。看见它的决策轨迹。讲出属于你的真实故事。", nodeIds: ["node-goal", "node-result"], evidenceIds: [goal.id, result.id], accent: "orange" },
  ];

  return {
    id: crypto.randomUUID(),
    sourceName,
    title: "我砍掉第一个 AI 创意后，找到了 Jizuo",
    subtitle: "从失败点子到有证据的内容工具",
    audience: "用 Agent 做真实项目、但没有时间复盘成内容的创作者",
    thesis: "好的 AI 内容不只有结果，还要保留失败、取舍与证据。",
    createdAt: new Date().toISOString(),
    source: "sample",
    nodes,
    cards,
    quality: { score: 96, warnings: [] },
  };
}
