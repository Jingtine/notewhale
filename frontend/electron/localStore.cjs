const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

let DatabaseSync = null;
let localStoreInitError = null;

try {
  ({ DatabaseSync } = require("node:sqlite"));
} catch (error) {
  localStoreInitError = error;
}

let db = null;

function initLocalStore(userDataPath) {
  if (!DatabaseSync) {
    console.warn("Desktop local SQLite is unavailable.", localStoreInitError);
    return false;
  }

  const dataDir = path.join(userDataPath, "local-data");
  fs.mkdirSync(dataDir, { recursive: true });

  try {
    db = new DatabaseSync(path.join(dataDir, "notewhale.sqlite"));
    db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      avatar TEXT DEFAULT '',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS folders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS courses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      starred INTEGER DEFAULT 0,
      folder_id INTEGER,
      folder_name TEXT DEFAULT '',
      is_deleted INTEGER DEFAULT 0,
      deleted_at TEXT,
      deleted_folder_id INTEGER,
      deleted_folder_title TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS ddls (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      date TEXT NOT NULL,
      course_id INTEGER,
      course_name TEXT DEFAULT '',
      platform TEXT DEFAULT '',
      note TEXT DEFAULT '',
      completed INTEGER DEFAULT 0,
      source TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);
    return true;
  } catch (error) {
    localStoreInitError = error;
    db = null;
    console.warn("Desktop local SQLite initialization failed.", error);
    return false;
  }
}

function nowIso() {
  return new Date().toISOString();
}

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto
    .pbkdf2Sync(String(password || ""), salt, 120000, 32, "sha256")
    .toString("hex");

  return { hash, salt };
}

function verifyPassword(password, user) {
  const nextHash = hashPassword(password, user.salt).hash;
  return crypto.timingSafeEqual(
    Buffer.from(nextHash, "hex"),
    Buffer.from(user.password_hash, "hex"),
  );
}

function createToken(userId) {
  const token = crypto.randomBytes(32).toString("hex");
  db.prepare("INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)").run(
    token,
    userId,
    nowIso(),
  );
  return token;
}

function toUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    account: row.account,
    name: row.name,
    avatar: row.avatar || "",
    createdAt: row.created_at,
  };
}

function toFolder(row) {
  return {
    id: row.id,
    title: row.title,
    createdAt: row.created_at,
  };
}

function toCourse(row) {
  return {
    id: row.id,
    title: row.title,
    starred: Boolean(row.starred),
    folderId: row.folder_id ?? null,
    folderName: row.folder_name || "",
    isDeleted: Boolean(row.is_deleted),
    deletedAt: row.deleted_at || null,
    deletedFolderId: row.deleted_folder_id ?? null,
    deletedFolderTitle: row.deleted_folder_title || "",
    createdAt: row.created_at,
  };
}

function toDdl(row) {
  return {
    id: row.id,
    title: row.title,
    date: row.date,
    courseId: row.course_id ?? null,
    courseName: row.course_name || "",
    platform: row.platform || "",
    note: row.note || "",
    completed: Boolean(row.completed),
    source: row.source || "",
    createdAt: row.created_at,
  };
}

function ok(data) {
  return { handled: true, status: 200, data };
}

function created(data) {
  return { handled: true, status: 201, data };
}

function fail(status, detail) {
  return { handled: true, status, data: { detail } };
}

function unsupported() {
  return { handled: false };
}

function getAuthUser(headers = {}) {
  const auth = headers.Authorization || headers.authorization || "";
  const token = String(auth).replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;

  const row = db
    .prepare(
      `SELECT users.*
       FROM sessions
       JOIN users ON users.id = sessions.user_id
       WHERE sessions.token = ?`,
    )
    .get(token);

  return row || null;
}

function requireUser(headers) {
  const user = getAuthUser(headers);
  if (!user) {
    throw Object.assign(new Error("未登录或登录已过期"), { status: 401 });
  }
  return user;
}

function parseRequestPath(rawPath) {
  const url = new URL(rawPath, "http://notewhale.local");
  return {
    pathname: url.pathname,
    searchParams: url.searchParams,
  };
}

