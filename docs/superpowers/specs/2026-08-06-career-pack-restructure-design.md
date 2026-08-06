# Design: career-pack 重组为可安装 pack 布局

- **日期**: 2026-08-06
- **范围**: 仅重组（restructure-only）—— 把散装文件整理成平台 `pack` 子系统能安装的
  `pack.toml` + `components/` 布局。**不写技能内容、不构建仪表盘。**
- **状态**: 待用户复审

---

## 1. 目标与非目标

**目标**：让 `nevoflux-career-pack` 成为 `~/project/nevoflux-agent` 的 `crates/pack`
子系统（`pack-protocol/0.1`）可直接 `nevoflux pack install ./pack.toml` 的包：
产出 `pack.toml`（唯一声明源）+ `components/skills/`（解码后的真实嵌套技能目录）。

**非目标（本次明确不做）**：
- 不新写任何技能正文或 convention 内容（缺失的 convention 仅标 TODO，见 §5）。
- 不构建 career-scan 仪表盘、不声明 `[components.dashboard]`（career-scan/ 原样保留）。
- 不声明 `[components.seed]` / `[components.canvas_tools]` / `[components.knowledge]`
  （仓库当前没有对应的模板 / TOML / 知识源文件）。
- 不改动 `~/project/nevoflux-agent` 或 `~/project/nevoflux` 任何平台源码。

## 2. 现状

散装开发布局，无 `pack.toml`、无 `components/`：
- `career-skill/`：`career__host__SKILL.md`、`career__conventions__rules.md`、
  `career-contacto__SKILL.md`、`career-evaluate__SKILL.md`、`PACK_PROTOCOL.md`。
- `career-skill-5/`（较新的叶子技能集）：`career-contacto`、`career-deep`、
  `career-patterns`、`career-project`、`career-training`。
- `career-scan/`：仪表盘 TS 源码（本次不动）。
- `DESIGN.md` / `README.md` / `PACK_PROTOCOL.md`：文档，保留。

## 3. 平台契约（已核对 `nevoflux-agent`）

- Manifest schema：`crates/pack/src/manifest.rs`（`[pack]` + `[components.*]`）。
- 支持协议：`SUPPORTED_PROTOCOLS = ["pack-protocol/0.1"]`。
- 平台当前版本：**0.3.5**（`workspace.package.version`；`daemon.info` 用
  `env!("CARGO_PKG_VERSION")` 上报同值）→ 取 `min_nevoflux = "0.3.0"`（≤ 0.3.5）。
- 落点（`crates/daemon/src/paths.rs`）：`[components.skills].dir` → `{config}/skills/`
  （拍平一层）；receipt → `{config}/packs/career-pack/receipt.json`。macOS 上
  `{config}` = `~/Library/Application Support/nevoflux`。
- 安装：`nevoflux pack {validate|inspect|install|uninstall|update}`，daemon 需在运行。

## 4. 目标布局

```
nevoflux-career-pack/
├── pack.toml                        # 新写
├── components/
│   └── skills/                      # → {config}/skills/
│       ├── career/
│       │   ├── SKILL.md
│       │   └── conventions/
│       │       └── rules.md         # 仅此一个已存在；scoring/writing/data 见 §5
│       ├── career-evaluate/SKILL.md
│       ├── career-contacto/SKILL.md
│       ├── career-deep/SKILL.md
│       ├── career-patterns/SKILL.md
│       ├── career-project/SKILL.md
│       └── career-training/SKILL.md
├── career-scan/                     # 原样保留（后续再接 dashboard）
├── DESIGN.md · README.md · PACK_PROTOCOL.md
└── docs/superpowers/specs/2026-08-06-career-pack-restructure-design.md
```

### 4.1 文件映射（source → dest）

命名解码：`a__b__c.md` 的 `__` 是路径分隔编码，解码为真实嵌套目录。

| 来源 | 目标 |
|---|---|
| `career-skill/career__host__SKILL.md` | `components/skills/career/SKILL.md` |
| `career-skill/career__conventions__rules.md` | `components/skills/career/conventions/rules.md` |
| `career-skill/career-evaluate__SKILL.md` | `components/skills/career-evaluate/SKILL.md` |
| `career-skill-5/career-contacto__SKILL.md` | `components/skills/career-contacto/SKILL.md` |
| `career-skill-5/career-deep__SKILL.md` | `components/skills/career-deep/SKILL.md` |
| `career-skill-5/career-patterns__SKILL.md` | `components/skills/career-patterns/SKILL.md` |
| `career-skill-5/career-project__SKILL.md` | `components/skills/career-project/SKILL.md` |
| `career-skill-5/career-training__SKILL.md` | `components/skills/career-training/SKILL.md` |

**技能取舍（已定）**：叶子技能以 `career-skill-5` 为准；`career-contacto` 两套都有，取 -5 版。
`career` host、`conventions/`、`career-evaluate` 仅存在于 `career-skill/`，保留
（`career-project` 描述显式引用 `career-evaluate`，host 声明所有技能依赖 conventions）。

**清理**：映射完成并核对后，删除旧的 `career-skill/`、`career-skill-5/` 散装目录
（`PACK_PROTOCOL.md` 从 `career-skill/` 移到仓库根保留）。

### 4.2 `pack.toml`

```toml
[pack]
name = "career-pack"
namespace = "career"
version = "0.1.0"
protocol = "pack-protocol/0.1"
min_nevoflux = "0.3.0"
description = "AI-native career copilot pack: scan, evaluate, outreach, research, portfolio & training skills."
license = "MIT"

[components.skills]
dir = "components/skills"

[components.protected]
slugs = [
  "career/cv", "career/profile", "career/applications", "career/scan-history",
]
prefixes = [
  "career/reports/", "career/companies/", "career/projects/", "career/training/",
]
```

`[components.dashboard]` / `[components.seed]` / `[components.canvas_tools]` /
`[components.knowledge]` 本次不声明（见 §1 非目标）。

## 5. 已知缺口（TODO，不在本次范围）

host 技能（`career/SKILL.md`）声明了 4 个 convention，但仓库目前只有 `rules.md`：

- [ ] `career/conventions/scoring.md` —— A–G 评分 rubric / archetype / 报告格式
- [ ] `career/conventions/writing.md` —— 候选人向写作契约（语气、ATS 规则）
- [ ] `career/conventions/data.md` —— GBrain 数据契约（命名空间、tracker schema）

**影响**：装上后，任何技能对这三者 `skill_read('career','conventions/<x>.md')` 会读不到文件。
本次按决策仅重组、标 TODO；补齐内容作为后续独立任务。

## 6. 验收

- `nevoflux pack validate ./pack.toml` 通过（manifest 字段 + capability 校验）。
- `nevoflux pack inspect ./pack.toml` 预览列出 7 个技能目录。
- 目录树与 §4 一致；旧散装目录已清理；career-scan/ 未改动。

## 7. 备注

- 本仓库当前**不是 git 仓库**。brainstorming 惯例是提交 spec；因无 git，本 spec 先仅落盘。
  是否 `git init` 由用户决定（不阻塞后续）。
