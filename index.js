import { fetchJSON, renderProjects, fetchGitHubData } from '../global.js';

// ✅ Helper function to safely get top N projects
async function getTopProjects(n = 3) {
  // Automatically adjust path depending on where the page lives
  const path = window.location.pathname.includes('/projects/')
    ? '../lib/projects.json'
    : './lib/projects.json';

  try {
    const projects = await fetchJSON(path);
    if (!Array.isArray(projects)) {
      throw new Error('Projects data is not an array');
    }

    // Sort or filter if needed — for now, just take the first n
    const topProjects = projects.slice(0, n);
    return topProjects;
  } catch (err) {
    console.error('Error fetching top projects:', err);
    return [];
  }
}

async function init() {
  try {
    const projectsContainer = document.querySelector('.projects');
    if (!projectsContainer) {
      console.error('Container with class ".projects" not found in HTML.');
      return;
    }

    // ✅ Get top 3 projects
    const latestProjects = await getTopProjects(3);

    // ✅ Fetch GitHub data
    const githubData = await fetchGitHubData('manissen');
    const profileStats = document.querySelector('#profile-stats');

    if (profileStats && githubData) {
      profileStats.innerHTML = `
        <dl>
          <dt>PUBLIC REPOS</dt><dd>${githubData.public_repos}</dd>
          <dt>PUBLIC GISTS</dt><dd>${githubData.public_gists}</dd>
          <dt>FOLLOWERS</dt><dd>${githubData.followers}</dd>
          <dt>FOLLOWING</dt><dd>${githubData.following}</dd>
        </dl>
      `;
    }

    // ✅ Render
    if (latestProjects.length > 0) {
      renderProjects(latestProjects, projectsContainer, 'h2');
    } else {
      projectsContainer.innerHTML = '<p>No projects found.</p>';
    }
  } catch (error) {
    console.error('Error initializing page:', error);
  }
}

init();
