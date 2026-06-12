from datetime import datetime
from pathlib import Path
from typing import Optional

from fastapi import Depends, FastAPI, File, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from sqlalchemy import inspect, text, or_
from sqlalchemy.orm import Session

from database import Base, engine, get_db
from models import Course, DDL, Folder, Note, Resource

BASE_DIR = Path(__file__).resolve().parent
UPLOAD_DIR = BASE_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

Base.metadata.create_all(bind=engine)


def ensure_schema():
    """兼容旧版 SQLite 表结构：create_all 不会自动给旧表补字段。"""
    inspector = inspect(engine)

    with engine.begin() as conn:
        if "folders" not in inspector.get_table_names():
            Base.metadata.create_all(bind=engine)

        if "courses" in inspector.get_table_names():
            course_columns = {column["name"] for column in inspector.get_columns("courses")}

            if "folder_id" not in course_columns:
                conn.execute(text("ALTER TABLE courses ADD COLUMN folder_id INTEGER"))

            if "folder_name" not in course_columns:
                conn.execute(text("ALTER TABLE courses ADD COLUMN folder_name VARCHAR DEFAULT ''"))

            if "is_deleted" not in course_columns:
                conn.execute(text("ALTER TABLE courses ADD COLUMN is_deleted BOOLEAN DEFAULT 0"))

            if "deleted_at" not in course_columns:
                conn.execute(text("ALTER TABLE courses ADD COLUMN deleted_at DATETIME"))

            if "deleted_folder_id" not in course_columns:
                conn.execute(text("ALTER TABLE courses ADD COLUMN deleted_folder_id INTEGER"))

            if "deleted_folder_title" not in course_columns:
                conn.execute(text("ALTER TABLE courses ADD COLUMN deleted_folder_title VARCHAR DEFAULT ''"))


ensure_schema()

app = FastAPI(
    title="NoteWhale API",
    description="鲸记 NoteWhale 后端接口",
    version="0.4.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")


class FolderCreate(BaseModel):
    title: str


class FolderUpdate(BaseModel):
    title: Optional[str] = None


class CourseCreate(BaseModel):
    title: str
    starred: bool = False
    folderId: Optional[int] = None
    folderName: str = ""


class CourseUpdate(BaseModel):
    title: Optional[str] = None
    starred: Optional[bool] = None
    folderId: Optional[int] = None
    folderName: Optional[str] = None


class RestoreCourseRequest(BaseModel):
    folderId: Optional[int] = None
    folderName: str = ""


class DDLCreate(BaseModel):
    title: str
    date: str
    courseId: Optional[int] = None
    courseName: str = "未归属课程"
    platform: str = ""
    note: str = ""
    completed: bool = False
    source: str = "手动新建"


class DDLUpdate(BaseModel):
    title: Optional[str] = None
    date: Optional[str] = None
    courseId: Optional[int] = None
    courseName: Optional[str] = None
    platform: Optional[str] = None
    note: Optional[str] = None
    completed: Optional[bool] = None
    source: Optional[str] = None


class NoteCreate(BaseModel):
    title: str
    content: str = ""
    courseId: Optional[int] = None
    courseName: str = ""
    source: str = "手动记录"
    aiGenerated: bool = False


class NoteUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    courseId: Optional[int] = None
    courseName: Optional[str] = None
    source: Optional[str] = None
    aiGenerated: Optional[bool] = None


class GenerateNoteRequest(BaseModel):
    courseId: Optional[int] = None
    courseName: str = "课程"
    resourceName: str = "课程资料"


class RecognizeDDLRequest(BaseModel):
    courseId: Optional[int] = None
    courseName: str = "未归属课程"


def timestamp(dt):
    return int(dt.timestamp() * 1000) if dt else None


def folder_to_dict(folder: Folder, courses=None):
    return {
        "id": folder.id,
        "title": folder.title,
        "createdAt": timestamp(folder.created_at),
        "courses": courses if courses is not None else [],
    }


def course_to_dict(course: Course):
    return {
        "id": course.id,
        "title": course.title,
        "starred": course.starred,
        "folderId": course.folder_id,
        "folderName": course.folder_name or "",
        "isDeleted": bool(getattr(course, "is_deleted", False)),
        "deletedAt": timestamp(getattr(course, "deleted_at", None)),
        "deletedFolderId": getattr(course, "deleted_folder_id", None),
        "deletedFolderTitle": getattr(course, "deleted_folder_title", "") or "",
        "createdAt": timestamp(course.created_at),
    }


