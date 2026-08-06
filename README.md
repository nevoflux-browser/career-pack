# career-scan —— 模块设计与代码说明（开发者文档）

> 配合 `components/canvas-app/src/scan/` 下的源码阅读。本文解释**为什么这样设计**、
> **代码怎么组织**、**如何扩展**，以及**对接平台时需要校准的假设**。
>
> 一句话定位：`career-scan` 是**运行在 Canvas 仪表盘内的纯前端扫描模块**。它通过
> `NevofluxSDK.callTool(...)` 直接驱动浏览器，**全程不经过 LLM/agent，所以零 token**。

---

## 1. 设计动机

### 1.1 为什么放在仪表盘里，而不是做成 agent 技能

`callTool` 是 Canvas iframe 到 daemon 的**直接派发**：调用返回 `{success, result, error}`
给仪表盘的 JS，模型从头到尾看不到数据。只有 `agent.chat()` 才把内容送进 LLM 上下文。

因此扫描这件事——逐家公司抓 JSON / 渲染页面、解析、过滤、去重——如果交给 agent 逐步做，
每家公司的原始数据都会流经 LLM，token 昂贵且慢。把它放在仪表盘 JS 里用 `callTool`，
就得到了"确定性运行时 + 直接浏览器访问 + 零 token"，无需任何额外脚本或 canvas-tool。

### 1.2 两条抓取路径，一个统一接口

| 路径 | 用途 | 代价 | 代表 provider |
|---|---|---|---|
| **API**（`kind:'api'`） | ATS 厂商的公开免鉴权 JSON 接口 | 零 token、无渲染、最快最稳 | greenhouse / ashby / lever |
| **会话**（`kind:'session'`） | 无公开 API 的站点，用**用户真实登录会话**打开页面再抽取 | 零 token（callTool），但要渲染、有选择器腐烂风险 | linkedin / genericSession |

真实会话正是 nevoflux 相对 headless 抓取器（如 career-ops 的标准 Playwright，会被识别）
的核心优势：用的是用户自己已登录的浏览器，能读登录/区域门控的岗位，且不是"伪装机器人"。

---

## 2. 架构总览

```
              ┌─────────────────────────────────────────────┐
 dashboard ──▶│  scanAll(config, ctx)        scan.ts         │  编排：串行+节流跑各 provider，
              │     │                                         │  过滤→去重→回短名单
              │     ├─ resolveProvider(entry)  providers/index.ts
              │     │      ├─ greenhouse/ashby/lever  providers/ats.ts      （API）
              │     │      ├─ linkedin               providers/linkedin.ts （会话，真实登录）
              │     │      └─ genericSession         providers/genericSession.ts（会话，配置驱动）
              │     │            │
              │     │            ▼  provider.fetch(entry, ctx)
              │     ├─ ScanContext              context.ts   │  唯一接触 callTool 的地方
              │     │      fetchJson/navigate/evalJs/getMarkdown/listTabs…
              │     └─ passesTitle/passesLocation/dedup  filters.ts（纯函数）
              └─────────────────────────────────────────────┘
                         │ callTool（零 token）        │ storage（scan-history）
                         ▼                              ▼
                  浏览器 / 公共 API                NevofluxSDK.storage
```

**分层职责**
- `scan.ts`：唯一入口 `scanAll`。负责遍历配置、串行调度（浏览器是串行资源，绝不并发）、
  节流、应用过滤与去重、维护 scan-history、返回 `ScanResult`。
- `providers/*`：每个站点/ATS 一个 `Provider`，只管"从一个 entry 产出归一化 `Job[]`"。
- `context.ts`：`ScanContext` 把 `callTool` 封成有类型的 helper，**provider 不直接碰 SDK**——
  便于测试，也把"callTool 返回形状"的假设收敛到一处。
- `filters.ts`：标题/地点过滤、去重/重发检测，全是纯函数，易测。
- `types.ts`：所有契约 + `window.NevofluxSDK` 的 ambient 声明。

---

## 3. 核心契约

### 3.1 `Job`（归一化货币）

每个 provider 都把各自源的字段映射成统一的 `Job`：

