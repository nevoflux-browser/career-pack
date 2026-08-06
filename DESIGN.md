# nevoflux-career-pack —— 完整设计方案（v2）

> 一个按 `pack-protocol/0.1` 打包的开源 nevoflux 扩展包，把通用 AI Native 浏览器变成一个
> **带记忆的求职大脑**：感知岗位与公司动态、记住每家公司的完整历史、判断"投不投、为什么
> 是现在、用什么打法"、基于真实触发信号起草、并从结果中持续学习。
>
> 本版合并三个来源：原 DESIGN.md（career-ops 模式参考 + 平台事实核对）、DESIGN-supplement.md
> （产品哲学与卖点），以及一轮以"感知-记忆-判断-行动-学习"五环循环为组织框架的重设计决议。
>
> 文档约定：与平台源码/协议核对过的事实直接陈述；设计决策标 *[设计]*；借鉴来源处标注出处。
> 安装协议以 `pack-development.md`（pack-protocol/0.1）为准，**本包不写任何安装器代码**。

---

## 1. 整体功能描述

### 1.1 它是什么

nevoflux 本身是 AI Native 浏览器：前端通过 native messaging 与 Rust 守护进程
`nevoflux-agent` 通信，agent 借 LLM 与一组工具实现对话、browser-use、computer-use，
并自带技能系统、GBrain 知识库、Canvas Micro Apps、/loop 调度。

**本项目不造新运行时、不写安装器**。它是一个标准 nevoflux pack：技能 + conventions、
一个 PDF canvas-tool、种子模板页、一个 Canvas 仪表盘，全部由一份 `pack.toml` 声明，
由平台的 pack 引擎负责事务性安装、receipt、回滚与"绝不默认删用户数据"的干净卸载。

### 1.2 解决什么

求职是高频、多步、状态零散的工作流：找岗、判断值不值得投、按岗定制简历、写申请回答、
追踪进度、按时跟进。

### 1.3 求职大脑：五环循环 *[本版新增核心模型]*

用五环循环组织全部功能。出发点是一个朴素观察：求职真正困难的不是"投递"这个动作，
而是围绕投递的**判断力**——投哪家、为什么是这周、说什么能证明你注意到了他们。
一个只优化投递速度的系统对此毫无帮助。

| 环 | 职责 | 本包承载 | 关键设计 |
|---|---|---|---|
| **Sense 感知** | 发现"刚刚有动态"的公司与岗位 | `career-scan`（零 token 前端模块）+ `career-deep` | 入口处**按公司聚簇**；四桶信号分型 |
| **Remember 记忆** | 每家公司一条完整记录：信号、接触、结果 | `career/companies/{slug}` + GBrain timeline | judge 评分前**必读** history |
| **Judge 判断** | 投不投 × 为什么是现在 × 用什么打法 | `career-evaluate` 的 verdict header | fit（A–G）与时机（why_now/play）**双轴** |
| **Act 行动** | 基于真实触发信号起草，自动投敌 | `career-pdf` / `career-apply` / `career-contacto` | 
| **Learn 学习** | 从结果回灌，提议下一步怎么调 | `career-patterns` + /loop 周报 | outcome 三入口回灌；**提议制**，不自动调权 |

这类系统最常见的两个失败模式，本设计逐一封堵：
- **没有历史的评分只是猜测**——冷启动评分对追过两次的公司和从未接触的公司一视同仁 →
  Remember 层是地基，evaluate 第 0 步强制读公司 timeline；
- **只记动作不记结果**——结果数据缺位则学习环永远空转 → outcome 设三个回灌入口（§7.3），
  Learn 环才有原料。

与销售/增长场景的同构系统相比的诚实差异 *[设计]*：求职者的公司池子小且明确
（季度几十个申请 vs 每日数百信号），
所以 ① 三桶非岗位信号采**机会性采集**而非全市场爬虫（§5.1 scan / §5.2 deep）；
② 不采纳自动调权——样本量撑不起统计显著性，且违反人在回路，改为**提议 + 人确认**；
③ 本包没有"发送"环节可言，比 dry-run 更强：**永不替用户提交任何东西**。

### 1.4 设计哲学

1. **带记忆的判断**：评分必须在公司历史语境下做。投过被拒的公司和从未接触的公司，verdict 完全不同。
2. **GBrain 为唯一事实来源**：技能只 append、不破坏性改写；仪表盘只读，写经由 agent 单点。
3. **单点配置**：门户清单、写作风格、archetype 集中在 `career/profile`；评分与写作规则集中在两个可调优 convention 文件（§6）。
4. **评分透明、可审计、可覆盖**（采纳 career-ops 方法学）：六维 rubric 公开；每个分数附 CV/JD 引用；统计数字附来源行引用；用户可不同意并覆盖。
5. **可干净卸载**：由平台 pack 引擎按 receipt 精确反向，绝不默认碰用户数据。
6. **明确不做什么也是承诺**（采纳 career-ops anti-features）：不自动投递、不编造经历或指标、不修改用户 CV、不在生成消息里放电话、不推荐低于市场的薪资、不做反爬指纹伪装、不卖用户数据。

### 1.5 卖点与差异化

