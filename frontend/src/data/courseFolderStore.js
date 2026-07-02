export async function loadBackendFolderSnapshot({
  deletedFolderIds = [],
  getFolders,
} = {}) {
  if (typeof getFolders !== "function") {
    throw new TypeError("loadBackendFolderSnapshot requires getFolders");
  }

  const data = await getFolders();
  const hiddenBackendFolderIds = new Set(deletedFolderIds.map((id) => String(id)));

  const folders = Array.isArray(data)
    ? data
        .map(mapBackendFolder)
        .filter(
          (folder) =>
            !folder.backendId ||
            !hiddenBackendFolderIds.has(String(folder.backendId))
        )
    : [];

  return {
    folders,
    folderCount: folders.length,
    courseCount: countCoursesInFolders(folders),
  };
}

export function isRealFolder(folder) {
  return !["all", "starred", "trash", "recent", "__unassigned"].includes(
    String(folder.id)
  );
}

export function addCourseToUnassignedFolder(folders = [], course) {
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

export function mapBackendFolder(folder) {
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

export function mapBackendCourse(course) {
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

export function mapBackendDeletedCourse(course) {
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

export function placeRestoredBackendCourse(
  folders = [],
  course,
  fallbackFolderTitle = "恢复的课程"
) {
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

function countCoursesInFolders(folders = []) {
  return folders.reduce((sum, folder) => sum + (folder.courses || []).length, 0);
}