```ts
interface Job {
  id: string;        // 去重键：源内 id 优先（如 "gh:123"），否则用 URL
  title: string; url: string; company: string; location: string;
  postedAt?: string; // ISO 或 "x days ago" 原文（源提供时）
  source: string;    // 产出它的 provider id
  repost?: boolean;  // 去重时发现同公司+同标题在新 URL 复现时置位
}
```

### 3.2 `Provider`（扩展点）

```ts
interface Provider {
  id: string;
  kind: "api" | "session";
  detect(entry: PortalEntry): boolean;            // 自动路由：能否处理该 entry
  fetch(entry: PortalEntry, ctx: ScanContext): Promise<Job[]>;  // 抛错=该 entry 失败，扫描继续
}
```

约束：`detect` 不得抛致命错误（registry 会 try/catch 跳过）；`fetch` 抛错只让**这一个**
entry 失败并记进 `stats.failed`，不影响其余。

### 3.3 `ScanContext`（能力面）

provider 只能用 `ctx` 提供的能力，全部最终落到 `callTool`：

| 方法 | 底层 callTool 动作 | 说明 |
|---|---|---|
| `fetchJson<T>(url)` / `fetchText(url)` | `web_fetch {url}` | API 路径主力，零 token |
| `navigate(url, newTab?)` | `navigate {url, new_tab}` | 会话路径开页；返回 `{tabId}` |
| `evalJs<T>(code)` | `eval_js {code}` | 在页面里跑自包含表达式取数（会话抽取核心） |
| `getMarkdown()` | `get_markdown` | 备用：整页转 markdown |
| `listTabs/activateTab/closeTab` | `list_tabs/activateTab/close_tab` | 多 tab 管理 |
| `wait(ms)` | — | 礼貌等待/渲染等待 |
| `log(level,msg)` | — | 透传到仪表盘 UI 的日志 |

### 3.4 `PortalConfig` / `PortalEntry`（输入）

```ts
interface PortalConfig {
  title_filter: { positive: string[]; negative?: string[] };
  location_filter?: { always_allow?: string[]; allow?: string[]; block?: string[] };
  tracked_companies: PortalEntry[];
  throttle_ms?: number;  // 默认 800：每次网络动作/开 tab 之间的礼貌间隔
  max_jobs?: number;     // 默认 300：单次扫描硬上限，保持轻量
}
interface PortalEntry {
  name: string;
  careers_url?: string;  // 优先品牌 careers URL；ATS 托管 URL 作 fallback
  api?: string;          // 显式 API 端点，覆盖 slug 自动推导
  provider?: string;     // 强制指定 provider，跳过 detect()
  extract?: SessionExtractConfig;  // genericSession 用：选择器/JSON-LD 配置
  search?: LinkedInSearch;         // linkedin 用：搜索参数
  enabled?: boolean;
}
```

配置来源：建议存在用户的 GBrain `career/profile` 的 `## Portals` 段；仪表盘启动时用一次
`agent.chat` 拉取并解析成 `PortalConfig`（这一次读取是少量 token），之后扫描全程零 token。

---

## 4. 一次扫描的完整时序

1. `scanAll(config, ctx)` 遍历 `tracked_companies`（跳过 `enabled:false`）。
2. 对每个 entry：`resolveProvider(entry)` 解析 provider（顺序见 §5.1）。
3. `provider.fetch(entry, ctx)` 产出 `Job[]`；失败记入 `stats.failed` 并继续。
4. 每个 entry 之间 `ctx.wait(throttle_ms)`；累计达到 `max_jobs` 提前停止。
5. 过滤：先 `passesTitle` 再 `passesLocation`。
6. 去重：`dedup(filtered, seenIds, seenTitles)` → `{fresh, reposts}`；`seen*` 从
   `NevofluxSDK.storage` 加载（key：`career:scan:seen-ids` / `:seen-titles`）。
7. 把本次见到的全部并入 history 存回 storage。
8. 返回 `ScanResult { fresh, reposts, stats }`。仪表盘渲染 `fresh`，按需持久化（§7）。

---

## 5. Provider 目录与扩展

### 5.1 解析顺序（首个命中胜）

`resolveProvider`：显式 `entry.provider` → API providers（按 URL `detect`）→ dedicated
session（linkedin）→ genericSession 兜底。理由：API 最便宜最稳，优先；兜底放最后。

### 5.2 已实现的 provider

