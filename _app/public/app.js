import {CATEGORIES, LOCALITIES} from './data.js?v=2';
import {inSlot, validateEnquiry} from './validate.js?v=2';

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
const statusNames = {pending:'Pending',contacted:'Contacted',confirmed:'Confirmed',completed:'Completed',cancelled:'Cancelled'};
const options = (items, first = '') => [
  ...(first ? [`<option value="">${first}</option>`] : []),
  ...items.map(([value,label]) => `<option value="${esc(value)}">${esc(label)}</option>`),
].join('');
const categoryOptions = options(order.map(id => [id,categoryNames[id]]),'All services');
const localityOptions = options(LOCALITIES.map(name => [name,name]),'All localities');
const statusBadge = status => `<span class="status ${esc(status)}">${statusNames[status] || 'Unknown'}</span>`;
const dialog = $('#dialog');
let toastTimeout;
let activeTrigger;
let allProviders = [];
let directoryFailed = false;
let directoryLoading = true;
let savedOnly = false;
const savedPreference = loadPreference('lsf-saved', []);
const saved = new Set(Array.isArray(savedPreference) ? savedPreference : []);
let locality = loadPreference('lsf-locality', '');
if (!LOCALITIES.includes(locality)) locality = '';

function loadPreference(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}

function savePreference(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* Preferences remain available for this visit. */ }
}

