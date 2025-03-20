// const trendChart = document.getElementById('trendChart');
const parcipantChart = document.getElementById('parcipantChart');
const departmentChart = document.getElementById('departmentChart');

fetch('/admin/category-count')
    .then((response) => {
        if (response.ok == true) {
            return response.json();
        }
    })
    .then((data) => {
        // console.log(data.departmentWiseCount)
        DepaartmentChart(data.departmentWiseCount, 'pie'); // bar , line , Bubble , doughnut
        ParcipantChart(data.categoryCount, 'bar'); // bar , line , Bubble , doughnut
        // TrendChart(data.line_graph.data, 'line'); // bar , line , Bubble , doughnut
    });

function DepaartmentChart(data1, type) {
    // console.log(data1);
    new Chart(departmentChart, {
        type: type,
        data: {
            labels: data1.map((row) => row._id),
            datasets: [
                {
                    label: data1.map((row) => row._id),
                    data: data1.map((row) => row.totalInnovations),
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

// function TrendChart(data1, type) {
//   new Chart(trendChart, {
//     type: type,
//     data: {
//       labels: data1.map((row) => row.year),
//       datasets: [
//         {
//           label: '#research_papers',
//           data: data1.map((row) => row.research_papers),
//           borderWidth: 1,
//         },
//         {
//           label: '#patents',
//           data: data1.map((row) => row.patents),
//           borderWidth: 1,
//         },
//         {
//           label: '# startups',
//           data: data1.map((row) => row.startups),
//           borderWidth: 1,
//         },
//       ],
//     },
//     options: {
//       scales: {
//         y: {
//           beginAt: 10,
//         },
//       },
//     },
//   });
// }

function ParcipantChart(data1, type) {
    new Chart(parcipantChart, {
        type: type,
        data: {
            labels: data1.map((row) => row._id),
            datasets: [
                {
                    label: "participants",
                    data: data1.map((row) => row.count),
                    borderWidth: 1,
                    // backgroundColor: ["red", "blue", "green", "yellow", "purple", "orange", "cyan"]
                },
            ],
        },
        options: {
            responsive: true,
            // maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: "top",
                    labels: {
                        usePointStyle: true, // ✅ Uses a dot instead of a box (optional)
                        generateLabels: function (chart) {
                            let labels = Chart.defaults.plugins.legend.labels.generateLabels(chart);
                            labels.forEach(label => {
                                label.fillStyle = "transparent"; // ✅ Removes the color from label
                            });
                            return labels;
                        },
                    },
                },
            },
            scales: {
                x: {
                    ticks: {
                      maxRotation: 0, // ✅ Keep text horizontal
                      minRotation: 0,
                      autoSkip: false, // ✅ Ensure all labels are shown
                    },
                  },
                y:{
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1, // ✅ Ensure better spacing
                    },
                },
            },
        },
    });
}
