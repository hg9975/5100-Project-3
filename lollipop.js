// Set up the chart area and incorporate margins
const svg = d3.select("svg#lollipops");
const width = svg.attr("width");
const height = svg.attr("height");
const margin = {top: 20, right: 10, bottom: 30, left: 60};
const chartWidth = width - margin.left - margin.right;
const chartHeight = height - margin.top - margin.bottom;

let annotations, chartArea;

// Set up the description area for mouseover information & color legends
const description = d3.select("svg#description");
const width2 = description.attr("width");
const height2 = description.attr("height");
const margin2 = {top: 10, right: 10, bottom: 30, left: 10};
const chartWidth2 = width2 - margin2.left - margin2.right;
const chartHeight2 = height2 - margin2.top - margin2.bottom;

// Draw colorlegend
description.append("circle")
          .attr("class","legend-circle")
          .attr("cx",30)
          .attr("cy",285)
          .attr("r",7)
          .style("fill", 'rgb(44, 127, 184)');
description.append("circle")
          .attr("class","legend-circle")
          .attr("cx",30)
          .attr("cy",315)
          .attr("r",7)
          .style("fill", 'rgb(135, 214, 161)');

description.append("text")
          .attr("class","legend-text")
          .attr("x",45)
          .attr("y",285)
          .style("fill", 'rgb(44, 127, 184)')
          .style("font-size","20px")
          .style("alignment-baseline","middle")
          .text("Maximum Salary");
description.append("text")
          .attr("class","legend-text")
          .attr("x",45)
          .attr("y",315)
          .style("fill", 'rgb(135, 214, 161)')
          .style("font-size","20px")
          .style("alignment-baseline","middle")
          .text("Starting Salary");

// initiate the graph
var job_type_selected = d3.select("#job-type-select").property("value");
requestData(job_type_selected);

// update the graph based on job-type-select value
d3.select("#job-type-select").on("change", function() {

  // remove all existing lollipops
  chartArea.selectAll('g.lollipop').remove();
  annotations.remove();

  job_type_selected = d3.select(this).property("value");

  // call the requestData()
  requestData(job_type_selected);

})

