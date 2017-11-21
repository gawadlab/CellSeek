###############
# Version 0.1
###############

library(shiny)
library(DT)
library(RSQLite)
library(dplyr)
library(monocle)

#db_conn <- dbConnect(drv = RSQLite::SQLite(), "db/neuro10x.db")
#db_conn <- dbConnect(drv = RSQLite::SQLite(), "/home/rob/drug_treated10x.db")
db_conn <- dbConnect(drv = RSQLite::SQLite(), "db/drug_treated10x.db")

#print("Loading global.R")
library(igraph)
run_correlation_analysis <-function(sample_names, correlation_threshold, min_expression_frequency = 0.1)  {
  annotation_df<- collect(tbl(db_conn, 'annotation_table') %>% dplyr::filter(type == 'TF'))
  mouse_tf_ensembl_ids <- annotation_df$ensembl
  #print(mouse_tf_ensembl_ids)
  tf_mat <- reshape2::acast(collect(tbl(db_conn, 'expr_table') %>% dplyr::filter(ensembl %in% mouse_tf_ensembl_ids, sample_name %in% sample_names)), sample_name ~ ensembl, value.var='log_expr')
  tf_mat[is.na(tf_mat)] <- 0
  tf_mat <- tf_mat[,apply(tf_mat,2,function(.col)  {mean(.col > 0) > min_expression_frequency})]
  tfs_cor <- cor(tf_mat)
  tfs_cor_mat <- as.matrix(tfs_cor)
  tfs_cor_mat[tfs_cor_mat < correlation_threshold] <- 0
  diag(tfs_cor_mat) <- 0
  tfs_cor_mat <- tfs_cor_mat[rowSums(tfs_cor_mat) > 0, colSums(tfs_cor_mat) > 0]
  tfs_cor_mat[! upper.tri(tfs_cor_mat)] <- 0
  tfs_cor_igraph <- graph_from_adjacency_matrix(tfs_cor_mat, mode = 'undirected', weighted = TRUE)
  #Can this be sped up?
  nodes_df <- data.frame(ensembl = V(tfs_cor_igraph)$name, stringsAsFactors = FALSE) %>% dplyr::left_join(., annotation_df) %>% dplyr::rename(id = gene_name)
  edges_df <- as.data.frame(get.edgelist(tfs_cor_igraph, names = FALSE)) %>% dplyr::rename(source = V1, target = V2)
  return(list(edges = edges_df, nodes = nodes_df))
}

get_monocle_data <- function(sample_names, max_n_samples = 1000, min_expression_frequency = 0.1) {
  set.seed(12345)
  library(monocle)
  if(length(sample_names) >= max_n_samples)  {
    sample_names <- sample_names[sample(1:length(sample_names), max_n_samples, replace = FALSE)]
    #print("subsamplinbg data to 1000 cells")
  }
  annotation_df<- collect(tbl(db_conn, 'annotation_table') %>% dplyr::filter(type == 'TF'))
  tf_mat <- reshape2::acast(collect(tbl(db_conn, 'expr_table') %>% dplyr::filter(ensembl %in% annotation_df$ensembl, sample_name %in% sample_names)), sample_name ~ ensembl, value.var='log_expr')
  tf_mat[is.na(tf_mat)] <- 0
  tf_mat <- tf_mat[,apply(tf_mat, 2, function(.col)  {mean(.col > 0) >= min_expression_frequency})]
  target_ensembl_ids <- colnames(tf_mat)
  gene_select_subset_df <- collect(tbl(db_conn, 'gene_selection_table') %>% dplyr::filter(GENEID %in% target_ensembl_ids))
  fdata_df <- AnnotatedDataFrame({dplyr::left_join(data.frame(GENEID = colnames(tf_mat), stringsAsFactors = FALSE), gene_select_subset_df) %>% dplyr::mutate(GENENAME = ifelse(is.na(GENENAME), GENEID, GENENAME)) %>% dplyr::rename(ENSEMBL = GENEID, gene_short_name = GENENAME) %>% tibble::column_to_rownames('ENSEMBL')})
  pdata_df <- AnnotatedDataFrame({data.frame(sample_name = rownames(tf_mat), stringsAsFactors = FALSE) %>% tibble::column_to_rownames('sample_name')})
  
  temp_cds <- newCellDataSet(as(t(tf_mat), 'sparseMatrix'), phenoData = pdata_df, featureData = fdata_df , expressionFamily = gaussianff())
  
  #rm(giant_norpmt_gteq3500umi_lteq15000umi_noe14b_expressed_only_mat)
  
  temp_cds <- estimateSizeFactors(temp_cds)
  #f(is.null(tryCatch({
  # temp_cds <- estimateDispersions(temp_cds)},
  #   error = function(cond)  {return(NULL)})))  {
  # return(NULL)
  #
  
  set.seed(12345)
  
  #print("How am i skipping all this!?!?")
  temp_cds <- reduceDimension(temp_cds, max_components=2, norm_method = 'none', pseudo_expr = 0)
  temp_cds <<- orderCells(temp_cds)
  temp_cds <- orderCells(temp_cds)
  return(temp_cds)
}

