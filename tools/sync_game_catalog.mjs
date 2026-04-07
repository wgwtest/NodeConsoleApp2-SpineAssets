import fs from 'node:fs/promises';
import path from 'node:path';

function normalizeBasePath(basePath) {
  if (!basePath || typeof basePath !== 'string') return '';
  return basePath.replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/+$/, '');
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

function resolveContentFile(gameRepoRoot, dataConfig, contentKey) {
  const registry = dataConfig?.contentRegistry || {};
  const entry = registry[contentKey];
  if (!entry?.path) {
    throw new Error(`contentRegistry 缺少 ${contentKey}.path`);
  }

  const basePath = normalizeBasePath(dataConfig?.basePath || '');
  const pathParts = [gameRepoRoot];
  if (basePath) pathParts.push(basePath);
  pathParts.push(entry.path);
  return path.join(...pathParts);
}

function normalizeBodyParts(bodyParts) {
  if (!bodyParts || typeof bodyParts !== 'object') return {};

  return Object.fromEntries(
    Object.entries(bodyParts).map(([partKey, raw]) => {
      const current = Number(raw?.current ?? raw?.armor ?? raw?.durability ?? 0) || 0;
      const max = Number(raw?.max ?? raw?.maxArmor ?? raw?.maxDurability ?? 0) || 0;
      const weakness = Number(raw?.weakness ?? 1) || 1;
      return [partKey, { current, max, weakness }];
    })
  );
}

function normalizePlayerCatalog(playerPack) {
  const source = playerPack?.default;
  if (!source || typeof source !== 'object') {
    throw new Error('player.json 缺少 default 玩家配置');
  }

  return [{
    id: source.id || 'player_default',
    name: source.name || 'Player',
    presentationId: source.id || 'player_default',
    sourceType: 'player',
    stats: {
      hp: Number(source.stats?.hp ?? 0) || 0,
      maxHp: Number(source.stats?.maxHp ?? 0) || 0,
      ap: Number(source.stats?.ap ?? 0) || 0,
      maxAp: Number(source.stats?.maxAp ?? 0) || 0,
      speed: Number(source.stats?.speed ?? 0) || 0
    },
    bodyParts: normalizeBodyParts(source.bodyParts),
    equipmentSlots: Object.keys(source.equipment || {}),
    visual: {
      defaultSkin: null,
      spineSkeletonId: null,
      notes: []
    }
  }];
}

function normalizeEnemyCatalog(enemyPack) {
  if (!enemyPack || typeof enemyPack !== 'object' || Array.isArray(enemyPack)) {
    throw new Error('enemies.json 格式无效');
  }

  return Object.values(enemyPack)
    .filter(entity => entity && typeof entity === 'object')
    .map(source => ({
      id: source.id || null,
      name: source.name || source.id || 'Unknown Enemy',
      presentationId: source.id || null,
      race: source.race || null,
      class: source.class || null,
      sourceType: 'enemy',
      stats: {
        hp: Number(source.stats?.hp ?? source.hp ?? 0) || 0,
        maxHp: Number(source.stats?.maxHp ?? source.maxHp ?? 0) || 0,
        ap: Number(source.stats?.ap ?? source.ap ?? 0) || 0,
        speed: Number(source.stats?.speed ?? source.speed ?? 0) || 0
      },
      bodyParts: normalizeBodyParts(source.bodyParts),
      skillIds: Array.isArray(source.skills) ? [...source.skills] : [],
      visual: {
        defaultSkin: null,
        spineSkeletonId: null,
        notes: []
      }
    }))
    .filter(entity => entity.id);
}

export async function syncGameCatalog({ gameRepoRoot, outputFile }) {
  if (!gameRepoRoot) {
    throw new Error('缺少 gameRepoRoot');
  }
  if (!outputFile) {
    throw new Error('缺少 outputFile');
  }

  const resolvedRepoRoot = path.resolve(gameRepoRoot);
  const resolvedOutputFile = path.resolve(outputFile);
  const configFile = path.join(resolvedRepoRoot, 'assets', 'data', 'config.json');
  const dataConfig = await readJson(configFile);
  const playerFile = resolveContentFile(resolvedRepoRoot, dataConfig, 'player');
  const enemiesFile = resolveContentFile(resolvedRepoRoot, dataConfig, 'enemies');
  const playerPack = await readJson(playerFile);
  const enemyPack = await readJson(enemiesFile);

  const result = {
    meta: {
      schemaVersion: 'presentation_catalog_v1',
      generatedAt: new Date().toISOString(),
      source: {
        gameRepoRoot: resolvedRepoRoot,
        configFile,
        playerFile,
        enemiesFile
      }
    },
    players: normalizePlayerCatalog(playerPack),
    enemies: normalizeEnemyCatalog(enemyPack)
  };

  await fs.mkdir(path.dirname(resolvedOutputFile), { recursive: true });
  await fs.writeFile(resolvedOutputFile, JSON.stringify(result, null, 2), 'utf8');
  return result;
}

async function readSyncConfig(configPath) {
  const resolvedConfigPath = path.resolve(configPath);
  const value = await readJson(resolvedConfigPath);
  const configDir = path.dirname(resolvedConfigPath);

  return {
    gameRepoRoot: value.gameRepoRoot
      ? path.resolve(configDir, value.gameRepoRoot)
      : value.gameRepoRoot,
    outputFile: value.outputFile
      ? path.resolve(configDir, value.outputFile)
      : value.outputFile
  };
}

function parseCliArgs(argv) {
  const args = [...argv];
  let configPath = null;
  let gameRepoRoot = null;
  let outputFile = null;

  while (args.length > 0) {
    const current = args.shift();
    if (current === '--config') configPath = args.shift() || null;
    if (current === '--game-repo-root') gameRepoRoot = args.shift() || null;
    if (current === '--output') outputFile = args.shift() || null;
  }

  return { configPath, gameRepoRoot, outputFile };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { configPath, gameRepoRoot, outputFile } = parseCliArgs(process.argv.slice(2));
  const options = configPath
    ? await readSyncConfig(configPath)
    : { gameRepoRoot, outputFile };
  const result = await syncGameCatalog(options);
  console.log(`SYNC OK players=${result.players.length} enemies=${result.enemies.length}`);
}
