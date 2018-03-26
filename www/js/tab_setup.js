$('a[data-toggle="tab"]').on('shown.bs.tab', function (e) {
    if($(this).is('#explore_tab'))  {
      activate_functionality('explore');
    }
    else if($(this).is('#group_tab'))  {
      activate_functionality('group');
    }
    else  {
			console.log($(this));
      console.log("No other viable options...");
    }
});

//Submit request to r
//R wi
function submit_new_group()  {
  console.log("Submitted!");
  if($("#optional_div_attachment_row").length)  {
    remove_group_analysis_divs();
  }
      
      
  load_group_analysis_divs();
  send_group_analysis_request_to_r();
  //update user database with new group analysis

}

function validate_new_group_form()  {
  console.log("VALIDATING!!");
  if(d3.select('#monocle_check').property("checked") || d3.select('#correlation_check').property("checked"))  {
    if(parseInt(document.getElementById("num_selected").value) == 0)  {
      d3.select("#submit_new_group_button").classed('disabled', true);
      console.log("disabled");
    }
    else  {
      d3.select("#submit_new_group_button").classed('disabled', false);
      console.log("enabled");
    }
  }
  else {
    d3.select("#submit_new_group_button").classed('disabled', true);
    console.log("disabled");
  }
}

function activate_functionality(type)  {
  var svg_x = svg.node().getBoundingClientRect()['x'];
  var svg_y = svg.node().getBoundingClientRect()['y'];
  if(type == 'group')  {
    var lasso_start = function() {
      if(d3.event.sourceEvent.shiftKey == false)  {
        lasso.items()
          .classed("active",false)
          .classed("not-active",true);
        //d3.select("#num_selected").attr('value', 0);
      }
    };

    var lasso_end = function() {
      var num_selected_cells_selection = d3.select("#num_selected");
      var num_selected_cells = parseInt(num_selected_cells_selection.attr('value'));
      lasso.selectedItems()
        .classed("active",true)
        .classed("not-active",false);
      if(d3.event.sourceEvent.shiftKey == false)  {
        lasso.notSelectedItems()
          .classed("not-active",true)
          .classed("active",false);
      }
      var active_selection = d3.selectAll("#scatter_svg path.active")
        .each(function(d, i)  {
            d.forEach(function(containing_point)  {
              global_data['scatter']['state'][global_data['scatter']['sample_name_to_index'][containing_point[0]]] = 'a';
              if(containing_point[4] != 'a')  {
                num_selected_cells += 1;
              }
              containing_point[4] = 'a';
            });
        });
      d3.selectAll("#scatter_svg path.not-active")
        .each(function(d, i)  {
            d.forEach(function(containing_point)  {
              global_data['scatter']['state'][global_data['scatter']['sample_name_to_index'][containing_point[0]]] = 'n';
              if(containing_point[4] == 'a')  {
                num_selected_cells -= 1;
              }
              containing_point[4] = 'n';
            });
        });
      num_selected_cells_selection.attr('value', num_selected_cells);
      if(num_selected_cells == 0)  {
        for(i=0; i<global_data['scatter']['state'].length; i++)  {
          global_data['scatter']['state'][i] = 'u';
        }
        lasso.items()
          .classed("active",false)
          .classed("not-active",false);
      }
    };
    svg
      .on(".new_axis", null)
      .on(".zoom", null);
  //define lasso functionality
    var scatter_width = svg.select("#scatter_zoom_rect").attr('width');
    var scatter_height = svg.select("#scatter_zoom_rect").attr('height');

    var lasso_target = svg
      .append('rect')
      .attr('id', 'lasso_target_rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width',scatter_width)
      .attr('height', scatter_height)
      .style('opacity', 0);
    var lasso = d3.lasso()
      .closePathSelect(true)
      .closePathDistance(100)
      .items(d3.select("#scatter_svg").selectAll(".hexagon"))
      .targetArea(lasso_target)
      .on('start', lasso_start)
      .on("end",lasso_end);
    d3.select("#scatter_svg > g")
      .call(lasso);

    lasso_target.on('dblclick.group', function()  {
      var nearest_point = null;
      var nearest_point_distance = null;
      console.log(d3.event);
      d3.selectAll('.hexagon')
        .each(function(d,i)  {
          //console.log(d.x);
          var dist = get_dist_between_vectors([d3.event.pageX - svg_x, d3.event.pageY - svg_y], [d.x,d.y]);
          if(nearest_point)  {
            if(dist < nearest_point_distance)  {
              nearest_point = d3.select(this);
              nearest_point_distance = dist;
            }
          }
          else  {
            nearest_point = d3.select(this);
            nearest_point_distance = dist;
          }
        });
      nearest_point.each(function(d)  {d['nearest_point'] = 'mojo';});
      console.log("Nearest point: ");
      console.log(nearest_point);
      var annotation_value = null;
      nearest_point.each(function(d)  {annotation_value = d['anval']});
      update_cell_activity_and_count(annotation_value, active_function = most_freq_element_equals, append = d3.event.shiftKey);
//      if(typeof annotation_value === 'string')  {
//        var matching_hexes = d3.selectAll(".hexagon").filter(function(d)  {return(d['anval'] == annotation_value);})
//        if(d3.event.shiftKey == false)  {
//          d3.selectAll(".hexagon.active")
//            .each(function(d, i)  {
//            this.classList.add('not-active');
//            this.classList.remove('active');
//            d.forEach(function(containing_point)  {
//              global_data['scatter']['state'][global_data['scatter']['sample_name_to_index'][containing_point[0]]] = 'n';
//              containing_point[4] = 'a';
//              //num_selected_cells -= 1;
//            });
//          });
//        }
//        matching_hexes
//          .each(function(d)  {
//            this.classList.add('active');
//            this.classList.remove('not-active');
//            d.forEach(function(containing_point)  {
//              global_data['scatter']['state'][global_data['scatter']['sample_name_to_index'][containing_point[0]]] = 'a';
//              containing_point[4] = 'a';
//              //num_selected_cells -= 1;
//            });
//            //d.forEach(function(containing_point)  {
//            //  num_selected_cells += 1;
//            //});
//          });
//      }
//      else  {
//       console.log("Haven't handled the case for numbers yet. Added to the endless to-do list....");
//      }

    });
  }

  else if(type == 'explore')  {
    d3.select('#lasso_target_rect')
      .remove();
    svg
      .select('#scatter_zoom_rect')
      .on(".brush", null);
    svg
      .select('#scatter_zoom_rect')
      .call(zoom);
  }
}

