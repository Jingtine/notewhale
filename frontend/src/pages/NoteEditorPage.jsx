import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { InlineMath, BlockMath } from "react-katex";
import "katex/dist/katex.min.css";
import { getCourses } from "../api/courseApi";
import {
  getNotes as getBackendNotes,
  updateNote as updateBackendNote,
} from "../api/noteApi";
import {
  readFirstStorageArray,
  readStorageArray,
  readStorageBoolean,
  writeStorageArray,
} from "../data/userStorage";
import { mapBackendNote } from "../data/learningItemMappers";

function NoteEditorPage() {
  const navigate = useNavigate();
  const textareaRef = useRef(null);
  const previewRef = useRef(null);
  const { courseId, noteId } = useParams();

  const darkMode = readStorageBoolean("darkMode", false);

  const isBackendCourseRoute = String(courseId).startsWith("api-");
  const backendCourseId = isBackendCourseRoute
    ? String(courseId).replace(/^api-/, "")
    : null;

  const folders = readFirstStorageArray(["courseFolders", "folders"], []);

  const allCourses = folders.flatMap(
    (folder) => folder.courses || folder.items || []
  );

  const localCourse = allCourses.find(
    (item) => String(item.id) === String(courseId)
  );

  const [backendCourses, setBackendCourses] = useState([]);
  const [backendNotes, setBackendNotes] = useState([]);
  const [backendLoading, setBackendLoading] = useState(true);

  const backendCourse = backendCourses.find((item) => {
    const rawCourseId = String(courseId || "");
    const normalizedCourseId = rawCourseId.replace(/^api-/, "");

    return (
      String(item.id) === String(backendCourseId) ||
      String(item.id) === normalizedCourseId ||
      `api-${item.id}` === rawCourseId
    );
  });

  const course = useMemo(
    () =>
      localCourse ||
      (backendCourse
        ? {
            id: `api-${backendCourse.id}`,
            backendId: backendCourse.id,
            title: backendCourse.title,
            starred: Boolean(backendCourse.starred),
            backendSynced: true,
          }
        : null),
    [localCourse, backendCourse]
  );

  const [notes, setNotes] = useState(() =>
    readStorageArray("notes", [])
  );

  const allNotes = useMemo(
    () => [...notes, ...backendNotes],
    [notes, backendNotes]
  );

  const note = useMemo(() => allNotes.find((item) => {
    const rawNoteId = String(noteId || "");
    const normalizedNoteId = rawNoteId.replace(/^api-note-/, "");

    return (
      String(item.id) === rawNoteId ||
      String(item.backendId || "") === normalizedNoteId ||
      String(item.backendId || "") === rawNoteId ||
      `api-note-${item.backendId}` === rawNoteId
    );
  }), [allNotes, noteId]);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [editorMode, setEditorMode] = useState("document");
  const [symbolPanelOpen, setSymbolPanelOpen] = useState(false);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState("https://");
  const [savedTip, setSavedTip] = useState("已同步");
  const [activeHeading, setActiveHeading] = useState("");

  useEffect(() => {
    let alive = true;

    async function loadBackendData() {
      setBackendLoading(true);

      try {
        const [courseData, noteData] = await Promise.all([
          getCourses(),
          getBackendNotes(),
        ]);

        if (!alive) return;

        setBackendCourses(Array.isArray(courseData) ? courseData : []);
        setBackendNotes(
          Array.isArray(noteData) ? noteData.map(mapBackendNote) : []
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
  }, [courseId, noteId]);

  useEffect(() => {
    if (!note) return;

    const syncTimer = window.setTimeout(() => {
      setTitle(note.title || "");
      setContent(note.content || "");
      setSavedTip(note.backendSynced ? "已连接数据库" : "已同步");
    }, 0);

    return () => window.clearTimeout(syncTimer);
  }, [note]);

  const colors = getColors(darkMode);
  const headings = useMemo(() => extractHeadings(content), [content]);
  const wordCount = plainText(content).length;
  const lineCount = content.split("\n").length;
  const storageLabel = note?.backendSynced ? "数据库" : "本地";
  const modeLabel = getEditorModeLabel(editorMode);

  const saveNote = useCallback(async (silent = false) => {
    if (!note || !title.trim()) return;

    if (note.backendSynced && note.backendId) {
      try {
        const savedNote = await updateBackendNote(note.backendId, {
          title: title.trim(),
          content,
        });

        const mappedNote = mapBackendNote(savedNote);

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
    writeStorageArray("notes", nextNotes);

    setSavedTip(silent ? "已自动保存" : "已保存");
    window.setTimeout(() => setSavedTip("已同步"), 1400);
  }, [content, note, noteId, notes, title]);

  useEffect(() => {
    if (!note || !course) return;

    const savingTimer = window.setTimeout(() => {
      setSavedTip("正在自动保存…");
      saveNote(true);
    }, 800);

    return () => window.clearTimeout(savingTimer);
  }, [course, note, saveNote, title, content]);

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
        <div style={{ textAlign: "center" }}>
          <div style={{ marginBottom: 16 }}>
            {backendLoading ? "正在同步后端笔记..." : "笔记不存在或已被删除"}
          </div>
          {!backendLoading && (
            <button
              onClick={() => navigate(courseId ? `/course/${courseId}` : "/")}
              style={secondaryButton(colors)}
            >
              返回课程
            </button>
          )}
        </div>
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
              <div style={toolbarPrimaryRowStyle}>
                <div style={editorStatusClusterStyle(colors)}>
                  <strong style={{ color: colors.title, fontSize: 14 }}>{modeLabel}</strong>
                  <span>{wordCount} 字</span>
                  <span>{headings.length} 个标题</span>
                  <span>{lineCount} 行</span>
                  <span>{storageLabel}</span>
                </div>

                <div style={toolbarRightStyle}>
                  <span style={saveTipStyle(colors)}>{savedTip}</span>
                  <button onClick={exportMarkdown} style={secondaryButton(colors)}>导出 MD</button>
                  <button onClick={exportPdf} style={secondaryButton(colors)}>导出 PDF</button>
                  <button onClick={() => saveNote(false)} style={primaryButton(colors)}>保存</button>
                </div>
              </div>

              <div style={toolbarSecondaryRowStyle}>
                <div style={modeSwitchStyle(colors)}>
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
                </div>

                <div style={formatToolbarStyle}>
                  <ToolButton colors={colors} onClick={() => wrapText("**", "**", "加粗文字")}>B</ToolButton>
                  <ToolButton colors={colors} onClick={() => wrapText("*", "*", "斜体文字")}>I</ToolButton>
                  <ToolButton colors={colors} onClick={() => insertText("\n## 新章节\n")}>H2</ToolButton>
                  <ToolButton colors={colors} onClick={() => insertText("\n- 列表项\n")}>列表</ToolButton>
                  <ToolButton colors={colors} onClick={() => insertText("\n> 引用内容\n")}>引用</ToolButton>
                  <ToolButton colors={colors} onClick={() => wrapText("[", "](https://)", "链接文字")}>链接</ToolButton>
                  <ToolButton colors={colors} onClick={() => setImageModalOpen(true)}>图片</ToolButton>
                  <ToolButton colors={colors} onClick={() => insertText(" x^2 + y^2 = z^2 ")}>公式</ToolButton>

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
              <span>{title.trim() || "未命名笔记"}</span>
              <span>{savedTip}</span>
              <span>{new Date(note.updatedAt || note.createdAt).toLocaleDateString()}</span>
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
          <li key={index} style={{ margin: "6px 0" }}><InlineContent text={item} colors={colors} /></li>
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

    const blockMath =
      text.match(/^\$\$(.+)\$\$$/) ||
      text.match(/^\\\[(.+)\\\]$/);

    if (blockMath) {
      flushList();
      blocks.push(
        <div key={`math-${index}`} style={{ margin: "18px 0", overflowX: "auto" }}>
          <BlockMath
            math={normalizeFormula(blockMath[1])}
            renderError={() => (
              <pre style={formulaFallbackStyle(colors)}>
                {convertLatexText(blockMath[1])}
              </pre>
            )}
          />
        </div>
      );
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
          <InlineContent text={heading[2]} colors={colors} />
        </Tag>
      );
      return;
    }

    const list = text.match(/^[-*]\s+(.+)$/);
    if (list) {
      listItems.push(list[1]);
      return;
    }

    const orderedList = text.match(/^\d+[.)]\s+(.+)$/);
    if (orderedList) {
      flushList();
      blocks.push(
        <p key={`ol-${index}`} style={{ margin: "8px 0 8px 18px", color: colors.title }}>
          <InlineContent text={orderedList[1]} colors={colors} />
        </p>
      );
      return;
    }

    if (/^---+$/.test(text)) {
      flushList();
      blocks.push(
        <hr
          key={`hr-${index}`}
          style={{
            border: "none",
            borderTop: `1px solid ${colors.border}`,
            margin: "22px 0",
          }}
        />
      );
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
          <InlineContent text={quote[1]} colors={colors} />
        </blockquote>
      );
      return;
    }

    flushList();
    blocks.push(
      <p key={`p-${index}`} style={{ margin: "10px 0", color: colors.title }}>
        <InlineContent text={text} colors={colors} />
      </p>
    );
  });

  flushList();
  return blocks;
}

