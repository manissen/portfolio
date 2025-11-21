import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
import scrollama from 'https://cdn.jsdelivr.net/npm/scrollama@3.2.0/+esm';

// Read CSV
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

// Process commits
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

function renderCommitInfo(data, commits) {
  const statsContainer = d3.select('#stats');

  // Add heading
  statsContainer.append('h2')
    .attr('class', 'stats-heading')

  const dl = statsContainer.append('dl').attr('class', 'stats');

  // Total LOC
  dl.append('dt').html('Total <abbr title="Lines of code">LOC</abbr>');
  dl.append('dd').text(data.length);

  // Total commits
  dl.append('dt').text('COMMITS');
  dl.append('dd').text(commits.length);

  // Number of files
  const numFiles = new Set(data.map(d => d.file)).size;
  dl.append('dt').text('FILES');
  dl.append('dd').text(numFiles);

  // Average line length
  const avgLineLength = d3.mean(data, d => d.length).toFixed(1);
  dl.append('dt').text('AVG LINE LENGTH');
  dl.append('dd').text(avgLineLength);
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
  xScale = d3.scaleTime()
    .domain(d3.extent(commits, d => d.datetime))
    .range([margin.left, margin.left + usableWidth])
    .nice();

  yScale = d3.scaleLinear()
    .domain([0, 24])
    .range([margin.top + usableHeight, margin.top]);

  const xAxis = d3.axisBottom(xScale)
  .ticks(5) 
  .tickFormat(d3.timeFormat("%b %d"));

  const yAxis = d3.axisLeft(yScale).tickFormat(d => `${String(d).padStart(2, '0')}:00`);

  svg.append('g')
    .attr('transform', `translate(0, ${margin.top + usableHeight})`)
    .attr('class', 'x-axis')   // mark x-axis for updates
    .call(xAxis);

  svg.append('g')
    .attr('transform', `translate(${margin.left}, 0)`)
    .attr('class', 'y-axis')   // mark y-axis
    .call(yAxis);

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
      updateTooltipVisibility(true, event);
      updateTooltipPosition(event);
    })
    .on('mousemove', updateTooltipPosition)
    .on('mouseleave', (event) => {
      d3.select(event.currentTarget).style('fill-opacity', 0.7);
      updateTooltipVisibility(false, event);
    });

  createBrushSelector(svg);
}

function updateTooltipVisibility(isVisible, event) {
  const tooltip = document.getElementById('commit-tooltip');
  tooltip.hidden = !isVisible;
}

