import {useState,useEffect} from "react";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import Footer from "../components/Footer";
import DDLPanel from "../components/DDLPanel";
import FolderSection from "../components/FolderSection";
import {useNavigate} from "react-router-dom";
import {
  createCourse as createBackendCourse,
  updateCourse as updateBackendCourse,
  deleteCourse as deleteBackendCourse,
  getDeletedCourses as getBackendDeletedCourses,
  restoreDeletedCourse as restoreBackendDeletedCourse,
  permanentlyDeleteCourse as permanentlyDeleteBackendCourse,
} from "../api/courseApi";
import {
  getFolders as getBackendFolders,
  createFolder as createBackendFolder,
  updateFolder as updateBackendFolder,
  deleteFolder as deleteBackendFolder,
} from "../api/folderApi";
import {
  getDdls,
  createDdl as createBackendDdl,
  recognizeDdlWithVisionAgent,
} from "../api/ddlApi";
import { getApiBaseUrl } from "../api/apiClient";

function getUserStorageKey(user, key) {
  const rawUserId =
    user?.id ||
    user?.account ||
    user?.email ||
    localStorage.getItem("notewhale_current_user_id") ||
    "guest";

  const safeUserId = String(rawUserId).replace(/[^a-zA-Z0-9_-]/g, "_");
  return `notewhale_user_${safeUserId}_${key}`;
}

