library(shiny)
library(DT)
library(RSQLite)
library(dplyr)
library(svgPanZoom)
library(monocle)
library(grid)


#print("Loading server.R")
current_user <- 'globaluser'


shinyServer(function(input, output, session) {
  temp_cds <- NULL
  current_user_table_name <- paste0(current_user, "_group_analysis_table")
  
  ########################################################
  # Set up phenotype/subgroup table on startup only
  ########################################################
  observe({
    subgroup_fields <- dbListFields(db_conn, 'phenotype_table')
    print("Setting up subgroup table")
    subgroup_df <- data.frame(subgroup = subgroup_fields[subgroup_fields != 'sample_name'], stringsAsFactors = FALSE)
    print(head(subgroup_df))
    session$sendCustomMessage('receive_data_for_subgroup_table', subgroup_df)
    
  })
   
  ########################################################
  # Set up gene selection table on startup only
  ########################################################
  observe({
    gene_selection_df <- collect(tbl(db_conn, 'gene_selection_table'))
    session$sendCustomMessage('receive_data_for_datatable', gene_selection_df)
    
  })
  
  ########################################################
  # Send subgroup values for selected subgroup
  ########################################################
  observe({
    #print("Sending subgroup request")
    request_list <- input$subgroup_request 
    subgroup <- request_list[['subgroup']]
    #print(subgroup)
    if(!is.null(subgroup))  {
      subgroup_df <- collect(tbl(db_conn, 'phenotype_table') %>% dplyr::select(sample_name, subgroup))
      print("Sending subgroup request back to client:")
      print(subgroup_df)
      session$sendCustomMessage('receive_subgroup_values_from_r', list(subgroup_data = subgroup_df, subgroup_name = subgroup))
    }
    else  {
      return(NULL)
    }
  }, priority = -10)
  
  #Receive request for expression data and send back as JSON object
  observe({
    print("DANG MAN")
    request_list <- input$expression_request 
    print(request_list)
    target_ensembl <- request_list[['gene_id']]
    if(length(request_list[['gene_id']]) == 1)  {
      if(!is.null(target_ensembl))  {
        query_expr_df <-tbl(db_conn, 'expr_table') %>% dplyr::filter(ensembl == target_ensembl) %>% dplyr::select(sample_name, log_expr)
        print(query_expr_df)
        print("-Sending expression request back to client")
        session$sendCustomMessage('receive_expression_values_from_r', c(as.list(data.frame(collect(query_expr_df))), list(ensembl=target_ensembl)))
      }
    }
    else  {
      target_cells <- request_list[['sample_name']]
      ##print(target_cells)
      print(target_ensembl)
      if(!(is.null(target_cells) || is.null(target_ensembl)))  {
        query_expr_df <- tbl(db_conn, 'expr_table') %>% dplyr::filter(ensembl == target_ensembl, sample_name %in% target_cells) %>% dplyr::select(sample_name, log_expr)
        foo_df <- data.frame(collect(query_expr_df))
        #print("_Sending expression request back to client")
        ##print(class())
        session$sendCustomMessage('receive_expression_values_from_r', foo_df)
      }
    }
  }, priority = 0)
  
  #Send coordinates of 2d plots back to the client
  observe({
    scatterplot_request_list <- input$scatterplot_request 
    scatterplot_name <- scatterplot_request_list[['scatterplot_name']] 
    #print(paste('received scatterplot request for', scatterplot_name))
    scatterplot_df <-tbl(db_conn, 'scatterplot_table') %>% dplyr::filter(scatterplot_name == scatterplot_name)
    if(!is.null(scatterplot_name))  {
      foo_df <- data.frame(collect(scatterplot_df))
      ##print(foo_df)
      #print(class(foo_df))
      session$sendCustomMessage('receive_scatterplot_from_r', foo_df)
    }
  }, priority = 10)
  
  new_group_analysis <- reactive({
    if(!is.null(input$group_analysis_request))  {
      group_analysis_request_list <- input$group_analysis_request 
      group_name <- group_analysis_request_list[['group_name']][[1]]
      num_samples <- group_analysis_request_list[['num_samples']][[1]]
      analyses <- unlist(group_analysis_request_list[['analysis']]) 
      sample_names <- unlist(group_analysis_request_list[['sample_names']])
      #print(input$group_analysis_request_list[['group_name']])
      #print(cat('group_name', group_name))
      #print(cat('num_samples', num_samples))
      #print(cat(group_name, num_samples, analyses, sample_names))
      if((!is.null(sample_names)) && (!is.null(analyses)) & (num_samples > 0) & (!is.null(group_name)))  {
        return(list(group_name=group_name, num_samples=num_samples, analysis=analyses, sample_names=sample_names))
      }
      else  {
        return(NULL)
      }
    }
    else  {
      return(NULL)
    }
  })
  
  output$analysis_table <- DT::renderDataTable({
    #print("Writing table:")
    new_group_analysis <- new_group_analysis()
    if(!is.null(new_group_analysis))  {
      #print(new_group_analysis)
      new_entry_df <- data.frame(group_name = new_group_analysis$group_name, num_cells = new_group_analysis$num_samples, monocle = ifelse('monocle' %in% new_group_analysis$analysis, 1, 0), correlation = ifelse('correlation' %in% new_group_analysis$analysis, 1, 0), stringsAsFactors = FALSE)
      dbWriteTable(db_conn, current_user_table_name, new_entry_df, append = TRUE)
    }
    analysis_table_df <- tbl(db_conn, current_user_table_name)
    return(collect(analysis_table_df))
  }, selection = list(mode = 'single', selected = 1), server = FALSE, callback = JS("$('#analysis_table').on('click.dt', 'tr', load_group_analysis_divs)"), fillContainer = TRUE, options = list(paging = TRUE, searching=TRUE, info = FALSE, scrollCollapse=TRUE))
  
  observe({
    new_group_analysis <- new_group_analysis()
    return_list <-list()
    if(!is.null(new_group_analysis))  {
      if(any(new_group_analysis[['analysis']] %in% "monocle"))  {
        temp_cds <<- get_monocle_data(sample_names = new_group_analysis$sample_names)
        if(is.null(temp_cds))  {
          return_list[['monocle']] <- list(error='error')
        }
        else  {
          branch_point_sample_names <- temp_cds@auxOrderingData[[temp_cds@dim_reduce_type]]$branch_points
          branch_points_df <- data.frame(sample_name = branch_point_sample_names, x=temp_cds@reducedDimK[1,branch_point_sample_names], y=temp_cds@reducedDimK[2,branch_point_sample_names], stringsAsFactors = FALSE)
          branch_points_df$branch_point_id = 1:nrow(branch_points_df)
          monocle_data_df <- data.frame(x = temp_cds@reducedDimS[1,], y = temp_cds@reducedDimS[2,], pseudotime = temp_cds@phenoData@data$Pseudotime, state = temp_cds@phenoData@data$State, stringsAsFactors = FALSE) %>% tibble::rownames_to_column('sample_name')
          monocle_data_list <- list(nodes = monocle_data_df, edges = data.frame(), branch_points = branch_points_df)
          #dbWriteTable(db_conn, paste0(current_user, '_monocle_table'), monocle_data_df, append = TRUE)
          #print("Sending monocle data back to client")
          return_list[['monocle']] <- monocle_data_list
        }
      }
      if(any(new_group_analysis[['analysis']] %in% "correlation"))  {
        correlation_graph_list <- run_correlation_analysis(sample_names = new_group_analysis$sample_names, correlation_threshold = 0.25, min_expression_frequency = 0.1)
        correlation_graph_list$group_name <- new_group_analysis[['group_name']]
        correlation_graph_list[['edges']] <- correlation_graph_list[['edges']] %>% dplyr::mutate(group_name = new_group_analysis[['group_name']]) %>% dplyr::mutate(source = source - 1, target = target -1)
        correlation_graph_list[['nodes']] <-correlation_graph_list[['nodes']] %>% dplyr::mutate(group_name = new_group_analysis[['group_name']])
        
        #dbWriteTable(db_conn, paste0(current_user, '_correlation_edges_table'), edges_df, append = TRUE)
        #dbWriteTable(db_conn, paste0(current_user, '_correlation_nodes_table'), nodes_df, append = TRUE)
        #print("Sending correlation data back to client")
        return_list[['correlation']] <- correlation_graph_list
      }
      return_list[['group_name']] <- new_group_analysis[['group_name']]
      session$sendCustomMessage('receive_group_analysis_from_r', return_list)
    }
}, priority = 10)
  
  observe({
    reroot_state <- input$monocle_reroot_request[[1]]
    #print(cat("reroot state type:", class(reroot_state)))
    if(!is.null(reroot_state))  {
      reroot_state <- as.integer(reroot_state)
      #print(cat("rerooting on state", reroot_state))
      #print(temp_cds)
      tryCatch({
          temp_cds <<- orderCells(temp_cds, root_state = reroot_state)
          plot_cell_trajectory(temp_cds)
          pseudotime_df <- data.frame(sample_name = sampleNames(temp_cds@phenoData), pseudotime = temp_cds@phenoData$Pseudotime, stringsAsFactors = FALSE)
          session$sendCustomMessage('receive_new_pseudotimes', pseudotime_df)
        },
        error = function(cond)  {
          #print("Returning null pseudotimes")
          session$sendCustomMessage('receive_new_pseudotimes', list(error = 'cant_root'))
        }
      )
    }
  })
  
  observe({
    if(!is.null(input$color_mappings_request[[1]])) {
      subgroup_colors_df <- collect(tbl(db_conn, 'phenotype_colors_table'))
      session$sendCustomMessage('receive_color_mappings_from_r', subgroup_colors_df)
    }
  })
  
  argh <- reactive({
    #print("Trying to return!!!")
    return(input$monocle_heatmap_request)
  })
  
  observe({
    monocle_heatmap_list <- argh()# input$monocle_heatmap_request
    #print(monocle_heatmap_list)
    if(!is.null(monocle_heatmap_list))  {
      #print('calculating heatmap')
      #print(monocle_heatmap_list)
      temp_heatmap_list <- run_beam_and_generate_heatmap(cds = temp_cds, branch_point = monocle_heatmap_list$branch_point[[1]], qval_threshold = monocle_heatmap_list$qval_threshold[[1]], max_genes = monocle_heatmap_list$max_genes[[1]], hm_type = monocle_heatmap_list$hm_type[[1]])
      if(is.null(temp_heatmap_list))  {
        session$sendCustomMessage("receive_monocle_heatmap_data_from_r", list(error='no_heatmap'))
      }
      else  {
        temp_heatmap_plot <- temp_heatmap_list[['plot']]
        sig_genes_df <- temp_heatmap_list[['ensembl_to_gene_short_name']]
        heatmap_data_for_client <- get_list_of_coordinates_for_monocle_heatmap(branched_heatmap_object = temp_heatmap_plot, sig_genes_df = sig_genes_df, type = monocle_heatmap_list$hm_type[[1]])
        #print('returning heatmap data')
        session$sendCustomMessage("receive_monocle_heatmap_data_from_r", heatmap_data_for_client)
      }
    }
  })
  
})

#target_ensembl <- 'ENSMUSG00000051951'
#target_cells <- dbGetQuery(db_conn, 'SELECT * FROM expr_table LIMIT 50')$sample_name

#tbl(db_conn, 'expr_table') %>% dplyr::filter(ensembl == target_ensembl) %>% select(sample_name, log_expr) %>% show_query()
#?tbl
#dbDisconnect(db_conn)
##runApp(".")
#dbListTables(db_conn)
