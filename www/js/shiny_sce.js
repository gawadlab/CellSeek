Shiny.addCustomMessageHandler("receive_data_for_datatable", function(json_object)  {
	console.log("We've got data table info");
	console.log(json_object);
	d3.select("#gene_table")
		.append('table')
		.attr("id", 'gene_table_element');
	table = $("#gene_table_element")
			.DataTable({
				'data': HTMLWidgets.dataframeToD3(json_object),
				'select': {
					style: 'single',
					items: 'row'
				},
				'columns': [
					{'data': "GENEID"},
					{'data': "GENENAME"}
				]
			})
			.on("select", function(e, dt, type, indexes) {
				if(type === "row")  {
					var data = dt.row(indexes).data();
					console.log(data);
					d3.select("#subgroup_table")
					.selectAll("tr")
					.classed("selected", false);
					send_expression_request_to_r(gene_id = data['GENEID']);
				}
			});
			$("#gene_table_element").on("click.dt","tr", function() {
				table.row(this).select();
			});
			adjust_dt_height_to_parent_height("#tab_and_tables_div", "#scatter_row", "#gene_table_element"); 
})

Shiny.addCustomMessageHandler("receive_monocle_heatmap_data_from_r", function(json_object)  {
  console.log("Receiving monocle heatmap data:");
  console.log(json_object);
  
  var svg_height = 500; 
  var svg_width = null;

  var parent_selection = d3.select("#monocle_heatmap_div")
    .each(function(d,i)  {var parent_coords = this.getBoundingClientRect(); svg_width = (parent_coords.right - parent_coords.left);});
  parent_selection
    .select(".loader")
    .classed('out', true)
    .classed('in', false)
    .remove();

  var monocle_heatmap_svg = parent_selection
    .append("svg")
    .attr("id", "monocle_heatmap_svg")
    .attr('height', svg_height)
    .attr('width', svg_width);
  
  if('error' in json_object)  {
    monocle_heatmap_svg
      .append('text')
      .transition(1000)
      .attr('x', svg_width/2)
      .attr('y', svg_height/2)
      .attr('font-size', 24)
      .attr('text-anchor', 'middle')
      .text("Server Error. Perhaps there were no significant genes.");
  }
  else  {
    var rect_width = json_object['hm']['width'] , rect_height = json_object['hm']['height'];

    delete json_object['hm']['width'];
    delete json_object['hm']['height'];
    
    var max_x_coordinate = d3.max(json_object['hm']['x']);
    var max_y_coordinate = d3.max(json_object['hm']['y']);

    hm_rect_data = HTMLWidgets.dataframeToD3(json_object['hm']);
    hm_text_data = HTMLWidgets.dataframeToD3(json_object['text']);

    console.log('hm_rect_data:');
    console.log(hm_rect_data);
    var text_width = 50;
    var hm_width = svg_width - text_width;

    var g_hm = monocle_heatmap_svg
      .append('g')
      .attr("id", 'g_hm');
    g_hm
      .selectAll('rect')
      .data(hm_rect_data)
      .enter()
      .append('rect')
      .attr('x', function(d,i)  {return(d['x']);})
      .attr('y', function(d,i)  {return(d['y']);})
      .attr('width', rect_width)
      .attr('height', rect_height)
      .style('fill', function(d,i)  {return(d['fill']);});

    g_hm
      .transition(1000)
      .attr('transform', "matrix(" + hm_width/(max_x_coordinate + rect_width) + " 0 0 " + svg_height/(max_y_coordinate + rect_height) + " 0 0)");

    var g_text = monocle_heatmap_svg
      .append('g')
      .attr("id", "g_text");
    g_text
      .selectAll('text')
      .data(hm_text_data, function(d)  {return(d['label']);})
      .enter()
      .append('text')
      .text(function(d)  {return(d['label']);})
      .attr('x', svg_width)
      .attr('font-size', 9)
      .attr('y', function(d)  {return(d['y']);})
      .on('mouseover', function()  {
        d3.select(this).transition(1000).attr('font-size', 12);
      })
      .on('mouseleave', function()  {
        d3.select(this).transition(1000).attr('font-size', 9);
      })
      .on('click', function(d,i)  {
        var new_selection_data = null;
        var cur_selection = d3.select(this)
          .each(function(d,i)  {
            new_selection_data = [d];
          });
        var new_selection = g_text
          .selectAll('text')
          .data(new_selection_data, function(d)  {return(d['label']);});
        new_selection
          .transition(1000)
          .style('fill', 'red');
        new_selection
          .exit()
          .transition(1000)
          .style('fill', 'black');
        select_gene_from_table(d['ensembl']);
      });

    g_text
      .transition(1000)
      .attr('transform', "matrix(1 0 0 " + svg_height/(max_y_coordinate) + " -" + text_width + " " + rect_height/2 + ")");
  }
});

