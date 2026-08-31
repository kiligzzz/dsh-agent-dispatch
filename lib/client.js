// @kiligzzz/dsh-agent-dispatch — client half。
//
// 浏览器半（classic script：__ModuleLoader__.load 注册 factory）。
//
// 架构：
//   ① 主面板挂宿主 conversation.view 槽（原生右 tab「Agent 调度」，
//     order=21，与 对话/轨迹/记忆系统 同级），4 个子 tab：
//     总览 / Agent / 小队 / 历史；
//   ② 会话头部「← 返回」按钮（conversation.session.header.actions 槽），
//     任何 tab 下可见，导航栈空时自动隐藏；
//   ③ 悬浮活动球（原生 DOM，document.body 挂载，可拖动 + 弹窗 + 光效）；
//   ④ / 触发器 Agent 候选菜单（inputTriggers 源）——选中插入 "$id "。
//
// 文案统一：面板与设置入口统称「Agent 调度」（工具名 agent_*
// 保持不变，那是 REST 契约）。与宿主半通过同源 REST（/agent-api*）
// 通信，保存即生效免重启。
//
// 硬约束备忘：
//   - 颜色一律用 DSH 语义化 token（--dsw-alias-* / --dsw-static-*），
//     适配亮/暗双主题，禁写死 #RRGGBB / rgb() 等绝对色值。
//   - 开关/单选/滑杆统一两态外观（灰底白球，位置区分），禁彩色/亮暗
//     反转区分状态（用户铁偏好，所有插件通用）。
//   - 无外部依赖；React 从 require("react") 获取，纯 createElement，
//     不用 JSX。

