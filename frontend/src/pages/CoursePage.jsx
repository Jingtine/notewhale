import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Footer from "../components/Footer";
import {
  getNotes as getBackendNotes,
  createNote as createBackendNote,
  deleteNote as deleteBackendNote,
  generateNote as generateBackendNote,
} from "../api/noteApi";
import {
  getResources as getBackendResources,
  uploadResource as uploadBackendResource,
  deleteResource as deleteBackendResource,
  getResourceFileUrl,
} from "../api/resourceApi";
import {
  getDdls as getBackendDdls,
  createDdl as createBackendDdl,
  updateDdl as updateBackendDdl,
  deleteDdl as deleteBackendDdl,
  recognizeDdlWithVisionAgent,
} from "../api/ddlApi";

import { getCourses as getBackendCourses } from "../api/courseApi";



function toDatetimeLocalValue(value) {
  if (!value) return "";

  const text = String(value).trim();

  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(text)) {
    return text.slice(0, 16);
  }

  const normalized = text
    .replace(/\//g, "-")
    .replace(" ", "T")
    .replace("：", ":");

  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(normalized)) {
    return normalized.slice(0, 16);
  }

  return "";
}

function getUserStorageKeyForCoursePage(user, key) {
  const rawUserId =
    user?.id ||
    user?.account ||
    user?.email ||
    localStorage.getItem("notewhale_current_user_id") ||
    "guest";

  const safeUserId = String(rawUserId).replace(/[^a-zA-Z0-9_-]/g, "_");
  return `notewhale_user_${safeUserId}_${key}`;
}

