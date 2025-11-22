// full-file: scatter-scrolly-commits.js
// Assumes this file is loaded as a module (top-level await allowed)
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
import scrollama from 'https://cdn.jsdelivr.net/npm/scrollama@3.2.0/+esm';

// ---------------------------
// Data loading & processing
// ---------------------------
async function loadData() {
  const data = await d3.csv('loc.csv', (row) => ({
    ...row,
    line: +row.line,
    depth: +row.depth,
    length: +row.length,
    date: row.date,
    time: row.time,
    timezone: row.timezone,
    dateObj: new Date(row.date + 'T00:00' + row.timezone),
    // if you have an ISO datetime field, adapt accordingly:
    datetime: new Date(row.datetime),
    // preserve file, type, commit, author, etc.
  }));
  return data;
}

function processCommits(data) {
  return d3
    .groups(data, (d) => d.commit)
    .map(([commit, lines]) => {
      const first = lines[0] || {};
      const { author, date, time, timezone, datetime } = first;
      const ret = {
        id: commit,
        url: 'https://github.com/vis-society/lab-7/commit/' + commit,
        author,
        date,
        time,
        timezone,
        datetime: datetime ? new Date(datetime) : new Date(), // defensive
        hourFrac: (datetime ? new Date(datetime).getHours() : 0) + ((datetime ? new Date(datetime).getMinutes() : 0) / 60),
        totalLines: lines.length,
      };

      // Keep lines but hide from console (non-enumerable)
      Object.defineProperty(ret, 'lines', {
        value: lines,
        writable: true,
        configurable: true,
        enumerable: false,
      });

      return ret;
    });
}

// ---------------------------
// Globals
// ---------------------------
const data = await loadData();
let commits = processCommits(data).sort((a, b) => a.datetime - b.datetime);

let xScale, yScale;
let filteredCommits = commits.slice(); // default visible set = all commits
let commitProgress = 100;

const timeSlider = document.getElementById('commit-progress');
const timeDisplay = document.getElementById('commit-time');

// ---------------------------
// Render stats and info
// ---------------------------
function renderCommitInfo(data, commits) {
  const statsContainer = d3.select('#stats');
  statsContainer.selectAll('*').remove();

  statsContainer.append('h2').attr('class', 'stats-heading').text('Project stats');

  const dl = statsContainer.append('dl').attr('class', 'stats');

  // Total LOC
  dl.append('dt').html('Total <abbr title="Lines of code">LOC</abbr>');
  dl.append('dd').text(data.length);

  // Total commits
  dl.append('dt').text('COMMITS');
  dl.append('dd').text(commits.length);

  // Number of files
  const numFiles = new Set(data.map((d) => d.file)).size;
  dl.append('dt').text('FILES');
  dl.append('dd').text(numFiles);

  // Average line length
  const avgLineLength = d3.mean(data, (d) => d.length).toFixed(1);
  dl.append('dt').text('AVG LINE LENGTH');
  dl.append('dd').text(avgLineLength);
}

// ---------------------------
// Tooltip helpers
// ---------------------------
function updateTooltipVisibility(isVisible, event) {
  const tooltip = document.getElementById('commit-tooltip');
  if (!tooltip) return;
  tooltip.hidden = !isVisible;
}

function updateTooltipPosition(event) {
  const tooltip = document.getElementById('commit-tooltip');
  if (!tooltip) return;
  const offsetX = 15;
  const offsetY = -30;
  // some events come from D3 and have pageX/pageY on event
  tooltip.style.left = `${event.pageX + offsetX}px`;
  tooltip.style.top = `${event.pageY + offsetY}px`;
}

function renderTooltipContent(commit) {
  const tooltip = d3.select('#commit-tooltip');
  if (tooltip.empty()) return;

  const link = document.getElementById('commit-link');
  const date = document.getElementById('commit-date');
  tooltip.style('opacity', 1);

  if (!commit || typeof commit !== 'object') return;

  link.href = commit.url;
  link.textContent = commit.id;
  date.textContent = commit.datetime
    ? commit.datetime.toLocaleString('en', { dateStyle: 'full' })
    : '';
}