1. **零搭建上手**：`nevoflux pack install` 一条命令或 Settings → Packs 界面安装；不用终端栈、不用 clone、不用 Node/Playwright。
2. **带记忆的判断层**：每家公司一条完整历史（信号/接触/结果），第二次相遇时 verdict 不同——**career-ops 没有这一层**，这是本包独有的真实优势。
3. **fit × 时机双轴评估**：不止"匹不匹配"，还回答"为什么是现在"（why_now）和"用什么打法"（play）。
4. **用你真实的浏览器会话扫门户**：少被反爬，能读登录/区域门控岗位；Greenhouse/Ashby/Lever 走公共 API 零 token。
6. **评分透明可审计**：六维 rubric 公开，每个分数附引用，可覆盖。
7. **浏览器内可视化指挥中心**：Canvas 仪表盘，按 play 分组的行动队列、逐行触发、实时进度、一键标记结果。
8. **你的数据在你机器上**：GBrain 本地知识库；配合 nevoflux 本地推理 + 隐私路由可更彻底本地优先。
9. **从结果中学习**：周报 loop 复盘漏斗与转化，提议（不强加）调整。
10. **干净可卸载**：平台级事务安装/卸载，绝不动你的求职数据。开源 MIT。

**与 career-ops 的差异化对照（诚实版）**

| 维度 | career-ops（参考站事实） | nevoflux-career-pack |
|---|---|---|
| 运行环境 | AI CLI + Node18 + Git + clone + npm + playwright | 装进已有 nevoflux；`pack install` 或设置界面 |
| 目标用户 | 能用终端的人 | 非技术终端用户 |
| 记忆层 | tracker 行（per-application） | **公司级 account record + timeline（per-company 全历史）** |
| 判断层 | 六维 fit 评分 | 同款 fit 六维 **+ 时机轴（why_now / play）+ history 规则** |
| 学习层 | 无闭环 | 周报 loop + outcome 回灌 + 提议制调整 |
| 扫描 | 三大 ATS 公共 API 零 token；其余标准 Playwright（会被识别） | 同款公共 API **+ 用户真实登录会话兜底**；入口处按公司聚簇 |
| 仪表盘 | Go 终端 TUI | 浏览器内 Canvas GUI，play 行动队列 |
| 数据层 | 本地 markdown 文件 | GBrain 知识图（backlink/timeline/search/版本） |
| 安装/卸载 | git clone + 自行维护 | 平台 pack 引擎：事务、receipt、一键干净卸载 |
| 评分方法 / anti-features | 六维 rubric / 阈值 / 自动投递 | **直接采用同一方法学**，已编码进 conventions |

与 SaaS 求职工具（Jobscan/Teal/Huntr 等）的对照沿用 career-ops 立场：那些是云端闭源
月费产品，简历与岗位数据上传到对方服务器；本包开源、本地运行、评分 rubric 公开。

---

## 2. 系统架构

### 2.1 五环到 nevoflux 原语的映射

| 角色 | 承载 | 职责 |
|---|---|---|
| 大脑（Judge/Learn） | **skills + conventions**（markdown + YAML frontmatter） | 流程、verdict 规则、写作规范、安全不变量 |
| 手（Sense/Act） | **browser-use**（`browser_*`，用户真实会话）+ 仪表盘 scan 模块（`callTool` 零 token） | 读/操作招聘门户与申请表 |
| 记忆（Remember） | **GBrain**（`brain_*`：页面 + timeline + backlink + tag + 版本） | 公司记录、tracker、报告、CV、故事库 |
| 脸 | **Canvas Micro App**（持久 artifact + `NevofluxSDK`） | 聚簇 inbox、play 行动队列、触发、标记结果、导出 |
| 节律（Learn/跟进） | **/loop**（`crates/daemon/src/loops/`，已核对存在） | followup 日检、patterns 周报 |
| 交付 | **pack-protocol/0.1**（平台 pack 引擎） | validate / install / uninstall / update / receipt |

### 2.2 数据流主线

```
扫描（仪表盘 callTool，零 token）──▶ 按公司聚簇的 inbox 短名单
        │ 用户点"评估" / 贴 JD
        ▼
   career-evaluate（agent 内执行，tracker 行唯一串行写者）
        │  Step0  brain_get_timeline companies/{slug}     （读公司 history，冷启动则空）
        │         brain_add_timeline_entry signal:job …   （本次信号入册，含聚簇数）
        │  Step1  brain_get_page  career/cv|profile        （读事实来源）
        │  Step2  browser_* / fetch_page / web_search      （取 JD + 新鲜度/comp 信号）
        │         （撞见融资/裁员等 → 顺带写 signal:* 进公司 timeline）
        │  Step3  A–G fit 评分 + verdict header(why_now/play)（在 history 语境下）
        │  Step4  brain_put_page reports/* + brain_add_link/tag
        │  Step5  串行 append 一行 tracker（含 play 列）
        ▼
   GBrain（单一事实来源：tracker + 公司记录 + 报告）
        ▲                                   │
        │ 标记结果按钮 / followup 对话回灌    │ agent.chat("转 JSON")
        │ → touch / outcome 事件入 timeline   ▼
   Canvas 仪表盘（Extension 身份，仅 ui:* + callTool）
        ▲
        │ /loop 周报：career-patterns 读 tracker+timeline → 写 pattern-analysis → 提议调整
```

### 2.3 决定一切的平台事实（已核对源码与协议）

- **pack-protocol/0.1 已在 daemon 落地**：`crates/pack/`（manifest/capability/receipt/lifecycle）
  与 `crates/daemon/src/pack/rpc.rs`。本包**只写声明 + 文件**，安装由平台执行。
