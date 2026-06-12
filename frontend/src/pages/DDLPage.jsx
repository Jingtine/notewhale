import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Footer from "../components/Footer";
import {
  getDdls as getBackendDdls,
  createDdl as createBackendDdl,
  updateDdl as updateBackendDdl,
  deleteDdl as deleteBackendDdl,
} from "../api/ddlApi";
import { getFolders as getBackendFolders } from "../api/folderApi";

function DDLPage() {
  const navigate = useNavigate();

  const [backendOnline, setBackendOnline] = useState(false);
  const [syncMessage, setSyncMessage] = useState("正在同步 DDL");

  const [ddls, setDdls] = useState(() =>
    JSON.parse(localStorage.getItem("ddls") || "[]")
  );

  const [folders, setFolders] = useState(() =>
    JSON.parse(
      localStorage.getItem("courseFolders") ||
        localStorage.getItem("folders") ||
        "[]"
    )
  );

  const courses = folders.flatMap(
    (folder) => folder.courses || folder.items || []
  );
  const darkMode = JSON.parse(localStorage.getItem("darkMode") || "false");

  const [tab, setTab] = useState("全部");

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingDDL, setEditingDDL] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editCourseId, setEditCourseId] = useState("");
  const [editPlatform, setEditPlatform] = useState("");
  const [editNote, setEditNote] = useState("");

  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newCourseId, setNewCourseId] = useState("");
  const [newPlatform, setNewPlatform] = useState("");
  const [newNote, setNewNote] = useState("");
  const [newPreview, setNewPreview] = useState("");

  useEffect(() => {
    let alive = true;

    async function loadBackendData() {
      try {
        const [folderData, ddlData] = await Promise.all([
          getBackendFolders(),
          getBackendDdls(),
        ]);

        if (!alive) return;

        const nextFolders = Array.isArray(folderData)
          ? folderData.map(mapBackendFolder)
          : [];

        const nextDdls = Array.isArray(ddlData)
          ? ddlData.map(mapBackendDdl)
          : [];

        setFolders(nextFolders);
        setDdls(nextDdls);
        setBackendOnline(true);
        setSyncMessage(`已同步 ${nextDdls.length} 条 DDL`);
      } catch {
        if (!alive) return;

        setBackendOnline(false);
        setSyncMessage("后端暂不可用，当前使用本地 DDL");
      }
    }

    loadBackendData();

    return () => {
      alive = false;
    };
  }, []);

  function saveDdls(nextDdls) {
    setDdls(nextDdls);

    const localOnlyDdls = nextDdls.filter((ddl) => !ddl.backendSynced);
    localStorage.setItem("ddls", JSON.stringify(localOnlyDdls));
  }

  function parseDate(date) {
    if (!date) return new Date("");
    return new Date(String(date).replace(" ", "T"));
  }

  const filteredDdls = useMemo(() => {
    const now = new Date();

    const sorted = [...ddls].sort(
      (a, b) => parseDate(a.date) - parseDate(b.date)
    );

    switch (tab) {
      case "即将到期":
        return sorted.filter((ddl) => {
          const diff = parseDate(ddl.date) - now;
          return !ddl.completed && diff > 0 && diff <= 7 * 24 * 60 * 60 * 1000;
        });

      case "已过期":
        return sorted.filter(
          (ddl) => !ddl.completed && parseDate(ddl.date) < now
        );

      case "已完成":
        return sorted.filter((ddl) => ddl.completed);

      default:
        return sorted.filter((ddl) => !ddl.completed);
    }
  }, [ddls, tab]);

  const colors = {
    bg: darkMode
      ? "linear-gradient(180deg,#0F172A 0%,#111827 100%)"
      : "#F5F8FC",
    card: darkMode ? "rgba(30,41,59,0.88)" : "rgba(255,255,255,0.88)",
    border: darkMode ? "rgba(148,163,184,0.14)" : "#E2E8F0",
    title: darkMode ? "#F8FAFC" : "#183B63",
    text: darkMode ? "#CBD5E1" : "#64748B",
    muted: darkMode ? "#94A3B8" : "#94A3B8",
    active: darkMode ? "#818CF8" : "#2563EB",
    buttonBg: darkMode ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.82)",
  };

  function getStatus(ddl) {
    if (ddl.completed) {
      return { text: "已完成", color: "#10B981" };
    }

    const ddlDate = parseDate(ddl.date);
    const now = new Date();
    const diff = ddlDate - now;
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

    if (Number.isNaN(ddlDate.getTime())) {
      return { text: "时间未设置", color: colors.muted };
    }

    if (diff < 0) {
      return {
        text: `已过期 ${Math.abs(days)} 天`,
        color: "#EF4444",
      };
    }

    if (days === 0) {
      return { text: "今天截止", color: "#F59E0B" };
    }

    return { text: `剩余 ${days} 天`, color: "#10B981" };
  }

  async function completeDDL(id) {
    const target = ddls.find((ddl) => String(ddl.id) === String(id));
    if (!target) return;

    if (target.backendSynced && target.backendId) {
      try {
        const updated = await updateBackendDdl(target.backendId, {
          completed: true,
        });

        saveDdls(
          ddls.map((ddl) =>
            String(ddl.id) === String(id) ? mapBackendDdl(updated) : ddl
          )
        );
        return;
      } catch (error) {
        alert(error.message || "后端 DDL 更新失败");
        return;
      }
    }

    saveDdls(
      ddls.map((ddl) =>
        String(ddl.id) === String(id) ? { ...ddl, completed: true } : ddl
      )
    );
  }

  async function deleteDDL(id) {
    if (!window.confirm("确定要删除这个 DDL 吗？")) return;

    const target = ddls.find((ddl) => String(ddl.id) === String(id));
    if (!target) return;

    if (target.backendSynced && target.backendId) {
      try {
        await deleteBackendDdl(target.backendId);
      } catch (error) {
        alert(error.message || "后端 DDL 删除失败");
        return;
      }
    }

    saveDdls(ddls.filter((ddl) => String(ddl.id) !== String(id)));
  }

  async function addDDL() {
    if (!newTitle.trim() || !newDate.trim()) return;

    const selectedCourse = courses.find(
      (course) => String(course.id) === String(newCourseId)
    );

    const baseDDL = {
      title: newTitle.trim(),
      date: newDate.replace("T", " "),
      platform: newPlatform.trim(),
      note: newNote.trim(),
      courseId: selectedCourse ? selectedCourse.id : null,
      courseName: selectedCourse ? selectedCourse.title : "未归属课程",
      completed: false,
      source: newPreview ? "图片识别" : "手动新建",
    };

    if (backendOnline) {
      try {
        const saved = await createBackendDdl({
          ...baseDDL,
          courseId: selectedCourse?.backendSynced ? selectedCourse.backendId : null,
          courseName: baseDDL.courseName,
        });

        saveDdls([mapBackendDdl(saved), ...ddls]);
        setSyncMessage("DDL 已保存到数据库");
        resetAddDDLModal();
        return;
      } catch (error) {
        alert(error.message || "后端 DDL 创建失败，已改为本地保存");
      }
    }

    const nextDDL = {
      id: Date.now(),
      ...baseDDL,
    };

    saveDdls([...ddls, nextDDL]);
    resetAddDDLModal();
  }

  function uploadAddDDLImage(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setNewPreview(URL.createObjectURL(file));

    if (!newTitle.trim()) setNewTitle("法理学论文");
    if (!newDate.trim()) setNewDate("2026-06-12T23:59");
    if (!newPlatform.trim()) setNewPlatform("在线提交");
    if (!newNote.trim()) setNewNote("不少于3000字，参考格式见附件。");

    const matchedCourse = courses.find((course) =>
      String(course.title || "").includes("法理学")
    );
    if (matchedCourse && !newCourseId) {
      setNewCourseId(String(matchedCourse.id));
    }

    event.target.value = "";
  }

  function resetAddDDLModal() {
    setShowAddModal(false);
    setNewTitle("");
    setNewDate("");
    setNewCourseId("");
    setNewPlatform("");
    setNewNote("");
    setNewPreview("");
  }

  function openEditDDL(ddl) {
    setEditingDDL(ddl);
    setEditTitle(ddl.title || "");
    setEditDate((ddl.date || "").replace(" ", "T"));
    setEditCourseId(ddl.courseId || "");
    setEditPlatform(ddl.platform || "");
    setEditNote(ddl.note || "");
    setShowEditModal(true);
  }

  async function confirmEditDDL() {
    if (!editingDDL || !editTitle.trim() || !editDate.trim()) return;

    const selectedCourse = courses.find(
      (course) => String(course.id) === String(editCourseId)
    );

    const nextPayload = {
      title: editTitle.trim(),
      date: editDate.replace("T", " "),
      courseId: selectedCourse ? selectedCourse.id : null,
      courseName: selectedCourse ? selectedCourse.title : "未归属课程",
      platform: editPlatform.trim(),
      note: editNote.trim(),
    };

    if (editingDDL.backendSynced && editingDDL.backendId) {
      try {
        const updated = await updateBackendDdl(editingDDL.backendId, {
          ...nextPayload,
          courseId: selectedCourse?.backendSynced ? selectedCourse.backendId : null,
          courseName: nextPayload.courseName,
        });

        saveDdls(
          ddls.map((ddl) =>
            String(ddl.id) === String(editingDDL.id) ? mapBackendDdl(updated) : ddl
          )
        );
        closeEditModal();
        return;
      } catch (error) {
        alert(error.message || "后端 DDL 修改失败");
        return;
      }
    }

    const nextDdls = ddls.map((ddl) =>
      String(ddl.id) === String(editingDDL.id)
        ? {
            ...ddl,
            ...nextPayload,
          }
        : ddl
    );

    saveDdls(nextDdls);
    closeEditModal();
  }

  function closeEditModal() {
    setShowEditModal(false);
    setEditingDDL(null);
    setEditTitle("");
    setEditDate("");
    setEditCourseId("");
    setEditPlatform("");
    setEditNote("");
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
          width: "100%",
          maxWidth: "1180px",
          margin: "0 auto",
          flex: 1,
          overflowY: "auto",
          padding: "42px 36px 120px",
          boxSizing: "border-box",
          scrollbarWidth: "thin",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: "28px",
          }}
        >
          <div>
            <button
              onClick={() => navigate("/")}
              style={{
                border: darkMode
                  ? "1px solid rgba(255,255,255,0.08)"
                  : "1px solid #E5EAF3",
                cursor: "pointer",
                background: colors.buttonBg,
                color: colors.text,
                padding: "10px 16px",
                borderRadius: "14px",
                marginBottom: "18px",
                fontSize: "14px",
                fontWeight: 500,
                fontFamily: "inherit",
              }}
            >
              ← 返回主页
            </button>

            <h1
              style={{
                margin: 0,
                fontSize: "42px",
                color: colors.title,
                fontWeight: 700,
                letterSpacing: "-0.04em",
              }}
            >
              DeadLine管理流通处
            </h1>

            <p
              style={{
                margin: "8px 0 0",
                color: colors.text,
                fontSize: "15px",
              }}
            >
              共 {filteredDdls.length} 项 · {backendOnline ? "数据库同步" : "本地模式"}
            </p>

            <p
              style={{
                margin: "6px 0 0",
                color: colors.muted,
                fontSize: "13px",
              }}
            >
              {syncMessage}
            </p>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            style={{
              border: "none",
              cursor: "pointer",
              background: colors.active,
              color: "#FFFFFF",
              padding: "12px 20px",
              borderRadius: "16px",
              fontSize: "15px",
              fontWeight: 600,
              fontFamily: "inherit",
              boxShadow: darkMode
                ? "0 16px 32px rgba(99,102,241,0.22)"
                : "0 14px 28px rgba(37,99,235,0.18)",
              marginTop: "42px",
            }}
          >
            ＋ 新建日程
          </button>
        </div>

        <div
          style={{
            display: "flex",
            gap: "12px",
            marginBottom: "28px",
          }}
        >
          {["全部", "即将到期", "已过期", "已完成"].map((item) => {
            const active = tab === item;

            return (
              <button
                key={item}
                onClick={() => setTab(item)}
                style={{
                  border: "none",
                  cursor: "pointer",
                  padding: "10px 18px",
                  borderRadius: "12px",
                  background: active ? colors.active : colors.card,
                  color: active ? "#fff" : colors.text,
                  fontSize: "14px",
                  fontWeight: active ? 600 : 500,
                  fontFamily: "inherit",
                }}
              >
                {item}
              </button>
            );
          })}
        </div>

        {filteredDdls.length === 0 ? (
          <div
            style={{
              height: "180px",
              borderRadius: "18px",
              border: `1px dashed ${colors.border}`,
              background: colors.card,
              color: colors.text,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backdropFilter: "blur(20px)",
            }}
          >
            当前分类下暂无 DDL
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: "18px",
            }}
          >
            {filteredDdls.map((ddl) => {
              const status = getStatus(ddl);

              return (
                <div
                  key={ddl.id}
                  style={{
                    background: colors.card,
                    border: `1px solid ${colors.border}`,
                    padding: "20px",
                    borderRadius: "18px",
                    minHeight: "180px",
                    backdropFilter: "blur(20px)",
                    boxShadow: darkMode
                      ? "0 12px 28px rgba(0,0,0,0.18)"
                      : "0 8px 24px rgba(15,42,74,0.04)",
                    opacity: ddl.completed ? 0.72 : 1,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      gap: "18px",
                      height: "100%",
                    }}
                  >
                    <div>
                      <h3
                        style={{
                          margin: 0,
                          color: colors.title,
                          fontSize: "18px",
                          fontWeight: 600,
                          textDecoration: ddl.completed
                            ? "line-through"
                            : "none",
                        }}
                      >
                        {ddl.title}
                      </h3>

                      <p
                        style={{
                          margin: "8px 0 0",
                          color: colors.text,
                          fontSize: "13px",
                        }}
                      >
                        {ddl.courseName || "未归属课程"}
                      </p>
                    </div>

                    <div>
                      <div
                        style={{
                          color: colors.text,
                          fontSize: "13px",
                        }}
                      >
                        {ddl.date}
                      </div>

                      <div
                        style={{
                          marginTop: "6px",
                          color: status.color,
                          fontWeight: 600,
                          fontSize: "14px",
                        }}
                      >
                        {status.text}
                      </div>

                      {(ddl.platform || ddl.note || ddl.source) && (
                        <div
                          style={{
                            marginTop: "6px",
                            color: colors.muted,
                            fontSize: "12px",
                            lineHeight: 1.6,
                          }}
                        >
                          {ddl.source ? `${ddl.source} · ` : ""}
                          {ddl.platform ? `${ddl.platform} · ` : ""}
                          {ddl.note}
                        </div>
                      )}

                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginTop: "14px",
                          gap: "10px",
                          flexWrap: "wrap",
                        }}
                      >
                        <button
                          onClick={() => openEditDDL(ddl)}
                          style={smallButtonStyle(darkMode, "edit")}
                        >
                          编辑
                        </button>

                        {!ddl.completed && (
                          <button
                            onClick={() => completeDDL(ddl.id)}
                            style={smallButtonStyle(darkMode, "done")}
                          >
                            完成
                          </button>
                        )}

                        <button
                          onClick={() => deleteDDL(ddl.id)}
                          style={smallButtonStyle(darkMode, "delete")}
                        >
                          删除
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {showAddModal && (
          <DDLModal
            title="新建日程"
            darkMode={darkMode}
            colors={colors}
            ddlTitle={newTitle}
            setDDLTitle={setNewTitle}
            ddlDate={newDate}
            setDDLDate={setNewDate}
            platform={newPlatform}
            setPlatform={setNewPlatform}
            note={newNote}
            setNote={setNewNote}
            courseId={newCourseId}
            setCourseId={setNewCourseId}
            courses={courses}
            preview={newPreview}
            onUploadImage={uploadAddDDLImage}
            onCancel={resetAddDDLModal}
            onConfirm={addDDL}
            confirmText="保存日程"
            showImageUpload
          />
        )}

        {showEditModal && (
          <DDLModal
            title="编辑日程"
            darkMode={darkMode}
            colors={colors}
            ddlTitle={editTitle}
            setDDLTitle={setEditTitle}
            ddlDate={editDate}
            setDDLDate={setEditDate}
            platform={editPlatform}
            setPlatform={setEditPlatform}
            note={editNote}
            setNote={setEditNote}
            courseId={editCourseId}
            setCourseId={setEditCourseId}
            courses={courses}
            onCancel={closeEditModal}
            onConfirm={confirmEditDDL}
            confirmText="保存修改"
          />
        )}
      </main>

      <Footer
        darkMode={darkMode}
        courseCount={courses.length}
        ddlCount={ddls.length}
      />
    </div>
  );
}

