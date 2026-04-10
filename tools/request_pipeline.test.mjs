import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import {
  validateCharacterRequest,
  validateCharacterRequestCollection
} from './validate_character_request.mjs';
import { buildBlackboxJobs } from './build_blackbox_jobs.mjs';
import { runBlackboxJobs } from './run_blackbox_jobs.mjs';
import { collectBlackboxResults } from './collect_blackbox_results.mjs';
import { buildRequestPackage } from './build_request_package.mjs';
import { buildPackagePreview } from './build_package_preview.mjs';
import {
  validateSpinePackage,
  validateSpinePackageCollection
} from './validate_spine_package.mjs';
import { buildRequestBundle } from './build_request_bundle.mjs';
import { validateRequestBundle } from './validate_request_bundle.mjs';
import { buildRequestPreview } from './build_request_preview.mjs';

const VISUAL_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVR42mP8z/CfAQgwgImBASwAFA8CArTsyugAAAAASUVORK5CYII=';

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(value, null, 2), 'utf8');
}

async function writeFile(filePath, content = 'fixture') {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, 'utf8');
}

async function writeBinaryFile(filePath, base64) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, Buffer.from(base64, 'base64'));
}

async function writeRequestFixture(rootDir) {
  const requestRoot = path.join(rootDir, 'workspace', 'requests', 'req_hero_knight_v001');
  await writeJson(path.join(requestRoot, 'request.json'), {
    schemaVersion: 'character_request_v1',
    characterRequestId: 'req_hero_knight_v001',
    presentationId: 'hero_knight',
    title: 'Hero Knight',
    description: 'Frontline swordsman',
    bundleTarget: 'main_cast',
    variants: [
      {
        variantId: 'default',
        label: 'Default',
        skin: 'default'
      },
      {
        variantId: 'winter',
        label: 'Winter Cloak',
        skin: 'winter'
      }
    ],
    requiredActions: ['idle', 'attack'],
    requiredSlots: ['weapon', 'head']
  });
  await writeFile(path.join(requestRoot, 'art', 'concept.txt'));
  await writeFile(path.join(requestRoot, 'notes', 'rig_notes.md'));
  await writeFile(path.join(requestRoot, 'refs', 'moodboard.txt'));
  return requestRoot;
}

async function writeVisualRequestFixture(rootDir) {
  const requestRoot = path.join(rootDir, 'workspace', 'requests', 'req_shieldmaiden_demo_v001');
  await writeJson(path.join(requestRoot, 'request.json'), {
    schemaVersion: 'character_request_v1',
    characterRequestId: 'req_shieldmaiden_demo_v001',
    presentationId: 'shieldmaiden_demo',
    title: 'Shieldmaiden Demo',
    description: 'Cartoon female warrior demo request with a visible PNG source.',
    bundleTarget: 'main_cast',
    variants: [
      {
        variantId: 'default',
        label: 'Default',
        skin: 'default'
      }
    ],
    requiredActions: ['idle'],
    requiredSlots: ['weapon', 'head']
  });
  await writeBinaryFile(path.join(requestRoot, 'art', 'female_warrior.png'), VISUAL_PNG_BASE64);
  await writeFile(path.join(requestRoot, 'notes', 'brief.md'), 'female warrior demo');
  await writeFile(path.join(requestRoot, 'refs', 'attribution.md'), 'OpenGameArt attribution');
  return requestRoot;
}

async function prepareCollectedPackages(rootDir, requestsRoot, packagesRoot) {
  const jobsRoot = path.join(rootDir, 'workspace', 'blackbox_jobs');
  await buildBlackboxJobs({
    requestsRoot,
    outputRoot: jobsRoot,
    providerType: 'cloud_stub',
    providerName: 'openai_cloud_stub'
  });
  await runBlackboxJobs({ jobsRoot });
  await collectBlackboxResults({
    requestsRoot,
    jobsRoot,
    packagesRoot
  });
  return jobsRoot;
}

