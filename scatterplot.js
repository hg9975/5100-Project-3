const ssvg = d3.select("svg#scatterplot");
const swidth = ssvg.attr("width");
const sheight = ssvg.attr("height");
const smargins = {top:20, right:20, bottom:80, left:80};
const schartwidth = swidth-smargins.right-smargins.left;
const schartheight = sheight-smargins.top-smargins.bottom;

let sannotations, schartArea, jobs;

// Create a colorScale
//const scolorScale = d3.scaleOrdinal(d3.schemeSet1).domain(['Business Analyst', 'Data Analyst', 'Data Scientist']);
const scolorScale = d3.scaleOrdinal().domain(['Business Analyst', 'Data Analyst', 'Data Scientist'])
                                            .range( ['rgb(255, 160, 82)', 'rgb(44, 127, 184)','rgb(98, 189, 128)'] );
// Append Job Types to allow users to select a specific job type
let colorDomain = scolorScale.domain();

const slegend = d3.select("svg#slegend");

jobs = slegend.append("g").attr("id","jobs");

jobs.append("text")
        .attr("id", "All")
        .attr("class","slegend")
        .attr("x",5)
        .attr("y",10)
        .text("Show All Jobs")
        .style("font-size","20px")
        .attr("alignment-baseline","middle")
    .on("mouseover",function() {
    d3.selectAll('circle.points')
            .style("opacity",0.5)
    });

for (let i=0; i<colorDomain.length; i++) {
    jobs.append("circle")
            .attr("id", colorDomain[i])
            .attr("class","slegend")
            .attr("cx",10+250*i)
            .attr("cy",46)
            .attr("r",5)
            .style("fill", d => scolorScale(colorDomain[i]));
    jobs.append("text")
            .attr("id", colorDomain[i])
            .attr("class","slegend")
            .attr("x",10+250*i+10)
            .attr("y",46)
            .text(colorDomain[i])
            .style("font-size","20px")
            // .style("fill", d => colorScale(colorDomain[i]))
            .attr("alignment-baseline","middle")

};


// initialize the graph
var salary_selected = d3.select("input").property("value");
// console.log(salary_selected);
drawPlot(salary_selected, "All");

// update the plot based on the selected salary type
d3.selectAll("input").on("change", function(){

    schartArea.selectAll("circle.points").remove();
    sannotations.remove();
    salary_selected = d3.select(this).property("value");

    drawPlot(salary_selected, "All");

})

// Create a function to remove duplicate companies
// and compute average salary for each company
async function avgSalary( job_type ){

    let data;

    let all_jobs_data = await d3.csv("Dataset/final_dataset.csv", d3.autoType);

    // filter out Business Analyst, Data Analyst, and Data Scientist jobs data separately
    let business_analyst = d3.filter(all_jobs_data, d => (d.Position === 1));
    let data_analyst = d3.filter(all_jobs_data, d => (d.Position === 2));
    let data_scientist = d3.filter(all_jobs_data, d => (d.Position === 3));

        if (job_type=== "Business Analyst"){
    data = business_analyst;
    }
    else if (job_type === "Data Analyst"){
    data = data_analyst;
    }
    else if (job_type === "Data Scientist"){
    data = data_scientist;
    }

    // find out all unique company names
    let companies = d3.map(data, d => d['Company Name']);
    companies = companies.filter((x, i, a) => a.indexOf(x) == i);
    // console.log("Companies: ", companies);

    //
    // Compute the average salary for each company
    //
    // STEP 1: initiate an array to hold results
    let avg_salary = new Array();
    // STEP 2: loop over companies array
    companies.forEach( c => {
        let temp_dict = {};
        // filter all data belonging to the company c
        let c_data = d3.filter(data, d => ( d['Company Name'] === c) );
        // get all lower_salary & higher_salary & rating
        let lower_salary = d3.map(c_data, d => d['lower_salary']);
        let higher_salary = d3.map(c_data, d => d['higher_salary']);
        let rating = d3.map(c_data, d => d['Rating']);
        // compute the mean value for lower_salary, higher_salary, and rating
        let avg_low = d3.mean(lower_salary);
        let avg_high = d3.mean(higher_salary);
        let avg_rating = d3.mean(rating);
        // get company information
        let year = c_data[0]['Founded'];
        let industry = c_data[0]['Sector'];
        let size = c_data[0]['Size'];
        let city = c_data[0]['city'];

        // put all information into the temp_dict
        temp_dict['Job Type'] = job_type;
        temp_dict['Company'] = c;
        temp_dict['Founded'] = year;
        temp_dict['City'] = city;
        temp_dict['Size'] = size;
        temp_dict['Industry'] = industry;
        temp_dict['Rating'] = avg_rating;
        temp_dict['Average Starting Salary'] = avg_low;
        temp_dict['Average Maximum Salary'] = avg_high;

        // append the temp_dict to avg_salary Array
        avg_salary.push(temp_dict);
    })

    return avg_salary;

}

