# RFC: nevoflux Pack 通用安装协议

> **状态**：Draft / 提案（platform-side RFC）
> **协议版本**：`pack-protocol/0.1`
> **面向**：nevoflux / nevoflux-agent 平台维护者
> **参考实现**：`nevoflux-career-pack` 的外挂式 TS 安装器（已实现并测过 install/uninstall
> 往返）——本 RFC 提议把其中可复用的部分**内化为平台原生的 `pack` 子系统**。
>
> 本文中"已核对"指与 `dorisgyl/nevoflux` 及 `dorisgyl/nevoflux-agent` 源码一致的事实；
> "提案"指本 RFC 建议平台新增/正式化的能力。

---

## 1. 摘要

定义一套标准，让任何第三方扩展包以统一、安全、可逆的方式装入/卸载 nevoflux。包作者只
声明"装什么"（一个 `pack.toml` 清单 + 组件文件），平台负责"怎么装/怎么干净拿走"
（生命周期 + 安装凭据 + 运行时钩子）。career-pack 作为第一个消费者。

核心三件套：**Manifest（声明）→ Lifecycle（事务化安装/卸载）→ Receipt（精确可逆）**，
依托一组**平台能力**（路径/版本查询、技能/canvas-tool 加载、`skill_read`、GBrain 播种、artifacts 插入）——其中绝大多数已存在。

---

## 2. 动机

### 2.1 现状

平台已具备扩展点（均已核对）：技能目录扫描、canvas-tools 目录加载、`config.toml`、
GBrain 页面读写。但**没有"包"这一抽象**——career-ops 用的是 Claude Code 插件系统，
本项目用的是外挂 TS 安装器，各装各的。

### 2.2 问题

- 每个包重复实现路径解析、config 编辑、回滚、卸载逻辑。
- 卸载安全靠包作者自觉，**没有平台级的"绝不删用户数据"保证**。
- 包硬编码平台路径 → nevoflux 改目录结构时集体损坏（路径漂移）。
- 第三方需逆向平台内部才能发包，生态门槛高。

### 2.3 目标 / 非目标

**目标**：统一安装 UX；平台兜底卸载安全与可逆；消除路径漂移；强制版本兼容校验；
为第三方提供无需逆向的发包路径；为平台提供能力沙箱的着力点。

**非目标**：不替代技能/canvas-tool/GBrain 等既有机制（协议**编排**它们，不重写）；
不强制联网市场（registry 是可选层）；不引入新的脚本运行时（包只声明，不携带安装器代码）。

---

## 3. 术语

| 术语 | 含义 |
|---|---|
| **Pack** | 一组放进 nevoflux 扩展点的组件 + 一份 `pack.toml` 清单 |
| **Component** | 包内一类可安装物：skill / convention / canvas-tool / config 改动 / seed 页 / dashboard |
| **Manifest** | `pack.toml`，包的唯一声明源 |
| **Receipt** | `receipt.json`，平台在安装时写下的"做了什么"的精确记录，卸载据此反向 |
| **Hook** | 平台暴露给 pack 子系统的运行时能力（RPC/动作） |
| **Protected slug** | 包声明为"用户数据"的 GBrain 页面，卸载默认绝不删除 |

---

## 4. 架构总览

```
  nevoflux CLI / 设置 UI
        │  pack install/uninstall/update/list/status/doctor
        ▼
  ┌──────────────── pack 子系统（提案，daemon 内） ────────────────┐
  │  Manifest 解析 + 校验   Lifecycle 引擎（事务/幂等/回滚）         │
  │  Receipt 读写            Capability 校验（沙箱）                 │
  └───────┬───────────────┬───────────────┬───────────────┬────────┘
          │ Hooks（下列均为平台既有或提案能力）                      │
   skills.reload   canvas_tools(白名单TOML)   brain.import/put_page   artifacts.insert
   daemon.info（路径+版本）            skill_read（已存在）
```

pack 子系统**不直接动文件系统语义之外的东西**：它只是按 manifest 编排上述 hook，并把每步
记进 receipt。所有"放文件"动作都落到平台已知的扩展点目录。

---

## 5. Manifest 规范（`pack.toml`）

唯一声明源。平台据此安装、生成 receipt、做能力校验。

### 5.1 顶层

```toml
[pack]
name = "career-pack"            # 唯一标识，[a-z0-9-]，作 receipt/命名空间 key
version = "0.1.0"               # semver
description = "..."
license = "MIT"
authors = ["..."]
protocol = "pack-protocol/0.1"  # 本包遵循的协议版本
min_nevoflux = "x.y.z"          # 兼容下限，安装时对 daemon.info().version 做 semver 校验
```

