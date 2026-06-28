import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const flags = [
  'cz','mx','py','kr','ba','ca','qa','ch','br','ht','ma','gb-sct',
  'au','tr','us','cw','ec','de','ci','jp','nl','ng','se','tn',
  'be','eg','ir','nz','cv','sa','es','uy','fr','iq','no','sn',
  'dz','ar','at','jo','co','cd','pt','uz','hr','gb-eng','gh','pa'
];

const targetDir = path.resolve('public/flags');
await mkdir(targetDir, { recursive: true });

for (const flag of flags) {
  const url = `https://flagcdn.com/${flag}.svg`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to download ${url}: ${response.status}`);
  }

  const svg = await response.text();
  await writeFile(path.join(targetDir, `${flag}.svg`), svg, 'utf8');
  console.log(`Downloaded ${flag}.svg`);
}

console.log('All flags downloaded to public/flags');
