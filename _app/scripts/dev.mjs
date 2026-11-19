import {createServer} from 'node:http';
import {DatabaseSync} from 'node:sqlite';
import {readFile} from 'node:fs/promises';

await import('./build.mjs');
const {default: worker} = await import('../dist/server/index.js');
const sqlite = new DatabaseSync(':memory:');
sqlite.exec(await readFile(new URL('../drizzle/0000_service_directory.sql', import.meta.url), 'utf8'));

const db = {
  prepare(sql) {
    const statement = sqlite.prepare(sql);
    let values = [];
    return {
      bind(...args) { values = args; return this; },
      all() { return {results: statement.all(...values)}; },
      first() { return statement.get(...values); },
      run() { return {meta: {changes: statement.run(...values).changes}}; },
    };
  },
  batch(statements) { return statements.map(statement => statement.all()); },
};
const argument = name => {
  const index = process.argv.indexOf(name);
  return index < 0 ? undefined : process.argv[index + 1];
};
const host = argument('--host') || '127.0.0.1';
const port = Number(argument('--port') || process.env.PORT || 3000);
createServer(async (incoming, outgoing) => {
  try {
    const buffers = [];
    for await (const chunk of incoming) buffers.push(chunk);
    const request = new Request(`http://${incoming.headers.host}${incoming.url}`, {
      method: incoming.method,
      headers: incoming.headers,
      body: buffers.length ? Buffer.concat(buffers) : undefined,
    });
    const response = await worker.fetch(request, {DB: db});
    outgoing.writeHead(response.status, Object.fromEntries(response.headers));
    outgoing.end(Buffer.from(await response.arrayBuffer()));
  } catch (error) {
    console.error(error);
    outgoing.writeHead(500);
    outgoing.end('Preview error');
  }
}).listen(port, host, () => console.log(`Local Service Finder ready on port ${port}`));
