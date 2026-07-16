"use client";

import { EvidencePanel } from "@/components/evidence-panel";
import { StoryCardView } from "@/components/story-card";
import { TraceMap } from "@/components/trace-map";
import { parseSessionText, type ParseResult } from "@/lib/parser";
import { storyProjectSchema, type SessionEvent, type StoryCard, type StoryProject } from "@/lib/schema";
import { toPng } from "html-to-image";
import JSZip from "jszip";
import {
  ArrowDownToLine,
  ArrowRight,
  Braces,
  CheckCircle2,
  FileJson2,
  GitFork,
  LoaderCircle,
  LockKeyhole,
  RefreshCcw,
  Sparkles,
  Upload,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

const MAX_FILE_BYTES = 8 * 1024 * 1024;
const STORAGE_KEY = "jizuo:last-project:v1";

type StoredWorkspace = {
  project: StoryProject;
  events: SessionEvent[];
  notice: string;
};

export function JizuoStudio() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [events, setEvents] = useState<SessionEvent[]>([]);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [sourceName, setSourceName] = useState("");
  const [project, setProject] = useState<StoryProject | null>(null);
  const [selectedCardId, setSelectedCardId] = useState("card-1");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [manualText, setManualText] = useState("");
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    let restoreFrame: number | undefined;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return;
      const workspace = JSON.parse(saved) as StoredWorkspace;
      const checked = storyProjectSchema.safeParse(workspace.project);
      if (!checked.success || !Array.isArray(workspace.events)) return;
      restoreFrame = window.requestAnimationFrame(() => {
        setProject(checked.data);
        setEvents(workspace.events);
        setNotice(workspace.notice || "已恢复上次工作台。");
      });
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
    return () => {
      if (restoreFrame !== undefined) window.cancelAnimationFrame(restoreFrame);
    };
  }, []);

  useEffect(() => {
    if (!project || !events.length) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ project, events, notice } satisfies StoredWorkspace));
    } catch {
      // Storage is a convenience only; private mode and quota failures are safe to ignore.
    }
  }, [project, events, notice]);

  useEffect(() => {
    if (project) window.scrollTo({ top: 0, behavior: "smooth" });
  }, [project]);

  const selectedCard = project?.cards.find((card) => card.id === selectedCardId) || project?.cards[0] || null;

  function ingestText(text: string, name: string) {
    const result = parseSessionText(text);
    setEvents(result.events);
    setParseResult(result);
    setSourceName(name);
    setProject(null);
    setSelectedCardId("card-1");
    setSelectedNodeId(null);
    setNotice("");
    setError("");
    return result;
  }

  async function analyze(inputEvents = events, inputName = sourceName) {
    if (inputEvents.length < 2 || !inputName) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceName: inputName, events: inputEvents }),
      });
      const data = (await response.json()) as { project?: unknown; notice?: string; error?: string };
      if (!response.ok) throw new Error(data.error || "分析失败");
      const checked = storyProjectSchema.safeParse(data.project);
      if (!checked.success) throw new Error("故事板结构未通过校验");
      setProject(checked.data);
      setSelectedCardId(checked.data.cards[0].id);
      setSelectedNodeId(checked.data.nodes[0]?.id || null);
      setNotice(data.notice || "故事板已生成。");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "分析失败，请重试。");
    } finally {
      setBusy(false);
    }
  }

  async function loadSample() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/demo-session.jsonl");
      if (!response.ok) throw new Error("示例日志加载失败");
      const result = ingestText(await response.text(), "jizuo-demo-session.jsonl");
      await analyze(result.events, "jizuo-demo-session.jsonl");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "示例加载失败。");
      setBusy(false);
    }
  }

  async function readFile(file: File) {
    if (file.size > MAX_FILE_BYTES) {
      setError("文件超过 8MB，请先精简日志。");
      return;
    }
    try {
      ingestText(await file.text(), file.name);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "文件无法解析。");
    }
  }

  function reset() {
    setEvents([]);
    setParseResult(null);
    setSourceName("");
    setProject(null);
    setSelectedCardId("card-1");
    setSelectedNodeId(null);
    setManualText("");
    setNotice("");
    setError("");
    localStorage.removeItem(STORAGE_KEY);
  }

  function updateCurrentCard(changes: Partial<Pick<StoryCard, "eyebrow" | "title" | "body">>) {
    if (!project || !selectedCard) return;
    setProject({
      ...project,
      cards: project.cards.map((card) => (card.id === selectedCard.id ? { ...card, ...changes } : card)),
    });
  }

  function addNodeToCurrentCard(nodeId: string) {
    if (!project || !selectedCard) return;
    const node = project.nodes.find((item) => item.id === nodeId);
    if (!node) return;
    setProject({
      ...project,
      cards: project.cards.map((card) =>
        card.id === selectedCard.id
          ? {
              ...card,
              nodeIds: Array.from(new Set([...card.nodeIds, node.id])).slice(0, 6),
              evidenceIds: Array.from(new Set([...card.evidenceIds, ...node.eventIds])).slice(0, 8),
            }
          : card,
      ),
    });
    setSelectedNodeId(nodeId);
    setNotice(`已将“${node.title}”及其证据绑定到第 ${selectedCard.order} 页。`);
  }

  function removeEvidence(eventId: string) {
    if (!project || !selectedCard) return;
    setProject({
      ...project,
      cards: project.cards.map((card) =>
        card.id === selectedCard.id
          ? { ...card, evidenceIds: card.evidenceIds.filter((id) => id !== eventId) }
          : card,
      ),
    });
  }

  async function renderCard(element: HTMLElement) {
    await document.fonts.ready;
    return toPng(element, {
      cacheBust: true,
      pixelRatio: 1.5,
      backgroundColor: "#f3ead8",
      width: 900,
      height: 1200,
    });
  }

  async function exportCards(singleCardId?: string) {
    if (!project) return;
    setExporting(true);
    setError("");
    try {
      const nodes = Array.from(document.querySelectorAll<HTMLElement>("[data-export-card]"));
      const wanted = singleCardId ? nodes.filter((node) => node.dataset.exportCard === singleCardId) : nodes;
      if (!wanted.length) throw new Error("未找到可导出的卡片");
      if (singleCardId) {
        const dataUrl = await renderCard(wanted[0]);
        downloadDataUrl(dataUrl, `jizuo-${singleCardId}.png`);
      } else {
        const zip = new JSZip();
        for (const [index, node] of wanted.entries()) {
          setNotice(`正在导出 ${index + 1} / ${wanted.length}…`);
          const dataUrl = await renderCard(node);
          zip.file(`jizuo-${String(index + 1).padStart(2, "0")}.png`, dataUrl.split(",")[1], { base64: true });
        }
        const blob = await zip.generateAsync({ type: "blob" });
        downloadBlob(blob, "jizuo-storyboard.zip");
      }
      setNotice(singleCardId ? "当前卡片已导出。" : "8 页故事板已打包导出。");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "导出失败。");
    } finally {
      setExporting(false);
    }
  }

  if (project && selectedCard) {
    return (
      <main className="studio-page">
        <header className="studio-header">
          <a className="studio-brand" href="#" onClick={(event) => { event.preventDefault(); reset(); }}>
            <LogoMark />
            <span>JIZUO<sup>°</sup></span>
          </a>
          <div className="studio-title">
            <span>{project.sourceName}</span>
            <strong>{project.title}</strong>
          </div>
          <div className="studio-actions">
            <button className="ghost-button" type="button" onClick={reset}><RefreshCcw size={15} />新建</button>
            <button className="primary-button" type="button" disabled={exporting} onClick={() => exportCards()}>
              {exporting ? <LoaderCircle className="spin" size={16} /> : <ArrowDownToLine size={16} />}
              {exporting ? "导出中" : "导出 8 页"}
            </button>
          </div>
        </header>

        {(notice || error) && (
          <div className={`status-banner${error ? " is-error" : ""}`}>
            {error ? "!" : "✓"} {error || notice}
          </div>
        )}

        <div className="studio-grid">
          <TraceMap nodes={project.nodes} selectedNodeId={selectedNodeId} onSelect={addNodeToCurrentCard} />

          <section className="storyboard-panel panel-shell">
            <div className="panel-heading storyboard-heading">
              <div>
                <span className="micro-label">02 / STORYBOARD</span>
                <h2>8 页内容故事板</h2>
              </div>
              <button className="mini-export" type="button" disabled={exporting} onClick={() => exportCards(selectedCard.id)}>
                <ArrowDownToLine size={14} /> 导出当前页
              </button>
            </div>
            <div className="active-card-stage">
              <div className="drop-hint">拖入左侧节点，绑定真实证据</div>
              <StoryCardView card={selectedCard} onDropNode={addNodeToCurrentCard} />
            </div>
            <div className="card-filmstrip" aria-label="故事板页面">
              {project.cards.map((card) => (
                <button
                  type="button"
                  key={card.id}
                  className={card.id === selectedCard.id ? "is-active" : ""}
                  onClick={() => setSelectedCardId(card.id)}
                >
                  <StoryCardView card={card} compact />
                  <span>{String(card.order).padStart(2, "0")}</span>
                </button>
              ))}
            </div>
          </section>

          <EvidencePanel
            card={selectedCard}
            events={events}
            nodes={project.nodes}
            project={project}
            notice={notice}
            onUpdate={updateCurrentCard}
            onRemoveEvidence={removeEvidence}
          />
        </div>

        <div className="export-surface" aria-hidden>
          {project.cards.map((card) => (
            <StoryCardView key={card.id} card={card} exportId={card.id} />
          ))}
        </div>
      </main>
    );
  }

  return (
    <main className="landing-page">
      <div className="grain" aria-hidden />
      <header className="site-header">
        <a className="site-brand" href="#top"><LogoMark /><span>JIZUO<sup>°</sup></span></a>
        <span className="edition-tag">CAMPUS AI / 2026</span>
        <a className="github-link" href="https://github.com/xiaoqi302/jizuo" target="_blank" rel="noreferrer">
          <GitFork size={15} /> GITHUB
        </a>
      </header>

      <section className="hero" id="top">
        <div className="hero-kicker"><span /> AGENT TRACE → SOCIAL STORY</div>
        <h1>
          让每一次 <em>AI 探索</em><br />
          都留下作品。
        </h1>
        <p className="hero-copy">
          Jizuo 把 Codex 会话里的目标、失败、取舍与结果，重组成
          <strong>可追溯的决策图</strong>和<strong> 8 页内容故事板</strong>。
        </p>

        <div className="hero-proof">
          <div><b>01</b><span>LOCAL PARSE<br />浏览器解析</span></div>
          <div><b>02</b><span>EVIDENCE LINK<br />证据可回溯</span></div>
          <div><b>03</b><span>READY TO POST<br />3:4 直接导出</span></div>
        </div>
      </section>

      <section className={`import-lab${dragActive ? " is-dragging" : ""}`}>
        <div className="lab-heading">
          <span className="lab-number">01</span>
          <div><span className="micro-label">IMPORT THE TRACE</span><h2>导入一次真实的 AI 会话</h2></div>
          <span className="privacy-note"><LockKeyhole size={14} /> 先本地脱敏，后分析</span>
        </div>

        <div
          className="drop-zone"
          onDragEnter={(event) => { event.preventDefault(); setDragActive(true); }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={(event) => { if (event.currentTarget === event.target) setDragActive(false); }}
          onDrop={(event) => {
            event.preventDefault();
            setDragActive(false);
            const file = event.dataTransfer.files[0];
            if (file) readFile(file);
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".jsonl,.json,.txt,.md,application/json,text/plain"
            hidden
            onChange={(event) => { const file = event.target.files?.[0]; if (file) readFile(file); event.target.value = ""; }}
          />
          <div className="drop-icon"><FileJson2 size={30} /></div>
          <div className="drop-copy">
            <strong>把 Codex .jsonl 拖到这里</strong>
            <span>也支持 JSON、Markdown 和普通对话文本 · 最大 8MB</span>
          </div>
          <button className="upload-button" type="button" onClick={() => fileInputRef.current?.click()}><Upload size={16} />选择文件</button>
        </div>

        <div className="or-divider"><span>OR</span></div>
        <div className="quick-actions">
          <button className="sample-button" type="button" disabled={busy} onClick={loadSample}>
            {busy ? <LoaderCircle className="spin" size={18} /> : <Sparkles size={18} />}
            <span><strong>用示例轨迹体验</strong><small>不用准备文件，30 秒看见成品</small></span>
            <ArrowRight size={18} />
          </button>
          <details className="paste-disclosure">
            <summary><Braces size={17} /><span><strong>粘贴对话文本</strong><small>适用于 ChatGPT / Claude 记录</small></span><ArrowRight size={18} /></summary>
            <div className="paste-box">
              <textarea value={manualText} onChange={(event) => setManualText(event.target.value)} placeholder={"用户：我想解决…\n\nAgent：我先检查…"} />
              <button type="button" onClick={() => { try { ingestText(manualText, "pasted-conversation.txt"); } catch (cause) { setError(cause instanceof Error ? cause.message : "无法解析文本。"); } }}>解析文本</button>
            </div>
          </details>
        </div>

        {parseResult && !project && (
          <div className="parse-receipt">
            <div className="receipt-status"><CheckCircle2 size={20} /><span><strong>日志已在本地解析</strong><small>{sourceName}</small></span></div>
            <div className="receipt-metrics">
              <span><b>{parseResult.events.length}</b>事件</span>
              <span><b>{parseResult.redactionCount}</b>处脱敏</span>
              <span><b>{parseResult.format === "codex-jsonl" ? "CODEX" : "TEXT"}</b>格式</span>
            </div>
            <button className="primary-button analyze-button" type="button" disabled={busy} onClick={() => analyze()}>
              {busy ? <LoaderCircle className="spin" size={16} /> : <Sparkles size={16} />}
              {busy ? "正在构建故事…" : "生成决策图与故事板"}
            </button>
          </div>
        )}

        {error && <div className="landing-error">! {error}</div>}
      </section>

      <section className="manifesto-grid">
        <article><span>NOT A SUMMARY</span><h3>不只要最后答案</h3><p>保留失败、查证和改变方向的时刻，因为这些才构成真实故事。</p></article>
        <article><span>NOT A BLACK BOX</span><h3>每个判断都能点开</h3><p>卡片与原始 Prompt、工具调用和结果一一绑定，不再靠 AI 凭空讲故事。</p></article>
        <article><span>NOT ANOTHER CHAT</span><h3>直接操纵内容结构</h3><p>拖动轨迹节点、重组证据、修改卡片，然后导出可发布的 3:4 图文。</p></article>
      </section>

      <footer className="site-footer">
        <span>JIZUO © 2026</span>
        <strong>IMPORT A SESSION. TELL ITS STORY.</strong>
        <span>MADE BY XIAOQI</span>
      </footer>
    </main>
  );
}

function LogoMark() {
  return (
    <span className="logo-mark" aria-hidden>
      <i /><i /><i />
    </span>
  );
}

function downloadDataUrl(dataUrl: string, filename: string) {
  const anchor = document.createElement("a");
  anchor.href = dataUrl;
  anchor.download = filename;
  anchor.click();
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