- **技能发现只扫一层**：`{skills}/<name>.md` 或 `{skills}/<name>/SKILL.md`，不递归
  → 打包拍平为一层目录。
- **frontmatter 的 `dependencies` 字段是装饰性的**（协议明示 loader 不处理）→ 共享规则
  一律靠 host skill + `skill_read` 运行时读取（§6）。
- **`allowed-tools` 必须用 daemon 真实工具名**，不命中会**静默忽略** → 包级 lint 必查。
  浏览器 `browser_*`；agent 侧网页抓取是 `fetch_page`（不是 `web_fetch`）；GBrain 是
  `brain_get_page`/`brain_put_page`/`brain_search`/`brain_add_link`/`brain_add_tag`/
  `brain_add_timeline_entry`/`brain_get_timeline`/`brain_get_backlinks`…（已对照
  daemon 内置的 `gbrain-tools.json` 快照核实，timeline 读写签名见 §4.2）。
- **canvas-tool 是白名单 TOML**，复制进 `{config}/canvas-tools/` 按需 rescan 生效；
  args 模板占位符是**双大括号** `{{input}}`/`{{output}}`（协议 §4.2 示例为准；单大括号是
  已知文档陈旧写法，executor 只认双括号）。
- **Canvas 是 Extension 身份**：只能 pub/sub `ui:*` + `callTool` 浏览器动作面；拿不到
  `brain_*`，读写 GBrain 必须经 `agent.chat`。
- **/loop 已具备**：`loops/` 含 expression/combinator/scheduler，支持 time/event 触发。
  pack-protocol/0.1 **没有** `[components.loops]` 组件 → loop 由技能在运行时引导创建（§5.3）。
- **`[components.config]` 被协议禁止**；`[components.knowledge]` 未支持
  （`KNOWLEDGE_UNSUPPORTED`）→ 启动内容全部走 `[[components.seed]]`。

---

## 3. 实现技术栈

| 层 / 部件 | 选型 | 理由 |
|---|---|---|
| **打包/安装** | `pack.toml`（pack-protocol/0.1），平台 pack 引擎执行 | **零安装器代码**；事务、receipt、回滚、数据保护全部平台兜底 |
| **技能 / 契约** | Markdown + YAML frontmatter | nevoflux 原生格式 |
| **数据层** | GBrain（页面 + timeline + 标签 + 链接 + 版本） | 平台内置；公司记录天然用 timeline；可回滚 |
| **浏览器自动化** | nevoflux browser-use（`browser_*`）+ 仪表盘 `callTool` | 用户真实会话；扫描路径零 token |
| **PDF 工具** | canvas-tool TOML：`kind="command"`, `binary="weasyprint"`，path 参数锁 `$SESSION_DIR` | 原生白名单机制；`external_binaries` 由 `pack status` 探活 |
| **PDF 渲染** | weasyprint（HTML/CSS→PDF）；latexmk 可选高保真 | 决策已定 |
| **仪表盘** | React + TypeScript + Vite + Tailwind，预构建为 `dist/`，由 `[components.dashboard]` 装为持久 artifact | upsert by `artifact_id`，幂等 |
| **图表** | recharts（Canvas 已 vendored） | 漏斗/转化可视化 |
| **调度** | nevoflux 内置 /loop | followup 日检、patterns 周报 |
| **种子数据** | `[[components.seed]]`（only-if-absent，必须被 protected 覆盖） | 协议保证不覆写用户编辑 |
| **生态兼容** | `.claude-plugin/marketplace.json` | 附赠 Claude Code 安装路径（可选） |
| **测试** | `nevoflux pack validate` + skill-lint（allowed-tools 命中 registry）+ 沙箱往返 + provider mock 测试 | 协议 §9 流程 |
| **主语言** | TypeScript（仪表盘）、Markdown（技能/契约）、TOML（清单+工具） | 单一主语言降低贡献门槛 |

---

## 4. 数据契约（GBrain）

所有状态在 `career/` 命名空间下（`pack.toml` 的 `namespace = "career"`），无文件副本、
无 Canvas 内重复。

### 4.1 页面命名空间与写入纪律

| Slug | 层 | 内容 | 纪律 |
|---|---|---|---|
| `career/cv` | user | 用户 CV | 只读 |
| `career/profile` | user | archetypes、叙事、谈判框架、`## Portals`、缓存 `## Writing Style` | 只读；仅写作技能可改 `## Writing Style` 段；patterns 提议经确认后可改过滤/阈值段 |
| `career/article-digest` | user | 详细 proof points（指标以此为准） | 只读 |
| `career/applications` | user | tracker 主表（单一事实来源） | **仅 append 行；串行单写者**；终态时允许回填 `outcome`/`pdf`/`status` 单元格 |
| `career/scan-history` | system | 扫描历史（去重/重发检测，仪表盘 storage 为主、此页为可选导出） | append |
| `career/story-bank` | user | 累积 STAR+R 故事 | append + 去重 |
| `career/reports/{###}-{company}-{date}` | user | 单次评估报告（verdict header + A–G + H 答题区） | 一次写；后续仅追加 `## H)` 段 |
| `career/companies/{company-slug}` | user | **公司唯一记录**：研究简报正文 + timeline 事件流 | 正文增量更新；事件只经 `brain_add_timeline_entry` |
| `career/reports/pattern-analysis-{date}` | user | 周报（Learn 环产物） | 一次写 |

