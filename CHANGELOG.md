# Changelog

## 1.3.5 (2026-08-31)

修复：悬浮球「最近完成」小队卡在 TTL 边界显示 `undefined · 小队` + 黑色占位头像。

- 根因：`squad-run(end)` 日志行只带 `squadId`，`squadName`/`viaSquad` 只在已被 `loadRecent` 过滤掉的 `phase:'start'` 行才有。当该次小队运行的所有 `dispatch`/`result` 行时间戳超出「最近完成」TTL 窗口（默认 30 分钟）被过滤、只剩 `end` 行单独存活时，聚合逻辑的 `headD` 退回这条 `end` 行本身，`headD.squadName || headD.viaSquad` 两者皆 `undefined`，字面拼成 `"undefined · 小队"`；`setAvatarEl` 传入 `undefined` 名称也无法取首字，退化成异常占位块。
- 修复：`lib/client.js` 小队卡渲染改为优先按 `squadId` 查 `lastSquads`（注册表实时数据）反查真实 `name`/`emoji`，与「小队列表」分区同源；查不到才退回 `headD.squadName || headD.viaSquad || squadId || "小队"` 兜底，彻底解决名称显示 `undefined`、头像退化成异常占位块的问题。
- 影响：仅 client 半（浏览器 UI），纯前端渲染修复，无需重启 Desktop，刷新会话即可生效。

## 1.3.4 (2026-08-31)

修复：DSH 0.1.2 客户端硬依赖声明缺失——web boot `Failed to load plugins`，桌面壳只剩恢复按钮。

- 根因：0.1.2 起客户端服务必须在 bundle 内声明 inject（`exports.inject`，服务名列表），package.json 的 `dsh.client.inject`（模块依赖）不能替代。dispatch 的 `lib/client.js` 用 `ctx.slots`（hardDependency）却从未声明 `exports.inject`，loader 抛 `cannot get property "slots" without inject`。
- 修复：`lib/client.js` 的 `module.exports` 加 `inject: ["slots", "locale"]`；`package.json` 的 `dsh.client.inject` 补 `@deepseek-ai/dsh-client-store` + `@deepseek-ai/dsh-client-locale`。
- 影响：仅 client 半（浏览器 UI）；升级 dsh 0.1.2+ 后必须用本版本，需重启 Desktop 生效。

## 1.3.3 (2026-08-30)

修复：DSH 0.1.2 兼容——client 半挂载失败（面板/返回按钮/悬浮球/Agent 菜单全消失，host 半工具正常）。

- 根因：0.1.2 将 `slots` 服务改为 hardDependency 形态后，`ctx.get("slots")` 在插件 fiber 的加载时序下返回 `undefined`，`apply()` 开头 `if (!slots) return` 静默退出整个 client 半。
- 修复：`lib/client.js` 改用官方标准访问 `ctx.slots`（与官方插件一致），其余 `ctx.get("sessions")`/`ctx.get("inputTriggers")` 为可选服务访问，契约兼容，保持不动。
- 影响：仅 client 半（浏览器 UI），host 半无改动；升级 dsh 0.1.2+ 后需重启 Desktop 生效。

## 1.3.2 (2026-08-29)

修复：FAB「最近完成」小队卡完成数回退——checkpoint 分段执行下同 squadRunId 产生多条 end 行，旧逻辑后到的（更旧段）覆盖最新段，导致 design 完成后仍显示 1/5。

- 根因：`agent_squad_continue` 每次续跑都写一条 `phase:'end'` 的 squad-run 行（stepStatus 是累计快照），FAB 聚合时 `runEndById.set` 无脑覆盖，最新在前遍历时先 set 最新、后被更旧段覆盖。
- 修复：`runEndById` 首次 set 才保留（`if (!has) set`），`lastRecent` 最新在前 → 首次即最新最全的 stepStatus。历史页不受影响（其完成数走 dispatch 活体结局，不依赖 end 快照）。
- 路由表第 6 条补停等动作：产出文档展示完整路径/链接、有待确认问题逐条列出请用户作答，回答前不得续跑。

## 1.3.1 (2026-08-29)

新增：小队 checkpoint 停等的免重启配置能力（GUI 开关 + 工具）。

- `lib/client.js`：小队编辑表单（SquadForm）每步新增「产出后停等用户确认（checkpoint）」勾选开关，初始态读入、save 透传 `checkpoint` 字段。
- `index.js`：新增 `agent_squad_upsert` 工具——主 agent 免重启改小队（含各步骤 checkpoint），与 GUI 小队编辑保存同一条 `squadRegistry.upsert` 路径（内存 + 原子写盘立即生效）。
- `lib/dispatch.js`：递归护栏 `toolFilter.deny` 追加 `agent_squad_upsert`（共 8 个委派工具），阻断子代理改小队注册表逃逸。
- systemPrompt 路由表新增第 9 条：改 Agent 用 `agent_upsert`、改小队用 `agent_squad_upsert`，均免重启。
- `verify.mjs`：工具白名单、deny 清单、GUI 开关与工具断言同步更新（8 工具）。

## 1.3.0 (2026-08-29)

新增：小队结果级停等（checkpoint）——agent_squad 支持在指定步骤产出后暂停，等用户确认再续跑。

- 背景：kiligz-workflow 这类开发流程要求「每阶段产出后停等用户确认」，而旧 agent_squad 是单次工具调用内跑完全部步骤，无法中途停下问用户。
- `lib/squad-registry.js`：squad 步骤新增 `checkpoint` 布尔字段（默认 false），validate/upsert/list 透传并校验。
- `index.js`：
  - 抽 `runSquadSteps` 共享执行核心，按拓扑分层执行；每层跑完若含 `checkpoint:true` 且成功完成的步骤 → 停下返回 `paused:true`，否则继续下一层。
  - `agent_squad` 输出增加 `squadRunId` / `paused` / `nextStepIdx`；停等时把中间态存入进程内 `squadSessions`。
  - 新增 `agent_squad_continue` 工具：凭 `squadRunId` 续跑，可选 `note`（用户对上一阶段的反馈，拼入 goal 供后续步骤可见）。
  - systemPrompt 路由表第 6 条补 checkpoint 停等引导：带 checkpoint 的小队必须停下等用户确认，禁止未确认自动续跑。
- `lib/dispatch.js`：递归护栏 `toolFilter.deny` 追加 `agent_squad_continue`（共 7 个委派工具），阻断子代理续跑小队递归。
- `verify.mjs`：工具白名单、deny 清单、checkpoint 透传与续跑断言同步更新。
- 中间态为进程内内存，Desktop 重启失效；跨重启断点恢复靠各阶段 Agent 写 `.kiligz-state.json` 兜底。

## 1.2.0 (2026-08-29)

新增：`agent_upsert` 工具——主 agent 可直接新增/更新单个 Agent，免重启生效。

- 根因：此前改 Agent（含 systemPrompt）只有两条路——GUI 编辑保存（浏览器同源 REST）或手改 `agents.json` 文件（需重启才读盘）。命令行直连 `/agent-api/upsert` 被宿主 webserver 403 拦截，主 agent 无法走 GUI 同款逻辑。
- 修复：把 GUI 编辑保存同款的 `registry.upsert()`（内存 + 原子写盘，立即生效）暴露成 `agent_upsert` 工具，主 agent 直接调用即可改 Agent 注册表，无需重启、无需点 GUI、无需绕 skill 导入。
- 递归护栏同步：`startContinuable` 的 `toolFilter.deny` 清单追加 `agent_upsert`，阻断子代理用该工具自我改 persona 逃逸（子代理看不到改注册表能力）。
- 版本断言：`verify.mjs` 工具白名单与 deny 清单断言同步更新。

## 1.1.2 (2026-08-29)

修复：递归护栏——dispatch 的 `startContinuable` 加 `toolFilter.deny` 物理阻断子代理再委派。

- 根因：`maxDepth` 只是委派深度记账，不是"禁止派下级"；子代理继承主会话工具面（含 `agent_dispatch`/`agent_squad`），遇到未闭环状态会自行续派新子代理，造成"关了又开、递归开子代理"。
- 修复：每个被派出的 agent 子代理 `toolFilter.deny` 全部 5 个委派工具（`agent_dispatch`/`agent_followup`/`agent_list`/`agent_squad`/`agent_import_skill`），从工具注册表层物理斩断递归，非 prompt 软约束。
- 小队不受影响：squad 由主 agent 调 `agent_squad` → host 解析模板逐 step dispatch，step agent 只需业务工具。

## 1.1.1 (2026-08-28)

工程维护（无功能变更）：

- 新增 `.gitignore`（node_modules、日志、OS 文件、本地数据目录）。
- 新增 GitHub Actions CI：`node verify.mjs` 一致性断言 + 冒烟，push 与 PR 触发。
- 修复 `verify.mjs` 冒烟桩缺 `ctx.on`，消除 `subagent/end 订阅失败` 误报。
- `package.json` 补 `author` / `repository` / `homepage` / `bugs` 元数据。

## 1.1.0 (2026-08-28)

破坏性重构：`expert` 全面改名 `agent`，删除全部内置 Agent 与小队。

**核心变更**
- 工具改名：`expert_dispatch` / `expert_followup` / `expert_list` /
  `expert_squad` / `expert_import_skill` → `agent_dispatch` / `agent_followup` /
  `agent_list` / `agent_squad` / `agent_import_skill`。
- 数据文件与字段：`experts.json` → `agents.json`；`expertId` / `expertName` /
  `expert` / `experts` → `agentId` / `agentName` / `agent` / `agents`。
- 类名：`ExpertRegistry` → `AgentRegistry`、`skillToExpert` → `skillToAgent`、
  `ExpertForm` → `AgentForm`；文件 `lib/experts.js` → `lib/agents.js`。
- REST 面：`/expert-api/*` → `/agent-api/*`。
- **删除 4 个内置 Agent**（requirement-analyst / code-reviewer / log-tracer / sql-analyst）
  与 **3 个内置小队**（dev-pipeline / debug-squad / review-squad）；`DEFAULT_AGENTS`、
  `DEFAULT_SQUADS` 置空数组，全新安装从空列表开始。
- 删除 `deletedIds` 防复活机制（无内置可删，不再需要）。
- README 双语重写：悬浮球截图上移、换用户提供的 7 张真实 UI 图、扩充用法章节。

**破坏性**
- `expert_*` 工具名失效：既有会话/脚本里写 `expert_dispatch` 的需改为 `agent_dispatch`。
- 已落盘的 `experts.json` 不再读取（改名 `agents.json`），历史委派记录清空重来。

## 1.0.0 (2026-08-28)

首个对外正式版。经历 40 个内部迭代后定型：双面插件（host + browser），
5 个模型工具（expert_dispatch / expert_followup / expert_list /
expert_squad / expert_import_skill），主面板 4 个子 tab（总览/Agent/
小队/历史），会话头部返回按钮，悬浮活动球（含 8 种色调/8 段边缘流光/
透明度/总开关），`/` 触发器 Agent + 小队候选菜单。

