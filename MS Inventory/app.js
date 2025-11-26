const API_BASE = 'http://localhost:3000';
const catalogEl = document.getElementById('catalog');
const searchInput = document.getElementById('searchInput');
const sortSelect = document.getElementById('sortSelect');
const compareDrawer = document.getElementById('compareDrawer');
const selectedListEl = document.getElementById('selectedList');
const compareBtn = document.getElementById('compareBtn');
const clearSelectionBtn = document.getElementById('clearSelectionBtn');
const compareDialog = document.getElementById('compareDialog');
const compareContent = document.getElementById('compareContent');
const exportCsvBtn = document.getElementById('exportCsvBtn');

document.getElementById('year').textContent = new Date().getFullYear();

let allParts = [];
let selectedPartIds = new Set();

async function fetchParts() {
  const search = encodeURIComponent(searchInput.value.trim());
  const sort = sortSelect.value;
  const url = `${API_BASE}/api/parts?search=${search}&sort=${sort}`;
  const res = await fetch(url);
  const data = await res.json();
  allParts = data.parts;
  renderCatalog(allParts);
}

function renderCatalog(parts) {
  catalogEl.innerHTML = '';
  parts.forEach(part => {
    const card = document.createElement('article');
    card.className = 'card';
    card.innerHTML = `
      <div class="media"></div>
      <div class="content">
        <h3>${part.name}</h3>
        <div class="meta">
          <span>${part.brand}</span>
          <span class="price">$${part.price.toFixed(2)}</span>
        </div>
        <div class="meta">
          <span>${part.category}</span>
          <span>${part.power || part.size || ''}</span>
        </div>
        <div class="row">
          <button class="btn" data-action="details" data-id="${part.id}">Details</button>
          <button class="btn" data-action="compare" data-id="${part.id}">${selectedPartIds.has(part.id) ? 'Selected' : 'Compare'}</button>
        </div>
      </div>`;
    catalogEl.appendChild(card);
  });
  updateCompareDrawer();
}

function updateCompareDrawer() {
  const selected = allParts.filter(p => selectedPartIds.has(p.id));
  if (selected.length === 0) {
    compareDrawer.hidden = true;
    return;
  }
  compareDrawer.hidden = false;
  selectedListEl.innerHTML = '';
  selected.forEach(p => {
    const pill = document.createElement('div');
    pill.className = 'selected-pill';
    pill.innerHTML = `${p.name} <button class="icon-btn" aria-label="Remove" data-remove="${p.id}">✕</button>`;
    selectedListEl.appendChild(pill);
  });
  compareBtn.disabled = selected.length < 2;
}

catalogEl.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;
  const id = parseInt(btn.dataset.id, 10);
  const action = btn.dataset.action;
  if (action === 'compare') {
    if (selectedPartIds.has(id)) {
      selectedPartIds.delete(id);
    } else {
      if (selectedPartIds.size >= 3) {
        alert('You can compare up to 3 items.');
        return;
      }
      selectedPartIds.add(id);
    }
    renderCatalog(allParts);
  }
  if (action === 'details') {
    const part = allParts.find(p => p.id === id);
    if (part) showQuickDetails(part);
  }
});

selectedListEl.addEventListener('click', (e) => {
  const removeBtn = e.target.closest('button[data-remove]');
  if (!removeBtn) return;
  const id = parseInt(removeBtn.dataset.remove, 10);
  selectedPartIds.delete(id);
  renderCatalog(allParts);
});

compareBtn.addEventListener('click', () => {
  const selected = allParts.filter(p => selectedPartIds.has(p.id));
  renderComparison(selected);
  compareDialog.showModal();
});

clearSelectionBtn.addEventListener('click', () => {
  selectedPartIds.clear();
  renderCatalog(allParts);
});

exportCsvBtn.addEventListener('click', () => {
  const selected = allParts.filter(p => selectedPartIds.has(p.id));
  const rows = [];
  const cols = ['Name','Brand','Category','Price','Power','Size','Weight','Warranty (mo)','Compat Score'];
  rows.push(cols.join(','));
  selected.forEach(p => {
    const score = computeCompatibilityScore(p);
    rows.push([
      p.name,
      p.brand,
      p.category,
      p.price,
      p.power || '',
      p.size || '',
      p.weight || '',
      p.warranty_months || '',
      score
    ].map(val => typeof val === 'string' ? '"' + val.replaceAll('"','""') + '"' : val).join(','));
  });
  const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'comparison.csv';
  a.click();
});

function showQuickDetails(part) {
  const lines = [
    part.description || 'No description',
    `Category: ${part.category}`,
    `Brand: ${part.brand}`,
    part.power ? `Power: ${part.power}` : null,
    part.size ? `Size: ${part.size}` : null,
    part.weight ? `Weight: ${part.weight} kg` : null,
    part.warranty_months ? `Warranty: ${part.warranty_months} months` : null,
  ].filter(Boolean);
  alert(lines.join('\n'));
}

function renderComparison(parts) {
  const cols = parts.length;
  compareContent.style.setProperty('--cols', String(cols));
  const labels = [
    'Name','Brand','Category','Price','Power','Size','Weight','Warranty (mo)','Compatibility Score'
  ];
  const rows = labels.map(label => ({ label, values: [] }));
  parts.forEach(p => {
    rows[0].values.push(p.name);
    rows[1].values.push(p.brand);
    rows[2].values.push(p.category);
    rows[3].values.push(`$${p.price.toFixed(2)}`);
    rows[4].values.push(p.power || '—');
    rows[5].values.push(p.size || '—');
    rows[6].values.push(p.weight ? `${p.weight} kg` : '—');
    rows[7].values.push(p.warranty_months ?? '—');
    const score = computeCompatibilityScore(p);
    const cls = score >= 80 ? 'good' : score < 50 ? 'bad' : '';
    rows[8].values.push(`<span class="score ${cls}">${score}</span>`);
  });
  const html = [];
  rows.forEach(r => {
    html.push(`<div class="label">${r.label}</div>`);
    r.values.forEach(v => html.push(`<div class="cell">${v}</div>`));
  });
  compareContent.innerHTML = html.join('');
}

function computeCompatibilityScore(part) {
  // Unique twist: score considers current search text and sort intent
  // Brand/Category match, spec presence, and price alignment with sort preference
  const search = searchInput.value.toLowerCase();
  const sort = sortSelect.value;
  let score = 50;
  if (search) {
    if (part.name.toLowerCase().includes(search)) score += 10;
    if (part.brand.toLowerCase().includes(search)) score += 10;
    if (part.category.toLowerCase().includes(search)) score += 8;
  }
  if (part.power) score += 6;
  if (part.size) score += 4;
  if (part.warranty_months) score += 4;
  // Price alignment: favor lower price when sorting asc, higher when desc
  const prices = allParts.map(p => p.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  if (max > min) {
    const norm = (part.price - min) / (max - min); // 0..1
    if (sort === 'price_asc') score += (1 - norm) * 8; else score += norm * 8;
  }
  score = Math.max(0, Math.min(100, Math.round(score)));
  return score;
}

searchInput.addEventListener('input', debounce(fetchParts, 250));
sortSelect.addEventListener('change', fetchParts);

function debounce(fn, wait){
  let t;return (...args)=>{clearTimeout(t);t=setTimeout(()=>fn.apply(null,args),wait)}
}

fetchParts().catch(err => {
  console.error(err);
  catalogEl.innerHTML = '<p style="color:#ff8080">Failed to load parts. Is the API running on http://localhost:3000?</p>';
});

