const fs = require('fs');
const { execSync } = require('child_process');

const msgPath = process.argv[2];
if (!msgPath) {
  process.exit(0);
}

const message = fs.readFileSync(msgPath, 'utf8');
const hasUserContent = message
  .split(/\r?\n/)
  .some((line) => line.trim().length > 0 && !line.trim().startsWith('#'));

if (hasUserContent) {
  process.exit(0);
}

let lastSubject = '';
try {
  lastSubject = execSync('git log -1 --pretty=%s', { encoding: 'utf8' }).trim();
} catch (error) {
  process.exit(0);
}

const match = lastSubject.match(/^(v\s*)?(\d+)\.(\d+)(?:\.(\d+))?$/);
if (!match) {
  process.exit(0);
}

const prefix = match[1] || '';
const major = Number(match[2]);
const minor = Number(match[3]);
const patch = match[4] ? Number(match[4]) + 1 : 1;

fs.writeFileSync(msgPath, `${prefix}${major}.${minor}.${patch}\n`);
