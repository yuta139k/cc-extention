#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

const HOME = os.homedir();
const CC_EXT_DIR = path.join(HOME, '.cc-ext');
const HOOKS_DIR = path.join(CC_EXT_DIR, 'hooks');
const CLAUDE_DIR = path.join(HOME, '.claude');
const COMMANDS_DIR = path.join(CLAUDE_DIR, 'commands');
const SETTINGS_PATH = path.join(CLAUDE_DIR, 'settings.json');

const SRC_DIR = path.resolve(__dirname, '..');
const HOOK_COMMAND = `node ${path.join(HOOKS_DIR, 'explain-command.js')}`;

// ─── Helpers ─────────────────────────────────────────────────

function mkdirSafe(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function copyFile(src, dest) {
  fs.copyFileSync(src, dest);
}

function removeDir(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function removeFile(filePath) {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

function readJSON(filePath) {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return null;
  }
}

function writeJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
}

// ─── Install ─────────────────────────────────────────────────

function install() {
  console.log('cc-extention: Installing...\n');

  // 1. Create directories
  mkdirSafe(HOOKS_DIR);
  mkdirSafe(COMMANDS_DIR);

  // 2. Copy hook files
  copyFile(
    path.join(SRC_DIR, 'hooks', 'explain-command.js'),
    path.join(HOOKS_DIR, 'explain-command.js')
  );
  copyFile(
    path.join(SRC_DIR, 'lib', 'command-rules.js'),
    path.join(HOOKS_DIR, 'command-rules.js')
  );
  console.log('  [ok] Hook files copied to ~/.cc-ext/hooks/');

  // 3. Copy /ss command
  copyFile(
    path.join(SRC_DIR, 'commands', 'ss.md'),
    path.join(COMMANDS_DIR, 'ss.md')
  );
  console.log('  [ok] /ss command copied to ~/.claude/commands/ss.md');

  // 4. Register PreToolUse hook in settings.json
  const hookEntry = {
    matcher: 'Bash',
    hooks: [
      {
        type: 'command',
        command: HOOK_COMMAND
      }
    ]
  };

  let settings = readJSON(SETTINGS_PATH) || {};

  if (!settings.hooks) {
    settings.hooks = {};
  }

  if (!settings.hooks.PreToolUse) {
    settings.hooks.PreToolUse = [];
  }

  // Check if already registered
  const alreadyRegistered = settings.hooks.PreToolUse.some(
    (entry) =>
      entry.matcher === 'Bash' &&
      entry.hooks &&
      entry.hooks.some((h) => h.command && h.command.includes('explain-command.js'))
  );

  if (!alreadyRegistered) {
    settings.hooks.PreToolUse.push(hookEntry);
    writeJSON(SETTINGS_PATH, settings);
    console.log('  [ok] PreToolUse hook registered in ~/.claude/settings.json');
  } else {
    console.log('  [skip] PreToolUse hook already registered');
  }

  console.log('\n  Setup complete!');
  console.log('  Restart Claude Code to activate the extension.\n');
  console.log('  Features:');
  console.log('    - Bash commands now show risk level and explanation before execution');
  console.log('    - Use /ss in Claude Code to analyze the latest screenshot\n');
  console.log('  To uninstall: npx cc-extention --uninstall');
}

// ─── Uninstall ───────────────────────────────────────────────

function uninstall() {
  console.log('cc-extention: Uninstalling...\n');

  // 1. Remove ~/.cc-ext/
  removeDir(CC_EXT_DIR);
  console.log('  [ok] Removed ~/.cc-ext/');

  // 2. Remove /ss command
  removeFile(path.join(COMMANDS_DIR, 'ss.md'));
  console.log('  [ok] Removed ~/.claude/commands/ss.md');

  // 3. Remove hook from settings.json
  const settings = readJSON(SETTINGS_PATH);
  if (settings && settings.hooks && settings.hooks.PreToolUse) {
    settings.hooks.PreToolUse = settings.hooks.PreToolUse.filter(
      (entry) =>
        !(
          entry.matcher === 'Bash' &&
          entry.hooks &&
          entry.hooks.some((h) => h.command && h.command.includes('explain-command.js'))
        )
    );

    // Clean up empty arrays
    if (settings.hooks.PreToolUse.length === 0) {
      delete settings.hooks.PreToolUse;
    }
    if (Object.keys(settings.hooks).length === 0) {
      delete settings.hooks;
    }

    writeJSON(SETTINGS_PATH, settings);
    console.log('  [ok] Removed PreToolUse hook from ~/.claude/settings.json');
  }

  console.log('\n  Uninstall complete! Restart Claude Code to apply changes.\n');
}

// ─── Main ────────────────────────────────────────────────────

const args = process.argv.slice(2);

if (args.includes('--uninstall') || args.includes('-u')) {
  uninstall();
} else if (args.includes('--help') || args.includes('-h')) {
  console.log(`
cc-extention - Claude Code developer experience extension

Usage:
  npx cc-extention            Install the extension
  npx cc-extention --uninstall Remove the extension
  npx cc-extention --help      Show this help

Features:
  1. Command Risk Explanation
     Shows risk level and explanation for Bash commands before execution.
     Risk levels: HIGH (red), MEDIUM (yellow), LOW (auto-allow)

  2. Screenshot Integration (/ss)
     Quickly analyze screenshots in Claude Code.
     Usage: /ss [question about the screenshot]
`);
} else {
  install();
}
