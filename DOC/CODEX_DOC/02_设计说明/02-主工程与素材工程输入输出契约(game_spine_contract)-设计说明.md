# 主工程与素材工程输入输出契约

## 1. 输入契约

素材工程当前读取：

1. `assets/data/config.json`
2. `assets/data/player.json`
3. `assets/data/enemies.json`

最小输入要求：

1. 必须存在 `contentRegistry.player.path`
2. 必须存在 `contentRegistry.enemies.path`
3. `player.json` 必须提供 `default`
4. `enemies.json` 必须提供对象型 enemy 目录

## 2. 归一化中间产物

当前中间产物：

1. `workspace/imports/game_catalog.json`

用途：

1. 作为素材工程内部统一消费目录
2. 避免每个工具直接耦合主工程原始数据结构

## 3. 输出契约

未来正式输出：

1. `workspace/exports/<bundle>/bundle_manifest.json`
2. `workspace/exports/<bundle>/characters/<presentationId>/character_manifest.json`
3. `workspace/exports/<bundle>/characters/<presentationId>/<presentationId>.skel|json`
4. `workspace/exports/<bundle>/characters/<presentationId>/<presentationId>.atlas`
5. `workspace/exports/<bundle>/characters/<presentationId>/*.png`

## 4. 边界规则

1. 主工程不读取 `Spine` 源工程文件
2. 素材工程不写回主工程玩法数据
3. 两个工程之间通过导入目录和导出目录解耦

## 5. 版本规则

1. `presentation_catalog`、`bundle_manifest`、`character_manifest` 必须带 `schemaVersion`
2. 向前兼容的新增字段，只增加次版本号
3. 字段语义改变、必填项调整、目录结构调整，视为 breaking change，必须升主版本号
4. 发生 breaking change 时，必须在 `NodeConsoleApp2` 与 `NodeConsoleApp2-SpineAssets` 同轮建立 issue 并更新镜像文档

## 6. 样例与 schema 入口

1. schema：
   - `spec/contracts/presentation_catalog.schema.json`
   - `spec/contracts/spine_bundle_manifest.schema.json`
   - `spec/contracts/spine_character_manifest.schema.json`
2. 样例：
   - `spec/examples/presentation_catalog.example.json`
   - `spec/examples/bundle_manifest.example.json`
   - `spec/examples/character_manifest.example.json`
