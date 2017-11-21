function get_fill_function(type = "mean")  {
  if(type == 'mean')  {
    return(function(data, array_index)  {
      var vals = [];
      data.forEach(function(i)  {vals.push(i[array_index]);});
      return(d3.mean(vals));
    });
  }
}

function get_subgroup_value(data, array_index, subgroup)  {
  var vals = [];
  data.forEach(function(i)  {vals.push(i[array_index]);});
  most_freq_element = get_most_freq_element(vals);
  return(most_freq_element);
}

function initialize_app()  {
  //Note that most of these are global
  global_data = {'scatter':{'sample_name':[], 'D1':[], 'D2':[], 'val':[], 'subgroup':[]}, 'colors': {}, 'expression':{}, 'group_analysis':{}};
  //  Load new data and add it to global_data['scatter']
  send_scatter_plot_request_to_r('base_tsne');
  //  add expression values to global data
  console.log('Loading color mappings');
  load_color_mappings();
}


function setup_scatter_plot(min_x,max_x,min_y,max_y)  {

  var height = parseInt(d3.select('#scatter_svg_div').style("height")),
    legend_width = 100,
    width = parseInt(d3.select('#scatter_svg_div').style("width")),
    scatter_width = width - legend_width,
    hex_radius = 4,
    point_hexagon_threshold = 1000;

  console.log(min_x);
  console.log(min_y);
  console.log(max_x);
  console.log(max_x);

  xScale = d3.scaleLinear()
    .domain([min_x, max_x])
    .range([0, scatter_width]);

  yScale = d3.scaleLinear()
    .domain([max_y,min_y])
    .range([0, height]);

  yScale_invert = d3.scaleLinear()
    .domain([0, height])
    .range([height, 0]);

  hb = d3.hexbin()
    .radius(hex_radius)
    .x(function(d)  {return(xScale(d[1]));})
    .y(function(d)  {return(yScale(d[2]));});

  svg = d3.select('#scatter_svg_div')
    .append("svg")
    .attr('id', 'scatter_svg')
    .attr("width", width)
    .attr("height", height)
    .on('mouseover', function()  {
      disable_scrolling();
    })
    .on('mouseout', function()  {
      enable_scrolling();
    });
  


  
  g = svg.append('g');


  xAxis = d3.axisBottom(xScale)
    .ticks((scatter_width + 2) / (height + 2) * 10)
    .tickSize(5)
    .tickPadding(8 - height);

  //d3.select('#scatter_svg_div .axis--x')
  //  .selectAll('line')
  //  .attr('stroke', '#CDCDCD');

  yAxis = d3.axisRight(yScale)
    .ticks(10)
    .tickSize(5)
    .tickPadding(8 - scatter_width);

  //d3.select('#scatter_svg_div .axis--y')
  //  .selectAll('line')
  //  .attr('stroke', '#CDCDCD');

  gX = svg.append("g")
    .attr("class", "axis axis--x")
    .call(xAxis);

  gY = svg.append("g")
    .attr("class", "axis axis--y")
    .call(yAxis);

  //define the zoom functionality

  zoom = d3.zoom()
    .scaleExtent([1,10])
    .translateExtent([[0, 0], [scatter_width, height]])
    .on('end', function()  {
      resize_image();
      recolor_image();
    /*.on('zoom', zoomed)
    .on('start', clicked)*/
    });

  svg
    .append('rect')
    .attr('id', 'scatter_zoom_rect')
    .attr('width', xScale.range()[1])
    .attr('height', height)
    .attr('opacity', 0)
    .call(zoom);

  //resize_image(xScale.domina)
}

var fill_function = get_fill_function('mean');

function get_hex_fill_color(log_exp, max_value = 3.0)  {
  return(d3.interpolateOrRd(log_exp/max_value));
}

function hex_fill_color_generator(max_value = 3.0)  {
  return(function get_hex_fill_color(log_exp)  {
    return(d3.interpolateOrRd(log_exp/max_value));
  });
}
var get_hex_fill_color = hex_fill_color_generator(max_value = 3.0);

