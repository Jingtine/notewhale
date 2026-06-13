# 鲸记 NoteWhale

**鲸记 NoteWhale** 是一款面向学生学习场景的智能课程资料与学习任务管理平台。项目围绕“课程、资料、笔记、DDL”四类核心学习对象展开，帮助学生在一个统一空间中完成课程管理、资料归档、笔记整理、DDL 追踪和 AI 辅助学习。

## 线上体验

项目已完成线上 Demo 部署，可通过以下地址访问：

https://notewhale.vercel.app

当前线上版本主要用于中期阶段功能展示，已支持账号登录、课程管理、文件夹分类、资料上传、笔记编辑和 DDL 管理等核心流程。AI 笔记生成功能已完成 DeepSeek 接入尝试，正在继续优化不同资料格式的读取稳定性和生成效果。

## 项目背景

在日常学习中，学生通常需要同时面对多个课程、不同格式的课件资料、分散的课堂笔记以及多个平台上的作业截止时间。传统文件夹、备忘录或聊天记录虽然可以保存信息，但难以建立课程、资料、笔记和任务之间的关联。

鲸记 NoteWhale 希望通过一个轻量化的学习管理平台，将学生的学习资料从“分散存放”转化为“按课程组织、可持续整理、可复习回看”的学习系统。

## 核心功能

### 1. 用户账号系统

* 用户注册
* 用户登录
* Token 登录状态保持
* 多用户数据隔离

### 2. 课程管理

* 新建课程
* 编辑课程信息
* 收藏课程
* 删除课程
* 按课程查看资料、笔记和 DDL

### 3. 文件夹分类

* 新建文件夹
* 重命名文件夹
* 删除文件夹
* 将课程按文件夹分类管理

### 4. 课程资料管理

* 上传课程资料
* 支持 PDF、PPT、Word、文本等常见学习资料
* 资料与课程关联
* 在课程页面集中展示资料列表

### 5. 笔记管理

* 新建课程笔记
* 编辑笔记内容
* 保存笔记
* AI 生成笔记后继续手动修改
* 笔记与课程关联

### 6. DDL 管理

* 新建 DDL
* 编辑 DDL
* 删除 DDL
* 标记完成状态
* 记录任务标题、截止时间、提交平台和备注
* DDL 与课程关联

### 7. AI 辅助学习

* 接入 DeepSeek 文本模型
* 尝试根据课程资料生成结构化复习笔记
* 探索图片识别能力在 DDL 信息提取中的应用

当前 AI 功能仍在持续优化中，后续将重点提升资料读取稳定性、大文件处理能力和 AI 笔记生成质量。

## 技术栈

### 前端

* React
* Vite
* JavaScript
* CSS / Tailwind 风格设计
* Vercel 部署

### 后端

* FastAPI
* SQLAlchemy
* Pydantic
* Uvicorn
* Render 部署

### AI 能力

* DeepSeek 文本模型
* 视觉模型接口探索

### 数据库

* 基于 SQLAlchemy 的关系型数据库设计
* 支持用户、课程、文件夹、DDL、笔记和资料等核心数据表

## 项目结构

```text
notewhale/
├── backend/
│   ├── main.py
│   ├── models.py
│   ├── database.py
│   ├── requirements.txt
│   └── uploads/
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
│
└── README.md
```

## 本地运行指南

### 1. 克隆项目

```bash
git clone https://github.com/Jingtine/notewhale.git
cd notewhale
```

### 2. 启动前端

进入前端目录：

```bash
cd frontend
```

安装依赖：

```bash
npm install
```

启动开发服务器：

```bash
npm run dev
```

前端本地访问地址通常为：

```text
http://localhost:5173
```

### 3. 启动后端

进入后端目录：

```bash
cd backend
```

安装依赖：

```bash
pip install -r requirements.txt
```

启动后端服务：

```bash
python -m uvicorn main:app --reload --port 8000
```

后端本地访问地址为：

```text
http://localhost:8000
```

接口文档地址为：

```text
http://localhost:8000/docs
```

## 环境变量配置

### 前端环境变量

在前端部署或本地运行时，需要配置后端 API 地址：