function handleAuth(pathname, method, body, headers) {
  if (pathname === "/api/auth/register" && method === "POST") {
    const account = String(body?.account || "").trim();
    const password = String(body?.password || "");
    const name = String(body?.name || "").trim() || account;

    if (!account || !password) return fail(400, "请输入账号和密码");
    if (password.length < 6) return fail(400, "密码至少 6 位");

    const existing = db.prepare("SELECT id FROM users WHERE account = ?").get(account);
    if (existing) return fail(409, "账号已存在");

    const { hash, salt } = hashPassword(password);
    const result = db
      .prepare(
        `INSERT INTO users (account, name, password_hash, salt, avatar, created_at)
         VALUES (?, ?, ?, ?, '', ?)`,
      )
      .run(account, name, hash, salt, nowIso());
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(result.lastInsertRowid);
    return created({ token: createToken(user.id), user: toUser(user) });
  }

  if (pathname === "/api/auth/login" && method === "POST") {
    const account = String(body?.account || "").trim();
    const password = String(body?.password || "");
    const user = db.prepare("SELECT * FROM users WHERE account = ?").get(account);

    if (!user || !verifyPassword(password, user)) {
      return fail(401, "账号或密码错误");
    }

    return ok({ token: createToken(user.id), user: toUser(user) });
  }

  if (pathname === "/api/auth/me" && method === "GET") {
    return ok(toUser(requireUser(headers)));
  }

  if ((pathname === "/api/auth/me" || pathname === "/api/auth/profile") && ["PATCH", "PUT", "POST"].includes(method)) {
    const user = requireUser(headers);
    const name = String(body?.name || "").trim();
    if (!name) return fail(400, "昵称不能为空");

    db.prepare("UPDATE users SET name = ? WHERE id = ?").run(name, user.id);
    return ok(toUser(db.prepare("SELECT * FROM users WHERE id = ?").get(user.id)));
  }

  if (pathname === "/api/auth/password" && ["POST", "PUT", "PATCH"].includes(method)) {
    const user = requireUser(headers);
    const currentPassword = String(body?.currentPassword || "");
    const newPassword = String(body?.newPassword || "");

    if (!verifyPassword(currentPassword, user)) return fail(400, "当前密码不正确");
    if (newPassword.length < 6) return fail(400, "新密码至少 6 位");

    const { hash, salt } = hashPassword(newPassword);
    db.prepare("UPDATE users SET password_hash = ?, salt = ? WHERE id = ?").run(
      hash,
      salt,
      user.id,
    );
    return ok({ ok: true });
  }

  return unsupported();
}

function handleFolders(pathname, method, body, headers, searchParams) {
  const user = requireUser(headers);

  if (pathname === "/api/folders" && method === "GET") {
    const rows = db
      .prepare("SELECT * FROM folders WHERE user_id = ? ORDER BY id ASC")
      .all(user.id);
    return ok(rows.map(toFolder));
  }

  if (pathname === "/api/folders" && method === "POST") {
    const title = String(body?.title || "").trim();
    if (!title) return fail(400, "文件夹名称不能为空");

    const result = db
      .prepare("INSERT INTO folders (user_id, title, created_at) VALUES (?, ?, ?)")
      .run(user.id, title, nowIso());
    return created(toFolder(db.prepare("SELECT * FROM folders WHERE id = ?").get(result.lastInsertRowid)));
  }

  const folderMatch = pathname.match(/^\/api\/folders\/(\d+)$/);
  if (folderMatch && ["PUT", "PATCH"].includes(method)) {
    const folderId = Number(folderMatch[1]);
    const title = String(body?.title || "").trim();
    if (!title) return fail(400, "文件夹名称不能为空");

    db.prepare("UPDATE folders SET title = ? WHERE id = ? AND user_id = ?").run(title, folderId, user.id);
    const folder = db.prepare("SELECT * FROM folders WHERE id = ? AND user_id = ?").get(folderId, user.id);
    return folder ? ok(toFolder(folder)) : fail(404, "文件夹不存在");
  }

  const deleteMatch = pathname.match(/^\/api\/folders\/(\d+)\/delete$/);
  if (deleteMatch && method === "POST") {
    const folderId = Number(deleteMatch[1]);
    const deleteCourses = searchParams.get("deleteCourses") !== "false";
    const folder = db.prepare("SELECT * FROM folders WHERE id = ? AND user_id = ?").get(folderId, user.id);
    if (!folder) return fail(404, "文件夹不存在");

    if (deleteCourses) {
      db.prepare(
        `UPDATE courses
         SET is_deleted = 1, deleted_at = ?, deleted_folder_id = folder_id, deleted_folder_title = folder_name
         WHERE user_id = ? AND folder_id = ?`,
      ).run(nowIso(), user.id, folderId);
    } else {
      db.prepare("UPDATE courses SET folder_id = NULL, folder_name = '' WHERE user_id = ? AND folder_id = ?").run(user.id, folderId);
    }
    db.prepare("DELETE FROM folders WHERE id = ? AND user_id = ?").run(folderId, user.id);
    return ok({ ok: true });
  }

  return unsupported();
}

