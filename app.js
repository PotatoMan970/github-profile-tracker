'use strict';

/* ------------------------------------------------------------------ *
 * Config
 * ------------------------------------------------------------------ */
const API_ENDPOINT = 'https://agentaiclone.jhanson.net/api/v1/apis/testing/run';
const STORAGE_KEY = 'gh-profile-tracker:v1';
const EXAMPLES = ['torvalds', 'octocat', 'PotatoMan970'];

/* ------------------------------------------------------------------ *
 * Small helpers
 * ------------------------------------------------------------------ */
const $ = (selector, root = document) => root.querySelector(selector);

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => {
    switch (ch) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      default:
        return '&#39;';
    }
  });
}

function safeUrl(value) {
  if (typeof value !== 'string' || !value) return '';
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : '';
  } catch {
    return '';
  }
}

function hostOf(value) {
  try {
    return new URL(value).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

function fmtNumber(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return '0';
  const abs = Math.abs(num);
  if (abs >= 10000) {
    return new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(num);
  }
  return new Intl.NumberFormat('en').format(num);
}

function fmtDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function timeAgo(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'unknown';
  const diff = Date.now() - date.getTime();
  if (diff < 60_000) return 'just now';
  const units = [
    ['year', 31_536_000_000],
    ['month', 2_592_000_000],
    ['week', 604_800_000],
    ['day', 86_400_000],
    ['hour', 3_600_000],
    ['minute', 60_000],
  ];
  for (const [name, ms] of units) {
    const amount = Math.floor(diff / ms);
    if (amount >= 1) return `${amount} ${name}${amount > 1 ? 's' : ''} ago`;
  }
  return 'just now';
}

function normalizeUsername(input) {
  return String(input ?? '')
    .trim()
    .replace(/^@/, '')
    .replace(/^https?:\/\/(www\.)?github\.com\//i, '')
    .replace(/[/?#].*$/, '')
    .trim();
}

/* ------------------------------------------------------------------ *
 * Icons
 * ------------------------------------------------------------------ */
const ICONS = {
  repo: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v18H6.5A2.5 2.5 0 0 1 4 18.5z"/><path d="M8 3v18"/>',
  users:
    '<circle cx="9" cy="8" r="3.2"/><path d="M3 20a6 6 0 0 1 12 0"/><path d="M16.5 5.6a3.4 3.4 0 0 1 0 6.6M17.5 14.6A5.6 5.6 0 0 1 21 20"/>',
  user: '<circle cx="12" cy="8" r="3.6"/><path d="M5 20a7 7 0 0 1 14 0"/>',
  star: '<path d="m12 3.4 2.7 5.5 6 .9-4.4 4.3 1 6-5.3-2.9-5.3 2.9 1-6-4.4-4.3 6-.9z"/>',
  fork:
    '<circle cx="6" cy="5" r="2.2"/><circle cx="18" cy="5" r="2.2"/><circle cx="12" cy="19" r="2.2"/><path d="M6 7.2v2.3A2.5 2.5 0 0 0 8.5 12h7A2.5 2.5 0 0 0 18 9.5V7.2M12 12v4.8"/>',
  issue: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/>',
  gist: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>',
  building:
    '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M9 8h1.5M13.5 8H15M9 12h1.5M13.5 12H15M9 16h1.5M13.5 16H15"/>',
  pin: '<path d="M12 21s6.5-5.7 6.5-10.5a6.5 6.5 0 1 0-13 0C5.5 15.3 12 21 12 21z"/><circle cx="12" cy="10.3" r="2.4"/>',
  link: '<path d="M10.5 13.5a4.5 4.5 0 0 0 6.4 0l2.1-2.1a4.5 4.5 0 0 0-6.4-6.4l-1 1"/><path d="M13.5 10.5a4.5 4.5 0 0 0-6.4 0l-2.1 2.1a4.5 4.5 0 0 0 6.4 6.4l1-1"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3.5 7 8.5 6 8.5-6"/>',
  calendar:
    '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10.5h18"/>',
  shield: '<path d="M12 3.2 19 6v6.2c0 4.4-3 7.4-7 8.8-4-1.4-7-4.4-7-8.8V6z"/><path d="m9 12 2 2 4-4"/>',
  refresh: '<path d="M20.5 11a8.5 8.5 0 1 0-2.4 5.9"/><path d="M20.5 5.5V11h-5.5"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  external:
    '<path d="M14 4h6v6M20 4l-8 8"/><path d="M19 14.5V19a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 19V6.5A1.5 1.5 0 0 1 5 5h4.5"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  bookmark: '<path d="M6 4.5A1.5 1.5 0 0 1 7.5 3h9A1.5 1.5 0 0 1 18 4.5V21l-6-3.5L6 21z"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m16.5 16.5 4 4"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5V12l3 2"/>',
};

function icon(name) {
  const path = ICONS[name];
  if (!path) return '';
  return `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${path}</svg>`;
}

/* ------------------------------------------------------------------ *
 * Language colours
 * ------------------------------------------------------------------ */
const LANG_COLORS = {
  JavaScript: '#f1e05a',
  TypeScript: '#3178c6',
  Python: '#3572A5',
  HTML: '#e34c26',
  CSS: '#563d7c',
  SCSS: '#c6538c',
  'C++': '#f34b7d',
  C: '#555555',
  'C#': '#178600',
  Java: '#b07219',
  Ruby: '#701516',
  Go: '#00ADD8',
  Rust: '#dea584',
  PHP: '#4F5D95',
  Shell: '#89e051',
  Swift: '#F05138',
  Kotlin: '#A97BFF',
  Dart: '#00B4AB',
  Vue: '#41b883',
  Svelte: '#ff3e00',
  Lua: '#000080',
  Nix: '#7e7eff',
  Haskell: '#5e5086',
  'Jupyter Notebook': '#DA5B0B',
  Dockerfile: '#384d54',
  Makefile: '#427819',
  Elixir: '#6e4a7e',
  Zig: '#ec915c',
};

function langColor(name) {
  if (LANG_COLORS[name]) return LANG_COLORS[name];
  let hash = 0;
  for (const ch of String(name)) hash = (hash * 31 + ch.codePointAt(0)) % 360;
  return `hsl(${hash} 62% 58%)`;
}

/* ------------------------------------------------------------------ *
 * API
 * ------------------------------------------------------------------ */
class LookupError extends Error {
  constructor(message, kind) {
    super(message);
    this.name = 'LookupError';
    this.kind = kind;
  }
}

async function fetchProfile(username) {
  let response;
  try {
    response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ userName: username }),
    });
  } catch {
    throw new LookupError('Could not reach the profile API. Check your connection and try again.', 'network');
  }

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    throw new LookupError('The profile API returned a response that could not be read.', 'shape');
  }

  if (response.status === 400) {
    throw new LookupError(payload?.error || 'Enter a GitHub username to look up.', 'input');
  }
  if (response.status === 404) {
    throw new LookupError(`No GitHub user named “${username}”.`, 'not-found');
  }
  if (response.status === 403 || response.status === 429) {
    throw new LookupError('GitHub rate limit reached. Wait a minute, then try again.', 'ratelimit');
  }
  if (!response.ok || payload?.ok === false) {
    throw new LookupError(payload?.error || `The profile API responded with ${response.status}.`, 'server');
  }

  const body = payload?.body;
  if (!body || typeof body !== 'object') {
    throw new LookupError('The profile API returned an unexpected payload.', 'shape');
  }

  /* A missing GitHub account comes back as 200 with a null username and a
     404 on the per-source status, so not-found is detected here. */
  const profileFailed = body.sourceStatus?.profile?.ok === false;
  if (!body.profile?.username || profileFailed) {
    throw new LookupError(`No GitHub user named “${username}”. Check the spelling and try again.`, 'not-found');
  }

  return body;
}

