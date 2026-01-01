const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

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

const nextMessage = `${prefix}${major}.${minor}.${patch}\n`;
const repoRoot = process.cwd();
const templatePath = path.join(repoRoot, '.gitmessage');

fs.writeFileSync(templatePath, nextMessage);

let commitMsgPath = '';
try {
  commitMsgPath = execSync('git rev-parse --git-path COMMIT_EDITMSG', {
    encoding: 'utf8',
  }).trim();
} catch (error) {
  commitMsgPath = '';
}

if (commitMsgPath) {
  const absoluteCommitMsgPath = path.isAbsolute(commitMsgPath)
    ? commitMsgPath
    : path.join(repoRoot, commitMsgPath);
  fs.writeFileSync(absoluteCommitMsgPath, nextMessage);
}
