// projects/projects.js
import { fetchJSON, renderProjects } from '../global.js';

const projects = await fetchJSON('../lib/projects.json');
const projectsContainer = document.querySelector('.projects');
renderProjects(projects, projectsContainer, 'h2');

// Count projects
const titleEl = document.querySelector('.projects-title');
if (titleEl) {
  titleEl.textContent = `Projects (${projects.length})`;
}
