#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

// ANSI terminal colors
const reset = '\x1b[0m';
const bold = '\x1b[1m';
const dim = '\x1b[2m';
const green = '\x1b[32m';
const cyan = '\x1b[36m';
const yellow = '\x1b[33m';
const red = '\x1b[31m';

const BANNER = `
${bold}${cyan}▲ EdgeCMS${reset} ${dim}- Cloudflare Workers + D1 + R2 Native Headless CMS${reset}
`;

function detectPackageManager() {
  const userAgent = process.env.npm_config_user_agent || '';
  if (userAgent.startsWith('pnpm')) return 'pnpm';
  if (userAgent.startsWith('yarn')) return 'yarn';
  if (userAgent.startsWith('bun')) return 'bun';
  return 'npm';
}

function printHelp() {
  console.log(BANNER);
  console.log(`${bold}Usage:${reset}
  npx create-edge-cms [project-name] [options]

${bold}Options:${reset}
  -y, --yes          Skip prompts and accept defaults
  --skip-install     Skip dependency installation
  -h, --help         Show this help message

${bold}Examples:${reset}
  npx create-edge-cms my-cms
  npx create-edge-cms my-cms --yes
  pnpm create edge-cms my-cms
`);
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('-h') || args.includes('--help')) {
    printHelp();
    process.exit(0);
  }

  console.log(BANNER);

  const isYes = args.includes('-y') || args.includes('--yes');
  const skipInstall = args.includes('--skip-install');

  // Filter out flags to find targetDir
  const positionalArgs = args.filter((a) => !a.startsWith('-'));
  let targetDir = positionalArgs[0];

  const rl = readline.createInterface({ input, output });

  if (!targetDir) {
    if (isYes) {
      targetDir = 'my-edge-cms';
    } else {
      const answer = await rl.question(`${bold}Project name:${reset} ${dim}(default: my-edge-cms)${reset} `);
      targetDir = answer.trim() || 'my-edge-cms';
    }
  }

  const projectPath = path.resolve(process.cwd(), targetDir);
  const projectName = path.basename(projectPath);

  if (fs.existsSync(projectPath)) {
    const files = fs.readdirSync(projectPath);
    if (files.length > 0) {
      console.log(`\n${red}Error:${reset} Directory ${bold}${projectName}${reset} already exists and is not empty.`);
      rl.close();
      process.exit(1);
    }
  }

  console.log(`\n${cyan}Scaffolding EdgeCMS in:${reset} ${bold}${projectPath}${reset}\n`);

  // Clone from GitHub
  const repoUrl = 'https://github.com/AlokMahapatra26/cms.git';
  try {
    console.log(`${dim}Fetching latest template from GitHub...${reset}`);
    execSync(`git clone --depth 1 ${repoUrl} "${projectPath}"`, {
      stdio: 'pipe'
    });

    // Remove old .git
    const gitDir = path.join(projectPath, '.git');
    if (fs.existsSync(gitDir)) {
      fs.rmSync(gitDir, { recursive: true, force: true });
    }

    // Clean up create-edge-cms package from the cloned workspace
    const internalPkgDir = path.join(projectPath, 'packages', 'create-edge-cms');
    if (fs.existsSync(internalPkgDir)) {
      fs.rmSync(internalPkgDir, { recursive: true, force: true });
    }

    // Update root package.json
    const rootPkgPath = path.join(projectPath, 'package.json');
    if (fs.existsSync(rootPkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(rootPkgPath, 'utf8'));
      pkg.name = projectName;
      pkg.version = '0.1.0';
      fs.writeFileSync(rootPkgPath, JSON.stringify(pkg, null, 2) + '\n');
    }

    // Initialize fresh git repo
    try {
      execSync('git init', { cwd: projectPath, stdio: 'ignore' });
    } catch (_) {}

    console.log(`${green}✔${reset} Template unpacked successfully.`);
  } catch (err) {
    console.error(`\n${red}Failed to clone repository:${reset}`, err.message);
    rl.close();
    process.exit(1);
  }

  const pkgManager = detectPackageManager();
  let shouldInstall = false;

  if (skipInstall) {
    shouldInstall = false;
  } else if (isYes) {
    shouldInstall = true;
  } else {
    const installAnswer = await rl.question(`\n${bold}Install dependencies with ${pkgManager}?${reset} ${dim}(Y/n)${reset} `);
    shouldInstall = installAnswer.trim().toLowerCase() !== 'n';
  }
  rl.close();

  if (shouldInstall) {
    console.log(`\n${dim}Installing dependencies using ${pkgManager}...${reset}\n`);
    try {
      execSync(`${pkgManager} install`, {
        cwd: projectPath,
        stdio: 'inherit'
      });
      console.log(`\n${green}✔${reset} Dependencies installed.`);
    } catch (installErr) {
      console.log(`\n${yellow}Note:${reset} Automatic install failed. Run ${bold}${pkgManager} install${reset} manually inside the folder.`);
    }
  }

  // Print next steps
  console.log(`
${bold}${green}🎉 Success! Created ${projectName} at ${projectPath}${reset}

${bold}Get started by running:${reset}

  ${cyan}cd ${targetDir}${reset}
  ${!shouldInstall ? `${cyan}${pkgManager} install${reset}\n  ` : ''}${cyan}${pkgManager} run dev${reset}

${bold}Services:${reset}
  ${dim}Admin Dashboard:${reset}  http://localhost:5173
  ${dim}Cloudflare API:${reset}   http://localhost:8787

${bold}AI Agent Integration:${reset}
  Open http://localhost:5173/api and click ${bold}"Copy Agent Prompt"${reset}
  to let Cursor or Claude build your frontend instantly!

${dim}Deploy to Cloudflare Workers:${reset}
  ${cyan}${pkgManager} --filter @cms/api deploy${reset}
`);
}

main().catch((err) => {
  console.error(`\n${red}Unexpected error:${reset}`, err);
  process.exit(1);
});
