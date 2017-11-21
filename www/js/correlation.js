function update_correlation_div(selected_group_name)  {
  //setup the div
  
  console.log("current group name:", selected_group_name);  
  var color = d3.scaleOrdinal(d3.schemeCategory20);
  var nodes = HTMLWidgets.dataframeToD3(global_data['group_analysis'][selected_group_name]['correlation']['nodes']);
  var edges = global_data['group_analysis'][selected_group_name]['correlation']['edges']
  //for(i=0; i<edges['source'].length; i++)  {
  //  edges['source'][i] = nodes[parseInt(edges['source'][i]) - 1]['id']
  //  edges['target'][i] = nodes[parseInt(edges['target'][i]) - 1]['id']
  //}
  edges = HTMLWidgets.dataframeToD3(edges);
  console.log("here are the nodes and edges");
  console.log(nodes)
  console.log(edges)
  //Change indices to 0-based from R's 1-based system
  
  var height = $("#correlation_div").height() - $("#correlation_div > .panel-heading").height() - 20, width = $("#correlation_div").width(), radius = 5;

  console.log("height:", height);
  console.log("width:", width);
  
  d3.select("#correlation_div > div.panel-body > div.loader")
    .remove();

  cor_xScale =d3.scaleLinear()
    .domain([0,750])
    .range([0, width]);

  cor_yScale =d3.scaleLinear()
    .domain([0,750])
    .range([0, height]);

  var cor_svg = d3.select("#correlation_div > div.panel-body")
    .append('svg')
    .attr('id', 'correlation_svg')
    .attr('height', height)
    .attr('width', width);

  var simulation = d3.forceSimulation()
    .force("link", d3.forceLink())
    .force("charge", d3.forceManyBody())
    .force("center", d3.forceCenter(width / 2, height / 2))

  var link = cor_svg.append("g")
    .attr("class", "links")
    .selectAll("line")
    .data(edges)
    .enter().append("line")
      .attr("stroke-width", 1);

  var node = cor_svg.append("g")
    .attr("class", "nodes")
    .selectAll("circle")
    .data(nodes, function(d)  {return(d['ensembl']);})
    .enter().append("circle")
    .attr("r", radius)
    .attr("fill", function(d) { return color(1); })

  var label = cor_svg.append("g")
    .attr("class", "labels")
    .selectAll("text")
    .data(nodes)
    .enter().append("text")
      .attr("class", "label")
      .text(function(d) { return d.id;});


  simulation
   .nodes(nodes)
   .on("tick", ticked);

  simulation.force("link")
    .id(function id(d)  {return(d.index);})
    .links(edges);

	function ticked() {
    link
      .attr("x1", function(d) { return cor_xScale(d.source.x); })
      .attr("y1", function(d) { return cor_yScale(d.source.y); })
      .attr("x2", function(d) { return cor_xScale(d.target.x); })
      .attr("y2", function(d) { return cor_yScale(d.target.y); });

    node
      .attr("cx", function(d) { return cor_xScale(d.x); })
      .attr("cy", function(d) { return cor_yScale(d.y); });
    label
      .attr("x", function(d) {return cor_xScale(d.x) + 8;})
      .attr("y", function (d) {return cor_yScale(d.y) + 3;})
      .style("font-size", 14).style("fill", "#000000");
  }

  node
    .on('click.exp', function(d,i)  {
      console.log("node selected!!!");
      select_gene_from_table(d['ensembl']);
    })
    .on('mouseover', function()  {
      d3.select(this).transition(1000).attr('r',10);
    })
    .on('mouseleave', function()  {
      d3.select(this).transition(1000).attr('r',5);
    })
    .on('click.color', function()  {
      var new_data = null;
      var current_selection = d3.select(this);
      var old_color = current_selection
        .style('fill');
      current_selection
        .each(function(d)  {
          new_data = [d];
        });
      var nodes = d3.select("#correlation_div > div.panel-body")
        .selectAll("circle")
        .data(new_data, function(d)  {return(d['ensembl'])});
      nodes
        .transition(1000)
        .style('fill', 'red');
      nodes
        .exit()
        .transition(1000)
        .style('fill', old_color);
    });

    
  var zoom = d3.zoom()
    .scaleExtent([0.5,4])
    .on('end', rescale_cor_image);
    //.on('zoom', cor_zoomed)
    //.on('start', cor_clicked)

  cor_svg.call(zoom);

  function rescale_cor_image()  {
    console.log("rescaling cor image!");
    console.log(d3.event.transform);
    var temp_cor_xScale = d3.event.transform.rescaleX(cor_xScale);
    var temp_cor_yScale = d3.event.transform.rescaleY(cor_yScale);
    link
      .attr("x1", function(d) { return temp_cor_xScale(d.source.x); })
      .attr("y1", function(d) { return temp_cor_yScale(d.source.y); })
      .attr("x2", function(d) { return temp_cor_xScale(d.target.x); })
      .attr("y2", function(d) { return temp_cor_yScale(d.target.y); });

    node
      .attr("cx", function(d) { return temp_cor_xScale(d.x); })
      .attr("cy", function(d) { return temp_cor_yScale(d.y); });
    label
      .attr("x", function(d) {return temp_cor_xScale(d.x) +8;})
      .attr("y", function (d) {return temp_cor_yScale(d.y) +3;});
  }
}
