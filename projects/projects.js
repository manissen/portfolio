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

let query = '';
let selectedIndex = -1;

// Create color scale
const colors = d3.scaleOrdinal(d3.schemeTableau10);

// ------------------------
// Render pie chart & legend
// ------------------------
function renderPieChart(projectsGiven) {
  const svg = d3.select('svg');
  const legend = d3.select('.legend');

  // Clear previous paths & legend items
  svg.selectAll('path').remove();
  legend.selectAll('li').remove();

  // Roll up projects by year
  const rolledData = d3.rollups(
    projectsGiven,
    v => v.length,
    d => d.year
  );

  // Convert to { label, value } objects
  const data = rolledData.map(([year, count]) => ({ label: year, value: count }));

  // Arc and pie generators
  const arcGenerator = d3.arc().innerRadius(0).outerRadius(50);
  const pieGenerator = d3.pie().value(d => d.value);
  const pieData = pieGenerator(data);

  // Draw pie slices
  pieData.forEach((d, i) => {
    svg.append('path')
      .attr('d', arcGenerator(d))
      .attr('fill', selectedIndex === i ? 'oklch(60% 45% 0)' : colors(i))
      .style('cursor', 'pointer')
      .on('click', () => {
        selectedIndex = selectedIndex === i ? -1 : i;
        updateSelection(data, pieData);
      });
  });

  // Build legend
  data.forEach((d, i) => {
    legend.append('li')
      .datum(d) // bind data to legend
      .attr('class', 'legend-item')
      .attr('style', `--color: ${colors(i)}`)
      .html(`<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`)
      .style('cursor', 'pointer')
      .on('click', () => {
        selectedIndex = selectedIndex === i ? -1 : i;
        updateSelection(data, pieData);
      });
  });
}

// ------------------------
// Update pie selection & filtered projects
// ------------------------
function updateSelection(data, pieData) {
  const svg = d3.select('svg');
  const legend = d3.select('.legend');

  // Update pie slice colors
  svg.selectAll('path')
    .attr('fill', (_, i) => selectedIndex === i ? 'oklch(60% 45% 0)' : colors(i));

  // Update legend highlight
  legend.selectAll('li')
    .classed('selected', (_, i) => selectedIndex === i);

  // Filter projects based on selected wedge
  let filteredProjects = selectedIndex === -1 ? projects : projects.filter(p => p.year === data[selectedIndex].label);

  // Apply search filter
  if (query) {
    filteredProjects = filteredProjects.filter(p =>
      Object.values(p).join('\n').toLowerCase().includes(query.toLowerCase())
    );
  }

  // Render filtered projects
  renderProjects(filteredProjects, projectsContainer, 'h2');
}

// ------------------------
// Search input
// ------------------------
const searchInput = document.querySelector('.searchBar');
searchInput.addEventListener('input', (event) => {
  query = event.target.value;

  // Filter projects by search query
  let filteredProjects = projects.filter(p =>
    Object.values(p).join('\n').toLowerCase().includes(query.toLowerCase())
  );

  // If a wedge is selected, further filter by year
  if (selectedIndex !== -1) {
    filteredProjects = filteredProjects.filter(p =>
      p.year === d3.select('.legend li.selected').datum()?.label
    );
  }

  renderProjects(filteredProjects, projectsContainer, 'h2');
  renderPieChart(filteredProjects);
});

// ------------------------
// Initial pie chart render
// ------------------------
renderPieChart(projects);
