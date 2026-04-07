import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { syncGameCatalog } from './sync_game_catalog.mjs';

const scriptFile = fileURLToPath(new URL('./sync_game_catalog.mjs', import.meta.url));

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(value, null, 2), 'utf8');
}

test('syncGameCatalog 从主工程目录读取 player/enemy 并输出展示资产输入目录', async () => {
  const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'spine-assets-'));
  const gameRoot = path.join(tmpRoot, 'NodeConsoleApp2');
  const outputFile = path.join(tmpRoot, 'workspace', 'imports', 'game_catalog.json');

  await writeJson(path.join(gameRoot, 'assets', 'data', 'config.json'), {
    contentRegistry: {
      player: { kind: 'player', path: 'player.json' },
      enemies: { kind: 'enemies', path: 'enemies.json' }
    },
    basePath: './assets/data/'
  });

  await writeJson(path.join(gameRoot, 'assets', 'data', 'player.json'), {
    default: {
      id: 'char_player_001',
      name: 'Player1',
      stats: { hp: 100, maxHp: 100, ap: 4, speed: 1 },
      bodyParts: {
        head: { current: 0, max: 20, weakness: 1.5 },
        chest: { current: 10, max: 20, weakness: 1.0 }
      },
      equipment: { weapon: null, head: null, chest: null }
    }
  });

  await writeJson(path.join(gameRoot, 'assets', 'data', 'enemies.json'), {
    goblin_story_headhunter: {
      id: 'goblin_story_headhunter',
      name: '哥布林追猎手',
      race: 'goblin',
      class: 'hunter',
      stats: { hp: 65, maxHp: 65, ap: 4, speed: 11 },
      bodyParts: {
        head: { current: 4, max: 4, weakness: 1.2 },
        chest: { current: 8, max: 8, weakness: 1.0 }
      },
      skills: ['skill_bite', 'skill_throw_stone']
    }
  });

  const result = await syncGameCatalog({
    gameRepoRoot: gameRoot,
    outputFile
  });

  assert.equal(result.players.length, 1);
  assert.equal(result.enemies.length, 1);
  assert.equal(result.players[0].id, 'char_player_001');
  assert.equal(result.players[0].presentationId, 'char_player_001');
  assert.deepEqual(result.players[0].equipmentSlots, ['weapon', 'head', 'chest']);
  assert.equal(result.enemies[0].id, 'goblin_story_headhunter');
  assert.equal(result.enemies[0].presentationId, 'goblin_story_headhunter');
  assert.equal(result.enemies[0].skillIds.length, 2);

  const written = JSON.parse(await fs.readFile(outputFile, 'utf8'));
  assert.equal(written.meta.source.gameRepoRoot, gameRoot);
  assert.equal(written.players[0].name, 'Player1');
  assert.equal(written.enemies[0].race, 'goblin');
});

test('CLI 通过 --config 运行时应按配置文件位置解析相对路径', async () => {
  const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'spine-assets-cli-'));
  const repoRoot = path.join(tmpRoot, 'spine-assets-repo');
  const gameRoot = path.join(tmpRoot, 'game-root');
  const configFile = path.join(repoRoot, 'config', 'source-project.json');
  const expectedOutputFile = path.join(repoRoot, 'workspace', 'imports', 'catalog.json');

  await writeJson(path.join(gameRoot, 'assets', 'data', 'config.json'), {
    contentRegistry: {
      player: { kind: 'player', path: 'player.json' },
      enemies: { kind: 'enemies', path: 'enemies.json' }
    },
    basePath: './assets/data/'
  });

  await writeJson(path.join(gameRoot, 'assets', 'data', 'player.json'), {
    default: {
      id: 'char_player_001',
      name: 'Player1',
      stats: { hp: 100, maxHp: 100, ap: 4, speed: 1 },
      equipment: {}
    }
  });

  await writeJson(path.join(gameRoot, 'assets', 'data', 'enemies.json'), {
    goblin_scout: {
      id: 'goblin_scout',
      name: '哥布林斥候',
      stats: { hp: 50, maxHp: 50, ap: 3, speed: 12 },
      bodyParts: {}
    }
  });

  await writeJson(configFile, {
    gameRepoRoot: '../../game-root',
    outputFile: '../workspace/imports/catalog.json'
  });

  const runResult = await new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [scriptFile, '--config', configFile],
      { cwd: tmpRoot, stdio: ['ignore', 'pipe', 'pipe'] }
    );

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', chunk => { stdout += String(chunk); });
    child.stderr.on('data', chunk => { stderr += String(chunk); });
    child.on('error', reject);
    child.on('close', code => resolve({ code, stdout, stderr }));
  });

  assert.equal(runResult.code, 0, runResult.stderr || runResult.stdout);
  const written = JSON.parse(await fs.readFile(expectedOutputFile, 'utf8'));
  assert.equal(written.meta.source.gameRepoRoot, gameRoot);
  assert.equal(written.players[0].id, 'char_player_001');
  assert.equal(written.enemies[0].id, 'goblin_scout');
});