/*
Remove rows from group analysis */
function reset_groups(what)  {
  if(what == 'all')  {
    var del_targets =  ['#optional_div_attachment_row','#monocle_heatmap_row'];
    del_targets.forEach(
      function(sel_string)  {
        d3.select(sel_string)
          .remove();
      });
    global_data['group_selection'] = {};
  }
  if(what == 'monocle_heatmap')  {
    var del_targets =  ['#monocle_heatmap_row'];
    del_targets.forEach(
      function(sel_string)  {
        d3.select(sel_string)
          .classed('in', false)
          .classed('out', true)
          .remove();
      });

  }
}



//Update the image from zooming
//
//The hexes are redrawn based on zooming.
//Currently, the 4th positin of each cell data array contains the 
//expression values of the genes. 
function resize_image()  {
  if(d3.event === null)  {
    var new_xScale = xScale;
    var new_yScale = yScale;
  }
  else  {
    var new_xScale = d3.event.transform.rescaleX(xScale);
    var new_yScale = d3.event.transform.rescaleY(yScale);
  }

  var x_min = new_xScale.domain()[0], x_max = new_xScale.domain()[1], y_min = new_yScale.domain()[1], y_max = new_yScale.domain()[0];



  console.log("Redrawing hexes using these x and y boundaries:");
  console.log(global_data);

  var points = [];
  var temp_scatter = {};
  for(i=0; i<global_data['scatter']['sample_name'].length; i++)  {
    if(global_data['scatter']['D1'][i] >= x_min & global_data['scatter']['D1'][i] < x_max & global_data['scatter']['D2'][i] >= y_min & global_data['scatter']['D2'][i] < y_max)  {
      points.push([global_data['scatter']['sample_name'][i],global_data['scatter']['D1'][i],global_data['scatter']['D2'][i],global_data['scatter']['val'][i], global_data['scatter']['state'][i]]);
    }
  };
  
  console.log(points.length);
  var sel = g.selectAll('.hexagon')
    .remove();

  hb.x(function(d)  {return(new_xScale(d[1]));})
    .y(function(d)  {return(new_yScale(d[2]));});

  console.log("Begin event:");
  console.log('xScale:', xScale.domain());
  console.log('yScale:', yScale.domain());
  console.log(d3.event);
  console.log("End event");
  var new_hexes = g.selectAll('.hexagon')
    .data(hb(points))
    .enter()
    .append("path")
    .classed("hexagon", true)
    .attr("d", function (d) {
      return("M" + d.x + "," + d.y + hb.hexagon());
    });
  update_cell_activity_and_count();
  //recolor_image();
}

/*****
  * recolor all hexes using index 3 of all containing cells of each hex.
  * The fill function is determined by reading whether the 'Explore' or 'Group' tab has class active
  * */
function recolor_image()  {
  var hexes = g.selectAll('.hexagon')
    .attr("stroke", "black")
    .attr("stroke-width", "1px")
    .transition()
    .duration(1000);

    if(document.getElementById('subgroup_tab').classList.contains("active"))  {
      var current_subgroup = $("#subgroup_table tr.selected > td:eq(1)").text();
      hexes
        .each(function(d)  {d['anval'] = get_subgroup_value(d, array_index = 3, current_subgroup);})
        .style("fill", function(d)  {return(global_data['colors'][current_subgroup][d['anval']]);});
    }
    else  {
      hexes
        .each(function(d)  {d['anval'] = fill_function(d, array_index = 3);})
        .style("fill", function(d)  {return(get_hex_fill_color(d['anval']))});
    }

}