Shiny.addCustomMessageHandler("receive_new_pseudotimes", function(json_object)  {
  console.log("receiving new pseudotimes");
  console.log(json_object);
  if(Object.keys(json_object).includes('error'))  {
    var loader_div = d3.select("#monocle_div > div.panel-body");
    loader_div
      .select("#monocle_svg")
      .attr('visibility', 'visible');
    loader_div
      .select('.loader')
      .classed('in', false)
      .classed('out', true)
      .remove();
    alert("Only Terminal states can be selected for rerooting");
  }
  else  {
    var sample_to_new_pseudotime = {};
    for(i=0;i<json_object['pseudotime'].length;i++)  {
      sample_to_new_pseudotime[json_object['sample_name'][i]] = json_object['pseudotime'][i];
    }

    var selected_group_name = 'Current Selection'
    //Update global_data
    console.log("Looking for " + selected_group_name);
    var sample_names = global_data['group_analysis'][selected_group_name]['monocle']['nodes']['sample_name'];
    for(i=0;i<sample_names.length;i++)  {
      global_data['group_analysis'][selected_group_name]['monocle']['nodes']['pseudotime'][i] = sample_to_new_pseudotime[sample_names[i]];
    }
    //var selected_monocle_view = d3.select("#monocle_buttons").select(".btn-default").text(subgroup);
    d3.select('#monocle_svg')
      .select('#cell_nodes')
      .selectAll('circle')
      .each(function(d,i)  {
        d['pseudotime'] = sample_to_new_pseudotime[d['sample_name']];
      })
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
      });
    

    var loader_div = d3.select("#monocle_div > div.panel-body")
    loader_div
      .select("#monocle_svg")
      .attr('visibility', 'visible');
    loader_div
      .select('.loader')
      .classed('in', false)
      .classed('out', true)
      .remove();
    recolor_monocle_plot(d3.select("#monocle_buttons").select("#selected_monocle_button").text());
  }
});

Shiny.addCustomMessageHandler('receive_group_analysis_from_r', function(json_object)  {
  global_data['group_analysis'][json_object['group_name']] = json_object;
  console.log(global_data);
  //update group analysis if currently selected line is the group being updated.

  var sample_name_to_hex_id = {};
  d3.selectAll(".hexagon.active")
    .filter(function()  {
        return(this.classList.contains('active'));
      })
    .each(function(d, i)  {
      this.id = 'h' + i;
      d.forEach(function(containing_point)  {
        sample_name_to_hex_id[containing_point[0]] = 'h' + i;
      })
    });

  var group_name = document.getElementById("selection_name").value;
  global_data['group_analysis'][json_object['group_name']]['sample_name_to_hex_id'] = sample_name_to_hex_id;
 
  if('correlation' in global_data['group_analysis'][json_object['group_name']])  {
    update_correlation_div(json_object['group_name']);
  }
 if('monocle' in global_data['group_analysis'][json_object['group_name']])  {
    update_monocle_div(json_object['group_name']);
  }
});

Shiny.addCustomMessageHandler('receive_color_mappings_from_r', function(json_object)  {
  var color_mappings = {};
  for(i=0; i<json_object['phenotype'].length; i++)  {
    var subgroup = json_object['phenotype'][i];
    var value = json_object['value'][i];
    var color = json_object['color'][i];
    if(subgroup in color_mappings)  {
       color_mappings[subgroup][value] = color;
    }
    else  {
      console.log("value:", value);
      console.log("subgroup:", subgroup);
      console.log("color:", color);
      color_mappings[subgroup] = {};
      color_mappings[subgroup][value] =  color;
    }
  } 
  global_data['colors'] = color_mappings;
});