async function api(path, method = 'GET', body = undefined) {
  let response;
  try {
    response = await fetch('/api' + path, {method, headers:body ? {'Content-Type':'application/json'} : {}, body:body ? JSON.stringify(body) : undefined});
  } catch {
    throw new Error('The connection was interrupted. Try again.');
  }
  const data = await response.json().catch(() => null);
  if (!response.ok || !data) {
    const error = new Error(data?.error || 'The site could not complete that action. Try again.');
    error.fields = data?.fields || {};
    throw error;
  }
  return data;
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

function setNav(open, admin = false) {
  const button = $(admin ? '.admin-menu' : '.menu-button');
  const target = $(admin ? '#admin-nav' : '#site-nav');
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
  const providers = allProviders.filter(provider => {
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
  $('#result-count').textContent = directoryLoading ? 'Loading providers…' : directoryFailed ? 'Directory unavailable' : `${providers.length} ${providers.length === 1 ? 'provider' : 'providers'} found`;
  $('#providers').innerHTML = directoryLoading ? '' : directoryFailed
    ? empty('The directory could not load','Check your connection and try again.','<button class="button outline" data-action="retry">Try again</button>')
    : providers.length ? providers.map(provider => providerCard(provider,now)).join('')
    : empty(savedOnly ? 'No saved providers match' : 'No matching providers','Try another locality, service or search term.','<button class="button outline" data-action="reset">Clear filters</button>');
}

async function loadDirectory() {
  directoryLoading = true;
  directoryFailed = false;
  renderProviders();
  try { allProviders = (await api('/providers')).providers; }
  catch { directoryFailed = true; }
  finally { directoryLoading = false; renderProviders(); }
}

function startHome() {
  $('#hero-category').innerHTML = categoryOptions;
  $('#hero-locality').innerHTML = localityOptions;
  $('#filters').elements.category.innerHTML = categoryOptions;
  $('#filters').elements.locality.innerHTML = localityOptions;
  writeLocation();
  $('#filters').elements.locality.value = locality;
  $('#categories').innerHTML = order.map(id => `<button type="button" class="category" data-category="${id}">
    <img src="/assets/${categoryPhotos[id]}.webp" alt="" loading="lazy" width="420" height="210">
    <span class="category-info"><span class="tile-icon">${icon(categories[id].icon)}</span><span><strong>${categoryNames[id]}</strong><small>${categoryNotes[id]}</small></span></span></button>`).join('');
  $('#hero-search').addEventListener('submit', event => {
    event.preventDefault();
    setFilters($('#hero-category').value,$('#hero-locality').value);
  });
  $('#filters').addEventListener('input',renderProviders);
  $('#filters').addEventListener('submit',event => {event.preventDefault(); renderProviders();});
  $('#saved-filter').addEventListener('click',() => {savedOnly = !savedOnly; renderProviders();});
  $('#site-nav').addEventListener('click', event => { if (event.target.closest('a')) setNav(false); });
  loadDirectory();
}

function openLocation() {
  showDialog('Choose your locality',`<p class="dialog-lead">Search across Greater Noida or narrow the directory to your neighbourhood.</p>
    <form class="stack" id="location-form"><label>Neighbourhood<select name="locality">${localityOptions}</select></label><div><button class="button primary" type="submit">Apply locality</button></div></form>`);
  const form = $('#location-form');
  form.elements.locality.value = locality;
  form.addEventListener('submit',event => {
    event.preventDefault();
    locality = form.elements.locality.value;
    savePreference('lsf-locality',locality);
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
    <div class="dialog-actions"><button class="button primary" data-action="request" data-id="${provider.id}">${icon('calendar')} Request a visit</button></div>`);
}

const inputError = name => `<small class="field-error" id="error-${name}" data-error-for="${name}"></small>`;
function requestForm(provider) {
  const now = new Date();
  showDialog('Request a visit',`<p class="dialog-lead">Request a preferred time with ${esc(provider.name)}. Use test details. This demo saves your request to the admin queue.</p>
    <form id="request-form" class="stack" novalidate>
      <div class="field-pair">
        <label>Full name<input name="name" autocomplete="name" maxlength="60" required aria-describedby="error-name">${inputError('name')}</label>
        <label>Mobile number<input name="phone" type="tel" autocomplete="tel" maxlength="17" required aria-describedby="error-phone">${inputError('phone')}</label>
      </div>
      <div class="field-pair">
        <label>Locality or address<input name="locality" value="${esc(locality || provider.locality)}" maxlength="120" required aria-describedby="error-locality">${inputError('locality')}</label>
        <label>Preferred date and time (IST)<input name="when" type="datetime-local" min="${istInput(now)}" max="${istInput(new Date(now.getTime() + 90 * 864e5))}" required aria-describedby="hours error-when"><small id="hours">${esc(provider.availability)}</small>${inputError('when')}</label>
      </div>
      <label>What needs to be done?<textarea name="description" rows="3" maxlength="500" placeholder="Briefly describe the work" required aria-describedby="error-description"></textarea>${inputError('description')}</label>
      <div><label class="check"><input name="consent" type="checkbox" required aria-describedby="error-consent"> I agree to save these details for this demo request.</label>${inputError('consent')}</div>
      <p class="inline-error" id="request-error" role="alert"></p>
      <div><button class="button primary" type="submit">Submit request</button></div>
    </form>`);
  const form = $('#request-form');
  const mainError = $('#request-error');
  form.addEventListener('submit',async event => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(form));
    values.consent = form.elements.consent.checked;
    values.providerId = provider.id;
    values.when = values.when ? values.when + ':00+05:30' : '';
    for (const node of $$('[data-error-for]',form)) {
      node.textContent = '';
      form.elements[node.dataset.errorFor].removeAttribute('aria-invalid');
    }
    mainError.textContent = '';
    const showFields = fields => {
      for (const [key,message] of Object.entries(fields)) {
        const target = $('[data-error-for="'+key+'"]',form);
        if (!target) continue;
        target.textContent = message;
        form.elements[key].setAttribute('aria-invalid','true');
      }
      $('[aria-invalid=true]',form)?.focus();
    };
    const issues = validateEnquiry(values,allProviders);
    if (Object.keys(issues).length) { showFields(issues); return; }
    const submit = $('button[type=submit]',form);
    submit.disabled = true;
    submit.textContent = 'Saving…';
    try {
      const {ref} = await api('/requests','POST',values);
      if (!dialog.open || !form.isConnected) {
        toast('Request saved. Reference ' + ref);
        return;
      }
      showDialog('Request saved',`<div class="confirmation"><strong id="new-ref">${esc(ref)}</strong><p>Keep this reference number to check the status of your request.</p></div>
        <div class="dialog-actions"><button class="button primary" data-action="track" data-ref="${esc(ref)}">Track this request</button><button class="button outline" data-action="copy" data-ref="${esc(ref)}">${icon('copy')} Copy reference</button></div><p class="local-toast" role="status"></p>`);
    } catch (error) {
      mainError.textContent = error.message;
      showFields(error.fields || {});
    } finally {
      submit.disabled = false;
      submit.textContent = 'Submit request';
    }
  });
}

function trackRequest(ref = '') {
  showDialog('Track a request',`<p class="dialog-lead">Enter the reference number you received after submitting your request.</p>
    <form id="track-form" class="stack"><label>Request reference<input name="reference" value="${esc(ref)}" placeholder="LSF-…" maxlength="24" required autocapitalize="characters"></label>
    <div><button class="button primary" type="submit">Check status</button></div><p class="inline-error" role="alert"></p><div id="track-result" aria-live="polite"></div></form>`);
  const form = $('#track-form');
  const lookup = async event => {
    event?.preventDefault();
    const reference = form.elements.reference.value.trim().toUpperCase();
    const message = $('.inline-error',form);
    const result = $('#track-result',form);
    result.replaceChildren();
    message.textContent = '';
    if (!/^LSF-[A-F0-9]{20}$/.test(reference)) {
      message.textContent = 'Enter a complete reference number beginning with LSF-.';
      form.elements.reference.focus();
      return;
    }
    const submit = $('button[type=submit]',form);
    submit.disabled = true;
    submit.textContent = 'Checking…';
    try {
      const {request} = await api('/requests/' + reference);
      const provider = allProviders.find(item => item.id === request.provider_id);
      result.innerHTML = `<div class="status-result">${statusBadge(request.status)}${provider ? `<p><strong>${esc(provider.name)}</strong></p>` : ''}
        <p>Preferred time · ${dateFmt.format(new Date(request.preferred_at))} IST</p></div>`;
    } catch (error) { message.textContent = error.message; }
    finally { submit.disabled = false; submit.textContent = 'Check status'; }
  };
  form.addEventListener('submit',lookup);
  if (ref) lookup();
}

let section = 'overview';
let adminData;
let adminFailure = false;
let adminFilter = {query:'',status:''};
const adminLabels = {overview:'Overview',requests:'Service requests',providers:'Providers'};
const adminProvider = id => adminData.providers.find(provider => provider.id === id);
const dateCell = date => dateFmt.format(new Date(date)) + ' IST';

function adminTable(requests) {
  if (!requests.length) return empty('No requests here','New service requests appear here after someone submits the form.');
  return `<div class="table-wrap" tabindex="0" aria-label="Scrollable service requests"><table class="data-table">
    <thead><tr><th scope="col">Customer</th><th scope="col">Provider</th><th scope="col">Preferred time</th><th scope="col">Status</th><th scope="col">Action</th></tr></thead>
    <tbody>${requests.map(request => `<tr><td><strong>${esc(request.name)}</strong><small>${esc(request.locality)}</small></td><td>${esc(adminProvider(request.provider_id)?.name || 'Former provider')}</td>
      <td>${dateCell(request.preferred_at)}</td><td>${statusBadge(request.status)}</td><td><button class="text-button" type="button" data-action="manage" data-ref="${esc(request.ref)}" aria-label="View request for ${esc(request.name)}">View request</button></td></tr>`).join('')}</tbody></table></div>`;
}

function filterAdminRequests() {
  const needle = adminFilter.query.trim().toLowerCase();
  const subset = adminData.requests.filter(request => (!adminFilter.status || request.status === adminFilter.status)
    && [request.name,request.ref,request.locality,adminProvider(request.provider_id)?.name].some(value => value?.toLowerCase().includes(needle)));
  $('#request-results').innerHTML = subset.length ? adminTable(subset) : empty('No matching requests', 'New requests appear here. Clear the filters to see every request.');
}

function renderAdmin() {
  const view = $('#admin-view');
  $('#admin-crumb').textContent = adminLabels[section];
  for (const node of $$('[data-section]', $('#admin-nav'))) {
    if (node.dataset.section === section) node.setAttribute('aria-current','page');
    else node.removeAttribute('aria-current');
  }
  if (!adminData) {
    view.innerHTML = adminFailure ? empty('The admin panel could not load','Check your connection and try again.','<button class="button outline" data-action="retry-admin">Try again</button>') : '<p>Loading admin panel…</p>';
    return;
  }
  if (section === 'requests') {
    view.innerHTML = `<div class="admin-title"><h1>Service requests</h1><p class="subtle">Review enquiries, preferred times and request status.</p></div>
      <section class="panel"><form id="request-filters" class="table-filter" role="search" aria-label="Filter requests">
      <input aria-label="Search requests" name="query" type="search" placeholder="Search by customer, provider or reference" value="${esc(adminFilter.query)}">
      <select aria-label="Request status" name="status">${options(Object.entries(statusNames),'All statuses')}</select>
      </form><div id="request-results" aria-live="polite"></div></section>`;
    const form = $('#request-filters');
    form.elements.status.value = adminFilter.status;
    form.addEventListener('submit',event => event.preventDefault());
    form.addEventListener('input',() => {
      adminFilter = {query:form.elements.query.value,status:form.elements.status.value};
      filterAdminRequests();
    });
    filterAdminRequests();
    return;
  }
  if (section === 'providers') {
    view.innerHTML = `<div class="admin-title"><h1>Providers</h1><p class="subtle">Choose which sample listings appear in the service directory.</p></div>
      <section class="panel"><div class="panel-top"><h3>Directory listings</h3><span class="status visible">${adminData.providers.length - adminData.hidden.length} visible</span></div>
      <div class="table-wrap" tabindex="0" aria-label="Scrollable provider listings"><table class="data-table"><thead><tr><th scope="col">Provider</th><th scope="col">Locality</th><th scope="col">Starting at</th><th scope="col">Status</th><th scope="col">Visibility</th></tr></thead>
      <tbody>${adminData.providers.map(provider => {
        const hidden = adminData.hidden.includes(provider.id);
        return `<tr><td><strong>${esc(provider.name)}</strong><small>${categoryNames[provider.category]}</small></td><td>${esc(provider.locality)}</td><td>${fmt(provider.price)}</td>
          <td><span class="status ${hidden ? '' : 'visible'}">${hidden ? 'Hidden' : 'Visible'}</span></td>
          <td><button type="button" class="button outline" data-action="visibility" data-id="${provider.id}" aria-label="${hidden ? 'Show' : 'Hide'} ${esc(provider.name)}">${hidden ? 'Show' : 'Hide'}</button></td></tr>`;
      }).join('')}</tbody></table></div></section>`;
    return;
  }
  const {requests,providers,hidden} = adminData;
  const metrics = [
    ['users',providers.length-hidden.length,'Visible providers'],
    ['clipboard',requests.length,'Total requests'],
    ['clock',requests.filter(item => item.status === 'pending').length,'Pending requests'],
    ['check',requests.filter(item => item.status === 'completed').length,'Completed requests'],
  ];
  view.innerHTML = `<section class="admin-banner"><div><p class="eyebrow">ADMIN OVERVIEW</p><h1>Manage local services</h1><p>Review service requests and keep directory listings up to date.</p>
    <button class="button mint" data-section="requests">${icon('clipboard')} View service requests</button></div></section>
    <div class="metric-grid">${metrics.map(([symbol,total,label])=>`<article class="metric"><span class="tile-icon">${icon(symbol)}</span><strong>${total}</strong><small>${label}</small></article>`).join('')}</div>
    <section class="panel"><div class="panel-top"><h3>Recent requests</h3><button type="button" class="text-button" data-section="requests">View all</button></div>${adminTable(requests.slice(0,5))}</section>`;
}

async function loadAdmin() {
  adminFailure = false;
  renderAdmin();
  try { adminData = await api('/admin'); }
  catch { adminFailure = true; }
  renderAdmin();
}

function manageRequest(ref) {
  const request = adminData.requests.find(item => item.ref === ref);
  if (!request) return;
  const details = [
    ['Reference',request.ref],
    ['Provider',adminProvider(request.provider_id)?.name || 'Former provider'],
    ['Mobile',request.phone],
    ['Locality',request.locality],
    ['Preferred time',dateCell(request.preferred_at)],
    ['Received',dateCell(request.created_at)],
  ];
  showDialog('Request for ' + request.name,`<ul class="admin-details">${details.map(([label,value])=>`<li><strong>${label}</strong>${esc(value)}</li>`).join('')}</ul>
    <p class="dialog-lead">${esc(request.description)}</p><form class="stack" id="status-form">
    <label>Request status<select name="status">${options(Object.entries(statusNames))}</select></label><div><button class="button primary" type="submit">Save status</button></div>
    <p class="inline-error" role="alert"></p></form>`);
  const form = $('#status-form');
  form.elements.status.value = request.status;
  form.addEventListener('submit',async event => {
    event.preventDefault();
    const button = $('button[type=submit]',form);
    button.disabled = true;
    try {
      const response = await api('/admin/requests/' + ref,'PATCH',{status:form.elements.status.value});
      request.status = response.status;
      if (dialog.open && form.isConnected) dialog.close();
      renderAdmin();
      if (!dialog.open) ($(`[data-action="manage"][data-ref="${ref}"]`) || $('#admin-nav button[aria-current=page]'))?.focus({preventScroll:true});
      toast('Request status updated.');
    } catch (error) { $('.inline-error',form).textContent = error.message; }
    finally { button.disabled = false; }
  });
}

async function toggleVisibility(button,id) {
  const visible = adminData.hidden.includes(id);
  button.disabled = true;
  try {
    await api('/admin/providers/' + id,'PATCH',{visible});
    adminData.hidden = visible ? adminData.hidden.filter(value => value !== id) : [...adminData.hidden,id];
    renderAdmin();
    $(`[data-action="visibility"][data-id="${id}"]`)?.focus({preventScroll:true});
    toast(visible ? 'Provider is visible in the directory.' : 'Provider is hidden from the directory.');
  } catch (error) { toast(error.message); }
  finally { button.disabled = false; }
}

const adminPage = /^\/admin(?:\/|\.html)?$/.test(location.pathname);
const app = $('#app');
app.append($(adminPage ? '#admin' : '#home').content.cloneNode(true));
$$('.brand',app).forEach(link => { link.innerHTML = '<img src="/assets/mark.svg" alt="" width="39" height="39"><span>Local Service <span>Finder</span></span>'; });
setupIcons(app);
if (adminPage) {
  document.title = 'Admin Panel | Local Service Finder';
  loadAdmin();
} else {
  startHome();
}

document.addEventListener('keydown',event => {
  if (event.key === 'Escape' && !dialog.open) setNav(false,adminPage);
});
document.addEventListener('click',async event => {
  const button = event.target.closest('button');
  if (!button) return;
  const {category,action,id,ref,section:next} = button.dataset;
  if (category) {
    $('#hero-category').value = category;
    setFilters(category,locality);
    return;
  }
  if (next && adminPage) {
    section = next;
    setNav(false,true);
    renderAdmin();
    const heading = $('#admin-view h1');
    heading?.setAttribute('tabindex','-1');
    heading?.focus({preventScroll:true});
    return;
  }
  switch (action) {
    case 'menu': setNav(button.getAttribute('aria-expanded') !== 'true'); break;
    case 'admin-menu': setNav(button.getAttribute('aria-expanded') !== 'true',true); break;
    case 'location': openLocation(); break;
    case 'browse': browse(); break;
    case 'track': setNav(false); trackRequest(ref); break;
    case 'close': dialog.close(); break;
    case 'reset':
      $('#filters').reset();
      savedOnly = false;
      renderProviders();
      break;
    case 'retry': loadDirectory(); break;
    case 'retry-admin': loadAdmin(); break;
    case 'profile': {
      const provider = allProviders.find(item => item.id === id);
      if (provider) providerProfile(provider);
      break;
    }
    case 'request': {
      const provider = allProviders.find(item => item.id === id);
      if (provider) requestForm(provider);
      break;
    }
    case 'save': {
      if (saved.has(id)) saved.delete(id);
      else saved.add(id);
      savePreference('lsf-saved',[...saved]);
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
    case 'manage': manageRequest(ref); break;
    case 'visibility': toggleVisibility(button,id); break;
  }
});