/* ------------------------------------------------------------------ *
 * Tracking store (localStorage)
 * ------------------------------------------------------------------ */
const METRICS = [
  ['followers', 'followers'],
  ['publicRepositories', 'repos'],
  ['totalStars', 'stars'],
];

const state = {
  current: null,
  tracked: [],
  sort: 'stars',
  loading: false,
};

function isTracked(username) {
  return state.tracked.some((record) => record.username.toLowerCase() === String(username).toLowerCase());
}

function loadTracked() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((record) => record && typeof record.username === 'string' && record.snapshot);
  } catch {
    return [];
  }
}

function saveTracked() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.tracked));
  } catch (error) {
    console.warn('Could not save tracked profiles', error);
  }
}

function deltaOf(current, previous) {
  const changes = {};
  for (const [key, label] of METRICS) {
    const diff = (Number(current[key]) || 0) - (Number(previous[key]) || 0);
    if (diff !== 0) changes[key] = { diff, label };
  }
  return Object.keys(changes).length ? changes : null;
}

function upsertTracked(body) {
  const profile = body.profile;
  const stats = body.stats || {};
  const snapshot = {
    publicRepositories: Number(stats.publicRepositories) || 0,
    followers: Number(stats.followers) || 0,
    totalStars: Number(stats.totalStarsAcrossRepositoriesInInput) || 0,
  };

  const index = state.tracked.findIndex(
    (record) => record.username.toLowerCase() === profile.username.toLowerCase(),
  );
  const previous = index >= 0 ? state.tracked[index] : null;
  const now = new Date().toISOString();

  const record = {
    username: profile.username,
    name: profile.name || profile.username,
    avatarUrl: profile.avatarUrl || '',
    snapshot,
    deltas: previous ? deltaOf(snapshot, previous.snapshot) : null,
    addedAt: previous?.addedAt || now,
    lastSyncedAt: now,
  };

  if (index >= 0) state.tracked[index] = record;
  else state.tracked.push(record);

  state.tracked.sort((a, b) => a.username.localeCompare(b.username));
  saveTracked();
  return record;
}