//Read in expression_values and either:
//1) add them to the 4th position of points in the scatterplot, or
//2) add them to the 4th position of points in global_data['scatter'],
//  which are the points thjat are not currently displayed.
//
//Since the global_data['scatter'] currently has all the datapoints 
//(doesn't trim as data gets added to the plot), this function is a bit wasteful
Shiny.addCustomMessageHandler('receive_expression_values_from_r', function(json_object)  {
  //var array_index_to_replace = get_array_index_to_put_gene();
  console.log(['receive_expression_values_from_r']);
  console.log(json_object);
  var sample_name_to_ind = {};

  for(i=0; i<json_object['sample_name'].length; i++)  {
    sample_name_to_ind[json_object['sample_name'][i]] = i;
  }

  if(('Current Selection' in global_data['group_analysis']) && ('correlation' in global_data['group_analysis']['Current Selection']))  {
    var all_circles = d3.select("#correlation_div > div.panel-body")
      .selectAll('circle');
    var target_circle_data = null;
    all_circles
      .filter(function(d,i)  {
        return(d['ensembl'] == json_object['ensembl']);
      })
      .each(function(d,i)  {
        target_circle_data = [d];
      });
    console.log(target_circle_data);
    if(target_circle_data !== null)  {
      var new_target_selection = all_circles
        .data(target_circle_data, function(d)  {return(d['ensembl'])});
      new_target_selection
        .transition(1000)
        .style('fill', 'red');
      new_target_selection
        .exit()
        .transition(1000)
        .style('fill', 'blue');
    }
    else  {
      all_circles
        .transition(1000)
        .style('fill', 'blue');
    }


  }

  //replace the points loaded in the scatterplot
  var hexes = g.selectAll(".hexagon")
    .each(function(d)  {
      d.forEach(function(elem)  {
        //Always add gene to display to 4th array element, after the sample_name, x coordinate, and y coordinate
        if(elem[0] in sample_name_to_ind)  {
          elem[3] = json_object['log_expr'][sample_name_to_ind[elem[0]]];
        }
        else  {
          elem[3] = 0;
        }
      })

    })
  recolor_image();
  update_scatter_legend();

  //console.log(global_data['scatter']['sample_name']);
  for(i=0; i<global_data['scatter']['sample_name'].length; i++)  {
      var current_sample_name = global_data['scatter']['sample_name'][i];
      if(current_sample_name in sample_name_to_ind)  {
        global_data['scatter']['val'][i] = json_object['log_expr'][sample_name_to_ind[current_sample_name]];
      }
      else  {
        global_data['scatter']['val'][i] = 0;
      }
  }
  recolor_image();
  //resize_image(xScale.domain(), yScale.domain());
  console.log(sample_name_to_ind);
  console.log(global_data);
  console.log("MONO");
  
  if(d3.select("#monocle_svg").empty() == false)  {
    update_monocle_gene_or_subgroup_data(sample_name_to_ind);
    var current_monocle_selection = d3.select("#selected_monocle_button").text()
    if(current_monocle_selection == 'Subgroup')  {
      d3.select("#monocle_buttons")
        .select("#selected_monocle_button")
        .text('Gene');
      recolor_monocle_plot('Gene');
    }
    else if(current_monocle_selection == 'Gene')  {
      recolor_monocle_plot('Gene');
    }
    var subgroup_button_selection = d3.select("#monocle_buttons").select("#subgroup_button");
    if(subgroup_button_selection.empty() === false)  {
      subgroup_button_selection
        .text('Gene')
        .attr('id', 'gene_button');
    }
  }

});


Shiny.addCustomMessageHandler('receive_subgroup_values_from_r', function(json_object)  {
  //var array_index_to_replace = get_array_index_to_put_gene();
  var subgroup_name = json_object['subgroup_name'];
  var subgroup_data = json_object['subgroup_data'];
  console.log(['Just received subgroup data from server: Heres the resulting object:']);
  console.log(json_object);
  var sample_name_to_ind = {};
  console.log(subgroup_data);
  console.log(subgroup_name);
  for(i=0; i<subgroup_data['sample_name'].length; i++)  {
    sample_name_to_ind[subgroup_data['sample_name'][i]] = i;
  }
  //replace the points loaded in the scatterplot
  var hexes = g.selectAll(".hexagon")
    .each(function(d)  {
      d.forEach(function(elem)  {
        elem[3] = subgroup_data[subgroup_name][sample_name_to_ind[elem[0]]];
      })

    });
  //recolor_image();

  for(i=0; i<global_data['scatter']['sample_name'].length; i++)  {
      var current_sample_name = global_data['scatter']['sample_name'][i];
      global_data['scatter']['val'][i] = subgroup_data[subgroup_name][sample_name_to_ind[current_sample_name]];
  }
  //resize_image(xScale.domain(), yScale.domain());
  recolor_image();
  update_scatter_legend();

  if(d3.select("#monocle_svg").empty() == false)  {
    update_monocle_gene_or_subgroup_data(sample_name_to_ind);
    var current_monocle_selection = d3.select("#selected_monocle_button").text()
    if(current_monocle_selection == 'Gene')  {
      d3.select("#monocle_buttons")
        .select("#selected_monocle_button")
        .text('Subgroup');
      recolor_monocle_plot('Subgroup');
    }
    else if(current_monocle_selection == 'Subgroup')  {
      recolor_monocle_plot('Subgroup');
    }
    var gene_button_selection = d3.select("#monocle_buttons").select("#gene_button");
    if(gene_button_selection.empty() === false)  {
      gene_button_selection
        .text('Subgroup')
        .attr('id', 'subgroup_button');
    }
  }

  d3.select("#correlation_svg")
    .selectAll("circle")
    .transition()
    .style("fill", 'blue');

  d3.select('#monocle_heatmap_svg')
    .selectAll('text')
    .transition()
    .style('fill', 'black');

});