function DDLModal({
  title,
  darkMode,
  colors,
  ddlTitle,
  setDDLTitle,
  ddlDate,
  setDDLDate,
  platform = "",
  setPlatform = () => {},
  note = "",
  setNote = () => {},
  courseId,
  setCourseId,
  courses,
  preview = "",
  onUploadImage,
  showImageUpload = false,
  onCancel,
  onConfirm,
  confirmText,
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: darkMode ? "rgba(0,0,0,0.52)" : "rgba(15,42,74,0.18)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 999,
      }}
    >
      <div
        style={{
          width: showImageUpload ? "900px" : "520px",
          maxWidth: "calc(100vw - 40px)",
          background: darkMode ? "#1E293B" : "#FFFFFF",
          border: `1px solid ${colors.border}`,
          borderRadius: "22px",
          padding: "32px 36px",
          boxShadow: darkMode
            ? "0 28px 60px rgba(0,0,0,0.45)"
            : "0 24px 48px rgba(15,42,74,0.16)",
        }}
      >
        <h2
          style={{
            margin: "0 0 26px",
            color: colors.title,
            fontSize: "28px",
            fontWeight: 800,
          }}
        >
          {title}
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: showImageUpload ? "300px 1fr" : "1fr",
            gap: "28px",
          }}
        >
          {showImageUpload && (
            <div
              style={{
                background: darkMode ? "rgba(148,163,184,0.12)" : "#F8FAFC",
                border: `1px dashed ${colors.border}`,
                borderRadius: "18px",
                minHeight: "360px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "18px",
                boxSizing: "border-box",
              }}
            >
              {preview ? (
                <img
                  src={preview}
                  alt="DDL截图预览"
                  style={{
                    width: "100%",
                    maxHeight: "220px",
                    objectFit: "cover",
                    borderRadius: "14px",
                    marginBottom: "18px",
                  }}
                />
              ) : (
                <div
                  style={{
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
                  }}
                >
                  可选图片
                </div>
              )}

              <label
                style={{
                  border: `1px solid ${colors.active}`,
                  color: colors.active,
                  background: darkMode ? "rgba(129,140,248,0.08)" : "#FFFFFF",
                  padding: "10px 24px",
                  borderRadius: "12px",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                上传图片识别（可选）
                <input
                  type="file"
                  accept="image/*"
                  onChange={onUploadImage}
                  style={{ display: "none" }}
                />
              </label>

              <p
                style={{
                  color: colors.muted,
                  fontSize: "13px",
                  marginTop: "14px",
                  textAlign: "center",
                  lineHeight: 1.6,
                }}
              >
                支持截图、照片等格式；
                <br />
                不上传也可以手动填写
              </p>
            </div>
          )}

          <div>
            <SmallLabel colors={colors}>标题</SmallLabel>
            <input
              value={ddlTitle}
              onChange={(e) => setDDLTitle(e.target.value)}
              placeholder="请输入日程标题"
              style={modalInputStyle(darkMode)}
            />

            <SmallLabel colors={colors}>截止时间</SmallLabel>
            <input
              type="datetime-local"
              value={ddlDate}
              onChange={(e) => setDDLDate(e.target.value)}
              style={modalInputStyle(darkMode)}
            />

            <SmallLabel colors={colors}>平台 / 地点</SmallLabel>
            <input
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              placeholder="例如：在线提交 / 教学平台 / 线下提交"
              style={modalInputStyle(darkMode)}
            />

            <SmallLabel colors={colors}>备注</SmallLabel>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="请输入备注（可选）"
              style={modalInputStyle(darkMode)}
            />

            <SmallLabel colors={colors}>归属课程</SmallLabel>
            <select
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              style={{
                ...modalInputStyle(darkMode),
                cursor: "pointer",
              }}
            >
              <option value="">不归属任何课程</option>

              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title}
                </option>
              ))}
            </select>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "18px",
                marginTop: "32px",
              }}
            >
              <button
                onClick={onCancel}
                style={{
                  border: "none",
                  background: darkMode ? "#0F172A" : "#F1F5F9",
                  color: colors.title,
                  borderRadius: "14px",
                  padding: "14px 44px",
                  cursor: "pointer",
                  fontSize: "16px",
                  fontWeight: 700,
                }}
              >
                取消
              </button>

              <button
                onClick={onConfirm}
                style={{
                  border: "none",
                  background: colors.active,
                  color: "#FFFFFF",
                  borderRadius: "14px",
                  padding: "14px 44px",
                  cursor: "pointer",
                  fontSize: "16px",
                  fontWeight: 700,
                  boxShadow: "0 14px 28px rgba(29,78,216,0.22)",
                }}
              >
                {confirmText}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function mapBackendFolder(folder) {
  return {
    id: folder.id === null || folder.id === undefined
      ? "__unassigned"
      : `api-folder-${folder.id}`,
    backendId: folder.id,
    title: folder.title || "未归属课程",
    backendSynced: folder.id !== null && folder.id !== undefined,
    courses: Array.isArray(folder.courses)
      ? folder.courses.map(mapBackendCourse)
      : [],
  };
}

