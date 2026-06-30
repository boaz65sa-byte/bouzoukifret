'use strict';

const { existsSync } = require('node:fs');
const { join } = require('node:path');
const { execSync } = require('node:child_process');

const deno = join(process.cwd(), '.deno', 'bin', process.platform === 'win32' ? 'deno.exe' : 'deno');

if (!existsSync(deno)) {
  console.log('[vercel-build] installing deno for yt-dlp…');
  execSync('curl -fsSL https://deno.land/install.sh | DENO_INSTALL=.deno sh', {
    stdio: 'inherit',
    shell: true,
  });
}
