# NodeConsoleApp2-SpineAssets

`NodeConsoleApp2-SpineAssets` 是 `NodeConsoleApp2` 的独立素材制作工程。

它的职责不是实现战斗规则，而是承担以下工作：

1. 读取主游戏工程提供的角色目录
2. 管理 `Spine` 素材工作流
3. 预览和校验导出产物
4. 输出供主工程消费的 `Spine bundle`

当前仓库是独立工程、独立 git，后续可以单独建立远端仓库并独立推进，不依赖主游戏仓库的提交流程。

## 当前阶段

当前仓库已完成：

1. 独立 git 仓库初始化
2. `CODEX_DOC` 文档根建立
3. 输入输出契约初稿建立
4. 最小同步脚手架 `tools/sync_game_catalog.mjs`
5. 首轮自测、验收清单和会话交接文档建立

当前活跃节点：

1. `A2 双仓库协作规则与交付接口`

## 快速开始

1. 复制配置模板：

```bash
cp config/source-project.example.json config/source-project.json
```

2. 执行主工程目录同步：

```bash
npm run sync:catalog
```

3. 产物会写到：

```text
workspace/imports/game_catalog.json
```

说明：

1. `config/source-project.json` 内的相对路径一律相对该配置文件所在目录解析
2. 默认样例会把主工程定位到 `../../NodeConsoleApp2/NodeConsoleApp2`

## 文档入口

1. [工程策略映射](/home/wgw/CodexProject/NodeConsoleApp2-SpineAssets/DOC/CODEX_DOC/00-本地工程策略映射.md)
2. [工程总体分析](/home/wgw/CodexProject/NodeConsoleApp2-SpineAssets/DOC/CODEX_DOC/01_需求分析/00-工程总体分析.md)
3. [总体设计](/home/wgw/CodexProject/NodeConsoleApp2-SpineAssets/DOC/CODEX_DOC/02_设计说明/01-独立素材工程总体设计(spine_assets_architecture)-设计说明.md)
4. [双仓库协作规则](/home/wgw/CodexProject/NodeConsoleApp2-SpineAssets/DOC/CODEX_DOC/02_设计说明/03-双仓库协作模式与接口变更规则(cross_repo_collaboration)-设计说明.md)
5. [A2 研制计划](/home/wgw/CodexProject/NodeConsoleApp2-SpineAssets/DOC/CODEX_DOC/03_研制计划/04-WBS-L2-A2-双仓库协作规则与交付接口-研制计划.md)
5. [首轮自测报告](/home/wgw/CodexProject/NodeConsoleApp2-SpineAssets/DOC/CODEX_DOC/05_测试文档/01_自测报告/2026-04-07-125145-A1-项目底座与契约建立-自测报告.md)

## 目录

- `DOC/CODEX_DOC/`
  - 正式文档
- `config/`
  - 本地源工程配置
- `spec/contracts/`
  - 输入输出契约 schema
- `tools/`
  - 同步与校验工具
- `workspace/imports/`
  - 从主工程导入的目录产物
- `workspace/exports/`
  - 导出给主工程的 bundle
- `workspace/spine_projects/`
  - `Spine` 源工程工作区
- `workspace/preview/`
  - 预览产物
