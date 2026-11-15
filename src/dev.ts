import 'dotenv/config';
import { createServer } from 'node:http';
import { GET as handleAdminGet, POST as handleAdminPost } from '../api/admin.js';
import { GET as handleChronicle } from '../api/chronicle.js';
import { GET as handleCron } from '../api/cron.js';
import { GET as handleHealth } from '../api/health.js';
import { GET as handleIndex } from '../api/index.js';
import { GET as handleState } from '../api/state.js';

const port = Number(process.env.PORT ?? 3000);

async function readRequestBody(req: import('node:http').IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

const server = createServer(async (req, res) => {
  const origin = `http://localhost:${port}`;
  const fullUrl = new URL(req.url ?? '/', origin);
  const method = (req.method ?? 'GET').toUpperCase();
  const hasBody = method !== 'GET' && method !== 'HEAD';
  const bodyBuf = hasBody ? await readRequestBody(req) : undefined;

  const webReq = new Request(fullUrl.toString(), {
    method,
    headers: req.headers as HeadersInit,
    ...(bodyBuf && bodyBuf.length > 0 ? { body: new Uint8Array(bodyBuf) } : {}),
  });

  try {
    let webRes: Response;
    switch (fullUrl.pathname) {
      case '/':
      case '/api':
      case '/api/index':
        webRes = await handleIndex(webReq);
        break;
      case '/admin':
      case '/api/admin':
        webRes =
          method === 'POST' ? await handleAdminPost(webReq) : await handleAdminGet(webReq);
        break;
      case '/api/chronicle':
        webRes = await handleChronicle();
        break;
      case '/api/state':
        webRes = await handleState(webReq);
        break;
      case '/api/cron':
        webRes = await handleCron(webReq);
        break;
      case '/api/health':
        webRes = await handleHealth();
        break;
      case '/favicon.ico':
        res.writeHead(204);
        res.end();
        return;
      default:
        webRes = new Response('Not Found', { status: 404 });
        break;
    }

    const headersObj: Record<string, string> = {};
    webRes.headers.forEach((v, k) => {
      headersObj[k] = v;
    });

    res.writeHead(webRes.status, headersObj);
    const buf = Buffer.from(await webRes.arrayBuffer());
    res.end(buf);
  } catch (err) {
    console.error('[dev-server] Unhandled error:', err);
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(`Internal Server Error\n${err instanceof Error ? err.stack : String(err)}`);
  }
});

server.listen(port, () => {
  console.log(`\n📰 THE CORNWALL DISPATCH local server listening:`);
  console.log(`   • Raw 800×480 (TRMNL Screenshot target): http://localhost:${port}/`);
  console.log(`   • Interactive Archetype Preview Frame:   http://localhost:${port}/?frame=1`);
  console.log(`   • Pressroom Admin & Full Data View:      http://localhost:${port}/admin`);
  console.log(`   • Synthesized JSON State:                http://localhost:${port}/api/state`);
  console.log(`   • Cornwall Chronicle PDF Digest:         http://localhost:${port}/api/chronicle\n`);
});