// Create a function to load dataset
async function requestData( job_selected ) {

  let data, lollipops;

  // read in all jobs' data
  let all_jobs_data = await d3.csv("Dataset/final_dataset.csv", d3.autoType);
  console.log("All Jobs Data: ", all_jobs_data);

  // filter out Business Analyst, Data Analyst, and Data Scientist jobs data separately
  let business_analyst = d3.filter(all_jobs_data, d => (d.Position === 1));
  console.log("Business Analyst: ", business_analyst);
  let data_analyst = d3.filter(all_jobs_data, d => (d.Position === 2));
  console.log("Data Analyst: ", data_analyst);
  let data_scientist = d3.filter(all_jobs_data, d => (d.Position === 3));
  console.log("Data Scientist: ", data_scientist);


  if (job_selected === "business-analyst"){
    data = business_analyst;
  }
  else if (job_selected === "data-analyst"){
    data = data_analyst;
  }
  else if (job_selected === "data-scientist"){
    data = data_scientist;
  }
  else if (job_selected === "All"){
    data = all_jobs_data;
  }

  // find out average salary
  let salaries = ( d3.map(data, d => d.lower_salary) ).concat( d3.map(data, d => d.higher_salary) );
  const avgSalary = d3.mean(salaries);

  // find all states in the data
  let states = d3.map(data, d => d.state);
  let unique_states = states.filter((x, i, a) => a.indexOf(x) == i);

  // compute the avarage lower-salary and higher-salary for each state
  let average_salary = new Array();
  unique_states.forEach( s => {
    // find all job listings in the state s
    let s_data = d3.filter(data, d => (d.state === s));

    // compute the average value
    let average_lower = d3.mean(s_data, d => d['lower_salary']);
    let average_higher = d3.mean(s_data, d => d['higher_salary']);

    // create a dictionary to hold all information
    let new_dict = {};
    new_dict["state"] = s;
    new_dict["state_full"] = s_data[0]["state_full"];
    new_dict["average_lower"] = average_lower;
    new_dict["average_higher"] = average_higher;
    new_dict["salary_range"] = Math.abs(average_lower - average_higher);
    new_dict["number_of_jobs"] = s_data.length;

    // push the new_dict to average_salary array
    average_salary.push(new_dict);
  })

  // Create areas for annotations & chartArea
  annotations = svg.append("g").attr("id","annotations");
  chartArea = svg.append("g").attr("id","points")
                .attr("transform",`translate(${margin.left},${margin.top})`);

  // read in sort-selected from dropdown menu
  var sort_selected = d3.select("#sort-select").property("value");
  // Sort the average_salary data based on sort_selected
  if (sort_selected === "sortLower"){
    average_salary.sort( (a,b) => d3.descending(a['average_lower'],b['average_lower']) )
  }
  else if (sort_selected === "sortHigher"){
    average_salary.sort( (a,b) => d3.descending(a['average_higher'],b['average_higher']) )
  }
  else if (sort_selected === "sortRange"){
    average_salary.sort( (a,b) => d3.descending(a['salary_range'],b['salary_range']) )
  }
  else{
    average_salary.sort( (a,b) => d3.ascending(a['state'],b['state']) )
  }

  // Create color scale
  const colorScale = d3.scaleOrdinal().domain(['average_lower', 'average_higher'])
                                        .range( ['rgb(135, 214, 161)', 'rgb(44, 127, 184)'] );

  // Create stateScale
  states = d3.map(average_salary, d => d.state);
  const stateScale = d3.scalePoint().domain(states).range([0, chartWidth])
                                   .padding(0.1);
  // Find out salaryExtent
  const average_lower_salary = d3.map(average_salary, d => d.average_lower);
  const average_higher_salary = d3.map(average_salary, d => d.average_higher);
  const all_salary = average_lower_salary.concat(average_higher_salary);

  const salaryExtent = d3.extent(all_salary);

  // Adjust salaryExtent based on distance to avgSalary
  const salaryDist = Math.max( Math.abs(salaryExtent[0] - avgSalary), Math.abs(salaryExtent[1] - avgSalary) );
  const adjustedSalaryExtent = [avgSalary - salaryDist, avgSalary + salaryDist];
  const salaryScale = d3.scaleLinear().domain(adjustedSalaryExtent).range([chartHeight, 0]);

  // Draw x and y axis and gridlines
  let leftAxis = d3.axisLeft(salaryScale);
  let leftGridlines = d3.axisLeft(salaryScale)
                        .tickSize(-chartWidth-10)
                        .tickFormat("")
  annotations.append("g")
             .attr("class", "y axis")
             .attr("transform",`translate(${margin.left-10},${margin.top})`)
             .call(leftAxis)
  annotations.append("g")
             .attr("class", "y gridlines")
             .attr("transform",`translate(${margin.left-10},${margin.top})`)
             .call(leftGridlines);

  let bottomAxis = d3.axisBottom(stateScale)
  let bottomAxisG = annotations.append("g")
                               .attr("class", "x axis")
                               .attr("transform",`translate(${margin.left},${chartHeight+margin.top+10})`)
                               .call(bottomAxis);

  // Draw the average Salary line
  annotations.append("line")
            .attr("class","avgline")
            .attr("transform",`translate(${margin.left-10},${margin.top})`)
            .attr("x1", 0)
            .attr("x2", chartWidth+10)
            .attr("y1", salaryScale(avgSalary) )
            .attr("y2", salaryScale(avgSalary) );

  // Use datajoin to plot circiles and lines
  lollipops = chartArea.selectAll('g.lollipop').data( average_salary )
                       .join('g')
                       .attr('class','lollipop')
                       .attr("transform", d => `translate(${Math.floor(stateScale(d['state']))},0)`);

  // Draw line to connect avgSalary with lower_pop
  lollipops.append("line")
         .attr("class","stick")
         .attr("x1", 0 )  // 0 because we have a translate() on the <g> tag for x location
         .attr("x2", 0 )
         .attr("y1", d => salaryScale(d['average_higher']) )
         .attr("y2", d => salaryScale(d['average_lower']) );

  // draw circles for average_lower salary
  lollipops.append("circle")
           .attr("class","lower_pop")
           .attr("r", 10)
           .attr("fill", colorScale('lower_salary'))
           .attr("cx", 0 )
           .attr("cy", d => salaryScale(d['average_lower']) );

  // draw circles for average_lower salary
  lollipops.append("circle")
           .attr("class","higher_pop")
           .attr("r", 10)
           .attr("fill", colorScale('higher_salary'))
           .attr("cx", 0 )
           .attr("cy", d => salaryScale(d['average_higher']) );

  // Make an invisible rect active area for mouseovers
  lollipops.append("rect")
       .attr("class", "activeRegion")
       .attr("x", -10 )
       .attr("y", d => (salaryScale(d['average_higher']) - 10) )
       .attr("height", d => (chartHeight + margin.top - salaryScale(d['average_higher']) ) )
       .attr("width", 20 );

  //
  // Animate & Adjust Graph based on sorting order selected
  //
  // update the graph based on sort-select value
  d3.select("#sort-select").on("change", function() {

    var option = d3.select(this).property("value");

    // sort the average_salary data based on the sorting order selected
    if (option === "sortLower"){
      average_salary.sort( (a,b) => d3.descending(a['average_lower'],b['average_lower']) )
    }
    else if (option === "sortHigher"){
      average_salary.sort( (a,b) => d3.descending(a['average_higher'],b['average_higher']) )
    }
    else if (option === "sortRange"){
      average_salary.sort( (a,b) => d3.descending(a['salary_range'],b['salary_range']) )
    }
    else{
      average_salary.sort( (a,b) => d3.ascending(a['state'],b['state']) )
    }

    newStates = d3.map(average_salary, d => d.state)
    // Update axis with the new scales
    stateScale.domain(newStates);
    bottomAxis.scale(stateScale);

    // Add animation to show transitions
    bottomAxisG.transition().call(bottomAxis)
    lollipops.transition()
             .attr("transform", d => `translate(${Math.floor(stateScale(d['state']))},0)`)

  })

  //
  // Add mouseover events
  //
  // draw the frame for mouseover description
  const mouseover = description.append("g").attr("class","mouseover")
                       .attr("transform",`translate(${margin2.left+10},${margin2.top+10})`);


  const frame = mouseover.append("rect").attr("class","frame")
                        .attr("x", 0).attr("y", 0)
                        .attr("rx", 5).attr("ry", 5)
                        .attr("width", chartWidth2)
                        .attr("height", 200)
                        .attr("visibility","hidden");;

  const textbox = mouseover.append("g").attr("transform","translate(10,10)");
  const format = d3.format('$.3s');

  // Create a function to append textbox for mouseover events
  async function updateMouseover(d) {

    // Get the top 3 cities with most job positions
    let job_count_by_city = await CityFrequency(job_selected, d['state']);
    job_count_by_city.sort( (a,b) => d3.descending(a['number_jobs'],b['number_jobs']) );

    let top_cities = ( d3.map(job_count_by_city, d => d.city) ).slice(0,3);
    top_cities = Array.from(top_cities).join(', ');

    // clean all existing texts
    textbox.html('');

    let stateName = `${d['state_full']}`;
    let cities = `${top_cities}`;
    let number_jobs = `${d['number_of_jobs']} jobs available`;
    let starting_wage = `Average Starting Salary: ${format(d['average_lower'])}`;
    let highest_wage = `Average Maximum Possible Salary: ${format(d['average_higher'])}`;
    let range = `Salary Range: ${format(d['salary_range'])}`

    textbox.append("text").text(stateName)
           .attr("id", "title")
           .attr("x", 0).attr("y", 20);
    textbox.append("text").text(cities)
           .attr("id", "city")
           .attr("x", 0).attr("y", 40);
    textbox.append("text").text(number_jobs)
           .attr("id", "description")
           .attr("x", 0).attr("y", 70);
    textbox.append("text").text(starting_wage)
           .attr("id", "description")
           .attr("x", 0).attr("y", 90);
    textbox.append("text").text(highest_wage)
           .attr("id", "description")
           .attr("x", 0).attr("y", 110);
    textbox.append("text").text(range)
           .attr("id", "description")
           .attr("x", 0).attr("y", 130);

  }

  // Add mouseover events
  lollipops.on("mouseover", function(d) {
    mouseover.attr("visibility","");
    frame.attr("visibility","");
    updateMouseover( d3.select(this).datum() )
  });

  lollipops.on("mouseout", function() {
    mouseover.attr("visibility","hidden");
    frame.attr("visibility","hidden");
  });


} // END OF requestData() function


