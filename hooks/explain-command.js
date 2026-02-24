#!/usr/bin/env node
'use strict';

const path = require('path');
const rules = require(path.join(__dirname, 'command-rules.js'));

/**
 * Determine display language from LANG env var.
 * Returns 'ja' for Japanese locales, 'en' otherwise.
 */
function getLang() {
  const lang = process.env.LANG || process.env.LC_ALL || process.env.LC_MESSAGES || '';
  return lang.startsWith('ja') ? 'ja' : 'en';
}

/**
 * Split a compound command string into individual commands.
 * Handles ;, &&, ||, and | operators.
 */
function splitCommands(command) {
  const parts = [];
  let current = '';
  let depth = 0; // track parentheses/subshells
  let inSingleQuote = false;
  let inDoubleQuote = false;

  for (let i = 0; i < command.length; i++) {
    const ch = command[i];
    const next = command[i + 1];

    if (ch === '\\' && !inSingleQuote) {
      current += ch + (next || '');
      i++;
      continue;
    }

    if (ch === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote;
      current += ch;
      continue;
    }

    if (ch === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
      current += ch;
      continue;
    }

    if (inSingleQuote || inDoubleQuote) {
      current += ch;
      continue;
    }

    if (ch === '(') { depth++; current += ch; continue; }
    if (ch === ')') { depth--; current += ch; continue; }

    if (depth > 0) {
      current += ch;
      continue;
    }

    // Split on ;, &&, ||
    if (ch === ';') {
      if (current.trim()) parts.push(current.trim());
      current = '';
      continue;
    }
    if (ch === '&' && next === '&') {
      if (current.trim()) parts.push(current.trim());
      current = '';
      i++;
      continue;
    }
    if (ch === '|' && next === '|') {
      if (current.trim()) parts.push(current.trim());
      current = '';
      i++;
      continue;
    }
    // Pipe: treat left side as separate command
    if (ch === '|') {
      if (current.trim()) parts.push(current.trim());
      current = '';
      continue;
    }

    current += ch;
  }

  if (current.trim()) parts.push(current.trim());
  return parts;
}

/**
 * Match a single command against risk rules.
 * Returns { level, rule } or null if no match (= low risk).
 */
function matchCommand(cmd) {
  // Strip leading env vars (e.g., FOO=bar command)
  const cleaned = cmd.replace(/^(\w+=\S+\s+)*/, '').trim();

  for (const rule of rules.high) {
    if (rule.pattern.test(cleaned)) {
      return { level: 'high', rule };
    }
  }
  for (const rule of rules.medium) {
    if (rule.pattern.test(cleaned)) {
      return { level: 'medium', rule };
    }
  }
  return null;
}

/**
 * Main: read hook input from stdin and output decision.
 */
async function main() {
  let input = '';
  for await (const chunk of process.stdin) {
    input += chunk;
  }

  let data;
  try {
    data = JSON.parse(input);
  } catch {
    // Invalid JSON — allow by default
    process.stdout.write(JSON.stringify({}));
    return;
  }

  // Only process Bash tool calls
  if (data.tool_name !== 'Bash') {
    process.stdout.write(JSON.stringify({}));
    return;
  }

  const command = (data.tool_input && data.tool_input.command) || '';
  if (!command) {
    process.stdout.write(JSON.stringify({}));
    return;
  }

  const lang = getLang();
  const subCommands = splitCommands(command);

  let highestLevel = null;
  let highestRule = null;
  const allMatches = [];

  for (const sub of subCommands) {
    const result = matchCommand(sub);
    if (!result) continue;

    allMatches.push({ command: sub, ...result });

    if (result.level === 'high') {
      highestLevel = 'high';
      highestRule = result.rule;
    } else if (result.level === 'medium' && highestLevel !== 'high') {
      highestLevel = 'medium';
      highestRule = result.rule;
    }
  }

  // No risky commands found — auto-allow
  if (!highestLevel) {
    process.stdout.write(JSON.stringify({}));
    return;
  }

  // Build explanation message
  const icon = highestLevel === 'high' ? '\u{1F534}' : '\u{1F7E1}';
  const levelLabel = highestLevel === 'high'
    ? (lang === 'ja' ? 'HIGH RISK' : 'HIGH RISK')
    : (lang === 'ja' ? 'MEDIUM RISK' : 'MEDIUM RISK');

  let message = `${icon} ${levelLabel}: `;

  if (allMatches.length === 1) {
    const m = allMatches[0];
    message += `[${m.rule.name}] ${m.rule[lang]}`;
  } else {
    // Multiple risky commands
    message += lang === 'ja' ? '複合コマンドに複数のリスクがあります:\n' : 'Multiple risks in compound command:\n';
    for (const m of allMatches) {
      const mIcon = m.level === 'high' ? '\u{1F534}' : '\u{1F7E1}';
      message += `  ${mIcon} [${m.rule.name}] ${m.rule[lang]}\n`;
    }
  }

  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'ask',
      permissionDecisionReason: message
    }
  }));
}

main().catch(() => {
  process.stdout.write(JSON.stringify({}));
});
