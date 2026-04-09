import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import {
  validateBlackboxJob,
  validateBlackboxJobCollection
} from './validate_blackbox_job.mjs';
import { buildBlackboxJobs } from './build_blackbox_jobs.mjs';
import { runBlackboxJobs } from './run_blackbox_jobs.mjs';
import { collectBlackboxResults } from './collect_blackbox_results.mjs';
import { buildBlackboxPreview } from './build_blackbox_preview.mjs';
import { validateSpinePackage } from './validate_spine_package.mjs';

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
  await writeFile(path.join(requestRoot, 'art', 'concept.txt'), 'hero knight concept');
  await writeFile(path.join(requestRoot, 'notes', 'rig_notes.md'), 'rig notes');
  await writeFile(path.join(requestRoot, 'refs', 'moodboard.txt'), 'moodboard');
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
      },
      {
        variantId: 'ceremonial',
        label: 'Ceremonial',
        skin: 'ceremonial'
      }
    ],
    requiredActions: ['idle', 'attack'],
    requiredSlots: ['weapon', 'head', 'body']
  });
  await writeBinaryFile(path.join(requestRoot, 'art', 'female_warrior.png'), VISUAL_PNG_BASE64);
  await writeFile(path.join(requestRoot, 'notes', 'brief.md'), 'female warrior demo');
  await writeFile(path.join(requestRoot, 'refs', 'source_attribution.md'), 'source attribution');
  return requestRoot;
}

async function writeJobFixture(rootDir) {
  const jobRoot = path.join(
    rootDir,
    'workspace',
    'blackbox_jobs',
    'hero_knight__req_hero_knight_v001'
  );
  await writeJson(path.join(jobRoot, 'job.json'), {
    schemaVersion: 'blackbox_job_v1',
    jobId: 'hero_knight__req_hero_knight_v001',
    characterRequestId: 'req_hero_knight_v001',
    presentationId: 'hero_knight',
    providerType: 'manual',
    providerName: 'manual',
    status: 'prepared',
    requestedSlots: ['weapon', 'head'],
    requestedVariants: ['default', 'winter'],
    createdAt: '2026-04-09T00:00:00.000Z',
    updatedAt: '2026-04-09T00:00:00.000Z',
    inputSnapshot: {
      requestJson: 'input/request.json',
      artFiles: ['input/art/concept.txt'],
      noteFiles: ['input/notes/rig_notes.md'],
      refFiles: ['input/refs/moodboard.txt']
    },
    outputs: {
      layerPlanFile: null,
      slotMapFile: null,
      variantPlanFile: null,
      componentArtifacts: {}
    },
    errors: []
  });
  await writeFile(path.join(jobRoot, 'input', 'request.json'), '{"ok":true}');
  await writeFile(path.join(jobRoot, 'input', 'art', 'concept.txt'), 'hero knight concept');
  await writeFile(path.join(jobRoot, 'input', 'notes', 'rig_notes.md'), 'rig notes');
  await writeFile(path.join(jobRoot, 'input', 'refs', 'moodboard.txt'), 'moodboard');
  return jobRoot;
}

test('validateBlackboxJob 接受最小 prepared job fixture', async () => {
  const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'blackbox-job-fixture-'));
  const jobRoot = await writeJobFixture(tmpRoot);

  const report = await validateBlackboxJob({ jobRoot });

  assert.equal(report.ok, true);
  assert.equal(report.jobId, 'hero_knight__req_hero_knight_v001');
  assert.equal(report.presentationId, 'hero_knight');
  assert.equal(report.status, 'prepared');
});

test('validateBlackboxJobCollection 可以遍历 jobs 根目录', async () => {
  const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'blackbox-job-collection-'));
  await writeJobFixture(tmpRoot);

  const reports = await validateBlackboxJobCollection({
    jobsRoot: path.join(tmpRoot, 'workspace', 'blackbox_jobs')
  });

  assert.equal(reports.length, 1);
  assert.equal(reports[0].jobId, 'hero_knight__req_hero_knight_v001');
});