function readUserStorageArray(user, key, fallback = []) {
  try {
    const value = localStorage.getItem(getUserStorageKey(user, key));
    if (!value) return fallback;
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function writeUserStorageArray(user, key, value) {
  localStorage.setItem(getUserStorageKey(user, key), JSON.stringify(value));
}

function HomePage({ user = null, onLogout } = {}) {
  const [selectedFolder, setSelectedFolder] = useState("全部");
  const [searchText, setSearchText] = useState("");
  const [darkMode,setDarkMode,] = useState(() => {
    const saved =localStorage.getItem("darkMode");
    return saved
    ? JSON.parse(saved): false;});

  const [showFolderModal, setShowFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  const [showCourseModal, setShowCourseModal] = useState(false);
  const [newCourseName, setNewCourseName] = useState("");
  const [targetFolderId, setTargetFolderId] = useState("");

  const [deletedCourses,setDeletedCourses,] = useState(() =>
    readUserStorageArray(user, "deletedCourses", [])
  );

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [pendingDeleteCourseId, setPendingDeleteCourseId] = useState(null);

  const [showFolderDeleteConfirm, setShowFolderDeleteConfirm] = useState(false);
  const [pendingDeleteFolderId, setPendingDeleteFolderId] = useState(null);

  const [showFolderRenameModal, setShowFolderRenameModal] = useState(false);
  const [renamingFolderId, setRenamingFolderId] = useState(null);
  const [renameFolderName, setRenameFolderName] = useState("");

  const [showDDLModal, setShowDDLModal] = useState(false);
  const [newDDLTitle, setNewDDLTitle] = useState("");
  const [newDDLDate, setNewDDLDate] = useState("");
  const [newDDLCourseId, setNewDDLCourseId] = useState("");
  const [newDDLPlatform, setNewDDLPlatform] = useState("");
  const [newDDLNote, setNewDDLNote] = useState("");
  const [newDDLPreview, setNewDDLPreview] = useState("");

  const navigate =useNavigate();

  const [showDataStatus, setShowDataStatus] = useState(false);
  const [apiStatus, setApiStatus] = useState({
    checking: true,
    online: false,
    message: "正在检测后端连接",
  });

  const [backendCourses, setBackendCourses] = useState([]);
  const [backendCourseMessage, setBackendCourseMessage] = useState("等待同步课程");
  const [backendDdlMessage, setBackendDdlMessage] = useState("等待同步 DDL");

  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renamingCourse, setRenamingCourse] = useState(null);
  const [renameCourseName, setRenameCourseName] = useState("");
  const [renameCourseFolderId, setRenameCourseFolderId] = useState("");

  const [folders, setFolders] =
    useState(() => readUserStorageArray(user, "folders", []));

  const [ddls, setDdls] = useState(() =>
    readUserStorageArray(user, "ddls", [])
  );

  async function addFolder() {
    const title = newFolderName.trim();
    if (!title) return;

    if (apiStatus.online) {
      try {
        const savedFolder = await createBackendFolder({ title });
        const mappedFolder = mapBackendFolder(savedFolder);

        setFolders((prevFolders) => [...prevFolders, mappedFolder]);
        setSelectedFolder(mappedFolder.title);
        setBackendCourseMessage("文件夹已同步到后端");
        setNewFolderName("");
        setShowFolderModal(false);
        return;
      } catch (error) {
        alert(error.message || "后端文件夹创建失败，已切换为本地保存");
      }
    }

    const newFolder = {
      id: Date.now(),
      title,
      courses: [],
    };

    setFolders([...folders, newFolder]);
    setSelectedFolder(newFolder.title);
    setNewFolderName("");
    setShowFolderModal(false);
  }

  function openCourseModal(folderId = "") {
    const realFolders = folders.filter((folder) => isRealFolder(folder));
    const selectedRealFolder = realFolders.find(
      (folder) => folder.title === selectedFolder
    );

    const defaultFolderId =
      folderId ||
      selectedRealFolder?.id ||
      realFolders[0]?.id ||
      "__unassigned";

    setTargetFolderId(String(defaultFolderId));
    setShowCourseModal(true);
  }

  async function addCourse() {
    const safeTargetFolderId = targetFolderId || "__unassigned";
    if (!newCourseName.trim()) return;

    const title = newCourseName.trim();

    if (String(safeTargetFolderId) === "__unassigned") {
      if (apiStatus.online) {
        try {
          const savedCourse = await createBackendCourse({
            title,
            starred: false,
            folderId: null,
            folderName: "",
          });

          const mappedCourse = mapBackendCourse(savedCourse);

          setFolders((prevFolders) =>
            addCourseToUnassignedFolder(prevFolders, mappedCourse)
          );
          setBackendCourseMessage("未归属课程已同步到后端");
          setNewCourseName("");
          setTargetFolderId("");
          setShowCourseModal(false);
          return;
        } catch (error) {
          alert(error.message || "后端课程创建失败，已切换为本地保存");
        }
      }

      const newCourse = {
        id: Date.now(),
        title,
        starred: false,
        noteCount: 0,
        ddlCount: 0,
      };

      setFolders((prevFolders) =>
        addCourseToUnassignedFolder(prevFolders, newCourse)
      );
      setNewCourseName("");
      setTargetFolderId("");
      setShowCourseModal(false);
      return;
    }

    const targetFolder = folders.find(
      (folder) => String(folder.id) === String(safeTargetFolderId)
    );

    if (!targetFolder) return;

    if (apiStatus.online) {
      try {
        let backendFolder = targetFolder;

        // 本地旧文件夹还没有 backendId 时，先在后端创建对应文件夹。
        if (!targetFolder.backendSynced || !targetFolder.backendId) {
          const savedFolder = await createBackendFolder({
            title: targetFolder.title,
          });
          backendFolder = mapBackendFolder(savedFolder);
        }

        const savedCourse = await createBackendCourse({
          title,
          starred: false,
          folderId: backendFolder.backendId,
          folderName: backendFolder.title,
        });

        const mappedCourse = mapBackendCourse(savedCourse);

        setFolders((prevFolders) =>
          prevFolders.map((folder) => {
            if (String(folder.id) !== String(targetFolderId)) return folder;

            return {
              ...folder,
              id: backendFolder.id,
              backendId: backendFolder.backendId,
              backendSynced: true,
              title: backendFolder.title,
              courses: [
                ...(folder.courses || []).filter(
                  (course) => String(course.title) !== String(mappedCourse.title)
                ),
                mappedCourse,
              ],
            };
          })
        );

        setBackendCourseMessage("课程与所属文件夹已同步到后端");
        setNewCourseName("");
        setTargetFolderId("");
        setShowCourseModal(false);
        return;
      } catch (error) {
        alert(error.message || "后端课程创建失败，已切换为本地保存");
      }
    }

    const newCourse = {
      id: Date.now(),
      title,
      starred: false,
      noteCount: 0,
      ddlCount: 0,
    };

    setFolders(
      folders.map((folder) =>
        String(folder.id) === String(safeTargetFolderId)
          ? { ...folder, courses: [...folder.courses, newCourse] }
          : folder
      )
    );

    setNewCourseName("");
    setTargetFolderId("");
    setShowCourseModal(false);
  }

  // function parseDDLDate(dateText) {
  //   if (!dateText) return null;

  //   const normalized = dateText.replace(" ", "T");
  //   const date = new Date(normalized);

  //   return Number.isNaN(date.getTime()) ? null : date;
  // }

  /* DDL 时间解析 */
  function parseDDLDate(dateText) {
    if (!dateText) return null;

    const normalized = dateText.replace(" ", "T");

    const date = new Date( normalized );

    return Number.isNaN(date.getTime())? null: date;}

  const now = new Date();

/* 主页面板显示：
   所有未完成DDL：包含未过期和已过期，方便右侧面板提示“逾期 X 天”。 */
  const activeDdls = ddls
    .filter((ddl) => {
      const ddlDate = parseDDLDate(ddl.date);
      return !ddl.completed && ddlDate;
    })
    .sort((a, b) => parseDDLDate(a.date) - parseDDLDate(b.date));

/* 小铃铛提醒：
   仅近7天DDL */
  const upcomingDdls =
    activeDdls.filter(
      (ddl) => {
        const ddlDate =parseDDLDate(ddl.date);

        const sevenDaysLater = new Date();

        sevenDaysLater.setDate(now.getDate() + 7);

        return ddlDate && ddlDate >= now && ddlDate <= sevenDaysLater;
    }
  );



  async function addDDL() {
    if (!newDDLTitle.trim() || !newDDLDate.trim()) return;

    const selectedCourse = allCourses.find(
      (course) => String(course.id) === String(newDDLCourseId)
    );

    const normalizedDate = newDDLDate.replace("T", " ");

    const baseDDL = {
      title: newDDLTitle.trim(),
      date: normalizedDate,
      platform: newDDLPlatform.trim(),
      note: newDDLNote.trim(),
      courseName: selectedCourse ? selectedCourse.title : "未归属课程",
      courseId: selectedCourse ? selectedCourse.id : null,
      completed: false,
      source: newDDLPreview ? "图片识别" : "手动新建",
    };

    if (apiStatus.online) {
      try {
        const savedDdl = await createBackendDdl({
          ...baseDDL,
          // 后端只接收数据库课程 id；本地课程不强行写入 courseId，避免和后端课程 id 冲突。
          courseId: selectedCourse?.backendSynced ? selectedCourse.backendId : null,
          courseName: baseDDL.courseName,
        });

        const nextDdls = [mapBackendDdl(savedDdl), ...ddls];
        setDdls(nextDdls);
        setBackendDdlMessage(`已同步 ${nextDdls.filter((ddl) => ddl.backendSynced).length} 条 DDL`);
        resetDDLModal();
        return;
      } catch (error) {
        alert(error.message || "后端 DDL 创建失败，已切换为本地保存");
      }
    }

    const newDDL = {
      id: Date.now(),
      ...baseDDL,
    };

    setDdls([...ddls, newDDL]);
    resetDDLModal();
  }

  async function uploadDDLImage(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setNewDDLPreview(URL.createObjectURL(file));

    const selectedCourse =
      allCourses.find((course) => String(course.id) === String(newDDLCourseId)) ||
      allCourses[0] ||
      null;

    if (selectedCourse && !newDDLCourseId) {
      setNewDDLCourseId(String(selectedCourse.id));
    }

    try {
      const result = await recognizeDdlWithVisionAgent({
        file,
        courseId: selectedCourse?.backendSynced
          ? selectedCourse.backendId
          : null,
        courseName: selectedCourse?.title || "未归属课程",
      });

      setNewDDLTitle(result.title || "");
      setNewDDLDate(toDatetimeLocalValue(result.date) || "");
      setNewDDLPlatform(result.platform || "");
      setNewDDLNote(result.note || "");
    } catch (error) {
      alert(error.message || "视觉模型识别失败，请检查智能体配置");
    } finally {
      event.target.value = "";
    }
  }

  function resetDDLModal() {
    setShowDDLModal(false);
    setNewDDLTitle("");
    setNewDDLDate("");
    setNewDDLCourseId("");
    setNewDDLPlatform("");
    setNewDDLNote("");
    setNewDDLPreview("");
  }

  async function toggleStarCourse(courseId) {
    const targetCourse = allCourses.find(
      (course) => String(course.id) === String(courseId)
    );
    const nextStarred = !targetCourse?.starred;

    setFolders(
      folders.map((folder) => ({
        ...folder,
        courses: folder.courses.map((course) =>
          String(course.id) === String(courseId)
            ? { ...course, starred: nextStarred }
            : course
        ),
      }))
    );

    if (targetCourse?.backendSynced && targetCourse.backendId) {
      try {
        await updateBackendCourse(targetCourse.backendId, {
          starred: nextStarred,
        });
      } catch {
        setBackendCourseMessage("收藏状态暂未同步到后端");
      }
    }
  }

  function openRenameCourseModal(courseId, currentName) {
    const currentFolder = folders.find((folder) =>
      (folder.courses || []).some((course) => String(course.id) === String(courseId))
    );

    setRenamingCourse(courseId);
    setRenameCourseName(currentName);
    setRenameCourseFolderId(currentFolder ? String(currentFolder.id) : "__unassigned");
    setShowRenameModal(true);
  }

  async function confirmRenameCourse() {
    if (!renameCourseName.trim() || !renamingCourse) return;

    const newName = renameCourseName.trim();
    const targetCourse = allCourses.find(
      (course) => String(course.id) === String(renamingCourse)
    );

    if (!targetCourse) return;

    const oldFolder = folders.find((folder) =>
      (folder.courses || []).some((course) => String(course.id) === String(renamingCourse))
    );

    const moveToUnassigned = String(renameCourseFolderId) === "__unassigned";
    const selectedFolder = moveToUnassigned
      ? null
      : folders.find((folder) => String(folder.id) === String(renameCourseFolderId));

    if (!moveToUnassigned && !selectedFolder) return;

    let backendFolder = selectedFolder;

    if (targetCourse?.backendSynced && targetCourse.backendId) {
      try {
        if (!moveToUnassigned && selectedFolder && (!selectedFolder.backendSynced || !selectedFolder.backendId)) {
          const savedFolder = await createBackendFolder({ title: selectedFolder.title });
          backendFolder = mapBackendFolder(savedFolder);
        }

        await updateBackendCourse(targetCourse.backendId, {
          title: newName,
          folderId: moveToUnassigned ? null : backendFolder?.backendId,
          folderName: moveToUnassigned ? "" : backendFolder?.title,
        });

        setBackendCourseMessage("课程信息已同步到后端");
      } catch (error) {
        alert(error.message || "后端课程编辑失败");
        return;
      }
    }

    const editedCourse = {
      ...targetCourse,
      title: newName,
      folderId: moveToUnassigned ? null : backendFolder?.id,
      backendFolderId: moveToUnassigned ? null : backendFolder?.backendId || null,
      folderName: moveToUnassigned ? "" : backendFolder?.title || "",
    };

    let nextFolders = folders.map((folder) => ({
      ...folder,
      ...(backendFolder && String(folder.id) === String(selectedFolder?.id)
        ? {
            id: backendFolder.id,
            backendId: backendFolder.backendId,
            backendSynced: backendFolder.backendSynced,
            title: backendFolder.title,
          }
        : {}),
      courses: (folder.courses || []).filter(
        (course) => String(course.id) !== String(renamingCourse)
      ),
    }));

    if (moveToUnassigned) {
      nextFolders = addCourseToUnassignedFolder(nextFolders, editedCourse);
    } else {
      nextFolders = nextFolders.map((folder) =>
        String(folder.id) === String(backendFolder?.id)
          ? {
              ...folder,
              courses: [...(folder.courses || []), editedCourse],
            }
          : folder
      );
    }

    setFolders(nextFolders);

    setDdls(ddls.map((ddl) =>
      String(ddl.courseId) === String(renamingCourse)
        ? { ...ddl, courseName: newName }
        : ddl
    ));

    if (selectedFolder === oldFolder?.title && oldFolder?.courses?.length === 1) {
      setSelectedFolder("全部");
    }

    setShowRenameModal(false);
    setRenamingCourse(null);
    setRenameCourseName("");
    setRenameCourseFolderId("");
}

  // function renameCourse(courseId, newName) {
  //   setFolders(
  //     folders.map((folder) => ({
  //       ...folder,
  //       courses: folder.courses.map((course) =>
  //         course.id === courseId
  //           ? { ...course, title: newName }
  //           : course
  //       ),
  //     }))
  //   );
  // }

  function requestDeleteCourse(courseId) {
    setPendingDeleteCourseId(courseId);
    setShowDeleteConfirm(true);
  }

  async function confirmDeleteCourse() {
    let deletedCourse = null;

    folders.forEach((folder) => {
      (folder.courses || []).forEach((course) => {
        if (String(course.id) === String(pendingDeleteCourseId)) {
          deletedCourse = {
            ...course,
            folderId: folder.id,
            folderTitle: folder.title,
            backendFolderId: folder.backendId || course.backendFolderId || null,
            deletedAt: Date.now(),
            backendDeleted: Boolean(course.backendSynced),
          };
        }
      });
    });

    if (!deletedCourse) {
      setPendingDeleteCourseId(null);
      setShowDeleteConfirm(false);
      return;
    }

    if (deletedCourse.backendSynced && deletedCourse.backendId) {
      try {
        await deleteBackendCourse(deletedCourse.backendId);
        setBackendCourseMessage("课程已进入数据库回收站");
      } catch (error) {
        alert(error.message || "后端课程移入回收站失败");
        return;
      }
    }

    const updatedFolders = folders.map((folder) => ({
      ...folder,
      courses: (folder.courses || []).filter(
        (course) => String(course.id) !== String(pendingDeleteCourseId)
      ),
    }));

    setFolders(updatedFolders);

    setDeletedCourses([
      ...deletedCourses.filter(
        (course) => String(course.id) !== String(deletedCourse.id)
      ),
      deletedCourse,
    ]);

    setDdls(
      ddls.map((ddl) =>
        String(ddl.courseId) === String(deletedCourse.id)
          ? {
              ...ddl,
              previousCourseId: deletedCourse.id,
              previousCourseName: deletedCourse.title,
              courseId: null,
              courseName: "未归属课程",
            }
          : ddl
      )
    );

    setPendingDeleteCourseId(null);
    setShowDeleteConfirm(false);
  }

  async function restoreCourse(courseId) {
    const courseToRestore = deletedCourses.find(
      (course) => String(course.id) === String(courseId)
    );

    if (!courseToRestore) return;

    if (courseToRestore.backendDeleted && courseToRestore.backendId) {
      try {
        const restored = await restoreBackendDeletedCourse(courseToRestore.backendId, {
          folderId: courseToRestore.backendFolderId || null,
          folderName:
            courseToRestore.folderTitle ||
            courseToRestore.folderName ||
            "恢复的课程",
        });

        const mappedCourse = mapBackendCourse(restored);

        setFolders((prevFolders) =>
          placeRestoredBackendCourse(
            prevFolders,
            mappedCourse,
            courseToRestore.folderTitle || courseToRestore.folderName || "恢复的课程"
          )
        );

        setBackendCourseMessage("课程已从数据库回收站恢复");
      } catch (error) {
        alert(error.message || "后端课程恢复失败");
        return;
      }
    } else {
      const restoredCourse = {
        id: courseToRestore.id,
        title: courseToRestore.title,
        starred: courseToRestore.starred,
        noteCount: courseToRestore.noteCount || 0,
        ddlCount: courseToRestore.ddlCount || 0,
        backendSynced: false,
      };

      const targetFolderExists = folders.some(
        (folder) => String(folder.id) === String(courseToRestore.folderId)
      );

      if (targetFolderExists) {
        setFolders(
          folders.map((folder) =>
            String(folder.id) === String(courseToRestore.folderId)
              ? {
                  ...folder,
                  courses: [...(folder.courses || []), restoredCourse],
                }
              : folder
          )
        );
      } else {
        setFolders([
          ...folders,
          {
            id: Date.now(),
            title: courseToRestore.folderTitle || "恢复的课程",
            courses: [restoredCourse],
          },
        ]);
      }
    }

    setDdls(
      ddls.map((ddl) =>
        String(ddl.previousCourseId) === String(courseToRestore.id)
          ? {
              ...ddl,
              courseId: courseToRestore.id,
              courseName: courseToRestore.title,
              previousCourseId: null,
              previousCourseName: null,
            }
          : ddl
      )
    );

    setDeletedCourses(
      deletedCourses.filter(
        (course) => String(course.id) !== String(courseId)
      )
    );
  }

  async function permanentDeleteCourse(courseId) {
    if (!window.confirm("确定要彻底删除这门课程吗？此操作不可恢复。")) return;

    const targetCourse = deletedCourses.find(
      (course) => String(course.id) === String(courseId)
    );

    if (targetCourse?.backendDeleted && targetCourse.backendId) {
      try {
        await permanentlyDeleteBackendCourse(targetCourse.backendId);
        setBackendCourseMessage("课程已从数据库回收站彻底删除");
      } catch (error) {
        alert(error.message || "后端课程彻底删除失败");
        return;
      }
    }

    setDeletedCourses(
      deletedCourses.filter((course) => String(course.id) !== String(courseId))
    );
  }

  function openRenameFolderModal(folderId) {
    const folder = folders.find(
      (item) => String(item.id) === String(folderId)
    );

    if (!folder) return;

    setRenamingFolderId(folderId);
    setRenameFolderName(folder.title || "");
    setShowFolderRenameModal(true);
  }

  async function confirmRenameFolder() {
    const nextTitle = renameFolderName.trim();

    if (!nextTitle || !renamingFolderId) return;

    const folderToRename = folders.find(
      (folder) => String(folder.id) === String(renamingFolderId)
    );

    if (!folderToRename) return;

    if (folderToRename.backendSynced && folderToRename.backendId) {
      try {
        await updateBackendFolder(folderToRename.backendId, {
          title: nextTitle,
        });
        setBackendCourseMessage("文件夹名称已同步到后端");
      } catch (error) {
        alert(error.message || "后端文件夹重命名失败");
        return;
      }
    }

    setFolders(
      folders.map((folder) =>
        String(folder.id) === String(renamingFolderId)
          ? {
              ...folder,
              title: nextTitle,
              courses: (folder.courses || []).map((course) => ({
                ...course,
                folderName: nextTitle,
              })),
            }
          : folder
      )
    );

    if (selectedFolder === folderToRename.title) {
      setSelectedFolder(nextTitle);
    }

    setShowFolderRenameModal(false);
    setRenamingFolderId(null);
    setRenameFolderName("");
  }

  function requestDeleteFolder(folderId) {
    setPendingDeleteFolderId(folderId);
    setShowFolderDeleteConfirm(true);
  }

  async function confirmDeleteFolder() {
    const folderToDelete = folders.find(
      (folder) => String(folder.id) === String(pendingDeleteFolderId)
    );

    if (!folderToDelete) return;

    const deletedFromFolder = (folderToDelete.courses || []).map((course) => ({
      ...course,
      folderId: folderToDelete.id,
      folderTitle: folderToDelete.title,
      deletedAt: Date.now(),
      backendDeleted: Boolean(course.backendSynced),
      backendFolderId: folderToDelete.backendId || course.backendFolderId || null,
    }));

    if (folderToDelete.backendSynced && folderToDelete.backendId) {
      try {
        await deleteBackendFolder(folderToDelete.backendId, {
          deleteCourses: true,
        });
        setBackendCourseMessage("文件夹已从后端删除，课程已进入本地回收站");
      } catch (error) {
        alert(error.message || "后端文件夹删除失败");
        return;
      }
    }

    setDeletedCourses([...deletedCourses, ...deletedFromFolder]);

    setFolders(
      folders.filter(
        (folder) => String(folder.id) !== String(pendingDeleteFolderId)
      )
    );

    if (selectedFolder === folderToDelete.title) {
      setSelectedFolder("全部");
    }

    setPendingDeleteFolderId(null);
    setShowFolderDeleteConfirm(false);
  }
  /* 自动持久化保存 */

    useEffect(() => {
      writeUserStorageArray(user, "folders", folders);}, [folders, user]);

    useEffect(() => {writeUserStorageArray(user, "ddls", ddls);}, [ddls, user]);

    useEffect(() => {writeUserStorageArray(user, "deletedCourses", deletedCourses);}, [deletedCourses, user]);

    useEffect(() => {localStorage.setItem( "darkMode", JSON.stringify(darkMode));}, [darkMode]);

  useEffect(() => {
    let alive = true;

    async function checkBackend() {
      try {
        const response = await fetch(`${getApiBaseUrl()}/health`, {
          cache: "no-store",
        });

        if (!alive) return;

        if (response.ok) {
          setApiStatus({
            checking: false,
            online: true,
            message: "后端连接正常",
          });
        } else {
          setApiStatus({
            checking: false,
            online: false,
            message: "后端暂不可用，当前使用本地模式",
          });
        }
      } catch {
        if (!alive) return;

        setApiStatus({
          checking: false,
          online: false,
          message: "后端暂不可用，当前使用本地模式",
        });
      }
    }

    checkBackend();

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;

    async function loadBackendFolders() {
      try {
        const data = await getBackendFolders();
        if (!alive) return;

        const nextFolders = Array.isArray(data)
          ? data.map(mapBackendFolder)
          : [];

        const backendCourseCount = nextFolders.reduce(
          (sum, folder) => sum + (folder.courses || []).length,
          0
        );

        setFolders(nextFolders);

        if (nextFolders.length > 0) {
          setBackendCourseMessage(
            `已同步 ${nextFolders.length} 个文件夹，${backendCourseCount} 门课程`
          );
        } else {
          setBackendCourseMessage("当前账号暂无文件夹，可新建文件夹同步到数据库");
        }
      } catch (error) {
        if (!alive) return;

        setBackendCourseMessage("后端文件夹暂不可用，继续使用本地课程");
      }
    }

    loadBackendFolders();

    return () => {
      alive = false;
    };
  }, []);



  useEffect(() => {
    let alive = true;

    async function loadBackendTrash() {
      try {
        const data = await getBackendDeletedCourses();
        if (!alive) return;

        const backendTrashCourses = Array.isArray(data)
          ? data.map(mapBackendDeletedCourse)
          : [];

        setDeletedCourses((prevCourses) => {
          const localTrashCourses = prevCourses.filter(
            (course) => !course.backendDeleted
          );

          return [...localTrashCourses, ...backendTrashCourses];
        });
      } catch {
        // 后端回收站不可用时继续使用本地回收站。
      }
    }

    loadBackendTrash();

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;

    async function loadBackendDdls() {
      try {
        const data = await getDdls();
        if (!alive) return;

        const nextBackendDdls = Array.isArray(data) ? data.map(mapBackendDdl) : [];

        setDdls(nextBackendDdls);

        if (nextBackendDdls.length > 0) {
          setBackendDdlMessage(`已同步 ${nextBackendDdls.length} 条 DDL`);
        } else {
          setBackendDdlMessage("当前账号暂无 DDL，可新建日程同步到数据库");
        }
      } catch (error) {
        if (!alive) return;
        setBackendDdlMessage("后端 DDL 暂不可用，继续使用本地 DDL");
      }
    }

    loadBackendDdls();

    return () => {
      alive = false;
    };
  }, []);



  const allCourses = folders.flatMap((folder) => folder.courses);

  const searchedFolders = folders
    .map((folder) => ({
      ...folder,
      courses: folder.courses.filter((course) =>
        course.title.toLowerCase().includes(searchText.toLowerCase())
      ),
    }))
    .filter((folder) => folder.courses.length > 0);

  const searchedAllCourses = allCourses.filter((course) =>
    course.title.toLowerCase().includes(searchText.toLowerCase())
  );

  const starredCourses = searchedAllCourses.filter((course) => course.starred);

  const allNotesForSearch = readUserStorageArray(user, "notes", []);
  const allResourcesForSearch = readUserStorageArray(user, "resources", []);
  const noteCount = allNotesForSearch.length;
  const resourceCount = allResourcesForSearch.length;

  const globalSearchItems = buildGlobalSearchItems({
    courses: allCourses,
    notes: allNotesForSearch,
    resources: allResourcesForSearch,
    ddls,
  });

  const currentUser = user || {
    name: "鲸记用户",
    role: "学生",
    account: "本地体验账号",
    authMode: "local-demo",
  };

  let visibleFolders = searchText ? searchedFolders : folders;

  if (selectedFolder === "全部课程") {
    visibleFolders = [
      {
        id: "all",
        title: "全部课程",
        courses: searchedAllCourses,
      },
    ];
  } else if (selectedFolder === "收藏夹") {
    visibleFolders = [
      {
        id: "starred",
        title: "收藏夹",
        courses: starredCourses,
      },
    ];
  } else if (selectedFolder === "回收站") {
    visibleFolders = [
      {
        id: "trash",
        title: "回收站",
        courses: deletedCourses,
      },
    ];
  } else if (selectedFolder === "最近使用") {
    visibleFolders = [
      {
        id: "recent",
        title: "最近使用",
        courses: searchedAllCourses.slice(0, 3),
      },
    ];
  } else if (selectedFolder !== "全部") {
    const folderResult = folders.filter(
      (folder) => folder.title === selectedFolder
    );

    visibleFolders = searchText
      ? folderResult
          .map((folder) => ({
            ...folder,
            courses: folder.courses.filter((course) =>
              course.title.toLowerCase().includes(searchText.toLowerCase())
            ),
          }))
          .filter((folder) => folder.courses.length > 0)
      : folderResult;
  }

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        overflow: "hidden",
        background: darkMode ? "#0F172A" : "#F5F9FF",
      }}
    >
      <Sidebar
        folders={folders}
        selectedFolder={selectedFolder}
        setSelectedFolder={setSelectedFolder}
        setShowFolderModal={setShowFolderModal}
        setShowCourseModal={setShowCourseModal}
        darkMode={darkMode}
        onOpenSettings={() => setShowDataStatus(true)}
      />

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
        }}
      >
        <Header
          searchText={searchText}
          setSearchText={setSearchText}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
          upcomingDdls={upcomingDdls}
          user={currentUser}
          onLogout={onLogout}
          onOpenDataStatus={() => setShowDataStatus(true)}
          searchItems={globalSearchItems}
        />

        <div
          style={{
            flex: 1,
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) 360px",
            overflow: "hidden",
          }}
        >
          <main
            style={{
              minWidth: 0,
              padding: "36px",
              overflowY: "auto",
              background: darkMode
                ? `
                  radial-gradient(
                    circle at top left,
                    rgba(99,102,241,0.08),
                    transparent 24%
                  ),
                  linear-gradient(
                    180deg,
                    #111827 0%,
                    #1E293B 100%
                  )
                `
                : "linear-gradient(180deg,#F5F9FF 0%,#EEF6FF 100%)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                marginBottom: "32px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "18px",
                }}
              >
                <div
                  style={{
                    width: "54px",
                    height: "54px",
                    borderRadius: "50%",
                    background: darkMode
                      ? "rgba(255,255,255,0.05)"
                      : "rgba(255,255,255,0.75)",
                    border: darkMode
                      ? "1px solid rgba(255,255,255,0.06)"
                      : "1px solid rgba(226,232,240,0.9)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: darkMode
                      ? "0 10px 24px rgba(0,0,0,0.18)"
                      : "0 10px 24px rgba(15,42,74,0.05)",
                    flexShrink: 0,
                  }}
                >
                  <span
                    style={{
                      color: darkMode ? "#A5B4FC" : "#3B82F6",
                      fontSize: "20px",
                    }}
                  >
                    ✦
                  </span>
                </div>

                <div>
                  <h1
                    style={{
                      margin: 0,
                      color: darkMode ? "#F3F4F6" : "#183B63",
                      fontSize: "36px",
                      fontWeight: 600,
                      lineHeight: 1.2,
                      letterSpacing: "-0.03em",
                    }}
                  >
                    下午好，{currentUser.name || "鲸记用户"}
                  </h1>

                  <p
                    style={{
                      margin: "6px 0 0",
                      color: darkMode ? "#94A3B8" : "#64748B",
                      fontSize: "15px",
                      lineHeight: 1.7,
                    }}
                  >
                    沉淀课堂知识，让学习真正留下痕迹
                  </p>

                  <button
                    onClick={() => setShowDataStatus(true)}
                    style={{
                      marginTop: "12px",
                      border: darkMode
                        ? "1px solid rgba(148,163,184,0.2)"
                        : "1px solid #DDE8F6",
                      background: apiStatus.online
                        ? darkMode
                          ? "rgba(16,185,129,0.12)"
                          : "#ECFDF5"
                        : darkMode
                        ? "rgba(148,163,184,0.12)"
                        : "#F8FAFC",
                      color: apiStatus.online ? "#10B981" : darkMode ? "#CBD5E1" : "#64748B",
                      borderRadius: "999px",
                      padding: "7px 12px",
                      fontSize: "12px",
                      fontWeight: 700,
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    {apiStatus.online ? "● 后端在线" : "○ 本地模式"}
                  </button>
                </div>
              </div>
            </div>

            {visibleFolders.length === 0 ? (
              <div
                style={{
                  height: "160px",
                  border: darkMode
                    ? "1.5px dashed rgba(148,163,184,0.24)"
                    : "1.5px dashed #CBD5E1",
                  borderRadius: "14px",
                  color: darkMode ? "#94A3B8" : "#94A3B8",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: darkMode
                    ? "rgba(255,255,255,0.04)"
                    : "rgba(255,255,255,0.45)",
                }}
              >
                没有找到相关课程
              </div>
            ) : (
              visibleFolders.map((folder) => (
                <FolderSection
                  key={folder.id}
                  folderId={folder.id}
                  title={folder.title}
                  courses={folder.courses}
                  ddls={ddls}
                  onAddCourse={openCourseModal}
                  onStarCourse={toggleStarCourse}
                  onDeleteCourse={requestDeleteCourse}
                  onRenameCourse={openRenameCourseModal}
                  onRestoreCourse={restoreCourse}
                  onPermanentDeleteCourse={permanentDeleteCourse}
                  onDeleteFolder={requestDeleteFolder}
                  onRenameFolder={openRenameFolderModal}
                  canAddCourse={!searchText && (isRealFolder(folder) || String(folder.id) === "__unassigned")}
                  canDeleteFolder={isRealFolder(folder)}
                  canRenameFolder={isRealFolder(folder)}
                  isTrash={selectedFolder === "回收站"}
                  darkMode={darkMode}
                />
              ))
            )}
          </main>

          <aside
            style={{
              width: "360px",
              padding: "24px",
              borderLeft: darkMode
                ? "1px solid rgba(148,163,184,0.12)"
                : "1px solid #E5EAF3",
              background: darkMode ? "#111827" : "#F9FBFF",
              overflowY: "auto",
              boxSizing: "border-box",
            }}
          >
            <DDLPanel
              ddls={activeDdls}
              darkMode={darkMode}
              onAddDDL={() => setShowDDLModal(true)}
              onViewAllDDL={() =>navigate("/ddl")}
            />
          </aside>
        </div>

        <Footer
          darkMode={darkMode}
          courseCount={allCourses.length}
          ddlCount={ddls.length}
        />
      </div>

      {showDataStatus && (
        <DataStatusModal
          darkMode={darkMode}
          user={currentUser}
          apiStatus={apiStatus}
          backendCourseMessage={backendCourseMessage}
          backendDdlMessage={backendDdlMessage}
          courseCount={allCourses.length}
          folderCount={folders.length}
          ddlCount={ddls.length}
          activeDdlCount={activeDdls.length}
          noteCount={noteCount}
          resourceCount={resourceCount}
          onClose={() => setShowDataStatus(false)}
        />
      )}

      {showFolderModal && (
        <Modal title="新建文件夹" darkMode={darkMode}>
          <input
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="请输入文件夹名称"
            style={inputStyle}
          />

          <ModalActions
            onCancel={() => setShowFolderModal(false)}
            onConfirm={addFolder}
            confirmText="创建"
            darkMode={darkMode}
          />
        </Modal>
      )}

      {showCourseModal && (
        <Modal title="新建课程" darkMode={darkMode}>
          <input
            value={newCourseName}
            onChange={(e) => setNewCourseName(e.target.value)}
            placeholder="请输入课程名称"
            style={{ ...inputStyle, marginBottom: "14px" }}
          />

          <select
            value={targetFolderId}
            onChange={(e) => setTargetFolderId(e.target.value)}
            style={inputStyle}
          >
            <option value="">请选择文件夹</option>
            <option value="__unassigned">未归属课程</option>
            {folders
              .filter((folder) => folder.id !== "__unassigned")
              .map((folder) => (
                <option key={folder.id} value={folder.id}>
                  {folder.title}
                </option>
              ))}
          </select>

          <ModalActions
            onCancel={() => setShowCourseModal(false)}
            onConfirm={addCourse}
            confirmText="创建"
            darkMode={darkMode}
          />
        </Modal>
      )}

      {showDDLModal && (
        <ScheduleModal
          darkMode={darkMode}
          courses={allCourses}
          preview={newDDLPreview}
          titleValue={newDDLTitle}
          setTitleValue={setNewDDLTitle}
          dateValue={newDDLDate}
          setDateValue={setNewDDLDate}
          platformValue={newDDLPlatform}
          setPlatformValue={setNewDDLPlatform}
          noteValue={newDDLNote}
          setNoteValue={setNewDDLNote}
          courseId={newDDLCourseId}
          setCourseId={setNewDDLCourseId}
          onUploadImage={uploadDDLImage}
          onCancel={resetDDLModal}
          onConfirm={addDDL}
        />
      )}

      {showRenameModal && (
        <Modal
          title="编辑课程"
          darkMode={darkMode}
        >
          <div
            style={{
              color: darkMode ? "#CBD5E1" : "#64748B",
              fontSize: "13px",
              fontWeight: 700,
              marginBottom: "8px",
            }}
          >
            课程名称
          </div>

          <input
            value={renameCourseName}
            onChange={(e) => setRenameCourseName(e.target.value)}
            placeholder="请输入课程名称"
            style={{ ...inputStyle, marginBottom: "14px" }}
            autoFocus
          />

          <div
            style={{
              color: darkMode ? "#CBD5E1" : "#64748B",
              fontSize: "13px",
              fontWeight: 700,
              marginBottom: "8px",
            }}
          >
            归属文件夹
          </div>

          <select
            value={renameCourseFolderId}
            onChange={(e) => setRenameCourseFolderId(e.target.value)}
            style={inputStyle}
          >
            <option value="__unassigned">不归属任何课程</option>
            {folders
              .filter((folder) => folder.id !== "__unassigned")
              .map((folder) => (
                <option key={folder.id} value={folder.id}>
                  {folder.title}
                </option>
              ))}
          </select>

          <ModalActions
            onCancel={() => {
              setShowRenameModal(false);
              setRenamingCourse(null);
              setRenameCourseName("");
              setRenameCourseFolderId("");
            }}
            onConfirm={confirmRenameCourse}
            confirmText="保存修改"
            darkMode={darkMode}
          />
        </Modal>
      )}

      {showFolderRenameModal && (
        <Modal title="重命名文件夹" darkMode={darkMode}>
          <input
            value={renameFolderName}
            onChange={(e) => setRenameFolderName(e.target.value)}
            placeholder="请输入新的文件夹名称"
            style={inputStyle}
            autoFocus
          />

          <ModalActions
            onCancel={() => {
              setShowFolderRenameModal(false);
              setRenamingFolderId(null);
              setRenameFolderName("");
            }}
            onConfirm={confirmRenameFolder}
            confirmText="保存修改"
            darkMode={darkMode}
          />
        </Modal>
      )}

      {showDeleteConfirm && (
        <Modal title="移动到回收站？" darkMode={darkMode}>
          <p
            style={{
              color: darkMode ? "#CBD5E1" : "#64748B",
              lineHeight: 1.8,
            }}
          >
            本地课程会移动到回收站；后端同步课程会进入数据库回收站，可恢复或彻底删除。
          </p>

          <ModalActions
            onCancel={() => {
              setPendingDeleteCourseId(null);
              setShowDeleteConfirm(false);
            }}
            onConfirm={confirmDeleteCourse}
            confirmText="确认移动"
            danger
            darkMode={darkMode}
          />
        </Modal>
      )}

      {showFolderDeleteConfirm && (
        <Modal title="删除文件夹？" darkMode={darkMode}>
          <p
            style={{
              color: darkMode ? "#CBD5E1" : "#64748B",
              lineHeight: 1.8,
            }}
          >
            文件夹会删除；其中课程会进入回收站。后端同步课程也会进入数据库回收站。
          </p>

          <ModalActions
            onCancel={() => {
              setPendingDeleteFolderId(null);
              setShowFolderDeleteConfirm(false);
            }}
            onConfirm={confirmDeleteFolder}
            confirmText="确认删除"
            danger
            darkMode={darkMode}
          />
        </Modal>
      )}
    </div>
  );
}



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