function removeTracked(username) {
  const target = String(username).toLowerCase();
  state.tracked = state.tracked.filter((record) => record.username.toLowerCase() !== target);
  saveTracked();
  renderTracked();
  if (state.current) renderProfile();
  toast(`Stopped tracking @${username}.`);
}

/* ------------------------------------------------------------------ *
 * Rendering — profile
 * ------------------------------------------------------------------ */
const ERROR_TITLES = {
  'not-found': 'Profile not found',
  input: 'Username needed',
  network: 'Connection problem',
  ratelimit: 'Rate limited',
  server: 'API error',
  shape: 'Unexpected response',
};

function chipsFor(profile) {
  const chips = [];
  const push = (name, label, href) => {
    if (!label) return;
    const url = href ? safeUrl(href) : '';
    const inner = `${icon(name)}<span>${esc(label)}</span>`;
    chips.push(
      url
        ? `<li><a class="chip chip-link" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${inner}</a></li>`
        : `<li><span class="chip">${inner}</span></li>`,
    );
  };

  push('building', profile.company);
  push('pin', profile.location);
  if (profile.website) push('link', hostOf(profile.website) || profile.website, profile.website);
  if (profile.twitterUsername) {
    const handle = String(profile.twitterUsername).replace(/^@/, '');
    push('user', `@${handle}`, `https://x.com/${encodeURIComponent(handle)}`);
  }
  if (profile.email) {
    const email = String(profile.email).replace(/[^A-Za-z0-9._%+@-]/g, '');
    if (email) {
      chips.push(
        `<li><a class="chip chip-link" href="mailto:${esc(email)}">${icon('mail')}<span>${esc(email)}</span></a></li>`,
      );
    }
  }
  if (profile.accountType) push('shield', profile.accountType);
  if (profile.createdAt) push('calendar', `Joined ${fmtDate(profile.createdAt)}`);

  if (profile.hireable) {
    chips.push(`<li><span class="chip chip-accent">${icon('check')}<span>Open to work</span></span></li>`);
  }
  if (profile.isSiteAdmin) {
    chips.push(`<li><span class="chip">${icon('shield')}<span>GitHub staff</span></span></li>`);
  }

  return chips;
}

