import fs from 'node:fs/promises';
import path from 'node:path';

import {
  validateCharacterRequest,
  validateCharacterRequestCollection
} from './validate_character_request.mjs';

const TINY_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aK1sAAAAASUVORK5CYII=';

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(value, null, 2), 'utf8');
}

async function writeText(filePath, content) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, 'utf8');
}

async function writeTinyPng(filePath) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, Buffer.from(TINY_PNG_BASE64, 'base64'));
}

async function copyFileEnsured(sourcePath, targetPath) {
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.copyFile(sourcePath, targetPath);
}

async function listFilesRecursive(rootDir, relativePrefix = '') {
  const resolvedRoot = path.resolve(rootDir);
  const entries = await fs.readdir(resolvedRoot, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const absolutePath = path.join(resolvedRoot, entry.name);
    const relativePath = path.posix.join(relativePrefix, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listFilesRecursive(absolutePath, relativePath));
    } else {
      files.push(relativePath);
    }
  }

  return files.sort();
}

async function resolveRequestReports(requestsRoot) {
  const resolvedRoot = path.resolve(requestsRoot);
  const requestJsonPath = path.join(resolvedRoot, 'request.json');

  try {
    await fs.access(requestJsonPath);
    return [await validateCharacterRequest({ requestRoot: resolvedRoot })];
  } catch {
    return validateCharacterRequestCollection({ requestsRoot: resolvedRoot });
  }
}

async function pruneObsoletePackageDirs(outputRoot, keepPresentationIds) {
  await fs.mkdir(outputRoot, { recursive: true });
  const entries = await fs.readdir(outputRoot, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }
    if (keepPresentationIds.has(entry.name)) {
      continue;
    }
    await fs.rm(path.join(outputRoot, entry.name), { recursive: true, force: true });
  }
}

function buildPlaceholderSpineJson(request) {
  return {
    skeleton: {
      spine: '4.2.22'
    },
    slots: request.requiredSlots.map(name => ({ name })),
    skins: request.variants.map(variant => ({ name: variant.skin })),
    animations: Object.fromEntries(
      request.requiredActions.map(name => [name, {}])
    )
  };
}

function buildAtlasText(textureFile) {
  return `${textureFile}
size: 1,1
format: RGBA8888
filter: Linear,Linear
repeat: none
`;
}

function buildPackageManifest(request) {
  return {
    schemaVersion: 'spine_package_manifest_v1',
    presentationId: request.presentationId,
    characterRequestId: request.characterRequestId,
    bundleTarget: request.bundleTarget,
    sourceRequestDir: 'source',
    requestSnapshotFile: 'source/request_snapshot.json',
    defaultVariantId: request.variants[0].variantId,
    variantIds: request.variants.map(variant => variant.variantId),
    exportableVariantIds: request.variants.map(variant => variant.variantId),
    componentsDir: 'components',
    spineDir: 'spine',
    skeletonFile: `${request.presentationId}.json`,
    atlasFile: `${request.presentationId}.atlas`,
    texturePages: [`${request.presentationId}.png`],
    anchorProfile: {
      x: 0.5,
      y: 1
    },
    scaleProfile: {
      baseScale: 1
    }
  };
}

function buildVariantManifest(request, variant) {
  return {
    schemaVersion: 'spine_variant_manifest_v1',
    presentationId: request.presentationId,
    variantId: variant.variantId,
    label: variant.label,
    skin: variant.skin,
    enabled: true,
    allowedAnimations: [...request.requiredActions],
    requiredComponents: request.requiredSlots.map(slot => `slot_${slot}`),
    anchorProfileOverride: null,
    scaleProfileOverride: null,
    resourceOverrides: {}
  };
}

function buildComponentDescriptor({
  presentationId,
  slot,
  sourceFiles,
  status = 'pending_blackbox',
  artifactFiles = [],
  readiness = 'missing',
  reviewStatus = 'unreviewed',
  evidenceFiles = []
}) {
  return {
    schemaVersion: 'spine_component_descriptor_v1',
    presentationId,
    componentId: `slot_${slot}`,
    slotName: slot,
    status,
    sourceFiles: [...sourceFiles],
    artifactFiles: [...artifactFiles],
    readiness,
    reviewStatus,
    evidenceFiles: [...evidenceFiles]
  };
}