test('buildBlackboxJobs 从 requests 根目录生成 prepared job 与输入快照', async () => {
  const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'blackbox-job-build-'));
  await writeRequestFixture(tmpRoot);
  const requestsRoot = path.join(tmpRoot, 'workspace', 'requests');
  const jobsRoot = path.join(tmpRoot, 'workspace', 'blackbox_jobs');

  const result = await buildBlackboxJobs({
    requestsRoot,
    outputRoot: jobsRoot
  });

  assert.equal(result.jobs.length, 1);
  assert.equal(result.jobs[0].jobId, 'hero_knight__req_hero_knight_v001');
  assert.equal(result.jobs[0].status, 'prepared');

  const jobRoot = path.join(jobsRoot, 'hero_knight__req_hero_knight_v001');
  const report = await validateBlackboxJob({ jobRoot });
  assert.equal(report.ok, true);

  const jobJson = JSON.parse(
    await fs.readFile(path.join(jobRoot, 'job.json'), 'utf8')
  );
  assert.equal(jobJson.providerType, 'manual');
  assert.deepEqual(jobJson.requestedSlots, ['weapon', 'head']);
  assert.deepEqual(jobJson.requestedVariants, ['default', 'winter']);
  assert.equal(jobJson.inputSnapshot.requestJson, 'input/request.json');
  assert.deepEqual(jobJson.inputSnapshot.artFiles, ['input/art/concept.txt']);
  assert.deepEqual(jobJson.errors, []);

  assert.equal(
    await fs
      .access(path.join(jobRoot, 'input', 'request.json'))
      .then(() => true)
      .catch(() => false),
    true
  );
  assert.equal(
    await fs
      .access(path.join(jobRoot, 'input', 'art', 'concept.txt'))
      .then(() => true)
      .catch(() => false),
    true
  );
  assert.equal(
    await fs
      .access(path.join(jobRoot, 'input', 'notes', 'rig_notes.md'))
      .then(() => true)
      .catch(() => false),
    true
  );
  assert.equal(
    await fs
      .access(path.join(jobRoot, 'input', 'refs', 'moodboard.txt'))
      .then(() => true)
      .catch(() => false),
    true
  );
});

test('runBlackboxJobs 在 manual provider 下会把未补件 job 置为 manual_pending', async () => {
  const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'blackbox-job-run-manual-'));
  await writeRequestFixture(tmpRoot);
  const requestsRoot = path.join(tmpRoot, 'workspace', 'requests');
  const jobsRoot = path.join(tmpRoot, 'workspace', 'blackbox_jobs');

  await buildBlackboxJobs({
    requestsRoot,
    outputRoot: jobsRoot
  });

  const result = await runBlackboxJobs({ jobsRoot });

  assert.equal(result.jobs.length, 1);
  assert.equal(result.jobs[0].status, 'manual_pending');

  const jobJson = JSON.parse(
    await fs.readFile(
      path.join(jobsRoot, 'hero_knight__req_hero_knight_v001', 'job.json'),
      'utf8'
    )
  );
  assert.equal(jobJson.status, 'manual_pending');
  assert.equal(jobJson.errors[0].code, 'manual_artifacts_missing');
});

