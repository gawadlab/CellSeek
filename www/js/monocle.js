/*******
 * 
 *  Fill in monocle_div with nodes and edges, add buttons and associated functions, and set up zooming.
 *
 *
 *******/
function update_monocle_div(selected_group_name)  {
  //setup the div
  
  if('error' in global_data['group_analysis'][selected_group_name]['monocle'])  {
    var monocle_div = d3.select("#monocle_div > div.panel-body");
    monocle_div.select('div')
      .remove();
    monocle_div
      .append('text')
      .transition(1000)
      .attr('font-size', 24)
      .attr('text-anchor', 'middle')
      .text("Server Error, likely due to dispersion estimation. Please select a different set of cells and try again.");
    return(true);
  }

  var color = d3.scaleOrdinal(d3.schemeCategory20);
	var nodes = global_data['group_analysis'][selected_group_name]['monocle']['nodes'];
  //var nodes = HTMLWidgets.dataframeToD3();
  var edges = global_data['group_analysis'][selected_group_name]['monocle']['edges'];
  var branch_points = global_data['group_analysis'][selected_group_name]['monocle']['branch_points'];

  var unique_states = Array.from(new Set(nodes['state']));
  d3.select("#monocle_div > div.panel-body > div.loader")
    .remove();

  var radius = 4, margin = 10;
  var width = $("#monocle_div").width();
  var height = $("#monocle_div").height() - $("#monocle_div > .panel-heading").height() - 20;

  $("#monocle_div > div.panel-body").append(button_html);
  
  var legend_width = 100, canvas_width = width - legend_width;

  console.log('1');

  var monocle_svg = d3.select("#monocle_div > div.panel-body")
    .append('svg')
    .attr('id', 'monocle_svg')
    .style('height', height + "px")
    .style('width', width + "px");
  
  var color = d3.scaleOrdinal(d3.schemeCategory20);
	
	var cell_nodes_canvas = monocle_svg.append('g')
    .classed('nodes', true)
    .attr('id', 'cell_nodes');

	var branch_points_canvas = monocle_svg.append('g')
    .classed('nodes', true)
    .attr('id', 'branch_point_nodes');
		//.attr("transform", "translate(" + margin + "," + margin + ")");
	
	var monocle_xScale = d3.scaleLinear() .domain([d3.min(nodes['x']), d3.max(nodes['x'])])
		.range([ 0, canvas_width]);

	var monocle_yScale = d3.scaleLinear()
		.domain([d3.min(nodes['y']), d3.max(nodes['y'])])
		.range([ height, 0 ]);

	var xAxis = d3.axisBottom(monocle_xScale);
	var yAxis = d3.axisLeft(monocle_yScale);
    
  console.log('2');

	cell_nodes_canvas
    .selectAll('circle')
		.data(HTMLWidgets.dataframeToD3(nodes))
    .enter()
    .append('circle')
    .sort(function(a,b)  {
      if(a['pseudotime'] < b['pseudotime'])  {
        return(-1);
      }
      if(a['pseudotime'] > b['pseudotime'])  {
        return(1);
      }
      else  {
        return(0);
      }
    })
    .attr("r" , function(d,i)  {
        return(radius);
    })
    .attr('cx', function(d)  {return(monocle_xScale(d.x));}) 
    .attr('cy', function(d)  {return(monocle_yScale(d.y));})
    .on('click', function(d,i)  {
      reroot_monocle_tree(d['state']);
    });
    
  var circles = branch_points_canvas
    .selectAll('circle')
		.data(HTMLWidgets.dataframeToD3(branch_points), function(d,i)  {return(d['branch_point_id']);})
    .enter()
    .append('circle')
    .attr("r" , function(d,i)  {
        return(radius + 5);
    })
    .attr('cx', function(d)  {return(monocle_xScale(d.x));}) 
    .attr('cy', function(d)  {return(monocle_yScale(d.y));})
    .attr("fill", 'blue');
  circles
    .on('click', function(d,i)  {
      var e = d;
      var sel = circles
        .data([e], function(d,j) {return(d['branch_point_id']);});
      d3.select(this)
        .classed('selected', true)
        .transition(1000)
        .style("fill", "red")
        .each(function()  {console.log("FOO!");});
      d3.select('#monocle_div')
        .select("button.disabled")
        .classed('disabled', false);
      sel.exit()
        .classed('selected', false)
        .transition(1000)
        .style("fill", "blue")
        .each(function()  {console.log("bar!");});
    })
    .on('mouseover', function()  {
      d3.select(this).transition(1000).attr('r', radius + 10);
    })
    .on('mouseleave', function()  {
      d3.select(this).transition(1000).attr('r',radius + 5);
    });

  console.log('3');

  branch_points_canvas
    .selectAll('text')
		.data(HTMLWidgets.dataframeToD3(branch_points))
    .enter()
    .append('text')
    .attr('x', function(d)  {return(monocle_xScale(d.x) - 5);}) 
    .attr('y', function(d)  {return(monocle_yScale(d.y) + 5);})
    .text(function(d,i)  {
      return(d['branch_point_id']);
    })
		.attr('fill', 'white');

  
  //Add color scales and other code for component
  var state_colors = [];
  for(i=0; i<unique_states.length; i++)  {
    state_colors.push(d3.interpolateBlues((i+1)/unique_states.length));
  }
  state_colorscale  = d3.scaleOrdinal()
    .domain(unique_states.sort())
    .range(state_colors);

  pseudotime_scale = d3.scaleLinear()
    .domain([0, d3.max(nodes['pseudotime'])])
    .range([0,1]);

  var active_scatter_type = get_active_scatter_type();
  var selected_type = active_scatter_type['selected_type'];
  console.log("Selected type: " + selected_type);

  var monocle_buttons = d3.select("#monocle_buttons");
  monocle_buttons
    .select("#selected_monocle_button")
    .text(selected_type);
  monocle_buttons
    .select(".dropdown-menu")
    .append('li')
    .append('a') 
    .attr("id", function()  {
      if(selected_type == "Gene")  {
        return("gene_button");
      }
      else  {
        return("subgroup_button");
      }
    })
    .text(selected_type);

  var zoom = d3.zoom()
    .scaleExtent([0.5,4])
    .on('end', rescale_monocle_image);
    //.on('zoom', cor_zoomed)
    //.on('start', cor_clicked)

  monocle_svg.call(zoom);

  console.log('4');

  function rescale_monocle_image()  {
    console.log("rescaling monocle image!");
    console.log(d3.event.transform);
    var temp_monocle_xScale = d3.event.transform.rescaleX(monocle_xScale);
    var temp_monocle_yScale = d3.event.transform.rescaleY(monocle_yScale);
    cell_nodes_canvas
      .selectAll('circle')
      .attr('cx', function(d,i)  {
        return(temp_monocle_xScale(d['x']));
      })
      .attr('cy', function(d,i)  {
        return(temp_monocle_yScale(d['y']));
      })
      .attr('cx', function(d,i)  {
        return(temp_monocle_xScale(d['x']));
      })
      .attr('cy', function(d,i)  {
        return(temp_monocle_yScale(d['y']));
      });
    branch_points_canvas
      .selectAll('circle')
      .attr('cx', function(d,i)  {
        return(temp_monocle_xScale(d['x']));
      })
      .attr('cy', function(d,i)  {
        return(temp_monocle_yScale(d['y']));
      })
      .attr('cx', function(d,i)  {
        return(temp_monocle_xScale(d['x']));
      })
      .attr('cy', function(d,i)  {
        return(temp_monocle_yScale(d['y']));
      });
    branch_points_canvas
      .selectAll('text')
      .attr('x', function(d,i)  {
        return(temp_monocle_xScale(d['x']) - 5);
      })
      .attr('y', function(d,i)  {
        return(temp_monocle_yScale(d['y']) + 5);
      });
  }

  add_button_code();

  add_monocle_listeners();

  update_monocle_gene_or_subgroup_data();

  recolor_monocle_plot(d3.select("#monocle_buttons").select("#selected_monocle_button").text());

  $("#monocle_div div.panel-body").append(branched_monocle_heatmap_modal_html);
  $("#monocle_div div.panel-body").append(linear_monocle_heatmap_modal_html);

  var defs = monocle_svg
    .append("defs");
  var pseudotime_linearGradient = defs.append("linearGradient")
    .attr("id", "pseudotime_linear-gradient");
  pseudotime_linearGradient
      .attr("x1", "0%")
      .attr("y1", "100%")
      .attr("x2", "0%")
      .attr("y2", "0%");

  pseudotime_linearGradient.append("stop") 
    .attr("offset", "0%")   
    .attr("stop-color", d3.interpolateBlues(0.0)); 
  
  pseudotime_linearGradient.append("stop") 
    .attr("offset", "50%")   
    .attr("stop-color", d3.interpolateBlues(0.5)); 

  pseudotime_linearGradient.append("stop") 
    .attr("offset", "100%")   
    .attr("stop-color", d3.interpolateBlues(1.0)); 

  function update_monocle_legend(type)  {
    var current_legend_g = d3.select('#monocle_svg')
      .select(".legend");
    var active_scatter_object = get_active_scatter_type();
    var current_scatter_type = d3.select("#selected_monocle_button").text();
    if(current_legend_g.empty() || (current_legend_g.attr('id') !== current_scatter_type))  {
      current_legend_g
        .classed('in', false)
        .classed('out', true)
        .remove();
      var current_legend_g = d3.select('#monocle_svg')
        .append('g')
        .attr('id', current_scatter_type)
        .attr('transform', 'translate(' + (monocle_xScale.range()[1] + 20) + ', ' + 5 + ')')
        .attr("width", d3.select('#monocle_svg').attr('width') - monocle_xScale.range()[1])
        .attr("height", d3.select('#monocle_svg').attr('height') - 5)
        .classed('legend', true);
      if(current_scatter_type == 'Pseudotime')  {
        current_legend_g
          .append('g')
          .attr('id', 'pseudotime_triangle')
          .append('path')
          .attr('d', 'M0 15 h 35 v 200 L 0 15')
          .style("fill", "url(#pseudotime_linear-gradient)")
          .style('stroke', 'black');

        current_legend_g
          .append('g')
          .attr('id', 'pseudotime_triangle_labels')
          .selectAll('text')
          .data([{'pseudotime':0.0, 'ypos':215}, {'pseudotime':0.5, 'ypos':117}, {'pseudotime':1.0, 'ypos':25}])
          .enter()
          .append('text')
          .attr('x', 40)
          .attr('y', function(d,i)  {return(d['ypos']);})
          .text(function(d,i)  {return(d['pseudotime']);})
          .attr('font-size', 12);
      }
    }
  }

  console.log('5');

  function add_button_code() {
    d3.selectAll("#monocle_buttons ul > li > a")
    .on('click', function(d, i)  {
      var subgroup = this.innerHTML;
      d3.select("#monocle_buttons").select("#selected_monocle_button").text(subgroup);
      console.log("monocle button that is pressed: ", subgroup);
      recolor_monocle_plot(subgroup);
      update_monocle_legend();
    });
  }

}

