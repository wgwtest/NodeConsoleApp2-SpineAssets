import fs from 'node:fs/promises';
import path from 'node:path';

function assertObject(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} 必须是 object`);
  }
}

function assertRequiredString(value, label) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`${label} 必须是非空字符串`);
  }
}

function assertRequiredArray(value, label) {
  if (!Array.isArray(value)) {
    throw new Error(`${label} 必须是 array`);
  }
}

function assertRequiredBoolean(value, label) {
  if (typeof value !== 'boolean') {
    throw new Error(`${label} 必须是 boolean`);
  }
}

function assertOptionalString(value, label) {
  if (value !== undefined && typeof value !== 'string') {
    throw new Error(`${label} 必须是 string`);
  }
}

function assertOptionalArray(value, label) {
  if (value !== undefined && !Array.isArray(value)) {
    throw new Error(`${label} 必须是 array`);
  }
}

async function assertPathExists(filePath, label) {
  try {
    await fs.access(filePath);
  } catch {
    throw new Error(`${label} 缺失: ${filePath}`);
  }
}

async function assertDirectoryHasEntries(dirPath, label) {
  await assertPathExists(dirPath, label);
  const entries = await fs.readdir(dirPath);
  if (entries.length === 0) {
    throw new Error(`${label} 不能为空: ${dirPath}`);
  }
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

function validatePackageManifestShape(manifest) {
  assertObject(manifest, 'package_manifest');

  if (manifest.schemaVersion !== 'spine_package_manifest_v1') {
    throw new Error(`package_manifest.schemaVersion 不支持: ${manifest.schemaVersion}`);
  }

  for (const key of [
    'presentationId',
    'characterRequestId',
    'bundleTarget',
    'sourceRequestDir',
    'requestSnapshotFile',
    'defaultVariantId',
    'componentsDir',
    'spineDir',
    'skeletonFile',
    'atlasFile'
  ]) {
    assertRequiredString(manifest[key], `package_manifest.${key}`);
  }

  assertRequiredArray(manifest.variantIds, 'package_manifest.variantIds');
  if (manifest.variantIds.length === 0) {
    throw new Error('package_manifest.variantIds 不能为空');
  }

  assertRequiredArray(manifest.exportableVariantIds, 'package_manifest.exportableVariantIds');
  assertRequiredArray(manifest.texturePages, 'package_manifest.texturePages');
  if (!manifest.variantIds.includes(manifest.defaultVariantId)) {
    throw new Error(
      `package_manifest.defaultVariantId 不在 variantIds 中: ${manifest.defaultVariantId}`
    );
  }

  assertObject(manifest.anchorProfile, 'package_manifest.anchorProfile');
  assertObject(manifest.scaleProfile, 'package_manifest.scaleProfile');
}

function validateRequestSnapshotShape(snapshot, manifest) {
  assertObject(snapshot, 'request_snapshot');
  assertRequiredString(
    snapshot.characterRequestId,
    'request_snapshot.characterRequestId'
  );
  assertRequiredString(
    snapshot.presentationId,
    'request_snapshot.presentationId'
  );
  assertRequiredArray(snapshot.artFiles, 'request_snapshot.artFiles');
  assertRequiredArray(snapshot.noteFiles, 'request_snapshot.noteFiles');
  assertRequiredArray(snapshot.refFiles, 'request_snapshot.refFiles');

  if (snapshot.characterRequestId !== manifest.characterRequestId) {
    throw new Error(
      `request_snapshot.characterRequestId 不匹配: ${snapshot.characterRequestId}`
    );
  }

  if (snapshot.presentationId !== manifest.presentationId) {
    throw new Error(
      `request_snapshot.presentationId 不匹配: ${snapshot.presentationId}`
    );
  }
}

function validateVariantShape(variant, manifest, variantId) {
  assertObject(variant, `variant.${variantId}`);

  if (variant.schemaVersion !== 'spine_variant_manifest_v1') {
    throw new Error(`variant.${variantId}.schemaVersion 不支持: ${variant.schemaVersion}`);
  }

  if (variant.presentationId !== manifest.presentationId) {
    throw new Error(
      `variant.${variantId}.presentationId 不匹配: ${variant.presentationId}`
    );
  }

  if (variant.variantId !== variantId) {
    throw new Error(`variant.${variantId}.variantId 不匹配: ${variant.variantId}`);
  }

  for (const key of ['label', 'skin']) {
    assertRequiredString(variant[key], `variant.${variantId}.${key}`);
  }

  assertRequiredBoolean(variant.enabled, `variant.${variantId}.enabled`);
  assertRequiredArray(variant.allowedAnimations, `variant.${variantId}.allowedAnimations`);
  assertRequiredArray(variant.requiredComponents, `variant.${variantId}.requiredComponents`);
}

function validateComponentDescriptorShape(
  descriptor,
  manifest,
  componentId,
  { requireBlackboxReady = true } = {}
) {
  assertObject(descriptor, `component.${componentId}`);

  if (descriptor.schemaVersion !== 'spine_component_descriptor_v1') {
    throw new Error(
      `component.${componentId}.schemaVersion 不支持: ${descriptor.schemaVersion}`
    );
  }

  if (descriptor.presentationId !== manifest.presentationId) {
    throw new Error(
      `component.${componentId}.presentationId 不匹配: ${descriptor.presentationId}`
    );
  }

  if (descriptor.componentId !== componentId) {
    throw new Error(`component.${componentId}.componentId 不匹配: ${descriptor.componentId}`);
  }

  assertRequiredString(descriptor.slotName, `component.${componentId}.slotName`);
  assertRequiredString(descriptor.status, `component.${componentId}.status`);
  if (!['pending_blackbox', 'ready', 'rejected'].includes(descriptor.status)) {
    throw new Error(`component.${componentId}.status 不支持: ${descriptor.status}`);
  }
  assertRequiredArray(descriptor.sourceFiles, `component.${componentId}.sourceFiles`);
  assertRequiredArray(descriptor.artifactFiles, `component.${componentId}.artifactFiles`);
  assertOptionalString(descriptor.blackboxJobId, `component.${componentId}.blackboxJobId`);
  assertOptionalString(descriptor.providerType, `component.${componentId}.providerType`);
  assertOptionalString(descriptor.providerName, `component.${componentId}.providerName`);
  assertOptionalString(descriptor.readiness, `component.${componentId}.readiness`);
  assertOptionalString(descriptor.reviewStatus, `component.${componentId}.reviewStatus`);
  assertOptionalArray(descriptor.evidenceFiles, `component.${componentId}.evidenceFiles`);

  if (
    descriptor.readiness !== undefined &&
    !['missing', 'draft', 'ready'].includes(descriptor.readiness)
  ) {
    throw new Error(`component.${componentId}.readiness 不支持: ${descriptor.readiness}`);
  }
  if (
    descriptor.reviewStatus !== undefined &&
    !['unreviewed', 'approved', 'rejected'].includes(descriptor.reviewStatus)
  ) {
    throw new Error(`component.${componentId}.reviewStatus 不支持: ${descriptor.reviewStatus}`);
  }
  if (descriptor.status === 'ready' && descriptor.artifactFiles.length === 0) {
    throw new Error(`component.${componentId}.artifactFiles 不能为空，因为状态为 ready`);
  }
  if (descriptor.readiness === 'ready' && descriptor.artifactFiles.length === 0) {
    throw new Error(`component.${componentId}.artifactFiles 不能为空，因为 readiness=ready`);
  }
  if (
    descriptor.readiness === 'ready' &&
    (!Array.isArray(descriptor.evidenceFiles) || descriptor.evidenceFiles.length === 0)
  ) {
    throw new Error(`component.${componentId}.evidenceFiles 不能为空，因为 readiness=ready`);
  }

  if (requireBlackboxReady) {
    assertRequiredString(descriptor.blackboxJobId, `component.${componentId}.blackboxJobId`);
    assertRequiredString(descriptor.providerType, `component.${componentId}.providerType`);
    assertRequiredString(descriptor.providerName, `component.${componentId}.providerName`);
    assertRequiredString(descriptor.readiness, `component.${componentId}.readiness`);
    assertRequiredString(descriptor.reviewStatus, `component.${componentId}.reviewStatus`);
    assertRequiredArray(descriptor.evidenceFiles, `component.${componentId}.evidenceFiles`);

    if (descriptor.readiness !== 'ready') {
      throw new Error(`component.${componentId}.readiness 必须为 ready`);
    }
    if (descriptor.artifactFiles.length === 0) {
      throw new Error(`component.${componentId}.artifactFiles 不能为空，因为 strict 校验开启`);
    }
    if (descriptor.evidenceFiles.length === 0) {
      throw new Error(`component.${componentId}.evidenceFiles 不能为空，因为 strict 校验开启`);
    }
  }
}

export async function validateSpinePackage({
  packageRoot,
  requireBlackboxReady = true
}) {
  if (!packageRoot) {
    throw new Error('缺少 packageRoot');
  }

  const resolvedRoot = path.resolve(packageRoot);
  const manifestPath = path.join(resolvedRoot, 'package_manifest.json');
  await assertPathExists(manifestPath, 'package_manifest.json');
  const manifest = await readJson(manifestPath);
  validatePackageManifestShape(manifest);

  const componentsRoot = path.join(resolvedRoot, manifest.componentsDir);
  const spineRoot = path.join(resolvedRoot, manifest.spineDir);
  const sourceRoot = path.join(resolvedRoot, manifest.sourceRequestDir);
  const requestSnapshotPath = path.join(resolvedRoot, manifest.requestSnapshotFile);
  await assertPathExists(path.join(resolvedRoot, 'variants'), 'variants');
  await assertDirectoryHasEntries(componentsRoot, 'components');
  await assertDirectoryHasEntries(spineRoot, 'spine');
  await assertDirectoryHasEntries(sourceRoot, 'source');
  await assertPathExists(requestSnapshotPath, 'request_snapshot.json');
  const requestSnapshot = await readJson(requestSnapshotPath);
  validateRequestSnapshotShape(requestSnapshot, manifest);
  await assertPathExists(
    path.join(spineRoot, manifest.skeletonFile),
    `skeleton ${manifest.skeletonFile}`
  );
  await assertPathExists(
    path.join(spineRoot, manifest.atlasFile),
    `atlas ${manifest.atlasFile}`
  );
  for (const texturePage of manifest.texturePages) {
    assertRequiredString(texturePage, 'package_manifest.texturePages[]');
    await assertPathExists(path.join(spineRoot, texturePage), `texture ${texturePage}`);
  }
  for (const relativePath of requestSnapshot.artFiles) {
    assertRequiredString(relativePath, 'request_snapshot.artFiles[]');
    await assertPathExists(path.join(sourceRoot, relativePath), `source art ${relativePath}`);
  }
  for (const relativePath of requestSnapshot.noteFiles) {
    assertRequiredString(relativePath, 'request_snapshot.noteFiles[]');
    await assertPathExists(path.join(sourceRoot, relativePath), `source note ${relativePath}`);
  }
  for (const relativePath of requestSnapshot.refFiles) {
    assertRequiredString(relativePath, 'request_snapshot.refFiles[]');
    await assertPathExists(path.join(sourceRoot, relativePath), `source ref ${relativePath}`);
  }

  const componentEntries = await fs.readdir(componentsRoot, { withFileTypes: true });
  const components = [];
  for (const entry of componentEntries.filter(item => item.isDirectory())) {
    const componentId = entry.name;
    const descriptorPath = path.join(componentsRoot, componentId, 'descriptor.json');
    await assertPathExists(descriptorPath, `component descriptor ${componentId}`);
    const descriptor = await readJson(descriptorPath);
    validateComponentDescriptorShape(descriptor, manifest, componentId, { requireBlackboxReady });

    for (const relativePath of descriptor.sourceFiles) {
      assertRequiredString(relativePath, `component.${componentId}.sourceFiles[]`);
      await assertPathExists(
        path.join(sourceRoot, relativePath),
        `component source ${componentId}:${relativePath}`
      );
    }

    for (const relativePath of descriptor.artifactFiles) {
      assertRequiredString(relativePath, `component.${componentId}.artifactFiles[]`);
      await assertPathExists(
        path.join(resolvedRoot, relativePath),
        `component artifact ${componentId}:${relativePath}`
      );
    }

    if (Array.isArray(descriptor.evidenceFiles)) {
      for (const relativePath of descriptor.evidenceFiles) {
        assertRequiredString(relativePath, `component.${componentId}.evidenceFiles[]`);
        await assertPathExists(
          path.join(resolvedRoot, relativePath),
          `component evidence ${componentId}:${relativePath}`
        );
      }
    }

    components.push(descriptor);
  }
  components.sort((left, right) => left.componentId.localeCompare(right.componentId));

  const variants = [];
  for (const variantId of manifest.variantIds) {
    const variantPath = path.join(resolvedRoot, 'variants', variantId, 'variant.json');
    await assertPathExists(variantPath, `variant ${variantId}`);
    const variant = await readJson(variantPath);
    validateVariantShape(variant, manifest, variantId);

    for (const componentId of variant.requiredComponents) {
      assertRequiredString(componentId, `variant.${variantId}.requiredComponents[]`);
      await assertPathExists(
        path.join(componentsRoot, componentId),
        `component ${componentId}`
      );
    }

    variants.push(variant);
  }

  return {
    ok: true,
    packageRoot: resolvedRoot,
    bundleTarget: manifest.bundleTarget,
    presentationId: manifest.presentationId,
    defaultVariantId: manifest.defaultVariantId,
    variantCount: manifest.variantIds.length,
    exportableVariantCount: manifest.exportableVariantIds.length,
    componentCount: components.length,
    requireBlackboxReady,
    manifest,
    requestSnapshot,
    components,
    variants
  };
}

export async function validateSpinePackageCollection({
  packagesRoot,
  requireBlackboxReady = true
}) {
  if (!packagesRoot) {
    throw new Error('缺少 packagesRoot');
  }

  const resolvedRoot = path.resolve(packagesRoot);
  await assertPathExists(resolvedRoot, 'packagesRoot');
  const entries = await fs.readdir(resolvedRoot, { withFileTypes: true });
  const packageDirs = entries
    .filter(entry => entry.isDirectory())
    .map(entry => path.join(resolvedRoot, entry.name));

  const reports = [];
  for (const dir of packageDirs) {
    reports.push(await validateSpinePackage({ packageRoot: dir, requireBlackboxReady }));
  }

  return reports;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const targetRoot = process.argv[2] ?? path.resolve(process.cwd(), 'workspace', 'packages');
  const manifestPath = path.join(targetRoot, 'package_manifest.json');

  try {
    await fs.access(manifestPath);
    const report = await validateSpinePackage({ packageRoot: targetRoot });
    console.log(
      `VALIDATE PACKAGE OK presentationId=${report.presentationId} variants=${report.variantCount}`
    );
  } catch {
    const reports = await validateSpinePackageCollection({ packagesRoot: targetRoot });
    console.log(`VALIDATE PACKAGE ROOT OK count=${reports.length}`);
  }
}
