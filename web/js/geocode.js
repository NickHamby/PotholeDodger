// ── Autocomplete constants ────────────────────────────────────────────────────
const AC_VIEWBOX        = '-77.6,37.4,-77.3,37.65'; // Richmond VA: minLon,minLat,maxLon,maxLat
const AC_DEBOUNCE_MS    = 300;
const AC_MIN_CHARS      = 3;
const AC_BLUR_DELAY_MS  = 150; // allow mousedown on dropdown item to fire before blur closes it

export function attachAutocomplete(input, dropdownEl) {
  let debounceTimer  = null;
  let abortCtrl      = null;
  let items          = [];
  let highlightIndex = -1;

  function renderDropdown(results) {
    items          = results;
    highlightIndex = -1;
    dropdownEl.innerHTML = '';
    if (!results.length) {
      dropdownEl.classList.remove('open');
      return;
    }
    results.forEach((result, i) => {
      const item = document.createElement('div');
      item.className   = 'autocomplete-item';
      item.textContent = result.display_name;
      item.addEventListener('mousedown', (e) => {
        e.preventDefault(); // keep focus on input
        selectItem(i);
      });
      dropdownEl.appendChild(item);
    });
    dropdownEl.classList.add('open');
  }

  function selectItem(index) {
    if (items[index]) {
      input.value = items[index].display_name;
      closeDropdown();
    }
  }

  function closeDropdown() {
    clearTimeout(debounceTimer);
    if (abortCtrl) { abortCtrl.abort(); abortCtrl = null; }
    dropdownEl.classList.remove('open');
    dropdownEl.innerHTML = '';
    items          = [];
    highlightIndex = -1;
  }

  function updateHighlight(newIndex) {
    const itemEls = dropdownEl.querySelectorAll('.autocomplete-item');
    itemEls.forEach(el => el.classList.remove('highlighted'));
    if (newIndex >= 0 && newIndex < itemEls.length) {
      itemEls[newIndex].classList.add('highlighted');
      itemEls[newIndex].scrollIntoView({ block: 'nearest' });
    }
    highlightIndex = newIndex;
  }

  input.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    const q = input.value.trim();
    if (q.length < AC_MIN_CHARS) {
      if (abortCtrl) { abortCtrl.abort(); abortCtrl = null; }
      closeDropdown();
      return;
    }
    debounceTimer = setTimeout(async () => {
      if (abortCtrl) abortCtrl.abort();
      abortCtrl = new AbortController();
      const signal = abortCtrl.signal;
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&bounded=1` +
          `&viewbox=${AC_VIEWBOX}&q=${encodeURIComponent(q)}`;
        const res = await fetch(url, {
          signal,
          headers: { 'Accept-Language': 'en' }
        });
        if (!res.ok) return;
        const data = await res.json();
        renderDropdown(data);
      } catch (err) {
        if (err.name !== 'AbortError') closeDropdown();
      }
    }, AC_DEBOUNCE_MS);
  });

  input.addEventListener('keydown', (e) => {
    if (!dropdownEl.classList.contains('open')) return;
    const itemEls = dropdownEl.querySelectorAll('.autocomplete-item');
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      updateHighlight(Math.min(highlightIndex + 1, itemEls.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      updateHighlight(Math.max(highlightIndex - 1, -1));
    } else if (e.key === 'Enter') {
      if (highlightIndex >= 0) {
        e.preventDefault();
        selectItem(highlightIndex);
      }
    } else if (e.key === 'Escape') {
      closeDropdown();
    }
  });

  input.addEventListener('blur', () => {
    // Delay so mousedown on a dropdown item fires first
    setTimeout(() => closeDropdown(), AC_BLUR_DELAY_MS);
  });

  return { closeDropdown };
}

// ── Geocoding via Nominatim ───────────────────────────────────────────────────
export async function geocode(address) {
  // If user already entered "lat,lng" format, skip geocoding
  const latLng = address.match(/^\s*(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)\s*$/);
  if (latLng) return { lat: parseFloat(latLng[1]), lng: parseFloat(latLng[2]) };

  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&viewbox=-77.6,37.4,-77.3,37.65&bounded=0&q=${encodeURIComponent(address)}`;
  const res = await fetch(url, {
    headers: { 'Accept-Language': 'en' }
  });
  if (!res.ok) throw new Error(`Geocoding request failed (${res.status})`);
  const data = await res.json();
  if (!data.length) throw new Error(`Could not find location: "${address}"`);
  return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
}