function mapBackendCourse(course) {
  return {
    id: `api-${course.id}`,
    backendId: course.id,
    title: course.title,
    starred: Boolean(course.starred),
    folderId: course.folderId ? `api-folder-${course.folderId}` : "__unassigned",
    backendFolderId: course.folderId || null,
    folderName: course.folderName || "",
    noteCount: 0,
    ddlCount: 0,
    backendSynced: true,
  };
}

function mapBackendDdl(ddl) {
  return {
    ...ddl,
    id: `api-ddl-${ddl.id}`,
    backendId: ddl.id,
    courseId: ddl.courseId ? `api-${ddl.courseId}` : null,
    backendCourseId: ddl.courseId || null,
    courseName: ddl.courseName || "未归属课程",
    platform: ddl.platform || "",
    note: ddl.note || "",
    completed: Boolean(ddl.completed),
    source: ddl.source || "后端同步",
    backendSynced: true,
  };
}

function SmallLabel({ colors, children }) {
  return (
    <div
      style={{
        color: colors.text,
        fontSize: "13px",
        fontWeight: 700,
        margin: "12px 0 8px",
      }}
    >
      {children}
    </div>
  );
}

function modalInputStyle(darkMode) {
  return {
    width: "100%",
    height: "52px",
    borderRadius: "12px",
    border: darkMode
      ? "1px solid rgba(148,163,184,0.22)"
      : "1px solid #D6E0EF",
    background: darkMode ? "#0F172A" : "#FFFFFF",
    color: darkMode ? "#F8FAFC" : "#183B63",
    padding: "0 14px",
    boxSizing: "border-box",
    fontSize: "15px",
    outline: "none",
    fontFamily: "inherit",
    colorScheme: darkMode ? "dark" : "light",
  };
}

function smallButtonStyle(darkMode, type) {
  if (type === "done") {
    return {
      border: "none",
      background: "#10B981",
      color: "#FFFFFF",
      borderRadius: "10px",
      padding: "6px 12px",
      cursor: "pointer",
      fontSize: "13px",
      fontFamily: "inherit",
    };
  }

  if (type === "delete") {
    return {
      border: "none",
      background: "#EF4444",
      color: "#FFFFFF",
      borderRadius: "10px",
      padding: "6px 12px",
      cursor: "pointer",
      fontSize: "13px",
      fontFamily: "inherit",
    };
  }

  return {
    border: "none",
    background: darkMode ? "#475569" : "#EAF1FF",
    color: darkMode ? "#E2E8F0" : "#2563EB",
    borderRadius: "10px",
    padding: "6px 12px",
    cursor: "pointer",
    fontSize: "13px",
    fontFamily: "inherit",
  };
}

export default DDLPage;
