#!/usr/bin/env node

import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';

dotenv.config({ quiet: true });

const DEFAULT_MODEL = 'grok-imagine-image-quality';
const DEFAULT_ASPECT = '16:9';
const DEFAULT_RESOLUTION = '1k';
const API_URL = 'https://api.x.ai/v1/images/generations';

function printUsage() {
  console.log(`Usage: grok-image-cli [options]

IMAGE OPTIONS:
  --prompt <text>         Image prompt text
  --prompt-file <path>    Read prompt from file
  --output <file>         Output file path (required)
  --model <name>          Image model (default: ${DEFAULT_MODEL})
  --aspect <ratio>        Aspect ratio (default: ${DEFAULT_ASPECT})
  --resolution <size>     Output resolution: 1k or 2k (default: ${DEFAULT_RESOLUTION})
  --num-images <n>        Number of images to request (default: 1)
  --help, -h              Show this help

Auth:
  XAI_API_KEY environment variable (or .env)

Notes:
  - Uses xAI Imagine API at ${API_URL}
  - Downloads base64 image bytes for stable scripting
  - Exact pixel sizes like 800x480 are applied later by bin/process-image`);
}

function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  if (dir && dir !== '.' && !fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function parseArgs(argv) {
  const opts = {
    promptText: '',
    promptFile: '',
    outputFile: '',
    modelName: '',
    aspectRatio: '',
    resolution: '',
    numImages: 1,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--prompt') {
      opts.promptText = argv[++i] || '';
    } else if (arg === '--prompt-file') {
      opts.promptFile = argv[++i] || '';
    } else if (arg === '--output') {
      opts.outputFile = argv[++i] || '';
    } else if (arg === '--model') {
      opts.modelName = argv[++i] || '';
    } else if (arg === '--aspect') {
      opts.aspectRatio = argv[++i] || '';
    } else if (arg === '--resolution') {
      opts.resolution = argv[++i] || '';
    } else if (arg === '--num-images') {
      opts.numImages = Number.parseInt(argv[++i] || '1', 10);
    } else if (arg === '--help' || arg === '-h') {
      printUsage();
      process.exit(0);
    } else if (!arg.startsWith('--')) {
      opts.promptText = arg;
    }
  }

  return opts;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));

  if (opts.promptFile) {
    if (opts.promptText) {
      console.error('Error: Cannot use both prompt text and --prompt-file.');
      process.exit(1);
    }
    try {
      opts.promptText = fs.readFileSync(opts.promptFile, 'utf8');
    } catch {
      console.error(`Error: Could not read prompt file at ${opts.promptFile}`);
      process.exit(1);
    }
  }

  if (!opts.promptText) {
    printUsage();
    process.exit(1);
  }

  if (!opts.outputFile) {
    console.error('Error: --output is required.');
    process.exit(1);
  }

  if (!Number.isInteger(opts.numImages) || opts.numImages < 1 || opts.numImages > 10) {
    console.error('Error: --num-images must be an integer between 1 and 10.');
    process.exit(1);
  }

  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) {
    console.error('Error: XAI_API_KEY environment variable is not set.');
    process.exit(1);
  }

  const model = opts.modelName || DEFAULT_MODEL;
  const aspectRatio = opts.aspectRatio || DEFAULT_ASPECT;
  const resolution = (opts.resolution || DEFAULT_RESOLUTION).toLowerCase();

  if (!['1k', '2k'].includes(resolution)) {
    console.error('Error: --resolution must be 1k or 2k.');
    process.exit(1);
  }

  console.error(`Generating image using ${model}...`);
  console.error(`  aspectRatio: ${aspectRatio}`);
  console.error(`  resolution:  ${resolution}`);

  const body = {
    model,
    prompt: opts.promptText,
    n: opts.numImages,
    response_format: 'b64_json',
    aspect_ratio: aspectRatio,
    resolution,
  };

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const text = await response.text();
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    console.error(`Error: Non-JSON response from xAI (HTTP ${response.status})`);
    console.error(text.slice(0, 2000));
    process.exit(1);
  }

  if (!response.ok) {
    console.error(`Error: xAI Imagine API returned HTTP ${response.status}`);
    console.error(JSON.stringify(payload, null, 2));
    process.exit(1);
  }

  const image = payload?.data?.[0];
  const b64 = image?.b64_json;
  if (!b64) {
    // Some responses may only include a temporary URL
    if (image?.url) {
      console.error('No base64 payload; downloading image URL...');
      const imgRes = await fetch(image.url);
      if (!imgRes.ok) {
        console.error(`Error: Failed to download image URL (HTTP ${imgRes.status})`);
        process.exit(1);
      }
      const buffer = Buffer.from(await imgRes.arrayBuffer());
      ensureDir(opts.outputFile);
      fs.writeFileSync(opts.outputFile, buffer);
      console.log(opts.outputFile);
      return;
    }
    console.error('Error: No image data returned by model.');
    console.error(JSON.stringify(payload, null, 2).slice(0, 2000));
    process.exit(1);
  }

  ensureDir(opts.outputFile);
  fs.writeFileSync(opts.outputFile, Buffer.from(b64, 'base64'));
  console.log(opts.outputFile);
}

main().catch((error) => {
  console.error('Error calling xAI Imagine API:', error?.message || error);
  process.exit(1);
});
