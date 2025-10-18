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
    select.value = scheme; // keep dropdown in sync
}

if ('colorScheme' in localStorage) {
    setColorScheme(localStorage.colorScheme);
}

select.addEventListener('input', (event) => {
    const scheme = event.target.value;
    setColorScheme(scheme);
    localStorage.colorScheme = scheme; // save preference
});

// $$ helper
function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

// Base path for local vs GitHub Pages
const BASE_PATH =
  location.hostname === "localhost" || location.hostname === "127.0.0.1"
    ? "/"              
    : "/portfolio/"; 

// Pages for nav
const pages = [
  { url: '', title: 'Home' },
  { url: 'projects/', title: 'Projects' },
  { url: 'contact/', title: 'Contact' },
  { url: 'resume/', title: 'Resume' },
  { url: 'https://github.com/manissen/', title: 'GitHub' },
];

// Create nav element
const nav = document.createElement('nav');
document.body.prepend(nav);

// Add links dynamically
for (let p of pages) {
  let url = p.url;

  // Prepend BASE_PATH to relative URLs
  if (!url.startsWith('http') && !url.startsWith('/')) {
    url = BASE_PATH + url;
  }

  // Create link element
  const a = document.createElement('a');
  a.href = url;
  a.textContent = p.title;

  // Highlight current page
  a.classList.toggle(
    'current',
    a.host === location.host && a.pathname === location.pathname
  );

  // Open external links in a new tab
  if (a.host !== location.host) {
    a.target = '_blank';
  }

  nav.appendChild(a);
}

const form = document.querySelector('form');
form?.addEventListener('submit', (e) => {
  e.preventDefault(); // prevent default submission

  const data = new FormData(form);
  const params = new URLSearchParams();

  for (let [name, value] of data) {
    params.append(name, encodeURIComponent(value));
  }

  const url = `${form.action}?${params.toString()}`;
  location.href = url; // opens mail client with encoded fields
});