function statTile(value, label, iconName) {
  return `<div class="stat">
    <span class="stat-value">${esc(fmtNumber(value))}</span>
    <span class="stat-label">${icon(iconName)}${esc(label)}</span>
  </div>`;
}

function renderLanguages(stats) {
  const languages = Array.isArray(stats.languages) ? stats.languages : [];
  if (!languages.length) {
    return `<p class="empty-note">No language data was returned for this profile.</p>`;
  }

  const total = languages.reduce((sum, entry) => sum + (Number(entry.percentage) || 0), 0) || 100;
  const segments = languages
    .map((entry) => {
      const width = ((Number(entry.percentage) || 0) / total) * 100;
      return `<span style="width:${width.toFixed(2)}%;background:${esc(langColor(entry.language))}" title="${esc(
        `${entry.language}: ${entry.percentage}%`,
      )}"></span>`;
    })
    .join('');

  const legend = languages
    .map(
      (entry) => `<li>
        <span class="lang-dot" style="--dot:${esc(langColor(entry.language))}"></span>
        <span>${esc(entry.language)}</span>
        <span class="pct">${esc(entry.percentage)}% · ${esc(fmtNumber(entry.repositories))} repo${
          Number(entry.repositories) === 1 ? '' : 's'
        }</span>
      </li>`,
    )
    .join('');

  return `<div class="lang-bar" role="img" aria-label="Language breakdown">${segments}</div>
    <ul class="legend">${legend}</ul>`;
}

function miniRepos(repositories, emptyText) {
  const list = Array.isArray(repositories) ? repositories : [];
  if (!list.length) return `<li class="empty-note">${esc(emptyText)}</li>`;
  return list
    .slice(0, 4)
    .map((repo) => {
      const url = safeUrl(repo.url);
      const name = url
        ? `<a class="mini-name" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(repo.name)}</a>`
        : `<span class="mini-name">${esc(repo.name)}</span>`;
      return `<li class="mini">
        ${name}
        <span class="mini-meta">
          <span>${icon('star')}${esc(fmtNumber(repo.stars))}</span>
          <span>${esc(timeAgo(repo.pushedAt || repo.updatedAt))}</span>
        </span>
      </li>`;
    })
    .join('');
}

const SORTERS = {
  stars: (a, b) =>
    (Number(b.stars) || 0) - (Number(a.stars) || 0) ||
    new Date(b.pushedAt || 0) - new Date(a.pushedAt || 0) ||
    String(a.name).localeCompare(String(b.name)),
  updated: (a, b) =>
    new Date(b.pushedAt || b.updatedAt || 0) - new Date(a.pushedAt || a.updatedAt || 0) ||
    String(a.name).localeCompare(String(b.name)),
  name: (a, b) => String(a.name).localeCompare(String(b.name)),
};

