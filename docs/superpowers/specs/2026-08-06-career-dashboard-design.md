# Design: career-pack minimal scan dashboard

- **日期**: 2026-08-06
- **范围**: 最小扫描仪表盘 —— 把现有零 token 扫描引擎包成一个可安装的 Canvas
  `[components.dashboard]` 组件。**不做** DESIGN §7 的完整 pipeline/行动队列/图表
  （依赖尚不存在的技能与 tracker 数据）。
- **决策**: 构建产物 `dist/` 提交进 git；工具链 vanilla TS + `bun build`（零运行时依赖）；
  inline 执行。

## 目标

`career-scan/` 目前只有扫描引擎，无 app 壳、无构建配置。目标：在
`components/canvas-app/` 下组织出可 `bun build` 的最小仪表盘，产出自包含 `dist/`，
并在 `pack.toml` 声明 `[components.dashboard]`，使 `nevoflux pack install` 能把它作为
持久 artifact 装上。

## 目录布局（还原扫描模块的 import 图）

```
components/canvas-app/
├── index.html            # entry；<script type="module" src="./src/main.ts">
├── package.json          # name/private + bun build 脚本
├── src/
│   ├── main.ts           # 新写：app 壳（加载配置 → scanAll → 渲染）
│   └── scan/
│       ├── scan.ts       # 编排入口：scanAll / makeScanContext / ScanResult
│       ├── types.ts
│       ├── context.ts
│       ├── filters.ts
│       └── providers/
│           ├── index.ts  # resolveProvider 注册表
│           ├── ats.ts
│           ├── linkedin.ts
│           └── genericSession.ts
└── dist/                 # bun build 产物（提交）= 仪表盘 artifact
```

`git mv` 映射（`career-scan/` → 上）：scan/types/context/filters → `src/scan/`；
index/ats/linkedin/genericSession → `src/scan/providers/`（`index.ts` 等按其
`../types.js` / `./ats.js` 导入正好落位）。搬后删除空的 `career-scan/`。

## app 壳（`src/main.ts`）行为

1. `if (!window.NevofluxSDK)` → 渲染「请在 nevoflux Canvas 内打开」提示并停（守卫）。
2. 渲染静态壳：标题、`[Scan]` 按钮、日志区、统计条、聚簇 inbox 容器。
3. 点 Scan：
   - `loadConfig()`：`window.NevofluxSDK.agent.chat("Return career/profile's ## Portals as PortalConfig JSON, JSON only")` → `JSON.parse` → `PortalConfig`（一次小 token；符合 `scan.ts` 头注）。解析失败 → 日志报错并停。
   - `const ctx = makeScanContext((lvl,msg)=>appendLog(lvl,msg))`；`const res = await scanAll(config, ctx)`。
   - 渲染 `res.stats`（portals / rawJobs / afterFilter / fresh / reposts / failed 数）+ 按 `company` 聚簇的 `res.fresh`（公司名 + 岗位数 + repost 徽标；行标题链到 `job.url`，附 location/source）+ failed 门户列表。
4. **不**写 GBrain（回灌需 evaluate/agent 流程，属未来）；scan-history 仍由 `scanAll` 经 `storage` 维护。

`ScanResult = { fresh: Job[]; reposts: Job[]; stats: { portals; failed:{name,error}[]; rawJobs; afterFilter; fresh; reposts } }`；
`Job = { id; title; url; company; location; postedAt?; source; repost? }`。

## 构建

- `package.json`：`"build": "bun build index.html --outdir dist"`，`private: true`，无 dependencies。
- `bun build` 转译并打包 TS + HTML → 自包含 `dist/`（不联网、无 node_modules）。
- 类型检查可选（`bunx tsc --noEmit` 需一次联网取 tsc）；默认跳过，靠 bun 转译 + 谨慎编码。

## pack.toml 变更

新增：
```toml
[components.dashboard]
artifact_id = "career-pack-dashboard"   # 以包名开头（协议规则）
content_type = "project"
files_from = "components/canvas-app/dist"
entry = "index.html"
```

## .gitignore

`dist/` 全局忽略仍在；为本仪表盘加一条**否定例外**：`!components/canvas-app/dist/`，
使预构建产物入库（`files_from` 需要它存在才能 install / github 安装）。

## 验收

- `bun build` 成功，`components/canvas-app/dist/index.html` + bundle 存在。
- `nevoflux-agent pack validate <abs pack.toml>` → `{"ok": true, "violations": []}`。
- `nevoflux-agent pack inspect <abs pack.toml>` → `components.dashboard` 非空、含文件映射。
- 运行时需真实 nevoflux Canvas，此处不可跑；无-SDK 守卫渲染提示兜底。

## 非目标 / 后续

pipeline 表、按 play 行动队列、图表、agent.chat 动作接线、outcome 回灌（DESIGN §7）；
GBrain 回灌；seed/canvas-tools 组件；`career/story-bank`·`article-digest` 补进 protected。