| id | kind | 端点 / 方式 |
|---|---|---|
| greenhouse | api | 从 `job-boards(.eu)?.greenhouse.io/<slug>` 或 `api:` 推出 `boards-api.greenhouse.io/v1/boards/<slug>/jobs` |
| ashby | api | 从 `jobs.ashbyhq.com/<slug>` 推出 `api.ashbyhq.com/posting-api/job-board/<slug>?includeCompensation=true`（注意其 ~10s+ 服务端延迟） |
| lever | api | 从 `jobs.lever.co/<slug>` 推出 `api.lever.co/v0/postings/<slug>` |
| linkedin | session | 真实登录会话打开 jobs 搜索页，`eval_js` 抽取（详见 §8 合规） |
| session | session | 通用兜底：JSON-LD 优先，选择器其次，配置驱动 |

### 5.3 如何加一个新站点

**A. 有公开 API 的 ATS（如 Workday、SmartRecruiters）—— 写个 api provider**

```ts
// providers/smartrecruiters.ts
import type { Provider, PortalEntry, Job } from "../types.js";
const HOST = /jobs\.smartrecruiters\.com\/([^/?#]+)/;
const apiUrl = (e: PortalEntry) =>
  e.api ?? (e.careers_url?.match(HOST) ? `https://api.smartrecruiters.com/v1/companies/${RegExp.$1}/postings` : null);
export const smartrecruiters: Provider = {
  id: "smartrecruiters", kind: "api",
  detect: (e) => apiUrl(e) !== null,
  async fetch(entry, ctx) {
    const json = await ctx.fetchJson<{ content?: any[] }>(apiUrl(entry)!);
    return (json.content ?? []).map<Job>((j) => ({
      id: `sr:${j.id}`, title: j.name, url: j.ref ?? j.applyUrl, company: entry.name,
      location: j.location?.city ?? "", source: "smartrecruiters",
    }));
  },
};
```
然后在 `providers/index.ts` 的 `API_PROVIDERS` 数组里加上它。

**B. 普通 SSR/SPA 招聘页 —— 零代码**，加一条配置即可：

```yaml
- name: Acme
  careers_url: https://acme.com/careers
  extract:
    prefer_json_ld: true            # 多数现代招聘页内嵌 schema.org JobPosting
    # 没有 JSON-LD 时再回退选择器：
    card_selector: ".job-list .job"
    title_selector: ".job-title"
    link_selector: "a"
    location_selector: ".job-loc"
    pagination: { kind: "param", param: "page", pages: 3 }
