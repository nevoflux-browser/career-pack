# career-pack 重组实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把散装的 career-pack 重组成平台 `pack` 子系统可安装的 `pack.toml` + `components/skills/` 布局（仅重组，不写内容、不构建仪表盘）。

**Architecture:** 用 `git mv` 把技能文件从 `career-skill/`、`career-skill-5/` 的双下划线命名解码成真实嵌套目录搬进 `components/skills/`；新写声明式 `pack.toml`；清理旧目录。全程保证被搬文件内容**逐字节不变**（靠 `git mv` + git 改名检测验收）。

**Tech Stack:** git、TOML、nevoflux-agent pack CLI（`~/.cargo/bin/nevoflux-agent`）。

## Global Constraints

- 协议：`protocol = "pack-protocol/0.1"`（平台 `SUPPORTED_PROTOCOLS` 唯一支持值）。
- 版本下限：`min_nevoflux = "0.3.0"`（平台实为 0.3.5）。
- GBrain 命名空间：`namespace = "career"`。
- **不写任何技能/convention 正文**；缺失的 `scoring.md`/`writing.md`/`data.md` 仅在 spec 标 TODO，本计划不创建。
- **不动** `career-scan/`（仪表盘后续单独接），**不动** `~/project/nevoflux` 与 `~/project/nevoflux-agent` 任何源码。
- 被搬文件内容**逐字节不变**：一律用 `git mv`，验收时 `git status` 必须显示 `R`（rename）而非 `M`。
- 叶子技能以 `career-skill-5` 为准；`career-contacto` 取 -5 版，`career-skill/` 的旧 `career-contacto` 丢弃；`career` host、`conventions/rules.md`、`career-evaluate` 从 `career-skill/` 保留。
- 工作目录：仓库根 `~/Documents/nevoflux/nevoflux-career-pack`（已 git init，baseline 提交 `a44b6fa`）。

---

### Task 1: 放置 `career` host 技能 + conventions

**Files:**
- Move: `career-skill/career__host__SKILL.md` → `components/skills/career/SKILL.md`
- Move: `career-skill/career__conventions__rules.md` → `components/skills/career/conventions/rules.md`

**Interfaces:**
- Produces: `components/skills/career/`（namespace host，`name: career`）及其 `conventions/rules.md`，供后续所有 `career-*` 技能通过 `skill_read('career', 'conventions/rules.md')` 引用。

- [ ] **Step 1: 建目标目录并搬文件**

```bash
mkdir -p components/skills/career/conventions
git mv career-skill/career__host__SKILL.md        components/skills/career/SKILL.md
git mv career-skill/career__conventions__rules.md components/skills/career/conventions/rules.md
```

- [ ] **Step 2: 验收——改名而非改内容 + frontmatter 正确**

```bash
git status --short
grep -m1 '^name:' components/skills/career/SKILL.md
```
Expected：`git status` 显示两行 `R ` 开头的 rename（**无** `M`）；`grep` 输出 `name: career`。

- [ ] **Step 3: 提交**

```bash
git add -A
git commit -m "refactor: place career host skill + conventions under components/skills/"
```

---

### Task 2: 放置功能技能（career-evaluate + 5 个 career-skill-5 叶子技能）

**Files:**
- Move: `career-skill/career-evaluate__SKILL.md` → `components/skills/career-evaluate/SKILL.md`
- Move: `career-skill-5/career-contacto__SKILL.md` → `components/skills/career-contacto/SKILL.md`
- Move: `career-skill-5/career-deep__SKILL.md` → `components/skills/career-deep/SKILL.md`
- Move: `career-skill-5/career-patterns__SKILL.md` → `components/skills/career-patterns/SKILL.md`
- Move: `career-skill-5/career-project__SKILL.md` → `components/skills/career-project/SKILL.md`
- Move: `career-skill-5/career-training__SKILL.md` → `components/skills/career-training/SKILL.md`

**Interfaces:**
- Consumes: Task 1 的 `components/skills/career/` 命名空间。
- Produces: 6 个功能技能目录，各含 `SKILL.md`，`name` 与目录名一致，可被平台 skills 加载器（扫一层 `<name>/SKILL.md`）识别。

- [ ] **Step 1: 搬 career-evaluate（来自 career-skill/）**

```bash
mkdir -p components/skills/career-evaluate
git mv career-skill/career-evaluate__SKILL.md components/skills/career-evaluate/SKILL.md
```

- [ ] **Step 2: 搬 5 个 career-skill-5 叶子技能**

```bash
for n in career-contacto career-deep career-patterns career-project career-training; do
  mkdir -p "components/skills/$n"
  git mv "career-skill-5/${n}__SKILL.md" "components/skills/$n/SKILL.md"
done
```

- [ ] **Step 3: 验收——7 个技能齐全、目录名 = frontmatter name、全是 rename**