function update_scatter_legend(height, width, x, y)  {
  var current_legend_g = d3.select('#scatter_svg')
    .select(".legend");
  var active_scatter_object = get_active_scatter_type();
  var current_scatter_type = active_scatter_object['selected_type'];
  var current_scatter_selected = active_scatter_object['selection_data'][1];

  if(current_legend_g.empty() || (current_legend_g.attr('id') !== current_scatter_type) || (current_scatter_type == 'Subgroup' && current_legend_g.attr('id') == 'Subgroup'))  {
    if((current_legend_g.empty() == false) && current_legend_g.attr('id') == 'Subgroup')  {
      d3.select("#subgroup_zoom_axis_target").remove();
      d3.select("#subgroup_target_rect").remove();
    }
    console.log("Empty!!");
    current_legend_g
      .classed('in', false)
      .classed('out', true)
      .remove();

    var current_legend_g = d3.select('#scatter_svg')
      .append('g')
      .attr('id', current_scatter_type)
      .attr('transform', 'translate(' + (xScale.range()[1] + 10) + ', ' + 0 + ")")
      .attr("width", d3.select('#scatter_svg').attr('width') - xScale.range()[1])
      .attr("height", d3.select('#scatter_svg').attr('height') - 5)
      .classed('legend', true);
    
    if(current_scatter_type == 'Subgroup')  {
      var legend_color_data = global_data['colors'][current_scatter_selected];
      legend_color_array = [];
      console.log(legend_color_data);
      console.log(typeof legend_color_data);
      //var rect_ids = Object.keys(legend_color_data);
      console.log(legend_color_data);
      /*rect_ids.forEach(function(key)  {
        legend_color_array.push({'variable':key, 'color':legend_color_data[key]});
      });*/

      var temp_objs = Object.values(legend_color_data);
      var temp_keys = Object.keys(legend_color_data);
      var legend_square_dim = 20;
      var legend_square_spacing = 2;
      var num_squares_to_display = temp_objs.length
      var num_squares_displayable = Math.floor((d3.select("#scatter_svg").attr('height') - 20) / (legend_square_dim + legend_square_spacing));
      console.log('num squares displayable: ' + num_squares_displayable);
      var total_legend_height = d3.select("#scatter_svg").attr('height');
      var total_legend_width = 40;
      var total_legend_title_height = 15;
      var non_title_y_start = total_legend_height;
      var total_legend_no_title_height = total_legend_height - total_legend_title_height;
      var num_squares_displayed = d3.min([num_squares_to_display,num_squares_displayable]);
      var squares_display_height = num_squares_displayed * (legend_square_dim + legend_square_spacing) - legend_square_spacing;
      var required_squares_display_height = num_squares_to_display * (legend_square_dim + legend_square_spacing) - legend_square_spacing;

      array_of_cluster_ids = [];
      array_of_cluster_colors = [];
      for(i=0; i<num_squares_displayed; i++)  {
        array_of_cluster_ids.push(temp_keys[i]);
        array_of_cluster_colors.push({'screen_ind':i, 'array_ind':i, 'color':temp_objs[i], 'value':temp_keys[i]});
      }


      //Add text label
      current_legend_g
        .append('g')
        .append('text')
        .attr('x', 0)
        .attr('y', 10)
        .attr('font-size', 14)
        .attr('font-weight', 'bold')
        .text(get_display_name(current_scatter_selected));

      current_legend_no_title_g = current_legend_g
        .append('g')
        .attr('transform', 'translate(0 ' + total_legend_title_height + ')');

      
      subgroup_zoom_target = current_legend_no_title_g
        .append('rect')
        .attr('id', 'subgroup_target_rect')
        .classed('pan_up_down', 'true')
        .attr('x', 10)
        .attr('y', 0)
        .attr("width", 40)
        .attr("height", total_legend_no_title_height)
        .attr('opacity', 0);
      

      var legend_rects = current_legend_no_title_g
        .append('g')
        .attr('transform', 'translate(10,0)')
        .attr('id', 'legend_rects')
        .selectAll('rect')
        .data(array_of_cluster_colors, function(d,i)  {return(d['color']);})
        .enter()
        .append('rect')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', legend_square_dim)
        .attr('height', legend_square_dim)
        .attr('fill', function(d,i)  {
          return(d['color']);
        });
      legend_rects
        .transition(1500)
        .attr('y', function(d,i)  {
          return(d['screen_ind'] * 22);
        });
        
      legend_rects.on('dblclick', function(d,i)  {
        console.log("dblclicked!!!!");
        update_cell_activity_and_count(anval = d['value'], active_function = most_freq_element_equals, append = d3.event['shiftKey']);
      });

      subgroup_zoom_target_scale = d3.scalePoint()
        .range([legend_square_dim / 2.0, legend_square_dim / 2.0 + (d3.min([num_squares_displayable, num_squares_to_display]) - 1) * (legend_square_dim + legend_square_spacing)])
        .domain(array_of_cluster_ids);
      
      subgroup_zoom_axis_target = current_legend_no_title_g
        .append('g')
        .attr('id', 'subgroup_zoom_axis_target')
        .attr('transform', 'translate(30 0)');

      subgroup_zoom_target_axis = d3.axisRight(subgroup_zoom_target_scale);

      subgroup_zoom_axis_target.call(subgroup_zoom_target_axis);

      //Add scrollbar if necessary
      var scrollbar = null;
      if(num_squares_to_display > num_squares_displayable)  {
        var scroll_small_rect_height = (squares_display_height / required_squares_display_height) * squares_display_height;
        var scroll_bar_g = current_legend_no_title_g
          .append('g')
          .attr('id', 'scroll_bar_g')
          .attr('opacity', 0);
         scroll_bar_g
          .append('rect')
          .attr('x', 0)
          .attr('y', 0)
          .attr('width', 6)
          .attr('height', squares_display_height)
          .attr('fill', '#BEBEBE');
        var scroll_small_rect = scroll_bar_g
          .append('rect')
          .attr('id', 'scroll_small_rect')
          .attr('x', 0)
          .attr('y', 0)
          .attr('width', 6)
          .attr('height', scroll_small_rect_height)
          .attr('fill', '#000000');
 
        current_legend_no_title_g
          .on('mouseover', function()  {
            scroll_bar_g
              .transition()
              .attr('opacity', 1);
          })
          .on('mouseout', function()  {
            scroll_bar_g
              .transition()
              .attr('opacity', 0);
          });


        var required_legend_height = 15 + temp_objs.length * 22;
        var extra_height_required = required_legend_height - d3.select("#scatter_svg").attr('height');

        /*subgroup_legend_zoom = d3.zoom()
          .scaleExtent([1,1])
          .translateExtent([1,10])
          .on('zoom', legend_scroll);
        */
        current_legend_no_title_g
          .on('wheel', function()  {
            legend_scroll();
          })

        //Create scale for mapping screen ind of rect to y coordinate of small_
        small_rect_positioning_scale = d3.scaleLinear()
          .domain([0, num_squares_to_display - num_squares_displayed])
          .range([0, squares_display_height - scroll_small_rect_height]);
        


        function legend_scroll()  {
          console.log(d3.event);
          if(d3.event['deltaY'] < 0)  {
            var new_deltaY = -22; //d3.min([d3.max([0, 22]), extra_height_required]);
          }
          else  {
            var new_deltaY = 22; //d3.min([d3.max([0, 22]), extra_height_required]);
          }
          //d3.event.transform['y'] = d3.min([d3.max([0, d3.event.transform['y']]), extra_height_required]);
          console.log("Legend is scrolling");
          var current_array_lower_bound = null;
          current_legend_no_title_g.select('#legend_rects rect').each(function(d) {current_array_lower_bound = d['array_ind'];});
          var current_array_upper_bound = current_array_lower_bound + num_squares_displayable - 1;
          console.log(current_array_upper_bound);
          console.log(current_array_lower_bound);
          var num_elements_to_scroll = Math.round(new_deltaY / 22);
          var new_current_array_lower_bound = current_array_lower_bound + num_elements_to_scroll;
          var new_current_array_upper_bound = current_array_upper_bound + num_elements_to_scroll;;
          console.log(num_elements_to_scroll);
          /*if(num_elements_to_scroll < 0)  {
            var new_current_array_lower_bound = d3.max([0, current_array_lower_bound + num_elements_to_scroll]);
            var new_current_array_upper_bound = new_current_array_lower_bound + num_squares_displayable - 1;
          }
          else if(num_elements_to_scroll > 0)  {
            var new_current_array_upper_bound = d3.min([num_squares_to_display, current_array_upper_bound + num_elements_to_scroll]);
            var new_current_array_lower_bound = new_current_array_upper_bound - num_squares_displayable + 1;
          }
          else  {
            var new_current_array_upper_bound = current_array_upper_bound;
            var new_current_array_lower_bound = current_array_lower_bound;
          }
          */
          if((new_current_array_lower_bound >= 0) && (new_current_array_upper_bound < num_squares_to_display))  {

            var new_rect_data = [];
            var new_scale_domain = [];
            for(i=new_current_array_lower_bound; i<new_current_array_upper_bound+1; i++)  {
              new_rect_data.push({'screen_ind':i-new_current_array_lower_bound, 'array_ind':i , 'color':temp_objs[i], 'value':temp_keys[i]});
              new_scale_domain.push(temp_keys[i]);
            }
            var new_subgroup_zoom_target_scale = d3.scalePoint()
              .range([10, 10 + (d3.min([num_squares_displayable, num_squares_to_display]) - 1) * (legend_square_dim + legend_square_spacing)])
              .domain(new_scale_domain);

            subgroup_zoom_axis_target.call(subgroup_zoom_target_axis.scale(new_subgroup_zoom_target_scale));

            var new_rects = d3.select("#legend_rects").selectAll('rect')
              .data(new_rect_data, function(d,i)  {return(d['color']);});
                
            console.log(new_rect_data);
            console.log(new_rects);

            new_rects_exit_sel = new_rects
              .exit();
            if(new_rects_exit_sel.empty() == false)  {
              new_rects_exit_sel.remove();
            }

            new_rects_enter_sel = new_rects
              .enter();

            if(new_rects_enter_sel.empty() == false)  {
              var new_rects_merged = new_rects_enter_sel
                .append('rect')
                .attr('width', legend_square_dim)
                .attr('height', legend_square_dim)
                .attr('fill', function(d,i)  {
                  return(d['color']);
                })
                .merge(new_rects)
                .attr('y', function(d,i)  {return(d['screen_ind'] * 22);})
                .on('dblclick', function(d,i)  {
                  console.log("dblclicked!!!!");
                  update_cell_activity_and_count(anval = d['value'], active_function = most_freq_element_equals, append = d3.event['shiftKey']);
                });
              scroll_small_rect
                .transition()
                .attr('y', small_rect_positioning_scale(new_current_array_lower_bound));
            }
          }
        }
        //subgroup_zoom_target.call(subgroup_legend_zoom);
      }
    }
    if(current_scatter_type == 'Gene')  {

      var svg = d3.select('#scatter_svg');
      if(svg.select("defs").empty())  {
        var defs = d3.select('#scatter_svg')
          .append("defs");
        var linearGradient = defs.append("linearGradient")
          .attr("id", "linear-gradient");
        linearGradient
            .attr("x1", "0%")
            .attr("y1", "100%")
            .attr("x2", "0%")
            .attr("y2", "0%");

        linearGradient.append("stop") 
          .attr("offset", "0%")   
          .attr("stop-color", get_hex_fill_color(0.0)); //light blue
        
        linearGradient.append("stop") 
          .attr("offset", "50%")   
          .attr("stop-color", get_hex_fill_color(1.5)); //light blue

        linearGradient.append("stop") 
          .attr("offset", "100%")   
          .attr("stop-color", get_hex_fill_color(3.0)); //dark blue
      }
     

      current_legend_g
              .append('g')
              .attr('id', 'expr_triangle')
              .append('path')
              .attr('d', 'M10 20 h 35 v 200 L 10 20')
              .style("fill", "url(#linear-gradient)")
              .style('stroke', 'black');

      var legend_scale = d3.scaleLinear()
        .domain([0,1.0])
        .range([200,0]);

      var legend_axis = d3.axisRight(legend_scale)
        .ticks(3);

      var legend_scale_target = current_legend_g
        .append('g')
        .attr('id', 'legend_scale')
        .attr('transform', 'translate(50 20)');
              /*.append('g')
              .attr('id', 'expr_triangle_labels')
              .selectAll('text')
              .data([{'log_expr':0.0, 'ypos':220}, {'log_expr':1.5, 'ypos':122}, {'log_expr':3.0, 'ypos':30}])
              .enter()
              .append('text')
              .attr('x', 50)
              .attr('y', function(d,i)  {return(d['ypos']);})
              .text(function(d,i)  {return(d['log_expr']);})
              .attr('font-size', 12);*/
      var legend_axis_area = legend_scale_target.node().getBBox();
      console.log(legend_scale_target);
      console.log(legend_axis_area);

      legend_scale_target.call(legend_axis);

      var text = current_legend_g
        .append('g')
        .append('text')
        .attr('x', 0)
        .attr('y', 10)
        .attr('font-size', 14)
        .attr('font-weight', 'bold');
      text.append('tspan')
        .text('Log');
      text.append('tspan')
        .attr('dy', 4)
        .text('2');
      text.append('tspan')
        .attr('dy', -3)
        .text('Expr');

      var legend_zoom = d3.zoom()
        .on('zoom.legend', zoom_legend)
        .on('end.legend', end_legend);
      
      function zoom_legend()  {
        console.log("Trying to zoom the legend!");
        console.log(d3.event);
        legend_rect_target.call(function(the_scale_target)  {
          var temp_scale = d3.scaleLinear().range(legend_scale.range()).domain([0, legend_scale.domain()[1] * d3.event.transform['k']]);
          console.log(temp_scale);
          console.log(legend_axis);
          legend_axis.scale(temp_scale);
          legend_scale_target.call(legend_axis);
          get_hex_fill_color = hex_fill_color_generator(temp_scale.domain()[1]);
        });
      }

      function end_legend()  {
        recolor_image();
      }

      var legend_rect_target = current_legend_g
        .append('rect')
        .attr('id', 'legend_scroll_target')
        .classed('pan_up_down', 'true')
        .attr('opacity', 0)
        .attr('x', 50)
        .attr('y', 20)
        .attr('width', 25)
        .attr('height', 200);
    
      legend_rect_target.call(legend_zoom);
    }

    else  {
      console.log("foo");
    }
  }
}