```

**C. 需登录/复杂的站点（如 Indeed）—— 写个 dedicated session provider**，仿 `linkedin.ts`：
用 `ctx.navigate(url, true)` 在真实会话开页、`ctx.evalJs` 抽取、限页限速、`finally` 关 tab，
并加上合规说明（见 §8）。加入 `SESSION_PROVIDERS`。

---

## 6. 选择器腐烂与维护策略

会话路径的最大维护负担是 DOM 改版。代码里已做三件事降低频率：

1. **优先结构化数据**：`genericSession` 默认 `prefer_json_ld`，读 `<script type="application/ld+json">`
   里的 `JobPosting`——这是 schema.org 标准，比 CSS 类名稳得多。
2. **锚定稳定信号**：`linkedin` 抽取以 `/jobs/view/<id>` 链接为锚（这个 URL 形状极少变），
   再向上找容器、用多重 fallback 读公司/地点，而不是死磕某个 class。
3. **选择器集中、显眼**：所有选择器放在文件顶部的 `SELECTORS` / `extract` 配置里，
   改版时一行热修，无需动逻辑。

---

## 7. 数据与持久化

- **scan-history** 存 `NevofluxSDK.storage`（仪表盘本地、零 token），用于去重与重发检测。
- **写进 GBrain tracker（`career/applications`）需要 agent**——`brain_*` 是 agent 工具，
  不在 `callTool` 的浏览器动作面里。两种干净落法（见 `scan.ts` 头部注释）：
  1. 扫描结果先留在仪表盘/storage，**用户点"评估"时**由那条 agent 链顺带把该行写进 tracker；
  2. 扫完一次 `agent.chat("把这些 inbox 行 append 到 career/applications：<json>")`，
     只把**已筛好的紧凑短名单**交给 LLM，单次便宜调用。
- 绝不在 Canvas 里另存一份业务数据副本（避免双源）。

---

## 8. 合规（LinkedIn 必读）

`providers/linkedin.ts` 顶部有 `COMPLIANCE_NOTICE` 与详细说明。要点：

- LinkedIn ToS 限制自动化数据采集。本 provider 因此：**默认不启用**（用户需显式加 linkedin
  条目）、**只读**、**人工触发**（用户点扫描才跑）、**限速限页**（硬上限 5 页、逐页节流）、
  **零凭据**（复用已登录会话，绝不登录、不碰密码）。
- nevoflux 的真实会话模型与 headless 抓取本质不同（是用户自己的浏览器，不是伪装 bot），
  但**这不等于 ToS 干净**——启用前应向用户弹 `COMPLIANCE_NOTICE`，由用户自负其责。
- career-ops 明确没做 LinkedIn（issue #238 未落地）。我们做了，但把警告写得诚实。
- 商标/版权：方法学与 ATS 端点是公开事实，可用；但不要以 "career-ops" 名义发布、不要照搬其文案。

---

## 9. 错误处理与韧性

- **单 entry 失败不中断**：`fetch` 抛错只记 `stats.failed`，其余继续。
- **串行 + 节流**：浏览器是串行资源，绝不并发 `callTool` 浏览器动作；`throttle_ms` 控间隔。
- **上限保护**：`max_jobs` 防止一次扫太多；会话 provider 翻页有硬上限。
- **空结果即停**：会话抽取拿到 0 条会 `log('warn')` 并停翻页（多半是选择器变了或未登录）。
- **callTool 返回形状假设**：集中在 `context.ts`（`asText` + 解析逻辑）。动作名/参数已核对
  `app/SKILL.md`，但 `result` 的具体结构是假设；与真实不符时**只改 `context.ts` 一处**。

---

## 10. 测试策略

- **纯函数直接测**：`passesTitle` / `passesLocation` / `dedup` 无副作用，给输入断言输出即可。
- **provider 用 mock ScanContext 测**：注入假的 `fetchJson` / `evalJs` 返回固定数据，断言归一化结果。

```ts
import { greenhouse } from "./providers/ats.js";
const fakeCtx = {
  fetchJson: async () => ({ jobs: [{ id: 1, title: "AI Eng", absolute_url: "https://x/y", location: { name: "Remote" } }] }),
  // 其余方法测 greenhouse 用不到，按需补 stub
} as any;
const jobs = await greenhouse.fetch({ name: "Acme", api: "https://boards-api.greenhouse.io/v1/boards/acme/jobs" }, fakeCtx);
// expect jobs[0].title === "AI Eng" && jobs[0].source === "greenhouse"
```

- **类型即测试**：`tsc --noEmit` 已纳入；`allowed_tools` 等与平台的契合靠 lint（包级）。

---

## 11. 与仪表盘的对接

```ts
import { scanAll, makeScanContext, type PortalConfig } from "./scan/scan.js";

async function runScan(config: PortalConfig, onLog: (l: string, m: string) => void) {
  const ctx = makeScanContext(onLog);
  const res = await scanAll(config, ctx);
  // res.fresh -> 渲染到 pipeline 表格的 inbox；res.stats -> 顶部摘要；res.stats.failed -> 提示
  return res;
}
```

启用 LinkedIn 前，先 `confirm(COMPLIANCE_NOTICE)`（从 `providers/linkedin.ts` 导出）。

---

## 12. 文件索引

| 文件 | 职责 |
|---|---|
| `scan.ts` | 编排入口 `scanAll` + history 持久化 + 再导出 |
| `types.ts` | 全部契约 + `NevofluxSDK` ambient |
| `context.ts` | `ScanContext`：callTool 封装 + 返回形状假设（**对接时改这里**） |
| `filters.ts` | 标题/地点过滤、去重/重发（纯函数） |
| `providers/ats.ts` | greenhouse / ashby / lever（API，零 token） |
| `providers/linkedin.ts` | LinkedIn（真实会话 + 合规护栏） |
| `providers/genericSession.ts` | 通用会话兜底（JSON-LD/选择器，配置驱动） |
| `providers/index.ts` | 注册表 + `resolveProvider`（**加新站点改这里**） |