**核心能力**
- 4 个内置专家：requirement-analyst（需求分析师）/ code-reviewer（代码审查员）/
  log-tracer（线上排查员）/ sql-analyst（SQL 分析师）；用户可自定义/启用/禁用。
- 3 个内置小队模板：dev-pipeline（需求→审查串行）/ debug-squad（日志+数据+代码三路并行）/
  review-squad（业务+数据双路并行）；用户可扩展。
- 模型路由互备：每个专家的 routes 列表按优先级试 provider/model，首选失败自动换下。
- 完整生命周期：subagent/end 事件订阅 → 真实结局 → dispatches.jsonl 审计日志
  → 历史页四态展示（运行中/完成/失败/孤儿）。
- 就地调用：点 Agent/小队卡片走 `conversation.input.shell.setDraft("$id ")`，
  一键填入输入框；老宿主 DOM 兜底。
- skill 一键导入：`~/.dsh/skills/<name>/SKILL.md` → 专家 systemPrompt。

**清理（v0.9.40 → v1.0.0）**
- 删 `lib/client.js.bak-20260827-190331`（开发残留备份，200KB）
- 删 `docs/PLAN.md`（已过期的开发计划，非用户文档）
- 删 `index.js` 内重复的 `topoLayersOf`（与 `lib/squads.js` 的 `topoLayers` 同源）
- 删 `expert_squad` 工具参数的 `args.squadId ?? args.id` 死 alias
  （schema 只声明 `squad_id`）
- 更正 `index.js` / `cordis.patch.yml` / `lib/client.js` 顶部注释（v0.2 Settings
  UI 描述、/expert slash 命令等已过时的内容）
- 重写 README.md（中文优先 + Mermaid 状态图 + 真实 UI 截图）
- 同步更新 README.en.md 英文版

**发布渠道**：GitHub + 1024Store + dshmarket + awesome-DSH-plugin +
dsh-plugin-store + dsh.deepseek404.com（npm 不发）。

## 0.9.40 (2026-08-27)

修两件：小队并发卡死 + 任务卡片计数缺。

- **根因（同一处）**：`activeChildren` 用 **expertId 做 Map key**。dev-pipeline 的 S2/S6 同为 code-reviewer 并发派发 → 后者覆盖前者的 entry → 前者子代理结束时 `onChildEnd` 找不到匹配 → `waiter` 永不兑现 → `expert_squad` 的 `Promise.all` 永挂（主代理卡死、后续层不派发、面板只出部分卡）。
- **改法**：`activeChildren` 改 **childId 主 key**（entry 带 expertId），多子代理并存；新增 `byExpert` 二级索引（expertId → childId）供直接委派复用续聊；`onChildEnd` childId 直查；`/expert-api/active`、`/cancel`、总览端点同步适配；客户端中止按钮改按 childId 精确取消（同专家多卡并发）。
- **`dedicatedChild` 参数**：小队步骤显式传 `dedicatedChild: true`，跳过同专家复用续聊，强制新建专属子代理——否则续聊会把第二层任务强塞给正在跑第一层的 child，且并发等待器互相踩。
- host+client 改动：host 需重启 Desktop；client 刷新生效。

## 0.9.39 (2026-08-27)

修：0.9.38 启动崩——`unsupported JSON schema: schema.properties.output.type must be a single type string (type arrays are not supported)`。

- **根因**：宿主 `dsh-tools` 的 `assertSupportedJsonSchema` **不支持 type 数组**（`type:['string','null']` 直接抛 `JsonSchemaError`），0.9.38 给 OUTPUT_SCHEMA 加 `output` 可空字段用了 type 数组 → 插件加载即崩。
- **修**：可空字段改 `oneOf` 表达——`output: { oneOf: [{type:'string'}, {type:'null'}] }`。宿主校验 `oneOf` 分支各自单类型合法（`null` 是合法单类型）。
- 教训：DSH 工具 schema **禁 type 数组**，可空一律 `oneOf`。
- host 端改动，需重启 Desktop 生效（用户决定）。

## 0.9.38 (2026-08-27)

修两件（用户：①直接调 Agent 报 'value.output' is not a declared property ②小队卡死）。

- **OUTPUT_SCHEMA 补 `output`/`ok` 字段**：v0.9.36 dispatch 返回值新增 output/ok，但 schema 未同步声明，`additionalProperties:false` 把未声明字段判非法 → `expert_dispatch` 工具调用报错。已声明 `output: {type:['string','null']}`、`ok: {type:'boolean'}`。
- **`lastAssistantMessage` 归一化（`#normOutput`）**：宿主该字段形态不稳定（字符串 / 消息块数组 `[{type:'text',text:'..'}]` / null）。数组原样透传 → `expert_squad.execute` 里 `.trim()` 抛 TypeError → 步骤卡死。新增 `#normOutput` 提取文本；execute 侧 `String()` 兜底。
- **`waitResult` 默认改 `false`**：直接调 Agent（`expert_dispatch`）立即返回、主代理不阻塞；仅 `expert_squad` 小队步骤显式传 `waitResult:true` 等结果（结果级串行）。用户：「直接调 Agent 不要有这个校验，小队自动调用的才要有」。
- host 端改动，需重启 Desktop 生效（用户决定）。

## 0.9.37 (2026-08-27)

改：悬浮球完成彩色呼吸光常驻 + 点击回退（用户：完成光效太短；点击后按活跃状态回退）。

- **`done-glow` CSS 改无限循环**（`ad-fab-glow-done 1.6s ease-in-out infinite`）——完成光不再 3 周期/5s 消散，常驻呼吸。
- **新增 `clearDoneGlow()`**：点击悬浮球（`togglePop` 入口）清 `done-glow` + `doneCount`。有活跃任务时 `fab-live` 白光呼吸保持（poll 已挂），无活跃任务回初始态（无动画）。
- **poll 状态校正**：每 5s 按活跃状态维护光效——`arr.length>0` 去 `done-glow`（彩色让位白光）；`doneCount>0` 且无活跃时补回 `done-glow`（新完成重新亮起）。
- 纯 client 改动，刷新生效。

## 0.9.36 (2026-08-27)

改：小队步骤依赖从「派发级」升级为「结果级」串行（用户：小队依赖没生效，6 步 64ms 内全派出）。

- **根因**：`expert_squad` 层间 `await` 只等 `dispatch` 调用返回（`startContinuable` 立即返回 childId），不等子代理跑完；`stepResults` 填「已委派」占位 → `{prev:N}` 拿不到前置真实结论，且任务管理面板瞬间全出 6 卡。
- **`dispatch()` 新增 `waitResult`（默认 `true`）+ `waitTimeoutMs`（默认 1 小时）**：dispatch 后挂起 Promise，由 `subagent/end` 事件（`lastAssistantMessage`）兑现；返回 `{ ..., output, ok }`。置 `false` 恢复旧行为（立即返回）。
- **`onChildEnd` 兑现等待者**：completed → resolve 结果文本；非 completed → resolve 失败占位。`result` 日志行顺带记 `output`（截断 4000）。
- **`expert_squad.execute`**：`stepResults[idx]` 填真实步骤结论（`（步骤 N 结论）\n{output}`），`{prev:N}` 替换真实前置输出；依赖链真正串行，同层并行保持。
- **注意**：`expert_dispatch` 单 agent 委派同样默认等结果（调用方工具调用会阻塞至子代理结束）。
- host 端改动，需重启 Desktop 生效（用户决定）。

改（UI，纯客户端刷新生效）：设置页整体删除，信息迁入总览 + 悬浮球总开关（用户：设置里红框说明不要，其余内容移到 Agent 调度总览，加一个是否展示悬浮球开关）。

- **设置页删除**：`settings.section` 槽注册 + `SettingsTab` 组件移除——设置侧边栏不再出现「Agent 调度」入口（红框说明文字一并删除）。
- **信息迁入总览**：默认跟随模型 / 数据目录 / 触发方式三行迁入主面板「总览」子页顶部设置卡片（`ad-set-card`），复用统计卡视觉语言。
- **「显示悬浮球」总开关**：总览页设置卡片首行；关=悬浮球强制隐藏（含运行/完成提醒，优先级高于 always/auto/never 显示模式），开=恢复显示模式逻辑；`localStorage`（`ad-fab-visible`）持久化，切 tab 保持。
- 悬浮球设置浮层（色调/呼吸/透明度/最近完成时长）保留，仍由悬浮球弹窗 ⚙ 打开。

改（v0.9.37）：`/expert` slash 命令删除 + 触发方式文案更新（用户：/expert 不好用，删了）。

- **删除 `/expert` 命令**：`ctx.commands.register({ name: 'expert' })` 整块移除，`inject` 去掉 `'commands'`，cleanup 去掉 `disposeCommand?.()`。触发方式只剩：对话自动路由 / 输入 `/` 菜单选 Agent（插入 `$id`）/ 悬浮球选定 Agent 自动插入当前会话（`dispatchTokenToComposer` 既有实现）。
- **触发方式文案**更新：总览页「触发方式」改为「对话自动路由；输入 / 唤起菜单选 Agent（插入 $id）或手打 $Agent名 直接指定；悬浮球选定 Agent 自动插入当前会话」。
- host 端改动（删命令），需重启 Desktop 生效（用户决定）。

## 0.9.35 (2026-08-27)

改：小队步骤子代理的会话标题（label）加步骤位标（用户：「任务管理面板能不能把步骤数也加上」——截图里 6 张「需求分析师/代码审查员 · 链路测试任务」卡分不清第几步）。

- `dispatch()` 新增 `totalSteps` 参数；小队（viaSquad）发起且 stepIndex+totalSteps 齐备时，`childLabel` 拼 `[S{n}/{total}]`：`需求分析师 [S1/6] · 任务摘要`。
- `expert_squad` 调用 dispatch 时传 `totalSteps: squad.steps.length`。
- 普通单 agent 委派（非小队）label 不变。
- host 端改动（label 在 startContinuable 时生成），需重启 Desktop 生效（用户决定）。

## 0.9.34 (2026-08-27)

修两件 + 递归护栏（用户：①测试 dev-pipeline 出现递归爆炸 ②「最近完成」计数不对，小队维度应为 1 ③小队 6 步只显示 2 步完成）。

- **递归护栏（host）**：`expert_squad` 每个 step 委派的任务文本追加【执行终点声明】——明确专家子代理为本轮执行终点，严禁再调用 `expert_dispatch / expert_squad / expert_followup` 继续派发。根因：测试 goal 被 step 子代理当成真实任务又组新小队，6→36→…指数递归（实测树深 4-5、残留 120+ 子代理）。host 端改动需重启 Desktop 生效（用户决定）。
- **「最近完成」计数 = 任务单位**：此前按 dispatch 行数计（一个小队 6 步算 6 条），现按聚合组数计（一次小队运行 = 1 个单位，普通 agent 委派各算 1）。`squad-run(end)` 行已计入 TTL 过滤（此前漏掉 → 整次运行完成也只在有 dispatch 行时才出现）。
- **小队卡步数 = run 全量**：步骤数/完成数改取 `squad-run(end)` 的 `stepStatus` 长度与 done/skipped 计数（此前只数 dispatch 行，等待/未回报的步骤不计 → 6 步显 2）。无 run 终态的旧记录退化为 dispatch 行数。纯客户端改动，刷新生效。

