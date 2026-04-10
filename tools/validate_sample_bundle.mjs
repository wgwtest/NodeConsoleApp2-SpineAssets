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

async function assertFileExists(filePath, label) {
  try {
    await fs.access(filePath);
  } catch {
    throw new Error(`${label} 缺失: ${filePath}`);
  }
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

function validateBundleShape(bundle) {
  assertObject(bundle, 'bundle_manifest');
  for (const key of ['schemaVersion', 'bundleId', 'bundleVersion', 'generatedAt']) {
    assertRequiredString(bundle[key], `bundle_manifest.${key}`);
  }
  assertObject(bundle.sourceCatalog, 'bundle_manifest.sourceCatalog');
  assertRequiredString(
    bundle.sourceCatalog.schemaVersion,
    'bundle_manifest.sourceCatalog.schemaVersion'
  );
  assertRequiredString(
    bundle.sourceCatalog.generatedAt,
    'bundle_manifest.sourceCatalog.generatedAt'
  );
  assertRequiredArray(bundle.characters, 'bundle_manifest.characters');
}

function validateCharacterManifestShape(manifest) {
  assertObject(manifest, 'character_manifest');
  for (const key of ['schemaVersion', 'presentationId', 'skeletonFile', 'atlasFile']) {
    assertRequiredString(manifest[key], `character_manifest.${key}`);
  }
  assertRequiredArray(manifest.texturePages, 'character_manifest.texturePages');
  assertRequiredArray(manifest.animations, 'character_manifest.animations');
  assertRequiredArray(manifest.slots, 'character_manifest.slots');
  assertObject(manifest.anchorProfile, 'character_manifest.anchorProfile');
  assertObject(manifest.scaleProfile, 'character_manifest.scaleProfile');
  assertRequiredString(
    manifest.defaultVariantId,
    'character_manifest.defaultVariantId'
  );
  assertRequiredArray(manifest.variants, 'character_manifest.variants');
  if (manifest.variants.length === 0) {
    throw new Error('character_manifest.variants 不能为空');
  }

  let hasDefaultVariant = false;
  for (const [index, variant] of manifest.variants.entries()) {
    assertObject(variant, `character_manifest.variants[${index}]`);
    for (const key of ['variantId', 'label', 'skin']) {
      assertRequiredString(variant[key], `character_manifest.variants[${index}].${key}`);
    }
    assertRequiredArray(
      variant.allowedAnimations,
      `character_manifest.variants[${index}].allowedAnimations`
    );
    if (variant.requiredComponents !== undefined) {
      assertRequiredArray(
        variant.requiredComponents,
        `character_manifest.variants[${index}].requiredComponents`
      );
    }
    if (variant.notes !== undefined && variant.notes !== null) {
      assertRequiredString(
        variant.notes,
        `character_manifest.variants[${index}].notes`
      );
    }
    if (variant.variantId === manifest.defaultVariantId) {
      hasDefaultVariant = true;
    }
  }

  if (!hasDefaultVariant) {
    throw new Error(
      `character_manifest.defaultVariantId 未出现在 variants 中: ${manifest.defaultVariantId}`
    );
  }
}

export async function validateSampleBundle({ bundleRoot }) {
  if (!bundleRoot) {
    throw new Error('缺少 bundleRoot');
  }

  const resolvedBundleRoot = path.resolve(bundleRoot);
  const bundleManifestPath = path.join(resolvedBundleRoot, 'bundle_manifest.json');
  await assertFileExists(bundleManifestPath, 'bundle_manifest.json');
  const bundle = await readJson(bundleManifestPath);
  validateBundleShape(bundle);

  const characters = [];

  for (const item of bundle.characters) {
    assertRequiredString(item.presentationId, 'bundle_manifest.characters[].presentationId');
    assertRequiredString(
      item.characterManifest,
      'bundle_manifest.characters[].characterManifest'
    );

    const manifestPath = path.join(resolvedBundleRoot, item.characterManifest);
    await assertFileExists(manifestPath, `character_manifest ${item.presentationId}`);
    const manifest = await readJson(manifestPath);
    validateCharacterManifestShape(manifest);

    const characterDir = path.dirname(manifestPath);
    if (path.basename(characterDir) !== manifest.presentationId) {
      throw new Error(
        `角色目录与 presentationId 不一致 dir=${path.basename(characterDir)} presentationId=${manifest.presentationId}`
      );
    }

    await assertFileExists(
      path.join(characterDir, manifest.skeletonFile),
      manifest.skeletonFile
    );
    await assertFileExists(
      path.join(characterDir, manifest.atlasFile),
      manifest.atlasFile
    );

    for (const texturePage of manifest.texturePages) {
      await assertFileExists(path.join(characterDir, texturePage), texturePage);
    }

    characters.push({
      presentationId: manifest.presentationId,
      manifestPath,
      texturePages: [...manifest.texturePages]
    });
  }

  return {
    ok: true,
    bundleId: bundle.bundleId,
    checkedCharacters: characters.length,
    characters
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const bundleRoot = path.resolve(process.cwd(), 'workspace', 'exports', 'b1_official_samples');
  const report = await validateSampleBundle({ bundleRoot });
  console.log(`VALIDATE OK characters=${report.checkedCharacters} bundle=${report.bundleId}`);
}
