# C1 Request-Driven Spine Production Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first formal `request -> package -> export` production slice for `NodeConsoleApp2-SpineAssets`, including request/package contracts, multi-variant manifest support, and a minimal request-driven build/validate chain.

**Architecture:** Keep the production flow split into four filesystem-driven stages: `workspace/requests` for copied source intake, `workspace/packages` for internal normalized intermediate state, `workspace/exports` for consumer-facing delivery, and `workspace/preview` for evidence outputs. Preserve the existing `B1` sample workflow as a regression baseline, but implement all new logic in dedicated request-driven tools rather than extending the B1 scripts.

**Tech Stack:** Node.js ESM, `node:test`, JSON schema contracts under `spec/contracts/`, example fixtures under `spec/examples/`, filesystem-based tooling under `tools/`

---

### Task 1: Sync local WBS and repo entrypoints to the new C/D split

**Files:**
- Modify: `README.md`
- Modify: `DOC/CODEX_DOC/README.md`
- Modify: `DOC/CODEX_DOC/03_研制计划/README.md`
- Modify: `DOC/CODEX_DOC/03_研制计划/01-WBS-L0-NodeConsoleApp2-SpineAssets-研发总纲-研制计划.md`
- Create: `DOC/CODEX_DOC/03_研制计划/09-WBS-L1-阶段C-角色请求目录驱动的Spine素材生产链-研制计划.md`
- Create: `DOC/CODEX_DOC/03_研制计划/10-WBS-L2-C1-request输入契约、package中间态与多variant交付规范-研制计划.md`
- Create: `DOC/CODEX_DOC/03_研制计划/11-WBS-L3-C1.1-character_request与package中间态契约-研制计划.md`
- Create: `DOC/CODEX_DOC/03_研制计划/12-WBS-L3-C1.2-多variant-character_manifest与request-driven生成校验链-研制计划.md`
- Create: `DOC/CODEX_DOC/03_研制计划/13-WBS-L1-阶段D-主工程接入与交付收口-研制计划.md`
- Create: `DOC/CODEX_DOC/03_研制计划/14-WBS-L2-D1-主工程导入接入与bundle交付规范-研制计划.md`

- [ ] **Step 1: Rewrite the stale C/D narrative**

```md
1. Phase C becomes the formal request-driven production line
2. B1 remains a regression baseline only
3. Phase D is deferred consumer integration
```

- [ ] **Step 2: Verify the old active-node wording is gone**

Run: `rg -n "当前活跃节点|下一建议执行节点|阶段C 主工程|C1 主工程" README.md DOC/CODEX_DOC`
Expected: only the new `request-driven` wording remains

- [ ] **Step 3: Commit**

```bash
git add README.md DOC/CODEX_DOC
git commit -m "docs: align local WBS with request-driven mainline"
```

### Task 2: Add request/package contracts and red tests

**Files:**
- Create: `spec/contracts/character_request.schema.json`
- Create: `spec/contracts/spine_package_manifest.schema.json`
- Create: `spec/contracts/spine_variant_manifest.schema.json`
- Create: `spec/examples/character_request.example.json`
- Create: `spec/examples/package_manifest.example.json`
- Create: `spec/examples/variant.example.json`
- Create: `tools/request_pipeline.test.mjs`
- Modify: `package.json`

- [ ] **Step 1: Write the failing request/package tests**

```js
test('validateCharacterRequest 接受最小 request fixture', async () => {
  const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'request-fixture-'));
  const requestRoot = await writeRequestFixture(tmpRoot);
  const report = await validateCharacterRequest({ requestRoot });
  assert.equal(report.ok, true);
  assert.equal(report.presentationId, 'hero_knight');
});

test('validateSpinePackage 拒绝缺失 variant 的 package', async () => {
  const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'package-fixture-'));
  const packageRoot = await writeBrokenPackageFixture(tmpRoot);
  await assert.rejects(() => validateSpinePackage({ packageRoot }), /variant/i);
});
```