### 5.2 组件（`[components.*]`）

每种组件类型对应一个平台扩展点。路径相对 manifest 所在目录。

```toml
[components.skills]
dir = "components/skills"        # 拍平一层安装到 {skillsDir}（加载器只扫一层，已核对）

[components.canvas_tools]
files = ["components/canvas-tools/pdf-render.toml"]   # 白名单 TOML，写入即按现有机制生效
external_binaries = ["weasyprint"]   # 平台/doctor 探活，缺失给指引而非失败

# 注：career-pack 不需要合并任何 config 键。convention（含规则）作为 `career` host skill
# 的 conventions/ 文件随 skills 一并安装，由各技能 `skill_read` 读取——无需 [components.config]。

[[components.seed]]                   # GBrain 幂等播种：仅当页不存在时写入
slug = "career/cv"
from = "components/seed/cv.template.md"

[[components.seed]]
slug = "career/applications"
from = "components/seed/applications.template.md"

[components.dashboard]                # 预构建的 Canvas 应用，安装时插入 artifacts 表
artifact_id = "career-dashboard"     # 持久 artifact 的 id
content_type = "project"
files_from = "components/canvas-app/dist"   # 打成 files JSON map 插入；is_persistent=1, session_id=NULL

[components.protected]                # 卸载默认绝不删；--purge-data 才删且二次确认
slugs = ["career/cv", "career/profile", "career/article-digest",
         "career/applications", "career/scan-history", "career/story-bank"]
prefixes = ["career/reports/", "career/companies/", "career/projects/", "career/training/"]
```

### 5.3 字段约束

| 字段 | 必填 | 校验 |
|---|---|---|
| `pack.name` | 是 | 唯一、`[a-z0-9-]+` |
| `pack.version` / `pack.min_nevoflux` | 是 | semver |
| `pack.protocol` | 是 | 平台支持的协议版本集合内 |
| `components.skills.dir` | 否 | 目录存在；内部为一层 `<name>/SKILL.md` 或 `<name>.md` |
| `components.config.*` | 否 | **键必须在平台白名单内**（否则拒绝安装，见 §9） |
| `components.seed[].slug` | 否 | 合法 GBrain slug |
| `components.protected.*` | 否 | seed 的 slug 应被 protected 覆盖（平台校验，防误删） |

---

## 6. 安装生命周期

**事务化、幂等、失败回滚。** 平台按序执行下列阶段，逐步追加 receipt；任一阶段抛错则按
已写 receipt 反向回滚后中止。

| # | 阶段 | 动作 | 失败处理 |
|---|---|---|---|
| 0 | resolve | `daemon.info()` 取权威路径 + 版本（**包不自行推导路径**，钩子 H1） | 不可达 → 中止并提示启动 nevoflux |
| 1 | compat | semver 校验 `min_nevoflux ≤ daemon.version`；`protocol` 受支持 | 不满足 → 中止 |
| 2 | capability | 校验 manifest 仅触碰白名单目录 / GBrain 命名空间（§9） | 越权 → 拒绝安装 |
| 3 | idempotency | 读已有 receipt：同版本 → no-op；旧版本 → 提示 `update`；`--force` → 继续 | — |
| 4 | place | 拷 skills（含 `career` host skill 的 conventions/，拍平一层）、canvas-tool 白名单 TOML；记入 `receipt.files` | 回滚已放文件 |
| 5 | seed | 对每个 seed：`brain.get_page` 探在否，缺才 `brain.put_page`；记 `receipt.seeded_pages` | 删本次播种页 |
| 6 | artifact | 把 dashboard 以持久 artifact 行插入 `artifacts` 表（`is_persistent=1`, `session_id=NULL`）；记 `receipt.artifacts` | 删本次插入行 |
| 7 | activate | `skills.reload`（钩子 H2）；canvas-tool 白名单按现有机制生效（即时或下次启动） | 警告（不致命） |
| 8 | commit | 写 `receipt.json`（含校验和） | — |
| 9 | report | 输出 doctor 摘要（external_binaries 探活等） | — |

**幂等保证**：阶段 3 + "seed 仅当缺失" + "artifact 按固定 id upsert" 使重复安装安全。

---

## 7. 卸载生命周期

**完全由 receipt 驱动，绝不靠猜文件名。** 默认保护用户数据。

