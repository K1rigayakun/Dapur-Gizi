/**
 * DapurGizi — Reusable Data Table & Pagination Component (js/components/table.js)
 */

import { renderIcon } from './icon.js';
import { escapeHtml } from '../utils/format.js';

export function paginateArray(items = [], page = 1, pageSize = 6) {
  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(totalPages, Math.max(1, Number(page) || 1));
  const startIdx = (currentPage - 1) * pageSize;
  const slice = items.slice(startIdx, startIdx + pageSize);
  return {
    items: slice,
    currentPage,
    totalPages,
    totalItems,
    startIdx: totalItems > 0 ? startIdx + 1 : 0,
    endIdx: Math.min(totalItems, startIdx + slice.length)
  };
}

export function renderPaginationHtml({ currentPage, totalPages, totalItems, startIdx, endIdx, idPrefix = 'tbl' }) {
  return `
    <div class="dg-pagination">
      <div>
        Menampilkan <strong>${startIdx}–${endIdx}</strong> dari <strong>${totalItems}</strong> data
      </div>
      <div class="dg-pagination__controls">
        <button type="button" class="btn btn-secondary btn-sm btn-liquid" data-page-action="prev" data-prefix="${escapeHtml(idPrefix)}" ${
          currentPage <= 1 ? 'disabled' : ''
        } aria-label="Halaman sebelumnya">
          ${renderIcon('chevron-left', { size: 15 })} Sebelumnya
        </button>
        <span style="padding:0 10px;font-weight:700;color:var(--text-primary);">
          Hal. ${currentPage} / ${totalPages}
        </span>
        <button type="button" class="btn btn-secondary btn-sm btn-liquid" data-page-action="next" data-prefix="${escapeHtml(idPrefix)}" ${
          currentPage >= totalPages ? 'disabled' : ''
        } aria-label="Halaman berikutnya">
          Berikutnya ${renderIcon('chevron-right', { size: 15 })}
        </button>
      </div>
    </div>
  `;
}