async function writePackageFixture(rootDir) {
  const packageRoot = path.join(rootDir, 'workspace', 'packages', 'hero_knight');
  await writeJson(path.join(packageRoot, 'package_manifest.json'), {
    schemaVersion: 'spine_package_manifest_v1',
    presentationId: 'hero_knight',
    characterRequestId: 'req_hero_knight_v001',
    bundleTarget: 'main_cast',
    sourceRequestDir: 'source',
    requestSnapshotFile: 'source/request_snapshot.json',
    defaultVariantId: 'default',
    variantIds: ['default', 'winter'],
    exportableVariantIds: ['default', 'winter'],
    componentsDir: 'components',
    spineDir: 'spine',
    skeletonFile: 'hero_knight.json',
    atlasFile: 'hero_knight.atlas',
    texturePages: ['hero_knight.png'],
    anchorProfile: {
      x: 0.5,
      y: 1
    },
    scaleProfile: {
      baseScale: 1
    }
  });
  await writeJson(path.join(packageRoot, 'variants', 'default', 'variant.json'), {
    schemaVersion: 'spine_variant_manifest_v1',
    presentationId: 'hero_knight',
    variantId: 'default',
    label: 'Default',
    skin: 'default',
    enabled: true,
    allowedAnimations: ['idle', 'attack'],
    requiredComponents: ['slot_weapon', 'slot_head'],
    notes: 'Base combat loadout',
    resourceOverrides: {},
    source: {
      blackboxVariantPlan: 'blackbox/variant_plan.json'
    }
  });
  await writeJson(path.join(packageRoot, 'variants', 'winter', 'variant.json'), {
    schemaVersion: 'spine_variant_manifest_v1',
    presentationId: 'hero_knight',
    variantId: 'winter',
    label: 'Winter Cloak',
    skin: 'winter',
    enabled: true,
    allowedAnimations: ['idle', 'attack'],
    requiredComponents: ['slot_weapon'],
    notes: 'Adds cloak silhouette and keeps only the sword component active',
    resourceOverrides: {
      palette: 'winter'
    },
    source: {
      blackboxVariantPlan: 'blackbox/variant_plan.json'
    }
  });
  await writeJson(path.join(packageRoot, 'source', 'request_snapshot.json'), {
    characterRequestId: 'req_hero_knight_v001',
    presentationId: 'hero_knight',
    title: 'Hero Knight',
    description: 'Frontline swordsman',
    bundleTarget: 'main_cast',
    artFiles: ['art/concept.txt'],
    noteFiles: ['notes/rig_notes.md'],
    refFiles: ['refs/moodboard.txt']
  });
  await writeFile(path.join(packageRoot, 'source', 'art', 'concept.txt'));
  await writeFile(path.join(packageRoot, 'source', 'notes', 'rig_notes.md'));
  await writeFile(path.join(packageRoot, 'source', 'refs', 'moodboard.txt'));
  await writeJson(path.join(packageRoot, 'components', 'slot_weapon', 'descriptor.json'), {
    schemaVersion: 'spine_component_descriptor_v1',
    presentationId: 'hero_knight',
    componentId: 'slot_weapon',
    slotName: 'weapon',
    status: 'ready',
    sourceFiles: ['art/concept.txt', 'notes/rig_notes.md', 'refs/moodboard.txt'],
    artifactFiles: ['components/slot_weapon/render.png'],
    blackboxJobId: 'hero_knight__req_hero_knight_v001',
    providerType: 'cloud_stub',
    providerName: 'openai_cloud_stub',
    readiness: 'ready',
    reviewStatus: 'unreviewed',
    evidenceFiles: ['evidence/provider_report.json']
  });
  await writeFile(path.join(packageRoot, 'components', 'slot_weapon', 'render.png'));
  await writeJson(path.join(packageRoot, 'components', 'slot_head', 'descriptor.json'), {
    schemaVersion: 'spine_component_descriptor_v1',
    presentationId: 'hero_knight',
    componentId: 'slot_head',
    slotName: 'head',
    status: 'ready',
    sourceFiles: ['art/concept.txt', 'notes/rig_notes.md', 'refs/moodboard.txt'],
    artifactFiles: ['components/slot_head/render.png'],
    blackboxJobId: 'hero_knight__req_hero_knight_v001',
    providerType: 'cloud_stub',
    providerName: 'openai_cloud_stub',
    readiness: 'ready',
    reviewStatus: 'unreviewed',
    evidenceFiles: ['evidence/provider_report.json']
  });
  await writeFile(path.join(packageRoot, 'components', 'slot_head', 'render.png'));
  await writeJson(path.join(packageRoot, 'evidence', 'provider_report.json'), {
    schemaVersion: 'blackbox_provider_report_v1',
    jobId: 'hero_knight__req_hero_knight_v001',
    providerType: 'cloud_stub',
    providerName: 'openai_cloud_stub',
    usedCloud: false
  });
  await writeJson(path.join(packageRoot, 'spine', 'hero_knight.json'), {
    skeleton: {
      spine: '4.2.22'
    },
    slots: [{ name: 'weapon' }, { name: 'head' }],
    skins: [{ name: 'default' }, { name: 'winter' }],
    animations: {
      idle: {},
      attack: {},
      cheer: {}
    }
  });
  await writeFile(
    path.join(packageRoot, 'spine', 'hero_knight.atlas'),
    'hero_knight.png\nsize: 256,256\nformat: RGBA8888\n'
  );
  await fs.writeFile(
    path.join(packageRoot, 'spine', 'hero_knight.png'),
    Buffer.from('hero-knight-png')
  );
  return packageRoot;
}