| # | 阶段 | 动作 |
|---|---|---|
| 0 | resolve | `daemon.info()` 取路径 |
| 1 | load | 读 `receipt.json`；无则报错"未安装/装在别处" |
| 2 | confirm | 列出将删文件数 / artifact 行；交互确认（`-y` 跳过） |
| 3 | files | 删 `receipt.files` 中每个文件 + 剪空目录 |
| 4 | artifact | 删 `receipt.artifacts` 中插入的 artifact 行 |
| 5 | deactivate | `skills.reload`；canvas-tool TOML 已随文件删除而失效 |
| 6 | data | seed 页**默认保留**；`--purge-data` 才删 `seeded_pages`（再次确认；protected 仍可拒删） |
| 7 | finalize | 删 `receipt.json` |

**数据安全是协议级保证**：阶段 6 默认不碰 GBrain 用户数据；这不取决于包作者实现，而由平台
统一强制。

---

## 8. Update 生命周期

`pack update`：解析 → 校验新版本兼容 → 比对新旧 receipt：**覆盖本包文件、迁移 seed schema、
插入/更新 dashboard artifact、合并新增 seed**，但**绝不动用户数据页**。失败回滚到旧版本（旧 receipt 保留至 commit 成功）。

---

## 9. 能力与沙箱模型（提案）

协议给平台一个强制点：包**只能触碰它声明且在白名单内的扩展点**。

- **目录白名单**：`{skillsDir}`、`{canvasToolsDir}`、`{config}/packs/<name>/`。包不得写
  其他路径（如用户主目录任意位置）。
- **config 不开放**：本协议下包**不合并** `config.toml`（career-pack 验证了无需如此）。
  若未来确有包需要，应走显式审过的键白名单；当前默认拒绝任何 config 写入。
- **GBrain 命名空间**：建议包的 seed/写入限定在以 `pack.name` 派生的前缀或声明的命名空间内，
  避免包之间互踩。
- **canvas-tool**：沿用既有 CanvasTool 的 `params`/`constraints` 校验（已核对的 schema），
  本协议不放松其安全约束。

校验失败 → 安装在阶段 2 被拒绝，给出越权项。

---

## 10. Receipt Schema

平台在安装时写下、卸载时反向。位置：`{config}/packs/<pack.name>/receipt.json`。

```jsonc
{
  "receipt_version": "1",            // receipt 格式自身版本，便于平台演进
  "protocol": "pack-protocol/0.1",
  "pack": "career-pack",
  "version": "0.1.0",
  "installed_at": "2026-06-07T07:41:55Z",
  "nevoflux_version": "x.y.z",       // 安装时 daemon.info().version
  "paths_source": "daemon",          // daemon | derived（离线兜底时）
  "files": [                          // 平台放过的每个文件（绝对路径 + 校验和）
    { "path": "{skillsDir}/career-evaluate/SKILL.md", "sha256": "…" },
    { "path": "{skillsDir}/career/conventions/rules.md", "sha256": "…" },
    { "path": "{canvasToolsDir}/pdf-render.toml", "sha256": "…" }
  ],
  "artifacts": ["career-dashboard"],  // 安装时插入 artifacts 表的行 id（卸载时删除）
  "seeded_pages": ["career/cv", "career/applications"]  // 本包创建的 GBrain 页（卸载默认保留）
  // 注：本协议下不写 config，故无 config_edits 字段。若未来有 config 合并能力再加。
}
```

字段语义见 §6/§7。校验和用于 `update`/`doctor` 检测漂移与篡改。

---

## 11. 平台钩子清单（运行时能力）

协议依赖这些 hook。逐项标注**当前状态**（已核对源码）与**提案签名**。

| ID | 钩子 | 用途 | 签名（RPC/能力） | 状态 |
|---|---|---|---|---|
| H1 | `daemon.info` | 返回权威路径 + 版本，**根治路径漂移 + 版本校验** | `→ { version, configDir, skillsDir, canvasToolsDir, configFile }` | **提案（唯一需新增）**：内部已有路径（`config.rs`），需经 RPC 暴露 |
| H2 | `skills.reload` | 放/删技能后热重载注册表 | `→ { loaded, errors[] }` | 部分：loader/registry 已存在（`crates/skills`），需暴露重载触发（否则下次启动生效） |
| H3 | canvas-tool 白名单加载 | 放/删 TOML 后生效 | 写文件到 `{canvasToolsDir}` 即可 | **已核对存在**：白名单 TOML 机制（`server.rs` 有 rescan）；即时或下次启动生效，无需专用外部钩子 |
| H4 | `skill_read(name, path)` | 技能正文按名读取 convention/skill 正文（共享 convention 的落法） | `skill_read(skill, path) → content` | **已核对存在**：`agent_host.rs:2140`；brain skill 即 `skill_read('brain','conventions/quality.md')` |
| H5 | `brain.get_page/put_page/import` | 幂等播种 seed 页（或 `.nbrain` 导入） | 既有 brain 工具 | **已核对存在**：`brain_get_page`/`brain_put_page`/`import_snapshot` |
| H6 | artifacts 表插入 | 安装时把预制仪表盘以持久 artifact 行写入 | 插入 `artifacts`（`is_persistent=1`, `session_id=NULL`, `files`/`entry`/`content`） | **已核对存在**：迁移 014/015；`imported_from_share_id` 本就是插预制行 |

