from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text

from database import Base


class Folder(Base):
    __tablename__ = "folders"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class Course(Base):
    __tablename__ = "courses"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    starred = Column(Boolean, default=False)
    folder_id = Column(Integer, ForeignKey("folders.id"), nullable=True)
    folder_name = Column(String, default="")
    is_deleted = Column(Boolean, default=False)
    deleted_at = Column(DateTime, nullable=True)
    deleted_folder_id = Column(Integer, nullable=True)
    deleted_folder_title = Column(String, default="")
    created_at = Column(DateTime, default=datetime.utcnow)


class DDL(Base):
    __tablename__ = "ddls"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    date = Column(String, nullable=False)
    course_id = Column(Integer, nullable=True)
    course_name = Column(String, default="未归属课程")
    platform = Column(String, default="")
    note = Column(Text, default="")
    completed = Column(Boolean, default=False)
    source = Column(String, default="手动新建")
    created_at = Column(DateTime, default=datetime.utcnow)


class Note(Base):
    __tablename__ = "notes"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    content = Column(Text, default="")
    course_id = Column(Integer, nullable=True)
    course_name = Column(String, default="")
    source = Column(String, default="手动记录")
    ai_generated = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)


class Resource(Base):
    __tablename__ = "resources"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    file_type = Column(String, default="资料")
    file_path = Column(String, nullable=False)
    size = Column(Integer, default=0)
    course_id = Column(Integer, nullable=True)
    course_name = Column(String, default="")
    created_at = Column(DateTime, default=datetime.utcnow)
