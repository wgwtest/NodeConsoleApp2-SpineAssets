# Spine导出bundle交付契约

## 1. 交付目录

标准导出目录：

1. `workspace/exports/<bundle>/bundle_manifest.json`
2. `workspace/exports/<bundle>/characters/<presentationId>/character_manifest.json`
3. `workspace/exports/<bundle>/characters/<presentationId>/<presentationId>.skel|json`
4. `workspace/exports/<bundle>/characters/<presentationId>/<presentationId>.atlas`
5. `workspace/exports/<bundle>/characters/<presentationId>/*.png`

## 2. bundle_manifest 职责

`bundle_manifest.json` 负责回答“这个 bundle 提供了哪些角色、版本是什么、每个角色的 manifest 在哪里”。

必须包含：

1. `schemaVersion`
2. `bundleId`
3. `bundleVersion`
4. `generatedAt`
5. `sourceCatalog`
6. `characters[]`

## 3. character_manifest 职责

`character_manifest.json` 负责回答“单个角色有哪些可被主工程消费的表现资源”。

必须包含：

1. `schemaVersion`
2. `presentationId`
3. `skeletonFile`
4. `atlasFile`
5. `texturePages`
6. `defaultSkin`
7. `animations`
8. `slots`
9. `anchorProfile`
10. `scaleProfile`

## 4. 命名规则

1. 目录名使用 `presentationId`
2. 骨骼文件与 atlas 文件默认以 `presentationId` 命名
3. 动画名、槽位名一旦交付给主工程，即进入共享契约，不允许静默改名

## 5. 版本规则

1. `bundleVersion` 是素材包版本
2. `schemaVersion` 是文件结构版本
3. `bundleVersion` 可递增发布而不改变结构
4. `schemaVersion` 改变表示消费者侧可能需要调整

## 6. 样例入口

1. `spec/examples/bundle_manifest.example.json`
2. `spec/examples/character_manifest.example.json`
3. `spec/contracts/spine_bundle_manifest.schema.json`
4. `spec/contracts/spine_character_manifest.schema.json`
