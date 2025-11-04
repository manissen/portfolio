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
  

// Step 1.4 – Run once DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  const data = await loadData();
  const commits = processCommits(data);
  renderCommitInfo(data, commits);
});