// ---------------------------
// Files UI update (used by slider/scroller and brush when needed)
// ---------------------------
function updateFilesUI(currentVisibleCommits) {
  // show files for the currently visible set (filtered by time/scroll)
  const lines = (currentVisibleCommits ?? []).flatMap((d) => d.lines);

  // group by file and sort by number of lines
  const files = d3
    .groups(lines, (d) => d.file)
    .map(([name, lines]) => ({ name, lines }))
    .sort((a, b) => b.lines.length - a.lines.length);

  const colors = d3.scaleOrdinal(d3.schemeTableau10);

  const filesSelection = d3
    .select('#files')
    .selectAll('div.file')
    .data(files, (d) => d.name);

  // EXIT
  filesSelection.exit().remove();

  // ENTER
  const enter = filesSelection
    .enter()
    .append('div')
    .attr('class', 'file');

  const dt = enter.append('dt');
  dt.append('code');
  dt.append('small');

  enter.append('dd').classed('file-lines', true);

  // UPDATE (enter + update)
  const merged = enter.merge(filesSelection);

  merged.select('dt > code').text((d) => d.name);

  // each file's dd contains many div.loc entries (one per line)
  merged
    .select('dd')
    .selectAll('div.loc')
    .data((d) => d.lines, (d) => `${d.file}:${d.line}`)
    .join(
      (enter) =>
        enter
          .append('div')
          .attr('class', 'loc')
          .attr('style', (d) => `--color: ${colors(d.type)}`),
      (update) => update,
      (exit) => exit.remove(),
    );
}

// ---------------------------
// Scatter plot initial render
// ---------------------------
function renderScatterPlot(initialCommits) {
  const width = 1000;
  const height = 600;
  const margin = { top: 10, right: 10, bottom: 30, left: 40 };
  const usableWidth = width - margin.left - margin.right;
  const usableHeight = height - margin.top - margin.bottom;

  // radius scale based on totalLines
  const [minLines, maxLines] = d3.extent(initialCommits, (d) => d.totalLines);
  const rScale = d3.scaleSqrt().domain([minLines, maxLines]).range([2, 30]);

  // create svg
  const svg = d3
    .select('#chart')
    .append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .style('overflow', 'visible');

  // group for dots
  const dots = svg.append('g').attr('class', 'dots');

  // Scales: x is time based on commits
  xScale = d3
    .scaleTime()
    .domain(d3.extent(commits, (d) => d.datetime))
    .range([margin.left, margin.left + usableWidth])
    .nice();

  yScale = d3
    .scaleLinear()
    .domain([0, 24])
    .range([margin.top + usableHeight, margin.top]);

  // axes
  const xAxis = d3.axisBottom(xScale).ticks(5).tickFormat(d3.timeFormat('%b %d'));
  const yAxis = d3.axisLeft(yScale).tickFormat((d) => `${String(d).padStart(2, '0')}:00`);

  svg
    .append('g')
    .attr('transform', `translate(0, ${margin.top + usableHeight})`)
    .attr('class', 'x-axis')
    .call(xAxis);

  svg
    .append('g')
    .attr('transform', `translate(${margin.left}, 0)`)
    .attr('class', 'y-axis')
    .call(yAxis);

  // gridlines
  svg
    .append('g')
    .attr('class', 'gridlines')
    .attr('transform', `translate(${margin.left}, 0)`)
    .call(d3.axisLeft(yScale).tickFormat('').tickSize(-usableWidth));

  // initial draw of circles using the current filteredCommits
  const sorted = d3.sort(initialCommits, (d) => -d.totalLines);
  dots
    .selectAll('circle')
    .data(sorted, (d) => d.id)
    .join('circle')
    .attr('cx', (d) => xScale(d.datetime))
    .attr('cy', (d) => yScale(d.hourFrac))
    .attr('r', (d) => rScale(d.totalLines))
    .attr('fill', 'steelblue')
    .style('fill-opacity', 0.7)
    .on('mouseenter', (event, commit) => {
      d3.select(event.currentTarget).style('fill-opacity', 1);
      renderTooltipContent(commit);
      updateTooltipVisibility(true, event);
      updateTooltipPosition(event);
    })
    .on('mousemove', updateTooltipPosition)
    .on('mouseleave', (event) => {
      d3.select(event.currentTarget).style('fill-opacity', 0.7);
      updateTooltipVisibility(false, event);
    });

  // attach brush
  svg.select('.dots').raise();
  createBrushSelector(svg);
}

