// index.js
import { fetchJSON, renderProjects, fetchGitHubData } from './global.js';

// --- Render Latest Projects ---
const projects = await fetchJSON('./lib/projects.json');
const latestProjects = projects.slice(0, 3);
const projectsContainer = document.querySelector('.projects');
renderProjects(latestProjects, projectsContainer, 'h3');

// --- GitHub Profile Data ---
const githubData = await fetchGitHubData('manissen');
const profileStats = document.querySelector('#profile-stats');

if (profileStats) {
  profileStats.innerHTML = `
    <h2>GitHub Profile Stats</h2>
    <dl>
      <dt>PUBLIC REPOS</dt><dd>${githubData.public_repos}</dd>
      <dt>PUBLIC GISTS</dt><dd>${githubData.public_gists}</dd>
      <dt>FOLLOWERS</dt><dd>${githubData.followers}</dd>
      <dt>FOLLOWING</dt><dd>${githubData.following}</dd>
    </dl>
  `;
}