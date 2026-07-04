import { writeFileSync } from 'fs';
import { join } from 'path';

writeFileSync(
  join('dist-electron', 'package.json'),
  JSON.stringify({ type: 'commonjs' }, null, 2),
);