function renderRepoList(repositories) {
  const list = Array.isArray(repositories) ? [...repositories] : [];
  if (!list.length) {
    return `<p class="empty-note">This profile has no public repositories in this lookup.</p>`;
  }

  list.sort(SORTERS[state.sort] || SORTERS.stars);

  return `<ul class="repo-list" id="repo-list">${list
    .map((repo) => {
      const url = safeUrl(repo.url);
      const name = url
        ? `<a class="repo-name" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(repo.name)}</a>`
        : `<span class="repo-name">${esc(repo.name)}</span>`;

      const badges = [
        repo.isFork ? `<span class="badge">Fork</span>` : '',
        repo.archived ? `<span class="badge">Archived</span>` : '',
        repo.isPrivate ? `<span class="badge">Private</span>` : '',
      ]
        .filter(Boolean)
        .join('');

      const language = repo.language
        ? `<span class="lang"><span class="lang-dot" style="--dot:${esc(
            langColor(repo.language),
          )}"></span>${esc(repo.language)}</span>`
        : '';

      const topics = Array.isArray(repo.topics) && repo.topics.length
        ? `<ul class="topics">${repo.topics
            .slice(0, 4)
            .map((topic) => `<li class="topic">${esc(topic)}</li>`)
            .join('')}</ul>`
        : '';

      return `<li class="repo">
        <div class="repo-head">${name}${badges}</div>
        ${repo.description ? `<p class="repo-desc">${esc(repo.description)}</p>` : ''}
        <div class="repo-meta">
          ${language}
          <span class="num">${icon('star')}${esc(fmtNumber(repo.stars))}</span>
          <span class="num">${icon('fork')}${esc(fmtNumber(repo.forks))}</span>
          <span class="num">${icon('issue')}${esc(fmtNumber(repo.openIssues))}</span>
          ${repo.license ? `<span class="num">${esc(repo.license)}</span>` : ''}
          <span class="num">${icon('clock')}Updated ${esc(timeAgo(repo.pushedAt || repo.updatedAt))}</span>
        </div>
        ${topics}
      </li>`;
    })
    .join('')}</ul>`;
}

function sortButtons() {
  const options = [
    ['stars', 'Most stars'],
    ['updated', 'Recently pushed'],
    ['name', 'Name'],
  ];
  return options
    .map(
      ([key, label]) =>
        `<button type="button" data-action="sort" data-sort="${key}" aria-pressed="${
          state.sort === key
        }">${esc(label)}</button>`,
    )
    .join('');
}