## 0.9.33 (2026-08-27)

删：悬浮球绿点角标（用户：「悬浮球的活动中和执行完成的绿点都删了吧，现在有光效提醒」）。

- **活跃绿点**（`.ad-fab-dot` / `liveDot`，右上角 11px 圆点）删除——运行中状态已由 `fab-live` 白光呼吸（2.6s 加速）指示。
- **完成 ✓N 角标**（`.ad-fab-done` / `doneBadge`）删除——完成提醒保留 `done-glow` 彩色光呼吸（绿→蓝→琥珀 3 周期≈4.8s），5s 后消散。
- 显隐逻辑不变：`doneCount` 仍驱动 auto 模式下完成后 5s 内保持显示。纯客户端改动，刷新即生效。

## 0.9.32 (2026-08-27)

修 + 改三件（用户：①悬浮球面板报「加载遇到问题」②活动中/最近委派去掉卡片按钮，点击直达主会话 ③直接调用的小队整体展示，不展开成员）。

- **① 悬浮球面板「加载遇到问题」**：面板 body 构建段 try/catch 降级文案。根因是 `openAgentSession` 收到**对象形态 childId**（宿主 `startContinuable` 返回形态因版本而异）时 `sessions.open` 抛类型错误，renderPop 构建循环整段被 catch 兜住降级。修：新增 `normalizeChildId`（字符串原样 / 对象取 `.id ?? .childId ?? .runId` / null），`openAgentSession` 入口统一归一化，跳转失败仍静默不压栈；host `/expert-api/active`、`/overview` 出口同步归一。host 端改动需重启 Desktop 生效。
- **② 卡片去按钮，点击直达主会话**：最近完成/运行中卡片悬停的 ⇱/⇲ 快捷按钮删除（含样式 `.ad-fab-jumps`/`.ad-fab-jump`/`.ad-fab-card-sub`）；单 agent 卡点击 = 跳主会话（`parentSessionId` 优先，无则子会话）。底部「打开 Agent 调度面板」按钮保留。
- **③ 小队整体展示**：最近完成分区的 `viaSquad` 行聚合成一张小队卡（小队头像 + 名称 · 小队 + N 步完成），不再展开成员子卡；运行中分区新增小队聚合——小队发起的活跃行显示小队卡（host 侧 `activeChildren` 补存 `viaSquad/squadRunId`，`/expert-api/active` 回填 `squadName/squadEmoji`），点击直达主会话。纯客户端 ②③ 刷新生效；①和运行中聚合是 host 端改动，需重启 Desktop 生效（用户决定）。

## 0.9.31 (2026-08-27)

改：编辑/新建小队弹窗固定大小，内容超高在弹窗内滚动（用户：「这个编辑小队弹窗固定大小，往下滑动吧」——弹窗被 6+ 步骤卡撑出视口、底部保存/取消按钮被裁）。

- **根因**：v0.9.25 毛玻璃给 `.ad-panel` 加 `backdrop-filter`，使内部 `position:fixed` 遮罩退化为相对面板定位；弹窗原 `max-height:88vh` 一旦高于面板区就溢出窗口底边，内容把底部按钮顶出可视区。
- **修法**：`.ad-modal.form` 从 `max-height` 改固定 `height:min(760px,100%)`——弹窗不再被内容撑大，超长内容在 `ad-modal-body` 内滚动；遮罩补 `grid-template-rows:1fr` 明确网格轨道，保证弹窗百分比高度可解析。
- **验证**：无头实测三方案对比——`100%` 网格区版本严丝合缝（溢出 -23px）且内部可滚；`86vh` 版本溢出 8px；旧 `88vh` 按面板顶齐（面板矮窗口时正常，面板高时溢出）。
- **波及**：`.ad-modal.form` 同时覆盖「编辑 Agent」弹窗（同结构同受益）。刷新生效。

## 0.9.30 (2026-08-27)

修三项（用户：①执行流节点文字超出框 ②agent历史跳转没到对话页面 ③删除委派历史报「缺少有效 ts」）。

- **① 节点标签截断**：SVG `<text>` 不会自动截断，节点可用宽仅 ~60px（108×0.9 − 序号区 30 − 留白 8），长阶段名必溢出。新增 `fitFlowLabel`：canvas `measureText` 按实际字号（小图 10.5px / 大图 12px，与 CSS 一致）像素测量，超宽逐字截断加「…」；原文挂 SVG `<title>`，鼠标悬浮可见全名。卡片小图/历史预览/弹窗大图三处共用 `SquadFlowGraph`，一并生效。
- **② 跳转后强制回对话页**：两处历史跳转调的本来就是同一个 `openAgentSession`，行为差异来自**目标会话持久化的视图**（`localStorage dsh.conversation.chat.<sessionId>`）——上次停在「Agent 调度」页的会话跳过去就停在那里。新增 `ensureChatView`：`sessions.open` 后短轮询（≤0.6s）会话头部视图标签栏，首标签「对话/Chat」（chat 视图 order:0 恒第一）未选中则点击（走官方 `setView`，内存+持久化同更新）；只有一个视图（必为对话页）则无操作。统一作用于所有跳转入口，语义一致：跳到会话看对话。
- **③ 删除报「缺少有效 ts」**：JSONL 写入用 `new Date().toISOString()`（ISO 字符串），删除端却 `Number(body.ts)` → NaN → 一律 400。修：校验兼容字符串/数字，匹配统一 `String(row.ts) === tsKey` 字符串比对。
- 纯客户端①②刷新生效；③是 host 端改动，**需重启 Desktop 生效**（用户决定）。悬浮球代码零改动。

## 0.9.29 (2026-08-27)

修：从历史页点跳转再返回，面板回到「总览」而不是停在历史页（用户反馈）。

- **根因**：`conversation.view` 槽位组件按会话挂载——切到跳转会话时旧会话的面板被卸载，切回时重新挂载，`React.useState` 初始值把 `tab` 重置回默认的「总览」。
- **修法（面板状态跨会话持久化）**：`tab`（总览/Agent/小队/历史）、历史分段（agent 历史/小队历史）、展开行键三项提升到模块级 `uiState`，组件重挂载时惰性读取最新值立即恢复；配 `uiSubs` 订阅 + `uiNotify` 广播，双实例并存时同步。纯客户端改动，刷新即生效；悬浮球代码零改动。

## 0.9.28 (2026-08-27)

改：「← 返回」按钮从 Agent 调度面板内挪到会话头部槽（用户：「需要点到 Agent 调度页再点返回很怪」）。

- **新位置**：挂 `conversation.session.header.actions` 官方槽——会话标题旁的操作行，**任何 tab 视图（对话/轨迹/Agent 调度）下都可见**，跳转后一跳即回，不必先切面板。
- **实现**：`HeaderBackButton` 组件订阅导航栈变化，栈空时返回 null 不占位；样式 `.ad-header-back` 自包含（渲染在 `.ad-panel` 之外，用语义化 token，不引用面板内 `--ad-*` 变量）。
- **删除**：面板标题行内的返回按钮（`ad-btn mini ad-back-btn`）——避免重复，面板头回归干净。
- 导航栈逻辑不变（跳转前抓 `aria-selected` 侧边栏标题压栈，返回按标题直点，点不到 `sessions.search` 兜底，上限 20 层）。刷新生效。

## 0.9.27 (2026-08-27)

修：悬浮球面板展开后塌成只剩头部一条（用户：「面板展开后成这样了」）+ 新增返回按钮。

- **塌缩根因（结构性）**：`renderPop`/`openFabSettings` 先 `pop.textContent=""` 清空，再逐段构建 head/body/foot 边建边挂——中途任何异常（数据字段类型异常等真机时序问题）都留下「只有头部」的半残面板，且 5s 轮询每次重试都重新清空重新炸 → 永久损坏。现场几何证据：面板顶在原位、玻璃层只剩头高（~62px）、悬浮球孤悬在面板下方远处。
- **修法（原子渲染）**：head/body/foot 全部先建进 `DocumentFragment`（脱机，抛错不伤现有内容）；body 构建段包 try，异常降级空态文案；构建全部完成后才清空旧内容一次性挂入——面板任何时刻都不半残。主视图与设置视图同款加固。无头回归：展开/分区切换/运行→完成过渡/设置视图/返回主视图全链路零错误。
- **返回按钮（方案A，本系列早前待办一并发布）**：主面板标题行在导航栈非空时出现「← 返回」——跳转会话前压栈当前会话标题（侧边栏 `role=treeitem` 抓标题），点返回按标题直点侧边栏行，点不到走 `sessions.search` 兜底。栈上限 20 层。

## 0.9.26 (2026-08-26)

修：小队历史步骤大量「未知」误判（用户：「怎么还这么多未知状态的」）。

- **根因**：步骤状态旧逻辑只认 dispatch 行的活体结局（result 配对）；result 配对丢失（重启 Desktop 等）即判「未知」，而 end 行明明记录了全部步骤 done 也不采信。
- **修法（权威级联）**：① dispatch 行有活体结局（ended）→ 直接信；② 运行已终止（end 行到）→ 信 end 快照（done/failed/skipped）；③ 运行未终止 → 活体推断（运行中/孤儿→未知）。纯客户端，刷新生效。

## 0.9.25 (2026-08-26)

修：面板毛玻璃「没生效」（用户：「2和3都没生效，不要改动悬浮球相关的代码哈」）：

- **③ 毛玻璃真根因**：面板挂在右侧 tab 页，背后是宿主**实色面板壁**——纯 `backdrop-filter` 在实色上模糊不出任何质感。0.9.21 的「半透明底+blur」在悬浮球（floating 于内容之上）有效，在右侧 tab 页结构性失效。改「玻璃拟态」：语义 layer 渐变底（layer-1 82%→base 92%，禁 white 混色保证亮暗稳）+ 保留模糊 + 1px 玻璃边框（border-l2 65%）+ 顶部内高光（inset layer-2）+ lv3 软阴影 + 14px 圆角。悬浮球相关代码零改动。
- **② 小队执行流「没生效」**：非代码问题——日志里 0 条 `squad-run` 快照行（0.9.18 宿主记录功能需重启后生效，重启后尚未跑过新小队）。补小队历史空态说明：「若重启 Desktop 后仍为空，请先跑一次小队」。
- 纯客户端改动，刷新生效。

## 0.9.24 (2026-08-26)