def ddl_to_dict(ddl: DDL):
    return {
        "id": ddl.id,
        "title": ddl.title,
        "date": ddl.date,
        "courseId": ddl.course_id,
        "courseName": ddl.course_name,
        "platform": ddl.platform,
        "note": ddl.note,
        "completed": ddl.completed,
        "source": ddl.source,
        "createdAt": timestamp(ddl.created_at),
    }


def note_to_dict(note: Note):
    return {
        "id": note.id,
        "title": note.title,
        "content": note.content,
        "courseId": note.course_id,
        "courseName": note.course_name,
        "source": note.source,
        "aiGenerated": note.ai_generated,
        "createdAt": timestamp(note.created_at),
        "updatedAt": timestamp(note.updated_at),
    }


def resource_to_dict(resource: Resource):
    filename = Path(resource.file_path).name
    return {
        "id": resource.id,
        "name": resource.name,
        "type": resource.file_type,
        "filePath": resource.file_path,
        "url": f"/uploads/{filename}",
        "size": resource.size,
        "courseId": resource.course_id,
        "courseName": resource.course_name,
        "createdAt": timestamp(resource.created_at),
    }


def get_file_type(filename: str):
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""

    if ext == "pdf":
        return "PDF"
    if ext in {"ppt", "pptx"}:
        return "PPT"
    if ext in {"doc", "docx"}:
        return "Word"
    if ext in {"jpg", "jpeg", "png", "webp"}:
        return "图片"
    if ext in {"mp3", "wav", "m4a"}:
        return "录音"
    if ext in {"txt", "md"}:
        return "文本"
    return "资料"


def active_course_filter():
    return or_(Course.is_deleted == False, Course.is_deleted.is_(None))


def soft_delete_course(course: Course, folder_id=None, folder_title: str = ""):
    course.is_deleted = True
    course.deleted_at = datetime.utcnow()
    course.deleted_folder_id = folder_id if folder_id is not None else course.folder_id
    course.deleted_folder_title = folder_title or course.folder_name or ""


def ensure_folder(db: Session, folder_id: Optional[int], folder_name: str = ""):
    if folder_id:
        folder = db.query(Folder).filter(Folder.id == folder_id).first()
        if folder:
            return folder

    title = (folder_name or "").strip()
    if not title:
        return None

    folder = db.query(Folder).filter(Folder.title == title).first()
    if folder:
        return folder

    folder = Folder(title=title)
    db.add(folder)
    db.commit()
    db.refresh(folder)
    return folder


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "notewhale-backend",
        "version": "0.4.0",
    }


@app.get("/api/folders")
def list_folders(db: Session = Depends(get_db)):
    folders = db.query(Folder).order_by(Folder.created_at.asc()).all()
    result = []

    for folder in folders:
        courses = (
            db.query(Course)
            .filter(Course.folder_id == folder.id, active_course_filter())
            .order_by(Course.created_at.desc())
            .all()
        )
        result.append(folder_to_dict(folder, [course_to_dict(course) for course in courses]))

    unassigned_courses = (
        db.query(Course)
        .filter(Course.folder_id.is_(None), active_course_filter())
        .order_by(Course.created_at.desc())
        .all()
    )

    if unassigned_courses:
        result.append(
            {
                "id": None,
                "title": "未归属课程",
                "createdAt": None,
                "courses": [course_to_dict(course) for course in unassigned_courses],
            }
        )

    return result


@app.post("/api/folders")
def create_folder(folder: FolderCreate, db: Session = Depends(get_db)):
    title = folder.title.strip()
    if not title:
        raise HTTPException(status_code=400, detail="文件夹名称不能为空")

    new_folder = Folder(title=title)
    db.add(new_folder)
    db.commit()
    db.refresh(new_folder)
    return folder_to_dict(new_folder)