```text
VITE_API_BASE_URL=http://localhost:8000
```

线上环境中可配置为：

```text
VITE_API_BASE_URL=https://notewhale-backend.onrender.com
```

### 后端环境变量

后端需要配置以下环境变量：

```text
DATABASE_URL=数据库连接地址
NOTEWHALE_SECRET_KEY=后端密钥
NOTEWHALE_TOKEN_EXPIRE_DAYS=登录有效天数
NOTEWHALE_FRONTEND_ORIGINS=https://notewhale.vercel.app
```

如果使用 DeepSeek AI 笔记功能，需要配置：

```text
NOTEWHALE_TEXT_API_URL=https://api.deepseek.com/chat/completions
NOTEWHALE_TEXT_API_KEY=DeepSeek API Key
NOTEWHALE_TEXT_MODEL=deepseek-chat
```

如果使用视觉模型识别功能，需要配置：

```text
NOTEWHALE_VISION_API_URL=视觉模型接口地址
NOTEWHALE_VISION_API_KEY=视觉模型 API Key
NOTEWHALE_VISION_MODEL=视觉模型名称
```

Render 部署时建议指定 Python 版本：

```text
PYTHON_VERSION=3.11.9
```

## 部署指南

### 前端部署

前端部署在 Vercel。

部署步骤：

1. 将项目推送到 GitHub。
2. 在 Vercel 中导入 GitHub 仓库。
3. 设置前端项目目录为 `frontend`。
4. 配置环境变量：

```text
VITE_API_BASE_URL=https://notewhale-backend.onrender.com
```

5. 点击 Deploy 完成部署。

### 后端部署

后端部署在 Render。

部署步骤：

1. 在 Render 中创建 Web Service。
2. 连接 GitHub 仓库。
3. 设置后端目录为 `backend`。
4. 设置构建命令：

```bash
pip install -r requirements.txt
```

5. 设置启动命令：

```bash
python -m uvicorn main:app --host 0.0.0.0 --port $PORT
```

6. 配置数据库、密钥、DeepSeek API 等环境变量。
7. 点击 Manual Deploy 或等待自动部署。

## 使用流程

1. 进入线上网站或本地前端地址。
2. 注册或登录账号。
3. 在首页新建课程。
4. 使用文件夹对课程进行分类。
5. 点击课程卡片进入课程详情页。
6. 上传课程资料。
7. 创建或编辑课程笔记。
8. 在 DDL 页面新建和管理课程任务。
9. 尝试使用 AI 笔记功能生成结构化复习笔记。
10. 根据实际课程内容继续修改和完善笔记。

## 当前进度

项目目前已完成：

* 前端主要页面开发
* 后端主要接口开发
* 用户认证系统
* 课程管理
* 文件夹管理
* DDL 管理
* 资料上传
* 笔记编辑
* 前后端联调
* 线上 Demo 部署
* DeepSeek AI 笔记功能接入尝试

## 当前问题

当前项目仍有一些需要继续优化的地方：

1. Render 本地上传目录不适合长期保存资料文件，后续需要接入对象存储或持久化资料提取文本。
2. 不同格式资料的文本读取稳定性仍需提升。
3. 图片型 PPT、扫描版 PDF 等资料需要 OCR 支持。
4. 大文件资料直接处理容易超时，后续需要分段处理或后台任务机制。
5. AI 生成笔记的详细程度和准确性还需要继续优化。

## 后续计划

* 优化 AI 笔记生成效果
* 增强 Word、PPT、PDF 资料解析能力
* 接入更稳定的文件存储方案
* 支持图片型资料 OCR 识别
* 优化大文件分段处理
* 完善 Markdown 渲染、公式显示和 PDF 导出
* 优化课程学习数据统计
* 打磨最终展示版本

## 项目状态

当前版本为中期展示版本，已形成较完整的产品雏形。项目重点展示“课程资料组织—笔记整理—DDL 管理—AI 辅助学习”的核心流程，后续将继续围绕稳定性、AI 效果和交互体验进行优化。

## License

本项目当前仅用于课程项目、中期展示与学习交流。
