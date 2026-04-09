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

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(value, null, 2), 'utf8');
}

async function writeFile(filePath, content = 'fixture') {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, 'utf8');
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