- [ ] **Step 2: Run the new test file and confirm it fails**

Run: `node --test tools/request_pipeline.test.mjs`
Expected: FAIL with missing validator imports or missing schemas

- [ ] **Step 3: Add the formal contract files**

```json
{
  "schemaVersion": "character_request_v1",
  "characterRequestId": "req_hero_knight_v001",
  "presentationId": "hero_knight",
  "bundleTarget": "main_cast",
  "variants": [
    { "variantId": "default", "label": "Default", "skin": "default" }
  ],
  "requiredActions": ["idle", "attack"],
  "requiredSlots": ["weapon", "head"]
}
```

- [ ] **Step 4: Add script placeholders for the later pipeline**

```json
{
  "scripts": {
    "requests:validate": "node tools/validate_character_request.mjs",
    "packages:validate": "node tools/validate_spine_package.mjs"
  }
}
```

- [ ] **Step 5: Re-run the test and confirm the failure is now specific**

Run: `node --test tools/request_pipeline.test.mjs`
Expected: FAIL inside request/package validation logic, not because files are missing from the test harness

- [ ] **Step 6: Commit**

```bash
git add package.json spec/contracts spec/examples tools/request_pipeline.test.mjs
git commit -m "test: add request and package contract red tests"
```

### Task 3: Implement request/package validators and tracked workspace roots

**Files:**
- Create: `tools/validate_character_request.mjs`
- Create: `tools/validate_spine_package.mjs`
- Create: `workspace/requests/.gitkeep`
- Create: `workspace/packages/.gitkeep`
- Modify: `tools/request_pipeline.test.mjs`

- [ ] **Step 1: Implement the request validator**

```js
export async function validateCharacterRequest({ requestRoot }) {
  const request = await readJson(path.join(requestRoot, 'request.json'));
  assertRequiredString(request.presentationId, 'request.presentationId');
  assertRequiredArray(request.variants, 'request.variants');
  await assertDirectory(path.join(requestRoot, 'art'));
  return {
    ok: true,
    characterRequestId: request.characterRequestId,
    presentationId: request.presentationId,
    variantCount: request.variants.length
  };
}
```

- [ ] **Step 2: Implement the package validator**

```js
export async function validateSpinePackage({ packageRoot }) {
  const manifest = await readJson(path.join(packageRoot, 'package_manifest.json'));
  for (const variantId of manifest.variantIds) {
    const variantPath = path.join(packageRoot, 'variants', variantId, 'variant.json');
    const variant = await readJson(variantPath);
    assertRequiredString(variant.skin, `variant.${variantId}.skin`);
  }
  return { ok: true, presentationId: manifest.presentationId };
}
```

- [ ] **Step 3: Run the targeted tests**

Run: `node --test tools/request_pipeline.test.mjs`
Expected: PASS for request/package validation cases, FAIL for export or manifest-v2 cases

- [ ] **Step 4: Commit**

```bash
git add tools/validate_character_request.mjs tools/validate_spine_package.mjs tools/request_pipeline.test.mjs workspace/requests/.gitkeep workspace/packages/.gitkeep
git commit -m "feat: validate request and package contracts"
```

### Task 4: Upgrade character manifest to multi-variant v2

**Files:**
- Modify: `spec/contracts/spine_character_manifest.schema.json`
- Modify: `spec/examples/character_manifest.example.json`
- Modify: `tools/validate_sample_bundle.mjs`
- Modify: `tools/request_pipeline.test.mjs`

- [ ] **Step 1: Add the failing manifest-v2 tests**

```js
test('character manifest v2 支持同一 presentationId 下多个 variant', async () => {
  const manifest = readManifestFixture();
  assert.equal(manifest.schemaVersion, 'spine_character_manifest_v2');
  assert.equal(manifest.defaultVariantId, 'default');
  assert.equal(manifest.variants.length, 2);
});
```

- [ ] **Step 2: Run the tests to confirm the current v1 shape fails**