**tracker 行 schema**（v2，+`play` +`outcome`）：

```
date | company | role | url | archetype | score | play | legitimacy | report | pdf | status | outcome | followup_due
```

- `status` ∈ `inbox → evaluated → applied → interview → closed`（流转不变）
- `play` ∈ `apply_now | tailor_first | network_first | wait | skip`（verdict 产出，§5.1）
- `outcome` 仅终态填：`offer | rejected | ghosted | withdrawn`；过程性事件（replied 等）
  记公司 timeline，不占 tracker 列

> tracker 是一个 GBrain markdown 页（正文一张表，每申请一行），不是数据库表。底层
> 物理存储是 daemon 的页面存储，对技能与用户而言就是可读可编辑的文档。

### 4.2 公司记录与时间线（Remember 层）*[本版新增]*

`career/companies/{slug}` 升级为**每公司一条记录**，
两部分：

1. **页面正文**：研究简报（六轴：AI 战略 / 近期动作 / 工程文化 / 挑战 / 竞品 / 切入点），
   由 `career-deep` 与 evaluate Block D/G 增量维护——即原"研究缓存"职责，保留。
2. **timeline 事件流**：signal / touch / outcome 三类事件，经
   `brain_add_timeline_entry(slug, date, summary, detail, source)` 追加，
   `brain_get_timeline(slug)` 一次拉全——judge 需要的正是"一次调用拿到该公司完整故事"
   的读取形状（工具签名已对照 daemon 的 gbrain 工具快照核实）。

**事件类型编码**（`source` 字段，写进 `conventions/data.md`）：

```
signal:job | signal:funding | signal:company | signal:people
touch:applied | touch:followup | touch:networking
outcome:replied | outcome:interview | outcome:offer | outcome:rejected | outcome:ghosted
```

**写入纪律**：所有 timeline 写入都由 agent 技能执行（evaluate / deep / followup /
仪表盘"标记结果"经 agent.chat），仪表盘永不直写。岗位级 signal **不在扫描时逐条写入**
（一次扫描上百岗会把 timeline 变成噪音场），延迟到该公司首次被评估时由 evaluate 写入
（§5.1）。

### 4.3 append / 串行纪律 *[设计]*

GBrain 无原子追加，append = `brain_get_page` → 内存拼接 → `brain_put_page`，并发会丢写。
约束：① `career/applications` 任一时刻仅一个写者（evaluate 或受 agent 委托的单点）；
② 批处理 worker 只写各自 `reports/*`，由编排技能串行汇总并表；③ 扫描单会话串行，自行去重；
④ timeline 追加是 gbrain 原生操作、按页隔离，不受此页级约束影响，但同一公司页仍建议
单技能会话内串行写。

### 4.4 图关联

写报告后 `brain_add_link` 报告→`companies/*`、报告→申请；`brain_add_tag` 打
archetype/状态/play；仪表盘与 patterns 用 `brain_get_backlinks` 反查
"这家公司评过哪些岗位"。

---
## 5. 技能集（功能 + 操作）

格式：触发 → 输入 → 工具 → 步骤 → 产出。所有技能第一步 `skill_read('career','conventions/rules.md')`。

### 5.1 核心环技能

**`career-scan`（Sense · 仪表盘内零 token 扫描模块 + 技能入口）**
- 形态：主体是 Canvas 仪表盘内的纯前端模块（`callTool` 直驱浏览器/公共 API，全程不经 LLM，
  零 token，详见仪表盘开发文档）；`career-scan` 技能作为对话入口（"扫一下岗位"）打开仪表盘
  并触发同一模块。
- 抓取分层：Greenhouse / Ashby / Lever 走公共 JSON API（零 token、最稳）；LinkedIn 与
  通用门户走**用户真实登录会话**（`navigate` + `eval_js`，JSON-LD 优先、选择器兜底）。
- **聚簇（v2）**：`ScanResult` 在 `fresh` 平铺列表之外输出按公司分组的视图——
  公司 → {岗位数, 是否含 repost, 岗位列表}。"同公司本次开 3 个相关岗"这类复合信号在
  入口处即可见——聚簇在入口做，不把散信号的混乱推给判断层；inbox 按公司分组渲染。
- 产出：N 门户 / M 新岗 / K 重发 / 失败门户摘要 + 聚簇 inbox。**不评估、不写 timeline**。
- 入库：筛好的紧凑短名单经一次 `agent.chat` append 进 tracker（`status=inbox`），
  行内携带聚簇数（同公司同扫描批次岗位数），供 evaluate Step0 入册 signal 时引用。

**`career-evaluate`（Judge · 单岗位评估，tracker 唯一串行写者）**
- 触发：贴 JD（文本或 URL）/ "评估这个岗位" / 仪表盘行按钮。
- 工具：`browser_*` + `web_search` + `fetch_page` + `brain_get_page/put_page/add_link/add_tag/get_timeline/add_timeline_entry/get_backlinks`。
- 步骤：
  - **Step0（v2，Remember 接入）**：`brain_get_timeline('career/companies/{slug}')` 读公司
    完整历史（页不存在 = 冷启动）；随后 `brain_add_timeline_entry` 写入本次
    `signal:job` 事件（detail：posted_at、repost、本批次同公司岗位数）。
  - Step1：读 `cv` / `profile` / `article-digest`。
  - Step2：取 JD（browser-use → fetch_page → web_search 链），同时抓 Block G 新鲜度
    与 comp 信号；**撞见融资/扩张/裁员/HM 变动即顺带写 `signal:funding|company|people`**。
  - Step3：archetype 检测 → A–F fit 评分 + Block G 合法性 → **verdict header**（见下）。
  - Step4：写 `reports/*` + 链图 + 打标。
  - Step5：作为单写者串行 append tracker 行（`evaluated`、`play`、`pdf=pending`）。
