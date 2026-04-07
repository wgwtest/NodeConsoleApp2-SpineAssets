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
2. `workspace/exports/<bundle>/<character>.skel|json`
3. `workspace/exports/<bundle>/<character>.atlas`
4. `workspace/exports/<bundle>/*.png`

## 4. 边界规则

1. 主工程不读取 `Spine` 源工程文件
2. 素材工程不写回主工程玩法数据
3. 两个工程之间通过导入目录和导出目录解耦