function handleCourses(pathname, method, body, headers) {
  const user = requireUser(headers);

  if (pathname === "/api/courses" && method === "GET") {
    const rows = db
      .prepare("SELECT * FROM courses WHERE user_id = ? AND is_deleted = 0 ORDER BY id ASC")
      .all(user.id);
    return ok(rows.map(toCourse));
  }

  if (pathname === "/api/courses" && method === "POST") {
    const title = String(body?.title || "").trim();
    if (!title) return fail(400, "课程名称不能为空");

    const result = db
      .prepare(
        `INSERT INTO courses (user_id, title, starred, folder_id, folder_name, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(
        user.id,
        title,
        body?.starred ? 1 : 0,
        body?.folderId ?? null,
        String(body?.folderName || ""),
        nowIso(),
      );
    return created(toCourse(db.prepare("SELECT * FROM courses WHERE id = ?").get(result.lastInsertRowid)));
  }

  const courseMatch = pathname.match(/^\/api\/courses\/(\d+)$/);
  if (courseMatch && ["PUT", "PATCH"].includes(method)) {
    const courseId = Number(courseMatch[1]);
    const current = db.prepare("SELECT * FROM courses WHERE id = ? AND user_id = ?").get(courseId, user.id);
    if (!current) return fail(404, "课程不存在");

    db.prepare(
      `UPDATE courses
       SET title = ?, starred = ?, folder_id = ?, folder_name = ?
       WHERE id = ? AND user_id = ?`,
    ).run(
      body?.title ?? current.title,
      body?.starred === undefined ? current.starred : body.starred ? 1 : 0,
      body?.folderId === undefined ? current.folder_id : body.folderId,
      body?.folderName === undefined ? current.folder_name : String(body.folderName || ""),
      courseId,
      user.id,
    );
    return ok(toCourse(db.prepare("SELECT * FROM courses WHERE id = ?").get(courseId)));
  }

  if (courseMatch && method === "DELETE") {
    const courseId = Number(courseMatch[1]);
    db.prepare(
      `UPDATE courses
       SET is_deleted = 1, deleted_at = ?, deleted_folder_id = folder_id, deleted_folder_title = folder_name
       WHERE id = ? AND user_id = ?`,
    ).run(nowIso(), courseId, user.id);
    return ok({ ok: true });
  }

  if (pathname === "/api/trash/courses" && method === "GET") {
    const rows = db
      .prepare("SELECT * FROM courses WHERE user_id = ? AND is_deleted = 1 ORDER BY deleted_at DESC")
      .all(user.id);
    return ok(rows.map(toCourse));
  }

  const restoreMatch = pathname.match(/^\/api\/trash\/courses\/(\d+)\/restore$/);
  if (restoreMatch && method === "POST") {
    const courseId = Number(restoreMatch[1]);
    db.prepare(
      `UPDATE courses
       SET is_deleted = 0, deleted_at = NULL, folder_id = ?, folder_name = ?
       WHERE id = ? AND user_id = ?`,
    ).run(body?.folderId ?? null, String(body?.folderName || ""), courseId, user.id);
    const course = db.prepare("SELECT * FROM courses WHERE id = ? AND user_id = ?").get(courseId, user.id);
    return course ? ok(toCourse(course)) : fail(404, "课程不存在");
  }

  const permanentMatch = pathname.match(/^\/api\/trash\/courses\/(\d+)\/permanent$/);
  if (permanentMatch && method === "DELETE") {
    db.prepare("DELETE FROM courses WHERE id = ? AND user_id = ?").run(Number(permanentMatch[1]), user.id);
    return ok({ ok: true });
  }

  return unsupported();
}

function handleDdls(pathname, method, body, headers) {
  const user = requireUser(headers);

  if (pathname === "/api/ddls" && method === "GET") {
    const rows = db
      .prepare("SELECT * FROM ddls WHERE user_id = ? ORDER BY date ASC, id ASC")
      .all(user.id);
    return ok(rows.map(toDdl));
  }

  if (pathname === "/api/ddls" && method === "POST") {
    const title = String(body?.title || "").trim();
    const date = String(body?.date || "").trim();
    if (!title || !date) return fail(400, "DDL 标题和截止时间不能为空");

    const result = db
      .prepare(
        `INSERT INTO ddls
         (user_id, title, date, course_id, course_name, platform, note, completed, source, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        user.id,
        title,
        date,
        body?.courseId ?? null,
        String(body?.courseName || ""),
        String(body?.platform || ""),
        String(body?.note || ""),
        body?.completed ? 1 : 0,
        String(body?.source || "手动新建"),
        nowIso(),
      );
    return created(toDdl(db.prepare("SELECT * FROM ddls WHERE id = ?").get(result.lastInsertRowid)));
  }

  const ddlMatch = pathname.match(/^\/api\/ddls\/(\d+)$/);
  if (ddlMatch && ["PUT", "PATCH"].includes(method)) {
    const ddlId = Number(ddlMatch[1]);
    const current = db.prepare("SELECT * FROM ddls WHERE id = ? AND user_id = ?").get(ddlId, user.id);
    if (!current) return fail(404, "DDL 不存在");

    db.prepare(
      `UPDATE ddls
       SET title = ?, date = ?, course_id = ?, course_name = ?, platform = ?, note = ?, completed = ?, source = ?
       WHERE id = ? AND user_id = ?`,
    ).run(
      body?.title ?? current.title,
      body?.date ?? current.date,
      body?.courseId === undefined ? current.course_id : body.courseId,
      body?.courseName === undefined ? current.course_name : String(body.courseName || ""),
      body?.platform === undefined ? current.platform : String(body.platform || ""),
      body?.note === undefined ? current.note : String(body.note || ""),
      body?.completed === undefined ? current.completed : body.completed ? 1 : 0,
      body?.source === undefined ? current.source : String(body.source || ""),
      ddlId,
      user.id,
    );
    return ok(toDdl(db.prepare("SELECT * FROM ddls WHERE id = ?").get(ddlId)));
  }

  if (ddlMatch && method === "DELETE") {
    db.prepare("DELETE FROM ddls WHERE id = ? AND user_id = ?").run(Number(ddlMatch[1]), user.id);
    return ok({ ok: true });
  }

  return unsupported();
}

function handleLocalApiRequest(request = {}) {
  if (!db) return unsupported();

  try {
    const method = String(request.method || "GET").toUpperCase();
    const body = request.body || {};
    const headers = request.headers || {};
    const { pathname, searchParams } = parseRequestPath(request.path || "/");

    if (pathname === "/health") {
      return ok({ status: "ok", service: "notewhale-local-ipc", mode: "desktop-ipc" });
    }

    if (pathname.startsWith("/api/auth/")) return handleAuth(pathname, method, body, headers);
    if (pathname.startsWith("/api/folders")) return handleFolders(pathname, method, body, headers, searchParams);
    if (pathname.startsWith("/api/courses") || pathname.startsWith("/api/trash/courses")) return handleCourses(pathname, method, body, headers);
    if (pathname.startsWith("/api/ddls")) return handleDdls(pathname, method, body, headers);

    return unsupported();
  } catch (error) {
    return fail(error.status || 500, error.message || "本地请求失败");
  }
}

function closeLocalStore() {
  if (db) {
    db.close();
    db = null;
  }
}

module.exports = {
  closeLocalStore,
  handleLocalApiRequest,
  initLocalStore,
};