function isRealFolder(folder) {
  return !["all", "starred", "trash", "recent", "__unassigned"].includes(
    String(folder.id)
  );
}

function addCourseToUnassignedFolder(folders = [], course) {
  const hasUnassigned = folders.some(
    (folder) => String(folder.id) === "__unassigned"
  );

  if (hasUnassigned) {
    return folders.map((folder) =>
      String(folder.id) === "__unassigned"
        ? {
            ...folder,
            courses: [...(folder.courses || []), course],
          }
        : folder
    );
  }

  return [
    ...folders,
    {
      id: "__unassigned",
      backendId: null,
      title: "未归属课程",
      createdAt: Date.now(),
      backendSynced: true,
      courses: [course],
    },
  ];
}

function mapBackendFolder(folder) {
  if (folder.id === null || folder.id === undefined) {
    return {
      id: "__unassigned",
      backendId: null,
      title: folder.title || "未归属课程",
      createdAt: folder.createdAt || Date.now(),
      backendSynced: true,
      courses: (folder.courses || []).map(mapBackendCourse),
    };
  }

  return {
    id: `api-folder-${folder.id}`,
    backendId: folder.id,
    title: folder.title,
    createdAt: folder.createdAt || Date.now(),
    backendSynced: true,
    courses: (folder.courses || []).map(mapBackendCourse),
  };
}