@app.put("/api/folders/{folder_id}")
def update_folder(folder_id: int, payload: FolderUpdate, db: Session = Depends(get_db)):
    folder = db.query(Folder).filter(Folder.id == folder_id).first()
    if not folder:
        raise HTTPException(status_code=404, detail="文件夹不存在")

    if payload.title is not None:
        title = payload.title.strip()
        if not title:
            raise HTTPException(status_code=400, detail="文件夹名称不能为空")

        folder.title = title
        db.query(Course).filter(Course.folder_id == folder.id).update(
            {Course.folder_name: title},
            synchronize_session=False,
        )

    db.commit()
    db.refresh(folder)
    return folder_to_dict(folder)


@app.delete("/api/folders/{folder_id}")
def delete_folder(
    folder_id: int,
    deleteCourses: bool = Query(False),
    db: Session = Depends(get_db),
):
    folder = db.query(Folder).filter(Folder.id == folder_id).first()
    if not folder:
        raise HTTPException(status_code=404, detail="文件夹不存在")

    courses = db.query(Course).filter(Course.folder_id == folder.id, active_course_filter()).all()

    if deleteCourses:
        for course in courses:
            soft_delete_course(course, folder.id, folder.title)
    else:
        for course in courses:
            course.folder_id = None
            course.folder_name = ""

    db.delete(folder)
    db.commit()
    return {"ok": True, "deletedFolderId": folder_id, "deleteCourses": deleteCourses}


@app.get("/api/courses")
def list_courses(db: Session = Depends(get_db)):
    courses = (
        db.query(Course)
        .filter(active_course_filter())
        .order_by(Course.created_at.desc())
        .all()
    )
    return [course_to_dict(course) for course in courses]


@app.post("/api/courses")
def create_course(course: CourseCreate, db: Session = Depends(get_db)):
    title = course.title.strip()
    if not title:
        raise HTTPException(status_code=400, detail="课程名称不能为空")

    folder = ensure_folder(db, course.folderId, course.folderName)

    new_course = Course(
        title=title,
        starred=course.starred,
        folder_id=folder.id if folder else None,
        folder_name=folder.title if folder else (course.folderName or ""),
    )

    db.add(new_course)
    db.commit()
    db.refresh(new_course)
    return course_to_dict(new_course)


@app.put("/api/courses/{course_id}")
def update_course(course_id: int, payload: CourseUpdate, db: Session = Depends(get_db)):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="课程不存在")

    if payload.title is not None:
        title = payload.title.strip()
        if not title:
            raise HTTPException(status_code=400, detail="课程名称不能为空")
        course.title = title

        db.query(DDL).filter(DDL.course_id == course.id).update(
            {DDL.course_name: title},
            synchronize_session=False,
        )
        db.query(Note).filter(Note.course_id == course.id).update(
            {Note.course_name: title},
            synchronize_session=False,
        )
        db.query(Resource).filter(Resource.course_id == course.id).update(
            {Resource.course_name: title},
            synchronize_session=False,
        )

    if payload.starred is not None:
        course.starred = payload.starred

    if payload.folderId is not None or payload.folderName is not None:
        folder = ensure_folder(db, payload.folderId, payload.folderName or "")
        course.folder_id = folder.id if folder else None
        course.folder_name = folder.title if folder else (payload.folderName or "")

    db.commit()
    db.refresh(course)
    return course_to_dict(course)


@app.delete("/api/courses/{course_id}")
def delete_course(course_id: int, db: Session = Depends(get_db)):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="课程不存在")

    if course.is_deleted:
        return {"ok": True, "deletedCourseId": course_id, "softDeleted": True}

    folder_title = course.folder_name or ""
    if course.folder_id:
        folder = db.query(Folder).filter(Folder.id == course.folder_id).first()
        if folder:
            folder_title = folder.title

    soft_delete_course(course, course.folder_id, folder_title)
    db.commit()
    db.refresh(course)

    return {"ok": True, "deletedCourseId": course_id, "softDeleted": True, "course": course_to_dict(course)}


@app.get("/api/trash/courses")
def list_deleted_courses(db: Session = Depends(get_db)):
    courses = (
        db.query(Course)
        .filter(Course.is_deleted == True)
        .order_by(Course.deleted_at.desc())
        .all()
    )
    return [course_to_dict(course) for course in courses]


