#!/usr/bin/env node
/**
 * Generates fixtures/complex-dom.html: a static, deterministic ~5,000+ node
 * DOM (deep nesting, repeated class names) so the "locate elements" scenario
 * has a page where selector-engine differences actually show up — locating
 * on a 20-node page is noise. The output is committed; re-run this script
 * only if the shape needs to change, so the fixture never drifts silently
 * between benchmark runs.
 *
 * 10 elements get a unique id (`deep-target-0`..`deep-target-9`) scattered
 * through the tree at varying depth — these are the batch of 10 locates used
 * by the "locate elements (complex dom)" scenario.
 */
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SECTIONS = 25;
const GROUPS_PER_SECTION = 10;
const ITEMS_PER_GROUP = 20; // 25 * 10 * 20 = 5000 leaf items
const TARGET_COUNT = 10;

let targetsPlaced = 0;
const targetEvery = Math.floor((SECTIONS * GROUPS_PER_SECTION * ITEMS_PER_GROUP) / TARGET_COUNT);
let itemIndex = 0;

function item() {
  itemIndex++;
  const isTarget = targetsPlaced < TARGET_COUNT && itemIndex % targetEvery === 0;
  const idAttr = isTarget ? ` id="deep-target-${targetsPlaced}"` : '';
  if (isTarget) targetsPlaced++;
  return `<div class="item leaf"${idAttr}><span class="label">Item ${itemIndex}</span><em class="tag">tag-${itemIndex % 7}</em></div>`;
}

function group(g) {
  const items = Array.from({ length: ITEMS_PER_GROUP }, () => item()).join('');
  return `<div class="group" data-group="${g}"><h3 class="group-title">Group ${g}</h3><div class="group-items">${items}</div></div>`;
}

function section(s) {
  const groups = Array.from({ length: GROUPS_PER_SECTION }, (_, g) => group(g)).join('');
  return `<section class="section" data-section="${s}"><h2 class="section-title">Section ${s}</h2><div class="section-body">${groups}</div></section>`;
}

const sections = Array.from({ length: SECTIONS }, (_, s) => section(s)).join('');

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Complex DOM (perf fixture)</title>
  <style>
    body { font-family: system-ui, Arial; margin: 0; padding: 12px; }
    .section { border: 1px solid #ddd; margin-bottom: 8px; }
    .group { padding: 4px 8px; }
    .item { display: inline-block; padding: 2px 6px; margin: 1px; border: 1px solid #eee; }
    .tag { color: #888; font-size: 10px; margin-left: 4px; }
  </style>
</head>
<body>
  <h1 id="page-title">Complex DOM fixture</h1>
  <div id="root">${sections}</div>
</body>
</html>
`;

writeFileSync(path.join(__dirname, 'complex-dom.html'), html);
console.log(
  `Generated complex-dom.html: ${SECTIONS * GROUPS_PER_SECTION * ITEMS_PER_GROUP} leaf items, ${targetsPlaced} tagged targets.`
);