- **修：单选白球偏心（真根因）**——不是 CSS 写法问题：9px 白球在 14px 灰圆里需要 2.5px 边距，**半像素无法对称**，浏览器取整后左/上 3px、右/下 2px（sharp 像素级实测：白球 bbox 宽 9 高 9、灰圆宽 14 高 14，白球左上多 1px）。改白球 **10px** → 边距恰好整数 2px 四向严格对称；灰圆 14px 不变，`margin:auto` 定心保留。
- **修：滚动条出现瞬间卡片变窄**——内容高度临界溢出时滚动条一出现，卡片内容区被经典滚动条挤掉约 15px。给 `.ad-fab-pop-body` 加 `scrollbar-gutter:stable` 恒留槽位，卡片宽度不再随滚动条出现/消失跳变。

## 0.9.23 (2026-08-26)

五连修（用户反馈截图驱动）：

- **修：面板莫名跳回顶部**——`renderPop` 每次 5s 轮询/异步回调都整体重建面板，新建的 `.ad-fab-pop-body` scrollTop 归零。重绘前抓旧滚动位置、渲染后还回（内容变短时浏览器自动钳制）。
- **面板卡片同底化**——`.ad-fab-card` 弃实底（`bg-layer-1`），与面板同底只靠边框区分（符合既定偏好「同底靠边框，禁 hover 变色」）；显式 `box-sizing:border-box` 防宿主全局 box-sizing 差异造成 1px 错位。
- **修：悬浮球不在面板横向正中**——`placePop` 宽度写死 236px（历史面板宽），现面板 360px → 居中与边缘钳制全错位。改取实测 `pop.offsetWidth`，并让下方弹出也防出 app 边界（`innerHeight - h - 8` 钳制），贴边自适应。
- **最近完成默认展开**——打开面板时与「运行中」一致展开（`secOpen.recent` 默认 true，含 `closePop` 归位处）；Agent/小队列表保持折叠（注册表性质，量大）。
- **修：单选白球偏离中心**——`::after` 弃 `inset:2.5px`（宿主全局 `box-sizing` 干扰下基准不稳），改显式 `box-sizing:content-box` + `inset:0;margin:auto;width:9px;height:9px` 四向定心；灰圆 14px、白球 9px 尺寸均不变。

## 0.9.22 (2026-08-26)

- **修：悬浮球面板展开重叠**——根因是 `.ad-fab-pop-body`（flex 列 + `max-height:300px`）的子项默认 `flex-shrink:1`，内容超高时子项先被压扁再溢出，卡片互相叠压。给 body 直接子项加兜底 `.ad-fab-pop-body>*{flex:none}`，并对 `.ad-fab-box` / `.ad-fab-card` / `.ad-fab-agents` / `.ad-fab-sec` / `.ad-fab-set-row` / `.ad-fab-modes` / `.ad-fab-mode` / `.ad-fab-tone-row` 逐一禁压缩，超高改走 body 滚动。
  - 验证：无头 Chrome 确定性测量新旧两版——旧版实测卡片重叠 34px/10px/120px（`bodyH=320 scrollH=320`，内容被压扁）；新版 `scrollH=624` 零重叠，内容滚动。
- **单选白球再加大**：灰圆保持 14px 不变（用户：「灰圆别变大」），白球 `::after` inset 4px→2.5px（6px→9px）。
- **去括号副标题**：设置页「面板透明度」「悬浮球透明度」副标题删除（模糊保留）（色调同步淡化）；运行中空态「（已全部结束）」改为「已全部结束」。
- 设置行副标题（`.ad-fab-set-row .t2`）补单行省略号，防说明文字与右侧数值叠印。

## 0.9.21 (2026-08-26)

历史页重设计 + 整面板毛玻璃化（用户：「历史页面重新设计一下，列表连个标题行都没有」「小队历史直接把小队页面的执行流拿过来用……只读，增加一个执行状态」「整体Agent调度页能不能像悬浮球活动面板那样，都做成毛玻璃样子」）：

- **历史列表标题行**：Agent / 小队 两列表分段下方各加一行灰字列头（时间｜头像｜名称｜消息｜状态｜操作，`ad-hist-colhead`，与行内列宽对齐）。
- **执行流图例**：小队历史展开区顶部加状态图例（完成/当前执行/失败/等待·跳过 四色样本，`ad-legend`）——执行流图本身 0.9.18 已复用小队页组件（只读+节点状态着色），本轮补图例说明。
- **整面板毛玻璃化**：面板根背景改半透明（bg-base 78%）+ blur(18px) saturate(1.4)，与悬浮球面板同配方；内层卡片/展开区/任务框改半透明叠层（layer-1 62%），亮暗主题自适应（全部 color-mix 语义 token，无写死色值）。
- 纯客户端改动，刷新页面生效。

## 0.9.20.1 (2026-08-26)

- **修：点选跳回顶部**——展示时长/色调单选点击后不再 `openFabSettings()` 整体重绘（重绘重建滚动容器，滚动位置归零）；改就地翻转 `.on` 类（`dataset` 标记当前项），滚动位置保持。
- ~~单选白球加大~~（尝试后用户否决：灰圆别变大、白球维持原样 14px 灰圆 + inset 4px，已还原）。

## 0.9.20 (2026-08-26)

面板去蓝 + 单选框 = 开关视觉（用户截图反馈：「按钮颜色同底边缘区分」「单选框灰底白球」「悬浮变蓝也不要」）：

- **底部栏同底化**：`.ad-fab-pop-foot` 背景 `--dsw-alias-bg-layer-1` → transparent（与面板同底）；主按钮弃 `--dsw-alias-state-business-primary` 蓝填充 → 透明底 + 边框 + 主文字色，hover 只加浅底与边框加深（活动页/设置页同款）。
- **悬浮不再变蓝**：⚙/✕ 头部按钮与 `.ad-fab-jump` 跳转小按钮的 hover 由蓝色文字 → `--dsw-alias-label-primary`；色调选中态蓝边 → `--dsw-alias-border-l3` 加深边。
- **单选框 = 开关视觉（用户定稿）**：未选=纯灰圆（`--dsw-static-neutral-bluish-600`），选中=灰圆中心白球（`::after` 13px 白点），全程无蓝色；行选中仅边框加深。与开关/滑杆同一视觉族，亮暗主题通用。
- **需刷新页面生效**（纯 client 改动）。

## 0.9.19 (2026-08-26)

面板细节三连（用户：「运行中的空白面板再大一些」「设置页卡片跟面板同底色」「滑动百分比球做成 switch 一样白球灰底」）：

- **空态占位加高**：`.ad-fab-empty` padding 10px→22px（运行中「（已全部结束）」等空态不再贴成一行）。
- **设置页卡片与面板同底**：`.ad-fab-set-row` 背景 `--dsw-alias-bg-layer-1` → transparent，只留边框区分层次（与 0.9.17.1 分区卡 `.ad-fab-box` 对齐）。
- **滑杆球 = 开关视觉**：透明度滑杆弃 `accent-color` 原生外观，自定义 `-webkit-slider-*`/`-moz-range-*` 双伪元素——4px 灰轨（`--dsw-static-neutral-bluish-600`）+ 13px 白球（`--dsw-static-neutral-bluish-00`）+ 1px 边框，与 `.ad-switch` 同色系，亮暗主题通用。开关/滑杆统一规范已记入记忆（用户定稿「以后 UI 开关和滑动球都按这个来」）。
- **需刷新页面生效**（纯 client 改动）。

## 0.9.18 (2026-08-26)

历史页拆分：Agent 历史 / 小队历史，小队运行带执行流进度图（用户：「历史tab页把Agent和小队分开……小队列表要多一层级……能标识小队的执行进度，到哪个agent了」+「看是这样的进度还是直接一个执行流程图，到哪个节点一清二楚」「agent历史、小队历史ui还是尽量一致吧」）：

- **分段切换**：历史页顶部 `Agent 历史 / 小队历史` 分段（`.ad-seg`）。
- **两列表行头结构统一**：时间｜头像｜名称｜摘要｜状态｜操作，同走 `histHead`。
- **小队历史两层级**：一行 = 一次小队运行（步骤进度徽标 done/total + 整体状态）；点开 = **执行流程图**（复用 `SquadFlowGraph`，新增 `statuses` prop，节点按状态着色：完成绿/当前亮/失败红/跳过虚线降透明）+ 步骤明细行（状态词 + 跳转子 Agent）+ 目标详情框；点节点亦可跳该步会话。
- **数据侧（宿主，需重启生效）**：每次小队执行写两行 `squad-run` 日志——`start`（拓扑快照：步骤+依赖+名称+目标）与 `end`（各步状态数组）；步骤派发带 `squadRunId`+`stepIndex`；`mergeDispatchHistory` 透传运行日志行；新增 `/expert-api/history/remove-run` 整次运行删除端点。旧记录无拓扑快照 → 按小队+10 分钟时间窗兜底分组，仅列步骤明细（无图）。
- **删除语义**：小队历史行删除 = 整次运行（两行运行日志 + 全部步骤派发 + 对应结局），带二次确认。

## 0.9.17 (2026-08-26)

悬浮球活动面板卡片化 + 球态效重做（用户：「面板ui再优化一下，改成卡片折叠」「运行中白光呼吸，完成彩色光呼吸，几秒后消失」）：

- **四分区卡片化**：运行中 / 最近完成 / Agent 列表 / 小队列表 各成独立圆角卡片（`.ad-fab-box`：边框+圆角+浅底），标题行 = 名称 + 计数 + 右对齐箭头，点标题行整卡折叠；展开状态仍走面板级 `secOpen`（新增 `run`，关面板归位，重绘不回弹）。
- **运行中空闲不占空白**：活跃为 0 时「运行中」卡整体不渲染（头部 chip 已显示「空闲」），不再有截图反馈的大片空区块；加载中态保留。
- **完成提醒重做**：删 0.8.10 彩虹庆祝 `celebrate`（放大上跳+橙蓝多色）与 `flash-done` 扩散环；改 `done-glow` 彩色光呼吸（绿→蓝→琥珀柔光循环 1.6s×3 ≈ 4.8s，无放大无跳动），✓N 角标 5s 后随光晕消散。
- **运行中白光呼吸**：有活跃任务时球体 `fab-live`（白光呼吸 2.6s 加速），结束后回落常态节奏；不受「呼吸光晕」常态开关约束。
- **需刷新页面生效**（纯 client 改动）。

## 0.9.17.1 (2026-08-26)

- **修：面板中「运行中」卡片消失**——空闲时整卡不渲染改为始终渲染（空闲显示「（已全部结束）」空态占位，卡片与标题行常驻）。
- **运行中默认展开**（`secOpen.run = true`，关面板归位时保持展开）。
- **分区卡片与面板同底色**：`.ad-fab-box` 背景改 transparent（不再叠浅底），只靠边框区分层次（用户反馈卡片底色与面板不协调）。

## 0.9.16 (2026-08-26)

悬浮球活动面板五连改（用户截图反馈，载体=自研悬浮球面板，非 better-sidebar 任务管理）：