var button_html = `
  <div id="monocle_buttons" style="padding:20px; z-index:100; position:absolute;"> 
    <div class="btn-group">
      <a id="selected_monocle_button" "href="#" class="btn btn-default">Pseudotime</a>
      <a href="#" class="btn btn-default dropdown-toggle" data-toggle="dropdown" aria-expanded="false"><span class="caret"></span></a>
      <ul class="dropdown-menu">
        <li><a id="Pseudotime_button">Pseudotime</a></li>
        <li><a id="root_state_button">Root State</a></li>
      </ul>
    </div>
  </div>`;

function recolor_monocle_plot(color_variable)  {
  var cell_nodes_selection = d3.select('#monocle_svg')
    .select("#cell_nodes")
    .selectAll('circle');

  if(color_variable == 'Pseudotime')  {
    console.log("pseudotime selected!!!");
    cell_nodes_selection
      .each(function(d,i)  {
        d['fill_color'] = d3.interpolateBlues(pseudotime_scale(d['pseudotime']));
      });
  }
  else if(color_variable == 'Root State')  {
    console.log("root state selected!!!");
    cell_nodes_selection
      .each(function(d,i)  {
        d['fill_color'] = state_colorscale(d['state']);
      });
  }
  else if(['Subgroup', 'Gene'].includes(color_variable))  {
    var pheno_rows_selected = d3.select("#subgroup_table")
      .selectAll('tr.selected');

    var gene_rows_selected = d3.select("#gene_table")
      .selectAll('tr.selected');

    if(gene_rows_selected.empty() && (pheno_rows_selected.empty() == false))  {
      var subgroup_name = pheno_rows_selected
        .selectAll('td')
        .filter(function(d,i)  {
          return(i == 1);
        })
        .text();
        
      cell_nodes_selection
        .each(function(d,i)  {
          d['fill_color'] = global_data['colors'][subgroup_name][d['val']];
        })
    }

    if(pheno_rows_selected.empty() && (gene_rows_selected.empty() == false))  {
      cell_nodes_selection
        .each(function(d,i)  {
          d['fill_color'] = d3.interpolateOrRd(d['val']/3);
        })
    } 

    else  {
      console.log("ARGH!!!!");
    }
  }
  cell_nodes_selection
    .transition(1000)
    .delay(function(d,i)  {return(i * 2);})
    .attr('fill', function(d,i)  {
      return(d['fill_color']);
    });
}

