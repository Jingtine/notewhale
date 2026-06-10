from fastapi import FastAPI

app = FastAPI()

@app.get("/")
def root():
    return {"message": "Hello NoteWhale Backend"}

@app.get("/notes")
def get_notes():
    return {
        "data": [
            {"id": 1, "title": "离散数学笔记"},
            {"id": 2, "title": "Java程序设计笔记"}
        ]
    }