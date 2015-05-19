/*
    ScrollMenu v 1.0.0
    Author: Sudhanshu Yadav
    Copyright (c) 2015 to Sudhanshu Yadav - ignitersworld.com , released under the MIT license.
    Demo on: http://ignitersworld.com/lab/scrollmenu/
*/

function niceScrollMenu(container, scrollMenuOptions, niceScrollOptions){
    
    container = $(container);
    
    //modify scrollMenuOptions and niceScrollOptions so they can work together
    scrollMenuOptions = scrollMenuOptions || {}; niceScrollOptions = niceScrollOptions || {}; scrollMenuOptions.nativeScroll = false; 
    
    //hide nicescroll scrollbars if scrollbarVisible is not set to true
    if(!scrollMenuOptions.scrollbarVisible && !ScrollMenu.defaults.scrollbarVisible) niceScrollOptions.autohidemode = "hidden";
    
    //initiate both plugins and keep there isntance to return
    var niceScrollInst = container.niceScroll(niceScrollOptions),
        scrollMenuInst = ScrollMenu(container, scrollMenuOptions);


    //hook _scrollTo method
    scrollMenuInst._scrollTo = function (top, duration,callback) {
        niceScrollInst.doScrollTop(top, duration);
        setTimeout(callback,duration); //as doScrollTop method does not support callback, wrap it on set timeout 
    }

    //hook scrollTop method
    scrollMenuInst.scrollTop = function () {
        return niceScrollInst.getScrollTop();
    }

    //hook _scrollHeight method
    scrollMenuInst._scrollHeight = function () {
        return container[0].scrollHeight;
    }


    //hook onScroll event
    var scrollOn = container.is('body,html')?$(window) : container;
    scrollOn.scroll(function () {
        scrollMenuInst._onScroll();
    });

    //initiate _onScroll method to set a proper scroll top position
    scrollMenuInst._onScroll();

    //patch for nice scroll plugin (nice scroll cursor always get visible after doScrollTop method is called)
    if(!scrollMenuOptions.scrollbarVisible && !ScrollMenu.defaults.scrollbarVisible) container.children('.nicescroll-rails').find('.nicescroll-cursors').css('display','none');
    
    //return instance
    return {
        scrollMenu: scrollMenuInst,
        niceScroll: niceScrollInst
    }
}
