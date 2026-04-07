import fs from 'node:fs/promises';
import path from 'node:path';

import {
  B1_BUNDLE_ID,
  B1_BUNDLE_VERSION,
  PRESENTATION_CATALOG_SCHEMA_VERSION,
  SPINE_BUNDLE_MANIFEST_SCHEMA_VERSION,
  SPINE_CHARACTER_MANIFEST_SCHEMA_VERSION,
  getOfficialSampleCatalog
} from './b1_sample_catalog.mjs';

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

function extractDefaultSkin(spineJson) {
  if (Array.isArray(spineJson?.skins)) {
    return spineJson.skins[0]?.name ?? null;
  }

  if (spineJson?.skins && typeof spineJson.skins === 'object') {
    return Object.keys(spineJson.skins)[0] ?? null;
  }

  return null;
}

function extractAnimations(spineJson) {
  return Object.keys(spineJson?.animations || {});
}

function extractSlots(spineJson) {
  if (!Array.isArray(spineJson?.slots)) return [];
  return spineJson.slots
    .map(slot => slot?.name)
    .filter(value => typeof value === 'string' && value.length > 0);
}

async function copyAsset(sourceFile, targetFile) {
  await fs.mkdir(path.dirname(targetFile), { recursive: true });
  await fs.copyFile(sourceFile, targetFile);
}

export async function buildSampleBundle({
  samplesRoot,
  outputRoot,
  sampleCatalog = getOfficialSampleCatalog(),
  bundleVersion = B1_BUNDLE_VERSION
}) {
  if (!samplesRoot) {
    throw new Error('缺少 samplesRoot');
  }
  if (!outputRoot) {
    throw new Error('缺少 outputRoot');
  }

  const resolvedSamplesRoot = path.resolve(samplesRoot);
  const resolvedOutputRoot = path.resolve(outputRoot);
  const generatedAt = new Date().toISOString();

  await fs.rm(resolvedOutputRoot, { recursive: true, force: true });
  await fs.mkdir(path.join(resolvedOutputRoot, 'characters'), { recursive: true });

  const bundle = {
    schemaVersion: SPINE_BUNDLE_MANIFEST_SCHEMA_VERSION,
    bundleId: B1_BUNDLE_ID,
    bundleVersion,
    generatedAt,
    sourceCatalog: {
      schemaVersion: PRESENTATION_CATALOG_SCHEMA_VERSION,
      generatedAt
    },
    characters: []
  };

  const characters = [];

  for (const sample of sampleCatalog) {
    const sampleDir = path.join(resolvedSamplesRoot, sample.presentationId);
    const characterDir = path.join(resolvedOutputRoot, 'characters', sample.presentationId);
    const sourceSkeletonFile = path.join(sampleDir, sample.assets.skeleton.sourceName);
    const sourceAtlasFile = path.join(sampleDir, sample.assets.atlas.sourceName);
    const sourceTextureFiles = sample.assets.textures.map(texture =>
      path.join(sampleDir, texture.sourceName)
    );
    const spineJson = await readJson(sourceSkeletonFile);

    await fs.mkdir(characterDir, { recursive: true });
    await copyAsset(
      sourceSkeletonFile,
      path.join(characterDir, sample.assets.skeleton.outputName)
    );
    await copyAsset(
      sourceAtlasFile,
      path.join(characterDir, sample.assets.atlas.outputName)
    );

    for (const texture of sample.assets.textures) {
      await copyAsset(
        path.join(sampleDir, texture.sourceName),
        path.join(characterDir, texture.outputName)
      );
    }

    if (sample.assets.license) {
      const licenseSource = path.join(sampleDir, sample.assets.license.sourceName);
      const licenseTarget = path.join(characterDir, sample.assets.license.outputName);
      await copyAsset(licenseSource, licenseTarget);
    }

    const manifest = {
      schemaVersion: SPINE_CHARACTER_MANIFEST_SCHEMA_VERSION,
      presentationId: sample.presentationId,
      skeletonFile: sample.assets.skeleton.outputName,
      atlasFile: sample.assets.atlas.outputName,
      texturePages: sample.assets.textures.map(texture => texture.outputName),
      defaultSkin: extractDefaultSkin(spineJson),
      animations: extractAnimations(spineJson),
      slots: extractSlots(spineJson),
      anchorProfile: sample.anchorProfile,
      scaleProfile: sample.scaleProfile
    };

    await fs.writeFile(
      path.join(characterDir, 'character_manifest.json'),
      JSON.stringify(manifest, null, 2),
      'utf8'
    );

    bundle.characters.push({
      presentationId: sample.presentationId,
      characterManifest: `characters/${sample.presentationId}/character_manifest.json`
    });

    characters.push({
      presentationId: sample.presentationId,
      sourceSkeletonFile,
      sourceAtlasFile,
      sourceTextureFiles,
      manifest
    });
  }

  await fs.writeFile(
    path.join(resolvedOutputRoot, 'bundle_manifest.json'),
    JSON.stringify(bundle, null, 2),
    'utf8'
  );

  return {
    bundle,
    outputRoot: resolvedOutputRoot,
    characters
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const samplesRoot = path.resolve(process.cwd(), 'workspace', 'samples', 'official');
  const outputRoot = path.resolve(process.cwd(), 'workspace', 'exports', B1_BUNDLE_ID);
  const result = await buildSampleBundle({ samplesRoot, outputRoot });
  console.log(`BUILD OK characters=${result.characters.length} output=${result.outputRoot}`);
}