> 复审后，原列的"需平台新增"几乎全部消解：H3/H4/H5/H6 **已存在**（白名单 TOML、`skill_read`、
> brain 工具、artifacts 表）；H2 多为"确认重载触发"。**唯一真正需平台新增的是 H1（`daemon.info`）**——
> 而它本就属通用安装层，供任意 pack 复用，且安装器也能用既有 RPC 兜底。

---

## 12. CLI / API 表面

```
nevoflux pack install   <manifest|name> [--force] [--offline] [--dry-run]
nevoflux pack uninstall <name> [--purge-data] [-y]
nevoflux pack update    <name>
nevoflux pack list                       # 已装包 + 版本
nevoflux pack status    <name>           # 组件在/缺、版本、依赖二进制
nevoflux pack doctor    <name>           # 路径/版本/二进制/钩子可用性体检
```

设置 UI 可在其上提供图形化的安装/卸载/开关。

---

## 13. Registry / 市场（可选，未来）

可选的发现层：一个清单索引（类似 `marketplace.json`）让 `pack install <name>` 按名拉取。
非协议核心；本地 manifest 安装始终可用。

---

## 14. 兼容与版本

- **协议版本** `pack-protocol/MAJOR.MINOR`：平台声明其支持集合；manifest 声明所遵循版本，
  阶段 1 校验。
- **`min_nevoflux`**：包对平台的下限。
- **`receipt_version`**：receipt 格式自身演进，卸载器按其版本解析。
- 破坏性变更走 MAJOR；新增可选字段走 MINOR。

---

## 15. 参考实现与内化清单

`nevoflux-career-pack` 的 TS 安装器已**从外部逼近**本协议：`pack.toml`、receipt 机制、
`install/uninstall/status/doctor`、向 daemon 查路径（占位 RPC）、回滚、数据保护——均已实现并测过。

**建议内化进平台的部分**：
1. Lifecycle 引擎（§6/§7）+ Receipt 读写（§10）——从外挂搬进 daemon 的 `pack` 模块。
2. 暴露 H1（`daemon.info`，唯一需新增）；H2（skills.reload 触发）若要免重启则一并暴露。
   H3/H4/H5/H6 已存在，直接用（白名单 TOML / `skill_read` / brain 工具 / artifacts 插入）。
3. Capability 校验（§9）——这是外挂安装器**做不到**的强制点，必须平台做。

内化后，career-pack 从"自带安装器的包"变为"协议的第一个消费者"，其安装器退化为仅一份
`pack.toml` + 组件文件。

---

## 16. 待平台决策的开放问题

1. **协议归属层**：`pack` 子系统放 daemon 还是浏览器侧？（倾向 daemon——它持有路径、
   skills/canvas-tools/GBrain/artifacts 的权威访问。）
2. **GBrain 命名空间**是否强制按 `pack.name` 前缀隔离，避免包互踩。
3. **H1（`daemon.info`）** 的确切返回形状与 RPC 命名（唯一需新增的钩子）。
4. **dashboard artifact 的幂等键**：用固定 `artifact_id` upsert，还是每次重装重建？升级时如何迁移其 `files`。
5. **签名/可信**：是否要求包/manifest 签名以支持第三方分发的可信安装。

> 注：原先列的"config 键白名单治理""按名加载做成自动拼接还是运行时动作""dashboard 启动约定"
> 等问题，已因 ① 不写 config、② `skill_read` 既有、③ dashboard 直接插 artifacts 表 而消解。

---

## 附录 A：最小可行 manifest

```toml
[pack]
name = "hello-pack"
version = "0.1.0"
protocol = "pack-protocol/0.1"
min_nevoflux = "0.0.0"

[components.skills]
dir = "skills"
```

## 附录 B：career-pack 的 receipt 实例

见 §10；`{skillsDir}` 等占位在写入时由 `daemon.info()` 解析为绝对路径。