test('validateCharacterRequest 接受最小 request fixture', async () => {
  const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'request-fixture-'));
  const requestRoot = await writeRequestFixture(tmpRoot);

  const report = await validateCharacterRequest({ requestRoot });

  assert.equal(report.ok, true);
  assert.equal(report.characterRequestId, 'req_hero_knight_v001');
  assert.equal(report.presentationId, 'hero_knight');
  assert.equal(report.variantCount, 2);
});

test('validateCharacterRequestCollection 可以遍历 requests 根目录', async () => {
  const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'request-collection-'));
  await writeRequestFixture(tmpRoot);

  const reports = await validateCharacterRequestCollection({
    requestsRoot: path.join(tmpRoot, 'workspace', 'requests')
  });

  assert.equal(reports.length, 1);
  assert.equal(reports[0].presentationId, 'hero_knight');
});

test('buildRequestPackage 从 requests 根目录生成最小 package 骨架，但未收口前不能通过严格校验', async () => {
  const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'request-package-build-'));
  await writeRequestFixture(tmpRoot);
  const requestsRoot = path.join(tmpRoot, 'workspace', 'requests');
  const packagesRoot = path.join(tmpRoot, 'workspace', 'packages');

  const result = await buildRequestPackage({
    requestsRoot,
    outputRoot: packagesRoot
  });

  assert.equal(result.packages.length, 1);
  assert.equal(result.packages[0].presentationId, 'hero_knight');
  assert.equal(result.packages[0].defaultVariantId, 'default');

  const packageRoot = path.join(packagesRoot, 'hero_knight');
  await assert.rejects(
    () => validateSpinePackage({ packageRoot }),
    /blackboxJobId|readiness|evidenceFiles/
  );

  const packageManifest = JSON.parse(
    await fs.readFile(path.join(packageRoot, 'package_manifest.json'), 'utf8')
  );
  assert.equal(packageManifest.bundleTarget, 'main_cast');
  assert.deepEqual(packageManifest.variantIds, ['default', 'winter']);
  assert.equal(packageManifest.sourceRequestDir, 'source');
  assert.equal(packageManifest.requestSnapshotFile, 'source/request_snapshot.json');

  const winterVariant = JSON.parse(
    await fs.readFile(path.join(packageRoot, 'variants', 'winter', 'variant.json'), 'utf8')
  );
  assert.equal(winterVariant.skin, 'winter');
  assert.deepEqual(winterVariant.allowedAnimations, ['idle', 'attack']);

  const requestSnapshot = JSON.parse(
    await fs.readFile(path.join(packageRoot, 'source', 'request_snapshot.json'), 'utf8')
  );
  assert.equal(requestSnapshot.characterRequestId, 'req_hero_knight_v001');
  assert.deepEqual(requestSnapshot.artFiles, ['art/concept.txt']);
  assert.deepEqual(requestSnapshot.noteFiles, ['notes/rig_notes.md']);
  assert.deepEqual(requestSnapshot.refFiles, ['refs/moodboard.txt']);

  const weaponDescriptor = JSON.parse(
    await fs.readFile(
      path.join(packageRoot, 'components', 'slot_weapon', 'descriptor.json'),
      'utf8'
    )
  );
  assert.equal(weaponDescriptor.schemaVersion, 'spine_component_descriptor_v1');
  assert.equal(weaponDescriptor.componentId, 'slot_weapon');
  assert.equal(weaponDescriptor.slotName, 'weapon');
  assert.equal(weaponDescriptor.status, 'pending_blackbox');
  assert.equal(weaponDescriptor.readiness, 'missing');
  assert.equal(weaponDescriptor.reviewStatus, 'unreviewed');
  assert.deepEqual(weaponDescriptor.sourceFiles, [
    'art/concept.txt',
    'notes/rig_notes.md',
    'refs/moodboard.txt'
  ]);
  assert.deepEqual(weaponDescriptor.artifactFiles, []);
  assert.deepEqual(weaponDescriptor.evidenceFiles, []);

  assert.equal(
    await fs
      .access(path.join(packageRoot, 'source', 'art', 'concept.txt'))
      .then(() => true)
      .catch(() => false),
    true
  );
  assert.equal(
    await fs
      .access(path.join(packageRoot, 'source', 'notes', 'rig_notes.md'))
      .then(() => true)
      .catch(() => false),
    true
  );
  assert.equal(
    await fs
      .access(path.join(packageRoot, 'source', 'refs', 'moodboard.txt'))
      .then(() => true)
      .catch(() => false),
    true
  );
});

