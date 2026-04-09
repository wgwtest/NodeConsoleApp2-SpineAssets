import fs from 'node:fs/promises';
import path from 'node:path';

import {
  BLACKBOX_LAYER_PLAN_FILE,
  BLACKBOX_PROVIDER_REPORT_FILE,
  BLACKBOX_SLOT_MAP_FILE,
  BLACKBOX_VARIANT_PLAN_FILE,
  buildComponentArtifactMap,
  copyFileEnsured,
  findPrimaryImage,
  readJson,
  resolveArtifactFile,
  writeJson,
  writeTinyPng
} from './blackbox_shared.mjs';

const DEFAULT_OPENAI_BASE_URL = 'https://api.openai.com/v1';
const DEFAULT_OPENAI_MODEL = 'gpt-5.4-mini';

function getOpenAIBaseUrl() {
  return (process.env.OPENAI_BASE_URL ?? DEFAULT_OPENAI_BASE_URL).replace(/\/+$/, '');
}

function getOpenAIModel() {
  return process.env.OPENAI_BLACKBOX_MODEL ?? DEFAULT_OPENAI_MODEL;
}

function detectMimeType(filePath) {
  switch (path.extname(filePath).toLowerCase()) {
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.webp':
      return 'image/webp';
    default:
      return 'application/octet-stream';
  }
}

async function buildInputImagePart(jobRoot, sourceArtFile) {
  if (!sourceArtFile) {
    return null;
  }

  const binary = await fs.readFile(path.join(jobRoot, sourceArtFile));
  return {
    type: 'input_image',
    image_url: `data:${detectMimeType(sourceArtFile)};base64,${binary.toString('base64')}`
  };
}

function buildPlanningSchema() {
  return {
    type: 'object',
    additionalProperties: false,
    required: ['summary', 'layerPlan', 'slotMap', 'variantPlan'],
    properties: {
      summary: {
        type: 'string'
      },
      layerPlan: {
        type: 'object',
        additionalProperties: false,
        required: ['layers'],
        properties: {
          layers: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['slotName', 'componentId', 'drawOrder', 'artifactPrompt', 'notes'],
              properties: {
                slotName: { type: 'string' },
                componentId: { type: 'string' },
                drawOrder: { type: 'integer' },
                artifactPrompt: { type: 'string' },
                notes: { type: 'string' }
              }
            }
          }
        }
      },
      slotMap: {
        type: 'object',
        additionalProperties: false,
        required: ['slots'],
        properties: {
          slots: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['slotName', 'componentId', 'notes'],
              properties: {
                slotName: { type: 'string' },
                componentId: { type: 'string' },
                notes: { type: 'string' }
              }
            }
          }
        }
      },
      variantPlan: {
        type: 'object',
        additionalProperties: false,
        required: ['variants'],
        properties: {
          variants: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['variantId', 'label', 'skin', 'requiredComponents', 'notes'],
              properties: {
                variantId: { type: 'string' },
                label: { type: 'string' },
                skin: { type: 'string' },
                requiredComponents: {
                  type: 'array',
                  items: { type: 'string' }
                },
                notes: { type: 'string' }
              }
            }
          }
        }
      }
    }
  };
}

function buildCloudPrompt({ job, request, sourceArtFile }) {
  return [
    `你是 Spine 黑盒规划助手。`,
    `目标：仅输出角色组件规划 JSON，不输出解释文字。`,
    `presentationId: ${job.presentationId}`,
    `characterRequestId: ${job.characterRequestId}`,
    `title: ${request.title}`,
    `description: ${request.description}`,
    `requiredSlots: ${job.requestedSlots.join(', ')}`,
    `requiredVariants: ${job.requestedVariants.join(', ')}`,
    `sourceArtFile: ${sourceArtFile ?? 'none'}`,
    `请为每个 slot 给出明确的 componentId、drawOrder、artifactPrompt、notes。`,
    `请为每个 variant 给出 requiredComponents 与 notes。`
  ].join('\n');
}

function parsePlanningOutput(responseJson) {
  if (typeof responseJson?.output_text === 'string' && responseJson.output_text.trim().length > 0) {
    return JSON.parse(responseJson.output_text);
  }

  const outputText = responseJson?.output
    ?.flatMap(item => item?.content ?? [])
    ?.find(item => typeof item?.text === 'string')
    ?.text;

  if (typeof outputText === 'string' && outputText.trim().length > 0) {
    return JSON.parse(outputText);
  }

  throw new Error('Responses API 未返回可解析的 output_text');
}