console.log('6');

function add_monocle_listeners() {
  d3.select("#monocle_svg > #cell_nodes").selectAll('circle')
    .each(function(d,i)  {
      var target_selection =  d3.select("#" + global_data['group_analysis']['Current Selection']['sample_name_to_hex_id'][d['sample_name']]);
      d['target_selection'] = target_selection;
      //console.log(d);
    })
    .on('mouseover', function(d,i)  {
      d['temp_color'] = d['target_selection'].style('fill');
      console.log(d);
      console.log('temp_color: ', d['temp_color']);
      d['target_selection']
        .transition(400)
        .style('fill', this.getAttribute("fill"));
    })
    .on('mouseleave', function(d,i)  {
      d['target_selection']
        .transition(400)
        .style('fill', d['temp_color']);
      delete d['temp_color'];
    });
}

console.log("beam modal html");

var branched_monocle_heatmap_modal_html = `
	<div class="modal fade" id="branched_monocle_heatmap_modal" role="dialog">
    <div class="modal-dialog modal-sm">
      <div class="modal-content">
        <div class="modal-header">
          <button type="button" class="close" data-dismiss='modal'></button>
          <h2>BEAM - Branched Heatmap</h2>
        </div>
        <div class="modal-body">
          <form role="form">
            <div class="form-group">
              <label for="max_genes">Max genes</label>
              <select name="max_genes" id="max_genes" class="form-control">
                <option value="10">10</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </div>
            <div class="form-group">
              <label for="qval_threshold">qval threshold</label>
              <select name="qval_threshold" id="qval_threshold" class="form-control">
                <option value="0.001">0.001</option>
                <option value="0.01">0.01</option>
                <option value="0.05">0.05</option>
              </select>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button type="submit" class="btn btn-default btn-success" data-dismiss="modal" onclick="process_beam_code('Branched')">Run BEAM</button> 
        </div>
      </div>
    </div>
  </div>
`;