Run: `node --test tools/request_pipeline.test.mjs tools/b1_official_bundle.test.mjs`
Expected: FAIL because the old character manifest schema requires `defaultSkin` and does not understand `variants`

- [ ] **Step 3: Replace the schema with a backward-aware v2 shape**

```json
{
  "required": [
    "schemaVersion",
    "presentationId",
    "skeletonFile",
    "atlasFile",
    "texturePages",
    "animations",
    "slots",
    "anchorProfile",
    "scaleProfile",
    "defaultVariantId",
    "variants"
  ]
}
```

- [ ] **Step 4: Update the bundle validator to accept v2 manifests**

```js
assertRequiredString(manifest.defaultVariantId, 'character_manifest.defaultVariantId');
assertRequiredArray(manifest.variants, 'character_manifest.variants');
for (const variant of manifest.variants) {
  assertRequiredString(variant.variantId, 'character_manifest.variants[].variantId');
  assertRequiredString(variant.skin, 'character_manifest.variants[].skin');
}
```

- [ ] **Step 5: Run the targeted tests**

Run: `node --test tools/request_pipeline.test.mjs tools/b1_official_bundle.test.mjs`
Expected: PASS for schema and validator coverage, with B1 still accepted after adapting its generated manifests

- [ ] **Step 6: Commit**

```bash
git add spec/contracts/spine_character_manifest.schema.json spec/examples/character_manifest.example.json tools/validate_sample_bundle.mjs tools/request_pipeline.test.mjs tools/b1_official_bundle.test.mjs
git commit -m "feat: upgrade character manifest to multi-variant v2"
```

### Task 5: Build and validate the minimal request-driven export slice

**Files:**
- Create: `tools/build_request_bundle.mjs`
- Create: `tools/validate_request_bundle.mjs`
- Modify: `package.json`
- Modify: `tools/request_pipeline.test.mjs`
- Modify: `README.md`

- [ ] **Step 1: Add the failing export-build tests**

```js
test('buildRequestBundle 从 package 生成正式 export', async () => {
  const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'request-build-'));
  const packageRoot = await writePackageFixture(tmpRoot);
  const exportRoot = path.join(tmpRoot, 'workspace', 'exports', 'main_cast');

  const result = await buildRequestBundle({
    packageRoot,
    outputRoot: exportRoot,
    bundleId: 'main_cast'
  });

  assert.equal(result.bundle.characters.length, 1);
  assert.equal(result.character.manifest.variants.length, 2);
});
```

- [ ] **Step 2: Run the tests to confirm the builder is missing**

Run: `node --test tools/request_pipeline.test.mjs`
Expected: FAIL with missing `buildRequestBundle` or `validateRequestBundle`

- [ ] **Step 3: Implement the export builder**

```js
export async function buildRequestBundle({ packageRoot, outputRoot, bundleId, bundleVersion = '0.1.0' }) {
  const pkg = await validateSpinePackage({ packageRoot });
  const characterDir = path.join(outputRoot, 'characters', pkg.presentationId);
  await fs.mkdir(characterDir, { recursive: true });
  await fs.writeFile(path.join(characterDir, 'character_manifest.json'), JSON.stringify(pkg.characterManifest, null, 2));
  return { bundle, character };
}
```

- [ ] **Step 4: Implement the export validator and scripts**

```json
{
  "scripts": {
    "requests:validate": "node tools/validate_character_request.mjs",
    "packages:validate": "node tools/validate_spine_package.mjs",
    "exports:build": "node tools/build_request_bundle.mjs",
    "exports:validate": "node tools/validate_request_bundle.mjs"
  }
}
```

- [ ] **Step 5: Run the full test matrix**

Run: `npm test`
Expected: PASS for `B1` regression tests and the new request-driven pipeline tests

- [ ] **Step 6: Commit**

```bash
git add package.json tools/build_request_bundle.mjs tools/validate_request_bundle.mjs tools/request_pipeline.test.mjs README.md
git commit -m "feat: add minimal request-driven export pipeline"
```