function mapBackendCourse(course) {
  return {
    id: `api-${course.id}`,
    backendId: course.id,
    title: course.title,
    starred: Boolean(course.starred),
    noteCount: 0,
    ddlCount: 0,
    folderId: course.folderId ? `api-folder-${course.folderId}` : null,
    backendFolderId: course.folderId || null,
    folderName: course.folderName || "",
    backendSynced: true,
  };
}



function mapBackendDeletedCourse(course) {
  return {
    id: `api-${course.id}`,
    backendId: course.id,
    title: course.title,
    starred: Boolean(course.starred),
    noteCount: 0,
    ddlCount: 0,
    folderId: course.deletedFolderId
      ? `api-folder-${course.deletedFolderId}`
      : course.folderId
      ? `api-folder-${course.folderId}`
      : null,
    folderTitle: course.deletedFolderTitle || course.folderName || "恢复的课程",
    backendFolderId: course.deletedFolderId || course.folderId || null,
    folderName: course.deletedFolderTitle || course.folderName || "",
    backendSynced: true,
    backendDeleted: true,
    deletedAt: course.deletedAt || Date.now(),
  };
}

function placeRestoredBackendCourse(folders = [], course, fallbackFolderTitle = "恢复的课程") {
  if (!course.backendFolderId) {
    return addCourseToUnassignedFolder(folders, course);
  }

  const targetFolderId = `api-folder-${course.backendFolderId}`;
  let placed = false;

  const nextFolders = folders.map((folder) => {
    const sameFolder =
      String(folder.id) === String(targetFolderId) ||
      String(folder.backendId || "") === String(course.backendFolderId);

    if (!sameFolder) return folder;

    placed = true;

    return {
      ...folder,
      id: targetFolderId,
      backendId: course.backendFolderId,
      backendSynced: true,
      title: course.folderName || folder.title || fallbackFolderTitle,
      courses: [
        ...(folder.courses || []).filter(
          (item) => String(item.id) !== String(course.id)
        ),
        course,
      ],
    };
  });

  if (!placed) {
    nextFolders.push({
      id: targetFolderId,
      backendId: course.backendFolderId,
      title: course.folderName || fallbackFolderTitle,
      createdAt: Date.now(),
      backendSynced: true,
      courses: [course],
    });
  }

  return nextFolders;
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


function DataStatusModal({
  darkMode,
  user,
  apiStatus,
  backendCourseMessage,
  backendDdlMessage,
  courseCount,
  folderCount,
  ddlCount,
  activeDdlCount,
  noteCount,
  resourceCount,
  onClose,
}) {
  const colors = {
    panel: darkMode ? "#111827" : "#FFFFFF",
    card: darkMode ? "rgba(30,41,59,0.72)" : "#F8FBFF",
    cardStrong: darkMode ? "rgba(30,41,59,0.92)" : "#FFFFFF",
    border: darkMode ? "rgba(148,163,184,0.18)" : "#E2EAF5",
    title: darkMode ? "#F8FAFC" : "#173B63",
    text: darkMode ? "#CBD5E1" : "#64748B",
    muted: darkMode ? "#94A3B8" : "#94A3B8",
    active: darkMode ? "#93C5FD" : "#2563EB",
    success: "#10B981",
    warning: "#F59E0B",
    danger: "#EF4444",
  };

  const isOnline = Boolean(apiStatus.online);
  const displayName = user?.name || "鲸记用户";
  const accountText = user?.account || user?.email || "本地体验账号";
  const roleText = user?.role || "学生";
  const storageMode = isOnline ? "云端数据库同步" : "本地浏览器缓存";
  const syncText = isOnline
    ? "Vercel 前端、Render 后端与 Supabase 数据库已连通。"
    : "后端暂不可用，当前仅保留本地演示数据。";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: darkMode ? "rgba(2,6,23,0.62)" : "rgba(15,42,74,0.20)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1000,
        padding: "28px",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          width: "min(880px, 100%)",
          maxHeight: "calc(100vh - 56px)",
          overflowY: "auto",
          background: colors.panel,
          border: `1px solid ${colors.border}`,
          borderRadius: "24px",
          padding: "26px",
          boxSizing: "border-box",
          boxShadow: darkMode
            ? "0 28px 80px rgba(0,0,0,0.45)"
            : "0 28px 80px rgba(15,42,74,0.16)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "18px",
            alignItems: "flex-start",
            marginBottom: "22px",
          }}
        >
          <div>
            <div
              style={{
                color: colors.active,
                fontSize: "12px",
                fontWeight: 900,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                marginBottom: "8px",
              }}
            >
              Account & Sync
            </div>

            <h2
              style={{
                margin: 0,
                color: colors.title,
                fontSize: "28px",
                fontWeight: 850,
                letterSpacing: "-0.05em",
                lineHeight: 1.15,
              }}
            >
              账号与同步状态
            </h2>

            <p
              style={{
                margin: "8px 0 0",
                color: colors.text,
                fontSize: "14px",
                lineHeight: 1.7,
              }}
            >
              查看当前账号、云端连接与数据统计。该页面仅用于状态确认，不作为主要功能入口。
            </p>
          </div>

          <button
            onClick={onClose}
            style={{
              border: "none",
              background: colors.card,
              color: colors.text,
              width: "42px",
              height: "42px",
              borderRadius: "14px",
              cursor: "pointer",
              fontSize: "24px",
              lineHeight: 1,
              flexShrink: 0,
            }}
          >
            ×
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 0.9fr) minmax(0, 1.1fr)",
            gap: "16px",
            marginBottom: "16px",
          }}
        >
          <div
            style={{
              background: colors.cardStrong,
              border: `1px solid ${colors.border}`,
              borderRadius: "18px",
              padding: "18px",
              minWidth: 0,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "16px",
                  background: isOnline ? "rgba(16,185,129,0.12)" : "rgba(245,158,11,0.12)",
                  color: isOnline ? colors.success : colors.warning,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "20px",
                  fontWeight: 900,
                  flexShrink: 0,
                }}
              >
                {displayName.slice(0, 1)}
              </div>

              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    color: colors.title,
                    fontSize: "17px",
                    fontWeight: 850,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {displayName}
                </div>
                <div
                  style={{
                    color: colors.text,
                    fontSize: "13px",
                    marginTop: "5px",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {roleText} · {accountText}
                </div>
              </div>
            </div>

            <div style={{ marginTop: "18px", display: "grid", gap: "10px" }}>
              <InfoLine colors={colors} label="账号状态" value="已登录" tone={colors.success} />
              <InfoLine colors={colors} label="数据隔离" value="按账号独立保存" />
              <InfoLine colors={colors} label="登录模式" value={isOnline ? "线上 API" : "本地模式"} />
            </div>
          </div>

          <div
            style={{
              background: colors.cardStrong,
              border: `1px solid ${colors.border}`,
              borderRadius: "18px",
              padding: "18px",
              minWidth: 0,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", marginBottom: "14px" }}>
              <h3 style={{ margin: 0, color: colors.title, fontSize: "17px", fontWeight: 850 }}>
                云端同步
              </h3>

              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  borderRadius: "999px",
                  padding: "6px 10px",
                  background: isOnline ? "rgba(16,185,129,0.12)" : "rgba(245,158,11,0.12)",
                  color: isOnline ? colors.success : colors.warning,
                  fontSize: "12px",
                  fontWeight: 850,
                  whiteSpace: "nowrap",
                }}
              >
                <span
                  style={{
                    width: "7px",
                    height: "7px",
                    borderRadius: "50%",
                    background: isOnline ? colors.success : colors.warning,
                  }}
                />
                {isOnline ? "Online" : "Local"}
              </span>
            </div>

            <div style={{ display: "grid", gap: "10px" }}>
              <InfoLine colors={colors} label="后端 API" value={isOnline ? "已连接" : "未连接"} tone={isOnline ? colors.success : colors.warning} />
              <InfoLine colors={colors} label="存储方式" value={storageMode} />
              <InfoLine colors={colors} label="课程数据" value={backendCourseMessage || "等待课程同步"} />
              <InfoLine colors={colors} label="DDL 数据" value={backendDdlMessage || "等待 DDL 同步"} />
            </div>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
            gap: "10px",
            marginBottom: "16px",
          }}
        >
          <StatBlock colors={colors} label="文件夹" value={folderCount} />
          <StatBlock colors={colors} label="课程" value={courseCount} />
          <StatBlock colors={colors} label="资料" value={resourceCount} />
          <StatBlock colors={colors} label="笔记" value={noteCount} />
          <StatBlock colors={colors} label="DDL" value={ddlCount} />
          <StatBlock colors={colors} label="待办" value={activeDdlCount} />
        </div>

        <div
          style={{
            background: isOnline ? "rgba(16,185,129,0.08)" : colors.card,
            border: `1px solid ${isOnline ? "rgba(16,185,129,0.22)" : colors.border}`,
            borderRadius: "18px",
            padding: "16px 18px",
            color: colors.text,
            fontSize: "14px",
            lineHeight: 1.8,
          }}
        >
          <strong style={{ color: colors.title }}>当前状态：</strong>
          {syncText}
          {isOnline
            ? " 课程、DDL、笔记等核心数据会优先写入云端，并保留少量本地缓存用于页面体验。"
            : " 请启动后端或检查线上 API 地址后再进行多设备同步测试。"}
        </div>
      </div>
    </div>
  );
}