run_beam_and_generate_heatmap <- function(cds, branch_point = NULL, qval_threshold = 0.001, max_genes = NULL, hm_type = 'branched')  {
  if((hm_type == 'Branched') && (!is.null(branch_point)))  {
    sig_genes_df <- BEAM(temp_cds, branch_point=branch_point, relative_expr = FALSE) %>% tibble::rownames_to_column('ensembl') 
    sig_genes_df <- dplyr::filter(sig_genes_df, qval <= qval_threshold) %>% dplyr::arrange(qval) %>% dplyr::rename(gene_short_name = fd)
    #print(sig_genes_df)
    
  }  else if(hm_type == 'Linear') {
    sig_genes_df <- differentialGeneTest(temp_cds, fullModelFormulaStr = "~sm.ns(Pseudotime)") %>% tibble::rownames_to_column('ensembl')
    sig_genes_df <- dplyr::filter(sig_genes_df, qval <= qval_threshold) %>% dplyr::arrange(qval)
  }
  else  {
    stop("Case not handled!")
  }
  if((!is.null(max_genes)) && (nrow(sig_genes_df) > max_genes))  {
    sig_genes_df <- sig_genes_df[1:max_genes,]
  }
  if(nrow(sig_genes_df) == 0)  {
    return(NULL)
  }
  else  {
    #print('Generating heatmap')
    #print(sig_genes_df)
    #print(temp_cds[rownames(temp_cds) %in% rownames(sig_genes_df),])
    if(hm_type == 'Branched') {
      tryCatch({
        temp_heatmap_plot <- plot_genes_branched_heatmap(cds_subset = temp_cds[rownames(temp_cds) %in% sig_genes_df$ensembl,], norm_method = 'log', show_rownames = TRUE, use_gene_short_name = TRUE, return_heatmap = TRUE, cluster_rows = FALSE)
        return(list(plot = temp_heatmap_plot, ensembl_to_gene_short_name = sig_genes_df[,c('ensembl', 'gene_short_name')]))
      },
      error = function(cond)  {return(NULL)})
    }
    else if(hm_type == 'Linear')  {
      tryCatch({
                temp_heatmap_plot <- plot_pseudotime_heatmap(temp_cds[sig_genes_df$ensembl,],cores = 1,show_rownames = T, return_heatmap = TRUE)
                return(list(plot = temp_heatmap_plot, ensembl_to_gene_short_name = sig_genes_df[,c('ensembl', 'gene_short_name')]))
      },
      error = function(cond)  {return(NULL)})
    }
    else  {
      stop("Case not handled")
    }
  }
}

get_list_of_coordinates_for_monocle_heatmap <- function(branched_heatmap_object, sig_genes_df, type = 'Branched')  {
  if(type == 'Branched')  {
    hm_grob <- branched_heatmap_object$ph_res$gtable$grobs[[2]]$children[[1]]
    text_grob <- branched_heatmap_object$ph_res$gtable$grobs[[3]]
  }
  else if(type == 'Linear')  {
    hm_grob <- branched_heatmap_object$gtable$grobs[[2]]$children[[1]]
    text_grob <- branched_heatmap_object$gtable$grobs[[3]]
  }
  else  {
    stop("This case has not been handled")
  }
  hm_x <- as.integer(round(convertUnit(hm_grob$x, 'native')))
  hm_y <- as.integer(round(convertUnit(hm_grob$y, 'native')))
  hm_width <- as.integer(round(convertUnit(hm_grob$width, 'native')))
  hm_height <- as.integer(round(convertUnit(hm_grob$height, 'native')))
  hm_fill <- as.vector(hm_grob$gp$fill)
  
  text_y <- as.integer(round(convertUnit(text_grob$y, 'native')))
  #text_x <- as.integer(round(convertUnit(text_grob$x, 'native')))
  text_label <- text_grob$label
  text_ensembl <- dplyr::left_join(data.frame(gene_short_name = text_label, stringsAsFactors = FALSE), sig_genes_df) %>% dplyr::pull(ensembl)
  
  return(list(hm = list(x=hm_x, y=hm_y, width=hm_width, height=hm_height, fill=hm_fill), text = list(y=text_y, label=text_label, ensembl=text_ensembl)))
} 