test('buildRequestPackage 当 request 含 PNG 原画时仍保持待黑盒加工，但保留真实预览纹理', async () => {
  const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'visual-request-package-build-'));
  const requestRoot = await writeVisualRequestFixture(tmpRoot);
  const requestsRoot = path.join(tmpRoot, 'workspace', 'requests');
  const packagesRoot = path.join(tmpRoot, 'workspace', 'packages');

  await buildRequestPackage({
    requestsRoot,
    outputRoot: packagesRoot
  });

  const packageRoot = path.join(packagesRoot, 'shieldmaiden_demo');
  const descriptor = JSON.parse(
    await fs.readFile(
      path.join(packageRoot, 'components', 'slot_weapon', 'descriptor.json'),
      'utf8'
    )
  );
  assert.equal(descriptor.status, 'pending_blackbox');
  assert.equal(descriptor.readiness, 'missing');
  assert.deepEqual(descriptor.artifactFiles, []);

  const sourcePng = await fs.readFile(path.join(requestRoot, 'art', 'female_warrior.png'));
  const texturePng = await fs.readFile(path.join(packageRoot, 'spine', 'shieldmaiden_demo.png'));

  assert.deepEqual(texturePng, sourcePng);
  assert.equal(
    await fs
      .access(path.join(packageRoot, 'components', 'slot_weapon', 'render.png'))
      .then(() => true)
      .catch(() => false),
    false
  );
});