function StatusPanel({ colors, title, children }) {
  return (
    <div
      style={{
        background: colors.cardStrong || colors.card,
        border: `1px solid ${colors.border}`,
        borderRadius: "18px",
        padding: "18px",
        minWidth: 0,
      }}
    >
      <h3
        style={{
          margin: "0 0 12px",
          color: colors.title,
          fontSize: "17px",
          fontWeight: 850,
        }}
      >
        {title}
      </h3>
      <div style={{ display: "grid", gap: "10px" }}>{children}</div>
    </div>
  );
}

function InfoLine({ colors, label, value, tone }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "86px minmax(0, 1fr)",
        gap: "12px",
        alignItems: "center",
        color: colors.text,
        fontSize: "13px",
        minWidth: 0,
      }}
    >
      <span style={{ color: colors.muted, whiteSpace: "nowrap" }}>{label}</span>
      <strong
        title={String(value || "")}
        style={{
          color: tone || colors.title,
          textAlign: "right",
          fontWeight: 800,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          minWidth: 0,
        }}
      >
        {value}
      </strong>
    </div>
  );
}

function StatBlock({ colors, label, value }) {
  return (
    <div
      style={{
        background: colors.cardStrong || colors.card,
        border: `1px solid ${colors.border}`,
        borderRadius: "16px",
        padding: "13px 10px",
        textAlign: "center",
        minWidth: 0,
      }}
    >
      <div
        style={{
          color: colors.title,
          fontSize: "24px",
          fontWeight: 900,
          letterSpacing: "-0.04em",
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      <div style={{ color: colors.muted, fontSize: "12px", marginTop: "8px" }}>
        {label}
      </div>
    </div>
  );
}

function buildGlobalSearchItems({ courses = [], notes = [], resources = [], ddls = [] }) {
  const courseTitleById = new Map(courses.map((course) => [String(course.id), course.title]));
  const courseIdByTitle = new Map(courses.map((course) => [course.title, course.id]));

  const courseItems = courses.map((course) => ({
    key: `course-${course.id}`,
    type: "course",
    typeLabel: "课程",
    title: course.title,
    subtitle: "课程空间 · 资料 / 笔记 / DDL",
    content: course.title,
    path: `/course/${course.id}`,
  }));

  const noteItems = notes.map((note) => {
    const courseId = note.courseId || courseIdByTitle.get(note.courseName);
    const courseTitle = note.courseName || courseTitleById.get(String(courseId)) || "未归属课程";

    return {
      key: `note-${note.id}`,
      type: "note",
      typeLabel: "笔记",
      title: note.title || "未命名笔记",
      subtitle: `${courseTitle} · ${createSnippet(note.content) || "笔记正文"}`,
      content: `${note.title || ""} ${courseTitle} ${note.content || ""}`,
      path: courseId ? `/course/${courseId}/note/${note.id}` : "/",
    };
  });

  const resourceItems = resources.map((resource) => {
    const courseId = resource.courseId || courseIdByTitle.get(resource.courseName);
    const courseTitle = resource.courseName || courseTitleById.get(String(courseId)) || "未归属课程";

    return {
      key: `resource-${resource.id}`,
      type: "resource",
      typeLabel: "文件",
      title: resource.name || "未命名资料",
      subtitle: `${courseTitle} · ${resource.type || "资料"}`,
      content: `${resource.name || ""} ${courseTitle} ${resource.type || ""}`,
      path: courseId ? `/course/${courseId}` : "/",
    };
  });

  const ddlItems = ddls.map((ddl) => {
    const courseTitle = ddl.courseName || "未归属课程";

    return {
      key: `ddl-${ddl.id}`,
      type: "ddl",
      typeLabel: "DDL",
      title: ddl.title || "未命名 DDL",
      subtitle: `${courseTitle} · ${ddl.date || "未设置时间"}`,
      content: `${ddl.title || ""} ${courseTitle} ${ddl.date || ""} ${ddl.platform || ""} ${ddl.note || ""}`,
      path: "/ddl",
    };
  });

  return [...courseItems, ...noteItems, ...resourceItems, ...ddlItems];
}

function createSnippet(text = "") {
  return String(text)
    .replace(/[#>*_`$\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 52);
}

function readStorageArray(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

const inputStyle = {
  width: "100%",
  height: "46px",
  borderRadius: "12px",
  border: "1px solid #D6E0EF",
  padding: "0 14px",
  boxSizing: "border-box",
  fontSize: "15px",
};

function Modal({ title, children, darkMode }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: darkMode ? "rgba(0,0,0,0.48)" : "rgba(0,0,0,0.24)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 999,
      }}
    >
      <div
        style={{
          width: "380px",
          background: darkMode ? "#1E293B" : "white",
          border: darkMode
            ? "1px solid rgba(148,163,184,0.18)"
            : "1px solid transparent",
          borderRadius: "18px",
          padding: "28px",
          boxShadow: darkMode
            ? "0 24px 48px rgba(0,0,0,0.38)"
            : "0 20px 40px rgba(15,42,74,0.15)",
        }}
      >
        <h2 style={{ marginTop: 0, color: darkMode ? "#F3F4F6" : "#0F2A4A" }}>
          {title}
        </h2>

        {children}
      </div>
    </div>
  );
}

function ModalActions({
  onCancel,
  onConfirm,
  confirmText,
  danger = false,
  darkMode = false,
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "flex-end",
        gap: "12px",
        marginTop: "20px",
      }}
    >
      <button
        onClick={onCancel}
        style={{
          border: darkMode
            ? "1px solid rgba(148,163,184,0.24)"
            : "1px solid #CBD5E1",
          background: darkMode ? "#0F172A" : "white",
          color: darkMode ? "#CBD5E1" : "#334155",
          borderRadius: "10px",
          padding: "10px 18px",
          cursor: "pointer",
        }}
      >
        取消
      </button>

      <button
        onClick={onConfirm}
        style={{
          border: "none",
          background: danger
            ? "#DC2626"
            : darkMode
            ? "linear-gradient(135deg,#6366F1,#4F46E5)"
            : "linear-gradient(135deg,#4C8DFF,#2563EB)",
          color: "white",
          borderRadius: "10px",
          padding: "10px 18px",
          cursor: "pointer",
        }}
      >
        {confirmText}
      </button>
    </div>
  );
}


