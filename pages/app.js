import {CATEGORIES, LOCALITIES, PROVIDERS} from './data.js';
import {inSlot} from './validate.js';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const esc = (value = '') => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const fmt = value => new Intl.NumberFormat('en-IN', {style:'currency',currency:'INR',maximumFractionDigits:0}).format(value);
const dateFmt = new Intl.DateTimeFormat('en-IN', {dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Kolkata'});
const istInput = (date = new Date()) => new Date(date.getTime() + 19800000).toISOString().slice(0,16);
const initials = name => name.split(' ').map(word => word[0]).slice(0,2).join('');
const icons = {
  pin:'<path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
  search:'<circle cx="10.7" cy="10.7" r="6.2"/><path d="m15.1 15.1 4.8 4.8"/>',
  tool:'<path d="M14.7 6.3a4.7 4.7 0 0 0-6.2 5.4l-5 5a2.1 2.1 0 0 0 3 3l5-5a4.7 4.7 0 0 0 5.8-6l-2.7 2.7-2.1-.5-.5-2.1z"/>',
  wrench:'<path d="M14.7 6.3a4.7 4.7 0 0 0-6.2 5.4l-5 5a2.1 2.1 0 0 0 3 3l5-5a4.7 4.7 0 0 0 5.8-6l-2.7 2.7-2.1-.5-.5-2.1z"/>',
  chevron:'<path d="m6 9 6 6 6-6"/>',
  menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',
  close:'<path d="m6 6 12 12M18 6 6 18"/>',
  zap:'<path d="m13 2-9 12h7l-1 8 10-12h-7z"/>',
  droplets:'<path d="M12 3c-4 5-7 8-7 12a7 7 0 0 0 14 0c0-4-3-7-7-12Z"/><path d="M8 15a4 4 0 0 0 4 4"/>',
  'graduation-cap':'<path d="m2 9 10-5 10 5-10 5zm4 2v5c3 3 9 3 12 0v-5m4-2v6"/>',
  bookmark:'<path d="M6 4h12v16l-6-4-6 4z"/>',
  star:'<path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
  clock:'<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3 2"/>',
  calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18"/>',
  sliders:'<path d="M4 7h6m4 0h6M4 17h10m4 0h2"/><circle cx="12" cy="7" r="2"/><circle cx="16" cy="17" r="2"/>',
  layout:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18m-11 0v10"/>',
  clipboard:'<rect x="5" y="5" width="14" height="16" rx="2"/><path d="M9 3h6v4H9zM9 12h6m-6 4h6"/>',
  users:'<circle cx="9" cy="8" r="3"/><path d="M3 19v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2m2-14a3 3 0 0 1 0 6m4 8v-2a4 4 0 0 0-3-3.9"/>',
  home:'<path d="m3 10 9-7 9 7m-16-2v12h14V8m-9 12v-6h4v6"/>',
  check:'<path d="m5 12 4 4L19 6"/>',
  copy:'<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
};
const icon = name => `<span data-icon="${name}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || ''}</svg></span>`;
function setupIcons(root) {
  $$('[data-icon]', root).forEach(el => {
    const template = document.createElement('template');
    template.innerHTML = icon(el.dataset.icon);
    el.replaceChildren(...template.content.firstElementChild.childNodes);
  });
}

const categories = Object.fromEntries(CATEGORIES.map(category => [category.id,category]));
const categoryPhotos = {electrician:'electrical',plumber:'plumbing',repair:'repair',tutor:'tutor'};
const categoryNames = {electrician:'Electrical',plumber:'Plumbing',repair:'Appliance repair',tutor:'Home tutoring'};
const categoryNotes = {
  electrician:'Wiring, switches and fittings',
  plumber:'Leaks, drains and fixtures',
  repair:'AC, fridge and washer repairs',
  tutor:'School and exam support',
};
const order = ['electrician','plumber','repair','tutor'];
const options = (items, first = '') => [
  ...(first ? [`<option value="">${first}</option>`] : []),
  ...items.map(([value,label]) => `<option value="${esc(value)}">${esc(label)}</option>`),
].join('');
const categoryOptions = options(order.map(id => [id,categoryNames[id]]),'All services');
const localityOptions = options(LOCALITIES.map(name => [name,name]),'All localities');
const dialog = $('#dialog');
let toastTimeout;
let activeTrigger;
let savedOnly = false;
const savedPreference = loadPreference('lsf-pages-saved', []);
const saved = new Set(Array.isArray(savedPreference) ? savedPreference : []);
let locality = loadPreference('lsf-pages-locality', '');
if (!LOCALITIES.includes(locality)) locality = '';

function loadPreference(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}

function savePreference(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch { return false; }
}

function toast(message) {
  const element = $('#toast');
  clearTimeout(toastTimeout);
  element.textContent = message;
  toastTimeout = setTimeout(() => { element.textContent = ''; }, 3800);
}

function showDialog(title, content) {
  const alreadyOpen = dialog.open;
  if (!alreadyOpen) activeTrigger = document.activeElement;
  $('#dialog-content').innerHTML = `<div class="dialog-top"><h2 id="dialog-title" tabindex="-1">${esc(title)}</h2><button class="icon-button" type="button" data-action="close" aria-label="Close dialog">${icon('close')}</button></div>${content}`;
  if (!alreadyOpen) dialog.showModal();
  $('#dialog-title').focus({preventScroll:true});
  dialog.scrollTop = 0;
}

dialog.addEventListener('close', () => {
  if (activeTrigger?.isConnected) activeTrigger.focus({preventScroll:true});
});
let backdropDown = false;
dialog.addEventListener('pointerdown', event => { backdropDown = event.target === dialog; });
dialog.addEventListener('click', event => { if (event.target === dialog && backdropDown) dialog.close(); backdropDown = false; });

function setNav(open) {
  const button = $('.menu-button');
  const target = $('#site-nav');
  if (!button || !target) return;
  target.classList.toggle('nav-open',open);
  button.setAttribute('aria-expanded',String(open));
  button.setAttribute('aria-label',open ? 'Close menu' : 'Open menu');
}

function writeLocation() {
  const current = locality || 'Greater Noida, UP';
  $('#header-location').textContent = current;
  $('.location-button').setAttribute('aria-label', 'Change locality (' + current + ')');
  $('#hero-locality').value = locality;
}

function browse() {
  $('#directory').scrollIntoView({block:'start'});
  $('#directory h2').setAttribute('tabindex','-1');
  $('#directory h2').focus({preventScroll:true});
}

function setFilters(category, area) {
  const elements = $('#filters').elements;
  elements.category.value = category;
  elements.locality.value = area;
  elements.query.value = '';
  elements.open.checked = false;
  savedOnly = false;
  renderProviders();
  browse();
}

function empty(title, information, action = '') {
  return `<div class="empty"><h3>${title}</h3><p>${information}</p>${action}</div>`;
}

function providerCard(provider, now) {
  const open = inSlot(provider.slot, now);
  const pressed = saved.has(provider.id);
  return `<article class="provider-card">
    <div class="provider-top"><span class="avatar ${provider.category}" aria-hidden="true">${esc(initials(provider.name))}</span><div class="name-block"><h3>${esc(provider.name)}</h3><small>${categoryNames[provider.category]}</small></div>
    <button type="button" class="icon-button" data-action="save" data-id="${provider.id}" aria-pressed="${pressed}" aria-label="Save ${esc(provider.name)}">${icon('bookmark')}</button></div>
    <p class="provider-specialty">${esc(provider.title)}</p>
    <div class="provider-meta"><span>${icon('star')} ${provider.rating.toFixed(1)} (${provider.reviews})</span><span>${icon('pin')} ${esc(provider.locality)}</span><span class="${open ? 'open' : ''}">${icon('clock')} ${open ? 'Open now' : 'Closed now'}</span></div>
    <div class="provider-bottom"><span class="price">${fmt(provider.price)} <small>/ ${esc(provider.unit)}</small></span><button class="button outline" data-action="profile" data-id="${provider.id}">View profile</button></div>
  </article>`;
}

function renderProviders() {
  const form = $('#filters');
  const {query,category,locality:area,sort,open} = form.elements;
  const terms = query.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const now = new Date();
  const providers = PROVIDERS.filter(provider => {
    const text = [provider.name,provider.title,provider.description,provider.locality,categoryNames[provider.category],categories[provider.category].label,...provider.services.map(service => service.name)].join(' ').toLowerCase();
    return (!category.value || category.value === provider.category) &&
      (!area.value || area.value === provider.locality) &&
      (!open.checked || inSlot(provider.slot, now)) &&
      (!savedOnly || saved.has(provider.id)) &&
      terms.every(term => text.includes(term));
  });
  const rank = (a,b) => b.rating - a.rating || b.reviews - a.reviews || a.name.localeCompare(b.name);
  providers.sort((a,b) => sort.value === 'price' ? a.price - b.price || rank(a,b) : sort.value === 'experience' ? b.experience - a.experience || rank(a,b) : rank(a,b));
  $('#saved-count').textContent = saved.size;
  $('#saved-filter').setAttribute('aria-pressed',String(savedOnly));
  $('#result-count').textContent = `${providers.length} ${providers.length === 1 ? 'provider' : 'providers'} found`;
  $('#providers').innerHTML = providers.length ? providers.map(provider => providerCard(provider,now)).join('')
    : empty(savedOnly ? 'No saved providers match' : 'No matching providers','Try another locality, service or search term.','<button class="button outline" data-action="reset">Clear filters</button>');
}

function startHome() {
  $('#hero-category').innerHTML = categoryOptions;
  $('#hero-locality').innerHTML = localityOptions;
  $('#filters').elements.category.innerHTML = categoryOptions;
  $('#filters').elements.locality.innerHTML = localityOptions;
  writeLocation();
  $('#filters').elements.locality.value = locality;
  $('#categories').innerHTML = order.map(id => `<button type="button" class="category" data-category="${id}">
    <img src="./pages/assets/${categoryPhotos[id]}.webp" alt="" loading="lazy" width="420" height="210">
    <span class="category-info"><span class="tile-icon">${icon(categories[id].icon)}</span><span><strong>${categoryNames[id]}</strong><small>${categoryNotes[id]}</small></span></span></button>`).join('');
  $('#hero-search').addEventListener('submit', event => {
    event.preventDefault();
    setFilters($('#hero-category').value,$('#hero-locality').value);
  });
  $('#filters').addEventListener('input',renderProviders);
  $('#filters').addEventListener('submit',event => {event.preventDefault(); renderProviders();});
  $('#saved-filter').addEventListener('click',() => {savedOnly = !savedOnly; renderProviders();});
  $('#site-nav').addEventListener('click', event => { if (event.target.closest('a')) setNav(false); });
  renderProviders();
}

function openLocation() {
  showDialog('Choose your locality',`<p class="dialog-lead">Search across Greater Noida or narrow the directory to your neighbourhood.</p>
    <form class="stack" id="location-form"><label>Neighbourhood<select name="locality">${localityOptions}</select></label><div><button class="button primary" type="submit">Apply locality</button></div></form>`);
  const form = $('#location-form');
  form.elements.locality.value = locality;
  form.addEventListener('submit',event => {
    event.preventDefault();
    locality = form.elements.locality.value;
    savePreference('lsf-pages-locality',locality);
    writeLocation();
    $('#filters').elements.locality.value = locality;
    renderProviders();
    dialog.close();
  });
}

function providerProfile(provider) {
  showDialog(provider.name,`<p class="dialog-lead">${categoryNames[provider.category]} · ${esc(provider.title)}</p>
    <div class="detail-row"><span class="rating">${icon('star')} ${provider.rating.toFixed(1)} (${provider.reviews} sample reviews)</span><span>${icon('pin')} ${esc(provider.locality)}</span><span>${icon('clock')} ${provider.experience} years’ experience</span></div>
    <p>${esc(provider.description)}</p><p class="subtle"><strong>Hours (IST)</strong> · ${esc(provider.availability)}<br><strong>Languages</strong> · ${esc(provider.languages.join(', '))}</p>
    <h3 class="detail-heading">Indicative starting prices</h3><ul class="detail-list">${provider.services.map(service => `<li>${esc(service.name)} <strong>${fmt(service.price)}</strong></li>`).join('')}</ul>
    <div class="dialog-actions"><button class="button primary" data-action="request" data-id="${provider.id}">${icon('calendar')} Try a demo request</button></div>`);
}

const requestKey = 'lsf-pages-demo-requests';
const refPattern = /^DEMO-[A-F0-9]{12}$/;

function demoRequests() {
  const stored = loadPreference(requestKey, []);
  return Array.isArray(stored) ? stored : [];
}

function requestForm(provider) {
  const now = new Date();
  const until = new Date(now.getTime() + 90 * 864e5);
  showDialog('Try a demo request',`<p class="dialog-lead">Choose a preferred time with ${esc(provider.name)}. The demo saves your selection on this device.</p>
    <form id="request-form" class="stack">
      <label>Preferred date and time (IST)<input name="when" type="datetime-local" min="${istInput(now)}" max="${istInput(until)}" required aria-describedby="hours request-error"><small id="hours">${esc(provider.availability)}</small></label>
      <p class="inline-error" id="request-error" role="alert"></p>
      <div><button class="button primary" type="submit">Save demo request</button></div>
    </form>`);
  const form = $('#request-form');
  form.addEventListener('submit', event => {
    event.preventDefault();
    const field = form.elements.when;
    const preferred = new Date(field.value + ':00+05:30');
    const error = $('#request-error');
    error.textContent = '';
    field.removeAttribute('aria-invalid');
    if (!Number.isFinite(preferred.getTime()) || preferred <= new Date() || preferred > until) {
      error.textContent = 'Choose a future time within the next 90 days.';
    } else if (!inSlot(provider.slot, preferred)) {
      error.textContent = 'Choose a time within this provider’s working hours.';
    }
    if (error.textContent) {
      field.setAttribute('aria-invalid','true');
      field.focus();
      return;
    }
    const ref = 'DEMO-' + crypto.randomUUID().replaceAll('-','').slice(0,12).toUpperCase();
    const record = {ref,providerId:provider.id,when:preferred.toISOString()};
    if (!savePreference(requestKey,[...demoRequests(),record])) {
      error.textContent = 'This browser blocked storage. Allow site storage to save and track a demo request.';
      return;
    }
    showDialog('Demo request saved',`<div class="confirmation"><strong id="new-ref">${esc(ref)}</strong><p>Use this reference to find your demo request in this browser.</p></div>
      <div class="dialog-actions"><button class="button primary" data-action="track" data-ref="${esc(ref)}">Track this request</button><button class="button outline" data-action="copy" data-ref="${esc(ref)}">${icon('copy')} Copy reference</button></div><p class="local-toast" role="status"></p>`);
  });
}

function trackRequest(ref = '') {
  showDialog('Track a demo request',`<p class="dialog-lead">Enter a demo reference from this browser.</p>
    <form id="track-form" class="stack"><label>Request reference<input name="reference" value="${esc(ref)}" placeholder="DEMO-…" maxlength="17" required autocapitalize="characters"></label>
    <div><button class="button primary" type="submit">Check status</button></div><p class="inline-error" role="alert"></p><div id="track-result" aria-live="polite"></div></form>`);
  const form = $('#track-form');
  const lookup = event => {
    event?.preventDefault();
    const reference = form.elements.reference.value.trim().toUpperCase();
    const message = $('.inline-error',form);
    const result = $('#track-result',form);
    result.replaceChildren();
    message.textContent = '';
    if (!refPattern.test(reference)) {
      message.textContent = 'Enter a complete reference beginning with DEMO-.';
      form.elements.reference.focus();
      return;
    }
    const request = demoRequests().find(record => record?.ref === reference);
    const when = new Date(request?.when);
    const provider = PROVIDERS.find(item => item.id === request?.providerId);
    if (!request || !provider || !Number.isFinite(when.getTime())) {
      message.textContent = 'No demo request matched that reference in this browser.';
      return;
    }
    result.innerHTML = `<div class="status-result"><strong>Saved on this device</strong><p>${esc(provider.name)}</p>
      <p>Preferred time · ${dateFmt.format(when)} IST</p></div>`;
  };
  form.addEventListener('submit',lookup);
  if (ref) lookup();
}


const app = $('#app');
app.append($('#home').content.cloneNode(true));
$$('.brand',app).forEach(link => {
  link.innerHTML = '<img src="./pages/assets/mark.svg" alt="" width="39" height="39"><span>Local Service <span>Finder</span></span>';
});
setupIcons(app);
startHome();

if (location.hash === '#track') trackRequest();
else if (location.hash === '#directory') browse();
else if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView();

document.addEventListener('keydown',event => {
  if (event.key === 'Escape' && !dialog.open) setNav(false);
});
document.addEventListener('click',async event => {
  const button = event.target.closest('button');
  if (!button) return;
  const {category,action,id,ref} = button.dataset;
  if (category) {
    $('#hero-category').value = category;
    setFilters(category,locality);
    return;
  }
  switch (action) {
    case 'menu': setNav(button.getAttribute('aria-expanded') !== 'true'); break;
    case 'location': openLocation(); break;
    case 'browse': browse(); break;
    case 'track': setNav(false); trackRequest(ref); break;
    case 'close': dialog.close(); break;
    case 'reset':
      $('#filters').reset();
      savedOnly = false;
      renderProviders();
      break;
    case 'profile': {
      const provider = PROVIDERS.find(item => item.id === id);
      if (provider) providerProfile(provider);
      break;
    }
    case 'request': {
      const provider = PROVIDERS.find(item => item.id === id);
      if (provider) requestForm(provider);
      break;
    }
    case 'save': {
      if (saved.has(id)) saved.delete(id);
      else saved.add(id);
      savePreference('lsf-pages-saved',[...saved]);
      renderProviders();
      ($(`[data-action="save"][data-id="${id}"]`) || $('#saved-filter')).focus({preventScroll:true});
      toast(saved.has(id) ? 'Provider saved.' : 'Provider removed from saved providers.');
      break;
    }
    case 'copy': {
      const feedback = $('.local-toast',dialog);
      try { await navigator.clipboard.writeText(ref); feedback.textContent = 'Reference copied.'; }
      catch { feedback.textContent = 'Select the reference number to copy it.'; }
      break;
    }
  }
});
