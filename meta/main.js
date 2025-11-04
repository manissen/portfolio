import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

// Step 1.1 – Read CSV
async function loadData() {
  const data = await d3.csv('loc.csv', (row) => ({
    ...row,
    line: +row.line,
    depth: +row.depth,
    length: +row.length,
    date: new Date(row.date + 'T00:00' + row.timezone),
    datetime: new Date(row.datetime),
  }));
  return data;
}

// Step 1.2 – Process commits
function processCommits(data) {
  return d3
    .groups(data, (d) => d.commit)
    .map(([commit, lines]) => {
      let first = lines[0];
      let { author, date, time, timezone, datetime } = first;

      let ret = {
        id: commit,
        url: 'https://github.com/vis-society/lab-7/commit/' + commit,
        author,
        date,
        time,
        timezone,
        datetime,
        hourFrac: datetime.getHours() + datetime.getMinutes() / 60,
        totalLines: lines.length,
      };

      Object.defineProperty(ret, 'lines', {
        value: lines,
        writable: true,
        configurable: true,
        enumerable: false, // hides from console
      });

      return ret;
    });
}

// Helper: map hours to rough times of day
function getTimeOfDay(hour) {
    if (hour < 6) return "night";
    if (hour < 12) return "morning";
    if (hour < 18) return "afternoon";
    return "evening";
}
  
  // Helper: get most frequent value in an array
function mostCommon(arr) {
    return d3.rollups(arr, v => v.length, d => d)
             .sort((a, b) => d3.descending(a[1], b[1]))[0][0];
}
  

function renderCommitInfo(data, commits) {
    const statsContainer = d3.select('#stats');

    // Add heading
    statsContainer.append('h2')
    .attr('class', 'stats-heading')
    .text('Summary');

    const dl = statsContainer.append('dl').attr('class', 'stats');
  
    // Total LOC
    dl.append('dt').html('Total <abbr title="Lines of code">LOC</abbr>');
    dl.append('dd').text(data.length);
  
    // Total commits
    dl.append('dt').text('Total commits');
    dl.append('dd').text(commits.length);
  
    // Number of files
    const numFiles = new Set(data.map(d => d.file)).size;
    dl.append('dt').text('Files in codebase');
    dl.append('dd').text(numFiles);
  
    // Average line length
    const avgLineLength = d3.mean(data, d => d.length).toFixed(1);
    dl.append('dt').text('Average line length (chars)');
    dl.append('dd').text(avgLineLength);
  
    // Most active day of week
    const days = commits.map(c => c.datetime.toLocaleDateString('en-US', { weekday: 'long' }));
    const mostActiveDay = d3.rollups(days, v => v.length, d => d)
      .sort((a, b) => d3.descending(a[1], b[1]))[0][0];
    dl.append('dt').text('Most active day');
    dl.append('dd').text(mostActiveDay);
  
    // Most active hour (rounded)
    const hours = commits.map(c => c.datetime.getHours());
    const mostActiveHour = d3.rollups(hours, v => v.length, d => d)
      .sort((a, b) => d3.descending(a[1], b[1]))[0][0];
    dl.append('dt').text('Most active hour');
    dl.append('dd').text(`${mostActiveHour}:00`);

    // Days worked on site
    const daysWorked = new Set(
        data.map(d => d.datetime.toISOString().split('T')[0])
      ).size;
      
      dl.append('dt').text('Days worked on site');
      dl.append('dd').text(daysWorked);
}

function renderScatterPlot(data, commits) {
    const width = 1000;
    const height = 600;
    const margin = { top: 10, right: 10, bottom: 30, left: 40 };
    const usableWidth = width - margin.left - margin.right;
    const usableHeight = height - margin.top - margin.bottom;
  
    const [minLines, maxLines] = d3.extent(commits, (d) => d.totalLines);
    const rScale = d3.scaleSqrt()
      .domain([minLines, maxLines])
      .range([2, 30]);
  
    // Create SVG
    const svg = d3.select('#chart')
      .append('svg')
      .attr('viewBox', `0 0 ${width} ${height}`)
      .style('overflow', 'visible');
  
    //create a group for dots
    const dots = svg.append('g').attr('class', 'dots');
  
    // Scales
    const xScale = d3.scaleTime()
      .domain(d3.extent(commits, d => d.datetime))
      .range([margin.left, margin.left + usableWidth])
      .nice();
  
    const yScale = d3.scaleLinear()
      .domain([0, 24])
      .range([margin.top + usableHeight, margin.top]);
  
    // Axes
    svg.append('g')
      .attr('transform', `translate(0, ${margin.top + usableHeight})`)
      .call(d3.axisBottom(xScale));
  
    svg.append('g')
      .attr('transform', `translate(${margin.left}, 0)`)
      .call(d3.axisLeft(yScale).tickFormat(d => `${String(d).padStart(2, '0')}:00`));
  
    // Gridlines
    svg.append('g')
      .attr('class', 'gridlines')
      .attr('transform', `translate(${margin.left}, 0)`)
      .call(d3.axisLeft(yScale).tickFormat('').tickSize(-usableWidth));
  
    dots.selectAll('circle')
      .data(commits)
      .join('circle')
      .attr('cx', d => xScale(d.datetime))
      .attr('cy', d => yScale(d.hourFrac))
      .attr('r', d => rScale(d.totalLines))
      .attr('fill', 'steelblue')
      .style('fill-opacity', 0.7)
      .on('mouseenter', (event, commit) => {
        d3.select(event.currentTarget).style('fill-opacity', 1);
        renderTooltipContent(commit);
        updateTooltipVisibility(true);
        updateTooltipPosition(event);
      })
      .on('mousemove', updateTooltipPosition)
      .on('mouseleave', (event) => {
        d3.select(event.currentTarget).style('fill-opacity', 0.7);
        updateTooltipVisibility(false);
      });
}  
  
function updateTooltipVisibility(isVisible) {
    const tooltip = document.getElementById('commit-tooltip');
    tooltip.hidden = !isVisible;
}

function updateTooltipPosition(event) {
    const tooltip = document.getElementById('commit-tooltip');
    const offsetX = 15; 
    const offsetY = 100;
    tooltip.style.left = `${event.clientX + offsetX}px`;
    tooltip.style.top = `${event.clientY + offsetY}px`;
}

function renderTooltipContent(commit) {
    const tooltip = d3.select('#commit-tooltip');
    const link = document.getElementById('commit-link');
    const date = document.getElementById('commit-date');
    tooltip.style('opacity', 1);
  
    if (Object.keys(commit).length === 0) return;
  
    link.href = commit.url;
    link.textContent = commit.id;
    date.textContent = commit.datetime?.toLocaleString('en', {
      dateStyle: 'full',
    });
}

// Run once DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    const data = await loadData();
    const commits = processCommits(data);
    renderCommitInfo(data, commits);
    renderScatterPlot(data, commits);
    renderTooltipContent(commits);
  });