// Create a function to count number of jobs in each city
async function CityFrequency(job_types, state) {
  let data;

  let all_jobs_data = await d3.csv("Dataset/final_dataset.csv", d3.autoType);
//   console.log("All Jobs Data: ", all_jobs_data);

  // filter out Business Analyst, Data Analyst, and Data Scientist jobs data separately
  let business_analyst = d3.filter(all_jobs_data, d => (d.Position === 1));
//   console.log("Business Analyst: ", business_analyst);
  let data_analyst = d3.filter(all_jobs_data, d => (d.Position === 2));
//   console.log("Data Analyst: ", data_analyst);
  let data_scientist = d3.filter(all_jobs_data, d => (d.Position === 3));
//   console.log("Data Scientist: ", data_scientist);

  if (job_types === "business-analyst"){
    data = business_analyst;
  }
  else if (job_types === "data-analyst"){
    data = data_analyst;
  }
  else if (job_types === "data-scientist"){
    data = data_scientist;
  }
  else if (job_types === "All"){
    data = all_jobs_data;
  }

  // Filter all data points in the given state location
  let state_data = d3.filter(data, d => (d.state === state));
  // Find all cities in state_data
  let cities = d3.map(state_data, d => d.city);
  // Keep the unique values in cities
  cities = cities.filter((x, i, a) => a.indexOf(x) == i);

  // create an array to record number of jobs in each city
  var job_count = new Array();
  // loop over each cities to find # of jobs available
  cities.forEach(c => {
    new_dict = {};
    let jobs = d3.filter(state_data, d => (d.city === c));
    new_dict['city'] = c;
    new_dict['number_jobs'] = jobs.length;

    // append the result to job_count array;
    job_count.push(new_dict);
  })

  return job_count;
}