@app.post("/api/trash/courses/{course_id}/restore")
def restore_deleted_course(
    course_id: int,
    payload: RestoreCourseRequest,
    db: Session = Depends(get_db),
):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="课程不存在")

    folder_name = (payload.folderName or course.deleted_folder_title or course.folder_name or "").strip()
    folder = ensure_folder(db, payload.folderId, folder_name)

    course.is_deleted = False
    course.deleted_at = None
    course.deleted_folder_id = None
    course.deleted_folder_title = ""
    course.folder_id = folder.id if folder else None
    course.folder_name = folder.title if folder else ""

    db.query(DDL).filter(DDL.course_id == course.id).update(
        {DDL.course_name: course.title},
        synchronize_session=False,
    )
    db.query(Note).filter(Note.course_id == course.id).update(
        {Note.course_name: course.title},
        synchronize_session=False,
    )
    db.query(Resource).filter(Resource.course_id == course.id).update(
        {Resource.course_name: course.title},
        synchronize_session=False,
    )

    db.commit()
    db.refresh(course)
    return course_to_dict(course)


@app.delete("/api/trash/courses/{course_id}/permanent")
def permanently_delete_course(course_id: int, db: Session = Depends(get_db)):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="课程不存在")

    db.query(DDL).filter(DDL.course_id == course.id).update(
        {DDL.course_id: None, DDL.course_name: "未归属课程"},
        synchronize_session=False,
    )
    db.query(Note).filter(Note.course_id == course.id).update(
        {Note.course_id: None, Note.course_name: "未归属课程"},
        synchronize_session=False,
    )
    db.query(Resource).filter(Resource.course_id == course.id).update(
        {Resource.course_id: None, Resource.course_name: "未归属课程"},
        synchronize_session=False,
    )

    db.delete(course)
    db.commit()
    return {"ok": True, "permanentDeletedCourseId": course_id}


@app.get("/api/ddls")
def list_ddls(db: Session = Depends(get_db)):
    ddls = db.query(DDL).order_by(DDL.created_at.desc()).all()
    return [ddl_to_dict(ddl) for ddl in ddls]


@app.post("/api/ddls")
def create_ddl(ddl: DDLCreate, db: Session = Depends(get_db)):
    new_ddl = DDL(
        title=ddl.title,
        date=ddl.date,
        course_id=ddl.courseId,
        course_name=ddl.courseName,
        platform=ddl.platform,
        note=ddl.note,
        completed=ddl.completed,
        source=ddl.source,
    )

    db.add(new_ddl)
    db.commit()
    db.refresh(new_ddl)
    return ddl_to_dict(new_ddl)


@app.put("/api/ddls/{ddl_id}")
def update_ddl(ddl_id: int, payload: DDLUpdate, db: Session = Depends(get_db)):
    ddl = db.query(DDL).filter(DDL.id == ddl_id).first()
    if not ddl:
        raise HTTPException(status_code=404, detail="DDL 不存在")

    if payload.title is not None:
        ddl.title = payload.title
    if payload.date is not None:
        ddl.date = payload.date
    if payload.courseId is not None:
        ddl.course_id = payload.courseId
    if payload.courseName is not None:
        ddl.course_name = payload.courseName
    if payload.platform is not None:
        ddl.platform = payload.platform
    if payload.note is not None:
        ddl.note = payload.note
    if payload.completed is not None:
        ddl.completed = payload.completed
    if payload.source is not None:
        ddl.source = payload.source

    db.commit()
    db.refresh(ddl)
    return ddl_to_dict(ddl)


@app.delete("/api/ddls/{ddl_id}")
def delete_ddl(ddl_id: int, db: Session = Depends(get_db)):
    ddl = db.query(DDL).filter(DDL.id == ddl_id).first()
    if not ddl:
        raise HTTPException(status_code=404, detail="DDL 不存在")

    db.delete(ddl)
    db.commit()
    return {"ok": True, "deletedDdlId": ddl_id}


@app.get("/api/notes")
def list_notes(db: Session = Depends(get_db)):
    notes = db.query(Note).order_by(Note.updated_at.desc()).all()
    return [note_to_dict(note) for note in notes]


@app.post("/api/notes")
def create_note(note: NoteCreate, db: Session = Depends(get_db)):
    new_note = Note(
        title=note.title,
        content=note.content,
        course_id=note.courseId,
        course_name=note.courseName,
        source=note.source,
        ai_generated=note.aiGenerated,
    )

    db.add(new_note)
    db.commit()
    db.refresh(new_note)
    return note_to_dict(new_note)


