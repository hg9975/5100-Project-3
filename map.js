// choropleth setup
const mapsvg = d3.select("#choropleth");
const mwidth = mapsvg.attr("width");
const mheight = mapsvg.attr("height");
const mapmargin = { top: 0, right: 80, bottom: 85, left:40};
const mapWidth = mwidth - mapmargin.left - mapmargin.right;
const mapHeight = mheight - mapmargin.top - mapmargin.bottom;
const map = mapsvg.append("g")
                .attr("transform","translate("+mapmargin.left+","+mapmargin.top+")");

// legend setup
const maplegend = d3.select("svg#maplegend");
const lWidth = maplegend.attr("width");
const lHeight = maplegend.attr("height");
const legendMargin = {top:0, right: 15, bottom: 18, left:5}
const legendWidth = lWidth - legendMargin.left - legendMargin.right;
const legendHeight = lHeight - legendMargin.top - legendMargin.bottom;
const legend = maplegend.append("g")
                        .attr("transform","translate("+legendMargin.left+","+legendMargin.top+")");


//
// Create a function to load data
//
async function maprequestData(){

  // load map data
  const usstates = await d3.json("Dataset/us-smaller.json");
  // load state - abbreviations - FIPS code mapping data
  let idMap = await d3.csv("Dataset/us-state-names.csv");
  idMap.forEach(d => {d.id = Number(d.id)});

  // load job data
  let jobData = await d3.csv("Dataset/final_dataset.csv");
  jobData.forEach(d => {
    d.Rating = Number(d.Rating);
    d.higher_salary = Number(d.higher_salary);
    d.lower_salary = Number(d.lower_salary);
  })

  let stateId = (statename) => {
      let index = idMap.map(state => state.name).indexOf(statename)
      return idMap[index].id
  }

  // Create an array to hold graph data
  const options = ['all', 'ba', 'da', 'ds'];
  let dataByStates = []
  options.forEach( d => {
      if( d == 'all') {
          data = jobData
      } else if ( d == 'ba') {
          data = jobData.filter(d => d.Position == '1')
      } else if ( d == 'da') {
          data = jobData.filter(d => d.Position == '2')
      } else {
          data = jobData.filter(d => d.Position == '3')
      }

      let total = data.length
      let uniqueStates = jobData.map(d => d.state_full).filter((value, index, self) => self.indexOf(value) === index)
      uniqueStates.forEach(n => {
      let jobNum = data.filter(d => d.state_full === n).length
      let id = stateId(n);
      let cities = topCities(n,data).toString()
      let object = {'position': d, 'state' : n, '# of job listing' : jobNum, '% of job listing': jobNum/total, 'id': id, 'top cities': cities.replaceAll(",", ", ")}
      dataByStates.push(object);
      })
  })
  console.log("Data by State: ", dataByStates);

  // Map Setup
  const states = topojson.feature(usstates, usstates.objects.states);
  const stateMesh = topojson.mesh(usstates, usstates.objects.states);
  const projection = d3.geoAlbersUsa().fitSize([mapWidth, mapHeight], states);
  const path = d3.geoPath().projection(projection);
  const graticule = d3.geoGraticule10();

  map.append("path")
      .attr("class","graticule")
      .attr("d",path(graticule));

  //
  // initialize graph
  //
  updateData('all');

  // select dropdown menu to change dataset
  d3.select("#select-position").on("change", function(){
    var option = d3.select(this).property("value");
    updateData(option);
  })

  //
  // Create a function to update the graph based on dropdown value
  //
  function updateData(option) {

    let mapData = dataByStates.filter(d => d.position == option && d['# of job listing'] > 0);

    // generate dic for job listing values
    let stateIdCounts = {}
    let stateIdNames = {}
    let stateIdPercentage = {}
    let stateIdTopCities = {}
    mapData.forEach( d => {
        stateIdCounts[d.id] = d['# of job listing'];
        stateIdNames[d.id] = d['state'];
        stateIdPercentage[d.id] = d['% of job listing'];
        stateIdTopCities[d.id] = d['top cities'];
    })

    // Draw the map based on dictionaries
    map.selectAll("path.state")
    .data(states.features)
    .join("path")
    .attr("class", "state")
    .attr("d", path)
    .attr("fill", "#ffffff");

    map.append("path")
    .datum(stateMesh)
    .attr("class", "stateoutline")
    .attr("d", path);

    // Create colorScale for map
    const mcolorScale = d3.scaleQuantile()
                    .domain(Object.values(stateIdCounts))
                    .range(["#ffffcc","#a1dab4","#41b6c4","#2c7fb8"]);
    map.selectAll(".state")
       .style("fill", d => mcolorScale( stateIdCounts[d.id]) );

    // Draw Color Legends for the map
    // clear legend before drawing new legend
    legend.selectAll(".axis").remove();

    // draw legend
    let colorScaleMixMax = d3.extent(mcolorScale.domain());
    let colorScaleQuantiles = mcolorScale.quantiles();
    let colorScaleAll = colorScaleQuantiles.concat(colorScaleMixMax).sort(function(a, b){return a - b});
    // call function to draw legends
    quantileLegend(colorScaleAll, mcolorScale);

    // highlight boarder when hover
    let mouseoverMesh = map.append("path")
                        .attr("class", "mouseover outline")
                        .attr("d", "");
    //
    // Set up tooltip area for mouseover events
    //
    // add tooltip
    let tooltipWidth = 290;
    let tooltipHeight = 100;

    let tooltip = map.append("g")
                    .attr("class","tooltip")
                    .attr("visibility","hidden");

    tooltip.append("rect")
        .attr("fill", "white")
        .attr('stroke',"black")
        .attr("opacity", 1)
        .attr("x", -tooltipWidth/2)
        .attr("y", 0)
        .attr("width", tooltipWidth)
        .attr("height", tooltipHeight)
        .attr("rx", 10);

    let txt = tooltip.append("text")
                    .attr("id", "state")
                    .attr("fill", "black")
                    .attr("text-anchor", "middle")
                    .attr("alignment-baseline", "hanging")
                    .attr("x", 0)
                    .attr("y", 10);

    let txt2 = tooltip.append("text")
                    .attr("fill", "black")
                    .attr("text-anchor", "middle")
                    .attr("alignment-baseline", "hanging")
                    .attr("x", 0)
                    .attr("y", 57);

    let txt3 = tooltip.append("text")
                    .attr("fill", "black")
                    .attr("text-anchor", "middle")
                    .attr("alignment-baseline", "hanging")
                    .attr("x", 0)
                    .attr("y", 77);

    let txt4 = tooltip.append("text")
                    .attr("id", "city")
                    .attr("fill", "black")
                    .attr("text-anchor", "middle")
                    .attr("alignment-baseline", "hanging")
                    .attr("x", 0)
                    .attr("y", 35);

    let stateArea = d3.selectAll(".state");

    // Create mouseon & mouseout functions for mouseover events
    stateArea.on("mouseenter", function mouseEntersMap(){
      tooltip.style("visibility", "visible");

      let state = d3.select(this);
      let stateID = state.datum().id;

      if (stateIdNames[stateID] === undefined) {
          txt.text(idMap.find(d => d.id === stateID).name);
          txt2.text("No job listing.");
          txt3.text("");
          txt4.text("");
      }
      else {
          let percentage = parseFloat(stateIdPercentage[stateID]*100).toFixed(2)+"%";

          txt.text(stateIdNames[stateID]);
          txt2.text(`# of job listing: ${stateIdCounts[stateID]}`);
          txt3.text(`% of job listing: ${percentage}`);
          txt4.text(`${stateIdTopCities[stateID]}`);
      }

      let bounds = path.bounds( state.datum() );
      let tooltipX = (bounds[0][0]+bounds[1][0])/2.0;
      let tooltipY = bounds[1][1] - 15;
      tooltip.attr("transform",`translate(${tooltipX},${tooltipY})`);

      var mo = topojson.mesh(usstates, usstates.objects.states, function(a, b) { return a.id === stateID || b.id === stateID });
      mouseoverMesh.datum(mo)
              .attr("d", path)
              .attr("stroke-width", 3)
              .attr("stroke", "#4d4d4d")
              .attr("fill", "none");

    })

    stateArea.on("mouseout", function mouseLeavesMap(){
      tooltip.style("visibility", "hidden");
      mouseoverMesh.attr("d", "");
    })


  } // END of updateData() function


} // END of maprequestData()
maprequestData();

