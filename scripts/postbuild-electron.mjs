import { copyFileSync, mkdirSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';

writeFileSync(
  join('dist-electron', 'package.json'),
  JSON.stringify({ type: 'commonjs' }, null, 2),
);

const assets = ['printPreviewShell.html'];

for (const asset of assets) {
  const source = join('electron', asset);
  const target = join('dist-electron', asset);
  mkdirSync(dirname(target), { recursive: true });
  copyFileSync(source, target);
}
