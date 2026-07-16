"use client";

import type { StoryCard } from "@/lib/schema";

type StoryCardViewProps = {
  card: StoryCard;
  evidenceCount?: number;
  exportId?: string;
  compact?: boolean;
  onDropNode?: (nodeId: string) => void;
};

const accentNames = {
  orange: "SIGNAL ORANGE",
  blue: "ELECTRIC BLUE",
  yellow: "PROOF YELLOW",
  ink: "INK BLACK",
} as const;

export function StoryCardView({
  card,
  evidenceCount = card.evidenceIds.length,
  exportId,
  compact = false,
  onDropNode,
}: StoryCardViewProps) {
  return (
    <article
      className={`story-card accent-${card.accent}${compact ? " is-compact" : ""}`}
      data-export-card={exportId}
      onDragOver={onDropNode ? (event) => event.preventDefault() : undefined}
      onDrop={
        onDropNode
          ? (event) => {
              event.preventDefault();
              const nodeId = event.dataTransfer.getData("application/x-jizuo-node");
              if (nodeId) onDropNode(nodeId);
            }
          : undefined
      }
    >
      <div className="card-grid" aria-hidden />
      <div className="card-orbit orbit-a" aria-hidden />
      <div className="card-orbit orbit-b" aria-hidden />
      <header className="story-card-header">
        <span className="wordmark">JIZUO°</span>
        <span className="card-index">TRACE / {String(card.order).padStart(2, "0")}</span>
      </header>

      <div className="card-number" aria-hidden>
        {String(card.order).padStart(2, "0")}
      </div>

      <div className="story-card-copy">
        <span className="card-eyebrow">{card.eyebrow}</span>
        <h2>{card.title}</h2>
        <p>{card.body}</p>
      </div>

      <footer className="story-card-footer">
        <div className="evidence-stamp">
          <span className="evidence-dot" />
          {evidenceCount} SOURCE{evidenceCount === 1 ? "" : "S"} LINKED
        </div>
        <span>{accentNames[card.accent]}</span>
      </footer>
    </article>
  );
}
