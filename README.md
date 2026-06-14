# 鲸记 NoteWhale

鲸记 NoteWhale 是一款面向学生学习场景的智能课程资料与学习任务管理平台。项目围绕课程、资料、笔记和 DDL 四类核心学习对象展开，帮助学生集中管理课程资料、课堂笔记和学习任务。

## 项目简介

在日常学习中，学生往往需要同时面对多个课程、不同格式的课件资料、分散的笔记内容以及多个平台上的作业截止时间。传统文件夹、备忘录或聊天记录虽然可以保存信息，但难以建立课程、资料、笔记和任务之间的关联。

NoteWhale 希望通过一个统一的学习空间，将学习资料从“分散存放”转化为“按课程组织、可持续整理、可复习回看”的学习系统，形成：

```text
课程创建 → 资料上传 → 笔记整理 → DDL 管理 → 复习回看
```

的学习闭环。

## 线上体验

当前项目已完成线上 Demo 部署：

**体验地址：**

```text
https://notewhale.vercel.app
```

说明：当前中期 Demo 前端部署在 Vercel，后端部署在 Render，主要用于功能展示。由于目前前端部署平台位于海外，国内网络环境下可能存在访问不稳定的情况。可使用 VPN 访问线上体验地址，也可通过本地运行方式体验完整功能。接入的GLM使用免费视觉模型，Deepseek使用v4模型，由于后端不稳定，可能会出现响应慢或报错等问题（Maybe是我的deepseek额度用完了······）。后续计划将项目迁移至国内云服务，完成域名解析、备案和稳定部署，或打包成运行程序供本地接入API使用。

## GitHub 仓库

```text
https://github.com/Jingtine/notewhale
```

## 主要功能

### 账号系统

* 用户注册
* 用户登录
* 登录状态保持
* 多用户数据隔离

### 课程管理

* 新建课程
* 编辑课程
* 收藏课程
* 删除课程
* 按课程查看资料、笔记和 DDL

### 文件夹分类

* 新建文件夹
* 重命名文件夹
* 删除文件夹
* 将课程按文件夹分类管理

### 课程资料管理

* 上传课程资料
* 查看课程资料列表
* 支持 PDF、PPT、Word、文本等常见资料类型
* 将资料与具体课程关联

### 笔记管理

* 新建课程笔记
* 编辑课程笔记
* 保存课程笔记
* 笔记与课程关联
* 支持 AI 生成笔记后继续手动修改

### DDL 管理

* 新建 DDL
* 编辑 DDL
* 删除 DDL
* 标记完成状态
* 记录任务标题、截止时间、提交平台和备注
* 将 DDL 与课程关联

### AI 辅助学习探索

项目尝试接入 DeepSeek 文本模型，用于根据课程资料生成结构化课程笔记。同时，项目也探索了GLM图片识别能力在 DDL 信息提取中的应用。

当前 AI 功能仍处于调试优化阶段，主要优化方向包括：

* 提高 Word、PPT、PDF 等资料的文本读取稳定性
* 优化大文件资料处理方式
* 提升 AI 笔记内容的准确性和详细程度
* 优化AI笔记的生成逻辑
* 优化笔记生成选项
* 考虑实现录音相关内容提取与整理
* 考虑整体课程思维导图的生成
* 后续接入 OCR 或分段生成机制，增强图片型资料处理能力

## 技术栈

### 前端

* React
* Vite
* JavaScript
* CSS / Tailwind 风格设计

### 后端

* FastAPI
* SQLAlchemy
* Pydantic
* Uvicorn

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

## 本地运行环境

运行项目前，请先安装：

* Node.js
* npm
* Python 3.10 或以上版本
* Git

推荐使用 VS Code 打开项目。

## 本地运行方式

### 1. 克隆项目

```bash
git clone https://github.com/Jingtine/notewhale.git
cd notewhale
```

### 2. 启动后端

打开第一个终端，进入后端目录：

```bash
cd backend
```

安装 Python 依赖：

```bash
pip install -r requirements.txt
```