- **verdict header（v2，Judge 双轴）**——置于报告头部，不占 Block 字母：

  ```
  score:     A–G 全局分（fit 轴，1.0–5.0，方法学不变）
  why_now:   一句话，必须引用具体触发信号（"3 天前发布，公司上月 B 轮，本季第二个 AI 岗"）
  play:      apply_now | tailor_first | network_first | wait | skip
  rationale: 一行审计理由
  ```

  play 初版规则（编码于 `conventions/scoring.md`，用户可调优）：
  - score < 4.0 → `skip`（沿用既有阈值）
  - 30 天内投过同公司同团队且无回音 → 禁 `apply_now`，降 `network_first` 或 `wait`
  - timeline 含 `outcome:rejected`（同公司）→ 任何 play 都要求人工确认
  - repost 岗 → why_now 必须点明（未招满：机会与红旗双解读）
  - score ≥ 4.5 且同公司复合信号（如 funding + 多岗）→ `apply_now` 加急标记
- 产出：报告页（verdict + A–G）+ tracker 行。批处理 worker 模式下不写 tracker，只回报告 slug。

**`career-auto-pipeline`（全流程编排）**
- 触发：贴 JD 且无更具体子命令。
- 步骤：① Step0–5 交给 `career-evaluate`（该行唯一串行写者）→ ② `career-pdf` 生成 CV，
  成功后只更新该行 `pdf=✅`（绝不追加第二行）→ ③ 若全局分 ≥ 4.5 且 play=apply_now：
  加载 `career-writing`，抓申请表问题或用通用题集起草回答（首句引用 why_now），追加到
  报告 `## H)` 段 → ④ 终态化 `status`/`pdf`。

**`career-pdf`（Act · 简历渲染）**
- 工具：`brain_get_page` + canvas-tool `pdf.render`。
- 步骤：按 JD 与 `profile` 定制 CV 的 HTML（模板 `cv-template.html`，ATS 规则见
  `career-writing`）→ 写入会话目录 → 调 `pdf.render`（weasyprint）；latex 分支可选。
- 工具门控：调用前探活；缺 weasyprint 则提示安装（`pack status` 同样会报）并重试，绝不静默失败。

**`career-followup`（Act/Learn · 跟进）+ /loop**
- 步骤：读 tracker 的 `status`/`followup_due` → 对到期项按 `career-writing` 起草跟进
  （首句引用该公司最近 timeline 事件）→ 起草即写 `touch:followup` 事件 → **顺带问结果**
  （outcome 回灌对话入口，§7.3）。
- ghosted 半自动推断：`applied` 后 21 天无状态变化 → 列为 ghosted 候选并提示确认，
  不自动改状态。
- 节奏：/loop `time:1d` 日检（loop 创建见 §5.3 career-setup）。

**`career-batch`（批量评分）**
- 串行抓取 N 个 JD 文本 → 扇出 sub-agent 并行评分（纯 LLM，不碰浏览器；每个 worker 各自
  读对应公司 timeline）→ 各写 `reports/*` → 单一串行步骤并入 tracker。

### 5.2 辅助技能

**`career-compare`（多 offer 对比）**：读多个 `reports/*` → 按六维 + 全局分 + play 排名 →
并排对比表。

**`career-apply`（申请表答题）**：`browser_snapshot` 读真实表单开放题 → 基于 CV + JD +
verdict 起草每条答案（**首句引用 why_now 的触发信号**）→ 交还可粘贴文本，追加报告 `## H)`。
**用户自己编辑、自己提交，助手从不点击**。

**`career-contacto`（networking 破冰）**：`web_search`（+ 真实会话只读取材）定位
HM / recruiter / peer / interviewer → 按 4 类型 3 句框架起草（≤300 字符，首句引用触发信号）
→ 起草即写 `touch:networking` 事件。**只起草不发送**、不放电话、无 corporate-speak。
play=network_first 的岗位由此承接。

**`career-deep`（深度公司研究 · Sense 三桶主来源）**：实际执行六轴研究 → 简报写入
`companies/{slug}` 正文 → **发现的融资/扩张/裁员/人事变动写 `signal:*` timeline 事件** →
供 evaluate Block D/G 与 contacto 复用。想持续监控心仪公司的用户可自建 /loop 定期跑本技能
（平台能力组合，非 pack 新功能）。

**`career-patterns`（Learn · 结果模式分析，v2 升级为闭环）**
- 两种运行模式：
  1. **/loop 周报模式**（`time:7d`）：门槛检查（≥5 个超出 `evaluated` 的申请，不足静默
     跳过）→ agent 直接读 tracker + 相关公司 timeline 计数 → 漏斗 / score 段-结果 /
     archetype 转化 / **play 准确性**（apply_now 实际回复率 vs network_first）→ 写
     `reports/pattern-analysis-{date}` → **提议**调整（portal 过滤、score 阈值、archetype
     优先级），用户确认后才改 `profile`。
  2. **对话模式**："分析我的申请规律"，同流程即时跑。
