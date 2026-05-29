// ============================================================================
// Attributes + tags form helpers
// ============================================================================

import { elements, formState } from './state.js';
import { escapeHtml } from './utils.js';

declare global {
  interface Window {
    __solanaDemo: {
      removeAttribute: (key: string) => void;
      removeTag: (index: number) => void;
    };
  }
}

export function addAttribute(): void {
  const key = elements.attrKey?.value.trim();
  const value = elements.attrValue?.value.trim();
  if (!key || !value) return;
  formState.attributes[key] = value;
  if (elements.attrKey) elements.attrKey.value = '';
  if (elements.attrValue) elements.attrValue.value = '';
  renderAttributes();
}

export function removeAttribute(key: string): void {
  delete formState.attributes[key];
  renderAttributes();
}

export function addTag(): void {
  const tag = elements.tagInput?.value.trim();
  if (!tag) return;
  if (!formState.tags.includes(tag)) formState.tags.push(tag);
  if (elements.tagInput) elements.tagInput.value = '';
  renderTags();
}

export function removeTag(index: number): void {
  formState.tags.splice(index, 1);
  renderTags();
}

function renderAttributes(): void {
  const el = elements.attributesList;
  if (!el) return;
  el.innerHTML = Object.entries(formState.attributes)
    .map(([k, v]) => `<span class="pill" onclick="window.__solanaDemo.removeAttribute('${escapeHtml(k)}')">${escapeHtml(k)}: ${escapeHtml(v)} ✕</span>`)
    .join('');
}

function renderTags(): void {
  const el = elements.tagsList;
  if (!el) return;
  el.innerHTML = formState.tags
    .map((t, i) => `<span class="pill" onclick="window.__solanaDemo.removeTag(${i})">${escapeHtml(t)} ✕</span>`)
    .join('');
}

// Wire onclick handlers used by the pill markup above.
window.__solanaDemo = { removeAttribute, removeTag };
