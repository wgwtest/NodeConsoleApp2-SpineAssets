import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
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

async function withFakeOpenAIResponsesServer(responseBody, run) {
  const requests = [];
  const server = http.createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const rawBody = Buffer.concat(chunks).toString('utf8');
    requests.push({
      method: req.method,
      url: req.url,
      headers: req.headers,
      body: rawBody.length > 0 ? JSON.parse(rawBody) : null
    });
    res.writeHead(200, {
      'content-type': 'application/json',
      'x-request-id': 'req_fake_123'
    });
    res.end(JSON.stringify(responseBody));
  });

  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}/v1`;

  try {
    return await run({ baseUrl, requests });
  } finally {
    await new Promise((resolve, reject) => {
      server.close(error => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  }
}

async function withFakeOpenAICompatibleServer({
  responsesBody,
  imageResponseBody = {
    created: 1,
    data: [
      {
        b64_json: VISUAL_PNG_BASE64
      }
    ]
  }
}, run) {
  const requests = [];
  const server = http.createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const rawBody = Buffer.concat(chunks).toString('utf8');
    const body = rawBody.length > 0 ? JSON.parse(rawBody) : null;
    requests.push({
      method: req.method,
      url: req.url,
      headers: req.headers,
      body
    });

    if (req.url === '/v1/responses') {
      res.writeHead(200, {
        'content-type': 'application/json',
        'x-request-id': 'req_fake_123'
      });
      res.end(JSON.stringify(responsesBody));
      return;
    }

    if (req.url === '/v1/images/generations') {
      res.writeHead(200, {
        'content-type': 'application/json'
      });
      res.end(JSON.stringify(imageResponseBody));
      return;
    }

    res.writeHead(404, {
      'content-type': 'application/json'
    });
    res.end(JSON.stringify({ error: { message: `Unknown path ${req.url}` } }));
  });

  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}/v1`;

  try {
    return await run({ baseUrl, requests });
  } finally {
    await new Promise((resolve, reject) => {
      server.close(error => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  }
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

test('runBlackboxJobs 在 cloud_stub 且配置 OPENAI_API_KEY 时优先走云端规划', async () => {
  const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'blackbox-job-run-cloud-live-'));
  await writeVisualRequestFixture(tmpRoot);
  const requestsRoot = path.join(tmpRoot, 'workspace', 'requests');
  const jobsRoot = path.join(tmpRoot, 'workspace', 'blackbox_jobs');

  await buildBlackboxJobs({
    requestsRoot,
    outputRoot: jobsRoot,
    providerType: 'cloud_stub',
    providerName: 'openai_cloud_stub'
  });

  await withFakeOpenAIResponsesServer(
    {
      id: 'resp_fake_123',
      output_text: JSON.stringify({
        summary: 'cloud planner hit',
        layerPlan: {
          layers: [
            {
              slotName: 'body',
              componentId: 'slot_body',
              drawOrder: 0,
              artifactPrompt: 'cartoon female warrior body armor',
              notes: 'base silhouette'
            },
            {
              slotName: 'head',
              componentId: 'slot_head',
              drawOrder: 1,
              artifactPrompt: 'cartoon female warrior head and braid',
              notes: 'keep face readable'
            },
            {
              slotName: 'weapon',
              componentId: 'slot_weapon',
              drawOrder: 2,
              artifactPrompt: 'cartoon round shield and spear',
              notes: 'weapon silhouette should stay bold'
            }
          ]
        },
        slotMap: {
          slots: [
            {
              slotName: 'body',
              componentId: 'slot_body',
              notes: 'torso and skirt'
            },
            {
              slotName: 'head',
              componentId: 'slot_head',
              notes: 'helmet optional'
            },
            {
              slotName: 'weapon',
              componentId: 'slot_weapon',
              notes: 'shield and spear share style language'
            }
          ]
        },
        variantPlan: {
          variants: [
            {
              variantId: 'default',
              label: 'Default',
              skin: 'default',
              requiredComponents: ['slot_body', 'slot_head', 'slot_weapon'],
              notes: 'combat default'
            },
            {
              variantId: 'ceremonial',
              label: 'Ceremonial',
              skin: 'ceremonial',
              requiredComponents: ['slot_body', 'slot_head', 'slot_weapon'],
              notes: 'more ornaments'
            }
          ]
        }
      }),
      usage: {
        input_tokens: 321,
        output_tokens: 123
      }
    },
    async ({ baseUrl, requests }) => {
      const envBackup = {
        OPENAI_API_KEY: process.env.OPENAI_API_KEY,
        OPENAI_BASE_URL: process.env.OPENAI_BASE_URL,
        OPENAI_BLACKBOX_MODEL: process.env.OPENAI_BLACKBOX_MODEL
      };

      process.env.OPENAI_API_KEY = 'test-key';
      process.env.OPENAI_BASE_URL = baseUrl;
      process.env.OPENAI_BLACKBOX_MODEL = 'gpt-5.4-mini';

      try {
        const result = await runBlackboxJobs({ jobsRoot });
        assert.equal(result.jobs.length, 1);
        assert.equal(result.jobs[0].status, 'succeeded');
      } finally {
        for (const [key, value] of Object.entries(envBackup)) {
          if (value === undefined) {
            delete process.env[key];
          } else {
            process.env[key] = value;
          }
        }
      }

      assert.equal(requests.length, 1);
      assert.equal(requests[0].method, 'POST');
      assert.equal(requests[0].url, '/v1/responses');
      assert.equal(requests[0].body.model, 'gpt-5.4-mini');
      assert.equal(requests[0].body.text.format.type, 'json_schema');
      assert.equal(
        requests[0].body.input[1].content.some(item => (
          item.type === 'input_image' &&
          item.image_url.startsWith('data:image/png;base64,')
        )),
        true
      );

      const jobRoot = path.join(jobsRoot, 'shieldmaiden_demo__req_shieldmaiden_demo_v001');
      const providerReport = JSON.parse(
        await fs.readFile(path.join(jobRoot, 'evidence', 'provider_report.json'), 'utf8')
      );
      assert.equal(providerReport.usedCloud, true);
      assert.equal(providerReport.mode, 'cloud_response');
      assert.equal(providerReport.responseId, 'resp_fake_123');
      assert.equal(providerReport.model, 'gpt-5.4-mini');
      assert.equal(providerReport.requestId, 'req_fake_123');

      const layerPlan = JSON.parse(
        await fs.readFile(path.join(jobRoot, 'artifacts', 'layer_plan.json'), 'utf8')
      );
      assert.equal(layerPlan.layers[2].artifactPrompt, 'cartoon round shield and spear');
      assert.equal(layerPlan.layers[2].notes, 'weapon silhouette should stay bold');
    }
  );
});

test('runBlackboxJobs 仅在显式开启 nanobanana 时才调用生图接口', async () => {
  const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'blackbox-job-run-nanobanana-'));
  await writeVisualRequestFixture(tmpRoot);
  const requestsRoot = path.join(tmpRoot, 'workspace', 'requests');
  const jobsRoot = path.join(tmpRoot, 'workspace', 'blackbox_jobs');

  await buildBlackboxJobs({
    requestsRoot,
    outputRoot: jobsRoot,
    providerType: 'cloud_stub',
    providerName: 'openai_cloud_stub'
  });

  await withFakeOpenAICompatibleServer(
    {
      responsesBody: {
        id: 'resp_fake_456',
        output_text: JSON.stringify({
          summary: 'cloud planner hit',
          layerPlan: {
            layers: [
              {
                slotName: 'body',
                componentId: 'slot_body',
                drawOrder: 0,
                artifactPrompt: 'body prompt',
                notes: 'body notes'
              },
              {
                slotName: 'head',
                componentId: 'slot_head',
                drawOrder: 1,
                artifactPrompt: 'head prompt',
                notes: 'head notes'
              },
              {
                slotName: 'weapon',
                componentId: 'slot_weapon',
                drawOrder: 2,
                artifactPrompt: 'weapon prompt',
                notes: 'weapon notes'
              }
            ]
          },
          slotMap: {
            slots: [
              { slotName: 'body', componentId: 'slot_body', notes: 'body slot' },
              { slotName: 'head', componentId: 'slot_head', notes: 'head slot' },
              { slotName: 'weapon', componentId: 'slot_weapon', notes: 'weapon slot' }
            ]
          },
          variantPlan: {
            variants: [
              {
                variantId: 'default',
                label: 'Default',
                skin: 'default',
                requiredComponents: ['slot_body', 'slot_head', 'slot_weapon'],
                notes: 'default notes'
              },
              {
                variantId: 'ceremonial',
                label: 'Ceremonial',
                skin: 'ceremonial',
                requiredComponents: ['slot_body', 'slot_head', 'slot_weapon'],
                notes: 'ceremonial notes'
              }
            ]
          }
        })
      }
    },
    async ({ baseUrl, requests }) => {
      const envBackup = {
        OPENAI_API_KEY: process.env.OPENAI_API_KEY,
        OPENAI_BASE_URL: process.env.OPENAI_BASE_URL,
        OPENAI_BLACKBOX_MODEL: process.env.OPENAI_BLACKBOX_MODEL,
        NANO_BANANA_ENABLED: process.env.NANO_BANANA_ENABLED,
        NANO_BANANA_API_KEY: process.env.NANO_BANANA_API_KEY,
        NANO_BANANA_BASE_URL: process.env.NANO_BANANA_BASE_URL,
        NANO_BANANA_MODEL: process.env.NANO_BANANA_MODEL
      };

      process.env.OPENAI_API_KEY = 'test-openai-key';
      process.env.OPENAI_BASE_URL = baseUrl;
      process.env.OPENAI_BLACKBOX_MODEL = 'gpt-5.4-mini';
      process.env.NANO_BANANA_ENABLED = 'true';
      process.env.NANO_BANANA_API_KEY = 'test-nano-key';
      process.env.NANO_BANANA_BASE_URL = baseUrl;
      process.env.NANO_BANANA_MODEL = 'gemini-2.5-flash-image';

      try {
        const result = await runBlackboxJobs({ jobsRoot });
        assert.equal(result.jobs.length, 1);
        assert.equal(result.jobs[0].status, 'succeeded');
      } finally {
        for (const [key, value] of Object.entries(envBackup)) {
          if (value === undefined) {
            delete process.env[key];
          } else {
            process.env[key] = value;
          }
        }
      }

      const responseRequests = requests.filter(item => item.url === '/v1/responses');
      const imageRequests = requests.filter(item => item.url === '/v1/images/generations');
      assert.equal(responseRequests.length, 1);
      assert.equal(imageRequests.length, 3);
      assert.equal(imageRequests[0].body.model, 'gemini-2.5-flash-image');
      assert.equal(imageRequests[0].body.response_format, 'b64_json');
      assert.match(imageRequests[0].body.prompt, /body prompt|head prompt|weapon prompt/);

      const jobRoot = path.join(jobsRoot, 'shieldmaiden_demo__req_shieldmaiden_demo_v001');
      const providerReport = JSON.parse(
        await fs.readFile(path.join(jobRoot, 'evidence', 'provider_report.json'), 'utf8')
      );
      assert.equal(providerReport.imageGeneration.used, true);
      assert.equal(providerReport.imageGeneration.providerName, 'nanobanana');
      assert.equal(providerReport.imageGeneration.model, 'gemini-2.5-flash-image');
      assert.equal(providerReport.imageGeneration.callCount, 3);

      const renderPng = await fs.readFile(
        path.join(jobRoot, 'artifacts', 'components', 'weapon', 'render.png')
      );
      assert.deepEqual(renderPng, Buffer.from(VISUAL_PNG_BASE64, 'base64'));
    }
  );
});

