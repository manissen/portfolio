import { fetchJSON, renderProjects, fetchGitHubData } from '../global.js';

async function init() {
  try {
    const projects = await fetchJSON('../lib/projects.json');
    const latestProjects = projects.slice(0, 3);

    const projectsContainer = document.querySelector('.projects');
    if (!projectsContainer) {
      console.error('Container with class ".projects" not found in HTML.');
      return;
    }

    const githubData = await fetchGitHubData('manissen');
    const profileStats = document.querySelector('#profile-stats');

    if (profileStats) {
      profileStats.innerHTML = `
            <dl>
              <dt>PUBLIC REPOS</dt><dd>${githubData.public_repos}</dd>
              <dt>PUBLIC GISTS</dt><dd>${githubData.public_gists}</dd>
              <dt>FOLLOWERS</dt><dd>${githubData.followers}</dd>
              <dt>FOLLOWING</dt><dd>${githubData.following}</dd>
            </dl>
        `;
    }

    renderProjects(latestProjects, projectsContainer, 'h2');
  } catch (error) {
    console.error('Error loading projects:', error);
  }
}

init();