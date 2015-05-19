/*
    ScrollMenu v 1.0.0
    Author: Sudhanshu Yadav
    Copyright (c) 2015 to Sudhanshu Yadav - ignitersworld.com , released under the MIT license.
    Demo on: http://ignitersworld.com/lab/scrollmenu/
*/

function IScrollMenu(container, scrollMenuOptions, iScrollOptions){

    //modify scrollMenuOptions and iScrollOptions so they can work together
    scrollMenuOptions = scrollMenuOptions || {}; iScrollOptions = iScrollOptions || {}; scrollMenuOptions.nativeScroll = false; iScrollOptions.probeType = 3;
    
    //hide iscroll scrollbars if scrollbarVisible is not set to true
    if(!scrollMenuOptions.scrollbarVisible && !ScrollMenu.defaults.scrollbarVisible) iScrollOptions.scrollbars = false;
    
    //initiate both plugins and keep there isntance to return
    var iScrollInst = new IScroll(container, iScrollOptions),
        scrollMenuInst = ScrollMenu(container, scrollMenuOptions);


    //hook _scrollTo method
    scrollMenuInst._scrollTo = function (top, duration,callback) {
        iScrollInst.scrollTo(0, -top, duration);
        setTimeout(callback,duration); //as srollTo method does not support callback, wrap it on set timeout 
    }

    //hook scrollTop method
    scrollMenuInst.scrollTop = function () {
        return -iScrollInst.y;
    }

    //hook _scrollHeight method
    scrollMenuInst._scrollHeight = function () {
        return this.container.children().height();
    }


    //hook onScroll event
    iScrollInst.on('scroll', function () {
        scrollMenuInst._onScroll();
    });

    //initiate _onScroll method to set a proper scroll top position
    scrollMenuInst._onScroll();

    //return instance
    return {
        scrollMenu: scrollMenuInst,
        iScroll: iScrollInst
    }
}