function InlineContent({ text = "", colors }) {
  const segments = splitInlineMath(String(text));

  return (
    <>
      {segments.map((segment, index) => {
        if (!segment.math) {
          return (
            <span key={`text-${index}`}>
              {convertLatexText(segment.value)}
            </span>
          );
        }

        return (
          <span
            key={`math-${index}`}
            style={{
              display: "inline-block",
              maxWidth: "100%",
              overflowX: "auto",
              verticalAlign: "middle",
              margin: "0 2px",
            }}
          >
            <InlineMath
              math={normalizeFormula(segment.value)}
              renderError={() => (
                <code style={inlineFormulaFallbackStyle(colors)}>
                  {convertLatexText(segment.value)}
                </code>
              )}
            />
          </span>
        );
      })}
    </>
  );
}

function splitInlineMath(value = "") {
  const segments = [];
  let index = 0;

  function pushText(end) {
    if (end > index) {
      segments.push({
        math: false,
        value: value.slice(index, end),
      });
    }
  }

  while (index < value.length) {
    const slashParen = value.indexOf("\\(", index);
    const dollar = value.indexOf("$", index);

    let start = -1;
    let delimiter = "";

    if (slashParen !== -1 && (dollar === -1 || slashParen < dollar)) {
      start = slashParen;
      delimiter = "\\(";
    } else if (dollar !== -1) {
      start = dollar;
      delimiter = "$";
    }

    if (start === -1) {
      pushText(value.length);
      break;
    }

    if (delimiter === "$" && value[start + 1] === "$") {
      const end = value.indexOf("$$", start + 2);
      if (end === -1) {
        pushText(value.length);
        break;
      }

      pushText(start);
      segments.push({
        math: true,
        value: value.slice(start + 2, end),
      });
      index = end + 2;
      continue;
    }

    if (delimiter === "\\(") {
      const end = value.indexOf("\\)", start + 2);
      if (end === -1) {
        pushText(value.length);
        break;
      }

      pushText(start);
      segments.push({
        math: true,
        value: value.slice(start + 2, end),
      });
      index = end + 2;
      continue;
    }

    const end = value.indexOf("$", start + 1);
    if (end === -1) {
      pushText(value.length);
      break;
    }

    pushText(start);
    segments.push({
      math: true,
      value: value.slice(start + 1, end),
    });
    index = end + 1;
  }

  return segments.length
    ? segments
    : [
        {
          math: false,
          value,
        },
      ];
}

