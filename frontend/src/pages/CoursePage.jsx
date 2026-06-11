import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Footer from "../components/Footer";

function CoursePage() {
  const navigate = useNavigate();
  const { id } = useParams();

  const darkMode = JSON.parse(localStorage.getItem("darkMode") || "false");

  const [activeTab, setActiveTab] = useState("resources");
  const [ddlFilter, setDdlFilter] = useState("all");

  const [ddls, setDdls] = useState(() =>
    JSON.parse(localStorage.getItem("ddls") || "[]")
  );

  const [notes, setNotes] = useState(() =>
    JSON.parse(localStorage.getItem("notes") || "[]")
  );

  const [resources, setResources] = useState(() =>
    JSON.parse(localStorage.getItem("resources") || "[]")
  );

  const folders = JSON.parse(
    localStorage.getItem("courseFolders") ||
      localStorage.getItem("folders") ||
      "[]"
  );

  const allCourses = folders.flatMap(
    (folder) => folder.courses || folder.items || []
  );

  const course = allCourses.find((course) => String(course.id) === String(id));

  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [schedulePreview, setSchedulePreview] = useState("");
  const [scheduleTitle, setScheduleTitle] = useState("");
  const [scheduleDate, setScheduleDate] = useState("");
  const [schedulePlatform, setSchedulePlatform] = useState("");
  const [scheduleNote, setScheduleNote] = useState("");
  const [scheduleNoCourse, setScheduleNoCourse] = useState(false);

  const [showResourceViewer, setShowResourceViewer] = useState(false);
  const [viewingResource, setViewingResource] = useState(null);

  const [showGeneratedNoteModal, setShowGeneratedNoteModal] = useState(false);
  const [generatedNoteTitle, setGeneratedNoteTitle] = useState("");
  const [generatedNoteContent, setGeneratedNoteContent] = useState("");
  const [generatedFromResource, setGeneratedFromResource] = useState(null);

  const [showNoteEditor, setShowNoteEditor] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [editingNoteTitle, setEditingNoteTitle] = useState("");
  const [editingNoteContent, setEditingNoteContent] = useState("");

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmInfo, setConfirmInfo] = useState(null);

  const courseDdls = useMemo(() => {
    return ddls
      .filter((ddl) => String(ddl.courseId) === String(id))
      .sort((a, b) => parseDate(a.date) - parseDate(b.date));
  }, [ddls, id]);

  const filteredDdls = useMemo(() => {
    if (ddlFilter === "completed") {
      return courseDdls.filter((ddl) => ddl.completed);
    }

    if (ddlFilter === "pending") {
      return courseDdls.filter((ddl) => !ddl.completed);
    }

    return courseDdls;
  }, [courseDdls, ddlFilter]);

  const courseNotes = useMemo(() => {
    return notes
      .filter((note) => String(note.courseId) === String(id))
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [notes, id]);

  const courseResources = useMemo(() => {
    return resources
      .filter((resource) => String(resource.courseId) === String(id))
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [resources, id]);

  const activeDdls = courseDdls.filter((ddl) => !ddl.completed);
  const completedDdls = courseDdls.filter((ddl) => ddl.completed);

  const colors = {
    bg: darkMode
      ? "linear-gradient(180deg,#0F172A 0%,#111827 100%)"
      : "linear-gradient(180deg,#F5F9FF 0%,#EEF6FF 100%)",
    shell: darkMode ? "rgba(15,23,42,0.88)" : "rgba(255,255,255,0.92)",
    card: darkMode ? "rgba(30,41,59,0.9)" : "#FFFFFF",
    soft: darkMode ? "rgba(148,163,184,0.12)" : "#F8FAFC",
    softer: darkMode ? "rgba(148,163,184,0.08)" : "#F1F6FF",
    border: darkMode ? "rgba(148,163,184,0.18)" : "#E2E8F0",
    title: darkMode ? "#F8FAFC" : "#183B63",
    text: darkMode ? "#CBD5E1" : "#64748B",
    muted: darkMode ? "#94A3B8" : "#94A3B8",
    active: darkMode ? "#818CF8" : "#1D4ED8",
    danger: "#EF4444",
    warning: "#F59E0B",
    success: "#10B981",
  };

  function saveDdls(nextDdls) {
    setDdls(nextDdls);
    localStorage.setItem("ddls", JSON.stringify(nextDdls));
  }

  function saveNotes(nextNotes) {
    setNotes(nextNotes);
    localStorage.setItem("notes", JSON.stringify(nextNotes));
  }

  function saveResources(nextResources) {
    const safeResources = nextResources.map(({ objectUrl, dataUrl, ...rest }) => rest);
    setResources(nextResources);
    localStorage.setItem("resources", JSON.stringify(safeResources));
  }

  function saveSchedule() {
    if (!scheduleTitle.trim() || !scheduleDate.trim() || !course) return;

    const newDDL = {
      id: Date.now(),
      title: scheduleTitle.trim(),
      date: scheduleDate.replace("T", " "),
      platform: schedulePlatform.trim(),
      note: scheduleNote.trim(),
      courseId: scheduleNoCourse ? null : course.id,
      courseName: scheduleNoCourse ? "未归属课程" : course.title,
      completed: false,
      source: schedulePreview ? "图片识别" : "手动新建",
    };

    saveDdls([...ddls, newDDL]);
    resetScheduleModal();
  }

  function uploadResources(event) {
    const files = Array.from(event.target.files || []);
    if (!files.length || !course) return;

    const newResources = files.map((file) => ({
      id: `${Date.now()}-${file.name}`,
      name: file.name,
      type: getFileType(file.name),
      size: file.size,
      mimeType: file.type || "application/octet-stream",
      objectUrl: URL.createObjectURL(file),
      courseId: course.id,
      courseName: course.title,
      createdAt: Date.now(),
    }));

    saveResources([...resources, ...newResources]);
    event.target.value = "";
  }

  function uploadDDLImage(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setSchedulePreview(URL.createObjectURL(file));
    setScheduleTitle((value) => value || "法理学论文");
    setScheduleDate((value) => value || "2026-06-12T23:59");
    setSchedulePlatform((value) => value || "在线提交");
    setScheduleNote((value) => value || "不少于3000字，参考格式见附件。");
    event.target.value = "";
  }

  function generateNoteFromResource(resource = null) {
    const targetResource = resource || courseResources[0] || null;
    const baseName = targetResource?.name?.replace(/\.[^.]+$/, "") || course.title;

    setGeneratedFromResource(targetResource);
    setGeneratedNoteTitle(`${course.title} · AI结构化笔记`);
    setGeneratedNoteContent(buildAINote(course, targetResource, courseResources));
    setShowGeneratedNoteModal(true);
  }

  function saveGeneratedNote() {
    if (!generatedNoteTitle.trim() || !generatedNoteContent.trim() || !course) return;

    const newNote = {
      id: Date.now(),
      title: generatedNoteTitle.trim(),
      content: generatedNoteContent.trim(),
      syntaxMode: "markdown",
      source: generatedFromResource?.name || "课程资料",
      sourceResourceId: generatedFromResource?.id || null,
      sourceResourceName: generatedFromResource?.name || "课程资料",
      sourceResourceType: generatedFromResource?.type || "资料",
      courseId: course.id,
      courseName: course.title,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      aiGenerated: true,
    };

    saveNotes([...notes, newNote]);
    closeGeneratedNoteModal();
    navigate(`/course/${id}/note/${newNote.id}`);
  }

  function closeGeneratedNoteModal() {
    setShowGeneratedNoteModal(false);
    setGeneratedFromResource(null);
    setGeneratedNoteTitle("");
    setGeneratedNoteContent("");
  }

  function openNoteEditor(note = null) {
    if (note) {
      navigate(`/course/${id}/note/${note.id}`);
      return;
    }

    if (!course) return;

    const newNote = {
      id: Date.now(),
      title: `${course.title} · 新建笔记`,
      content: "",
      syntaxMode: "markdown",
      courseId: course.id,
      courseName: course.title,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      aiGenerated: false,
      source: "手动记录",
      sourceResourceId: null,
      sourceResourceName: "手动记录",
      sourceResourceType: "笔记",
    };

    saveNotes([...notes, newNote]);
    navigate(`/course/${id}/note/${newNote.id}`);
  }

  function saveNoteEditor() {
    if (!editingNoteTitle.trim() || !course) return;

    if (editingNote) {
      saveNotes(
        notes.map((note) =>
          note.id === editingNote.id
            ? {
                ...note,
                title: editingNoteTitle.trim(),
                content: editingNoteContent.trim(),
                updatedAt: Date.now(),
              }
            : note
        )
      );
    } else {
      const newNote = {
        id: Date.now(),
        title: editingNoteTitle.trim(),
        content: editingNoteContent.trim(),
        courseId: course.id,
        courseName: course.title,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        aiGenerated: false,
        source: "手动记录",
        sourceResourceId: null,
        sourceResourceName: "手动记录",
        sourceResourceType: "笔记",
      };
      saveNotes([...notes, newNote]);
    }

    closeNoteEditor();
  }

  function closeNoteEditor() {
    setShowNoteEditor(false);
    setEditingNote(null);
    setEditingNoteTitle("");
    setEditingNoteContent("");
  }

  function completeDDL(ddlId) {
    saveDdls(
      ddls.map((ddl) =>
        ddl.id === ddlId ? { ...ddl, completed: true } : ddl
      )
    );
  }

  function askDelete(type, target) {
    const copy = {
      resource: {
        title: "删除资料记录",
        message: `确定删除「${target.name}」这条资料记录吗？已上传文件本身不会被永久保存。`,
      },
      note: {
        title: "删除笔记",
        message: `确定删除「${target.title}」这条笔记吗？`,
      },
      ddl: {
        title: "删除 DDL",
        message: `确定删除「${target.title}」这个 DDL 吗？`,
      },
    };

    setConfirmInfo({ type, target, ...copy[type] });
    setShowConfirmModal(true);
  }

  function confirmDelete() {
    if (!confirmInfo) return;

    if (confirmInfo.type === "resource") {
      saveResources(resources.filter((resource) => resource.id !== confirmInfo.target.id));
    }

    if (confirmInfo.type === "note") {
      saveNotes(notes.filter((note) => note.id !== confirmInfo.target.id));
      closeNoteEditor();
    }

    if (confirmInfo.type === "ddl") {
      saveDdls(ddls.filter((ddl) => ddl.id !== confirmInfo.target.id));
    }

    setShowConfirmModal(false);
    setConfirmInfo(null);
  }

  function resetScheduleModal() {
    setSchedulePreview("");
    setScheduleTitle("");
    setScheduleDate("");
    setSchedulePlatform("");
    setScheduleNote("");
    setScheduleNoCourse(false);
    setShowScheduleModal(false);
  }

  if (!course) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: colors.bg,
          color: colors.text,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        未找到该课程
      </div>
    );
  }

  return (
    <div
      style={{
        height: "100vh",
        overflow: "hidden",
        background: colors.bg,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <main
        style={{
          flex: 1,
          overflowY: "auto",
          maxWidth: "none",
          width: "100%",
          margin: "0",
          padding: "22px 24px 96px",
          boxSizing: "border-box",
        }}
      >
        <button
          onClick={() => navigate("/")}
          style={backButtonStyle(colors, darkMode)}
        >
          ← 返回主页
        </button>

        <section style={courseShellStyle(colors, darkMode)}>
          <CourseHeader
            course={course}
            colors={colors}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            onOpenSchedule={() => setShowScheduleModal(true)}
            onAddNote={() => openNoteEditor(null)}
            uploadResources={uploadResources}
            activeDdls={activeDdls}
            courseNotes={courseNotes}
            courseResources={courseResources}
          />

          <div
            style={{
              borderTop: `1px solid ${colors.border}`,
              display: "grid",
              gridTemplateColumns: activeTab === "ddl" ? "260px 1fr" : "1fr",
              minHeight: "560px",
            }}
          >
            {activeTab === "ddl" && (
              <aside
                style={{
                  borderRight: `1px solid ${colors.border}`,
                  padding: "28px 20px",
                  background: darkMode
                    ? "rgba(15,23,42,0.38)"
                    : "rgba(248,250,252,0.72)",
                }}
              >
                <SideFilter
                  label="所有 DDL"
                  active={ddlFilter === "all"}
                  colors={colors}
                  onClick={() => setDdlFilter("all")}
                />
                <SideFilter
                  label="已完成"
                  active={ddlFilter === "completed"}
                  colors={colors}
                  onClick={() => setDdlFilter("completed")}
                />
                <SideFilter
                  label="未完成"
                  active={ddlFilter === "pending"}
                  colors={colors}
                  onClick={() => setDdlFilter("pending")}
                />
              </aside>
            )}

            <section style={{ padding: "34px 40px" }}>
              {activeTab === "ddl" && (
                <DDLTab
                  course={course}
                  ddls={filteredDdls}
                  colors={colors}
                  onComplete={completeDDL}
                  onDelete={(ddl) => askDelete("ddl", ddl)}
                />
              )}

              {activeTab === "resources" && (
                <ResourceTab
                  resources={courseResources}
                  notes={courseNotes}
                  colors={colors}
                  onView={(resource) => {
                    setViewingResource(resource);
                    setShowResourceViewer(true);
                  }}
                  onGenerateNote={generateNoteFromResource}
                  onDelete={(resource) => askDelete("resource", resource)}
                  uploadResources={uploadResources}
                />
              )}

              {activeTab === "notes" && (
                <NoteTab
                  notes={courseNotes}
                  colors={colors}
                  onOpen={openNoteEditor}
                  onAdd={() => openNoteEditor(null)}
                />
              )}

              {activeTab === "settings" && (
                <SettingsTab
                  course={course}
                  colors={colors}
                  activeDdls={activeDdls}
                  completedDdls={completedDdls}
                  courseNotes={courseNotes}
                  courseResources={courseResources}
                />
              )}
            </section>
          </div>
        </section>

        {showScheduleModal && (
          <ScheduleModal
            darkMode={darkMode}
            colors={colors}
            course={course}
            schedulePreview={schedulePreview}
            scheduleTitle={scheduleTitle}
            setScheduleTitle={setScheduleTitle}
            scheduleDate={scheduleDate}
            setScheduleDate={setScheduleDate}
            schedulePlatform={schedulePlatform}
            setSchedulePlatform={setSchedulePlatform}
            scheduleNote={scheduleNote}
            setScheduleNote={setScheduleNote}
            scheduleNoCourse={scheduleNoCourse}
            setScheduleNoCourse={setScheduleNoCourse}
            uploadDDLImage={uploadDDLImage}
            onCancel={resetScheduleModal}
            onConfirm={saveSchedule}
          />
        )}

        {showResourceViewer && viewingResource && (
          <ResourceViewerModal
            darkMode={darkMode}
            colors={colors}
            resource={viewingResource}
            relatedNotes={getNotesByResource(courseNotes, viewingResource)}
            onClose={() => {
              setShowResourceViewer(false);
              setViewingResource(null);
            }}
            onGenerate={() => {
              setShowResourceViewer(false);
              generateNoteFromResource(viewingResource);
            }}
            onOpenNote={(note) => {
              setShowResourceViewer(false);
              setViewingResource(null);
              openNoteEditor(note);
            }}
          />
        )}

        {showGeneratedNoteModal && (
          <NotePreviewModal
            darkMode={darkMode}
            colors={colors}
            title={generatedNoteTitle}
            setTitle={setGeneratedNoteTitle}
            content={generatedNoteContent}
            setContent={setGeneratedNoteContent}
            onCancel={closeGeneratedNoteModal}
            onSave={saveGeneratedNote}
          />
        )}

        {showConfirmModal && confirmInfo && (
          <ConfirmModal
            darkMode={darkMode}
            colors={colors}
            title={confirmInfo.title}
            message={confirmInfo.message}
            onCancel={() => {
              setShowConfirmModal(false);
              setConfirmInfo(null);
            }}
            onConfirm={confirmDelete}
          />
        )}
      </main>

      <Footer
        darkMode={darkMode}
        courseCount={allCourses.length}
        ddlCount={ddls.length}
      />
    </div>
  );
}

function CourseHeader({
  course,
  colors,
  activeTab,
  setActiveTab,
  onOpenSchedule,
  onAddNote,
  uploadResources,
  activeDdls,
  courseNotes,
  courseResources,
}) {
  return (
    <div style={{ padding: "30px 36px 0" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "24px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
          <div
            style={{
              width: "58px",
              height: "58px",
              borderRadius: "14px",
              background: "linear-gradient(135deg,#A78BFA,#2563EB)",
              color: "#FFFFFF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "26px",
              fontWeight: 700,
            }}
          >
            {course.title?.slice(0, 1) || "课"}
          </div>

          <div>
            <h1
              style={{
                margin: 0,
                color: colors.title,
                fontSize: "30px",
                fontWeight: 700,
                letterSpacing: "-0.04em",
              }}
            >
              {course.title}
            </h1>

            <p
              style={{
                margin: "6px 0 0",
                color: colors.text,
                fontSize: "14px",
              }}
            >
              {courseResources.length} 份资料 · {courseNotes.length} 条笔记 ·{" "}
              {activeDdls.length} 个未完成 DDL
            </p>
          </div>
        </div>

        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          {activeTab === "resources" && (
            <label style={primaryButton(colors)}>
              上传资料
              <input
                type="file"
                multiple
                onChange={uploadResources}
                style={{ display: "none" }}
              />
            </label>
          )}

          {activeTab === "notes" && (
            <button onClick={onAddNote} style={primaryButton(colors)}>
              ＋ 新建笔记
            </button>
          )}

          {activeTab === "ddl" && (
            <button onClick={onOpenSchedule} style={primaryButton(colors)}>
              ＋ 新建日程
            </button>
          )}
        </div>
      </div>

      <nav
        style={{
          display: "flex",
          gap: "70px",
          marginTop: "28px",
          height: "64px",
          alignItems: "center",
        }}
      >
        <TopTab
          label="资料"
          active={activeTab === "resources"}
          onClick={() => setActiveTab("resources")}
          colors={colors}
        />
        <TopTab
          label="笔记"
          active={activeTab === "notes"}
          onClick={() => setActiveTab("notes")}
          colors={colors}
        />
        <TopTab
          label="DDL"
          active={activeTab === "ddl"}
          onClick={() => setActiveTab("ddl")}
          colors={colors}
        />
        <TopTab
          label="设置"
          active={activeTab === "settings"}
          onClick={() => setActiveTab("settings")}
          colors={colors}
        />
      </nav>
    </div>
  );
}

function TopTab({ label, active, onClick, colors }) {
  return (
    <button
      onClick={onClick}
      style={{
        height: "64px",
        border: "none",
        background: "transparent",
        color: active ? colors.active : colors.text,
        fontSize: "17px",
        fontWeight: 700,
        cursor: "pointer",
        borderBottom: active
          ? `4px solid ${colors.active}`
          : "4px solid transparent",
        padding: "0 4px",
      }}
    >
      {label}
    </button>
  );
}

function SideFilter({ label, active, colors, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        height: "54px",
        border: "none",
        borderRadius: "14px",
        background: active ? colors.softer : "transparent",
        color: active ? colors.active : colors.text,
        display: "flex",
        alignItems: "center",
        padding: "0 18px",
        cursor: "pointer",
        fontSize: "15px",
        fontWeight: active ? 700 : 600,
        marginBottom: "12px",
        textAlign: "left",
      }}
    >
      {label}
    </button>
  );
}

function ResourceTab({ resources, notes, colors, onView, onGenerateNote, onDelete, uploadResources }) {
  return (
    <div style={contentCardStyle(colors)}>
      <div style={panelHeaderStyle}>
        <div>
          <h2 style={{ ...sectionTitleStyle(colors), margin: 0 }}>课程资料</h2>
          <p style={{ margin: "8px 0 0", color: colors.text, fontSize: "13px" }}>
            以课程为单位沉淀课件、讲义、教材与录音。
          </p>
        </div>

        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <button
            onClick={() => onGenerateNote(null)}
            style={secondaryButton(colors)}
            disabled={resources.length === 0}
          >
            AI 生成笔记
          </button>

          <label style={secondaryButton(colors)}>
            上传资料
            <input
              type="file"
              multiple
              onChange={uploadResources}
              style={{ display: "none" }}
            />
          </label>
        </div>
      </div>

      {resources.length === 0 ? (
        <EmptyState
          colors={colors}
          text="暂无课程资料，可上传 PPT、PDF、讲义、教材或录音。"
        />
      ) : (
        <div style={{ display: "grid", gap: "12px" }}>
          {resources.map((resource) => (
            <ResourceItem
              key={resource.id}
              resource={resource}
              relatedNotes={getNotesByResource(notes, resource)}
              colors={colors}
              onView={onView}
              onGenerateNote={onGenerateNote}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ResourceItem({ resource, relatedNotes = [], colors, onView, onGenerateNote, onDelete }) {
  return (
    <div style={compactRowStyle(colors)}>
      <div style={{ display: "flex", gap: "14px", minWidth: 0, flex: 1 }}>
        <div style={fileBadgeStyle(colors)}>{resource.type}</div>

        <div style={{ minWidth: 0 }}>
          <h3
            style={{
              margin: 0,
              color: colors.title,
              fontSize: "15px",
              fontWeight: 700,
              wordBreak: "break-all",
            }}
          >
            {resource.name}
          </h3>

          <p style={{ margin: "6px 0 0", color: colors.text, fontSize: "13px" }}>
            {formatFileSize(resource.size)} · {new Date(resource.createdAt).toLocaleDateString()}
            {relatedNotes.length > 0 ? ` · 已生成 ${relatedNotes.length} 条笔记` : ""}
          </p>
        </div>
      </div>

      <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
        <button onClick={() => onView(resource)} style={ghostButton(colors)}>
          查看
        </button>
        <button onClick={() => onGenerateNote(resource)} style={miniButton(colors.active)}>
          AI笔记
        </button>
        <button onClick={() => onDelete(resource)} style={miniButton(colors.danger)}>
          删除
        </button>
      </div>
    </div>
  );
}

function NoteTab({ notes, colors, onOpen, onAdd }) {
  return (
    <div style={contentCardStyle(colors)}>
      <div style={panelHeaderStyle}>
        <div>
          <h2 style={{ ...sectionTitleStyle(colors), margin: 0 }}>课程笔记</h2>
          <p style={{ margin: "8px 0 0", color: colors.text, fontSize: "13px" }}>
            只展示笔记索引，点击进入后再查看、编辑或导出。
          </p>
        </div>

        <button onClick={onAdd} style={secondaryButton(colors)}>
          ＋ 新建笔记
        </button>
      </div>

      {notes.length === 0 ? (
        <EmptyState colors={colors} text="暂无课程笔记，可从资料生成或手动新建。" />
      ) : (
        <div style={{ display: "grid", gap: "12px" }}>
          {notes.map((note) => (
            <NoteIndexItem key={note.id} note={note} colors={colors} onOpen={onOpen} />
          ))}
        </div>
      )}
    </div>
  );
}

function NoteIndexItem({ note, colors, onOpen }) {
  return (
    <button
      onClick={() => onOpen(note)}
      style={{
        ...compactRowStyle(colors),
        width: "100%",
        textAlign: "left",
        cursor: "pointer",
        fontFamily: "inherit",
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <h3 style={{ margin: 0, color: colors.title, fontSize: "16px", fontWeight: 700 }}>
            {note.title}
          </h3>
          {note.aiGenerated && <Tag colors={colors}>AI生成</Tag>}
          {(note.sourceResourceName || note.source) && (
            <Tag colors={colors}>{note.sourceResourceName || note.source}</Tag>
          )}
        </div>
        <p
          style={{
            margin: "8px 0 0",
            color: colors.text,
            fontSize: "13px",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            maxWidth: "760px",
          }}
        >
          {plainText(note.content) || "暂无正文，点击进入补充。"}
        </p>
      </div>

      <span style={{ color: colors.muted, fontSize: "13px", flexShrink: 0 }}>
        {new Date(note.updatedAt || note.createdAt).toLocaleDateString()} →
      </span>
    </button>
  );
}

function Tag({ colors, children }) {
  return (
    <span
      style={{
        color: colors.active,
        background: colors.softer,
        border: `1px solid ${colors.border}`,
        borderRadius: "999px",
        padding: "3px 9px",
        fontSize: "12px",
        fontWeight: 700,
      }}
    >
      {children}
    </span>
  );
}

function DDLTab({ course, ddls, colors, onComplete, onDelete }) {
  return (
    <div style={contentCardStyle(colors)}>
      <h2 style={sectionTitleStyle(colors)}>{course.title}的 DDL</h2>

      {ddls.length === 0 ? (
        <EmptyState colors={colors} text="暂无符合条件的 DDL" />
      ) : (
        <div>
          {ddls.map((ddl, index) => (
            <DDLRow
              key={ddl.id}
              ddl={ddl}
              colors={colors}
              showBorder={index !== ddls.length - 1}
              onComplete={onComplete}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function DDLRow({ ddl, colors, showBorder, onComplete, onDelete }) {
  const status = getDDLStatus(ddl);

  return (
    <div
      style={{
        padding: "22px 0",
        borderBottom: showBorder ? `1px solid ${colors.border}` : "none",
        display: "grid",
        gridTemplateColumns: "1fr auto",
        gap: "20px",
        alignItems: "center",
      }}
    >
      <div>
        <h3 style={{ margin: 0, color: colors.title, fontSize: "17px", fontWeight: 700 }}>
          {ddl.title}
        </h3>
        <p style={{ margin: "8px 0 0", color: colors.text, fontSize: "14px" }}>
          {ddl.date}
        </p>
        {(ddl.platform || ddl.note || ddl.source) && (
          <p style={{ margin: "6px 0 0", color: colors.muted, fontSize: "13px" }}>
            {ddl.source ? `${ddl.source} · ` : ""}
            {ddl.platform ? `${ddl.platform} · ` : ""}
            {ddl.note}
          </p>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <span style={{ color: status.color, fontSize: "14px", fontWeight: 700, minWidth: "86px", textAlign: "right" }}>
          {status.text}
        </span>
        {!ddl.completed && (
          <button onClick={() => onComplete(ddl.id)} style={miniButton(colors.success)}>
            完成
          </button>
        )}
        <button onClick={() => onDelete(ddl)} style={miniButton(colors.danger)}>
          删除
        </button>
      </div>
    </div>
  );
}

function SettingsTab({ course, colors, activeDdls, completedDdls, courseNotes, courseResources }) {
  return (
    <div style={contentCardStyle(colors)}>
      <h2 style={sectionTitleStyle(colors)}>课程设置</h2>
      <div style={{ display: "grid", gap: "14px" }}>
        <InfoRow label="课程名称" value={course.title} colors={colors} />
        <InfoRow label="未完成 DDL" value={`${activeDdls.length} 个`} colors={colors} />
        <InfoRow label="已完成 DDL" value={`${completedDdls.length} 个`} colors={colors} />
        <InfoRow label="课程笔记" value={`${courseNotes.length} 条`} colors={colors} />
        <InfoRow label="课程资料" value={`${courseResources.length} 份`} colors={colors} />
      </div>
    </div>
  );
}

function InfoRow({ label, value, colors }) {
  return (
    <div
      style={{
        background: colors.soft,
        border: `1px solid ${colors.border}`,
        borderRadius: "14px",
        padding: "16px 18px",
        display: "flex",
        justifyContent: "space-between",
        color: colors.text,
      }}
    >
      <span>{label}</span>
      <strong style={{ color: colors.title }}>{value}</strong>
    </div>
  );
}

function ScheduleModal({
  darkMode,
  colors,
  course,
  schedulePreview,
  scheduleTitle,
  setScheduleTitle,
  scheduleDate,
  setScheduleDate,
  schedulePlatform,
  setSchedulePlatform,
  scheduleNote,
  setScheduleNote,
  scheduleNoCourse,
  setScheduleNoCourse,
  uploadDDLImage,
  onCancel,
  onConfirm,
}) {
  return (
    <ModalShell darkMode={darkMode} colors={colors} width="900px">
      <h2 style={modalTitleStyle(colors)}>新建日程</h2>
      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: "28px" }}>
        <div style={uploadBoxStyle(colors, darkMode)}>
          {schedulePreview ? (
            <img src={schedulePreview} alt="DDL截图预览" style={previewImageStyle} />
          ) : (
            <div style={placeholderBoxStyle(colors, darkMode)}>可选图片</div>
          )}
          <label style={outlineUploadButton(colors, darkMode)}>
            上传图片识别（可选）
            <input type="file" accept="image/*" onChange={uploadDDLImage} style={{ display: "none" }} />
          </label>
          <p style={{ color: colors.muted, fontSize: "13px", marginTop: "14px", textAlign: "center", lineHeight: 1.6 }}>
            支持截图、照片等格式；<br />不上传也可以手动填写
          </p>
        </div>

        <div>
          <SmallLabel colors={colors}>标题</SmallLabel>
          <input value={scheduleTitle} onChange={(e) => setScheduleTitle(e.target.value)} placeholder="请输入日程标题" style={inputStyle(darkMode)} />
          <SmallLabel colors={colors}>截止时间</SmallLabel>
          <input type="datetime-local" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} style={inputStyle(darkMode)} />
          <SmallLabel colors={colors}>平台 / 地点</SmallLabel>
          <input value={schedulePlatform} onChange={(e) => setSchedulePlatform(e.target.value)} placeholder="例如：在线提交 / 教学平台 / 线下提交" style={inputStyle(darkMode)} />
          <SmallLabel colors={colors}>备注</SmallLabel>
          <input value={scheduleNote} onChange={(e) => setScheduleNote(e.target.value)} placeholder="请输入备注（可选）" style={inputStyle(darkMode)} />
          <SmallLabel colors={colors}>归属课程</SmallLabel>
          <select value={scheduleNoCourse ? "none" : course.id} onChange={(e) => setScheduleNoCourse(e.target.value === "none")} style={inputStyle(darkMode)}>
            <option value={course.id}>{course.title}</option>
            <option value="none">不归属任何课程</option>
          </select>
          <ModalActions colors={colors} darkMode={darkMode} onCancel={onCancel} onConfirm={onConfirm} confirmText="保存日程" />
        </div>
      </div>
    </ModalShell>
  );
}

function ResourceViewerModal({ darkMode, colors, resource, relatedNotes = [], onClose, onGenerate, onOpenNote }) {
  const canPreviewImage = resource.objectUrl && resource.mimeType?.startsWith("image/");
  const canPreviewPdf = resource.objectUrl && resource.mimeType === "application/pdf";
  const canOpenFile = Boolean(resource.objectUrl);

  return (
    <ModalShell darkMode={darkMode} colors={colors} width="880px">
      <div style={{ display: "flex", justifyContent: "space-between", gap: "20px", alignItems: "flex-start" }}>
        <div>
          <h2 style={{ ...modalTitleStyle(colors), marginBottom: "8px" }}>{resource.name}</h2>
          <p style={{ margin: 0, color: colors.text, fontSize: "14px" }}>
            {resource.type} · {formatFileSize(resource.size)} · {new Date(resource.createdAt).toLocaleDateString()}
          </p>
        </div>
        <button onClick={onClose} style={closeButtonStyle(colors)}>×</button>
      </div>

      <div style={resourcePreviewAreaStyle(colors)}>
        {canPreviewImage && <img src={resource.objectUrl} alt={resource.name} style={{ maxWidth: "100%", maxHeight: "420px", borderRadius: "16px" }} />}
        {canPreviewPdf && <iframe src={resource.objectUrl} title={resource.name} style={{ width: "100%", height: "420px", border: "none", borderRadius: "16px" }} />}
        {!canPreviewImage && !canPreviewPdf && (
          <div style={{ textAlign: "center", color: colors.text, lineHeight: 1.8 }}>
            <div style={{ ...fileBadgeStyle(colors), margin: "0 auto 16px" }}>{resource.type}</div>
            <p style={{ margin: 0 }}>该类型资料以文件方式查看。</p>
            {!canOpenFile && <p style={{ margin: "8px 0 0", fontSize: "13px", color: colors.muted }}>浏览器刷新后不会保留本地文件预览；重新上传后可直接打开。</p>}
          </div>
        )}
      </div>

      {relatedNotes.length > 0 && (
        <div style={{ marginTop: "22px" }}>
          <h3 style={{ margin: "0 0 12px", color: colors.title, fontSize: "16px" }}>
            由此资料生成的笔记
          </h3>
          <div style={{ display: "grid", gap: "10px" }}>
            {relatedNotes.map((note) => (
              <button
                key={note.id}
                onClick={() => onOpenNote(note)}
                style={{
                  ...compactRowStyle(colors),
                  width: "100%",
                  textAlign: "left",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  padding: "12px 14px",
                }}
              >
                <span style={{ color: colors.title, fontWeight: 700 }}>{note.title}</span>
                <span style={{ color: colors.muted, fontSize: "13px" }}>
                  {new Date(note.updatedAt || note.createdAt).toLocaleDateString()} →
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "22px" }}>
        {canOpenFile && (
          <a href={resource.objectUrl} target="_blank" rel="noreferrer" style={{ ...secondaryButton(colors), textDecoration: "none" }}>
            打开文件
          </a>
        )}
        <button onClick={onGenerate} style={primaryButton(colors)}>AI 生成笔记</button>
      </div>
    </ModalShell>
  );
}

function NotePreviewModal({ darkMode, colors, title, setTitle, content, setContent, onCancel, onSave }) {
  return (
    <ModalShell darkMode={darkMode} colors={colors} width="760px">
      <h2 style={modalTitleStyle(colors)}>AI 笔记预览</h2>
      <input value={title} onChange={(e) => setTitle(e.target.value)} style={inputStyle(darkMode)} />
      <textarea value={content} onChange={(e) => setContent(e.target.value)} style={largeTextareaStyle(darkMode)} />
      <ModalActions colors={colors} darkMode={darkMode} onCancel={onCancel} onConfirm={onSave} confirmText="保存为笔记" />
    </ModalShell>
  );
}

function NoteEditorModal({ darkMode, colors, note, sourceName, title, setTitle, content, setContent, onCancel, onSave, onExport, onDelete }) {
  return (
    <ModalShell darkMode={darkMode} colors={colors} width="820px">
      <div style={{ display: "flex", justifyContent: "space-between", gap: "18px", alignItems: "center", marginBottom: "18px" }}>
        <h2 style={{ ...modalTitleStyle(colors), margin: 0 }}>{note ? "查看 / 编辑笔记" : "新建笔记"}</h2>
        <button onClick={onCancel} style={closeButtonStyle(colors)}>×</button>
      </div>
      {note && sourceName && (
        <div style={{ marginBottom: "14px", color: colors.text, fontSize: "13px" }}>
          来源：<span style={{ color: colors.title, fontWeight: 700 }}>{sourceName}</span>
        </div>
      )}
      <SmallLabel colors={colors}>标题</SmallLabel>
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="笔记标题" style={inputStyle(darkMode)} />
      <SmallLabel colors={colors}>正文</SmallLabel>
      <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="记录课堂重点、作业思路或复习提示..." style={largeTextareaStyle(darkMode)} />
      <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", marginTop: "22px", flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: "10px" }}>
          {note && <button onClick={onExport} style={secondaryButton(colors)}>导出 MD</button>}
          {onDelete && <button onClick={onDelete} style={miniButton(colors.danger)}>删除</button>}
        </div>
        <div style={{ display: "flex", gap: "12px" }}>
          <button onClick={onCancel} style={secondaryButton(colors)}>取消</button>
          <button onClick={onSave} style={primaryButton(colors)}>保存</button>
        </div>
      </div>
    </ModalShell>
  );
}

function ConfirmModal({ darkMode, colors, title, message, onCancel, onConfirm }) {
  return (
    <ModalShell darkMode={darkMode} colors={colors} width="420px">
      <h2 style={{ ...modalTitleStyle(colors), fontSize: "24px", marginBottom: "12px" }}>{title}</h2>
      <p style={{ color: colors.text, lineHeight: 1.8, margin: 0 }}>{message}</p>
      <ModalActions colors={colors} darkMode={darkMode} onCancel={onCancel} onConfirm={onConfirm} confirmText="确认删除" />
    </ModalShell>
  );
}

function SmallLabel({ colors, children }) {
  return <div style={{ color: colors.text, fontSize: "13px", fontWeight: 700, margin: "12px 0 8px" }}>{children}</div>;
}

function EmptyState({ colors, text }) {
  return (
    <div style={{ height: "180px", border: `1px dashed ${colors.border}`, borderRadius: "18px", color: colors.text, background: colors.soft, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "20px", boxSizing: "border-box" }}>{text}</div>
  );
}

function ModalShell({ darkMode, colors, children, width = "520px" }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: darkMode ? "rgba(0,0,0,0.46)" : "rgba(15,42,74,0.18)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }}>
      <div style={{ width, maxWidth: "calc(100vw - 40px)", maxHeight: "calc(100vh - 44px)", overflow: "auto", background: darkMode ? "#1E293B" : "#FFFFFF", border: `1px solid ${colors.border}`, borderRadius: "22px", padding: "32px 36px", boxShadow: darkMode ? "0 28px 60px rgba(0,0,0,0.45)" : "0 24px 48px rgba(15,42,74,0.16)" }}>{children}</div>
    </div>
  );
}

function ModalActions({ colors, darkMode, onCancel, onConfirm, confirmText }) {
  return (
    <div style={{ display: "flex", justifyContent: "flex-end", gap: "14px", marginTop: "26px" }}>
      <button onClick={onCancel} style={{ border: "none", background: darkMode ? "#0F172A" : "#F1F5F9", color: colors.title, borderRadius: "14px", padding: "12px 32px", cursor: "pointer", fontSize: "15px", fontWeight: 700 }}>取消</button>
      <button onClick={onConfirm} style={{ border: "none", background: colors.active, color: "#FFFFFF", borderRadius: "14px", padding: "12px 32px", cursor: "pointer", fontSize: "15px", fontWeight: 700, boxShadow: "0 14px 28px rgba(29,78,216,0.22)" }}>{confirmText}</button>
    </div>
  );
}

function getNotesByResource(notes = [], resource) {
  if (!resource) return [];

  return notes.filter((note) =>
    String(note.sourceResourceId || "") === String(resource.id || "") ||
    String(note.sourceResourceName || "") === String(resource.name || "") ||
    String(note.source || "") === String(resource.name || "")
  );
}

function buildAINote(course, resource, resources) {
  const sourceName = resource?.name || `${resources.length} 份课程资料`;
  return `# ${course.title} · 结构化笔记

> 来源：${sourceName}
> 生成方式：AI 知识结构提取 Demo

## 一、知识结构

1. **核心概念梳理**
   - 提取课程资料中的关键词、定义与适用场景。
   - 将零散内容整理为“概念 → 原理 → 应用”的层级结构。

2. **逻辑关系识别**
   - 识别不同知识点之间的因果、并列、递进和对比关系。
   - 帮助复习时快速把握章节主线。

3. **重点内容归纳**
   - 标记课堂讲义、PPT 或教材中高频出现的重点。
   - 将重点转化为可复习、可检索的笔记条目。

## 二、复习提示

- 先理解概念定义，再整理应用场景。
- 将例题、课堂案例与理论知识对应起来。
- 考前可优先复习本笔记中的层级标题与重点条目。

## 三、LaTeX 示例

当课程中涉及公式、模型或推导时，可以使用 LaTeX 保存：

$$
A \\rightarrow B \\rightarrow C
$$

也可以记录为：

$$
\\text{知识理解} = \\text{概念掌握} + \\text{逻辑梳理} + \\text{应用训练}
$$

## 四、个人补充

- 这里可以继续补充课堂老师强调的内容。
- 可以加入自己的疑问、作业思路和复习计划。
- 后续可导出为 Markdown / PDF / LaTeX 格式。`;
}

function parseDate(date) {
  if (!date) return new Date("");
  return new Date(date.replace(" ", "T"));
}

function getDDLStatus(ddl) {
  if (ddl.completed) return { text: "已完成", color: "#10B981" };
  const ddlDate = parseDate(ddl.date);
  if (Number.isNaN(ddlDate.getTime())) return { text: "时间未设置", color: "#94A3B8" };
  const diff = ddlDate - new Date();
  const dayMs = 1000 * 60 * 60 * 24;
  if (diff < 0) {
    const overdueDays = Math.max(1, Math.ceil(Math.abs(diff) / dayMs));
    return { text: `已逾期${overdueDays}天`, color: "#EF4444" };
  }
  const days = Math.ceil(diff / dayMs);
  if (days === 0) return { text: "今天截止", color: "#F59E0B" };
  return { text: `${days}天后截止`, color: "#F59E0B" };
}

function getFileType(fileName) {
  const ext = fileName.split(".").pop()?.toLowerCase();
  if (["pdf"].includes(ext)) return "PDF";
  if (["ppt", "pptx"].includes(ext)) return "PPT";
  if (["doc", "docx"].includes(ext)) return "Word";
  if (["jpg", "jpeg", "png", "webp"].includes(ext)) return "图片";
  if (["mp3", "wav", "m4a"].includes(ext)) return "录音";
  if (["txt", "md"].includes(ext)) return "文本";
  return "资料";
}

function formatFileSize(size) {
  if (!size) return "未知大小";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function plainText(markdown = "") {
  return markdown
    .replace(/[#>*_`$-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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

const panelHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: "20px",
  alignItems: "center",
  marginBottom: "18px",
};

const previewImageStyle = {
  width: "100%",
  maxHeight: "220px",
  objectFit: "cover",
  borderRadius: "14px",
  marginBottom: "18px",
};

function uploadBoxStyle(colors, darkMode) {
  return {
    background: colors.soft,
    border: `1px dashed ${colors.border}`,
    borderRadius: "18px",
    minHeight: "360px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "18px",
    boxSizing: "border-box",
  };
}

function placeholderBoxStyle(colors, darkMode) {
  return {
    width: "180px",
    height: "160px",
    borderRadius: "16px",
    background: darkMode ? "#0F172A" : "#E5EAF4",
    marginBottom: "20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: colors.muted,
    fontSize: "13px",
  };
}

function outlineUploadButton(colors, darkMode) {
  return {
    border: `1px solid ${colors.active}`,
    color: colors.active,
    background: darkMode ? "rgba(129,140,248,0.08)" : "#FFFFFF",
    padding: "10px 24px",
    borderRadius: "12px",
    cursor: "pointer",
    fontWeight: 600,
  };
}

function courseShellStyle(colors, darkMode) {
  return {
    background: colors.shell,
    border: `1px solid ${colors.border}`,
    borderRadius: "24px",
    overflow: "hidden",
    backdropFilter: "blur(24px)",
    boxShadow: darkMode ? "0 24px 54px rgba(0,0,0,0.24)" : "0 20px 48px rgba(15,42,74,0.08)",
  };
}

function contentCardStyle(colors) {
  return {
    background: colors.card,
    border: `1px solid ${colors.border}`,
    borderRadius: "20px",
    padding: "28px 34px",
    minHeight: "420px",
  };
}

function compactRowStyle(colors) {
  return {
    background: colors.soft,
    border: `1px solid ${colors.border}`,
    borderRadius: "16px",
    padding: "16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "16px",
  };
}

function sectionTitleStyle(colors) {
  return { margin: "0 0 22px", color: colors.title, fontSize: "24px", fontWeight: 700 };
}

function itemCardStyle(colors) {
  return { background: colors.soft, border: `1px solid ${colors.border}`, borderRadius: "16px", padding: "16px" };
}

function fileBadgeStyle(colors) {
  return {
    width: "42px",
    height: "42px",
    borderRadius: "14px",
    background: colors.active,
    color: "#FFFFFF",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "12px",
    fontWeight: 700,
    flexShrink: 0,
  };
}

function backButtonStyle(colors, darkMode) {
  return {
    border: `1px solid ${colors.border}`,
    background: darkMode ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.82)",
    color: colors.text,
    padding: "10px 16px",
    borderRadius: "14px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: 500,
    fontFamily: "inherit",
    marginBottom: "18px",
  };
}

function modalTitleStyle(colors) {
  return { margin: "0 0 26px", color: colors.title, fontSize: "28px", fontWeight: 800 };
}

function inputStyle(darkMode) {
  return {
    width: "100%",
    height: "52px",
    borderRadius: "12px",
    border: darkMode ? "1px solid rgba(148,163,184,0.24)" : "1px solid #D6E0EF",
    background: darkMode ? "#0F172A" : "#FFFFFF",
    color: darkMode ? "#F8FAFC" : "#183B63",
    padding: "0 16px",
    boxSizing: "border-box",
    fontSize: "15px",
    outline: "none",
    fontFamily: "inherit",
    colorScheme: darkMode ? "dark" : "light",
  };
}

function largeTextareaStyle(darkMode) {
  return {
    ...inputStyle(darkMode),
    height: "360px",
    paddingTop: "14px",
    resize: "vertical",
    lineHeight: 1.7,
    marginTop: "12px",
    fontFamily: "Consolas, Menlo, monospace",
  };
}

function primaryButton(colors) {
  return {
    border: "none",
    background: colors.active,
    color: "white",
    borderRadius: "12px",
    padding: "12px 20px",
    cursor: "pointer",
    fontSize: "15px",
    fontWeight: 700,
    fontFamily: "inherit",
    boxShadow: "0 14px 28px rgba(29,78,216,0.2)",
  };
}

function secondaryButton(colors) {
  return {
    border: `1px solid ${colors.border}`,
    background: colors.soft,
    color: colors.active,
    borderRadius: "12px",
    padding: "12px 20px",
    cursor: "pointer",
    fontSize: "15px",
    fontWeight: 700,
    fontFamily: "inherit",
  };
}

function ghostButton(colors) {
  return {
    border: `1px solid ${colors.border}`,
    background: colors.card,
    color: colors.text,
    borderRadius: "10px",
    padding: "7px 12px",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: 700,
    fontFamily: "inherit",
  };
}

function closeButtonStyle(colors) {
  return {
    border: "none",
    background: colors.soft,
    color: colors.text,
    width: "36px",
    height: "36px",
    borderRadius: "12px",
    cursor: "pointer",
    fontSize: "22px",
    lineHeight: 1,
  };
}

function miniButton(background) {
  return {
    border: "none",
    background,
    color: "#FFFFFF",
    borderRadius: "10px",
    padding: "7px 12px",
    cursor: "pointer",
    fontSize: "12px",
    fontFamily: "inherit",
    fontWeight: 700,
  };
}

function resourcePreviewAreaStyle(colors) {
  return {
    marginTop: "24px",
    minHeight: "260px",
    background: colors.soft,
    border: `1px solid ${colors.border}`,
    borderRadius: "18px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
    boxSizing: "border-box",
  };
}

export default CoursePage;
