import { z } from "zod";

export const eventKindSchema = z.enum([
  "prompt",
  "message",
  "tool_call",
  "tool_result",
  "file_change",
  "command",
  "error",
]);

export const actorSchema = z.enum(["user", "agent", "tool", "system"]);

export const sessionEventSchema = z.object({
  id: z.string().min(1),
  index: z.number().int().nonnegative(),
  timestamp: z.string().nullable(),
  kind: eventKindSchema,
  actor: actorSchema,
  title: z.string().min(1).max(140),
  text: z.string().min(1).max(2_400),
  evidenceLabel: z.string().min(1).max(120),
  toolName: z.string().max(80).optional(),
});

export const storyNodeKindSchema = z.enum([
  "goal",
  "attempt",
  "failure",
  "decision",
  "insight",
  "result",
]);

export const storyNodeSchema = z.object({
  id: z.string().min(1),
  kind: storyNodeKindSchema,
  title: z.string().min(1).max(80),
  summary: z.string().min(1).max(280),
  eventIds: z.array(z.string()).min(1).max(12),
  order: z.number().int().nonnegative(),
  emphasis: z.number().int().min(1).max(3),
});

export const cardRoleSequence = [
  "cover",
  "context",
  "problem",
  "process",
  "turning",
  "result",
  "lesson",
  "cta",
] as const;

export const cardRoleSchema = z.enum(cardRoleSequence);

export const cardAccentSchema = z.enum(["orange", "blue", "yellow", "ink"]);

export const storyCardSchema = z.object({
  id: z.string().min(1),
  order: z.number().int().min(1).max(8),
  role: cardRoleSchema,
  eyebrow: z.string().min(1).max(36),
  title: z.string().min(1).max(72),
  body: z.string().min(1).max(360),
  nodeIds: z.array(z.string()).max(6),
  evidenceIds: z.array(z.string()).min(1).max(8),
  accent: cardAccentSchema,
});

export const storyCardsSchema = z.array(storyCardSchema).length(8).superRefine((cards, context) => {
  cards.forEach((card, index) => {
    if (card.order !== index + 1) {
      context.addIssue({ code: "custom", path: [index, "order"], message: `第 ${index + 1} 张卡片的 order 必须为 ${index + 1}` });
    }
    if (card.role !== cardRoleSequence[index]) {
      context.addIssue({ code: "custom", path: [index, "role"], message: `第 ${index + 1} 张卡片的 role 必须为 ${cardRoleSequence[index]}` });
    }
  });
});

export const storyProjectSchema = z.object({
  id: z.string().min(1),
  sourceName: z.string().min(1).max(160),
  title: z.string().min(1).max(100),
  subtitle: z.string().min(1).max(180),
  audience: z.string().min(1).max(120),
  thesis: z.string().min(1).max(260),
  createdAt: z.string(),
  source: z.enum(["deepseek", "local", "sample"]),
  nodes: z.array(storyNodeSchema).min(4).max(12),
  cards: storyCardsSchema,
  quality: z.object({
    score: z.number().int().min(0).max(100),
    warnings: z.array(z.string().max(180)).max(8),
  }),
});

export const storyDraftSchema = storyProjectSchema.omit({
  id: true,
  sourceName: true,
  createdAt: true,
  source: true,
});

export const analysisRequestSchema = z.object({
  sourceName: z.string().min(1).max(160),
  events: z.array(sessionEventSchema).min(2).max(120),
});

export type SessionEvent = z.infer<typeof sessionEventSchema>;
export type StoryNode = z.infer<typeof storyNodeSchema>;
export type StoryCard = z.infer<typeof storyCardSchema>;
export type StoryProject = z.infer<typeof storyProjectSchema>;
export type StoryDraft = z.infer<typeof storyDraftSchema>;
export type AnalysisRequest = z.infer<typeof analysisRequestSchema>;