test('buildRequestPackage 会清理已从 requests 中移除的旧 package', async () => {
  const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'request-package-prune-'));
  await writeRequestFixture(tmpRoot);
  await writeVisualRequestFixture(tmpRoot);
  const requestsRoot = path.join(tmpRoot, 'workspace', 'requests');
  const packagesRoot = path.join(tmpRoot, 'workspace', 'packages');

  const firstBuild = await buildRequestPackage({
    requestsRoot,
    outputRoot: packagesRoot
  });
  assert.equal(firstBuild.packages.length, 2);

  await fs.rm(path.join(requestsRoot, 'req_hero_knight_v001'), { recursive: true, force: true });

  const secondBuild = await buildRequestPackage({
    requestsRoot,
    outputRoot: packagesRoot
  });

  assert.equal(secondBuild.packages.length, 1);
  assert.deepEqual(
    secondBuild.packages.map(item => item.presentationId),
    ['shieldmaiden_demo']
  );
  assert.equal(
    await fs
      .access(path.join(packagesRoot, 'hero_knight'))
      .then(() => true)
      .catch(() => false),
    false
  );
  assert.equal(
    await fs
      .access(path.join(packagesRoot, 'shieldmaiden_demo'))
      .then(() => true)
      .catch(() => false),
    true
  );
});

test('buildPackagePreview 生成 package 中间态预览页与报告', async () => {
  const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'package-preview-'));
  await writeRequestFixture(tmpRoot);
  const requestsRoot = path.join(tmpRoot, 'workspace', 'requests');
  const packagesRoot = path.join(tmpRoot, 'workspace', 'packages');
  const previewRoot = path.join(tmpRoot, 'workspace', 'preview', 'packages');

  await buildRequestPackage({
    requestsRoot,
    outputRoot: packagesRoot
  });

  const preview = await buildPackagePreview({
    packagesRoot,
    outputRoot: previewRoot
  });

  assert.match(preview.html, /hero_knight/);
  assert.match(preview.html, /concept\.txt/);
  assert.match(preview.html, /slot_weapon/);
  assert.match(preview.html, /待黑盒加工/);
  assert.match(preview.html, /winter/);
  assert.match(preview.html, /中间态预览/);
  assert.match(preview.html, /请求快照/);
  assert.match(preview.html, /组件/);
  assert.equal(preview.report.packages.length, 1);
  assert.equal(preview.report.packages[0].requestSnapshot.characterRequestId, 'req_hero_knight_v001');
  assert.equal(preview.report.packages[0].components[0].status, 'pending_blackbox');
  assert.equal(
    await fs
      .access(path.join(previewRoot, 'index.html'))
      .then(() => true)
      .catch(() => false),
    true
  );
  assert.equal(
    await fs
      .access(path.join(previewRoot, 'report.json'))
      .then(() => true)
      .catch(() => false),
    true
  );
  assert.equal(
    await fs
      .access(path.join(previewRoot, 'assets', 'hero_knight.png'))
      .then(() => true)
      .catch(() => false),
    true
  );
});

test('buildPackagePreview 对含图片组件的 package 输出可视缩略图', async () => {
  const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'visual-package-preview-'));
  await writeVisualRequestFixture(tmpRoot);
  const requestsRoot = path.join(tmpRoot, 'workspace', 'requests');
  const packagesRoot = path.join(tmpRoot, 'workspace', 'packages');
  const previewRoot = path.join(tmpRoot, 'workspace', 'preview', 'packages');

  await buildRequestPackage({
    requestsRoot,
    outputRoot: packagesRoot
  });

  const preview = await buildPackagePreview({
    packagesRoot,
    outputRoot: previewRoot
  });

  assert.match(preview.html, /shieldmaiden_demo/);
  assert.match(preview.html, /female_warrior\.png/);
  assert.match(preview.html, /源原画/);
  assert.match(preview.html, /待黑盒加工/);
});

test('validateSpinePackage 接受最小 package fixture', async () => {
  const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'package-fixture-'));
  const packageRoot = await writePackageFixture(tmpRoot);

  const report = await validateSpinePackage({ packageRoot });

  assert.equal(report.ok, true);
  assert.equal(report.presentationId, 'hero_knight');
  assert.equal(report.variantCount, 2);
});

test('validateSpinePackage 在缺少 variant 文件时失败', async () => {
  const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'package-broken-'));
  const packageRoot = await writePackageFixture(tmpRoot);
  await fs.rm(path.join(packageRoot, 'variants', 'winter', 'variant.json'));

  await assert.rejects(
    () => validateSpinePackage({ packageRoot }),
    /winter/
  );
});