function renderProfile() {
  const body = state.current;
  if (!body) return;

  const profile = body.profile;
  const stats = body.stats || {};
  const repositories = Array.isArray(body.repositories) ? body.repositories : [];
  const highlights = body.highlights || {};
  const displayName = profile.name || profile.username;
  const avatar = safeUrl(profile.avatarUrl);
  const profileUrl = safeUrl(profile.profileUrl) || `https://github.com/${encodeURIComponent(profile.username)}`;
  const tracked = isTracked(profile.username);

  document.title = `${profile.username} · GitHub Profile Tracker`;

  const avatarMarkup = avatar
    ? `<img class="avatar" src="${esc(avatar)}" alt="Avatar of ${esc(displayName)}" width="112" height="112" loading="lazy" referrerpolicy="no-referrer">`
    : `<div class="avatar avatar-fallback" aria-hidden="true">${esc(
        displayName.slice(0, 1).toUpperCase(),
      )}</div>`;

  const hasHighlights =
    (highlights.topRepositoriesByStars || []).length || (highlights.recentlyPushedRepositories || []).length;

  $('#profile').innerHTML = `
    <div class="profile-top">
      <section class="card identity-card">
        <div class="identity">
          ${avatarMarkup}
          <div class="identity-body">
            <div class="identity-top">
              <h1 class="profile-name">${esc(displayName)}</h1>
              <a class="handle" href="${esc(profileUrl)}" target="_blank" rel="noopener noreferrer">@${esc(
                profile.username,
              )}</a>
            </div>
            ${
              profile.bio
                ? `<p class="bio">${esc(profile.bio)}</p>`
                : `<p class="bio muted">No bio provided.</p>`
            }
            <ul class="chips">${chipsFor(profile).join('')}</ul>
            <div class="identity-actions">
              <a class="btn" href="${esc(profileUrl)}" target="_blank" rel="noopener noreferrer">${icon(
                'external',
              )}Open on GitHub</a>
              <button class="btn ${tracked ? 'btn-ghost is-active' : 'btn-primary'}" type="button" data-action="toggle-track">
                ${icon(tracked ? 'check' : 'bookmark')}${tracked ? 'Stop tracking' : 'Track this profile'}
              </button>
            </div>
          </div>
        </div>
      </section>

      <section class="card stats-card">
        <h2 class="section-title">${icon('chart')}Snapshot</h2>
        <div class="stat-grid">
          ${statTile(stats.publicRepositories, 'Repositories', 'repo')}
          ${statTile(stats.followers, 'Followers', 'users')}
          ${statTile(stats.following, 'Following', 'user')}
          ${statTile(stats.totalStarsAcrossRepositoriesInInput, 'Stars', 'star')}
          ${statTile(stats.totalForksAcrossRepositoriesInInput, 'Forks', 'fork')}
          ${statTile(stats.publicGists, 'Gists', 'gist')}
        </div>
        <ul class="signals">
          <li><b>${esc(fmtNumber(stats.organizations))}</b> orgs</li>
          <li><b>${esc(fmtNumber(stats.starredRepositoriesInInput))}</b> starred repos</li>
          <li><b>${esc(fmtNumber(stats.eventsInInput))}</b> public events</li>
          <li><b>${esc(fmtNumber(stats.receivedEventsInInput))}</b> received events</li>
        </ul>
      </section>
    </div>

    <section class="card">
      <h2 class="section-title">${icon('chart')}Languages</h2>
      ${renderLanguages(stats)}
    </section>

    ${
      hasHighlights
        ? `<section class="card">
            <div class="recents">
              <div>
                <h2 class="section-title">${icon('star')}Top repositories</h2>
                <ul class="mini-list">${miniRepos(
                  highlights.topRepositoriesByStars,
                  'No repositories returned.',
                )}</ul>
              </div>
              <div>
                <h2 class="section-title">${icon('clock')}Recently pushed</h2>
                <ul class="mini-list">${miniRepos(
                  highlights.recentlyPushedRepositories,
                  'No recent pushes returned.',
                )}</ul>
              </div>
            </div>
          </section>`
        : ''
    }

    <section class="card repos-card">
      <div class="repos-head">
        <h2 class="section-title">${icon('repo')}Repositories <span class="count">${repositories.length}</span></h2>
        <div class="segmented" role="group" aria-label="Sort repositories">${sortButtons()}</div>
      </div>
      ${renderRepoList(repositories)}
    </section>

    <p class="footnote">
      Totals cover the ${esc(fmtNumber(stats.repositoriesInInput ?? repositories.length))} repositories returned in
      this lookup. Profile data generated ${esc(timeAgo(body.generatedAt))}.
    </p>
  `;
}

/* ------------------------------------------------------------------ *
 * Rendering — tracked list
 * ------------------------------------------------------------------ */