function updateTooltipPosition(event) {
  const tooltip = document.getElementById('commit-tooltip');

  // Offset so the tooltip sits a bit away from the cursor/dot
  const offsetX = 15;
  const offsetY = -30;

  tooltip.style.left = `${event.pageX + offsetX}px`;
  tooltip.style.top = `${event.pageY + offsetY}px`;
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

function createBrushSelector(svg) {
  svg.call(d3.brush().on('start brush end', brushed));
  svg.selectAll('.dots, .overlay ~ *').raise();
}

function brushed(event) {
  const selection = event.selection;
  d3.selectAll('circle').classed('selected', (d) =>
    isCommitSelected(selection, d),
  );
  renderSelectionCount(selection);
  renderLanguageBreakdown(selection);
}

function isCommitSelected(selection, commit) {
  if (!selection) return false;

  const [[x0, y0], [x1, y1]] = selection; // brush selection corners
  const x = xScale(commit.datetime);
  const y = yScale(commit.hourFrac);

  return x >= x0 && x <= x1 && y >= y0 && y <= y1;
}

function renderSelectionCount(selection) {
  const selectedCommits = selection
    ? commits.filter((d) => isCommitSelected(selection, d))
    : [];

  const countElement = document.querySelector('#selection-count');
  countElement.textContent = `${selectedCommits.length || 'No'
    } commits selected`;

  return selectedCommits;
}

function renderLanguageBreakdown(selection) {
  const selectedCommits = selection
    ? commits.filter((d) => isCommitSelected(selection, d))
    : [];
  const container = document.getElementById('language-breakdown');

  if (selectedCommits.length === 0) {
    container.innerHTML = '';
    return;
  }
  const requiredCommits = selectedCommits.length ? selectedCommits : commits;
  const lines = requiredCommits.flatMap((d) => d.lines);

  // Use d3.rollup to count lines per language
  const breakdown = d3.rollup(
    lines,
    (v) => v.length,
    (d) => d.type,
  );

  // Update DOM with breakdown
  container.innerHTML = '';

  for (const [language, count] of breakdown) {
    const proportion = count / lines.length;
    const formatted = d3.format('.1~%')(proportion);

    container.innerHTML += `
            <dt>${language}</dt>
            <dd>${count} lines (${formatted})</dd>
        `;
  }
}

function updateScatterPlot(filteredCommits) {
  const svg = d3.select('#chart').select('svg');

  // Update scale
  xScale.domain(d3.extent(filteredCommits, d => d.datetime));

  // Update x-axis
  const xAxis = d3.axisBottom(xScale)
  .ticks(5)
  .tickFormat(d3.timeFormat("%b %d"));

  const xAxisGroup = svg.select('g.x-axis');
  xAxisGroup.selectAll('*').remove();
  xAxisGroup.call(xAxis);

  // Recompute radii
  const [minLines, maxLines] = d3.extent(filteredCommits, d => d.totalLines);
  const rScale = d3.scaleSqrt().domain([minLines, maxLines]).range([2, 30]);

  // Sorted commits (for overlap)
  const sorted = d3.sort(filteredCommits, d => -d.totalLines);

  const dots = svg.select('g.dots');

  dots
    .selectAll('circle')
    .data(sorted, d => d.id)   // 🔥 VERY IMPORTANT for stability
    .join('circle')
    .attr('cx', d => xScale(d.datetime))
    .attr('cy', d => yScale(d.hourFrac))
    .attr('r', d => rScale(d.totalLines))
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
}

function onTimeSliderChange() {
  commitProgress = Number(timeSlider.value);
  commitMaxTime = timeScale.invert(commitProgress);

  timeDisplay.textContent = commitMaxTime.toLocaleString("en-US", {
    dateStyle: "long",
    timeStyle: "short",
  });

  filteredCommits = commits.filter(d => d.datetime <= commitMaxTime);

  let lines = filteredCommits.flatMap((d) => d.lines);
  let colors = d3.scaleOrdinal(d3.schemeTableau10);
  let files = d3
    .groups(lines, (d) => d.file)
    .map(([name, lines]) => {
      return { name, lines };
    })
    .sort((a, b) => b.lines.length - a.lines.length);

  let filesContainer = d3
    .select('#files')
    .selectAll('div')
    .data(files, d => d.name)
    .join(
      enter => {
        const div = enter.append('div');

        const dt = div.append('dt');
        dt.append('code');
        dt.append('small');   // ⬅ Add this

        div.append('dd')
          .classed('file-lines', true);

        return div;
      },
      update => update,
      exit => exit.remove()
    );

  // update name
  filesContainer
    .select('dt > code')
    .text(d => d.name);

  //
  filesContainer
    .select('dd')
    .selectAll('div')
    .data(d => d.lines)
    .join('div')
    .attr('class', 'loc')
    .attr('style', (d) => `--color: ${colors(d.type)}`);

  // This code updates the div info
  filesContainer.select('dt > code').text((d) => d.name);
  updateScatterPlot(filteredCommits);
}

function updateScatterPlotUntil(maxDatetime) {
  const filteredCommits = commits.filter(d => d.datetime <= maxDatetime);
  updateScatterPlot(filteredCommits);
}

function onStepEnter(response) {
  const commit = response.element.__data__;
  console.log(commit.datetime);
  updateScatterPlotUntil(commit.datetime);
}
const data = await loadData();
let commits = processCommits(data).sort((a, b) => a.datetime - b.datetime);

let xScale, yScale;

let commitProgress = 100;

let timeScale = d3
  .scaleTime()
  .domain([
    d3.min(commits, (d) => d.datetime),
    d3.max(commits, (d) => d.datetime),
  ])
  .range([0, 100]);

let commitMaxTime = timeScale.invert(commitProgress);
let filteredCommits = commits;

const timeSlider = document.getElementById("commit-progress");
const timeDisplay = document.getElementById("commit-time");

d3.select('#scatter-story')
    .selectAll('.step')
    .data(commits)
    .join('div')
    .attr('class', 'step')
    .html(
      (d, i) => `
		On ${d.datetime.toLocaleString('en', {
        dateStyle: 'full',
        timeStyle: 'short',
      })},
		I made <a href="${d.url}" target="_blank">${i > 0 ? 'another glorious commit' : 'my first commit, and it was glorious'
        }</a>.
		I edited ${d.totalLines} lines across ${d3.rollups(
          d.lines,
          (D) => D.length,
          (d) => d.file,
        ).length
        } files.
		Then I looked over all I had made, and I saw that it was very good.
	`,
);

const scroller = scrollama();
scroller
  .setup({
    container: '#scrolly-1',
    step: '#scrolly-1 .step',
    offset: 0.5
  })
  .onStepEnter(onStepEnter);

timeSlider.addEventListener("input", onTimeSliderChange);

renderCommitInfo(data, commits);
renderScatterPlot(data, commits);
renderTooltipContent(commits);
onTimeSliderChange();