//Load coordinates and disaply those within scatter boundaries.
//Initialize cells as all not-active
//
Shiny.addCustomMessageHandler('receive_scatterplot_from_r', function(json_object)  {
  console.log(json_object);
  var new_json_object = [];
  if(typeof xScale === 'undefined')  {
    json_object['val'] = []; 
		var x_min = 0;
		var y_min = 0;
		var x_max = 0;
		var y_max = 0;
		for(i=0; i < json_object['sample_name'].length; i++)  {
      json_object['val'][i] = null;
      //new_json_object.push([json_object['sample_name'][i],json_object['D1'][i],json_object['D2'][i]]);
			if(json_object['D1'][i] < x_min)  {
        x_min = json_object['D1'][i];
			}
      else if(json_object['D1'][i] > x_max)  {
        x_max = json_object['D1'][i];
			}
			if(json_object['D2'][i] < y_min)  {
        y_min = json_object['D2'][i];
			}
      else if(json_object['D2'][i] > y_max)  {
        y_max = json_object['D2'][i];
			}
		}
    setup_scatter_plot(x_min,x_max,y_min,y_max);
	}
  
  global_data['scatter'] = json_object;
  var sample_name_to_index = {};
  for(i=0; i < global_data['scatter']['sample_name'].length; i++)  {
    sample_name_to_index[global_data['scatter']['sample_name'][i]] = i;
  }
  global_data['scatter']['sample_name_to_index'] = sample_name_to_index;
  global_data['scatter']['state'] = Array(global_data['scatter']['sample_name'].length).fill('n');

  //console.log(d3.select('#table > tr.selected'));
  resize_image(xScale.domain(), yScale.domain());
  send_expression_request_to_r('ENSMUSG00000002459');
});

  
 //Send a JSON object to R 
//
//Input: JSON object in either of the following formats:
//1) {'gene_id':'ENS1', 'sample_name':['s1', 's2', etc..]}
//2) {'gene_id':'ENS1'}
//
//Details: The expr_table in the database is indexed using two columns: gene_id and sample_name.
//The first query will return only the non-zero expression values associated with the entries in 'sample name',
//wheras the 2nd entry will return all non-zero entries of 'gene_id'
//
//if gene_id_id is null, the gene_selector table is queried for the selected row. 
//Otherwise, the supplied gene_idId is used
function send_expression_request_to_r(gene_id = null) {
  console.log("Creating request object");
  //json_object = create_expression_request_json_object(gene_id);
  //console.log(json_object);
  Shiny.onInputChange('expression_request', {'gene_id': gene_id, 'rand':Math.random()});
}


function send_scatter_plot_request_to_r(plot_name)  {
  console.log("Sending", plot_name, "request to R");
  Shiny.onInputChange('scatterplot_request', {'scatterplot_name':plot_name});
}

function send_group_analysis_request_to_r()  {
  var selected_sample_names =[];
  var num_samples = 0;
  var group_name = document.getElementById("selection_name").value;
  svg.selectAll(".hexagon")
    .filter(".active")
    .each(function(d)  {
      d.forEach(function(elem)  {
        selected_sample_names.push(elem[0]);
        num_samples += 1;
      })
    });
  var analysis = [];
  if(d3.select('#correlation_check').property("checked"))  {
    analysis.push('correlation');
  }
  if(d3.select('#monocle_check').property("checked"))  {
    analysis.push('monocle');
  }
  Shiny.onInputChange('group_analysis_request', {'group_name':group_name, 'num_samples':num_samples, 'analysis':analysis, 'sample_names':selected_sample_names});
}

function send_subgroup_request_to_r(subgroup = null)  {
  console.log("Creating request object for subgroup: " + subgroup);
  Shiny.onInputChange('subgroup_request', {'subgroup': subgroup, 'rand': Math.random()});

}

function load_color_mappings()  {
  Shiny.onInputChange('color_mappings_request', true);
}

function reroot_monocle_tree(state)  {
  console.log("monocle state: ", state);
  var loader_div = d3.select("#monocle_div > div.panel-body")
    .attr('id', 'monocle_loader_div');
  loader_div
    .select("#monocle_svg")
    .attr('visibility', 'hidden');
  loader_div
    .append('div')
    .classed('loader', true);
  Shiny.onInputChange('monocle_reroot_request', state);
}

function run_beam_and_request_heatmap(json_object)  {
  console.log("Requesting monocle heatmap with the following parameters:");
  console.log(json_object);
  Shiny.onInputChange('monocle_heatmap_request', json_object);
}