// ---------------------------
// Brush & selection handling
// (Option A3) — brush operates on currently visible commits
// ---------------------------
function createBrushSelector(svg) {
  const brush = d3.brush().on('start brush end', brushed);
  svg.call(brush);
  // ensure dots render above the brush overlay hit area if needed
  svg.selectAll('.dots, .overlay ~ *').raise();
}

function brushed(event) {
  const selection = event.selection; // may be null
  const svg = d3.select('#chart').select('svg');

  // compute which of the currently visible commits are selected
  const visible = filteredCommits; // IMPORTANT: A3 — brush only hits visible set
  const selectedCommits = selection
    ? visible.filter((d) => isCommitSelected(selection, d))
    : [];

  // mark circles
  svg
    .selectAll('circle')
    .classed('selected', (d) => selectedCommits.includes(d));

  // update the language/file breakdown and selection count to reflect the selection
  renderSelectionCount(selection);
  renderLanguageBreakdown(selection);
}

function isCommitSelected(selection, commit) {
  if (!selection) return false;
  const [[x0, y0], [x1, y1]] = selection;
  const x = xScale(commit.datetime);
  const y = yScale(commit.hourFrac);
  return x >= x0 && x <= x1 && y >= y0 && y <= y1;
}

function renderSelectionCount(selection) {
  const selectedCommits = selection ? filteredCommits.filter((d) => isCommitSelected(selection, d)) : [];
  const countElement = document.querySelector('#selection-count');
  if (countElement) {
    countElement.textContent = `${selectedCommits.length || 'No'} commits selected`;
  }
  return selectedCommits;
}

function renderLanguageBreakdown(selection) {
  // If there's a brush selection, show breakdown for selected commits.
  // Otherwise, show breakdown for the current visible (filtered) commits.
  const selectedCommits = selection ? filteredCommits.filter((d) => isCommitSelected(selection, d)) : [];
  const requiredCommits = selectedCommits.length ? selectedCommits : filteredCommits;
  const lines = requiredCommits.flatMap((d) => d.lines);
  const container = document.getElementById('language-breakdown');

  if (!container) return;

  if (lines.length === 0) {
    container.innerHTML = '';
    return;
  }

  // rollup counts by type (language)
  const breakdown = d3.rollup(lines, (v) => v.length, (d) => d.type);

  container.innerHTML = '';
  for (const [language, count] of breakdown) {
    const proportion = count / lines.length;
    const formatted = d3.format('.1~%')(proportion);
    container.innerHTML += `<dt>${language}</dt><dd>${count} lines (${formatted})</dd>`;
  }
}

// ---------------------------
// Update scatter (called by slider / scrolly)
// Also updates files UI to reflect visible commits
// ---------------------------
function updateScatterPlot(newFilteredCommits) {
  // update global pointer to visible commits
  filteredCommits = newFilteredCommits.slice();

  const svg = d3.select('#chart').select('svg');

  // update xScale domain (based on visible commits)
  xScale.domain(d3.extent(filteredCommits, (d) => d.datetime));

  // update x-axis
  const xAxis = d3.axisBottom(xScale).ticks(5).tickFormat(d3.timeFormat('%b %d'));
  const xAxisGroup = svg.select('g.x-axis');
  xAxisGroup.selectAll('*').remove();
  xAxisGroup.call(xAxis);

  // recompute radii based on the currently visible commits
  const [minLines, maxLines] = d3.extent(filteredCommits, (d) => d.totalLines);
  const rScale = d3.scaleSqrt().domain([minLines ?? 0, maxLines ?? 1]).range([2, 30]);

  // sort for stable layering
  const sorted = d3.sort(filteredCommits, (d) => -d.totalLines);

  const dots = svg.select('g.dots');

  // data join with stable key d.id
  dots
    .selectAll('circle')
    .data(sorted, (d) => d.id)
    .join(
      (enter) =>
        enter
          .append('circle')
          .attr('fill', 'steelblue')
          .style('fill-opacity', 0.7)
          .on('mouseenter', (event, commit) => {
            d3.select(event.currentTarget).style('fill-opacity', 1);
            renderTooltipContent(commit);
            updateTooltipVisibility(true, event);
            updateTooltipPosition(event);
          })
          .on('mousemove', updateTooltipPosition)
          .on('mouseleave', (event) => {
            d3.select(event.currentTarget).style('fill-opacity', 0.7);
            updateTooltipVisibility(false, event);
          }),
      (update) => update,
      (exit) => exit.remove(),
    )
    .attr('cx', (d) => xScale(d.datetime))
    .attr('cy', (d) => yScale(d.hourFrac))
    .attr('r', (d) => rScale(d.totalLines));

  // update files UI to reflect the currently visible commits
  updateFilesUI(filteredCommits);

  // clear any previous selection counters / breakdowns (since the visible set changed)
  const countElement = document.querySelector('#selection-count');
  if (countElement) countElement.textContent = `No commits selected`;
  const breakdownContainer = document.getElementById('language-breakdown');
  if (breakdownContainer) breakdownContainer.innerHTML = '';
}

