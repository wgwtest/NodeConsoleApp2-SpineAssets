import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { B1_BUNDLE_ID } from './b1_sample_catalog.mjs';
import { fetchOfficialSamples } from './fetch_official_samples.mjs';
import { buildSampleBundle } from './build_sample_bundle.mjs';
import { validateSampleBundle } from './validate_sample_bundle.mjs';
import { buildSamplePreview } from './build_sample_preview.mjs';

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(value, null, 2), 'utf8');
}

async function writeFixtureSample(sampleRoot, sample) {
  const sampleDir = path.join(sampleRoot, sample.presentationId);
  await fs.mkdir(sampleDir, { recursive: true });
  await writeJson(
    path.join(sampleDir, sample.assets.skeleton.sourceName),
    sample.fixture.skeleton
  );
  await fs.writeFile(
    path.join(sampleDir, sample.assets.atlas.sourceName),
    sample.fixture.atlas,
    'utf8'
  );
  await fs.writeFile(
    path.join(sampleDir, sample.assets.textures[0].sourceName),
    sample.fixture.texture
  );
}

function createSampleCatalog() {
  return [
    {
      sampleId: 'spineboy',
      role: 'player',
      presentationId: 'spineboy',
      assets: {
        skeleton: {
          sourceName: 'spineboy-pro.json',
          outputName: 'spineboy.json',
          url: 'https://fixtures.local/spineboy/spineboy-pro.json'
        },
        atlas: {
          sourceName: 'spineboy-pma.atlas',
          outputName: 'spineboy.atlas',
          url: 'https://fixtures.local/spineboy/spineboy-pma.atlas'
        },
        textures: [
          {
            sourceName: 'spineboy-pma.png',
            outputName: 'spineboy.png',
            url: 'https://fixtures.local/spineboy/spineboy-pma.png'
          }
        ]
      },
      anchorProfile: { x: 0.5, y: 1 },
      scaleProfile: { baseScale: 1 },
      fixture: {
        skeleton: {
          skeleton: { spine: '4.2.22' },
          slots: [{ name: 'head' }, { name: 'torso' }],
          skins: [{ name: 'default' }],
          animations: { idle: {}, walk: {}, run: {} }
        },
        atlas: 'spineboy.png\nsize: 256,256\nformat: RGBA8888\nfilter: Linear,Linear\nrepeat: none\n',
        texture: Buffer.from('spineboy-png')
      }
    },
    {
      sampleId: 'raptor',
      role: 'enemy',
      presentationId: 'raptor',
      assets: {
        skeleton: {
          sourceName: 'raptor-pro.json',
          outputName: 'raptor.json',
          url: 'https://fixtures.local/raptor/raptor-pro.json'
        },
        atlas: {
          sourceName: 'raptor-pma.atlas',
          outputName: 'raptor.atlas',
          url: 'https://fixtures.local/raptor/raptor-pma.atlas'
        },
        textures: [
          {
            sourceName: 'raptor-pma.png',
            outputName: 'raptor.png',
            url: 'https://fixtures.local/raptor/raptor-pma.png'
          }
        ]
      },
      anchorProfile: { x: 0.5, y: 1 },
      scaleProfile: { baseScale: 1 },
      fixture: {
        skeleton: {
          skeleton: { spine: '4.2.22' },
          slots: [{ name: 'neck' }, { name: 'jaw' }],
          skins: [{ name: 'default' }],
          animations: { idle: {}, walk: {}, attack: {} }
        },
        atlas: 'raptor.png\nsize: 256,256\nformat: RGBA8888\nfilter: Linear,Linear\nrepeat: none\n',
        texture: Buffer.from('raptor-png')
      }
    }
  ];
}

test('fetchOfficialSamples 下载并整理官方样本到固定目录', async () => {
  const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'b1-fetch-'));
  const outputRoot = path.join(tmpRoot, 'workspace', 'samples', 'official');
  const sampleCatalog = createSampleCatalog();
  const fixtureMap = new Map();

  for (const sample of sampleCatalog) {
    fixtureMap.set(
      sample.assets.skeleton.url,
      Buffer.from(JSON.stringify(sample.fixture.skeleton))
    );
    fixtureMap.set(sample.assets.atlas.url, Buffer.from(sample.fixture.atlas));
    fixtureMap.set(sample.assets.textures[0].url, sample.fixture.texture);
  }

  const result = await fetchOfficialSamples({
    outputRoot,
    sampleCatalog,
    fetchImpl: async (url) => ({
      ok: fixtureMap.has(url),
      status: fixtureMap.has(url) ? 200 : 404,
      arrayBuffer: async () => fixtureMap.get(url)
    })
  });

  assert.equal(result.samples.length, 2);
  assert.equal(
    await exists(path.join(outputRoot, 'spineboy', 'spineboy-pro.json')),
    true
  );
  assert.equal(
    await exists(path.join(outputRoot, 'raptor', 'raptor-pma.png')),
    true
  );
});

