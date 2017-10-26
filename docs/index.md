---
layout: default
---
## Overview

Single Cell Explorer is a web application that allows interactive exploration from single-cell RNA-seq (scRNA-seq) datasets. It was designed to allow researchers to explore the developing murine cerebellum at single-cell resolution to generate hypotheses and identify gene-expression trends associated with cerebellar cell types throughout the development of the cerebellum from developmental day 10 (e10) through post-natal day 10 (p10)


## Usage

### Scattergrid plot

![](assets/scatterhex_plot.png)

The scattergrid plot is the primary means to explore the dataset and is always visible. The scattergrid is a grid of fixed-size hexagons that occupies the plot area. A hexagon is rendered if it overlays at least one cell in the underlying scatterplot. Since the maximum number of hexagons is fixed, data can be quickly rendered and is limited primarily by network transfer speeds. Additionally, the scattergrid format allows interaction with the scattergrid plot itself, which leads to better interaction with the data.

Since each hexbin is representative of at least one cell, summary functions are used to map the feature of interest from all component cells to an encompassing hexbin [See the explore tab below]. This summarizing feature alleviates much of the noise observed in single-cell RNASeq datasets and helps identify expression trends, for example, in similar cells.

Functionality is dependent on the selected tab left of the scattergrid plot. For example, zooming is enabled when the explore tab is selected, whereas group selection and the lasso is activated when the group tab is selected. See below for details.

### Explore Tab


The explore tab allows interactive exploration of the dataset by mapping various features onto the scatterhex grid. It is divided into the Genes tab and the Subgroups tab. The Genes tab maps genes onto the scatterhex grid and the subgroups map cell-level data such as sample date or predicted cell type onto the scatterhex grid. Searching for genes or subgroups can be perfomed using the search bar, although this usually only makes sense for the gene tab due to the large number of genes in RNA-seq datasets.

Zooming and panning is enabled when the Explore tab is selected. Zooming allows more granular exploration of cells of interest, since zooming in will reduce the number of cells that are being summarized in each hexbin.

![](/assets/explore_gene_tab.png)

Gene expression can be explored by selecting the Genes tab. The gene expression of a hexgrid is summarized as the mean expression of all component cells. The gene expression legend is adjustable by scrolling the mouse wheel over the numeric scale to the right of the scatterhex grid legend.

![](/assets/explore_subgroups_tab.png)

The Subgroups tab allows exploration of cell-level data. Currently, Subgroups include sample date, cluster ID, and cell type. Sample date is the sampling date of the cell and will indicate the emryonic or post-natal day of the sampled cells. Cluster ID denotes the assigned cluster of each cell. The cell type of each cell is determined by the expression of marker genes. For more information on how these were determined, please see the manuscript. Hexgrids are currently summarized by the most frequent feature of the component cells.

### Groups Tab

The group tab allows focused exploration of subsets of cells. When this tab is selected, cells can be selected by using the lasso tool or by double-clicking on either a hexbin that displays the phenotype of interest, or the colored square of the legend that displays this phenotype. Holding down the shift key appends to the existing selection.

There are currently two different analyses that can be performed for a group of selected cells: Pseudotime analysis or TF Correlation Network construction. These are outlined below. 

## Pseudotime Analysis

## TF Correlation Network

## Acknowledgements

