# WBS L3：1.2.2 目录清单与交付清单版本化契约

## 1. 工作目标

把共享文件的目录结构、字段语义、版本号和样例固定下来，降低双仓库并行时的接口漂移风险。

## 2. 工作内容

1. 固定 `presentation_catalog` 的字段基线
2. 固定 `bundle_manifest` 与 `character_manifest` 的目录语义
3. 固定 `schemaVersion / bundleVersion` 的版本职责
4. 固定样例文件之间的最小互相引用关系

## 3. 成果物

1. `presentation_catalog` schema 与样例
2. `bundle_manifest` schema 与样例
3. `character_manifest` schema 与样例

## 4. 验收方法

1. 能从样例直接看懂主工程消费什么
2. 能从 schema 直接看懂 breaking change 影响什么

## 5. 当前状态

1. `已自测`
2. `待人工验收`

## 6. 证据链接

1. [A2 自测报告](/home/wgw/CodexProject/NodeConsoleApp2-SpineAssets/DOC/CODEX_DOC/05_测试文档/01_自测报告/2026-04-07-145701-A2-双仓库协作规则与交付接口自测报告.md)
2. [A2.2 人工验收清单](/home/wgw/CodexProject/NodeConsoleApp2-SpineAssets/DOC/CODEX_DOC/05_测试文档/02_验收清单/A2.2-[待验收]-2026-04-07-145701-presentation_catalog与bundle_manifest版本化契约-人工验收清单.md)
3. [A2 会话交接记录](/home/wgw/CodexProject/NodeConsoleApp2-SpineAssets/DOC/CODEX_DOC/06_过程文档/01_会话交接/2026-04-07-145701-A2-双仓库协作规则与交付接口实现与自测记录.md)