test('fetchOfficialSamples 在 fetch 不可用时允许通过 downloadBinary 回退', async () => {
  const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'b1-fetch-fallback-'));
  const outputRoot = path.join(tmpRoot, 'workspace', 'samples', 'official');
  const sampleCatalog = createSampleCatalog();
  const fixtureMap = new Map();

  for (const sample of sampleCatalog) {
    fixtureMap.set(
      sample.assets.skeleton.url,
      Buffer.from(JSON.stringify(sample.fixture.skeleton))
    );
    fixtureMap.set(sample.assets.atlas.url, Buffer.from(sample.fixture.atlas));
    fixtureMap.set(sample.assets.textures[0].url, sample.fixture.texture);
  }

  const result = await fetchOfficialSamples({
    outputRoot,
    sampleCatalog,
    fetchImpl: async () => {
      throw new Error('fetch blocked');
    },
    downloadBinary: async url => {
      if (!fixtureMap.has(url)) {
        throw new Error(`missing fixture ${url}`);
      }
      return fixtureMap.get(url);
    }
  });

  assert.equal(result.samples.length, 2);
  assert.equal(
    await exists(path.join(outputRoot, 'spineboy', 'spineboy-pma.atlas')),
    true
  );
});

test('buildSampleBundle 生成两个样本角色的 bundle_manifest 与 character_manifest', async () => {
  const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'b1-build-'));
  const samplesRoot = path.join(tmpRoot, 'workspace', 'samples', 'official');
  const outputRoot = path.join(tmpRoot, 'workspace', 'exports', B1_BUNDLE_ID);
  const sampleCatalog = createSampleCatalog();

  for (const sample of sampleCatalog) {
    await writeFixtureSample(samplesRoot, sample);
  }

  const result = await buildSampleBundle({
    samplesRoot,
    outputRoot,
    sampleCatalog,
    bundleVersion: '0.1.0'
  });

  assert.equal(result.bundle.bundleId, B1_BUNDLE_ID);
  assert.equal(result.bundle.characters.length, 2);
  assert.equal(result.characters[0].manifest.schemaVersion, 'spine_character_manifest_v1');
  assert.deepEqual(result.characters[0].manifest.texturePages, ['spineboy.png']);
  assert.deepEqual(result.characters[1].manifest.texturePages, ['raptor.png']);

  const bundleManifest = JSON.parse(
    await fs.readFile(path.join(outputRoot, 'bundle_manifest.json'), 'utf8')
  );
  assert.equal(bundleManifest.characters.length, 2);
  assert.equal(
    await exists(path.join(outputRoot, 'characters', 'spineboy', 'spineboy.json')),
    true
  );
});

test('validateSampleBundle 在样本完整时通过，在资源缺失时失败', async () => {
  const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'b1-validate-'));
  const samplesRoot = path.join(tmpRoot, 'workspace', 'samples', 'official');
  const outputRoot = path.join(tmpRoot, 'workspace', 'exports', B1_BUNDLE_ID);
  const sampleCatalog = createSampleCatalog();

  for (const sample of sampleCatalog) {
    await writeFixtureSample(samplesRoot, sample);
  }

  await buildSampleBundle({
    samplesRoot,
    outputRoot,
    sampleCatalog,
    bundleVersion: '0.1.0'
  });

  const report = await validateSampleBundle({ bundleRoot: outputRoot });
  assert.equal(report.ok, true);
  assert.equal(report.checkedCharacters, 2);

  await fs.rm(path.join(outputRoot, 'characters', 'raptor', 'raptor.atlas'));
  await assert.rejects(
    () => validateSampleBundle({ bundleRoot: outputRoot }),
    /raptor\.atlas/
  );
});

test('buildSamplePreview 生成静态 HTML 预览页与摘要文件', async () => {
  const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'b1-preview-'));
  const samplesRoot = path.join(tmpRoot, 'workspace', 'samples', 'official');
  const bundleRoot = path.join(tmpRoot, 'workspace', 'exports', B1_BUNDLE_ID);
  const previewRoot = path.join(tmpRoot, 'workspace', 'preview', B1_BUNDLE_ID);
  const sampleCatalog = createSampleCatalog();

  for (const sample of sampleCatalog) {
    await writeFixtureSample(samplesRoot, sample);
  }

  await buildSampleBundle({
    samplesRoot,
    outputRoot: bundleRoot,
    sampleCatalog,
    bundleVersion: '0.1.0'
  });

  const preview = await buildSamplePreview({
    bundleRoot,
    outputRoot: previewRoot
  });

  assert.match(preview.html, /b1_official_samples/);
  assert.equal(await exists(path.join(previewRoot, 'index.html')), true);
  assert.equal(await exists(path.join(previewRoot, 'report.json')), true);
  assert.equal(await exists(path.join(previewRoot, 'assets', 'spineboy.png')), true);
});
