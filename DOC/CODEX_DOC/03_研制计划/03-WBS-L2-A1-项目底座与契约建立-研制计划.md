# WBS L2：1.1 项目底座建立

## 1. 目标

完成独立素材工程的最小可启动底座。

## 2. 当前状态

1. `已自测`
2. `待人工验收`

## 3. 叶子任务拆分

1. `1.1.1`
   - 独立 git 仓库初始化
   - 状态：`已完成`
2. `1.1.2`
   - `CODEX_DOC` 文档根与本地工程策略映射建立
   - 状态：`已完成`
3. `1.1.3`
   - 素材工程总体设计与输入输出契约建立
   - 状态：`已完成`
4. `1.1.4`
   - 主工程角色目录同步脚手架 `tools/sync_game_catalog.mjs`
   - 状态：`已完成`
5. `1.1.5`
   - 首轮自测、验收清单、会话交接记录建立
   - 状态：`已完成`

## 4. 成果物

1. 本工程能独立运行 `sync:catalog`
2. 可以从主工程读取 `player / enemy` 目录
3. 可以输出统一 `presentation_catalog`
4. 已产出：
   - [工程总体分析](/home/wgw/CodexProject/NodeConsoleApp2-SpineAssets/DOC/CODEX_DOC/01_需求分析/00-工程总体分析.md)
   - [总体设计](/home/wgw/CodexProject/NodeConsoleApp2-SpineAssets/DOC/CODEX_DOC/02_设计说明/01-独立素材工程总体设计(spine_assets_architecture)-设计说明.md)
   - [输入输出契约](/home/wgw/CodexProject/NodeConsoleApp2-SpineAssets/DOC/CODEX_DOC/02_设计说明/02-主工程与素材工程输入输出契约(game_spine_contract)-设计说明.md)
   - [自测报告](/home/wgw/CodexProject/NodeConsoleApp2-SpineAssets/DOC/CODEX_DOC/05_测试文档/01_自测报告/2026-04-07-125145-A1-项目底座与契约建立-自测报告.md)
   - [人工验收清单](/home/wgw/CodexProject/NodeConsoleApp2-SpineAssets/DOC/CODEX_DOC/05_测试文档/02_验收清单/A1-[待验收]-2026-04-07-125145-项目底座与契约建立-人工验收清单.md)
   - [会话交接](/home/wgw/CodexProject/NodeConsoleApp2-SpineAssets/DOC/CODEX_DOC/06_过程文档/01_会话交接/2026-04-07-125145-A1-独立素材工程初始化与契约基线-会话交接.md)

## 5. 验收方法

1. 阅读 [人工验收清单](/home/wgw/CodexProject/NodeConsoleApp2-SpineAssets/DOC/CODEX_DOC/05_测试文档/02_验收清单/A1-[待验收]-2026-04-07-125145-项目底座与契约建立-人工验收清单.md)
2. 按清单执行 `npm test`
3. 按清单执行 `npm run sync:catalog`
4. 检查 `workspace/imports/game_catalog.json` 是否由真实主工程数据生成

## 6. 后续节点

1. `1.2`
   - 双仓库协作与交付接口
2. `2`
   - 样本回归验证
3. `3`
   - 正式生产主线