- **「最近委派」→「最近完成」（方案D）**：只展示限时内已完成任务——`loadRecent` 按设置项 `recentTtlMin`（默认 30 分钟，设置面板可选 10/30/60）+ `ok && ended && !orphan` 过滤；过期自动消失，不再常驻占地。分区**默认折叠**成一行计数，点击标题展开。
- **最近完成按小队维度聚合**：连续同 `viaSquad`+`parentSessionId` 的行聚成一张小队卡（小队名 + N 步完成 + 状态），点开才列成员子行（缩进+指引线，保留跳子会话/主会话按钮）；非小队委派保持单行。host `mergeDispatchHistory` 出口同步回填 `squadName`/`squadEmoji`（注册表改名同步）。
- **修：Agent 列表/小队列表展开后自动收起**：`agOpen`/`sqOpen` 原是 `renderPop` 局部变量，5s 轮询/异步回调触发整面板重建即被重置。展开状态提升为面板级闭包变量 `secOpen`（recent/agents/squads），点击写回后整体重绘；`closePop` 归位（下次打开全折叠）。
- **子代理会话标题带专家名前缀（问题5）**：`startContinuable` 的 label 与 `request.label` 改为 `「专家名 · 任务摘要」`——better-sidebar「任务管理」/ 会话列表只能看宿主 label，此前完全看不出哪个 agent 在执行。日志 `taskLabel` 保持纯任务摘要不变（FAB 面板另有名称列）。
- **问题1（头像不显示配置的）零代码**：v0.9.15 的 `mergeDispatchHistory` 回填已在代码里，但当前进程启动早于该版本更新，重启 Desktop 即生效；`code-reviewer`/`log-tracer` 注册表 emoji 为空，按既有规则落首字方块。
- **需重启 Desktop 生效**（host + client 均有改动）。

## 0.9.15 (2026-08-26)

悬浮球活动面板头像与「Agent 调度」页完全对齐（用户：「默认头像也用和 agent 调度里的名称首字作为头像，有表情优先表情头像」）：

- **客户端无代码改动**：悬浮球四处头像（运行中/最近委派/Agent 列表/小队列表）早已走 `setAvatarEl`——emoji 优先、无则名称首字 monogram、空名才落白 logo 兜底，规则本就一致。
- **根因在 host 数据**：「最近委派」/总览/历史数据来自 `dispatches.jsonl`，dispatch 行不写 `emoji`、`expertName` 是委派时快照——设了表情或改过名的 Agent 在面板里丢 emoji 落旧名首字。
- **修复**：`mergeDispatchHistory` 出口按 `expertId` 回填注册表实时的 `emoji`/`expertName`（与 Agent 调度页同源），注册表查不到才回退行内字段。`/dispatches`、`/active`(recent)、`/overview` 三个消费端点全部受益。
- **需重启 Desktop 生效**（host 侧改动）。

## 0.9.14 (2026-08-26)

历史列表列化与头像回退首字：

- **头像改回首字**：用户推翻 0.9.13 白 logo 方案，默认头像恢复名称首字 monogram（emoji 仍优先；空名才落白 logo 兜底）。DOM 侧（悬浮球弹层 4 处）统一走新增 `setAvatarEl`，规则与 React 侧一致。
- **历史顶部标识删除**：`History · 最近 50 条委派` + 成败统计行整行删掉（tab 名已是「历史」，冗余）；`okN`/`unknownN` 死变量清。
- **删除与跳转放一块**：行头按钮组改为「主会话 / 子 Agent / 删除」同排；展开区只留详情（任务详情框保留）。
- **历史行加头像 + 列化**：时间｜头像｜名称｜消息摘要｜类型｜状态｜操作，列列分清。
- **新增类型列**：「小队」/「Agent」徽标（小队=accent 淡底）；数据源=宿主日志新字段 `viaSquad`（小队执行时传入，**需重启 Desktop 生效**，旧记录一律显示 Agent）。

## 0.9.13 (2026-08-26)

默认头像 + 历史页重排与详情框 + 悬浮球四项（面板弹出/就地调用/小队列表）：

- **默认头像统一白色 DSH logo**：未设 emoji 的 Agent/小队不再用名称首字（monogram），统一白色 DSH logo；logo 外套深色底（`--dsw-static-neutral-1000` 80%）保证亮/暗主题白 logo 均可见。`firstGlyph`/`ad-avatar.mono` 死代码与死 CSS 已清。悬浮球面板三处原生头像（运行中/最近委派/Agent 列表）与主面板运行中大卡（`ad-run-emoji.logo`）同步切白。
- **悬浮球面板从球心弹出**：`placePop` 按球心计算 `transform-origin`（面板在球上方=原点底部、下方=原点顶部），弹出动画视觉上面板从球里展开，不再从面板中心凭空放大。
- **Agent/小队卡片点击就地调用**：不再跳转调度页——走官方输入 facade（`conversation.input.shell(当前会话).setDraft`，单一写入路径）把 `$id ` 填进当前会话输入框，用户补任务发送即委派；老宿主取不到 facade 时回退打开调度面板。
- **新增「小队列表」分区**：悬浮球面板默认折叠（与 Agent 列表同构），数据同 `/expert-api/suggest` 端点顺带返回；点击卡片同就地调用（`$squad-id `）。
- **历史 tab 挪到最后**：tab 顺序改 总览 / Agent / 小队 / 历史。
- **删除按钮移进展开区**：行头只保留「主会话/子 Agent」跳转按钮；删除（红色、带二次确认）收进展开区末行，行面更干净。
- **展开区新增任务详情框**：固定尺寸滚动框（`.ad-hist-taskbox`，110px 高、底+边、可换行滚动）。数据源 = 宿主侧新写入的任务全文字段 `taskText`（截断 4000 防膨胀）；旧记录无该字段时回退显示 `taskLabel` 摘要。
- **宿主侧**：`lib/dispatch.js` 两处决策日志行新增 `taskText` 字段（**此改动需重启 Desktop 生效**，客户端部分刷新即可）。

## 0.9.12 (2026-08-26)

删整球彩色流光（用户：「悬浮球彩色流光这一项删了吧，不要球的彩色流光了」）：

- **「悬浮球彩色流光」开关移除**：整球 hue 循环（`ad-fab-hue` keyframes + `.fab-color` 类）整体删除——CSS、`applyFabSettings` 类切换、默认设置 `color` 字段、设置页开关行全部清；存量 `color` 配置被 `Object.assign` 合并后无消费方，无害忽略。
- **边缘流光保留**：「边缘彩色流光」（`fab-edge` + `.ad-fab-edge-ring` conic 环）不动。
- 呼吸/无动效类选择器去掉 `:not(.fab-color)` 限定（该类已不存在）。
- verify：旧断言反转为负断言（`ad-fab-hue`/`hue-rotate`/整球流光开关不应存在），边缘流光开关保留断言。

## 0.9.11 (2026-08-26)

悬浮球微调四项（用户截图反馈）：

- **呼吸光圈缩小 + 减速**：外围光晕 `0 0 18px 5px` → `0 0 10px 2px`（更小更贴球）；呼吸周期 3.2s → 4.2s（更慢）。
- **右键菜单删除**：悬浮球右键的「打开 Agent 调度面板 / 隐藏悬浮球」菜单整体移除（JS + CSS + teardown），面板头部已有相同入口。
- **色调：雪白置顶**：设置页色调顺序调整为雪白第一。
- **毛玻璃调亮**：透明底在暗色页面显黑 → 改近白半透明叠层 `linear-gradient(rgba(255,255,255,.75),rgba(255,255,255,.55))`，保留磨砂模糊与玻璃感。

## 0.9.10 (2026-08-26)

入口收拢 + 表单按钮排序 + 空态/统计数字清理（面板）：

- **卡片悬浮 ✎ 编辑按钮删除**：整卡点击即编辑，入口唯一；`ad-card-acts` 浮层 JSX 与死 CSS 一并清。
- **模型路由行按钮排序**：↑↓ 从输入框前挪到行尾、✕ 殿后（provider/model/effort 在前），不再挤在左侧。
- **空态圆形 ◍ 图标删除**：总览/Agent/历史/小队四处空态只留文字提示，`.ad-empty-glyph` 死 CSS 已清。
- **统计数字改白色**：概览四个统计数字（含高亮项）颜色改 `--dsw-static-neutral-bluish-00` 静态近白。

## 0.9.9 (2026-08-26)

呼吸周边光形态修正（0.9.8 理解反了，用户澄清：要带模糊的白色光，不是硬边环）：

- **硬边白环 → 白色模糊光晕**：`ad-fab-breathe` 50% 帧外围光由 `0 0 0 7px` 硬边环改为 `0 0 18px 5px var(--dsw-static-neutral-00)`——带模糊的白色周边光晕，随呼吸收放，无硬边。

## 0.9.8 (2026-08-26)

悬浮球呼吸光微调（单点改动）：

- **呼吸外围光环改纯白硬边**：`ad-fab-breathe` keyframes 的外围环由蓝色系 `color-mix` 10% 半透明 → `--dsw-static-neutral-00` 纯白；环本身无模糊（`0 0 0 7px` 硬边，原本即无 blur）。
- **去呼吸帧残留模糊彩色光**：50% 帧的 `0 4px 24px` 蓝色 50% 模糊光晕（视觉上=带模糊的彩色周边光）移除，峰值帧投影改回静态同款 `0 4px 18px`，周边光只剩白色硬边环。球底投影与其余动效不动。

## 0.9.7 (2026-08-26)

内置清理 + 删除入口收拢 + 文案与卡片化：

- **去「内置」标签**：Agent/小队卡片不再显示内置徽标（`builtin` 数据字段保留不动，仅 UI 摘除；宿主无预置逻辑，存量留作用户测试）。删除确认弹窗的「内置小队删除后不会自动恢复」提示一并去掉。
- **删除入口收拢进编辑弹窗**：卡片悬浮只剩 ✎ 编辑，🗑 删除移除；编辑弹窗尾部按钮行左侧新增「删除」（红色，新建态不显示）→ 关表单 → 弹删除确认窗。Agent/小队两条线同改。
- **小队页说明句删除**：「小队 = 多 Agent 协作模板…」一句移除（用户不要）。
- **Agent 页加说明句**：「配置专属 Agent（人设 + 触发域 + 模型路由）。主模型会按触发域把任务自动委派给合适的 Agent，也可直接说『让 XX 处理』。」（先核了宿主无 @ 触发符，文案按真实机制写）。
- **模型路由行卡片化**：`.ad-route` 加底/边/圆角，与步骤卡片语言对齐。

## 0.9.6 (2026-08-26)

小队步骤卡片化 + 表单细节 + 浮层按钮幽灵化：

- **步骤编排卡片化**：每步骤从"虚线分隔的一行挤满输入框"改独立卡片（`ad-step-item` 带底/边/圆角）。头行 = S 徽标 + 阶段名 + Agent 下拉 + 右端 ↑↓✕ 图标组；instruction 独立成 2 行 textarea；依赖勾选行保留（标签改 `S1` 前缀）。
- **步骤徽标美化**：`S1/S2` 从灰色圆形数字改 accent 填充标签（白字，对齐流程图节点编号语言）。
- **系统提示词区加大**：`rows:8→14` + `min-height:180px`（`.ad-textarea.tall`），可拉伸。MD 渲染不做——提示词是给模型的原文，渲染反而误导。
- **卡片浮层按钮幽灵化**：`ad-card-acts` 内 ✎/🗑 去底去框（透明无边），悬停才显色（编辑蓝/删除红+红晕底），与开关不再视觉打架。