@app.put("/api/notes/{note_id}")
def update_note(note_id: int, payload: NoteUpdate, db: Session = Depends(get_db)):
    note = db.query(Note).filter(Note.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="笔记不存在")

    if payload.title is not None:
        note.title = payload.title
    if payload.content is not None:
        note.content = payload.content
    if payload.courseId is not None:
        note.course_id = payload.courseId
    if payload.courseName is not None:
        note.course_name = payload.courseName
    if payload.source is not None:
        note.source = payload.source
    if payload.aiGenerated is not None:
        note.ai_generated = payload.aiGenerated

    note.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(note)
    return note_to_dict(note)


@app.delete("/api/notes/{note_id}")
def delete_note(note_id: int, db: Session = Depends(get_db)):
    note = db.query(Note).filter(Note.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="笔记不存在")

    db.delete(note)
    db.commit()
    return {"ok": True, "deletedNoteId": note_id}


@app.post("/api/notes/generate")
def generate_note(payload: GenerateNoteRequest):
    now = datetime.utcnow()
    title = f"{payload.courseName} · AI结构化笔记"

    content = f"""# {payload.courseName} · AI结构化笔记

> 来源：{payload.resourceName}
> 生成方式：NoteWhale 后端模拟 AI 生成

## 一、知识结构

1. **核心概念梳理**
   - 提取资料中的关键词、定义与适用场景。
   - 将零散内容整理为“概念 → 原理 → 应用”的结构。

2. **重点内容归纳**
   - 标记资料中的高频概念与重要结论。
   - 形成便于复习和检索的笔记条目。

3. **复习建议**
   - 先理解概念，再结合例题与作业训练。
   - 考前可优先复习标题、公式和重点条目。

## 二、公式记录示例

$$
\\text{{学习沉淀}} = \\text{{课程资料}} + \\text{{AI整理}} + \\text{{个人补充}}
$$
"""

    return {
        "id": int(now.timestamp() * 1000),
        "title": title,
        "content": content,
        "courseId": payload.courseId,
        "courseName": payload.courseName,
        "source": payload.resourceName,
        "aiGenerated": True,
        "createdAt": int(now.timestamp() * 1000),
        "updatedAt": int(now.timestamp() * 1000),
    }


@app.post("/api/ddls/recognize")
def recognize_ddl(payload: RecognizeDDLRequest):
    now = datetime.utcnow()

    return {
        "id": int(now.timestamp() * 1000),
        "title": f"{payload.courseName} 作业提交",
        "date": "2026-06-20 23:59",
        "courseId": payload.courseId,
        "courseName": payload.courseName,
        "platform": "教学平台",
        "note": "由截图识别生成，可继续手动修改。",
        "completed": False,
        "source": "图片识别",
        "createdAt": int(now.timestamp() * 1000),
    }


@app.get("/api/resources")
def list_resources(db: Session = Depends(get_db)):
    resources = db.query(Resource).order_by(Resource.created_at.desc()).all()
    return [resource_to_dict(resource) for resource in resources]


@app.post("/api/resources/upload")
async def upload_resource(
    file: UploadFile = File(...),
    courseId: Optional[int] = Query(None),
    courseName: str = Query(""),
    db: Session = Depends(get_db),
):
    raw_name = Path(file.filename or "uploaded_file").name
    stored_name = f"{int(datetime.utcnow().timestamp() * 1000)}_{raw_name}"
    file_path = UPLOAD_DIR / stored_name

    content = await file.read()
    file_path.write_bytes(content)

    resource = Resource(
        name=raw_name,
        file_type=get_file_type(raw_name),
        file_path=str(file_path),
        size=len(content),
        course_id=courseId,
        course_name=courseName or "",
    )

    db.add(resource)
    db.commit()
    db.refresh(resource)

    return resource_to_dict(resource)


@app.delete("/api/resources/{resource_id}")
def delete_resource(resource_id: int, db: Session = Depends(get_db)):
    resource = db.query(Resource).filter(Resource.id == resource_id).first()
    if not resource:
        raise HTTPException(status_code=404, detail="资料不存在")

    file_path = Path(resource.file_path)

    db.delete(resource)
    db.commit()

    try:
        if file_path.exists() and file_path.is_file():
            file_path.unlink()
    except Exception:
        # 数据库删除已经完成，文件删除失败不影响接口返回。
        pass

    return {"ok": True, "deletedResourceId": resource_id}
