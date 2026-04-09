import path from 'node:path';

import {
  BLACKBOX_LAYER_PLAN_FILE,
  BLACKBOX_PROVIDER_REPORT_FILE,
  BLACKBOX_SLOT_MAP_FILE,
  BLACKBOX_VARIANT_PLAN_FILE,
  buildComponentArtifactMap,
  pathExists,
  resolveArtifactFile
} from './blackbox_shared.mjs';

function buildMissingOutputError(missingFiles) {
  return {
    code: 'manual_artifacts_missing',
    message: 'manual provider 需要人工回填计划文件、证据与组件图后才能收口。',
    missingFiles
  };
}

export async function runManualProvider({ jobRoot, job }) {
  const now = new Date().toISOString();
  const componentArtifacts = buildComponentArtifactMap(job.requestedSlots);
  const missingFiles = [];

  const layerPlanPath = path.join(jobRoot, BLACKBOX_LAYER_PLAN_FILE);
  const slotMapPath = path.join(jobRoot, BLACKBOX_SLOT_MAP_FILE);
  const variantPlanPath = path.join(jobRoot, BLACKBOX_VARIANT_PLAN_FILE);
  const providerReportPath = path.join(jobRoot, BLACKBOX_PROVIDER_REPORT_FILE);

  const layerPlanExists = await pathExists(layerPlanPath);
  const slotMapExists = await pathExists(slotMapPath);
  const variantPlanExists = await pathExists(variantPlanPath);
  const providerReportExists = await pathExists(providerReportPath);

  if (!layerPlanExists) {
    missingFiles.push(BLACKBOX_LAYER_PLAN_FILE);
  }
  if (!slotMapExists) {
    missingFiles.push(BLACKBOX_SLOT_MAP_FILE);
  }
  if (!variantPlanExists) {
    missingFiles.push(BLACKBOX_VARIANT_PLAN_FILE);
  }
  if (!providerReportExists) {
    missingFiles.push(BLACKBOX_PROVIDER_REPORT_FILE);
  }

  const resolvedArtifacts = {};
  for (const [slotName, artifactEntry] of Object.entries(componentArtifacts)) {
    const artifactFile = resolveArtifactFile(artifactEntry);
    const artifactExists = artifactFile && await pathExists(path.join(jobRoot, artifactFile));
    if (!artifactExists) {
      missingFiles.push(artifactFile);
      continue;
    }
    resolvedArtifacts[slotName] = artifactEntry;
  }

  const completed = missingFiles.length === 0;
  return {
    ...job,
    status: completed ? 'manual_completed' : 'manual_pending',
    updatedAt: now,
    outputs: {
      layerPlanFile: layerPlanExists ? BLACKBOX_LAYER_PLAN_FILE : null,
      slotMapFile: slotMapExists ? BLACKBOX_SLOT_MAP_FILE : null,
      variantPlanFile: variantPlanExists ? BLACKBOX_VARIANT_PLAN_FILE : null,
      componentArtifacts: resolvedArtifacts
    },
    errors: completed ? [] : [buildMissingOutputError(missingFiles)]
  };
}
