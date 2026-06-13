import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getCourses } from "../api/courseApi";
import {
  getNotes as getBackendNotes,
  updateNote as updateBackendNote,
} from "../api/noteApi";

function NoteEditorPage() {
  const navigate = useNavigate();
  const textareaRef = useRef(null);
  const previewRef = useRef(null);
  const { courseId, noteId } = useParams();

  const darkMode = JSON.parse(localStorage.getItem("darkMode") || "false");

  const isBackendCourseRoute = String(courseId).startsWith("api-");
  const backendCourseId = isBackendCourseRoute
    ? String(courseId).replace(/^api-/, "")
    : null;

  const isBackendNoteRoute = String(noteId).startsWith("api-note-");
  const backendNoteId = isBackendNoteRoute
    ? String(noteId).replace(/^api-note-/, "")
    : null;

  const folders = JSON.parse(
    localStorage.getItem("courseFolders") ||
      localStorage.getItem("folders") ||
      "[]"
  );

  const allCourses = folders.flatMap(
    (folder) => folder.courses || folder.items || []
  );

  const localCourse = allCourses.find(
    (item) => String(item.id) === String(courseId)
  );

  const [backendCourses, setBackendCourses] = useState([]);
  const [backendNotes, setBackendNotes] = useState([]);
  const [backendLoading, setBackendLoading] = useState(
    isBackendCourseRoute || isBackendNoteRoute
  );

  const backendCourse = isBackendCourseRoute
    ? backendCourses.find((item) => String(item.id) === String(backendCourseId))
    : null;

  const course = localCourse ||
    (backendCourse
      ? {
          id: `api-${backendCourse.id}`,
          backendId: backendCourse.id,
          title: backendCourse.title,
          starred: Boolean(backendCourse.starred),
          backendSynced: true,
        }
      : null);

  const [notes, setNotes] = useState(() =>
    JSON.parse(localStorage.getItem("notes") || "[]")
  );

  const allNotes = useMemo(
    () => [...notes, ...backendNotes],
    [notes, backendNotes]
  );

  const note = allNotes.find((item) => String(item.id) === String(noteId));

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [editorMode, setEditorMode] = useState("document");
  const [symbolPanelOpen, setSymbolPanelOpen] = useState(false);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState("https://");
  const [savedTip, setSavedTip] = useState("已同步");
  const [activeHeading, setActiveHeading] = useState("");

  useEffect(() => {
    if (!isBackendCourseRoute && !isBackendNoteRoute) {
      setBackendLoading(false);
      return;
    }

    let alive = true;
    setBackendLoading(true);

    async function loadBackendData() {
      try {
        const [courseData, noteData] = await Promise.all([
          getCourses(),
          getBackendNotes(),
        ]);

        if (!alive) return;

        setBackendCourses(Array.isArray(courseData) ? courseData : []);
        setBackendNotes(
          Array.isArray(noteData) ? noteData.map(mapBackendNoteForEditor) : []
        );
      } catch {
        if (!alive) return;
        setBackendCourses([]);
        setBackendNotes([]);
      } finally {
        if (alive) setBackendLoading(false);
      }
    }

    loadBackendData();

    return () => {
      alive = false;
    };
  }, [isBackendCourseRoute, isBackendNoteRoute, backendCourseId, backendNoteId]);

  useEffect(() => {
    if (!note) return;

    setTitle(note.title || "");
    setContent(note.content || "");
    setSavedTip(note.backendSynced ? "已连接数据库" : "已同步");
  }, [note?.id]);

  const colors = getColors(darkMode);
  const headings = useMemo(() => extractHeadings(content), [content]);
  const wordCount = plainText(content).length;

  useEffect(() => {
    if (!note || !course) return;

    setSavedTip("正在自动保存…");

    const timer = window.setTimeout(() => {
      saveNote(true);
    }, 800);

    return () => window.clearTimeout(timer);
  }, [title, content]);

  async function saveNote(silent = false) {
    if (!note || !title.trim()) return;

    if (note.backendSynced && note.backendId) {
      try {
        const savedNote = await updateBackendNote(note.backendId, {
          title: title.trim(),
          content,
        });

        const mappedNote = mapBackendNoteForEditor(savedNote);

        setBackendNotes((prevNotes) =>
          prevNotes.map((item) =>
            String(item.id) === String(noteId) ? mappedNote : item
          )
        );

        setSavedTip(silent ? "已自动保存到数据库" : "已保存到数据库");
        window.setTimeout(() => setSavedTip("已连接数据库"), 1400);
        return;
      } catch {
        setSavedTip("后端保存失败，等待重试");
        return;
      }
    }

    const nextNotes = notes.map((item) =>
      String(item.id) === String(noteId)
        ? {
            ...item,
            title: title.trim(),
            content,
            updatedAt: Date.now(),
          }
        : item
    );

    setNotes(nextNotes);
    localStorage.setItem("notes", JSON.stringify(nextNotes));

    setSavedTip(silent ? "已自动保存" : "已保存");
    window.setTimeout(() => setSavedTip("已同步"), 1400);
  }

  function insertText(text, selectOffset = 0) {
    const textarea = textareaRef.current;

    if (!textarea) {
      setContent((value) => `${value}${text}`);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const next = `${content.slice(0, start)}${text}${content.slice(end)}`;

    setContent(next);

    window.setTimeout(() => {
      textarea.focus();
      const cursor = start + text.length + selectOffset;
      textarea.selectionStart = cursor;
      textarea.selectionEnd = cursor;
    }, 0);
  }

  function wrapText(before, after = "", placeholder = "") {
    const textarea = textareaRef.current;

    if (!textarea) {
      setContent((value) => `${value}${before}${placeholder}${after}`);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = content.slice(start, end) || placeholder;
    const next = `${content.slice(0, start)}${before}${selected}${after}${content.slice(end)}`;

    setContent(next);

    window.setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = start + before.length;
      textarea.selectionEnd = start + before.length + selected.length;
    }, 0);
  }

  function insertImage() {
    const url = imageUrl.trim();
    if (!url || url === "https://") return;

    insertText(`\n![图片](${url})\n`);
    setImageUrl("https://");
    setImageModalOpen(false);
  }

  function goHeading(heading) {
    setActiveHeading(heading.id);

    if (editorMode === "preview") {
      const target = previewRef.current?.querySelector(`[data-heading-id="${heading.id}"]`);
      target?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    const index = content.indexOf(heading.raw);
    const textarea = textareaRef.current;

    if (textarea && index >= 0) {
      textarea.focus();
      textarea.selectionStart = index;
      textarea.selectionEnd = index + heading.raw.length;
      textarea.scrollTop = Math.max(0, (index / Math.max(content.length, 1)) * textarea.scrollHeight - 120);
    }
  }

  function exportMarkdown() {
    downloadMarkdown(title, content);
  }

  function exportPdf() {
    exportMarkdownAsPdf(title, content, course?.title || "课程");
  }

  if (!note || !course) {
    return (
      <div style={notFoundStyle(colors)}>
        {backendLoading ? "正在同步后端笔记..." : "笔记不存在或已被删除"}
      </div>
    );
  }

  return (
    <div style={{ height: "100vh", overflow: "hidden", background: colors.bg }}>
      <main style={pageStyle}>
        <section style={workspaceStyle(colors, darkMode)}>
          <aside style={sidebarStyle(colors, darkMode)}>
            <button
              onClick={() => navigate(`/course/${courseId}`)}
              style={backButtonStyle(colors, darkMode)}
            >
              ← 返回课程
            </button>

            <div style={noteCardStyle(colors)}>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="请输入笔记标题"
                style={sidebarTitleInputStyle(colors)}
              />
              <div style={sidebarMetaStyle(colors)}>
                {course.title} · {note.sourceResourceName || note.source || "手动记录"}
              </div>
              <div style={sidebarDateStyle(colors)}>
                {new Date(note.updatedAt || note.createdAt).toLocaleDateString()}
              </div>
            </div>

            <div style={sidebarTitleStyle(colors)}>目录</div>

            {headings.length === 0 ? (
              <div style={emptyTocStyle(colors)}>
                暂无目录。使用 #、## 或 ### 创建章节标题。
              </div>
            ) : (
              <div style={{ display: "grid", gap: 6 }}>
                {headings.map((heading) => (
                  <button
                    key={heading.id}
                    onClick={() => goHeading(heading)}
                    style={tocItemStyle(colors, heading, activeHeading === heading.id)}
                  >
                    {heading.text}
                  </button>
                ))}
              </div>
            )}
          </aside>

          <section style={editorShellStyle(colors)}>
            <header style={topbarStyle(colors)}>
              <div style={toolbarLeftStyle}>
                <SegmentButton
                  active={editorMode === "document"}
                  colors={colors}
                  onClick={() => setEditorMode("document")}
                >
                  文档
                </SegmentButton>
                <SegmentButton
                  active={editorMode === "markdown"}
                  colors={colors}
                  onClick={() => setEditorMode("markdown")}
                >
                  Markdown
                </SegmentButton>
                <SegmentButton
                  active={editorMode === "split"}
                  colors={colors}
                  onClick={() => setEditorMode("split")}
                >
                  分屏
                </SegmentButton>
                <SegmentButton
                  active={editorMode === "preview"}
                  colors={colors}
                  onClick={() => setEditorMode("preview")}
                >
                  预览
                </SegmentButton>

                <Divider colors={colors} />

                <ToolButton colors={colors} onClick={() => wrapText("**", "**", "加粗文字")}>B</ToolButton>
                <ToolButton colors={colors} onClick={() => wrapText("*", "*", "斜体文字")}>I</ToolButton>
                <ToolButton colors={colors} onClick={() => insertText("\n## 新章节\n")}>H2</ToolButton>
                <ToolButton colors={colors} onClick={() => insertText("\n- 列表项\n")}>列表</ToolButton>
                <ToolButton colors={colors} onClick={() => insertText("\n> 引用内容\n")}>引用</ToolButton>
                <ToolButton colors={colors} onClick={() => wrapText("[", "](https://)", "链接文字")}>链接</ToolButton>
                <ToolButton colors={colors} onClick={() => setImageModalOpen(true)}>图片</ToolButton>
                <ToolButton colors={colors} onClick={() => insertText(" x² + y² = z² ")}>公式</ToolButton>

                <div style={{ position: "relative" }}>
                  <ToolButton colors={colors} onClick={() => setSymbolPanelOpen((value) => !value)}>符号</ToolButton>
                  {symbolPanelOpen && (
                    <SymbolPanel
                      colors={colors}
                      onInsert={(symbol) => {
                        insertText(symbol);
                        setSymbolPanelOpen(false);
                      }}
                    />
                  )}
                </div>
              </div>

              <div style={toolbarRightStyle}>
                <span style={saveTipStyle(colors)}>{savedTip}</span>
                <button onClick={exportMarkdown} style={secondaryButton(colors)}>导出 MD</button>
                <button onClick={exportPdf} style={secondaryButton(colors)}>导出 PDF</button>
                <button onClick={() => saveNote(false)} style={primaryButton(colors)}>保存</button>
              </div>
            </header>

            <div style={bodyStyle(colors, editorMode)}>
              {editorMode === "preview" ? (
                <PreviewPanel colors={colors} content={content} previewRef={previewRef} fullPage />
              ) : editorMode === "split" ? (
                <div style={splitStyle}>
                  <EditorTextarea
                    textareaRef={textareaRef}
                    value={content}
                    onChange={setContent}
                    darkMode={darkMode}
                    colors={colors}
                    mode="markdown"
                  />
                  <PreviewPanel colors={colors} content={content} previewRef={previewRef} compact />
                </div>
              ) : (
                <EditorTextarea
                  textareaRef={textareaRef}
                  value={content}
                  onChange={setContent}
                  darkMode={darkMode}
                  colors={colors}
                  mode={editorMode}
                />
              )}
            </div>

            <footer style={statusBarStyle(colors)}>
              <span>{wordCount} 字</span>
              <span>自动保存开启</span>
              <span>文档 / Markdown / LaTeX / 特殊运算符</span>
            </footer>
          </section>
        </section>
      </main>

      {imageModalOpen && (
        <InlineModal colors={colors} darkMode={darkMode} onClose={() => setImageModalOpen(false)}>
          <h3 style={{ margin: "0 0 12px", color: colors.title }}>插入图片</h3>
          <p style={{ margin: "0 0 16px", color: colors.text, fontSize: 13 }}>
            输入图片地址，保存后会以 Markdown 图片语法插入笔记。
          </p>
          <input
            value={imageUrl}
            onChange={(event) => setImageUrl(event.target.value)}
            style={modalInputStyle(colors, darkMode)}
          />
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 }}>
            <button onClick={() => setImageModalOpen(false)} style={secondaryButton(colors)}>取消</button>
            <button onClick={insertImage} style={primaryButton(colors)}>插入</button>
          </div>
        </InlineModal>
      )}
    </div>
  );
}