test('collectBlackboxResults 会把 variant_plan 收口到 package variant manifest', async () => {
  const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'blackbox-job-collect-variants-'));
  await writeVisualRequestFixture(tmpRoot);
  const requestsRoot = path.join(tmpRoot, 'workspace', 'requests');
  const jobsRoot = path.join(tmpRoot, 'workspace', 'blackbox_jobs');
  const packagesRoot = path.join(tmpRoot, 'workspace', 'packages');

  await buildBlackboxJobs({
    requestsRoot,
    outputRoot: jobsRoot,
    providerType: 'cloud_stub',
    providerName: 'openai_cloud_stub'
  });

  await withFakeOpenAIResponsesServer(
    {
      id: 'resp_fake_variant_123',
      output_text: JSON.stringify({
        summary: 'variant plan merge check',
        layerPlan: {
          layers: [
            {
              slotName: 'body',
              componentId: 'slot_body',
              drawOrder: 0,
              artifactPrompt: 'female warrior body prompt',
              notes: 'body notes'
            },
            {
              slotName: 'head',
              componentId: 'slot_head',
              drawOrder: 1,
              artifactPrompt: 'female warrior head prompt',
              notes: 'head notes'
            },
            {
              slotName: 'weapon',
              componentId: 'slot_weapon',
              drawOrder: 2,
              artifactPrompt: 'female warrior weapon prompt',
              notes: 'weapon notes'
            }
          ]
        },
        slotMap: {
          slots: [
            { slotName: 'body', componentId: 'slot_body', notes: 'body slot' },
            { slotName: 'head', componentId: 'slot_head', notes: 'head slot' },
            { slotName: 'weapon', componentId: 'slot_weapon', notes: 'weapon slot' }
          ]
        },
        variantPlan: {
          variants: [
            {
              variantId: 'default',
              label: 'Default',
              skin: 'default',
              requiredComponents: ['slot_body', 'slot_head'],
              notes: 'combat default trimmed for close framing'
            },
            {
              variantId: 'ceremonial',
              label: 'Ceremonial',
              skin: 'ceremonial',
              requiredComponents: ['slot_body', 'slot_weapon'],
              notes: 'ceremonial keeps weapon and costume silhouette'
            }
          ]
        }
      })
    },
    async ({ baseUrl }) => {
      const envBackup = {
        OPENAI_API_KEY: process.env.OPENAI_API_KEY,
        OPENAI_BASE_URL: process.env.OPENAI_BASE_URL,
        OPENAI_BLACKBOX_MODEL: process.env.OPENAI_BLACKBOX_MODEL,
        NANO_BANANA_ENABLED: process.env.NANO_BANANA_ENABLED,
        NANO_BANANA_API_KEY: process.env.NANO_BANANA_API_KEY,
        NANO_BANANA_BASE_URL: process.env.NANO_BANANA_BASE_URL,
        NANO_BANANA_MODEL: process.env.NANO_BANANA_MODEL
      };

      process.env.OPENAI_API_KEY = 'test-key';
      process.env.OPENAI_BASE_URL = baseUrl;
      process.env.OPENAI_BLACKBOX_MODEL = 'gpt-5.4-mini';
      delete process.env.NANO_BANANA_ENABLED;
      delete process.env.NANO_BANANA_API_KEY;
      delete process.env.NANO_BANANA_BASE_URL;
      delete process.env.NANO_BANANA_MODEL;

      try {
        const runResult = await runBlackboxJobs({ jobsRoot });
        assert.equal(runResult.jobs.length, 1);
        assert.equal(runResult.jobs[0].status, 'succeeded');
      } finally {
        for (const [key, value] of Object.entries(envBackup)) {
          if (value === undefined) {
            delete process.env[key];
          } else {
            process.env[key] = value;
          }
        }
      }
    }
  );

  await collectBlackboxResults({
    requestsRoot,
    jobsRoot,
    packagesRoot
  });

  const defaultVariant = JSON.parse(
    await fs.readFile(
      path.join(packagesRoot, 'shieldmaiden_demo', 'variants', 'default', 'variant.json'),
      'utf8'
    )
  );
  const ceremonialVariant = JSON.parse(
    await fs.readFile(
      path.join(packagesRoot, 'shieldmaiden_demo', 'variants', 'ceremonial', 'variant.json'),
      'utf8'
    )
  );

  assert.deepEqual(defaultVariant.requiredComponents, ['slot_body', 'slot_head']);
  assert.equal(defaultVariant.notes, 'combat default trimmed for close framing');
  assert.equal(defaultVariant.source.blackboxVariantPlan, 'blackbox/variant_plan.json');
  assert.deepEqual(ceremonialVariant.requiredComponents, ['slot_body', 'slot_weapon']);
  assert.equal(
    ceremonialVariant.notes,
    'ceremonial keeps weapon and costume silhouette'
  );
  assert.equal(ceremonialVariant.enabled, true);
  assert.deepEqual(ceremonialVariant.allowedAnimations, ['idle', 'attack']);
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
