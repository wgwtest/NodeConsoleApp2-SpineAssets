import fs from 'node:fs/promises';
import path from 'node:path';

import { validateSpinePackage, validateSpinePackageCollection } from './validate_spine_package.mjs';

function extractAnimations(spineJson) {
  return Object.keys(spineJson?.animations || {});
}

function extractSlots(spineJson) {
  if (!Array.isArray(spineJson?.slots)) return [];
  return spineJson.slots
    .map(slot => slot?.name)
    .filter(value => typeof value === 'string' && value.length > 0);
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function copyAsset(sourceFile, targetFile) {
  await fs.mkdir(path.dirname(targetFile), { recursive: true });
  await fs.copyFile(sourceFile, targetFile);
}

async function resolvePackageReports(packagesRoot) {
  const resolvedRoot = path.resolve(packagesRoot);
  const packageManifestPath = path.join(resolvedRoot, 'package_manifest.json');

  try {
    await fs.access(packageManifestPath);
    return [await validateSpinePackage({ packageRoot: resolvedRoot })];
  } catch {
    return validateSpinePackageCollection({ packagesRoot: resolvedRoot });
  }
}

export async function buildRequestBundle({
  packagesRoot,
  outputRoot,
  bundleId = 'request_driven_bundle',
  bundleVersion = '0.1.0',
  allowedReviewStatuses = ['unreviewed', 'approved']
}) {
  if (!packagesRoot) {
    throw new Error('缺少 packagesRoot');
  }
  if (!outputRoot) {
    throw new Error('缺少 outputRoot');
  }

  const resolvedOutputRoot = path.resolve(outputRoot);
  const reports = await resolvePackageReports(packagesRoot);
  const generatedAt = new Date().toISOString();

  await fs.rm(resolvedOutputRoot, { recursive: true, force: true });
  await fs.mkdir(path.join(resolvedOutputRoot, 'characters'), { recursive: true });

  const bundle = {
    schemaVersion: 'spine_bundle_manifest_v1',
    bundleId,
    bundleVersion,
    generatedAt,
    sourceCatalog: {
      schemaVersion: 'character_request_v1',
      generatedAt
    },
    characters: []
  };

  const characters = [];

  for (const report of reports) {
    const { manifest, variants, packageRoot, presentationId } = report;
    const spineRoot = path.join(packageRoot, manifest.spineDir);
    const characterDir = path.join(resolvedOutputRoot, 'characters', presentationId);
    const spineJson = await readJson(path.join(spineRoot, manifest.skeletonFile));
    const animations = extractAnimations(spineJson);
    const slots = extractSlots(spineJson);
    const componentsById = new Map(
      report.components.map(component => [component.componentId, component])
    );

    await fs.mkdir(characterDir, { recursive: true });
    await copyAsset(
      path.join(spineRoot, manifest.skeletonFile),
      path.join(characterDir, manifest.skeletonFile)
    );
    await copyAsset(
      path.join(spineRoot, manifest.atlasFile),
      path.join(characterDir, manifest.atlasFile)
    );
    for (const texturePage of manifest.texturePages) {
      await copyAsset(
        path.join(spineRoot, texturePage),
        path.join(characterDir, texturePage)
      );
    }

    const exportVariants = variants
      .filter(variant => manifest.exportableVariantIds.includes(variant.variantId))
      .map(variant => {
        for (const componentId of variant.requiredComponents) {
          const component = componentsById.get(componentId);
          if (!component) {
            throw new Error(`variant ${variant.variantId} 缺少 required component: ${componentId}`);
          }
          if (component.readiness !== 'ready') {
            throw new Error(
              `variant ${variant.variantId} 的 component ${componentId} readiness=${component.readiness}`
            );
          }
          if (!allowedReviewStatuses.includes(component.reviewStatus)) {
            throw new Error(
              `variant ${variant.variantId} 的 component ${componentId} reviewStatus=${component.reviewStatus} 不允许导出`
            );
          }
        }

        return {
          variantId: variant.variantId,
          label: variant.label,
          skin: variant.skin,
          enabled: variant.enabled,
          allowedAnimations: [...variant.allowedAnimations],
          anchorProfileOverride: variant.anchorProfileOverride ?? null,
          scaleProfileOverride: variant.scaleProfileOverride ?? null,
          resourceOverrides: variant.resourceOverrides ?? {}
        };
      });

    const characterManifest = {
      schemaVersion: 'spine_character_manifest_v2',
      presentationId,
      skeletonFile: manifest.skeletonFile,
      atlasFile: manifest.atlasFile,
      texturePages: [...manifest.texturePages],
      animations,
      slots,
      anchorProfile: manifest.anchorProfile,
      scaleProfile: manifest.scaleProfile,
      defaultVariantId: manifest.defaultVariantId,
      variants: exportVariants
    };

    await fs.writeFile(
      path.join(characterDir, 'character_manifest.json'),
      JSON.stringify(characterManifest, null, 2),
      'utf8'
    );

    bundle.characters.push({
      presentationId,
      characterManifest: `characters/${presentationId}/character_manifest.json`
    });

    characters.push({
      presentationId,
      characterDir,
      manifest: characterManifest
    });
  }

  await fs.writeFile(
    path.join(resolvedOutputRoot, 'bundle_manifest.json'),
    JSON.stringify(bundle, null, 2),
    'utf8'
  );

  return {
    outputRoot: resolvedOutputRoot,
    bundle,
    characters
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const packagesRoot = process.argv[2] ?? path.resolve(process.cwd(), 'workspace', 'packages');
  const outputRoot =
    process.argv[3] ?? path.resolve(process.cwd(), 'workspace', 'exports', 'request_driven_bundle');
  const bundleId = process.argv[4] ?? 'request_driven_bundle';
  const result = await buildRequestBundle({ packagesRoot, outputRoot, bundleId });
  console.log(`BUILD REQUEST BUNDLE OK characters=${result.characters.length} output=${result.outputRoot}`);
}