function EditorTextarea({ textareaRef, value, onChange, darkMode, colors, mode }) {
  const isMarkdown = mode === "markdown";

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder="开始记录课堂重点、公式推导、复习计划……"
      style={{
        width: "100%",
        height: "100%",
        minHeight: 0,
        border: `1px solid ${colors.border}`,
        borderRadius: 12,
        background: darkMode ? "#0F172A" : "#FBFDFF",
        color: colors.title,
        padding: isMarkdown ? "22px 24px" : "30px 34px",
        boxSizing: "border-box",
        resize: "none",
        outline: "none",
        fontSize: isMarkdown ? 15 : 17,
        lineHeight: isMarkdown ? 1.8 : 2.05,
        fontFamily: isMarkdown ? "Consolas, Menlo, monospace" : "Georgia, 'Times New Roman', 'Microsoft YaHei', serif",
        colorScheme: darkMode ? "dark" : "light",
        overflowY: "auto",
      }}
    />
  );
}

function PreviewPanel({ colors, content, previewRef, compact = false, fullPage = false }) {
  const blocks = renderPreviewBlocks(content, colors);

  return (
    <article
      ref={previewRef}
      style={{
        width: "100%",
        height: fullPage ? "auto" : "100%",
        maxHeight: fullPage ? "none" : "100%",
        minHeight: fullPage ? "100%" : 0,
        overflowY: fullPage ? "visible" : "auto",
        overflowX: "hidden",
        overscrollBehavior: "contain",
        WebkitOverflowScrolling: "touch",
        border: `1px solid ${colors.border}`,
        borderRadius: 12,
        background: colors.paper,
        color: colors.title,
        padding: compact ? "22px 24px 84px" : "34px 40px 120px",
        boxSizing: "border-box",
        lineHeight: 1.9,
        fontSize: 16,
        scrollBehavior: "smooth",
      }}
    >
      {blocks.length ? blocks : <p style={{ color: colors.muted }}>暂无正文</p>}
    </article>
  );
}