function trackedCard(record) {
  const currentName = state.current?.profile?.username?.toLowerCase();
  const active = currentName === record.username.toLowerCase();
  const avatar = safeUrl(record.avatarUrl);
  const avatarMarkup = avatar
    ? `<img class="tracked-avatar" src="${esc(avatar)}" alt="" width="40" height="40" loading="lazy" referrerpolicy="no-referrer">`
    : `<span class="tracked-avatar avatar-fallback" aria-hidden="true">${esc(
        (record.name || record.username).slice(0, 1).toUpperCase(),
      )}</span>`;

  const deltas = record.deltas
    ? Object.values(record.deltas)
        .filter((change) => change && typeof change.diff === 'number' && change.diff !== 0)
        .map(
          (change) =>
            `<span class="delta ${change.diff > 0 ? 'up' : 'down'}">${change.diff > 0 ? '+' : ''}${esc(
              change.diff,
            )} ${esc(change.label)}</span>`,
        )
        .join('')
    : '';

  return `<li class="tracked-card${active ? ' is-active' : ''}">
    <button class="tracked-open" type="button" data-action="open" data-username="${esc(record.username)}">
      ${avatarMarkup}
      <span class="tracked-text">
        <span class="tracked-name">${esc(record.name || record.username)}</span>
        <span class="tracked-handle">@${esc(record.username)}</span>
        <span class="tracked-metrics">${esc(fmtNumber(record.snapshot.publicRepositories))} repos · ${esc(
          fmtNumber(record.snapshot.followers),
        )} followers · ${esc(fmtNumber(record.snapshot.totalStars))} stars</span>
        <span class="tracked-meta">Synced ${esc(timeAgo(record.lastSyncedAt))}</span>
        ${deltas ? `<span class="deltas">${deltas}</span>` : ''}
      </span>
    </button>
    <div class="tracked-actions">
      <button class="icon-btn" type="button" data-action="sync" data-username="${esc(
        record.username,
      )}" title="Sync @${esc(record.username)} now" aria-label="Sync @${esc(record.username)} now">${icon(
        'refresh',
      )}</button>
      <button class="icon-btn" type="button" data-action="remove" data-username="${esc(
        record.username,
      )}" title="Stop tracking @${esc(record.username)}" aria-label="Stop tracking @${esc(
        record.username,
      )}">${icon('close')}</button>
    </div>
  </li>`;
}

function renderTracked() {
  const section = $('#tracked');
  const list = $('#tracked-list');
  const count = $('#tracked-count');
  const syncAll = $('#sync-all');

  count.textContent = String(state.tracked.length);
  section.hidden = state.tracked.length === 0;
  syncAll.disabled = state.tracked.length === 0 || state.loading;
  list.innerHTML = state.tracked.map(trackedCard).join('');
}

/* ------------------------------------------------------------------ *
 * State panels + toasts
 * ------------------------------------------------------------------ */
function showState(name) {
  $('#welcome').hidden = name !== 'welcome';
  $('#loader').hidden = name !== 'loading';
  $('#error-panel').hidden = name !== 'error';
  $('#profile').hidden = name !== 'profile';
}

function setBusy(busy) {
  state.loading = busy;
  $('#search-button').disabled = busy;
  $('#search-form').setAttribute('aria-busy', String(busy));
  $('#sync-all').disabled = busy || state.tracked.length === 0;
}

function showError(error, username) {
  const kind = error?.kind || 'shape';
  $('#error-title').textContent = ERROR_TITLES[kind] || 'Something went wrong';
  $('#error-message').textContent = error?.message || 'An unexpected error occurred.';
  const retry = $('#retry-button');
  retry.hidden = kind === 'input';
  retry.dataset.username = username || '';
  showState('error');
}

function toast(message, kind = 'info') {
  const host = $('#toasts');
  const node = document.createElement('div');
  node.className = `toast toast-${kind}`;
  node.setAttribute('role', 'status');
  node.textContent = message;
  host.append(node);
  setTimeout(() => {
    node.classList.add('is-leaving');
    setTimeout(() => node.remove(), 240);
  }, 4200);
}

/* ------------------------------------------------------------------ *
 * Lookup flow
 * ------------------------------------------------------------------ */
function setHash(username) {
  const hash = username ? `#user=${encodeURIComponent(username)}` : '';
  if (location.hash === hash) return;
  try {
    history.replaceState(null, '', `${location.pathname}${location.search}${hash}`);
  } catch {
    location.hash = hash;
  }
}