function findPrimaryPngSource(artFiles) {
  return artFiles.find(filePath => path.extname(filePath).toLowerCase() === '.png') ?? null;
}

async function copyRequestSources(requestRoot, packageRoot) {
  const sourceRoot = path.join(packageRoot, 'source');
  const artSource = path.join(requestRoot, 'art');
  const notesSource = path.join(requestRoot, 'notes');
  const refsSource = path.join(requestRoot, 'refs');

  await fs.cp(artSource, path.join(sourceRoot, 'art'), { recursive: true });
  await fs.cp(notesSource, path.join(sourceRoot, 'notes'), { recursive: true });
  await fs.cp(refsSource, path.join(sourceRoot, 'refs'), { recursive: true });

  return {
    sourceRoot,
    artFiles: await listFilesRecursive(artSource, 'art'),
    noteFiles: await listFilesRecursive(notesSource, 'notes'),
    refFiles: await listFilesRecursive(refsSource, 'refs')
  };
}

export async function buildRequestPackage({
  requestsRoot,
  outputRoot
}) {
  if (!requestsRoot) {
    throw new Error('缺少 requestsRoot');
  }
  if (!outputRoot) {
    throw new Error('缺少 outputRoot');
  }

  const resolvedOutputRoot = path.resolve(outputRoot);
  const reports = await resolveRequestReports(requestsRoot);
  const packages = [];

  await pruneObsoletePackageDirs(
    resolvedOutputRoot,
    new Set(reports.map(report => report.presentationId))
  );

  for (const report of reports) {
    const request = await readJson(path.join(report.requestRoot, 'request.json'));
    const packageManifest = buildPackageManifest(request);
    const packageRoot = path.join(resolvedOutputRoot, request.presentationId);
    const spineRoot = path.join(packageRoot, packageManifest.spineDir);

    await fs.rm(packageRoot, { recursive: true, force: true });
    await writeJson(path.join(packageRoot, 'package_manifest.json'), packageManifest);
    const copiedSources = await copyRequestSources(report.requestRoot, packageRoot);
    await writeJson(
      path.join(packageRoot, packageManifest.requestSnapshotFile),
      {
        characterRequestId: request.characterRequestId,
        presentationId: request.presentationId,
        title: request.title,
        description: request.description,
        bundleTarget: request.bundleTarget,
        artFiles: copiedSources.artFiles,
        noteFiles: copiedSources.noteFiles,
        refFiles: copiedSources.refFiles
      }
    );

    for (const slot of request.requiredSlots) {
      const sourceFiles = [
        ...copiedSources.artFiles,
        ...copiedSources.noteFiles,
        ...copiedSources.refFiles
      ];

      await writeJson(
        path.join(packageRoot, packageManifest.componentsDir, `slot_${slot}`, 'descriptor.json'),
        buildComponentDescriptor({
          presentationId: request.presentationId,
          slot,
          sourceFiles
        })
      );
    }

    for (const variant of request.variants) {
      await writeJson(
        path.join(packageRoot, 'variants', variant.variantId, 'variant.json'),
        buildVariantManifest(request, variant)
      );
    }

    await writeJson(
      path.join(spineRoot, packageManifest.skeletonFile),
      buildPlaceholderSpineJson(request)
    );
    await writeText(
      path.join(spineRoot, packageManifest.atlasFile),
      buildAtlasText(packageManifest.texturePages[0])
    );

    const primaryPngSource = findPrimaryPngSource(copiedSources.artFiles);
    if (primaryPngSource) {
      await copyFileEnsured(
        path.join(packageRoot, packageManifest.sourceRequestDir, primaryPngSource),
        path.join(spineRoot, packageManifest.texturePages[0])
      );
    } else {
      await writeTinyPng(path.join(spineRoot, packageManifest.texturePages[0]));
    }

    packages.push({
      packageRoot,
      presentationId: request.presentationId,
      defaultVariantId: packageManifest.defaultVariantId
    });
  }

  return {
    outputRoot: resolvedOutputRoot,
    packages
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const requestsRoot = process.argv[2] ?? path.resolve(process.cwd(), 'workspace', 'requests');
  const outputRoot = process.argv[3] ?? path.resolve(process.cwd(), 'workspace', 'packages');
  const result = await buildRequestPackage({ requestsRoot, outputRoot });
  console.log(`BUILD REQUEST PACKAGE OK packages=${result.packages.length} output=${result.outputRoot}`);
}