function renderPreviewBlocks(content = "", colors) {
  const lines = content.split("\n");
  const blocks = [];
  let listItems = [];

  function flushList() {
    if (!listItems.length) return;
    blocks.push(
      <ul key={`ul-${blocks.length}`} style={{ margin: "10px 0 18px", paddingLeft: 24 }}>
        {listItems.map((item, index) => (
          <li key={index} style={{ margin: "6px 0" }}>{convertLatexText(item)}</li>
        ))}
      </ul>
    );
    listItems = [];
  }

  lines.forEach((line, index) => {
    const text = line.trim();

    if (!text) {
      flushList();
      blocks.push(<div key={`space-${index}`} style={{ height: 10 }} />);
      return;
    }

    if (text === "$$") {
      return;
    }

    const heading = text.match(/^(#{1,4})\s+(.+)$/);
    if (heading) {
      flushList();
      const level = heading[1].length;
      const id = heading[2].trim().replace(/\s+/g, "-");
      const Tag = level === 1 ? "h1" : level === 2 ? "h2" : level === 3 ? "h3" : "h4";
      blocks.push(
        <Tag
          key={`h-${index}`}
          data-heading-id={id}
          style={{
            color: colors.title,
            margin: level === 1 ? "26px 0 14px" : "22px 0 12px",
            fontSize: level === 1 ? 30 : level === 2 ? 24 : level === 3 ? 19 : 16,
            fontWeight: 800,
          }}
        >
          {convertLatexText(heading[2])}
        </Tag>
      );
      return;
    }

    const list = text.match(/^[-*]\s+(.+)$/);
    if (list) {
      listItems.push(list[1]);
      return;
    }

    const quote = text.match(/^>\s+(.+)$/);
    if (quote) {
      flushList();
      blocks.push(
        <blockquote
          key={`q-${index}`}
          style={{
            margin: "14px 0",
            padding: "12px 16px",
            borderLeft: `4px solid ${colors.active}`,
            background: colors.soft,
            color: colors.text,
            borderRadius: 10,
          }}
        >
          {convertLatexText(quote[1])}
        </blockquote>
      );
      return;
    }

    flushList();
    blocks.push(
      <p key={`p-${index}`} style={{ margin: "10px 0", color: colors.title }}>
        {convertLatexText(text)}
      </p>
    );
  });

  flushList();
  return blocks;
}

function SymbolPanel({ colors, onInsert }) {
  const groups = [
    ["≤", "≥", "≠", "≈", "≡", "±", "×", "÷"],
    ["∈", "∉", "⊂", "⊆", "∪", "∩", "∅", "∞"],
    ["∀", "∃", "∴", "∵", "→", "⇒", "⇔", "↔"],
    ["∑", "∫", "√", "∂", "∇", "π", "α", "β"],
  ];

  return (
    <div style={symbolPanelStyle(colors)}>
      {groups.flat().map((symbol) => (
        <button key={symbol} onClick={() => onInsert(symbol)} style={symbolButtonStyle(colors)}>
          {symbol}
        </button>
      ))}
    </div>
  );
}

function InlineModal({ colors, darkMode, children, onClose }) {
  return (
    <div style={modalBackdropStyle(darkMode)} onClick={onClose}>
      <div style={inlineModalStyle(colors, darkMode)} onClick={(event) => event.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

function SegmentButton({ active, colors, children, onClick }) {
  return (
    <button onClick={onClick} style={segmentButtonStyle(colors, active)}>
      {children}
    </button>
  );
}

function ToolButton({ colors, children, onClick }) {
  return (
    <button onClick={onClick} style={toolButtonStyle(colors)}>
      {children}
    </button>
  );
}

function Divider({ colors }) {
  return <div style={{ width: 1, height: 28, background: colors.border, margin: "0 4px" }} />;
}

function extractHeadings(markdown = "") {
  return markdown
    .split("\n")
    .map((line, index) => {
      const match = line.match(/^(#{1,3})\s+(.+)$/);
      if (!match) return null;

      return {
        id: match[2].trim().replace(/\s+/g, "-"),
        raw: line,
        level: match[1].length,
        text: match[2].trim(),
        index,
      };
    })
    .filter(Boolean);
}

function convertLatexText(text = "") {
  return text
    .replace(/\\rightarrow/g, "→")
    .replace(/\\Rightarrow/g, "⇒")
    .replace(/\\leftrightarrow/g, "↔")
    .replace(/\\Leftrightarrow/g, "⇔")
    .replace(/\\leq/g, "≤")
    .replace(/\\geq/g, "≥")
    .replace(/\\neq/g, "≠")
    .replace(/\\infty/g, "∞")
    .replace(/\\sum/g, "∑")
    .replace(/\\int/g, "∫")
    .replace(/\\sqrt/g, "√")
    .replace(/\\alpha/g, "α")
    .replace(/\\beta/g, "β")
    .replace(/\\pi/g, "π")
    .replace(/\\text\{([^}]+)\}/g, "$1")
    .replace(/\$\$/g, "")
    .replace(/\$/g, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1");
}

function plainText(markdown = "") {
  return markdown.replace(/[#>*_`$-]/g, " ").replace(/\s+/g, " ").trim();
}

function downloadMarkdown(title, content) {
  const safeTitle = (title || "NoteWhale笔记").replace(/[\\/:*?"<>|]/g, "_");
  const blob = new Blob([content || ""], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${safeTitle}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}



function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function inlineMarkdownToHtml(value = "") {
  return escapeHtml(value)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
}

function markdownToPrintableHtml(markdown = "") {
  const lines = String(markdown || "").split("\n");
  const html = [];
  let listOpen = false;
  let tableRows = [];

  function closeList() {
    if (listOpen) {
      html.push("</ul>");
      listOpen = false;
    }
  }

  function flushTable() {
    if (!tableRows.length) return;

    const rows = tableRows.filter((row) => !/^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(row));
    if (rows.length) {
      html.push("<table>");
      rows.forEach((row, index) => {
        const cells = row
          .trim()
          .replace(/^\|/, "")
          .replace(/\|$/, "")
          .split("|")
          .map((cell) => inlineMarkdownToHtml(cell.trim()));
        const tag = index === 0 ? "th" : "td";
        html.push(`<tr>${cells.map((cell) => `<${tag}>${cell}</${tag}>`).join("")}</tr>`);
      });
      html.push("</table>");
    }

    tableRows = [];
  }

  lines.forEach((rawLine) => {
    const line = rawLine.trim();

    if (!line) {
      closeList();
      flushTable();
      html.push('<div class="space"></div>');
      return;
    }

    if (line.includes("|") && line.startsWith("|")) {
      closeList();
      tableRows.push(line);
      return;
    }

    flushTable();

    const heading = line.match(/^(#{1,4})\s+(.+)$/);
    if (heading) {
      closeList();
      const level = Math.min(heading[1].length, 4);
      html.push(`<h${level}>${inlineMarkdownToHtml(heading[2])}</h${level}>`);
      return;
    }

    const list = line.match(/^[-*]\s+(.+)$/);
    if (list) {
      if (!listOpen) {
        html.push("<ul>");
        listOpen = true;
      }
      html.push(`<li>${inlineMarkdownToHtml(list[1])}</li>`);
      return;
    }

    const quote = line.match(/^>\s+(.+)$/);
    if (quote) {
      closeList();
      html.push(`<blockquote>${inlineMarkdownToHtml(quote[1])}</blockquote>`);
      return;
    }

    closeList();
    html.push(`<p>${inlineMarkdownToHtml(line)}</p>`);
  });

  closeList();
  flushTable();
  return html.join("\n");
}

function exportMarkdownAsPdf(title, content, courseTitle = "课程") {
  const safeTitle = escapeHtml(title || "NoteWhale笔记");
  const safeCourseTitle = escapeHtml(courseTitle || "课程");
  const bodyHtml = markdownToPrintableHtml(content || "");
  const printWindow = window.open("", "_blank");

  if (!printWindow) {
    alert("浏览器阻止了导出窗口，请允许弹窗后重试。");
    return;
  }

  printWindow.document.write(`<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${safeTitle}</title>
  <style>
    @page { size: A4; margin: 18mm 16mm; }
    body {
      margin: 0;
      color: #183B63;
      font-family: "Noto Sans SC", "Microsoft YaHei", "PingFang SC", Arial, sans-serif;
      line-height: 1.75;
      background: #fff;
    }
    .cover { border-bottom: 2px solid #DDE8F6; padding-bottom: 14px; margin-bottom: 22px; }
    .brand { color: #2563EB; font-size: 13px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
    h1 { font-size: 30px; margin: 8px 0 8px; line-height: 1.25; }
    .meta { color: #64748B; font-size: 13px; }
    h2 { font-size: 22px; margin: 24px 0 10px; border-left: 4px solid #2563EB; padding-left: 10px; }
    h3 { font-size: 18px; margin: 18px 0 8px; }
    h4 { font-size: 16px; margin: 14px 0 6px; }
    p { margin: 8px 0; }
    ul { margin: 8px 0 14px; padding-left: 22px; }
    li { margin: 5px 0; }
    blockquote { margin: 12px 0; padding: 10px 14px; border-left: 4px solid #93C5FD; background: #F8FAFC; color: #334155; border-radius: 8px; }
    code { background: #F1F5F9; padding: 2px 5px; border-radius: 4px; }
    table { width: 100%; border-collapse: collapse; margin: 12px 0 18px; font-size: 13px; }
    th, td { border: 1px solid #DDE8F6; padding: 8px 10px; vertical-align: top; }
    th { background: #F1F6FF; color: #183B63; }
    a { color: #2563EB; text-decoration: none; }
    .space { height: 8px; }
    .footer { margin-top: 28px; padding-top: 12px; border-top: 1px solid #E2E8F0; color: #94A3B8; font-size: 12px; }
  </style>
</head>
<body>
  <section class="cover">
    <div class="brand">NoteWhale AI Powered Notes</div>
    <h1>${safeTitle}</h1>
    <div class="meta">课程：${safeCourseTitle} · 导出时间：${new Date().toLocaleString()}</div>
  </section>
  ${bodyHtml || '<p>暂无正文</p>'}
  <div class="footer">由 NoteWhale 生成，可在编辑器中继续修改 Markdown 源文档。</div>
  <script>
    window.onload = function () {
      window.focus();
      window.print();
    };
  </script>
</body>
</html>`);
  printWindow.document.close();
}

function mapBackendNoteForEditor(note) {
  return {
    id: `api-note-${note.id}`,
    backendId: note.id,
    title: note.title,
    content: note.content || "",
    courseId: note.courseId ? `api-${note.courseId}` : null,
    backendCourseId: note.courseId,
    courseName: note.courseName || "",
    source: note.source || "手动记录",
    sourceResourceName: note.source || "手动记录",
    sourceResourceType: note.aiGenerated ? "AI笔记" : "笔记",
    aiGenerated: Boolean(note.aiGenerated),
    createdAt: note.createdAt || Date.now(),
    updatedAt: note.updatedAt || note.createdAt || Date.now(),
    backendSynced: true,
  };
}

function getColors(darkMode) {
  return {
    bg: darkMode ? "#0F172A" : "linear-gradient(180deg,#F5F9FF 0%,#EEF6FF 100%)",
    shell: darkMode ? "#172235" : "rgba(255,255,255,0.96)",
    card: darkMode ? "#111827" : "#FFFFFF",
    paper: darkMode ? "#0F172A" : "#FBFDFF",
    soft: darkMode ? "rgba(148,163,184,0.12)" : "#F8FAFC",
    softer: darkMode ? "rgba(129,140,248,0.14)" : "#F1F6FF",
    border: darkMode ? "rgba(148,163,184,0.22)" : "#DCE6F3",
    title: darkMode ? "#F8FAFC" : "#183B63",
    text: darkMode ? "#CBD5E1" : "#64748B",
    muted: darkMode ? "#94A3B8" : "#94A3B8",
    active: darkMode ? "#818CF8" : "#1D4ED8",
  };
}

const pageStyle = {
  height: "100vh",
  padding: 12,
  boxSizing: "border-box",
};

function workspaceStyle(colors, darkMode) {
  return {
    height: "100%",
    display: "grid",
    gridTemplateColumns: "272px minmax(0,1fr)",
    background: colors.shell,
    border: `1px solid ${colors.border}`,
    borderRadius: 14,
    overflow: "hidden",
    boxShadow: darkMode ? "0 18px 42px rgba(0,0,0,0.24)" : "0 18px 42px rgba(15,42,74,0.08)",
  };
}

function sidebarStyle(colors, darkMode) {
  return {
    borderRight: `1px solid ${colors.border}`,
    background: darkMode ? "rgba(15,23,42,0.46)" : "rgba(248,250,252,0.76)",
    padding: "18px 16px",
    overflowY: "auto",
  };
}

function editorShellStyle(colors) {
  return {
    height: "100%",
    minHeight: 0,
    minWidth: 0,
    overflow: "hidden",
    display: "grid",
    gridTemplateRows: "64px minmax(0,1fr) 44px",
    background: colors.card,
  };
}

function topbarStyle(colors) {
  return {
    borderBottom: `1px solid ${colors.border}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    padding: "0 18px",
    overflowX: "auto",
  };
}

const toolbarLeftStyle = {
  display: "flex",
  gap: 8,
  alignItems: "center",
  flexWrap: "nowrap",
};

const toolbarRightStyle = {
  display: "flex",
  gap: 10,
  alignItems: "center",
  flexShrink: 0,
};

function bodyStyle(colors, editorMode = "document") {
  const isPreview = editorMode === "preview";

  return {
    minHeight: 0,
    height: "100%",
    overflowX: "hidden",
    overflowY: isPreview ? "auto" : "hidden",
    padding: "14px clamp(18px, 2.8vw, 36px) 16px",
    boxSizing: "border-box",
    display: isPreview ? "block" : "grid",
    gridTemplateRows: isPreview ? undefined : "minmax(0,1fr)",
    scrollBehavior: "smooth",
  };
}

function noteCardStyle(colors) {
  return {
    background: colors.soft,
    border: `1px solid ${colors.border}`,
    borderRadius: 12,
    padding: "14px 14px 13px",
    marginBottom: 18,
  };
}

function sidebarTitleInputStyle(colors) {
  return {
    width: "100%",
    border: "none",
    outline: "none",
    background: "transparent",
    color: colors.title,
    fontSize: 18,
    fontWeight: 800,
    lineHeight: 1.35,
    fontFamily: "Georgia, 'Times New Roman', 'Microsoft YaHei', serif",
  };
}

function sidebarMetaStyle(colors) {
  return {
    color: colors.text,
    fontSize: 12,
    lineHeight: 1.5,
    marginTop: 10,
    wordBreak: "break-word",
  };
}

function sidebarDateStyle(colors) {
  return {
    color: colors.muted,
    fontSize: 12,
    marginTop: 6,
  };
}

const splitStyle = {
  minHeight: 0,
  height: "100%",
  overflow: "hidden",
  display: "grid",
  gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)",
  gap: 14,
};

function statusBarStyle(colors) {
  return {
    borderTop: `1px solid ${colors.border}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 18px",
    color: colors.muted,
    fontSize: 13,
    flexShrink: 0,
    background: colors.card,
  };
}

function sidebarTitleStyle(colors) {
  return { color: colors.active, fontSize: 18, fontWeight: 800, margin: "14px 0 16px" };
}

function courseNameStyle(colors) {
  return { color: colors.muted, fontSize: 13, marginBottom: 16 };
}

function emptyTocStyle(colors) {
  return {
    color: colors.text,
    background: colors.soft,
    border: `1px dashed ${colors.border}`,
    borderRadius: 12,
    padding: 14,
    fontSize: 13,
    lineHeight: 1.7,
  };
}

function tocItemStyle(colors, heading, active) {
  return {
    border: "none",
    background: active ? colors.softer : "transparent",
    color: active ? colors.active : colors.text,
    borderRadius: 10,
    padding: "9px 10px",
    paddingLeft: `${10 + (heading.level - 1) * 18}px`,
    cursor: "pointer",
    textAlign: "left",
    fontSize: heading.level === 1 ? 14 : 13,
    fontWeight: heading.level === 1 ? 800 : 600,
    fontFamily: "inherit",
  };
}

function segmentButtonStyle(colors, active) {
  return {
    border: `1px solid ${active ? colors.active : colors.border}`,
    background: active ? colors.softer : colors.soft,
    color: active ? colors.active : colors.text,
    borderRadius: 10,
    padding: "9px 14px",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 800,
    fontFamily: "inherit",
    whiteSpace: "nowrap",
  };
}

function toolButtonStyle(colors) {
  return {
    border: "none",
    background: "transparent",
    color: colors.title,
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 800,
    padding: "8px 9px",
    borderRadius: 8,
    fontFamily: "inherit",
    whiteSpace: "nowrap",
  };
}

function secondaryButton(colors) {
  return {
    border: `1px solid ${colors.border}`,
    background: colors.soft,
    color: colors.active,
    borderRadius: 10,
    padding: "10px 16px",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 800,
    fontFamily: "inherit",
    whiteSpace: "nowrap",
  };
}

function primaryButton(colors) {
  return {
    border: "none",
    background: colors.active,
    color: "white",
    borderRadius: 10,
    padding: "10px 18px",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 800,
    fontFamily: "inherit",
    boxShadow: "0 10px 22px rgba(29,78,216,0.18)",
    whiteSpace: "nowrap",
  };
}

function saveTipStyle(colors) {
  return { color: colors.muted, fontSize: 12, minWidth: 72, textAlign: "right" };
}

function backButtonStyle(colors, darkMode) {
  return {
    border: `1px solid ${colors.border}`,
    background: darkMode ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.86)",
    color: colors.text,
    padding: "9px 13px",
    borderRadius: 10,
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 700,
    fontFamily: "inherit",
    marginBottom: 14,
  };
}

function symbolPanelStyle(colors) {
  return {
    position: "absolute",
    top: "40px",
    left: 0,
    zIndex: 20,
    width: 232,
    display: "grid",
    gridTemplateColumns: "repeat(8, 1fr)",
    gap: 6,
    background: colors.card,
    border: `1px solid ${colors.border}`,
    borderRadius: 12,
    padding: 10,
    boxShadow: "0 18px 38px rgba(15,42,74,0.16)",
  };
}

function symbolButtonStyle(colors) {
  return {
    height: 30,
    border: `1px solid ${colors.border}`,
    background: colors.soft,
    color: colors.title,
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: 800,
  };
}

function modalBackdropStyle(darkMode) {
  return {
    position: "fixed",
    inset: 0,
    zIndex: 100,
    background: darkMode ? "rgba(0,0,0,0.42)" : "rgba(15,42,74,0.18)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };
}

function inlineModalStyle(colors, darkMode) {
  return {
    width: 440,
    background: darkMode ? "#172235" : "#FFFFFF",
    border: `1px solid ${colors.border}`,
    borderRadius: 14,
    padding: 22,
    boxShadow: darkMode ? "0 22px 44px rgba(0,0,0,0.38)" : "0 22px 44px rgba(15,42,74,0.16)",
  };
}

function modalInputStyle(colors, darkMode) {
  return {
    width: "100%",
    height: 44,
    border: `1px solid ${colors.border}`,
    borderRadius: 10,
    background: darkMode ? "#0F172A" : "#FFFFFF",
    color: colors.title,
    padding: "0 12px",
    boxSizing: "border-box",
    outline: "none",
    colorScheme: darkMode ? "dark" : "light",
  };
}

function notFoundStyle(colors) {
  return {
    minHeight: "100vh",
    background: colors.bg,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: colors.text,
  };
}

export default NoteEditorPage;