async function requestCloudPlanning({ jobRoot, job, request, sourceArtFile }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return null;
  }

  const inputImagePart = await buildInputImagePart(jobRoot, sourceArtFile);
  const userContent = [
    {
      type: 'input_text',
      text: buildCloudPrompt({ job, request, sourceArtFile })
    }
  ];
  if (inputImagePart) {
    userContent.push(inputImagePart);
  }

  const response = await fetch(`${getOpenAIBaseUrl()}/responses`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`,
      'x-client-request-id': job.jobId,
      ...(process.env.OPENAI_ORGANIZATION
        ? { 'OpenAI-Organization': process.env.OPENAI_ORGANIZATION }
        : {}),
      ...(process.env.OPENAI_PROJECT
        ? { 'OpenAI-Project': process.env.OPENAI_PROJECT }
        : {})
    },
    body: JSON.stringify({
      model: getOpenAIModel(),
      input: [
        {
          role: 'system',
          content: [
            {
              type: 'input_text',
              text: 'Return only planning JSON that matches the provided schema.'
            }
          ]
        },
        {
          role: 'user',
          content: userContent
        }
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'blackbox_planning',
          strict: true,
          schema: buildPlanningSchema()
        }
      }
    })
  });

  const responseJson = await response.json().catch(async () => ({
    rawText: await response.text()
  }));

  if (!response.ok) {
    const detail = typeof responseJson?.error?.message === 'string'
      ? responseJson.error.message
      : JSON.stringify(responseJson);
    throw new Error(`Responses API 请求失败 status=${response.status} detail=${detail}`);
  }

  return {
    planning: parsePlanningOutput(responseJson),
    model: getOpenAIModel(),
    responseId: responseJson.id ?? null,
    requestId: response.headers.get('x-request-id') ?? null,
    processingMs: response.headers.get('openai-processing-ms') ?? null,
    usage: responseJson.usage ?? null
  };
}

function buildLayerPlan({ job, sourceArtFile, planning }) {
  const cloudLayerMap = new Map(
    (planning?.layerPlan?.layers ?? []).map(layer => [layer.slotName, layer])
  );

  return {
    schemaVersion: 'blackbox_layer_plan_v1',
    jobId: job.jobId,
    presentationId: job.presentationId,
    providerName: job.providerName,
    sourceArtFile,
    summary: planning?.summary ?? null,
    layers: [...job.requestedSlots]
      .sort((left, right) => left.localeCompare(right))
      .map((slotName, index) => {
        const cloudLayer = cloudLayerMap.get(slotName) ?? {};
        return {
          layerId: `layer_${slotName}`,
          slotName,
          componentId: cloudLayer.componentId ?? `slot_${slotName}`,
          drawOrder: Number.isInteger(cloudLayer.drawOrder) ? cloudLayer.drawOrder : index,
          sourceArtFile,
          artifactFile: path.posix.join('artifacts', 'components', slotName, 'render.png'),
          artifactPrompt: cloudLayer.artifactPrompt ?? `${job.presentationId} ${slotName} component`,
          notes: cloudLayer.notes ?? 'offline stub fallback'
        };
      })
  };
}

function buildSlotMap({ job, sourceArtFile, planning }) {
  const cloudSlotMap = new Map(
    (planning?.slotMap?.slots ?? []).map(slot => [slot.slotName, slot])
  );

  return {
    schemaVersion: 'blackbox_slot_map_v1',
    jobId: job.jobId,
    presentationId: job.presentationId,
    slots: [...job.requestedSlots]
      .sort((left, right) => left.localeCompare(right))
      .map(slotName => {
        const cloudSlot = cloudSlotMap.get(slotName) ?? {};
        return {
          slotName,
          componentId: cloudSlot.componentId ?? `slot_${slotName}`,
          artifactFile: path.posix.join('artifacts', 'components', slotName, 'render.png'),
          sourceArtFile,
          notes: cloudSlot.notes ?? 'offline stub fallback'
        };
      })
  };
}

function buildVariantPlan({ job, request, planning }) {
  const variantMap = new Map(
    request.variants.map(variant => [variant.variantId, variant])
  );
  const cloudVariantMap = new Map(
    (planning?.variantPlan?.variants ?? []).map(variant => [variant.variantId, variant])
  );

  return {
    schemaVersion: 'blackbox_variant_plan_v1',
    jobId: job.jobId,
    presentationId: job.presentationId,
    variants: [...job.requestedVariants]
      .sort((left, right) => left.localeCompare(right))
      .map(variantId => {
        const variant = variantMap.get(variantId);
        const cloudVariant = cloudVariantMap.get(variantId) ?? {};
        return {
          variantId,
          label: cloudVariant.label ?? variant?.label ?? variantId,
          skin: cloudVariant.skin ?? variant?.skin ?? variantId,
          requiredComponents: Array.isArray(cloudVariant.requiredComponents)
            ? [...cloudVariant.requiredComponents]
            : [...job.requestedSlots]
              .sort((left, right) => left.localeCompare(right))
              .map(slotName => `slot_${slotName}`),
          notes: cloudVariant.notes ?? 'offline stub fallback'
        };
      })
  };
}

function buildProviderReport({
  job,
  sourceArtFile,
  startedAt,
  completedAt,
  mode,
  usedCloud,
  model,
  requestId = null,
  responseId = null,
  processingMs = null,
  usage = null,
  errorMessage = null
}) {
  const startMs = Date.parse(startedAt);
  const endMs = Date.parse(completedAt);
  const apiKeyConfigured = Boolean(process.env.OPENAI_API_KEY);

  return {
    schemaVersion: 'blackbox_provider_report_v1',
    jobId: job.jobId,
    presentationId: job.presentationId,
    providerType: job.providerType,
    providerName: job.providerName,
    model,
    mode,
    usedCloud,
    apiKeyConfigured,
    sourceArtFile,
    startedAt,
    completedAt,
    durationMs: Number.isFinite(endMs - startMs) ? endMs - startMs : 0,
    requestId,
    responseId,
    processingMs,
    usage,
    notes: [
      '第一阶段 cloud_stub 仅产出计划文件、证据与可预览组件图，不直接生成生产级 Spine 数据。',
      apiKeyConfigured
        ? '检测到 OPENAI_API_KEY，优先尝试真实云端规划；失败时返回明确错误而不是静默伪成功。'
        : '未检测到 OPENAI_API_KEY，使用离线 stub 产物保证链路可验收。'
    ],
    errorMessage
  };
}

export async function runCloudStubProvider({ jobRoot, job }) {
  const startedAt = new Date().toISOString();
  const request = await readJson(path.join(jobRoot, job.inputSnapshot.requestJson));
  const sourceArtFile = findPrimaryImage(job.inputSnapshot.artFiles);
  const componentArtifacts = buildComponentArtifactMap(job.requestedSlots);
  let planning = null;
  let providerMeta = {
    mode: 'offline_stub',
    usedCloud: false,
    model: 'openai_cloud_stub_v1',
    requestId: null,
    responseId: null,
    processingMs: null,
    usage: null,
    errorMessage: null
  };

  try {
    const cloudResponse = await requestCloudPlanning({
      jobRoot,
      job,
      request,
      sourceArtFile
    });
    if (cloudResponse) {
      planning = cloudResponse.planning;
      providerMeta = {
        mode: 'cloud_response',
        usedCloud: true,
        model: cloudResponse.model,
        requestId: cloudResponse.requestId,
        responseId: cloudResponse.responseId,
        processingMs: cloudResponse.processingMs,
        usage: cloudResponse.usage,
        errorMessage: null
      };
    }
  } catch (error) {
    const completedAt = new Date().toISOString();
    await writeJson(
      path.join(jobRoot, BLACKBOX_PROVIDER_REPORT_FILE),
      buildProviderReport({
        job,
        sourceArtFile,
        startedAt,
        completedAt,
        mode: 'cloud_error',
        usedCloud: false,
        model: getOpenAIModel(),
        errorMessage: error.message
      })
    );

    return {
      ...job,
      status: 'failed',
      updatedAt: completedAt,
      outputs: {
        layerPlanFile: null,
        slotMapFile: null,
        variantPlanFile: null,
        componentArtifacts: {}
      },
      errors: [
        {
          code: 'cloud_stub_request_failed',
          message: error.message
        }
      ]
    };
  }

  for (const artifactEntry of Object.values(componentArtifacts)) {
    const artifactFile = resolveArtifactFile(artifactEntry);
    const targetPath = path.join(jobRoot, artifactFile);
    if (sourceArtFile) {
      await copyFileEnsured(
        path.join(jobRoot, sourceArtFile),
        targetPath
      );
    } else {
      await writeTinyPng(targetPath);
    }
  }

  await writeJson(
    path.join(jobRoot, BLACKBOX_LAYER_PLAN_FILE),
    buildLayerPlan({ job, sourceArtFile, planning })
  );
  await writeJson(
    path.join(jobRoot, BLACKBOX_SLOT_MAP_FILE),
    buildSlotMap({ job, sourceArtFile, planning })
  );
  await writeJson(
    path.join(jobRoot, BLACKBOX_VARIANT_PLAN_FILE),
    buildVariantPlan({ job, request, planning })
  );

  const completedAt = new Date().toISOString();
  await writeJson(
    path.join(jobRoot, BLACKBOX_PROVIDER_REPORT_FILE),
    buildProviderReport({
      job,
      sourceArtFile,
      startedAt,
      completedAt,
      ...providerMeta
    })
  );

  return {
    ...job,
    status: 'succeeded',
    updatedAt: completedAt,
    outputs: {
      layerPlanFile: BLACKBOX_LAYER_PLAN_FILE,
      slotMapFile: BLACKBOX_SLOT_MAP_FILE,
      variantPlanFile: BLACKBOX_VARIANT_PLAN_FILE,
      componentArtifacts
    },
    errors: []
  };
}
