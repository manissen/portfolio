console.log("IT’S ALIVE!");

document.body.insertAdjacentHTML(
    'afterbegin',
    `
    <label class="color-scheme" style="position:absolute; top:1rem; right:1rem; font-size:0.8em;">
      Theme:
      <select>
        <option value="light dark">Automatic</option>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
    </label>
  `
);

const select = document.querySelector('.color-scheme select');

function setColorScheme(scheme) {
    document.documentElement.style.setProperty('color-scheme', scheme);
    select.value = scheme;
}

if ('colorScheme' in localStorage) {
    setColorScheme(localStorage.colorScheme);
}

select.addEventListener('input', (event) => {
    const scheme = event.target.value;
    setColorScheme(scheme);
    localStorage.colorScheme = scheme;
});

function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

const BASE_PATH =
  location.hostname === "localhost" || location.hostname === "127.0.0.1"
    ? "/"              
    : "/portfolio/"; 

const pages = [
  { url: '', title: 'Home' },
  { url: 'projects/', title: 'Projects' },
  { url: 'contact/', title: 'Contact' },
  { url: 'resume/', title: 'Resume' },
  { url: 'https://github.com/manissen/', title: 'GitHub' },
];

const nav = document.createElement('nav');
document.body.prepend(nav);

for (let p of pages) {
  let url = p.url;

  if (!url.startsWith('http') && !url.startsWith('/')) {
    url = BASE_PATH + url;
  }

  const a = document.createElement('a');
  a.href = url;
  a.textContent = p.title;

  a.classList.toggle(
    'current',
    a.host === location.host && a.pathname === location.pathname
  );

  if (a.host !== location.host) {
    a.target = '_blank';
  }

  nav.appendChild(a);
}

const form = document.querySelector('form');
form?.addEventListener('submit', (e) => {
  e.preventDefault();

  const data = new FormData(form);
  const params = new URLSearchParams();

  for (let [name, value] of data) {
    params.append(name, encodeURIComponent(value));
  }

  const url = `${form.action}?${params.toString()}`;
  location.href = url;
});

export async function fetchJSON(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch: ${response.statusText}`);
    return await response.json();
  } catch (error) {
    console.error('Error fetching or parsing JSON data:', error);
  }
}

export function renderProjects(projects, containerElement, headingLevel = 'h2') {
  containerElement.innerHTML = '';

  if (!Array.isArray(projects)) {
    console.error('renderProjects: "projects" must be an array.');
    return;
  }

  if (!(containerElement instanceof HTMLElement)) {
    console.error('renderProjects: invalid container element.');
    return;
  }

  const validHeadings = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
  if (!validHeadings.includes(headingLevel)) headingLevel = 'h2';


  projects.forEach(project => {
    const article = document.createElement('article');
    article.innerHTML = `
      <${headingLevel}>${project.title || 'Untitled'}</${headingLevel}>
      <p>${project.year}</p>
      <img src="${project.image || 'placeholder.png'}" alt="${project.title || ''}">
      <p>${project.description || ''}</p>
    `;
    containerElement.appendChild(article);
  });
}

export async function fetchGitHubData(username) {
  return fetchJSON(`https://api.github.com/users/${username}`);
}