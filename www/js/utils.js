function merge_scatter_with_gene_expression(data_object, scatter_name)  {
  data_object['scatter'][scatter_name].forEach(function(d){
    Object.keys(data_object['gene_expression']).forEach(function(gene_name)  {
      if(d[0] in data_object['gene_expression'][gene_name])  {
        d.push(data_object['gene_expression'][gene_name][d[0]]);
      }
      else  {
        d.push(0.0);
      }
    });
  });
};

function get_dist_between_vectors(vec1 = [0,0], vec2)  {
  return(Math.sqrt(Math.pow(vec2[0] - vec1[0], 2) + Math.pow(vec2[1] - vec1[1], 2)));
}

function dot_product(vec1, vec2)  {
  var cum_sum = 0;
  for(dim = 0; dim < vec1.length; dim++)  {
    cum_sum += vec1[dim] * vec2[dim];
  }
  return(cum_sum);

}

function get_vector_length(vec)  {
  return(Math.sqrt(dot_product(vec1 = vec, vec2 =  vec)));
}

function scale_vector(scalar, vector)  {
  var projected_vec = vector.map(function(d)  {
    return(scalar * d);
  })
  return(projected_vec);
}

function get_projection_scalar(vec, target)  {
  return(dot_product(vec, target) / dot_product(target, target));
}

function get_projection_length(vec, target)  {
  var dot_ratio = get_projection_scalar(vec, target);
  var projected_vec =  scale_vector(dot_ratio, target)
  return(get_dist_between_vectors(vec2 = projected_vec));
}

//Note that dt_selector must be the outermost div that occupies the row, typically a .col
function adjust_dt_height_to_parent_height(dt_selector, parent_selector, table_selector)  {
  var parent_height = $(parent_selector).innerHeight();
  console.log("parent_height: " + parent_height);
  var current_height = $(dt_selector).innerHeight();
  console.log("current_height: " + current_height);
  var scroll_div = $(table_selector +" .dataTables_scrollBody");
  var scroll_height = scroll_div.innerHeight();
  console.log("scroll_height: " + scroll_height);
  var max_height =  scroll_height + (parent_height - current_height - 52);  //BAD!!!!! You shouldn't hard-code!
  scroll_div.css("max-height", max_height);
  console.log("changing max-height to " + max_height);
  if(max_height > scroll_height)  {
    console.log("changing height to " + max_height);
    scroll_div.css("height", max_height);
  }
}

function get_active_scatter_type()  {
  var selected_type = null;
  var selection_data = [];
  var pheno_rows_selected = d3.select("#subgroup_table")
    .selectAll('tr.selected');

  var gene_rows_selected = d3.select("#gene_table")
    .selectAll('tr.selected');

  if(pheno_rows_selected.empty())  {
    selected_type = 'Gene';
    gene_rows_selected
      .selectAll('td')
      .each(function(d,i)  {
        selection_data.push(this.innerHTML);
      });
    
  }
  else if(gene_rows_selected.empty())  {
    selected_type = 'Subgroup';
    pheno_rows_selected
      .selectAll('td')
      .each(function(d,i)  {
        selection_data.push(this.innerHTML);
      });
  }
  else  {
    console.log('this is not possible!');
  }
  return({'selected_type':selected_type, 'selection_data':selection_data});
}

function get_most_freq_element(an_array)  {
  var count_obj = {};
  for(i=0; i<an_array.length; i++)  {
    var value = an_array[i];
    if(value in count_obj)  {
      count_obj[value] += 1;
    }
    else {
      count_obj[value] = 1;
    }
  }
  var max_entry = null;
  var max_count = 0;
  for(var key in count_obj)  {
    if(count_obj[key] > max_count)  {
      max_count = count_obj[key];
      max_entry = key;
    }
  }
  return(max_entry);
}

function most_freq_element_equals(target_value, values_list) {
  if(get_most_freq_element(values_list) == target_value)  {
    return(true);
  }
  else  {
    return(false);
  }
}

function disable_scrolling()  {
  var window_top_pos = $(window).scrollTop();
  body = d3.select('body');
  if(body.classed('no_scroll') == false)  {
    //body.classed('no_scroll', true)
    //  .style('top', -1 * window_top_pos);
  }
}

function enable_scrolling()  {
  body = d3.select('body');
  body
    //.classed('no_scroll', false)
    //.style('top', false);

}

function on_resize()  {
  console.log("resizing!");
  var navbar_height = $('.navbar-fixed-top').height();
    
  d3.select('.main_container')
    .style('padding-top', (navbar_height + 10) + "px");
}


//Format a variable name into a reader-friendly version for display
function get_display_name(original_name)  {
  if(original_name == 'cluster_id')  {
    return('Cluster ID');
  }
  else if(original_name == 'sample_date')  {
    return('Sample Date');
  }
  else if(original_name == 'cell_type')  {
    return('Cell Type');
  }
  else  {
    return(original_name);
  }
}

function get_incrementing_array(length = 10)  {
	var the_array = Array(length);
	for(i=0; i<length; i++)  {
		the_array[i] = i;
	}
	return(the_array);
}