window.__ModuleLoader__.load({
  id: '@kiligzzz/dsh-agent-dispatch',
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
    const React = require("react");

    // ── 样式（全部 DSH 语义化 token，无任何写死色值）──
    const CSS =
      ".ad-page{display:flex;flex-direction:column;gap:10px;height:100%;overflow:auto;padding:4px 2px 24px;font-size:13px;color:var(--dsw-alias-label-primary)}" +
      ".ad-head{display:flex;align-items:flex-start;justify-content:space-between;gap:8px}" +
      ".ad-title{font-size:15px;font-weight:600;color:var(--dsw-alias-label-primary)}" +
      ".ad-sub{color:var(--dsw-alias-label-secondary);font-size:12px;margin-top:2px;line-height:1.5;word-break:break-all}" +
      ".ad-btn{background:transparent;border:1px solid var(--ad-line-strong);color:var(--ad-muted);border-radius:7px;padding:4px 10px;font-size:12px;cursor:pointer;flex:none;transition:border-color .15s,color .15s,background-color .15s}" +
      ".ad-btn:hover{border-color:var(--ad-accent);color:var(--ad-text);background:var(--ad-hover)}" +
      ".ad-btn:disabled{opacity:.4;cursor:default}" +
      ".ad-btn:disabled:hover{border-color:var(--dsw-alias-border-l2);color:var(--dsw-alias-label-secondary)}" +
      ".ad-btn.primary{border-color:var(--ad-accent);background:var(--ad-accent);color:var(--dsw-alias-label-primary-inverted);font-weight:600}" +
      ".ad-btn.primary:hover{opacity:.9;background:var(--ad-accent);color:var(--dsw-alias-label-primary-inverted)}" +
      ".ad-btn.danger{border-color:var(--dsw-alias-state-error-primary);color:var(--dsw-alias-state-error-primary)}" +
      ".ad-btn.mini{padding:2px 7px;font-size:11.5px}" +
      // v0.9.5：图标按钮（弹窗 ✕ 复用；卡片浮层已删）
      ".ad-btn.icon{width:26px;height:26px;padding:0;display:grid;place-items:center;border-radius:8px;font-size:12px;line-height:1;background:var(--ad-layer-2)}" +
      ".ad-btn.icon.danger{border-color:color-mix(in srgb,var(--dsw-alias-state-error-primary) 45%,transparent);color:var(--dsw-alias-state-error-primary)}" +
      // v0.9.5：卡片点整体即编辑（无浮层按钮，开关常显可用）
      ".ad-row.editable{cursor:pointer}" +
      ".ad-row{position:relative}" +
      ".ad-squad-card{position:relative}" +
      ".ad-squad-card.editable{cursor:pointer}" +
      // v0.9.5：编辑弹窗（表单专用宽度，复用 ad-modal 体系）
      // v0.9.31：固定高度（用户：弹窗被内容撑出视口、底部按钮被裁）——
      // 根因：v0.9.25 毛玻璃给 .ad-panel 加 backdrop-filter，fixed 遮罩退化为相对面板定位，
      // max-height:88vh 一旦高于面板就溢出窗口底边。改 100% 网格区高度（上限 760）后弹窗不再长大，
      // 内容在 ad-modal-body 内滚（无头实测：100% 严丝合缝 overflowBottom=-23，vh 版本溢出 8px）。
      ".ad-modal.form{width:600px;height:min(760px,100%)}" +
      ".ad-modal.form.wide{width:660px}" +
      ".ad-modal-foot{display:flex;justify-content:flex-end;gap:8px;padding:12px 16px;border-top:1px solid var(--dsw-alias-border-l1)}" +
      ".ad-list{display:flex;flex-direction:column;gap:8px}" +
      ".ad-row{display:flex;flex-direction:column;gap:5px;background:var(--ad-layer-1);border:1px solid var(--ad-line);border-radius:11px;padding:10px 12px;transition:border-color .15s,transform .15s}" +
      ".ad-row:hover{border-color:var(--ad-line-strong)}" +
      ".ad-row-main{display:flex;align-items:center;gap:8px;min-width:0}" +
      ".ad-emoji{flex:none;font-size:15px;line-height:1}" +
      ".ad-avatar{width:30px;height:30px;border-radius:9px;background:var(--ad-layer-2);border:1px solid var(--ad-line-strong);display:grid;place-items:center;font-size:15px;flex:none}" +
      // v0.8.9：无自设 emoji 时头像显示 DSH logo（品牌色，两主题可辨）
      ".ad-avatar .ad-dsh-logo,.ad-run-emoji .ad-dsh-logo{width:17px;height:17px;color:var(--dsw-alias-state-business-primary)}" +
      ".ad-name{flex:none;font-weight:500;color:var(--ad-text);font-size:13px}" +
      ".ad-id{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--ad-faint);font-size:10px;font-family:var(--ad-mono)}" +
      ".ad-badge{flex:none;background:var(--ad-layer-2);border:1px solid var(--ad-line);color:var(--ad-muted);font-size:9px;letter-spacing:.08em;border-radius:999px;padding:1px 7px;text-transform:uppercase;font-family:var(--ad-mono)}" +
      ".ad-meta{color:var(--ad-faint);font-size:11px;line-height:1.5;word-break:break-all}" +
      // v0.8.2：卡片描述区标签化排版（标签小字徽标 + 内容同行，不挤成一行）
      ".ad-meta-label{flex:none;display:inline-block;background:var(--ad-layer-2);border:1px solid var(--ad-line);color:var(--ad-muted);font-size:9px;letter-spacing:.08em;border-radius:5px;padding:0 5px;margin-right:6px;font-family:var(--ad-mono);vertical-align:1px}" +
      // v0.8.2：小队执行流 SVG 拓扑图（全部走语义化 token，适配亮/暗主题）
      ".ad-flow-wrap{display:flex;flex-direction:column;gap:4px;min-width:0}" +
      ".ad-flow-preview{border:1px dashed var(--ad-line-strong);border-radius:10px;padding:8px 10px;margin-top:6px;display:flex;flex-direction:column;gap:4px}" +
      ".ad-flow-preview-fixed{width:340px;max-width:100%;overflow:hidden}" +
      ".ad-flow-svg{display:block;overflow:visible}" +
      // v0.9.3：SVG 走自然像素尺寸（width/height 属性=节点实际大小），容器只缩不放——单节点不再被拉伸撑满；表单预览容器保留等比缩放
      ".ad-flow-preview-fixed .ad-flow-svg{width:100%;height:auto}" +
      ".ad-flow-svg.clickable{cursor:pointer}" +
      ".ad-flow-svg .flow-rect{stroke:var(--ad-line-strong);stroke-width:1;transition:stroke .15s,filter .15s}" +
      ".ad-flow-svg .flow-rect-badge{fill:var(--ad-layer-2);stroke:var(--ad-line-strong);stroke-width:.8}" +
      ".ad-flow-svg .flow-grad-a{stop-color:var(--ad-layer-2)}" +
      ".ad-flow-svg .flow-grad-b{stop-color:var(--ad-layer-1)}" +
      ".ad-flow-svg .flow-arrow{fill:none;stroke:var(--ad-line-strong);stroke-width:1.5}" +
      ".ad-flow-svg .flow-marker{fill:var(--ad-line-strong)}" +
      ".ad-flow-svg .flow-step{font-size:8.5px;fill:var(--ad-faint);font-family:var(--ad-mono)}" +
      ".ad-flow-svg .flow-label{font-size:10.5px;font-weight:600;fill:var(--ad-text)}" +
      ".ad-flow-svg .flow-dep{font-size:7.5px;fill:var(--ad-faint);font-family:var(--ad-mono);text-anchor:end}" +
      ".ad-flow-svg .flow-layer{font-size:9px;fill:var(--ad-faint);font-family:var(--ad-mono);text-anchor:middle;letter-spacing:.08em}" +
      ".ad-flow-svg .flow-node:hover .flow-rect{stroke:var(--ad-accent);filter:drop-shadow(0 0 4px color-mix(in srgb,var(--ad-accent) 40%,transparent))}" +
      ".ad-flow-svg.large .flow-label{font-size:12px}" +
      ".ad-flow-svg.large .flow-step{font-size:9.5px}" +
      ".ad-flow-svg.large .flow-dep{font-size:8.5px}" +
      // v0.8.3：执行流弹窗（modal 大图 + 步骤说明）
      // v0.9.31：补明确 1fr 轨道——网格区高度确定，弹窗 height:min(720px,100%) 的百分比才能解析
      ".ad-modal-mask{position:fixed;inset:0;background:color-mix(in srgb,var(--dsw-alias-bg-base) 55%,transparent);backdrop-filter:blur(3px);z-index:99999;display:grid;grid-template-rows:1fr;grid-template-columns:1fr;place-items:center;padding:24px}" +
      // v0.9.3：执行流弹窗加大并固定（780×图区 300，超宽横向滚动，单节点居中不撑满）
      ".ad-modal{background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l2);border-radius:14px;box-shadow:var(--dsw-shadow-lv3);width:780px;max-width:calc(100vw - 48px);max-height:88vh;display:flex;flex-direction:column;overflow:hidden;animation:ad-modal-in .18s ease}" +
      "@keyframes ad-modal-in{from{opacity:0;transform:scale(.96) translateY(6px)}to{opacity:1;transform:none}}" +
      ".ad-modal-graph{flex:none;height:300px;border:1px solid var(--dsw-alias-border-l1);border-radius:10px;background:var(--dsw-alias-bg-layer-2);display:flex;overflow-x:auto;overflow-y:hidden;padding:8px}" +
      ".ad-modal-graph .ad-flow-svg{margin:auto;flex:none;max-height:100%}" +
      ".ad-modal-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 16px;border-bottom:1px solid var(--dsw-alias-border-l1)}" +
      ".ad-modal-title{font-size:14px;font-weight:600;color:var(--dsw-alias-label-primary)}" +
      ".ad-modal-body{flex:1;min-height:0;overflow:auto;padding:14px 16px;display:flex;flex-direction:column;gap:12px}" +
      ".ad-modal-desc{font-size:11.5px;color:var(--dsw-alias-label-secondary);line-height:1.5}" +
      ".ad-modal-steps{display:flex;flex-direction:column;gap:6px}" +
      ".ad-modal-step{border:1px solid var(--dsw-alias-border-l1);border-radius:9px;padding:8px 10px;background:var(--dsw-alias-bg-layer-2)}" +
      ".ad-modal-step-h{display:flex;align-items:center;gap:8px;flex-wrap:wrap}" +
      ".ad-modal-step-no{flex:none;font:700 10px/1 var(--ds-font-family-code,ui-monospace,monospace);color:var(--dsw-alias-label-primary-inverted);background:var(--dsw-alias-brand-primary);border-radius:5px;padding:3px 6px}" +
      ".ad-modal-step-name{font-size:12px;font-weight:600;color:var(--dsw-alias-label-primary)}" +
      ".ad-modal-step-dep{font-size:9.5px;color:var(--dsw-alias-label-tertiary);font-family:var(--ds-font-family-code,ui-monospace,monospace)}" +
      ".ad-modal-step-inst{font-size:11px;color:var(--dsw-alias-label-secondary);line-height:1.55;margin-top:5px;white-space:pre-wrap;word-break:break-all}" +
      ".ad-graph-empty{color:var(--ad-faint);font-size:10.5px;padding:6px 2px}" +
      ".ad-switch{position:relative;width:30px;height:17px;border-radius:999px;background:var(--dsw-static-neutral-bluish-600);border:none;padding:0;cursor:pointer;flex:none;transition:opacity .15s}" +
      ".ad-switch:hover{opacity:.85}" +
      ".ad-switch .knob{position:absolute;top:2px;left:2px;width:13px;height:13px;border-radius:50%;background:var(--dsw-static-neutral-bluish-00);transition:left .15s}" +
      ".ad-switch.on .knob{left:15px}" +
      ".ad-form{display:flex;flex-direction:column;gap:10px;background:var(--ad-layer-2);border:1px solid var(--ad-line);border-radius:11px;padding:14px}" +
      // v0.9.5：表单嵌进编辑弹窗时压平（去掉盒中盒卡片底）
      ".ad-modal.form .ad-form{background:transparent;border:none;padding:0}" +
      ".ad-field{display:flex;flex-direction:column;gap:4px}" +
      ".ad-label{font-size:11.5px;color:var(--dsw-alias-label-secondary)}" +
      ".ad-input{width:100%;box-sizing:border-box;background:var(--ad-bg);border:1px solid var(--ad-line-strong);border-radius:8px;color:var(--ad-text);font-size:12.5px;padding:6px 9px;outline:none;transition:border-color .15s}" +
      ".ad-input:focus{border-color:var(--ad-accent)}" +
      ".ad-input:disabled{color:var(--dsw-alias-label-secondary);cursor:not-allowed}" +
      ".ad-textarea{width:100%;box-sizing:border-box;background:var(--dsw-alias-bg-base);border:1px solid var(--dsw-alias-border-l2);border-radius:6px;color:var(--dsw-alias-label-primary);font-size:12px;padding:6px 8px;outline:none;font-family:ui-monospace,Menlo,monospace;resize:vertical}" +
      ".ad-textarea.tall{min-height:180px;line-height:1.6}" +
      ".ad-textarea:focus{border-color:var(--dsw-alias-brand-primary)}" +
      ".ad-routes{display:flex;flex-direction:column;gap:6px}" +
      // v0.9.7：模型路由行卡片化（对齐步骤卡片语言）
      ".ad-route{display:flex;align-items:center;gap:6px;background:var(--ad-layer-2);border:1px solid var(--ad-line);border-radius:9px;padding:8px 10px}" +
      ".ad-route:hover{border-color:var(--ad-line-strong)}" +
      ".ad-route .ad-input{flex:1;min-width:0}" +
      ".ad-route .ad-input.effort{flex:none;width:86px}" +
      ".ad-select{appearance:auto;cursor:pointer}" +
      ".ad-actions{display:flex;gap:6px;justify-content:flex-end}" +
      ".ad-err{color:var(--dsw-alias-state-error-primary);background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-state-error-primary);border-radius:6px;padding:6px 8px;font-size:12px;white-space:pre-wrap;word-break:break-all}" +
      ".ad-empty{color:var(--dsw-alias-label-secondary);font-size:12.5px;padding:14px 4px;text-align:center}" +
      ".ad-sec-title{font-size:13px;font-weight:600;color:var(--dsw-alias-label-primary)}" +
      ".ad-sec-head{display:flex;align-items:center;justify-content:space-between;gap:8px}" +
      // 组队管理（独立子 tab）
      ".ad-squad{display:flex;flex-direction:column;gap:6px;margin-top:8px}" +
      ".ad-squad-card{display:flex;flex-direction:column;gap:5px;background:var(--ad-layer-1);border:1px solid var(--ad-line);border-radius:11px;padding:10px 12px;transition:border-color .15s,transform .15s}" +
      ".ad-squad-card:hover{border-color:var(--ad-line-strong)}" +
      // v0.9：小队卡一行 2 个（窄面板降单列）；v0.9.3：卡片恢复流程图缩略（固定 96px 高，只缩不放）
      ".ad-squad-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}" +
      "@media (max-width:900px){.ad-squad-list{grid-template-columns:1fr}}" +
      ".ad-squad-card-main{display:flex;flex-direction:column;gap:8px;min-width:0}" +
      ".ad-squad-info{min-width:0;display:flex;flex-direction:column;gap:7px}" +
      // v0.9.3：卡片流程图固定高度区——SVG 自然尺寸居中（margin:auto，防超宽内容滚动截断）；点击整体放大弹窗
      ".ad-graph-box{height:96px;border:1px solid var(--ad-line);border-radius:9px;background:var(--ad-layer-2);display:flex;overflow-x:auto;overflow-y:hidden;cursor:zoom-in;padding:6px 8px}" +
      ".ad-graph-box:hover{border-color:var(--ad-line-strong)}" +
      ".ad-graph-box .ad-flow-svg{margin:auto;flex:none;max-height:100%}" +
      ".ad-graph-hint{display:flex;align-items:center;justify-content:space-between;font-size:9.5px;color:var(--ad-faint)}" +
      ".ad-squad-steps{font-size:11.5px;color:var(--ad-text);background:var(--ad-layer-2);border:1px solid var(--ad-line);border-radius:7px;padding:4px 9px;word-break:break-all}" +
      // 组队表单的步骤编辑器（v0.9.6：每步骤独立卡片，头行=序号+阶段+Agent+操作，任务模板独立行）
      ".ad-step-list{display:flex;flex-direction:column;gap:8px}" +
      ".ad-step-item{display:flex;flex-direction:column;gap:8px;background:var(--ad-layer-2);border:1px solid var(--ad-line);border-radius:10px;padding:10px 12px}" +
      ".ad-step-item:hover{border-color:var(--ad-line-strong)}" +
      ".ad-step-row{display:flex;flex-wrap:wrap;align-items:center;gap:6px}" +
      ".ad-step-no{flex:none;min-width:28px;text-align:center;font-size:10.5px;font-weight:600;font-family:var(--ad-mono);letter-spacing:.04em;color:var(--dsw-static-neutral-bluish-00);background:var(--ad-accent);border-radius:6px;padding:3px 6px}" +
      ".ad-step-row .ad-input.phase{flex:1;min-width:120px}" +
      ".ad-step-row .ad-input.agent{flex:none;width:190px}" +
      ".ad-step-item .ad-textarea{font-size:12px}" +
      ".ad-step-item .ad-step-acts{display:flex;gap:4px;margin-left:auto}" +
      ".ad-step-deps{display:flex;flex-wrap:wrap;align-items:center;gap:4px 12px;width:100%;font-size:11.5px;color:var(--dsw-alias-label-secondary);padding-left:2px}" +
      ".ad-dep-check{display:inline-flex;align-items:center;gap:4px;cursor:pointer;user-select:none}" +
      // ── v0.7 设计语言（学记忆系统 MnemonView：shell 变量映射 + kicker + liveDot + 空态）──
      // 面板根上定义 --ad-* 变量层，映射到 dsw-alias token，亮/暗主题自动跟随
      ".ad-panel{--ad-bg:var(--dsw-alias-bg-base);--ad-layer-1:var(--dsw-alias-bg-layer-1);--ad-layer-2:var(--dsw-alias-bg-layer-2);--ad-text:var(--dsw-alias-label-primary);--ad-muted:var(--dsw-alias-label-secondary);--ad-faint:var(--dsw-alias-label-tertiary);--ad-line:var(--dsw-alias-border-l1);--ad-line-strong:var(--dsw-alias-border-l2);--ad-accent:var(--dsw-alias-state-business-primary);--ad-green:var(--dsw-alias-state-success-primary);--ad-red:var(--dsw-alias-state-error-primary);--ad-hover:var(--dsw-alias-interactive-bg-hover);--ad-mono:var(--ds-font-family-code,ui-monospace,SFMono-Regular,Menlo,monospace);display:flex;flex-direction:column;height:100%;min-height:0;font-size:13px;color:var(--ad-text);box-sizing:border-box}" +
      // v0.9.21：整面板毛玻璃化。v0.9.25 修正：右侧 tab 页背后是宿主实色壁，纯 backdrop-filter 看不出；
      // 改「玻璃拟态」=半透明提亮渐变 + 1px 玻璃边框 + 顶部内高光 + 软阴影（语义 token，亮暗自适应；悬浮球代码不动）
      ".ad-panel{background:linear-gradient(160deg,color-mix(in srgb,var(--dsw-alias-bg-layer-1) 82%,transparent),color-mix(in srgb,var(--dsw-alias-bg-base) 92%,transparent));backdrop-filter:blur(18px) saturate(1.4);-webkit-backdrop-filter:blur(18px) saturate(1.4);border:1px solid color-mix(in srgb,var(--dsw-alias-border-l2) 65%,transparent);border-radius:14px;box-shadow:inset 0 1px 0 color-mix(in srgb,var(--dsw-alias-bg-layer-2) 60%,transparent),var(--dsw-shadow-lv3)}" +
      ".ad-panel .ad-row,.ad-panel .ad-route{background:color-mix(in srgb,var(--ad-layer-1) 62%,transparent)}" +
      ".ad-panel .ad-hist-preview,.ad-panel .ad-hist-taskbox{background:color-mix(in srgb,var(--ad-layer-1) 62%,transparent)}" +
      ".ad-panel *,.ad-panel :before,.ad-panel :after{box-sizing:border-box}" +
      ".ad-panel-head{display:flex;align-items:center;gap:10px;padding:12px 16px 10px;flex:none}" +
      // v0.9.28：返回按钮升到会话头部槽 conversation.session.header.actions（任何 tab 下可见，一跳返回）；
      // 渲染在 .ad-panel 之外，样式必须自包含（语义化 token，不引用面板内 --ad-* 变量）
      ".ad-header-back{display:inline-flex;align-items:center;gap:5px;background:transparent;border:1px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-secondary);border-radius:7px;padding:3px 10px;font-size:12px;font-weight:600;cursor:pointer;transition:border-color .15s,color .15s}" +
      ".ad-header-back:hover{border-color:var(--dsw-alias-label-tertiary);color:var(--dsw-alias-label-primary)}" +
      // v0.8.9：logo 去渐变底——DSH 官方图形品牌色直出，亮/暗主题均可辨
      ".ad-logo{width:26px;height:26px;display:grid;place-items:center;flex:none}" +
      // v0.9.5：头部 logo 白色（label-primary：暗主题下即白色，亮主题保持可见）
      ".ad-logo .ad-dsh-logo{width:26px;height:26px;color:var(--dsw-alias-label-primary)}" +
      ".ad-dsh-logo{width:18px;height:18px;display:block;color:var(--dsw-alias-state-business-primary)}" +
      ".ad-fab .ad-dsh-logo{width:22px;height:22px;color:var(--dsw-static-neutral-1000)}" +
      ".ad-fab-pop-title .ad-dsh-logo{width:16px;height:16px;color:var(--dsw-alias-label-primary)}" +
      ".ad-panel-title{font-size:16px;font-weight:600;letter-spacing:-.01em}" +
      ".ad-live-pill{margin-left:auto;display:flex;align-items:center;gap:6px;font-size:11px;color:var(--ad-muted);border:1px solid var(--ad-line-strong);border-radius:999px;padding:4px 11px;background:var(--ad-layer-1);flex:none}" +
      ".ad-live-pill .ad-dot{width:6px;height:6px}" +
      ".ad-dot{border-radius:50%;width:6px;height:6px;flex:none;display:inline-block}" +
      ".ad-dot.on{background:var(--ad-green);box-shadow:0 0 0 3px color-mix(in srgb,var(--ad-green) 15%,transparent);animation:ad-pulse 1.8s ease-in-out infinite}" +
      ".ad-dot.off{background:var(--ad-faint)}" +
      "@keyframes ad-pulse{0%,100%{opacity:1}50%{opacity:.45}}" +
      ".ad-subtabs{display:flex;gap:2px;padding:0 12px;border-bottom:1px solid var(--ad-line);flex:none;overflow-x:auto}" +
      ".ad-subtab{background:transparent;border:none;border-bottom:2px solid transparent;color:var(--ad-faint);font-size:12.5px;padding:8px 14px;cursor:pointer;white-space:nowrap;display:flex;align-items:center;gap:5px}" +
      ".ad-subtab:hover{color:var(--ad-muted)}" +
      ".ad-subtab.on{color:var(--ad-text);border-bottom-color:var(--ad-accent)}" +
      ".ad-subtab .n{background:var(--ad-layer-2);color:var(--ad-muted);font-size:10px;border-radius:8px;padding:0 6px}" +
      ".ad-subtab.on .n{background:color-mix(in srgb,var(--ad-accent) 16%,transparent);color:var(--ad-accent)}" +
      ".ad-panel-body{flex:1;min-height:0;overflow:auto;padding:16px;display:flex;flex-direction:column;gap:14px}" +
      ".ad-kicker{color:var(--ad-faint);font:650 9px/1.2 var(--ad-mono);letter-spacing:.12em;text-transform:uppercase}" +
      ".ad-kicker-row{display:flex;align-items:center;justify-content:space-between;gap:8px;flex:none}" +
      ".ad-kicker-row .meta{font-size:10px;color:var(--ad-faint);white-space:nowrap}" +
      // v0.9.36：总览页顶部设置卡片（原设置页信息迁入）——边框卡片，与 ad-stat 语言一致，悬浮球开关复用 ad-switch
      ".ad-set-card{border:1px solid var(--ad-line);background:var(--ad-layer-1);border-radius:11px;padding:4px 12px;display:flex;flex-direction:column;gap:0;flex:none}" +
      ".ad-set-card .ad-set-row{display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid var(--ad-line);min-width:0}" +
      ".ad-set-card .ad-set-row:last-child{border-bottom:none}" +
      ".ad-set-card .grow{flex:1;min-width:0}" +
      ".ad-set-card .t1{font-size:12.5px;font-weight:600;color:var(--ad-text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}" +
      ".ad-set-card .t2{font-size:11px;color:var(--ad-faint);margin-top:2px;line-height:1.5;overflow-wrap:break-word}" +
      ".ad-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;flex:none}" +
      ".ad-stat{border:1px solid var(--ad-line);background:var(--ad-layer-1);border-radius:11px;padding:10px 11px;display:flex;flex-direction:column;gap:3px;min-width:0;transition:border-color .15s}" +
      ".ad-stat:hover{border-color:var(--ad-line-strong)}" +
      ".ad-stat .v{font-size:19px;font-weight:600;line-height:1.1;font-family:var(--ad-mono);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}" +
      // v0.9.8：统计数字全部改静态近白（含高亮数字，两主题可见）
      ".ad-stat .v{color:var(--dsw-static-neutral-bluish-00)}" +
      ".ad-stat.hl .v{color:var(--dsw-static-neutral-bluish-00)}" +
      ".ad-stat .k{font-size:10px;color:var(--ad-faint);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}" +
      ".ad-run-card{border:1px solid var(--ad-line-strong);border-left:3px solid var(--ad-green);background:var(--ad-layer-1);border-radius:11px;padding:11px 13px;display:flex;align-items:center;gap:11px;transition:transform .15s,background-color .15s,border-color .15s}" +
      ".ad-run-card:hover{transform:translateY(-1px);background:var(--ad-layer-2)}" +
      ".ad-run-card.clickable{cursor:pointer}" +
      ".ad-run-emoji{width:34px;height:34px;border-radius:9px;background:var(--ad-layer-2);border:1px solid var(--ad-line-strong);display:grid;place-items:center;font-size:17px;flex:none}" +
      ".ad-run-mid{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}" +
      ".ad-run-name{font-size:13px;font-weight:500;display:flex;align-items:center;gap:7px;min-width:0}" +
      ".ad-run-name .cid{font:10px var(--ad-mono);color:var(--ad-faint);flex:none}" +
      ".ad-run-task{font-size:11px;color:var(--ad-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}" +
      ".ad-run-badge{display:flex;align-items:center;gap:5px;font-size:10px;color:var(--ad-green);border:1px solid color-mix(in srgb,var(--ad-green) 22%,transparent);background:color-mix(in srgb,var(--ad-green) 9%,transparent);border-radius:999px;padding:2px 8px;flex:none;white-space:nowrap}" +
      // v0.9：Agent 卡一行 4 个（窄面板降 2/1 列），紧凑卡片向悬浮球卡片语言看齐
      ".ad-cards{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}" +
      "@media (max-width:1280px){.ad-cards{grid-template-columns:repeat(2,minmax(0,1fr))}}" +
      "@media (max-width:760px){.ad-cards{grid-template-columns:1fr}}" +
      ".ad-cards .ad-row{padding:11px 12px;gap:7px;border-radius:12px;display:flex;flex-direction:column;height:100%}" +
      ".ad-cards .ad-row .ad-name{font-size:12.5px}" +
      ".ad-cards .ad-row .ad-id{font-size:10px}" +
      // v0.9：状态/类型胶囊（与悬浮球 ad-fab-chip 同款语言，替代原「触发/路由」文本标签）
      ".ad-chip{flex:none;font-size:10px;font-weight:600;padding:2px 8px;border-radius:99px;white-space:nowrap;line-height:1.5}" +
      ".ad-chip.dim{color:var(--ad-faint);background:var(--ad-layer-2);border:1px solid var(--ad-line)}" +
      ".ad-chip.accent{color:var(--ad-accent);background:color-mix(in srgb,var(--ad-accent) 12%,transparent)}" +
      ".ad-chip.ok{color:var(--ad-green);background:color-mix(in srgb,var(--ad-green) 10%,transparent)}" +
      ".ad-chip-row{display:flex;flex-wrap:wrap;gap:4px;min-width:0}" +
      ".ad-chip.trig{color:var(--ad-muted);background:var(--ad-layer-2);border:1px solid var(--ad-line);font-weight:500;font-size:10px;padding:1.5px 7px;max-width:100%;overflow:hidden;text-overflow:ellipsis}" +
      // v0.9：描述两行截断（小队/Agent 卡通用）
      ".ad-desc{color:var(--ad-faint);font-size:11px;line-height:1.5;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;word-break:break-all}" +
      // v0.9.14：头像回退首字 monogram（0.9.13 白 logo 方案被推翻；白 logo 样式保留做空名兜底）
      ".ad-avatar.mono{font-size:15px;font-weight:700;color:var(--ad-accent);background:color-mix(in srgb,var(--ad-accent) 10%,var(--ad-layer-2));display:grid;place-items:center;font-family:var(--ad-mono)}" +
      ".ad-avatar.logo{background:color-mix(in srgb,var(--dsw-static-neutral-1000) 80%,transparent);border-color:transparent}" +
      ".ad-avatar.logo .ad-dsh-logo{width:18px;height:18px;color:var(--dsw-static-neutral-bluish-00)}" +
      ".ad-run-emoji.logo{background:color-mix(in srgb,var(--dsw-static-neutral-1000) 80%,transparent);border-color:transparent}" +
      ".ad-run-emoji.logo .ad-dsh-logo{width:20px;height:20px;color:var(--dsw-static-neutral-bluish-00)}" +
      // v0.9：卡片中部名称/ID 纵排 + 名称截断（头像与开关之间的伸缩区）
      ".ad-mid{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}" +
      ".ad-cards .ad-row .ad-name,.ad-squad-card .ad-name{display:flex;align-items:center;gap:6px;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}" +
      // v0.9：Agent 卡路由一行（mono 小字，超出截断；与表单 .ad-route 区分，用 .ad-cards 作用域）
      ".ad-cards .ad-route{display:block;font-size:10.5px;color:var(--ad-faint);font-family:var(--ad-mono);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}" +
      ".ad-empty{border:1px dashed var(--ad-line-strong);border-radius:13px;min-height:150px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;background:color-mix(in srgb,var(--ad-layer-1) 50%,transparent);padding:24px;text-align:center}" +
      // v0.9.8：空态圆形图标删除（只留文字）
      ".ad-empty-text{font-size:12px;color:var(--ad-muted)}" +
      ".ad-empty-sub{font-size:10px;color:var(--ad-faint);max-width:300px;line-height:1.6}" +
      ".ad-hist-line{display:flex;flex-direction:column;border:1px solid var(--ad-line);border-radius:9px;overflow:hidden;transition:border-color .15s}" +
      ".ad-hist-line:hover{border-color:var(--ad-line-strong)}" +
      ".ad-hist-line.open{border-color:var(--ad-accent)}" +
      // v0.9.21：历史列表标题行（列头）——与行头同宽对齐：时间｜头像｜名称｜消息｜状态｜操作
      ".ad-hist-colhead{display:flex;align-items:center;gap:8px;padding:4px 10px;font-size:10px;letter-spacing:.06em;color:var(--ad-faint);font-family:var(--ad-mono)}" +
      ".ad-hist-colhead .c-time{width:44px;flex:none}" +
      ".ad-hist-colhead .c-avatar{width:30px;flex:none}" +
      ".ad-hist-colhead .c-name{width:100px;flex:none}" +
      ".ad-hist-colhead .c-task{flex:1;min-width:0}" +
      ".ad-hist-colhead .c-status{flex:none;width:52px;text-align:center}" +
      ".ad-hist-colhead .c-actions{flex:none;width:130px;text-align:right}" +
      // v0.9.21：执行流图例（只读小队历史展开区顶部）
      ".ad-legend{display:flex;align-items:center;gap:12px;flex-wrap:wrap;font-size:10px;color:var(--ad-faint);padding:2px 0}" +
      ".ad-legend .lg{display:inline-flex;align-items:center;gap:4px}" +
      ".ad-legend .sw{width:10px;height:10px;border-radius:3px;border:1px solid var(--ad-line-strong);background:var(--ad-layer-2)}" +
      ".ad-legend .sw.done{background:color-mix(in srgb,var(--ad-green) 25%,var(--ad-layer-2));border-color:var(--ad-green)}" +
      ".ad-legend .sw.run{background:color-mix(in srgb,var(--ad-accent) 22%,var(--ad-layer-2));border-color:var(--ad-accent)}" +
      ".ad-legend .sw.fail{background:color-mix(in srgb,var(--ad-red) 22%,var(--ad-layer-2));border-color:var(--ad-red)}" +
      ".ad-legend .sw.skip{border-style:dashed;opacity:.6}" +
      ".ad-hist-head{display:flex;align-items:center;gap:8px;padding:7px 10px;font-size:12px;min-width:0;cursor:pointer}" +
      ".ad-hist-head:hover{background:var(--ad-hover)}" +
      ".ad-hist-actions{flex:none;display:inline-flex;gap:4px;margin-left:auto}" +
      ".ad-hist-preview{border-top:1px dashed var(--ad-line);padding:9px 12px;display:flex;flex-direction:column;gap:7px;background:var(--ad-layer-2);font-size:11.5px}" +
      ".ad-hist-preview-row{display:flex;align-items:center;gap:8px;min-width:0;color:var(--ad-text)}" +
      ".ad-hist-id{font:10px var(--ad-mono);color:var(--ad-faint);word-break:break-all;flex:1;min-width:0}" +
      ".ad-hist-err{color:var(--ad-red);font-size:11px;word-break:break-all}" +
      // v0.9.14：类型列徽标（小队=accent 淡底，Agent=中性）
      ".ad-hist-type{flex:none;font-size:10px;font-weight:600;border-radius:99px;padding:1.5px 8px;color:var(--ad-muted);background:var(--ad-layer-2);border:1px solid var(--ad-line)}" +
      ".ad-hist-type.squad{color:var(--ad-accent);background:color-mix(in srgb,var(--ad-accent) 10%,transparent);border-color:color-mix(in srgb,var(--ad-accent) 30%,transparent)}" +
      // v0.9.13：任务详情固定尺寸滚动框（展开区内）
      ".ad-hist-taskbox{width:100%;height:110px;overflow:auto;background:var(--ad-layer-1);border:1px solid var(--ad-line);border-radius:8px;padding:8px 10px;font-size:11.5px;line-height:1.6;white-space:pre-wrap;word-break:break-word;color:var(--ad-text)}" +
      // v0.9.17：历史页分段切换（Agent 历史 / 小队历史），行结构两列表一致
      ".ad-seg{display:inline-flex;align-self:flex-start;background:var(--ad-layer-2);border:1px solid var(--ad-line);border-radius:9px;padding:2px;gap:2px}" +
      ".ad-seg button{border:1px solid transparent;background:transparent;color:var(--ad-muted);font-size:12px;padding:4px 12px;border-radius:7px;cursor:pointer;transition:color .15s,background-color .15s}" +
      ".ad-seg button:hover{color:var(--ad-text)}" +
      ".ad-seg button.on{background:var(--ad-layer-1);border-color:var(--ad-line-strong);color:var(--ad-text);font-weight:600}" +
      // v0.9.17：执行流图节点按步骤状态着色（CSS 覆盖 presentation 属性 fill）
      ".ad-flow-svg .flow-node.st-done .flow-rect{fill:color-mix(in srgb,var(--ad-green) 18%,var(--ad-layer-1));stroke:var(--ad-green)}" +
      ".ad-flow-svg .flow-node.st-run .flow-rect{fill:color-mix(in srgb,var(--ad-accent) 15%,var(--ad-layer-1));stroke:var(--ad-accent)}" +
      ".ad-flow-svg .flow-node.st-fail .flow-rect{fill:color-mix(in srgb,var(--ad-red) 16%,var(--ad-layer-1));stroke:var(--ad-red)}" +
      ".ad-flow-svg .flow-node.st-skip{opacity:.55}" +
      ".ad-flow-svg .flow-node.st-skip .flow-rect{stroke-dasharray:4 3}" +
      ".ad-flow-svg .flow-node.st-unknown .flow-rect{stroke-dasharray:2 3}" +
      // v0.9.17：展开区步骤明细行（状态词 + 跳转）
      ".ad-step-row{display:flex;align-items:center;gap:8px;font-size:11.5px;padding:3px 0;min-width:0}" +
      ".ad-step-row .no{flex:none;font-family:var(--ad-mono);font-size:10px;color:var(--ad-faint);width:22px}" +
      ".ad-step-row .nm{color:var(--ad-text);min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}" +
      ".ad-step-row .st{flex:none;font-size:10px}" +
      ".ad-step-row .st.done{color:var(--ad-green)}" +
      ".ad-step-row .st.run{color:var(--ad-accent)}" +
      ".ad-step-row .st.fail{color:var(--ad-red)}" +
      ".ad-step-row .st.skip,.ad-step-row .st.wait,.ad-step-row .st.unk{color:var(--ad-faint)}" +
      ".ad-hist-time{flex:none;color:var(--ad-faint);font:11px var(--ad-mono)}" +
      ".ad-hist-name{flex:none;max-width:100px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}" +
      ".ad-hist-task{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--ad-muted);font-size:11.5px}" +
      ".ad-hist-ok,.ad-hist-done{flex:none;color:var(--ad-green);font-size:10.5px}" +
      ".ad-hist-ng,.ad-hist-fail{flex:none;color:var(--ad-red);font-size:10.5px}" +
      ".ad-hist-run{flex:none;color:var(--ad-accent);font-size:10.5px}" +
      ".ad-hist-unknown,.ad-hist-unk{flex:none;color:var(--ad-faint);font-size:10.5px}" +
      ".ad-sec-title{font-size:11.5px;color:var(--ad-muted);margin-top:2px;flex:none}" +
      ".ad-err{color:var(--ad-red);font-size:12px;flex:none}" +
      // ── FAB v0.7：可拖动 + 完成徽标 + 弹窗跟随（样式挂 body 层，不能依赖 .ad-panel 变量）──
      ".ad-fab{--fab-bg:var(--dsw-alias-brand-primary);--fab-fg:var(--dsw-static-neutral-bluish-00);--fab-green:var(--dsw-alias-state-success-primary);--fab-line:var(--dsw-alias-border-l2);--fab-layer2:var(--dsw-alias-bg-layer-2);position:fixed;width:46px;height:46px;border-radius:50%;background:linear-gradient(135deg,var(--dsw-alias-state-business-primary),var(--dsw-alias-brand-primary));color:var(--fab-fg);display:grid;place-items:center;font-size:20px;cursor:grab;user-select:none;touch-action:none;z-index:9999;box-shadow:0 4px 18px color-mix(in srgb,var(--dsw-alias-state-business-primary) 35%,transparent);transition:box-shadow .3s,transform .18s ease;animation:ad-fab-breathe 4.2s ease-in-out infinite;overflow:visible;opacity:var(--fab-opacity,1)}" +
      // v0.9.2：透明毛玻璃球——无高光，半透明白渐变 + 微弱内阴影（轮廓靠玻璃质感）
      ".ad-fab::before{content:'';position:absolute;inset:0;border-radius:50%;pointer-events:none;background:linear-gradient(135deg,rgba(255,255,255,.16),rgba(255,255,255,.04));box-shadow:inset 0 0 14px rgba(255,255,255,.18),inset -3px -4px 8px rgba(0,0,0,.12)}" +
      ".ad-fab::after{content:'';position:absolute;left:16%;right:16%;bottom:-5px;height:6px;border-radius:50%;background:radial-gradient(ellipse at center,rgba(0,0,0,.25),transparent 70%);pointer-events:none;filter:blur(2px)}" +
      // v0.8.11：鼠标悬停特效——轻微放大 + 光晕增强（无高光，只增强光晕）
      ".ad-fab:hover:not(.dragging){transform:scale(1.1);box-shadow:0 6px 24px color-mix(in srgb,var(--fab-c1,var(--dsw-alias-state-business-primary)) 55%,transparent)}" +
      // v0.8.3：悬浮球动态特效——呼吸光晕（常态）、拖拽放大+阴影（拖动）、完成闪光（扩散光环）
      "@keyframes ad-fab-breathe{0%,100%{box-shadow:0 4px 18px color-mix(in srgb,var(--fab-c1,var(--dsw-alias-state-business-primary)) 35%,transparent),0 0 0 0 transparent;transform:scale(1)}50%{box-shadow:0 4px 18px color-mix(in srgb,var(--fab-c1,var(--dsw-alias-state-business-primary)) 35%,transparent),0 0 10px 2px var(--dsw-static-neutral-00);transform:scale(1.06)}}" +
      ".ad-fab.dragging{cursor:grabbing;transform:scale(1.14);box-shadow:0 10px 30px color-mix(in srgb,var(--dsw-alias-state-business-primary) 55%,transparent);animation:none}" +
      // v0.9.33：活跃绿点（.ad-fab-dot）与完成 ✓N 角标（.ad-fab-done）已删——用户：光效提醒已足够，绿点冗余
      // v0.9.3：面板背景改 ::before 不透明度层（弃 color-mix，此环境解析失败），透明度变量 --fab-pop-alpha（0-1）
      ".ad-fab-pop{position:fixed;width:360px;max-width:calc(100vw - 24px);background:transparent;border:1px solid var(--dsw-alias-border-l2);border-radius:16px;padding:0;box-shadow:var(--dsw-shadow-lv3);display:flex;flex-direction:column;z-index:9999;overflow:hidden;animation:ad-fab-pop-in .18s cubic-bezier(.2,.9,.3,1.15);backdrop-filter:blur(18px) saturate(1.4);-webkit-backdrop-filter:blur(18px) saturate(1.4);transform-origin:center}" +
      ".ad-fab-pop::before{content:'';position:absolute;inset:0;background:var(--dsw-alias-bg-layer-2);opacity:var(--fab-pop-alpha,.85);pointer-events:none}" +
      ".ad-fab-pop>*{position:relative;z-index:1}" +
      // v0.8.12：面板从中心弹出（scale 0.8→1，弹性收尾）
      "@keyframes ad-fab-pop-in{0%{opacity:0;transform:scale(.8)}100%{opacity:1;transform:scale(1)}}" +
      // v0.8.8：活动面板方案A——头部状态摘要 + 卡片分区
      ".ad-fab-pop-head{display:flex;align-items:center;gap:9px;padding:13px 16px 11px;border-bottom:1px solid var(--dsw-alias-border-l1);background:linear-gradient(135deg,color-mix(in srgb,var(--dsw-alias-state-business-primary) 7%,transparent),transparent 60%)}" +
      ".ad-fab-pop-title{flex:1;min-width:0;display:flex;align-items:center;gap:8px;font-size:13.5px;font-weight:650;color:var(--dsw-alias-label-primary)}" +
      ".ad-fab-pop-summary{flex:none;display:inline-flex;align-items:center;gap:5px;font-size:10.5px;font-weight:600;color:var(--dsw-alias-state-success-primary);background:color-mix(in srgb,var(--dsw-alias-state-success-primary) 12%,transparent);border-radius:99px;padding:3px 9px}" +
      ".ad-fab-pop-summary.zero{color:var(--dsw-alias-label-tertiary);background:var(--dsw-alias-bg-layer-1)}" +
      // v0.9.24：scrollbar-gutter:stable——内容临界溢出时滚动条一出现卡片就被挤窄 15px，
      // 预留滚动条槽位让宽度恒定（Electron 经典滚动条为占位式）
      ".ad-fab-pop-body{display:flex;flex-direction:column;gap:4px;padding:10px 12px;max-height:300px;overflow:auto;scrollbar-gutter:stable}" +
      // v0.9.22：兜底——body 的所有直接子项禁止参与压缩（超高时滚动而不是压扁叠卡）
      ".ad-fab-pop-body>*{flex:none}" +
      ".ad-fab-sec{flex:none;display:flex;align-items:center;gap:7px;padding:8px 3px 5px;font:650 10px/1 var(--ds-font-family-code,ui-monospace,monospace);letter-spacing:.1em;text-transform:uppercase;color:var(--dsw-alias-label-tertiary)}" +
      ".ad-fab-sec:first-child{padding-top:2px}" +
      ".ad-fab-sec .cnt{color:var(--dsw-alias-label-secondary);font-weight:600}" +
      // v0.9.23：面板卡片同底化——卡片弃实底（layer-1），与面板同底只靠边框区分（用户偏好）；
      // 且必须 border-box：否则宿主全局 *{box-sizing} 不一致时 1px 边框挤占内容造成错位
      ".ad-fab-card{flex:none;display:flex;align-items:center;gap:9px;box-sizing:border-box;border:1px solid var(--dsw-alias-border-l1);border-radius:11px;padding:8px 11px;background:transparent;min-width:0;transition:border-color .12s}" +
      ".ad-fab-card:hover{border-color:var(--dsw-alias-border-l2)}" +
      ".ad-fab-card.clickable{cursor:pointer}" +
      ".ad-fab-card .ad-avatar{width:26px;height:26px;font-size:13px;border-radius:8px}" +
      ".ad-fab-card .grow{flex:1;min-width:0}" +
      ".ad-fab-card .grow .t1{font-size:12px;font-weight:600;color:var(--dsw-alias-label-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}" +
      ".ad-fab-card .grow .t2{font-size:10.5px;color:var(--dsw-alias-label-tertiary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:1px}" +
      ".ad-fab-chip{flex:none;font-size:10px;font-weight:600;padding:2.5px 8px;border-radius:99px}" +
      ".ad-fab-chip.run{color:var(--dsw-alias-state-business-primary);background:color-mix(in srgb,var(--dsw-alias-state-business-primary) 12%,transparent)}" +
      ".ad-fab-chip.ok{color:var(--dsw-alias-state-success-primary);background:color-mix(in srgb,var(--dsw-alias-state-success-primary) 12%,transparent)}" +
      ".ad-fab-chip.ng{color:var(--dsw-alias-state-error-primary);background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 12%,transparent)}" +
      ".ad-fab-chip.un{color:var(--dsw-alias-label-tertiary);background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l1)}" +
      ".ad-fab-empty{font-size:11.5px;color:var(--dsw-alias-label-tertiary);padding:22px 4px;text-align:center}" +
      ".ad-fab-pop-foot{display:flex;gap:8px;padding:11px 14px;border-top:1px solid var(--dsw-alias-border-l1);background:transparent}" +
      // v0.9.20：面板按钮同底化——主按钮弃蓝填充，透明底+边框区分（与卡片/面板同底原则一致）
      ".ad-fab-pop-foot .primary{flex:1;background:transparent;color:var(--dsw-alias-label-primary);border:1px solid var(--dsw-alias-border-l2);border-radius:9px;padding:8px 12px;font-size:12.5px;font-weight:600;cursor:pointer;transition:background .12s,border-color .12s}" +
      ".ad-fab-pop-foot .primary:hover{background:var(--dsw-alias-interactive-bg-hover);border-color:var(--dsw-alias-border-l3)}" +
      ".ad-fab-pop-foot .ghost{flex:none;border:1px solid var(--dsw-alias-border-l2);background:transparent;color:var(--dsw-alias-label-secondary);border-radius:9px;padding:8px 12px;font-size:12px;cursor:pointer;display:flex;align-items:center;gap:5px;transition:background .12s}" +
      ".ad-fab-pop-foot .ghost:hover{background:var(--dsw-alias-interactive-bg-hover)}" +
      // v0.8.8：悬浮球设置浮层
      ".ad-fab-tone-row{flex:none;display:grid;grid-template-columns:repeat(4,1fr);gap:6px}" +
      ".ad-fab-tone{display:inline-flex;align-items:center;justify-content:center;gap:6px;border:1px solid var(--dsw-alias-border-l2);border-radius:9px;padding:6px 8px;font-size:11.5px;color:var(--dsw-alias-label-primary);cursor:pointer;transition:border-color .12s,color .12s;white-space:nowrap}" +
      ".ad-fab-tone:hover{border-color:var(--dsw-alias-border-l3)}" +
      ".ad-fab-tone.on{border-color:var(--dsw-alias-border-l3);color:var(--dsw-alias-label-primary)}" +
      ".ad-fab-tone .dot{width:15px;height:15px;border-radius:50%;flex:none;border:1px solid var(--dsw-alias-border-l3);box-sizing:border-box}" +
      ".ad-fab-set-row{flex:none;display:flex;align-items:center;gap:10px;border:1px solid var(--dsw-alias-border-l1);border-radius:10px;padding:9px 12px;background:transparent}" +
      ".ad-fab-set-row .grow{flex:1;min-width:0}" +
      ".ad-fab-set-row .t1{font-size:12px;font-weight:600;color:var(--dsw-alias-label-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}" +
      ".ad-fab-set-row .t2{font-size:10.5px;color:var(--dsw-alias-label-tertiary);margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}" +
      ".ad-fab-set-row .grow{min-width:0}" +
      // v0.8.11：透明度滑块
      ".ad-fab-alpha-val{flex:none;font-size:11px;font-weight:600;color:var(--dsw-alias-label-secondary);min-width:34px;text-align:right}" +
      // v0.9.19：滑杆球与开关同视觉（灰轨白球，两主题通用）——弃 accent-color 原生外观，自定义轨道+拇指
      ".ad-fab-alpha{flex:none;width:84px;height:17px;cursor:pointer;-webkit-appearance:none;appearance:none;background:transparent}" +
      ".ad-fab-alpha::-webkit-slider-runnable-track{height:4px;border-radius:999px;background:var(--dsw-static-neutral-bluish-600)}" +
      ".ad-fab-alpha::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:13px;height:13px;border-radius:50%;background:var(--dsw-static-neutral-bluish-00);border:1px solid var(--dsw-alias-border-l2);margin-top:-4.5px}" +
      ".ad-fab-alpha::-moz-range-track{height:4px;border-radius:999px;background:var(--dsw-static-neutral-bluish-600)}" +
      ".ad-fab-alpha::-moz-range-thumb{width:13px;height:13px;border-radius:50%;background:var(--dsw-static-neutral-bluish-00);border:1px solid var(--dsw-alias-border-l2)}" +
      // v0.8.8：悬浮球色调/动效（CSS 变量注入，动效类切换）
      // v0.9.3：色调全部用确实存在的静态 token（根因：旧代码引用不存在的 --dsw-alias-state-info/warning-primary→渐变失效→透明黑）
      // v0.9.5：浅色批次（雪白/天蓝/雾紫/樱粉/杏橙）+ 彩虹 + 毛玻璃无色透明
      ".ad-fab{background:linear-gradient(135deg,var(--dsw-static-blue-500),var(--dsw-static-blue-800)) !important}" +
      ".ad-fab.ad-tone-snow{background:linear-gradient(135deg,var(--dsw-static-neutral-00),var(--dsw-static-neutral-bluish-100)) !important}" +
      ".ad-fab.ad-tone-sky{background:linear-gradient(135deg,var(--dsw-static-blue-100),var(--dsw-static-blue-400)) !important}" +
      ".ad-fab.ad-tone-mist{background:linear-gradient(135deg,var(--dsw-static-deepseek-100),var(--dsw-static-deepseek-450)) !important}" +
      ".ad-fab.ad-tone-cherry{background:linear-gradient(135deg,var(--dsw-static-red-100),var(--dsw-static-red-400)) !important}" +
      ".ad-fab.ad-tone-apricot{background:linear-gradient(135deg,var(--dsw-static-amber-100),var(--dsw-static-amber-400)) !important}" +
      ".ad-fab.ad-tone-rainbow{background:linear-gradient(120deg,var(--dsw-static-red-500),var(--dsw-static-amber-500),var(--dsw-static-green-500),var(--dsw-static-blue-500)) !important}" +
      // v0.9.11：毛玻璃调亮——纯透明底在暗色页面显黑（用户：太黑了白一点）；改近白半透明叠层+保留磨砂模糊（实底会挡住 backdrop-filter）
      ".ad-fab.ad-tone-glass{background:linear-gradient(135deg,rgba(255,255,255,.75),rgba(255,255,255,.55)) !important;backdrop-filter:blur(10px) saturate(1.3);-webkit-backdrop-filter:blur(10px) saturate(1.3);border:1px solid rgba(255,255,255,.6)}" +
      // v0.8.10：呼吸=单色光晕脉动+轻微缩放；v0.9.12：整球彩色流光已删，只留边缘流光
      ".ad-fab.fab-breathe{animation:ad-fab-breathe 4.2s ease-in-out infinite}" +
      ".ad-fab:not(.fab-breathe){animation:none}" +
      // v0.9.17：运行中=白光呼吸加速（2.6s，状态指示不受常态呼吸开关约束）；完成=彩色光呼吸
      ".ad-fab.fab-live{animation:ad-fab-breathe 2.6s ease-in-out infinite}" +
      // v0.9.5：边缘流光=独立旋转 conic 渐变环（遮罩掏空中心只露 3px 边缘）
      ".ad-fab-edge-ring{position:absolute;inset:-3px;border-radius:50%;pointer-events:none;background:conic-gradient(from 0deg,var(--dsw-static-red-500),var(--dsw-static-amber-500),var(--dsw-static-green-500),var(--dsw-static-blue-500),var(--dsw-static-red-500));-webkit-mask:radial-gradient(farthest-side,transparent calc(100% - 3px),#000 calc(100% - 2.5px));mask:radial-gradient(farthest-side,transparent calc(100% - 3px),#000 calc(100% - 2.5px));animation:ad-edge-spin 4s linear infinite}" +
      "@keyframes ad-edge-spin{to{transform:rotate(360deg)}}" +
      ".ad-fab:not(.fab-edge) .ad-fab-edge-ring{display:none}" +
      // v0.9.17：完成提醒=彩色光呼吸（绿→蓝→琥珀柔光循环，无放大无跳动）
      // v0.9.37：改无限循环常驻（用户：完成光效太短；点击悬浮球后消失，有活跃任务回退白光呼吸）
      "@keyframes ad-fab-glow-done{0%,100%{box-shadow:0 4px 18px color-mix(in srgb,var(--fab-c1,var(--dsw-alias-state-business-primary)) 35%,transparent),0 0 10px 2px color-mix(in srgb,var(--dsw-alias-state-success-primary) 55%,transparent)}33%{box-shadow:0 4px 18px color-mix(in srgb,var(--fab-c1,var(--dsw-alias-state-business-primary)) 35%,transparent),0 0 14px 4px color-mix(in srgb,var(--dsw-alias-state-business-primary) 55%,transparent)}66%{box-shadow:0 4px 18px color-mix(in srgb,var(--fab-c1,var(--dsw-alias-state-business-primary)) 35%,transparent),0 0 14px 4px color-mix(in srgb,var(--dsw-alias-state-warn-primary) 50%,transparent)}}" +
      ".ad-fab.done-glow{animation:ad-fab-glow-done 1.6s ease-in-out infinite}" +
      ".ad-fab.dragging.fab-breathe,.ad-fab.dragging.fab-live,.ad-fab.dragging.done-glow{animation:none}" +
      // v0.8.7：面板内最近委派区
      ".ad-fab-pop-foot{display:flex;gap:6px;padding:9px 12px;border-top:1px solid var(--dsw-alias-border-l1)}" +
      // v0.9.3：✕ 还原原尺寸（28px），只把 ⚙ 放大（.ad-fab-pop-set）
      ".ad-fab-pop-close{flex:none;width:28px;height:28px;border-radius:8px;border:none;background:transparent;color:var(--dsw-alias-label-secondary);font-size:14px;line-height:1;cursor:pointer;display:grid;place-items:center;transition:background .12s,color .12s}" +
      ".ad-fab-pop-set{width:36px;height:36px;font-size:19px;border-radius:10px}" +
      ".ad-fab-pop-close:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}" +
      // v0.9.32：悬停快捷按钮（⇱/⇲）已移除——卡片点击统一直达主会话，样式一并清理
      ".ad-fab-sec-toggle{cursor:pointer;user-select:none}" +
      ".ad-fab-sec-toggle:hover{color:var(--dsw-alias-label-primary)}" +
      ".ad-fab-sec-toggle .arrow{font-size:9px;color:var(--dsw-alias-label-tertiary)}" +
      ".ad-fab-agents{flex:none;display:flex;flex-direction:column;gap:4px;margin-bottom:2px}" +
      // v0.9.17：四分区卡片化——每分区独立圆角卡片（边框+圆角+浅底），标题行（名称+计数+右箭头）整行点击折叠
      // v0.9.22：body 是 flex 列 + max-height，子项默认 flex-shrink:1 会在内容超高时被压扁
      // → 卡片互相叠压（用户：展开都重叠了）。全部 flex:none 禁止压缩，交给 body 滚动
      ".ad-fab-box{flex:none;border:1px solid var(--dsw-alias-border-l1);border-radius:12px;background:transparent;overflow:hidden}" +
      ".ad-fab-box-hd{display:flex;align-items:center;gap:7px;padding:7px 10px;cursor:pointer;user-select:none;font-size:11px;font-weight:650;color:var(--dsw-alias-label-secondary);transition:background .12s,color .12s}" +
      ".ad-fab-box-hd:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}" +
      ".ad-fab-box-hd .cnt{color:var(--dsw-alias-label-tertiary);font-weight:600;font-size:10px}" +
      ".ad-fab-box-hd .grow{flex:1}" +
      ".ad-fab-box-hd .arrow{font-size:9px;color:var(--dsw-alias-label-tertiary)}" +
      ".ad-fab-box-bd{display:flex;flex-direction:column;gap:4px;padding:4px 6px 6px}" +
      ".ad-fab-pop-t{font:650 9px/1.2 var(--ds-font-family-code,ui-monospace,monospace);letter-spacing:.12em;text-transform:uppercase;color:var(--dsw-alias-label-tertiary)}" +
      ".ad-fab-row{display:flex;align-items:center;gap:8px;font-size:12px;color:var(--dsw-alias-label-primary)}" +
      ".ad-fab-row .grow{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}" +
      ".ad-set-note{background:var(--dsw-alias-bg-layer-2);border-left:3px solid var(--dsw-alias-brand-primary);border-radius:0 6px 6px 0;padding:8px 12px;color:var(--dsw-alias-label-secondary);font-size:12px;line-height:1.6}" +
            // v0.8：设置页悬浮球显示模式单选组；v0.9.20：单选 = 开关视觉（灰底+白球，亮暗通用）——
      // 未选=纯灰圆，选中=灰圆中心白球（::after），全程无蓝色；行选中仅边框加深
      ".ad-fab-modes{flex:none;display:flex;flex-direction:column;gap:6px;margin-top:6px}" +
      ".ad-fab-mode{flex:none;display:flex;align-items:center;gap:8px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;padding:7px 10px;cursor:pointer;font-size:12px;color:var(--dsw-alias-label-secondary);transition:border-color .15s}" +
      ".ad-fab-mode:hover{border-color:var(--dsw-alias-border-l3)}" +
      ".ad-fab-mode.on{border-color:var(--dsw-alias-border-l3);color:var(--dsw-alias-label-primary)}" +
      // v0.9.24：白球 9px 在 14px 灰圆内需 2.5px 偏移，半像素取整不对称（实测左3右2）→ 看着偏心。
      // 改 10px 白球 → 边距恰好整数 2px 四向对称；灰圆 14px 不变
      ".ad-fab-mode .dot{position:relative;box-sizing:content-box;width:14px;height:14px;border-radius:50%;background:var(--dsw-static-neutral-bluish-600);flex:none}" +
      ".ad-fab-mode.on .dot::after{content:'';position:absolute;inset:0;margin:auto;width:10px;height:10px;border-radius:50%;background:var(--dsw-static-neutral-bluish-00)}";

    // 幂等注入一次（与 dsh-capability-manager 相同的 data-plugin-css 模式）
    const cssTagId = "@kiligzzz/dsh-agent-dispatch/styles";
    if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(cssTagId) + "]") === null) {
      const tag = document.createElement("style");
      tag.dataset.plugin = "@kiligzzz/dsh-agent-dispatch";
      tag.dataset.pluginCss = cssTagId;
      tag.textContent = CSS;
      document.head.appendChild(tag);
    }

    // ── REST API（宿主半提供，同源 fetch；失败统一 { ok:false, error }）──
    async function apiGet(path) {
      const r = await fetch(path);
      const d = await r.json();
      if (!d || d.ok !== true) throw new Error((d && d.error) || "请求失败");
      return d;
    }
    async function apiPost(path, body) {
      const r = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body || {}),
      });
      const d = await r.json();
      if (!d || d.ok !== true) throw new Error((d && d.error) || "请求失败");
      return d;
    }
    function msg(e) { return String((e && e.message) || e); }

    // v0.7.1：跳转子 agent 会话桥（apply 时绑定宿主 client sessions.open；未绑定时为 null）
    let openAgentSession = null;

    // ── v0.9.27：导航栈（方案 A：面板头「← 返回」按钮）──
    // 槽位占位组件不携带 sessionId、sessions 服务也无 getCurrent——
    // 跳转瞬间从侧边栏抓当前会话行（role=treeitem + aria-selected=true）的标题文本压栈；
    // 返回时按标题点回对应行（DOM 直点，失败再 sessions.search 兜底）。
    const navStack = [];           // 标题栈（最新在尾），上限 20
    const navSubs = new Set();     // 面板重渲染订阅
    function navNotify() { for (const f of navSubs) { try { f(); } catch (e) {} } }
    function navPush(title) {
      if (!title) return;
      navStack.push(title);
      if (navStack.length > 20) navStack.shift();
      navNotify();
    }
    function navPopTitle() { const t = navStack.pop(); navNotify(); return t; }
    function captureCurrentSessionTitle() {
      try {
        const row = document.querySelector('div[role="treeitem"][aria-selected="true"]');
        if (!row) return null;
        const titleEl = row.querySelector('[class*="title"]');
        const t = ((titleEl && titleEl.textContent) || row.textContent || "").trim();
        return t || null;
      } catch (e) { return null; }
    }
    // 返回一跳：标题 → 侧边栏直点；点不到（未渲染/折叠）→ sessions.search 找 id 再 open
    let goBackHandler = null; // apply 时绑定（闭包持有 sessions 服务）
    // v0.9.28：会话头部返回按钮——挂 conversation.session.header.actions 槽，
    // 任何 tab 视图（对话/轨迹/Agent 调度）下都可见，一跳返回，不用先切面板再点返回。
    // 导航栈空时返回 null（不占位）。
    function HeaderBackButton() {
      const [, setTick] = React.useState(0);
      React.useEffect(() => {
        const fn = () => setTick((n) => n + 1);
        navSubs.add(fn);
        return () => navSubs.delete(fn);
      }, []);
      if (navStack.length === 0) return null;
      return React.createElement("button", {
        className: "ad-header-back",
        title: "返回跳转前的会话（共 " + navStack.length + " 层）",
        onClick: () => { if (goBackHandler) goBackHandler(); },
      }, "← 返回");
    }

    // ── v0.8.3：DSH 官方 logo（提取自 DSH Desktop build/tray-icon.svg，
    // 色值改 currentColor 跟随主题，非写死 #4D6BFE）──
    const DSH_LOGO_PATH =
      "M48.8354 10.0479C48.3232 9.79199 48.1025 10.2798 47.8032 10.5278C47.7007 10.6079 47.6143 10.7119 47.5273 10.8076C46.7793 11.624 45.9048 12.1597 44.7622 12.0957C43.0923 12 41.666 12.5356 40.4058 13.8398C40.1377 12.2319 39.2476 11.272 37.8926 10.6558C37.1836 10.3359 36.4668 10.0156 35.9702 9.31982C35.6235 8.82373 35.5293 8.27197 35.356 7.72754C35.2456 7.3999 35.1353 7.06396 34.7651 7.00781C34.3633 6.94385 34.2056 7.2876 34.0479 7.57568C33.418 8.75195 33.1733 10.0479 33.1973 11.3599C33.2524 14.312 34.4736 16.6641 36.8999 18.3359C37.1758 18.5278 37.2466 18.7197 37.1597 19C36.9946 19.5757 36.7974 20.1357 36.624 20.7119C36.5137 21.0801 36.3486 21.1597 35.9624 21C34.6309 20.4321 33.481 19.5918 32.4644 18.5757C30.7393 16.8721 29.1792 14.9917 27.2334 13.52C26.7764 13.1758 26.3193 12.856 25.8467 12.5518C23.8618 10.584 26.1069 8.96777 26.627 8.77588C27.1704 8.57568 26.8159 7.8877 25.0591 7.896C23.3022 7.90381 21.6953 8.50391 19.647 9.30371C19.3477 9.42383 19.0322 9.51172 18.7095 9.58398C16.8501 9.22363 14.9199 9.14355 12.9033 9.37598C9.10596 9.80762 6.07275 11.6396 3.84326 14.7681C1.16455 18.5278 0.53418 22.7998 1.30664 27.2559C2.11768 31.9521 4.46582 35.8398 8.07373 38.8799C11.8159 42.0322 16.1255 43.5762 21.041 43.2803C24.0269 43.104 27.3516 42.6963 31.1016 39.4561C32.0469 39.936 33.0396 40.1279 34.686 40.272C35.9546 40.3921 37.1758 40.208 38.1211 40.0078C39.6021 39.688 39.4995 38.2881 38.9639 38.0322C34.623 35.9678 35.5762 36.8081 34.71 36.1279C36.9155 33.4639 40.2402 30.6958 41.54 21.728C41.6426 21.0161 41.5557 20.5679 41.54 19.9917C41.5322 19.6396 41.6108 19.5039 42.0049 19.4639C43.0923 19.3359 44.1479 19.0317 45.1167 18.4878C47.9292 16.9199 49.064 14.3438 49.3315 11.2559C49.3711 10.7837 49.3237 10.2959 48.8354 10.0479ZM24.3262 37.8398C20.1196 34.4639 18.0791 33.3521 17.2358 33.3999C16.4482 33.4482 16.5898 34.3682 16.7632 34.9678C16.9443 35.5601 17.1812 35.9683 17.5117 36.4878C17.7402 36.832 17.8979 37.3442 17.2832 37.728C15.9282 38.584 13.5728 37.4399 13.4624 37.3838C10.7207 35.7358 8.42822 33.5601 6.81348 30.584C5.25342 27.7197 4.34766 24.6479 4.19775 21.3677C4.1582 20.5757 4.38672 20.2959 5.15869 20.1519C6.17529 19.96 7.22314 19.9199 8.23926 20.0718C12.5327 20.7119 16.1885 22.6719 19.2529 25.7759C21.002 27.5439 22.3252 29.6558 23.6885 31.7202C25.1377 33.9121 26.6978 36 28.6831 37.7119C29.3843 38.312 29.9434 38.7681 30.479 39.104C28.8643 39.2881 26.1699 39.3281 24.3262 37.8398ZM26.3433 24.6001C26.3433 24.248 26.6191 23.9678 26.9658 23.9678C27.0444 23.9678 27.1152 23.9839 27.1782 24.0078C27.2651 24.04 27.3438 24.0879 27.4067 24.1602C27.5171 24.272 27.5801 24.4321 27.5801 24.6001C27.5801 24.9521 27.3042 25.2319 26.9575 25.2319C26.6108 25.2319 26.3433 24.9521 26.3433 24.6001ZM32.6064 27.8799C32.2046 28.0479 31.8027 28.1919 31.4165 28.208C30.8179 28.2397 30.1641 27.9922 29.8096 27.688C29.2583 27.2158 28.8643 26.9521 28.6987 26.1279C28.6279 25.7759 28.6675 25.2319 28.7305 24.9199C28.8721 24.248 28.7144 23.8159 28.2495 23.4238C27.8716 23.104 27.3911 23.0161 26.8633 23.0161C26.666 23.0161 26.4849 22.9277 26.3511 22.856C26.1304 22.7441 25.9492 22.4639 26.1226 22.1201C26.1777 22.0078 26.4458 21.7358 26.5088 21.688C27.2256 21.272 28.0527 21.4077 28.8169 21.7197C29.5259 22.0161 30.0615 22.5601 30.834 23.3281C31.6216 24.2559 31.7632 24.5117 32.2124 25.208C32.5669 25.752 32.8901 26.312 33.1104 26.9521C33.2446 27.3521 33.0713 27.6802 32.6064 27.8799Z";
    function DSHLogo(props) {
      return React.createElement("svg", Object.assign({
        viewBox: "0 0 50 50",
        className: "ad-dsh-logo",
        "aria-hidden": true,
      }, props || {}), React.createElement("path", { d: DSH_LOGO_PATH, fill: "currentColor" }));
    }
    // v0.8.9：原生 DOM 场景（悬浮球弹窗等）用的 SVG 字符串版本
    function dshLogoSvg(sizePx) {
      return '<svg viewBox="0 0 50 50" class="ad-dsh-logo" style="width:' + sizePx + 'px;height:' + sizePx + 'px" aria-hidden="true"><path d="' + DSH_LOGO_PATH + '" fill="currentColor"/></svg>';
    }
    // v0.9.14：DOM 侧头像统一首字回退（与 React 侧 firstGlyph 同规则）
    function firstGlyphDom(name) {
      const s = String(name || "").trim();
      if (!s) return "";
      const ch = Array.from(s)[0];
      return /[a-z]/.test(ch) ? ch.toUpperCase() : ch;
    }
    function setAvatarEl(em, emoji, name) {
      if (emoji) { em.className = "ad-avatar"; em.textContent = emoji; return; }
      const g = firstGlyphDom(name);
      if (g) { em.className = "ad-avatar mono"; em.textContent = g; return; }
      em.className = "ad-avatar logo"; em.innerHTML = dshLogoSvg(17);
    }

    // triggers 兼容：注册表存字符串（分号/顿号分隔），表单内用数组；两种输入都归一
    function triggersToList(t) {
      if (Array.isArray(t)) return t.filter(Boolean);
      if (typeof t === "string") return t.split(/[;；、,，]/).map((s) => s.trim()).filter(Boolean);
      return [];
    }
    function triggersToText(t) { return triggersToList(t).join("；"); }

    // v0.9.14：头像回退首字 monogram（用户推翻 0.9.13 白 logo 方案）
    function firstGlyph(name) {
      const s = String(name || "").trim();
      if (!s) return "";
      const ch = Array.from(s)[0];
      return /[a-z]/.test(ch) ? ch.toUpperCase() : ch;
    }
    function Avatar({ name, emoji, title }) {
      if (emoji) return React.createElement("span", { className: "ad-avatar", title: title }, emoji);
      const g = firstGlyph(name);
      if (g) return React.createElement("span", { className: "ad-avatar mono", title: title }, g);
      return React.createElement("span", { className: "ad-avatar", title: title }, React.createElement(DSHLogo));
    }

    // 时间戳 → "MM-DD HH:mm:ss"（秒级时间戳自动补 *1000 防御）
    function fmtTime(ts) {
      let t = Number(ts);
      if (!isFinite(t) || t <= 0) return "--:--";
      if (t < 1e12) t = t * 1000;
      const d = new Date(t);
      const p = (n) => (n < 10 ? "0" + n : "" + n);
      return p(d.getMonth() + 1) + "-" + p(d.getDate()) + " " + p(d.getHours()) + ":" + p(d.getMinutes()) + ":" + p(d.getSeconds());
    }

    // ISO 时间字符串 → "MM-DD HH:mm:ss"（无效返回 "--:--"）。
    // 注意：/agent-api/active 与 dispatches 的 ts 均为 ISO 字符串，
    // fmtTime(Number(iso)) 会得 NaN，必须走 Date 解析。
    function fmtTs(ts) {
      if (typeof ts !== "string" && typeof ts !== "number") return "--:--";
      const d = new Date(ts);
      if (isNaN(d.getTime())) return "--:--";
      const p = (n) => (n < 10 ? "0" + n : "" + n);
      return p(d.getMonth() + 1) + "-" + p(d.getDate()) + " " + p(d.getHours()) + ":" + p(d.getMinutes()) + ":" + p(d.getSeconds());
    }

    // 步骤拓扑分层（与宿主半 lib/squads.js topoLayers 同算法）：
    // 返回分层下标数组，每层内并行；有环抛错（表单保存前做环检测）。
    function topoLayers(steps) {
      const list = Array.isArray(steps) ? steps : [];
      const done = new Set();
      const layers = [];
      let guard = 0;
      while (done.size < list.length) {
        if (++guard > list.length + 1) throw new Error("小队模板存在依赖环");
        const layer = [];
        for (let i = 0; i < list.length; i++) {
          if (done.has(i)) continue;
          const deps = list[i].dependsOn || [];
          if (deps.every((d) => done.has(d))) layer.push(i);
        }
        if (layer.length === 0) throw new Error("小队模板存在依赖环");
        for (const i of layer) done.add(i);
        layers.push(layer);
      }
      return layers;
    }

    // 组队步骤流文本：按依赖拓扑分层，层内并行用「｜」连接，层间串行用「→」。
    // 例：三步全无依赖 → "日志｜数据｜代码"；第三步依赖前两步 → "日志｜数据 → 代码"。
    function squadStepsText(steps) {
      const list = Array.isArray(steps) ? steps : [];
      if (!list.length) return "—";
      let layers;
      try { layers = topoLayers(list); } catch { return "（依赖关系存在环，无法排序）"; }
      return layers
        .map((layer) => layer.map((i) => (list[i] && (list[i].phase || list[i].agentId)) || "步骤" + (i + 1)).join("｜"))
        .join(" → ");
    }

    // ── Agent编辑表单（新建 / 编辑共用；initial 为 null 表示新建；onDelete 非空时表单尾显示删除按钮）──
    function AgentForm({ initial, isNew, onSave, onCancel, onDelete, models, defaultModel }) {
      // models: { providerName: [modelId...] }（host 半从宿主 settings 读；空对象时下拉退化为手动输入）
      // defaultModel: { provider, model }（宿主默认模型，routes 留空即用它）
      const [f, setF] = React.useState(() => {
        if (initial) {
          const routes = Array.isArray(initial.routes) && initial.routes.length
            ? initial.routes.map((r) => ({ provider: r.provider || "", model: r.model || "", effort: r.effort || "" }))
            : [{ provider: "", model: "", effort: "" }];
          return {
            id: initial.id || "",
            name: initial.name || "",
            emoji: initial.emoji || "",
            triggers: triggersToText(initial.triggers),
            systemPrompt: initial.systemPrompt || "",
            routes,
            enabled: initial.enabled !== false,
          };
        }
        return { id: "", name: "", emoji: "", triggers: "", systemPrompt: "", routes: [{ provider: "", model: "", effort: "" }], enabled: true };
      });
      const [err, setErr] = React.useState("");

      const set = (k, v) => setF(Object.assign({}, f, { [k]: v }));
      const setRoute = (i, k, v) => setF(Object.assign({}, f, { routes: f.routes.map((r, j) => (j === i ? Object.assign({}, r, { [k]: v }) : r)) }));
      const addRoute = () => setF(Object.assign({}, f, { routes: f.routes.concat([{ provider: "", model: "", effort: "" }]) }));
      const delRoute = (i) => setF(Object.assign({}, f, { routes: f.routes.filter((_, j) => j !== i) }));
      const moveRoute = (i, d) => {
        const j = i + d;
        if (j < 0 || j >= f.routes.length) return;
        const rs = f.routes.slice();
        const t = rs[i]; rs[i] = rs[j]; rs[j] = t;
        setF(Object.assign({}, f, { routes: rs }));
      };

      // 校验并组装 agent 对象，交给上层保存（失败保留表单）
      const save = () => {
        const id = f.id.trim();
        const name = f.name.trim();
        if (!id) { setErr("id 不能为空"); return; }
        if (!name) { setErr("名称不能为空"); return; }
        const routes = f.routes
          .map((r) => ({ provider: (r.provider || "").trim(), model: (r.model || "").trim(), effort: (r.effort || "").trim() }))
          .filter((r) => r.provider || r.model || r.effort);
        if (!routes.length) { /* 无路由 = 跟随默认模型，合法 */ }
        for (const r of routes) {
          if (!r.provider || !r.model) { setErr("路由的 provider 与 model 均不能为空（只填一项无效）"); return; }
        }
        const triggers = triggersToText(f.triggers); // 注册表统一存分号分隔字符串（与 host 半 defaults 一致）
        onSave({
          id,
          name,
          emoji: f.emoji.trim(),
          triggers,
          systemPrompt: f.systemPrompt,
          routes,
          enabled: f.enabled,
        });
      };

      const modelOptions = models && typeof models === "object" ? models : {};
      const providerNames = Object.keys(modelOptions);
      const fallbackToInputs = providerNames.length === 0; // 拿不到模型表：退化为手动输入框
      // 该 provider 的模型列表（含空选项 = 不选/清空）
      const modelsOf = (prov) => ["", ...(modelOptions[prov] || [])];
      // 选中 provider 变化时，若 model 不在新列表里则清空 model
      const onProviderChange = (i, prov) => {
        setF(Object.assign({}, f, { routes: f.routes.map((r, j) => (j === i ? Object.assign({}, r, { provider: prov, model: (modelOptions[prov] || []).includes(r.model) ? r.model : "" }) : r)) }));
      };

      const routeRows = f.routes.map((r, i) =>
        React.createElement("div", { key: i, className: "ad-route" },
          fallbackToInputs
            ? React.createElement("input", { className: "ad-input", placeholder: "provider", value: r.provider, onChange: (e) => setRoute(i, "provider", e.target.value) })
            : React.createElement("select", { className: "ad-input ad-select", value: r.provider, onChange: (e) => onProviderChange(i, e.target.value) },
                React.createElement("option", { value: "" }, "provider…"),
                providerNames.map((p) => React.createElement("option", { key: p, value: p }, p)),
              ),
          fallbackToInputs
            ? React.createElement("input", { className: "ad-input", placeholder: "model", value: r.model, onChange: (e) => setRoute(i, "model", e.target.value) })
            : React.createElement("select", { className: "ad-input ad-select", value: r.model, onChange: (e) => setRoute(i, "model", e.target.value) },
                modelsOf(r.provider).map((mid) => React.createElement("option", { key: mid, value: mid }, mid === "" ? "model…" : mid)),
              ),
          React.createElement("select", { className: "ad-input effort ad-select", title: "推理力度（不选 = 模型默认）", value: r.effort || "", onChange: (e) => setRoute(i, "effort", e.target.value) },
            ["", "minimal", "low", "medium", "high", "xhigh", "max"].map((lv) => React.createElement("option", { key: lv, value: lv }, lv === "" ? "effort…" : lv)),
          ),
          // v0.9.8：↑↓ 挪到行尾、✕ 殿后（不再挤在输入框前）
          React.createElement("button", { className: "ad-btn mini", title: "上移", disabled: i === 0, onClick: () => moveRoute(i, -1) }, "↑"),
          React.createElement("button", { className: "ad-btn mini", title: "下移", disabled: i === f.routes.length - 1, onClick: () => moveRoute(i, 1) }, "↓"),
          React.createElement("button", { className: "ad-btn mini danger", title: "删除该路由", onClick: () => delRoute(i) }, "✕"),
        )
      );

      return React.createElement("div", { className: "ad-form" },
        React.createElement("div", { className: "ad-field" },
          React.createElement("span", { className: "ad-label" }, "ID（唯一标识，建议 kebab-case，创建后不可修改）"),
          React.createElement("input", { className: "ad-input", value: f.id, disabled: !isNew, placeholder: "例如 sql-analyst", onChange: (e) => set("id", e.target.value) }),
        ),
        React.createElement("div", { className: "ad-field" },
          React.createElement("span", { className: "ad-label" }, "名称"),
          React.createElement("input", { className: "ad-input", value: f.name, placeholder: "例如 SQL 分析 Agent", onChange: (e) => set("name", e.target.value) }),
        ),
        React.createElement("div", { className: "ad-field" },
          React.createElement("span", { className: "ad-label" }, "Emoji 图标（可选）"),
          React.createElement("input", { className: "ad-input", value: f.emoji, placeholder: "例如 🗄️", onChange: (e) => set("emoji", e.target.value) }),
        ),
        React.createElement("div", { className: "ad-field" },
          React.createElement("span", { className: "ad-label" }, "触发域（逗号/顿号分隔，命中任务描述时自动委派）"),
          React.createElement("input", { className: "ad-input", value: f.triggers, placeholder: "例如 SQL, 数据库, 慢查询", onChange: (e) => set("triggers", e.target.value) }),
        ),
        React.createElement("div", { className: "ad-field" },
          React.createElement("span", { className: "ad-label" }, "系统提示词（persona，描述 Agent 职责与方法）"),
          // v0.9.6：提示词区加大（14 行 + 最小高度，可拉伸）
          React.createElement("textarea", { className: "ad-textarea tall", rows: 14, value: f.systemPrompt, placeholder: "你是……", onChange: (e) => set("systemPrompt", e.target.value) }),
        ),
        React.createElement("div", { className: "ad-field" },
          React.createElement("span", { className: "ad-label" },
            "模型路由（按顺序尝试，失败互备）",
            defaultModel && defaultModel.model
              ? "　·　不选 = 跟随默认（" + defaultModel.provider + "/" + defaultModel.model + "）"
              : "　·　不选 = 跟随默认模型",
          ),
          React.createElement("div", { className: "ad-routes" }, routeRows),
          React.createElement("div", { className: "ad-actions", style: { justifyContent: "flex-start" } },
            React.createElement("button", { className: "ad-btn mini", onClick: addRoute }, "+ 添加路由"),
          ),
        ),
        React.createElement("div", { className: "ad-field" },
          React.createElement("span", { className: "ad-label" }, "启用状态"),
          React.createElement("div", null,
            React.createElement("button", {
              className: "ad-switch" + (f.enabled ? " on" : ""),
              role: "switch",
              "aria-checked": f.enabled,
              onClick: () => set("enabled", !f.enabled),
            }, React.createElement("span", { className: "knob" })),
          ),
        ),
        err ? React.createElement("div", { className: "ad-err" }, err) : null,
        React.createElement("div", { className: "ad-actions" },
          // v0.9.7：删除入口移进编辑弹窗（新建态不显示）
          onDelete && !isNew ? React.createElement("button", { className: "ad-btn danger", onClick: onDelete }, "删除") : null,
          React.createElement("button", { className: "ad-btn", onClick: onCancel }, "取消"),
          React.createElement("button", { className: "ad-btn primary", onClick: save }, "保存"),
        ),
      );
    }

    // ── 组队编辑表单（新建 / 编辑共用；initial 为 null 表示新建；onDelete 非空时表单尾显示删除按钮）──
    // agents: [{ id, name }]（调度页 data.agents 提供；空数组时 agentId 退化为手动输入）
    // onSave 约定返回 Promise：服务端校验失败时在表单内显示错误条（失败保留表单）。
    function SquadForm({ initial, isNew, agents, onSave, onCancel, onDelete }) {
      const agentList = Array.isArray(agents) ? agents.filter((e) => e && e.id) : [];

      const [f, setF] = React.useState(() => {
        const blankStep = { agentId: "", phase: "", dependsOn: [], instruction: "", checkpoint: false };
        if (initial) {
          const steps = Array.isArray(initial.steps) && initial.steps.length
            ? initial.steps.map((s) => ({
                agentId: s.agentId || "",
                phase: s.phase || "",
                dependsOn: Array.isArray(s.dependsOn) ? s.dependsOn.filter((d) => typeof d === "number") : [],
                instruction: s.instruction || "",
                checkpoint: !!s.checkpoint, // v1.3.0：结果级停等开关
              }))
            : [Object.assign({}, blankStep)];
          return {
            id: initial.id || "",
            name: initial.name || "",
            emoji: initial.emoji || "",
            description: initial.description || "",
            steps,
          };
        }
        return { id: "", name: "", emoji: "", description: "", steps: [Object.assign({}, blankStep)] };
      });
      const [err, setErr] = React.useState("");

      const set = (k, v) => setF(Object.assign({}, f, { [k]: v }));
      const setStep = (i, k, v) => setF(Object.assign({}, f, { steps: f.steps.map((s, j) => (j === i ? Object.assign({}, s, { [k]: v }) : s)) }));
      const addStep = () => setF(Object.assign({}, f, { steps: f.steps.concat([{ agentId: "", phase: "", dependsOn: [], instruction: "", checkpoint: false }]) }));

      // 删除步骤后同步重映射依赖下标：引用被删步骤（==i）的依赖剔除，>i 的下标减一
      const delStep = (i) => {
        const steps = f.steps
          .filter((_, j) => j !== i)
          .map((s) => Object.assign({}, s, {
            dependsOn: (s.dependsOn || []).filter((d) => d !== i).map((d) => (d > i ? d - 1 : d)),
          }));
        setF(Object.assign({}, f, { steps }));
      };

      // 上下移动：交换两个步骤并同步重映射全部依赖下标（i↔j 互换，依赖关系保持不变）
      const moveStep = (i, d) => {
        const j = i + d;
        if (j < 0 || j >= f.steps.length) return;
        const steps = f.steps.slice();
        const t = steps[i]; steps[i] = steps[j]; steps[j] = t;
        const remap = (x) => (x === i ? j : x === j ? i : x);
        setF(Object.assign({}, f, {
          steps: steps.map((s) => Object.assign({}, s, { dependsOn: (s.dependsOn || []).map(remap) })),
        }));
      };

      // 勾选/取消步骤 i 对步骤 d 的依赖（不允许依赖自身，checkbox 列表已排除自身）
      const toggleDep = (i, d) => {
        const deps = f.steps[i].dependsOn || [];
        setStep(i, "dependsOn", deps.includes(d) ? deps.filter((x) => x !== d) : deps.concat([d]));
      };

      // agentId 下拉选项：Agent 列表 name（id）；当前值不在列表（Agent 已删/内置组队引用未注册 Agent）时追加提示项防 select 空白
      const agentOptions = (cur) => {
        const opts = [React.createElement("option", { key: "__empty__", value: "" }, "选择 Agent…")];
        for (const ex of agentList) {
          opts.push(React.createElement("option", { key: ex.id, value: ex.id }, (ex.name || ex.id) + "（" + ex.id + "）"));
        }
        if (cur && !agentList.some((ex) => ex.id === cur)) {
          opts.push(React.createElement("option", { key: "__missing__", value: cur }, cur + "（未注册）"));
        }
        return opts;
      };

      // 客户端先做一层与服务端同规则的校验，再交给上层保存（服务端校验失败的错误也回显在表单内）
      const save = () => {
        const id = f.id.trim();
        const name = f.name.trim();
        if (!id) { setErr("id 不能为空"); return; }
        if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(id)) { setErr("id 必须为 kebab-case（小写字母/数字/连字符，如 debug-squad）"); return; }
        if (!name) { setErr("名称不能为空"); return; }
        if (!f.steps.length) { setErr("至少需要一个步骤（点「+ 添加步骤」）"); return; }
        for (let i = 0; i < f.steps.length; i++) {
          const st = f.steps[i];
          if (!st.agentId.trim()) { setErr("步骤 " + (i + 1) + " 缺 agentId"); return; }
          if (!st.phase.trim()) { setErr("步骤 " + (i + 1) + " 缺阶段名（phase）"); return; }
          if (!st.instruction.trim()) { setErr("步骤 " + (i + 1) + " 缺 instruction 任务模板"); return; }
          for (const d of st.dependsOn || []) {
            if (d < 0 || d >= f.steps.length) { setErr("步骤 " + (i + 1) + " 的依赖下标越界"); return; }
            if (d === i) { setErr("步骤 " + (i + 1) + " 不能依赖自身"); return; }
          }
        }
        const steps = f.steps.map((st) => ({
          agentId: st.agentId.trim(),
          phase: st.phase.trim(),
          dependsOn: (st.dependsOn || []).slice(),
          instruction: st.instruction, // 任务模板保留原文（含换行），仅非空校验用 trim
          checkpoint: !!st.checkpoint, // v1.3.0：结果级停等开关
        }));
        try { topoLayers(steps); } catch (e) { setErr(msg(e)); return; } // 环检测
        const res = onSave({ id, name, emoji: f.emoji.trim(), description: f.description, steps });
        if (res && typeof res.catch === "function") res.catch((e) => setErr(msg(e)));
      };

      // v0.9.6：每步骤一张卡片——头行（徽标+阶段+Agent+↑↓✕）、任务模板独立 textarea、依赖勾选行
      const stepItems = f.steps.map((st, i) =>
        React.createElement("div", { key: i, className: "ad-step-item" },
          React.createElement("div", { className: "ad-step-row" },
            React.createElement("span", { className: "ad-step-no", title: "步骤序号" }, "S" + (i + 1)),
            React.createElement("input", { className: "ad-input phase", placeholder: "阶段名（如 日志）", value: st.phase, onChange: (e) => setStep(i, "phase", e.target.value) }),
            agentList.length
              ? React.createElement("select", { className: "ad-input ad-select agent", title: "该步骤委派给哪个 Agent", value: st.agentId, onChange: (e) => setStep(i, "agentId", e.target.value) },
                  agentOptions(st.agentId),
                )
              : React.createElement("input", { className: "ad-input agent", placeholder: "agentId（如 log-tracer）", value: st.agentId, onChange: (e) => setStep(i, "agentId", e.target.value) }),
            React.createElement("span", { className: "ad-step-acts" },
              React.createElement("button", { className: "ad-btn icon", title: "上移", disabled: i === 0, onClick: () => moveStep(i, -1) }, "↑"),
              React.createElement("button", { className: "ad-btn icon", title: "下移", disabled: i === f.steps.length - 1, onClick: () => moveStep(i, 1) }, "↓"),
              React.createElement("button", { className: "ad-btn icon danger", title: "删除该步骤", onClick: () => delStep(i) }, "✕"),
            ),
          ),
          React.createElement("textarea", {
            className: "ad-textarea",
            rows: 2,
            value: st.instruction,
            placeholder: "instruction 任务模板（{input}=用户目标，{prev:N}=第 N 步结果）",
            onChange: (e) => setStep(i, "instruction", e.target.value),
          }),
          React.createElement("div", { className: "ad-step-deps" },
            React.createElement("span", { className: "ad-label" }, "依赖："),
            f.steps.length > 1
              ? f.steps.map((other, j) =>
                  j === i ? null : React.createElement("label", { key: j, className: "ad-dep-check", title: "勾选后该步骤等待步骤 " + (j + 1) + " 完成" },
                    React.createElement("input", {
                      type: "checkbox",
                      checked: (st.dependsOn || []).includes(j),
                      onChange: () => toggleDep(i, j),
                    }),
                    React.createElement("span", null, "S" + (j + 1) + " " + (other.phase || other.agentId || "?")),
                  ),
                )
              : React.createElement("span", { className: "ad-label" }, "（只有一步，无需依赖）"),
          ),
          // v1.3.0：checkpoint 停等开关——该步产出后暂停等用户确认，不自动进下一步
          React.createElement("label", { className: "ad-dep-check ad-checkpoint", title: "勾选后该步骤执行完暂停，等用户确认再续跑（agent_squad 返回 paused:true）" },
            React.createElement("input", {
              type: "checkbox",
              checked: !!st.checkpoint,
              onChange: (e) => setStep(i, "checkpoint", e.target.checked),
            }),
            React.createElement("span", null, "产出后停等用户确认（checkpoint）"),
          ),
        )
      );

      return React.createElement("div", { className: "ad-form" },
        React.createElement("div", { className: "ad-field" },
          React.createElement("span", { className: "ad-label" }, "ID（唯一标识，kebab-case，创建后不可修改）"),
          React.createElement("input", { className: "ad-input", value: f.id, disabled: !isNew, placeholder: "例如 debug-squad", onChange: (e) => set("id", e.target.value) }),
        ),
        React.createElement("div", { className: "ad-field" },
          React.createElement("span", { className: "ad-label" }, "名称"),
          React.createElement("input", { className: "ad-input", value: f.name, placeholder: "例如 排查小队", onChange: (e) => set("name", e.target.value) }),
        ),
        React.createElement("div", { className: "ad-field" },
          React.createElement("span", { className: "ad-label" }, "Emoji 图标（可选）"),
          React.createElement("input", { className: "ad-input", value: f.emoji, placeholder: "例如 🛠️", onChange: (e) => set("emoji", e.target.value) }),
        ),
        React.createElement("div", { className: "ad-field" },
          React.createElement("span", { className: "ad-label" }, "描述（一句话说明小队用途）"),
          React.createElement("input", { className: "ad-input", value: f.description, placeholder: "例如 三路并行排查（日志/数据/代码），汇总定位根因", onChange: (e) => set("description", e.target.value) }),
        ),
        React.createElement("div", { className: "ad-field" },
          React.createElement("span", { className: "ad-label" }, "步骤编排（层内并行、层间串行；instruction 支持 {input} 与 {prev:N} 占位符）"),
          React.createElement("div", { className: "ad-step-list" }, stepItems),
          React.createElement("div", { className: "ad-actions", style: { justifyContent: "flex-start" } },
            React.createElement("button", { className: "ad-btn mini", onClick: addStep }, "+ 添加步骤"),
          ),
          // v0.8.2：实时执行流拓扑图预览（改步骤/依赖即重绘）；v0.8.4：固定尺寸
          React.createElement("div", { className: "ad-flow-preview" },
            React.createElement("span", { className: "ad-label" }, "执行流预览"),
            React.createElement("div", { className: "ad-flow-preview-fixed" },
              React.createElement(SquadFlowGraph, { steps: f.steps || [], agents: agents }),
            ),
          ),
        ),
        err ? React.createElement("div", { className: "ad-err" }, err) : null,
        React.createElement("div", { className: "ad-actions" },
          // v0.9.7：删除入口移进编辑弹窗（新建态不显示）
          onDelete && !isNew ? React.createElement("button", { className: "ad-btn danger", onClick: onDelete }, "删除") : null,
          React.createElement("button", { className: "ad-btn", onClick: onCancel }, "取消"),
          React.createElement("button", { className: "ad-btn primary", onClick: save }, "保存"),
        ),
      );
    }

    // ── Agent 子 tab：Agent CRUD（persona / 触发域 / 模型路由 / effort），v0.8 卡片网格 ──
    function ManageTab() {
      const [data, setData] = React.useState(null);                  // GET /agent-api 结果
      const [editing, setEditing] = React.useState(null);            // null | { isNew: bool, agent: object|null }
      const [confirmDel, setConfirmDel] = React.useState(null);      // 待二次确认删除的 Agent
      const [err, setErr] = React.useState("");

      const refresh = () => {
        apiGet("/agent-api")
          .then(setData)
          .catch((e) => setErr(msg(e)));
      };
      React.useEffect(() => { refresh(); }, []);

      const toggle = (ex) =>
        apiPost("/agent-api/toggle", { id: ex.id, enabled: !ex.enabled }).then(refresh).catch((e) => setErr(msg(e)));
      const upsert = (agent) =>
        apiPost("/agent-api/upsert", { agent })
          .then(() => { setEditing(null); refresh(); })
          .catch((e) => setErr(msg(e))); // 失败保留表单，仅显示全局错误条
      const doRemove = () => {
        const ex = confirmDel;
        setConfirmDel(null);
        apiPost("/agent-api/remove", { id: ex.id }).then(refresh).catch((e) => setErr(msg(e)));
      };

      const agents = data ? (data.agents || []) : [];
      // v0.9.5：卡片点整体即编辑；编辑/删除移到 hover 浮层图标按钮（视觉降噪）
      const cards = agents.map((ex) => {
        const routesText = (ex.routes || []).map((r) => r.provider + "/" + r.model).join(", ");
        const trigChips = triggersToList(ex.triggers).slice(0, 3).map((t, i) =>
          React.createElement("span", { key: i, className: "ad-chip trig", title: t }, t));
        return React.createElement("div", {
          key: ex.id,
          className: "ad-row editable",
          title: "点击编辑「" + (ex.name || ex.id) + "」",
          onClick: () => setEditing({ isNew: false, agent: ex }),
        },
          // v0.9.8：浮层编辑按钮删除（整卡点击即编辑，入口唯一），去内置标签
          React.createElement("div", { className: "ad-row-main" },
            React.createElement(Avatar, { name: ex.name || ex.id, emoji: ex.emoji }),
            React.createElement("span", { className: "ad-mid" },
              React.createElement("span", { className: "ad-name", title: ex.name || ex.id },
                ex.name || ex.id,
              ),
              React.createElement("span", { className: "ad-id", title: ex.id }, ex.id),
            ),
            // 开关：灰底白球，仅球位区分（左=停用，右=启用），两态外观一致
            React.createElement("button", {
              className: "ad-switch" + (ex.enabled ? " on" : ""),
              role: "switch",
              "aria-checked": ex.enabled,
              title: ex.enabled ? "点击停用" : "点击启用",
              onClick: (e) => { e.stopPropagation(); toggle(ex); },
            }, React.createElement("span", { className: "knob" })),
          ),
          React.createElement("div", { className: "ad-chip-row", title: triggersToText(ex.triggers) || "未设触发域" },
            trigChips.length ? trigChips : React.createElement("span", { className: "ad-chip dim" }, "未设触发"),
          ),
          React.createElement("div", { className: "ad-route", title: routesText || "跟随默认模型" },
            routesText || "跟随默认模型"),
        );
      });

      // v0.9.5：删除二次确认弹窗
      const delAgent = confirmDel;

      return React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: "14px" } },
        React.createElement("div", { className: "ad-kicker-row" },
          React.createElement("span", { className: "ad-kicker" }, "Agents · " + (agents.length || "…")),
          React.createElement("button", { className: "ad-btn mini primary", onClick: () => setEditing({ isNew: true, agent: null }) }, "+ 新建 Agent"),
        ),
        err ? React.createElement("div", { className: "ad-err" }, err) : null,
        // v0.9.7：Agent 页说明句（机制=主模型按路由表自主委派，无输入触发符）
        React.createElement("div", { className: "ad-sub" },
          "配置专属 Agent（人设 + 触发域 + 模型路由）。主模型会按触发域把任务自动委派给合适的 Agent，也可直接说「让 XX 处理」。"),
        // v0.9.5：编辑表单包进弹窗（复用 ad-modal 体系）
        editing
          ? React.createElement("div", { className: "ad-modal-mask", onClick: () => setEditing(null) },
              React.createElement("div", { className: "ad-modal form", onClick: (e) => e.stopPropagation() },
                React.createElement("div", { className: "ad-modal-head" },
                  React.createElement("span", { className: "ad-modal-title" }, (editing.isNew ? "新建" : "编辑") + " Agent"),
                  React.createElement("button", { className: "ad-btn icon", onClick: () => setEditing(null) }, "✕"),
                ),
                React.createElement("div", { className: "ad-modal-body" },
                  React.createElement(AgentForm, {
                    key: editing.isNew ? "__new__" : (editing.agent && editing.agent.id) || "__edit__",
                    initial: editing.agent,
                    isNew: editing.isNew,
                    onSave: upsert,
                    onCancel: () => setEditing(null),
                    // v0.9.7：弹窗内删除 → 关表单 → 弹删除确认
                    onDelete: editing.isNew ? null : () => { const ex = editing.agent; setEditing(null); setConfirmDel(ex); },
                    models: data ? data.models : undefined,
                    defaultModel: data ? data.defaultModel : undefined,
                  }),
                ),
              ),
            )
          : null,
        // v0.9.5：删除确认弹窗
        delAgent
          ? React.createElement("div", { className: "ad-modal-mask", onClick: () => setConfirmDel(null) },
              React.createElement("div", { className: "ad-modal", style: { width: "380px" }, onClick: (e) => e.stopPropagation() },
                React.createElement("div", { className: "ad-modal-head" },
                  React.createElement("span", { className: "ad-modal-title" }, "删除 Agent"),
                ),
                React.createElement("div", { className: "ad-modal-body" },
                  React.createElement("div", { className: "ad-modal-desc" }, "确定删除「" + (delAgent.name || delAgent.id) + "」？"),
                ),
                React.createElement("div", { className: "ad-modal-foot" },
                  React.createElement("button", { className: "ad-btn", onClick: () => setConfirmDel(null) }, "取消"),
                  React.createElement("button", { className: "ad-btn danger", onClick: doRemove }, "删除"),
                ),
              ),
            )
          : null,
        cards.length
          ? React.createElement("div", { className: "ad-cards" }, cards)
          : React.createElement("div", { className: "ad-empty", style: { minHeight: "180px" } },
              React.createElement("span", { className: "ad-empty-text" }, data ? "暂无 Agent" : "加载中…"),
              data ? React.createElement("span", { className: "ad-empty-sub" }, "点击「+ 新建 Agent」创建一个可委派的 Agent") : null,
            ),
      );
    }

    // ── v0.7 帮助：运行时长文案（秒→可读）──
    function fmtDur(startedAt, now) {
      if (!startedAt) return "";
      const sec = Math.max(0, Math.floor(((now || Date.now()) - startedAt) / 1000));
      if (sec < 60) return sec + "s";
      if (sec < 3600) return Math.floor(sec / 60) + "m" + (sec % 60 ? (sec % 60) + "s" : "");
      return Math.floor(sec / 3600) + "h" + Math.floor((sec % 3600) / 60) + "m";
    }

    // ── v0.7.1 共享：运行中大卡（左绿边 + 头像 + 名称/childId + 任务 + 时长 + 可选中止按钮）──
    function RunCard({ a, now, onCancel, cancelling }) {
      // v0.7.1：点击卡片主体跳转子 agent 会话（宿主 sessions.open 支持 catalog 内子会话）
      const canOpen = openAgentSession && a.childId;
      return React.createElement("div", {
        className: "ad-run-card" + (canOpen ? " clickable" : ""),
        title: canOpen ? "点击打开该子 agent 会话" : undefined,
        onClick: canOpen ? () => openAgentSession(a.childId) : undefined,
      },
        React.createElement("span", { className: a.emoji ? "ad-run-emoji" : "ad-run-emoji logo" }, a.emoji || React.createElement(DSHLogo)),
        React.createElement("span", { className: "ad-run-mid" },
          React.createElement("span", { className: "ad-run-name" },
            a.agentName || a.agentId || "?",
            React.createElement("span", { className: "cid", title: "childId: " + (a.childId || "") }, (a.childId || "").slice(0, 8)),
          ),
          React.createElement("span", { className: "ad-run-task", title: a.taskLabel || "" },
            a.taskLabel ? "任务：" + a.taskLabel : "（无任务摘要）"),
        ),
        React.createElement("span", { className: "ad-run-badge" },
          React.createElement("span", { className: "ad-dot on" }),
          "运行中" + (a.startedAt ? " " + fmtDur(a.startedAt, now) : "")),
        onCancel
          ? React.createElement("button", {
              className: "ad-btn mini danger",
              disabled: cancelling === a.childId, // v0.9.40：按 childId 精确取消（同Agent多卡并发）
              title: "中止该子 agent（不删除，可继续追问）",
              onClick: (ev) => { ev.stopPropagation(); onCancel(a); },
            }, cancelling === a.childId ? "中止中…" : "中止")
          : null,
      );
    }

    // ── 总览子 tab（v0.8：删 Ranking 区块；运行中并入此处，原「活动」tab 取消）──
    // v0.9.36：设置页（SettingsTab）删除，其信息（默认模型/数据目录/触发方式）与
    // 悬浮球总开关一并迁入总览页顶部——「悬浮球设置」浮层（色调/呼吸/透明度/时长）仍由悬浮球 ⚙ 打开。
    function OverviewTab() {
      const [ov, setOv] = React.useState(null); // GET /agent-api/overview 结果
      const [act, setAct] = React.useState(null); // GET /agent-api/active 结果
      const [meta, setMeta] = React.useState(null); // v0.9.36：GET /agent-api（默认模型/数据目录）结果
      const [err, setErr] = React.useState("");
      const [now, setNow] = React.useState(Date.now()); // 运行时长每 10s 走字
      const [cancelling, setCancelling] = React.useState(null); // 正在中止的 agentId
      const [fabOn, setFabOn] = React.useState(isFabVisible()); // v0.9.36：悬浮球总开关

      const cancel = (a) => {
        // v0.9.40：按 childId 精确取消（同Agent多卡并发时，agentId 兜底会误伤）
        setCancelling(a.childId);
        apiPost("/agent-api/cancel", { childId: a.childId, agentId: a.agentId })
          .catch((e) => setErr(msg(e)))
          .finally(() => { setCancelling(null); apiGet("/agent-api/active").then(setAct).catch(() => {}); });
      };

      const refreshOv = () => apiGet("/agent-api/overview").then(setOv).catch((e) => setErr(msg(e)));
      const refreshAct = () => apiGet("/agent-api/active").then(setAct).catch(() => {});
      const refreshMeta = () => apiGet("/agent-api").then(setMeta).catch(() => {});
      React.useEffect(() => {
        refreshOv(); refreshAct(); refreshMeta();
        const ovTimer = setInterval(refreshOv, 30000); // 统计卡 30s
        const actTimer = setInterval(refreshAct, 10000); // 运行中 10s（承接原活动页刷新频率）
        const tick = setInterval(() => setNow(Date.now()), 10000);
        return () => { clearInterval(ovTimer); clearInterval(actTimer); clearInterval(tick); };
      }, []);

      const s = ov ? ov.stats : null;
      const active = act ? (act.active || []) : [];
      const rate = s && s.dispatchTotal > 0 ? Math.round((s.okCount / s.dispatchTotal) * 100) + "%" : "—";

      const runCards = active.map((a, i) =>
        React.createElement(RunCard, { key: a.childId || i, a: a, now: now, onCancel: cancel, cancelling: cancelling }),
      );

      // v0.9.36：悬浮球总开关切换——off 强制隐藏；on 恢复显示模式逻辑
      const toggleFab = () => {
        const v = !fabOn;
        setFabOn(v);
        setFabVisible(v);
      };

      return React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: "14px" } },
        err ? React.createElement("div", { className: "ad-err" }, err) : null,
        // v0.9.36：顶部设置区（原设置页内容迁入）——显示悬浮球总开关 + 默认模型 / 数据目录 / 触发方式
        React.createElement("div", { className: "ad-set-card" },
          React.createElement("div", { className: "ad-set-row" },
            React.createElement("span", { className: "grow" },
              React.createElement("div", { className: "t1" }, "显示悬浮球"),
              React.createElement("div", { className: "t2" }, "关闭后悬浮球隐藏，运行/完成提醒不再弹出")),
            React.createElement("button", {
              className: "ad-switch" + (fabOn ? " on" : ""),
              role: "switch",
              "aria-checked": String(fabOn),
              onClick: toggleFab,
            }, React.createElement("span", { className: "knob" })),
          ),
          meta && meta.defaultModel
            ? React.createElement("div", { className: "ad-set-row" },
                React.createElement("span", { className: "grow" },
                  React.createElement("div", { className: "t1" }, "默认跟随模型"),
                  React.createElement("div", { className: "t2" },
                    meta.defaultModel.provider + " / " + meta.defaultModel.model + "（Agent 未配置路由时使用）")))
            : null,
          meta && meta.dataDir
            ? React.createElement("div", { className: "ad-set-row" },
                React.createElement("span", { className: "grow" },
                  React.createElement("div", { className: "t1" }, "数据目录"),
                  React.createElement("div", { className: "t2" }, meta.dataDir)))
            : null,
          React.createElement("div", { className: "ad-set-row" },
            React.createElement("span", { className: "grow" },
              React.createElement("div", { className: "t1" }, "触发方式"),
              React.createElement("div", { className: "t2" },
                "对话自动路由；输入 / 唤起菜单选 Agent（插入 $id）或手打 $Agent名 直接指定；悬浮球选定 Agent 自动插入当前会话。"))),
        ),
        React.createElement("div", { className: "ad-kicker-row" },
          React.createElement("span", { className: "ad-kicker" }, "Overview · 调度概览"),
          React.createElement("span", { className: "meta" }, "统计 30s · 运行中 10s 刷新"),
        ),
        React.createElement("div", { className: "ad-stats" },
          React.createElement("div", { className: "ad-stat" },
            React.createElement("span", { className: "v" }, s ? String(s.agentTotal) : "…"),
            React.createElement("span", { className: "k" }, s ? "Agents · 启用 " + s.agentEnabled : "Agents")),
          React.createElement("div", { className: "ad-stat" },
            React.createElement("span", { className: "v" }, s ? String(s.squadTotal) : "…"),
            React.createElement("span", { className: "k" }, "小队")),
          React.createElement("div", { className: "ad-stat hl" },
            React.createElement("span", { className: "v" }, s ? String(s.last24h) : "…"),
            React.createElement("span", { className: "k" }, "近 24h 委派")),
          React.createElement("div", { className: "ad-stat" },
            React.createElement("span", { className: "v" }, rate),
            React.createElement("span", { className: "k" }, s ? "成功率 " + s.okCount + "/" + s.dispatchTotal : "成功率")),
        ),
        React.createElement("div", { className: "ad-kicker-row" },
          React.createElement("span", { className: "ad-kicker" }, "Running · 运行中（" + active.length + "）")),
        active.length
          ? runCards
          : React.createElement("div", { className: "ad-empty", style: { minHeight: "110px" } },
              React.createElement("span", { className: "ad-empty-text" }, act ? "当前没有运行中的 Agent" : "加载中…")),
      );
    }

    // ── 历史子 tab：Agent 历史 / 小队历史 分段列表（v0.9.17）──
    // 小队历史两层：行=一次运行（含执行进度状态），展开=执行流程图（节点状态着色）+ 步骤明细
    function HistoryTab() {
      const [list, setList] = React.useState(null); // GET /agent-api/dispatches 结果
      const [activeIds, setActiveIds] = React.useState(null); // 活跃 childId 集合（兜底判"假运行中"）
      const [sub, setSub] = bindPersistentState(() => uiState.histSub, (v) => { uiState.histSub = v; }); // v0.9.17：agent / squad；v0.9.29 持久化
      const [previewKey, setPreviewKey] = bindPersistentState(() => uiState.histKey, (v) => { uiState.histKey = v; }); // v0.9.17：展开键（"a:idx" / "r:runId"）；v0.9.29 持久化
      const [err, setErr] = React.useState("");

      const refresh = () => {
        apiGet("/agent-api/dispatches?limit=200")
          .then((d) => setList(d.dispatches || []))
          .catch((e) => setErr(msg(e)));
        apiGet("/agent-api/active")
          .then((d) => setActiveIds(new Set((d.active || []).map((a) => a.childId).filter(Boolean))))
          .catch(() => {});
      };
      React.useEffect(() => { refresh(); }, []);

      // 单行状态：与 v0.8.1 四态一致，输出 { cls, text }
      function rowState(d) {
        const stale = !d.ended && d.childId && activeIds && !activeIds.has(d.childId);
        if (d.orphan || stale) return { cls: "unk", text: "状态未知" };
        if (!d.ended) return { cls: "run", text: "运行中" };
        if (d.ok) return { cls: "done", text: "完成" };
        return { cls: "fail", text: d.stopReason === "aborted" ? "已中止" : "失败" };
      }
      const STATE_TEXT = { done: "完成", run: "运行中", fail: "失败", skip: "已跳过", wait: "等待中", unk: "未知" };

      // 统一行头：时间｜头像｜名称｜摘要｜状态｜操作（Agent 与小队两列表结构一致）
      function histHead(o) {
        return React.createElement("div", { className: "ad-hist-head", onClick: o.onClick, title: o.title || "点击展开查看详情" },
          React.createElement("span", { className: "ad-hist-time" }, o.time),
          o.avatar,
          React.createElement("span", { className: "ad-hist-name", title: o.nameTitle || "" }, o.name),
          React.createElement("span", { className: "ad-hist-task", title: o.summary || "" }, o.summary || "（无任务摘要）"),
          React.createElement("span", { className: "ad-hist-" + o.state.cls, title: o.state.title || "" }, o.state.text),
          o.actions,
        );
      }

      const rows = list || [];
      const dispRows = rows.filter((r) => r.kind !== "squad-run"); // result 行宿主已滤掉
      const agentRows = dispRows.filter((d) => !d.viaSquad);
      const squadDisps = dispRows.filter((d) => d.viaSquad);

      // ── Agent 历史行（与之前一致：行头 + 展开详情）──
      const agentLines = agentRows.map((d, i) => {
        const st = rowState(d);
        const delBtn = React.createElement("button", {
          className: "ad-btn mini danger",
          title: "删除这条委派记录（不可恢复）",
          onClick: () => {
            if (!window.confirm("删除这条委派记录？不可恢复。")) return;
            apiPost("/agent-api/history/remove", { ts: d.ts }).then(refresh).catch((e) => setErr(msg(e)));
          },
        }, "删除");
        const actions = React.createElement("span", { className: "ad-hist-actions", onClick: (e) => e.stopPropagation() },
          d.parentSessionId && openAgentSession
            ? React.createElement("button", { className: "ad-btn mini", title: "打开发起本次委派的主会话", onClick: () => openAgentSession(d.parentSessionId) }, "主会话")
            : null,
          d.childId && openAgentSession
            ? React.createElement("button", { className: "ad-btn mini", title: "打开该子 Agent 会话（若仍在目录内）", onClick: () => openAgentSession(d.childId) }, "子 Agent")
            : null,
          delBtn,
        );
        const key = "a:" + i;
        const preview = previewKey === key
          ? React.createElement("div", { className: "ad-hist-preview" },
              React.createElement("div", { className: "ad-hist-preview-row" },
                React.createElement("span", { className: "ad-meta-label" }, "Agent"),
                (d.emoji || "") + (d.agentName || d.agentId || "?") + " · " + (d.provider || "?") + "/" + (d.model || "?")),
              React.createElement("div", { className: "ad-hist-preview-row", style: { alignItems: "flex-start" } },
                React.createElement("span", { className: "ad-meta-label" }, "任务详情"),
                React.createElement("div", { className: "ad-hist-taskbox" }, d.taskText || d.taskLabel || "（无任务内容）")),
              d.error
                ? React.createElement("div", { className: "ad-hist-preview-row" },
                    React.createElement("span", { className: "ad-meta-label" }, "错误"),
                    React.createElement("span", { className: "ad-hist-err" }, d.error))
                : null,
            )
          : null;
        return React.createElement("div", { key, className: "ad-hist-line" + (previewKey === key ? " open" : "") },
          histHead({
            time: fmtTs(d.ts),
            avatar: React.createElement(Avatar, { name: d.agentName || d.agentId, emoji: d.emoji }),
            name: d.agentName || d.agentId || "?",
            nameTitle: (d.agentId || "") + " · " + (d.provider || "?") + "/" + (d.model || "?"),
            summary: d.taskLabel,
            state: { cls: st.cls, text: st.text },
            actions,
            onClick: () => setPreviewKey(previewKey === key ? null : key),
          }),
          preview,
        );
      });

      // ── 小队历史：按运行聚合 ──
      // 新记录：squad-run(start) 拓扑快照 + dispatch(squadRunId) 各步 + squad-run(end) 状态
      // 旧记录（无 runId）：按小队 + 10 分钟时间窗兜底分组，无拓扑图，只列步骤
      const runs = [];
      const byId = new Map();
      for (const r of rows) {
        if (r.kind !== "squad-run") continue;
        if (r.phase === "start") {
          const run = {
            id: r.squadRunId, ts: r.ts, squadId: r.squadId,
            name: r.squadName || r.squadId, emoji: r.squadEmoji || "",
            goal: r.goal || "", steps: r.steps || [], parentSessionId: r.parentSessionId || null,
            endStatus: null, disps: [], noTopo: false,
          };
          byId.set(run.id, run); runs.push(run);
        } else if (r.phase === "end" && byId.has(r.squadRunId)) {
          byId.get(r.squadRunId).endStatus = r.stepStatus || null;
        }
      }
      const orphanDisps = [];
      for (const d of squadDisps) {
        if (d.squadRunId && byId.has(d.squadRunId)) byId.get(d.squadRunId).disps.push(d);
        else orphanDisps.push(d);
      }
      // 旧记录兜底分组：同小队按时间升序，间隔 > 10 分钟切新组
      orphanDisps.sort((a, b) => new Date(a.ts) - new Date(b.ts));
      const buckets = new Map(); // squadId → runs[]
      for (const d of orphanDisps) {
        const arr = buckets.get(d.viaSquad) || [];
        const last = arr[arr.length - 1];
        if (!last || new Date(d.ts) - new Date(last.ts) > 10 * 60 * 1000) {
          arr.push({ id: "old-" + d.viaSquad + "-" + d.ts, ts: d.ts, squadId: d.viaSquad, name: d.squadName || d.viaSquad, emoji: "", goal: "", steps: [], parentSessionId: d.parentSessionId || null, endStatus: null, disps: [], noTopo: true });
        }
        arr[arr.length - 1].disps.push(d);
        buckets.set(d.viaSquad, arr);
      }
      for (const arr of buckets.values()) runs.push(...arr);
      runs.sort((a, b) => new Date(b.ts) - new Date(a.ts)); // 最新在前

      // 单步状态（v0.9.26 权威级联）：① dispatch 活体结局（最权威）→ ② 运行已结束时信 end 快照 → ③ 运行未结束的活体推断
      // 修复：旧逻辑只看 dispatch 行，result 配对丢失（重启等）即误判"未知"，end 行明明记了全部 done 也不认账
      function stepState(run, i) {
        const disp = run.disps.find((d) => d.stepIndex === i) || (run.noTopo ? run.disps[i] : null);
        const finished = !!run.endStatus; // end 行已到 = 整次运行已终止
        if (disp && disp.ended) return disp.ok ? "done" : "fail"; // ①
        if (finished) {                                            // ②
          const es = run.endStatus[i];
          if (es === "done") return "done";
          if (es === "failed") return "fail";
          if (es === "skipped") return "skip";
          return "unk"; // waiting/running = 被中断，真盲区
        }
        if (disp) {                                                // ③
          const stale = disp.childId && activeIds && !activeIds.has(disp.childId);
          if (disp.orphan || stale) return "unk";
          return "run";
        }
        return "wait";
      }
      function runState(run) {
        const n = run.noTopo ? run.disps.length : run.steps.length;
        let anyRun = false, anyFail = false, allSkipDone = n > 0;
        for (let i = 0; i < n; i++) {
          const s = stepState(run, i);
          if (s === "run") anyRun = true;
          if (s === "fail") anyFail = true;
          if (s === "wait" || s === "unk") allSkipDone = false;
        }
        if (anyRun) return { cls: "run", text: "运行中" };
        if (anyFail) return { cls: "fail", text: "有失败" };
        if (allSkipDone) return { cls: "done", text: "完成" };
        return { cls: "unk", text: "状态未知" };
      }

      const runLines = runs.map((run) => {
        const st = runState(run);
        const key = "r:" + run.id;
        const open = previewKey === key;
        const delRunBtn = React.createElement("button", {
          className: "ad-btn mini danger",
          title: "删除整次运行记录（含全部步骤，不可恢复）",
          onClick: () => {
            if (!window.confirm("删除整次小队运行记录？包含全部步骤，不可恢复。")) return;
            if (run.noTopo) {
              Promise.all(run.disps.map((d) => apiPost("/agent-api/history/remove", { ts: d.ts }).catch(() => null))).then(refresh);
            } else {
              apiPost("/agent-api/history/remove-run", { squadRunId: run.id }).then(refresh).catch((e) => setErr(msg(e)));
            }
          },
        }, "删除");
        const totalN = run.noTopo ? run.disps.length : run.steps.length;
        const doneN = (() => {
          let c = 0;
          for (let i = 0; i < totalN; i++) { const s = stepState(run, i); if (s === "done" || s === "skip") c++; }
          return c;
        })();
        const actions = React.createElement("span", { className: "ad-hist-actions", onClick: (e) => e.stopPropagation() },
          React.createElement("span", { className: "ad-hist-type squad", title: "步骤完成数 / 总数" }, doneN + "/" + totalN),
          run.parentSessionId && openAgentSession
            ? React.createElement("button", { className: "ad-btn mini", title: "打开发起本次运行的主会话", onClick: () => openAgentSession(run.parentSessionId) }, "主会话")
            : null,
          delRunBtn,
        );
        // 展开区：执行流程图（节点状态着色）+ 步骤明细
        const topoSteps = (run.steps || []).map((s) => ({ phase: s.phase, agentId: s.agentId, dependsOn: s.dependsOn || [] }));
        const statuses = (() => {
          const arr = [];
          for (let i = 0; i < (run.noTopo ? 0 : run.steps.length); i++) arr.push(stepState(run, i));
          return arr;
        })();
        const stepRows = (() => {
          const out = [];
          for (let i = 0; i < totalN; i++) {
            const s = stepState(run, i);
            const disp = run.noTopo ? run.disps[i] : run.disps.find((d) => d.stepIndex === i);
            const meta = run.noTopo ? {} : (run.steps[i] || {});
            const nm = (meta.phase || "") + (meta.agentId && meta.phase !== meta.agentId ? " · " + (disp && disp.agentName ? disp.agentName : meta.agentId) : "");
            out.push(React.createElement("div", { key: i, className: "ad-step-row" },
              React.createElement("span", { className: "no" }, "S" + (i + 1)),
              React.createElement("span", { className: "nm", title: nm }, nm || "？"),
              React.createElement("span", { className: "st " + s }, STATE_TEXT[s]),
              disp && disp.childId && openAgentSession
                ? React.createElement("button", { className: "ad-btn mini", title: "打开该步子 Agent 会话", onClick: (e) => { e.stopPropagation(); openAgentSession(disp.childId); } }, "子 Agent")
                : null,
            ));
          }
          return out;
        })();
        // v0.9.21：图例（执行流状态色说明）
        const legend = React.createElement("div", { className: "ad-legend" },
          React.createElement("span", { className: "lg" }, React.createElement("span", { className: "sw done" }), "完成"),
          React.createElement("span", { className: "lg" }, React.createElement("span", { className: "sw run" }), "当前执行"),
          React.createElement("span", { className: "lg" }, React.createElement("span", { className: "sw fail" }), "失败"),
          React.createElement("span", { className: "lg" }, React.createElement("span", { className: "sw skip" }), "等待 / 跳过"),
        );
        const preview = open
          ? React.createElement("div", { className: "ad-hist-preview" },
              run.noTopo
                ? React.createElement("div", { className: "ad-hist-preview-row" },
                    React.createElement("span", { className: "ad-meta-label" }, "说明"),
                    "旧记录无拓扑快照，仅列步骤明细")
                : React.createElement(React.Fragment, null,
                    legend,
                    React.createElement("div", { className: "ad-hist-preview-row", style: { alignItems: "flex-start" } },
                      React.createElement("span", { className: "ad-meta-label" }, "执行流"),
                      React.createElement("div", { style: { minWidth: 0, overflow: "auto" } },
                        React.createElement(SquadFlowGraph, { steps: topoSteps, statuses, onOpen: (i) => {
                          const disp = run.disps.find((d) => d.stepIndex === i);
                          if (disp && disp.childId && openAgentSession) openAgentSession(disp.childId);
                        } })))),
              run.goal
                ? React.createElement("div", { className: "ad-hist-preview-row", style: { alignItems: "flex-start" } },
                    React.createElement("span", { className: "ad-meta-label" }, "目标"),
                    React.createElement("div", { className: "ad-hist-taskbox", style: { height: "auto", maxHeight: "110px" } }, run.goal))
                : null,
              React.createElement("div", { className: "ad-hist-preview-row", style: { alignItems: "flex-start" } },
                React.createElement("span", { className: "ad-meta-label" }, "步骤"),
                React.createElement("div", { style: { minWidth: 0, flex: 1 } }, stepRows.length ? stepRows : "（无步骤）")),
            )
          : null;
        return React.createElement("div", { key, className: "ad-hist-line" + (open ? " open" : "") },
          histHead({
            time: fmtTs(run.ts),
            avatar: React.createElement(Avatar, { name: run.name, emoji: run.emoji }),
            name: run.name || "?",
            nameTitle: run.squadId || "",
            summary: run.goal || (run.disps[0] && run.disps[0].taskLabel) || "（无目标摘要）",
            state: st,
            actions,
            onClick: () => setPreviewKey(open ? null : key),
          }),
          preview,
        );
      });

      const seg = React.createElement("div", { className: "ad-seg" },
        React.createElement("button", { className: sub === "agent" ? "on" : "", onClick: () => { setSub("agent"); setPreviewKey(null); } }, "Agent 历史"),
        React.createElement("button", { className: sub === "squad" ? "on" : "", onClick: () => { setSub("squad"); setPreviewKey(null); } }, "小队历史"),
      );
      // v0.9.21：列头行（时间｜头像｜名称｜消息｜状态｜操作）——两列表同构
      const colhead = React.createElement("div", { className: "ad-hist-colhead" },
        React.createElement("span", { className: "c-time" }, "时间"),
        React.createElement("span", { className: "c-avatar" }, ""),
        React.createElement("span", { className: "c-name" }, sub === "agent" ? "Agent" : "小队"),
        React.createElement("span", { className: "c-task" }, "消息"),
        React.createElement("span", { className: "c-status" }, "状态"),
        React.createElement("span", { className: "c-actions" }, "操作"),
      );
      const lines = sub === "agent" ? agentLines : runLines;

      return React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: "12px" } },
        err ? React.createElement("div", { className: "ad-err" }, err) : null,
        seg,
        lines.length ? React.createElement(React.Fragment, null,
          colhead,
          React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: "2px" } }, lines),
        ) : null,
        !lines.length ? React.createElement("div", { className: "ad-empty", style: { minHeight: "180px" } },
          React.createElement("span", { className: "ad-empty-text" }, list ? (sub === "agent" ? "暂无 Agent 委派记录" : "暂无小队运行记录") : "加载中…"),
          React.createElement("span", { className: "ad-empty-sub" }, sub === "agent"
            ? "这里记录每次单个 Agent 的委派：任务、模型路由与成败"
            : "每次执行小队后这里会出现一条运行记录，点开可看执行流图（节点状态着色）与各步骤进度。若重启 Desktop 后仍为空，请先跑一次小队"),
        ) : null,
      );
    }

    // ── v0.8.2/0.8.3：小队执行流 SVG 拓扑图（按依赖分层：层内并行、层间串行，箭头=依赖）──
    // 纯 React 元素组装，无外部依赖；配色全部走语义化 token（--ad-* 映射 dsw alias），适配亮/暗主题。
    // v0.8.3：精致化——渐变节点、层标注（并行/串行）、hover 高亮、large 大图模式、onOpen 点击回调。
    let adFlowMarkerSeq = 0;
    // v0.9.30：执行流节点标签按像素测量截断（canvas measureText，不渲染 DOM）——
    // 超宽逐字截断加「…」，原文挂 <title> 悬浮可见。SVG <text> 不会自动截断/换行，
    // 长阶段名（节点可用宽仅 ~60px）必然溢出，这是用户报的「文字超出节点框」。
    let flowMeasureCtx = null;
    function fitFlowLabel(text, maxWidthPx, font) {
      const s = String(text || "");
      if (!s) return "";
      try {
        if (!flowMeasureCtx) flowMeasureCtx = document.createElement("canvas").getContext("2d");
        flowMeasureCtx.font = font;
        if (flowMeasureCtx.measureText(s).width <= maxWidthPx) return s;
        let out = s;
        while (out.length > 1 && flowMeasureCtx.measureText(out + "…").width > maxWidthPx) out = out.slice(0, -1);
        return out + "…";
      } catch (e) { return s.length > 8 ? s.slice(0, 8) + "…" : s; }
    }
    // v0.9.30：跳转会话后强制切回对话页——
    // conversation.view 选中页按会话持久化（localStorage dsh.conversation.chat.<id>），
    // 跳到上次停在「Agent 调度」页的会话会停在那里而非对话页。
    // 宿主无 setView 服务 → 轮询会话头部 tablist，找首标签「对话/Chat」（chat 视图 order:0 恒第一），未选中则点击（走官方 setView）。
    function ensureChatView() {
      let tries = 0;
      const poll = () => {
        try {
          const lists = document.querySelectorAll('[role="tablist"]');
          for (const list of lists) {
            const first = list.querySelector('[role="tab"]');
            if (!first) continue;
            const label = (first.textContent || "").trim();
            if (label !== "对话" && label !== "Chat") continue; // 只认会话头部视图标签栏
            if (first.getAttribute("aria-selected") !== "true") first.click();
            return;
          }
        } catch (e) {}
        if (++tries < 10) setTimeout(poll, 60); // 最多 ~0.6s
      };
      setTimeout(poll, 60);
    }
    function SquadFlowGraph({ steps, agents, large, onOpen, statuses }) {
      let layers = [];
      try { layers = topoLayers(steps); } catch (e) { return React.createElement("div", { className: "ad-graph-empty" }, "执行流存在依赖环，无法绘制"); }
      if (!Array.isArray(steps) || !steps.length) return React.createElement("div", { className: "ad-graph-empty" }, "（暂无步骤）");
      // 大图模式尺寸放大（卡片小图 0.9x，弹窗大图 1.25x）
      const S = large ? 1.25 : 0.9;
      const BW = Math.round(108 * S), BH = Math.round(32 * S), GX = Math.round(128 * S), GY = Math.round(44 * S);
      const topPad = large ? 40 : 22; // 大图顶部留层标注区
      const pos = {};
      layers.forEach((col, li) => col.forEach((si, ri) => { pos[si] = { x: 12 + li * GX, y: topPad + ri * GY }; }));
      const W = 24 + layers.length * GX;
      const H = topPad + 12 + Math.max(...layers.map((c) => c.length)) * GY;
      const markerId = "ad-flow-arrow-" + (++adFlowMarkerSeq);
      const gradId = "ad-flow-grad-" + adFlowMarkerSeq;
      const agentOf = (id) => (Array.isArray(agents) ? agents.find((e) => e.id === id) : undefined);
      const els = [];
      // 层标注：同层=并行（｜），跨层=串行（→）
      if (large) {
        layers.forEach((col, li) => {
          const xs = Math.min(...col.map((si) => pos[si].x));
          const xe = Math.max(...col.map((si) => pos[si].x + BW));
          els.push(React.createElement("text", { key: "layer" + li, className: "flow-layer", x: (xs + xe) / 2, y: 20 },
            "L" + (li + 1) + " · " + (col.length > 1 ? "并行" : "串行")));
        });
      }
      // 箭头（先画，垫在节点下层；C 曲线避免交叉线遮挡节点）
      steps.forEach((st, i) => {
        (st.dependsOn || []).forEach((d) => {
          const a = pos[d], b = pos[i];
          if (!a || !b) return;
          els.push(React.createElement("path", {
            key: "a" + d + "-" + i,
            className: "flow-arrow",
            d: `M ${a.x + BW} ${a.y + BH / 2} C ${a.x + BW + 28 * S} ${a.y + BH / 2}, ${b.x - 28 * S} ${b.y + BH / 2}, ${b.x} ${b.y + BH / 2}`,
            markerEnd: "url(#" + markerId + ")",
          }));
        });
      });
      // 节点：序号 + 阶段名（v0.8.9：去掉 Agent emoji，节点更干净）
      // v0.9.17：statuses[i] 存在时节点按状态着色（st-done/run/fail/skip/unknown）
      steps.forEach((st, i) => {
        const p = pos[i] || { x: 12, y: topPad };
        const label = st.phase || st.agentId;
        const stepNum = "S" + (i + 1);
        const stCls = statuses && statuses[i] ? " st-" + statuses[i] : "";
        // v0.9.30：标签按像素测量截断——可用宽 = 节点宽 − 左起 30px（序号区）− 右留白 8px；
        // 字号随模式（小图 10.5px / 大图 12px，与 CSS 一致）。原文挂 <title>（SVG 原生悬浮提示）。
        const depTxt = (st.dependsOn && st.dependsOn.length)
          ? "依赖 " + st.dependsOn.map((d) => "S" + (d + 1)).join(",")
          : "";
        const labelMax = BW - 30 - 8;
        const fitLabel = fitFlowLabel(label, labelMax, (large ? "600 " + Math.round(12 * 10) / 10 : "600 10.5") + "px -apple-system, sans-serif");
        els.push(React.createElement("g", {
          key: "n" + i,
          className: "flow-node" + stCls + (onOpen ? " clickable" : ""),
          onClick: onOpen ? () => onOpen(i) : undefined,
        },
          React.createElement("rect", {
            className: "flow-rect",
            x: p.x, y: p.y, width: BW, height: BH, rx: 8,
            fill: "url(#" + gradId + ")",
          }),
          React.createElement("title", null, String(label)),
          React.createElement("rect", { className: "flow-rect-badge", x: p.x + 6, y: p.y + 6, width: 18, height: 18, rx: 5 }),
          React.createElement("text", { className: "flow-step", x: p.x + 15, y: p.y + 19, textAnchor: "middle" }, stepNum),
          React.createElement("text", { className: "flow-label", x: p.x + 30, y: p.y + 19 }, fitLabel),
          // 依赖徽标：等待的步骤下标
          depTxt
            ? React.createElement("text", { className: "flow-dep", x: p.x + BW - 6, y: p.y + BH - 5 }, depTxt)
            : null,
        ));
      });
      return React.createElement("svg", {
        className: "ad-flow-svg" + (large ? " large" : "") + (onOpen ? " clickable" : ""),
        viewBox: "0 0 " + W + " " + H,
        width: W, // v0.9.3：自然像素尺寸（容器内只缩不放，避免单节点被拉伸撑满）
        height: H,
        preserveAspectRatio: "xMidYMid meet",
      },
        React.createElement("defs", null,
          React.createElement("marker", { id: markerId, markerWidth: 9, markerHeight: 9, refX: 8, refY: 4.5, orient: "auto" },
            React.createElement("path", { className: "flow-marker", d: "M0,0 L9,4.5 L0,9 Z" })),
          React.createElement("linearGradient", { id: gradId, x1: "0", y1: "0", x2: "1", y2: "1" },
            React.createElement("stop", { offset: "0%", className: "flow-grad-a" }),
            React.createElement("stop", { offset: "100%", className: "flow-grad-b" })),
        ),
        ...els,
      );
    }

    // ── v0.8.3：小队执行流弹窗大图（modal：放大拓扑图 + 步骤说明列表）──
    function SquadFlowModal({ squad, agents, onClose }) {
      const steps = (squad && squad.steps) || [];
      const agentOf = (id) => (Array.isArray(agents) ? agents.find((e) => e.id === id) : undefined);
      const stepRows = steps.map((st, i) => {
        return React.createElement("div", { key: i, className: "ad-modal-step" },
          React.createElement("div", { className: "ad-modal-step-h" },
            React.createElement("span", { className: "ad-modal-step-no" }, "S" + (i + 1)),
            React.createElement("span", { className: "ad-modal-step-name" }, st.phase || st.agentId),
            (st.dependsOn && st.dependsOn.length)
              ? React.createElement("span", { className: "ad-modal-step-dep" }, "等 " + st.dependsOn.map((d) => "S" + (d + 1)).join("、"))
              : null,
          ),
          st.instruction
            ? React.createElement("div", { className: "ad-modal-step-inst" }, st.instruction)
            : null,
        );
      });
      return React.createElement("div", { className: "ad-modal-mask", onClick: onClose },
        React.createElement("div", { className: "ad-modal", onClick: (e) => e.stopPropagation() },
          React.createElement("div", { className: "ad-modal-head" },
            React.createElement("span", { className: "ad-modal-title" }, (squad.name || squad.id) + " · 执行流"),
            React.createElement("button", { className: "ad-btn mini", onClick: onClose }, "✕ 关闭"),
          ),
          React.createElement("div", { className: "ad-modal-body" },
            squad.description ? React.createElement("div", { className: "ad-modal-desc" }, squad.description) : null,
            // v0.9.3：固定 300px 图区，SVG 自然尺寸居中，超宽横向滚动
            React.createElement("div", { className: "ad-modal-graph" },
              React.createElement(SquadFlowGraph, { steps: steps, agents: agents, large: true }),
            ),
            React.createElement("div", { className: "ad-modal-steps" }, stepRows),
          ),
        ),
      );
    }

    // ── 小队子 tab：Agent 小队（协作模板）CRUD（阶段 + 依赖编排），v0.8 卡片网格 ──
    function SquadTab() {
      const [data, setData] = React.useState(null);                  // GET /agent-api（拿 agents 供下拉）
      const [squads, setSquads] = React.useState(null);              // GET /agent-api/squads 结果
      const [editingSquad, setEditingSquad] = React.useState(null);  // null | { isNew: bool, squad: object|null }
      const [confirmDelSquad, setConfirmDelSquad] = React.useState(null); // 待二次确认删除的小队
      const [viewSquad, setViewSquad] = React.useState(null);        // v0.8.3：点击执行流图弹窗查看的小队
      const [err, setErr] = React.useState("");

      const refresh = () => {
        apiGet("/agent-api")
          .then(setData)
          .catch((e) => setErr(msg(e)));
        apiGet("/agent-api/squads")
          .then((d) => setSquads(d.squads || []))
          .catch((e) => setErr(msg(e)));
      };
      React.useEffect(() => { refresh(); }, []);

      const upsertSquad = (squad) =>
        apiPost("/agent-api/squad/upsert", { squad })
          .then(() => { setEditingSquad(null); refresh(); });
      const doRemoveSquad = () => {
        const sq = confirmDelSquad;
        setConfirmDelSquad(null);
        apiPost("/agent-api/squad/remove", { id: sq.id }).then(refresh).catch((e) => setErr(msg(e)));
      };

      const agents = data ? (data.agents || []) : [];
      const toggleSquad = (sq) =>
        apiPost("/agent-api/squad/toggle", { id: sq.id, enabled: !sq.enabled }).then(refresh).catch((e) => setErr(msg(e)));
      // v0.9.5：卡片点整体即编辑；编辑/删除移到 hover 浮层图标按钮；流程图点击仍放大（阻止冒泡）
      const squadCards = (squads || []).map((sq) =>
        React.createElement("div", {
          key: sq.id,
          className: "ad-squad-card editable",
          title: "点击编辑「" + (sq.name || sq.id) + "」",
          onClick: () => setEditingSquad({ isNew: false, squad: sq }),
        },
          // v0.9.8：浮层编辑按钮删除（整卡点击即编辑，入口唯一），去内置标签
          React.createElement("div", { className: "ad-squad-card-main" },
            React.createElement("div", { className: "ad-row-main" },
              React.createElement(Avatar, { name: sq.name || sq.id, emoji: sq.emoji }),
              React.createElement("span", { className: "ad-mid" },
                React.createElement("span", { className: "ad-name", title: sq.name || sq.id },
                  sq.name || sq.id,
                ),
                React.createElement("span", { className: "ad-id", title: sq.id }, sq.id),
              ),
              // v0.8.2：小队开关（灰底白球，仅球位区分，两态一致）
              React.createElement("button", {
                className: "ad-switch" + (sq.enabled ? " on" : ""),
                role: "switch",
                "aria-checked": sq.enabled,
                title: sq.enabled ? "点击停用" : "点击启用",
                onClick: (e) => { e.stopPropagation(); toggleSquad(sq); },
              }, React.createElement("span", { className: "knob" })),
            ),
            sq.description
              ? React.createElement("div", { className: "ad-desc", title: sq.description }, sq.description)
              : null,
            // v0.9.3：卡片流程图缩略（固定 96px 高；点击放大弹窗，阻止冒泡避免误触编辑）
            React.createElement("div", { className: "ad-graph-box", title: "点击放大查看执行流", onClick: (e) => { e.stopPropagation(); setViewSquad(sq); } },
              React.createElement(SquadFlowGraph, { steps: sq.steps || [], agents: agents }),
            ),
            React.createElement("div", { className: "ad-graph-hint" },
              React.createElement("span", null, squadStepsText(sq.steps)),
              React.createElement("span", null, "点击图放大")),
          ),
        )
      );

      const delSquad = confirmDelSquad;

      return React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: "14px" } },
        React.createElement("div", { className: "ad-kicker-row" },
          React.createElement("span", { className: "ad-kicker" }, "Squads · 小队（" + ((squads && squads.length) || "…") + "）"),
          React.createElement("button", { className: "ad-btn mini primary", onClick: () => setEditingSquad({ isNew: true, squad: null }) }, "+ 新建小队"),
        ),
        err ? React.createElement("div", { className: "ad-err" }, err) : null,
        // v0.9.7：删「小队 = …」说明句（用户不要）
        // v0.9.5：小队编辑弹窗（宽形，装步骤编排）
        editingSquad
          ? React.createElement("div", { className: "ad-modal-mask", onClick: () => setEditingSquad(null) },
              React.createElement("div", { className: "ad-modal form wide", onClick: (e) => e.stopPropagation() },
                React.createElement("div", { className: "ad-modal-head" },
                  React.createElement("span", { className: "ad-modal-title" }, (editingSquad.isNew ? "新建" : "编辑") + "小队"),
                  React.createElement("button", { className: "ad-btn icon", onClick: () => setEditingSquad(null) }, "✕"),
                ),
                React.createElement("div", { className: "ad-modal-body" },
                  React.createElement(SquadForm, {
                    key: editingSquad.isNew ? "__new__" : (editingSquad.squad && editingSquad.squad.id) || "__edit__",
                    initial: editingSquad.squad,
                    isNew: editingSquad.isNew,
                    agents: agents, // v0.8.2：完整列表（含 emoji），供执行流预览图使用
                    onSave: upsertSquad,
                    onCancel: () => setEditingSquad(null),
                    // v0.9.7：弹窗内删除 → 关表单 → 弹删除确认
                    onDelete: editingSquad.isNew ? null : () => { const sq = editingSquad.squad; setEditingSquad(null); setConfirmDelSquad(sq); },
                  }),
                ),
              ),
            )
          : null,
        // v0.9.5：小队删除确认弹窗
        delSquad
          ? React.createElement("div", { className: "ad-modal-mask", onClick: () => setConfirmDelSquad(null) },
              React.createElement("div", { className: "ad-modal", style: { width: "380px" }, onClick: (e) => e.stopPropagation() },
                React.createElement("div", { className: "ad-modal-head" },
                  React.createElement("span", { className: "ad-modal-title" }, "删除小队"),
                ),
                React.createElement("div", { className: "ad-modal-body" },
                  React.createElement("div", { className: "ad-modal-desc" },
                    "确定删除「" + (delSquad.name || delSquad.id) + "」？"),
                ),
                React.createElement("div", { className: "ad-modal-foot" },
                  React.createElement("button", { className: "ad-btn", onClick: () => setConfirmDelSquad(null) }, "取消"),
                  React.createElement("button", { className: "ad-btn danger", onClick: doRemoveSquad }, "删除"),
                ),
              ),
            )
          : null,
        squadCards.length
          ? React.createElement("div", { className: "ad-squad-list" }, squadCards)
          : React.createElement("div", { className: "ad-empty", style: { minHeight: "180px" } },
              React.createElement("span", { className: "ad-empty-text" }, squads ? "暂无小队" : "加载中…"),
              squads ? React.createElement("span", { className: "ad-empty-sub" }, "点击「+ 新建小队」创建一个多 Agent 协作模板") : null,
            ),
        viewSquad
          ? React.createElement(SquadFlowModal, { squad: viewSquad, agents: agents, onClose: () => setViewSquad(null) })
          : null,
      );
    }

    // ── AgentPanel：conversation.view 主面板（v0.8：总览/历史/Agent/小队 四子 tab）──
    // ── v0.9.29：面板状态跨会话持久化（返回后不重置）──
    // conversation.view 槽位组件按会话挂载：切走=卸载、切回=重挂载，
    // React useState 初始值重置 → 用户从历史页点返回发现停在总览。
    // 修法：tab/历史分段/展开行提升到模块级，重挂载立即恢复。
    const uiState = { tab: "overview", histSub: "agent", histKey: null };
    const uiSubs = new Set();
    function uiNotify() { for (const f of uiSubs) { try { f(); } catch (e) {} } }
    function bindPersistentState(getter, setter) {
      // useState(() => getter()) 惰性初始读取（重挂载时取模块级最新值）
      const [v, setV] = React.useState(() => getter());
      const set = React.useCallback((next) => { const nv = typeof next === "function" ? next(getter()) : next; setter(nv); setV(nv); uiNotify(); }, []);
      React.useEffect(() => { const fn = () => setV(getter()); uiSubs.add(fn); return () => uiSubs.delete(fn); }, []);
      return [v, set];
    }

    function AgentPanel() {
      const [tab, setTab] = bindPersistentState(() => uiState.tab, (v) => { uiState.tab = v; });
      const [act, setAct] = React.useState({ active: [] }); // 头部运行中计数（10 秒刷新）
      const tabs = [
        { id: "overview", label: "总览" },
        { id: "manage", label: "Agent" },
        { id: "squad", label: "小队" },
        { id: "history", label: "历史" },
      ];
      React.useEffect(() => {
        const refresh = () => apiGet("/agent-api/active").then((d) => setAct({ active: d.active || [] })).catch(() => {});
        refresh();
        const timer = setInterval(refresh, 10000);
        return () => clearInterval(timer);
      }, []);
      const running = act.active.length;
      return React.createElement("div", { className: "ad-panel" },
        React.createElement("div", { className: "ad-panel-head" },
          React.createElement("span", { className: "ad-logo" }, DSHLogo()),
          React.createElement("span", { className: "ad-panel-title" }, "Agent 调度"),
          React.createElement("span", { className: "ad-live-pill" },
            React.createElement("span", { className: "ad-dot " + (running > 0 ? "on" : "off") }),
            running > 0 ? running + " 运行中" : "空闲",
          ),
        ),
        React.createElement("div", { className: "ad-subtabs" },
          tabs.map((t) =>
            React.createElement("button", {
              key: t.id,
              className: "ad-subtab" + (tab === t.id ? " on" : ""),
              onClick: () => setTab(t.id),
            }, t.label, t.id === "overview" && running > 0 ? React.createElement("span", { className: "n" }, String(running)) : null),
          ),
        ),
        React.createElement("div", { className: "ad-panel-body" },
          tab === "overview" ? React.createElement(OverviewTab, { key: "ov" }) : null,
          tab === "history" ? React.createElement(HistoryTab, { key: "hist" }) : null,
          tab === "manage" ? React.createElement(ManageTab, { key: "mg" }) : null,
          tab === "squad" ? React.createElement(SquadTab, { key: "sq" }) : null,
        ),
      );
    }

    // ── 悬浮活动按钮 v0.8.3（原生 DOM：随处可拖+动态特效+完成状态同步+弹窗跟随+显隐模式）──
    const FAB_POS_KEY = "ad-fab-pos";
    const FAB_MODE_KEY = "ad-fab-mode";
    // v0.9.36：悬浮球总开关（总览页开关控制，localStorage 持久化；off 时强制隐藏，优先级高于显示模式）
    const FAB_VIS_KEY = "ad-fab-visible";
    const fabUi = { visible: true };
    try { fabUi.visible = localStorage.getItem(FAB_VIS_KEY) !== "0"; } catch (e) {}
    function isFabVisible() { return fabUi.visible; }
    function setFabVisible(v) {
      fabUi.visible = !!v;
      try { localStorage.setItem(FAB_VIS_KEY, v ? "1" : "0"); } catch (e) {}
      const fab = document.getElementById("ad-agent-fab");
      if (fab) {
        // v0.9.36：off 强制隐藏；on 恢复显示模式逻辑（当前默认 always=常驻）
        fab.style.display = (!v || getFabMode() === "never") ? "none" : "grid";
      }
    }
    // v0.8.4：打开 Agent 调度面板的 DOM 兜底（apply 时赋值；未赋值时菜单项置灰）
    let openAgentPanel = null;
    // v0.8：悬浮球显示模式，默认 "always"（一直显示）。可选 always / auto / never。
    function getFabMode() {
      try {
        const m = localStorage.getItem(FAB_MODE_KEY);
        if (m === "always" || m === "auto" || m === "never") return m;
      } catch (e) {}
      return "always";
    }
    function mountAgentFab(fabCtx) {
      if (typeof document === "undefined") return () => {};
      if (document.getElementById("ad-agent-fab")) return () => {};

      const fab = document.createElement("div");
      fab.id = "ad-agent-fab";
      fab.className = "ad-fab";
      // v0.9.36：总开关 off 强制隐藏；on 时按显示模式（当前默认 always=常驻）
      fab.style.display = (!isFabVisible() || getFabMode() === "never") ? "none" : "grid";
      fab.title = "Agent 调度 · 悬浮球（可拖动）";
      // v0.8.3：官方 DSH logo 内联 SVG（不再用 🤖）
      const fabLogo = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      fabLogo.setAttribute("viewBox", "0 0 50 50");
      fabLogo.setAttribute("class", "ad-dsh-logo");
      fabLogo.setAttribute("aria-hidden", "true");
      const fabPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
      fabPath.setAttribute("d", DSH_LOGO_PATH);
      fabPath.setAttribute("fill", "currentColor");
      fabLogo.appendChild(fabPath);
      fab.appendChild(fabLogo);
      // v0.9.5：边缘流光独立环（conic 渐变旋转 + 遮罩掏空，只露边缘）
      const edgeRing = document.createElement("span");
      edgeRing.className = "ad-fab-edge-ring";
      edgeRing.setAttribute("aria-hidden", "true");
      fab.appendChild(edgeRing);
      document.body.appendChild(fab);
      // v0.8.8：挂载后应用悬浮球设置（色调/呼吸/彩色流光）
      setTimeout(() => {
        try { applyFabSettings(readFabSettings()); } catch (e) {}
      }, 0);

      // ── 位置：localStorage 恢复，钳在视口内（v0.8.3 不吸附，随处停）──
      const applyPos = (x, y) => {
        const r = 46; // 球直径
        x = Math.max(6, Math.min(x, window.innerWidth - r - 6));
        y = Math.max(6, Math.min(y, window.innerHeight - r - 6));
        fab.style.left = x + "px";
        fab.style.top = y + "px";
      };
      let pos = { x: window.innerWidth - 66, y: window.innerHeight - 66 }; // 默认右下
      try {
        const saved = JSON.parse(localStorage.getItem(FAB_POS_KEY) || "null");
        if (saved && typeof saved.x === "number" && typeof saved.y === "number") pos = saved;
      } catch (e) { /* 忽略损坏数据 */ }
      applyPos(pos.x, pos.y);
      const savePos = () => { try { localStorage.setItem(FAB_POS_KEY, JSON.stringify(pos)); } catch (e) {} };
      // 窗口缩放后保持球在视口内
      const onResize = () => { applyPos(pos.x, pos.y); if (popOpen) placePop(); };
      window.addEventListener("resize", onResize);

      // ── 拖动：pointer 事件，移动>4px 视为拖拽（否则是点击）──
      let drag = null;
      fab.addEventListener("pointerdown", (ev) => {
        drag = { startX: ev.clientX, startY: ev.clientY, moved: false, pid: ev.pointerId };
        try { fab.setPointerCapture(ev.pointerId); } catch (e) {}
      });
      fab.addEventListener("pointermove", (ev) => {
        if (!drag) return;
        const dx = ev.clientX - drag.startX, dy = ev.clientY - drag.startY;
        if (!drag.moved && Math.hypot(dx, dy) > 4) { drag.moved = true; fab.classList.add("dragging"); }
        if (drag.moved) {
          pos = { x: pos.x + dx, y: pos.y + dy };
          drag.startX = ev.clientX; drag.startY = ev.clientY;
          applyPos(pos.x, pos.y);
          if (popOpen) placePop();
        }
      });
      const endDrag = (ev) => {
        if (!drag) return;
        const wasMoved = drag.moved;
        drag = null;
        fab.classList.remove("dragging");
        if (wasMoved) {
          // v0.8.3：随处可拖不吸附，直接保存松手位置（已由 applyPos 钳在视口内）
          savePos();
        } else {
          togglePop();
        }
      };
      fab.addEventListener("pointerup", endDrag);
      fab.addEventListener("pointercancel", () => { drag = null; fab.classList.remove("dragging"); });

      // ── 弹窗：跟随球位置（上方或下方，左右不越界）──
      let pop = null, popOpen = false;
      // v0.8.9：popView 区分主视图/设置视图，异步回调只在主视图时重绘（否则设置被覆盖回主视图）
      let popView = "main";
      const placePop = () => {
        if (!pop) return;
        // v0.9.23：宽度取实测值（旧版写死 236 是历史面板宽，现面板 360px →
        // 居中/边缘钳制全错位：球不在面板横向正中、贴边时不收缩）。
        const w = pop.offsetWidth || 360;
        const h = pop.offsetHeight || 120;
        let px = pos.x + 23 - w / 2; // 球中心对齐弹窗中心
        px = Math.max(8, Math.min(px, window.innerWidth - w - 8)); // 贴 app 边缘自适应收缩
        let py = pos.y - h - 12;    // 优先在球上方
        const below = py < 8;
        if (below) py = Math.min(pos.y + 54, window.innerHeight - h - 8); // 下方也防出界
        // v0.9.13：弹出原点锚在球心——transform-origin 指向球中心，视觉上面板从球里展开
        const ox = Math.max(12, Math.min(pos.x + 23 - px, w - 12));
        pop.style.transformOrigin = ox + "px " + (below ? "0px" : "100%");
        pop.style.left = px + "px";
        pop.style.top = py + "px";
      };
      const closePop = () => {
        if (pop) { pop.remove(); pop = null; }
        popOpen = false; popView = "main";
        // v0.9.23：默认展开态 = 运行中 + 最近完成（用户：打开面板最近完成也展开）；
        // Agent/小队列表保持折叠（注册表性质，量大）
        secOpen.recent = true; secOpen.agents = false; secOpen.squads = false; secOpen.run = true;
      };
      // v0.8.5.1：缓存最近一次活跃数据——打开面板先渲染缓存（不闪"加载中…"），再主动刷新
      let lastActive = null; // null=尚未 poll 过
      // v0.9.16：「最近委派」改名「最近完成」——只展示限时已完成任务（方案D），数据在 loadRecent 内过滤
      let lastRecent = null; // null=尚未拉取
      // v0.8.9：缓存 Agent 列表（面板"Agent 列表"分区，迷你调度台）
      let lastAgents = null; // null=尚未拉取
      // v0.9.13：缓存小队列表（面板"小队列表"分区，默认折叠）
      let lastSquads = null; // null=尚未拉取
      // v0.9.16：分区展开状态提升到面板级闭包——此前 agOpen/sqOpen 是 renderPop 局部变量，
      // 5s 轮询或 loadRecent/loadAgents 回调触发整面板重建后被重置，"展开了又自动收起"根因。
      // 重渲染时读取恢复；closePop 归位（下次打开全折叠）。
      // v0.9.23：最近完成默认展开（用户要求），与运行中一致
      const secOpen = { recent: true, agents: false, squads: false, run: true };
      const loadRecent = () => {
        fetch("/agent-api/dispatches")
          .then((r) => r.json())
          .then((d) => {
            if (!d || !Array.isArray(d.dispatches)) return;
            // v0.9.16：方案D 前端过滤——只留 TTL 内的已完成条目（TTL 在悬浮球设置里调，默认 30 分钟）
            // v0.9.34：小队 run 也计入「最近完成」——squad-run(end) 行是整次运行终态，
            // 此前只滤 dispatch 行 → 小队完成只显示已回报的步骤数（如 6 步只显示 2），
            // 且「最近完成」计数按 dispatch 行数而非任务数。现在 squad-run(end) 行按 1 个单位计入。
            const ttlMs = Math.max(1, Number(readFabSettings().recentTtlMin) || 30) * 60000;
            const cutoff = Date.now() - ttlMs;
            lastRecent = d.dispatches
              // v0.9.34：squad-run(end) 标记 ok=true 让「已完成」过滤通过——
              // host logSquadRun({phase:'end',stepStatus}) 不带 ok/ended 字段，需前端补
              .map((x) => x && x.kind === "squad-run" && x.phase === "end" ? { ...x, ok: true, ended: true } : x)
              .filter((x) => x && x.ok && x.ended && !x.orphan && new Date(x.ts).getTime() >= cutoff)
              .filter((x) => x.kind !== "squad-run" || x.phase === "end")
              .slice(0, 8);
            if (popOpen && popView === "main") renderPop(lastActive);
          })
          .catch(() => {});
      };
      const loadAgents = () => {
        fetch("/agent-api/suggest?q=")
          .then((r) => r.json())
          .then((d) => {
            if (!d || !d.ok || !Array.isArray(d.agents)) return;
            lastAgents = d.agents;
            lastSquads = Array.isArray(d.squads) ? d.squads : null; // v0.9.13：同端点顺带取小队
            if (popOpen && popView === "main") renderPop(lastActive);
          })
          .catch(() => {});
      };
      // v0.9.13：点击 Agent/小队卡片 → 当前会话输入框就地填 "$id "（用户补任务发送即委派）。
      // 走官方输入 facade：conversation.input.shell(当前会话).setDraft（单一写入路径，React 受控状态同步）。
      // 老宿主无该服务/取不到当前会话时回退打开调度面板，功能不丢。
      const dispatchTokenToComposer = (id) => {
        try {
          const sessions = fabCtx && fabCtx.get ? fabCtx.get("sessions") : null;
          const conv = fabCtx && fabCtx.get ? fabCtx.get("conversation") : null;
          const current = sessions && sessions.list && typeof sessions.list.getSnapshot === "function"
            ? sessions.list.getSnapshot().current : null;
          const shell = current && conv && conv.input && typeof conv.input.shell === "function"
            ? conv.input.shell(current) : null;
          if (shell && typeof shell.setDraft === "function") {
            shell.setDraft("$" + id + " ");
            return true;
          }
        } catch (e) { /* facade 不可用 → 回退 */ }
        if (openAgentPanel) openAgentPanel();
        return false;
      };
      const togglePop = () => {
        // v0.9.37：点悬浮球清完成光效——有活跃任务时 poll 保持 fab-live（白光呼吸），无活跃回初始态
        clearDoneGlow();
        if (popOpen) { closePop(); return; }
        pop = document.createElement("div");
        pop.className = "ad-fab-pop";
        document.body.appendChild(pop);
        popOpen = true;
        // v0.9.5：修 || 85 吞 0——拖到 0% 保存后重开被弹回 85（"调完收起再打开又变回原来"根因）
        const rawA = Number(readFabSettings().alpha);
        const a = Number.isFinite(rawA) ? Math.max(0, Math.min(100, rawA)) : 85;
        pop.style.setProperty("--fab-pop-alpha", String(a / 100));
        placePop();
        // 有缓存立即渲染，无缓存显示加载态
        popView = "main";
        renderPop(lastActive);
        // 打开时立即主动刷新一次（不等 5s 轮询）+ 拉最近委派 + 拉 Agent 列表
        poll();
        loadRecent();
        loadAgents();
        // v0.8.12：点面板外空白收起（重绘/设置后重新武装）
        armOutsideClose();
      };
      // v0.8.12：点面板外空白收起——每次视图重绘后都要重新挂（once 监听会被面板内点击消费掉）
      // v0.9.5：点球本身不算"点外"——否则 pointerdown 先关掉面板、同一次点击的 pointerup 又 togglePop 重开→"展开了还重新弹"
      const armOutsideClose = () => {
        setTimeout(() => {
          document.addEventListener("pointerdown", (ev) => {
            if (ev.target === fab || fab.contains(ev.target)) { armOutsideClose(); return; }
            if (popOpen && pop && !pop.contains(ev.target)) closePop();
          }, { once: true });
        }, 0);
      };
      const renderPop = (items) => {
        if (!pop) return;
        // v0.9.23：重绘保留滚动位置——5s 轮询/异步回调整体重建面板，
        // 新 body 的 scrollTop 归零 → 「不知道怎么突然回到顶部」。重绘前抓旧值、渲染后还回
        const prevBody = pop.querySelector(".ad-fab-pop-body");
        const prevScroll = prevBody ? prevBody.scrollTop : 0;
        // v0.9.27：原子渲染——旧版先 pop.textContent="" 清空，再逐段构建 head/body/foot 边建边挂；
        // 中途任何抛错（如数据字段类型异常）都留下「只有头部」的半残面板（用户现场：面板顶在原位、
        // 玻璃层只剩头高、悬浮球孤悬在下方远处），且 5s 轮询每次重试都先清空再炸 → 永久损坏。
        // 修法：head/body/foot 全部先建进 fragment（脱机，抛错不伤现有内容）；body 构建段包 try，
        // 异常降级空态；构建全部完成后才清空旧内容一次性挂入——面板任何时刻都不半残。
        const frag = document.createDocumentFragment();
        const runCount = items ? items.length : -1;
        // 头部：logo + 标题 + 状态摘要 + 关闭
        const head = document.createElement("div");
        head.className = "ad-fab-pop-head";
        const title = document.createElement("div");
        title.className = "ad-fab-pop-title";
        const logoMini = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        logoMini.setAttribute("viewBox", "0 0 50 50");
        logoMini.setAttribute("class", "ad-dsh-logo");
        logoMini.setAttribute("aria-hidden", "true");
        const logoMiniPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
        logoMiniPath.setAttribute("d", DSH_LOGO_PATH);
        logoMiniPath.setAttribute("fill", "currentColor");
        logoMini.appendChild(logoMiniPath);
        title.appendChild(logoMini);
        title.appendChild(document.createTextNode("Agent 活动"));
        head.appendChild(title);
        if (runCount >= 0) {
          const sum = document.createElement("span");
          sum.className = "ad-fab-pop-summary" + (runCount === 0 ? " zero" : "");
          sum.textContent = runCount > 0 ? "● " + runCount + " 运行中" : "空闲";
          head.appendChild(sum);
        }
        // v0.8.11：设置图标放关闭图标旁（头部右上角）
        const setBtn = document.createElement("button");
        setBtn.className = "ad-fab-pop-close ad-fab-pop-set";
        setBtn.textContent = "⚙";
        setBtn.title = "悬浮球设置";
        setBtn.addEventListener("click", openFabSettings);
        head.appendChild(setBtn);
        const closeBtn = document.createElement("button");
        closeBtn.className = "ad-fab-pop-close";
        closeBtn.textContent = "✕";
        closeBtn.title = "收起面板";
        closeBtn.addEventListener("click", closePop);
        head.appendChild(closeBtn);
        frag.appendChild(head);
        // 主体：v0.9.17 卡片化——运行中/最近完成/Agent 列表/小队列表 四分区各成独立圆角卡片，
        // 点标题行整卡折叠（展开状态走面板级 secOpen，跨 5s 重绘保持，关面板归位）
        const body = document.createElement("div");
        body.className = "ad-fab-pop-body";
        // v0.9.27：body 构建段包 try——任何数据异常降级空态，绝不让面板半残
        try {
        // 分区卡片工厂：标题行（名称 + 计数 + 右对齐箭头）+ 内容区；无 onToggle 时不可折叠（加载中态）
        const mkBox = (label, countText, open, onToggle) => {
          const box = document.createElement("div");
          box.className = "ad-fab-box";
          const hd = document.createElement("div");
          hd.className = "ad-fab-box-hd";
          hd.appendChild(document.createTextNode(label));
          const cnt = document.createElement("span");
          cnt.className = "cnt";
          cnt.textContent = countText;
          hd.appendChild(cnt);
          const spacer = document.createElement("span");
          spacer.className = "grow";
          hd.appendChild(spacer);
          const arrow = document.createElement("span");
          arrow.className = "arrow";
          arrow.textContent = open ? "▴" : "▾";
          hd.appendChild(arrow);
          if (onToggle) {
            hd.addEventListener("click", () => {
              onToggle();
              if (popOpen && popView === "main") renderPop(lastActive);
            });
          } else {
            hd.style.cursor = "default";
          }
          box.appendChild(hd);
          const bd = document.createElement("div");
          bd.className = "ad-fab-box-bd";
          bd.style.display = open ? "" : "none";
          box.appendChild(bd);
          body.appendChild(box);
          return bd;
        };
        // 运行中卡片：始终渲染（标题行带计数是面板状态骨架）；空闲时卡内显示空态文案
        if (!items) {
          const bd = mkBox("运行中", "…", true, null);
          const e = document.createElement("div");
          e.className = "ad-fab-empty";
          e.textContent = "加载中…";
          bd.appendChild(e);
        } else {
          const bd = mkBox("运行中", String(items.length), secOpen.run, () => { secOpen.run = !secOpen.run; });
          if (!items.length) {
            const e = document.createElement("div");
            e.className = "ad-fab-empty";
            e.textContent = "已全部结束";
            bd.appendChild(e);
          }
          for (const a of items) {
            const card = document.createElement("div");
            // v0.9.32：运行中按小队聚合展示——小队发起的行显示小队卡（头像+名称+步数），不显示成员；
            // 普通 agent 行保持原样。点击统一直达主会话（parentSessionId 优先，无则子会话）
            const squadName = a.squadName || (a.viaSquad || "");
            const isSquadRun = !!(a.viaSquad && squadName);
            card.className = "ad-fab-card" + ((a.childId || a.parentSessionId) && openAgentSession ? " clickable" : "");
            const target = a.parentSessionId || a.childId;
            if (target && openAgentSession) {
              card.title = a.parentSessionId ? "点击打开主会话" : "点击打开该子 agent 会话";
              card.addEventListener("click", () => { openAgentSession(target); closePop(); });
            }
            const em = document.createElement("span");
            if (isSquadRun) setAvatarEl(em, a.squadEmoji || "", squadName);
            else setAvatarEl(em, a.emoji, a.agentName || a.agentId); // v0.9.14：首字头像
            const g = document.createElement("span");
            g.className = "grow";
            const t1 = document.createElement("div");
            t1.className = "t1";
            t1.textContent = isSquadRun ? squadName + " · 小队" : (a.agentName || a.agentId || "?");
            const t2 = document.createElement("div");
            t2.className = "t2";
            t2.textContent = isSquadRun ? (a.taskLabel || "") : (a.taskLabel || "");
            g.appendChild(t1); g.appendChild(t2);
            const chip = document.createElement("span");
            chip.className = "ad-fab-chip run";
            chip.textContent = isSquadRun ? "运行中" : (a.startedAt ? fmtDur(a.startedAt) : "运行中");
            card.appendChild(em); card.appendChild(g); card.appendChild(chip);
            bd.appendChild(card);
          }
        }
        // 最近完成分区（原「最近委派」）——方案D：只展示限时已完成任务
        //（loadRecent 已按 TTL+ok+ended 过滤）；默认折叠成一行计数（用户要求），
        // 点击标题展开；连续同小队（viaSquad）+同主会话的行聚合成一张小队卡，点开看成员。
        // v0.9.34：聚合同时吸收 squad-run(end) 行——整次运行=1 个单位计数，
        // 步骤数/完成数取自 run 的 stepStatus 全量（此前只数 dispatch 行 → 6 步只显 2）。
        // 聚合键：squad-run 行用 squadRunId，dispatch 行用 viaSquad+parentSessionId，保证二者归一。
        const mkRecentCard = (d) => {
          const card = document.createElement("div");
          card.className = "ad-fab-card clickable";
          const em = document.createElement("span");
          setAvatarEl(em, d.emoji, d.agentName || d.agentId);
          const g = document.createElement("span");
          g.className = "grow";
          const t1 = document.createElement("div");
          t1.className = "t1";
          t1.textContent = d.agentName || d.agentId || "?";
          const t2 = document.createElement("div");
          t2.className = "t2";
          t2.textContent = d.taskLabel || "";
          g.appendChild(t1); g.appendChild(t2);
          // v0.9.32：去掉悬停快捷按钮（⇱/⇲）——卡片点击统一直达主会话
          const chip = document.createElement("span");
          chip.className = "ad-fab-chip ok";
          chip.textContent = "完成";
          card.appendChild(em); card.appendChild(g); card.appendChild(chip);
          const target = d.parentSessionId || d.childId;
          if (target) {
            card.title = d.parentSessionId ? "点击打开主会话" : "点击打开子 agent 会话";
            card.addEventListener("click", () => { openAgentSession(target); closePop(); });
          }
          return card;
        };
        // v0.9.34：最近完成聚合——同一次小队运行归为 1 个单位（run 计数）。
        // 数据形状：squad-run(end) 行（带 squadRunId+stepStatus）+ 该 run 的各 dispatch 行。
        // 聚合键统一用 squadRunId（dispatch 行也有 squadRunId）；无 runId 的旧 dispatch 行
        // 退化为按 viaSquad+parentSessionId 分组（保持旧行为）。计数逻辑：
        //   - 无 squadRunId 的组：按 dispatch 行数计（旧行为）
        //   - 有 squadRunId 的组：按 run 数计（1 个小队=1 个单位），步骤数取 run 的 stepStatus 长度
        const groups = [];
        const runEndById = new Map();
        if (lastRecent) {
          for (const d of lastRecent) {
            if (d.kind === "squad-run" && d.phase === "end" && d.squadRunId) {
              // v1.3.2：checkpoint 分段执行每次续跑都写一条 end 行，同一 squadRunId 有多条。
              // lastRecent 最新在前，首次遇到的是最新（stepStatus 最全）的一条；
              // 旧逻辑后到的（更旧的段）覆盖 → 完成数只显示最新段的步数（如 design 完成后仍 1/5）。
              if (!runEndById.has(d.squadRunId)) runEndById.set(d.squadRunId, d);
              continue;
            }
            const key = d.squadRunId || (d.viaSquad ? d.viaSquad + "|" + (d.parentSessionId || "") : null);
            const tail = groups[groups.length - 1];
            if (key && tail && tail.key === key) tail.items.push(d);
            else groups.push({ key, head: d, items: [d] });
          }
          // 把 squad-run(end) 行并入对应组（保证计数=run 数）
          for (const run of runEndById.values()) {
            const grp = groups.find((g) => g.key && g.key === run.squadRunId);
            if (grp) {
              grp.runEnd = run;
              // head 优先用 dispatch 行（带 squadName/taskLabel/parentSessionId 等展示字段），
              // 仅当该 run 完全没有 items（squad-run 在 TTL 内、其 dispatch 行都过期）时退回 run 行
              if (grp.items.length === 0) grp.head = run;
            } else {
              groups.push({ key: run.squadRunId, head: run, items: [], runEnd: run });
            }
          }
        }
        // v0.9.34：最近完成计数 = 任务单位数（组数），不再是 dispatch 行数——
        // 一个小队整次运行（含 6 步）只算 1 个「最近完成」，普通 agent 委派各算 1
        const recentCount = groups.length;
        const recBd = mkBox("最近完成", lastRecent ? String(recentCount) : "…", secOpen.recent, () => { secOpen.recent = !secOpen.recent; });
        if (secOpen.recent) {
          if (lastRecent && !lastRecent.length) {
            const e = document.createElement("div");
            e.className = "ad-fab-empty";
            e.textContent = "限时内无已完成任务";
            recBd.appendChild(e);
          }
          for (const grp of groups) {
            if (!grp.key) {
              recBd.appendChild(mkRecentCard(grp.head));
              continue;
            }
            // v0.9.32：小队整体卡——直接调用的小队不再展开成员子卡，
            // 整卡显示小队头像+名称+步数状态，点击直达主会话
            const sqCard = document.createElement("div");
            sqCard.className = "ad-fab-card clickable";
            // v0.9.34：head 可能是 squad-run 行（无 squadName/emoji/taskLabel）——兜底取组内任一 dispatch 行字段
            const headD = grp.head.kind === "squad-run" && grp.items.length ? grp.items[0] : grp.head;
            // v1.3.5：修「undefined · 小队」+ 头像异常占位块——TTL 窗口内该 run 的 dispatch/result
            // 行全部过期时 grp.items 为空，headD 退回 squad-run(end) 行本身，该行只有 squadId
            // 字段（squadName/squadEmoji/viaSquad 只在 phase:'start' 行才有，且 start 行已被
            // loadRecent 过滤掉）。此前无兜底：名称拼成字面字符串 "undefined"，头像因 name 也是
            // undefined 连首字都取不到，退化成 setAvatarEl 的 logo 占位块（视觉上是异常黑方块）。
            // 修复：优先用 lastSquads（注册表实时数据，含真实 id/name/emoji）按 squadId 反查，
            // 拿到与「小队列表」分区一致的准确名称+表情，而非退化成首字/logo。
            const sqId = headD.squadId || headD.viaSquad;
            const sqReg = sqId && lastSquads ? lastSquads.find((s) => s.id === sqId) : null;
            const sqDisplayName = (sqReg && sqReg.name) || headD.squadName || headD.viaSquad || sqId || "小队";
            const sqDisplayEmoji = (sqReg && sqReg.emoji) || headD.squadEmoji || "";
            const em = document.createElement("span");
            setAvatarEl(em, sqDisplayEmoji, sqDisplayName);
            const g = document.createElement("span");
            g.className = "grow";
            const t1 = document.createElement("div");
            t1.className = "t1";
            t1.textContent = sqDisplayName + " · 小队";
            // v0.9.34：小队卡步骤数取 run 终态全量——stepStatus 长度=总步数，done/skipped=完成数；
            // 无 run 终态（旧记录）退化为 dispatch 行数
            let totalN, doneN;
            if (grp.runEnd && Array.isArray(grp.runEnd.stepStatus)) {
              totalN = grp.runEnd.stepStatus.length;
              doneN = grp.runEnd.stepStatus.filter((s) => s === "done" || s === "skipped").length;
            } else {
              totalN = grp.items.length;
              doneN = grp.items.filter((d) => d.ok).length;
            }
            const t2 = document.createElement("div");
            t2.className = "t2";
            t2.textContent = doneN + "/" + totalN + " 步完成 · " + (headD.taskLabel || "");
            g.appendChild(t1); g.appendChild(t2);
            const chip = document.createElement("span");
            chip.className = "ad-fab-chip ok";
            chip.textContent = doneN + "/" + totalN + " 完成";
            sqCard.appendChild(em); sqCard.appendChild(g); sqCard.appendChild(chip);
            const target = headD.parentSessionId || headD.childId;
            if (target) {
              sqCard.title = "点击打开主会话";
              sqCard.addEventListener("click", () => { openAgentSession(target); closePop(); });
            }
            recBd.appendChild(sqCard);
          }
        }
        // v0.8.9：Agent 列表卡片（迷你调度台，默认折叠，点标题展开）
        if (lastAgents && lastAgents.length) {
          const agBd = mkBox("Agent 列表", String(lastAgents.length), secOpen.agents, () => { secOpen.agents = !secOpen.agents; });
          if (secOpen.agents) {
            const agList = document.createElement("div");
            agList.className = "ad-fab-agents";
            for (const a of lastAgents) {
              const card = document.createElement("div");
              card.className = "ad-fab-card clickable";
              card.title = "点击填入 $" + a.id + " 到当前会话输入框（补任务即委派）";
              // v0.9.13：就地调用——填 "$id " 到当前会话输入框；老宿主回退打开调度面板
              card.addEventListener("click", () => {
                dispatchTokenToComposer(a.id);
                closePop();
              });
              const em = document.createElement("span");
              setAvatarEl(em, a.emoji, a.name || a.id); // v0.9.14：首字头像
              const g = document.createElement("span");
              g.className = "grow";
              const t1 = document.createElement("div");
              t1.className = "t1";
              t1.textContent = a.name || a.id;
              const t2 = document.createElement("div");
              t2.className = "t2";
              t2.textContent = (a.desc || "").slice(0, 40);
              g.appendChild(t1); g.appendChild(t2);
              card.appendChild(em); card.appendChild(g);
              agList.appendChild(card);
            }
            agBd.appendChild(agList);
          }
        }
        // v0.9.13：小队列表卡片（默认折叠，点卡片就地调用 $squad-id）
        if (lastSquads && lastSquads.length) {
          const sqBd = mkBox("小队列表", String(lastSquads.length), secOpen.squads, () => { secOpen.squads = !secOpen.squads; });
          if (secOpen.squads) {
            const sqList = document.createElement("div");
            sqList.className = "ad-fab-agents";
            for (const q of lastSquads) {
              const card = document.createElement("div");
              card.className = "ad-fab-card clickable";
              card.title = "点击填入 $" + q.id + " 到当前会话输入框（补任务即委派小队）";
              card.addEventListener("click", () => {
                dispatchTokenToComposer(q.id);
                closePop();
              });
              const em = document.createElement("span");
              setAvatarEl(em, q.emoji, q.name || q.id); // v0.9.14：首字头像
              const g = document.createElement("span");
              g.className = "grow";
              const t1 = document.createElement("div");
              t1.className = "t1";
              t1.textContent = q.name || q.id;
              const t2 = document.createElement("div");
              t2.className = "t2";
              t2.textContent = (q.desc || "").slice(0, 40);
              g.appendChild(t1); g.appendChild(t2);
              card.appendChild(em); card.appendChild(g);
              sqList.appendChild(card);
            }
            sqBd.appendChild(sqList);
          }
        }
        } catch (e) {
          // v0.9.27：数据异常降级空态——面板结构完整可用，只是没内容；
          // 异常对象留在控制台（window.onerror 可观测），不打断渲染
          const errBox = document.createElement("div");
          errBox.className = "ad-fab-empty";
          errBox.textContent = "加载遇到问题，稍后再试";
          body.textContent = "";
          body.appendChild(errBox);
          try { console.warn("[agent-dispatch] renderPop body failed:", e); } catch (e2) {}
        }
        frag.appendChild(body);
        // 底部操作行：主按钮（设置已在头部右上角）
        const foot = document.createElement("div");
        foot.className = "ad-fab-pop-foot";
        const primary = document.createElement("button");
        primary.className = "primary";
        primary.textContent = "打开 Agent 调度面板";
        primary.addEventListener("click", () => {
          if (openAgentPanel) openAgentPanel();
          closePop();
        });
        foot.appendChild(primary);
        frag.appendChild(foot);
        // v0.9.27：原子替换——整段构建成功后才清空旧内容一次性挂入；
        // 中途抛错（head 段以外）已被 try 兜住降级，这里不会执行到半残态
        pop.textContent = "";
        pop.appendChild(frag);
        // v0.9.23：还回滚动位置（重绘前的旧 body 位置）；内容变短时浏览器自动钳制
        if (prevScroll > 0) {
          const nb = pop.querySelector(".ad-fab-pop-body");
          if (nb) nb.scrollTop = prevScroll;
        }
        placePop();
        armOutsideClose(); // v0.8.12：重绘后重新武装点外关闭
      };
      // v0.8.8：悬浮球设置浮层（色调/呼吸/彩色流光三开关，localStorage 持久化）
      const FAB_SET_KEY = "ad-fab-settings";
      // v0.9.3：面板透明度 alpha 与悬浮球透明度 fabAlpha 分离
      // v0.9.3：面板/球透明度分离（面板走 ::before 层 --fab-pop-alpha，球走 --fab-opacity）
      // v0.9.16：recentTtlMin=「最近完成」分区展示时长（分钟），过期条目不再显示（方案D）
      const defaultFabSettings = () => ({ tone: "brand", breathe: true, edge: false, alpha: 85, fabAlpha: 100, recentTtlMin: 30 });
      const readFabSettings = () => {
        try {
          const s = JSON.parse(localStorage.getItem(FAB_SET_KEY) || "null");
          if (s && typeof s === "object") return Object.assign(defaultFabSettings(), s);
        } catch (e) {}
        return defaultFabSettings();
      };
      const applyFabSettings = (s) => {
        // v0.9.5：色调批次换浅色+玻璃；v0.9.12：整球彩色流光已删，只留边缘流光（edge）
        const toneIds = ["brand", "snow", "sky", "mist", "cherry", "apricot", "rainbow", "glass"];
        fab.classList.remove(...toneIds.map((id) => "ad-tone-" + id));
        const tid = toneIds.includes(s.tone) ? s.tone : "brand";
        if (tid !== "brand") fab.classList.add("ad-tone-" + tid);
        fab.classList.toggle("fab-breathe", !!s.breathe);
        fab.classList.toggle("fab-edge", !!s.edge);
        // v0.9.5：同款 || 100 吞 0 修复
        const rawFa = Number(s.fabAlpha);
        const fa = Number.isFinite(rawFa) ? Math.max(0, Math.min(100, rawFa)) : 100;
        fab.style.setProperty("--fab-opacity", String(fa / 100));
      };
      const openFabSettings = () => {
        if (!pop) return;
        popView = "settings"; // v0.8.9：防止异步回调把设置视图覆盖回主视图
        // v0.9.27：同 renderPop 原子化——先构建后替换，中途异常不半残
        const frag = document.createDocumentFragment();
        const cur = readFabSettings();
        // 头部
        const head = document.createElement("div");
        head.className = "ad-fab-pop-head";
        const title = document.createElement("div");
        title.className = "ad-fab-pop-title";
        title.appendChild(document.createTextNode("悬浮球设置"));
        head.appendChild(title);
        const closeBtn = document.createElement("button");
        closeBtn.className = "ad-fab-pop-close";
        closeBtn.textContent = "✕";
        closeBtn.addEventListener("click", closePop);
        head.appendChild(closeBtn);
        frag.appendChild(head);
        const body = document.createElement("div");
        body.className = "ad-fab-pop-body";
        // v0.9.27：设置项构建段包 try——异常降级空态，面板不半残
        try {
        // 色调三选
        const secTone = document.createElement("div");
        secTone.className = "ad-fab-sec";
        secTone.textContent = "色调";
        body.appendChild(secTone);
        const tones = [
          // v0.9.5：浅色批次 + 彩虹 + 毛玻璃无色透明（静态 token，此环境无 color-mix）
          // v0.9.11：雪白置顶
          { id: "snow", label: "雪白", css: ["var(--dsw-static-neutral-00)", "var(--dsw-static-neutral-bluish-100)"] },
          { id: "brand", label: "品牌蓝", css: ["var(--dsw-static-blue-500)", "var(--dsw-static-blue-800)"] },
          { id: "sky", label: "天蓝", css: ["var(--dsw-static-blue-100)", "var(--dsw-static-blue-400)"] },
          { id: "mist", label: "雾紫", css: ["var(--dsw-static-deepseek-100)", "var(--dsw-static-deepseek-450)"] },
          { id: "cherry", label: "樱粉", css: ["var(--dsw-static-red-100)", "var(--dsw-static-red-400)"] },
          { id: "apricot", label: "杏橙", css: ["var(--dsw-static-amber-100)", "var(--dsw-static-amber-400)"] },
          { id: "rainbow", label: "彩色渐变", css: ["var(--dsw-static-red-500)", "var(--dsw-static-blue-500)"] },
          { id: "glass", label: "毛玻璃", css: ["var(--dsw-static-neutral-00)", "var(--dsw-static-neutral-bluish-200)"] },
        ];
        const toneRow = document.createElement("div");
        toneRow.className = "ad-fab-tone-row";
        // v0.9.21：点选只就地翻转 .on 类，不再整体重绘（重绘会丢滚动位置跳回顶部）
        const toneEls = [];
        for (const tn of tones) {
          const t = document.createElement("div");
          t.className = "ad-fab-tone" + (cur.tone === tn.id ? " on" : "");
          t.title = tn.label;
          const dot = document.createElement("span");
          dot.className = "dot";
          dot.style.background = "linear-gradient(135deg," + tn.css[0] + "," + tn.css[1] + ")";
          const lb = document.createElement("span");
          lb.textContent = tn.label;
          t.appendChild(dot); t.appendChild(lb);
          t.addEventListener("click", () => {
            const s = readFabSettings(); s.tone = tn.id;
            try { localStorage.setItem(FAB_SET_KEY, JSON.stringify(s)); } catch (e) {}
            applyFabSettings(s);
            for (const x of toneEls) x.classList.toggle("on", x.dataset.tone === tn.id);
          });
          t.dataset.tone = tn.id;
          toneEls.push(t);
          toneRow.appendChild(t);
        }
        body.appendChild(toneRow);
        // 动效开关：呼吸 / 彩色流光（灰底白球两态一致）
        const mkSwitch = (label, desc, key) => {
          const row = document.createElement("div");
          row.className = "ad-fab-set-row";
          const g = document.createElement("span");
          g.className = "grow";
          const l1 = document.createElement("div");
          l1.className = "t1";
          l1.textContent = label;
          const l2 = document.createElement("div");
          l2.className = "t2";
          l2.textContent = desc;
          g.appendChild(l1); g.appendChild(l2);
          const sw = document.createElement("button");
          sw.className = "ad-switch" + (cur[key] ? " on" : "");
          sw.setAttribute("role", "switch");
          sw.setAttribute("aria-checked", String(!!cur[key]));
          sw.appendChild(document.createElement("span"));
          sw.lastChild.className = "knob";
          sw.addEventListener("click", () => {
            const s = readFabSettings(); s[key] = !s[key];
            try { localStorage.setItem(FAB_SET_KEY, JSON.stringify(s)); } catch (e) {}
            applyFabSettings(s);
            // v0.8.10：knob 即时反馈（on/off 类切换），否则点击后 UI 无变化像没反应
            sw.classList.toggle("on", !!s[key]);
            sw.setAttribute("aria-checked", String(!!s[key]));
          });
          row.appendChild(g); row.appendChild(sw);
          return row;
        };
        body.appendChild(mkSwitch("呼吸光晕", "悬浮球常态呼吸动效", "breathe"));
        // v0.9.12：整球彩色流光已删，只留边缘流光
        body.appendChild(mkSwitch("边缘彩色流光", "仅球边缘彩虹光环流转", "edge"));
        // v0.9.3：面板/悬浮球透明度分离——两个独立滑块
        const mkSlider = (title, sub, key, apply) => {
          const sec = document.createElement("div");
          sec.className = "ad-fab-sec";
          sec.textContent = title;
          body.appendChild(sec);
          const row = document.createElement("div");
          row.className = "ad-fab-set-row";
          const g = document.createElement("span");
          g.className = "grow";
          const l1 = document.createElement("div");
          l1.className = "t1";
          l1.textContent = title;
          const l2 = document.createElement("div");
          l2.className = "t2";
          l2.textContent = sub;
          g.appendChild(l1); g.appendChild(l2);
          const val = document.createElement("span");
          val.className = "ad-fab-alpha-val";
          val.textContent = cur[key] + "%";
          const sl = document.createElement("input");
          sl.type = "range";
          sl.min = "0"; sl.max = "100"; sl.step = "5";
          sl.value = String(cur[key]);
          sl.className = "ad-fab-alpha";
          sl.addEventListener("input", () => {
            const v = Number(sl.value);
            val.textContent = v + "%";
            const s = readFabSettings(); s[key] = v;
            try { localStorage.setItem(FAB_SET_KEY, JSON.stringify(s)); } catch (e) {}
            apply(v);
          });
          row.appendChild(g); row.appendChild(val); row.appendChild(sl);
          body.appendChild(row);
        };
        mkSlider("面板透明度", "0-100，越低越通透", "alpha", (v) => {
          if (pop) pop.style.setProperty("--fab-pop-alpha", String(v / 100));
        });
        mkSlider("悬浮球透明度", "0-100，越低越通透", "fabAlpha", (v) => {
          fab.style.setProperty("--fab-opacity", String(v / 100));
        });
        // v0.9.16：「最近完成」展示时长（方案D）——只展示该时长内的已完成任务，过期自动消失
        const secTtl = document.createElement("div");
        secTtl.className = "ad-fab-sec";
        secTtl.textContent = "最近完成 · 展示时长";
        body.appendChild(secTtl);
        const ttlRow = document.createElement("div");
        ttlRow.className = "ad-fab-modes";
        // v0.9.21：点选只就地翻转 .on 类，不再整体重绘（重绘会丢滚动位置跳回顶部）
        const ttlOpts = [];
        for (const opt of [10, 30, 60]) {
          const o = document.createElement("div");
          o.className = "ad-fab-mode" + ((cur.recentTtlMin || 30) === opt ? " on" : "");
          const dot = document.createElement("span");
          dot.className = "dot";
          const lb = document.createElement("span");
          lb.textContent = opt + " 分钟";
          o.appendChild(dot); o.appendChild(lb);
          o.addEventListener("click", () => {
            const s = readFabSettings(); s.recentTtlMin = opt;
            try { localStorage.setItem(FAB_SET_KEY, JSON.stringify(s)); } catch (e) {}
            for (const t of ttlOpts) t.classList.toggle("on", Number(t.dataset.ttl) === opt);
            loadRecent(); // 立即按新时长重算
          });
          o.dataset.ttl = String(opt);
          ttlOpts.push(o);
          ttlRow.appendChild(o);
        }
        body.appendChild(ttlRow);
        } catch (e) {
          // v0.9.27：设置项异常降级空态，面板结构完整
          const errBox = document.createElement("div");
          errBox.className = "ad-fab-empty";
          errBox.textContent = "设置加载遇到问题，请稍后再试";
          body.textContent = "";
          body.appendChild(errBox);
          try { console.warn("[agent-dispatch] openFabSettings body failed:", e); } catch (e2) {}
        }
        frag.appendChild(body);
        const foot = document.createElement("div");
        foot.className = "ad-fab-pop-foot";
        const back = document.createElement("button");
        back.className = "ghost";
        back.textContent = "← 返回";
        back.addEventListener("click", () => { popView = "main"; renderPop(lastActive); });
        const done = document.createElement("button");
        done.className = "primary";
        done.textContent = "完成";
        done.addEventListener("click", closePop);
        foot.appendChild(back); foot.appendChild(done);
        frag.appendChild(foot);
        // v0.9.27：原子替换——整段构建成功后才清空旧内容一次性挂入
        pop.textContent = "";
        pop.appendChild(frag);
        placePop();
        armOutsideClose(); // v0.8.12：设置视图也支持点外关闭
      };

      // ── 轮询同步：显隐 + 完成检测（集合差：消失的 childId = 刚完成）──
      let prevIds = null;    // 上一轮的活跃 childId 集合（null=尚未初始化，首轮不报完成）
      let doneCount = 0;     // 待展示的完成数
      // v0.9.37：完成光效常驻——不再 5s 自动消散；点击悬浮球后按活跃状态回退
      // v0.9.33：活跃绿点（liveDot/.ad-fab-dot）与完成 ✓N 角标（doneBadge/.ad-fab-done）已删——光效提醒（fab-live 白光呼吸 + done-glow 彩色光呼吸）已足够
      // v0.9.37：状态机——完成=彩色呼吸光常驻；点击后清光：有活跃→fab-live 白光呼吸，无活跃→无动画（初始态）
      // 说明：poll 每 5s 按活跃状态校正（arr.length>0 → 去 done-glow；doneCount>0 且无活跃 → 补 done-glow），
      // 因此 showDoneBadge 只负责挂类，无需自行裁决优先级。
      const showDoneBadge = () => {
        fab.classList.remove("done-glow");
        void fab.offsetWidth; // 强制重排，允许连续完成时重新触发
        fab.classList.add("done-glow");
      };
      // v0.9.37：点击悬浮球（开/关面板）后清完成光效——
      // 有活跃任务时 poll 已挂 fab-live（白光呼吸），无活跃则回到初始态（无动画）
      const clearDoneGlow = () => {
        fab.classList.remove("done-glow");
        doneCount = 0;
      };
      const poll = () => {
        fetch("/agent-api/active")
          .then((r) => r.json())
          .then((d) => {
            if (!d.ok) return;
            const arr = d.active || [];
            lastActive = arr; // v0.8.5.1：缓存供面板打开即时渲染
            const ids = new Set(arr.map((a) => a.childId).filter(Boolean));
            // 完成检测：上轮活跃、本轮消失
            if (prevIds !== null) {
              let finished = 0;
              for (const id of prevIds) if (!ids.has(id)) finished += 1;
              if (finished > 0) { doneCount += finished; showDoneBadge(); }
            }
            prevIds = ids;
            // v0.9.33：活跃绿点已删（光效 fab-live 白光呼吸已是状态指示）
            fab.classList.toggle("fab-live", arr.length > 0);
            // v0.9.37：活跃状态变化后同步光效——完成光让位给白光/恢复（doneCount>0 且无活跃时保持彩色）
            if (arr.length > 0) fab.classList.remove("done-glow");
            else if (doneCount > 0 && !fab.classList.contains("done-glow")) {
              fab.classList.add("done-glow");
            }
            // v0.8 显隐模式：never=永不显示；always=常驻；auto=活跃>0 或有未消散完成徽标时显示（旧行为）
            // v0.9.36：总开关 off 时优先强制隐藏
            const mode = getFabMode();
            if (!isFabVisible() || mode === "never") {
              fab.style.display = "none";
              closePop();
              return;
            }
            const shouldShow = mode === "always" || arr.length > 0 || doneCount > 0;
            fab.style.display = shouldShow ? "grid" : "none";
            if (!shouldShow) closePop();
            else if (popOpen && popView === "main") renderPop(arr);
          })
          .catch(() => {});
      };
      poll();
      const timer = setInterval(poll, 5000);

      return () => {
        clearInterval(timer);
        window.removeEventListener("resize", onResize);
        closePop();
        fab.remove();
      };
    }

    module.exports = {
      name: "@kiligzzz/dsh-agent-dispatch",
      // 0.1.2+ 兼容：客户端服务需在 bundle 内声明 inject（exports.inject，服务名列表）。
      // slots 为 hardDependency，缺失时 loader 抛 "cannot get property slots without inject"。
      inject: ["slots", "locale"],
      apply(ctx) {
        // 0.1.2+ 兼容：官方 slots 服务改为 hardDependency 形态（ctx.slots + inject 声明）。
        // ctx.get("slots") 在 0.1.2 的 fiber 时序下返回 undefined → 整个 client 半静默退出
        // （面板/返回按钮/悬浮球/Agent 菜单全挂，host 半不受影响）。
        const slots = ctx.slots;
        if (!slots) return;
        // 会话跳转：宿主 client runtime sessions.open(id) 支持 listed 会话与 catalog 内子会话
        const sessions = ctx.get("sessions");
        // v0.9.32：childId 归一化——历史/续聊存字符串，运行中条目可能携带对象
        // （startContinuable 返回形态因宿主版本而异：{childId,messageId} 或 {runId,provider,id}）；
        // 统一取字符串 id 再交给 sessions.open，避免类型错误炸掉整个面板。
        const normalizeChildId = (id) => {
          if (id == null) return null;
          if (typeof id === "string") return id;
          if (typeof id === "object") {
            const s = id.id || id.childId || id.runId;
            if (typeof s === "string") return s;
          }
          return null;
        };
        openAgentSession = (id) => {
          const target = normalizeChildId(id);
          if (!target) return;
          if (!sessions || typeof sessions.open !== "function") return;
          const from = captureCurrentSessionTitle(); // v0.9.27：跳前记录出发点
          try { sessions.open(target); } catch (e) { return; /* 目标不在目录（已结束回收等）静默忽略，不压栈 */ }
          if (from) navPush(from);
          ensureChatView(); // v0.9.30：跳后强制回对话页（目标会话可能持久化了其它视图）
        };
        // v0.9.27：返回——弹栈顶标题 → 侧边栏直点；点不到走 sessions.search 兜底
        goBackHandler = () => {
          const title = navPopTitle();
          if (!title) return;
          const clickByTitle = (t) => {
            try {
              const rows = document.querySelectorAll('div[role="treeitem"]');
              for (const r of rows) {
                const te = r.querySelector('[class*="title"]');
                const txt = ((te && te.textContent) || r.textContent || "").trim();
                if (txt === t && r.offsetParent !== null) { r.click(); return true; }
              }
            } catch (e) {}
            return false;
          };
          if (clickByTitle(title)) return;
          // 兜底：目标行未渲染（折叠/未展开分组）→ 搜索拿 id 再 open（search 返回已解包 {items,hasMore} 或错误对象）
          if (sessions && typeof sessions.search === "function") {
            const ac = new AbortController();
            Promise.resolve(sessions.search(title, ac.signal)).then((res) => {
              const items = (res && res.items) || [];
              const hit = items.find((it) => (it.title || "") === title) || items[0];
              if (hit && hit.id) { try { sessions.open(hit.id); } catch (e) {} }
            }).catch(() => {});
            setTimeout(() => { try { ac.abort(); } catch (e) {} }, 4000);
          }
        };
        // v0.8.4：打开「Agent 调度」面板——宿主 view ring 用 only:<active id> 渲染，
        // 无公开切换 API，用 DOM 兜底：找会话头部文本为「Agent 调度」的 tab 按钮点击。
        {
          const tryClick = () => {
            try {
              const btns = document.querySelectorAll("button, [role=tab]");
              for (const b of btns) {
                const t = (b.textContent || "").replace(/\s+/g, " ").trim();
                if (t === "Agent 调度" && b.offsetParent !== null) { b.click(); return true; }
              }
            } catch (e) {}
            return false;
          };
          // 面板 tab 可能尚未渲染（无会话打开时不存在）→ 尝试 + 延迟重试
          openAgentPanel = () => {
            if (tryClick()) return;
            setTimeout(tryClick, 300);
            setTimeout(tryClick, 900);
          };
        }
        // ① 主面板：宿主原生右 tab（conversation.view 槽，与 对话/轨迹/记忆系统 同级）
        slots.inject("conversation.view", () => {
          slots.register({
            name: "conversation.view",
            id: "agent-dispatch",
            order: 21,
            label: () => "Agent 调度",
            inject: () => ({}),
          }, AgentPanel);
        });
        // v0.9.36：Settings 分区（settings.section 槽）已删除——设置页整体移除，
        // 默认模型/数据目录/触发方式 + 悬浮球总开关已迁入主面板「总览」子页顶部
        // ②b v0.9.28：会话头部「← 返回」——挂 conversation.session.header.actions（任何 tab 下可见，
        // 一跳返回跳转前的会话，不必先切到 Agent 调度页再点返回；导航栈空时不渲染）
        slots.inject("conversation.session.header.actions", () => {
          slots.register(
            { name: "conversation.session.header.actions", id: "agent-dispatch-back", order: 10, label: () => "返回" },
            () => React.createElement(HeaderBackButton),
          );
        });
        // ③ 悬浮活动按钮（原生 DOM，不依赖任何槽）
        if (typeof ctx.effect === "function") {
          ctx.effect(() => mountAgentFab(ctx), "agent-dispatch: activity fab");
        } else {
          mountAgentFab(ctx);
        }
        // ④ Agent 直选菜单：宿主 inputTriggers 服务（与斜杠命令同源的官方输入触发机制）。
        //    宿主 detectTrigger 只识别 '@' 与 '/' 两种触发符（'$' 等任意字符注册了也不会被扫描），
        //    因此挂 '/' 组：输入 / 弹候选菜单（命令组之后多一个 "Agent" 组），
        //    选中后把 "$id " 以纯文本插回输入框，用户补任务描述直接发送——
        //    模型按调度策略第 8 条把 $id 识别为指定 Agent 委派。
        //    可选服务：宿主未启用（老版本）时静默跳过，不影响其他功能。
        const inputTriggers = ctx.get("inputTriggers");
        if (inputTriggers && typeof inputTriggers.registerSource === "function") {
          if (typeof ctx.effect === "function") {
            ctx.effect(() => inputTriggers.registerSource({
              trigger: "/",
              order: 10,
              name: "agent",
              candidates: async (session, req) => {
                const q = String((req && req.query) || "").toLowerCase();
                try {
                  const d = await apiGet("/agent-api/suggest?q=" + encodeURIComponent(q));
                  if (!d.ok) return [];
                  const rows = [];
                  for (const a of d.agents || []) {
                    rows.push({ name: a.id, description: (a.emoji ? a.emoji + " " : "") + (a.name || a.id) + (a.desc ? " · " + a.desc : "") });
                  }
                  for (const s of d.squads || []) {
                    rows.push({ name: s.id, description: (s.emoji ? s.emoji + " " : "") + (s.name || s.id) + " · 小队: " + (s.desc || "") });
                  }
                  return rows;
                } catch (e) {
                  return [];
                }
              },
              onPick: (pick) => {
                // 纯文本插入 "$id " 并继续编辑（outcome {text, continue:true} 是宿主支持的形态）
                const id = pick && pick.candidate && pick.candidate.name;
                if (!id) return void 0;
                return { text: "$" + id + " ", continue: true };
              },
            }), "agent-dispatch: $ trigger source");
          }
        }
      },
    };
    return module.exports;
  },
});
