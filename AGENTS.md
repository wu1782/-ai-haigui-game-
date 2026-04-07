
# 🧩 AI 海龟汤 (Lateral Thinking) 核心开发规约 v1.0

## 1. 项目愿景 (Project Overview)
构建一个基于 **React 18 + TypeScript + Tailwind CSS** 的沉浸式 AI 推理平台。利用 LLM 作为“上帝视角”裁判，玩家通过自然语言提问，在限制性逻辑推理中解开悬疑故事真相。

---

## 2. 技术架构与规范 (Technical Standard)

### 2.1 核心开发准则
* **全量类型覆盖**：所有 Data Models、API Responses、UI Props 必须定义 `interface` 或 `type`，严禁使用 `any`。
* **状态驱动架构**：UI 必须是状态的纯函数，核心逻辑建议提取至 `useGameEngine` 自定义 Hook。
* **原子化组件**：遵循 Atomic Design 原则，确保 `Button`, `Modal`, `Loading` 等组件的高度可复用性。
* **异步处理标准**：所有 API 请求需具备 `loading`, `error`, `data` 三态处理，并实现超时或中断机制。

### 2.2 代码风格定义 (Naming Convention)
* **组件命名**：PascalCase (例: `GameRoom.tsx`)。
* **函数命名**：camelCase (例: `submitInquiry`)。
* **常量命名**：UPPER_SNAKE_CASE (例: `AI_RESPONSE_LIMIT`)。
* **类型/枚举**：类型以 `T` 开头 (例: `TStorySchema`)，枚举以 `E` 开头 (例: `EGameStatus`)。

---

## 3. UI/UX 视觉与交互 (Design Requirements)

### 3.1 视觉风格：沉浸式暗黑悬疑
| 元素 | 规范 |
| :--- | :--- |
| **主背景** | `bg-slate-900` |
| **辅助背景** | `bg-slate-950` (区分输入与展示区) |
| **强调色** | 金色 `text-amber-400` (关键信息/目标) |
| **容器约束** | `max-w-4xl`, `rounded-lg`, `shadow-lg` |

### 3.2 交互规范
* **消息流**：聊天列表需支持 `Auto-scroll to bottom`。
* **视觉反馈**：AI 响应需实现 **Stream Typewriter Effect** (流式打字机视觉)。
* **移动端适配**：使用 `h-screen` 或 `svh` 防止工具栏遮挡；输入框随键盘弹出自动上浮。

---

## 4. AI 裁判逻辑 (AI Arbiter Logic)

### 4.1 提示词工程 (Prompt Engineering)
* **防幻觉机制**：MVP 阶段聚焦 Prompt 准确性，严禁 AI 产生幻觉或提前泄露汤底。
* **强约束输出**：要求 AI 严格返回 JSON 格式：
    ```json
    {
      "answer": "是 / 不是 / 无关",
      "is_victory": boolean
    }
    ```

### 4.2 安全与稳定性
* **环境变量**：必须通过 `.env.local` 管理 `VITE_AI_API_ENDPOINT` 与 `VITE_API_KEY`。
* **身份锚定**：在长对话（10次+提问）后需通过回归测试，确保 AI 不脱离裁判身份。

---

## 5. 测试与质量保证 (QA)
* **响应式覆盖**：从 iPhone SE (375px) 到 2K Monitor (2560px) 的断点显示测试。
* **单元测试**：重点覆盖 `utils/parser.ts` (解析器) 与 `hooks/useGameLogic.ts`。
* **鲁棒性压力测试**：模拟空白输入、超长文本、SQL 注入尝试等极端场景。
* **Prompt 回归测试**：：确保 AI 在 10 次以上提问后，依然能维持初始设定的裁判身份，不被玩家话术“绕晕”。