var linear_monocle_heatmap_modal_html = `
	<div class="modal fade" id="linear_monocle_heatmap_modal" role="dialog">
    <div class="modal-dialog modal-sm">
      <div class="modal-content">
        <div class="modal-header">
          <button type="button" class="close" data-dismiss='modal'></button>
          <h2>MONOCLE - Linear Heatmap</h2>
        </div>
        <div class="modal-body">
          <form role="form">
            <div class="form-group">
              <label for="max_genes">Max genes</label>
              <select name="max_genes" id="max_genes" class="form-control">
                <option value="10">10</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </div>
            <div class="form-group">
              <label for="qval_threshold">qval threshold</label>
              <select name="qval_threshold" id="qval_threshold" class="form-control">
                <option value="0.001">0.001</option>
                <option value="0.01">0.01</option>
                <option value="0.05">0.05</option>
              </select>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button type="submit" class="btn btn-default btn-success" data-dismiss="modal" onclick="process_beam_code('Linear')">Run BEAM</button> 
        </div>
      </div>
    </div>
  </div>
`;


function process_beam_code(hm_type)  {
  console.log("processing beam code");
  if(hm_type === 'Linear')  {
    var max_genes = parseInt($("#linear_monocle_heatmap_modal #max_genes").val());
    var qval_threshold = parseFloat($("#linear_monocle_heatmap_modal #qval_threshold").val());
  }
  else if(hm_type === 'Branched') {
    var max_genes = parseInt($("#branched_monocle_heatmap_modal #max_genes").val());
    var qval_threshold = parseFloat($("#branched_monocle_heatmap_modal #qval_threshold").val());
  }
  else {
    console.log("Haven't handled this possibility");
  }
  //Remove the current row
  reset_groups("monocle_heatmap");


  console.log('7');

  var row = d3.select('#optional_div_attachment_parent')
    .append("div")
    .classed("row", true)
    .style("margin-bottom", 21)
    .attr("id", "monocle_heatmap_row")
    .style("height", "500px");

  append_warning_panel(row, header_title="Monocle Heatmap - " + hm_type, id="beam_heatmap_col", col_type = "col-lg-6")
    .select(".panel-body")
    .attr("id", "monocle_heatmap_div")
    .style('height', '100%')
    .append('div')
    .classed("loader", true)
    .classed("fade", true)
    .classed("out", false)
    .classed("in", true);
  target_branch_id = null;
  d3.selectAll("#branch_point_nodes circle.selected")
    .each(function(d,i)  {
      target_branch_id = d['branch_point_id'];
    });
  run_beam_and_request_heatmap({'branch_point':target_branch_id, 'qval_threshold':qval_threshold, 'max_genes':max_genes, 'hm_type':hm_type});
}



/*
*
*  Update the data within the monocle nodes
*
*  This function reads global_data['scatter'] and assigns the currently stored 'val' variable into the data array associated with each cell/point in the monocle plot 
*
*/
function update_monocle_gene_or_subgroup_data()  {
  var nodes_with_data_selection = d3.select("#monocle_svg > #cell_nodes")
    .selectAll('circle')
    .each(function(d,i)  {
        d['val']  = global_data['scatter']['val'][global_data['scatter']['sample_name_to_index'][d['sample_name']]]
    });
}

