# WBS L2：A2 双仓库协作规则与交付接口

## 1. 目标

让 `NodeConsoleApp2` 与 `NodeConsoleApp2-SpineAssets` 在不共享同一会话上下文的前提下，也能围绕同一份接口和协作规则独立推进。

## 2. 叶子任务

1. `A2.1`
   - 双仓库协作模式与变更流程
2. `A2.2`
   - `presentation_catalog / bundle_manifest / character_manifest` 版本化契约

## 3. 成果物

1. [03-双仓库协作模式与接口变更规则(cross_repo_collaboration)-设计说明](/home/wgw/CodexProject/NodeConsoleApp2-SpineAssets/DOC/CODEX_DOC/02_设计说明/03-双仓库协作模式与接口变更规则(cross_repo_collaboration)-设计说明.md)
2. [04-Spine导出bundle交付契约(spine_bundle_delivery)-设计说明](/home/wgw/CodexProject/NodeConsoleApp2-SpineAssets/DOC/CODEX_DOC/02_设计说明/04-Spine导出bundle交付契约(spine_bundle_delivery)-设计说明.md)
3. `spec/contracts/*.schema.json`
4. `spec/examples/*.example.json`

## 4. 验收方法

1. 检查两个仓库是否都有镜像协作文档
2. 检查 `schemaVersion`、breaking change、目录结构和角色资源命名规则是否被写清
3. 检查 GitHub Issue / Project 是否存在对应层级节点

## 5. 当前状态

1. `已自测`
2. `待人工验收`

## 6. 证据链接

1. [A2 自测报告](/home/wgw/CodexProject/NodeConsoleApp2-SpineAssets/DOC/CODEX_DOC/05_测试文档/01_自测报告/2026-04-07-145701-A2-双仓库协作规则与交付接口自测报告.md)
2. [A2.1 人工验收清单](/home/wgw/CodexProject/NodeConsoleApp2-SpineAssets/DOC/CODEX_DOC/05_测试文档/02_验收清单/A2.1-[待验收]-2026-04-07-145701-双仓库协作模式与变更流程-人工验收清单.md)
3. [A2.2 人工验收清单](/home/wgw/CodexProject/NodeConsoleApp2-SpineAssets/DOC/CODEX_DOC/05_测试文档/02_验收清单/A2.2-[待验收]-2026-04-07-145701-presentation_catalog与bundle_manifest版本化契约-人工验收清单.md)
4. [A2 会话交接记录](/home/wgw/CodexProject/NodeConsoleApp2-SpineAssets/DOC/CODEX_DOC/06_过程文档/01_会话交接/2026-04-07-145701-A2-双仓库协作规则与交付接口实现与自测记录.md)
