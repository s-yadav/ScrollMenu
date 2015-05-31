/*
    ScrollMenu v 1.0.3
    Author: Sudhanshu Yadav
    Copyright (c) 2015 to Sudhanshu Yadav - ignitersworld.com , released under the MIT license.
    Demo on: http://ignitersworld.com/lab/scrollmenu/
*/

;(function ($, window, document, undefined) {
    "use strict";

    //a singular method for hquery
    $.single = (function () {
        var single = $({});
        return function (elm) {
            single[0] = elm;
            return single;
        }
    }());

    //common selectors
    var $document = $(document),
        $window = $(window),
        $body = $('body');

    //access global object
    var global = (function () {
        return this || (1, eval)('this');
    }());

    //void function
    var voidFun = function () {};

    //function to get scrollbar width
    var scrollBarWidth = (function () {
        var outer = document.createElement("div");
        outer.style.visibility = "hidden";
        outer.style.width = "100px";
        outer.style.msOverflowStyle = "scrollbar"; // needed for WinJS apps

        document.body.appendChild(outer);

        var widthNoScroll = outer.offsetWidth;
        // force scrollbars
        outer.style.overflow = "scroll";

        // add innerdiv
        var inner = document.createElement("div");
        inner.style.width = "100%";
        outer.appendChild(inner);

        var widthWithScroll = inner.offsetWidth;

        // remove divs
        outer.parentNode.removeChild(outer);

        return widthNoScroll - widthWithScroll;
    }());

    // Simple JavaScript Templating
    // John Resig - http://ejohn.org/ - MIT Licensed

    var cache = {};

    function tmpl(str, data) {
        // Figure out if we're getting a template, or if we need to
        // load the template - and be sure to cache the result.
        var fn = !/\W/.test(str) ?
            cache[str] = cache[str] ||
            tmpl(document.getElementById(str).innerHTML) :

            // Generate a reusable function that will serve as a template
            // generator (and which will be cached).
            new Function("obj",
                "obj = obj || {}; var p=[],print=function(){p.push.apply(p,arguments);};" +

                // Introduce the data as local variables using with(){}
                "p.push('" +

                // Convert the template into pure JavaScript
                str
                .replace(/[\r\t\n]/g, " ")
                .split("<%").join("\t")
                .replace(/((^|%>)[^\t]*)'/g, "$1\r")
                .replace(/\t=(.*?)%>/g, "',obj.$1 || \"\",'")
                .split("\t").join("');")
                .split("%>").join("p.push('")
                .split("\r").join("\\'") + "');return p.join('');");

        // Provide some basic currying to the user
        return data ? fn(data) : fn;
    };


    //default values for plugin
    var defaults = {
        sectionClass: 'section',
        menuType: 'vertical', //can be vertical or horizontal and horizontal-menu
        appendTo: null, //defaults to container
        animateOnScroll: true,
        nativeScroll: true,
        scrollbarVisible: false,
        onhover: voidFun,
        onhoverOut: voidFun,
        onscrollToSection: voidFun,
        menuMod: voidFun, // a callback to modify menu or add interaction after its been added to menu
        anchorSetup: [],
        animationDuration: 600,
        scrollAnchorSpacing: 10
    };


    //Scroll menu class; 
    function ScrollMenu(container, options) {
        var self = this; //store this to self, so it can be minified

        //check if container not provided take body as default container 
        if (!container || !($(container)[0] instanceof Element)) {
            options = container;
            container = document.body;
        }

        //initilize options
        options = options || {};
        options = self.options = $.extend({}, defaults, options);


        self.container = $(container);
        self.sections = self.container.find(self.options.sectionClass);


        //set the vertical flag
        self._vertical = options.menuType == "vertical";

        //arrays to contain information about anchors and sections
        self._sectionTops = [];
        self._sectionHeights = [];
        self._scrollAnchorPos = [];

    }

    ScrollMenu.prototype = {
        constructor: ScrollMenu,
        _init: function () {
            var self = this,
                options = self.options,
                nativeScroll = options.nativeScroll,
                container = self.container;

            //prepare menu html
            self._prepareMenu();

            var scrollElm = self.scrollElm;

            //assign events for watching scroll
            if (nativeScroll) {
                scrollElm.on('scroll', function () {
                    self._onScroll();
                });
            }

            //set anchor size and update size on window resize 
            self._setScrollAchorSize();
            $window.on('resize.scrollMenu', function () {

                //after a timeout refresh container and scroll menu sizes
                if (self.resizeTimeout) window.clearTimeout(self.resizeTimeout);
                self.resizeTimeout = setTimeout(function () {
                    if (nativeScroll) {
                        //reset the height so css applied height takes over
                        container.height("");
                        scrollElm.add(container).height(container.is('body,html') ? $window.height() : container.height());
                    }
                    self._setScrollAchorSize();
                }, 200);
            });

            //bind event to controll scroll manually
            self.scrollMenuWrap.on('mousedown touchstart', function (e) {
                e.preventDefault();

                var target = $.single(e.target),
                    touchMove = e.type == "touchstart" ? "touchmove" : "mousemove",
                    touchEnd = e.type == "touchstart" ? "touchend" : "mouseup";

                if (!target.is('.scroll-handle')) {
                    var anchorIdx = self.scrollAnchors.index(target.closest('.scroll-anchor'));
                    if (anchorIdx == -1) return;
                    setTimeout(function () {
                        self.scrollToSection(anchorIdx);
                    }, 0);
                } else {
                    //add dragging class to body so that anywhere user move cursor it should show grabbing cursor
                    $body.addClass('scroll-menu-dragging');

                    /** set anchor positions **/
                    self._setAnchorPos();

                    var clientAxis = self._vertical ? 'clientY' : 'clientX',
                        c1 = e[clientAxis] || e.originalEvent.touches[0][clientAxis],
                        scrollTop = self.scrollTop(),
                        c1idx = self._inBoundry(c1);



                    $document.on(touchMove + '.scrollMenu', function (e2) {
                        e2.preventDefault();
                        var c2 = e2[clientAxis] || e2.originalEvent.touches[0][clientAxis],
                            c2idx = self._inBoundry(c2);

                        if (c2idx !== false) {
                            self.scrollTo(scrollTop + ((c2 - c1 - (c2idx - c1idx) * options.scrollAnchorSpacing) / self._sizeFactor), false);
                        }
                    });


                    $document.one(touchEnd, function () {
                        $document.off(touchMove + '.scrollMenu');

                        //add dragging class to body so that anywhere user move cursor it should show grabbing cursor
                        $body.removeClass('scroll-menu-dragging');
                    });
                }
            });

            //add hovered class on menu content on hover of anchor and fire corresponding callbacks
            self.scrollAnchors.hover(function (e) {
                var $this = $.single(this),
                    idx = self.scrollAnchors.index(this),
                    anchorSetup = options.anchorSetup,
                    onhover = anchorSetup[idx] && anchorSetup[idx].onhover || options.onhover;
                $.single(this).find('.scroll-menu-content').addClass('hovered');

                onhover.call(this, e, self.getIndexData(idx));

            }, function (e) {
                var $this = $.single(this),
                    idx = self.scrollAnchors.index(this),
                    anchorSetup = options.anchorSetup,
                    onhoverOut = anchorSetup[idx] && anchorSetup[idx].onhoverOut || options.onhoverOut;

                $.single(this).find('.scroll-menu-content').removeClass('hovered');

                onhoverOut.call(this, e, self.getIndexData(idx));
            });

            //trigger scroll method to check the correct scroll position
            if (nativeScroll) self._onScroll();
            self._setScrollAchorSize();

            return self;
        },
        //method to prepare menu html
        _prepareMenu: function () {
            var self = this,
                container = self.container,
                options = self.options,
                scrollbarVisible = options.scrollbarVisible;
            //wrap container content to hide scrollbars while having native scrolling (A dirty hack :(, looking a better alternative for it) 
            container.addClass('scroller-container');
            if (options.nativeScroll) {
                /** scrollbar hide hack start **/
                var rightAjust = scrollbarVisible ? 'width:100%' : 'padding-right:10px; right:-' + (10 + scrollBarWidth) + 'px';
                container.wrapInner('<div class="content-inner-wrapper"></div>').wrapInner('<div class="content-wrapper" style="' + rightAjust + '"></div>'); //it should be box sizing contentbox
                //cache scrollElm for feature use
                var scrollElm = self.scrollElm = container.find('.content-wrapper');
                //manage height and positions 
                scrollElm.add(container).height(container.is('body') ? $window.height() : container.height());
                scrollElm.css('position', 'absolute');
                /** scrollbar hide hack end **/
            }

            //create scroll anchors

            var anchorSetup = options.anchorSetup,
                scrollBarHtml = ['<div class="scroll-menu-wrapper ' + self.options.menuType + ' ' + (options.className || "") + '">'];

            for (var i = 0, ln = self.sections.length; i < ln; i++) {
                var setupObj = anchorSetup[i] || {},
                    menuTemplate = setupObj.template || options.template || "",
                    anchorMargin = i == ln - 1 ? '' : 'style="margin-' + (self._vertical ? "bottom" : 'right') + ':' + options.scrollAnchorSpacing + 'px"';

                menuTemplate = menuTemplate && '<div class="scroll-menu-content <%= className %>" style="' + (self.options.menuType != "horizontal-menu" && 'background-color : <%= backgroundColor %>') + '">' + menuTemplate + '</div>';
                var scrollAnchorTempl = '<div class="scroll-anchor" ' + anchorMargin + '>' + menuTemplate + '<div class="scroll-handle-wrap" style="background-color : <%= backgroundColor %>"><div class="scroll-handle"></div></div></div>';
                //compile and push template
                scrollBarHtml.push(tmpl(scrollAnchorTempl, setupObj));
            }
            scrollBarHtml.push("</div>");
            //append menu to provided element or container by default
            var appendTo = options.appendTo ? $(options.appendTo) : container;
            appendTo.append(scrollBarHtml.join(''));



            //cache the jquery selectors for future use
            var scrollMenuWrap = self.scrollMenuWrap = appendTo.find('.scroll-menu-wrapper');
            self.scrollAnchors = scrollMenuWrap.find('.scroll-anchor');
            self.scrollHandles = scrollMenuWrap.find('.scroll-handle');

            //to apply modification on menu once its added
            $.each(self.scrollAnchors, function (idx) {
                var menuMod = anchorSetup[idx] && anchorSetup[idx].menuMod || options.menuMod;
                menuMod.call(this, self.getIndexData(idx));
            });

            //add a right padding of scrollbar width on scrollmenu if scrollbar is set to be visible 
            if (scrollbarVisible) {
                var paddingRight = scrollMenuWrap.css('padding-right', (parseInt(scrollMenuWrap.css('padding-right'), 10) + scrollBarWidth) + 'px');
            }
        },
        //function to get scroll position
        scrollTop: function () {
            return this.scrollElm.scrollTop();
        },
        //function to get inner content height
        _scrollHeight: function () {
            var self = this;
            return (self.options.nativeScroll ? self.scrollElm : self.container)[0].scrollHeight;
        },
        //set offset positions of scroll anchor
        _setAnchorPos: function () {
            var self = this,
                winScrollTop = $window.scrollTop(),
                winScrollLeft = $window.scrollLeft(),
                vertical = self._vertical;
            self.scrollAnchors.each(function (idx, elm) {
                var $this = $(this),
                    offset = $this.offset(),
                    topOffset = offset.top - winScrollTop,
                    leftOffset = offset.left - winScrollLeft;

                self._scrollAnchorPos[idx] = {
                    min: vertical ? topOffset : leftOffset,
                    max: vertical ? topOffset + $this.height() : leftOffset + $this.width()
                }
            });
        },
        //a function to check if mouse is moving inside anchor
        _inBoundry: function (p) {
            var scrollAnchorPos = this._scrollAnchorPos,
                obj;

            for (var i = 0, ln = scrollAnchorPos.length; i < ln; i++) {
                obj = scrollAnchorPos[i];
                if (p >= obj.min && p <= obj.max) return i;
            };
            return false;
        },
        //function to return information of anchor and section at specified index
        getIndexData: function (index) {
            var self = this;
            return {
                index: index,
                anchor: self.scrollAnchors[index],
                section: self.sections[index],
                anchorOptions: self.options.anchorSetup[index]
            };
        },
        //hookable scrollTo method
        _scrollTo: function (top, duration, callback) {
            this.scrollElm.animate({
                scrollTop: top + 'px'
            }, duration, callback);
        },
        //function to scroll at defined place
        scrollTo: function (top, animate, callback) {
            var self = this,
                options = self.options;

            callback = callback || (typeof animate == "function" ? animate : voidFun);

            animate = (animate == undefined || typeof animate == "function") ? true : animate;

            var duration = options.animateOnScroll && animate ? options.animationDuration : 0;

            self._scrollTo(top, duration, callback);
        },
        //function to scroll to specified section
        scrollToSection: function (section, animate, callback) {
            callback = callback || (typeof animate == "function" ? animate : voidFun);

            var self = this,
                index = !isNaN(section) ? section : self.sections.index(self.sections.filter(section)), //section index
                options = self.options,
                anchorSetup = options.anchorSetup,
                scrollTop = self._sectionTops[index];

            if (scrollTop != undefined) {
                self.scrollTo(scrollTop, animate, function () {
                    var indexData = self.getIndexData(index); // data present at calculated index
                    //call onscroll to section callback
                    (anchorSetup[index] && anchorSetup[index].onscrollToSection || options.onscrollToSection)(indexData);

                    //call the provided callback
                    callback(indexData);
                });
            }
        },
        _onScroll: function () {
            var self = this;
            self._updateScrollAnchors(self.scrollTop());
        },
        //calculate dimensions for anchors and sections
        _setScrollAchorSize: function () {

            var self = this,
                options = self.options,
                container = self.container,
                vertical = self._vertical,
                scrollMenuWrapper = self.scrollMenuWrap;

            var containerHeight = container.is('body,html') ? $window.height() : container.height(),
                containerWidth = container.width(),
                scrollMenuSize = vertical ? Math.min(containerHeight, scrollMenuWrapper.innerHeight()) : Math.min(containerWidth, scrollMenuWrapper.innerWidth() || 1000000); //height of scrollMenu wrapper in case menu type is vertical and width in case menu type is horizontal

            if (scrollMenuSize < 100) {
                scrollMenuSize = vertical ? containerHeight : containerWidth;
            }

            self.scrollHeight = self._scrollHeight();

            var menuPaddingStart = parseInt(scrollMenuWrapper.css(vertical ? 'padding-top' : 'padding-left'), 10) || 0,
                menuPaddingEnd = parseInt(scrollMenuWrapper.css(vertical ? 'padding-bottom' : 'padding-right'), 10) || 0;

            var handleSize = (scrollMenuSize - menuPaddingStart - menuPaddingEnd - options.scrollAnchorSpacing * (self.scrollHandles.length - 1)) * containerHeight / self.scrollHeight;


            //set handle size
            self.scrollHandles[vertical ? 'height' : 'width'](handleSize);

            self._sizeFactor = handleSize / containerHeight;

            self.sections.each(function (idx) {
                var $this = $.single(this),
                    secHeight = $this.innerHeight(),
                    topPos = $this.position().top;

                self._sectionHeights[idx] = secHeight;
                self._sectionTops[idx] = topPos;
                $.single(self.scrollAnchors[idx])[vertical ? 'height' : 'width'](secHeight * handleSize / containerHeight);
            });

            return self;
        },
        //update scrollbar inside scroll anchors
        _updateScrollAnchors: function (scrollTop) {
            var self = this;

            self.scrollAnchors.each(function (idx) {
                var scrollHandle = $.single(self.scrollHandles[idx]),
                    perc = (scrollTop - self._sectionTops[idx]) * 100 / self._sectionHeights[idx];

                scrollHandle.css(self._vertical ? 'top' : 'left', perc + '%');
            });
        },
        refresh: function () {
            this._setScrollAchorSize();
        },
        destroy: function () {
            var self = this;
            //remove scrollmenu and wraps
            self.scrollMenuWrap.remove();
            if (self.scrollElm) {
                self.scrollElm.children().children().unwrap().unwrap();
            }

            //remove scroller container
            self.container.removeClass('scroller-container');

            //remove event listener
            $window.off('resize.scrollMenu');
        }
    }

    //provide a globally accessable api for ScrollMenu
    global.ScrollMenu = function (container, options) {
        return (new ScrollMenu(container, options))._init();
    }
    global.ScrollMenu.defaults = defaults;

}(jQuery, window, document));