#!/usr/bin/env node

import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

dotenv.config({ quiet: true });

const DEFAULT_MODEL = 'gemini-3.1-flash-image-preview';
const FLASH_MODEL = 'gemini-2.5-flash-image';

function printUsage() {
  console.log(`Usage: gemini-image-cli <prompt> [options]

IMAGE OPTIONS:
  --file <image>          Input image for editing mode
  --output <file>         Output file path (required for stable scripting)
  --prompt-file <path>    Read prompt from file
  --model <name>          Gemini model (default: ${DEFAULT_MODEL})
  --flash                 Use faster ${FLASH_MODEL} model
  --aspect <ratio>        Image aspect ratio (e.g. 1:1, 4:3, 16:9)
  --image-size <size>     Largest dimension class (e.g. 1K, 2K)
  --num-images <n>        Number of images to request (default: 1)
  --mime-type <type>      Output MIME type (e.g. image/png, image/jpeg)
  --help, -h              Show this help

Notes:
  - Exact pixel dimensions like 800x480 are not exposed by Gemini image generation here.
  - aspect/image-size are best-effort model controls, not guarantees.`);
}

function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  if (dir && dir !== '.' && !fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function getMimeType(filePath) {
  return execFileSync('file', ['--mime-type', '-b', filePath], {
    encoding: 'utf8',
  }).trim();
}

function parseArgs(argv) {
  const opts = {
    filePath: '',
    promptText: '',
    promptFile: '',
    outputFile: '',
    useFlash: false,
    modelName: '',
    aspectRatio: '',
    imageSize: '',
    numImages: 1,
    mimeType: 'image/png',
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--file') {
      opts.filePath = argv[++i] || '';
    } else if (arg === '--prompt') {
      opts.promptText = argv[++i] || '';
    } else if (arg === '--prompt-file') {
      opts.promptFile = argv[++i] || '';
    } else if (arg === '--output') {
      opts.outputFile = argv[++i] || '';
    } else if (arg === '--flash') {
      opts.useFlash = true;
    } else if (arg === '--model') {
      opts.modelName = argv[++i] || '';
    } else if (arg === '--aspect') {
      opts.aspectRatio = argv[++i] || '';
    } else if (arg === '--image-size') {
      opts.imageSize = argv[++i] || '';
    } else if (arg === '--num-images') {
      opts.numImages = Number.parseInt(argv[++i] || '1', 10);
    } else if (arg === '--mime-type') {
      opts.mimeType = argv[++i] || '';
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

  if (opts.filePath && !fs.existsSync(opts.filePath)) {
    console.error(`Error: Input file not found at ${opts.filePath}`);
    process.exit(1);
  }

  if (!Number.isInteger(opts.numImages) || opts.numImages < 1 || opts.numImages > 4) {
    console.error('Error: --num-images must be an integer between 1 and 4.');
    process.exit(1);
  }

  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (!geminiApiKey) {
    console.error('Error: GEMINI_API_KEY environment variable is not set.');
    process.exit(1);
  }

  const ai = new GoogleGenAI({ apiKey: geminiApiKey });
  const selectedModel = opts.modelName || (opts.useFlash ? FLASH_MODEL : DEFAULT_MODEL);

  const contents = [{ text: opts.promptText }];
  if (opts.filePath) {
    const mimeType = getMimeType(opts.filePath);
    if (!mimeType.startsWith('image/')) {
      console.error(`Error: Input file '${opts.filePath}' is not an image. Detected MIME type: ${mimeType}`);
      process.exit(1);
    }
    contents.push({
      inlineData: {
        mimeType,
        data: fs.readFileSync(opts.filePath).toString('base64'),
      },
    });
  }

  const imageConfig = {
    numberOfImages: opts.numImages,
  };
  if (opts.aspectRatio) imageConfig.aspectRatio = opts.aspectRatio;
  if (opts.imageSize) imageConfig.imageSize = opts.imageSize;

  console.error(`Generating image using ${selectedModel}...`);
  if (opts.aspectRatio) console.error(`  aspectRatio: ${opts.aspectRatio}`);
  if (opts.imageSize) console.error(`  imageSize:   ${opts.imageSize}`);
  if (opts.mimeType && opts.mimeType !== 'image/png') {
    console.error(`  note:        requested mime type '${opts.mimeType}' ignored; Gemini API does not support outputMimeType here`);
  }

  const response = await ai.models.generateContent({
    model: selectedModel,
    contents,
    config: {
      responseModalities: ['Text', 'Image'],
      imageConfig,
    },
  });

  const candidate = response?.candidates?.[0];
  const parts = candidate?.content?.parts || [];
  const imagePart = parts.find((part) => part.inlineData?.data);

  if (!imagePart?.inlineData?.data) {
    const textPart = parts.find((part) => part.text);
    if (textPart?.text) {
      console.error(`Model text response: ${textPart.text}`);
    }
    console.error('Error: No image returned by model.');
    process.exit(1);
  }

  ensureDir(opts.outputFile);
  const buffer = Buffer.from(imagePart.inlineData.data, 'base64');
  fs.writeFileSync(opts.outputFile, buffer);
  console.log(opts.outputFile);
}

main().catch((error) => {
  console.error('Error calling Gemini API:', error);
  process.exit(1);
});