// convenience wrapper used by scroller:
function updateScatterPlotUntil(maxDatetime) {
  const visible = commits.filter((d) => d.datetime <= maxDatetime);
  updateScatterPlot(visible);
}

// ---------------------------
// Slider change (time filtering)
// ---------------------------
function onTimeSliderChange() {
  commitProgress = Number(timeSlider.value);
  const timeScale = d3
    .scaleTime()
    .domain([
      d3.min(commits, (d) => d.datetime),
      d3.max(commits, (d) => d.datetime),
    ])
    .range([0, 100]);

  const commitMaxTime = timeScale.invert(commitProgress);

  timeDisplay.textContent = commitMaxTime.toLocaleString('en-US', {
    dateStyle: 'long',
    timeStyle: 'short',
  });

  const visible = commits.filter((d) => d.datetime <= commitMaxTime);

  // update the global filteredCommits and redraw scatter & files
  updateScatterPlot(visible);
}

// ---------------------------
// Scrollytelling step handling
// ---------------------------
function onStepEnter(response) {
  // response.element.__data__ is the commit for this step
  const commit = response.element.__data__;
  if (!commit || !commit.datetime) {
    return;
  }
  updateScatterPlotUntil(commit.datetime);
}

// ---------------------------
// Initialize DOM & scroller
// ---------------------------
renderCommitInfo(data, commits);

// initial render scatter with all commits visible
renderScatterPlot(commits);

// prepare scrolly text (the step divs)
d3.select('#scatter-story')
  .selectAll('.step')
  .data(commits)
  .join('div')
  .attr('class', 'step')
  .html(
    (d, i) =>
      `
    On ${d.datetime.toLocaleString('en', { dateStyle: 'full', timeStyle: 'short' })},
    I made <a href="${d.url}" target="_blank">${i > 0 ? 'another glorious commit' : 'my first commit, and it was glorious'}</a>.
    I edited ${d.totalLines} lines across ${d3.rollups(d.lines, (D) => D.length, (dd) => dd.file).length} files.
    Then I looked over all I had made, and I saw that it was very good.
  `,
  );

// setup scroller
const scroller = scrollama();
scroller
  .setup({
    container: '#scrolly-1',
    step: '#scrolly-1 .step',
    offset: 0.5,
  })
  .onStepEnter(onStepEnter);

// slider handler
if (timeSlider) {
  timeSlider.addEventListener('input', onTimeSliderChange);
}

// initial time state: set slider to max (show all commits)
if (timeSlider) {
  // compute initial slider domain mapping (we use 0-100 in the input)
  const tScale = d3
    .scaleTime()
    .domain([d3.min(commits, (d) => d.datetime), d3.max(commits, (d) => d.datetime)])
    .range([0, 100]);

  // default to 100 (all commits visible)
  timeSlider.value = 0;
  onTimeSliderChange();
} else {
  // if no slider present, still initialize files UI for all commits
  updateFilesUI(commits);
}

// Ensure tooltip hidden initially
updateTooltipVisibility(false, { pageX: 0, pageY: 0 });
