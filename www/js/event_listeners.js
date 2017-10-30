/*
*
* This is the last javascript file loaded.
* Put any function calls that need to be executed last in here.
*
*/
$(window).resize(on_resize);
$(document).ready(on_resize);
/*$('.no_scroll').on('mousewheel DOMMouseScroll', function(e) {
    var scrollTo = null;

    if(e.type === 'mousewheel') {
           scrollTo = (e.originalEvent.wheelDelta * -1);
        }
    else if(e.type === 'DOMMouseScroll') {
           scrollTo = 40 * e.originalEvent.detail;
        }

    if(scrollTo) {
           e.preventDefault();
           $(this).scrollTop(scrollTo + $(this).scrollTop());
        }
});
*/