function readCoursePageArray(user, key, fallback = []) {
  try {
    const scopedValue = localStorage.getItem(getUserStorageKeyForCoursePage(user, key));
    if (scopedValue) {
      const parsed = JSON.parse(scopedValue);
      return Array.isArray(parsed) ? parsed : fallback;
    }

    const legacyValue = localStorage.getItem(key);
    if (!legacyValue) return fallback;

    const parsed = JSON.parse(legacyValue);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function CoursePage({ user = null, onLogout } = {}) {
  const navigate = useNavigate();
  const { id } = useParams();

  const [darkMode, setDarkMode] = useState(() =>
    JSON.parse(localStorage.getItem("darkMode") || "false")
  );

  useEffect(() => {
    localStorage.setItem("darkMode", JSON.stringify(darkMode));
  }, [darkMode]);

  const [activeTab, setActiveTab] = useState("resources");
  const [ddlFilter, setDdlFilter] = useState("all");
  const [courseSearchText, setCourseSearchText] = useState("");

  const [ddls, setDdls] = useState(() =>
    JSON.parse(localStorage.getItem("ddls") || "[]")
  );

  const [notes, setNotes] = useState(() =>
    JSON.parse(localStorage.getItem("notes") || "[]")
  );

  const [resources, setResources] = useState(() =>
    JSON.parse(localStorage.getItem("resources") || "[]")
  );

  const [backendCourses, setBackendCourses] = useState([]);
  const [backendCourseLoading, setBackendCourseLoading] = useState(false);

  const isBackendRoute = String(id).startsWith("api-");
  const backendRouteId = isBackendRoute ? String(id).replace(/^api-/, "") : null;

  const folders = readCoursePageArray(user, "folders", []);

  const allCourses = folders.flatMap(
    (folder) => folder.courses || folder.items || []
  );

  useEffect(() => {
    if (!isBackendRoute) return;

    let alive = true;
    setBackendCourseLoading(true);

    async function loadBackendCourse() {
      try {
        const data = await getBackendCourses();
        if (!alive) return;
        setBackendCourses(Array.isArray(data) ? data : []);
      } catch {
        if (!alive) return;
        setBackendCourses([]);
      } finally {
        if (alive) setBackendCourseLoading(false);
      }
    }

    loadBackendCourse();

    return () => {
      alive = false;
    };
  }, [isBackendRoute, backendRouteId]);

  useEffect(() => {
    let alive = true;

    async function loadBackendNotes() {
      try {
        const data = await getBackendNotes();
        if (!alive) return;

        const backendNotes = Array.isArray(data) ? data.map(mapBackendNote) : [];

        setNotes((prevNotes) => {
          const localNotes = prevNotes.filter((note) => !note.backendSynced);
          return [...localNotes, ...backendNotes];
        });
      } catch {
        // 后端不可用时继续使用 localStorage 笔记，保证演示不中断。
      }
    }

    loadBackendNotes();

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;

    async function loadBackendResources() {
      try {
        const data = await getBackendResources();
        if (!alive) return;

        const backendResources = Array.isArray(data)
          ? data.map(mapBackendResource)
          : [];

        setResources((prevResources) => {
          const localResources = prevResources.filter(
            (resource) => !resource.backendSynced
          );
          return [...localResources, ...backendResources];
        });
      } catch {
        // 后端不可用时继续使用 localStorage 资料，保证演示不中断。
      }
    }

    loadBackendResources();

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;

    async function loadBackendDdls() {
      try {
        const data = await getBackendDdls();
        if (!alive) return;

        const backendDdls = Array.isArray(data) ? data.map(mapBackendDdl) : [];

        setDdls((prevDdls) => {
          const localDdls = prevDdls.filter((ddl) => !ddl.backendSynced);
          return [...localDdls, ...backendDdls];
        });
      } catch {
        // 后端不可用时继续使用 localStorage DDL，保证演示不中断。
      }
    }

    loadBackendDdls();

    return () => {
      alive = false;
    };
  }, []);

  const localCourse = allCourses.find((course) => String(course.id) === String(id));
  const backendCourse = isBackendRoute
    ? backendCourses.find((course) => String(course.id) === String(backendRouteId))
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
    const currentCourseId = course?.id || id;
    const currentBackendId = course?.backendId || backendRouteId;

    return ddls
      .filter((ddl) => {
        if (String(ddl.courseId) === String(currentCourseId)) return true;

        return (
          course?.backendSynced &&
          currentBackendId &&
          String(ddl.backendCourseId || "") === String(currentBackendId)
        );
      })
      .sort((a, b) => parseDate(a.date) - parseDate(b.date));
  }, [ddls, id, course, backendRouteId]);

  const courseNotes = useMemo(() => {
    const currentCourseId = course?.id || id;
    const currentBackendId = course?.backendId || backendRouteId;

    return notes
      .filter((note) => {
        if (String(note.courseId) === String(currentCourseId)) return true;

        return (
          course?.backendSynced &&
          currentBackendId &&
          String(note.backendCourseId || "") === String(currentBackendId)
        );
      })
      .sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0));
  }, [notes, id, course, backendRouteId]);

  const courseResources = useMemo(() => {
    const currentCourseId = course?.id || id;
    const currentBackendId = course?.backendId || backendRouteId;

    return resources
      .filter((resource) => {
        if (String(resource.courseId) === String(currentCourseId)) return true;

        return (
          course?.backendSynced &&
          currentBackendId &&
          String(resource.backendCourseId || "") === String(currentBackendId)
        );
      })
      .sort(
        (a, b) =>
          (b.createdAt || 0) -
          (a.createdAt || 0)
      );
  }, [resources, id, course, backendRouteId]);

  const searchedCourseDdls = useMemo(() => {
    return filterByCourseSearch(courseDdls, courseSearchText, [
      "title",
      "date",
      "platform",
      "note",
      "source",
      "courseName",
    ]);
  }, [courseDdls, courseSearchText]);

  const searchedCourseNotes = useMemo(() => {
    return filterByCourseSearch(courseNotes, courseSearchText, [
      "title",
      "content",
      "source",
      "sourceResourceName",
      "courseName",
    ]);
  }, [courseNotes, courseSearchText]);

  const searchedCourseResources = useMemo(() => {
    return filterByCourseSearch(courseResources, courseSearchText, [
      "name",
      "type",
      "courseName",
    ]);
  }, [courseResources, courseSearchText]);

  const filteredDdls = useMemo(() => {
    if (ddlFilter === "completed") {
      return searchedCourseDdls.filter((ddl) => ddl.completed);
    }

    if (ddlFilter === "pending") {
      return searchedCourseDdls.filter((ddl) => !ddl.completed);
    }

    return searchedCourseDdls;
  }, [searchedCourseDdls, ddlFilter]);

  const courseSearchResultCount =
    searchedCourseResources.length + searchedCourseNotes.length + searchedCourseDdls.length;

  const courseSearchItems = useMemo(() => {
    const courseTitle = course?.title || "本课程";

    const resourceItems = courseResources.map((resource) => ({
      key: `resource-${resource.id}`,
      type: "resource",
      typeLabel: "资料",
      title: resource.name || "未命名资料",
      subtitle: `${courseTitle} · ${resource.type || "资料"} · ${formatFileSize(resource.size)}`,
      content: `${resource.name || ""} ${resource.type || ""} ${resource.courseName || ""}`,
      tab: "resources",
    }));

    const noteItems = courseNotes.map((note) => ({
      key: `note-${note.id}`,
      type: "note",
      typeLabel: "笔记",
      title: note.title || "未命名笔记",
      subtitle: `${courseTitle} · ${createSnippet(note.content) || note.source || "课程笔记"}`,
      content: `${note.title || ""} ${note.content || ""} ${note.source || ""} ${note.sourceResourceName || ""}`,
      tab: "notes",
      path: `/course/${id}/note/${note.id}`,
    }));

    const ddlItems = courseDdls.map((ddl) => ({
      key: `ddl-${ddl.id}`,
      type: "ddl",
      typeLabel: "DDL",
      title: ddl.title || "未命名 DDL",
      subtitle: `${courseTitle} · ${ddl.date || "未设置时间"}`,
      content: `${ddl.title || ""} ${ddl.date || ""} ${ddl.platform || ""} ${ddl.note || ""} ${ddl.courseName || ""}`,
      tab: "ddl",
    }));

    return [...resourceItems, ...noteItems, ...ddlItems];
  }, [courseResources, courseNotes, courseDdls, course, id]);

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
    const localOnlyDdls = nextDdls.filter((ddl) => !ddl.backendSynced);
    localStorage.setItem("ddls", JSON.stringify(localOnlyDdls));
  }

  function saveNotes(nextNotes) {
    setNotes(nextNotes);
    const localOnlyNotes = nextNotes.filter((note) => !note.backendSynced);
    localStorage.setItem("notes", JSON.stringify(localOnlyNotes));
  }

  function saveResources(nextResources) {
    const localOnlyResources = nextResources.filter(
      (resource) => !resource.backendSynced
    );

    const safeResources = localOnlyResources.map(({ objectUrl, dataUrl, ...rest }) => rest);
    setResources(nextResources);
    localStorage.setItem("resources", JSON.stringify(safeResources));
  }

  async function saveSchedule() {
    if (!scheduleTitle.trim() || !scheduleDate.trim() || !course) return;

    const baseDDL = {
      title: scheduleTitle.trim(),
      date: scheduleDate.replace("T", " "),
      platform: schedulePlatform.trim(),
      note: scheduleNote.trim(),
      courseId: scheduleNoCourse ? null : course.id,
      courseName: scheduleNoCourse ? "未归属课程" : course.title,
      completed: false,
      source: schedulePreview ? "图片识别" : "手动新建",
    };

    if (course.backendSynced) {
      try {
        const saved = await createBackendDdl({
          ...baseDDL,
          courseId: scheduleNoCourse ? null : course.backendId,
          courseName: baseDDL.courseName,
        });

        saveDdls([mapBackendDdl(saved), ...ddls]);
        resetScheduleModal();
        return;
      } catch (error) {
        alert(error.message || "后端 DDL 创建失败，将改为本地保存");
      }
    }

    const newDDL = {
      id: Date.now(),
      ...baseDDL,
    };

    saveDdls([...ddls, newDDL]);
    resetScheduleModal();
  }

  async function uploadResources(event) {
    const files = Array.from(event.target.files || []);
    if (!files.length || !course) return;

    if (course.backendSynced) {
      try {
        const savedResources = [];

        for (const file of files) {
          const saved = await uploadBackendResource({
            file,
            courseId: course.backendId,
            courseName: course.title,
          });

          savedResources.push(mapBackendResource(saved));
        }

        saveResources([...resources, ...savedResources]);
        event.target.value = "";
        return;
      } catch (error) {
        alert(error.message || "后端资料上传失败，将改为本地临时记录");
      }
    }

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

  async function uploadDDLImage(event) {
    const file = event.target.files?.[0];
    if (!file || !course) return;

    setSchedulePreview(URL.createObjectURL(file));

    try {
      const result = await recognizeDdlWithVisionAgent({
        file,
        courseId: course.backendSynced ? course.backendId : null,
        courseName: course.title || "未归属课程",
      });

      setScheduleTitle(result.title || "");
      setScheduleDate(toDatetimeLocalValue(result.date) || "");
      setSchedulePlatform(result.platform || "");
      setScheduleNote(result.note || "");
    } catch (error) {
      alert(error.message || "视觉模型识别失败，请检查智能体配置");
    } finally {
      event.target.value = "";
    }
  }

  async function generateNoteFromResource(resource = null) {
    const targetResource = resource || courseResources[0] || null;

    if (!course) return;

    if (!targetResource) {
      alert("请先上传或选择一份课程资料，再生成 AI 笔记。");
      return;
    }

    setGeneratedFromResource(targetResource);

    if (!course.backendSynced) {
      alert("AI 生成笔记需要后端数据库课程。请先使用登录账号创建课程并上传资料。");
      return;
    }

    if (!targetResource.backendSynced || !targetResource.backendId) {
      alert("这份资料还没有同步到后端，无法读取正文生成 AI 笔记。请重新上传资料。");
      return;
    }

    try {
      const generated = await generateBackendNote({
        courseId: course.backendId,
        courseName: course.title,
        resourceName: targetResource.name || "课程资料",
        resourceId: targetResource.backendId,
        noteStyle: "复习型",
      });

      setGeneratedNoteTitle(generated.title || `${course.title} · AI资料笔记`);
      setGeneratedNoteContent(generated.content || "");
      setShowGeneratedNoteModal(true);
      return;
    } catch (error) {
      alert(error.message || "AI 资料笔记生成失败，请检查文本模型配置和资料解析依赖。");
    }
  }

  async function saveGeneratedNote() {
    if (!generatedNoteTitle.trim() || !generatedNoteContent.trim() || !course) return;

    if (course.backendSynced) {
      try {
        const savedNote = await createBackendNote({
          title: generatedNoteTitle.trim(),
          content: generatedNoteContent.trim(),
          courseId: course.backendId,
          courseName: course.title,
          source: generatedFromResource?.name || "课程资料",
          aiGenerated: true,
        });

        const mappedNote = mapBackendNote(savedNote);
        saveNotes([...notes, mappedNote]);
        closeGeneratedNoteModal();
        navigate(`/course/${id}/note/${mappedNote.id}`);
        return;
      } catch (error) {
        alert(error.message || "后端笔记保存失败，将改为本地保存");
      }
    }

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

  async function openNoteEditor(note = null) {
    if (note) {
      navigate(`/course/${id}/note/${note.id}`);
      return;
    }

    if (!course) return;

    if (course.backendSynced) {
      try {
        const savedNote = await createBackendNote({
          title: `${course.title} · 新建笔记`,
          content: "",
          courseId: course.backendId,
          courseName: course.title,
          source: "手动记录",
          aiGenerated: false,
        });

        const mappedNote = mapBackendNote(savedNote);
        saveNotes([...notes, mappedNote]);
        navigate(`/course/${id}/note/${mappedNote.id}`);
        return;
      } catch (error) {
        alert(error.message || "后端笔记创建失败，将改为本地保存");
      }
    }

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

  async function completeDDL(ddlId) {
    const target = ddls.find((ddl) => String(ddl.id) === String(ddlId));
    if (!target) return;

    if (target.backendSynced && target.backendId) {
      try {
        const updated = await updateBackendDdl(target.backendId, {
          completed: true,
        });

        saveDdls(
          ddls.map((ddl) =>
            String(ddl.id) === String(ddlId) ? mapBackendDdl(updated) : ddl
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
        String(ddl.id) === String(ddlId) ? { ...ddl, completed: true } : ddl
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

  async function confirmDelete() {
    if (!confirmInfo) return;

    if (confirmInfo.type === "resource") {
      if (confirmInfo.target.backendSynced && confirmInfo.target.backendId) {
        try {
          await deleteBackendResource(confirmInfo.target.backendId);
        } catch (error) {
          alert(error.message || "后端资料删除失败");
          return;
        }
      }

      saveResources(resources.filter((resource) => resource.id !== confirmInfo.target.id));
    }

    if (confirmInfo.type === "note") {
      if (confirmInfo.target.backendSynced && confirmInfo.target.backendId) {
        try {
          await deleteBackendNote(confirmInfo.target.backendId);
        } catch (error) {
          alert(error.message || "后端笔记删除失败");
          return;
        }
      }

      saveNotes(notes.filter((note) => note.id !== confirmInfo.target.id));
      closeNoteEditor();
    }

    if (confirmInfo.type === "ddl") {
      if (confirmInfo.target.backendSynced && confirmInfo.target.backendId) {
        try {
          await deleteBackendDdl(confirmInfo.target.backendId);
        } catch (error) {
          alert(error.message || "后端 DDL 删除失败");
          return;
        }
      }

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
        {isBackendRoute && backendCourseLoading
          ? "正在同步后端课程..."
          : "未找到该课程"}
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
        margin: 0,
        padding: 0,
      }}
    >
      <main
        style={{
          flex: 1,
          overflowY: "auto",
          maxWidth: "none",
          width: "100%",
          margin: "0",
          padding: "74px 28px 72px",
          boxSizing: "border-box",
        }}
      >
        <CourseTopBar
          colors={colors}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
          course={course}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          searchText={courseSearchText}
          setSearchText={setCourseSearchText}
          resultCount={courseSearchResultCount}
          searchItems={courseSearchItems}
          onOpenSearchItem={(item) => {
            if (item.tab) setActiveTab(item.tab);
            if (item.path) navigate(item.path);
          }}
          user={user}
          onLogout={onLogout}
          onBack={() => navigate("/")}
        />

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
              minHeight: "460px",
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

            <section style={{ padding: "26px 36px" }}>
              {activeTab === "ddl" && (
                <DDLTab
                  course={course}
                  ddls={filteredDdls}
                  colors={colors}
                  searchText={courseSearchText}
                  onComplete={completeDDL}
                  onDelete={(ddl) => askDelete("ddl", ddl)}
                />
              )}

              {activeTab === "resources" && (
                <ResourceTab
                  resources={searchedCourseResources}
                  notes={searchedCourseNotes}
                  colors={colors}
                  searchText={courseSearchText}
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
                  notes={searchedCourseNotes}
                  colors={colors}
                  searchText={courseSearchText}
                  onOpen={openNoteEditor}
                  onAdd={() => openNoteEditor(null)}
                  onDelete={(note) => askDelete("note", note)}
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

function CourseTopBar({
  colors,
  darkMode,
  setDarkMode,
  course,
  user = null,
  setActiveTab,
  searchText,
  setSearchText,
  searchItems = [],
  onOpenSearchItem,
  onLogout,
  onBack,
}) {
  const inputRef = useRef(null);
  const [showSearchPanel, setShowSearchPanel] = useState(false);
  const [showNotice, setShowNotice] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const searchPlaceholder = `搜索${course?.title || "本课程"}的资料、笔记、DDL...`;

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.ctrlKey && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
        setShowSearchPanel(true);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const matchedItems = useMemo(() => {
    const keyword = String(searchText || "").trim().toLowerCase();
    if (!keyword) return [];

    return searchItems
      .filter((item) =>
        String(`${item.title || ""} ${item.subtitle || ""} ${item.content || ""}`)
          .toLowerCase()
          .includes(keyword)
      )
      .slice(0, 8);
  }, [searchText, searchItems]);

  function handleOpenItem(item) {
    setShowSearchPanel(false);

    if (item.tab) {
      setActiveTab(item.tab);
    }

    if (onOpenSearchItem) {
      onOpenSearchItem(item);
    }
  }

  const theme = {
    bg: darkMode ? "rgba(15,23,42,0.72)" : "rgba(255,255,255,0.86)",
    border: darkMode ? "1px solid rgba(148,163,184,0.08)" : "1px solid rgba(226,232,240,0.9)",
    card: darkMode ? "rgba(30,41,59,0.85)" : "rgba(255,255,255,0.9)",
    input: darkMode ? "rgba(30,41,59,0.78)" : "#FFFFFF",
    text: colors.title,
    subText: colors.text,
    accent: colors.active,
    panel: darkMode ? "#1E293B" : "#FFFFFF",
    item: darkMode ? "#0F172A" : "#F8FAFC",
  };

  const displayName = user?.name || "体验用户";
  const avatarText = user?.avatar || displayName.slice(0, 1) || "体";
  const accountText = user?.account || user?.email || "本地体验账号";

  return (
    <header
      style={{
        height: "74px",
        minHeight: "74px",
        margin: 0,
        padding: "0 26px",
        display: "grid",
        gridTemplateColumns: "minmax(260px, 340px) minmax(420px, 540px) auto",
        alignItems: "center",
        gap: "22px",
        borderBottom: theme.border,
        background: theme.bg,
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        boxSizing: "border-box",
      }}
    >
      <button
        onClick={onBack}
        style={{
          border: "none",
          background: "transparent",
          display: "flex",
          alignItems: "center",
          gap: "14px",
          minWidth: 0,
          cursor: "pointer",
          padding: 0,
          fontFamily: "inherit",
          textAlign: "left",
        }}
        title="返回主页"
      >
        <div
          style={{
            width: "48px",
            height: "48px",
            borderRadius: "16px",
            background: "linear-gradient(135deg,#A78BFA,#2563EB)",
            color: "#FFFFFF",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "23px",
            fontWeight: 800,
            boxShadow: "0 12px 24px rgba(37,99,235,0.22)",
            flexShrink: 0,
          }}
        >
          {course?.title?.slice(0, 1) || "课"}
        </div>

        <div style={{ minWidth: 0 }}>
          <div
            style={{
              color: colors.title,
              fontSize: "23px",
              fontWeight: 800,
              letterSpacing: "-0.04em",
              lineHeight: 1.08,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {course?.title || "课程空间"}
          </div>

          <div
            style={{
              marginTop: "6px",
              color: colors.muted,
              fontSize: "12px",
              fontWeight: 600,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            鲸记 NoteWhale · 返回主页
          </div>
        </div>
      </button>

      <div style={{ position: "relative", width: "100%" }}>
        <div
          style={{
            height: "46px",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            borderRadius: "16px",
            background: theme.input,
            border: theme.border,
            padding: "0 18px",
            boxSizing: "border-box",
          }}
        >
          <span style={{ color: theme.subText }}>⌕</span>

          <input
            ref={inputRef}
            value={searchText}
            onFocus={() => setShowSearchPanel(true)}
            onChange={(event) => {
              setSearchText(event.target.value);
              setShowSearchPanel(true);
            }}
            placeholder={searchPlaceholder}
            style={{
              flex: 1,
              border: "none",
              outline: "none",
              background: "transparent",
              color: theme.text,
              fontSize: "14px",
              fontFamily: "inherit",
              minWidth: 0,
            }}
          />

          {searchText ? (
            <button
              onClick={() => setSearchText("")}
              style={{
                border: "none",
                background: "transparent",
                color: theme.subText,
                cursor: "pointer",
                fontSize: "17px",
                lineHeight: 1,
              }}
              title="清空搜索"
            >
              ×
            </button>
          ) : (
            <span
              style={{
                color: theme.subText,
                background: darkMode ? "rgba(148,163,184,0.12)" : "#EEF4FF",
                borderRadius: "10px",
                padding: "5px 10px",
                fontSize: "12px",
                fontWeight: 800,
                whiteSpace: "nowrap",
              }}
            >
              Ctrl K
            </span>
          )}
        </div>

        {showSearchPanel && searchText.trim() && (
          <div
            style={{
              position: "absolute",
              top: "54px",
              left: 0,
              right: 0,
              background: theme.panel,
              border: theme.border,
              borderRadius: "18px",
              padding: "10px",
              boxShadow: darkMode
                ? "0 24px 48px rgba(0,0,0,0.38)"
                : "0 20px 40px rgba(15,42,74,0.14)",
              zIndex: 999,
            }}
          >
            <div
              style={{
                padding: "6px 8px 10px",
                color: theme.subText,
                fontSize: "12px",
                fontWeight: 700,
              }}
            >
              本课程内共找到 {matchedItems.length} 条结果
            </div>

            {matchedItems.length === 0 ? (
              <div
                style={{
                  padding: "18px 12px",
                  color: theme.subText,
                  fontSize: "14px",
                  textAlign: "center",
                }}
              >
                没有找到相关资料、笔记或 DDL
              </div>
            ) : (
              <div style={{ display: "grid", gap: "8px" }}>
                {matchedItems.map((item) => (
                  <button
                    key={item.key}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => handleOpenItem(item)}
                    style={{
                      border: "none",
                      width: "100%",
                      display: "grid",
                      gridTemplateColumns: "48px 1fr auto",
                      gap: "12px",
                      alignItems: "center",
                      background: theme.item,
                      color: theme.text,
                      borderRadius: "14px",
                      padding: "12px",
                      cursor: "pointer",
                      textAlign: "left",
                      fontFamily: "inherit",
                    }}
                  >
                    <span
                      style={{
                        width: "38px",
                        height: "38px",
                        borderRadius: "12px",
                        background: darkMode ? "rgba(129,140,248,0.16)" : "#EEF4FF",
                        color: theme.accent,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "12px",
                        fontWeight: 800,
                      }}
                    >
                      {item.typeLabel}
                    </span>

                    <span style={{ minWidth: 0 }}>
                      <span
                        style={{
                          display: "block",
                          fontSize: "14px",
                          fontWeight: 800,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {item.title}
                      </span>
                      <span
                        style={{
                          display: "block",
                          marginTop: "4px",
                          color: theme.subText,
                          fontSize: "12px",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {item.subtitle}
                      </span>
                    </span>

                    <span style={{ color: theme.subText, fontSize: "13px" }}>打开 →</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "14px" }}>
        <button
          onClick={() => setDarkMode((value) => !value)}
          style={topIconButtonStyle(colors)}
          title="切换日夜间模式"
        >
          {darkMode ? "☾" : "☼"}
        </button>

        <button
          onClick={() => setShowNotice((value) => !value)}
          style={{ ...topIconButtonStyle(colors), position: "relative" }}
          title="DDL提醒"
        >
          <BellIcon />
          <span
            style={{
              position: "absolute",
              top: "7px",
              right: "7px",
              width: "7px",
              height: "7px",
              borderRadius: "50%",
              background: "#EF4444",
            }}
          />
        </button>

        <button
          onClick={() => setShowUserMenu((value) => !value)}
          style={{
            height: "46px",
            borderRadius: "999px",
            border: theme.border,
            background: theme.card,
            color: theme.text,
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "0 14px 0 6px",
            cursor: "pointer",
            fontFamily: "inherit",
            boxShadow: darkMode
              ? "0 10px 22px rgba(0,0,0,0.16)"
              : "0 10px 22px rgba(15,42,74,0.06)",
          }}
          title="用户菜单"
        >
          <span
            style={{
              width: "34px",
              height: "34px",
              borderRadius: "50%",
              background: "linear-gradient(135deg,#6366F1,#4F46E5)",
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              fontSize: "15px",
              flexShrink: 0,
            }}
          >
            {avatarText}
          </span>
          <span style={{ fontSize: "14px", fontWeight: 800, whiteSpace: "nowrap" }}>
            {displayName}
          </span>
          <span style={{ color: theme.subText, fontSize: "12px" }}>⌄</span>
        </button>
      </div>

      {showNotice && (
        <div
          style={{
            position: "absolute",
            top: "66px",
            right: "112px",
            width: "280px",
            background: theme.panel,
            border: theme.border,
            borderRadius: "18px",
            padding: "18px",
            boxShadow: darkMode
              ? "0 24px 48px rgba(0,0,0,0.38)"
              : "0 20px 40px rgba(15,42,74,0.14)",
            zIndex: 999,
          }}
        >
          <h3 style={{ margin: 0, color: theme.text, fontSize: "17px", fontWeight: 700 }}>
            课程 DDL 提醒
          </h3>
          <p style={{ margin: "8px 0 0", color: theme.subText, fontSize: "13px", lineHeight: 1.7 }}>
            请在 DDL 标签页查看当前课程的待办日程。
          </p>
        </div>
      )}

      {showUserMenu && (
        <div
          style={{
            position: "absolute",
            top: "66px",
            right: "26px",
            width: "268px",
            background: theme.panel,
            border: theme.border,
            borderRadius: "18px",
            padding: "12px",
            boxShadow: darkMode
              ? "0 24px 48px rgba(0,0,0,0.38)"
              : "0 20px 40px rgba(15,42,74,0.14)",
            zIndex: 999,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "10px 10px 14px",
              borderBottom: theme.border,
              marginBottom: "8px",
            }}
          >
            <span
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                background: "linear-gradient(135deg,#6366F1,#4F46E5)",
                color: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 850,
                fontSize: "16px",
                flexShrink: 0,
              }}
            >
              {avatarText}
            </span>

            <span style={{ minWidth: 0 }}>
              <span
                style={{
                  display: "block",
                  color: theme.text,
                  fontSize: "14px",
                  fontWeight: 850,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {displayName}
              </span>
              <span
                style={{
                  display: "block",
                  marginTop: "4px",
                  color: theme.subText,
                  fontSize: "12px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {accountText}
              </span>
            </span>
          </div>

          <button
            onClick={() => {
              setShowUserMenu(false);
              setActiveTab("settings");
            }}
            style={courseMenuItemStyle(theme)}
          >
            当前课程设置
          </button>

          <button
            onClick={() => {
              setShowUserMenu(false);
              onBack?.();
            }}
            style={courseMenuItemStyle(theme)}
          >
            返回主页
          </button>

          <button
            onClick={() => {
              setShowUserMenu(false);
              setShowNotice(true);
            }}
            style={courseMenuItemStyle(theme)}
          >
            查看 DDL 提醒
          </button>

          <button
            disabled
            style={{
              ...courseMenuItemStyle(theme),
              color: theme.subText,
              cursor: "default",
              opacity: 0.72,
            }}
          >
            账号设置 · 后续接入
          </button>

          <button
            onClick={() => {
              setShowUserMenu(false);
              onLogout?.();
            }}
            style={{
              ...courseMenuItemStyle(theme),
              color: "#DC2626",
              marginTop: "4px",
            }}
          >
            退出登录
          </button>
        </div>
      )}
    </header>
  );
}



function courseMenuItemStyle(theme) {
  return {
    width: "100%",
    border: "none",
    background: "transparent",
    color: theme.text,
    borderRadius: "11px",
    padding: "10px 12px",
    cursor: "pointer",
    fontSize: "14px",
    textAlign: "left",
    fontFamily: "inherit",
    fontWeight: 650,
  };
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
    <div style={{ padding: "0 36px" }}>
      <div
        style={{
          minHeight: "62px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "22px",
        }}
      >
        <nav
          style={{
            display: "flex",
            gap: "56px",
            height: "62px",
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
    </div>
  );
}

function TopTab({ label, active, onClick, colors }) {
  return (
    <button
      onClick={onClick}
      style={{
        height: "52px",
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

function ResourceTab({ resources, notes, colors, searchText = "", onView, onGenerateNote, onDelete, uploadResources }) {
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
          text={searchText ? "没有找到匹配的课程资料。" : "暂无课程资料，可上传 PPT、PDF、讲义、教材或录音。"}
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

function NoteTab({ notes, colors, searchText = "", onOpen, onAdd, onDelete }) {
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
        <EmptyState colors={colors} text={searchText ? "没有找到匹配的课程笔记。" : "暂无课程笔记，可从资料生成或手动新建。"} />
      ) : (
        <div style={{ display: "grid", gap: "12px" }}>
          {notes.map((note) => (
            <NoteIndexItem
              key={note.id}
              note={note}
              colors={colors}
              onOpen={onOpen}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function NoteIndexItem({ note, colors, onOpen, onDelete }) {
  return (
    <div
      style={{
        ...compactRowStyle(colors),
        width: "100%",
        fontFamily: "inherit",
      }}
    >
      <button
        onClick={() => onOpen(note)}
        style={{
          border: "none",
          background: "transparent",
          padding: 0,
          margin: 0,
          textAlign: "left",
          cursor: "pointer",
          fontFamily: "inherit",
          flex: 1,
          minWidth: 0,
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
      </button>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          flexShrink: 0,
        }}
      >
        <span style={{ color: colors.muted, fontSize: "13px" }}>
          {new Date(note.updatedAt || note.createdAt).toLocaleDateString()} →
        </span>
        <button
          onClick={() => onDelete(note)}
          style={miniButton(colors.danger)}
        >
          删除
        </button>
      </div>
    </div>
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

function DDLTab({ course, ddls, colors, searchText = "", onComplete, onDelete }) {
  return (
    <div style={contentCardStyle(colors)}>
      <h2 style={sectionTitleStyle(colors)}>{course.title}的 DDL</h2>

      {ddls.length === 0 ? (
        <EmptyState colors={colors} text={searchText ? "没有找到匹配的 DDL。" : "暂无符合条件的 DDL"} />
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

function SettingsTab({
  course,
  colors,
  activeDdls,
  completedDdls,
  courseNotes,
  courseResources,
}) {
  return (
    <div style={contentCardStyle(colors)}>
      <div style={{ marginBottom: "26px" }}>
        <h2
          style={{
            ...sectionTitleStyle(colors),
            marginBottom: "8px",
          }}
        >
          课程设置
        </h2>

        <p
          style={{
            margin: 0,
            color: colors.text,
            fontSize: "14px",
            lineHeight: 1.7,
          }}
        >
          管理当前课程的基础信息、学习数据与智能化能力状态。当前课程资料、笔记与 DDL 已接入后端账号数据体系。
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.1fr) minmax(320px, 0.9fr)",
          gap: "20px",
          marginBottom: "22px",
        }}
      >
        <div style={settingPanelStyle(colors)}>
          <div style={settingPanelHeaderStyle(colors)}>
            <div>
              <h3 style={settingTitleStyle(colors)}>课程信息</h3>
              <p style={settingSubtitleStyle(colors)}>
                当前课程空间的基础状态
              </p>
            </div>
            <span style={settingBadgeStyle(colors)}>
              {course.backendSynced ? "Cloud" : "Local"}
            </span>
          </div>

          <div style={{ display: "grid", gap: "12px" }}>
            <SettingLine label="课程名称" value={course.title} colors={colors} />
            <SettingLine
              label="存储方式"
              value={course.backendSynced ? "后端数据库保存" : "浏览器本地保存"}
              colors={colors}
            />
            <SettingLine
              label="同步状态"
              value={course.backendSynced ? "已按账号同步" : "本地临时课程"}
              colors={colors}
            />
            <SettingLine label="课程空间" value="资料 / 笔记 / DDL / AI 笔记" colors={colors} />
          </div>
        </div>

        <div style={settingPanelStyle(colors)}>
          <div style={settingPanelHeaderStyle(colors)}>
            <div>
              <h3 style={settingTitleStyle(colors)}>项目状态</h3>
              <p style={settingSubtitleStyle(colors)}>
                中期检查可展示能力
              </p>
            </div>
            <span style={settingBadgeStyle(colors)}>MVP</span>
          </div>

          <div style={{ display: "grid", gap: "10px" }}>
            <StatusTag colors={colors} text="AI 资料笔记智能体已接入" />
            <StatusTag colors={colors} text="Markdown 编辑与 PDF 导出已支持" />
            <StatusTag colors={colors} text="资料查看与笔记关联已支持" />
            <StatusTag colors={colors} text="账号数据隔离与后端同步已接入" />
          </div>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: "16px",
          marginBottom: "22px",
        }}
      >
        <SettingStatCard
          label="课程资料"
          value={courseResources.length}
          unit="份"
          colors={colors}
        />

        <SettingStatCard
          label="课程笔记"
          value={courseNotes.length}
          unit="条"
          colors={colors}
        />

        <SettingStatCard
          label="未完成 DDL"
          value={activeDdls.length}
          unit="个"
          colors={colors}
        />

        <SettingStatCard
          label="已完成 DDL"
          value={completedDdls.length}
          unit="个"
          colors={colors}
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
          gap: "20px",
        }}
      >
        <div style={settingPanelStyle(colors)}>
          <h3 style={settingTitleStyle(colors)}>数据说明</h3>

          <p
            style={{
              margin: 0,
              color: colors.text,
              fontSize: "14px",
              lineHeight: 1.8,
            }}
          >
            当前课程数据优先保存到后端数据库，并按登录账号进行隔离。
            浏览器仅保留少量临时缓存与登录状态；上传资料会进入后端文件区，AI 笔记会保存为可编辑 Markdown 笔记。
          </p>
        </div>

        <div style={settingPanelStyle(colors)}>
          <h3 style={settingTitleStyle(colors)}>已接入能力</h3>

          <div style={{ display: "grid", gap: "10px" }}>
            <StatusTag colors={colors} text="课程、资料、笔记、DDL 后端建表" />
            <StatusTag colors={colors} text="上传文件保存到 backend/uploads" />
            <StatusTag colors={colors} text="AI 生成笔记后可继续编辑并导出 PDF" />
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingLine({ label, value, colors }) {
  return (
    <div
      style={{
        minHeight: "42px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "20px",
        borderBottom: `1px solid ${colors.border}`,
        color: colors.text,
        fontSize: "14px",
      }}
    >
      <span>{label}</span>
      <strong
        style={{
          color: colors.title,
          fontWeight: 700,
          textAlign: "right",
        }}
      >
        {value}
      </strong>
    </div>
  );
}

function SettingStatCard({ label, value, unit, colors }) {
  return (
    <div
      style={{
        background: colors.soft,
        border: `1px solid ${colors.border}`,
        borderRadius: "14px",
        padding: "18px",
      }}
    >
      <div
        style={{
          color: colors.text,
          fontSize: "13px",
          marginBottom: "10px",
        }}
      >
        {label}
      </div>

      <div
        style={{
          color: colors.title,
          fontSize: "30px",
          fontWeight: 800,
          letterSpacing: "-0.03em",
        }}
      >
        {value}
        <span
          style={{
            fontSize: "14px",
            color: colors.text,
            marginLeft: "4px",
            fontWeight: 600,
          }}
        >
          {unit}
        </span>
      </div>
    </div>
  );
}

function StatusTag({ text, colors }) {
  return (
    <div
      style={{
        background: colors.softer,
        border: `1px solid ${colors.border}`,
        borderRadius: "999px",
        padding: "9px 12px",
        color: colors.active,
        fontSize: "13px",
        fontWeight: 700,
      }}
    >
      {text}
    </div>
  );
}

function settingPanelStyle(colors) {
  return {
    background: colors.soft,
    border: `1px solid ${colors.border}`,
    borderRadius: "16px",
    padding: "20px",
  };
}

function settingPanelHeaderStyle(colors) {
  return {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "18px",
    marginBottom: "16px",
  };
}

function settingTitleStyle(colors) {
  return {
    margin: 0,
    color: colors.title,
    fontSize: "18px",
    fontWeight: 800,
  };
}

function settingSubtitleStyle(colors) {
  return {
    margin: "6px 0 0",
    color: colors.text,
    fontSize: "13px",
    lineHeight: 1.6,
  };
}

function settingBadgeStyle(colors) {
  return {
    color: colors.active,
    background: colors.softer,
    border: `1px solid ${colors.border}`,
    borderRadius: "999px",
    padding: "5px 10px",
    fontSize: "12px",
    fontWeight: 800,
    flexShrink: 0,
  };
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

function mapBackendResource(resource) {
  const fileUrl = getResourceFileUrl(resource);

  return {
    id: `api-resource-${resource.id}`,
    backendId: resource.id,
    name: resource.name || "未命名资料",
    type: resource.type || getFileType(resource.name || ""),
    filePath: resource.filePath || "",
    url: resource.url || "",
    size: resource.size || 0,
    mimeType: guessMimeType(resource.name || ""),
    objectUrl: fileUrl,
    courseId: resource.courseId ? `api-${resource.courseId}` : null,
    backendCourseId: resource.courseId,
    courseName: resource.courseName || "未归属课程",
    createdAt: resource.createdAt || Date.now(),
    backendSynced: true,
  };
}

function guessMimeType(fileName = "") {
  const ext = String(fileName).split(".").pop()?.toLowerCase();

  if (["jpg", "jpeg"].includes(ext)) return "image/jpeg";
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "pdf") return "application/pdf";
  if (["doc", "docx"].includes(ext)) return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (["ppt", "pptx"].includes(ext)) return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
  if (["mp3", "wav", "m4a"].includes(ext)) return "audio/mpeg";
  if (["txt", "md"].includes(ext)) return "text/plain";

  return "application/octet-stream";
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

function mapBackendNote(note) {
  return {
    id: `api-note-${note.id}`,
    backendId: note.id,
    title: note.title,
    content: note.content || "",
    syntaxMode: "markdown",
    courseId: note.courseId ? `api-${note.courseId}` : null,
    backendCourseId: note.courseId,
    courseName: note.courseName || "",
    source: note.source || "手动记录",
    sourceResourceId: null,
    sourceResourceName: note.source || "手动记录",
    sourceResourceType: note.aiGenerated ? "AI笔记" : "笔记",
    createdAt: note.createdAt || Date.now(),
    updatedAt: note.updatedAt || note.createdAt || Date.now(),
    aiGenerated: Boolean(note.aiGenerated),
    backendSynced: true,
  };
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

function filterByCourseSearch(items = [], searchText = "", fields = []) {
  const keyword = String(searchText || "").trim().toLowerCase();
  if (!keyword) return items;

  return items.filter((item) => {
    const haystack = fields
      .map((field) => item?.[field])
      .filter((value) => value !== null && value !== undefined)
      .join(" ")
      .toLowerCase();

    return haystack.includes(keyword);
  });
}

function topIconButtonStyle(colors) {
  return {
    width: "38px",
    height: "38px",
    borderRadius: "12px",
    border: "none",
    background: "transparent",
    color: colors.text,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    fontSize: "18px",
    fontFamily: "inherit",
  };
}

function BellIcon() {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 8-3 8h18s-3-1-3-8" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

function topBarChipStyle(colors, active) {
  return {
    border: `1px solid ${active ? colors.active : colors.border}`,
    background: active ? colors.active : colors.soft,
    color: active ? "#FFFFFF" : colors.text,
    borderRadius: "999px",
    padding: "8px 12px",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: 800,
    fontFamily: "inherit",
    whiteSpace: "nowrap",
  };
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

function createSnippet(text = "") {
  return String(text)
    .replace(/[#>*_`$\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 52);
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
    minHeight: "340px",
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