test('runBlackboxJobs 在 cloud_stub 下生成计划文件、证据与组件产物', async () => {
  const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'blackbox-job-run-cloud-'));
  await writeVisualRequestFixture(tmpRoot);
  const requestsRoot = path.join(tmpRoot, 'workspace', 'requests');
  const jobsRoot = path.join(tmpRoot, 'workspace', 'blackbox_jobs');

  await buildBlackboxJobs({
    requestsRoot,
    outputRoot: jobsRoot,
    providerType: 'cloud_stub',
    providerName: 'openai_cloud_stub'
  });

  const result = await runBlackboxJobs({ jobsRoot });

  assert.equal(result.jobs.length, 1);
  assert.equal(result.jobs[0].status, 'succeeded');

  const jobRoot = path.join(jobsRoot, 'shieldmaiden_demo__req_shieldmaiden_demo_v001');
  const jobJson = JSON.parse(await fs.readFile(path.join(jobRoot, 'job.json'), 'utf8'));
  assert.equal(jobJson.status, 'succeeded');
  assert.equal(jobJson.outputs.layerPlanFile, 'artifacts/layer_plan.json');
  assert.equal(jobJson.outputs.slotMapFile, 'artifacts/slot_map.json');
  assert.equal(jobJson.outputs.variantPlanFile, 'artifacts/variant_plan.json');
  assert.deepEqual(Object.keys(jobJson.outputs.componentArtifacts), ['body', 'head', 'weapon']);
  assert.equal(
    await fs
      .access(path.join(jobRoot, 'artifacts', 'layer_plan.json'))
      .then(() => true)
      .catch(() => false),
    true
  );
  assert.equal(
    await fs
      .access(path.join(jobRoot, 'evidence', 'provider_report.json'))
      .then(() => true)
      .catch(() => false),
    true
  );
  assert.equal(
    await fs
      .access(path.join(jobRoot, 'artifacts', 'components', 'weapon', 'render.png'))
      .then(() => true)
      .catch(() => false),
    true
  );
});

test('collectBlackboxResults 会把 cloud_stub 结果收口到 package 并生成黑盒预览', async () => {
  const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'blackbox-job-collect-'));
  await writeVisualRequestFixture(tmpRoot);
  const requestsRoot = path.join(tmpRoot, 'workspace', 'requests');
  const jobsRoot = path.join(tmpRoot, 'workspace', 'blackbox_jobs');
  const packagesRoot = path.join(tmpRoot, 'workspace', 'packages');
  const previewRoot = path.join(tmpRoot, 'workspace', 'preview', 'blackbox');

  await buildBlackboxJobs({
    requestsRoot,
    outputRoot: jobsRoot,
    providerType: 'cloud_stub',
    providerName: 'openai_cloud_stub'
  });
  await runBlackboxJobs({ jobsRoot });

  const collectResult = await collectBlackboxResults({
    requestsRoot,
    jobsRoot,
    packagesRoot
  });
  assert.equal(collectResult.packages.length, 1);
  assert.equal(collectResult.packages[0].presentationId, 'shieldmaiden_demo');

  const packageRoot = path.join(packagesRoot, 'shieldmaiden_demo');
  const descriptor = JSON.parse(
    await fs.readFile(path.join(packageRoot, 'components', 'slot_weapon', 'descriptor.json'), 'utf8')
  );
  assert.equal(descriptor.blackboxJobId, 'shieldmaiden_demo__req_shieldmaiden_demo_v001');
  assert.equal(descriptor.providerType, 'cloud_stub');
  assert.equal(descriptor.providerName, 'openai_cloud_stub');
  assert.equal(descriptor.readiness, 'ready');
  assert.equal(descriptor.reviewStatus, 'unreviewed');
  assert.deepEqual(descriptor.evidenceFiles, ['evidence/provider_report.json']);
  assert.deepEqual(descriptor.artifactFiles, ['components/slot_weapon/render.png']);

  const packageReport = await validateSpinePackage({ packageRoot });
  assert.equal(packageReport.ok, true);

  const preview = await buildBlackboxPreview({
    jobsRoot,
    outputRoot: previewRoot
  });
  assert.match(preview.html, /黑盒任务预览/);
  assert.match(preview.html, /shieldmaiden_demo/);
  assert.match(preview.html, /openai_cloud_stub/);
  assert.match(preview.html, /已成功/);
  assert.equal(
    await fs
      .access(path.join(previewRoot, 'index.html'))
      .then(() => true)
      .catch(() => false),
    true
  );
});
