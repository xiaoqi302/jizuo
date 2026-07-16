"use client";

import type { StoryNode } from "@/lib/schema";
import {
  CheckCircle2,
  Flag,
  GitBranch,
  Lightbulb,
  TriangleAlert,
  Wrench,
} from "lucide-react";

type TraceMapProps = {
  nodes: StoryNode[];
  selectedNodeId: string | null;
  onSelect: (nodeId: string) => void;
};

const kindMeta = {
  goal: { label: "GOAL", icon: Flag },
  attempt: { label: "ATTEMPT", icon: Wrench },
  failure: { label: "FRICTION", icon: TriangleAlert },
  decision: { label: "DECISION", icon: GitBranch },
  insight: { label: "INSIGHT", icon: Lightbulb },
  result: { label: "RESULT", icon: CheckCircle2 },
} as const;

export function TraceMap({ nodes, selectedNodeId, onSelect }: TraceMapProps) {
  return (
    <section className="trace-panel panel-shell">
      <div className="panel-heading">
        <div>
          <span className="micro-label">01 / DECISION TRACE</span>
          <h2>决策轨迹</h2>
        </div>
        <span className="node-count">{nodes.length} NODES</span>
      </div>
      <p className="panel-instruction">点击或拖动节点到中间卡片，将其证据绑定到当前页。</p>
      <div className="trace-list">
        {nodes
          .slice()
          .sort((a, b) => a.order - b.order)
          .map((node, index) => {
            const meta = kindMeta[node.kind];
            const Icon = meta.icon;
            return (
              <div className="trace-node-wrap" key={node.id}>
                {index > 0 && <span className="trace-connector" aria-hidden />}
                <button
                  type="button"
                  className={`trace-node kind-${node.kind}${selectedNodeId === node.id ? " is-selected" : ""}`}
                  draggable
                  onClick={() => onSelect(node.id)}
                  onDragStart={(event) => {
                    event.dataTransfer.setData("application/x-jizuo-node", node.id);
                    event.dataTransfer.effectAllowed = "copy";
                  }}
                >
                  <span className="trace-icon"><Icon size={15} strokeWidth={2.4} /></span>
                  <span className="trace-node-copy">
                    <span className="trace-kind">{meta.label} · {String(index + 1).padStart(2, "0")}</span>
                    <strong>{node.title}</strong>
                    <small>{node.summary}</small>
                  </span>
                  <span className="drag-mark" aria-hidden>::</span>
                </button>
              </div>
            );
          })}
      </div>
    </section>
  );
}