启动后端服务：

```bash
python -m uvicorn main:app --reload --port 8000
```

后端启动成功后，可以访问接口文档：

```text
http://localhost:8000/docs
```

### 3. 启动前端

打开第二个终端，进入前端目录：

```bash
cd frontend
```

安装前端依赖：

```bash
npm install
```

启动前端开发服务器：

```bash
npm run dev
```

前端启动成功后，浏览器访问：

```text
http://localhost:5173
```

## 前后端连接说明

本地运行时，前端默认需要连接本地后端：

```text
http://localhost:8000
```

如果项目中使用了环境变量文件，可在 `frontend` 目录下创建 `.env` 文件，并写入：

```text
VITE_API_BASE_URL=http://localhost:8000
```

然后重新运行：

```bash
npm run dev
```

## AI 功能配置说明

如果只体验课程管理、资料上传、笔记编辑和 DDL 管理等基础功能，可以不配置 AI Key。

如果未配置 AI Key，AI 笔记相关功能可能无法正常生成，但不影响课程、资料、笔记和 DDL 等基础功能体验。

## VS Code 运行说明

本地拉取仓库后，可以直接使用 VS Code 试运行项目。

推荐步骤：

1. 使用 VS Code 打开项目根目录 `notewhale`
2. 打开第一个终端，运行后端：

```bash
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000
```

3. 打开第二个终端，运行前端：

```bash
cd frontend
npm install
npm run dev
```

4. 在浏览器访问：

```text
http://localhost:5173
```

如果后端启动正常，还可以访问：

```text
http://localhost:8000/docs
```

## 云端网站使用流程

1. 进入线上系统首页。
2. 注册或登录账号。
3. 在首页新建课程。
4. 使用文件夹对课程进行分类。
5. 点击课程卡片进入课程详情页。
6. 在课程页面上传课程资料。
7. 在笔记区域新建、编辑和保存课程笔记。
8. 在 DDL 页面新建和管理课程任务。
9. 可尝试使用 AI 笔记功能，将课程资料整理为结构化复习笔记。

## 当前完成进度

当前项目已完成：

* 前端主要页面开发
* 后端主要接口开发
* 用户注册与登录
* 登录状态保持
* 多用户数据隔离
* 课程管理
* 文件夹分类管理
* DDL 管理
* 课程资料上传
* 笔记创建与编辑
* 前后端联调
* DeepSeek AI 笔记功能接入尝试
* 图片识别能力在 DDL 信息提取中的探索

## 当前问题与后续计划

当前项目仍有一些需要继续优化的地方：

1. **文件存储稳定性**
   后续计划接入更稳定的文件存储方案，或将资料提取文本持久化保存。

2. **AI 资料读取稳定性**
   不同资料格式的可读取程度不同。可复制文字型资料较容易处理，图片型 PPT 或扫描版 PDF 需要进一步优化。

3. **大文件处理问题**
   对于大型 PPT 或 PDF，直接处理容易超时，后续计划采用分段读取、后台任务或选择页码范围的方式优化。

4. **笔记编辑体验优化**
   后续将继续优化 Markdown 渲染、公式显示、自动保存、目录导航和 PDF 导出等体验。

5. **AI 笔记质量提升**
   后续将继续优化 Prompt、分段生成逻辑和资料解析能力，使 AI 笔记更加详细、准确和贴近课程内容。

## 项目状态

当前版本为中期展示版本，已形成较完整的产品雏形。项目重点展示“课程资料组织—笔记整理—DDL 管理—AI 辅助学习”的核心流程。

后续项目将围绕资料读取能力、AI 笔记质量、文件存储方式和整体交互体验继续优化，使 NoteWhale 从可演示版本进一步发展为更稳定、更实用的智能学习辅助平台。

## License

本项目当前仅用于课程项目、中期展示与学习交流。

## 撰写声明

THE README IS WRITTEN BY JINGTINE LEE.

This is a interim trail version. If you have any question, plaese contact me at 251250208@smail.nju.edu.cn .