- 审计纪律（v2）：每个统计数字必须附"分子/分母来自哪些行"的引用——小样本下可审计比
  绝对精确更实际。
- floor 规则：建议永不提议完全放弃某个 archetype，只调优先级——单桶归零会让系统失去
  发现市场变化的能力。
- 仪表盘统计面板的确定性 JS 实时聚合是独立的展示层，与本技能互不依赖。
- 绝不改 `cv` / `conventions/rules.md`。

**`career-project` / `career-training`**：沿用 v1 设计（六维加权矩阵评自有项目 /
课程证书，BUILD/SKIP/PIVOT 与 DO/DON'T 裁决），分别存 `career/projects/{slug}`、
`career/training/{slug}`，优先级按 profile 的 archetype 自适应。

### 5.3 系统技能

**`career-setup`（首次引导）**：① 幂等校验种子页（seed 已由 pack 引擎 only-if-absent
播种，本技能只补缺与引导填写）→ ② 引导建档（archetypes、`## Portals`、薪资目标、风格样本；
也可对话式"这是更多关于我的信息"增量更新）→ ③ **提议创建两个 loop**（followup 日检
`time:1d`、patterns 周报 `time:7d`），用户确认才建——pack-protocol/0.1 无
`[components.loops]` 组件，loop 只能运行时创建。

**`career-maintain`（防腐）**：去重、状态规范化、CV/profile 一致性校验、孤儿报告清理；
**v2 新增：列出并按需删除本包相关 loop**——receipt 不覆盖 loop，这是协议覆盖不到的边角，
卸载前由本技能提供清理路径（诚实标注）。

**`career-dashboard`**：对话入口，打开持久 artifact 仪表盘。

### 5.4 career-ops modes 全量对照（18 个）

覆盖结论不变：**直接技能 13、不同形态覆盖 5、未覆盖 0**。映射同 v1（oferta→evaluate、
ofertas→compare、apply→apply、scan→scan、pdf→pdf、followup→followup+loop、batch→batch、
contacto→contacto、deep→deep、patterns→patterns、project→project、training→training、
auto-pipeline→auto-pipeline；latex→pdf 的 latex 分支、interview-prep→Block F + deep、
pipeline→GBrain inbox、tracker→数据契约 + 仪表盘、update→`nevoflux pack update`）。
v2 在其上**净增** career-ops 没有的三块：公司级记忆、verdict 时机轴、Learn 闭环。

---

## 6. Conventions（规则与契约）

全部放在 **`career` host skill** 的 `conventions/` 子目录，运行时经
`skill_read('career', 'conventions/<x>.md')` 按需读取——协议明示 frontmatter
`dependencies` 是装饰性的，**共享规则只此一条正道**。

| 文件 | 内容 | 加载方式 |
|---|---|---|
| `conventions/rules.md` | 不变量：NEVER 清单（§1.4 第 8 条全文）、Block G 伦理、单浏览器会话、单写者纪律 | **每个技能正文第一步** `skill_read` |
| `conventions/scoring.md` | 评估契约：A–G rubric、archetype、**verdict header 与 play 规则**、报告格式、patterns 审计纪律 | 做评估/分析的技能按需读 |
| `conventions/writing.md` | 写作契约：语气校准、ATS/反陈词滥调、**触发信号硬规则**（见下） | 仅生成对外文本时读 |
| `conventions/data.md` | 数据契约（§4 全文：schema、timeline 事件编码、纪律） | 读写数据的技能按需读 |

**writing.md 两条 v2 硬规则**（"把触发信号引用回来"）：
1. 所有对外文本（cover letter、申请回答、networking 消息、跟进）**首句必须引用 verdict
   的 why_now 或该公司最近 timeline 事件**——具体、可验证的触发信号；禁止模板开场。
   判据：这段话上个月也能原封不动发出去 = 不合格。
2. 报告与起草中的统计数字必须附来源行引用。

**两个调优文件**：`scoring.md` 与 `writing.md` 是
系统每次评估/起草都要读的判断力与语气所在，README 须明示——**这两个文件就是用户的
调优面**，直接编辑即生效（`skill_read` 运行时读取），不需重装。卸载时若用户改过它们，
pack 引擎按 sha256 不匹配自动跳过删除（协议行为），调优不会丢。

---

## 7. Canvas 仪表盘

### 7.1 界面

- **聚簇 inbox（v2）**：扫描结果按公司分组（岗位数 + repost 标记），复合信号一眼可见。
- **pipeline 表格**：列同 tracker schema（含 play / outcome）+ 筛选/排序
  （archetype / score / play / status / legitimacy）。
- **行动队列（v2）**：按 `play` 分组的视图——今天投谁（apply_now）/ 先定制（tailor_first）/
  先找人（network_first）/ 等待中（wait）。比按 status 排更接近"两分钟批准或否决"的体验。
- **行按钮**：评估 / 生成CV / 起草回答 / 打开JD / 标记已申请 / **标记结果（v2）** + 导出。
- **统计面板**：确定性 JS 实时聚合（零 token、精确），独立于 patterns 周报。

### 7.2 接线（平台事实约束）

- 读数据：`NevofluxSDK.agent.chat("把 career/applications 转成 JSON，只返回 JSON")` →
  解析渲染（Canvas 拿不到 `brain_*`）。