```bash
echo "count=$(find components/skills -name SKILL.md | wc -l | tr -d ' ')"   # 期望 7
for f in components/skills/*/SKILL.md; do
  d=$(basename "$(dirname "$f")")
  n=$(grep -m1 '^name:' "$f" | awk '{print $2}')
  [ "$d" = "$n" ] || echo "MISMATCH: $f dir=$d name=$n"
done
git status --short | grep -vE '^R' && echo "!! 有非 rename 变更" || echo "all renames OK"
```
Expected：`count=7`；**无** `MISMATCH` 行；打印 `all renames OK`。

- [ ] **Step 4: 提交**

```bash
git add -A
git commit -m "refactor: place functional career skills (evaluate + career-skill-5 leaves) under components/skills/"
```

---

### Task 3: 编写并校验 `pack.toml`

**Files:**
- Create: `pack.toml`

**Interfaces:**
- Consumes: `components/skills/`（Task 1+2 产出）。
- Produces: 可被 `nevoflux-agent pack {validate,install}` 消费的唯一声明源。

- [ ] **Step 1: 创建 `pack.toml`（内容逐字如下）**

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

- [ ] **Step 2: 离线结构校验（永远可跑，作为主闸门）**

```bash
python3 - <<'PY'
import tomllib
m = tomllib.load(open("pack.toml", "rb"))
assert m["pack"]["name"] == "career-pack", m["pack"]["name"]
assert m["pack"]["protocol"] == "pack-protocol/0.1"
assert m["pack"]["namespace"] == "career"
assert m["components"]["skills"]["dir"] == "components/skills"
print("pack.toml parse + fields OK")
PY
```
Expected：打印 `pack.toml parse + fields OK`，无 traceback。
（若该机器 python3 < 3.11 无 `tomllib`：改用 `nevoflux-agent pack validate ./pack.toml` 作为唯一校验，见 Step 3。）

- [ ] **Step 3: 权威校验（daemon 在跑时）**

```bash
nevoflux-agent pack validate ./pack.toml
```
Expected：输出 JSON，含成功/ok 字段、列出 pack 名与版本。
若报连接错误（daemon 未运行）：先启动 nevoflux（桌面 app 或 daemon 进程）再重跑；本步骤在 daemon 不可用时可跳过，Step 2 已保证结构正确。

- [ ] **Step 4: 提交**

```bash
git add pack.toml
git commit -m "feat: add pack.toml manifest (skills + protected components)"
```

---

### Task 4: 清理旧布局 + 迁移 PACK_PROTOCOL.md + 终态核对

**Files:**
- Delete: `career-skill/career-contacto__SKILL.md`（丢弃——被 career-skill-5 版取代）
- Move: `career-skill/PACK_PROTOCOL.md` → `PACK_PROTOCOL.md`（仓库根）
- Remove: 空目录 `career-skill/`、`career-skill-5/`

**Interfaces:**
- Consumes: Task 1–3 完成后，旧目录仅剩待丢弃/迁移文件。
- Produces: 与 spec §4 一致的终态目录树。

- [ ] **Step 1: 丢弃旧 career-contacto、迁移 PACK_PROTOCOL.md**

```bash
git rm career-skill/career-contacto__SKILL.md
git mv career-skill/PACK_PROTOCOL.md PACK_PROTOCOL.md
```

- [ ] **Step 2: 删除已空的旧目录（git 不跟踪空目录，物理清掉）**

```bash
rmdir career-skill career-skill-5 2>/dev/null || true
ls -d career-skill career-skill-5 2>/dev/null && echo "!! 旧目录仍在（非空？）" || echo "旧目录已清理"
```
Expected：打印 `旧目录已清理`。

- [ ] **Step 3: 终态核对——目录树匹配 spec §4**

```bash
git ls-files components/ pack.toml PACK_PROTOCOL.md | sort
```
Expected（恰好这些）：
```
PACK_PROTOCOL.md
components/skills/career-contacto/SKILL.md
components/skills/career-deep/SKILL.md
components/skills/career-evaluate/SKILL.md
components/skills/career-patterns/SKILL.md
components/skills/career-project/SKILL.md
components/skills/career-training/SKILL.md
components/skills/career/SKILL.md
components/skills/career/conventions/rules.md
pack.toml
```
且 `career-scan/` 未被触碰：
```bash
git status --short career-scan/ && echo "(career-scan 无变更预期为空输出)"
```

- [ ] **Step 4: 提交**

```bash
git add -A
git commit -m "chore: remove old skill dirs, move PACK_PROTOCOL.md to repo root"
```

---

## 完成标准（Definition of Done）

- `components/skills/` 下 7 个技能目录齐全，`name` 与目录名一致；`career/conventions/rules.md` 在位。
- `pack.toml` 通过离线字段校验；daemon 可用时 `nevoflux-agent pack validate ./pack.toml` 通过。
- 旧 `career-skill/`、`career-skill-5/` 已清理；`PACK_PROTOCOL.md` 在仓库根；`career-scan/` 未改动。
- 全程被搬文件为 rename（内容逐字节不变），4 个提交对应 4 个 task。
- 已知 TODO（scoring/writing/data conventions）留待后续独立任务，不在本计划内。