## 0.9.5 (2026-08-26)

按钮/编辑体系重设计（原型 A 案，用户确认）+ 头部细节 + 悬浮球反馈五连修：

- **卡片点整体即编辑**：Agent/小队卡整卡可点（`editable` 类 + pointer），配置入口变直觉动作；内层开关/流程图点击阻止冒防误触。
- **编辑/删除改 hover 浮层图标按钮**：卡片右上区浮出 ✎/🗑（`ad-card-acts`，`right:48px` 浮在开关左侧，开关常显可用不遮挡）；删除卡片常驻的"编辑/删除"文字按钮，视觉噪音减半。
- **编辑表单进弹窗**：复用 `ad-modal` 体系——Agent 表单 600px（`ad-modal form`），小队表单 660px（`form wide`，装步骤编排）；表单嵌弹窗时压平卡片底（无盒中盒）；遮罩点击/✕ 均可关闭。
- **删除二次确认改弹窗**：原卡片内联确认条改居中弹窗（380px，取消/删除）。
- **新建按钮升主按钮**：`＋ 新建 Agent`/`＋ 新建小队` 改填充主色按钮（`ad-btn.primary`），一眼可见。
- **头部 logo 白色**：`.ad-logo .ad-dsh-logo` 颜色改 `label-primary`（暗主题=白，亮主题=深色可见）。
- **删总览空态引导句**：「在对话里说…自动路由…」移除。
- **悬浮球 logo 黑色**：`.ad-fab .ad-dsh-logo` 改 `--dsw-static-neutral-1000`（纯黑）；面板标题 logo 用 `label-primary` 保跨主题可见。
- **色调换浅色批次 + 毛玻璃**：紫罗兰/夜幕/玫瑰/琥珀/青色/晚霞 → 雪白、天蓝、雾紫、樱粉、杏橙（浅→深同族渐变），保留品牌蓝与彩色渐变；新增「毛玻璃」无色透明色调（透明底 + `backdrop-filter:blur(10px) saturate(1.3)` + 白描边，球体即磨砂玻璃）。
- **流光拆两个独立开关**：「悬浮球彩色流光」（整球 `hue-rotate` 6s）与「边缘彩色流光」（新增 `.ad-fab-edge-ring`：conic 四色渐变环旋转 4s，`mask` 掏空中心只露 3px 边缘），可分别开关、可叠加。
- **面板透明度不生效修复**：根因=`Number(alpha) || 85` 把 0 吞成 85——拖到 0% 保存后重开被弹回。改 `Number.isFinite` 判定；`fabAlpha` 同款（`|| 100`）。
- **点球重复弹修复**：点外关闭监听的 `ev.target` 未排除悬浮球自身（球带 `setPointerCapture`，pointerdown 先关面板、同一点击的 pointerup 再 `togglePop`→重播弹出动画）。改为点球即重新武装监听、不关闭。
- 滑块标题修复：面板/球两个滑块 l1 均写死「毛玻璃透明度」，改为传入 `title`。
- 清理死类：`.ad-confirm`/`.ad-confirm-text`/`.ad-card-actions` CSS 删除。
- verify：新增 v0.9.5/v0.9.5b 断言共 14 条；修复 4 条过期色调断言（色调集已迭代：violet/amber/cyan→mist/cherry/rainbow）。

## 0.9.4 (2026-08-26)

色调黑屏根因修复 + 透明度分离 + 图标尺寸精调：

- **色调黑屏根因修复**：旧色调渐变引用了**不存在的** `--dsw-alias-state-info-primary` / `--dsw-alias-state-warning-primary`（实际 alias 只有 business/error/success/warn——没有 info/warning）——整条 `linear-gradient` 含未定义变量解析失败→背景透明→透出深色页面呈黑色。品牌蓝/彩色渐变能显示，是因为它们用的 token 恰好都存在。全部色调改为**确实存在的静态色 token**（`--dsw-static-blue/red/amber/green-*`），并修复庆祝动画里残留的 `warning-primary`。
- **面板/悬浮球透明度分离**：设置页拆成两个独立滑块——「面板透明度」（面板 `::before` 不透明度层，`--fab-pop-alpha` 0-1）和「悬浮球透明度」（球体 `--fab-opacity`，色调同步淡化）。面板背景同时从 `color-mix` 改 `::before` 层承载，规避 color-mix 在此环境的解析问题。
- **⚙/✕ 尺寸分离**：只放大 ⚙（36px/19px 字），✕ 还原原尺寸 28px/14px 字。
- **logo 统一蓝**：悬浮球与面板头部 logo 都用 `--dsw-alias-state-business-primary`。

## 0.9.3 (2026-08-26)

执行流图修复三问题（卡片图回归 / 弹窗加大固定 / S1 徽标出框）：

- **小队卡恢复流程图缩略**：v0.9 的文字流方案回退——卡片内重新展示拓扑图，固定 96px 高图区（`ad-graph-box`），SVG 自然尺寸居中，点击整体放大弹窗；图下保留文字流摘要（`squadStepsText`）。
- **弹窗加大且固定**：`ad-modal` 从 680px 自适应改 **780px 固定**（窄屏降级），新增固定 300px 图区（`ad-modal-graph`），节点再多也撑不满、超宽横向滚动。
- **单节点不再撑满**：根因是 SVG 只写 `width:100%` 被容器拉伸。改为给 `<svg>` 设自然像素尺寸（`width/height` 属性 = viewBox），容器 `margin:auto` 居中，**只缩不放**。表单预览容器保留等比缩放。
- **S1 徽标居中修复**：根因是徽标 `text` 默认 `text-anchor:start` 从徽标中心向右起笔溢出。加 `textAnchor:"middle"`。
- **顺带修**：⚙ 设置按钮挂上放大类 `ad-fab-pop-set`（v0.9.2 CSS 写了但 JSX 没挂）；清理死类 `.ad-flowline`；verify 过期断言同步更新。

## 0.9.2 (2026-08-26)

色调生效修复 + 毛玻璃/图标/logo 细节：

- **色调改 CSS 类切换（修复"色调没生效"）**：`applyFabSettings` 从 setProperty 注入 `--fab-c1/c2` 改 `.ad-tone-*` 类切换。根因：color-mix 字符串经 setProperty 注入到 CSS 变量时部分浏览器解析失效；CSS 规则内直接写 color-mix 嵌套 var 则正常。8 色调类：brand/violet/night/rose/amber/cyan/sunset/rainbow（rainbow 四色虹彩渐变）。
- **透明毛玻璃球（去高光）**：悬浮球 `::before` 去掉月牙高光/玻璃边框，改半透明白渐变（135deg 白 .16→.04）+ 微弱内阴影，球体轮廓靠玻璃质感呈现。
- **悬浮球 logo 近白修复**：`--fab-fg` 从 `label-primary-inverted`（暗色主题下解析为深色）改 `--dsw-static-neutral-bluish-00`（静态近白，不随主题翻转），暗色主题下 logo 也是白色。
- **毛玻璃透明度 0-100**：滑块范围 10-100 改 **0-100**（0=全透明只剩模糊）。
- **设置图标放大到 38px**：右上角 ⚙/✕ 38px、字号 19px。

## 0.9.1 (2026-08-26)

悬浮球动效与质感升级：

