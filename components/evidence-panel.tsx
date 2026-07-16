"use client";

import type { SessionEvent, StoryCard, StoryNode, StoryProject } from "@/lib/schema";
import { Check, Link2, ShieldCheck, Trash2, X } from "lucide-react";

type EvidencePanelProps = {
  card: StoryCard;
  events: SessionEvent[];
  nodes: StoryNode[];
  project: StoryProject;
  notice: string;
  onUpdate: (changes: Partial<Pick<StoryCard, "eyebrow" | "title" | "body">>) => void;
  onRemoveEvidence: (eventId: string) => void;
  onRemoveNode: (nodeId: string) => void;
};

export function EvidencePanel({
  card,
  events,
  nodes,
  project,
  notice,
  onUpdate,
  onRemoveEvidence,
  onRemoveNode,
}: EvidencePanelProps) {
  const linkedEvents = card.evidenceIds
    .map((id) => events.find((event) => event.id === id))
    .filter((event): event is SessionEvent => Boolean(event));
  const linkedNodes = card.nodeIds
    .map((id) => nodes.find((node) => node.id === id))
    .filter((node): node is StoryNode => Boolean(node));

  return (
    <aside className="evidence-panel panel-shell">
      <div className="panel-heading">
        <div>
          <span className="micro-label">03 / EVIDENCE DESK</span>
          <h2>编辑与证据</h2>
        </div>
        <span className={`mode-chip mode-${project.source}`}>
          <span />{project.source === "deepseek" ? "DEEPSEEK" : project.source === "sample" ? "SAMPLE" : "LOCAL"}
        </span>
      </div>

      <div className="quality-strip">
        <span className="quality-score">{project.quality.score}</span>
        <div>
          <strong>证据完整度</strong>
          <small>{notice}</small>
        </div>
        <ShieldCheck size={20} />
      </div>

      <div className="edit-stack">
        <label>
          <span>页面标记</span>
          <input value={card.eyebrow} maxLength={36} onChange={(event) => onUpdate({ eyebrow: event.target.value })} />
        </label>
        <label>
          <span>标题</span>
          <textarea rows={2} value={card.title} maxLength={72} onChange={(event) => onUpdate({ title: event.target.value })} />
        </label>
        <label>
          <span>正文</span>
          <textarea rows={5} value={card.body} maxLength={360} onChange={(event) => onUpdate({ body: event.target.value })} />
        </label>
      </div>

      <div className="evidence-section">
        <div className="section-title">
          <span><Link2 size={14} /> 已绑定证据</span>
          <b>{linkedEvents.length}</b>
        </div>
        {linkedEvents.length ? (
          <div className="evidence-list">
            {linkedEvents.map((event) => (
              <article className="evidence-item" key={event.id}>
                <div>
                  <span className="evidence-type">{event.evidenceLabel}</span>
                  <strong>{event.title}</strong>
                  <p>{event.text}</p>
                </div>
                <button type="button" title="移除证据" onClick={() => onRemoveEvidence(event.id)}>
                  <Trash2 size={14} />
                </button>
              </article>
            ))}
          </div>
        ) : (
          <p className="empty-evidence">从左侧拖一个节点到卡片。</p>
        )}
      </div>

      <div className="evidence-section linked-node-section">
        <div className="section-title"><span><GitBranchMark /> 内容节点</span></div>
        {linkedNodes.map((node) => (
          <span className="linked-node" key={node.id}>
            <Check size={12} />{node.title}
            <button type="button" title="从当前页移除节点" onClick={() => onRemoveNode(node.id)}><X size={11} /></button>
          </span>
        ))}
      </div>

      {project.quality.warnings.length > 0 && (
        <div className="quality-warning">
          <strong>质检提醒</strong>
          {project.quality.warnings.map((warning) => <p key={warning}>{warning}</p>)}
        </div>
      )}
    </aside>
  );
}

function GitBranchMark() {
  return <span className="branch-mark" aria-hidden>⑂</span>;
}