- 触发动作：按钮 → `agent.chat("对第 N 行运行 career-evaluate", {sessionId})`，
  `onStream` 显示进度。
- 刷新回路：动作完成 agent 发 `ui:notification:done` → 仪表盘订阅 → 重新拉取。
- 扫描模块：`callTool` 直驱（零 token），scan-history 存 `NevofluxSDK.storage`；
  业务数据一律回 GBrain，不双存。
- 导出：CV 走 `pdf.render`（先探活）；表格 vendored 库出 XLSX/DOCX。

### 7.3 outcome 三回灌入口（v2，Learn 环原料）

1. **标记结果按钮**：行操作选 replied / interview / offer / rejected / ghosted →
   经 `agent.chat` 由 agent 更新 tracker 行 + 写公司 timeline outcome 事件（写者仍是
   agent 单点）。
2. **followup 对话回灌**：日检跟进时顺带问"这家有回音吗"。
3. **ghosted 半自动推断**：applied 后 21 天无状态变化 → followup loop 列为候选并提示
   确认，不自动改。

---

## 8. 打包与安装（pack-protocol/0.1）

**本包不含任何安装器代码。** 一份 `pack.toml` + 文件，平台负责事务安装、receipt、回滚、
卸载数据保护。

```toml
[pack]
name = "career-pack"
version = "0.2.0"
protocol = "pack-protocol/0.1"
min_nevoflux = "0.3.5"            # /loop 触发表达式自 0.3.5 起可用
description = "A job-hunt brain: sense, remember, judge, act, learn."
license = "MIT"
namespace = "career"

[components.skills]
dir = "components/skills"

[components.canvas_tools]
files = ["components/canvas-tools/pdf-render.toml"]
external_binaries = ["weasyprint"]

[[components.seed]]
slug = "career/cv"
from = "components/seed/cv.template.md"
[[components.seed]]
slug = "career/profile"
from = "components/seed/profile.template.md"
[[components.seed]]
slug = "career/applications"
from = "components/seed/applications.template.md"

[components.dashboard]
artifact_id = "career-pack-dashboard"   # 必须以包名开头（协议规则）
content_type = "project"
files_from = "components/canvas-app/dist"
entry = "index.html"

[components.protected]
slugs    = ["career/cv", "career/profile", "career/applications",
            "career/article-digest", "career/story-bank", "career/scan-history"]
prefixes = ["career/reports/", "career/companies/", "career/projects/", "career/training/"]
```

要点（协议合规自检）：
- **seed ⊆ protected**：三个 seed slug 全部在 protected.slugs 中（违者验证期硬拒）。
- 全部 slug/prefix 在 `career` 命名空间内；`artifact_id` 以包名开头。
- 无 `[components.config]`、无 `[components.knowledge]`。
- canvas-tool TOML 的 args 用双大括号：`args = ["{{input}}", "{{output}}"]`，
  path 参数 `allowed_prefix = "$SESSION_DIR"`。
- 卸载：技能/工具/仪表盘移除，`career/…` 用户页默认保留；用户改过的 convention 文件
  因 sha 不匹配被跳过（调优不丢）；loop 清理走 `career-maintain`（§5.3）。

```toml
# components/canvas-tools/pdf-render.toml
name = "pdf.render"
description = "Render an HTML file to PDF (ATS-friendly)"
kind = "command"
binary = "weasyprint"
args_mode = "template"
args = ["{{input}}", "{{output}}"]

[params.input]
type = "path"
allowed_prefix = "$SESSION_DIR"
must_exist = true
[params.output]
type = "path"
allowed_prefix = "$SESSION_DIR"

[constraints]
timeout_seconds = 120
cwd = "$SESSION_DIR"
```

---

## 9. 用户端到端流程

对照 career-ops 的前置（AI CLI + Node18 + Git + clone + npm install + playwright），
本包步骤 0–1 几乎归零——这本身就是卖点：

```
0. 前置   装好 nevoflux（≥0.3.5，daemon 运行中）。可选：weasyprint 在 PATH（出 PDF）。
1. 安装   nevoflux pack install career-pack/pack.toml
          （或 Settings → Packs → Install Pack…；可先 pack validate 预检）
2. 建档   运行 career-setup：填 career/cv 与 career/profile（archetypes、## Portals、
          薪资目标、风格样本），确认创建 followup/patterns 两个 loop。
          也可直接对 agent 说"这是更多关于我的信息"增量建档。
3. 扫描   打开仪表盘点"扫描"（或说"扫一下岗位"）——零 token 扫门户，聚簇 inbox 入库。
4. 评估   inbox 逐公司点"评估"，或直接贴 JD 链接走 career-auto-pipeline。
          产出 verdict（score / why_now / play）+ A–G 报告 + tracker 行（约 1–2 分钟）。
5. 行动   按 play 行动队列处理：apply_now → 生成CV + 起草回答（首句引用 why_now），
          人工审阅后自行提交；network_first → career-contacto 起草破冰。
6. 回灌   收到回复/面试/拒信 → 行内"标记结果"一键回灌；无回音的 followup 日检会催办并代问。
7. 复盘   每周 patterns 周报自动产出漏斗与转化分析，提议调整，你确认才生效。
8. 卸载   nevoflux pack uninstall career-pack       # 干净移除，保留你的求职数据
```

---

## 10. 项目结构

