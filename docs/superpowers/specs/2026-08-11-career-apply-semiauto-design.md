# Design: career-apply → semi-automatic form fill (stop at submit)

- **日期**: 2026-08-11
- **范围**: 升级现有 `career-apply` 技能——从"仅起草答案"扩展为"**打开并自动填写**
  申请表单(身份 + 上传简历 + 开放问答),**停在提交前让用户审阅并自己点提交**"。
- **决策(已确认)**: 升级 career-apply(非新技能);**保守 fill-only**(agent 填字段 +
  传简历,所有点击/翻页/提交由用户做);电话号默认不填、先问;完全兼容 `rules.md`
  "最后提交是人的动作"。

## 1. 目标与非目标

**目标**: 把申请里最累的"逐字段填表"自动化,同时**保留人工提交闸门**——半自动
(自动化档位 B)。这是 LLM agent 运行时用浏览器工具**逐表单应变**,不是硬编码自动化。

**非目标(明确不做)**:
- 不自动提交、不点任何 submit/apply/send 按钮。
- 不自动翻页/多步表单的 Next(保守 v1:填当前可见字段,导航由用户做)。
- 不批量海投(一次一个岗位,用户发起)。
- 不解验证码、不自动登录(遇到就停下让用户处理)。
- 不编造任何内容(只填用户真实数据)。

## 2. 与 rules.md 的关系

**兼容,无需 carve-out**。`rules.md` NEVER #3 要求"提交是人的动作"——本设计正是
**填好但不提交**,人来点。NEVER #4(生成消息不放电话)延伸为:表单电话字段**默认不填、
先 `browser_ask_user` 确认**。

## 3. 技能步骤(career-apply/SKILL.md 重写)

- **Step 0 — 契约**: `skill_read` rules.md、writing.md(答案语气/ATS)、data.md(tracker)。
- **Step 1 — 认岗位**: report slug / JD / 申请 URL。`brain_get_page` cv、profile、
  该 `career/reports/{slug}`(复用其研究与已起草答案)。取 career-pdf 生成的 CV PDF 路径
  (`$SESSION_DIR/...-cv.pdf`)若有。
- **Step 2 — 打开并读表单**: `browser_navigate` 到申请 URL;`browser_snapshot` /
  `browser_get_elements` 读出字段(输入框/文本域/下拉/上传/复选)。
- **Step 3 — 起草答案**: 对开放问答按 writing.md 起草(基于 cv,绝不编造),同时
  `brain_put_page` 追加到报告 `## H) Application answers`(保留原有起草能力)。
- **Step 4 — 自动填(fill-only)**:
  - **身份**: 姓名/邮箱/地点/GitHub/portfolio/LinkedIn ← cv/profile,用
    `browser_fill_by_id` / `browser_type_by_id` / `browser_fill`。
  - **简历**: `browser_upload_file` 传 career-pdf 的 PDF。
  - **开放问答**: 把起草答案填进对应文本域。
  - **电话**: 默认**不填**;`browser_ask_user` 问要不要填、填哪个号。
  - **含糊/必填但无把握的**: 不猜,标出来问用户。
- **Step 5 — 缺口处理**: 登录/验证码/未知字段/多步翻页 → **停下**,
  `browser_ask_user` 说明,让用户处理。
- **Step 6 — 停在提交前(人工闸门)**: **绝不点 submit/apply/send**。给用户一份小结:
  填了哪些字段、传了哪个简历、哪些需要你补/确认——请**审阅后自己点提交**。
- **Step 7 — 投后回写(用户确认已提交后)**: 更新 `career/applications` 该行
  `status = applied`,设 `followup_due`(+7 天),per data.md 串行 in-place。

## 4. allowed_tools

```yaml
allowed_tools:
  - browser_navigate
  - browser_snapshot
  - browser_get_elements
  - browser_get_element
  - browser_fill
  - browser_fill_by_id
  - browser_type_by_id
  - browser_upload_file
  - browser_ask_user
  - brain_get_page
  - brain_put_page
```

> **刻意不含** `browser_click_by_id` / `browser_click` —— 不给点击工具,从工具层面杜绝
> 误点提交/翻页。需要点击(复选框、下拉展开、Next、Submit)一律交用户。这是"人工闸门"的
> 工具级保证,比只靠正文叮嘱更硬。

## 5. 边界(写进技能)

- **绝不**点击任何按钮(尤其 submit/apply/send)——工具里就没有 click。
- **绝不**编造——只填 cv/profile/报告里的真实数据。
- 电话默认不填,先问。
- 遇登录/验证码/多步导航 → 停下问用户。
- 一次一个岗位;不批量。

## 6. 验收

- `pack validate` 通过;`inspect` 仍列 16 技能;career-apply 引用(rules/writing/data)解析。
- CI 绿(manifest 校验)。
- 真实表单端到端由用户在 nevoflux 里验证(逐 ATS 磨合;agent 卡住会问)。

## 7. 备注 / 后续

- 保守 v1 不做多步表单自动翻页;若后续要,需谨慎设计"翻页但绝不到 submit"的护栏。
- career-auto-pipeline 的 Step 4(高分自动起草回答)与本技能互补:pipeline 起草进报告,
  career-apply 负责把它填进真实表单——二者共用报告 `## H`。