function select_gene_from_table(search_term)  {
  var gene_table_api = $("#gene_table table").dataTable().api();
  gene_table_api
    .rows()
    .deselect()
    .row(function(idx, data, node)  {
      return(data[1]===search_term);
    })
    .select()
    .search(search_term)
    .draw();
}

function remove_group_analysis_divs()  {
  d3.select("#optional_div_attachment_row")
    .remove();
}

function load_group_analysis_divs()  {
  var selected_group = null;
  d3.select("#analysis_table")
    .select("#selected")
    .selectAll("td")
    .each(function(d,i)  {
      if(i == 0)  {
        selected_group = this.value
      }
      else  {
      }
    });
  console.log(selected_group);
  console.log("Creating group analysis divs");
  var row = d3.select("#optional_div_attachment_parent")
    .append("div")
    .classed("row", true)
    .attr('id', "optional_div_attachment_row")
    .style("margin-bottom", '21px')
    .style('height', "400px");
  append_warning_panel(row, 'TF Correlation', 'correlation_div')
    .style('height', "100%");
    //.style('width', 400 + "px");
  append_warning_panel(row, 'Monocle 2', 'monocle_div')
    .style('height', "100%");
    //.style('width', 400 + "px")
  var monocle_header_div = d3.select('#monocle_div > div.panel-heading');
  var button = monocle_header_div
    .insert('button', 'button')
    .classed('btn', true)
    .classed('btn-primary', true)
    .classed('btn-xs', true)
    .classed('panel_header_button', true)
    .on('click', function()  {
      $("#linear_monocle_heatmap_modal").modal('show');
    });
  /*button
    .append('span')
    .classed('glyphicon', true)
    .classed('glyphicon-thumbs-down', true)
    .style('padding-left', 4)
    .style('padding-right', 4);*/
  button
    .append('span')
    .text('Linear');
  var button = monocle_header_div
    .insert('button', 'button')
    .classed('btn', true)
    .classed('btn-primary', true)
    .classed('btn-xs', true)
    .classed('disabled', true)
    .classed('panel_header_button', true)
    .on('click', function()  {
      if(this.classList.contains('disabled') == false)  {
        $("#branched_monocle_heatmap_modal").modal('show');
      }
    });
  /*button
    .append('span')
    .classed('glyphicon', true)
    .classed('glyphicon-thumbs-up', true)
    .style('padding-left', 4)
    .style('padding-right', 4);*/
  button
    .append('span')
    .text('Branched');
  
  console.log("Created group analysis divs");
  if(selected_group in global_data['group_analysis'])  {
    console.log("mojo! And a magoo!!");
    if('correlation' in global_data['group_analysis'][selected_group])  {
      update_correlation_div(selected_group);
    }
    else  {
      row.select('#correlation_div > div.panel-body')
        .append('div')
        .classed("loader", true);
    }
    if('monocle' in global_data['group_analysis'][selected_group])  {
      update_monocle_div(selected_group);
    }
    else  {
      row.select('#monocle_div > div.panel-body')
        .append('div')
        .classed("loader", true);
    }
  }
  else {
    row.select('#correlation_div > div.panel-body')
      .append('div')
      .classed("loader", true);
    row.select('#monocle_div > div.panel-body')
      .append('div')
      .classed("loader", true);
  
  }

}

function append_warning_panel(selection, header_title='some stuff!!', id='a_panel', col_type = "col-lg-6")  {
  var main_div = selection
    .append('div')
    .classed(col_type, true)
    .style("height", "100%")
    .append('div')
    .classed("panel", true)
    .classed("panel-warning", true)
    .classed('fade', true)
    .classed('in', true)
    .attr('id', id);
    //.style("margin", "0px")
  var header_div = main_div
    .append("div")
    .classed("panel-heading", true);
  header_div
    .append('h3')
    .classed('panel-title', true)
    .style("display", "inline")
    .text(header_title);
  header_div
    .append('button')
    .classed("btn", true)
    .classed("btn-primary", true)
    .classed("btn-xs", true)
    .classed("panel_header_button", true)
    .style("float", "right")
    .attr('type', 'button')
    .append('span') 
    .classed('glyphicon', true)
    .classed('glyphicon-refresh', true)
    .text('Refresh');
  var body_div = main_div
    .append("div")
    .classed("panel-body", true)
    .style("height", "100%")
    .style("padding", "0");
  return(main_div);


}

