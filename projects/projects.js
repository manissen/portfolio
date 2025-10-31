// projects/projects.js
import { fetchJSON, renderProjects } from '../global.js';
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

const projects = await fetchJSON('../lib/projects.json');
const projectsContainer = document.querySelector('.projects');

// Initial render of all projects
renderProjects(projects, projectsContainer, 'h2');

// Update project count
const titleEl = document.querySelector('.projects-title');
if (titleEl) {
  titleEl.textContent = `Projects (${projects.length})`;
}

// --- GLOBAL STATE ---
let query = '';
let selectedIndex = -1;

// === Initial render ===
renderProjects(projects, projectsContainer, 'h2');
renderPieChart(projects);

// === SEARCH BAR ===
const searchInput = document.querySelector('.searchBar');
searchInput.addEventListener('input', (event) => {
  query = event.target.value;
  const filtered = getFilteredProjects();
  renderProjects(filtered, projectsContainer, 'h2');
  renderPieChart(filtered);
});

// === Helper: Combined filtering (search only) ===
function getFilteredProjects() {
  return projects.filter((p) => {
    const matchesQuery = Object.values(p)
      .join('\n')
      .toLowerCase()
      .includes(query.toLowerCase());
    return matchesQuery;
  });
}

// === PIE CHART RENDERING ===
function renderPieChart(projectsGiven) {
  const svg = d3.select('svg');
  svg.selectAll('*').remove(); // clear previous chart

  // aggregate projects by year
  const rolledData = d3.rollups(projectsGiven, (v) => v.length, (d) => d.year);
  const data = rolledData.map(([year, count]) => ({ year, count }));

  const width = 400;
  const radius = width / 2;
  const color = d3.scaleOrdinal(d3.schemeTableau10);
  const pie = d3.pie().value((d) => d.count);
  const arc = d3.arc().innerRadius(0).outerRadius(radius);

  const arcs = pie(data);

  svg.attr('viewBox', [-radius, -radius, width, width]);

  // === WEDGES ===
  svg
    .selectAll('path')
    .data(arcs)
    .join('path')
    .attr('d', arc)
    .attr('fill', (_, i) => color(i))
    .attr('stroke', 'white')
    .attr('class', (d) => (d.index === selectedIndex ? 'selected' : ''))
    .on('click', (event, d) => {
      selectedIndex = selectedIndex === d.index ? -1 : d.index;
      updateSelection(svg, data);
    });

  // === LEGEND ===
  const legend = d3.select('.legend');
  legend.selectAll('*').remove();
  legend
    .selectAll('li')
    .data(data)
    .join('li')
    .text((d) => `${d.year} (${d.count})`)
    .attr('class', (_, i) => (i === selectedIndex ? 'selected' : ''))
    .on('click', (event, d) => {
      const index = data.findIndex((x) => x.year === d.year);
      selectedIndex = selectedIndex === index ? -1 : index;
      updateSelection(svg, data);
    });
}

// === HANDLE SELECTION + FILTERING ===
function updateSelection(svg, data) {
  // highlight selected wedge and legend
  svg
    .selectAll('path')
    .attr('class', (d) => (d.index === selectedIndex ? 'selected' : ''));

  d3.select('.legend')
    .selectAll('li')
    .attr('class', (_, i) => (i === selectedIndex ? 'selected' : ''));

  // determine filtered set
  const baseFiltered = getFilteredProjects();

  if (selectedIndex === -1) {
    // nothing selected, show all (respecting current search query)
    renderProjects(baseFiltered, projectsContainer, 'h2');
    return;
  }

  // find selected year from current pie data
  const selectedYear = data[selectedIndex].year;
  const filteredByYear = baseFiltered.filter((p) => p.year === selectedYear);

  renderProjects(filteredByYear, projectsContainer, 'h2');
}

// === END ===