async function lookup(input, { silent = false, username: explicit } = {}) {
  const username = normalizeUsername(explicit ?? input ?? $('#username-input').value);
  if (state.loading) return;

  if (!username) {
    if (!silent) showError(new LookupError('Enter a GitHub username to get started.', 'input'));
    return;
  }

  setBusy(true);
  if (!silent) {
    $('#loader-text').textContent = `Fetching @${username}…`;
    showState('loading');
  }

  try {
    const body = await fetchProfile(username);
    upsertTracked(body);

    if (silent) {
      renderTracked();
      toast(`Synced @${body.profile.username}.`, 'ok');
    } else {
      state.current = body;
      $('#username-input').value = body.profile.username;
      renderProfile();
      renderTracked();
      showState('profile');
      setHash(body.profile.username);
    }
  } catch (error) {
    const lookupError =
      error instanceof LookupError
        ? error
        : new LookupError(error?.message || 'An unexpected error occurred.', 'shape');

    if (silent) {
      toast(`Could not sync @${username}: ${lookupError.message}`, 'warn');
    } else {
      state.current = null;
      document.title = 'GitHub Profile Tracker';
      setHash('');
      showError(lookupError, username);
    }
  } finally {
    setBusy(false);
  }
}

function toggleTrack() {
  const profile = state.current?.profile;
  if (!profile) return;

  if (isTracked(profile.username)) {
    removeTracked(profile.username);
    return;
  }

  upsertTracked(state.current);
  renderTracked();
  renderProfile();
  toast(`Now tracking @${profile.username}.`, 'ok');
}

async function syncAll() {
  const usernames = state.tracked.map((record) => record.username);
  if (!usernames.length || state.loading) return;

  setBusy(true);
  let ok = 0;
  let failed = 0;

  for (const username of usernames) {
    try {
      const body = await fetchProfile(username);
      upsertTracked(body);
      ok += 1;
    } catch {
      failed += 1;
    }
  }

  renderTracked();
  setBusy(false);

  if (failed) toast(`Synced ${ok} of ${usernames.length} profiles · ${failed} failed.`, 'warn');
  else toast(`Synced ${ok} profile${ok === 1 ? '' : 's'}.`, 'ok');
}

/* ------------------------------------------------------------------ *
 * Events
 * ------------------------------------------------------------------ */
function renderExamples() {
  const host = $('#examples');
  for (const name of EXAMPLES) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'example-btn';
    button.dataset.action = 'example';
    button.dataset.username = name;
    button.textContent = name;
    host.append(button);
  }
}

document.addEventListener('click', (event) => {
  const trigger = event.target.closest('[data-action]');
  if (!trigger) return;

  const action = trigger.dataset.action;
  const username = trigger.dataset.username;

  switch (action) {
    case 'toggle-track':
      toggleTrack();
      break;
    case 'open':
      lookup('', { username });
      break;
    case 'sync':
      lookup('', { username, silent: true });
      break;
    case 'remove':
      removeTracked(username);
      break;
    case 'retry':
      lookup('', { username: username || $('#username-input').value });
      break;
    case 'sort':
      state.sort = trigger.dataset.sort;
      renderProfile();
      break;
    case 'sync-all':
      syncAll();
      break;
    case 'example':
      $('#username-input').value = username;
      lookup(username);
      break;
    default:
      break;
  }
});

$('#search-form').addEventListener('submit', (event) => {
  event.preventDefault();
  lookup($('#username-input').value);
});

window.addEventListener('hashchange', route);

function route() {
  const match = location.hash.match(/^#(?:user=|\/?)([A-Za-z0-9-]{1,39})$/);
  if (!match) {
    if (!state.current && !state.loading) showState('welcome');
    return;
  }

  const username = match[1];
  if (state.current?.profile?.username?.toLowerCase() === username.toLowerCase() || state.loading) return;
  $('#username-input').value = username;
  lookup(username);
}

/* ------------------------------------------------------------------ *
 * Init
 * ------------------------------------------------------------------ */
function init() {
  $('#year').textContent = String(new Date().getFullYear());
  state.tracked = loadTracked();
  renderExamples();
  renderTracked();

  const hasRoute = /^#(?:user=|\/?)[A-Za-z0-9-]{1,39}$/.test(location.hash);
  showState(hasRoute ? 'loading' : 'welcome');
  if (hasRoute) $('#loader-text').textContent = 'Fetching profile…';

  route();
  $('#username-input').focus();
}

init();
