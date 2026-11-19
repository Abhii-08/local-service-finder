import {createHash} from 'node:crypto';
import {mkdir, readFile, readdir, writeFile} from 'node:fs/promises';
import {extname, relative, resolve, sep} from 'node:path';
import {fileURLToPath} from 'node:url';

const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};
const output = new URL('../dist/', import.meta.url);
const source = new URL('../public/', import.meta.url);
const sourcePath = fileURLToPath(source);
const assets = Object.create(null);
const files = await readdir(source, {recursive: true, withFileTypes: true});

for (const file of files.filter(file => file.isFile())) {
  const absolute = resolve(file.parentPath, file.name);
  const assetPath = relative(sourcePath, absolute).split(sep).join('/');
  const type = types[extname(absolute)];
  if (!type) throw new Error(`Missing MIME type for ${file.name}`);
  const body = await readFile(absolute);
  const etag = '"' + createHash('sha256').update(body).digest('hex') + '"';
  assets['/' + assetPath] = [type, body.toString('base64'), etag];
}

const dataset = await readFile(new URL('data.js', source), 'utf8');
const validation = await readFile(new URL('validate.js', source), 'utf8');
const handler = await readFile(new URL('../worker/handler.js', import.meta.url), 'utf8');
await mkdir(new URL('server/', output), {recursive: true});
await mkdir(new URL('.openai/', output), {recursive: true});
await writeFile(new URL('.openai/hosting.json', output), await readFile(new URL('../.openai/hosting.json', import.meta.url)));
await writeFile(new URL('server/index.js', output), [dataset, validation, `const assets = ${JSON.stringify(assets)};`, handler].join('\n'));
