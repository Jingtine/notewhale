from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

courses = [
    {"id": 1, "title": "离散数学"},
    {"id": 2, "title": "Java程序设计"},
]

ddls = [
    {
        "id": 1,
        "title": "离散数学作业",
        "date": "2026-06-15 23:59",
        "courseId": 1,
        "courseName": "离散数学",
    }
]


class CourseCreate(BaseModel):
    title: str


class DDLCreate(BaseModel):
    title: str
    date: str
    courseId: int | None = None
    courseName: str = ""


@app.get("/")
def root():
    return {"message": "Hello NoteWhale Backend"}


@app.get("/courses")
def get_courses():
    return courses


@app.post("/courses")
def create_course(course: CourseCreate):
    new_course = {
        "id": len(courses) + 1,
        "title": course.title,
    }
    courses.append(new_course)
    return new_course


@app.get("/ddls")
def get_ddls():
    return ddls


@app.post("/ddls")
def create_ddl(ddl: DDLCreate):
    new_ddl = {
        "id": len(ddls) + 1,
        "title": ddl.title,
        "date": ddl.date,
        "courseId": ddl.courseId,
        "courseName": ddl.courseName,
    }
    ddls.append(new_ddl)
    return new_ddl