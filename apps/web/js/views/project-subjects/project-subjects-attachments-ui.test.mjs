import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { renderSubjectAttachmentTile } from "./project-subjects-attachments-ui.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const escapeHtml = (value) => String(value ?? "");
const svgIcon = (name) => `<span data-icon="${name}"></span>`;

test("attachments ui: rend une image persistée avec balise img quand l'URL est disponible", () => {
  const html = renderSubjectAttachmentTile({
    file_name: "plan.png",
    mime_type: "image/png",
    object_url: "https://cdn.example/plan.png"
  }, { escapeHtml, svgIcon });

  assert.match(html, /<img\s+src="https:\/\/cdn\.example\/plan\.png"/);
  assert.match(html, /subject-attachment--image/);
});

test("attachments ui: rend un PDF avec card fichier et icône dédiée", () => {
  const html = renderSubjectAttachmentTile({
    file_name: "spec.pdf",
    mime_type: "application/pdf",
    object_url: "https://cdn.example/spec.pdf"
  }, { escapeHtml, svgIcon });

  assert.match(html, /subject-attachment--file/);
  assert.match(html, /data-icon="file-pdf"/);
  assert.match(html, /spec\.pdf/);
});

test("attachments ui: description, thread et events utilisent le composant partagé", () => {
  const descriptionSource = fs.readFileSync(path.resolve(__dirname, "./project-subjects-description.js"), "utf8");
  const threadSource = fs.readFileSync(path.resolve(__dirname, "./project-subjects-thread.js"), "utf8");
  const eventsSource = fs.readFileSync(path.resolve(__dirname, "./project-subjects-events.js"), "utf8");

  assert.match(descriptionSource, /from\s+"\.\/project-subjects-attachments-ui\.js"/);
  assert.match(threadSource, /from\s+"\.\/project-subjects-attachments-ui\.js"/);
  assert.match(eventsSource, /from\s+"\.\/project-subjects-attachments-ui\.js"/);
});
