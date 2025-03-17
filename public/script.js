const trendChart = document.getElementById('trendChart');
const innovationChart = document.getElementById('innovationChart');
const departmentChart = document.getElementById('departmentChart');

fetch('data.json')
  .then((response) => {
    if (response.ok == true) {
      return response.json();
    }
  })
  .then((data) => {
    // console.log(data)
    DepaartmentChart(data.bar_graph.data, 'bar'); // bar , line , Bubble , doughnut
    InnovationChart(data.pie_chart.data, 'pie'); // bar , line , Bubble , doughnut
    TrendChart(data.line_graph.data, 'line'); // bar , line , Bubble , doughnut
  });

function InnovationChart(data1, type) {
  new Chart(innovationChart, {
    type: type,
    data: {
      labels: data1.map((row) => row.category),
      datasets: [
        {
          label: '# of Votes',
          data: data1.map((row) => row.percentage),
          borderWidth: 1,
        },
      ],
    },
    options: {
      scales: {
        y: {
          beginAtzero: true,
        },
      },
    },
  });
}

function TrendChart(data1, type) {
  new Chart(trendChart, {
    type: type,
    data: {
      labels: data1.map((row) => row.year),
      datasets: [
        {
          label: '#research_papers',
          data: data1.map((row) => row.research_papers),
          borderWidth: 1,
        },
        {
          label: '#patents',
          data: data1.map((row) => row.patents),
          borderWidth: 1,
        },
        {
          label: '# startups',
          data: data1.map((row) => row.startups),
          borderWidth: 1,
        },
      ],
    },
    options: {
      scales: {
        y: {
          beginAt: 10,
        },
      },
    },
  });
}

function DepaartmentChart(data1, type) {
  new Chart(departmentChart, {
    type: type,
    data: {
      labels: data1.map((row) => row.department),
      datasets: [
        {
          label: '# of Votes',
          data: data1.map((row) => row.papers),
          borderWidth: 1,
        },
      ],
    },
    options: {
      scales: {
        y: {
          beginAt: 10,
        },
      },
    },
  });
}
