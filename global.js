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
  { url: 'meta/', title: 'Meta'},
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

// global.js
export async function fetchJSON(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.statusText}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching or parsing JSON data:', error);
  }
}

export function renderProjects(projects, containerElement, headingLevel = 'h2') {
  if (!containerElement) {
    console.error('Invalid container element.');
    return;
  }

  containerElement.innerHTML = '';

  if (!projects || projects.length === 0) {
    containerElement.innerHTML = '<p>No projects found.</p>';
    return;
  }

  projects.forEach((project) => {
    const article = document.createElement('article');

    const shortDescription = project.description.length > 300
      ? project.description.slice(0, 300) + "..."
      : project.description;

    const projectLink = project.url
      ? `<a class="project-link" href="${project.url}" rel="noopener" target="_blank">View Project →</a>`
      : "";

    const img = document.createElement('image');
    if (project.image){
      img.src = project.image.startsWith('http')
        ? project.image
        : `${BASE_PATH}${project.image}`;
      img.alt = project.title || 'Project image';
    }

    article.innerHTML = `
      <${headingLevel}>${project.title}</${headingLevel}>
      <h4>${project.year}</h4>
      <img src="${img}" alt="${project.title}">
      <p>${shortDescription}</p>
      ${projectLink}
    `;
    containerElement.appendChild(article);
  });
}

// GitHub API fetch function
export async function fetchGitHubData(username) {
  return fetchJSON(`https://api.github.com/users/${username}`);
}
