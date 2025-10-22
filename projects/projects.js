import { fetchJSON, renderProjects, fetchGitHubData } from '../global.js';

async function init() {
  try {
    const projects = await fetchJSON('../lib/projects.json');
    const container = document.querySelector('.projects');
    renderProjects(projects, container, 'h2');

    const title = document.querySelector('.projects-title');
    if (title && Array.isArray(projects)) {
      title.textContent = `${projects.length} Projects`;
    }
  } catch (error) {
    console.error('Error loading projects:', error);
  }
}

init();