```
nevoflux-career-pack/
├─ pack.toml                       # 唯一声明源（§8）
├─ README.md  LICENSE(MIT)  TRADEMARK.md  LEGAL_DISCLAIMER.md
├─ components/
│  ├─ skills/                      # 拍平一层（loader 只扫一层）
│  │  ├─ career/                   # host skill：SKILL.md + conventions/{rules,scoring,writing,data}.md
│  │  ├─ career-auto-pipeline/  career-evaluate/  career-scan/  career-pdf/
│  │  ├─ career-followup/       career-batch/     career-compare/  career-apply/
│  │  ├─ career-contacto/       career-deep/      career-patterns/
│  │  ├─ career-project/        career-training/
│  │  └─ career-maintain/       career-setup/     career-dashboard/
│  ├─ canvas-tools/pdf-render.toml
│  ├─ canvas-app/                  # React 仪表盘源码；dist/ 为 [components.dashboard] 装载物
│  │  └─ src/scan/                 # 零 token 扫描模块：providers(ats/linkedin/genericSession)
│  └─ seed/{cv,profile,applications}.template.md + cv-template.html
├─ tests/                          # skill-lint、provider mock、pack validate 流程
└─ .claude-plugin/{plugin.json, marketplace.json}   # 生态兼容（可选）
```

---

## 11. 与平台的耦合点

结论沿用 v1 复审且更进一步：**零平台新特性、零安装器代码**。

| 能力 | 落法（全部现有机制） |
|---|---|
| 共享规则始终生效 | host skill conventions + 每技能正文第一步 `skill_read`（dependencies 是装饰性的） |
| 公司记忆 | `brain_add_timeline_entry` / `brain_get_timeline`（gbrain 工具面已含，daemon 快照核实） |
| PDF 工具 | canvas-tool 白名单 TOML，pack 引擎复制即生效 |
| 仪表盘 | `[components.dashboard]` 持久 artifact，upsert by id |
| 调度 | 内置 /loop（运行时创建，setup 引导 / maintain 清理） |
| 安装/卸载 | 平台 pack 引擎（事务 + receipt + 数据保护） |

---

## 12. 风险与边界

- **商标/法律**：方法学借鉴 career-ops（MIT）但不沿用其名、不复制其文案。
  "150+ 门户/零 token"是对方宣传，本包按自身实际 provider 覆盖数宣传。
- **抓取合规**：守门户 ToS、人在回路、不自动投递、不做反爬伪装。LinkedIn provider
  默认不启用、只读、人工触发、限速限页、零凭据（复用已登录会话），启用前弹合规提示，
  用户自负其责——真实会话不等于 ToS 干净，诚实标注。
- **选择器腐烂**：JSON-LD 优先 + 稳定锚（如 `/jobs/view/<id>`）+ 选择器集中可热修；
  门户规则放 user 层 profile。
- **GBrain append 并发**：§4.3 纪律固化；timeline 按页隔离风险更低。
- **timeline 噪音**：signal 延迟写入（评估时才入册）是防膨胀的主闸；maintain 提供
  孤儿/陈旧事件清理。
- **小样本统计**：patterns 输出强制附行引用、floor 规则、提议制——不让模型在几十个
  样本上"自动调权"。
- **loop 残留**：协议 receipt 不覆盖 loop；maintain 提供列出/删除路径，README 卸载
  章节明示。
- **平台演进**：skill 加载 / `skill_read` / canvas-tool 白名单 / pack 协议若变，
  `min_nevoflux` + `pack validate` 早失败。

---

## 13. 路线图

| 里程碑 | 交付 | 退出标准 |
|---|---|---|
| **M0 协议迁移** | v1 的 TS 安装器退役，改 `pack.toml`；`pack validate` 零违规；沙箱 install/uninstall 往返 | receipt 精确反向，用户数据零触碰 |
| **M1 地基** | evaluate（含 verdict header + Step0 history）+ scoring/writing/data conventions + pdf 工具 + seed | 贴 JD → verdict + 报告 + tracker 行 + PDF |
| **M2 记忆环** | companies timeline 读写全链（evaluate/deep/followup 写，evaluate/patterns 读）+ outcome 列 | 同公司第二次评估的 verdict 体现历史 |
| **M3 仪表盘** | 聚簇 inbox + play 行动队列 + 标记结果 + 统计面板 + ui:* 刷新回路 + 导出 | 扫描→评估→标记结果全程不离仪表盘 |
| **M4 学习环** | followup 日检 loop + ghosted 推断 + patterns 周报 loop + 提议制调整 | 周报附行引用；提议经确认改 profile |
| **M4.5 辅助技能** | compare / apply / contacto / deep / project / training / batch / maintain | 18 个 career-ops mode 全覆盖 + 三块净增能力 |
| **M5 发布** | GitHub Release + marketplace.json + README/Quickstart（明示两个调优文件） | 可交付给非作者用户 |

---

## 14. 一行心智模型

> **本质是"一个装进 nevoflux 的求职大脑"：感知按公司聚簇，记忆按公司成册，判断在历史
> 语境下给出 fit 分与时机裁决，行动引用真实触发信号且永不替你提交，学习从结果回灌并只
> 提议不强加。** 打包是一份 `pack.toml` + 文件——安装、回滚、receipt、数据保护全部由
> 平台 pack 引擎兜底，本包零安装器代码、零平台新特性。