- **流光改 hue-rotate 色相旋转**：对当前色调渐变整体旋转色相（0→360° 6s），**天然基于色调、连续平滑无突变**（替代 box-shadow 色环硬切）。
- **泡泡玻璃质感**：顶部月牙高光 + 内部双层透光渐变 + 玻璃边框 + 底部反射投影，球体呈透明泡泡感（替代原径向高光）。
- **logo 统一白色**：悬浮球内 logo 白色（泡泡上对比清晰）；面板头部 logo 改 `label-primary`（亮/暗主题自适应）。
- **色调换新批次（8 个）**：品牌蓝/紫罗兰/夜幕/玫瑰/**琥珀/青色/晚霞/彩色渐变**（rainbow 四色虹彩渐变，配流光时整球色相旋转）。
- **面板从中心弹出**：`ad-fab-pop-in`（scale 0.8→1 弹性，transform-origin 中心）替代原从上滑入。
- **设置视图点外关闭修复**：`armOutsideClose()` 每次视图重绘/设置后重新挂载点外关闭监听（原 once 监听被面板内点击消费后失效）。
- **透明度下限降到 10%**：毛玻璃可调范围 10-100%。
- **设置图标放大到 32px**（右上角 ⚙/✕ 去边框）。

## 0.9.0 (2026-08-26)

面板卡片重排 + 卡片语言对齐悬浮球：

- **Agent 卡一行 4 个**：网格改 `repeat(4,minmax(0,1fr))`，窄面板自动降 2 列/单列；卡片内容压缩为「头像+名称/ID+开关 → 触发 chips（前 3 个，完整列表见 hover）→ 路由一行 mono 截断 → 编辑/删除」。
- **小队卡一行 2 个**：`repeat(2,minmax(0,1fr))`，窄面板降单列。
- **执行流瘦身**：小队卡内 SVG 缩略图改为单行文字流（`squadStepsText`，例「日志｜数据 → 代码」）+「查看」按钮弹窗看大图——更省空间、更易读。
- **触发域 chip 化**：原「触发/路由」文本标签行改为胶囊 chip（与悬浮球 `ad-fab-chip` 同款语言），一眼可辨。
- **名称首字头像**：无自设 emoji 时显示名称首字（monogram，accent 色 10% 底），不再全员 DSH logo；emoji 字段保留为可选自定义。
- 卡片节奏对齐悬浮球卡片：`radius 12px`、`border-l1`、行距收紧、名称/ID 纵排为中部伸缩区。

## 0.8.11 (2026-08-26)

悬浮球 3D 化 + 面板毛玻璃 + 动效细节打磨：

- **色调扩到 8 个**（两排 4+4）：品牌蓝/暖橙/青蓝/紫罗兰/薄荷 + **玫瑰/苔藓/夜幕**（color-mix 合成，无硬编码色值）；色调标签改 `label-primary`（深色主题不再发黑）。
- **流光平滑过渡**：色环从 4 段改 **8 段关键帧**（色调→绿→黄→蓝→紫→回色调，每段间加混合过渡色），周期 5s→8s，开头不再生硬突变。
- **悬浮球 3D 效果**：径向高光（左上光源）+ 内阴影 + 底部椭圆投影（`::before`/`::after`），球体有立体感。
- **鼠标悬停特效**：hover 轻微放大（scale 1.1）+ 高光增强 + 光晕增强（拖拽时暂停）。
- **面板毛玻璃**：`backdrop-filter: blur(18px) saturate(1.4)`，背景半透明（默认 85%）。
- **透明度滑块**：设置页新增「面板透明度」滑块（20-100%），实时生效、localStorage 持久化；数值越低越通透（模糊保留）。
- **设置图标移回头部**：⚙ 放在关闭 ✕ 旁（右上角），底部恢复只有主按钮。

## 0.8.10 (2026-08-26)

悬浮球设置与动效体系修整：

- **开关点击无反馈修复**：呼吸/流光开关点击后 knob 即时切换（on/off 类更新），不再"像没反应"。
- **彩色流光变黑修复**：流光不再覆盖球底色（原四色渐变 background 在深色主题失效发黑），只做 box-shadow 色环旋转光晕，底色保持当前色调渐变。
- **呼吸 vs 流光区分**：呼吸=单色光晕脉动+轻微缩放；流光=四色 box-shadow 旋转（绿→黄→蓝→紫）。差异明显。
- **色调图标可见性**：色点加边框（深色主题下可见）；**紫罗兰改纯紫**（color-mix 合成，不引入硬编码色值）。
- **图标统一色**：⚙/✕/⇱⇲/箭头统一灰色（`--dsw-alias-label-secondary`），hover 变品牌蓝。
- **设置按钮移回底部**：头部只留 ✕（去边框、放大 28px），底部主按钮旁恢复「⚙ 悬浮球设置」ghost 按钮。
- **任务成功一次性庆祝动画**：平时无动效；任务完成瞬间悬浮球爆发彩色光晕+上跳（`ad-fab-celebrate` 1.3s），看一眼恢复平静；再次成功再次触发（强制重排支持连续触发）。与常态动效开关独立。

## 0.8.9 (2026-08-26)

UI 细节打磨（client 刷新即生效；存量数据迁移需重启 Desktop）：

- **logo 换 DSH 官方图形**：面板头部去掉蓝紫渐变方块底，DSH logo path 以品牌色直出（亮/暗主题均可辨）；小队卡/弹窗同步。
- **描述文案通用化**：设置页副标题改「把任务委派给专职 Agent：自动路由、小队协作、全程可追踪」。
- **小队卡瘦身**：长列表改两列卡片网格（`minmax(340px,1fr)`，窄面板自动降单列）；执行流图从全宽 280px 限高改为紧凑缩略（限高 120、居中），点击仍弹窗放大。
- **emoji 清理**：内置 Agent/小队不再预置 emoji（`📋🔍🛠️🗄️🏗️` 全清空）；所有 🤖/🧩 兜底头像改 DSH logo（新增原生 DOM 版 `dshLogoSvg` helper）；流程节点与弹窗步骤名去 Agent emoji；emoji 字段保留，用户自设的照常显示。
- **存量迁移**：内置项且仍是历史预置 emoji → 启动加载时一次性清空写盘（`experts.js` / `squad-registry.js` 的 `LEGACY_EMOJI` 集合），用户自设不动。
- **步骤编排拖动配置**：评估后维持现有表单式（飞书式画布拖拽成本高，当前勾选依赖+实时预览图已覆盖）。
- **悬浮球面板交互修复与增强**：
  - 修复**设置自动返回**：新增 `popView`（main/settings）状态，异步轮询/拉取回调只在主视图时重绘，设置视图不再被覆盖回主视图。
  - 修复**彩色流光不生效**：`linear-gradient` 的 `background-position` 动画无效，改 `box-shadow` 色环动画（`ad-fab-glow` 5s 循环，四色光晕旋转，视觉明显）。
  - **色调扩到 5 个**：品牌蓝 / 暖橙 / 青蓝 / 紫罗兰 / 薄荷。
  - **设置按钮移头部右上角**（⚙ 在 ✕ 旁），底部只剩主按钮「打开 Agent 调度面板」。
  - **新增 Agent 列表分区**（迷你调度台）：面板内第 3 区「Agent 列表」（数量+箭头），默认折叠、点击展开，点卡片打开调度面板。
  - **最近委派悬停双按钮**：行悬停显示「⇱ 子会话 / ⇲ 主会话」快捷跳转（低风险不二次确认；主会话按钮仅在有 parentSessionId 时显示）；卡片点击默认跳子会话。

## 0.8.8 (2026-08-25)

活动面板重设计（方案A 卡片分区）+ 悬浮球设置：

- **面板重设计**：头部改状态摘要（品牌渐变底 + 「● N 运行中 / 空闲」徽标）+ 主体分「运行中」「最近委派」两区，每项卡片化（avatar + 名称 + 任务摘要 + 状态/时长 chip），底部操作行（主按钮「打开 Agent 调度面板」+ 「⚙ 设置」）。
- **悬浮球设置浮层**：面板内「⚙ 设置」进入——**色调三选**（品牌蓝/暖橙/青蓝，CSS 变量注入 `--fab-c1/--fab-c2`）、**呼吸光晕**开关（默认开）、**彩色流光**开关（默认关，渐变流动动画）。全部 localStorage 持久化，实时生效；开关控件灰底白球两态一致。
- **悬浮球动效类体系**：`fab-breathe`（呼吸）、`fab-color`（彩色流光）、拖拽时动画暂停；设置挂载时自动应用。

## 0.8.7 (2026-08-25)

悬浮球活动面板交互完善：

- **点空白处收起面板**：打开后点击面板外任意位置自动关闭（原只能点 ✕ 或再点悬浮球）。
- **「查看历史」改最近 3 条**：面板底部按钮去掉「查看历史」，改为面板内新增「最近委派」区——展示最近 3 条委派（Agent + 任务摘要 + 完成/失败/运行中/未知状态徽标），异步拉取。
- **文案统一**：「打开 Agent 调度」→「打开 Agent 调度面板」（面板底部 + 右键菜单）。
- **面板 logo 可见性**：面板头部 DSH logo 固定品牌色（深色主题下原 currentColor 继承深色文字导致 logo 发黑看不清）。

## 0.8.6 (2026-08-25)

悬浮球活动面板打开体验修复：

- **去掉打开时的"加载中…"闪屏**：点击悬浮球先闪「运行中（…）」再出完整面板——根因是打开时 renderPop() 无数据先渲染加载态，等 5s 轮询填充。改为：poll 缓存最近活跃数据（`lastActive`），打开面板**立即用缓存渲染**，并同时主动 fetch 刷新一次，无感知更新。

## 0.8.5 (2026-08-25)

UI 精细化 + 历史删除 + 悬浮活动面板：

- **Agent 卡片放大**：网格列宽 230→300px，卡片内边距/头像（30→40px）/名称字号同步加大。
- **小队执行流图改版**：图从右侧移到**信息下方、宽度撑满**（`.ad-squad-flow` width:100%，容器上下固定、高度自适应内容），不再是侧边固定 320px。
- **历史支持删除**：host 新增 `POST /expert-api/history/remove`（按 dispatch 行 ts 定位删除，同 childId 的对应 result 行一并删，续聊不误伤后续派遣）；历史每行加「删除」按钮（confirm 二次确认）。⚠️ host 改动需重启 Desktop 生效。
- **悬浮球 → 大浮动活动面板**：点击弹出 340px 宽面板——头部（DSH logo + 「Agent 活动 · 运行中」+ 关闭）、运行中列表、底部快捷入口（打开 Agent 调度 / 查看历史）。
- **移除显示模式配置**：右键菜单去掉「显示模式：一直/自动」项（保留打开调度 + 隐藏悬浮球），设置页悬浮球显示模式区块删除。

## 0.8.4 (2026-08-25)

小队列表改版 + 历史页会话跳转 + 悬浮球右键菜单：

- **小队改列表长卡片**：从自适应网格改为纵向长卡片列表（`.ad-squad-list`），左信息区（DSH logo 图标 + 名称 + 开关 + 说明 + 编辑/删除）+ 右侧**固定尺寸执行流图**（宽 320px，窄屏自动折行）；新建小队表单的预览图同样固定尺寸（`.ad-flow-preview-fixed` 340px）。
- **小队图标换 DSH logo**：卡片头像从 emoji（🧩）改为内联 DSH 官方 logo。
- **历史页优化**：行改卡片式（`.ad-hist-head` 点击区），点击行**展开预览**（`.ad-hist-preview`）：Agent 路由、主会话 id、子 Agent id、错误信息，各带「跳转」按钮；行尾常驻「主会话」「子 Agent」快捷跳转按钮。
- **host 记录 parentSessionId**：dispatch 日志行与 result 行新增 `parentSessionId`（发起会话 id），合并时透传——历史页由此可**跳转主会话**。⚠️ 此改动需重启 Desktop 生效；旧行无该字段则不显示主会话按钮（子 Agent 跳转已可用，纯 client）。
- **悬浮球右键菜单**（`.ad-fab-menu`）：打开 Agent 调度（DOM 兜底点宿主 view tab）、显示模式（一直/自动/隐藏）、隐藏悬浮球；左键点击仍为运行中弹窗。

## 0.8.3 (2026-08-25)

执行流可视化升级 + DSH 品牌 + 悬浮球重写（纯 client，刷新页面即生效，无需重启）：

- **DSH 官方 logo**：内联官方 `tray-icon.svg`（色值改 currentColor 跟随主题），替换 Agent 调度面板头部与悬浮球的 🤖。
- **执行流图精致化**：渐变节点（linearGradient + 语义化 token）、圆角徽标、依赖标注（"依赖 S1,S2"）、hover 高亮发光；大图模式（弹窗）顶部加层标注（L1 · 并行 / L2 · 串行）。
- **执行流弹窗大图**：点击卡片内执行流图 → modal 弹窗（`SquadFlowModal`）：放大拓扑图 + 步骤说明列表（步骤号 / 阶段+Agent / 依赖 / instruction 全文），mask 点击关闭，动画入场。
- **历史页"假运行中"兜底**（纯 client，不等宿主重启）：历史 tab 并拉 `/expert-api/active` 活跃集合，未终结 + 有 childId + 不在活跃集合 → 直接显「状态未知」；宿主升级后由 orphan 收敛接管，双保险。
- **悬浮球随处可拖**：去掉边缘吸附，松手即存位置（仍钳视口内）；持久化 localStorage。
- **悬浮球动态特效**：常态呼吸光晕（`ad-fab-breathe` 3.2s 循环）、拖拽时放大 1.14x + 阴影加深、完成时绿色闪光扩散（`ad-fab-flash`）。

## 0.8.2 (2026-08-25)

Agent/小队管理与执行流可视化（host + client；host 改动需重启 Desktop 生效，client 刷新即生效）：

- **修复：Agent 配置开关点击报错**。根因：`restHandler` 里有两个 `if(POST)` 块，第一块（小队路径）的 `default` 分支 404 return，把第二块的 `toggle/upsert/remove/import-skill` 全吞了。修复：合并为单一 POST 块（同时补 `POST /squad/toggle`）。
- **小队开关**：小队卡新增灰底白球开关（两态外观一致，仅球位区分，与 Agent 一致）；`squad-registry` 支持 `enabled`（默认 true）+ `setEnabled`；停用小队 `expert_squad` 拒绝执行、`$` 菜单不再出现。
- **删 Agent 用量角标**：Agent 卡"近50次：N·✓M"移除（含 `ad-usage` CSS 与 overview 用量数据源清理）。
- **小队执行流图形化**：卡片与编辑表单内嵌 SVG 拓扑图 `SquadFlowGraph`——按依赖拓扑分层（层内并行、层间串行），每步显示 序号+阶段名+Agent emoji，依赖箭头贝塞尔曲线连接；表单内实时预览（改步骤/依赖即重绘）；配色全走语义化 token 适配亮/暗主题。
- **卡片排版优化**：Agent/小队卡描述区标签化——「触发/路由/说明/执行流」小字徽标 + 内容同行，不再挤成一行。

## 0.8.1 (2026-08-25)

历史页"假运行中"修复（host + client 改动；host 半需重启 Desktop 生效，client 半刷新即生效）：

- **修复：历史记录永远显示"运行中"**。根因：`result` 行只由当前进程的 `subagent/end` 监听器追加——宿主重启丢监听器、0.7.1 之前的遗留行没有 `kind` 字段，两类孤儿都配对不上结局，历史页据此误显示"运行中"。
- **孤儿收敛**："运行中"改以活体 `activeChildren` 为唯一权威来源；未终结但 child 不在活跃映射的行收敛为 `orphan`（前端显示「状态未知」）。派遣本身失败的行（`ok:false`）直接落「失败」。旧日志无需迁移。
- **兼容旧日志**：合并配对不再要求 `kind === 'dispatch'`，无 `kind` 字段的遗留派遣行同样参与配对与收敛。
- **总览成功率修正**：成功率与 byExpert 只统计结局已知的行，孤儿不再被误算为成功。
- **历史页四态**：运行中 / 完成 / 已中止·失败 / 状态未知（弱化灰），计数栏追加 `?n` 未知条数。

## 0.8.0 (2026-08-25)

UI 改版（纯 client 改动，刷新页面即生效，无需重启）：

- **命名统一**：右 tab、设置分区、面板标题统一为「Agent 调度」。
- **删「活动」tab**：运行中卡片并入总览（原两处重复），子 tab 由 5 个减为 4 个：总览 / 历史 / Agent / 小队。
- **删 Ranking 区块**：总览只留统计卡 + 运行中；使用量以「近50次：N · ✓M」角标并入 Agent 卡片。
- **改名**：「管理」→「Agent」、「组队」→「小队」，按钮与说明文案同步（+ 新建小队）。
- **卡片化**：Agent 与小队列表改为卡片网格（`ad-cards`，auto-fill 窄面板自动降单列）。
- **悬浮球进设置**：新增显示模式三选一（一直显示 / 自动 / 隐藏），默认一直显示；选择存 `localStorage`（`ad-fab-mode`），切换即时生效。
- 清理活动页死代码与对应 CSS（`ad-active-*` / `ad-disp-*` / `ad-rank-*`）。

## 0.7.1 (2026-08-24)

生命周期闭环修复（host 改动，需重启）：

- **修复：子 agent 完成后"运行中"永不消失**。根因：`activeChildren` 只增不减（唯一 delete 在续聊失败分支）。修复：订阅宿主 `subagent/end` 生命周期事件（payload 带 `stopReason`），终结即移出映射。此前 FAB 完成检测（集合差）永远不触发、活动页永远显示运行中。
- **真实结局记录**：`subagent/end` 时向 `dispatches.jsonl` 追加 `kind:'result'` 行；`/expert-api` 各端点经 `mergeDispatchHistory` 时间配对合并——续聊复用同 child 时，第 1 次派遣得第 1 次结局、第 2 次得第 2 次，互不串。历史页成功率从此反映真实执行结果。
- **续聊时长语义修正**：续聊重置 `startedAt` 为本次续聊时间（原逻辑沿用首次派遣时间，休息 2 小时后追问会显示"运行中 2h"）。
- **中止能力**：新增 `/expert-api/cancel` 端点（宿主 `interrupt`，user-authority），entry 记录 `parentSessionId` 作权限凭证；总览/活动页运行中卡新增"中止"按钮（共享 `RunCard` 组件）。
- **历史页三态**：运行中（未终结）/ 完成 / 已中止·失败，真实结局来自事件合并。
- **跳转子 agent 会话**：运行中卡、悬浮球列表行、历史行均可点击跳转子 agent 会话（宿主 `sessions.open`，支持 catalog 内子会话；中止按钮阻止冒泡）。
- **日志轮转**：`dispatches.jsonl` 上限 2000 行，超出自动重写保留尾部，防长期膨胀。
- （澄清）`/` 直选菜单本就含组队（源循环 `/suggest` 的 squads，onPick 插 `$id`，规则 8 已覆盖组队→`expert_squad`），无需新增。
- 修复（同轮发现）：`expert_list` 参数补 `required: []`（裸注册透传坑变体）。

## 0.7.0 (2026-08-24)

UI 全面重构，设计语言学记忆系统（dsh-mnemon MnemonView）：

- **信息架构瘦身**：总览删「最近委派」历史区（只留统计卡+运行中+排行）；活动删「最近委派」列表（只留运行中大卡）；历史为唯一看历史的地方。
- **视觉升级**：`--ad-*` shell 变量映射层（全映射 `--dsw-alias-*` token，亮/暗主题自动跟随）；节标题改等宽大写 kicker（cardKicker 风格）；空态改虚线框+发光圆形 glyph「◍」+引导文案（emptyState 同款）；运行中指示改状态点光晕呼吸（liveDot 同款）；运行中卡片左绿边+任务摘要+运行时长徽标（10s 走字）。
- **悬浮球**：可拖动（pointer 事件+移动>4px 判拖拽），松手吸附左右边缘，位置存 localStorage；子 agent 完成检测（活跃集合差）→ 球闪绿光 3s+「✓n」徽标；弹窗跟随球位置（上方优先、不越界）；活跃时显示绿点。
- **host**：activeChildren 值升级为 `{childId, taskLabel, startedAt}`，/expert-api/active 与 /overview 端点透出任务摘要与启动时间。
- **管理/组队视觉统一**（同日追加）：两页卡片套上 `--ad-*` 变量层（圆角 11 + hover 边框过渡 + 头像框）；节标题统一 kicker；空态统一发光圆形 ◍；「启用」文字按钮换成真开关——灰底白球、仅球位区分（左=停用右=启用），两态外观完全一致（用户铁偏好）；表单圆角与变量层同步。
- **host 补丁**（同日追加，重启前 review 抓到）：`expert_list` 参数补 `required: []`，防严格网关拒收（裸注册透传坑的变体）。

## 0.6.0 (2026-08-24)

## 0.6.0 (2026-08-24)

- **主面板迁移**：从设置弹窗迁到宿主原生右 tab「Agent」（conversation.view 槽，order=21，与 对话/轨迹/记忆系统 同级）。
- **五个子 tab**：总览（统计卡+活跃+使用排行+最近委派，30s 刷新）/ 活动（活跃 Agent+最近委派，10s 刷新）/ 历史（近 50 条全量）/ 管理（Agent CRUD）/ 组队（Agent 组队 CRUD）。
- **Agent 直选菜单**：输入 / 唤起候选菜单（命令组后多一个 Agent 组：Agent + Agent 组队），选中插入 `$id ` 继续编辑；prompt 策略新增第 8 条（$ 前缀=用户显式指定 Agent 委派）。初版按 $ 触发符注册，实测宿主 detectTrigger 硬编码只扫描 '@' 与 '/'（任意字符注册源后无入口扫描），改挂 '/' 组实现。
- **悬浮活动按钮**：右下角常驻（活跃 Agent>0 时出现），点击展开运行中列表（原生 DOM，不依赖槽位）。
- **设置弹窗瘦身**：只留「Agent」说明分区（面板位置说明+默认模型+数据目录+触发方式说明）。
- **全面 Agent 化文案**：「专家/小队」从所有 UI 文案退役（工具名 expert_* 与 REST 契约不变，模型侧零迁移）。
- REST 新增：/expert-api/suggest（$ 候选）、/expert-api/overview（总览聚合）。
- 修复（0.5 期间发现）：expert_squad 参数 squad_id snake_case+required 恢复（吞参事故根因）；maxDepth 动态计算（孙代链 SubagentDepthError）；topoLayers 依赖越界/自指/非数组独立报错（原误报为环）。

## 0.3.0 (2026-08-24)

- Settings 拆两分区：「Agent 调度」（专家+小队管理）与「Agent 活动」（活跃子代理+最近委派，10s 自动刷新）。
- 小队注册表化：squads.json 可编辑（内置 3 队+自定义队 CRUD），expert_squad 动态读注册表，删内置队有防复活标记。
- 小队可视化编辑：步骤流拓扑预览（层内｜层间→）、expertId 下拉、依赖勾选+下标重映射、客户端预校验与服务端同规则。
- 模型路由改下拉（ctx.llm listProviders/listModels + settings 显式配置合并去重），不选=跟随默认模型（标题动态展示默认）。
- effort 透传进 agentOptions（minimal/low/medium/high/xhigh/max，UI 下拉化）。
- 数据目录展示 tildify 为 ~/.dsh/...（通用插件不暴露真实 HOME）。
- REST 新增：/expert-api/squads、/squad/upsert、/squad/remove、/active、/skills、/import-skill。

## 0.2.0 (2026-08-24)

- 小队模式（expert_squad）：dev-pipeline / debug-squad / review-squad 三个预置模板，拓扑分层执行（依赖前置结果自动代入 {prev:N}），停用专家跳过、单步失败不炸全队。
- skill 导入（expert_import_skill）：~/.dsh/skills 的 SKILL.md 一键注册为专家（软链目录跟随识别）。
- Settings 页"专家"管理面板：增删改/路由表可视化编辑/启停/删除二次确认/最近委派记录（REST /expert-api）。
- 修复 v0.1.0 启动崩溃：dsh.client 缺 platform:"web" 致 client-modules 整树 compose 失败、Desktop 自动回滚（见 verify.mjs 防回归断言）。

## 0.1.0 (2026-08-24)

首发。

- 专家注册表 `$DSH_HOME/data/dsh-agent-dispatch/experts.json`：直接编辑保存即生效（免重启），删除内置专家不复活（deletedIds 持久标记）。
- 内置 4 专家：requirement-analyst（需求分析师）/ code-reviewer（代码审查员）/ log-tracer（线上排查员）/ sql-analyst（SQL 分析师）。
- 模型工具三件套：`expert_dispatch`（建/复用可续聊专家子代理，routes 失败互备）、`expert_followup`（同专家追问，上下文延续）、`expert_list`（专家目录）。
- 专家委派策略 prompt section：命中专家领域自动委派，简单问题不杀鸡用牛刀。
- `/expert` slash 命令：列专家 / 直接委派。
- 委派决策落盘 `dispatches.jsonl` 可审计。
- 零 `@deepseek-ai/dsh-tools` 依赖（规避官方双实例 bug #1697/#783）。