test('validateSpinePackageCollection 可以遍历 packages 根目录', async () => {
  const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'package-collection-'));
  await writePackageFixture(tmpRoot);

  const reports = await validateSpinePackageCollection({
    packagesRoot: path.join(tmpRoot, 'workspace', 'packages')
  });

  assert.equal(reports.length, 1);
  assert.equal(reports[0].defaultVariantId, 'default');
});

test('buildRequestBundle 从 packages 根目录生成正式 export bundle', async () => {
  const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'request-build-'));
  await writePackageFixture(tmpRoot);
  const packagesRoot = path.join(tmpRoot, 'workspace', 'packages');
  const outputRoot = path.join(tmpRoot, 'workspace', 'exports', 'main_cast');

  const result = await buildRequestBundle({
    packagesRoot,
    outputRoot,
    bundleId: 'main_cast',
    bundleVersion: '0.2.0'
  });

  assert.equal(result.bundle.bundleId, 'main_cast');
  assert.equal(result.bundle.bundleVersion, '0.2.0');
  assert.equal(result.bundle.characters.length, 1);
  assert.equal(result.characters[0].manifest.schemaVersion, 'spine_character_manifest_v2');
  assert.equal(result.characters[0].manifest.defaultVariantId, 'default');
  assert.equal(result.characters[0].manifest.variants.length, 2);
  assert.deepEqual(
    result.characters[0].manifest.variants.map(variant => variant.variantId),
    ['default', 'winter']
  );
  assert.equal(
    result.characters[0].manifest.variants[1].skin,
    'winter'
  );
  assert.equal(
    result.characters[0].manifest.variants[1].allowedAnimations.includes('attack'),
    true
  );
  assert.deepEqual(
    result.characters[0].manifest.variants[1].requiredComponents,
    ['slot_weapon']
  );
  assert.equal(
    result.characters[0].manifest.variants[1].notes,
    'Adds cloak silhouette and keeps only the sword component active'
  );
  assert.deepEqual(
    result.characters[0].manifest.variants[1].resourceOverrides,
    { palette: 'winter' }
  );

  const manifestPath = path.join(
    outputRoot,
    'characters',
    'hero_knight',
    'character_manifest.json'
  );
  const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
  assert.equal(manifest.presentationId, 'hero_knight');
  assert.equal(manifest.atlasFile, 'hero_knight.atlas');
  assert.deepEqual(manifest.variants[1].requiredComponents, ['slot_weapon']);
  assert.equal(
    manifest.variants[1].notes,
    'Adds cloak silhouette and keeps only the sword component active'
  );
});

test('buildRequestBundle 会清理已从 packages 中移除的旧角色目录', async () => {
  const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'request-build-prune-'));
  await writeRequestFixture(tmpRoot);
  await writeVisualRequestFixture(tmpRoot);
  const requestsRoot = path.join(tmpRoot, 'workspace', 'requests');
  const packagesRoot = path.join(tmpRoot, 'workspace', 'packages');
  const outputRoot = path.join(tmpRoot, 'workspace', 'exports', 'request_driven_bundle');

  await prepareCollectedPackages(tmpRoot, requestsRoot, packagesRoot);

  const firstBuild = await buildRequestBundle({
    packagesRoot,
    outputRoot,
    bundleId: 'request_driven_bundle'
  });
  assert.equal(firstBuild.bundle.characters.length, 2);

  await fs.rm(path.join(requestsRoot, 'req_hero_knight_v001'), { recursive: true, force: true });
  await prepareCollectedPackages(tmpRoot, requestsRoot, packagesRoot);

  const secondBuild = await buildRequestBundle({
    packagesRoot,
    outputRoot,
    bundleId: 'request_driven_bundle'
  });

  assert.equal(secondBuild.bundle.characters.length, 1);
  assert.deepEqual(
    secondBuild.bundle.characters.map(item => item.presentationId),
    ['shieldmaiden_demo']
  );
  assert.equal(
    await fs
      .access(path.join(outputRoot, 'characters', 'hero_knight'))
      .then(() => true)
      .catch(() => false),
    false
  );
  assert.equal(
    await fs
      .access(path.join(outputRoot, 'characters', 'shieldmaiden_demo'))
      .then(() => true)
      .catch(() => false),
    true
  );
});

