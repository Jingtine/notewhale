const ALL_FOLDERS_LABEL = "全部";
const ALL_COURSES_LABEL = "全部课程";
const STARRED_LABEL = "收藏夹";
const TRASH_LABEL = "回收站";
const RECENT_LABEL = "最近使用";

export function buildHomeFolderView({
  folders = [],
  selectedFolder = ALL_FOLDERS_LABEL,
  searchText = "",
  deletedCourses = [],
  recentLimit = 3,
} = {}) {
  const allCourses = folders.flatMap((folder) => folder.courses || []);
  const searchedFolders = searchFolders(folders, searchText);
  const searchedAllCourses = filterCourses(allCourses, searchText);
  const starredCourses = searchedAllCourses.filter((course) => course.starred);

  let visibleFolders = searchText ? searchedFolders : folders;

  if (selectedFolder === ALL_COURSES_LABEL) {
    visibleFolders = [
      {
        id: "all",
        title: ALL_COURSES_LABEL,
        courses: searchedAllCourses,
      },
    ];
  } else if (selectedFolder === STARRED_LABEL) {
    visibleFolders = [
      {
        id: "starred",
        title: STARRED_LABEL,
        courses: starredCourses,
      },
    ];
  } else if (selectedFolder === TRASH_LABEL) {
    visibleFolders = [
      {
        id: "trash",
        title: TRASH_LABEL,
        courses: deletedCourses,
      },
    ];
  } else if (selectedFolder === RECENT_LABEL) {
    visibleFolders = [
      {
        id: "recent",
        title: RECENT_LABEL,
        courses: searchedAllCourses.slice(0, recentLimit),
      },
    ];
  } else if (selectedFolder !== ALL_FOLDERS_LABEL) {
    const folderResult = folders.filter(
      (folder) => folder.title === selectedFolder
    );

    visibleFolders = searchText ? searchFolders(folderResult, searchText) : folderResult;
  }

  return {
    allCourses,
    visibleFolders,
  };
}

function searchFolders(folders, searchText) {
  return folders
    .map((folder) => ({
      ...folder,
      courses: filterCourses(folder.courses || [], searchText),
    }))
    .filter((folder) => folder.courses.length > 0);
}

function filterCourses(courses, searchText) {
  const keyword = String(searchText || "").toLowerCase();
  if (!keyword) return courses;

  return courses.filter((course) =>
    String(course.title || "").toLowerCase().includes(keyword)
  );
}
