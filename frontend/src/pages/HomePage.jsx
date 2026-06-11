import {useState,useEffect} from "react";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import Footer from "../components/Footer";
import DDLPanel from "../components/DDLPanel";
import FolderSection from "../components/FolderSection";
import {
  useNavigate
} from "react-router-dom";

function HomePage() {
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

  const [deletedCourses,setDeletedCourses,] = useState(() => {
    const saved =localStorage.getItem("deletedCourses");
    return saved
      ? JSON.parse(saved): [];});

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [pendingDeleteCourseId, setPendingDeleteCourseId] = useState(null);

  const [showFolderDeleteConfirm, setShowFolderDeleteConfirm] = useState(false);
  const [pendingDeleteFolderId, setPendingDeleteFolderId] = useState(null);

  const [showDDLModal, setShowDDLModal] = useState(false);
  const [newDDLTitle, setNewDDLTitle] = useState("");
  const [newDDLDate, setNewDDLDate] = useState("");
  const [newDDLCourseId, setNewDDLCourseId] = useState("");

  const navigate =useNavigate();

  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renamingCourse, setRenamingCourse] = useState(null);
  const [renameCourseName, setRenameCourseName] = useState("");

  const [folders, setFolders] =
    useState(() => { const saved =localStorage.getItem("folders");

      return saved? JSON.parse(saved)
        : [
            {
              id: 1,
                title: "专业必修课",
              courses: [{
                id: 1,
                title:"离散数学",
                starred:false,
                noteCount:18,
                ddlCount:2,},
                {
                  id: 2,
                  title:"Java程序设计",
                  starred:false, 
                  noteCount:24,
                  ddlCount: 3,
                 
                },
                {
                  id: 3,
                  title:"Python",
                  starred:false,
                  noteCount:12,
                  ddlCount:1,
                },
              ],
            },
            {
              id: 2,
              title:"通识教育",
                courses: [{
                  id: 4,
                  title:"宏观经济学",
                  starred:false,
                  noteCount:16,
                  ddlCount:2, },
                {
                  id: 5,
                  title:"法理学",
                  starred:false,
                  noteCount:10,
                  ddlCount:1,
                },
              ],
            },
          ];
    });

  const [ddls, setDdls] =
  useState(() => {
    const saved =localStorage.getItem( "ddls" );

    return saved
      ? JSON.parse(saved): [
          {
            id: 1,
            title:
              "离散数学作业",
            date:
              "2026-06-15 23:59",
            courseName:
              "离散数学",
            completed: false,
          },
          {
            id: 2,
            title:
              "宏观经济学论文",
            date:
              "2026-06-18",
            courseName:
              "宏观经济学",
            completed: false,
          },
        ];
  });

  function addFolder() {
    if (!newFolderName.trim()) return;

    const newFolder = {
      id: Date.now(),
      title: newFolderName,
      courses: [],
    };

    setFolders([...folders, newFolder]);
    setSelectedFolder(newFolder.title);
    setNewFolderName("");
    setShowFolderModal(false);
  }

  function openCourseModal(folderId) {
    setTargetFolderId(folderId);
    setShowCourseModal(true);
  }

  function addCourse() {
    if (!newCourseName.trim() || !targetFolderId) return;

    const newCourse = {
      id: Date.now(),
      title: newCourseName,
      starred: false,
      noteCount: 0,
      ddlCount: 0,
    };

    setFolders(
      folders.map((folder) =>
        String(folder.id) === String(targetFolderId)
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

    const normalized =
      dateText.replace(" ", "T");

    const date = new Date(
     normalized
    );

    return Number.isNaN(date.getTime())? null: date;}

  const now = new Date();

/* 主页面板显示：
   所有未过期DDL */
  const activeDdls = ddls
    .filter((ddl) => {
      const ddlDate =
        parseDDLDate(
          ddl.date
        );

      return (!ddl.completed && ddlDate && ddlDate >= now);
    })
    .sort( (a, b) =>parseDDLDate( a.date ) -parseDDLDate(  b.date  ) );

/* 小铃铛提醒：
   仅近7天DDL */
  const upcomingDdls =
    activeDdls.filter(
      (ddl) => {
        const ddlDate =parseDDLDate(ddl.date);

        const sevenDaysLater = new Date();

        sevenDaysLater.setDate(now.getDate() + 7);

        return (ddlDate &&ddlDate <=sevenDaysLater );
    }
  );



  function addDDL() {
    if (!newDDLTitle.trim() || !newDDLDate.trim()) return;
    const allCourses = folders.flatMap((folder) => folder.courses);
    const selectedCourse = allCourses.find(
      (course) => String(course.id) === String(newDDLCourseId)
    );

    const newDDL = {
      id: Date.now(),
      title: newDDLTitle,
      date: newDDLDate.replace("T", " "),
      courseName: selectedCourse ? selectedCourse.title : "未归属课程",
      courseId: selectedCourse ? selectedCourse.id : null,
      completed: false,
    };

    setDdls([...ddls, newDDL]);
    setNewDDLTitle("");
    setNewDDLDate("");
    setNewDDLCourseId("");
    setShowDDLModal(false);
  }

  function toggleStarCourse(courseId) {
    setFolders(
      folders.map((folder) => ({
        ...folder,
        courses: folder.courses.map((course) =>
          course.id === courseId
            ? { ...course, starred: !course.starred }
            : course
        ),
      }))
    );
  }

  function openRenameCourseModal(courseId, currentName) {
    setRenamingCourse(courseId);
    setRenameCourseName(currentName);
    setShowRenameModal(true);
  }

  function confirmRenameCourse() {
    if (!renameCourseName.trim() || !renamingCourse) return;

    const newName = renameCourseName.trim();

    setFolders(
      folders.map((folder) => ({
        ...folder,
        courses: folder.courses.map((course) =>
          course.id === renamingCourse ? {...course,title: newName,}
            : course
        ),
      }))
    );

    setDdls(ddls.map((ddl) =>
        ddl.courseId === renamingCourse? {  ...ddl, courseName: newName,  }: ddl)
    );

    setShowRenameModal(false);
    setRenamingCourse(null);
    setRenameCourseName("");
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

  function confirmDeleteCourse() {
    let deletedCourse = null;

    const updatedFolders = folders.map((folder) => {
      const remainingCourses = folder.courses.filter((course) => {
        if (course.id === pendingDeleteCourseId) {
          deletedCourse = {
            ...course,
            folderId: folder.id,
            folderTitle: folder.title,
          };
          return false;
        }
        return true;
      });

      return {
        ...folder,
        courses: remainingCourses,
      };
    });

    if (deletedCourse) {
      setFolders(updatedFolders);

      setDeletedCourses([
        ...deletedCourses,
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
    }

    setPendingDeleteCourseId(null);
    setShowDeleteConfirm(false);
  }

  function restoreCourse(courseId) {
    const courseToRestore = deletedCourses.find(
     (course) => String(course.id) === String(courseId)
    );

    if (!courseToRestore) return;

    setFolders(
      folders.map((folder) =>
        folder.id === courseToRestore.folderId
          ? {
              ...folder,
              courses: [
                ...folder.courses,
                {
                  id: courseToRestore.id,
                  title: courseToRestore.title,
                  starred: courseToRestore.starred,
                  noteCount: courseToRestore.noteCount,
                  ddlCount: courseToRestore.ddlCount,
                },
              ],
            }
          : folder
      )
    );

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

  function permanentDeleteCourse(courseId) {
    if (!window.confirm("确定要彻底删除这门课程吗？此操作不可恢复。")) return;

    setDeletedCourses(
      deletedCourses.filter((course) => course.id !== courseId)
    );
  }

  function requestDeleteFolder(folderId) {
    setPendingDeleteFolderId(folderId);
    setShowFolderDeleteConfirm(true);
  }

  function confirmDeleteFolder() {
    const folderToDelete = folders.find(
      (folder) => folder.id === pendingDeleteFolderId
    );

    if (!folderToDelete) return;

    const deletedFromFolder = folderToDelete.courses.map((course) => ({
      ...course,
      folderId: folderToDelete.id,
      folderTitle: folderToDelete.title,
    }));

    setDeletedCourses([...deletedCourses, ...deletedFromFolder]);
    setFolders(folders.filter((folder) => folder.id !== pendingDeleteFolderId));

    if (selectedFolder === folderToDelete.title) {
      setSelectedFolder("全部");
    }

    setPendingDeleteFolderId(null);
    setShowFolderDeleteConfirm(false);
  }
  /* 自动持久化保存 */

    useEffect(() => {
      localStorage.setItem("folders",JSON.stringify(folders));}, [folders]);

    useEffect(() => {localStorage.setItem( "ddls", JSON.stringify(ddls));}, [ddls]);

    useEffect(() => {localStorage.setItem( "deletedCourses", JSON.stringify(deletedCourses));}, [deletedCourses]);

    useEffect(() => {localStorage.setItem( "darkMode", JSON.stringify(darkMode));}, [darkMode]);


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
                    下午好，Whale
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
                  canAddCourse={typeof folder.id === "number" && !searchText}
                  canDeleteFolder={typeof folder.id === "number"}
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
            {folders.map((folder) => (
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
        <Modal title="新建 DDL" darkMode={darkMode}>
          <input
            value={newDDLTitle}
            onChange={(e) => setNewDDLTitle(e.target.value)}
            placeholder="DDL 标题"
            style={{ ...inputStyle, marginBottom: "14px" }}
          />

          <input
            type="datetime-local"
            value={newDDLDate}
            onChange={(e) => setNewDDLDate(e.target.value)}
            style={{ ...inputStyle, marginBottom: "14px" }}
          />

          <select
            value={newDDLCourseId}
            onChange={(e) => setNewDDLCourseId(e.target.value)}
            style={inputStyle}
          >
            <option value="">未归属课程</option>

            {folders.flatMap((folder) =>
              folder.courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title}
                </option>
              ))
            )}
          </select>

          <ModalActions
            onCancel={() => setShowDDLModal(false)}
            onConfirm={addDDL}
            confirmText="保存"
            darkMode={darkMode}
          />
        </Modal>
      )}

      {showRenameModal && (
        <Modal
          title="重命名课程"
          darkMode={darkMode}
        >
          <input
            value={renameCourseName}
            onChange={(e) =>
              setRenameCourseName(
                e.target.value
              )
            }
            placeholder="请输入新的课程名称"
            style={inputStyle}
            autoFocus
          />

          <ModalActions
            onCancel={() => {
              setShowRenameModal(
                false
              );
              setRenamingCourse(
                null
              );
              setRenameCourseName(
                ""
              );
            }}
            onConfirm={
              confirmRenameCourse
            }
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
            该课程及其相关笔记将被移动到回收站，你可以之后在回收站中恢复。
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
            文件夹内的课程会一起移动到回收站，之后可以单独恢复课程。
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

export default HomePage;