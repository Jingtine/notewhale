from typing import Optional

from pydantic import BaseModel


class RegisterRequest(BaseModel):
    account: str
    password: str
    name: str


class LoginRequest(BaseModel):
    account: str
    password: str


class UserProfileUpdate(BaseModel):
    name: str


class PasswordChangeRequest(BaseModel):
    currentPassword: str
    newPassword: str


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


class AIModelOverride(BaseModel):
    apiUrl: str = ""
    apiKey: str = ""
    model: str = ""


class GenerateNoteRequest(BaseModel):
    courseId: Optional[int] = None
    courseName: str = "课程"
    resourceName: str = "课程资料"
    resourceId: Optional[int] = None
    rawText: str = ""
    noteStyle: str = "复习型"
    aiTextModel: Optional[AIModelOverride] = None


class RecognizeDDLRequest(BaseModel):
    courseId: Optional[int] = None
    courseName: str = "未归属课程"
