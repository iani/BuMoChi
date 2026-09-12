#!/usr/bin/env node
/**
 * Export a browser-native HTML deck to PDF.
 *
 * Contract: every element with class="slide" becomes one page. That is the only
 * requirement the exporter places on your markup.
 *
 * Each slide is isolated and screenshotted at the configured viewport, then the
 * frames are assembled into a multi-page PDF. Because pages are rasterised, the
 * output looks exactly like the browser render -- custom fonts, CSS filters,
 * pseudo-elements and transforms all survive.
 *
 * Usage:
 *   node export-pdf.mjs [input.html] [output.pdf] [--width N] [--height N] [--scale N] [--theme light|dark]
 *
 * Examples:
 *   node src/export-pdf.mjs src/deck.html out/deck.pdf
 *   node src/export-pdf.mjs src/deck.html out/deck-dark.pdf --theme dark
 *   node src/export-pdf.mjs src/deck.html out/talk.pdf --width 1920 --height 1080
 */

import puppeteer from 'puppeteer';
import { PDFDocument } from 'pdf-lib';
import { existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

function parseArgs(argv) {
  const positional = [];
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith('--')) flags[arg.slice(2)] = argv[++i];
    else positional.push(arg);
  }
  return { positional, flags };
}

const { positional, flags } = parseArgs(process.argv.slice(2));

const input = positional[0] ?? 'deck.html';
const output = positional[1] ?? input.replace(/\.html?$/i, '.pdf');

// 1152x648 is 16:9 and, at scale 2, rasterises to 2304x1296 -- sharp on a
// projector without producing an unshareably large file.
const WIDTH = Number(flags.width ?? 1152);
const HEIGHT = Number(flags.height ?? 648);
const SCALE = Number(flags.scale ?? 2);
const QUALITY = Number(flags.quality ?? 92);
// Theme is a class on <body> (see theme.css). Omit to keep whatever the HTML declares.
const THEME = flags.theme;
if (THEME !== undefined && THEME !== 'light' && THEME !== 'dark') {
  console.error(`--theme must be "light" or "dark", got "${THEME}"`);
  process.exit(1);
}

const absInput = resolve(input);
if (!existsSync(absInput)) {
  console.error(`Input not found: ${absInput}`);
  process.exit(1);
}

const absOutput = resolve(output);
mkdirSync(dirname(absOutput), { recursive: true });

const browser = await puppeteer.launch({ headless: true });

try {
  const page = await browser.newPage();
  await page.setViewport({ width: WIDTH, height: HEIGHT, deviceScaleFactor: SCALE });
  await page.goto(pathToFileURL(absInput).href, { waitUntil: 'networkidle0', timeout: 30_000 });

  // Let webfonts settle, then give any diagram/chart library a beat to draw.
  await page.evaluate(() => document.fonts?.ready).catch(() => {});
  await new Promise((r) => setTimeout(r, 1200));

  if (THEME) {
    await page.evaluate((theme) => {
      document.body.classList.remove('light', 'dark');
      document.body.classList.add(theme);
    }, THEME);
  }

  // Neutralise anything that hides content or only shows it on screen:
  // scroll snapping, entrance animations, nav chrome, and viewport observers.
  await page.evaluate(() => {
    const style = document.createElement('style');
    style.textContent = `
      html { scroll-snap-type: none !important; scroll-behavior: auto !important; }
      body { overflow: visible !important; }
      [class*="reveal"], [class*="fade"], [data-animate] {
        opacity: 1 !important; transform: none !important;
        transition: none !important; animation: none !important;
      }
      .deck-nav, .deck-progress, .deck-counter, .deck-hint { display: none !important; }
      .slide { position: absolute !important; inset: 0 !important; visibility: hidden !important; }
      .slide.is-capturing { visibility: visible !important; z-index: 2147483647 !important; }
    `;
    document.head.append(style);
    if (window.IntersectionObserver) {
      window.IntersectionObserver = class {
        observe() {} unobserve() {} disconnect() {} takeRecords() { return []; }
      };
    }
  });

  const slideCount = await page.$$eval('.slide', (els) => els.length);
  if (slideCount === 0) {
    console.error('No elements with class="slide" found. Nothing to export.');
    process.exit(1);
  }
  console.log(`${input}: ${slideCount} slide${slideCount === 1 ? '' : 's'}`);

  const pdf = await PDFDocument.create();

  for (let i = 0; i < slideCount; i++) {
    await page.evaluate((index) => {
      document.querySelectorAll('.slide').forEach((slide, j) => {
        slide.classList.toggle('is-capturing', j === index);
      });
    }, i);
    await new Promise((r) => setTimeout(r, 220));

    const frame = await page.screenshot({ type: 'jpeg', quality: QUALITY });
    const image = await pdf.embedJpg(new Uint8Array(frame));
    pdf.addPage([WIDTH, HEIGHT]).drawImage(image, {
      x: 0, y: 0, width: WIDTH, height: HEIGHT,
    });
    process.stdout.write(`  captured ${i + 1}/${slideCount}\r`);
  }

  writeFileSync(absOutput, await pdf.save());
  const kb = (statSync(absOutput).size / 1024).toFixed(0);
  console.log(`\nSaved: ${output} (${slideCount} pages, ${kb} KB)`);
} finally {
  await browser.close();
}