function normalizeFormula(value = "") {
  return String(value)
    .trim()
    .replace(/α/g, "\\alpha")
    .replace(/β/g, "\\beta")
    .replace(/γ/g, "\\gamma")
    .replace(/π/g, "\\pi")
    .replace(/θ/g, "\\theta")
    .replace(/λ/g, "\\lambda")
    .replace(/μ/g, "\\mu")
    .replace(/Δ/g, "\\Delta")
    .replace(/≤/g, "\\leq")
    .replace(/≥/g, "\\geq")
    .replace(/≠/g, "\\neq")
    .replace(/≈/g, "\\approx")
    .replace(/→/g, "\\rightarrow")
    .replace(/⇒/g, "\\Rightarrow")
    .replace(/⇔/g, "\\Leftrightarrow")
    .replace(/∑/g, "\\sum")
    .replace(/∫/g, "\\int")
    .replace(/∞/g, "\\infty");
}

function inlineFormulaFallbackStyle(colors) {
  return {
    color: colors?.active || "#1D4ED8",
    background: colors?.soft || "#F8FAFC",
    borderRadius: 6,
    padding: "1px 4px",
    fontFamily: "Consolas, Menlo, monospace",
    fontSize: "0.95em",
  };
}

function formulaFallbackStyle(colors) {
  return {
    margin: 0,
    whiteSpace: "pre-wrap",
    color: colors?.title || "#183B63",
    background: colors?.soft || "#F8FAFC",
    borderRadius: 10,
    padding: "12px 14px",
    fontFamily: "Consolas, Menlo, monospace",
    fontSize: 14,
  };
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

function getEditorModeLabel(mode) {
  if (mode === "markdown") return "Markdown 编辑";
  if (mode === "split") return "分屏校对";
  if (mode === "preview") return "预览";
  return "文档编辑";
}

function convertLatexText(text = "") {
  return String(text)
    .replace(/\\rightarrow/g, "→")
    .replace(/\\Rightarrow/g, "⇒")
    .replace(/\\leftarrow/g, "←")
    .replace(/\\leftrightarrow/g, "↔")
    .replace(/\\Leftrightarrow/g, "⇔")
    .replace(/\\to/g, "→")
    .replace(/\\leq?/g, "≤")
    .replace(/\\geq?/g, "≥")
    .replace(/\\neq/g, "≠")
    .replace(/\\approx/g, "≈")
    .replace(/\\equiv/g, "≡")
    .replace(/\\pm/g, "±")
    .replace(/\\times/g, "×")
    .replace(/\\div/g, "÷")
    .replace(/\\cdot/g, "·")
    .replace(/\\infty/g, "∞")
    .replace(/\\sum/g, "∑")
    .replace(/\\int/g, "∫")
    .replace(/\\sqrt\{([^}]+)\}/g, "√($1)")
    .replace(/\\sqrt/g, "√")
    .replace(/\\notin/g, "∉")
    .replace(/\\in/g, "∈")
    .replace(/\\subseteq/g, "⊆")
    .replace(/\\subset/g, "⊂")
    .replace(/\\cup/g, "∪")
    .replace(/\\cap/g, "∩")
    .replace(/\\emptyset/g, "∅")
    .replace(/\\forall/g, "∀")
    .replace(/\\exists/g, "∃")
    .replace(/\\therefore/g, "∴")
    .replace(/\\because/g, "∵")
    .replace(/\\partial/g, "∂")
    .replace(/\\nabla/g, "∇")
    .replace(/\\Delta/g, "Δ")
    .replace(/\\alpha/g, "α")
    .replace(/\\beta/g, "β")
    .replace(/\\gamma/g, "γ")
    .replace(/\\lambda/g, "λ")
    .replace(/\\mu/g, "μ")
    .replace(/\\pi/g, "π")
    .replace(/\\theta/g, "θ")
    .replace(/\\omega/g, "ω")
    .replace(/\\text\{([^}]+)\}/g, "$1")
    .replace(/\^\{([^}]+)\}/g, "^$1")
    .replace(/_\{([^}]+)\}/g, "_$1")
    .replace(/\$\$/g, "")
    .replace(/\$/g, "")
    .replace(/`([^`]+)`/g, "$1")
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
  let listType = "";
  let tableRows = [];

  function closeList() {
    if (listType) {
      html.push(`</${listType}>`);
      listType = "";
    }
  }

  function openList(nextType) {
    if (listType === nextType) return;

    closeList();
    html.push(`<${nextType}>`);
    listType = nextType;
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

    const unorderedList = line.match(/^[-*]\s+(.+)$/);
    if (unorderedList) {
      openList("ul");
      html.push(`<li>${inlineMarkdownToHtml(unorderedList[1])}</li>`);
      return;
    }

    const orderedList = line.match(/^\d+[.)]\s+(.+)$/);
    if (orderedList) {
      openList("ol");
      html.push(`<li>${inlineMarkdownToHtml(orderedList[1])}</li>`);
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
  const exportTime = escapeHtml(new Date().toLocaleString());
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
    @page {
      size: A4;
      margin: 18mm 17mm 18mm;
    }
    * {
      box-sizing: border-box;
    }
    body {
      margin: 0;
      color: #142F4F;
      font-family: "Microsoft YaHei", "PingFang SC", "Noto Sans SC", Arial, sans-serif;
      font-size: 10.7pt;
      line-height: 1.68;
      letter-spacing: 0;
      background: #FFFFFF;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .page {
      max-width: 171mm;
      margin: 0 auto;
    }
    .cover {
      position: relative;
      padding: 0 0 16px;
      margin-bottom: 18px;
      border-bottom: 1px solid #DDE7F4;
      break-inside: avoid;
    }
    .cover::before {
      content: "";
      position: absolute;
      left: 0;
      top: 0;
      width: 36px;
      height: 3px;
      border-radius: 999px;
      background: #2F6FED;
    }
    .brand {
      color: #2F6FED;
      font-size: 8.2pt;
      font-weight: 800;
      letter-spacing: .06em;
      text-transform: uppercase;
      margin-bottom: 7px;
      padding-top: 10px;
    }
    h1 {
      color: #102E52;
      font-size: 19.5pt;
      margin: 0 0 8px;
      line-height: 1.28;
      font-weight: 800;
    }
    .meta {
      display: inline-flex;
      gap: 8px;
      flex-wrap: wrap;
      color: #5E718A;
      font-size: 8.8pt;
    }
    h2, h3, h4 {
      color: #102E52;
      font-family: "Microsoft YaHei", "PingFang SC", Arial, sans-serif;
      break-after: avoid;
      page-break-after: avoid;
    }
    h2 {
      font-size: 14.6pt;
      margin: 20px 0 8px;
      padding: 0 0 6px 10px;
      border-left: 3px solid #2F6FED;
      border-bottom: 1px solid #E3ECF7;
      line-height: 1.35;
    }
    h3 {
      font-size: 12.5pt;
      margin: 15px 0 6px;
      line-height: 1.42;
    }
    h4 {
      font-size: 11.1pt;
      margin: 12px 0 4px;
      line-height: 1.45;
      color: #24466E;
    }
    h2 + p,
    h3 + p,
    h4 + p,
    h2 + ul,
    h3 + ul,
    h4 + ul,
    h2 + ol,
    h3 + ol,
    h4 + ol {
      margin-top: 4px;
    }
    p {
      margin: 5px 0;
      text-align: justify;
      overflow-wrap: anywhere;
    }
    ul, ol {
      margin: 7px 0 12px;
      padding-left: 20px;
    }
    li {
      margin: 3px 0;
      padding-left: 2px;
      break-inside: avoid;
    }
    li::marker {
      color: #2F6FED;
      font-weight: 700;
    }
    strong {
      color: #102E52;
      font-weight: 800;
    }
    blockquote {
      margin: 12px 0;
      padding: 10px 13px;
      border: 1px solid #DCE9F8;
      border-left: 4px solid #6BA1FF;
      background: #F7FAFF;
      color: #334155;
      border-radius: 9px;
      break-inside: avoid;
    }
    code {
      font-family: "Cascadia Mono", "Consolas", monospace;
      background: #F1F5F9;
      color: #0F2F55;
      padding: 1px 5px;
      border-radius: 5px;
      font-size: 0.92em;
    }
    table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      margin: 12px 0 17px;
      font-size: 9.7pt;
      border: 1px solid #D9E6F4;
      border-radius: 10px;
      overflow: hidden;
      break-inside: avoid;
    }
    th, td {
      border-right: 1px solid #D9E6F4;
      border-bottom: 1px solid #D9E6F4;
      padding: 8px 9px;
      vertical-align: top;
      text-align: left;
    }
    tr:last-child td {
      border-bottom: none;
    }
    th:last-child, td:last-child {
      border-right: none;
    }
    th {
      background: #EEF6FF;
      color: #102E52;
      font-weight: 800;
    }
    a {
      color: #2563EB;
      text-decoration: none;
    }
    .space {
      height: 5px;
    }
    .footer {
      margin-top: 26px;
      padding-top: 10px;
      border-top: 1px solid #E2E8F0;
      color: #8A9CB3;
      font-family: "Microsoft YaHei", "PingFang SC", Arial, sans-serif;
      font-size: 8.5pt;
      text-align: right;
    }
    .document-end {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-top: 22px;
      color: #8A9CB3;
      font-family: "Microsoft YaHei", "PingFang SC", Arial, sans-serif;
      font-size: 9pt;
    }
    .document-end::before,
    .document-end::after {
      content: "";
      height: 1px;
      background: #E2E8F0;
      flex: 1;
    }
    @media print {
      .cover,
      blockquote,
      table {
        break-inside: avoid;
      }
      h2 {
        break-before: auto;
      }
    }
  </style>
</head>
<body>
  <main class="page">
    <section class="cover">
      <div class="brand">NoteWhale AI Powered Notes</div>
      <h1>${safeTitle}</h1>
      <div class="meta"><span>课程：${safeCourseTitle}</span><span>导出时间：${exportTime}</span></div>
    </section>
    ${bodyHtml || '<p>暂无正文</p>'}
    <div class="document-end">鲸记 NoteWhale</div>
    <div class="footer">由 NoteWhale 生成，可在编辑器中继续修改 Markdown 源文档。</div>
  </main>
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
    gridTemplateRows: "104px minmax(0,1fr) 38px",
    background: colors.card,
  };
}

function topbarStyle(colors) {
  return {
    borderBottom: `1px solid ${colors.border}`,
    display: "grid",
    gridTemplateRows: "48px 56px",
    gap: 0,
    padding: "0 18px",
    overflow: "hidden",
  };
}

const toolbarPrimaryRowStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 16,
  minWidth: 0,
  borderBottom: "1px solid transparent",
};

function editorStatusClusterStyle(colors) {
  return {
    display: "flex",
    alignItems: "center",
    gap: 10,
    minWidth: 0,
    color: colors.text,
    fontSize: 12,
    whiteSpace: "nowrap",
    overflow: "hidden",
  };
}

const toolbarSecondaryRowStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 14,
  minWidth: 0,
  overflowX: "auto",
};

function modeSwitchStyle(colors) {
  return {
    display: "inline-grid",
    gridTemplateColumns: "repeat(4, auto)",
    gap: 4,
    padding: 4,
    border: `1px solid ${colors.border}`,
    borderRadius: 12,
    background: colors.soft,
    flexShrink: 0,
  };
}

const formatToolbarStyle = {
  display: "flex",
  gap: 6,
  alignItems: "center",
  flexWrap: "nowrap",
  minWidth: 0,
};

const toolbarRightStyle = {
  display: "flex",
  gap: 8,
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