//
// Create a function to draw legend
//
function quantileLegend(Threshold, colorScale) {
    let barScale = d3.scaleLinear().domain(d3.extent(Threshold)).range([legendMargin.left,legendWidth])
    let legendAxis = d3.axisBottom(barScale);
    legendAxis.tickValues(Threshold);
    let legendLine = d3.axisBottom(barScale).tickFormat("").tickSize(-legendHeight);
    legendLine.tickValues(Threshold);

    legend.append("g")
          .attr("class", "colorlegend axis")
          .attr("transform", `translate(0,${legendHeight})`)
          .call(legendAxis)
          .call(g => g.select(".domain").remove())

    for (i=0; i < Threshold.length-1; i++) {
        legend.append("rect")
        .attr("x", barScale(Threshold[i]))
        .attr("y", legendMargin.top)
        .attr("width", barScale(Threshold[i+1])-barScale(Threshold[i]))
        .attr("height", legendHeight-1)
        .attr("fill", colorScale(Threshold[i]+1))
    }

    legend.append("g")
        .attr("class", "colorlegend axis")
        .attr("transform", `translate(0,${legendHeight})`)
        .call(legendLine)
        .call(g => g.select(".domain").remove())

} // END of quantileLegend() function

//
// Create a function to get the top 3 cities with the most job positions
//
function topCities(state, data) {
    let stateData = data.filter(d => d.state_full == state);
    let uniqueCities = stateData.map(d => d.city).filter((value, index, self) => self.indexOf(value) === index)
    let cityArr = []
    uniqueCities.forEach(n => {
        let cityCount = data.filter(d => d.city == n).length
        let topCities = {'city': n, 'cityCount': cityCount}
        cityArr.push(topCities);
    })
    cityArr.sort((a,b) => d3.descending(a.cityCount, b.cityCount));
    let topCities = cityArr.slice(0,3).map(a => a.city);
    return topCities;
}