test('validateRequestBundle 在导出完整时通过，在资源缺失时失败', async () => {
  const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'request-validate-'));
  await writePackageFixture(tmpRoot);
  const packagesRoot = path.join(tmpRoot, 'workspace', 'packages');
  const outputRoot = path.join(tmpRoot, 'workspace', 'exports', 'main_cast');

  await buildRequestBundle({
    packagesRoot,
    outputRoot,
    bundleId: 'main_cast'
  });

  const report = await validateRequestBundle({ bundleRoot: outputRoot });
  assert.equal(report.ok, true);
  assert.equal(report.checkedCharacters, 1);

  await fs.rm(path.join(outputRoot, 'characters', 'hero_knight', 'hero_knight.atlas'));
  await assert.rejects(
    () => validateRequestBundle({ bundleRoot: outputRoot }),
    /hero_knight\.atlas/
  );
});

test('buildRequestBundle 在 requiredComponents 的 reviewStatus 不允许导出时失败', async () => {
  const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'request-build-review-gate-'));
  const packageRoot = await writePackageFixture(tmpRoot);
  const packagesRoot = path.join(tmpRoot, 'workspace', 'packages');
  const outputRoot = path.join(tmpRoot, 'workspace', 'exports', 'main_cast');

  const descriptorPath = path.join(packageRoot, 'components', 'slot_weapon', 'descriptor.json');
  const descriptor = JSON.parse(await fs.readFile(descriptorPath, 'utf8'));
  descriptor.reviewStatus = 'rejected';
  await fs.writeFile(descriptorPath, JSON.stringify(descriptor, null, 2), 'utf8');

  await assert.rejects(
    () => buildRequestBundle({
      packagesRoot,
      outputRoot,
      bundleId: 'main_cast'
    }),
    /reviewStatus/
  );
});

test('buildRequestPreview 生成 request-driven 预览页与报告', async () => {
  const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'request-preview-'));
  await writePackageFixture(tmpRoot);
  const packagesRoot = path.join(tmpRoot, 'workspace', 'packages');
  const bundleRoot = path.join(tmpRoot, 'workspace', 'exports', 'main_cast');
  const previewRoot = path.join(tmpRoot, 'workspace', 'preview', 'main_cast');

  await buildRequestBundle({
    packagesRoot,
    outputRoot: bundleRoot,
    bundleId: 'main_cast'
  });

  const preview = await buildRequestPreview({
    bundleRoot,
    outputRoot: previewRoot
  });

  assert.match(preview.html, /hero_knight/);
  assert.match(preview.html, /默认变体/);
  assert.match(preview.html, /角色数/);
  assert.match(preview.html, /变体数/);
  assert.match(preview.html, /校验通过/);
  assert.match(preview.html, /winter/);
  assert.match(preview.html, /slot_weapon/);
  assert.match(preview.html, /Adds cloak silhouette and keeps only the sword component active/);
  assert.equal(preview.report.characters.length, 1);
  assert.equal(preview.report.characters[0].manifest.defaultVariantId, 'default');
  assert.deepEqual(
    preview.report.characters[0].manifest.variants[1].requiredComponents,
    ['slot_weapon']
  );
  assert.equal(
    preview.report.characters[0].manifest.variants[1].notes,
    'Adds cloak silhouette and keeps only the sword component active'
  );
  assert.equal(
    await fs
      .access(path.join(previewRoot, 'index.html'))
      .then(() => true)
      .catch(() => false),
    true
  );
  assert.equal(
    await fs
      .access(path.join(previewRoot, 'report.json'))
      .then(() => true)
      .catch(() => false),
    true
  );
  assert.equal(
    await fs
      .access(path.join(previewRoot, 'assets', 'hero_knight.png'))
      .then(() => true)
      .catch(() => false),
    true
  );
});