function ScheduleModal({
  darkMode,
  courses,
  preview,
  titleValue,
  setTitleValue,
  dateValue,
  setDateValue,
  platformValue,
  setPlatformValue,
  noteValue,
  setNoteValue,
  courseId,
  setCourseId,
  onUploadImage,
  onCancel,
  onConfirm,
}) {
  const colors = {
    border: darkMode ? "rgba(148,163,184,0.18)" : "#E2E8F0",
    title: darkMode ? "#F8FAFC" : "#183B63",
    text: darkMode ? "#CBD5E1" : "#64748B",
    muted: darkMode ? "#94A3B8" : "#94A3B8",
    active: darkMode ? "#818CF8" : "#2563EB",
    soft: darkMode ? "rgba(148,163,184,0.12)" : "#F8FAFC",
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: darkMode ? "rgba(0,0,0,0.52)" : "rgba(15,42,74,0.18)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 999,
      }}
    >
      <div
        style={{
          width: "900px",
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
          新建日程
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "300px 1fr",
            gap: "28px",
          }}
        >
          <div
            style={{
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

          <div>
            <ScheduleLabel colors={colors}>标题</ScheduleLabel>
            <input
              value={titleValue}
              onChange={(e) => setTitleValue(e.target.value)}
              placeholder="请输入日程标题"
              style={scheduleInputStyle(darkMode)}
            />

            <ScheduleLabel colors={colors}>截止时间</ScheduleLabel>
            <input
              type="datetime-local"
              value={dateValue}
              onChange={(e) => setDateValue(e.target.value)}
              style={scheduleInputStyle(darkMode)}
            />

            <ScheduleLabel colors={colors}>平台 / 地点</ScheduleLabel>
            <input
              value={platformValue}
              onChange={(e) => setPlatformValue(e.target.value)}
              placeholder="例如：在线提交 / 教学平台 / 线下提交"
              style={scheduleInputStyle(darkMode)}
            />

            <ScheduleLabel colors={colors}>备注</ScheduleLabel>
            <input
              value={noteValue}
              onChange={(e) => setNoteValue(e.target.value)}
              placeholder="请输入备注（可选）"
              style={scheduleInputStyle(darkMode)}
            />

            <ScheduleLabel colors={colors}>归属课程</ScheduleLabel>
            <select
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              style={scheduleInputStyle(darkMode)}
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
                保存日程
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ScheduleLabel({ colors, children }) {
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

function scheduleInputStyle(darkMode) {
  return {
    width: "100%",
    height: "52px",
    borderRadius: "12px",
    border: darkMode
      ? "1px solid rgba(148,163,184,0.24)"
      : "1px solid #D6E0EF",
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


export default HomePage;