/******************************
  * This function updates the cells that are active, the nuber of cells selected under the group tab, as well as the state array of the underlying global_data object.
  * It does NOT change the appearance. See recolor_image for that, which should probably be called after this function
  *
  * This function reads the individual cells' data array at position 4 (index 3), which contains the value used by the hex fill function.
  * It then makes changes to the global_data state variable and to the cells' state variable in its data array at position 5 (index 4)
  *
  * The active_function argument is a function that takes two paramters These are target_value and values_list. The function is called and supplied with arguments from within the function below. 
  * The function should return true based on some comparison of the two acrguments. The values_list will consist of the 5th data element (either 'a' or 'n') of each cell in a hexbin and will be 
  * called on each hexbin. The target_value will be set to 'a'. If the return value is true, the hexbin class will be set to true, otherwise false.
  *****************************/
function update_cell_activity_and_count(anval, active_function = most_freq_element_equals, append = true)  {
  if(typeof anval !== 'undefined')  {
    var num_selected_cells_selection = d3.select("#num_selected");
    var num_selected_cells = parseInt(num_selected_cells_selection.attr("value"));
    if(append == false)  {
      for(i=0; i<global_data['scatter']['state'].length; i++)  {
        num_selected_cells = 0;
        global_data['scatter']['state'][i] = 'n'
      }
      svg.selectAll(".hexagon")
        .each(function(d, i)  {
          var anval_list = [];
          d.forEach(function(containing_point)  {
            if(containing_point[3] == anval)  {
              global_data['scatter']['state'][global_data['scatter']['sample_name_to_index'][containing_point[0]]] = 'a';
              containing_point[4] = 'a';
            }
            else  {
              containing_point[4] = 'n';
            }
            anval_list.push(containing_point[4]);
          });
          if(active_function('a', anval_list))  {
            this.classList.add('active');
            this.classList.remove('not-active');
          }
          else  {
            this.classList.remove('active');
            this.classList.add('not-active');
          }
        });
    }
    else  {
      svg.selectAll(".hexagon")
        .each(function(d, i)  {
          var anval_list = [];
          d.forEach(function(containing_point)  {
            if(containing_point[3] == anval)  {
              global_data['scatter']['state'][global_data['scatter']['sample_name_to_index'][containing_point[0]]] = 'a';
              if(containing_point[4] == 'n')  {
                num_selected_cells += 1;
              }
              containing_point[4] = 'a';
            }
            anval_list.push(containing_point[4]);
          });
          if(active_function('a', anval_list))  {
            this.classList.add('active');
            this.classList.remove('not-active');
          }
          else  {
            this.classList.remove('active');
            this.classList.add('not-active');
          }
        });
    }
    num_selected_cells_selection.attr("value", num_selected_cells);
  }
}

$(document).on('shiny:sessioninitialized', function(event) {
  console.log("shiny:sessioninitialized event has been triggered.")
  console.log("Initializing app")
  initialize_app();
  //update_scatter_legend();
});

