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

function buildLayerPlan({ job, sourceArtFile }) {
  return {
    schemaVersion: 'blackbox_layer_plan_v1',
    jobId: job.jobId,
    presentationId: job.presentationId,
    providerName: job.providerName,
    sourceArtFile,
    layers: [...job.requestedSlots]
      .sort((left, right) => left.localeCompare(right))
      .map((slotName, index) => ({
        layerId: `layer_${slotName}`,
        slotName,
        componentId: `slot_${slotName}`,
        drawOrder: index,
        sourceArtFile,
        artifactFile: path.posix.join('artifacts', 'components', slotName, 'render.png')
      }))
  };
}

function buildSlotMap({ job, sourceArtFile }) {
  return {
    schemaVersion: 'blackbox_slot_map_v1',
    jobId: job.jobId,
    presentationId: job.presentationId,
    slots: [...job.requestedSlots]
      .sort((left, right) => left.localeCompare(right))
      .map(slotName => ({
        slotName,
        componentId: `slot_${slotName}`,
        artifactFile: path.posix.join('artifacts', 'components', slotName, 'render.png'),
        sourceArtFile
      }))
  };
}

function buildVariantPlan({ job, request }) {
  const variantMap = new Map(
    request.variants.map(variant => [variant.variantId, variant])
  );

  return {
    schemaVersion: 'blackbox_variant_plan_v1',
    jobId: job.jobId,
    presentationId: job.presentationId,
    variants: [...job.requestedVariants]
      .sort((left, right) => left.localeCompare(right))
      .map(variantId => {
        const variant = variantMap.get(variantId);
        return {
          variantId,
          label: variant?.label ?? variantId,
          skin: variant?.skin ?? variantId,
          requiredComponents: [...job.requestedSlots]
            .sort((left, right) => left.localeCompare(right))
            .map(slotName => `slot_${slotName}`)
        };
      })
  };
}

function buildProviderReport({
  job,
  sourceArtFile,
  startedAt,
  completedAt
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
    model: 'openai_cloud_stub_v1',
    mode: apiKeyConfigured ? 'api_key_detected_but_stubbed' : 'offline_stub',
    usedCloud: false,
    apiKeyConfigured,
    sourceArtFile,
    startedAt,
    completedAt,
    durationMs: Number.isFinite(endMs - startMs) ? endMs - startMs : 0,
    notes: [
      '第一阶段 cloud_stub 仅产出计划文件、证据与可预览组件图，不直接生成生产级 Spine 数据。',
      apiKeyConfigured
        ? '检测到 OPENAI_API_KEY，但当前实现仍保持可本地复现的 stub 路径。'
        : '未检测到 OPENAI_API_KEY，使用离线 stub 产物保证链路可验收。'
    ]
  };
}

export async function runCloudStubProvider({ jobRoot, job }) {
  const startedAt = new Date().toISOString();
  const request = await readJson(path.join(jobRoot, job.inputSnapshot.requestJson));
  const sourceArtFile = findPrimaryImage(job.inputSnapshot.artFiles);
  const componentArtifacts = buildComponentArtifactMap(job.requestedSlots);

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
    buildLayerPlan({ job, sourceArtFile })
  );
  await writeJson(
    path.join(jobRoot, BLACKBOX_SLOT_MAP_FILE),
    buildSlotMap({ job, sourceArtFile })
  );
  await writeJson(
    path.join(jobRoot, BLACKBOX_VARIANT_PLAN_FILE),
    buildVariantPlan({ job, request })
  );

  const completedAt = new Date().toISOString();
  await writeJson(
    path.join(jobRoot, BLACKBOX_PROVIDER_REPORT_FILE),
    buildProviderReport({ job, sourceArtFile, startedAt, completedAt })
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