// Create a function to call corresponding avgSalary() function
// Add Plot the scatterplot

async function drawPlot( salary_selected, job_selected ) {

    let data;
    let salaryExtent, salaryScale;

    let business_analyst = await avgSalary("Business Analyst");
    let data_analyst = await avgSalary("Data Analyst");
    let data_scientist = await avgSalary("Data Scientist");

    let all_jobs = business_analyst.concat(data_analyst);
    all_jobs = all_jobs.concat(data_scientist);

    sannotations = ssvg.append("g").attr("id","annotations");
    schartArea = ssvg.append("g").attr("transform",`translate(${smargins.left},${smargins.top})`);

    // Create the corresponding salaryScale
    if ( job_selected === "All" ){
        data = all_jobs;
    }
    else if ( job_selected === "Business Analyst" ){
        data = business_analyst;
    }
    else if ( job_selected === "Data Analyst" ){
        data = data_analyst;
    }
    else if ( job_selected === "Data Scientist" ){
        data = data_scientist;
    }
    // filtering out data with negative rating points
    data = d3.filter(data, d => (d['Rating'] >= 1));
    // only keep company with size >= 10000
    data = d3.filter(data, d => (d['Size'] === "10000+ employees"));
    // console.log("Data: ", data);

    if (salary_selected === "Starting Salary") {
        salaryExtent = d3.extent(data, d => d['Average Starting Salary']);
        salaryScale = d3.scaleLinear().domain([salaryExtent[0]-2000, salaryExtent[1]+2000]).range([0,schartwidth]);
    }
    else if (salary_selected === "Maximum Salary") {
        salaryExtent = d3.extent(data, d => d['Average Maximum Salary']);
        salaryScale = d3.scaleLinear().domain([salaryExtent[0]-2000, salaryExtent[1]+2000]).range([0,schartwidth]);
    }

    const ratingExtent = d3.extent(data, d => d['Rating']);
    const ratingScale = d3.scaleLinear().domain(ratingExtent).range([schartheight,0]);

    // Draw y-axis and y-gridlines
    let leftAxis = d3.axisLeft(ratingScale);
    let leftGridlines = d3.axisLeft(ratingScale)
                            .tickFormat('')
                            .tickSize(-schartwidth);

    sannotations.append("g")
                .attr("class","y axis")
                .attr("transform",`translate(${smargins.left},${smargins.top})`)
                .call(leftAxis);

    sannotations.append("g")
            .attr("class","y gridlines")
            .attr("transform",`translate(${smargins.left},${smargins.top})`)
            .call(leftGridlines);

    sannotations.append("g")
                .attr("transform",`rotate(-90) translate(${-schartheight/2},30)`)
                .append("text")
                .style("text-anchor","middle")
                .style("fill","black")
                .text("Company Rating (1-5)");

    let bottomAxis = d3.axisBottom(salaryScale)
    let bottomAxisG = sannotations.append("g")
                                .attr("class", "x axis")
                                .attr("transform",`translate(${smargins.left},${schartheight+smargins.top+10})`)
                                .call(bottomAxis);


    let bottomAxisLabel = sannotations.append("g")
            .attr("transform",`translate(${(schartwidth/2)+smargins.left},${(schartheight+smargins.top+60)})`)
            .append("text")
            .style("text-anchor","middle")
            .style("fill","black")
            .text(salary_selected + " ($)");

    // use data join to draw points
    let scatter = schartArea.selectAll("g,scatterpoints")
                                        .data(data)
                                        .join("g")
                                        .attr("class","catterpoints");

    if (salary_selected === "Starting Salary") {
        circles = scatter.append("circle")
                                        .attr("class","points")
                                        .attr("cx", d => Math.floor(salaryScale(d['Average Starting Salary']) + jitter() ) )
                                        .attr("cy", d => Math.floor(ratingScale(d['Rating']) + jitter() ) )
                                        .attr("r",5)
                                        .style("fill", d => scolorScale(d['Job Type']) )
                                        .style("opacity",0.6);
    }
    else if (salary_selected === "Maximum Salary") {
        circles = scatter.append("circle")
                                        .attr("class","points")
                                        .attr("cx", d => Math.floor(salaryScale(d['Average Maximum Salary']) + jitter() ) )
                                        .attr("cy", d => Math.floor(ratingScale(d['Rating']) + jitter() ) )
                                        .attr("r", 5)
                                        .style("fill", d => scolorScale(d['Job Type']) )
                                        .style("opacity",0.6);
    }

    // Add mouseover event for jobs text
    let type_selected = d3.selectAll("text.slegend");
    type_selected.on("mouseover", function(){
        d3.select(this)
        .attr('cursor','pointer')
        .style("fill","rgb(44, 127, 184)");




    })
    type_selected.on("click", function(){
        d3.select(this)
        .attr('cursor','pointer')
        .style("fill","rgb(44, 127, 184)");




        // get the id for the selected text
        let id = d3.select(this).attr("id");
        // console.log(id);
        let salary_type = d3.select("input").property("value");

        // remove pre-existing circles
        schartArea.selectAll("circle.points").remove();
        sannotations.remove();

        // update the plot based on corresponding job type selected
        drawPlot( salary_type, id );

    })


    type_selected.on("mouseout", function(){
        d3.select(this)

        .style("fill","black");})


    //
    // Create a jilter function
    //
    function jitter() {
        return (Math.random()*12-6);
    }

    // Add mouseover events for dots

    const box = d3.select("svg#box");
    const width2 = box.attr("width");
    const height2 = box.attr("height");
    const margins2 = {top:10, right:10, bottom:10, left:10};
    const boxWidth = width2-margins2.left-margins2.right;
    const boxHeight = height2-margins2.top-margins2.bottom;

    const mouseover = box.append("g").attr("class","mouseover")
                        .attr("transform",`translate(${margins2.left},${margins2.top})`);

    const frame = mouseover.append("rect").attr("class","frame")
                            .attr("x",0)
                            .attr("y",0)
                            .attr("rx",5)
                            .attr("ry",5)
                            .attr("height",160)
                            .attr("width",boxWidth)
                            .attr("visibility","hidden");
    const format = d3.format('.3s');

    const textbox = mouseover.append("g").attr("transform","translate(10,10)");

    function updateMouseover(d) {

        textbox.html('');
        let company = `${d['Company']}`;
        let year = `Founded in ${d['Founded']}`;
        let type = `Job Type: ${d['Job Type']}`;
        let rating = `Rating: ${format(d['Rating'])}`;
        let industry = `Industry: ${d['Industry']}`;
        let lower = d['Average Starting Salary'];
        let higher = d['Average Maximum Salary'];
        let salary_range = `Salary Range: $${format(lower)} - $${format(higher)}`;

        textbox.append("text").text(company).attr("id","title")
                        .attr("x",0).attr("y",20);
        textbox.append("text").text(year).attr("id","year")
                        .attr("x",0).attr("y",37);
        textbox.append("text").text(rating).attr("id","description")
                        .attr("x",0).attr("y",70);
        textbox.append("text").text(type).attr("id","description")
                    .attr("x",0).attr("y",90);
        textbox.append("text").text(industry).attr("id","description")
                        .attr("x",0).attr("y",110);
        textbox.append("text").text(salary_range).attr("id","description")
                        .attr("x",0).attr("y",130);

    }

    circles.on("mouseover", function(d) {
        d3.select(this)
            .transition().duration(150)
            .attr("r", 8)
            .style("opacity", 1)
            .attr("stroke-width", 4)
            .style("stroke-opacity",0.58)
            .style("stroke", "black");

        mouseover.attr("visibility","");
        frame.attr("visibility","");
        updateMouseover( d3.select(this).datum() );
    })

    circles.on("mouseout", function() {
        d3.select(this)
            .transition().duration(50)
            .attr("r", 5)
            .style("opacity", 0.5)
            .attr("stroke-width", 0);

        mouseover.attr("visibility","hidden");
        frame.attr("visibility","hidden");
    })

}
