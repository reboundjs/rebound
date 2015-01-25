// jshint ignore: start
/*! @source http://purl.eligrey.com/github/classList.js/blob/master/classList.js*/
;if("document" in self&&!("classList" in document.createElement("_"))){(function(j){"use strict";if(!("Element" in j)){return}var a="classList",f="prototype",m=j.Element[f],b=Object,k=String[f].trim||function(){return this.replace(/^\s+|\s+$/g,"")},c=Array[f].indexOf||function(q){var p=0,o=this.length;for(;p<o;p++){if(p in this&&this[p]===q){return p}}return -1},n=function(o,p){this.name=o;this.code=DOMException[o];this.message=p},g=function(p,o){if(o===""){throw new n("SYNTAX_ERR","An invalid or illegal string was specified")}if(/\s/.test(o)){throw new n("INVALID_CHARACTER_ERR","String contains an invalid character")}return c.call(p,o)},d=function(s){var r=k.call(s.getAttribute("class")||""),q=r?r.split(/\s+/):[],p=0,o=q.length;for(;p<o;p++){this.push(q[p])}this._updateClassName=function(){s.setAttribute("class",this.toString())}},e=d[f]=[],i=function(){return new d(this)};n[f]=Error[f];e.item=function(o){return this[o]||null};e.contains=function(o){o+="";return g(this,o)!==-1};e.add=function(){var s=arguments,r=0,p=s.length,q,o=false;do{q=s[r]+"";if(g(this,q)===-1){this.push(q);o=true}}while(++r<p);if(o){this._updateClassName()}};e.remove=function(){var t=arguments,s=0,p=t.length,r,o=false;do{r=t[s]+"";var q=g(this,r);if(q!==-1){this.splice(q,1);o=true}}while(++s<p);if(o){this._updateClassName()}};e.toggle=function(p,q){p+="";var o=this.contains(p),r=o?q!==true&&"remove":q!==false&&"add";if(r){this[r](p)}return !o};e.toString=function(){return this.join(" ")};if(b.defineProperty){var l={get:i,enumerable:true,configurable:true};try{b.defineProperty(m,a,l)}catch(h){if(h.number===-2146823252){l.enumerable=false;b.defineProperty(m,a,l)}}}else{if(b[f].__defineGetter__){m.__defineGetter__(a,i)}}}(self))};
// IE8+ support of matchesSelector
this.Element && function(ElementPrototype) {
  ElementPrototype.matchesSelector = ElementPrototype.matchesSelector ||
  ElementPrototype.mozMatchesSelector ||
  ElementPrototype.msMatchesSelector ||
  ElementPrototype.oMatchesSelector ||
  ElementPrototype.webkitMatchesSelector ||
  function (selector) {
    var node = this, nodes = (node.parentNode || node.document).querySelectorAll(selector), i = -1;

    while (nodes[++i] && nodes[i] != node);

    return !!nodes[i];
  };
}(Element.prototype);
/*!
 * Shim for MutationObserver interface
 * Author: Graeme Yeates (github.com/megawac)
 * Repository: https://github.com/megawac/MutationObserver.js
 * License: WTFPL V2, 2004 (wtfpl.net).
 * Though credit and staring the repo will make me feel pretty, you can modify and redistribute as you please.
 * Attempts to follow spec (http://www.w3.org/TR/dom/#mutation-observers) as closely as possible for native javascript
 * See https://github.com/WebKit/webkit/blob/master/Source/WebCore/dom/MutationObserver.cpp for current webkit source c++ implementation
 */

/**
 * prefix bugs:
    -https://bugs.webkit.org/show_bug.cgi?id=85161
    -https://bugzilla.mozilla.org/show_bug.cgi?id=749920
*/
this.MutationObserver = this.MutationObserver || this.WebKitMutationObserver || (function(undefined) {
    "use strict";
    /**
     * @param {function(Array.<MutationRecord>, MutationObserver)} listener
     * @constructor
     */
    function MutationObserver(listener) {
        /**
         * @type {Array.<Object>}
         * @private
         */
        this._watched = [];
        /** @private */
        this._listener = listener;
    }

    /**
     * Start a recursive timeout function to check all items being observed for mutations
     * @type {MutationObserver} observer
     * @private
     */
    function startMutationChecker(observer) {
        (function check() {
            var mutations = observer.takeRecords();

            if (mutations.length) { //fire away
                //calling the listener with context is not spec but currently consistent with FF and WebKit
                observer._listener(mutations, observer);
            }
            /** @private */
            observer._timeout = setTimeout(check, MutationObserver._period);
        })();
    }

    /**
     * Period to check for mutations (~32 times/sec)
     * @type {number}
     * @expose
     */
    MutationObserver._period = 30 /*ms+runtime*/ ;

    /**
     * Exposed API
     * @expose
     * @final
     */
    MutationObserver.prototype = {
        /**
         * see http://dom.spec.whatwg.org/#dom-mutationobserver-observe
         * not going to throw here but going to follow the current spec config sets
         * @param {Node|null} $target
         * @param {Object|null} config : MutationObserverInit configuration dictionary
         * @expose
         * @return undefined
         */
        observe: function($target, config) {
            /**
             * Using slightly different names so closure can go ham
             * @type {!Object} : A custom mutation config
             */
            var settings = {
                attr: !! (config.attributes || config.attributeFilter || config.attributeOldValue),

                //some browsers are strict in their implementation that config.subtree and childList must be set together. We don't care - spec doesn't specify
                kids: !! config.childList,
                descendents: !! config.subtree,
                charData: !! (config.characterData || config.characterDataOldValue)
            };

            var watched = this._watched;

            //remove already observed target element from pool
            for (var i = 0; i < watched.length; i++) {
                if (watched[i].tar === $target) watched.splice(i, 1);
            }

            if (config.attributeFilter) {
                /**
                 * converts to a {key: true} dict for faster lookup
                 * @type {Object.<String,Boolean>}
                 */
                settings.afilter = reduce(config.attributeFilter, function(a, b) {
                    a[b] = true;
                    return a;
                }, {});
            }

            watched.push({
                tar: $target,
                fn: createMutationSearcher($target, settings)
            });

            //reconnect if not connected
            if (!this._timeout) {
                startMutationChecker(this);
            }
        },

        /**
         * Finds mutations since last check and empties the "record queue" i.e. mutations will only be found once
         * @expose
         * @return {Array.<MutationRecord>}
         */
        takeRecords: function() {
            var mutations = [];
            var watched = this._watched;

            for (var i = 0; i < watched.length; i++) {
                watched[i].fn(mutations);
            }

            return mutations;
        },

        /**
         * @expose
         * @return undefined
         */
        disconnect: function() {
            this._watched = []; //clear the stuff being observed
            clearTimeout(this._timeout); //ready for garbage collection
            /** @private */
            this._timeout = null;
        }
    };

    /**
     * Simple MutationRecord pseudoclass. No longer exposing as its not fully compliant
     * @param {Object} data
     * @return {Object} a MutationRecord
     */
    function MutationRecord(data) {
        var settings = { //technically these should be on proto so hasOwnProperty will return false for non explicitly props
            type: null,
            target: null,
            addedNodes: [],
            removedNodes: [],
            previousSibling: null,
            nextSibling: null,
            attributeName: null,
            attributeNamespace: null,
            oldValue: null
        };
        for (var prop in data) {
            if (has(settings, prop) && data[prop] !== undefined) settings[prop] = data[prop];
        }
        return settings;
    }

    /**
     * Creates a func to find all the mutations
     *
     * @param {Node} $target
     * @param {!Object} config : A custom mutation config
     */
    function createMutationSearcher($target, config) {
        /** type {Elestuct} */
        var $oldstate = clone($target, config); //create the cloned datastructure

        /**
         * consumes array of mutations we can push to
         *
         * @param {Array.<MutationRecord>} mutations
         */
        return function(mutations) {
            var olen = mutations.length;

            //Alright we check base level changes in attributes... easy
            if (config.attr && $oldstate.attr) {
                findAttributeMutations(mutations, $target, $oldstate.attr, config.afilter);
            }

            //check childlist or subtree for mutations
            if (config.kids || config.descendents) {
                searchSubtree(mutations, $target, $oldstate, config);
            }


            //reclone data structure if theres changes
            if (mutations.length !== olen) {
                /** type {Elestuct} */
                $oldstate = clone($target, config);
            }
        };
    }

    /* attributes + attributeFilter helpers */

    /**
     * fast helper to check to see if attributes object of an element has changed
     * doesnt handle the textnode case
     *
     * @param {Array.<MutationRecord>} mutations
     * @param {Node} $target
     * @param {Object.<string, string>} $oldstate : Custom attribute clone data structure from clone
     * @param {Object} filter
     */
    function findAttributeMutations(mutations, $target, $oldstate, filter) {
        var checked = {};
        var attributes = $target.attributes;
        var attr;
        var name;
        var i = attributes.length;
        while (i--) {
            attr = attributes[i];
            name = attr.name;
            if (!filter || has(filter, name)) {
                if (attr.value !== $oldstate[name]) {
                    //The pushing is redundant but gzips very nicely
                    mutations.push(MutationRecord({
                        type: "attributes",
                        target: $target,
                        attributeName: name,
                        oldValue: $oldstate[name],
                        attributeNamespace: attr.namespaceURI //in ie<8 it incorrectly will return undefined
                    }));
                }
                checked[name] = true;
            }
        }
        for (name in $oldstate) {
            if (!(checked[name])) {
                mutations.push(MutationRecord({
                    target: $target,
                    type: "attributes",
                    attributeName: name,
                    oldValue: $oldstate[name]
                }));
            }
        }
    }

    /**
     * searchSubtree: array of mutations so far, element, element clone, bool
     * synchronous dfs comparision of two nodes
     * This function is applied to any observed element with childList or subtree specified
     * Sorry this is kind of confusing as shit, tried to comment it a bit...
     * codereview.stackexchange.com/questions/38351 discussion of an earlier version of this func
     *
     * @param {Array} mutations
     * @param {Node} $target
     * @param {!Object} $oldstate : A custom cloned node from clone()
     * @param {!Object} config : A custom mutation config
     */
    function searchSubtree(mutations, $target, $oldstate, config) {
        /*
         * Helper to identify node rearrangment and stuff...
         * There is no gaurentee that the same node will be identified for both added and removed nodes
         * if the positions have been shuffled.
         * conflicts array will be emptied by end of operation
         */
        function resolveConflicts(conflicts, node, $kids, $oldkids, numAddedNodes) {
            // the distance between the first conflicting node and the last
            var distance = conflicts.length - 1;
            // prevents same conflict being resolved twice consider when two nodes switch places.
            // only one should be given a mutation event (note -~ is used as a math.ceil shorthand)
            var counter = -~((distance - numAddedNodes) / 2);
            var $cur;
            var oldstruct;
            var conflict;
            while((conflict = conflicts.pop())) {
                $cur = $kids[conflict.i];
                oldstruct = $oldkids[conflict.j];

                //attempt to determine if there was node rearrangement... won't gaurentee all matches
                //also handles case where added/removed nodes cause nodes to be identified as conflicts
                if (config.kids && counter && Math.abs(conflict.i - conflict.j) >= distance) {
                    mutations.push(MutationRecord({
                        type: "childList",
                        target: node,
                        addedNodes: [$cur],
                        removedNodes: [$cur],
                        // haha don't rely on this please
                        nextSibling: $cur.nextSibling,
                        previousSibling: $cur.previousSibling
                    }));
                    counter--; //found conflict
                }

                //Alright we found the resorted nodes now check for other types of mutations
                if (config.attr && oldstruct.attr) findAttributeMutations(mutations, $cur, oldstruct.attr, config.afilter);
                if (config.charData && $cur.nodeType === 3 && $cur.nodeValue !== oldstruct.charData) {
                    mutations.push(MutationRecord({
                        type: "characterData",
                        target: $cur,
                        oldValue: oldstruct.charData
                    }));
                }
                //now look @ subtree
                if (config.descendents) findMutations($cur, oldstruct);
            }
        }

        /**
         * Main worker. Finds and adds mutations if there are any
         * @param {Node} node
         * @param {!Object} old : A cloned data structure using internal clone
         */
        function findMutations(node, old) {
            var $kids = node.childNodes;
            var $oldkids = old.kids;
            var klen = $kids.length;
            // $oldkids will be undefined for text and comment nodes
            var olen = $oldkids ? $oldkids.length : 0;
            // if (!olen && !klen) return; //both empty; clearly no changes

            //we delay the intialization of these for marginal performance in the expected case (actually quite signficant on large subtrees when these would be otherwise unused)
            //map of checked element of ids to prevent registering the same conflict twice
            var map;
            //array of potential conflicts (ie nodes that may have been re arranged)
            var conflicts;
            var id; //element id from getElementId helper
            var idx; //index of a moved or inserted element

            var oldstruct;
            //current and old nodes
            var $cur;
            var $old;
            //track the number of added nodes so we can resolve conflicts more accurately
            var numAddedNodes = 0;

            //iterate over both old and current child nodes at the same time
            var i = 0, j = 0;
            //while there is still anything left in $kids or $oldkids (same as i < $kids.length || j < $oldkids.length;)
            while( i < klen || j < olen ) {
                //current and old nodes at the indexs
                $cur = $kids[i];
                oldstruct = $oldkids[j];
                $old = oldstruct && oldstruct.node;

                if ($cur === $old) { //expected case - optimized for this case
                    //check attributes as specified by config
                    if (config.attr && oldstruct.attr) /* oldstruct.attr instead of textnode check */findAttributeMutations(mutations, $cur, oldstruct.attr, config.afilter);
                    //check character data if set
                    if (config.charData && $cur.nodeType === 3 && $cur.nodeValue !== oldstruct.charData) {
                        mutations.push(MutationRecord({
                            type: "characterData",
                            target: $cur,
                            oldValue: oldstruct.charData
                        }));
                    }

                    //resolve conflicts; it will be undefined if there are no conflicts - otherwise an array
                    if (conflicts) resolveConflicts(conflicts, node, $kids, $oldkids, numAddedNodes);

                    //recurse on next level of children. Avoids the recursive call when there are no children left to iterate
                    if (config.descendents && ($cur.childNodes.length || oldstruct.kids && oldstruct.kids.length)) findMutations($cur, oldstruct);

                    i++;
                    j++;
                } else { //(uncommon case) lookahead until they are the same again or the end of children
                    if(!map) { //delayed initalization (big perf benefit)
                        map = {};
                        conflicts = [];
                    }
                    if ($cur) {
                        //check id is in the location map otherwise do a indexOf search
                        if (!(map[id = getElementId($cur)])) { //to prevent double checking
                            //mark id as found
                            map[id] = true;
                            //custom indexOf using comparitor checking oldkids[i].node === $cur
                            if ((idx = indexOfCustomNode($oldkids, $cur, j)) === -1) {
                                if (config.kids) {
                                    mutations.push(MutationRecord({
                                        type: "childList",
                                        target: node,
                                        addedNodes: [$cur], //$cur is a new node
                                        nextSibling: $cur.nextSibling,
                                        previousSibling: $cur.previousSibling
                                    }));
                                    numAddedNodes++;
                                }
                            } else {
                                conflicts.push({ //add conflict
                                    i: i,
                                    j: idx
                                });
                            }
                        }
                        i++;
                    }

                    if ($old &&
                       //special case: the changes may have been resolved: i and j appear congurent so we can continue using the expected case
                       $old !== $kids[i]
                    ) {
                        if (!(map[id = getElementId($old)])) {
                            map[id] = true;
                            if ((idx = indexOf($kids, $old, i)) === -1) {
                                if(config.kids) {
                                    mutations.push(MutationRecord({
                                        type: "childList",
                                        target: old.node,
                                        removedNodes: [$old],
                                        nextSibling: $oldkids[j + 1], //praise no indexoutofbounds exception
                                        previousSibling: $oldkids[j - 1]
                                    }));
                                    numAddedNodes--;
                                }
                            } else {
                                conflicts.push({
                                    i: idx,
                                    j: j
                                });
                            }
                        }
                        j++;
                    }
                }//end uncommon case
            }//end loop

            //resolve any remaining conflicts
            if (conflicts) resolveConflicts(conflicts, node, $kids, $oldkids, numAddedNodes);
        }
        findMutations($target, $oldstate);
    }

    /**
     * Utility
     * Cones a element into a custom data structure designed for comparision. https://gist.github.com/megawac/8201012
     *
     * @param {Node} $target
     * @param {!Object} config : A custom mutation config
     * @return {!Object} : Cloned data structure
     */
    function clone($target, config) {
        var recurse = true; // set true so childList we'll always check the first level
        return (function copy($target) {
            var isText = $target.nodeType === 3;
            var elestruct = {
                /** @type {Node} */
                node: $target
            };

            //is text or comemnt node
            if (isText || $target.nodeType === 8) {
                if (isText && config.charData) {
                    elestruct.charData = $target.nodeValue;
                }
            } else { //its either a element or document node (or something stupid)

                if(config.attr && recurse) { // add attr only if subtree is specified or top level
                    /**
                     * clone live attribute list to an object structure {name: val}
                     * @type {Object.<string, string>}
                     */
                    elestruct.attr = reduce($target.attributes, function(memo, attr) {
                        if (!config.afilter || config.afilter[attr.name]) {
                            memo[attr.name] = attr.value;
                        }
                        return memo;
                    }, {});
                }

                // whether we should iterate the children of $target node
                if(recurse && ((config.kids || config.charData) || (config.attr && config.descendents)) ) {
                    /** @type {Array.<!Object>} : Array of custom clone */
                    elestruct.kids = map($target.childNodes, copy);
                }

                recurse = config.descendents;
            }
            return elestruct;
        })($target);
    }

    /**
     * indexOf an element in a collection of custom nodes
     *
     * @param {NodeList} set
     * @param {!Object} $node : A custom cloned node
     * @param {number} idx : index to start the loop
     * @return {number}
     */
    function indexOfCustomNode(set, $node, idx) {
        return indexOf(set, $node, idx, JSCompiler_renameProperty("node"));
    }

    //using a non id (eg outerHTML or nodeValue) is extremely naive and will run into issues with nodes that may appear the same like <li></li>
    var counter = 1; //don't use 0 as id (falsy)
    /** @const */
    var expando = "mo_id";

    /**
     * Attempt to uniquely id an element for hashing. We could optimize this for legacy browsers but it hopefully wont be called enough to be a concern
     *
     * @param {Node} $ele
     * @return {(string|number)}
     */
    function getElementId($ele) {
        try {
            return $ele.id || ($ele[expando] = $ele[expando] || counter++);
        } catch (o_O) { //ie <8 will throw if you set an unknown property on a text node
            try {
                return $ele.nodeValue; //naive
            } catch (shitie) { //when text node is removed: https://gist.github.com/megawac/8355978 :(
                return counter++;
            }
        }
    }

    /**
     * **map** Apply a mapping function to each item of a set
     * @param {Array|NodeList} set
     * @param {Function} iterator
     */
    function map(set, iterator) {
        var results = [];
        for (var index = 0; index < set.length; index++) {
            results[index] = iterator(set[index], index, set);
        }
        return results;
    }

    /**
     * **Reduce** builds up a single result from a list of values
     * @param {Array|NodeList|NamedNodeMap} set
     * @param {Function} iterator
     * @param {*} [memo] Initial value of the memo.
     */
    function reduce(set, iterator, memo) {
        for (var index = 0; index < set.length; index++) {
            memo = iterator(memo, set[index], index, set);
        }
        return memo;
    }

    /**
     * **indexOf** find index of item in collection.
     * @param {Array|NodeList} set
     * @param {Object} item
     * @param {number} idx
     * @param {string} [prop] Property on set item to compare to item
     */
    function indexOf(set, item, idx, prop) {
        for (/*idx = ~~idx*/; idx < set.length; idx++) {//start idx is always given as this is internal
            if ((prop ? set[idx][prop] : set[idx]) === item) return idx;
        }
        return -1;
    }

    /**
     * @param {Object} obj
     * @param {(string|number)} prop
     * @return {boolean}
     */
    function has(obj, prop) {
        return obj[prop] !== undefined; //will be nicely inlined by gcc
    }

    // GCC hack see http://stackoverflow.com/a/23202438/1517919
    function JSCompiler_renameProperty(a) {
        return a;
    }

    return MutationObserver;
})(void 0);
/*! (C) WebReflection Mit Style License */
(function(e,t,n,r){"use strict";function q(e,t){for(var n=0,r=e.length;n<r;n++)J(e[n],t)}function R(e){for(var t=0,n=e.length,r;t<n;t++)r=e[t],$(r,c[z(r)])}function U(e){return function(t){g.call(L,t)&&(J(t,e),q(t.querySelectorAll(h),e))}}function z(e){var t=e.getAttribute("is");return d.call(l,t?t.toUpperCase():e.nodeName)}function W(e){var t=e.currentTarget,n=e.attrChange,r=e.prevValue,i=e.newValue;t.attributeChangedCallback&&e.attrName!=="style"&&t.attributeChangedCallback(e.attrName,n===e.ADDITION?null:r,n===e.REMOVAL?null:i)}function X(e){var t=U(e);return function(e){t(e.target)}}function V(e,t){var n=this;O.call(n,e,t),B.call(n,{target:n})}function $(e,t){N(e,t),I?I.observe(e,_):(H&&(e.setAttribute=V,e[i]=F(e),e.addEventListener(u,B)),e.addEventListener(o,W)),e.createdCallback&&(e.created=!0,e.createdCallback(),e.created=!1)}function J(e,t){var n,r=z(e),i="attached",s="detached";-1<r&&(C(e,c[r]),r=0,t===i&&!e[i]?(e[s]=!1,e[i]=!0,r=1):t===s&&!e[s]&&(e[i]=!1,e[s]=!0,r=1),r&&(n=e[t+"Callback"])&&n.call(e))}if(r in t)return;var i="__"+r+(Math.random()*1e5>>0),s="extends",o="DOMAttrModified",u="DOMSubtreeModified",a=/^[A-Z][A-Z0-9]*(?:-[A-Z0-9]+)+$/,f=["ANNOTATION-XML","COLOR-PROFILE","FONT-FACE","FONT-FACE-SRC","FONT-FACE-URI","FONT-FACE-FORMAT","FONT-FACE-NAME","MISSING-GLYPH"],l=[],c=[],h="",p=t.documentElement,d=l.indexOf||function(e){for(var t=this.length;t--&&this[t]!==e;);return t},v=n.prototype,m=v.hasOwnProperty,g=v.isPrototypeOf,y=n.defineProperty,b=n.getOwnPropertyDescriptor,w=n.getOwnPropertyNames,E=n.getPrototypeOf,S=n.setPrototypeOf,x=!!n.__proto__,T=n.create||function K(e){return e?(K.prototype=e,new K):this},N=S||(x?function(e,t){return e.__proto__=t,e}:w&&b?function(){function e(e,t){for(var n,r=w(t),i=0,s=r.length;i<s;i++)n=r[i],m.call(e,n)||y(e,n,b(t,n))}return function(t,n){do e(t,n);while(n=E(n));return t}}():function(e,t){for(var n in t)e[n]=t[n];return e}),C=S||x?function(e,t){g.call(t,e)||$(e,t)}:function(e,t){e[i]||(e[i]=n(!0),$(e,t))},k=e.MutationObserver||e.WebKitMutationObserver,L=(e.HTMLElement||e.Element||e.Node).prototype,A=L.cloneNode,O=L.setAttribute,M=t.createElement,_=k&&{attributes:!0,characterData:!0,attributeOldValue:!0},D=k||function(e){H=!1,p.removeEventListener(o,D)},P=!1,H=!0,B,j,F,I;k||(p.addEventListener(o,D),p.setAttribute(i,1),p.removeAttribute(i),H&&(B=function(e){var t=this,n,r,s;if(t===e.target){n=t[i],t[i]=r=F(t);for(s in r){if(!(s in n))return j(0,t,s,n[s],r[s],"ADDITION");if(r[s]!==n[s])return j(1,t,s,n[s],r[s],"MODIFICATION")}for(s in n)if(!(s in r))return j(2,t,s,n[s],r[s],"REMOVAL")}},j=function(e,t,n,r,i,s){var o={attrChange:e,currentTarget:t,attrName:n,prevValue:r,newValue:i};o[s]=e,W(o)},F=function(e){for(var t,n,r={},i=e.attributes,s=0,o=i.length;s<o;s++)t=i[s],n=t.name,n!=="setAttribute"&&(r[n]=t.value);return r})),t[r]=function(n,r){y=n.toUpperCase(),P||(P=!0,k?(I=function(e,t){function n(e,t){for(var n=0,r=e.length;n<r;t(e[n++]));}return new k(function(r){for(var i,s,o=0,u=r.length;o<u;o++)i=r[o],i.type==="childList"?(n(i.addedNodes,e),n(i.removedNodes,t)):(s=i.target,s.attributeChangedCallback&&i.attributeName!=="style"&&s.attributeChangedCallback(i.attributeName,i.oldValue,s.getAttribute(i.attributeName)))})}(U("attached"),U("detached")),I.observe(t,{childList:!0,subtree:!0})):(t.addEventListener("DOMNodeInserted",X("attached")),t.addEventListener("DOMNodeRemoved",X("detached"))),t.addEventListener("readystatechange",function(e){q(t.querySelectorAll(h),"attached")}),t.createElement=function(e,n){var r,i=M.apply(t,arguments);return n&&i.setAttribute("is",e=n.toLowerCase()),r=d.call(l,e.toUpperCase()),-1<r&&$(i,c[r]),i},L.cloneNode=function(e){var t=A.call(this,!!e),n=z(t);return-1<n&&$(t,c[n]),e&&R(t.querySelectorAll(h)),t});if(-1<d.call(l,y))throw new Error("A "+n+" type is already registered");if(!a.test(y)||-1<d.call(f,y))throw new Error("The type "+n+" is invalid");var i=function(){return t.createElement(p,u&&y)},o=r||v,u=m.call(o,s),p=u?r[s]:y,g=l.push(y)-1,y;return h=h.concat(h.length?",":"",u?p+'[is="'+n.toLowerCase()+'"]':p),i.prototype=c[g]=m.call(o,"prototype")?o.prototype:T(L),q(t.querySelectorAll(h),"attached"),i}})(window,document,Object,"registerElement");
//     Backbone.js 1.1.2

//     (c) 2010-2014 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
//     Backbone may be freely distributed under the MIT license.
//     For all details and documentation:
//     http://backbonejs.org

(function(root, factory) {

  // Set up Backbone appropriately for the environment. Start with AMD.
  if (typeof define === 'function' && define.amd) {
    define(['underscore', 'jquery', 'exports'], function(_, $, exports) {
      // Export global even in AMD case in case this script is loaded with
      // others that may still expect a global Backbone.
      root.Backbone = factory(root, exports, _, $);
    });

  // Next for Node.js or CommonJS. jQuery may not be needed as a module.
  } else if (typeof exports !== 'undefined') {
    var _ = require('underscore');
    factory(root, exports, _);

  // Finally, as a browser global.
  } else {
    root.Backbone = factory(root, {}, root._, (root.jQuery || root.Zepto || root.ender || root.$));
  }

}(this, function(root, Backbone, _, $) {

  // Initial Setup
  // -------------

  // Save the previous value of the `Backbone` variable, so that it can be
  // restored later on, if `noConflict` is used.
  var previousBackbone = root.Backbone;

  // Create local references to array methods we'll want to use later.
  var array = [];
  var slice = array.slice;

  // Current version of the library. Keep in sync with `package.json`.
  Backbone.VERSION = '1.1.2';

  // For Backbone's purposes, jQuery, Zepto, Ender, or My Library (kidding) owns
  // the `$` variable.
  Backbone.$ = $;

  // Runs Backbone.js in *noConflict* mode, returning the `Backbone` variable
  // to its previous owner. Returns a reference to this Backbone object.
  Backbone.noConflict = function() {
    root.Backbone = previousBackbone;
    return this;
  };

  // Turn on `emulateHTTP` to support legacy HTTP servers. Setting this option
  // will fake `"PATCH"`, `"PUT"` and `"DELETE"` requests via the `_method` parameter and
  // set a `X-Http-Method-Override` header.
  Backbone.emulateHTTP = false;

  // Turn on `emulateJSON` to support legacy servers that can't deal with direct
  // `application/json` requests ... will encode the body as
  // `application/x-www-form-urlencoded` instead and will send the model in a
  // form param named `model`.
  Backbone.emulateJSON = false;

  // Backbone.Events
  // ---------------

  // A module that can be mixed in to *any object* in order to provide it with
  // custom events. You may bind with `on` or remove with `off` callback
  // functions to an event; `trigger`-ing an event fires all callbacks in
  // succession.
  //
  //     var object = {};
  //     _.extend(object, Backbone.Events);
  //     object.on('expand', function(){ alert('expanded'); });
  //     object.trigger('expand');
  //
  var Events = Backbone.Events = {

    // Bind an event to a `callback` function. Passing `"all"` will bind
    // the callback to all events fired.
    on: function(name, callback, context) {
      if (!eventsApi(this, 'on', name, [callback, context]) || !callback) return this;
      this._events || (this._events = {});
      var events = this._events[name] || (this._events[name] = []);
      events.push({callback: callback, context: context, ctx: context || this});
      return this;
    },

    // Bind an event to only be triggered a single time. After the first time
    // the callback is invoked, it will be removed.
    once: function(name, callback, context) {
      if (!eventsApi(this, 'once', name, [callback, context]) || !callback) return this;
      var self = this;
      var once = _.once(function() {
        self.off(name, once);
        callback.apply(this, arguments);
      });
      once._callback = callback;
      return this.on(name, once, context);
    },

    // Remove one or many callbacks. If `context` is null, removes all
    // callbacks with that function. If `callback` is null, removes all
    // callbacks for the event. If `name` is null, removes all bound
    // callbacks for all events.
    off: function(name, callback, context) {
      if (!this._events || !eventsApi(this, 'off', name, [callback, context])) return this;

      // Remove all callbacks for all events.
      if (!name && !callback && !context) {
        this._events = void 0;
        return this;
      }

      var names = name ? [name] : _.keys(this._events);
      for (var i = 0, length = names.length; i < length; i++) {
        name = names[i];

        // Bail out if there are no events stored.
        var events = this._events[name];
        if (!events) continue;

        // Remove all callbacks for this event.
        if (!callback && !context) {
          delete this._events[name];
          continue;
        }

        // Find any remaining events.
        var remaining = [];
        for (var j = 0, k = events.length; j < k; j++) {
          var event = events[j];
          if (
            callback && callback !== event.callback &&
            callback !== event.callback._callback ||
            context && context !== event.context
          ) {
            remaining.push(event);
          }
        }

        // Replace events if there are any remaining.  Otherwise, clean up.
        if (remaining.length) {
          this._events[name] = remaining;
        } else {
          delete this._events[name];
        }
      }

      return this;
    },

    // Trigger one or many events, firing all bound callbacks. Callbacks are
    // passed the same arguments as `trigger` is, apart from the event name
    // (unless you're listening on `"all"`, which will cause your callback to
    // receive the true name of the event as the first argument).
    trigger: function(name) {
      if (!this._events) return this;
      var args = slice.call(arguments, 1);
      if (!eventsApi(this, 'trigger', name, args)) return this;
      var events = this._events[name];
      var allEvents = this._events.all;
      if (events) triggerEvents(events, args);
      if (allEvents) triggerEvents(allEvents, arguments);
      return this;
    },

    // Tell this object to stop listening to either specific events ... or
    // to every object it's currently listening to.
    stopListening: function(obj, name, callback) {
      var listeningTo = this._listeningTo;
      if (!listeningTo) return this;
      var remove = !name && !callback;
      if (!callback && typeof name === 'object') callback = this;
      if (obj) (listeningTo = {})[obj._listenId] = obj;
      for (var id in listeningTo) {
        obj = listeningTo[id];
        obj.off(name, callback, this);
        if (remove || _.isEmpty(obj._events)) delete this._listeningTo[id];
      }
      return this;
    }

  };

  // Regular expression used to split event strings.
  var eventSplitter = /\s+/;

  // Implement fancy features of the Events API such as multiple event
  // names `"change blur"` and jQuery-style event maps `{change: action}`
  // in terms of the existing API.
  var eventsApi = function(obj, action, name, rest) {
    if (!name) return true;

    // Handle event maps.
    if (typeof name === 'object') {
      for (var key in name) {
        obj[action].apply(obj, [key, name[key]].concat(rest));
      }
      return false;
    }

    // Handle space separated event names.
    if (eventSplitter.test(name)) {
      var names = name.split(eventSplitter);
      for (var i = 0, length = names.length; i < length; i++) {
        obj[action].apply(obj, [names[i]].concat(rest));
      }
      return false;
    }

    return true;
  };

  // A difficult-to-believe, but optimized internal dispatch function for
  // triggering events. Tries to keep the usual cases speedy (most internal
  // Backbone events have 3 arguments).
  var triggerEvents = function(events, args) {
    var ev, i = -1, l = events.length, a1 = args[0], a2 = args[1], a3 = args[2];
    switch (args.length) {
      case 0: while (++i < l) (ev = events[i]).callback.call(ev.ctx); return;
      case 1: while (++i < l) (ev = events[i]).callback.call(ev.ctx, a1); return;
      case 2: while (++i < l) (ev = events[i]).callback.call(ev.ctx, a1, a2); return;
      case 3: while (++i < l) (ev = events[i]).callback.call(ev.ctx, a1, a2, a3); return;
      default: while (++i < l) (ev = events[i]).callback.apply(ev.ctx, args); return;
    }
  };

  var listenMethods = {listenTo: 'on', listenToOnce: 'once'};

  // Inversion-of-control versions of `on` and `once`. Tell *this* object to
  // listen to an event in another object ... keeping track of what it's
  // listening to.
  _.each(listenMethods, function(implementation, method) {
    Events[method] = function(obj, name, callback) {
      var listeningTo = this._listeningTo || (this._listeningTo = {});
      var id = obj._listenId || (obj._listenId = _.uniqueId('l'));
      listeningTo[id] = obj;
      if (!callback && typeof name === 'object') callback = this;
      obj[implementation](name, callback, this);
      return this;
    };
  });

  // Aliases for backwards compatibility.
  Events.bind   = Events.on;
  Events.unbind = Events.off;

  // Allow the `Backbone` object to serve as a global event bus, for folks who
  // want global "pubsub" in a convenient place.
  _.extend(Backbone, Events);

  // Backbone.Model
  // --------------

  // Backbone **Models** are the basic data object in the framework --
  // frequently representing a row in a table in a database on your server.
  // A discrete chunk of data and a bunch of useful, related methods for
  // performing computations and transformations on that data.

  // Create a new model with the specified attributes. A client id (`cid`)
  // is automatically generated and assigned for you.
  var Model = Backbone.Model = function(attributes, options) {
    var attrs = attributes || {};
    options || (options = {});
    this.cid = _.uniqueId('c');
    this.attributes = {};
    if (options.collection) this.collection = options.collection;
    if (options.parse) attrs = this.parse(attrs, options) || {};
    attrs = _.defaults({}, attrs, _.result(this, 'defaults'));
    this.set(attrs, options);
    this.changed = {};
    this.initialize.apply(this, arguments);
  };

  // Attach all inheritable methods to the Model prototype.
  _.extend(Model.prototype, Events, {

    // A hash of attributes whose current and previous value differ.
    changed: null,

    // The value returned during the last failed validation.
    validationError: null,

    // The default name for the JSON `id` attribute is `"id"`. MongoDB and
    // CouchDB users may want to set this to `"_id"`.
    idAttribute: 'id',

    // Initialize is an empty function by default. Override it with your own
    // initialization logic.
    initialize: function(){},

    // Return a copy of the model's `attributes` object.
    toJSON: function(options) {
      return _.clone(this.attributes);
    },

    // Proxy `Backbone.sync` by default -- but override this if you need
    // custom syncing semantics for *this* particular model.
    sync: function() {
      return Backbone.sync.apply(this, arguments);
    },

    // Get the value of an attribute.
    get: function(attr) {
      return this.attributes[attr];
    },

    // Get the HTML-escaped value of an attribute.
    escape: function(attr) {
      return _.escape(this.get(attr));
    },

    // Returns `true` if the attribute contains a value that is not null
    // or undefined.
    has: function(attr) {
      return this.get(attr) != null;
    },

    // Set a hash of model attributes on the object, firing `"change"`. This is
    // the core primitive operation of a model, updating the data and notifying
    // anyone who needs to know about the change in state. The heart of the beast.
    set: function(key, val, options) {
      var attr, attrs, unset, changes, silent, changing, prev, current;
      if (key == null) return this;

      // Handle both `"key", value` and `{key: value}` -style arguments.
      if (typeof key === 'object') {
        attrs = key;
        options = val;
      } else {
        (attrs = {})[key] = val;
      }

      options || (options = {});

      // Run validation.
      if (!this._validate(attrs, options)) return false;

      // Extract attributes and options.
      unset           = options.unset;
      silent          = options.silent;
      changes         = [];
      changing        = this._changing;
      this._changing  = true;

      if (!changing) {
        this._previousAttributes = _.clone(this.attributes);
        this.changed = {};
      }
      current = this.attributes, prev = this._previousAttributes;

      // Check for changes of `id`.
      if (this.idAttribute in attrs) this.id = attrs[this.idAttribute];

      // For each `set` attribute, update or delete the current value.
      for (attr in attrs) {
        val = attrs[attr];
        if (!_.isEqual(current[attr], val)) changes.push(attr);
        if (!_.isEqual(prev[attr], val)) {
          this.changed[attr] = val;
        } else {
          delete this.changed[attr];
        }
        unset ? delete current[attr] : current[attr] = val;
      }

      // Trigger all relevant attribute changes.
      if (!silent) {
        if (changes.length) this._pending = options;
        for (var i = 0, length = changes.length; i < length; i++) {
          this.trigger('change:' + changes[i], this, current[changes[i]], options);
        }
      }

      // You might be wondering why there's a `while` loop here. Changes can
      // be recursively nested within `"change"` events.
      if (changing) return this;
      if (!silent) {
        while (this._pending) {
          options = this._pending;
          this._pending = false;
          this.trigger('change', this, options);
        }
      }
      this._pending = false;
      this._changing = false;
      return this;
    },

    // Remove an attribute from the model, firing `"change"`. `unset` is a noop
    // if the attribute doesn't exist.
    unset: function(attr, options) {
      return this.set(attr, void 0, _.extend({}, options, {unset: true}));
    },

    // Clear all attributes on the model, firing `"change"`.
    clear: function(options) {
      var attrs = {};
      for (var key in this.attributes) attrs[key] = void 0;
      return this.set(attrs, _.extend({}, options, {unset: true}));
    },

    // Determine if the model has changed since the last `"change"` event.
    // If you specify an attribute name, determine if that attribute has changed.
    hasChanged: function(attr) {
      if (attr == null) return !_.isEmpty(this.changed);
      return _.has(this.changed, attr);
    },

    // Return an object containing all the attributes that have changed, or
    // false if there are no changed attributes. Useful for determining what
    // parts of a view need to be updated and/or what attributes need to be
    // persisted to the server. Unset attributes will be set to undefined.
    // You can also pass an attributes object to diff against the model,
    // determining if there *would be* a change.
    changedAttributes: function(diff) {
      if (!diff) return this.hasChanged() ? _.clone(this.changed) : false;
      var val, changed = false;
      var old = this._changing ? this._previousAttributes : this.attributes;
      for (var attr in diff) {
        if (_.isEqual(old[attr], (val = diff[attr]))) continue;
        (changed || (changed = {}))[attr] = val;
      }
      return changed;
    },

    // Get the previous value of an attribute, recorded at the time the last
    // `"change"` event was fired.
    previous: function(attr) {
      if (attr == null || !this._previousAttributes) return null;
      return this._previousAttributes[attr];
    },

    // Get all of the attributes of the model at the time of the previous
    // `"change"` event.
    previousAttributes: function() {
      return _.clone(this._previousAttributes);
    },

    // Fetch the model from the server. If the server's representation of the
    // model differs from its current attributes, they will be overridden,
    // triggering a `"change"` event.
    fetch: function(options) {
      options = options ? _.clone(options) : {};
      if (options.parse === void 0) options.parse = true;
      var model = this;
      var success = options.success;
      options.success = function(resp) {
        if (!model.set(model.parse(resp, options), options)) return false;
        if (success) success(model, resp, options);
        model.trigger('sync', model, resp, options);
      };
      wrapError(this, options);
      return this.sync('read', this, options);
    },

    // Set a hash of model attributes, and sync the model to the server.
    // If the server returns an attributes hash that differs, the model's
    // state will be `set` again.
    save: function(key, val, options) {
      var attrs, method, xhr, attributes = this.attributes;

      // Handle both `"key", value` and `{key: value}` -style arguments.
      if (key == null || typeof key === 'object') {
        attrs = key;
        options = val;
      } else {
        (attrs = {})[key] = val;
      }

      options = _.extend({validate: true}, options);

      // If we're not waiting and attributes exist, save acts as
      // `set(attr).save(null, opts)` with validation. Otherwise, check if
      // the model will be valid when the attributes, if any, are set.
      if (attrs && !options.wait) {
        if (!this.set(attrs, options)) return false;
      } else {
        if (!this._validate(attrs, options)) return false;
      }

      // Set temporary attributes if `{wait: true}`.
      if (attrs && options.wait) {
        this.attributes = _.extend({}, attributes, attrs);
      }

      // After a successful server-side save, the client is (optionally)
      // updated with the server-side state.
      if (options.parse === void 0) options.parse = true;
      var model = this;
      var success = options.success;
      options.success = function(resp) {
        // Ensure attributes are restored during synchronous saves.
        model.attributes = attributes;
        var serverAttrs = model.parse(resp, options);
        if (options.wait) serverAttrs = _.extend(attrs || {}, serverAttrs);
        if (_.isObject(serverAttrs) && !model.set(serverAttrs, options)) {
          return false;
        }
        if (success) success(model, resp, options);
        model.trigger('sync', model, resp, options);
      };
      wrapError(this, options);

      method = this.isNew() ? 'create' : (options.patch ? 'patch' : 'update');
      if (method === 'patch' && !options.attrs) options.attrs = attrs;
      xhr = this.sync(method, this, options);

      // Restore attributes.
      if (attrs && options.wait) this.attributes = attributes;

      return xhr;
    },

    // Destroy this model on the server if it was already persisted.
    // Optimistically removes the model from its collection, if it has one.
    // If `wait: true` is passed, waits for the server to respond before removal.
    destroy: function(options) {
      options = options ? _.clone(options) : {};
      var model = this;
      var success = options.success;

      var destroy = function() {
        model.stopListening();
        model.trigger('destroy', model, model.collection, options);
      };

      options.success = function(resp) {
        if (options.wait || model.isNew()) destroy();
        if (success) success(model, resp, options);
        if (!model.isNew()) model.trigger('sync', model, resp, options);
      };

      if (this.isNew()) {
        options.success();
        return false;
      }
      wrapError(this, options);

      var xhr = this.sync('delete', this, options);
      if (!options.wait) destroy();
      return xhr;
    },

    // Default URL for the model's representation on the server -- if you're
    // using Backbone's restful methods, override this to change the endpoint
    // that will be called.
    url: function() {
      var base =
        _.result(this, 'urlRoot') ||
        _.result(this.collection, 'url') ||
        urlError();
      if (this.isNew()) return base;
      return base.replace(/([^\/])$/, '$1/') + encodeURIComponent(this.id);
    },

    // **parse** converts a response into the hash of attributes to be `set` on
    // the model. The default implementation is just to pass the response along.
    parse: function(resp, options) {
      return resp;
    },

    // Create a new model with identical attributes to this one.
    clone: function() {
      return new this.constructor(this.attributes);
    },

    // A model is new if it has never been saved to the server, and lacks an id.
    isNew: function() {
      return !this.has(this.idAttribute);
    },

    // Check if the model is currently in a valid state.
    isValid: function(options) {
      return this._validate({}, _.extend(options || {}, { validate: true }));
    },

    // Run validation against the next complete set of model attributes,
    // returning `true` if all is well. Otherwise, fire an `"invalid"` event.
    _validate: function(attrs, options) {
      if (!options.validate || !this.validate) return true;
      attrs = _.extend({}, this.attributes, attrs);
      var error = this.validationError = this.validate(attrs, options) || null;
      if (!error) return true;
      this.trigger('invalid', this, error, _.extend(options, {validationError: error}));
      return false;
    }

  });

  // Underscore methods that we want to implement on the Model.
  var modelMethods = ['keys', 'values', 'pairs', 'invert', 'pick', 'omit', 'chain', 'isEmpty'];

  // Mix in each Underscore method as a proxy to `Model#attributes`.
  _.each(modelMethods, function(method) {
    if (!_[method]) return;
    Model.prototype[method] = function() {
      var args = slice.call(arguments);
      args.unshift(this.attributes);
      return _[method].apply(_, args);
    };
  });

  // Backbone.Collection
  // -------------------

  // If models tend to represent a single row of data, a Backbone Collection is
  // more analogous to a table full of data ... or a small slice or page of that
  // table, or a collection of rows that belong together for a particular reason
  // -- all of the messages in this particular folder, all of the documents
  // belonging to this particular author, and so on. Collections maintain
  // indexes of their models, both in order, and for lookup by `id`.

  // Create a new **Collection**, perhaps to contain a specific type of `model`.
  // If a `comparator` is specified, the Collection will maintain
  // its models in sort order, as they're added and removed.
  var Collection = Backbone.Collection = function(models, options) {
    options || (options = {});
    if (options.model) this.model = options.model;
    if (options.comparator !== void 0) this.comparator = options.comparator;
    this._reset();
    this.initialize.apply(this, arguments);
    if (models) this.reset(models, _.extend({silent: true}, options));
  };

  // Default options for `Collection#set`.
  var setOptions = {add: true, remove: true, merge: true};
  var addOptions = {add: true, remove: false};

  // Define the Collection's inheritable methods.
  _.extend(Collection.prototype, Events, {

    // The default model for a collection is just a **Backbone.Model**.
    // This should be overridden in most cases.
    model: Model,

    // Initialize is an empty function by default. Override it with your own
    // initialization logic.
    initialize: function(){},

    // The JSON representation of a Collection is an array of the
    // models' attributes.
    toJSON: function(options) {
      return this.map(function(model){ return model.toJSON(options); });
    },

    // Proxy `Backbone.sync` by default.
    sync: function() {
      return Backbone.sync.apply(this, arguments);
    },

    // Add a model, or list of models to the set.
    add: function(models, options) {
      return this.set(models, _.extend({merge: false}, options, addOptions));
    },

    // Remove a model, or a list of models from the set.
    remove: function(models, options) {
      var singular = !_.isArray(models);
      models = singular ? [models] : _.clone(models);
      options || (options = {});
      for (var i = 0, length = models.length; i < length; i++) {
        var model = models[i] = this.get(models[i]);
        if (!model) continue;
        var id = this.modelId(model.attributes);
        if (id != null) delete this._byId[id];
        delete this._byId[model.cid];
        var index = this.indexOf(model);
        this.models.splice(index, 1);
        this.length--;
        if (!options.silent) {
          options.index = index;
          model.trigger('remove', model, this, options);
        }
        this._removeReference(model, options);
      }
      return singular ? models[0] : models;
    },

    // Update a collection by `set`-ing a new list of models, adding new ones,
    // removing models that are no longer present, and merging models that
    // already exist in the collection, as necessary. Similar to **Model#set**,
    // the core operation for updating the data contained by the collection.
    set: function(models, options) {
      options = _.defaults({}, options, setOptions);
      if (options.parse) models = this.parse(models, options);
      var singular = !_.isArray(models);
      models = singular ? (models ? [models] : []) : models.slice();
      var id, model, attrs, existing, sort;
      var at = options.at;
      var sortable = this.comparator && (at == null) && options.sort !== false;
      var sortAttr = _.isString(this.comparator) ? this.comparator : null;
      var toAdd = [], toRemove = [], modelMap = {};
      var add = options.add, merge = options.merge, remove = options.remove;
      var order = !sortable && add && remove ? [] : false;

      // Turn bare objects into model references, and prevent invalid models
      // from being added.
      for (var i = 0, length = models.length; i < length; i++) {
        attrs = models[i];

        // If a duplicate is found, prevent it from being added and
        // optionally merge it into the existing model.
        if (existing = this.get(attrs)) {
          if (remove) modelMap[existing.cid] = true;
          if (merge && attrs !== existing) {
            attrs = this._isModel(attrs) ? attrs.attributes : attrs;
            if (options.parse) attrs = existing.parse(attrs, options);
            existing.set(attrs, options);
            if (sortable && !sort && existing.hasChanged(sortAttr)) sort = true;
          }
          models[i] = existing;

        // If this is a new, valid model, push it to the `toAdd` list.
        } else if (add) {
          model = models[i] = this._prepareModel(attrs, options);
          if (!model) continue;
          toAdd.push(model);
          this._addReference(model, options);
        }

        // Do not add multiple models with the same `id`.
        model = existing || model;
        if (!model) continue;
        id = this.modelId(model.attributes);
        if (order && (model.isNew() || !modelMap[id])) order.push(model);
        modelMap[id] = true;
      }

      // Remove nonexistent models if appropriate.
      if (remove) {
        for (var i = 0, length = this.length; i < length; i++) {
          if (!modelMap[(model = this.models[i]).cid]) toRemove.push(model);
        }
        if (toRemove.length) this.remove(toRemove, options);
      }

      // See if sorting is needed, update `length` and splice in new models.
      if (toAdd.length || (order && order.length)) {
        if (sortable) sort = true;
        this.length += toAdd.length;
        if (at != null) {
          for (var i = 0, length = toAdd.length; i < length; i++) {
            this.models.splice(at + i, 0, toAdd[i]);
          }
        } else {
          if (order) this.models.length = 0;
          var orderedModels = order || toAdd;
          for (var i = 0, length = orderedModels.length; i < length; i++) {
            this.models.push(orderedModels[i]);
          }
        }
      }

      // Silently sort the collection if appropriate.
      if (sort) this.sort({silent: true});

      // Unless silenced, it's time to fire all appropriate add/sort events.
      if (!options.silent) {
        var addOpts = at != null ? _.clone(options) : options;
        for (var i = 0, length = toAdd.length; i < length; i++) {
          if (at != null) addOpts.index = at + i;
          (model = toAdd[i]).trigger('add', model, this, addOpts);
        }
        if (sort || (order && order.length)) this.trigger('sort', this, options);
      }

      // Return the added (or merged) model (or models).
      return singular ? models[0] : models;
    },

    // When you have more items than you want to add or remove individually,
    // you can reset the entire set with a new list of models, without firing
    // any granular `add` or `remove` events. Fires `reset` when finished.
    // Useful for bulk operations and optimizations.
    reset: function(models, options) {
      options || (options = {});
      for (var i = 0, length = this.models.length; i < length; i++) {
        this._removeReference(this.models[i], options);
      }
      options.previousModels = this.models;
      this._reset();
      models = this.add(models, _.extend({silent: true}, options));
      if (!options.silent) this.trigger('reset', this, options);
      return models;
    },

    // Add a model to the end of the collection.
    push: function(model, options) {
      return this.add(model, _.extend({at: this.length}, options));
    },

    // Remove a model from the end of the collection.
    pop: function(options) {
      var model = this.at(this.length - 1);
      this.remove(model, options);
      return model;
    },

    // Add a model to the beginning of the collection.
    unshift: function(model, options) {
      return this.add(model, _.extend({at: 0}, options));
    },

    // Remove a model from the beginning of the collection.
    shift: function(options) {
      var model = this.at(0);
      this.remove(model, options);
      return model;
    },

    // Slice out a sub-array of models from the collection.
    slice: function() {
      return slice.apply(this.models, arguments);
    },

    // Get a model from the set by id.
    get: function(obj) {
      if (obj == null) return void 0;
      var id = this.modelId(this._isModel(obj) ? obj.attributes : obj);
      return this._byId[obj] || this._byId[id] || this._byId[obj.cid];
    },

    // Get the model at the given index.
    at: function(index) {
      if (index < 0) index += this.length;
      return this.models[index];
    },

    // Return models with matching attributes. Useful for simple cases of
    // `filter`.
    where: function(attrs, first) {
      if (_.isEmpty(attrs)) return first ? void 0 : [];
      return this[first ? 'find' : 'filter'](function(model) {
        for (var key in attrs) {
          if (attrs[key] !== model.get(key)) return false;
        }
        return true;
      });
    },

    // Return the first model with matching attributes. Useful for simple cases
    // of `find`.
    findWhere: function(attrs) {
      return this.where(attrs, true);
    },

    // Force the collection to re-sort itself. You don't need to call this under
    // normal circumstances, as the set will maintain sort order as each item
    // is added.
    sort: function(options) {
      if (!this.comparator) throw new Error('Cannot sort a set without a comparator');
      options || (options = {});

      // Run sort based on type of `comparator`.
      if (_.isString(this.comparator) || this.comparator.length === 1) {
        this.models = this.sortBy(this.comparator, this);
      } else {
        this.models.sort(_.bind(this.comparator, this));
      }

      if (!options.silent) this.trigger('sort', this, options);
      return this;
    },

    // Pluck an attribute from each model in the collection.
    pluck: function(attr) {
      return _.invoke(this.models, 'get', attr);
    },

    // Fetch the default set of models for this collection, resetting the
    // collection when they arrive. If `reset: true` is passed, the response
    // data will be passed through the `reset` method instead of `set`.
    fetch: function(options) {
      options = options ? _.clone(options) : {};
      if (options.parse === void 0) options.parse = true;
      var success = options.success;
      var collection = this;
      options.success = function(resp) {
        var method = options.reset ? 'reset' : 'set';
        collection[method](resp, options);
        if (success) success(collection, resp, options);
        collection.trigger('sync', collection, resp, options);
      };
      wrapError(this, options);
      return this.sync('read', this, options);
    },

    // Create a new instance of a model in this collection. Add the model to the
    // collection immediately, unless `wait: true` is passed, in which case we
    // wait for the server to agree.
    create: function(model, options) {
      options = options ? _.clone(options) : {};
      if (!(model = this._prepareModel(model, options))) return false;
      if (!options.wait) this.add(model, options);
      var collection = this;
      var success = options.success;
      options.success = function(model, resp) {
        if (options.wait) collection.add(model, options);
        if (success) success(model, resp, options);
      };
      model.save(null, options);
      return model;
    },

    // **parse** converts a response into a list of models to be added to the
    // collection. The default implementation is just to pass it through.
    parse: function(resp, options) {
      return resp;
    },

    // Create a new collection with an identical list of models as this one.
    clone: function() {
      return new this.constructor(this.models, {
        model: this.model,
        comparator: this.comparator
      });
    },

    // Define how to uniquely identify models in the collection.
    modelId: function (attrs) {
      return attrs[this.model.prototype.idAttribute || 'id'];
    },

    // Private method to reset all internal state. Called when the collection
    // is first initialized or reset.
    _reset: function() {
      this.length = 0;
      this.models = [];
      this._byId  = {};
    },

    // Prepare a hash of attributes (or other model) to be added to this
    // collection.
    _prepareModel: function(attrs, options) {
      if (this._isModel(attrs)) {
        if (!attrs.collection) attrs.collection = this;
        return attrs;
      }
      options = options ? _.clone(options) : {};
      options.collection = this;
      var model = new this.model(attrs, options);
      if (!model.validationError) return model;
      this.trigger('invalid', this, model.validationError, options);
      return false;
    },

    // Method for checking whether an object should be considered a model for
    // the purposes of adding to the collection.
    _isModel: function (model) {
      return model instanceof Model;
    },

    // Internal method to create a model's ties to a collection.
    _addReference: function(model, options) {
      this._byId[model.cid] = model;
      var id = this.modelId(model.attributes);
      if (id != null) this._byId[id] = model;
      model.on('all', this._onModelEvent, this);
    },

    // Internal method to sever a model's ties to a collection.
    _removeReference: function(model, options) {
      if (this === model.collection) delete model.collection;
      model.off('all', this._onModelEvent, this);
    },

    // Internal method called every time a model in the set fires an event.
    // Sets need to update their indexes when models change ids. All other
    // events simply proxy through. "add" and "remove" events that originate
    // in other collections are ignored.
    _onModelEvent: function(event, model, collection, options) {
      if ((event === 'add' || event === 'remove') && collection !== this) return;
      if (event === 'destroy') this.remove(model, options);
      if (event === 'change') {
        var prevId = this.modelId(model.previousAttributes());
        var id = this.modelId(model.attributes);
        if (prevId !== id) {
          if (prevId != null) delete this._byId[prevId];
          if (id != null) this._byId[id] = model;
        }
      }
      this.trigger.apply(this, arguments);
    }

  });

  // Underscore methods that we want to implement on the Collection.
  // 90% of the core usefulness of Backbone Collections is actually implemented
  // right here:
  var methods = ['forEach', 'each', 'map', 'collect', 'reduce', 'foldl',
    'inject', 'reduceRight', 'foldr', 'find', 'detect', 'filter', 'select',
    'reject', 'every', 'all', 'some', 'any', 'include', 'contains', 'invoke',
    'max', 'min', 'toArray', 'size', 'first', 'head', 'take', 'initial', 'rest',
    'tail', 'drop', 'last', 'without', 'difference', 'indexOf', 'shuffle',
    'lastIndexOf', 'isEmpty', 'chain', 'sample', 'partition'];

  // Mix in each Underscore method as a proxy to `Collection#models`.
  _.each(methods, function(method) {
    if (!_[method]) return;
    Collection.prototype[method] = function() {
      var args = slice.call(arguments);
      args.unshift(this.models);
      return _[method].apply(_, args);
    };
  });

  // Underscore methods that take a property name as an argument.
  var attributeMethods = ['groupBy', 'countBy', 'sortBy', 'indexBy'];

  // Use attributes instead of properties.
  _.each(attributeMethods, function(method) {
    if (!_[method]) return;
    Collection.prototype[method] = function(value, context) {
      var iterator = _.isFunction(value) ? value : function(model) {
        return model.get(value);
      };
      return _[method](this.models, iterator, context);
    };
  });

  // Backbone.View
  // -------------

  // Backbone Views are almost more convention than they are actual code. A View
  // is simply a JavaScript object that represents a logical chunk of UI in the
  // DOM. This might be a single item, an entire list, a sidebar or panel, or
  // even the surrounding frame which wraps your whole app. Defining a chunk of
  // UI as a **View** allows you to define your DOM events declaratively, without
  // having to worry about render order ... and makes it easy for the view to
  // react to specific changes in the state of your models.

  // Creating a Backbone.View creates its initial element outside of the DOM,
  // if an existing element is not provided...
  var View = Backbone.View = function(options) {
    this.cid = _.uniqueId('view');
    options || (options = {});
    _.extend(this, _.pick(options, viewOptions));
    this._ensureElement();
    this.initialize.apply(this, arguments);
  };

  // Cached regex to split keys for `delegate`.
  var delegateEventSplitter = /^(\S+)\s*(.*)$/;

  // List of view options to be merged as properties.
  var viewOptions = ['model', 'collection', 'el', 'id', 'attributes', 'className', 'tagName', 'events'];

  // Set up all inheritable **Backbone.View** properties and methods.
  _.extend(View.prototype, Events, {

    // The default `tagName` of a View's element is `"div"`.
    tagName: 'div',

    // jQuery delegate for element lookup, scoped to DOM elements within the
    // current view. This should be preferred to global lookups where possible.
    $: function(selector) {
      return this.$el.find(selector);
    },

    // Initialize is an empty function by default. Override it with your own
    // initialization logic.
    initialize: function(){},

    // **render** is the core function that your view should override, in order
    // to populate its element (`this.el`), with the appropriate HTML. The
    // convention is for **render** to always return `this`.
    render: function() {
      return this;
    },

    // Remove this view by taking the element out of the DOM, and removing any
    // applicable Backbone.Events listeners.
    remove: function() {
      this._removeElement();
      this.stopListening();
      return this;
    },

    // Remove this view's element from the document and all event listeners
    // attached to it. Exposed for subclasses using an alternative DOM
    // manipulation API.
    _removeElement: function() {
      this.$el.remove();
    },

    // Change the view's element (`this.el` property) and re-delegate the
    // view's events on the new element.
    setElement: function(element) {
      this.undelegateEvents();
      this._setElement(element);
      this.delegateEvents();
      return this;
    },

    // Creates the `this.el` and `this.$el` references for this view using the
    // given `el`. `el` can be a CSS selector or an HTML string, a jQuery
    // context or an element. Subclasses can override this to utilize an
    // alternative DOM manipulation API and are only required to set the
    // `this.el` property.
    _setElement: function(el) {
      this.$el = el instanceof Backbone.$ ? el : Backbone.$(el);
      this.el = this.$el[0];
    },

    // Set callbacks, where `this.events` is a hash of
    //
    // *{"event selector": "callback"}*
    //
    //     {
    //       'mousedown .title':  'edit',
    //       'click .button':     'save',
    //       'click .open':       function(e) { ... }
    //     }
    //
    // pairs. Callbacks will be bound to the view, with `this` set properly.
    // Uses event delegation for efficiency.
    // Omitting the selector binds the event to `this.el`.
    delegateEvents: function(events) {
      if (!(events || (events = _.result(this, 'events')))) return this;
      this.undelegateEvents();
      for (var key in events) {
        var method = events[key];
        if (!_.isFunction(method)) method = this[events[key]];
        if (!method) continue;
        var match = key.match(delegateEventSplitter);
        this.delegate(match[1], match[2], _.bind(method, this));
      }
      return this;
    },

    // Add a single event listener to the view's element (or a child element
    // using `selector`). This only works for delegate-able events: not `focus`,
    // `blur`, and not `change`, `submit`, and `reset` in Internet Explorer.
    delegate: function(eventName, selector, listener) {
      this.$el.on(eventName + '.delegateEvents' + this.cid, selector, listener);
    },

    // Clears all callbacks previously bound to the view by `delegateEvents`.
    // You usually don't need to use this, but may wish to if you have multiple
    // Backbone views attached to the same DOM element.
    undelegateEvents: function() {
      if (this.$el) this.$el.off('.delegateEvents' + this.cid);
      return this;
    },

    // A finer-grained `undelegateEvents` for removing a single delegated event.
    // `selector` and `listener` are both optional.
    undelegate: function(eventName, selector, listener) {
      this.$el.off(eventName + '.delegateEvents' + this.cid, selector, listener);
    },

    // Produces a DOM element to be assigned to your view. Exposed for
    // subclasses using an alternative DOM manipulation API.
    _createElement: function(tagName) {
      return document.createElement(tagName);
    },

    // Ensure that the View has a DOM element to render into.
    // If `this.el` is a string, pass it through `$()`, take the first
    // matching element, and re-assign it to `el`. Otherwise, create
    // an element from the `id`, `className` and `tagName` properties.
    _ensureElement: function() {
      if (!this.el) {
        var attrs = _.extend({}, _.result(this, 'attributes'));
        if (this.id) attrs.id = _.result(this, 'id');
        if (this.className) attrs['class'] = _.result(this, 'className');
        this.setElement(this._createElement(_.result(this, 'tagName')));
        this._setAttributes(attrs);
      } else {
        this.setElement(_.result(this, 'el'));
      }
    },

    // Set attributes from a hash on this view's element.  Exposed for
    // subclasses using an alternative DOM manipulation API.
    _setAttributes: function(attributes) {
      this.$el.attr(attributes);
    }

  });

  // Backbone.sync
  // -------------

  // Override this function to change the manner in which Backbone persists
  // models to the server. You will be passed the type of request, and the
  // model in question. By default, makes a RESTful Ajax request
  // to the model's `url()`. Some possible customizations could be:
  //
  // * Use `setTimeout` to batch rapid-fire updates into a single request.
  // * Send up the models as XML instead of JSON.
  // * Persist models via WebSockets instead of Ajax.
  //
  // Turn on `Backbone.emulateHTTP` in order to send `PUT` and `DELETE` requests
  // as `POST`, with a `_method` parameter containing the true HTTP method,
  // as well as all requests with the body as `application/x-www-form-urlencoded`
  // instead of `application/json` with the model in a param named `model`.
  // Useful when interfacing with server-side languages like **PHP** that make
  // it difficult to read the body of `PUT` requests.
  Backbone.sync = function(method, model, options) {
    var type = methodMap[method];

    // Default options, unless specified.
    _.defaults(options || (options = {}), {
      emulateHTTP: Backbone.emulateHTTP,
      emulateJSON: Backbone.emulateJSON
    });

    // Default JSON-request options.
    var params = {type: type, dataType: 'json'};

    // Ensure that we have a URL.
    if (!options.url) {
      params.url = _.result(model, 'url') || urlError();
    }

    // Ensure that we have the appropriate request data.
    if (options.data == null && model && (method === 'create' || method === 'update' || method === 'patch')) {
      params.contentType = 'application/json';
      params.data = JSON.stringify(options.attrs || model.toJSON(options));
    }

    // For older servers, emulate JSON by encoding the request into an HTML-form.
    if (options.emulateJSON) {
      params.contentType = 'application/x-www-form-urlencoded';
      params.data = params.data ? {model: params.data} : {};
    }

    // For older servers, emulate HTTP by mimicking the HTTP method with `_method`
    // And an `X-HTTP-Method-Override` header.
    if (options.emulateHTTP && (type === 'PUT' || type === 'DELETE' || type === 'PATCH')) {
      params.type = 'POST';
      if (options.emulateJSON) params.data._method = type;
      var beforeSend = options.beforeSend;
      options.beforeSend = function(xhr) {
        xhr.setRequestHeader('X-HTTP-Method-Override', type);
        if (beforeSend) return beforeSend.apply(this, arguments);
      };
    }

    // Don't process data on a non-GET request.
    if (params.type !== 'GET' && !options.emulateJSON) {
      params.processData = false;
    }

    // Pass along `textStatus` and `errorThrown` from jQuery.
    var error = options.error;
    options.error = function(xhr, textStatus, errorThrown) {
      options.textStatus = textStatus;
      options.errorThrown = errorThrown;
      if (error) error.apply(this, arguments);
    };

    // Make the request, allowing the user to override any Ajax options.
    var xhr = options.xhr = Backbone.ajax(_.extend(params, options));
    model.trigger('request', model, xhr, options);
    return xhr;
  };

  // Map from CRUD to HTTP for our default `Backbone.sync` implementation.
  var methodMap = {
    'create': 'POST',
    'update': 'PUT',
    'patch':  'PATCH',
    'delete': 'DELETE',
    'read':   'GET'
  };

  // Set the default implementation of `Backbone.ajax` to proxy through to `$`.
  // Override this if you'd like to use a different library.
  Backbone.ajax = function() {
    return Backbone.$.ajax.apply(Backbone.$, arguments);
  };

  // Backbone.Router
  // ---------------

  // Routers map faux-URLs to actions, and fire events when routes are
  // matched. Creating a new one sets its `routes` hash, if not set statically.
  var Router = Backbone.Router = function(options) {
    options || (options = {});
    if (options.routes) this.routes = options.routes;
    this._bindRoutes();
    this.initialize.apply(this, arguments);
  };

  // Cached regular expressions for matching named param parts and splatted
  // parts of route strings.
  var optionalParam = /\((.*?)\)/g;
  var namedParam    = /(\(\?)?:\w+/g;
  var splatParam    = /\*\w+/g;
  var escapeRegExp  = /[\-{}\[\]+?.,\\\^$|#\s]/g;

  // Set up all inheritable **Backbone.Router** properties and methods.
  _.extend(Router.prototype, Events, {

    // Initialize is an empty function by default. Override it with your own
    // initialization logic.
    initialize: function(){},

    // Manually bind a single named route to a callback. For example:
    //
    //     this.route('search/:query/p:num', 'search', function(query, num) {
    //       ...
    //     });
    //
    route: function(route, name, callback) {
      if (!_.isRegExp(route)) route = this._routeToRegExp(route);
      if (_.isFunction(name)) {
        callback = name;
        name = '';
      }
      if (!callback) callback = this[name];
      var router = this;
      Backbone.history.route(route, function(fragment) {
        var args = router._extractParameters(route, fragment);
        if (router.execute(callback, args, name) !== false) {
          router.trigger.apply(router, ['route:' + name].concat(args));
          router.trigger('route', name, args);
          Backbone.history.trigger('route', router, name, args);
        }
      });
      return this;
    },

    // Execute a route handler with the provided parameters.  This is an
    // excellent place to do pre-route setup or post-route cleanup.
    execute: function(callback, args, name) {
      if (callback) callback.apply(this, args);
    },

    // Simple proxy to `Backbone.history` to save a fragment into the history.
    navigate: function(fragment, options) {
      Backbone.history.navigate(fragment, options);
      return this;
    },

    // Bind all defined routes to `Backbone.history`. We have to reverse the
    // order of the routes here to support behavior where the most general
    // routes can be defined at the bottom of the route map.
    _bindRoutes: function() {
      if (!this.routes) return;
      this.routes = _.result(this, 'routes');
      var route, routes = _.keys(this.routes);
      while ((route = routes.pop()) != null) {
        this.route(route, this.routes[route]);
      }
    },

    // Convert a route string into a regular expression, suitable for matching
    // against the current location hash.
    _routeToRegExp: function(route) {
      route = route.replace(escapeRegExp, '\\$&')
                   .replace(optionalParam, '(?:$1)?')
                   .replace(namedParam, function(match, optional) {
                     return optional ? match : '([^/?]+)';
                   })
                   .replace(splatParam, '([^?]*?)');
      return new RegExp('^' + route + '(?:\\?([\\s\\S]*))?$');
    },

    // Given a route, and a URL fragment that it matches, return the array of
    // extracted decoded parameters. Empty or unmatched parameters will be
    // treated as `null` to normalize cross-browser behavior.
    _extractParameters: function(route, fragment) {
      var params = route.exec(fragment).slice(1);
      return _.map(params, function(param, i) {
        // Don't decode the search params.
        if (i === params.length - 1) return param || null;
        return param ? decodeURIComponent(param) : null;
      });
    }

  });

  // Backbone.History
  // ----------------

  // Handles cross-browser history management, based on either
  // [pushState](http://diveintohtml5.info/history.html) and real URLs, or
  // [onhashchange](https://developer.mozilla.org/en-US/docs/DOM/window.onhashchange)
  // and URL fragments. If the browser supports neither (old IE, natch),
  // falls back to polling.
  var History = Backbone.History = function() {
    this.handlers = [];
    _.bindAll(this, 'checkUrl');

    // Ensure that `History` can be used outside of the browser.
    if (typeof window !== 'undefined') {
      this.location = window.location;
      this.history = window.history;
    }
  };

  // Cached regex for stripping a leading hash/slash and trailing space.
  var routeStripper = /^[#\/]|\s+$/g;

  // Cached regex for stripping leading and trailing slashes.
  var rootStripper = /^\/+|\/+$/g;

  // Cached regex for stripping urls of hash.
  var pathStripper = /#.*$/;

  // Has the history handling already been started?
  History.started = false;

  // Set up all inheritable **Backbone.History** properties and methods.
  _.extend(History.prototype, Events, {

    // The default interval to poll for hash changes, if necessary, is
    // twenty times a second.
    interval: 50,

    // Are we at the app root?
    atRoot: function() {
      var path = this.location.pathname.replace(/[^\/]$/, '$&/');
      return path === this.root && !this.getSearch();
    },

    // In IE6, the hash fragment and search params are incorrect if the
    // fragment contains `?`.
    getSearch: function() {
      var match = this.location.href.replace(/#.*/, '').match(/\?.+/);
      return match ? match[0] : '';
    },

    // Gets the true hash value. Cannot use location.hash directly due to bug
    // in Firefox where location.hash will always be decoded.
    getHash: function(window) {
      var match = (window || this).location.href.match(/#(.*)$/);
      return match ? match[1] : '';
    },

    // Get the pathname and search params, without the root.
    getPath: function() {
      var path = decodeURI(this.location.pathname + this.getSearch());
      var root = this.root.slice(0, -1);
      if (!path.indexOf(root)) path = path.slice(root.length);
      return path.slice(1);
    },

    // Get the cross-browser normalized URL fragment from the path or hash.
    getFragment: function(fragment) {
      if (fragment == null) {
        if (this._hasPushState || !this._wantsHashChange) {
          fragment = this.getPath();
        } else {
          fragment = this.getHash();
        }
      }
      return fragment.replace(routeStripper, '');
    },

    // Start the hash change handling, returning `true` if the current URL matches
    // an existing route, and `false` otherwise.
    start: function(options) {
      if (History.started) throw new Error('Backbone.history has already been started');
      History.started = true;

      // Figure out the initial configuration. Do we need an iframe?
      // Is pushState desired ... is it available?
      this.options          = _.extend({root: '/'}, this.options, options);
      this.root             = this.options.root;
      this._wantsHashChange = this.options.hashChange !== false;
      this._hasHashChange   = 'onhashchange' in window;
      this._wantsPushState  = !!this.options.pushState;
      this._hasPushState    = !!(this.options.pushState && this.history && this.history.pushState);
      this.fragment         = this.getFragment();

      // Add a cross-platform `addEventListener` shim for older browsers.
      var addEventListener = window.addEventListener || function (eventName, listener) {
        return attachEvent('on' + eventName, listener);
      };

      // Normalize root to always include a leading and trailing slash.
      this.root = ('/' + this.root + '/').replace(rootStripper, '/');

      // Proxy an iframe to handle location events if the browser doesn't
      // support the `hashchange` event, HTML5 history, or the user wants
      // `hashChange` but not `pushState`.
      if (!this._hasHashChange && this._wantsHashChange && (!this._wantsPushState || !this._hasPushState)) {
        var iframe = document.createElement('iframe');
        iframe.src = 'javascript:0';
        iframe.style.display = 'none';
        iframe.tabIndex = -1;
        var body = document.body;
        // Using `appendChild` will throw on IE < 9 if the document is not ready.
        this.iframe = body.insertBefore(iframe, body.firstChild).contentWindow;
        this.navigate(this.fragment);
      }

      // Depending on whether we're using pushState or hashes, and whether
      // 'onhashchange' is supported, determine how we check the URL state.
      if (this._hasPushState) {
        addEventListener('popstate', this.checkUrl, false);
      } else if (this._wantsHashChange && this._hasHashChange && !this.iframe) {
        addEventListener('hashchange', this.checkUrl, false);
      } else if (this._wantsHashChange) {
        this._checkUrlInterval = setInterval(this.checkUrl, this.interval);
      }

      // Transition from hashChange to pushState or vice versa if both are
      // requested.
      if (this._wantsHashChange && this._wantsPushState) {

        // If we've started off with a route from a `pushState`-enabled
        // browser, but we're currently in a browser that doesn't support it...
        if (!this._hasPushState && !this.atRoot()) {
          this.location.replace(this.root + '#' + this.getPath());
          // Return immediately as browser will do redirect to new url
          return true;

        // Or if we've started out with a hash-based route, but we're currently
        // in a browser where it could be `pushState`-based instead...
        } else if (this._hasPushState && this.atRoot()) {
          this.navigate(this.getHash(), {replace: true});
        }

      }

      if (!this.options.silent) return this.loadUrl();
    },

    // Disable Backbone.history, perhaps temporarily. Not useful in a real app,
    // but possibly useful for unit testing Routers.
    stop: function() {
      // Add a cross-platform `removeEventListener` shim for older browsers.
      var removeEventListener = window.removeEventListener || function (eventName, listener) {
        return detachEvent('on' + eventName, listener);
      };

      // Remove window listeners.
      if (this._hasPushState) {
        removeEventListener('popstate', this.checkUrl, false);
      } else if (this._wantsHashChange && this._hasHashChange && !this.iframe) {
        removeEventListener('hashchange', this.checkUrl, false);
      }

      // Clean up the iframe if necessary.
      if (this.iframe) {
        document.body.removeChild(this.iframe.frameElement);
        this.iframe = null;
      }

      // Some environments will throw when clearing an undefined interval.
      if (this._checkUrlInterval) clearInterval(this._checkUrlInterval);
      History.started = false;
    },

    // Add a route to be tested when the fragment changes. Routes added later
    // may override previous routes.
    route: function(route, callback) {
      this.handlers.unshift({route: route, callback: callback});
    },

    // Checks the current URL to see if it has changed, and if it has,
    // calls `loadUrl`, normalizing across the hidden iframe.
    checkUrl: function(e) {
      var current = this.getFragment();
      if (current === this.fragment && this.iframe) {
        current = this.getHash(this.iframe);
      }
      if (current === this.fragment) return false;
      if (this.iframe) this.navigate(current);
      this.loadUrl();
    },

    // Attempt to load the current URL fragment. If a route succeeds with a
    // match, returns `true`. If no defined routes matches the fragment,
    // returns `false`.
    loadUrl: function(fragment) {
      fragment = this.fragment = this.getFragment(fragment);
      return _.any(this.handlers, function(handler) {
        if (handler.route.test(fragment)) {
          handler.callback(fragment);
          return true;
        }
      });
    },

    // Save a fragment into the hash history, or replace the URL state if the
    // 'replace' option is passed. You are responsible for properly URL-encoding
    // the fragment in advance.
    //
    // The options object can contain `trigger: true` if you wish to have the
    // route callback be fired (not usually desirable), or `replace: true`, if
    // you wish to modify the current URL without adding an entry to the history.
    navigate: function(fragment, options) {
      if (!History.started) return false;
      if (!options || options === true) options = {trigger: !!options};

      var url = this.root + (fragment = this.getFragment(fragment || ''));

      // Strip the hash and decode for matching.
      fragment = decodeURI(fragment.replace(pathStripper, ''));

      if (this.fragment === fragment) return;
      this.fragment = fragment;

      // Don't include a trailing slash on the root.
      if (fragment === '' && url !== '/') url = url.slice(0, -1);

      // If pushState is available, we use it to set the fragment as a real URL.
      if (this._hasPushState) {
        this.history[options.replace ? 'replaceState' : 'pushState']({}, document.title, url);

      // If hash changes haven't been explicitly disabled, update the hash
      // fragment to store history.
      } else if (this._wantsHashChange) {
        this._updateHash(this.location, fragment, options.replace);
        if (this.iframe && (fragment !== this.getHash(this.iframe))) {
          // Opening and closing the iframe tricks IE7 and earlier to push a
          // history entry on hash-tag change.  When replace is true, we don't
          // want this.
          if(!options.replace) this.iframe.document.open().close();
          this._updateHash(this.iframe.location, fragment, options.replace);
        }

      // If you've told us that you explicitly don't want fallback hashchange-
      // based history, then `navigate` becomes a page refresh.
      } else {
        return this.location.assign(url);
      }
      if (options.trigger) return this.loadUrl(fragment);
    },

    // Update the hash location, either replacing the current entry, or adding
    // a new one to the browser history.
    _updateHash: function(location, fragment, replace) {
      if (replace) {
        var href = location.href.replace(/(javascript:|#).*$/, '');
        location.replace(href + '#' + fragment);
      } else {
        // Some browsers require that `hash` contains a leading #.
        location.hash = '#' + fragment;
      }
    }

  });

  // Create the default Backbone.history.
  Backbone.history = new History;

  // Helpers
  // -------

  // Helper function to correctly set up the prototype chain, for subclasses.
  // Similar to `goog.inherits`, but uses a hash of prototype properties and
  // class properties to be extended.
  var extend = function(protoProps, staticProps) {
    var parent = this;
    var child;

    // The constructor function for the new subclass is either defined by you
    // (the "constructor" property in your `extend` definition), or defaulted
    // by us to simply call the parent's constructor.
    if (protoProps && _.has(protoProps, 'constructor')) {
      child = protoProps.constructor;
    } else {
      child = function(){ return parent.apply(this, arguments); };
    }

    // Add static properties to the constructor function, if supplied.
    _.extend(child, parent, staticProps);

    // Set the prototype chain to inherit from `parent`, without calling
    // `parent`'s constructor function.
    var Surrogate = function(){ this.constructor = child; };
    Surrogate.prototype = parent.prototype;
    child.prototype = new Surrogate;

    // Add prototype properties (instance properties) to the subclass,
    // if supplied.
    if (protoProps) _.extend(child.prototype, protoProps);

    // Set a convenience property in case the parent's prototype is needed
    // later.
    child.__super__ = parent.prototype;

    return child;
  };

  // Set up inheritance for the model, collection, router, view and history.
  Model.extend = Collection.extend = Router.extend = View.extend = History.extend = extend;

  // Throw an error when a URL is needed, and none is supplied.
  var urlError = function() {
    throw new Error('A "url" property or function must be specified');
  };

  // Wrap an optional error callback with a fallback error event.
  var wrapError = function(model, options) {
    var error = options.error;
    options.error = function(resp) {
      if (error) error(model, resp, options);
      model.trigger('error', model, resp, options);
    };
  };

  return Backbone;

}));

/** vim: et:ts=4:sw=4:sts=4
 * @license RequireJS 2.1.14 Copyright (c) 2010-2014, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/requirejs for details
 */
//Not using strict: uneven strict support in browsers, #392, and causes
//problems with requirejs.exec()/transpiler plugins that may not be strict.
/*jslint regexp: true, nomen: true, sloppy: true */
/*global window, navigator, document, importScripts, setTimeout, opera */

var requirejs, require, define;
(function (global) {
    var req, s, head, baseElement, dataMain, src,
        interactiveScript, currentlyAddingScript, mainScript, subPath,
        version = '2.1.14',
        commentRegExp = /(\/\*([\s\S]*?)\*\/|([^:]|^)\/\/(.*)$)/mg,
        cjsRequireRegExp = /[^.]\s*require\s*\(\s*["']([^'"\s]+)["']\s*\)/g,
        jsSuffixRegExp = /\.js$/,
        currDirRegExp = /^\.\//,
        op = Object.prototype,
        ostring = op.toString,
        hasOwn = op.hasOwnProperty,
        ap = Array.prototype,
        apsp = ap.splice,
        isBrowser = !!(typeof window !== 'undefined' && typeof navigator !== 'undefined' && window.document),
        isWebWorker = !isBrowser && typeof importScripts !== 'undefined',
        //PS3 indicates loaded and complete, but need to wait for complete
        //specifically. Sequence is 'loading', 'loaded', execution,
        // then 'complete'. The UA check is unfortunate, but not sure how
        //to feature test w/o causing perf issues.
        readyRegExp = isBrowser && navigator.platform === 'PLAYSTATION 3' ?
                      /^complete$/ : /^(complete|loaded)$/,
        defContextName = '_',
        //Oh the tragedy, detecting opera. See the usage of isOpera for reason.
        isOpera = typeof opera !== 'undefined' && opera.toString() === '[object Opera]',
        contexts = {},
        cfg = {},
        globalDefQueue = [],
        useInteractive = false;

    function isFunction(it) {
        return ostring.call(it) === '[object Function]';
    }

    function isArray(it) {
        return ostring.call(it) === '[object Array]';
    }

    /**
     * Helper function for iterating over an array. If the func returns
     * a true value, it will break out of the loop.
     */
    function each(ary, func) {
        if (ary) {
            var i;
            for (i = 0; i < ary.length; i += 1) {
                if (ary[i] && func(ary[i], i, ary)) {
                    break;
                }
            }
        }
    }

    /**
     * Helper function for iterating over an array backwards. If the func
     * returns a true value, it will break out of the loop.
     */
    function eachReverse(ary, func) {
        if (ary) {
            var i;
            for (i = ary.length - 1; i > -1; i -= 1) {
                if (ary[i] && func(ary[i], i, ary)) {
                    break;
                }
            }
        }
    }

    function hasProp(obj, prop) {
        return hasOwn.call(obj, prop);
    }

    function getOwn(obj, prop) {
        return hasProp(obj, prop) && obj[prop];
    }

    /**
     * Cycles over properties in an object and calls a function for each
     * property value. If the function returns a truthy value, then the
     * iteration is stopped.
     */
    function eachProp(obj, func) {
        var prop;
        for (prop in obj) {
            if (hasProp(obj, prop)) {
                if (func(obj[prop], prop)) {
                    break;
                }
            }
        }
    }

    /**
     * Simple function to mix in properties from source into target,
     * but only if target does not already have a property of the same name.
     */
    function mixin(target, source, force, deepStringMixin) {
        if (source) {
            eachProp(source, function (value, prop) {
                if (force || !hasProp(target, prop)) {
                    if (deepStringMixin && typeof value === 'object' && value &&
                        !isArray(value) && !isFunction(value) &&
                        !(value instanceof RegExp)) {

                        if (!target[prop]) {
                            target[prop] = {};
                        }
                        mixin(target[prop], value, force, deepStringMixin);
                    } else {
                        target[prop] = value;
                    }
                }
            });
        }
        return target;
    }

    //Similar to Function.prototype.bind, but the 'this' object is specified
    //first, since it is easier to read/figure out what 'this' will be.
    function bind(obj, fn) {
        return function () {
            return fn.apply(obj, arguments);
        };
    }

    function scripts() {
        return document.getElementsByTagName('script');
    }

    function defaultOnError(err) {
        throw err;
    }

    //Allow getting a global that is expressed in
    //dot notation, like 'a.b.c'.
    function getGlobal(value) {
        if (!value) {
            return value;
        }
        var g = global;
        each(value.split('.'), function (part) {
            g = g[part];
        });
        return g;
    }

    /**
     * Constructs an error with a pointer to an URL with more information.
     * @param {String} id the error ID that maps to an ID on a web page.
     * @param {String} message human readable error.
     * @param {Error} [err] the original error, if there is one.
     *
     * @returns {Error}
     */
    function makeError(id, msg, err, requireModules) {
        var e = new Error(msg + '\nhttp://requirejs.org/docs/errors.html#' + id);
        e.requireType = id;
        e.requireModules = requireModules;
        if (err) {
            e.originalError = err;
        }
        return e;
    }

    if (typeof define !== 'undefined') {
        //If a define is already in play via another AMD loader,
        //do not overwrite.
        return;
    }

    if (typeof requirejs !== 'undefined') {
        if (isFunction(requirejs)) {
            //Do not overwrite an existing requirejs instance.
            return;
        }
        cfg = requirejs;
        requirejs = undefined;
    }

    //Allow for a require config object
    if (typeof require !== 'undefined' && !isFunction(require)) {
        //assume it is a config object.
        cfg = require;
        require = undefined;
    }

    function newContext(contextName) {
        var inCheckLoaded, Module, context, handlers,
            checkLoadedTimeoutId,
            config = {
                //Defaults. Do not set a default for map
                //config to speed up normalize(), which
                //will run faster if there is no default.
                waitSeconds: 7,
                baseUrl: './',
                paths: {},
                bundles: {},
                pkgs: {},
                shim: {},
                config: {}
            },
            registry = {},
            //registry of just enabled modules, to speed
            //cycle breaking code when lots of modules
            //are registered, but not activated.
            enabledRegistry = {},
            undefEvents = {},
            defQueue = [],
            defined = {},
            urlFetched = {},
            bundlesMap = {},
            requireCounter = 1,
            unnormalizedCounter = 1;

        /**
         * Trims the . and .. from an array of path segments.
         * It will keep a leading path segment if a .. will become
         * the first path segment, to help with module name lookups,
         * which act like paths, but can be remapped. But the end result,
         * all paths that use this function should look normalized.
         * NOTE: this method MODIFIES the input array.
         * @param {Array} ary the array of path segments.
         */
        function trimDots(ary) {
            var i, part;
            for (i = 0; i < ary.length; i++) {
                part = ary[i];
                if (part === '.') {
                    ary.splice(i, 1);
                    i -= 1;
                } else if (part === '..') {
                    // If at the start, or previous value is still ..,
                    // keep them so that when converted to a path it may
                    // still work when converted to a path, even though
                    // as an ID it is less than ideal. In larger point
                    // releases, may be better to just kick out an error.
                    if (i === 0 || (i == 1 && ary[2] === '..') || ary[i - 1] === '..') {
                        continue;
                    } else if (i > 0) {
                        ary.splice(i - 1, 2);
                        i -= 2;
                    }
                }
            }
        }

        /**
         * Given a relative module name, like ./something, normalize it to
         * a real name that can be mapped to a path.
         * @param {String} name the relative name
         * @param {String} baseName a real name that the name arg is relative
         * to.
         * @param {Boolean} applyMap apply the map config to the value. Should
         * only be done if this normalization is for a dependency ID.
         * @returns {String} normalized name
         */
        function normalize(name, baseName, applyMap) {
            var pkgMain, mapValue, nameParts, i, j, nameSegment, lastIndex,
                foundMap, foundI, foundStarMap, starI, normalizedBaseParts,
                baseParts = (baseName && baseName.split('/')),
                map = config.map,
                starMap = map && map['*'];

            //Adjust any relative paths.
            if (name) {
                name = name.split('/');
                lastIndex = name.length - 1;

                // If wanting node ID compatibility, strip .js from end
                // of IDs. Have to do this here, and not in nameToUrl
                // because node allows either .js or non .js to map
                // to same file.
                if (config.nodeIdCompat && jsSuffixRegExp.test(name[lastIndex])) {
                    name[lastIndex] = name[lastIndex].replace(jsSuffixRegExp, '');
                }

                // Starts with a '.' so need the baseName
                if (name[0].charAt(0) === '.' && baseParts) {
                    //Convert baseName to array, and lop off the last part,
                    //so that . matches that 'directory' and not name of the baseName's
                    //module. For instance, baseName of 'one/two/three', maps to
                    //'one/two/three.js', but we want the directory, 'one/two' for
                    //this normalization.
                    normalizedBaseParts = baseParts.slice(0, baseParts.length - 1);
                    name = normalizedBaseParts.concat(name);
                }

                trimDots(name);
                name = name.join('/');
            }

            //Apply map config if available.
            if (applyMap && map && (baseParts || starMap)) {
                nameParts = name.split('/');

                outerLoop: for (i = nameParts.length; i > 0; i -= 1) {
                    nameSegment = nameParts.slice(0, i).join('/');

                    if (baseParts) {
                        //Find the longest baseName segment match in the config.
                        //So, do joins on the biggest to smallest lengths of baseParts.
                        for (j = baseParts.length; j > 0; j -= 1) {
                            mapValue = getOwn(map, baseParts.slice(0, j).join('/'));

                            //baseName segment has config, find if it has one for
                            //this name.
                            if (mapValue) {
                                mapValue = getOwn(mapValue, nameSegment);
                                if (mapValue) {
                                    //Match, update name to the new value.
                                    foundMap = mapValue;
                                    foundI = i;
                                    break outerLoop;
                                }
                            }
                        }
                    }

                    //Check for a star map match, but just hold on to it,
                    //if there is a shorter segment match later in a matching
                    //config, then favor over this star map.
                    if (!foundStarMap && starMap && getOwn(starMap, nameSegment)) {
                        foundStarMap = getOwn(starMap, nameSegment);
                        starI = i;
                    }
                }

                if (!foundMap && foundStarMap) {
                    foundMap = foundStarMap;
                    foundI = starI;
                }

                if (foundMap) {
                    nameParts.splice(0, foundI, foundMap);
                    name = nameParts.join('/');
                }
            }

            // If the name points to a package's name, use
            // the package main instead.
            pkgMain = getOwn(config.pkgs, name);

            return pkgMain ? pkgMain : name;
        }

        function removeScript(name) {
            if (isBrowser) {
                each(scripts(), function (scriptNode) {
                    if (scriptNode.getAttribute('data-requiremodule') === name &&
                            scriptNode.getAttribute('data-requirecontext') === context.contextName) {
                        scriptNode.parentNode.removeChild(scriptNode);
                        return true;
                    }
                });
            }
        }

        function hasPathFallback(id) {
            var pathConfig = getOwn(config.paths, id);
            if (pathConfig && isArray(pathConfig) && pathConfig.length > 1) {
                //Pop off the first array value, since it failed, and
                //retry
                pathConfig.shift();
                context.require.undef(id);

                //Custom require that does not do map translation, since
                //ID is "absolute", already mapped/resolved.
                context.makeRequire(null, {
                    skipMap: true
                })([id]);

                return true;
            }
        }

        //Turns a plugin!resource to [plugin, resource]
        //with the plugin being undefined if the name
        //did not have a plugin prefix.
        function splitPrefix(name) {
            var prefix,
                index = name ? name.indexOf('!') : -1;
            if (index > -1) {
                prefix = name.substring(0, index);
                name = name.substring(index + 1, name.length);
            }
            return [prefix, name];
        }

        /**
         * Creates a module mapping that includes plugin prefix, module
         * name, and path. If parentModuleMap is provided it will
         * also normalize the name via require.normalize()
         *
         * @param {String} name the module name
         * @param {String} [parentModuleMap] parent module map
         * for the module name, used to resolve relative names.
         * @param {Boolean} isNormalized: is the ID already normalized.
         * This is true if this call is done for a define() module ID.
         * @param {Boolean} applyMap: apply the map config to the ID.
         * Should only be true if this map is for a dependency.
         *
         * @returns {Object}
         */
        function makeModuleMap(name, parentModuleMap, isNormalized, applyMap) {
            var url, pluginModule, suffix, nameParts,
                prefix = null,
                parentName = parentModuleMap ? parentModuleMap.name : null,
                originalName = name,
                isDefine = true,
                normalizedName = '';

            //If no name, then it means it is a require call, generate an
            //internal name.
            if (!name) {
                isDefine = false;
                name = '_@r' + (requireCounter += 1);
            }

            nameParts = splitPrefix(name);
            prefix = nameParts[0];
            name = nameParts[1];

            if (prefix) {
                prefix = normalize(prefix, parentName, applyMap);
                pluginModule = getOwn(defined, prefix);
            }

            //Account for relative paths if there is a base name.
            if (name) {
                if (prefix) {
                    if (pluginModule && pluginModule.normalize) {
                        //Plugin is loaded, use its normalize method.
                        normalizedName = pluginModule.normalize(name, function (name) {
                            return normalize(name, parentName, applyMap);
                        });
                    } else {
                        // If nested plugin references, then do not try to
                        // normalize, as it will not normalize correctly. This
                        // places a restriction on resourceIds, and the longer
                        // term solution is not to normalize until plugins are
                        // loaded and all normalizations to allow for async
                        // loading of a loader plugin. But for now, fixes the
                        // common uses. Details in #1131
                        normalizedName = name.indexOf('!') === -1 ?
                                         normalize(name, parentName, applyMap) :
                                         name;
                    }
                } else {
                    //A regular module.
                    normalizedName = normalize(name, parentName, applyMap);

                    //Normalized name may be a plugin ID due to map config
                    //application in normalize. The map config values must
                    //already be normalized, so do not need to redo that part.
                    nameParts = splitPrefix(normalizedName);
                    prefix = nameParts[0];
                    normalizedName = nameParts[1];
                    isNormalized = true;

                    url = context.nameToUrl(normalizedName);
                }
            }

            //If the id is a plugin id that cannot be determined if it needs
            //normalization, stamp it with a unique ID so two matching relative
            //ids that may conflict can be separate.
            suffix = prefix && !pluginModule && !isNormalized ?
                     '_unnormalized' + (unnormalizedCounter += 1) :
                     '';

            return {
                prefix: prefix,
                name: normalizedName,
                parentMap: parentModuleMap,
                unnormalized: !!suffix,
                url: url,
                originalName: originalName,
                isDefine: isDefine,
                id: (prefix ?
                        prefix + '!' + normalizedName :
                        normalizedName) + suffix
            };
        }

        function getModule(depMap) {
            var id = depMap.id,
                mod = getOwn(registry, id);

            if (!mod) {
                mod = registry[id] = new context.Module(depMap);
            }

            return mod;
        }

        function on(depMap, name, fn) {
            var id = depMap.id,
                mod = getOwn(registry, id);

            if (hasProp(defined, id) &&
                    (!mod || mod.defineEmitComplete)) {
                if (name === 'defined') {
                    fn(defined[id]);
                }
            } else {
                mod = getModule(depMap);
                if (mod.error && name === 'error') {
                    fn(mod.error);
                } else {
                    mod.on(name, fn);
                }
            }
        }

        function onError(err, errback) {
            var ids = err.requireModules,
                notified = false;

            if (errback) {
                errback(err);
            } else {
                each(ids, function (id) {
                    var mod = getOwn(registry, id);
                    if (mod) {
                        //Set error on module, so it skips timeout checks.
                        mod.error = err;
                        if (mod.events.error) {
                            notified = true;
                            mod.emit('error', err);
                        }
                    }
                });

                if (!notified) {
                    req.onError(err);
                }
            }
        }

        /**
         * Internal method to transfer globalQueue items to this context's
         * defQueue.
         */
        function takeGlobalQueue() {
            //Push all the globalDefQueue items into the context's defQueue
            if (globalDefQueue.length) {
                //Array splice in the values since the context code has a
                //local var ref to defQueue, so cannot just reassign the one
                //on context.
                apsp.apply(defQueue,
                           [defQueue.length, 0].concat(globalDefQueue));
                globalDefQueue = [];
            }
        }

        handlers = {
            'require': function (mod) {
                if (mod.require) {
                    return mod.require;
                } else {
                    return (mod.require = context.makeRequire(mod.map));
                }
            },
            'exports': function (mod) {
                mod.usingExports = true;
                if (mod.map.isDefine) {
                    if (mod.exports) {
                        return (defined[mod.map.id] = mod.exports);
                    } else {
                        return (mod.exports = defined[mod.map.id] = {});
                    }
                }
            },
            'module': function (mod) {
                if (mod.module) {
                    return mod.module;
                } else {
                    return (mod.module = {
                        id: mod.map.id,
                        uri: mod.map.url,
                        config: function () {
                            return  getOwn(config.config, mod.map.id) || {};
                        },
                        exports: mod.exports || (mod.exports = {})
                    });
                }
            }
        };

        function cleanRegistry(id) {
            //Clean up machinery used for waiting modules.
            delete registry[id];
            delete enabledRegistry[id];
        }

        function breakCycle(mod, traced, processed) {
            var id = mod.map.id;

            if (mod.error) {
                mod.emit('error', mod.error);
            } else {
                traced[id] = true;
                each(mod.depMaps, function (depMap, i) {
                    var depId = depMap.id,
                        dep = getOwn(registry, depId);

                    //Only force things that have not completed
                    //being defined, so still in the registry,
                    //and only if it has not been matched up
                    //in the module already.
                    if (dep && !mod.depMatched[i] && !processed[depId]) {
                        if (getOwn(traced, depId)) {
                            mod.defineDep(i, defined[depId]);
                            mod.check(); //pass false?
                        } else {
                            breakCycle(dep, traced, processed);
                        }
                    }
                });
                processed[id] = true;
            }
        }

        function checkLoaded() {
            var err, usingPathFallback,
                waitInterval = config.waitSeconds * 1000,
                //It is possible to disable the wait interval by using waitSeconds of 0.
                expired = waitInterval && (context.startTime + waitInterval) < new Date().getTime(),
                noLoads = [],
                reqCalls = [],
                stillLoading = false,
                needCycleCheck = true;

            //Do not bother if this call was a result of a cycle break.
            if (inCheckLoaded) {
                return;
            }

            inCheckLoaded = true;

            //Figure out the state of all the modules.
            eachProp(enabledRegistry, function (mod) {
                var map = mod.map,
                    modId = map.id;

                //Skip things that are not enabled or in error state.
                if (!mod.enabled) {
                    return;
                }

                if (!map.isDefine) {
                    reqCalls.push(mod);
                }

                if (!mod.error) {
                    //If the module should be executed, and it has not
                    //been inited and time is up, remember it.
                    if (!mod.inited && expired) {
                        if (hasPathFallback(modId)) {
                            usingPathFallback = true;
                            stillLoading = true;
                        } else {
                            noLoads.push(modId);
                            removeScript(modId);
                        }
                    } else if (!mod.inited && mod.fetched && map.isDefine) {
                        stillLoading = true;
                        if (!map.prefix) {
                            //No reason to keep looking for unfinished
                            //loading. If the only stillLoading is a
                            //plugin resource though, keep going,
                            //because it may be that a plugin resource
                            //is waiting on a non-plugin cycle.
                            return (needCycleCheck = false);
                        }
                    }
                }
            });

            if (expired && noLoads.length) {
                //If wait time expired, throw error of unloaded modules.
                err = makeError('timeout', 'Load timeout for modules: ' + noLoads, null, noLoads);
                err.contextName = context.contextName;
                return onError(err);
            }

            //Not expired, check for a cycle.
            if (needCycleCheck) {
                each(reqCalls, function (mod) {
                    breakCycle(mod, {}, {});
                });
            }

            //If still waiting on loads, and the waiting load is something
            //other than a plugin resource, or there are still outstanding
            //scripts, then just try back later.
            if ((!expired || usingPathFallback) && stillLoading) {
                //Something is still waiting to load. Wait for it, but only
                //if a timeout is not already in effect.
                if ((isBrowser || isWebWorker) && !checkLoadedTimeoutId) {
                    checkLoadedTimeoutId = setTimeout(function () {
                        checkLoadedTimeoutId = 0;
                        checkLoaded();
                    }, 50);
                }
            }

            inCheckLoaded = false;
        }

        Module = function (map) {
            this.events = getOwn(undefEvents, map.id) || {};
            this.map = map;
            this.shim = getOwn(config.shim, map.id);
            this.depExports = [];
            this.depMaps = [];
            this.depMatched = [];
            this.pluginMaps = {};
            this.depCount = 0;

            /* this.exports this.factory
               this.depMaps = [],
               this.enabled, this.fetched
            */
        };

        Module.prototype = {
            init: function (depMaps, factory, errback, options) {
                options = options || {};

                //Do not do more inits if already done. Can happen if there
                //are multiple define calls for the same module. That is not
                //a normal, common case, but it is also not unexpected.
                if (this.inited) {
                    return;
                }

                this.factory = factory;

                if (errback) {
                    //Register for errors on this module.
                    this.on('error', errback);
                } else if (this.events.error) {
                    //If no errback already, but there are error listeners
                    //on this module, set up an errback to pass to the deps.
                    errback = bind(this, function (err) {
                        this.emit('error', err);
                    });
                }

                //Do a copy of the dependency array, so that
                //source inputs are not modified. For example
                //"shim" deps are passed in here directly, and
                //doing a direct modification of the depMaps array
                //would affect that config.
                this.depMaps = depMaps && depMaps.slice(0);

                this.errback = errback;

                //Indicate this module has be initialized
                this.inited = true;

                this.ignore = options.ignore;

                //Could have option to init this module in enabled mode,
                //or could have been previously marked as enabled. However,
                //the dependencies are not known until init is called. So
                //if enabled previously, now trigger dependencies as enabled.
                if (options.enabled || this.enabled) {
                    //Enable this module and dependencies.
                    //Will call this.check()
                    this.enable();
                } else {
                    this.check();
                }
            },

            defineDep: function (i, depExports) {
                //Because of cycles, defined callback for a given
                //export can be called more than once.
                if (!this.depMatched[i]) {
                    this.depMatched[i] = true;
                    this.depCount -= 1;
                    this.depExports[i] = depExports;
                }
            },

            fetch: function () {
                if (this.fetched) {
                    return;
                }
                this.fetched = true;

                context.startTime = (new Date()).getTime();

                var map = this.map;

                //If the manager is for a plugin managed resource,
                //ask the plugin to load it now.
                if (this.shim) {
                    context.makeRequire(this.map, {
                        enableBuildCallback: true
                    })(this.shim.deps || [], bind(this, function () {
                        return map.prefix ? this.callPlugin() : this.load();
                    }));
                } else {
                    //Regular dependency.
                    return map.prefix ? this.callPlugin() : this.load();
                }
            },

            load: function () {
                var url = this.map.url;

                //Regular dependency.
                if (!urlFetched[url]) {
                    urlFetched[url] = true;
                    context.load(this.map.id, url);
                }
            },

            /**
             * Checks if the module is ready to define itself, and if so,
             * define it.
             */
            check: function () {
                if (!this.enabled || this.enabling) {
                    return;
                }

                var err, cjsModule,
                    id = this.map.id,
                    depExports = this.depExports,
                    exports = this.exports,
                    factory = this.factory;

                if (!this.inited) {
                    this.fetch();
                } else if (this.error) {
                    this.emit('error', this.error);
                } else if (!this.defining) {
                    //The factory could trigger another require call
                    //that would result in checking this module to
                    //define itself again. If already in the process
                    //of doing that, skip this work.
                    this.defining = true;

                    if (this.depCount < 1 && !this.defined) {
                        if (isFunction(factory)) {
                            //If there is an error listener, favor passing
                            //to that instead of throwing an error. However,
                            //only do it for define()'d  modules. require
                            //errbacks should not be called for failures in
                            //their callbacks (#699). However if a global
                            //onError is set, use that.
                            if ((this.events.error && this.map.isDefine) ||
                                req.onError !== defaultOnError) {
                                try {
                                    exports = context.execCb(id, factory, depExports, exports);
                                } catch (e) {
                                    err = e;
                                }
                            } else {
                                exports = context.execCb(id, factory, depExports, exports);
                            }

                            // Favor return value over exports. If node/cjs in play,
                            // then will not have a return value anyway. Favor
                            // module.exports assignment over exports object.
                            if (this.map.isDefine && exports === undefined) {
                                cjsModule = this.module;
                                if (cjsModule) {
                                    exports = cjsModule.exports;
                                } else if (this.usingExports) {
                                    //exports already set the defined value.
                                    exports = this.exports;
                                }
                            }

                            if (err) {
                                err.requireMap = this.map;
                                err.requireModules = this.map.isDefine ? [this.map.id] : null;
                                err.requireType = this.map.isDefine ? 'define' : 'require';
                                return onError((this.error = err));
                            }

                        } else {
                            //Just a literal value
                            exports = factory;
                        }

                        this.exports = exports;

                        if (this.map.isDefine && !this.ignore) {
                            defined[id] = exports;

                            if (req.onResourceLoad) {
                                req.onResourceLoad(context, this.map, this.depMaps);
                            }
                        }

                        //Clean up
                        cleanRegistry(id);

                        this.defined = true;
                    }

                    //Finished the define stage. Allow calling check again
                    //to allow define notifications below in the case of a
                    //cycle.
                    this.defining = false;

                    if (this.defined && !this.defineEmitted) {
                        this.defineEmitted = true;
                        this.emit('defined', this.exports);
                        this.defineEmitComplete = true;
                    }

                }
            },

            callPlugin: function () {
                var map = this.map,
                    id = map.id,
                    //Map already normalized the prefix.
                    pluginMap = makeModuleMap(map.prefix);

                //Mark this as a dependency for this plugin, so it
                //can be traced for cycles.
                this.depMaps.push(pluginMap);

                on(pluginMap, 'defined', bind(this, function (plugin) {
                    var load, normalizedMap, normalizedMod,
                        bundleId = getOwn(bundlesMap, this.map.id),
                        name = this.map.name,
                        parentName = this.map.parentMap ? this.map.parentMap.name : null,
                        localRequire = context.makeRequire(map.parentMap, {
                            enableBuildCallback: true
                        });

                    //If current map is not normalized, wait for that
                    //normalized name to load instead of continuing.
                    if (this.map.unnormalized) {
                        //Normalize the ID if the plugin allows it.
                        if (plugin.normalize) {
                            name = plugin.normalize(name, function (name) {
                                return normalize(name, parentName, true);
                            }) || '';
                        }

                        //prefix and name should already be normalized, no need
                        //for applying map config again either.
                        normalizedMap = makeModuleMap(map.prefix + '!' + name,
                                                      this.map.parentMap);
                        on(normalizedMap,
                            'defined', bind(this, function (value) {
                                this.init([], function () { return value; }, null, {
                                    enabled: true,
                                    ignore: true
                                });
                            }));

                        normalizedMod = getOwn(registry, normalizedMap.id);
                        if (normalizedMod) {
                            //Mark this as a dependency for this plugin, so it
                            //can be traced for cycles.
                            this.depMaps.push(normalizedMap);

                            if (this.events.error) {
                                normalizedMod.on('error', bind(this, function (err) {
                                    this.emit('error', err);
                                }));
                            }
                            normalizedMod.enable();
                        }

                        return;
                    }

                    //If a paths config, then just load that file instead to
                    //resolve the plugin, as it is built into that paths layer.
                    if (bundleId) {
                        this.map.url = context.nameToUrl(bundleId);
                        this.load();
                        return;
                    }

                    load = bind(this, function (value) {
                        this.init([], function () { return value; }, null, {
                            enabled: true
                        });
                    });

                    load.error = bind(this, function (err) {
                        this.inited = true;
                        this.error = err;
                        err.requireModules = [id];

                        //Remove temp unnormalized modules for this module,
                        //since they will never be resolved otherwise now.
                        eachProp(registry, function (mod) {
                            if (mod.map.id.indexOf(id + '_unnormalized') === 0) {
                                cleanRegistry(mod.map.id);
                            }
                        });

                        onError(err);
                    });

                    //Allow plugins to load other code without having to know the
                    //context or how to 'complete' the load.
                    load.fromText = bind(this, function (text, textAlt) {
                        /*jslint evil: true */
                        var moduleName = map.name,
                            moduleMap = makeModuleMap(moduleName),
                            hasInteractive = useInteractive;

                        //As of 2.1.0, support just passing the text, to reinforce
                        //fromText only being called once per resource. Still
                        //support old style of passing moduleName but discard
                        //that moduleName in favor of the internal ref.
                        if (textAlt) {
                            text = textAlt;
                        }

                        //Turn off interactive script matching for IE for any define
                        //calls in the text, then turn it back on at the end.
                        if (hasInteractive) {
                            useInteractive = false;
                        }

                        //Prime the system by creating a module instance for
                        //it.
                        getModule(moduleMap);

                        //Transfer any config to this other module.
                        if (hasProp(config.config, id)) {
                            config.config[moduleName] = config.config[id];
                        }

                        try {
                            req.exec(text);
                        } catch (e) {
                            return onError(makeError('fromtexteval',
                                             'fromText eval for ' + id +
                                            ' failed: ' + e,
                                             e,
                                             [id]));
                        }

                        if (hasInteractive) {
                            useInteractive = true;
                        }

                        //Mark this as a dependency for the plugin
                        //resource
                        this.depMaps.push(moduleMap);

                        //Support anonymous modules.
                        context.completeLoad(moduleName);

                        //Bind the value of that module to the value for this
                        //resource ID.
                        localRequire([moduleName], load);
                    });

                    //Use parentName here since the plugin's name is not reliable,
                    //could be some weird string with no path that actually wants to
                    //reference the parentName's path.
                    plugin.load(map.name, localRequire, load, config);
                }));

                context.enable(pluginMap, this);
                this.pluginMaps[pluginMap.id] = pluginMap;
            },

            enable: function () {
                enabledRegistry[this.map.id] = this;
                this.enabled = true;

                //Set flag mentioning that the module is enabling,
                //so that immediate calls to the defined callbacks
                //for dependencies do not trigger inadvertent load
                //with the depCount still being zero.
                this.enabling = true;

                //Enable each dependency
                each(this.depMaps, bind(this, function (depMap, i) {
                    var id, mod, handler;

                    if (typeof depMap === 'string') {
                        //Dependency needs to be converted to a depMap
                        //and wired up to this module.
                        depMap = makeModuleMap(depMap,
                                               (this.map.isDefine ? this.map : this.map.parentMap),
                                               false,
                                               !this.skipMap);
                        this.depMaps[i] = depMap;

                        handler = getOwn(handlers, depMap.id);

                        if (handler) {
                            this.depExports[i] = handler(this);
                            return;
                        }

                        this.depCount += 1;

                        on(depMap, 'defined', bind(this, function (depExports) {
                            this.defineDep(i, depExports);
                            this.check();
                        }));

                        if (this.errback) {
                            on(depMap, 'error', bind(this, this.errback));
                        }
                    }

                    id = depMap.id;
                    mod = registry[id];

                    //Skip special modules like 'require', 'exports', 'module'
                    //Also, don't call enable if it is already enabled,
                    //important in circular dependency cases.
                    if (!hasProp(handlers, id) && mod && !mod.enabled) {
                        context.enable(depMap, this);
                    }
                }));

                //Enable each plugin that is used in
                //a dependency
                eachProp(this.pluginMaps, bind(this, function (pluginMap) {
                    var mod = getOwn(registry, pluginMap.id);
                    if (mod && !mod.enabled) {
                        context.enable(pluginMap, this);
                    }
                }));

                this.enabling = false;

                this.check();
            },

            on: function (name, cb) {
                var cbs = this.events[name];
                if (!cbs) {
                    cbs = this.events[name] = [];
                }
                cbs.push(cb);
            },

            emit: function (name, evt) {
                each(this.events[name], function (cb) {
                    cb(evt);
                });
                if (name === 'error') {
                    //Now that the error handler was triggered, remove
                    //the listeners, since this broken Module instance
                    //can stay around for a while in the registry.
                    delete this.events[name];
                }
            }
        };

        function callGetModule(args) {
            //Skip modules already defined.
            if (!hasProp(defined, args[0])) {
                getModule(makeModuleMap(args[0], null, true)).init(args[1], args[2]);
            }
        }

        function removeListener(node, func, name, ieName) {
            //Favor detachEvent because of IE9
            //issue, see attachEvent/addEventListener comment elsewhere
            //in this file.
            if (node.detachEvent && !isOpera) {
                //Probably IE. If not it will throw an error, which will be
                //useful to know.
                if (ieName) {
                    node.detachEvent(ieName, func);
                }
            } else {
                node.removeEventListener(name, func, false);
            }
        }

        /**
         * Given an event from a script node, get the requirejs info from it,
         * and then removes the event listeners on the node.
         * @param {Event} evt
         * @returns {Object}
         */
        function getScriptData(evt) {
            //Using currentTarget instead of target for Firefox 2.0's sake. Not
            //all old browsers will be supported, but this one was easy enough
            //to support and still makes sense.
            var node = evt.currentTarget || evt.srcElement;

            //Remove the listeners once here.
            removeListener(node, context.onScriptLoad, 'load', 'onreadystatechange');
            removeListener(node, context.onScriptError, 'error');

            return {
                node: node,
                id: node && node.getAttribute('data-requiremodule')
            };
        }

        function intakeDefines() {
            var args;

            //Any defined modules in the global queue, intake them now.
            takeGlobalQueue();

            //Make sure any remaining defQueue items get properly processed.
            while (defQueue.length) {
                args = defQueue.shift();
                if (args[0] === null) {
                    return onError(makeError('mismatch', 'Mismatched anonymous define() module: ' + args[args.length - 1]));
                } else {
                    //args are id, deps, factory. Should be normalized by the
                    //define() function.
                    callGetModule(args);
                }
            }
        }

        context = {
            config: config,
            contextName: contextName,
            registry: registry,
            defined: defined,
            urlFetched: urlFetched,
            defQueue: defQueue,
            Module: Module,
            makeModuleMap: makeModuleMap,
            nextTick: req.nextTick,
            onError: onError,

            /**
             * Set a configuration for the context.
             * @param {Object} cfg config object to integrate.
             */
            configure: function (cfg) {
                //Make sure the baseUrl ends in a slash.
                if (cfg.baseUrl) {
                    if (cfg.baseUrl.charAt(cfg.baseUrl.length - 1) !== '/') {
                        cfg.baseUrl += '/';
                    }
                }

                //Save off the paths since they require special processing,
                //they are additive.
                var shim = config.shim,
                    objs = {
                        paths: true,
                        bundles: true,
                        config: true,
                        map: true
                    };

                eachProp(cfg, function (value, prop) {
                    if (objs[prop]) {
                        if (!config[prop]) {
                            config[prop] = {};
                        }
                        mixin(config[prop], value, true, true);
                    } else {
                        config[prop] = value;
                    }
                });

                //Reverse map the bundles
                if (cfg.bundles) {
                    eachProp(cfg.bundles, function (value, prop) {
                        each(value, function (v) {
                            if (v !== prop) {
                                bundlesMap[v] = prop;
                            }
                        });
                    });
                }

                //Merge shim
                if (cfg.shim) {
                    eachProp(cfg.shim, function (value, id) {
                        //Normalize the structure
                        if (isArray(value)) {
                            value = {
                                deps: value
                            };
                        }
                        if ((value.exports || value.init) && !value.exportsFn) {
                            value.exportsFn = context.makeShimExports(value);
                        }
                        shim[id] = value;
                    });
                    config.shim = shim;
                }

                //Adjust packages if necessary.
                if (cfg.packages) {
                    each(cfg.packages, function (pkgObj) {
                        var location, name;

                        pkgObj = typeof pkgObj === 'string' ? { name: pkgObj } : pkgObj;

                        name = pkgObj.name;
                        location = pkgObj.location;
                        if (location) {
                            config.paths[name] = pkgObj.location;
                        }

                        //Save pointer to main module ID for pkg name.
                        //Remove leading dot in main, so main paths are normalized,
                        //and remove any trailing .js, since different package
                        //envs have different conventions: some use a module name,
                        //some use a file name.
                        config.pkgs[name] = pkgObj.name + '/' + (pkgObj.main || 'main')
                                     .replace(currDirRegExp, '')
                                     .replace(jsSuffixRegExp, '');
                    });
                }

                //If there are any "waiting to execute" modules in the registry,
                //update the maps for them, since their info, like URLs to load,
                //may have changed.
                eachProp(registry, function (mod, id) {
                    //If module already has init called, since it is too
                    //late to modify them, and ignore unnormalized ones
                    //since they are transient.
                    if (!mod.inited && !mod.map.unnormalized) {
                        mod.map = makeModuleMap(id);
                    }
                });

                //If a deps array or a config callback is specified, then call
                //require with those args. This is useful when require is defined as a
                //config object before require.js is loaded.
                if (cfg.deps || cfg.callback) {
                    context.require(cfg.deps || [], cfg.callback);
                }
            },

            makeShimExports: function (value) {
                function fn() {
                    var ret;
                    if (value.init) {
                        ret = value.init.apply(global, arguments);
                    }
                    return ret || (value.exports && getGlobal(value.exports));
                }
                return fn;
            },

            makeRequire: function (relMap, options) {
                options = options || {};

                function localRequire(deps, callback, errback) {
                    var id, map, requireMod;

                    if (options.enableBuildCallback && callback && isFunction(callback)) {
                        callback.__requireJsBuild = true;
                    }

                    if (typeof deps === 'string') {
                        if (isFunction(callback)) {
                            //Invalid call
                            return onError(makeError('requireargs', 'Invalid require call'), errback);
                        }

                        //If require|exports|module are requested, get the
                        //value for them from the special handlers. Caveat:
                        //this only works while module is being defined.
                        if (relMap && hasProp(handlers, deps)) {
                            return handlers[deps](registry[relMap.id]);
                        }

                        //Synchronous access to one module. If require.get is
                        //available (as in the Node adapter), prefer that.
                        if (req.get) {
                            return req.get(context, deps, relMap, localRequire);
                        }

                        //Normalize module name, if it contains . or ..
                        map = makeModuleMap(deps, relMap, false, true);
                        id = map.id;

                        if (!hasProp(defined, id)) {
                            return onError(makeError('notloaded', 'Module name "' +
                                        id +
                                        '" has not been loaded yet for context: ' +
                                        contextName +
                                        (relMap ? '' : '. Use require([])')));
                        }
                        return defined[id];
                    }

                    //Grab defines waiting in the global queue.
                    intakeDefines();

                    //Mark all the dependencies as needing to be loaded.
                    context.nextTick(function () {
                        //Some defines could have been added since the
                        //require call, collect them.
                        intakeDefines();

                        requireMod = getModule(makeModuleMap(null, relMap));

                        //Store if map config should be applied to this require
                        //call for dependencies.
                        requireMod.skipMap = options.skipMap;

                        requireMod.init(deps, callback, errback, {
                            enabled: true
                        });

                        checkLoaded();
                    });

                    return localRequire;
                }

                mixin(localRequire, {
                    isBrowser: isBrowser,

                    /**
                     * Converts a module name + .extension into an URL path.
                     * *Requires* the use of a module name. It does not support using
                     * plain URLs like nameToUrl.
                     */
                    toUrl: function (moduleNamePlusExt) {
                        var ext,
                            index = moduleNamePlusExt.lastIndexOf('.'),
                            segment = moduleNamePlusExt.split('/')[0],
                            isRelative = segment === '.' || segment === '..';

                        //Have a file extension alias, and it is not the
                        //dots from a relative path.
                        if (index !== -1 && (!isRelative || index > 1)) {
                            ext = moduleNamePlusExt.substring(index, moduleNamePlusExt.length);
                            moduleNamePlusExt = moduleNamePlusExt.substring(0, index);
                        }

                        return context.nameToUrl(normalize(moduleNamePlusExt,
                                                relMap && relMap.id, true), ext,  true);
                    },

                    defined: function (id) {
                        return hasProp(defined, makeModuleMap(id, relMap, false, true).id);
                    },

                    specified: function (id) {
                        id = makeModuleMap(id, relMap, false, true).id;
                        return hasProp(defined, id) || hasProp(registry, id);
                    }
                });

                //Only allow undef on top level require calls
                if (!relMap) {
                    localRequire.undef = function (id) {
                        //Bind any waiting define() calls to this context,
                        //fix for #408
                        takeGlobalQueue();

                        var map = makeModuleMap(id, relMap, true),
                            mod = getOwn(registry, id);

                        removeScript(id);

                        delete defined[id];
                        delete urlFetched[map.url];
                        delete undefEvents[id];

                        //Clean queued defines too. Go backwards
                        //in array so that the splices do not
                        //mess up the iteration.
                        eachReverse(defQueue, function(args, i) {
                            if(args[0] === id) {
                                defQueue.splice(i, 1);
                            }
                        });

                        if (mod) {
                            //Hold on to listeners in case the
                            //module will be attempted to be reloaded
                            //using a different config.
                            if (mod.events.defined) {
                                undefEvents[id] = mod.events;
                            }

                            cleanRegistry(id);
                        }
                    };
                }

                return localRequire;
            },

            /**
             * Called to enable a module if it is still in the registry
             * awaiting enablement. A second arg, parent, the parent module,
             * is passed in for context, when this method is overridden by
             * the optimizer. Not shown here to keep code compact.
             */
            enable: function (depMap) {
                var mod = getOwn(registry, depMap.id);
                if (mod) {
                    getModule(depMap).enable();
                }
            },

            /**
             * Internal method used by environment adapters to complete a load event.
             * A load event could be a script load or just a load pass from a synchronous
             * load call.
             * @param {String} moduleName the name of the module to potentially complete.
             */
            completeLoad: function (moduleName) {
                var found, args, mod,
                    shim = getOwn(config.shim, moduleName) || {},
                    shExports = shim.exports;

                takeGlobalQueue();

                while (defQueue.length) {
                    args = defQueue.shift();
                    if (args[0] === null) {
                        args[0] = moduleName;
                        //If already found an anonymous module and bound it
                        //to this name, then this is some other anon module
                        //waiting for its completeLoad to fire.
                        if (found) {
                            break;
                        }
                        found = true;
                    } else if (args[0] === moduleName) {
                        //Found matching define call for this script!
                        found = true;
                    }

                    callGetModule(args);
                }

                //Do this after the cycle of callGetModule in case the result
                //of those calls/init calls changes the registry.
                mod = getOwn(registry, moduleName);

                if (!found && !hasProp(defined, moduleName) && mod && !mod.inited) {
                    if (config.enforceDefine && (!shExports || !getGlobal(shExports))) {
                        if (hasPathFallback(moduleName)) {
                            return;
                        } else {
                            return onError(makeError('nodefine',
                                             'No define call for ' + moduleName,
                                             null,
                                             [moduleName]));
                        }
                    } else {
                        //A script that does not call define(), so just simulate
                        //the call for it.
                        callGetModule([moduleName, (shim.deps || []), shim.exportsFn]);
                    }
                }

                checkLoaded();
            },

            /**
             * Converts a module name to a file path. Supports cases where
             * moduleName may actually be just an URL.
             * Note that it **does not** call normalize on the moduleName,
             * it is assumed to have already been normalized. This is an
             * internal API, not a public one. Use toUrl for the public API.
             */
            nameToUrl: function (moduleName, ext, skipExt) {
                var paths, syms, i, parentModule, url,
                    parentPath, bundleId,
                    pkgMain = getOwn(config.pkgs, moduleName);

                if (pkgMain) {
                    moduleName = pkgMain;
                }

                bundleId = getOwn(bundlesMap, moduleName);

                if (bundleId) {
                    return context.nameToUrl(bundleId, ext, skipExt);
                }

                //If a colon is in the URL, it indicates a protocol is used and it is just
                //an URL to a file, or if it starts with a slash, contains a query arg (i.e. ?)
                //or ends with .js, then assume the user meant to use an url and not a module id.
                //The slash is important for protocol-less URLs as well as full paths.
                if (req.jsExtRegExp.test(moduleName)) {
                    //Just a plain path, not module name lookup, so just return it.
                    //Add extension if it is included. This is a bit wonky, only non-.js things pass
                    //an extension, this method probably needs to be reworked.
                    url = moduleName + (ext || '');
                } else {
                    //A module that needs to be converted to a path.
                    paths = config.paths;

                    syms = moduleName.split('/');
                    //For each module name segment, see if there is a path
                    //registered for it. Start with most specific name
                    //and work up from it.
                    for (i = syms.length; i > 0; i -= 1) {
                        parentModule = syms.slice(0, i).join('/');

                        parentPath = getOwn(paths, parentModule);
                        if (parentPath) {
                            //If an array, it means there are a few choices,
                            //Choose the one that is desired
                            if (isArray(parentPath)) {
                                parentPath = parentPath[0];
                            }
                            syms.splice(0, i, parentPath);
                            break;
                        }
                    }

                    //Join the path parts together, then figure out if baseUrl is needed.
                    url = syms.join('/');
                    url += (ext || (/^data\:|\?/.test(url) || skipExt ? '' : '.js'));
                    url = (url.charAt(0) === '/' || url.match(/^[\w\+\.\-]+:/) ? '' : config.baseUrl) + url;
                }

                return config.urlArgs ? url +
                                        ((url.indexOf('?') === -1 ? '?' : '&') +
                                         config.urlArgs) : url;
            },

            //Delegates to req.load. Broken out as a separate function to
            //allow overriding in the optimizer.
            load: function (id, url) {
                req.load(context, id, url);
            },

            /**
             * Executes a module callback function. Broken out as a separate function
             * solely to allow the build system to sequence the files in the built
             * layer in the right sequence.
             *
             * @private
             */
            execCb: function (name, callback, args, exports) {
                return callback.apply(exports, args);
            },

            /**
             * callback for script loads, used to check status of loading.
             *
             * @param {Event} evt the event from the browser for the script
             * that was loaded.
             */
            onScriptLoad: function (evt) {
                //Using currentTarget instead of target for Firefox 2.0's sake. Not
                //all old browsers will be supported, but this one was easy enough
                //to support and still makes sense.
                if (evt.type === 'load' ||
                        (readyRegExp.test((evt.currentTarget || evt.srcElement).readyState))) {
                    //Reset interactive script so a script node is not held onto for
                    //to long.
                    interactiveScript = null;

                    //Pull out the name of the module and the context.
                    var data = getScriptData(evt);
                    context.completeLoad(data.id);
                }
            },

            /**
             * Callback for script errors.
             */
            onScriptError: function (evt) {
                var data = getScriptData(evt);
                if (!hasPathFallback(data.id)) {
                    return onError(makeError('scripterror', 'Script error for: ' + data.id, evt, [data.id]));
                }
            }
        };

        context.require = context.makeRequire();
        return context;
    }

    /**
     * Main entry point.
     *
     * If the only argument to require is a string, then the module that
     * is represented by that string is fetched for the appropriate context.
     *
     * If the first argument is an array, then it will be treated as an array
     * of dependency string names to fetch. An optional function callback can
     * be specified to execute when all of those dependencies are available.
     *
     * Make a local req variable to help Caja compliance (it assumes things
     * on a require that are not standardized), and to give a short
     * name for minification/local scope use.
     */
    req = requirejs = function (deps, callback, errback, optional) {

        //Find the right context, use default
        var context, config,
            contextName = defContextName;

        // Determine if have config object in the call.
        if (!isArray(deps) && typeof deps !== 'string') {
            // deps is a config object
            config = deps;
            if (isArray(callback)) {
                // Adjust args if there are dependencies
                deps = callback;
                callback = errback;
                errback = optional;
            } else {
                deps = [];
            }
        }

        if (config && config.context) {
            contextName = config.context;
        }

        context = getOwn(contexts, contextName);
        if (!context) {
            context = contexts[contextName] = req.s.newContext(contextName);
        }

        if (config) {
            context.configure(config);
        }

        return context.require(deps, callback, errback);
    };

    /**
     * Support require.config() to make it easier to cooperate with other
     * AMD loaders on globally agreed names.
     */
    req.config = function (config) {
        return req(config);
    };

    /**
     * Execute something after the current tick
     * of the event loop. Override for other envs
     * that have a better solution than setTimeout.
     * @param  {Function} fn function to execute later.
     */
    req.nextTick = typeof setTimeout !== 'undefined' ? function (fn) {
        setTimeout(fn, 4);
    } : function (fn) { fn(); };

    /**
     * Export require as a global, but only if it does not already exist.
     */
    if (!require) {
        require = req;
    }

    req.version = version;

    //Used to filter out dependencies that are already paths.
    req.jsExtRegExp = /^\/|:|\?|\.js$/;
    req.isBrowser = isBrowser;
    s = req.s = {
        contexts: contexts,
        newContext: newContext
    };

    //Create default context.
    req({});

    //Exports some context-sensitive methods on global require.
    each([
        'toUrl',
        'undef',
        'defined',
        'specified'
    ], function (prop) {
        //Reference from contexts instead of early binding to default context,
        //so that during builds, the latest instance of the default context
        //with its config gets used.
        req[prop] = function () {
            var ctx = contexts[defContextName];
            return ctx.require[prop].apply(ctx, arguments);
        };
    });

    if (isBrowser) {
        head = s.head = document.getElementsByTagName('head')[0];
        //If BASE tag is in play, using appendChild is a problem for IE6.
        //When that browser dies, this can be removed. Details in this jQuery bug:
        //http://dev.jquery.com/ticket/2709
        baseElement = document.getElementsByTagName('base')[0];
        if (baseElement) {
            head = s.head = baseElement.parentNode;
        }
    }

    /**
     * Any errors that require explicitly generates will be passed to this
     * function. Intercept/override it if you want custom error handling.
     * @param {Error} err the error object.
     */
    req.onError = defaultOnError;

    /**
     * Creates the node for the load command. Only used in browser envs.
     */
    req.createNode = function (config, moduleName, url) {
        var node = config.xhtml ?
                document.createElementNS('http://www.w3.org/1999/xhtml', 'html:script') :
                document.createElement('script');
        node.type = config.scriptType || 'text/javascript';
        node.charset = 'utf-8';
        node.async = true;
        return node;
    };

    /**
     * Does the request to load a module for the browser case.
     * Make this a separate function to allow other environments
     * to override it.
     *
     * @param {Object} context the require context to find state.
     * @param {String} moduleName the name of the module.
     * @param {Object} url the URL to the module.
     */
    req.load = function (context, moduleName, url) {
        var config = (context && context.config) || {},
            node;
        if (isBrowser) {
            //In the browser so use a script tag
            node = req.createNode(config, moduleName, url);

            node.setAttribute('data-requirecontext', context.contextName);
            node.setAttribute('data-requiremodule', moduleName);

            //Set up load listener. Test attachEvent first because IE9 has
            //a subtle issue in its addEventListener and script onload firings
            //that do not match the behavior of all other browsers with
            //addEventListener support, which fire the onload event for a
            //script right after the script execution. See:
            //https://connect.microsoft.com/IE/feedback/details/648057/script-onload-event-is-not-fired-immediately-after-script-execution
            //UNFORTUNATELY Opera implements attachEvent but does not follow the script
            //script execution mode.
            if (node.attachEvent &&
                    //Check if node.attachEvent is artificially added by custom script or
                    //natively supported by browser
                    //read https://github.com/jrburke/requirejs/issues/187
                    //if we can NOT find [native code] then it must NOT natively supported.
                    //in IE8, node.attachEvent does not have toString()
                    //Note the test for "[native code" with no closing brace, see:
                    //https://github.com/jrburke/requirejs/issues/273
                    !(node.attachEvent.toString && node.attachEvent.toString().indexOf('[native code') < 0) &&
                    !isOpera) {
                //Probably IE. IE (at least 6-8) do not fire
                //script onload right after executing the script, so
                //we cannot tie the anonymous define call to a name.
                //However, IE reports the script as being in 'interactive'
                //readyState at the time of the define call.
                useInteractive = true;

                node.attachEvent('onreadystatechange', context.onScriptLoad);
                //It would be great to add an error handler here to catch
                //404s in IE9+. However, onreadystatechange will fire before
                //the error handler, so that does not help. If addEventListener
                //is used, then IE will fire error before load, but we cannot
                //use that pathway given the connect.microsoft.com issue
                //mentioned above about not doing the 'script execute,
                //then fire the script load event listener before execute
                //next script' that other browsers do.
                //Best hope: IE10 fixes the issues,
                //and then destroys all installs of IE 6-9.
                //node.attachEvent('onerror', context.onScriptError);
            } else {
                node.addEventListener('load', context.onScriptLoad, false);
                node.addEventListener('error', context.onScriptError, false);
            }
            node.src = url;

            //For some cache cases in IE 6-8, the script executes before the end
            //of the appendChild execution, so to tie an anonymous define
            //call to the module name (which is stored on the node), hold on
            //to a reference to this node, but clear after the DOM insertion.
            currentlyAddingScript = node;
            if (baseElement) {
                head.insertBefore(node, baseElement);
            } else {
                head.appendChild(node);
            }
            currentlyAddingScript = null;

            return node;
        } else if (isWebWorker) {
            try {
                //In a web worker, use importScripts. This is not a very
                //efficient use of importScripts, importScripts will block until
                //its script is downloaded and evaluated. However, if web workers
                //are in play, the expectation that a build has been done so that
                //only one script needs to be loaded anyway. This may need to be
                //reevaluated if other use cases become common.
                importScripts(url);

                //Account for anonymous modules
                context.completeLoad(moduleName);
            } catch (e) {
                context.onError(makeError('importscripts',
                                'importScripts failed for ' +
                                    moduleName + ' at ' + url,
                                e,
                                [moduleName]));
            }
        }
    };

    function getInteractiveScript() {
        if (interactiveScript && interactiveScript.readyState === 'interactive') {
            return interactiveScript;
        }

        eachReverse(scripts(), function (script) {
            if (script.readyState === 'interactive') {
                return (interactiveScript = script);
            }
        });
        return interactiveScript;
    }

    //Look for a data-main script attribute, which could also adjust the baseUrl.
    if (isBrowser && !cfg.skipDataMain) {
        //Figure out baseUrl. Get it from the script tag with require.js in it.
        eachReverse(scripts(), function (script) {
            //Set the 'head' where we can append children by
            //using the script's parent.
            if (!head) {
                head = script.parentNode;
            }

            //Look for a data-main attribute to set main script for the page
            //to load. If it is there, the path to data main becomes the
            //baseUrl, if it is not already set.
            dataMain = script.getAttribute('data-main');
            if (dataMain) {
                //Preserve dataMain in case it is a path (i.e. contains '?')
                mainScript = dataMain;

                //Set final baseUrl if there is not already an explicit one.
                if (!cfg.baseUrl) {
                    //Pull off the directory of data-main for use as the
                    //baseUrl.
                    src = mainScript.split('/');
                    mainScript = src.pop();
                    subPath = src.length ? src.join('/')  + '/' : './';

                    cfg.baseUrl = subPath;
                }

                //Strip off any trailing .js since mainScript is now
                //like a module name.
                mainScript = mainScript.replace(jsSuffixRegExp, '');

                 //If mainScript is still a path, fall back to dataMain
                if (req.jsExtRegExp.test(mainScript)) {
                    mainScript = dataMain;
                }

                //Put the data-main script in the files to load.
                cfg.deps = cfg.deps ? cfg.deps.concat(mainScript) : [mainScript];

                return true;
            }
        });
    }

    /**
     * The function that handles definitions of modules. Differs from
     * require() in that a string for the module should be the first argument,
     * and the function to execute after dependencies are loaded should
     * return a value to define the module corresponding to the first argument's
     * name.
     */
    define = function (name, deps, callback) {
        var node, context;

        //Allow for anonymous modules
        if (typeof name !== 'string') {
            //Adjust args appropriately
            callback = deps;
            deps = name;
            name = null;
        }

        //This module may not have dependencies
        if (!isArray(deps)) {
            callback = deps;
            deps = null;
        }

        //If no name, and callback is a function, then figure out if it a
        //CommonJS thing with dependencies.
        if (!deps && isFunction(callback)) {
            deps = [];
            //Remove comments from the callback string,
            //look for require calls, and pull them into the dependencies,
            //but only if there are function args.
            if (callback.length) {
                callback
                    .toString()
                    .replace(commentRegExp, '')
                    .replace(cjsRequireRegExp, function (match, dep) {
                        deps.push(dep);
                    });

                //May be a CommonJS thing even without require calls, but still
                //could use exports, and module. Avoid doing exports and module
                //work though if it just needs require.
                //REQUIRES the function to expect the CommonJS variables in the
                //order listed below.
                deps = (callback.length === 1 ? ['require'] : ['require', 'exports', 'module']).concat(deps);
            }
        }

        //If in IE 6-8 and hit an anonymous define() call, do the interactive
        //work.
        if (useInteractive) {
            node = currentlyAddingScript || getInteractiveScript();
            if (node) {
                if (!name) {
                    name = node.getAttribute('data-requiremodule');
                }
                context = contexts[node.getAttribute('data-requirecontext')];
            }
        }

        //Always save off evaluating the def call until the script onload handler.
        //This allows multiple modules to be in a file without prematurely
        //tracing dependencies, and allows for anonymous module support,
        //where the module name is not known until the script onload event
        //occurs. If no context, use the global queue, and get it processed
        //in the onscript load callback.
        (context ? context.defQueue : globalDefQueue).push([name, deps, callback]);
    };

    define.amd = {
        jQuery: true
    };


    /**
     * Executes the text. Normally just uses eval, but can be modified
     * to use a better, environment-specific call. Only used for transpiling
     * loader plugins, not for plain JS modules.
     * @param {String} text the text to execute/evaluate.
     */
    req.exec = function (text) {
        /*jslint evil: true */
        return eval(text);
    };

    //Set up with config info.
    req(cfg);
}(this));

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        //Allow using this built library as an AMD module
        //in another project. That other project will only
        //see this AMD call, not the internal modules in
        //the closure below.
        define('Rebound', factory);
    } else {
        //Browser globals case. Just assign the
        //result to a property on the global.
        root.Rebound = factory();
    }
}(this, function () {

    // Start custom elements observer if using polyfill
    if(window.CustomElements)
      window.CustomElements.observeDocument(document)

    //almond, and your modules will be inlined here

/**
 * @license almond 0.2.9 Copyright (c) 2011-2014, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/almond for details
 */
//Going sloppy to avoid 'use strict' string cost, but strict practices should
//be followed.
/*jslint sloppy: true */
/*global setTimeout: false */

var requirejs, require, define;
(function (undef) {
    var main, req, makeMap, handlers,
        defined = {},
        waiting = {},
        config = {},
        defining = {},
        hasOwn = Object.prototype.hasOwnProperty,
        aps = [].slice,
        jsSuffixRegExp = /\.js$/;

    function hasProp(obj, prop) {
        return hasOwn.call(obj, prop);
    }

    /**
     * Given a relative module name, like ./something, normalize it to
     * a real name that can be mapped to a path.
     * @param {String} name the relative name
     * @param {String} baseName a real name that the name arg is relative
     * to.
     * @returns {String} normalized name
     */
    function normalize(name, baseName) {
        var nameParts, nameSegment, mapValue, foundMap, lastIndex,
            foundI, foundStarMap, starI, i, j, part,
            baseParts = baseName && baseName.split("/"),
            map = config.map,
            starMap = (map && map['*']) || {};

        //Adjust any relative paths.
        if (name && name.charAt(0) === ".") {
            //If have a base name, try to normalize against it,
            //otherwise, assume it is a top-level require that will
            //be relative to baseUrl in the end.
            if (baseName) {
                //Convert baseName to array, and lop off the last part,
                //so that . matches that "directory" and not name of the baseName's
                //module. For instance, baseName of "one/two/three", maps to
                //"one/two/three.js", but we want the directory, "one/two" for
                //this normalization.
                baseParts = baseParts.slice(0, baseParts.length - 1);
                name = name.split('/');
                lastIndex = name.length - 1;

                // Node .js allowance:
                if (config.nodeIdCompat && jsSuffixRegExp.test(name[lastIndex])) {
                    name[lastIndex] = name[lastIndex].replace(jsSuffixRegExp, '');
                }

                name = baseParts.concat(name);

                //start trimDots
                for (i = 0; i < name.length; i += 1) {
                    part = name[i];
                    if (part === ".") {
                        name.splice(i, 1);
                        i -= 1;
                    } else if (part === "..") {
                        if (i === 1 && (name[2] === '..' || name[0] === '..')) {
                            //End of the line. Keep at least one non-dot
                            //path segment at the front so it can be mapped
                            //correctly to disk. Otherwise, there is likely
                            //no path mapping for a path starting with '..'.
                            //This can still fail, but catches the most reasonable
                            //uses of ..
                            break;
                        } else if (i > 0) {
                            name.splice(i - 1, 2);
                            i -= 2;
                        }
                    }
                }
                //end trimDots

                name = name.join("/");
            } else if (name.indexOf('./') === 0) {
                // No baseName, so this is ID is resolved relative
                // to baseUrl, pull off the leading dot.
                name = name.substring(2);
            }
        }

        //Apply map config if available.
        if ((baseParts || starMap) && map) {
            nameParts = name.split('/');

            for (i = nameParts.length; i > 0; i -= 1) {
                nameSegment = nameParts.slice(0, i).join("/");

                if (baseParts) {
                    //Find the longest baseName segment match in the config.
                    //So, do joins on the biggest to smallest lengths of baseParts.
                    for (j = baseParts.length; j > 0; j -= 1) {
                        mapValue = map[baseParts.slice(0, j).join('/')];

                        //baseName segment has  config, find if it has one for
                        //this name.
                        if (mapValue) {
                            mapValue = mapValue[nameSegment];
                            if (mapValue) {
                                //Match, update name to the new value.
                                foundMap = mapValue;
                                foundI = i;
                                break;
                            }
                        }
                    }
                }

                if (foundMap) {
                    break;
                }

                //Check for a star map match, but just hold on to it,
                //if there is a shorter segment match later in a matching
                //config, then favor over this star map.
                if (!foundStarMap && starMap && starMap[nameSegment]) {
                    foundStarMap = starMap[nameSegment];
                    starI = i;
                }
            }

            if (!foundMap && foundStarMap) {
                foundMap = foundStarMap;
                foundI = starI;
            }

            if (foundMap) {
                nameParts.splice(0, foundI, foundMap);
                name = nameParts.join('/');
            }
        }

        return name;
    }

    function makeRequire(relName, forceSync) {
        return function () {
            //A version of a require function that passes a moduleName
            //value for items that may need to
            //look up paths relative to the moduleName
            return req.apply(undef, aps.call(arguments, 0).concat([relName, forceSync]));
        };
    }

    function makeNormalize(relName) {
        return function (name) {
            return normalize(name, relName);
        };
    }

    function makeLoad(depName) {
        return function (value) {
            defined[depName] = value;
        };
    }

    function callDep(name) {
        if (hasProp(waiting, name)) {
            var args = waiting[name];
            delete waiting[name];
            defining[name] = true;
            main.apply(undef, args);
        }

        if (!hasProp(defined, name) && !hasProp(defining, name)) {
            throw new Error('No ' + name);
        }
        return defined[name];
    }

    //Turns a plugin!resource to [plugin, resource]
    //with the plugin being undefined if the name
    //did not have a plugin prefix.
    function splitPrefix(name) {
        var prefix,
            index = name ? name.indexOf('!') : -1;
        if (index > -1) {
            prefix = name.substring(0, index);
            name = name.substring(index + 1, name.length);
        }
        return [prefix, name];
    }

    /**
     * Makes a name map, normalizing the name, and using a plugin
     * for normalization if necessary. Grabs a ref to plugin
     * too, as an optimization.
     */
    makeMap = function (name, relName) {
        var plugin,
            parts = splitPrefix(name),
            prefix = parts[0];

        name = parts[1];

        if (prefix) {
            prefix = normalize(prefix, relName);
            plugin = callDep(prefix);
        }

        //Normalize according
        if (prefix) {
            if (plugin && plugin.normalize) {
                name = plugin.normalize(name, makeNormalize(relName));
            } else {
                name = normalize(name, relName);
            }
        } else {
            name = normalize(name, relName);
            parts = splitPrefix(name);
            prefix = parts[0];
            name = parts[1];
            if (prefix) {
                plugin = callDep(prefix);
            }
        }

        //Using ridiculous property names for space reasons
        return {
            f: prefix ? prefix + '!' + name : name, //fullName
            n: name,
            pr: prefix,
            p: plugin
        };
    };

    function makeConfig(name) {
        return function () {
            return (config && config.config && config.config[name]) || {};
        };
    }

    handlers = {
        require: function (name) {
            return makeRequire(name);
        },
        exports: function (name) {
            var e = defined[name];
            if (typeof e !== 'undefined') {
                return e;
            } else {
                return (defined[name] = {});
            }
        },
        module: function (name) {
            return {
                id: name,
                uri: '',
                exports: defined[name],
                config: makeConfig(name)
            };
        }
    };

    main = function (name, deps, callback, relName) {
        var cjsModule, depName, ret, map, i,
            args = [],
            callbackType = typeof callback,
            usingExports;

        //Use name if no relName
        relName = relName || name;

        //Call the callback to define the module, if necessary.
        if (callbackType === 'undefined' || callbackType === 'function') {
            //Pull out the defined dependencies and pass the ordered
            //values to the callback.
            //Default to [require, exports, module] if no deps
            deps = !deps.length && callback.length ? ['require', 'exports', 'module'] : deps;
            for (i = 0; i < deps.length; i += 1) {
                map = makeMap(deps[i], relName);
                depName = map.f;

                //Fast path CommonJS standard dependencies.
                if (depName === "require") {
                    args[i] = handlers.require(name);
                } else if (depName === "exports") {
                    //CommonJS module spec 1.1
                    args[i] = handlers.exports(name);
                    usingExports = true;
                } else if (depName === "module") {
                    //CommonJS module spec 1.1
                    cjsModule = args[i] = handlers.module(name);
                } else if (hasProp(defined, depName) ||
                           hasProp(waiting, depName) ||
                           hasProp(defining, depName)) {
                    args[i] = callDep(depName);
                } else if (map.p) {
                    map.p.load(map.n, makeRequire(relName, true), makeLoad(depName), {});
                    args[i] = defined[depName];
                } else {
                    throw new Error(name + ' missing ' + depName);
                }
            }

            ret = callback ? callback.apply(defined[name], args) : undefined;

            if (name) {
                //If setting exports via "module" is in play,
                //favor that over return value and exports. After that,
                //favor a non-undefined return value over exports use.
                if (cjsModule && cjsModule.exports !== undef &&
                        cjsModule.exports !== defined[name]) {
                    defined[name] = cjsModule.exports;
                } else if (ret !== undef || !usingExports) {
                    //Use the return value from the function.
                    defined[name] = ret;
                }
            }
        } else if (name) {
            //May just be an object definition for the module. Only
            //worry about defining if have a module name.
            defined[name] = callback;
        }
    };

    requirejs = require = req = function (deps, callback, relName, forceSync, alt) {
        if (typeof deps === "string") {
            if (handlers[deps]) {
                //callback in this case is really relName
                return handlers[deps](callback);
            }
            //Just return the module wanted. In this scenario, the
            //deps arg is the module name, and second arg (if passed)
            //is just the relName.
            //Normalize module name, if it contains . or ..
            return callDep(makeMap(deps, callback).f);
        } else if (!deps.splice) {
            //deps is a config object, not an array.
            config = deps;
            if (config.deps) {
                req(config.deps, config.callback);
            }
            if (!callback) {
                return;
            }

            if (callback.splice) {
                //callback is an array, which means it is a dependency list.
                //Adjust args if there are dependencies
                deps = callback;
                callback = relName;
                relName = null;
            } else {
                deps = undef;
            }
        }

        //Support require(['a'])
        callback = callback || function () {};

        //If relName is a function, it is an errback handler,
        //so remove it.
        if (typeof relName === 'function') {
            relName = forceSync;
            forceSync = alt;
        }

        //Simulate async callback;
        if (forceSync) {
            main(undef, deps, callback, relName);
        } else {
            //Using a non-zero value because of concern for what old browsers
            //do, and latest browsers "upgrade" to 4 if lower value is used:
            //http://www.whatwg.org/specs/web-apps/current-work/multipage/timers.html#dom-windowtimers-settimeout:
            //If want a value immediately, use require('id') instead -- something
            //that works in almond on the global level, but not guaranteed and
            //unlikely to work in other AMD implementations.
            setTimeout(function () {
                main(undef, deps, callback, relName);
            }, 4);
        }

        return req;
    };

    /**
     * Just drops the config on the floor, but returns req in case
     * the config return value is used.
     */
    req.config = function (cfg) {
        return req(cfg);
    };

    /**
     * Expose module registry for debugging and tooling
     */
    requirejs._defined = defined;

    define = function (name, deps, callback) {

        //This module may not have dependencies
        if (!deps.splice) {
            //deps is not an array, so probably means
            //an object literal or factory function for
            //the value. Adjust args.
            callback = deps;
            deps = [];
        }

        if (!hasProp(defined, name) && !hasProp(waiting, name)) {
            waiting[name] = [name, deps, callback];
        }
    };

    define.amd = {
        jQuery: true
    };
}());

define("htmlbars-util",
  ["./htmlbars-util/safe-string","./htmlbars-util/handlebars/utils","./htmlbars-util/namespaces","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __exports__) {
    "use strict";
    var SafeString = __dependency1__["default"];
    var escapeExpression = __dependency2__.escapeExpression;
    var getAttrNamespace = __dependency3__.getAttrNamespace;

    __exports__.SafeString = SafeString;
    __exports__.escapeExpression = escapeExpression;
    __exports__.getAttrNamespace = getAttrNamespace;
  });
define("htmlbars-util/array-utils",
  ["exports"],
  function(__exports__) {
    "use strict";
    function forEach(array, callback, binding) {
      var i, l;
      if (binding === undefined) {
        for (i = 0, l = array.length; i < l; i++) {
          callback(array[i], i, array);
        }
      } else {
        for (i = 0, l = array.length; i < l; i++) {
          callback.call(binding, array[i], i, array);
        }
      }
    }

    __exports__.forEach = forEach;function map(array, callback) {
      var output = [];
      var i, l;

      for (i = 0, l = array.length; i < l; i++) {
        output.push(callback(array[i], i, array));
      }

      return output;
    }

    __exports__.map = map;var getIdx;
    if (Array.prototype.indexOf) {
      getIdx = function(array, obj, from){
        return array.indexOf(obj, from);
      };
    } else {
      getIdx = function(array, obj, from) {
        if (from === undefined || from === null) {
          from = 0;
        } else if (from < 0) {
          from = Math.max(0, array.length + from);
        }
        for (var i = from, l= array.length; i < l; i++) {
          if (array[i] === obj) {
            return i;
          }
        }
        return -1;
      };
    }

    var indexOfArray = getIdx;
    __exports__.indexOfArray = indexOfArray;
  });
define("htmlbars-util/handlebars/safe-string",
  ["exports"],
  function(__exports__) {
    "use strict";
    // Build out our basic SafeString type
    function SafeString(string) {
      this.string = string;
    }

    SafeString.prototype.toString = SafeString.prototype.toHTML = function() {
      return "" + this.string;
    };

    __exports__["default"] = SafeString;
  });
define("htmlbars-util/handlebars/utils",
  ["./safe-string","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    /*jshint -W004 */
    var SafeString = __dependency1__["default"];

    var escape = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#x27;",
      "`": "&#x60;"
    };

    var badChars = /[&<>"'`]/g;
    var possible = /[&<>"'`]/;

    function escapeChar(chr) {
      return escape[chr];
    }

    function extend(obj /* , ...source */) {
      for (var i = 1; i < arguments.length; i++) {
        for (var key in arguments[i]) {
          if (Object.prototype.hasOwnProperty.call(arguments[i], key)) {
            obj[key] = arguments[i][key];
          }
        }
      }

      return obj;
    }

    __exports__.extend = extend;var toString = Object.prototype.toString;
    __exports__.toString = toString;
    // Sourced from lodash
    // https://github.com/bestiejs/lodash/blob/master/LICENSE.txt
    var isFunction = function(value) {
      return typeof value === 'function';
    };
    // fallback for older versions of Chrome and Safari
    /* istanbul ignore next */
    if (isFunction(/x/)) {
      isFunction = function(value) {
        return typeof value === 'function' && toString.call(value) === '[object Function]';
      };
    }
    var isFunction;
    __exports__.isFunction = isFunction;
    /* istanbul ignore next */
    var isArray = Array.isArray || function(value) {
      return (value && typeof value === 'object') ? toString.call(value) === '[object Array]' : false;
    };
    __exports__.isArray = isArray;

    function escapeExpression(string) {
      // don't escape SafeStrings, since they're already safe
      if (string && string.toHTML) {
        return string.toHTML();
      } else if (string == null) {
        return "";
      } else if (!string) {
        return string + '';
      }

      // Force a string conversion as this will be done by the append regardless and
      // the regex test will do this transparently behind the scenes, causing issues if
      // an object's to string has escaped characters in it.
      string = "" + string;

      if(!possible.test(string)) { return string; }
      return string.replace(badChars, escapeChar);
    }

    __exports__.escapeExpression = escapeExpression;function isEmpty(value) {
      if (!value && value !== 0) {
        return true;
      } else if (isArray(value) && value.length === 0) {
        return true;
      } else {
        return false;
      }
    }

    __exports__.isEmpty = isEmpty;function appendContextPath(contextPath, id) {
      return (contextPath ? contextPath + '.' : '') + id;
    }

    __exports__.appendContextPath = appendContextPath;
  });
define("htmlbars-util/namespaces",
  ["exports"],
  function(__exports__) {
    "use strict";
    // ref http://dev.w3.org/html5/spec-LC/namespaces.html
    var defaultNamespaces = {
      html: 'http://www.w3.org/1999/xhtml',
      mathml: 'http://www.w3.org/1998/Math/MathML',
      svg: 'http://www.w3.org/2000/svg',
      xlink: 'http://www.w3.org/1999/xlink',
      xml: 'http://www.w3.org/XML/1998/namespace'
    };

    function getAttrNamespace(attrName) {
      var namespace;

      var colonIndex = attrName.indexOf(':');
      if (colonIndex !== -1) {
        var prefix = attrName.slice(0, colonIndex);
        namespace = defaultNamespaces[prefix];
      }

      return namespace || null;
    }

    __exports__.getAttrNamespace = getAttrNamespace;
  });
define("htmlbars-util/object-utils",
  ["exports"],
  function(__exports__) {
    "use strict";
    function merge(options, defaults) {
      for (var prop in defaults) {
        if (options.hasOwnProperty(prop)) { continue; }
        options[prop] = defaults[prop];
      }
      return options;
    }

    __exports__.merge = merge;
  });
define("htmlbars-util/quoting",
  ["exports"],
  function(__exports__) {
    "use strict";
    function escapeString(str) {
      str = str.replace(/\\/g, "\\\\");
      str = str.replace(/"/g, '\\"');
      str = str.replace(/\n/g, "\\n");
      return str;
    }

    __exports__.escapeString = escapeString;

    function string(str) {
      return '"' + escapeString(str) + '"';
    }

    __exports__.string = string;

    function array(a) {
      return "[" + a + "]";
    }

    __exports__.array = array;

    function hash(pairs) {
      return "{" + pairs.join(", ") + "}";
    }

    __exports__.hash = hash;function repeat(chars, times) {
      var str = "";
      while (times--) {
        str += chars;
      }
      return str;
    }

    __exports__.repeat = repeat;
  });
define("htmlbars-util/safe-string",
  ["./handlebars/safe-string","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var SafeString = __dependency1__["default"];

    __exports__["default"] = SafeString;
  });
define("morph",
  ["./morph/morph","./morph/attr-morph","./morph/dom-helper","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __exports__) {
    "use strict";
    var Morph = __dependency1__["default"];
    var AttrMorph = __dependency2__["default"];
    var DOMHelper = __dependency3__["default"];

    __exports__.Morph = Morph;
    __exports__.AttrMorph = AttrMorph;
    __exports__.DOMHelper = DOMHelper;
  });
define("morph/attr-morph",
  ["./attr-morph/sanitize-attribute-value","./dom-helper/prop","./dom-helper/build-html-dom","../htmlbars-util","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __exports__) {
    "use strict";
    var sanitizeAttributeValue = __dependency1__.sanitizeAttributeValue;
    var isAttrRemovalValue = __dependency2__.isAttrRemovalValue;
    var normalizeProperty = __dependency2__.normalizeProperty;
    var svgNamespace = __dependency3__.svgNamespace;
    var getAttrNamespace = __dependency4__.getAttrNamespace;

    function updateProperty(value) {
      this.domHelper.setPropertyStrict(this.element, this.attrName, value);
    }

    function updateAttribute(value) {
      if (isAttrRemovalValue(value)) {
        this.domHelper.removeAttribute(this.element, this.attrName);
      } else {
        this.domHelper.setAttribute(this.element, this.attrName, value);
      }
    }

    function updateAttributeNS(value) {
      if (isAttrRemovalValue(value)) {
        this.domHelper.removeAttribute(this.element, this.attrName);
      } else {
        this.domHelper.setAttributeNS(this.element, this.namespace, this.attrName, value);
      }
    }

    function AttrMorph(element, attrName, domHelper, namespace) {
      this.element = element;
      this.domHelper = domHelper;
      this.namespace = namespace !== undefined ? namespace : getAttrNamespace(attrName);
      this.escaped = true;

      var normalizedAttrName = normalizeProperty(this.element, attrName);
      if (this.namespace) {
        this._update = updateAttributeNS;
        this.attrName = attrName;
      } else {
        if (element.namespaceURI === svgNamespace || attrName === 'style' || !normalizedAttrName) {
          this.attrName = attrName;
          this._update = updateAttribute;
        } else {
          this.attrName = normalizedAttrName;
          this._update = updateProperty;
        }
      }
    }

    AttrMorph.prototype.setContent = function (value) {
      if (this.escaped) {
        var sanitized = sanitizeAttributeValue(this.element, this.attrName, value);
        this._update(sanitized, this.namespace);
      } else {
        this._update(value, this.namespace);
      }
    };

    __exports__["default"] = AttrMorph;
  });
define("morph/attr-morph/sanitize-attribute-value",
  ["exports"],
  function(__exports__) {
    "use strict";
    /* jshint scripturl:true */

    var parsingNode;
    var badProtocols = {
      'javascript:': true,
      'vbscript:': true
    };

    var badTags = {
      'A': true,
      'BODY': true,
      'LINK': true,
      'IMG': true,
      'IFRAME': true
    };

    var badAttributes = {
      'href': true,
      'src': true,
      'background': true
    };
    __exports__.badAttributes = badAttributes;
    function sanitizeAttributeValue(element, attribute, value) {
      var tagName;

      if (!parsingNode) {
        parsingNode = document.createElement('a');
      }

      if (!element) {
        tagName = null;
      } else {
        tagName = element.tagName;
      }

      if (value && value.toHTML) {
        return value.toHTML();
      }

      if ((tagName === null || badTags[tagName]) && badAttributes[attribute]) {
        parsingNode.href = value;

        if (badProtocols[parsingNode.protocol] === true) {
          return 'unsafe:' + value;
        }
      }

      return value;
    }

    __exports__.sanitizeAttributeValue = sanitizeAttributeValue;
  });
define("morph/dom-helper",
  ["../morph/morph","../morph/attr-morph","./dom-helper/build-html-dom","./dom-helper/classes","./dom-helper/prop","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __dependency5__, __exports__) {
    "use strict";
    var Morph = __dependency1__["default"];
    var AttrMorph = __dependency2__["default"];
    var buildHTMLDOM = __dependency3__.buildHTMLDOM;
    var svgNamespace = __dependency3__.svgNamespace;
    var svgHTMLIntegrationPoints = __dependency3__.svgHTMLIntegrationPoints;
    var addClasses = __dependency4__.addClasses;
    var removeClasses = __dependency4__.removeClasses;
    var normalizeProperty = __dependency5__.normalizeProperty;
    var isAttrRemovalValue = __dependency5__.isAttrRemovalValue;

    var doc = typeof document === 'undefined' ? false : document;

    var deletesBlankTextNodes = doc && (function(document){
      var element = document.createElement('div');
      element.appendChild( document.createTextNode('') );
      var clonedElement = element.cloneNode(true);
      return clonedElement.childNodes.length === 0;
    })(doc);

    var ignoresCheckedAttribute = doc && (function(document){
      var element = document.createElement('input');
      element.setAttribute('checked', 'checked');
      var clonedElement = element.cloneNode(false);
      return !clonedElement.checked;
    })(doc);

    var canRemoveSvgViewBoxAttribute = doc && (doc.createElementNS ? (function(document){
      var element = document.createElementNS(svgNamespace, 'svg');
      element.setAttribute('viewBox', '0 0 100 100');
      element.removeAttribute('viewBox');
      return !element.getAttribute('viewBox');
    })(doc) : true);

    // This is not the namespace of the element, but of
    // the elements inside that elements.
    function interiorNamespace(element){
      if (
        element &&
        element.namespaceURI === svgNamespace &&
        !svgHTMLIntegrationPoints[element.tagName]
      ) {
        return svgNamespace;
      } else {
        return null;
      }
    }

    // The HTML spec allows for "omitted start tags". These tags are optional
    // when their intended child is the first thing in the parent tag. For
    // example, this is a tbody start tag:
    //
    // <table>
    //   <tbody>
    //     <tr>
    //
    // The tbody may be omitted, and the browser will accept and render:
    //
    // <table>
    //   <tr>
    //
    // However, the omitted start tag will still be added to the DOM. Here
    // we test the string and context to see if the browser is about to
    // perform this cleanup.
    //
    // http://www.whatwg.org/specs/web-apps/current-work/multipage/syntax.html#optional-tags
    // describes which tags are omittable. The spec for tbody and colgroup
    // explains this behavior:
    //
    // http://www.whatwg.org/specs/web-apps/current-work/multipage/tables.html#the-tbody-element
    // http://www.whatwg.org/specs/web-apps/current-work/multipage/tables.html#the-colgroup-element
    //

    var omittedStartTagChildTest = /<([\w:]+)/;
    function detectOmittedStartTag(string, contextualElement){
      // Omitted start tags are only inside table tags.
      if (contextualElement.tagName === 'TABLE') {
        var omittedStartTagChildMatch = omittedStartTagChildTest.exec(string);
        if (omittedStartTagChildMatch) {
          var omittedStartTagChild = omittedStartTagChildMatch[1];
          // It is already asserted that the contextual element is a table
          // and not the proper start tag. Just see if a tag was omitted.
          return omittedStartTagChild === 'tr' ||
                 omittedStartTagChild === 'col';
        }
      }
    }

    function buildSVGDOM(html, dom){
      var div = dom.document.createElement('div');
      div.innerHTML = '<svg>'+html+'</svg>';
      return div.firstChild.childNodes;
    }

    /*
     * A class wrapping DOM functions to address environment compatibility,
     * namespaces, contextual elements for morph un-escaped content
     * insertion.
     *
     * When entering a template, a DOMHelper should be passed:
     *
     *   template(context, { hooks: hooks, dom: new DOMHelper() });
     *
     * TODO: support foreignObject as a passed contextual element. It has
     * a namespace (svg) that does not match its internal namespace
     * (xhtml).
     *
     * @class DOMHelper
     * @constructor
     * @param {HTMLDocument} _document The document DOM methods are proxied to
     */
    function DOMHelper(_document){
      this.document = _document || document;
      if (!this.document) {
        throw new Error("A document object must be passed to the DOMHelper, or available on the global scope");
      }
      this.namespace = null;
    }

    var prototype = DOMHelper.prototype;
    prototype.constructor = DOMHelper;

    prototype.getElementById = function(id, rootNode) {
      rootNode = rootNode || this.document;
      return rootNode.getElementById(id);
    };

    prototype.insertBefore = function(element, childElement, referenceChild) {
      return element.insertBefore(childElement, referenceChild);
    };

    prototype.appendChild = function(element, childElement) {
      return element.appendChild(childElement);
    };

    prototype.childAt = function(element, indices) {
      var child = element;

      for (var i = 0; i < indices.length; i++) {
        child = child.childNodes.item(indices[i]);
      }

      return child;
    };

    // Note to a Fellow Implementor:
    // Ahh, accessing a child node at an index. Seems like it should be so simple,
    // doesn't it? Unfortunately, this particular method has caused us a surprising
    // amount of pain. As you'll note below, this method has been modified to walk
    // the linked list of child nodes rather than access the child by index
    // directly, even though there are two (2) APIs in the DOM that do this for us.
    // If you're thinking to yourself, "What an oversight! What an opportunity to
    // optimize this code!" then to you I say: stop! For I have a tale to tell.
    //
    // First, this code must be compatible with simple-dom for rendering on the
    // server where there is no real DOM. Previously, we accessed a child node
    // directly via `element.childNodes[index]`. While we *could* in theory do a
    // full-fidelity simulation of a live `childNodes` array, this is slow,
    // complicated and error-prone.
    //
    // "No problem," we thought, "we'll just use the similar
    // `childNodes.item(index)` API." Then, we could just implement our own `item`
    // method in simple-dom and walk the child node linked list there, allowing
    // us to retain the performance advantages of the (surely optimized) `item()`
    // API in the browser.
    //
    // Unfortunately, an enterprising soul named Samy Alzahrani discovered that in
    // IE8, accessing an item out-of-bounds via `item()` causes an exception where
    // other browsers return null. This necessitated a... check of
    // `childNodes.length`, bringing us back around to having to support a
    // full-fidelity `childNodes` array!
    //
    // Worst of all, Kris Selden investigated how browsers are actualy implemented
    // and discovered that they're all linked lists under the hood anyway. Accessing
    // `childNodes` requires them to allocate a new live collection backed by that
    // linked list, which is itself a rather expensive operation. Our assumed
    // optimization had backfired! That is the danger of magical thinking about
    // the performance of native implementations.
    //
    // And this, my friends, is why the following implementation just walks the
    // linked list, as surprised as that may make you. Please ensure you understand
    // the above before changing this and submitting a PR.
    //
    // Tom Dale, January 18th, 2015, Portland OR
    prototype.childAtIndex = function(element, index) {
      var node = element.firstChild;

      for (var idx = 0; node && idx < index; idx++) {
        node = node.nextSibling;
      }

      return node;
    };

    prototype.appendText = function(element, text) {
      return element.appendChild(this.document.createTextNode(text));
    };

    prototype.setAttribute = function(element, name, value) {
      element.setAttribute(name, String(value));
    };

    prototype.setAttributeNS = function(element, namespace, name, value) {
      element.setAttributeNS(namespace, name, String(value));
    };

    if (canRemoveSvgViewBoxAttribute){
      prototype.removeAttribute = function(element, name) {
        element.removeAttribute(name);
      };
    } else {
      prototype.removeAttribute = function(element, name) {
        if (element.tagName === 'svg' && name === 'viewBox') {
          element.setAttribute(name, null);
        } else {
          element.removeAttribute(name);
        }
      };
    }

    prototype.setPropertyStrict = function(element, name, value) {
      element[name] = value;
    };

    prototype.setProperty = function(element, name, value, namespace) {
      var lowercaseName = name.toLowerCase();
      if (element.namespaceURI === svgNamespace || lowercaseName === 'style') {
        if (isAttrRemovalValue(value)) {
          element.removeAttribute(name);
        } else {
          if (namespace) {
            element.setAttributeNS(namespace, name, value);
          } else {
            element.setAttribute(name, value);
          }
        }
      } else {
        var normalized = normalizeProperty(element, name);
        if (normalized) {
          element[normalized] = value;
        } else {
          if (isAttrRemovalValue(value)) {
            element.removeAttribute(name);
          } else {
            if (namespace && element.setAttributeNS) {
              element.setAttributeNS(namespace, name, value);
            } else {
              element.setAttribute(name, value);
            }
          }
        }
      }
    };

    if (doc && doc.createElementNS) {
      // Only opt into namespace detection if a contextualElement
      // is passed.
      prototype.createElement = function(tagName, contextualElement) {
        var namespace = this.namespace;
        if (contextualElement) {
          if (tagName === 'svg') {
            namespace = svgNamespace;
          } else {
            namespace = interiorNamespace(contextualElement);
          }
        }
        if (namespace) {
          return this.document.createElementNS(namespace, tagName);
        } else {
          return this.document.createElement(tagName);
        }
      };
      prototype.setAttributeNS = function(element, namespace, name, value) {
        element.setAttributeNS(namespace, name, String(value));
      };
    } else {
      prototype.createElement = function(tagName) {
        return this.document.createElement(tagName);
      };
      prototype.setAttributeNS = function(element, namespace, name, value) {
        element.setAttribute(name, String(value));
      };
    }

    prototype.addClasses = addClasses;
    prototype.removeClasses = removeClasses;

    prototype.setNamespace = function(ns) {
      this.namespace = ns;
    };

    prototype.detectNamespace = function(element) {
      this.namespace = interiorNamespace(element);
    };

    prototype.createDocumentFragment = function(){
      return this.document.createDocumentFragment();
    };

    prototype.createTextNode = function(text){
      return this.document.createTextNode(text);
    };

    prototype.createComment = function(text){
      return this.document.createComment(text);
    };

    prototype.repairClonedNode = function(element, blankChildTextNodes, isChecked){
      if (deletesBlankTextNodes && blankChildTextNodes.length > 0) {
        for (var i=0, len=blankChildTextNodes.length;i<len;i++){
          var textNode = this.document.createTextNode(''),
              offset = blankChildTextNodes[i],
              before = this.childAtIndex(element, offset);
          if (before) {
            element.insertBefore(textNode, before);
          } else {
            element.appendChild(textNode);
          }
        }
      }
      if (ignoresCheckedAttribute && isChecked) {
        element.setAttribute('checked', 'checked');
      }
    };

    prototype.cloneNode = function(element, deep){
      var clone = element.cloneNode(!!deep);
      return clone;
    };

    prototype.createAttrMorph = function(element, attrName, namespace){
      return new AttrMorph(element, attrName, this, namespace);
    };

    prototype.createUnsafeAttrMorph = function(element, attrName, namespace){
      var morph = this.createAttrMorph(element, attrName, namespace);
      morph.escaped = false;
      return morph;
    };

    prototype.createMorph = function(parent, start, end, contextualElement){
      if (!contextualElement && parent.nodeType === 1) {
        contextualElement = parent;
      }
      return new Morph(parent, start, end, this, contextualElement);
    };

    prototype.createUnsafeMorph = function(parent, start, end, contextualElement){
      var morph = this.createMorph(parent, start, end, contextualElement);
      morph.escaped = false;
      return morph;
    };

    // This helper is just to keep the templates good looking,
    // passing integers instead of element references.
    prototype.createMorphAt = function(parent, startIndex, endIndex, contextualElement){
      var start = startIndex === -1 ? null : this.childAtIndex(parent, startIndex),
          end = endIndex === -1 ? null : this.childAtIndex(parent, endIndex);
      return this.createMorph(parent, start, end, contextualElement);
    };

    prototype.createUnsafeMorphAt = function(parent, startIndex, endIndex, contextualElement) {
      var morph = this.createMorphAt(parent, startIndex, endIndex, contextualElement);
      morph.escaped = false;
      return morph;
    };

    prototype.insertMorphBefore = function(element, referenceChild, contextualElement) {
      var start = this.document.createTextNode('');
      var end = this.document.createTextNode('');
      element.insertBefore(start, referenceChild);
      element.insertBefore(end, referenceChild);
      return this.createMorph(element, start, end, contextualElement);
    };

    prototype.appendMorph = function(element, contextualElement) {
      var start = this.document.createTextNode('');
      var end = this.document.createTextNode('');
      element.appendChild(start);
      element.appendChild(end);
      return this.createMorph(element, start, end, contextualElement);
    };

    prototype.parseHTML = function(html, contextualElement) {
      if (interiorNamespace(contextualElement) === svgNamespace) {
        return buildSVGDOM(html, this);
      } else {
        var nodes = buildHTMLDOM(html, contextualElement, this);
        if (detectOmittedStartTag(html, contextualElement)) {
          var node = nodes[0];
          while (node && node.nodeType !== 1) {
            node = node.nextSibling;
          }
          return node.childNodes;
        } else {
          return nodes;
        }
      }
    };

    __exports__["default"] = DOMHelper;
  });
define("morph/dom-helper/build-html-dom",
  ["exports"],
  function(__exports__) {
    "use strict";
    /* global XMLSerializer:false */
    var svgHTMLIntegrationPoints = {foreignObject: 1, desc: 1, title: 1};
    __exports__.svgHTMLIntegrationPoints = svgHTMLIntegrationPoints;var svgNamespace = 'http://www.w3.org/2000/svg';
    __exports__.svgNamespace = svgNamespace;
    var doc = typeof document === 'undefined' ? false : document;

    // Safari does not like using innerHTML on SVG HTML integration
    // points (desc/title/foreignObject).
    var needsIntegrationPointFix = doc && (function(document) {
      if (document.createElementNS === undefined) {
        return;
      }
      // In FF title will not accept innerHTML.
      var testEl = document.createElementNS(svgNamespace, 'title');
      testEl.innerHTML = "<div></div>";
      return testEl.childNodes.length === 0 || testEl.childNodes[0].nodeType !== 1;
    })(doc);

    // Internet Explorer prior to 9 does not allow setting innerHTML if the first element
    // is a "zero-scope" element. This problem can be worked around by making
    // the first node an invisible text node. We, like Modernizr, use &shy;
    var needsShy = doc && (function(document) {
      var testEl = document.createElement('div');
      testEl.innerHTML = "<div></div>";
      testEl.firstChild.innerHTML = "<script><\/script>";
      return testEl.firstChild.innerHTML === '';
    })(doc);

    // IE 8 (and likely earlier) likes to move whitespace preceeding
    // a script tag to appear after it. This means that we can
    // accidentally remove whitespace when updating a morph.
    var movesWhitespace = doc && (function(document) {
      var testEl = document.createElement('div');
      testEl.innerHTML = "Test: <script type='text/x-placeholder'><\/script>Value";
      return testEl.childNodes[0].nodeValue === 'Test:' &&
              testEl.childNodes[2].nodeValue === ' Value';
    })(doc);

    // IE8 create a selected attribute where they should only
    // create a property
    var createsSelectedAttribute = doc && (function(document) {
      var testEl = document.createElement('div');
      testEl.innerHTML = "<select><option></option></select>";
      return testEl.childNodes[0].childNodes[0].getAttribute('selected') === 'selected';
    })(doc);

    var detectAutoSelectedOption;
    if (createsSelectedAttribute) {
      detectAutoSelectedOption = (function(){
        var detectAutoSelectedOptionRegex = /<option[^>]*selected/;
        return function detectAutoSelectedOption(select, option, html) { //jshint ignore:line
          return select.selectedIndex === 0 &&
                 !detectAutoSelectedOptionRegex.test(html);
        };
      })();
    } else {
      detectAutoSelectedOption = function detectAutoSelectedOption(select, option, html) { //jshint ignore:line
        var selectedAttribute = option.getAttribute('selected');
        return select.selectedIndex === 0 && (
                 selectedAttribute === null ||
                 ( selectedAttribute !== '' && selectedAttribute.toLowerCase() !== 'selected' )
                );
      };
    }

    var tagNamesRequiringInnerHTMLFix = doc && (function(document) {
      var tagNamesRequiringInnerHTMLFix;
      // IE 9 and earlier don't allow us to set innerHTML on col, colgroup, frameset,
      // html, style, table, tbody, tfoot, thead, title, tr. Detect this and add
      // them to an initial list of corrected tags.
      //
      // Here we are only dealing with the ones which can have child nodes.
      //
      var tableNeedsInnerHTMLFix;
      var tableInnerHTMLTestElement = document.createElement('table');
      try {
        tableInnerHTMLTestElement.innerHTML = '<tbody></tbody>';
      } catch (e) {
      } finally {
        tableNeedsInnerHTMLFix = (tableInnerHTMLTestElement.childNodes.length === 0);
      }
      if (tableNeedsInnerHTMLFix) {
        tagNamesRequiringInnerHTMLFix = {
          colgroup: ['table'],
          table: [],
          tbody: ['table'],
          tfoot: ['table'],
          thead: ['table'],
          tr: ['table', 'tbody']
        };
      }

      // IE 8 doesn't allow setting innerHTML on a select tag. Detect this and
      // add it to the list of corrected tags.
      //
      var selectInnerHTMLTestElement = document.createElement('select');
      selectInnerHTMLTestElement.innerHTML = '<option></option>';
      if (!selectInnerHTMLTestElement.childNodes[0]) {
        tagNamesRequiringInnerHTMLFix = tagNamesRequiringInnerHTMLFix || {};
        tagNamesRequiringInnerHTMLFix.select = [];
      }
      return tagNamesRequiringInnerHTMLFix;
    })(doc);

    function scriptSafeInnerHTML(element, html) {
      // without a leading text node, IE will drop a leading script tag.
      html = '&shy;'+html;

      element.innerHTML = html;

      var nodes = element.childNodes;

      // Look for &shy; to remove it.
      var shyElement = nodes[0];
      while (shyElement.nodeType === 1 && !shyElement.nodeName) {
        shyElement = shyElement.firstChild;
      }
      // At this point it's the actual unicode character.
      if (shyElement.nodeType === 3 && shyElement.nodeValue.charAt(0) === "\u00AD") {
        var newValue = shyElement.nodeValue.slice(1);
        if (newValue.length) {
          shyElement.nodeValue = shyElement.nodeValue.slice(1);
        } else {
          shyElement.parentNode.removeChild(shyElement);
        }
      }

      return nodes;
    }

    function buildDOMWithFix(html, contextualElement){
      var tagName = contextualElement.tagName;

      // Firefox versions < 11 do not have support for element.outerHTML.
      var outerHTML = contextualElement.outerHTML || new XMLSerializer().serializeToString(contextualElement);
      if (!outerHTML) {
        throw "Can't set innerHTML on "+tagName+" in this browser";
      }

      var wrappingTags = tagNamesRequiringInnerHTMLFix[tagName.toLowerCase()];
      var startTag = outerHTML.match(new RegExp("<"+tagName+"([^>]*)>", 'i'))[0];
      var endTag = '</'+tagName+'>';

      var wrappedHTML = [startTag, html, endTag];

      var i = wrappingTags.length;
      var wrappedDepth = 1 + i;
      while(i--) {
        wrappedHTML.unshift('<'+wrappingTags[i]+'>');
        wrappedHTML.push('</'+wrappingTags[i]+'>');
      }

      var wrapper = document.createElement('div');
      scriptSafeInnerHTML(wrapper, wrappedHTML.join(''));
      var element = wrapper;
      while (wrappedDepth--) {
        element = element.firstChild;
        while (element && element.nodeType !== 1) {
          element = element.nextSibling;
        }
      }
      while (element && element.tagName !== tagName) {
        element = element.nextSibling;
      }
      return element ? element.childNodes : [];
    }

    var buildDOM;
    if (needsShy) {
      buildDOM = function buildDOM(html, contextualElement, dom){
        contextualElement = dom.cloneNode(contextualElement, false);
        scriptSafeInnerHTML(contextualElement, html);
        return contextualElement.childNodes;
      };
    } else {
      buildDOM = function buildDOM(html, contextualElement, dom){
        contextualElement = dom.cloneNode(contextualElement, false);
        contextualElement.innerHTML = html;
        return contextualElement.childNodes;
      };
    }

    var buildIESafeDOM;
    if (tagNamesRequiringInnerHTMLFix || movesWhitespace) {
      buildIESafeDOM = function buildIESafeDOM(html, contextualElement, dom) {
        // Make a list of the leading text on script nodes. Include
        // script tags without any whitespace for easier processing later.
        var spacesBefore = [];
        var spacesAfter = [];
        if (typeof html === 'string') {
          html = html.replace(/(\s*)(<script)/g, function(match, spaces, tag) {
            spacesBefore.push(spaces);
            return tag;
          });

          html = html.replace(/(<\/script>)(\s*)/g, function(match, tag, spaces) {
            spacesAfter.push(spaces);
            return tag;
          });
        }

        // Fetch nodes
        var nodes;
        if (tagNamesRequiringInnerHTMLFix[contextualElement.tagName.toLowerCase()]) {
          // buildDOMWithFix uses string wrappers for problematic innerHTML.
          nodes = buildDOMWithFix(html, contextualElement);
        } else {
          nodes = buildDOM(html, contextualElement, dom);
        }

        // Build a list of script tags, the nodes themselves will be
        // mutated as we add test nodes.
        var i, j, node, nodeScriptNodes;
        var scriptNodes = [];
        for (i=0;i<nodes.length;i++) {
          node=nodes[i];
          if (node.nodeType !== 1) {
            continue;
          }
          if (node.tagName === 'SCRIPT') {
            scriptNodes.push(node);
          } else {
            nodeScriptNodes = node.getElementsByTagName('script');
            for (j=0;j<nodeScriptNodes.length;j++) {
              scriptNodes.push(nodeScriptNodes[j]);
            }
          }
        }

        // Walk the script tags and put back their leading text nodes.
        var scriptNode, textNode, spaceBefore, spaceAfter;
        for (i=0;i<scriptNodes.length;i++) {
          scriptNode = scriptNodes[i];
          spaceBefore = spacesBefore[i];
          if (spaceBefore && spaceBefore.length > 0) {
            textNode = dom.document.createTextNode(spaceBefore);
            scriptNode.parentNode.insertBefore(textNode, scriptNode);
          }

          spaceAfter = spacesAfter[i];
          if (spaceAfter && spaceAfter.length > 0) {
            textNode = dom.document.createTextNode(spaceAfter);
            scriptNode.parentNode.insertBefore(textNode, scriptNode.nextSibling);
          }
        }

        return nodes;
      };
    } else {
      buildIESafeDOM = buildDOM;
    }

    // When parsing innerHTML, the browser may set up DOM with some things
    // not desired. For example, with a select element context and option
    // innerHTML the first option will be marked selected.
    //
    // This method cleans up some of that, resetting those values back to
    // their defaults.
    //
    function buildSafeDOM(html, contextualElement, dom) {
      var childNodes = buildIESafeDOM(html, contextualElement, dom);

      if (contextualElement.tagName === 'SELECT') {
        // Walk child nodes
        for (var i = 0; childNodes[i]; i++) {
          // Find and process the first option child node
          if (childNodes[i].tagName === 'OPTION') {
            if (detectAutoSelectedOption(childNodes[i].parentNode, childNodes[i], html)) {
              // If the first node is selected but does not have an attribute,
              // presume it is not really selected.
              childNodes[i].parentNode.selectedIndex = -1;
            }
            break;
          }
        }
      }

      return childNodes;
    }

    var buildHTMLDOM;
    if (needsIntegrationPointFix) {
      buildHTMLDOM = function buildHTMLDOM(html, contextualElement, dom){
        if (svgHTMLIntegrationPoints[contextualElement.tagName]) {
          return buildSafeDOM(html, document.createElement('div'), dom);
        } else {
          return buildSafeDOM(html, contextualElement, dom);
        }
      };
    } else {
      buildHTMLDOM = buildSafeDOM;
    }

    __exports__.buildHTMLDOM = buildHTMLDOM;
  });
define("morph/dom-helper/classes",
  ["exports"],
  function(__exports__) {
    "use strict";
    var doc = typeof document === 'undefined' ? false : document;

    // PhantomJS has a broken classList. See https://github.com/ariya/phantomjs/issues/12782
    var canClassList = doc && (function(){
      var d = document.createElement('div');
      if (!d.classList) {
        return false;
      }
      d.classList.add('boo');
      d.classList.add('boo', 'baz');
      return (d.className === 'boo baz');
    })();

    function buildClassList(element) {
      var classString = (element.getAttribute('class') || '');
      return classString !== '' && classString !== ' ' ? classString.split(' ') : [];
    }

    function intersect(containingArray, valuesArray) {
      var containingIndex = 0;
      var containingLength = containingArray.length;
      var valuesIndex = 0;
      var valuesLength = valuesArray.length;

      var intersection = new Array(valuesLength);

      // TODO: rewrite this loop in an optimal manner
      for (;containingIndex<containingLength;containingIndex++) {
        valuesIndex = 0;
        for (;valuesIndex<valuesLength;valuesIndex++) {
          if (valuesArray[valuesIndex] === containingArray[containingIndex]) {
            intersection[valuesIndex] = containingIndex;
            break;
          }
        }
      }

      return intersection;
    }

    function addClassesViaAttribute(element, classNames) {
      var existingClasses = buildClassList(element);

      var indexes = intersect(existingClasses, classNames);
      var didChange = false;

      for (var i=0, l=classNames.length; i<l; i++) {
        if (indexes[i] === undefined) {
          didChange = true;
          existingClasses.push(classNames[i]);
        }
      }

      if (didChange) {
        element.setAttribute('class', existingClasses.length > 0 ? existingClasses.join(' ') : '');
      }
    }

    function removeClassesViaAttribute(element, classNames) {
      var existingClasses = buildClassList(element);

      var indexes = intersect(classNames, existingClasses);
      var didChange = false;
      var newClasses = [];

      for (var i=0, l=existingClasses.length; i<l; i++) {
        if (indexes[i] === undefined) {
          newClasses.push(existingClasses[i]);
        } else {
          didChange = true;
        }
      }

      if (didChange) {
        element.setAttribute('class', newClasses.length > 0 ? newClasses.join(' ') : '');
      }
    }

    var addClasses, removeClasses;
    if (canClassList) {
      addClasses = function addClasses(element, classNames) {
        if (element.classList) {
          if (classNames.length === 1) {
            element.classList.add(classNames[0]);
          } else if (classNames.length === 2) {
            element.classList.add(classNames[0], classNames[1]);
          } else {
            element.classList.add.apply(element.classList, classNames);
          }
        } else {
          addClassesViaAttribute(element, classNames);
        }
      };
      removeClasses = function removeClasses(element, classNames) {
        if (element.classList) {
          if (classNames.length === 1) {
            element.classList.remove(classNames[0]);
          } else if (classNames.length === 2) {
            element.classList.remove(classNames[0], classNames[1]);
          } else {
            element.classList.remove.apply(element.classList, classNames);
          }
        } else {
          removeClassesViaAttribute(element, classNames);
        }
      };
    } else {
      addClasses = addClassesViaAttribute;
      removeClasses = removeClassesViaAttribute;
    }

    __exports__.addClasses = addClasses;
    __exports__.removeClasses = removeClasses;
  });
define("morph/dom-helper/prop",
  ["exports"],
  function(__exports__) {
    "use strict";
    function isAttrRemovalValue(value) {
      return value === null || value === undefined;
    }

    __exports__.isAttrRemovalValue = isAttrRemovalValue;// TODO should this be an o_create kind of thing?
    var propertyCaches = {};
    __exports__.propertyCaches = propertyCaches;
    function normalizeProperty(element, attrName) {
      var tagName = element.tagName;
      var key;
      var cache = propertyCaches[tagName];
      if (!cache) {
        // TODO should this be an o_create kind of thing?
        cache = {};
        for (key in element) {
          cache[key.toLowerCase()] = key;
        }
        propertyCaches[tagName] = cache;
      }

      // presumes that the attrName has been lowercased.
      return cache[attrName];
    }

    __exports__.normalizeProperty = normalizeProperty;
  });
define("morph/morph",
  ["exports"],
  function(__exports__) {
    "use strict";
    var splice = Array.prototype.splice;

    function ensureStartEnd(start, end) {
      if (start === null || end === null) {
        throw new Error('a fragment parent must have boundary nodes in order to detect insertion');
      }
    }

    function ensureContext(contextualElement) {
      if (!contextualElement || contextualElement.nodeType !== 1) {
        throw new Error('An element node must be provided for a contextualElement, you provided ' +
                        (contextualElement ? 'nodeType ' + contextualElement.nodeType : 'nothing'));
      }
    }

    // TODO: this is an internal API, this should be an assert
    function Morph(parent, start, end, domHelper, contextualElement) {
      if (parent.nodeType === 11) {
        ensureStartEnd(start, end);
        this.element = null;
      } else {
        this.element = parent;
      }
      this._parent = parent;
      this.start = start;
      this.end = end;
      this.domHelper = domHelper;
      ensureContext(contextualElement);
      this.contextualElement = contextualElement;
      this.escaped = true;
      this.reset();
    }

    Morph.prototype.reset = function() {
      this.text = null;
      this.owner = null;
      this.morphs = null;
      this.before = null;
      this.after = null;
    };

    Morph.prototype.parent = function () {
      if (!this.element) {
        var parent = this.start.parentNode;
        if (this._parent !== parent) {
          this._parent = parent;
        }
        if (parent.nodeType === 1) {
          this.element = parent;
        }
      }
      return this._parent;
    };

    Morph.prototype.destroy = function () {
      if (this.owner) {
        this.owner.removeMorph(this);
      } else {
        clear(this.element || this.parent(), this.start, this.end);
      }
    };

    Morph.prototype.removeMorph = function (morph) {
      var morphs = this.morphs;
      for (var i=0, l=morphs.length; i<l; i++) {
        if (morphs[i] === morph) {
          this.replace(i, 1);
          break;
        }
      }
    };

    Morph.prototype.setContent = function (nodeOrString) {
      this._update(this.element || this.parent(), nodeOrString);
    };

    Morph.prototype.updateNode = function (node) {
      var parent = this.element || this.parent();
      if (!node) {
        return this._updateText(parent, '');
      }
      this._updateNode(parent, node);
    };

    Morph.prototype.updateText = function (text) {
      this._updateText(this.element || this.parent(), text);
    };

    Morph.prototype.updateHTML = function (html) {
      var parent = this.element || this.parent();
      if (!html) {
        return this._updateText(parent, '');
      }
      this._updateHTML(parent, html);
    };

    Morph.prototype._update = function (parent, nodeOrString) {
      if (nodeOrString === null || nodeOrString === undefined) {
        this._updateText(parent, '');
      } else if (typeof nodeOrString === 'string') {
        if (this.escaped) {
          this._updateText(parent, nodeOrString);
        } else {
          this._updateHTML(parent, nodeOrString);
        }
      } else if (nodeOrString.nodeType) {
        this._updateNode(parent, nodeOrString);
      } else if (nodeOrString.string) { // duck typed SafeString
        this._updateHTML(parent, nodeOrString.string);
      } else {
        this._updateText(parent, nodeOrString.toString());
      }
    };

    Morph.prototype._updateNode = function (parent, node) {
      if (this.text) {
        if (node.nodeType === 3) {
          this.text.nodeValue = node.nodeValue;
          return;
        } else {
          this.text = null;
        }
      }
      var start = this.start, end = this.end;
      clear(parent, start, end);
      parent.insertBefore(node, end);
      if (this.before !== null) {
        this.before.end = start.nextSibling;
      }
      if (this.after !== null) {
        this.after.start = end.previousSibling;
      }
    };

    Morph.prototype._updateText = function (parent, text) {
      if (this.text) {
        this.text.nodeValue = text;
        return;
      }
      var node = this.domHelper.createTextNode(text);
      this.text = node;
      clear(parent, this.start, this.end);
      parent.insertBefore(node, this.end);
      if (this.before !== null) {
        this.before.end = node;
      }
      if (this.after !== null) {
        this.after.start = node;
      }
    };

    Morph.prototype._updateHTML = function (parent, html) {
      var start = this.start, end = this.end;
      clear(parent, start, end);
      this.text = null;
      var childNodes = this.domHelper.parseHTML(html, this.contextualElement);
      appendChildren(parent, end, childNodes);
      if (this.before !== null) {
        this.before.end = start.nextSibling;
      }
      if (this.after !== null) {
        this.after.start = end.previousSibling;
      }
    };

    Morph.prototype.append = function (node) {
      if (this.morphs === null) {
        this.morphs = [];
      }
      var index = this.morphs.length;
      return this.insert(index, node);
    };

    Morph.prototype.insert = function (index, node) {
      if (this.morphs === null) {
        this.morphs = [];
      }
      var parent = this.element || this.parent();
      var morphs = this.morphs;
      var before = index > 0 ? morphs[index-1] : null;
      var after  = index < morphs.length ? morphs[index] : null;
      var start  = before === null ? this.start : (before.end === null ? parent.lastChild : before.end.previousSibling);
      var end    = after === null ? this.end : (after.start === null ? parent.firstChild : after.start.nextSibling);
      var morph  = new Morph(parent, start, end, this.domHelper, this.contextualElement);

      morph.owner = this;
      morph._update(parent, node);

      if (before !== null) {
        morph.before = before;
        before.end = start.nextSibling;
        before.after = morph;
      }

      if (after !== null) {
        morph.after = after;
        after.before = morph;
        after.start = end.previousSibling;
      }

      this.morphs.splice(index, 0, morph);
      return morph;
    };

    Morph.prototype.replace = function (index, removedLength, addedNodes) {
      if (this.morphs === null) {
        this.morphs = [];
      }
      var parent = this.element || this.parent();
      var morphs = this.morphs;
      var before = index > 0 ? morphs[index-1] : null;
      var after = index+removedLength < morphs.length ? morphs[index+removedLength] : null;
      var start = before === null ? this.start : (before.end === null ? parent.lastChild : before.end.previousSibling);
      var end   = after === null ? this.end : (after.start === null ? parent.firstChild : after.start.nextSibling);
      var addedLength = addedNodes === undefined ? 0 : addedNodes.length;
      var args, i, current;

      if (removedLength > 0) {
        clear(parent, start, end);
      }

      if (addedLength === 0) {
        if (before !== null) {
          before.after = after;
          before.end = end;
        }
        if (after !== null) {
          after.before = before;
          after.start = start;
        }
        morphs.splice(index, removedLength);
        return;
      }

      args = new Array(addedLength+2);
      if (addedLength > 0) {
        for (i=0; i<addedLength; i++) {
          args[i+2] = current = new Morph(parent, start, end, this.domHelper, this.contextualElement);
          current._update(parent, addedNodes[i]);
          current.owner = this;
          if (before !== null) {
            current.before = before;
            before.end = start.nextSibling;
            before.after = current;
          }
          before = current;
          start = end === null ? parent.lastChild : end.previousSibling;
        }
        if (after !== null) {
          current.after = after;
          after.before = current;
          after.start = end.previousSibling;
        }
      }

      args[0] = index;
      args[1] = removedLength;

      splice.apply(morphs, args);
    };

    function appendChildren(parent, end, nodeList) {
      var ref = end;
      var i = nodeList.length;
      var node;

      while (i--) {
        node = nodeList[i];
        parent.insertBefore(node, ref);
        ref = node;
      }
    }

    function clear(parent, start, end) {
      var current, previous;
      if (end === null) {
        current = parent.lastChild;
      } else {
        current = end.previousSibling;
      }

      while (current !== null && current !== start) {
        previous = current.previousSibling;
        parent.removeChild(current);
        current = previous;
      }
    }

    __exports__["default"] = Morph;
  });
define("property-compiler/property-compiler", ["exports", "module", "property-compiler/tokenizer"], function (exports, module, _propertyCompilerTokenizer) {
  "use strict";

  var _interopRequire = function (obj) {
    return obj && (obj["default"] || obj);
  };

  var tokenizer = _interopRequire(_propertyCompilerTokenizer);

  var computedProperties = [];

  // TODO: Make this farrrrrr more robust...very minimal right now

  function compile(prop, name) {
    var output = {};

    if (prop.__params) return prop.__params;

    var str = prop.toString(),
        //.replace(/(?:\/\*(?:[\s\S]*?)\*\/)|(?:([\s;])+\/\/(?:.*)$)/gm, '$1'), // String representation of function sans comments
    nextToken = tokenizer.tokenize(str),
        tokens = [],
        token,
        finishedPaths = [],
        namedPaths = {},
        opcodes = [],
        named = false,
        listening = 0,
        inSubComponent = 0,
        subComponent = [],
        root,
        paths = [],
        path,
        tmpPath,
        attrs = [],
        workingpath = [],
        terminators = [";", ",", "==", ">", "<", ">=", "<=", ">==", "<==", "!=", "!==", "===", "&&", "||", "+", "-", "/", "*"];
    do {
      token = nextToken();

      if (token.value === "this") {
        listening++;
        workingpath = [];
      }

      // TODO: handle gets on collections
      if (token.value === "get") {
        path = nextToken();
        while (_.isUndefined(path.value)) {
          path = nextToken();
        }

        // Replace any access to a collection with the generic @each placeholder and push dependancy
        workingpath.push(path.value.replace(/\[.+\]/g, ".@each").replace(/^\./, ""));
      }

      if (token.value === "pluck") {
        path = nextToken();
        while (_.isUndefined(path.value)) {
          path = nextToken();
        }

        workingpath.push("@each." + path.value);
      }

      if (token.value === "slice" || token.value === "clone" || token.value === "filter") {
        path = nextToken();
        if (path.type.type === "(") workingpath.push("@each");
      }

      if (token.value === "at") {
        path = nextToken();
        while (_.isUndefined(path.value)) {
          path = nextToken();
        }
        // workingpath[workingpath.length -1] = workingpath[workingpath.length -1] + '[' + path.value + ']';
        // workingpath.push('[' + path.value + ']');
        workingpath.push("@each");
      }

      if (token.value === "where" || token.value === "findWhere") {
        workingpath.push("@each");
        path = nextToken();
        attrs = [];
        var itr = 0;
        while (path.type.type !== ")") {
          if (path.value) {
            if (itr % 2 === 0) {
              attrs.push(path.value);
            }
            itr++;
          }
          path = nextToken();
        }
        workingpath.push(attrs);
      }

      if (listening && _.indexOf(terminators, token.type.type) > -1 || _.indexOf(terminators, token.value) > -1) {
        workingpath = _.reduce(workingpath, function (memo, paths) {
          var newMemo = [];
          paths = !_.isArray(paths) ? [paths] : paths;
          _.each(paths, function (path) {
            _.each(memo, function (mem) {
              newMemo.push(_.compact([mem, path]).join(".").replace(".[", "["));
            });
          });
          return newMemo;
        }, [""]);
        finishedPaths = _.compact(_.union(finishedPaths, workingpath));
        workingpath = [];
        listening--;
      }
    } while (token.start !== token.end);

    console.log("COMPUTED PROPERTY", name, "registered with these dependancy paths:", finishedPaths);

    // Return the dependancies list
    return prop.__params = finishedPaths;
  }

  module.exports = { compile: compile };
});
define("rebound-compiler/compiler", ["exports", "module", "htmlbars-compiler/compiler", "htmlbars-util/object-utils", "morph/dom-helper", "rebound-runtime/helpers", "rebound-runtime/hooks"], function (exports, module, _htmlbarsCompilerCompiler, _htmlbarsUtilObjectUtils, _morphDomHelper, _reboundRuntimeHelpers, _reboundRuntimeHooks) {
  "use strict";

  var _interopRequire = function (obj) {
    return obj && (obj["default"] || obj);
  };

  var htmlbarsCompile = _htmlbarsCompilerCompiler.compile;
  var htmlbarsCompileSpec = _htmlbarsCompilerCompiler.compileSpec;
  var merge = _htmlbarsUtilObjectUtils.merge;
  var DOMHelper = _interopRequire(_morphDomHelper);

  var helpers = _interopRequire(_reboundRuntimeHelpers);

  var hooks = _interopRequire(_reboundRuntimeHooks);

  function compile(string, options) {
    // Ensure we have a well-formed object as var options
    options = options || {};
    options.helpers = options.helpers || {};
    options.hooks = options.hooks || {};

    // Merge our default helpers with user provided helpers
    options.helpers = merge(helpers, options.helpers);
    options.hooks = merge(hooks, options.hooks);

    // Compile our template function
    var func = htmlbarsCompile(string, {
      helpers: options.helpers,
      hooks: options.hooks
    });

    func._render = func.render;

    // Return a wrapper function that will merge user provided helpers with our defaults
    func.render = function (data, env, context) {
      // Ensure we have a well-formed object as var options
      env = env || {};
      env.helpers = env.helpers || {};
      env.hooks = env.hooks || {};
      env.dom = env.dom || new DOMHelper();

      // Merge our default helpers and hooks with user provided helpers
      env.helpers = merge(helpers, env.helpers);
      env.hooks = merge(hooks, env.hooks);

      // Set a default context if it doesn't exist
      context = context || document.body;

      // Call our func with merged helpers and hooks
      return func._render(data, env, context);
    };

    helpers.registerPartial(options.name, func);

    return func;
  }

  module.exports = compile;
});
define("rebound-data/collection", ["exports", "module", "rebound-data/model", "rebound-runtime/utils"], function (exports, module, _reboundDataModel, _reboundRuntimeUtils) {
  "use strict";

  var _interopRequire = function (obj) {
    return obj && (obj["default"] || obj);
  };

  var Model = _interopRequire(_reboundDataModel);

  var $ = _interopRequire(_reboundRuntimeUtils);

  // If Rebound Runtime has already been run, throw error
  if (Rebound.Collection) {
    throw "Rebound Collection is already loaded on the page!";
  }
  // If Backbone hasn't been started yet, throw error
  if (!window.Backbone) {
    throw "Backbone must be on the page for Rebound to load.";
  }

  function pathGenerator(collection) {
    return function () {
      return collection.__path() + "[" + collection.indexOf(collection._byId[this.cid]) + "]";
    };
  }

  var Collection = Backbone.Collection.extend({

    isCollection: true,
    isData: true,

    model: this.model || Model,

    __path: function () {
      return "";
    },

    constructor: function (models, options) {
      models || (models = []);
      options || (options = {});
      this.__observers = {};
      this.helpers = {};
      this.cid = _.uniqueId("collection");

      // Set lineage
      this.setParent(options.parent || this);
      this.setRoot(options.root || this);
      this.__path = options.path || this.__path;

      Backbone.Collection.apply(this, arguments);

      // When a model is removed from its original collection, destroy it
      // TODO: Fix this. Computed properties now somehow allow collection to share a model. They may be removed from one but not the other. That is bad.
      // The clone = false options is the culprit. Find a better way to copy all of the collections custom attributes over to the clone.
      this.on("remove", function (model, collection, options) {});
    },

    get: function (key, options) {
      // If the key is a number or object, default to backbone's collection get
      if (typeof key == "number" || typeof key == "object") {
        return Backbone.Collection.prototype.get.call(this, key);
      }

      // If key is not a string, return undefined
      if (!_.isString(key)) return void 0;

      // Split the path at all '.', '[' and ']' and find the value referanced.
      var parts = $.splitPath(key),
          result = this,
          l = parts.length,
          i = 0;
      options = _.defaults(options || {}, { raw: false });

      if (_.isUndefined(key) || _.isNull(key)) return key;
      if (key === "" || parts.length === 0) return result;

      if (parts.length > 0) {
        for (i = 0; i < l; i++) {
          // If returning raw, always return the first computed property found. If undefined, you're done.
          if (result && result.isComputedProperty && options.raw) return result;
          if (result && result.isComputedProperty) result = result.value();
          if (_.isUndefined(result) || _.isNull(result)) return result;
          if (parts[i] === "@parent") result = result.__parent__;else if (result.isCollection) result = result.models[parts[i]];else if (result.isModel) result = result.attributes[parts[i]];else if (result.hasOwnProperty(parts[i])) result = result[parts[i]];
        }
      }

      if (result && result.isComputedProperty && !options.raw) result = result.value();

      return result;
    },

    set: function (models, options) {
      var newModels = [],
          lineage = {
        parent: this,
        root: this.__root__,
        path: pathGenerator(this),
        silent: true
      };
      options = options || {},

      // If no models passed, implies an empty array
      models || (models = []);

      // If models is a string, call set at that path
      if (_.isString(models)) return this.get($.splitPath(models)[0]).set($.splitPath(models).splice(1, models.length).join("."), options);
      if (!_.isObject(models)) return console.error("Collection.set must be passed a Model, Object, array or Models and Objects, or another Collection");

      // If another collection, treat like an array
      models = models.isCollection ? models.models : models;
      // Ensure models is an array
      models = !_.isArray(models) ? [models] : models;

      // If the model already exists in this collection, or we are told not to clone it, let Backbone handle the merge
      // Otherwise, create our copy of this model, give them the same cid so our helpers treat them as the same object
      _.each(models, function (data, index) {
        if (data.isModel && options.clone === false || this._byId[data.cid]) return newModels[index] = data;
        newModels[index] = new this.model(data, _.defaults(lineage, options));
        data.isModel && (newModels[index].cid = data.cid);
      }, this);

      // Ensure that this element now knows that it has children now. Without this cyclic dependancies cause issues
      this._hasAncestry || (this._hasAncestry = newModels.length > 0);

      // Call original set function with model duplicates
      return Backbone.Collection.prototype.set.call(this, newModels, options);
    }

  });

  module.exports = Collection;
});

// model.deinitialize();
define("rebound-precompiler/rebound-precompiler", ["exports", "htmlbars"], function (exports, _htmlbars) {
  "use strict";

  var htmlbarsCompile = _htmlbars.compile;
  var htmlbarsCompileSpec = _htmlbars.compileSpec;


  function getScript(str) {
    return str.indexOf("<script>") > -1 && str.indexOf("</script>") > -1 ? "(function(){" + str.replace(/(.*<script>)(.*)(<\/script>.*)/ig, "$2") + "})()" : "{}";
  }

  function getStyle(str) {
    return str.indexOf("<style>") > -1 && str.indexOf("</style>") > -1 ? str.replace(/(.*<style>)(.*)(<\/style>.*)/ig, "$2").replace(/"/g, "\\\"") : "";
  }

  function getTemplate(str) {
    return str.replace(/.*<template>(.*)<\/template>.*/gi, "$1").replace(/(.*)<style>.*<\/style>(.*)/ig, "$1$2");
  }

  function getName(str) {
    return str.replace(/.*<element[^>]*name=(["'])?([^'">\s]+)\1[^<>]*>.*/ig, "$2");
  }

  function minify(str) {
    return str.replace(/\s+/g, " ").replace(/\n|(>) (<)/g, "$1$2");
  }

  function removeComments(str) {
    return str.replace(/(?:\/\*(?:[\s\S]*?)\*\/)|(?:([\s])+\/\/(?:.*)$)/gm, "$1");
  }

  function templateFunc(fn) {
    var src = fn.toString();
    src = src.slice(src.indexOf("{") + 1, -1);
    return function (data) {
      return !data ? src : src.replace(/(\$[a-zA-Z]+)/g, function ($rep) {
        var key = $rep.slice(1);
        return data[key] || "";
      });
    };
  }

  var COMPONENT_TEMPLATE = templateFunc(function () {
    return (function () {
      return window.Rebound.registerComponent("$name", {
        prototype: $script,
        template: $template,
        style: "$style"
      });
    })();
  });

  function precompile(str, options) {
    if (!str || str.length === 0) {
      return console.error("No template provided!");
    }

    // Remove comments
    str = removeComments(str);
    // Minify everything
    str = minify(str);

    options = options || {};
    options.baseDest = options.baseDest || "";
    options.name = options.name || "";
    options.baseUrl = options.baseUrl || "";

    var template = str,
        style = "",
        script = "{}",
        name = "",
        isPartial = true,
        imports = [],
        partials,
        require,
        deps = [];

    // If the element tag is present
    if (str.indexOf("<element") > -1 && str.indexOf("</element>") > -1) {
      isPartial = false;

      name = getName(str);
      style = getStyle(str);
      template = getTemplate(str);
      script = getScript(str);
    }


    // Assemple our component dependancies by finding link tags and parsing their src
    var importsre = /<link [^h]*href=(['"]?)\/?([^.'"]*).html\1[^>]*>/gi,
        match;

    while ((match = importsre.exec(template)) != null) {
      imports.push(match[2]);
    }
    imports.forEach(function (importString, index) {
      deps.push("\"" + options.baseDest + importString + "\"");
    });

    // Remove link tags from template
    template = template.replace(/<link .*href=(['"]?)(.*).html\1[^>]*>/gi, "");


    // Assemble our partial dependancies
    partials = template.match(/\{\{>\s*?['"]?([^'"}\s]*)['"]?\s*?\}\}/gi);

    if (partials) {
      partials.forEach(function (partial, index) {
        deps.push("\"" + options.baseDest + partial.replace(/\{\{>[\s*]?['"]?([^'"]*)['"]?[\s*]?\}\}/gi, "$1") + "\"");
      });
    }

    // Compile
    template = "" + htmlbarsCompileSpec(template);

    // If is a partial
    if (isPartial) {
      template = "(function(){var template = " + template + "\n window.Rebound.registerPartial( \"" + options.name + "\", template);})();\n";
    }
    // Else, is a component
    else {
      template = COMPONENT_TEMPLATE({
        name: name,
        script: script,
        style: style,
        template: template
      });
    }

    // Wrap in define
    template = "define( [" + deps.join(", ") + "], function(){\n" + template + "});";

    return template;
  }

  exports.precompile = precompile;
});
define("rebound-router/rebound-router", ["exports", "module", "rebound-runtime/utils"], function (exports, module, _reboundRuntimeUtils) {
  "use strict";

  var _interopRequire = function (obj) {
    return obj && (obj["default"] || obj);
  };

  var $ = _interopRequire(_reboundRuntimeUtils);

  // If Rebound Runtime has already been run, throw error
  if (Rebound.Router) {
    throw "Rebound is already loaded on the page!";
  }
  // If Rebound global object isn't instantiated, create it
  if (!_.isObject(window.Rebound)) {
    window.Rebound = {};
  }
  // If Backbone hasn't been started yet, throw error
  if (!window.Backbone) {
    throw "Backbone must be on the page for Rebound to load.";
  }

  // Clean up old page component and load routes from our new page component
  function installResources(PageApp, primaryRoute, isGlobal) {
    var oldPageName,
        pageInstance,
        container,
        router = this;

    // De-initialize the previous app before rendering a new app
    // This way we can ensure that every new page starts with a clean slate
    // This is crucial for scalability of a single page app.
    if (!isGlobal && this.current) {
      oldPageName = this.current.__name;
      // Unset Previous Application's Routes. For each route in the page app:
      _.each(this.current.__component__.routes, function (value, key) {
        var regExp = router._routeToRegExp(key).toString();

        // Remove the handler from our route object
        Backbone.history.handlers = _.filter(Backbone.history.handlers, function (obj) {
          return obj.route.toString() !== regExp;
        });

        // Delete our referance to the route's callback
        delete router["_function_" + key];
      });

      // Un-hook Event Bindings, Delete Objects
      this.current.__component__.deinitialize();

      // Disable old css if it exists
      setTimeout(function () {
        document.getElementById(oldPageName + "-css").setAttribute("disabled", true);
      }, 500);
    }

    // Load New PageApp, give it it's name so we know what css to remove when it deinitializes
    pageInstance = new PageApp();
    pageInstance.__name = primaryRoute;


    // Add to our page
    container = isGlobal ? document.querySelector(isGlobal) : document.getElementsByTagName("content")[0];
    container.innerHTML = "";
    container.appendChild(pageInstance);

    // Make sure we're back at the top of the page
    document.body.scrollTop = 0;


    // Augment ApplicationRouter with new routes from PageApp
    _.each(pageInstance.__component__.routes, function (value, key) {
      // Generate our route callback's new name
      var routeFunctionName = "_function_" + key,
          functionName;
      // Add the new callback referance on to our router
      router[routeFunctionName] = function () {
        pageInstance.__component__[value].apply(pageInstance.__component__, arguments);
      };
      // Add the route handler
      router.route(key, value, this[routeFunctionName]);
    }, this);

    if (!isGlobal) {
      window.Rebound.page = (this.current = pageInstance).__component__;
    }

    // Return our newly installed app
    return pageInstance;
  }

  // Fetches Pare HTML and CSS
  function fetchResources(appName, primaryRoute, isGlobal) {
    // Expecting Module Definition as 'SearchApp' Where 'Search' a Primary Route
    var jsUrl = this.config.jsPath.replace(/:route/g, primaryRoute).replace(/:app/g, appName),
        cssUrl = this.config.cssPath.replace(/:route/g, primaryRoute).replace(/:app/g, appName),
        cssLoaded = false,
        jsLoaded = false,
        cssElement = document.getElementById(appName + "-css"),
        jsElement = document.getElementById(appName + "-js"),
        router = this,
        PageApp;

    // Only Load CSS If Not Loaded Before
    if (!cssElement) {
      cssElement = document.createElement("link");
      cssElement.setAttribute("type", "text/css");
      cssElement.setAttribute("rel", "stylesheet");
      cssElement.setAttribute("href", cssUrl);
      cssElement.setAttribute("id", appName + "-css");
      document.head.appendChild(cssElement);
      $(cssElement).on("load", function (event) {
        if ((cssLoaded = true) && jsLoaded) {
          // Install The Loaded Resources
          installResources.call(router, PageApp, appName, isGlobal);

          // Re-trigger route so the newly added route may execute if there's a route match.
          // If no routes are matched, app will hit wildCard route which will then trigger 404
          if (!isGlobal && router.config.triggerOnFirstLoad) {
            Backbone.history.loadUrl(Backbone.history.fragment);
          }
          if (!isGlobal) {
            router.config.triggerOnFirstLoad = true;
          }
          document.body.classList.remove("loading");
        }
      });
    }
    // If it has been loaded bevore, enable it
    else {
      cssElement.removeAttribute("disabled");
      cssLoaded = true;
    }

    // If if requirejs is not on the page, load the file manually. It better contain all its dependancies.
    if (window.require._defined || _.isUndefined(window.require)) {
      jsElement = document.createElement("script");
      jsElement.setAttribute("type", "text/javascript");
      jsElement.setAttribute("src", "/" + jsUrl + ".js");
      jsElement.setAttribute("id", appName + "-js");
      document.head.appendChild(jsElement);
      $(jsElement).on("load", function (event) {
        // AMD Will Manage Dependancies For Us. Load The App.
        require([jsUrl], function (PageClass) {
          if ((jsLoaded = true) && (PageApp = PageClass) && cssLoaded) {
            // Install The Loaded Resources
            installResources.call(router, PageApp, appName, isGlobal);
            // Re-trigger route so the newly added route may execute if there's a route match.
            // If no routes are matched, app will hit wildCard route which will then trigger 404
            if (!isGlobal && router.config.triggerOnFirstLoad) {
              Backbone.history.loadUrl(Backbone.history.fragment);
            }
            if (!isGlobal) {
              router.config.triggerOnFirstLoad = true;
            }

            document.body.classList.remove("loading");
          }
        });
      });
    } else {
      // AMD Will Manage Dependancies For Us. Load The App.
      window.require([jsUrl], function (PageClass) {
        if ((jsLoaded = true) && (PageApp = PageClass) && cssLoaded) {
          // Install The Loaded Resources
          installResources.call(router, PageApp, appName, isGlobal);
          // Re-trigger route so the newly added route may execute if there's a route match.
          // If no routes are matched, app will hit wildCard route which will then trigger 404
          if (!isGlobal && router.config.triggerOnFirstLoad) {
            Backbone.history.loadUrl(Backbone.history.fragment);
          }

          if (!isGlobal) {
            router.config.triggerOnFirstLoad = true;
          }
          document.body.classList.remove("loading");
        }
      });
    }
  }

  // ReboundRouter Constructor
  var ReboundRouter = Backbone.Router.extend({

    routes: {
      "*route": "wildcardRoute"
    },

    // Called when no matching routes are found. Extracts root route and fetches it resources
    wildcardRoute: function (route) {
      var appName, primaryRoute;

      // If empty route sent, route home
      route = route || "";

      // Get Root of Route
      appName = primaryRoute = route ? route.split("/")[0] : "index";

      // Find Any Custom Route Mappings
      _.any(this.config.handlers, function (handler) {
        if (handler.route.test(route)) {
          appName = handler.primaryRoute;
          return true;
        }
      });

      // If Page Is Already Loaded Then The Route Does Not Exist. 404 and Exit.
      if (this.current && this.current.name === primaryRoute) {
        return Backbone.history.loadUrl("404");
      }

      // Fetch Resources
      document.body.classList.add("loading");
      fetchResources.call(this, appName, primaryRoute);
    },

    // On startup, save our config object and start the router
    initialize: function (options) {
      // Save our config referance
      this.config = options.config;
      this.config.handlers = [];

      var absoluteUrl = new RegExp("^(?:[a-z]+:)?//", "i"),
          router = this;

      // Convert our routeMappings to regexps and push to our handlers
      _.each(this.config.routeMapping, function (value, route) {
        if (!_.isRegExp(route)) route = router._routeToRegExp(route);
        router.config.handlers.unshift({ route: route, primaryRoute: value });
      }, this);

      // Navigate to route for any link with a relative href
      $(document).on("click", "a", function (e) {
        var path = e.target.getAttribute("href");

        // If path is not an absolute url, or blank, try and navigate to that route.
        if (path !== "#" && path !== "" && !absoluteUrl.test(path)) {
          e.preventDefault();
          router.navigate(path, { trigger: true });
        }
      });

      // Install our global components
      _.each(this.config.globalComponents, function (selector, route) {
        fetchResources.call(router, route, route, selector);
      });


      // Let all of our components always have referance to our router
      Rebound.Component.prototype.router = this;

      // Start the history
      Backbone.history.start({
        pushState: true,
        root: this.config.root
      });
    }
  });


  module.exports = ReboundRouter;
});
define("rebound-runtime/component", ["exports", "module", "rebound-runtime/utils", "rebound-runtime/env", "rebound-runtime/context"], function (exports, module, _reboundRuntimeUtils, _reboundRuntimeEnv, _reboundRuntimeContext) {
  "use strict";

  var _interopRequire = function (obj) {
    return obj && (obj["default"] || obj);
  };

  var $ = _interopRequire(_reboundRuntimeUtils);

  var env = _interopRequire(_reboundRuntimeEnv);

  var Context = _interopRequire(_reboundRuntimeContext);

  // If Rebound Runtime has already been run, throw error
  if (Rebound.Component) {
    throw "Rebound is already loaded on the page!";
  }
  // If Backbone hasn't been started yet, throw error
  if (!window.Backbone) {
    throw "Backbone must be on the page for Rebound to load.";
  }

  // New Backbone Component
  var Component = Context.extend({

    isComponent: true,

    constructor: function (options) {
      options = options || (options = {});
      _.bindAll(this, "__callOnComponent");
      this.cid = _.uniqueId("component");
      this.attributes = {};
      this.changed = {};
      this.helpers = {};
      this.__parent__ = this.__root__ = this;
      this.listen();

      // Take our parsed data and add it to our backbone data structure. Does a deep defaults set.
      // In the model, primatives (arrays, objects, etc) are converted to Backbone Objects
      // Functions are compiled to find their dependancies and added as computed properties
      // Set our component's context with the passed data merged with the component's defaults
      this.set(this.defaults || {});
      this.set(options.data || {});

      // Call on component is used by the {{on}} helper to call all event callbacks in the scope of the component
      this.helpers.__callOnComponent = this.__callOnComponent;


      // Get any additional routes passed in from options
      this.routes = _.defaults(options.routes || {}, this.routes);
      // Ensure that all route functions exist
      _.each(this.routes, function (value, key, routes) {
        if (typeof value !== "string") {
          throw "Function name passed to routes in  " + this.__name + " component must be a string!";
        }
        if (!this[value]) {
          throw "Callback function " + value + " does not exist on the  " + this.__name + " component!";
        }
      }, this);


      // Set our outlet and template if we have one
      this.el = options.outlet || undefined;
      this.$el = _.isUndefined(window.Backbone.$) ? false : window.Backbone.$(this.el);

      if (_.isFunction(this.createdCallback)) {
        this.createdCallback.call(this);
      }

      // Take our precompiled template and hydrates it. When Rebound Compiler is included, can be a handlebars template string.
      if (!options.template && !this.template) {
        throw "Template must provided for " + this.__name + " component!";
      }
      this.template = options.template || this.template;
      this.template = typeof options.template === "string" ? Rebound.templates[this.template] : env.hydrate(this.template);


      // Render our dom and place the dom in our custom element
      this.el.appendChild(this.template(this, { helpers: this.helpers }, this.el));

      this.initialize();
    },

    $: function (selector) {
      if (!this.$el) {
        return console.error("No DOM manipulation library on the page!");
      }
      return this.$el.find(selector);
    },

    // Trigger all events on both the component and the element
    trigger: function (eventName) {
      if (this.el) {
        $(this.el).trigger(eventName, arguments);
      }
      Backbone.Model.prototype.trigger.apply(this, arguments);
    },

    __callOnComponent: function (name, event) {
      if (!_.isFunction(this[name])) {
        throw "ERROR: No method named " + name + " on component " + this.__name + "!";
      }
      return this[name].call(this, event);
    },

    _onAttributeChange: function (attrName, oldVal, newVal) {} });

  Component.extend = function (protoProps, staticProps) {
    var parent = this,
        child,
        reservedMethods = { trigger: 1, constructor: 1, get: 1, set: 1, has: 1, extend: 1, escape: 1, unset: 1, clear: 1, cid: 1, attributes: 1, changed: 1, toJSON: 1, validationError: 1, isValid: 1, isNew: 1, hasChanged: 1, changedAttributes: 1, previous: 1, previousAttributes: 1 },
        configProperties = { routes: 1, template: 1, defaults: 1, outlet: 1, url: 1, urlRoot: 1, idAttribute: 1, id: 1, createdCallback: 1, attachedCallback: 1, detachedCallback: 1 };

    protoProps.defaults = {};

    // For each property passed into our component base class
    _.each(protoProps, function (value, key, protoProps) {
      // If a configuration property, ignore it
      if (configProperties[key]) {
        return;
      }

      // If a primative or backbone type object, or computed property (function which takes no arguments and returns a value) move it to our defaults
      if (!_.isFunction(value) || value.isModel || value.isComponent || _.isFunction(value) && value.length === 0 && value.toString().indexOf("return") > -1) {
        protoProps.defaults[key] = value;
        delete protoProps[key];
      }

      // If a reserved method, yell
      if (reservedMethods[key]) {
        throw "ERROR: " + key + " is a reserved method name in " + staticProps.__name + "!";
      }

      // All other values are component methods, leave them be unless already defined.
    }, this);

    // If given a constructor, use it, otherwise use the default one defined above
    if (protoProps && _.has(protoProps, "constructor")) {
      child = protoProps.constructor;
    } else {
      child = function () {
        return parent.apply(this, arguments);
      };
    }

    // Our class should inherit everything from its parent, defined above
    var Surrogate = function () {
      this.constructor = child;
    };
    Surrogate.prototype = parent.prototype;
    child.prototype = new Surrogate();

    // Extend our prototype with any remaining protoProps, overriting pre-defined ones
    if (protoProps) {
      _.extend(child.prototype, protoProps, staticProps);
    }

    // Set our ancestry
    child.__super__ = parent.prototype;

    return child;
  };


  module.exports = Component;
});

// Commented out because tracking attribute changes and making sure they dont infinite loop is hard.
// TODO: Make work.
// try{ newVal = JSON.parse(newVal); } catch (e){ newVal = newVal; }
//
// // data attributes should be referanced by their camel case name
// attrName = attrName.replace(/^data-/g, "").replace(/-([a-z])/g, function (g) { return g[1].toUpperCase(); });
//
// oldVal = this.get(attrName);
//
// if(newVal === null){ this.unset(attrName); }
//
// // If oldVal is a number, and newVal is only numerical, preserve type
// if(_.isNumber(oldVal) && _.isString(newVal) && newVal.match(/^[0-9]*$/i)){
//   newVal = parseInt(newVal);
// }
//
// else{ this.set(attrName, newVal, {quiet: true}); }
define("property-compiler/tokenizer", ["exports", "module"], function (exports, module) {
  "use strict";

  /*jshint -W054 */
  // jshint ignore: start

  // A second optional argument can be given to further configure
  // the parser process. These options are recognized:

  var exports = {};

  var options, input, inputLen, sourceFile;

  var defaultOptions = exports.defaultOptions = {
    // `ecmaVersion` indicates the ECMAScript version to parse. Must
    // be either 3, or 5, or 6. This influences support for strict
    // mode, the set of reserved words, support for getters and
    // setters and other features. ES6 support is only partial.
    ecmaVersion: 5,
    // Turn on `strictSemicolons` to prevent the parser from doing
    // automatic semicolon insertion.
    strictSemicolons: false,
    // When `allowTrailingCommas` is false, the parser will not allow
    // trailing commas in array and object literals.
    allowTrailingCommas: true,
    // By default, reserved words are not enforced. Enable
    // `forbidReserved` to enforce them. When this option has the
    // value "everywhere", reserved words and keywords can also not be
    // used as property names.
    forbidReserved: false,
    // When enabled, a return at the top level is not considered an
    // error.
    allowReturnOutsideFunction: false,
    // When `locations` is on, `loc` properties holding objects with
    // `start` and `end` properties in `{line, column}` form (with
    // line being 1-based and column 0-based) will be attached to the
    // nodes.
    locations: false,
    // A function can be passed as `onComment` option, which will
    // cause Acorn to call that function with `(block, text, start,
    // end)` parameters whenever a comment is skipped. `block` is a
    // boolean indicating whether this is a block (`/* */`) comment,
    // `text` is the content of the comment, and `start` and `end` are
    // character offsets that denote the start and end of the comment.
    // When the `locations` option is on, two more parameters are
    // passed, the full `{line, column}` locations of the start and
    // end of the comments. Note that you are not allowed to call the
    // parser from the callback—that will corrupt its internal state.
    onComment: null,
    // Nodes have their start and end characters offsets recorded in
    // `start` and `end` properties (directly on the node, rather than
    // the `loc` object, which holds line/column data. To also add a
    // [semi-standardized][range] `range` property holding a `[start,
    // end]` array with the same numbers, set the `ranges` option to
    // `true`.
    //
    // [range]: https://bugzilla.mozilla.org/show_bug.cgi?id=745678
    ranges: false,
    // It is possible to parse multiple files into a single AST by
    // passing the tree produced by parsing the first file as
    // `program` option in subsequent parses. This will add the
    // toplevel forms of the parsed file to the `Program` (top) node
    // of an existing parse tree.
    program: null,
    // When `locations` is on, you can pass this to record the source
    // file in every node's `loc` object.
    sourceFile: null,
    // This value, if given, is stored in every node, whether
    // `locations` is on or off.
    directSourceFile: null
  };

  function setOptions(opts) {
    options = opts || {};
    for (var opt in defaultOptions) if (!Object.prototype.hasOwnProperty.call(options, opt)) options[opt] = defaultOptions[opt];
    sourceFile = options.sourceFile || null;

    isKeyword = options.ecmaVersion >= 6 ? isEcma6Keyword : isEcma5AndLessKeyword;
  }

  // The `getLineInfo` function is mostly useful when the
  // `locations` option is off (for performance reasons) and you
  // want to find the line/column position for a given character
  // offset. `input` should be the code string that the offset refers
  // into.

  var getLineInfo = exports.getLineInfo = function (input, offset) {
    for (var line = 1, cur = 0;;) {
      lineBreak.lastIndex = cur;
      var match = lineBreak.exec(input);
      if (match && match.index < offset) {
        ++line;
        cur = match.index + match[0].length;
      } else break;
    }
    return { line: line, column: offset - cur };
  };

  // Acorn is organized as a tokenizer and a recursive-descent parser.
  // The `tokenize` export provides an interface to the tokenizer.
  // Because the tokenizer is optimized for being efficiently used by
  // the Acorn parser itself, this interface is somewhat crude and not
  // very modular. Performing another parse or call to `tokenize` will
  // reset the internal state, and invalidate existing tokenizers.

  exports.tokenize = function (inpt, opts) {
    var getToken = function (forceRegexp) {
      lastEnd = tokEnd;
      readToken(forceRegexp);
      t.start = tokStart;t.end = tokEnd;
      t.startLoc = tokStartLoc;t.endLoc = tokEndLoc;
      t.type = tokType;t.value = tokVal;
      return t;
    };

    input = String(inpt);inputLen = input.length;
    setOptions(opts);
    initTokenState();

    var t = {};
    getToken.jumpTo = function (pos, reAllowed) {
      tokPos = pos;
      if (options.locations) {
        tokCurLine = 1;
        tokLineStart = lineBreak.lastIndex = 0;
        var match;
        while ((match = lineBreak.exec(input)) && match.index < pos) {
          ++tokCurLine;
          tokLineStart = match.index + match[0].length;
        }
      }
      tokRegexpAllowed = reAllowed;
      skipSpace();
    };
    return getToken;
  };

  // State is kept in (closure-)global variables. We already saw the
  // `options`, `input`, and `inputLen` variables above.

  // The current position of the tokenizer in the input.

  var tokPos;

  // The start and end offsets of the current token.

  var tokStart, tokEnd;

  // When `options.locations` is true, these hold objects
  // containing the tokens start and end line/column pairs.

  var tokStartLoc, tokEndLoc;

  // The type and value of the current token. Token types are objects,
  // named by variables against which they can be compared, and
  // holding properties that describe them (indicating, for example,
  // the precedence of an infix operator, and the original name of a
  // keyword token). The kind of value that's held in `tokVal` depends
  // on the type of the token. For literals, it is the literal value,
  // for operators, the operator name, and so on.

  var tokType, tokVal;

  // Interal state for the tokenizer. To distinguish between division
  // operators and regular expressions, it remembers whether the last
  // token was one that is allowed to be followed by an expression.
  // (If it is, a slash is probably a regexp, if it isn't it's a
  // division operator. See the `parseStatement` function for a
  // caveat.)

  var tokRegexpAllowed;

  // When `options.locations` is true, these are used to keep
  // track of the current line, and know when a new line has been
  // entered.

  var tokCurLine, tokLineStart;

  // These store the position of the previous token, which is useful
  // when finishing a node and assigning its `end` position.

  var lastStart, lastEnd, lastEndLoc;

  // This is the parser's state. `inFunction` is used to reject
  // `return` statements outside of functions, `labels` to verify that
  // `break` and `continue` have somewhere to jump to, and `strict`
  // indicates whether strict mode is on.

  var inFunction, labels, strict;

  // This function is used to raise exceptions on parse errors. It
  // takes an offset integer (into the current `input`) to indicate
  // the location of the error, attaches the position to the end
  // of the error message, and then raises a `SyntaxError` with that
  // message.

  function raise(pos, message) {
    var loc = getLineInfo(input, pos);
    message += " (" + loc.line + ":" + loc.column + ")";
    var err = new SyntaxError(message);
    err.pos = pos;err.loc = loc;err.raisedAt = tokPos;
    throw err;
  }

  // Reused empty array added for node fields that are always empty.

  var empty = [];

  // ## Token types

  // The assignment of fine-grained, information-carrying type objects
  // allows the tokenizer to store the information it has about a
  // token in a way that is very cheap for the parser to look up.

  // All token type variables start with an underscore, to make them
  // easy to recognize.

  // These are the general types. The `type` property is only used to
  // make them recognizeable when debugging.

  var _num = { type: "num" },
      _regexp = { type: "regexp" },
      _string = { type: "string" };
  var _name = { type: "name" },
      _eof = { type: "eof" };

  // Keyword tokens. The `keyword` property (also used in keyword-like
  // operators) indicates that the token originated from an
  // identifier-like word, which is used when parsing property names.
  //
  // The `beforeExpr` property is used to disambiguate between regular
  // expressions and divisions. It is set on all token types that can
  // be followed by an expression (thus, a slash after them would be a
  // regular expression).
  //
  // `isLoop` marks a keyword as starting a loop, which is important
  // to know when parsing a label, in order to allow or disallow
  // continue jumps to that label.

  var _break = { keyword: "break" },
      _case = { keyword: "case", beforeExpr: true },
      _catch = { keyword: "catch" };
  var _continue = { keyword: "continue" },
      _debugger = { keyword: "debugger" },
      _default = { keyword: "default" };
  var _do = { keyword: "do", isLoop: true },
      _else = { keyword: "else", beforeExpr: true };
  var _finally = { keyword: "finally" },
      _for = { keyword: "for", isLoop: true },
      _function = { keyword: "function" };
  var _if = { keyword: "if" },
      _return = { keyword: "return", beforeExpr: true },
      _switch = { keyword: "switch" };
  var _throw = { keyword: "throw", beforeExpr: true },
      _try = { keyword: "try" },
      _var = { keyword: "var" };
  var _let = { keyword: "let" },
      _const = { keyword: "const" };
  var _while = { keyword: "while", isLoop: true },
      _with = { keyword: "with" },
      _new = { keyword: "new", beforeExpr: true };
  var _this = { keyword: "this" };

  // The keywords that denote values.

  var _null = { keyword: "null", atomValue: null },
      _true = { keyword: "true", atomValue: true };
  var _false = { keyword: "false", atomValue: false };

  // Some keywords are treated as regular operators. `in` sometimes
  // (when parsing `for`) needs to be tested against specifically, so
  // we assign a variable name to it for quick comparing.

  var _in = { keyword: "in", binop: 7, beforeExpr: true };

  // Map keyword names to token types.

  var keywordTypes = { "break": _break, "case": _case, "catch": _catch,
    "continue": _continue, "debugger": _debugger, "default": _default,
    "do": _do, "else": _else, "finally": _finally, "for": _for,
    "function": _function, "if": _if, "return": _return, "switch": _switch,
    "throw": _throw, "try": _try, "var": _var, "let": _let, "const": _const,
    "while": _while, "with": _with,
    "null": _null, "true": _true, "false": _false, "new": _new, "in": _in,
    "instanceof": { keyword: "instanceof", binop: 7, beforeExpr: true }, "this": _this,
    "typeof": { keyword: "typeof", prefix: true, beforeExpr: true },
    "void": { keyword: "void", prefix: true, beforeExpr: true },
    "delete": { keyword: "delete", prefix: true, beforeExpr: true } };

  // Punctuation token types. Again, the `type` property is purely for debugging.

  var _bracketL = { type: "[", beforeExpr: true },
      _bracketR = { type: "]" },
      _braceL = { type: "{", beforeExpr: true };
  var _braceR = { type: "}" },
      _parenL = { type: "(", beforeExpr: true },
      _parenR = { type: ")" };
  var _comma = { type: ",", beforeExpr: true },
      _semi = { type: ";", beforeExpr: true };
  var _colon = { type: ":", beforeExpr: true },
      _dot = { type: "." },
      _ellipsis = { type: "..." },
      _question = { type: "?", beforeExpr: true };

  // Operators. These carry several kinds of properties to help the
  // parser use them properly (the presence of these properties is
  // what categorizes them as operators).
  //
  // `binop`, when present, specifies that this operator is a binary
  // operator, and will refer to its precedence.
  //
  // `prefix` and `postfix` mark the operator as a prefix or postfix
  // unary operator. `isUpdate` specifies that the node produced by
  // the operator should be of type UpdateExpression rather than
  // simply UnaryExpression (`++` and `--`).
  //
  // `isAssign` marks all of `=`, `+=`, `-=` etcetera, which act as
  // binary operators with a very low precedence, that should result
  // in AssignmentExpression nodes.

  var _slash = { binop: 10, beforeExpr: true },
      _eq = { isAssign: true, beforeExpr: true };
  var _assign = { isAssign: true, beforeExpr: true };
  var _incDec = { postfix: true, prefix: true, isUpdate: true },
      _prefix = { prefix: true, beforeExpr: true };
  var _logicalOR = { binop: 1, beforeExpr: true };
  var _logicalAND = { binop: 2, beforeExpr: true };
  var _bitwiseOR = { binop: 3, beforeExpr: true };
  var _bitwiseXOR = { binop: 4, beforeExpr: true };
  var _bitwiseAND = { binop: 5, beforeExpr: true };
  var _equality = { binop: 6, beforeExpr: true };
  var _relational = { binop: 7, beforeExpr: true };
  var _bitShift = { binop: 8, beforeExpr: true };
  var _plusMin = { binop: 9, prefix: true, beforeExpr: true };
  var _multiplyModulo = { binop: 10, beforeExpr: true };

  // Provide access to the token types for external users of the
  // tokenizer.

  exports.tokTypes = { bracketL: _bracketL, bracketR: _bracketR, braceL: _braceL, braceR: _braceR,
    parenL: _parenL, parenR: _parenR, comma: _comma, semi: _semi, colon: _colon,
    dot: _dot, ellipsis: _ellipsis, question: _question, slash: _slash, eq: _eq,
    name: _name, eof: _eof, num: _num, regexp: _regexp, string: _string };
  for (var kw in keywordTypes) exports.tokTypes["_" + kw] = keywordTypes[kw];

  // This is a trick taken from Esprima. It turns out that, on
  // non-Chrome browsers, to check whether a string is in a set, a
  // predicate containing a big ugly `switch` statement is faster than
  // a regular expression, and on Chrome the two are about on par.
  // This function uses `eval` (non-lexical) to produce such a
  // predicate from a space-separated string of words.
  //
  // It starts by sorting the words by length.

  function makePredicate(words) {
    var compareTo = function (arr) {
      if (arr.length == 1) return f += "return str === " + JSON.stringify(arr[0]) + ";";
      f += "switch(str){";
      for (var i = 0; i < arr.length; ++i) f += "case " + JSON.stringify(arr[i]) + ":";
      f += "return true}return false;";
    };

    words = words.split(" ");
    var f = "",
        cats = [];
    out: for (var i = 0; i < words.length; ++i) {
      for (var j = 0; j < cats.length; ++j) if (cats[j][0].length == words[i].length) {
        cats[j].push(words[i]);
        continue out;
      }
      cats.push([words[i]]);
    }


    // When there are more than three length categories, an outer
    // switch first dispatches on the lengths, to save on comparisons.

    if (cats.length > 3) {
      cats.sort(function (a, b) {
        return b.length - a.length;
      });
      f += "switch(str.length){";
      for (var i = 0; i < cats.length; ++i) {
        var cat = cats[i];
        f += "case " + cat[0].length + ":";
        compareTo(cat);
      }
      f += "}";

      // Otherwise, simply generate a flat `switch` statement.
    } else {
      compareTo(words);
    }
    return new Function("str", f);
  }

  // The ECMAScript 3 reserved word list.

  var isReservedWord3 = makePredicate("abstract boolean byte char class double enum export extends final float goto implements import int interface long native package private protected public short static super synchronized throws transient volatile");

  // ECMAScript 5 reserved words.

  var isReservedWord5 = makePredicate("class enum extends super const export import");

  // The additional reserved words in strict mode.

  var isStrictReservedWord = makePredicate("implements interface let package private protected public static yield");

  // The forbidden variable names in strict mode.

  var isStrictBadIdWord = makePredicate("eval arguments");

  // And the keywords.

  var ecma5AndLessKeywords = "break case catch continue debugger default do else finally for function if return switch throw try var while with null true false instanceof typeof void delete new in this";

  var isEcma5AndLessKeyword = makePredicate(ecma5AndLessKeywords);

  var isEcma6Keyword = makePredicate(ecma5AndLessKeywords + " let const");

  var isKeyword = isEcma5AndLessKeyword;

  // ## Character categories

  // Big ugly regular expressions that match characters in the
  // whitespace, identifier, and identifier-start categories. These
  // are only applied when a character is found to actually have a
  // code point above 128.

  var nonASCIIwhitespace = /[\u1680\u180e\u2000-\u200a\u202f\u205f\u3000\ufeff]/;
  var nonASCIIidentifierStartChars = "ªµºÀ-ÖØ-öø-ˁˆ-ˑˠ-ˤˬˮͰ-ʹͶͷͺ-ͽΆΈ-ΊΌΎ-ΡΣ-ϵϷ-ҁҊ-ԧԱ-Ֆՙա-ևא-תװ-ײؠ-يٮٯٱ-ۓەۥۦۮۯۺ-ۼۿܐܒ-ܯݍ-ޥޱߊ-ߪߴߵߺࠀ-ࠕࠚࠤࠨࡀ-ࡘࢠࢢ-ࢬऄ-हऽॐक़-ॡॱ-ॷॹ-ॿঅ-ঌএঐও-নপ-রলশ-হঽৎড়ঢ়য়-ৡৰৱਅ-ਊਏਐਓ-ਨਪ-ਰਲਲ਼ਵਸ਼ਸਹਖ਼-ੜਫ਼ੲ-ੴઅ-ઍએ-ઑઓ-નપ-રલળવ-હઽૐૠૡଅ-ଌଏଐଓ-ନପ-ରଲଳଵ-ହଽଡ଼ଢ଼ୟ-ୡୱஃஅ-ஊஎ-ஐஒ-கஙசஜஞடணதந-பம-ஹௐఅ-ఌఎ-ఐఒ-నప-ళవ-హఽౘౙౠౡಅ-ಌಎ-ಐಒ-ನಪ-ಳವ-ಹಽೞೠೡೱೲഅ-ഌഎ-ഐഒ-ഺഽൎൠൡൺ-ൿඅ-ඖක-නඳ-රලව-ෆก-ะาำเ-ๆກຂຄງຈຊຍດ-ທນ-ຟມ-ຣລວສຫອ-ະາຳຽເ-ໄໆໜ-ໟༀཀ-ཇཉ-ཬྈ-ྌက-ဪဿၐ-ၕၚ-ၝၡၥၦၮ-ၰၵ-ႁႎႠ-ჅჇჍა-ჺჼ-ቈቊ-ቍቐ-ቖቘቚ-ቝበ-ኈኊ-ኍነ-ኰኲ-ኵኸ-ኾዀዂ-ዅወ-ዖዘ-ጐጒ-ጕጘ-ፚᎀ-ᎏᎠ-Ᏼᐁ-ᙬᙯ-ᙿᚁ-ᚚᚠ-ᛪᛮ-ᛰᜀ-ᜌᜎ-ᜑᜠ-ᜱᝀ-ᝑᝠ-ᝬᝮ-ᝰក-ឳៗៜᠠ-ᡷᢀ-ᢨᢪᢰ-ᣵᤀ-ᤜᥐ-ᥭᥰ-ᥴᦀ-ᦫᧁ-ᧇᨀ-ᨖᨠ-ᩔᪧᬅ-ᬳᭅ-ᭋᮃ-ᮠᮮᮯᮺ-ᯥᰀ-ᰣᱍ-ᱏᱚ-ᱽᳩ-ᳬᳮ-ᳱᳵᳶᴀ-ᶿḀ-ἕἘ-Ἕἠ-ὅὈ-Ὅὐ-ὗὙὛὝὟ-ώᾀ-ᾴᾶ-ᾼιῂ-ῄῆ-ῌῐ-ΐῖ-Ίῠ-Ῥῲ-ῴῶ-ῼⁱⁿₐ-ₜℂℇℊ-ℓℕℙ-ℝℤΩℨK-ℭℯ-ℹℼ-ℿⅅ-ⅉⅎⅠ-ↈⰀ-Ⱞⰰ-ⱞⱠ-ⳤⳫ-ⳮⳲⳳⴀ-ⴥⴧⴭⴰ-ⵧⵯⶀ-ⶖⶠ-ⶦⶨ-ⶮⶰ-ⶶⶸ-ⶾⷀ-ⷆⷈ-ⷎⷐ-ⷖⷘ-ⷞⸯ々-〇〡-〩〱-〵〸-〼ぁ-ゖゝ-ゟァ-ヺー-ヿㄅ-ㄭㄱ-ㆎㆠ-ㆺㇰ-ㇿ㐀-䶵一-鿌ꀀ-ꒌꓐ-ꓽꔀ-ꘌꘐ-ꘟꘪꘫꙀ-ꙮꙿ-ꚗꚠ-ꛯꜗ-ꜟꜢ-ꞈꞋ-ꞎꞐ-ꞓꞠ-Ɦꟸ-ꠁꠃ-ꠅꠇ-ꠊꠌ-ꠢꡀ-ꡳꢂ-ꢳꣲ-ꣷꣻꤊ-ꤥꤰ-ꥆꥠ-ꥼꦄ-ꦲꧏꨀ-ꨨꩀ-ꩂꩄ-ꩋꩠ-ꩶꩺꪀ-ꪯꪱꪵꪶꪹ-ꪽꫀꫂꫛ-ꫝꫠ-ꫪꫲ-ꫴꬁ-ꬆꬉ-ꬎꬑ-ꬖꬠ-ꬦꬨ-ꬮꯀ-ꯢ가-힣ힰ-ퟆퟋ-ퟻ豈-舘並-龎ﬀ-ﬆﬓ-ﬗיִײַ-ﬨשׁ-זּטּ-לּמּנּסּףּפּצּ-ﮱﯓ-ﴽﵐ-ﶏﶒ-ﷇﷰ-ﷻﹰ-ﹴﹶ-ﻼＡ-Ｚａ-ｚｦ-ﾾￂ-ￇￊ-ￏￒ-ￗￚ-ￜ";
  var nonASCIIidentifierChars = "̀-ͯ҃-֑҇-ׇֽֿׁׂׅׄؐ-ؚؠ-ىٲ-ۓۧ-ۨۻ-ۼܰ-݊ࠀ-ࠔࠛ-ࠣࠥ-ࠧࠩ-࠭ࡀ-ࡗࣤ-ࣾऀ-ःऺ-़ा-ॏ॑-ॗॢ-ॣ०-९ঁ-ঃ়া-ৄেৈৗয়-ৠਁ-ਃ਼ਾ-ੂੇੈੋ-੍ੑ੦-ੱੵઁ-ઃ઼ા-ૅે-ૉો-્ૢ-ૣ૦-૯ଁ-ଃ଼ା-ୄେୈୋ-୍ୖୗୟ-ୠ୦-୯ஂா-ூெ-ைொ-்ௗ௦-௯ఁ-ఃె-ైొ-్ౕౖౢ-ౣ౦-౯ಂಃ಼ಾ-ೄೆ-ೈೊ-್ೕೖೢ-ೣ೦-೯ംഃെ-ൈൗൢ-ൣ൦-൯ංඃ්ා-ුූෘ-ෟෲෳิ-ฺเ-ๅ๐-๙ິ-ູ່-ໍ໐-໙༘༙༠-༩༹༵༷ཁ-ཇཱ-྄྆-྇ྍ-ྗྙ-ྼ࿆က-ဩ၀-၉ၧ-ၭၱ-ၴႂ-ႍႏ-ႝ፝-፟ᜎ-ᜐᜠ-ᜰᝀ-ᝐᝲᝳក-ឲ៝០-៩᠋-᠍᠐-᠙ᤠ-ᤫᤰ-᤻ᥑ-ᥭᦰ-ᧀᧈ-ᧉ᧐-᧙ᨀ-ᨕᨠ-ᩓ᩠-᩿᩼-᪉᪐-᪙ᭆ-ᭋ᭐-᭙᭫-᭳᮰-᮹᯦-᯳ᰀ-ᰢ᱀-᱉ᱛ-ᱽ᳐-᳒ᴀ-ᶾḁ-ἕ‌‍‿⁀⁔⃐-⃥⃜⃡-⃰ⶁ-ⶖⷠ-ⷿ〡-〨゙゚Ꙁ-ꙭꙴ-꙽ꚟ꛰-꛱ꟸ-ꠀ꠆ꠋꠣ-ꠧꢀ-ꢁꢴ-꣄꣐-꣙ꣳ-ꣷ꤀-꤉ꤦ-꤭ꤰ-ꥅꦀ-ꦃ꦳-꧀ꨀ-ꨧꩀ-ꩁꩌ-ꩍ꩐-꩙ꩻꫠ-ꫩꫲ-ꫳꯀ-ꯡ꯬꯭꯰-꯹ﬠ-ﬨ︀-️︠-︦︳︴﹍-﹏０-９＿";
  var nonASCIIidentifierStart = new RegExp("[" + nonASCIIidentifierStartChars + "]");
  var nonASCIIidentifier = new RegExp("[" + nonASCIIidentifierStartChars + nonASCIIidentifierChars + "]");

  // Whether a single character denotes a newline.

  var newline = /[\n\r\u2028\u2029]/;

  // Matches a whole line break (where CRLF is considered a single
  // line break). Used to count lines.

  var lineBreak = /\r\n|[\n\r\u2028\u2029]/g;

  // Test whether a given character code starts an identifier.

  var isIdentifierStart = exports.isIdentifierStart = function (code) {
    if (code < 65) return code === 36;
    if (code < 91) return true;
    if (code < 97) return code === 95;
    if (code < 123) return true;
    return code >= 170 && nonASCIIidentifierStart.test(String.fromCharCode(code));
  };

  // Test whether a given character is part of an identifier.

  var isIdentifierChar = exports.isIdentifierChar = function (code) {
    if (code < 48) return code === 36;
    if (code < 58) return true;
    if (code < 65) return false;
    if (code < 91) return true;
    if (code < 97) return code === 95;
    if (code < 123) return true;
    return code >= 170 && nonASCIIidentifier.test(String.fromCharCode(code));
  };

  // ## Tokenizer

  // These are used when `options.locations` is on, for the
  // `tokStartLoc` and `tokEndLoc` properties.

  function Position() {
    this.line = tokCurLine;
    this.column = tokPos - tokLineStart;
  }

  // Reset the token state. Used at the start of a parse.

  function initTokenState() {
    tokCurLine = 1;
    tokPos = tokLineStart = 0;
    tokRegexpAllowed = true;
    skipSpace();
  }

  // Called at the end of every token. Sets `tokEnd`, `tokVal`, and
  // `tokRegexpAllowed`, and skips the space after the token, so that
  // the next one's `tokStart` will point at the right position.

  function finishToken(type, val) {
    tokEnd = tokPos;
    if (options.locations) tokEndLoc = new Position();
    tokType = type;
    skipSpace();
    tokVal = val;
    tokRegexpAllowed = type.beforeExpr;
  }

  function skipBlockComment() {
    var startLoc = options.onComment && options.locations && new Position();
    var start = tokPos,
        end = input.indexOf("*/", tokPos += 2);
    if (end === -1) raise(tokPos - 2, "Unterminated comment");
    tokPos = end + 2;
    if (options.locations) {
      lineBreak.lastIndex = start;
      var match;
      while ((match = lineBreak.exec(input)) && match.index < tokPos) {
        ++tokCurLine;
        tokLineStart = match.index + match[0].length;
      }
    }
    if (options.onComment) options.onComment(true, input.slice(start + 2, end), start, tokPos, startLoc, options.locations && new Position());
  }

  function skipLineComment() {
    var start = tokPos;
    var startLoc = options.onComment && options.locations && new Position();
    var ch = input.charCodeAt(tokPos += 2);
    while (tokPos < inputLen && ch !== 10 && ch !== 13 && ch !== 8232 && ch !== 8233) {
      ++tokPos;
      ch = input.charCodeAt(tokPos);
    }
    if (options.onComment) options.onComment(false, input.slice(start + 2, tokPos), start, tokPos, startLoc, options.locations && new Position());
  }

  // Called at the start of the parse and after every token. Skips
  // whitespace and comments, and.

  function skipSpace() {
    while (tokPos < inputLen) {
      var ch = input.charCodeAt(tokPos);
      if (ch === 32) {
        // ' '
        ++tokPos;
      } else if (ch === 13) {
        ++tokPos;
        var next = input.charCodeAt(tokPos);
        if (next === 10) {
          ++tokPos;
        }
        if (options.locations) {
          ++tokCurLine;
          tokLineStart = tokPos;
        }
      } else if (ch === 10 || ch === 8232 || ch === 8233) {
        ++tokPos;
        if (options.locations) {
          ++tokCurLine;
          tokLineStart = tokPos;
        }
      } else if (ch > 8 && ch < 14) {
        ++tokPos;
      } else if (ch === 47) {
        // '/'
        var next = input.charCodeAt(tokPos + 1);
        if (next === 42) {
          // '*'
          skipBlockComment();
        } else if (next === 47) {
          // '/'
          skipLineComment();
        } else break;
      } else if (ch === 160) {
        // '\xa0'
        ++tokPos;
      } else if (ch >= 5760 && nonASCIIwhitespace.test(String.fromCharCode(ch))) {
        ++tokPos;
      } else {
        break;
      }
    }
  }

  // ### Token reading

  // This is the function that is called to fetch the next token. It
  // is somewhat obscure, because it works in character codes rather
  // than characters, and because operator parsing has been inlined
  // into it.
  //
  // All in the name of speed.
  //
  // The `forceRegexp` parameter is used in the one case where the
  // `tokRegexpAllowed` trick does not work. See `parseStatement`.

  function readToken_dot() {
    var next = input.charCodeAt(tokPos + 1);
    if (next >= 48 && next <= 57) return readNumber(true);
    var next2 = input.charCodeAt(tokPos + 2);
    if (options.ecmaVersion >= 6 && next === 46 && next2 === 46) {
      // 46 = dot '.'
      tokPos += 3;
      return finishToken(_ellipsis);
    } else {
      ++tokPos;
      return finishToken(_dot);
    }
  }

  function readToken_slash() {
    // '/'
    var next = input.charCodeAt(tokPos + 1);
    if (tokRegexpAllowed) {
      ++tokPos;return readRegexp();
    }
    if (next === 61) return finishOp(_assign, 2);
    return finishOp(_slash, 1);
  }

  function readToken_mult_modulo() {
    // '%*'
    var next = input.charCodeAt(tokPos + 1);
    if (next === 61) return finishOp(_assign, 2);
    return finishOp(_multiplyModulo, 1);
  }

  function readToken_pipe_amp(code) {
    // '|&'
    var next = input.charCodeAt(tokPos + 1);
    if (next === code) return finishOp(code === 124 ? _logicalOR : _logicalAND, 2);
    if (next === 61) return finishOp(_assign, 2);
    return finishOp(code === 124 ? _bitwiseOR : _bitwiseAND, 1);
  }

  function readToken_caret() {
    // '^'
    var next = input.charCodeAt(tokPos + 1);
    if (next === 61) return finishOp(_assign, 2);
    return finishOp(_bitwiseXOR, 1);
  }

  function readToken_plus_min(code) {
    // '+-'
    var next = input.charCodeAt(tokPos + 1);
    if (next === code) {
      if (next == 45 && input.charCodeAt(tokPos + 2) == 62 && newline.test(input.slice(lastEnd, tokPos))) {
        // A `-->` line comment
        tokPos += 3;
        skipLineComment();
        skipSpace();
        return readToken();
      }
      return finishOp(_incDec, 2);
    }
    if (next === 61) return finishOp(_assign, 2);
    return finishOp(_plusMin, 1);
  }

  function readToken_lt_gt(code) {
    // '<>'
    var next = input.charCodeAt(tokPos + 1);
    var size = 1;
    if (next === code) {
      size = code === 62 && input.charCodeAt(tokPos + 2) === 62 ? 3 : 2;
      if (input.charCodeAt(tokPos + size) === 61) return finishOp(_assign, size + 1);
      return finishOp(_bitShift, size);
    }
    if (next == 33 && code == 60 && input.charCodeAt(tokPos + 2) == 45 && input.charCodeAt(tokPos + 3) == 45) {
      // `<!--`, an XML-style comment that should be interpreted as a line comment
      tokPos += 4;
      skipLineComment();
      skipSpace();
      return readToken();
    }
    if (next === 61) size = input.charCodeAt(tokPos + 2) === 61 ? 3 : 2;
    return finishOp(_relational, size);
  }

  function readToken_eq_excl(code) {
    // '=!'
    var next = input.charCodeAt(tokPos + 1);
    if (next === 61) return finishOp(_equality, input.charCodeAt(tokPos + 2) === 61 ? 3 : 2);
    return finishOp(code === 61 ? _eq : _prefix, 1);
  }

  function getTokenFromCode(code) {
    switch (code) {
      // The interpretation of a dot depends on whether it is followed
      // by a digit or another two dots.
      case 46:
        // '.'
        return readToken_dot();

      // Punctuation tokens.
      case 40:
        ++tokPos;return finishToken(_parenL);
      case 41:
        ++tokPos;return finishToken(_parenR);
      case 59:
        ++tokPos;return finishToken(_semi);
      case 44:
        ++tokPos;return finishToken(_comma);
      case 91:
        ++tokPos;return finishToken(_bracketL);
      case 93:
        ++tokPos;return finishToken(_bracketR);
      case 123:
        ++tokPos;return finishToken(_braceL);
      case 125:
        ++tokPos;return finishToken(_braceR);
      case 58:
        ++tokPos;return finishToken(_colon);
      case 63:
        ++tokPos;return finishToken(_question);

      // '0x' is a hexadecimal number.
      case 48:
        // '0'
        var next = input.charCodeAt(tokPos + 1);
        if (next === 120 || next === 88) return readHexNumber();
      // Anything else beginning with a digit is an integer, octal
      // number, or float.
      /* falls through */
      case 49:
      case 50:
      case 51:
      case 52:
      case 53:
      case 54:
      case 55:
      case 56:
      case 57:
        // 1-9
        return readNumber(false);

      // Quotes produce strings.
      case 34:
      case 39:
        // '"', "'"
        return readString(code);

      // Operators are parsed inline in tiny state machines. '=' (61) is
      // often referred to. `finishOp` simply skips the amount of
      // characters it is given as second argument, and returns a token
      // of the type given by its first argument.

      case 47:
        // '/'
        return readToken_slash();

      case 37:
      case 42:
        // '%*'
        return readToken_mult_modulo();

      case 124:
      case 38:
        // '|&'
        return readToken_pipe_amp(code);

      case 94:
        // '^'
        return readToken_caret();

      case 43:
      case 45:
        // '+-'
        return readToken_plus_min(code);

      case 60:
      case 62:
        // '<>'
        return readToken_lt_gt(code);

      case 61:
      case 33:
        // '=!'
        return readToken_eq_excl(code);

      case 126:
        // '~'
        return finishOp(_prefix, 1);
    }

    return false;
  }

  function readToken(forceRegexp) {
    if (!forceRegexp) tokStart = tokPos;else tokPos = tokStart + 1;
    if (options.locations) tokStartLoc = new Position();
    if (forceRegexp) return readRegexp();
    if (tokPos >= inputLen) return finishToken(_eof);

    var code = input.charCodeAt(tokPos);
    // Identifier or keyword. '\uXXXX' sequences are allowed in
    // identifiers, so '\' also dispatches to that.
    if (isIdentifierStart(code) || code === 92 /* '\' */) return readWord();

    var tok = getTokenFromCode(code);

    if (tok === false) {
      // If we are here, we either found a non-ASCII identifier
      // character, or something that's entirely disallowed.
      var ch = String.fromCharCode(code);
      if (ch === "\\" || nonASCIIidentifierStart.test(ch)) return readWord();
      raise(tokPos, "Unexpected character '" + ch + "'");
    }
    return tok;
  }

  function finishOp(type, size) {
    var str = input.slice(tokPos, tokPos + size);
    tokPos += size;
    finishToken(type, str);
  }

  // Parse a regular expression. Some context-awareness is necessary,
  // since a '/' inside a '[]' set does not end the expression.

  function readRegexp() {
    var content = "",
        escaped,
        inClass,
        start = tokPos;
    for (;;) {
      if (tokPos >= inputLen) raise(start, "Unterminated regular expression");
      var ch = input.charAt(tokPos);
      if (newline.test(ch)) raise(start, "Unterminated regular expression");
      if (!escaped) {
        if (ch === "[") inClass = true;else if (ch === "]" && inClass) inClass = false;else if (ch === "/" && !inClass) break;
        escaped = ch === "\\";
      } else escaped = false;
      ++tokPos;
    }
    var content = input.slice(start, tokPos);
    ++tokPos;
    // Need to use `readWord1` because '\uXXXX' sequences are allowed
    // here (don't ask).
    var mods = readWord1();
    if (mods && !/^[gmsiy]*$/.test(mods)) raise(start, "Invalid regular expression flag");
    try {
      var value = new RegExp(content, mods);
    } catch (e) {
      if (e instanceof SyntaxError) raise(start, "Error parsing regular expression: " + e.message);
      raise(e);
    }
    return finishToken(_regexp, value);
  }

  // Read an integer in the given radix. Return null if zero digits
  // were read, the integer value otherwise. When `len` is given, this
  // will return `null` unless the integer has exactly `len` digits.

  function readInt(radix, len) {
    var start = tokPos,
        total = 0;
    for (var i = 0, e = len == null ? Infinity : len; i < e; ++i) {
      var code = input.charCodeAt(tokPos),
          val;
      if (code >= 97) val = code - 97 + 10; // a
      else if (code >= 65) val = code - 65 + 10; // A
      else if (code >= 48 && code <= 57) val = code - 48; // 0-9
      else val = Infinity;
      if (val >= radix) break;
      ++tokPos;
      total = total * radix + val;
    }
    if (tokPos === start || len != null && tokPos - start !== len) return null;

    return total;
  }

  function readHexNumber() {
    tokPos += 2; // 0x
    var val = readInt(16);
    if (val == null) raise(tokStart + 2, "Expected hexadecimal number");
    if (isIdentifierStart(input.charCodeAt(tokPos))) raise(tokPos, "Identifier directly after number");
    return finishToken(_num, val);
  }

  // Read an integer, octal integer, or floating-point number.

  function readNumber(startsWithDot) {
    var start = tokPos,
        isFloat = false,
        octal = input.charCodeAt(tokPos) === 48;
    if (!startsWithDot && readInt(10) === null) raise(start, "Invalid number");
    if (input.charCodeAt(tokPos) === 46) {
      ++tokPos;
      readInt(10);
      isFloat = true;
    }
    var next = input.charCodeAt(tokPos);
    if (next === 69 || next === 101) {
      // 'eE'
      next = input.charCodeAt(++tokPos);
      if (next === 43 || next === 45) ++tokPos; // '+-'
      if (readInt(10) === null) raise(start, "Invalid number");
      isFloat = true;
    }
    if (isIdentifierStart(input.charCodeAt(tokPos))) raise(tokPos, "Identifier directly after number");

    var str = input.slice(start, tokPos),
        val;
    if (isFloat) val = parseFloat(str);else if (!octal || str.length === 1) val = parseInt(str, 10);else if (/[89]/.test(str) || strict) raise(start, "Invalid number");else val = parseInt(str, 8);
    return finishToken(_num, val);
  }

  // Read a string value, interpreting backslash-escapes.

  function readString(quote) {
    tokPos++;
    var out = "";
    for (;;) {
      if (tokPos >= inputLen) raise(tokStart, "Unterminated string constant");
      var ch = input.charCodeAt(tokPos);
      if (ch === quote) {
        ++tokPos;
        return finishToken(_string, out);
      }
      if (ch === 92) {
        // '\'
        ch = input.charCodeAt(++tokPos);
        var octal = /^[0-7]+/.exec(input.slice(tokPos, tokPos + 3));
        if (octal) octal = octal[0];
        while (octal && parseInt(octal, 8) > 255) octal = octal.slice(0, -1);
        if (octal === "0") octal = null;
        ++tokPos;
        if (octal) {
          if (strict) raise(tokPos - 2, "Octal literal in strict mode");
          out += String.fromCharCode(parseInt(octal, 8));
          tokPos += octal.length - 1;
        } else {
          switch (ch) {
            case 110:
              out += "\n";break; // 'n' -> '\n'
            case 114:
              out += "\r";break; // 'r' -> '\r'
            case 120:
              out += String.fromCharCode(readHexChar(2));break; // 'x'
            case 117:
              out += String.fromCharCode(readHexChar(4));break; // 'u'
            case 85:
              out += String.fromCharCode(readHexChar(8));break; // 'U'
            case 116:
              out += "\t";break; // 't' -> '\t'
            case 98:
              out += "\b";break; // 'b' -> '\b'
            case 118:
              out += "\u000b";break; // 'v' -> '\u000b'
            case 102:
              out += "\f";break; // 'f' -> '\f'
            case 48:
              out += "\u0000";break; // 0 -> '\0'
            case 13:
              if (input.charCodeAt(tokPos) === 10) ++tokPos; // '\r\n'
            /* falls through */
            case 10:
              // ' \n'
              if (options.locations) {
                tokLineStart = tokPos;++tokCurLine;
              }
              break;
            default:
              out += String.fromCharCode(ch);break;
          }
        }
      } else {
        if (ch === 13 || ch === 10 || ch === 8232 || ch === 8233) raise(tokStart, "Unterminated string constant");
        out += String.fromCharCode(ch); // '\'
        ++tokPos;
      }
    }
  }

  // Used to read character escape sequences ('\x', '\u', '\U').

  function readHexChar(len) {
    var n = readInt(16, len);
    if (n === null) raise(tokStart, "Bad character escape sequence");
    return n;
  }

  // Used to signal to callers of `readWord1` whether the word
  // contained any escape sequences. This is needed because words with
  // escape sequences must not be interpreted as keywords.

  var containsEsc;

  // Read an identifier, and return it as a string. Sets `containsEsc`
  // to whether the word contained a '\u' escape.
  //
  // Only builds up the word character-by-character when it actually
  // containeds an escape, as a micro-optimization.

  function readWord1() {
    containsEsc = false;
    var word,
        first = true,
        start = tokPos;
    for (;;) {
      var ch = input.charCodeAt(tokPos);
      if (isIdentifierChar(ch)) {
        if (containsEsc) word += input.charAt(tokPos);
        ++tokPos;
      } else if (ch === 92) {
        // "\"
        if (!containsEsc) word = input.slice(start, tokPos);
        containsEsc = true;
        if (input.charCodeAt(++tokPos) != 117) // "u"
          raise(tokPos, "Expecting Unicode escape sequence \\uXXXX");
        ++tokPos;
        var esc = readHexChar(4);
        var escStr = String.fromCharCode(esc);
        if (!escStr) raise(tokPos - 1, "Invalid Unicode escape");
        if (!(first ? isIdentifierStart(esc) : isIdentifierChar(esc))) raise(tokPos - 4, "Invalid Unicode escape");
        word += escStr;
      } else {
        break;
      }
      first = false;
    }
    return containsEsc ? word : input.slice(start, tokPos);
  }

  // Read an identifier or keyword token. Will check for reserved
  // words when necessary.

  function readWord() {
    var word = readWord1();
    var type = _name;
    if (!containsEsc && isKeyword(word)) type = keywordTypes[word];
    return finishToken(type, word);
  }


  module.exports = { tokenize: exports.tokenize };
});
define("rebound-compiler/rebound-compiler", ["exports", "rebound-compiler/compiler"], function (exports, _reboundCompilerCompiler) {
  "use strict";

  var _interopRequire = function (obj) {
    return obj && (obj["default"] || obj);
  };

  var compile = _interopRequire(_reboundCompilerCompiler);

  exports.compile = compile;
});
define("rebound-data/computed-property", ["exports", "module", "property-compiler/property-compiler", "rebound-runtime/utils"], function (exports, module, _propertyCompilerPropertyCompiler, _reboundRuntimeUtils) {
  "use strict";

  var _interopRequire = function (obj) {
    return obj && (obj["default"] || obj);
  };

  var propertyCompiler = _interopRequire(_propertyCompilerPropertyCompiler);

  var $ = _interopRequire(_reboundRuntimeUtils);

  // If Rebound Runtime has already been run, throw error
  if (Rebound.ComputedProperty) {
    throw "Rebound ComputedProperty is already loaded on the page!";
  }
  // If Backbone hasn't been started yet, throw error
  if (!window.Backbone) {
    throw "Backbone must be on the page for Rebound to load.";
  }

  // Returns true if str starts with test
  function startsWith(str, test) {
    if (str === test) return true;
    return str.substring(0, test.length + 1) === test + ".";
  }

  var ComputedProperty = function (prop, options) {
    if (!_.isFunction(prop)) return console.error("ComputedProperty constructor must be passed a function!", prop, "Found instead.");
    options = options || {};
    this.cid = _.uniqueId("computedPropety");
    this.name = options.name;
    this.returnType = null;
    this.__observers = {};
    this.helpers = {};
    this.waiting = {};
    this.isChanging = false;
    this.isDirty = true;
    this.func = prop;
    _.bindAll(this, "onModify");
    this.deps = propertyCompiler.compile(prop, this.name);

    // Create lineage to pass to our cache objects
    var lineage = {
      parent: this.setParent(options.parent || this),
      root: this.setRoot(options.root || options.parent || this),
      path: this.__path = options.path || this.__path
    };

    // Results Cache Objects
    // These models will never be re-created for the lifetime of the Computed Proeprty
    // On Recompute they are updated with new values.
    // On Change their new values are pushed to the object it is tracking
    this.cache = {
      model: new Rebound.Model({}, lineage),
      collection: new Rebound.Collection([], lineage),
      value: undefined
    };

    this.wire();
  };

  _.extend(ComputedProperty.prototype, Backbone.Events, {

    isComputedProperty: true,
    isData: true,
    __path: function () {
      return "";
    },

    // Attached to listen to all events where this Computed Property's dependancies
    // are stored. See wire(). Will re-evaluate any computed properties that
    // depend on the changed data value which triggered this callback.
    onRecompute: function (type, model, collection, options) {
      // Notifies all computed properties in the dependants array to recompute.
      // Marks everyone as dirty and then calls them.
      var notify = function (dependants) {
        _.each(dependants, function (prop) {
          prop.isDirty = 1;
        });
        _.invoke(dependants, "call");
      };

      var shortcircuit = { change: 1, sort: 1, request: 1, destroy: 1, sync: 1, error: 1, invalid: 1, route: 1 };
      if (shortcircuit[type] || !model.isData) return;
      model || (model = {});
      collection || (collection = {});
      options || (options = {});
      !collection.isData && (options = collection) && (collection = model);
      var push = Array.prototype.push,
          toRecompute = [],
          path,
          vector;
      vector = path = collection.__path().replace(/\.?\[.*\]/ig, ".@each");

      // If a reset event on a Model, check for computed properties that depend
      // on each changed attribute's full path.
      if (type === "reset" && options.previousAttributes) {
        _.each(options.previousAttributes, function (value, key) {
          vector = path + (path && ".") + key;
          _.each(this.__computedDeps, function (dependants, dependancy) {
            startsWith(vector, dependancy) && push.apply(toRecompute, dependants);
          }, this);
        }, this);
      }

      // If a reset event on a Collction, check for computed properties that depend
      // on anything inside that collection.
      else if (type === "reset" && options.previousModels) {
        _.each(this.__computedDeps, function (dependants, dependancy) {
          startsWith(dependancy, vector) && push.apply(toRecompute, dependants);
        }, this);
      }

      // If an add or remove event, check for computed properties that depend on
      // anything inside that collection or that contains that collection.
      else if (type === "add" || type === "remove") {
        _.each(this.__computedDeps, function (dependants, dependancy) {
          if (startsWith(dependancy, vector) || startsWith(vector, dependancy)) push.apply(toRecompute, dependants);
        }, this);
      }

      // If a change event, trigger anything that depends on that changed path.
      else if (type.indexOf("change:") === 0) {
        vector = type.replace("change:", "").replace(/\.?\[.*\]/ig, ".@each");
        _.each(this.__computedDeps, function (dependants, dependancy) {
          startsWith(vector, dependancy) && push.apply(toRecompute, dependants);
        });
      }

      return notify(toRecompute);
    },

    // Called when a Computed Property's active cache object changes.
    // Pushes any changes to Computed Property that returns a data object back to
    // the original object.
    onModify: function (type, model, collection, options) {
      var shortcircuit = { sort: 1, request: 1, destroy: 1, sync: 1, error: 1, invalid: 1, route: 1 };
      if (shortcircuit[type] || ~type.indexOf("change:") || this.isDirty) return;
      model || (model = {});
      collection || (collection = {});
      options || (options = {});
      !collection.isData && _.isObject(collection) && (options = collection) && (collection = model);
      var src = this;
      var path = collection.__path().replace(src.__path(), "").replace(/^\./, "");
      var dest = this.tracking.get(path);
      if (_.isUndefined(dest)) return;

      if (type === "change") dest.set && dest.set(model.changedAttributes());else if (type === "reset") dest.reset && dest.reset(model);else if (type === "add") dest.add && dest.add(model);else if (type === "remove") dest.remove && dest.remove(model);
      // TODO: Add sort
    },

    // When we receive a new model to set in our cache, unbind the tracker from
    // the previous cache object, sync the objects' cids so helpers think they
    // are the same object, save a referance to the object we are tracking,
    // and re-bind our onModify hook.
    track: function (object) {
      var target = this.value();
      this.off("all", this.onModify);
      if (!object || !target || !target.isData || !object.isData) return;
      target._cid || (target._cid = target.cid);
      object._cid || (object._cid = object.cid);
      target.cid = object.cid;
      this.tracking = object;
      this.listenTo(target, "all", this.onModify);
    },

    // Adds a litener to the root object and tells it what properties this
    // Computed Property depend on.
    // The listener will re-compute this Computed Property when any are changed.
    wire: function () {
      var root = this.__root__;
      var context = this.__parent__;
      root.__computedDeps || (root.__computedDeps = {});
      _.each(this.deps, function (path) {
        // Find actual path from relative paths
        var split = $.splitPath(path);
        while (split[0] === "@parent") {
          context = context.__parent__;
          split.shift();
        }

        path = context.__path().replace(/\.?\[.*\]/ig, ".@each");
        path = path + (path && ".") + split.join(".");

        // Add ourselves as dependants
        root.__computedDeps[path] || (root.__computedDeps[path] = []);
        root.__computedDeps[path].push(this);
      }, this);

      // Ensure we only have one listener per Model at a time.
      context.off("all", this.onRecompute).on("all", this.onRecompute);
    },

    // Call this computed property like you would with Function.call()
    call: function () {
      var args = Array.prototype.slice.call(arguments),
          context = args.shift();
      return this.apply(context, args);
    },

    // Call this computed property like you would with Function.apply()
    // Only properties that are marked as dirty and are not already computing
    // themselves are evaluated to prevent cyclic callbacks. If any dependants
    // aren't finished computeding, we add ourselved to their waiting list.
    // Vanilla objects returned from the function are promoted to Rebound Objects.
    // Then, set the proper return type for future fetches from the cache and set
    // the new computed value. Track changes to the cache to push it back up to
    // the original object and return the value.
    apply: function (context, params) {
      if (!this.isDirty || this.isChanging) return;
      this.isChanging = true;

      var value = this.cache[this.returnType],
          result;

      context || (context = this.__parent__);

      // Check all of our dependancies to see if they are evaluating.
      // If we have a dependancy that is dirty and this isnt its first run,
      // Let this dependancy know that we are waiting for it.
      // It will re-run this Computed Property after it finishes.
      _.each(this.deps, function (dep) {
        var dependancy = context.get(dep, { raw: true });
        if (!dependancy || !dependancy.isComputedProperty) return;
        if (dependancy.isDirty && dependancy.returnType !== null) {
          dependancy.waiting[this.cid] = this;
          return this.isChanging = false;
        }
        delete dependancy.waiting[this.cid];
        // TODO: There can be a check here looking for cyclic dependancies.
      }, this);
      if (!this.isChanging) return;

      result = this.func.apply(context, params);

      // Promote vanilla objects to Rebound Data keeping the smae original objects
      if (_.isArray(result)) result = new Rebound.Collection(result, { clone: false });else if (_.isObject(result) && !result.isData) result = new Rebound.Model(result, { clone: false });

      // If result is undefined, reset our cache item
      if (_.isUndefined(result) || _.isNull(result)) {
        this.returnType = "value";
        this.isCollection = this.isModel = false;
        this.set(undefined);
      }
      // Set result and return types, bind events
      else if (result.isCollection) {
        this.returnType = "collection";
        this.isCollection = true;
        this.isModel = false;
        this.set(result);
      } else if (result.isModel) {
        this.returnType = "model";
        this.isCollection = false;
        this.isModel = true;
        this.reset(result);
      } else {
        this.returnType = "value";
        this.isCollection = this.isModel = false;
        this.reset(result);
      }

      this.track(result);

      return this.value();
    },

    // Get from the Computed Property's cache
    get: function (key, options) {
      var value = this.value();
      options || (options = {});
      if (this.returnType === "value") return console.error("Called get on the `" + this.name + "` computed property which returns a primitive value.");
      return value.get(key, options);
    },

    // Set the Computed Property's cache to a new value and trigger appropreate events.
    // Changes will propagate back to the original object if a Rebound Data Object and re-compute.
    // If Computed Property returns a value, all downstream dependancies will re-compute.
    set: function (key, val, options) {
      if (this.returnType === null) return undefined;
      options || (options = {});
      var attrs = key;
      var value = this.value();
      if (this.returnType === "model") {
        if (typeof key === "object") {
          attrs = key.isModel ? key.attributes : key;
          options = val;
        } else {
          (attrs = {})[key] = val;
        }
      }
      if (this.returnType !== "model") options = val || {};
      attrs = attrs && attrs.isComputedProperty ? attrs.value() : attrs;

      // If a new value, set it and trigger events
      if (this.returnType === "value" && this.cache.value !== attrs) {
        this.cache.value = attrs;
        if (!options.quiet) {
          // If set was called not through computedProperty.call(), this is a fresh new event burst.
          if (!this.isDirty && !this.isChanging) this.__parent__.changed = {};
          this.__parent__.changed[this.name] = attrs;
          this.trigger("change", this.__parent__);
          this.trigger("change:" + this.name, this.__parent__, attrs);
          delete this.__parent__.changed[this.name];
        }
      } else if (this.returnType !== "value" && options.reset) key = value.reset(attrs, options);else if (this.returnType !== "value") key = value.set(attrs, options);
      this.isDirty = this.isChanging = false;

      // Call all reamining computed properties waiting for this value to resolve.
      _.each(this.waiting, function (prop) {
        prop && prop.call();
      });

      return key;
    },

    // Return the current value from the cache, running if first run.
    value: function () {
      if (_.isNull(this.returnType)) this.apply();
      return this.cache[this.returnType];
    },

    // Reset the current value in the cache, running if first run.
    reset: function (obj, options) {
      if (_.isNull(this.returnType)) return; // First run
      options || (options = {});
      options.reset = true;
      return this.set(obj, options);
    },

    // Cyclic dependancy safe toJSON method.
    toJSON: function () {
      if (this._isSerializing) return this.cid;
      var val = this.value();
      this._isSerializing = true;
      var json = val && _.isFunction(val.toJSON) ? val.toJSON() : val;
      this._isSerializing = false;
      return json;
    }

  });

  module.exports = ComputedProperty;
});
define("rebound-runtime/context", ["exports", "module", "rebound-runtime/utils", "rebound-data/rebound-data"], function (exports, module, _reboundRuntimeUtils, _reboundDataReboundData) {
  "use strict";

  var _interopRequire = function (obj) {
    return obj && (obj["default"] || obj);
  };

  var $ = _interopRequire(_reboundRuntimeUtils);

  var Model = _reboundDataReboundData.Model;


  // New Rebound Context
  var Context = Model.extend({

    listen: function () {
      // Listen to relevent data change events
      this.listenTo(this, "change", this._onModelChange);
      this.listenTo(this, "add remove", this._onCollectionChange);
      this.listenTo(this, "reset", this._onReset);
    },

    _onReset: function (data, options) {
      if (data && data.isModel) {
        return this._onModelChange(data, options);
      } else if (data.isCollection) {
        return this._onCollectionChange(data, options);
      }
    },

    _onModelChange: function (model, options) {
      var changed = model.changedAttributes();
      if (changed) this._notifySubtree(model, changed, "model");
    },

    _onCollectionChange: function (model, collection, options) {
      var changed = {},
          that = this;
      if (model.isCollection) {
        options = collection;
        collection = model;
      }
      changed[collection.__path()] = collection;
      if (collection._timeout) {
        clearTimeout(collection._timeout);
        collection._timeout = undefined;
      }
      collection._timeout = setTimeout(function () {
        that._notifySubtree(that, changed, "collection");
      }, 20);
    },

    _notifySubtree: function _notifySubtree(obj, changed, type) {
      var context = this,
          // This root context
      path = obj.__path(),
          // The path of the modified object relative to the root context
      parts = $.splitPath(path),
          // Array of parts of the modified object's path: test[1].whatever -> ['test', '1', 'whatever']
      keys = _.keys(changed),
          // Array of all changed keys
      i = 0,
          len = parts.length,
          paths,
          triggers;

      // Call notify on every object down the data tree starting at the root and all the way down element that triggered the change
      for (i; i <= len; i++) {
        // Reset paths for each data layer
        paths = [];
        triggers = [];

        // For every key changed
        _.each(keys, function (attr) {
          // Constructs paths variable relative to current data element
          paths.push(((path && path + "." || "") + attr).replace(context.__path(), "").replace(/\[([^\]]+)\]/g, ".$1").replace(/^\./, ""));
          paths.push(((path && path + "." || "") + attr).replace(context.__path(), "").replace(/\[[^\]]+\]/g, ".@each").replace(/^\./, ""));
          paths = _.uniq(paths);
        });

        // Call all listeners
        this.notify(context, paths, type);

        // If not at end of path parts, get the next data object
        context = i === len || context.isModel && context.get(parts[i]) || context.isCollection && context.at(parts[i]);
        if (context === undefined) {
          break;
        }
      }
    },
    notify: function notify(obj, paths, type) {
      // If path is not an array of keys, wrap it in array
      paths = !_.isArray(paths) ? [paths] : paths;

      // For each path, alert each observer and call its callback
      _.each(paths, function (path) {
        _.each(obj.__observers, function (observers, obsPath) {
          // Trigger all partial or exact observer matches
          if (obsPath === path || obsPath.indexOf(path + ".") === 0 || path.indexOf(obsPath + ".") === 0) {
            _.each(observers, function (callback, index) {
              // If this is a collection change (add, sort, remove) trigger everything, otherwise only trigger property change callbacks
              if (_.isFunction(callback) && (callback.type !== "collection" || type === "collection")) {
                callback();
              }
            });
          }
        });
      });
    }
  });

  module.exports = Context;
});
define("rebound-data/model", ["exports", "module", "rebound-data/computed-property", "rebound-runtime/utils"], function (exports, module, _reboundDataComputedProperty, _reboundRuntimeUtils) {
  "use strict";

  var _interopRequire = function (obj) {
    return obj && (obj["default"] || obj);
  };

  var ComputedProperty = _interopRequire(_reboundDataComputedProperty);

  var $ = _interopRequire(_reboundRuntimeUtils);

  // If Rebound Runtime has already been run, throw error
  if (Rebound.Model) {
    throw "Rebound Model is already loaded on the page!";
  }
  // If Backbone hasn't been started yet, throw error
  if (!window.Backbone) {
    throw "Backbone must be on the page for Rebound to load.";
  }

  function pathGenerator(parent, key) {
    return function () {
      var path = parent.__path();
      return path + (path === "" ? "" : ".") + key;
    };
  }

  var Model = Backbone.Model.extend({

    isModel: true,
    isData: true,

    __path: function () {
      return "";
    },

    constructor: function (attributes, options) {
      var model;

      attributes || (attributes = {});
      model = attributes || {};
      attributes.isModel && (attributes = attributes.attributes);
      options || (options = {});
      this.helpers = {};
      this.defaults = this.defaults || {};

      // Set lineage
      this.setParent(options.parent || this);
      this.setRoot(options.root || this);
      this.__path = options.path || this.__path;

      Backbone.Model.call(this, attributes, options);
    },

    toggle: function (attr, options) {
      options = options ? _.clone(options) : {};
      var val = this.get(attr);
      if (!_.isBoolean(val)) console.error("Tried to toggle non-boolean value " + attr + "!", this);
      return this.set(attr, !val, options);
    },

    reset: function (obj, options) {
      var changed = {};

      options || (options = {});
      options.reset = true;
      obj = obj && obj.isModel && obj.attributes || obj || {};
      options.previousAttributes = _.clone(this.attributes);

      // Iterate over attributes setting properties to obj, default or clearing them
      _.each(this.attributes, function (value, key, model) {
        if (_.isUndefined(value)) {
          obj[key] && (changed[key] = obj[key]);
        } else if (key === this.idAttribute || value && value.isComputedProperty) return;else if (value.isCollection || value.isModel) {
          value.reset(obj[key] || [], { silent: true });
          !_.isEmpty(value.changed) && (changed[key] = value.changed);
        } else if (obj.hasOwnProperty(key)) {
          if (value !== obj[key]) changed[key] = obj[key];
        } else if (this.defaults.hasOwnProperty(key) && !_.isFunction(this.defaults[key])) {
          obj[key] = this.defaults[key];
          if (value !== obj[key]) changed[key] = obj[key];
        } else {
          changed[key] = undefined;
          this.unset(key, { silent: true });
        }
      }, this);

      // Any unset changed values will be set to obj[key]
      _.each(obj, function (value, key, obj) {
        changed[key] = changed[key] || obj[key];
      });

      // Reset our model
      obj = this.set(obj, _.extend({}, options, { silent: true, reset: false }));

      // Trigger custom reset event
      this.changed = changed;
      if (!options.silent) this.trigger("reset", this, options);

      // Return new values
      return obj;
    },

    get: function (key, options) {
      // Split the path at all '.', '[' and ']' and find the value referanced.
      var parts = $.splitPath(key),
          result = this,
          l = parts.length,
          i = 0;
      options = _.defaults(options || {}, { raw: false });

      if (_.isUndefined(key) || _.isNull(key)) return key;

      if (key === "" || parts.length === 0) return result;

      if (parts.length > 0) {
        for (i = 0; i < l; i++) {
          if (result && result.isComputedProperty && options.raw) return result;
          if (result && result && result.isComputedProperty) result = result.value();
          if (_.isUndefined(result) || _.isNull(result)) return result;
          if (parts[i] === "@parent") result = result.__parent__;else if (result.isCollection) result = result.models[parts[i]];else if (result.isModel) result = result.attributes[parts[i]];else if (result && result.hasOwnProperty(parts[i])) result = result[parts[i]];
        }
      }

      if (result && result.isComputedProperty && !options.raw) result = result.value();

      return result;
    },

    // TODO: Moving the head of a data tree should preserve ancestry
    set: function (key, val, options) {
      var attrs,
          attr,
          newKey,
          target,
          destination,
          props = [],
          lineage;

      // Set is able to take a object or a key value pair. Normalize this input.
      if (typeof key === "object") {
        attrs = key.isModel ? key.attributes : key;
        options = val;
      } else {
        (attrs = {})[key] = val;
      }
      options || (options = {});

      // If reset is passed, do a reset instead
      if (options.reset === true) {
        return this.reset(attrs, options);
      }

      if (_.isEmpty(attrs)) {
        return;
      }

      // For each key and value
      _.each(attrs, function (val, key) {
        var paths = $.splitPath(key),
            attr = paths.pop() || ""; // The key        ex: foo[0].bar --> bar
        target = this.get(paths.join(".")), // The element    ex: foo.bar.baz --> foo.bar
        lineage = {
          name: key,
          parent: target,
          root: this.__root__,
          path: pathGenerator(this, key),
          silent: true,
          clone: options.clone
        };

        // If target currently doesnt exist, construct it
        if (_.isUndefined(target)) {
          target = this;
          _.each(paths, function (value) {
            var tmp = target.get(value);
            if (_.isUndefined(tmp)) {
              target.set(value, {});
              tmp = target.get(value);
            }
            target = tmp;
          }, this);
          return target.set(attr, val);
        }

        var destination = target.get(attr, { raw: true }) || {}; // The current value of attr

        // If val is null or undefined, set to defaults
        if (_.isNull(val) || _.isUndefined(val)) val = this.defaults[key];
        if (val && val.isComputedProperty) val = val.value();

        // If val is null, set to undefined
        else if (_.isNull(val) || _.isUndefined(val)) val = undefined;

        // If this function is the same as the current computed property, continue
        else if (destination.isComputedProperty && destination.func === val) return;

        // If this value is a Function, turn it into a Computed Property
        else if (_.isFunction(val)) val = new ComputedProperty(val, lineage);

        // If this is going to be a cyclical dependancy, use the original object, don't make a copy
        else if (val && val.isData && target.hasParent(val)) val = val;

        // If updating an existing object with its respective data type, let Backbone handle the merge
        else if (destination.isComputedProperty || destination.isCollection && (_.isArray(val) || val.isCollection) || destination.isModel && (_.isObject(val) || val.isModel)) {
          return destination.set(val, options);
        }


        // If this value is a Model or Collection, create a new instance of it using its constructor
        // This will keep the defaults from the original, but make a new copy so memory isnt shared between data objects
        // This will also keep this instance of the object in sync with its original
        // TODO: This will override defaults set by this model in favor of the passed in model. Do deep defaults here.
        else if (val.isData && options.clone !== false) val = new val.constructor(val.attributes || val.models, lineage);

        // If this value is an Array, turn it into a collection
        else if (_.isArray(val)) val = new Rebound.Collection(val, lineage); // TODO: Remove global referance

        // If this value is a Object, turn it into a model
        else if (_.isObject(val)) val = new Model(val, lineage);

        // Else val is a primitive value, set it accordingly

        // If val is a data object, let this object know it is now a parent
        this._hasAncestry = val && val.isData || false;

        // Replace the existing value
        return Backbone.Model.prototype.set.call(target, attr, val, options); // TODO: Event cleanup when replacing a model or collection with another value
      }, this);

      return this;
    },

    toJSON: function () {
      if (this._isSerializing) return this.id || this.cid;
      this._isSerializing = true;
      var json = _.clone(this.attributes);
      _.each(json, function (value, name) {
        if (_.isNull(value) || _.isUndefined(value)) {
          return;
        }
        _.isFunction(value.toJSON) && (json[name] = value.toJSON());
      });
      this._isSerializing = false;
      return json;
    }

  });

  module.exports = Model;
});
define("rebound-runtime/env", ["exports", "module", "morph/dom-helper", "rebound-runtime/hooks", "rebound-runtime/helpers"], function (exports, module, _morphDomHelper, _reboundRuntimeHooks, _reboundRuntimeHelpers) {
  "use strict";

  var _interopRequire = function (obj) {
    return obj && (obj["default"] || obj);
  };

  var DOMHelper = _interopRequire(_morphDomHelper);

  var hooks = _interopRequire(_reboundRuntimeHooks);

  var helpers = _interopRequire(_reboundRuntimeHelpers);

  var env = {
    registerPartial: helpers.registerPartial,
    registerHelper: helpers.registerHelper,
    helpers: helpers.helpers,
    hooks: hooks
  };

  env.hydrate = function hydrate(spec, options) {
    // Return a wrapper function that will merge user provided helpers and hooks with our defaults
    return function (data, options) {
      // Ensure we have a well-formed object as var options
      var env = options || {},
          contextElement = data.el || document.documentElement;
      env.helpers = env.helpers || {};
      env.hooks = env.hooks || {};
      env.dom = env.dom || new DOMHelper();

      // Merge our default helpers and hooks with user provided helpers
      env.helpers = _.defaults(env.helpers, helpers.helpers);
      env.hooks = _.defaults(env.hooks, hooks);

      // Call our func with merged helpers and hooks
      return spec.render(data, env, contextElement);
    };
  };

  module.exports = env;
});
define("rebound-data/rebound-data", ["exports", "rebound-data/model", "rebound-data/collection", "rebound-data/computed-property", "rebound-runtime/utils"], function (exports, _reboundDataModel, _reboundDataCollection, _reboundDataComputedProperty, _reboundRuntimeUtils) {
  "use strict";

  var _interopRequire = function (obj) {
    return obj && (obj["default"] || obj);
  };

  var Model = _interopRequire(_reboundDataModel);

  var Collection = _interopRequire(_reboundDataCollection);

  var ComputedProperty = _interopRequire(_reboundDataComputedProperty);

  var $ = _interopRequire(_reboundRuntimeUtils);




  var sharedMethods = {

    propagateEvent: function (type, model) {
      if (this.__parent__ === this) return;
      if (type.indexOf("change:") === 0 && model.isModel) {
        var key,
            path = model.__path().replace(this.__parent__.__path(), "").replace(/^\./, ""),
            changed = model.changedAttributes();
        for (key in changed) {
          arguments[0] = "change:" + path + (path && ".") + key; // jshint ignore:line
          this.__parent__.trigger.apply(this.__parent__, arguments);
        }
        return;
      }
      this.__parent__.trigger.apply(this.__parent__, arguments);
    },

    setParent: function (parent) {
      if (this.__parent__) {
        this.off("all", this.propagate);
      }

      this.__parent__ = parent;
      this._hasAncestry = true;

      // If parent is not self, propagate all events up
      if (parent !== this) this.on("all", parent.propagateEvent);

      return parent;
    },

    // TODO: I dont like this recursively setting elements root when one element's root changes. Fix this.
    setRoot: function (root) {
      var obj = this;
      obj.__root__ = root;
      var val = obj.models || obj.attributes || obj.cache;
      _.each(val, function (value, key) {
        if (value && value.isData) {
          value.setRoot(root);
        }
      });
      return root;
    },

    hasParent: function (obj) {
      var tmp = this;
      while (tmp !== obj) {
        tmp = tmp.__parent__;
        if (_.isUndefined(tmp)) {
          return false;
        }
        if (tmp === obj) {
          return true;
        }
        if (tmp.__parent__ === tmp) {
          return false;
        }
      }
      return true;
    },

    deinitialize: function () {
      // deinitialize current class

      // undelegate events..(events specified as part of event:{})
      if (this.undelegateEvents) {
        this.undelegateEvents();
      }

      // stop listening model events
      if (this.stopListening) {
        this.stopListening();
      }

      // unbind events
      if (this.off) {
        this.off();
      }

      delete this.__parent__;
      delete this.__root__;
      delete this.__path;

      // if data has a dom element associated with it, remove all dom events and the dom referance
      if (this.el) {
        _.each(this.el.__listeners, function (handler, eventType) {
          if (this.el.removeEventListener) {
            this.el.removeEventListener(eventType, handler, false);
          }
          if (this.el.detachEvent) {
            this.el.detachEvent("on" + eventType, handler);
          }
        }, this);

        // Remove all event delegates
        delete this.el.__listeners;
        delete this.el.__events;

        // Recursively remove element lazyvalues
        $(this.el).walkTheDOM(function (el) {
          if (el.__lazyValue && el.__lazyValue.destroy()) {
            n.__lazyValue.destroy();
          }
        });

        // Remove element referances
        delete this.$el;
        delete this.el;
      }

      // Mark it as deinitialized
      this.deinitialized = true;
      // deinitialize subclasses
      if (this.data && this.data.deinitialize) {
        this.data.deinitialize();
      }

      // De-init all models in a collection
      _.each(this.models, function (value, index) {
        if (value && value.deinitialize) {
          value.deinitialize();
        }
      });

      // De-init all attributes in a model
      _.each(this.attributes, function (value, index) {
        if (value && value.deinitialize) {
          value.deinitialize();
        }
      });

      // De-init computed proeprties' cache objects
      if (this.cache) {
        this.cache.collection.deinitialize();
        this.cache.model.deinitialize();
      }

      // clean up references
      this.__observers = {};
      // this.models = [];
      this.data = {};
      // this.attributes = {};
    }
  };

  _.extend(Model.prototype, sharedMethods);
  _.extend(Collection.prototype, sharedMethods);
  _.extend(ComputedProperty.prototype, sharedMethods);


  exports.Model = Model;
  exports.Collection = Collection;
  exports.ComputedProperty = ComputedProperty;
});
define("rebound-runtime/helpers", ["exports", "module", "rebound-runtime/lazy-value", "rebound-runtime/utils"], function (exports, module, _reboundRuntimeLazyValue, _reboundRuntimeUtils) {
  "use strict";

  var _interopRequire = function (obj) {
    return obj && (obj["default"] || obj);
  };

  var LazyValue = _interopRequire(_reboundRuntimeLazyValue);

  var $ = _interopRequire(_reboundRuntimeUtils);




  var helpers = {},
      partials = {};

  helpers.registerPartial = function (name, func) {
    if (func && func.isHTMLBars && typeof name === "string") {
      partials[name] = func;
    }
  };

  // lookupHelper returns the given function from the helpers object. Manual checks prevent user from overriding reserved words.
  helpers.lookupHelper = function (name, env, context) {
    env = env || {};

    name = $.splitPath(name)[0];

    // If a reserved helpers, return it
    if (name === "attribute") {
      return this.attribute;
    }
    if (name === "if") {
      return this["if"];
    }
    if (name === "unless") {
      return this.unless;
    }
    if (name === "each") {
      return this.each;
    }
    if (name === "with") {
      return this["with"];
    }
    if (name === "partial") {
      return this.partial;
    }
    if (name === "length") {
      return this.length;
    }
    if (name === "on") {
      return this.on;
    }

    // If not a reserved helper, check env, then global helpers, else return false
    return env.helpers && _.isObject(context) && _.isObject(env.helpers[context.cid]) && env.helpers[context.cid][name] || helpers[name] || false;
  };

  helpers.registerHelper = function (name, callback, params) {
    if (!_.isString(name)) {
      console.error("Name provided to registerHelper must be a string!");
      return;
    }
    if (!_.isFunction(callback)) {
      console.error("Callback provided to regierHelper must be a function!");
      return;
    }
    if (helpers.lookupHelper(name)) {
      console.error("A helper called \"" + name + "\" is already registered!");
      return;
    }

    params = _.isArray(params) ? params : [params];
    callback.__params = params;

    helpers[name] = callback;
  };

  /*******************************
          Default helpers
  ********************************/

  helpers.on = function (params, hash, options, env) {
    var i,
        callback,
        delegate,
        element,
        eventName = params[0],
        len = params.length,
        data = hash;

    // By default everything is delegated on the parent component
    if (len === 2) {
      callback = params[1];
      delegate = options.element;
      element = this.el || options.element;
    }
    // If a selector is provided, delegate on the helper's element
    else if (len === 3) {
      callback = params[2];
      delegate = params[1];
      element = options.element;
    }

    // Attach event
    $(element).on(eventName, delegate, data, function (event) {
      event.context = options.context;
      return options.helpers.__callOnComponent(callback, event);
    });
  };

  helpers.length = function (params, hash, options, env) {
    return params[0] && params[0].length || 0;
  };

  helpers["if"] = function (params, hash, options, env) {
    var condition = params[0];

    if (condition === undefined) {
      return null;
    }

    if (condition.isModel) {
      condition = true;
    }

    // If our condition is an array, handle properly
    if (_.isArray(condition) || condition.isCollection) {
      condition = condition.length ? true : false;
    }

    if (condition === "true") {
      condition = true;
    }
    if (condition === "false") {
      condition = false;
    }

    // If more than one param, this is not a block helper. Eval as such.
    if (params.length > 1) {
      return condition ? params[1] : params[2] || "";
    }

    // Check our cache. If the value hasn't actually changed, don't evaluate. Important for re-rendering of #each helpers.
    if (options.placeholder.__ifCache === condition) {
      return null; // Return null prevent's re-rending of our placeholder.
    }

    options.placeholder.__ifCache = condition;

    // Render the apropreate block statement
    if (condition && options.template) {
      return options.template.render(options.context, options, options.morph.contextualElement || options.morph.element);
    } else if (!condition && options.inverse) {
      return options.inverse.render(options.context, options, options.morph.contextualElement || options.morph.element);
    }

    return "";
  };


  // TODO: Proxy to if helper with inverted params
  helpers.unless = function (params, hash, options, env) {
    var condition = params[0];

    if (condition === undefined) {
      return null;
    }

    if (condition.isModel) {
      condition = true;
    }

    // If our condition is an array, handle properly
    if (_.isArray(condition) || condition.isCollection) {
      condition = condition.length ? true : false;
    }

    // If more than one param, this is not a block helper. Eval as such.
    if (params.length > 1) {
      return !condition ? params[1] : params[2] || "";
    }

    // Check our cache. If the value hasn't actually changed, don't evaluate. Important for re-rendering of #each helpers.
    if (options.placeholder.__unlessCache === condition) {
      return null; // Return null prevent's re-rending of our placeholder.
    }

    options.placeholder.__unlessCache = condition;

    // Render the apropreate block statement
    if (!condition && options.template) {
      return options.template.render(options.context, options, options.morph.contextualElement || options.morph.element);
    } else if (condition && options.inverse) {
      return options.inverse.render(options.context, options, options.morph.contextualElement || options.morph.element);
    }

    return "";
  };

  // Given an array, predicate and optional extra variable, finds the index in the array where predicate is true
  function findIndex(arr, predicate, cid) {
    if (arr == null) {
      throw new TypeError("findIndex called on null or undefined");
    }
    if (typeof predicate !== "function") {
      throw new TypeError("predicate must be a function");
    }
    var list = Object(arr);
    var length = list.length >>> 0;
    var thisArg = arguments[1];
    var value;

    for (var i = 0; i < length; i++) {
      value = list[i];
      if (predicate.call(thisArg, value, i, list, cid)) {
        return i;
      }
    }
    return -1;
  }

  helpers.each = function (params, hash, options, env) {
    if (_.isNull(params[0]) || _.isUndefined(params[0])) {
      console.warn("Undefined value passed to each helper! Maybe try providing a default value?", options.context);return null;
    }

    var value = params[0].isCollection ? params[0].models : params[0],
        // Accepts collections or arrays
    start,
        end,
        // used below to remove trailing junk morphs from the dom
    position,
        // Stores the iterated element's integer position in the dom list
    currentModel = function (element, index, array, cid) {
      return element.cid === cid; // Returns true if currently observed element is the current model.
    };

    // Create our morph array if it doesnt exist
    options.placeholder.morphs = options.placeholder.morphs || [];

    _.each(value, function (obj, key, list) {
      if (!_.isFunction(obj.set)) {
        return console.error("Model ", obj, "has no method .set()!");
      }

      position = findIndex(options.placeholder.morphs, currentModel, obj.cid);

      // TODO: These need to be re-added in as data attributes
      // Even if rendered already, update each element's index, key, first and last in case of order changes or element removals
      // if(_.isArray(value)){
      //   obj.set({'@index': key, '@first': (key === 0), '@last': (key === value.length-1)}, {silent: true});
      // }
      //
      // if(!_.isArray(value) && _.isObject(value)){
      //   obj.set({'@key' : key}, {silent: true});
      // }

      // If this model is not the morph element at this index
      if (position !== key) {
        // Create a lazyvalue whos value is the content inside our block helper rendered in the context of this current list object. Returns the rendered dom for this list element.
        var lazyValue = new LazyValue(function () {
          return options.template.render(options.template.blockParams === 0 ? obj : options.context, options, options.morph.contextualElement || options.morph.element, [obj]);
        });

        // If this model is rendered somewhere else in the list, destroy it
        if (position > -1) {
          options.placeholder.morphs[position].destroy();
        }

        // Destroy the morph we're replacing
        if (options.placeholder.morphs[key]) {
          options.placeholder.morphs[key].destroy();
        }

        // Insert our newly rendered value (a document tree) into our placeholder (the containing element) at its requested position (where we currently are in the object list)
        options.placeholder.insert(key, lazyValue.value());

        // Label the inserted morph element with this model's cid
        options.placeholder.morphs[key].cid = obj.cid;
      }
    }, this);

    // If any more morphs are left over, remove them. We've already gone through all the models.
    start = value.length;
    end = options.placeholder.morphs.length - 1;
    for (end; start <= end; end--) {
      options.placeholder.morphs[end].destroy();
    }

    // Return null prevent's re-rending of our placeholder. Our placeholder (containing element) now has all the dom we need.
    return null;
  };

  helpers["with"] = function (params, hash, options, env) {
    // Render the content inside our block helper with the context of this object. Returns a dom tree.
    return options.template.render(params[0], options, options.morph.contextualElement || options.morph.element);
  };

  helpers.partial = function (params, hash, options, env) {
    var partial = partials[params[0]];
    if (partial && partial.isHTMLBars) {
      return partial.render(options.context, env);
    }
  };

  module.exports = helpers;
});
define("rebound-runtime/hooks", ["exports", "module", "rebound-runtime/lazy-value", "rebound-runtime/utils", "rebound-runtime/helpers", "rebound-runtime/context"], function (exports, module, _reboundRuntimeLazyValue, _reboundRuntimeUtils, _reboundRuntimeHelpers, _reboundRuntimeContext) {
  "use strict";

  var _interopRequire = function (obj) {
    return obj && (obj["default"] || obj);
  };

  var LazyValue = _interopRequire(_reboundRuntimeLazyValue);

  var $ = _interopRequire(_reboundRuntimeUtils);

  var helpers = _interopRequire(_reboundRuntimeHelpers);

  var Context = _interopRequire(_reboundRuntimeContext);

  var hooks = {},
      attributes = { abbr: 1, "accept-charset": 1, accept: 1, accesskey: 1, action: 1,
    align: 1, alink: 1, alt: 1, archive: 1, axis: 1,
    background: 1, bgcolor: 1, border: 1, cellpadding: 1, cellspacing: 1,
    char: 1, charoff: 1, charset: 1, checked: 1, cite: 1,
    "class": 1, classid: 1, clear: 1, code: 1, codebase: 1,
    codetype: 1, color: 1, cols: 1, colspan: 1, compact: 1,
    content: 1, coords: 1, data: 1, datetime: 1, declare: 1,
    defer: 1, dir: 1, disabled: 1, enctype: 1, face: 1,
    "for": 1, frame: 1, frameborder: 1, headers: 1, height: 1,
    href: 1, hreflang: 1, hspace: 1, "http-equiv": 1, id: 1,
    ismap: 1, label: 1, lang: 1, language: 1, link: 1,
    longdesc: 1, marginheight: 1, marginwidth: 1, maxlength: 1, media: 1,
    method: 1, multiple: 1, name: 1, nohref: 1, noresize: 1,
    noshade: 1, nowrap: 1, object: 1, onblur: 1, onchange: 1,
    onclick: 1, ondblclick: 1, onfocus: 1, onkeydown: 1, onkeypress: 1,
    onkeyup: 1, onload: 1, onmousedown: 1, onmousemove: 1, onmouseout: 1,
    onmouseover: 1, onmouseup: 1, onreset: 1, onselect: 1, onsubmit: 1,
    onunload: 1, profile: 1, prompt: 1, readonly: 1, rel: 1,
    rev: 1, rows: 1, rowspan: 1, rules: 1, scheme: 1,
    scope: 1, scrolling: 1, selected: 1, shape: 1, size: 1,
    span: 1, src: 1, standby: 1, start: 1, style: 1,
    summary: 1, tabindex: 1, target: 1, text: 1, title: 1,
    type: 1, usemap: 1, valign: 1, value: 1, valuetype: 1,
    version: 1, vlink: 1, vspace: 1, width: 1 };


  /*******************************
          Hook Utils
  ********************************/

  // Returns the computed property's function if true, else false
  function isComputedProperty(model, path) {
    return _.isFunction(model.get(path, { raw: true }));
  }

  // Given an object (context) and a path, create a LazyValue object that returns the value of object at context and add it as an observer of the context.
  function streamProperty(context, path) {
    // Lazy value that returns the value of context.path
    var lazyValue = new LazyValue(function () {
      return context.get(path);
    }, context);

    // Save our path so parent lazyvalues can know the data var or helper they are getting info from
    lazyValue.path = path;

    // Save the observer at this path
    lazyValue.addObserver(path, context);

    return lazyValue;
  }

  function constructHelper(el, path, context, params, hash, options, env, helper) {
    var lazyValue;

    // Extend options with the helper's containeing Morph element. Used by streamify to track data observers
    options.morph = options.placeholder = el && !el.tagName && el || false; // FIXME: this kinda sucks
    options.element = el && el.tagName && el || false; // FIXME: this kinda sucks

    // Extend options with hooks and helpers for any subsequent calls from a lazyvalue
    options.params = params; // FIXME: this kinda sucks
    options.hooks = env.hooks; // FIXME: this kinda sucks
    options.helpers = env.helpers; // FIXME: this kinda sucks
    options.context = context; // FIXME: this kinda sucks
    options.dom = env.dom; // FIXME: this kinda sucks
    options.path = path; // FIXME: this kinda sucks
    options.hash = hash || []; // FIXME: this kinda sucks

    // Create a lazy value that returns the value of our evaluated helper.
    options.lazyValue = new LazyValue(function () {
      var plainParams = [],
          plainHash = {},
          result,
          relpath = $.splitPath(path),
          first,
          rest;
      relpath.shift();
      relpath = relpath.join(".");

      rest = $.splitPath(relpath);
      first = rest.shift();
      rest = rest.join(".");

      // Assemble our args and hash variables. For each lazyvalue param, push the lazyValue's value so helpers with no concept of lazyvalues.
      _.each(params, function (param, index) {
        plainParams.push(param && param.isLazyValue ? param.value() : param);
      });
      _.each(hash, function (hash, key) {
        plainHash[key] = hash && hash.isLazyValue ? hash.value() : hash;
      });

      // Call our helper functions with our assembled args.
      result = helper.apply(context.__root__ || context, [plainParams, plainHash, options, env]);

      if (result && relpath) {
        return result.get(relpath);
      }

      return result;
    });

    options.lazyValue.path = path;

    // For each param passed to our helper, add it to our helper's dependant list. Helper will re-evaluate when one changes.
    params.forEach(function (node) {
      if (node.isLazyValue) {
        // Re-evaluate this expression when our condition changes
        node.onNotify(function () {
          options.lazyValue.value();
        });
      }

      if (node && node.isLazyValue) {
        options.lazyValue.addDependentValue(node);
      }
    });

    return options.lazyValue;
  }

  // Given a root element, cleans all of the morph lazyValues for a given subtree
  function cleanSubtree(mutations, observer) {
    // For each mutation observed, if there are nodes removed, destroy all associated lazyValues
    mutations.forEach(function (mutation) {
      if (mutation.removedNodes) {
        _.each(mutation.removedNodes, function (node, index) {
          $(node).walkTheDOM(function (n) {
            if (n.__lazyValue && n.__lazyValue.destroy()) {
              n.__lazyValue.destroy();
            }
          });
        });
      }
    });
  }

  var subtreeObserver = new MutationObserver(cleanSubtree);

  /*******************************
          Default Hooks
  ********************************/

  hooks.get = function get(env, context, path) {
    context.blockParams || (context.blockParams = new Context());
    if (path === "this") {
      path = "";
    }
    // context = (context.blockParams.has(path)) ? context.blockParams : context;
    return streamProperty(context, path);
  };

  hooks.set = function set(env, context, name, value) {
    context.blockParams || (context.blockParams = new Context());
    // context.blockParams.set(name, value);
  };


  hooks.concat = function concat(env, params) {
    if (params.length === 1) {
      return params[0];
    }

    var lazyValue = new LazyValue(function () {
      var value = "";

      for (var i = 0, l = params.length; i < l; i++) {
        value += params[i].isLazyValue ? params[i].value() : params[i];
      }

      return value;
    }, params[0].context);

    for (var i = 0, l = params.length; i < l; i++) {
      if (params[i].isLazyValue) {
        params[i].onNotify(function () {
          lazyValue.notify();
        });
        lazyValue.addDependentValue(params[i]);
      }
    }

    return lazyValue;
  };

  hooks.subexpr = function subexpr(env, context, helperName, params, hash) {
    var helper = helpers.lookupHelper(helperName, env, context),
        lazyValue;

    if (helper) {
      // Abstracts our helper to provide a handlebars type interface. Constructs our LazyValue.
      lazyValue = constructHelper(true, helperName, context, params, hash, {}, env, helper);
    } else {
      lazyValue = streamProperty(context, helperName);
    }

    for (var i = 0, l = params.length; i < l; i++) {
      if (params[i].isLazyValue) {
        params[i].onNotify(function () {
          lazyValue.notify();
        });
        lazyValue.addDependentValue(params[i]);
      }
    }

    return lazyValue;
  };

  hooks.block = function block(env, morph, context, path, params, hash, template, inverse) {
    var options = {
      morph: morph,
      template: template,
      inverse: inverse
    };

    var lazyValue,
        value,
        observer = subtreeObserver,
        helper = helpers.lookupHelper(path, env, context);

    if (!_.isFunction(helper)) {
      return console.error(path + " is not a valid helper!");
    }

    // Abstracts our helper to provide a handlebars type interface. Constructs our LazyValue.
    lazyValue = constructHelper(morph, path, context, params, hash, options, env, helper);

    // If we have our lazy value, update our dom.
    // morph is a morph element representing our dom node
    if (lazyValue) {
      lazyValue.onNotify(function (lazyValue) {
        var val = lazyValue.value();
        val = _.isUndefined(val) ? "" : val;
        if (!_.isNull(val)) {
          morph.setContent(val);
        }
      });

      value = lazyValue.value();
      value = _.isUndefined(value) ? "" : value;
      if (!_.isNull(value)) {
        morph.append(value);
      }

      // Observe this content morph's parent's children.
      // When the morph element's containing element (morph) is removed, clean up the lazyvalue.
      // Timeout delay hack to give out dom a change to get their parent
      if (morph._parent) {
        morph._parent.__lazyValue = lazyValue;
        setTimeout(function () {
          if (morph.contextualElement) {
            observer.observe(morph.contextualElement, { attributes: false, childList: true, characterData: false, subtree: true });
          }
        }, 0);
      }
    }
  };

  hooks.inline = function inline(env, morph, context, path, params, hash) {
    var lazyValue,
        value,
        observer = subtreeObserver,
        helper = helpers.lookupHelper(path, env, context);

    if (!_.isFunction(helper)) {
      return console.error(path + " is not a valid helper!");
    }

    // Abstracts our helper to provide a handlebars type interface. Constructs our LazyValue.
    lazyValue = constructHelper(morph, path, context, params, hash, {}, env, helper);

    // If we have our lazy value, update our dom.
    // morph is a morph element representing our dom node
    if (lazyValue) {
      lazyValue.onNotify(function (lazyValue) {
        var val = lazyValue.value();
        val = _.isUndefined(val) ? "" : val;
        if (!_.isNull(val)) {
          morph.setContent(val);
        }
      });

      value = lazyValue.value();
      value = _.isUndefined(value) ? "" : value;
      if (!_.isNull(value)) {
        morph.append(value);
      }

      // Observe this content morph's parent's children.
      // When the morph element's containing element (morph) is removed, clean up the lazyvalue.
      // Timeout delay hack to give out dom a change to get their parent
      if (morph._parent) {
        morph._parent.__lazyValue = lazyValue;
        setTimeout(function () {
          if (morph.contextualElement) {
            observer.observe(morph.contextualElement, { attributes: false, childList: true, characterData: false, subtree: true });
          }
        }, 0);
      }
    }
  };

  hooks.content = function content(env, morph, context, path) {
    var lazyValue,
        value,
        observer = subtreeObserver,
        helper = helpers.lookupHelper(path, env, context);

    lazyValue = streamProperty(context, path);

    // If we have our lazy value, update our dom.
    // morph is a morph element representing our dom node
    if (lazyValue) {
      lazyValue.onNotify(function (lazyValue) {
        var val = lazyValue.value();
        val = _.isUndefined(val) ? "" : val;
        if (!_.isNull(val)) {
          morph.setContent(val);
        }
      });

      value = lazyValue.value();
      value = _.isUndefined(value) ? "" : value;
      if (!_.isNull(value)) {
        morph.append(value);
      }

      // Observe this content morph's parent's children.
      // When the morph element's containing element (morph) is removed, clean up the lazyvalue.
      // Timeout delay hack to give out dom a change to get their parent
      if (morph._parent) {
        morph._parent.__lazyValue = lazyValue;
        setTimeout(function () {
          if (morph.contextualElement) {
            observer.observe(morph.contextualElement, { attributes: false, childList: true, characterData: false, subtree: true });
          }
        }, 0);
      }
    }
  };

  // Handle morphs in element tags
  hooks.element = function element(env, domElement, context, path, params, hash) {
    var helper = helpers.lookupHelper(path, env, context),
        lazyValue,
        value;

    if (helper) {
      // Abstracts our helper to provide a handlebars type interface. Constructs our LazyValue.
      lazyValue = constructHelper(domElement, path, context, params, hash, {}, env, helper);
    } else {
      lazyValue = streamProperty(context, path);
    }

    // When we have our lazy value run it and start listening for updates.
    lazyValue.onNotify(function (lazyValue) {
      lazyValue.value();
    });

    value = lazyValue.value();
  };

  hooks.attribute = function attribute(env, attrMorph, domElement, name, value) {
    var lazyValue = new LazyValue(function () {
      var val = value.value(),
          checkboxChange,
          type = domElement.getAttribute("type"),
          inputTypes = { "null": 1, text: 1, email: 1, password: 1, search: 1, url: 1, tel: 1, hidden: 1 };

      // If is a text input element's value prop with only one variable, wire default events
      if (domElement.tagName === "INPUT" && inputTypes[type] && name === "value") {
        // If our special input events have not been bound yet, bind them and set flag
        if (!lazyValue.eventsBound) {
          $(domElement).on("change input propertychange", function (event) {
            value.set(value.path, this.value);
          });
          lazyValue.eventsBound = true;
        }

        attrMorph.setContent(val);
        return domElement.value = val ? val : "";
      } else if (domElement.tagName === "INPUT" && (type === "checkbox" || type === "radio") && name === "checked") {
        // If our special input events have not been bound yet, bind them and set flag
        if (!lazyValue.eventsBound) {
          $(domElement).on("change propertychange", function (event) {
            value.set(value.path, this.checked ? true : false, { quiet: true });
          });
          lazyValue.eventsBound = true;
        }

        // Set the attribute on our element for visual referance
        !val && (val = undefined);
        attrMorph.setContent(val);

        return domElement.checked = val ? true : undefined;
      } else {
        _.isString(val) && (val = val.trim());
        val || (val = undefined);
        attrMorph.setContent(val);
      }

      return val;
    });

    value.onNotify(function () {
      lazyValue.value();
    });
    lazyValue.addDependentValue(value);


    return lazyValue.value();
  };

  hooks.component = function (env, morph, context, tagName, contextData, template) {
    var component,
        element,
        outlet,
        plainData = {},
        componentData = {},
        lazyValue,
        value;

    // Create a lazy value that returns the value of our evaluated component.
    lazyValue = new LazyValue(function () {
      // Create a plain data object from the lazyvalues/values passed to our component
      _.each(contextData, function (value, key) {
        plainData[key] = value.isLazyValue ? value.value() : value;
      });

      // For each param passed to our shared component, add it to our custom element
      // TODO: there has to be a better way to get seed data to element instances
      // Global seed data is consumed by element as its created. This is not scoped and very dumb.
      Rebound.seedData = plainData;
      element = document.createElement(tagName);
      Rebound.seedData = {};
      component = element.__component__;

      // For each lazy param passed to our component, create its lazyValue
      _.each(plainData, function (value, key) {
        if (contextData[key] && contextData[key].isLazyValue) {
          componentData[key] = streamProperty(component, key);
        }
      });

      // Set up two way binding between component and original context for non-data attributes
      // Syncing between models and collections passed are handled in model and collection
      _.each(componentData, function (componentDataValue, key) {
        // TODO: Make this sync work with complex arguments with more than one child
        if (contextData[key].children === null) {
          // For each lazy param passed to our component, have it update the original context when changed.
          componentDataValue.onNotify(function () {
            contextData[key].set(contextData[key].path, componentDataValue.value());
          });
        }

        // For each lazy param passed to our component, have it update the component when changed.
        contextData[key].onNotify(function () {
          componentDataValue.set(key, contextData[key].value());
        });

        // Seed the cache
        componentDataValue.value();

        // Notify the component's lazyvalue when our model updates
        contextData[key].addObserver(contextData[key].path, context);
        componentDataValue.addObserver(key, component);
        console.log(component.__name, component.cid, component);
      });

      // // For each change on our component, update the states of the original context and the element's proeprties.
      component.listenTo(component, "change", function (model) {
        var json = component.toJSON();

        if (_.isString(json)) return; // If is a string, this model is seralizing already

        // Set the properties on our element for visual referance if we are on a top level attribute
        _.each(json, function (value, key) {
          // TODO: Currently, showing objects as properties on the custom element causes problems.
          // Linked models between the context and component become the same exact model and all hell breaks loose.
          // Find a way to remedy this. Until then, don't show objects.
          if (_.isObject(value)) {
            return;
          }
          value = _.isObject(value) ? JSON.stringify(value) : value;
          try {
            attributes[key] ? element.setAttribute(key, value) : element.dataset[key] = value;
          } catch (e) {
            console.error(e.message);
          }
        });
      });

      /** The attributeChangedCallback on our custom element updates the component's data. **/


      /*******************************************************
         End data dependancy chain
       *******************************************************/


      // TODO: break this out into its own function
      // Set the properties on our element for visual referance if we are on a top level attribute
      var compjson = component.toJSON();
      _.each(compjson, function (value, key) {
        // TODO: Currently, showing objects as properties on the custom element causes problems. Linked models between the context and component become the same exact model and all hell breaks loose. Find a way to remedy this. Until then, don't show objects.
        if (_.isObject(value)) {
          return;
        }
        value = _.isObject(value) ? JSON.stringify(value) : value;
        if (!_.isNull(value) && !_.isUndefined(value)) {
          try {
            attributes[key] ? element.setAttribute(key, value) : element.dataset[key] = value;
          } catch (e) {
            console.error(e.message);
          }
        }
      });


      // If an outlet marker is present in component's template, and a template is provided, render it into <content>
      outlet = element.getElementsByTagName("content")[0];
      if (template && _.isElement(outlet)) {
        outlet.appendChild(template.render(context, env, outlet));
      }

      // Return the new element.
      return element;
    });



    // If we have our lazy value, update our dom.
    // morph is a morph element representing our dom node
    if (lazyValue) {
      lazyValue.onNotify(function (lazyValue) {
        var val = lazyValue.value();
        if (val !== undefined) {
          morph.setContent(val);
        }
      });

      value = lazyValue.value();
      if (value !== undefined) {
        morph.append(value);
      }
    }
  };

  // registerHelper is a publically available function to register a helper with HTMLBars

  module.exports = hooks;
});
define("rebound-runtime/lazy-value", ["exports", "module", "rebound-data/rebound-data"], function (exports, module, _reboundDataReboundData) {
  "use strict";

  var Model = _reboundDataReboundData.Model;


  var NIL = function NIL() {},
      EMPTY_ARRAY = [];

  function LazyValue(fn, context) {
    this.valueFn = fn;
    this.context = context || null;
    _.bindAll(this, "value", "set", "addDependentValue", "addObserver", "notify", "onNotify", "destroy");
  }

  LazyValue.prototype = {
    isLazyValue: true,
    parent: null, // TODO: is parent even needed? could be modeled as a subscriber
    children: null,
    observers: null,
    cache: NIL,
    valueFn: null,
    subscribers: null, // TODO: do we need multiple subscribers?
    _childValues: null, // just for reusing the array, might not work well if children.length changes after computation

    value: function () {
      var cache = this.cache;
      if (cache !== NIL) {
        return cache;
      }

      var children = this.children;
      if (children) {
        var child,
            values = this._childValues || new Array(children.length);

        for (var i = 0, l = children.length; i < l; i++) {
          child = children[i];
          values[i] = child && child.isLazyValue ? child.value() : child;
        }

        return this.cache = this.valueFn(values);
      } else {
        return this.cache = this.valueFn(EMPTY_ARRAY);
      }
    },

    set: function (key, value, options) {
      if (this.context) {
        return this.context.set(key, value, options);
      }
      return null;
    },

    addDependentValue: function (value) {
      var children = this.children;
      if (!children) {
        children = this.children = [value];
      } else {
        children.push(value);
      }

      if (value && value.isLazyValue) {
        value.parent = this;
      }

      return this;
    },

    addObserver: function (path, context) {
      var observers = this.observers || (this.observers = []),
          position,
          res;

      if (!_.isObject(context) || !_.isString(path)) {
        return console.error("Error adding observer for", context, path);
      }

      // Ensure _observers exists and is an object
      context.__observers = context.__observers || {};
      // Ensure __observers[path] exists and is an array
      context.__observers[path] = context.__observers[path] || [];

      // Add our callback, save the position it is being inserted so we can garbage collect later.
      position = context.__observers[path].push(this.notify) - 1;

      // Save the type of object events this observer is for
      res = context.get(this.path);
      context.__observers[path][position].type = res && res.isCollection ? "collection" : "model";

      // Lazyvalue needs referance to its observers to remove listeners on destroy
      observers.push({ context: context, path: path, index: position });

      return this;
    },

    notify: function (sender) {
      try {
        var cache = this.cache,
            parent,
            subscribers;

        if (cache !== NIL) {
          parent = this.parent;
          subscribers = this.subscribers;
          cache = this.cache = NIL;

          if (parent) {
            parent.notify(this);
          }
          if (!subscribers) {
            return;
          }
          for (var i = 0, l = subscribers.length; i < l; i++) {
            subscribers[i](this);
          }
        }
      } catch (err) {
        console.log("KILLING OBSERVER", sender);
        console.log(err.stack);
        this.destroy();
      }
    },

    onNotify: function (callback) {
      var subscribers = this.subscribers || (this.subscribers = []);
      subscribers.push(callback);
      return this;
    },

    destroy: function () {
      _.each(this.children, function (child) {
        if (child && child.isLazyValue) {
          child.destroy();
        }
      });
      _.each(this.subscribers, function (subscriber) {
        if (subscriber && subscriber.isLazyValue) {
          subscriber.destroy();
        }
      });

      this.parent = this.children = this.cache = this.valueFn = this.subscribers = this._childValues = null;

      _.each(this.observers, function (observer) {
        if (_.isObject(observer.context.__observers[observer.path])) {
          delete observer.context.__observers[observer.path][observer.index];
        }
      });

      this.observers = null;
    }
  };

  module.exports = LazyValue;
});
define("rebound-runtime/rebound-runtime", ["exports", "module", "rebound-runtime/env", "rebound-runtime/utils", "rebound-runtime/register", "rebound-data/rebound-data", "rebound-runtime/component", "rebound-router/rebound-router"], function (exports, module, _reboundRuntimeEnv, _reboundRuntimeUtils, _reboundRuntimeRegister, _reboundDataReboundData, _reboundRuntimeComponent, _reboundRouterReboundRouter) {
  "use strict";

  var _interopRequire = function (obj) {
    return obj && (obj["default"] || obj);
  };

  // If Backbone hasn't been started yet, throw error
  if (!window.Backbone) {
    throw "Backbone must be on the page for Rebound to load.";
  }

  // Load our client environment
  var env = _interopRequire(_reboundRuntimeEnv);

  // Load our utils
  var utils = _interopRequire(_reboundRuntimeUtils);

  // Load our utils
  var registerComponent = _interopRequire(_reboundRuntimeRegister);

  // Load Rebound Data
  var Model = _reboundDataReboundData.Model;
  var Collection = _reboundDataReboundData.Collection;
  var ComputedProperty = _reboundDataReboundData.ComputedProperty;


  // Load Rebound Components
  var Component = _interopRequire(_reboundRuntimeComponent);

  // Load The Rebound Router
  var Router = _interopRequire(_reboundRouterReboundRouter);

  // Fetch Rebound Config Object
  var Config = JSON.parse(document.getElementById("Rebound").innerHTML);

  // If Backbone doesn't have an ajax method from an external DOM library, use ours
  window.Backbone.ajax = window.Backbone.$ && window.Backbone.$.ajax && window.Backbone.ajax || utils.ajax;

  // Create Global Object
  window.Rebound = {
    registerHelper: env.registerHelper,
    registerPartial: env.registerPartial,
    registerComponent: registerComponent,
    Model: Model,
    Collection: Collection,
    ComputedProperty: ComputedProperty,
    Component: Component,
    Config: Config
  };

  window.Rebound.router = new Router({ config: Config });

  module.exports = Rebound;
});
define("rebound-runtime/register", ["exports", "module", "rebound-runtime/component"], function (exports, module, _reboundRuntimeComponent) {
  "use strict";

  var _interopRequire = function (obj) {
    return obj && (obj["default"] || obj);
  };

  module.exports = registerComponent;
  var Component = _interopRequire(_reboundRuntimeComponent);

  function registerComponent(name, options) {
    var script = options.prototype;
    var template = options.template;
    var style = options.style;

    var component = Component.extend(script, { __name: name });
    var proto = Object.create(HTMLElement.prototype, {});

    proto.createdCallback = function () {
      this.__component__ = new component({
        template: template,
        outlet: this,
        data: Rebound.seedData
      });
    };

    proto.attachedCallback = function () {
      script.attachedCallback && script.attachedCallback.call(this.__component__);
    };

    proto.detachedCallback = function () {
      script.detachedCallback && script.detachedCallback.call(this.__component__);
      this.__component__.deinitialize();
    };

    proto.attributeChangedCallback = function (attrName, oldVal, newVal) {
      this.__component__._onAttributeChange(attrName, oldVal, newVal);
      script.attributeChangedCallback && script.attributeChangedCallback.call(this.__component__, attrName, oldVal, newVal);
    };

    return document.registerElement(name, { prototype: proto });
  }
});
define("rebound-runtime/utils", ["exports", "module"], function (exports, module) {
  "use strict";

  var $ = function (query) {
    return new utils(query);
  };

  var utils = function (query) {
    var i,
        selector = _.isElement(query) && [query] || query === document && [document] || _.isString(query) && querySelectorAll(query) || [];
    this.length = selector.length;

    // Add selector to object for method chaining
    for (i = 0; i < this.length; i++) {
      this[i] = selector[i];
    }

    return this;
  };

  function returnFalse() {
    return false;
  }
  function returnTrue() {
    return true;
  }

  $.Event = function (src, props) {
    // Allow instantiation without the 'new' keyword
    if (!(this instanceof $.Event)) {
      return new $.Event(src, props);
    }

    // Event object
    if (src && src.type) {
      this.originalEvent = src;
      this.type = src.type;

      // Events bubbling up the document may have been marked as prevented
      // by a handler lower down the tree; reflect the correct value.
      this.isDefaultPrevented = src.defaultPrevented || src.defaultPrevented === undefined &&
      // Support: Android<4.0
      src.returnValue === false ? returnTrue : returnFalse;

      // Event type
    } else {
      this.type = src;
    }

    // Put explicitly provided properties onto the event object
    if (props) {
      _.extend(this, props);
    }

    // Copy over all original event properties
    _.extend(this, _.pick(this.originalEvent, ["altKey", "bubbles", "cancelable", "ctrlKey", "currentTarget", "eventPhase", "metaKey", "relatedTarget", "shiftKey", "target", "timeStamp", "view", "which", "char", "charCode", "key", "keyCode", "button", "buttons", "clientX", "clientY", "", "offsetX", "offsetY", "pageX", "pageY", "screenX", "screenY", "toElement"]));

    // Create a timestamp if incoming event doesn't have one
    this.timeStamp = src && src.timeStamp || new Date().getTime();

    // Mark it as fixed
    this.isEvent = true;
  };

  $.Event.prototype = {
    constructor: $.Event,
    isDefaultPrevented: returnFalse,
    isPropagationStopped: returnFalse,
    isImmediatePropagationStopped: returnFalse,

    preventDefault: function () {
      var e = this.originalEvent;

      this.isDefaultPrevented = returnTrue;

      if (e && e.preventDefault) {
        e.preventDefault();
      }
    },
    stopPropagation: function () {
      var e = this.originalEvent;

      this.isPropagationStopped = returnTrue;

      if (e && e.stopPropagation) {
        e.stopPropagation();
      }
    },
    stopImmediatePropagation: function () {
      var e = this.originalEvent;

      this.isImmediatePropagationStopped = returnTrue;

      if (e && e.stopImmediatePropagation) {
        e.stopImmediatePropagation();
      }

      this.stopPropagation();
    }
  };


  utils.prototype = {

    // Given a valid data path, split it into an array of its parts.
    // ex: foo.bar[0].baz --> ['foo', 'var', '0', 'baz']
    splitPath: function (path) {
      return _.compact(path.split(/(?:\.|\[|\])+/));
    },

    // Applies function `func` depth first to every node in the subtree starting from `root`
    walkTheDOM: function (func) {
      var el,
          root,
          len = this.length;
      while (len--) {
        root = this[len];
        func(root);
        root = root.firstChild;
        while (root) {
          $(root).walkTheDOM(func);
          root = root.nextSibling;
        }
      }
    },

    // Events registry. An object containing all events bound through this util shared among all instances.
    _events: {},

    // Takes the targed the event fired on and returns all callbacks for the delegated element
    _hasDelegate: function (target, delegate, eventType) {
      var callbacks = [];

      // Get our callbacks
      if (target.delegateGroup && this._events[target.delegateGroup][eventType]) {
        _.each(this._events[target.delegateGroup][eventType], function (callbacksList, delegateId) {
          if (_.isArray(callbacksList) && (delegateId === delegate.delegateId || delegate.matchesSelector && delegate.matchesSelector(delegateId))) {
            callbacks = callbacks.concat(callbacksList);
          }
        });
      }

      return callbacks;
    },

    // Triggers an event on a given dom node
    trigger: function (eventName, options) {
      var el,
          len = this.length;
      while (len--) {
        el = this[len];
        if (document.createEvent) {
          var event = document.createEvent("HTMLEvents");
          event.initEvent(eventName, true, false);
          el.dispatchEvent(event);
        } else {
          el.fireEvent("on" + eventName);
        }
      }
    },

    off: function (eventType, handler) {
      var el,
          len = this.length,
          eventCount;

      while (len--) {
        el = this[len];
        eventCount = 0;

        if (el.delegateGroup) {
          if (this._events[el.delegateGroup][eventType] && _.isArray(this._events[el.delegateGroup][eventType][el.delegateId])) {
            _.each(this._events[el.delegateGroup][eventType], function (delegate, index, delegateList) {
              _.each(delegateList, function (callback, index, callbackList) {
                if (callback === handler) {
                  delete callbackList[index];
                  return;
                }
                eventCount++;
              });
            });
          }
        }

        // If there are no more of this event type delegated for this group, remove the listener
        if (eventCount === 0 && el.removeEventListener) {
          el.removeEventListener(eventType, handler, false);
        }
        if (eventCount === 0 && el.detachEvent) {
          el.detachEvent("on" + eventType, handler);
        }
      }
    },

    on: function (eventName, delegate, data, handler) {
      var el,
          events = this._events,
          len = this.length,
          eventNames = eventName.split(" "),
          delegateId,
          delegateGroup;

      while (len--) {
        el = this[len];

        // Normalize data input
        if (_.isFunction(delegate)) {
          handler = delegate;
          delegate = el;
          data = {};
        }
        if (_.isFunction(data)) {
          handler = data;
          data = {};
        }
        if (!_.isString(delegate) && !_.isElement(delegate)) {
          console.error("Delegate value passed to Rebound's $.on is neither an element or css selector");
          return false;
        }

        delegateId = _.isString(delegate) ? delegate : delegate.delegateId = delegate.delegateId || _.uniqueId("event");
        delegateGroup = el.delegateGroup = el.delegateGroup || _.uniqueId("delegateGroup");

        _.each(eventNames, function (eventName) {
          // Ensure event obj existance
          events[delegateGroup] = events[delegateGroup] || {};

          // TODO: take out of loop
          var callback = function (event) {
            var target, i, len, eventList, callbacks, callback, falsy;
            event = new $.Event(event || window.event); // Convert to mutable event
            target = event.target || event.srcElement;

            // Travel from target up to parent firing event on delegate when it exizts
            while (target) {
              // Get all specified callbacks (element specific and selector specified)
              callbacks = $._hasDelegate(el, target, event.type);

              len = callbacks.length;
              for (i = 0; i < len; i++) {
                event.target = event.srcElement = target; // Attach this level's target
                event.data = callbacks[i].data; // Attach our data to the event
                event.result = callbacks[i].callback.call(el, event); // Call the callback
                falsy = event.result === false ? true : falsy; // If any callback returns false, log it as falsy
              }

              // If any of the callbacks returned false, prevent default and stop propagation
              if (falsy) {
                event.preventDefault();
                event.stopPropagation();
                return false;
              }

              target = target.parentNode;
            }
          };

          // If this is the first event of its type, add the event handler
          if (!events[delegateGroup][eventName]) {
            if (el.addEventListener) {
              el.addEventListener(eventName, callback);
            } else {
              el.attachEvent("on" + eventName, callback);
            }
          }


          // Add our listener
          events[delegateGroup][eventName] = events[delegateGroup][eventName] || {};
          events[delegateGroup][eventName][delegateId] = events[delegateGroup][eventName][delegateId] || [];
          events[delegateGroup][eventName][delegateId].push({ callback: handler, data: data });
        }, this);
      }
    },

    flatten: function (data) {
      var recurse = function (cur, prop) {
        if (Object(cur) !== cur) {
          result[prop] = cur;
        } else if (Array.isArray(cur)) {
          for (var i = 0, l = cur.length; i < l; i++) recurse(cur[i], prop + "[" + i + "]");
          if (l === 0) result[prop] = [];
        } else {
          var isEmpty = true;
          for (var p in cur) {
            isEmpty = false;
            recurse(cur[p], prop ? prop + "." + p : p);
          }
          if (isEmpty && prop) result[prop] = {};
        }
      };

      var result = {};
      recurse(data, "");
      return result;
    },

    // http://krasimirtsonev.com/blog/article/Cross-browser-handling-of-Ajax-requests-in-absurdjs
    ajax: function (ops) {
      if (typeof ops == "string") ops = { url: ops };
      ops.url = ops.url || "";
      ops.json = ops.json || true;
      ops.method = ops.method || "get";
      ops.data = ops.data || {};
      var getParams = function (data, url) {
        var arr = [],
            str;
        for (var name in data) {
          arr.push(name + "=" + encodeURIComponent(data[name]));
        }
        str = arr.join("&");
        if (str !== "") {
          return url ? url.indexOf("?") < 0 ? "?" + str : "&" + str : str;
        }
        return "";
      };
      var api = {
        host: {},
        process: function (ops) {
          var self = this;
          this.xhr = null;
          if (window.ActiveXObject) {
            this.xhr = new ActiveXObject("Microsoft.XMLHTTP");
          } else if (window.XMLHttpRequest) {
            this.xhr = new XMLHttpRequest();
          }
          if (this.xhr) {
            this.xhr.onreadystatechange = function () {
              if (self.xhr.readyState == 4 && self.xhr.status == 200) {
                var result = self.xhr.responseText;
                if (ops.json === true && typeof JSON != "undefined") {
                  result = JSON.parse(result);
                }
                self.doneCallback && self.doneCallback.apply(self.host, [result, self.xhr]);
                ops.success && ops.success.apply(self.host, [result, self.xhr]);
              } else if (self.xhr.readyState == 4) {
                self.failCallback && self.failCallback.apply(self.host, [self.xhr]);
                ops.error && ops.error.apply(self.host, [self.xhr]);
              }
              self.alwaysCallback && self.alwaysCallback.apply(self.host, [self.xhr]);
              ops.complete && ops.complete.apply(self.host, [self.xhr]);
            };
          }
          if (ops.method == "get") {
            this.xhr.open("GET", ops.url + getParams(ops.data, ops.url), true);
            this.setHeaders({
              "X-Requested-With": "XMLHttpRequest"
            });
          } else {
            this.xhr.open(ops.method, ops.url, true);
            this.setHeaders({
              "X-Requested-With": "XMLHttpRequest",
              "Content-type": "application/x-www-form-urlencoded"
            });
          }
          if (ops.headers && typeof ops.headers == "object") {
            this.setHeaders(ops.headers);
          }
          setTimeout(function () {
            ops.method == "get" ? self.xhr.send() : self.xhr.send(getParams(ops.data));
          }, 20);
          return this.xhr;
        },
        done: function (callback) {
          this.doneCallback = callback;
          return this;
        },
        fail: function (callback) {
          this.failCallback = callback;
          return this;
        },
        always: function (callback) {
          this.alwaysCallback = callback;
          return this;
        },
        setHeaders: function (headers) {
          for (var name in headers) {
            this.xhr && this.xhr.setRequestHeader(name, headers[name]);
          }
        }
      };
      return api.process(ops);
    }
  };

  _.extend($, utils.prototype);



  module.exports = $;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInByb3BlcnR5LWNvbXBpbGVyL3Byb3BlcnR5LWNvbXBpbGVyLmpzIiwicmVib3VuZC1jb21waWxlci9jb21waWxlci5qcyIsInJlYm91bmQtZGF0YS9jb2xsZWN0aW9uLmpzIiwicmVib3VuZC1wcmVjb21waWxlci9yZWJvdW5kLXByZWNvbXBpbGVyLmpzIiwicmVib3VuZC1yb3V0ZXIvcmVib3VuZC1yb3V0ZXIuanMiLCJyZWJvdW5kLXJ1bnRpbWUvY29tcG9uZW50LmpzIiwicHJvcGVydHktY29tcGlsZXIvdG9rZW5pemVyLmpzIiwicmVib3VuZC1jb21waWxlci9yZWJvdW5kLWNvbXBpbGVyLmpzIiwicmVib3VuZC1kYXRhL2NvbXB1dGVkLXByb3BlcnR5LmpzIiwicmVib3VuZC1ydW50aW1lL2NvbnRleHQuanMiLCJyZWJvdW5kLWRhdGEvbW9kZWwuanMiLCJyZWJvdW5kLXJ1bnRpbWUvZW52LmpzIiwicmVib3VuZC1kYXRhL3JlYm91bmQtZGF0YS5qcyIsInJlYm91bmQtcnVudGltZS9oZWxwZXJzLmpzIiwicmVib3VuZC1ydW50aW1lL2hvb2tzLmpzIiwicmVib3VuZC1ydW50aW1lL2xhenktdmFsdWUuanMiLCJyZWJvdW5kLXJ1bnRpbWUvcmVib3VuZC1ydW50aW1lLmpzIiwicmVib3VuZC1ydW50aW1lL3JlZ2lzdGVyLmpzIiwicmVib3VuZC1ydW50aW1lL3V0aWxzLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7TUFBTyxTQUFTOztBQUVoQixNQUFJLGtCQUFrQixHQUFHLEVBQUUsQ0FBQzs7OztBQUk1QixXQUFTLE9BQU8sQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFDO0FBQzFCLFFBQUksTUFBTSxHQUFHLEVBQUUsQ0FBQzs7QUFFaEIsUUFBRyxJQUFJLENBQUMsUUFBUSxFQUFFLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQzs7QUFFdkMsUUFBSSxHQUFHLEdBQUcsSUFBSSxDQUFDLFFBQVEsRUFBRTs7QUFDckIsYUFBUyxHQUFH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T0FBTyxFQUFFLE9BQU8sRUFBQyxDQUFDO0FBQzFHLE1BQUksU0FBUyxHQUFHLEVBQUMsT0FBTyxFQUFFLFVBQVUsRUFBQztNQUFFLFNBQVMsR0FBRyxFQUFDLE9BQU8sRUFBRSxVQUFVLEVBQUM7TUFBRSxRQUFRLEdBQUcsRUFBQyxPQUFPLEVBQUUsU0FBUyxFQUFDLENBQUM7QUFDMUcsTUFBSSxHQUFHLEdBQUcsRUFBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUM7TUFBRSxLQUFLLEdBQUcsRUFBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLFVBQVUsRUFBRSxJQUFJLEVBQUMsQ0FBQztBQUNyRixNQUFJLFFBQVEsR0FBRyxFQUFDLE9BQU8sRUFBRSxTQUFTLEVBQUM7TUFBRSxJQUFJLEdBQUcsRUFBQyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUM7TUFBRSxTQUFTLEdBQUcsRUFBQyxPQUFPLEVBQUUsVUFBVSxFQUFDLENBQUM7QUFDOUcsTUFBSSxHQUFHLEdBQUcsRUFBQyxPQUFPLEVBQUUsSUFBSSxFQUFDO01BQUUsT0FBTyxHQUFHLEVBQUMsT0FBTyxFQUFFLFFBQVEsRUFBRSxVQUFVLEVBQUUsSUFBSSxFQUFDO01BQUUsT0FBTyxHQUFHLEVBQUMsT0FBTyxFQUFFLFFBQVEsRUFBQyxDQUFDO0FBQzFHLE1BQUksTUFBTSxHQUFHLEVBQUMsT0FBTyxFQUFFLE9BQU8sRUFBRSxVQUFVLEVBQUUsSUFBSSxFQUFDO01BQUUsSUFBSSxHQUFHLEVBQUMsT0FBTyxFQUFFLEtBQUssRUFBQztNQUFFLElBQUksR0FBRyxFQUFDLE9BQU8sRUFBRSxLQUFLLEVBQUMsQ0FBQztBQUNwRyxNQUFJLElBQUksR0FBRyxFQUFDLE9BQU8sRUFBRSxLQUFLLEVBQUM7TUFBRSxNQUFNLEdBQUcsRUFBQyxPQUFPLEVBQUUsT0FBTyxFQUFDLENBQUM7QUFDekQsTUFBSSxNQUFNLEdBQUcsRUFBQyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUM7TUFB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RyxFQUFDLEtBQUssRUFBRSxDQUFDLEVBQUUsVUFBVSxFQUFFLElBQUksRUFBQyxDQUFDO0FBQy9DLE1BQUksU0FBUyxHQUFHLEVBQUMsS0FBSyxFQUFFLENBQUMsRUFBRSxVQUFVLEVBQUUsSUFBSSxFQUFDLENBQUM7QUFDN0MsTUFBSSxXQUFXLEdBQUcsRUFBQyxLQUFLLEVBQUUsQ0FBQyxFQUFFLFVBQVUsRUFBRSxJQUFJLEVBQUMsQ0FBQztBQUMvQyxNQUFJLFNBQVMsR0FBRyxFQUFDLEtBQUssRUFBRSxDQUFDLEVBQUUsVUFBVSxFQUFFLElBQUksRUFBQyxDQUFDO0FBQzdDLE1BQUksUUFBUSxHQUFHLEVBQUMsS0FBSyxFQUFFLENBQUMsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLFVBQVUsRUFBRSxJQUFJLEVBQUMsQ0FBQztBQUMxRCxNQUFJLGVBQWUsR0FBRyxFQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsVUFBVSxFQUFFLElBQUksRUFBQyxDQUFDOzs7OztBQUtwRCxTQUFPLENBQUMsUUFBUSxHQUFHLEVBQUMsUUFBUSxFQUFFLFNBQVMsRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLE9BQU87QUFDMUUsVUFBTSxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsTUFBTTtBQUMzRSxPQUFHLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFLEVBQUUsRUFBRSxHQUFHO0FBQzNFLFFBQUksRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBQyxDQUFDO0FBQ3pGLE9BQUssSUFBSSxFQUFFLElBQUksWUFBWSxFQUFFLE9BQU8sQ0FBQyxRQUFR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QUFLLE9BQU8sRUFBRSxDQUFDLEVBQVEsSUFBSSxFQUFFLENBQUM7QUFDOUUsV0FBSyxDQUFDLEVBQVMsS0FBSyxFQUFFLENBQUMsRUFBYyxXQUFXLEVBQUUsQ0FBQyxFQUFFLE9BQU8sRUFBRSxDQUFDLEVBQVEsTUFBTSxFQUFFLENBQUM7QUFDaEYsUUFBSSxFQUFFLENBQUMsRUFBUSxRQUFRLEVBQUUsQ0FBQyxFQUFXLE1BQU0sRUFBRSxDQUFDLEVBQU0sWUFBWSxFQUFFLENBQUMsRUFBSSxFQUFFLEVBQUUsQ0FBQztBQUM1RSxTQUFLLEVBQUUsQ0FBQyxFQUFPLEtBQUssRUFBRSxDQUFDLEVBQWMsSUFBSSxFQUFFLENBQUMsRUFBUyxRQUFRLEVBQUUsQ0FBQyxFQUFPLElBQUksRUFBRSxDQUFDO0FBQzlFLFlBQVEsRUFBRSxDQUFDLEVBQUksWUFBWSxFQUFFLENBQUMsRUFBTyxXQUFXLEVBQUUsQ0FBQyxFQUFFLFNBQVMsRUFBRSxDQUFDLEVBQU0sS0FBSyxFQUFFLENBQUM7QUFDL0UsVUFBTSxFQUFFLENBQUMsRUFBTSxRQUFRLEVBQUUsQ0FBQyxFQUFXLElBQUksRUFBRSxDQUFDLEVBQVMsTUFBTSxFQUFFLENBQUMsRUFBUyxRQUFRLEVBQUUsQ0FBQztBQUNsRixXQUFPLEVBQUUsQ0FBQyxFQUFLLE1BQU0sRUFBRSxDQUFDLEVBQWEsTUFBTSxFQUFFLENBQUMsRUFBTyxNQUFNLEVBQUUsQ0FBQyxFQUFTLFFBQVEsRUFBRSxDQUFDO0FBQ2xGLFdBQU8sRUFBRSxDQUFDLEVBQUssVUFBVSxFQUFFLENBQUMsRUFBUyxPQUFPLEVBQUUsQ0FBQyxFQUFNLFNBQVMsRUFBRSxDQUFDLEVBQU0sVUFBVSxFQUFFLENBQUM7QUFDcEYsV0FBTyxFQUFFLENBQUMsRUFBSyxNQUFNLEVBQUUsQ0FBQyxFQUFhLFdBQVcsRUFBRSxDQUFDLEVBQUUsV0FBVyxFQUFFLENBQUMsRUFBSSxVQUFVLEVBQUUsQ0FBQztBQUNwRixlQUFXLEVBQUUsQ0FBQyxFQUFDLFNBQVMsRUFBRSxDQUFDLEVBQVUsT0FBTyxFQUFFLENB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a2VuaXplciBmcm9tIFwicHJvcGVydHktY29tcGlsZXIvdG9rZW5pemVyXCI7XG5cbnZhciBjb21wdXRlZFByb3BlcnRpZXMgPSBbXTtcblxuLy8gVE9ETzogTWFrZSB0aGlzIGZhcnJycnJyIG1vcmUgcm9idXN0Li4udmVyeSBtaW5pbWFsIHJpZ2h0IG5vd1xuXG5mdW5jdGlvbiBjb21waWxlKHByb3AsIG5hbWUpe1xuICB2YXIgb3V0cHV0ID0ge307XG5cbiAgaWYocHJvcC5fX3BhcmFtcykgcmV0dXJuIHByb3AuX19wYXJhbXM7XG5cbiAgdmFyIHN0ciA9IHByb3AudG9TdHJpbmcoKSwgLy8ucmVwbGFjZSgvKD86XFwvXFwqKD86W1xcc1xcU10qPylcXCpcXC8pfCg/OihbXFxzO10pK1xcL1xcLyg/Oi4qKSQpL2dtLCAnJDEnKSwgLy8gU3RyaW5nIHJlcHJlc2VudGF0aW9uIG9mIGZ1bmN0aW9uIHNhbnMgY29tbWVudHNcbiAgICAgIG5leHRUb2tlbiA9IHRva2VuaXplci50b2tlbml6ZShzdHIpLFxuICAgICAgdG9rZW5zID0gW10sXG4gICAgICB0b2tlbixcbiAgICAgIGZpbmlzaGVkUGF0aHMgPSBbXSxcbiAgICAgIG5hbWVkUGF0aHMgPSB7fSxcbiAgICAgIG9wY29kZXMgPSBbXSxcbiAgICAgIG5hbWVkID0gZmFsc2UsXG4gICAgICBsaXN0ZW5pbmcgPSAwLFxuICAgICAgaW5TdWJDb21wb25lbnQgPSAwLFxuICAgICAgc3ViQ29tcG9uZW50ID0gW10sXG4gICAgICByb290LFxuICAgICAgcGF0aHMgPSBbXSxcbiAgICAgIHBhdGgsXG4gICAgICB0bXBQYXRoLFxuICAgICAgYXR0cnMgPSBbXSxcbiAgICAgIHdvcmtpbmdwYXRoID0gW10sXG4gICAgICB0ZXJtaW5hdG9ycyA9IFsnOycsJywnLCc9PScsJz4nLCc8JywnPj0nLCc8PScsJz49PScsJzw9PScsJyE9JywnIT09JywgJz09PScsICcmJicsICd8fCcsICcrJywgJy0nLCAnLycsICcqJ107XG4gIGRve1xuXG4gICAgdG9rZW4gPSBuZXh0VG9rZW4oKTtcblxuICAgIGlmKHRva2VuLnZhbHVlID09PSAndGhpcycpe1xuICAgICAgbGlzdGVuaW5nKys7XG4gICAgICB3b3JraW5ncGF0aCA9IFtdO1xuICAgIH1cblxuICAgIC8vIFRPRE86IGhhbmRsZSBnZXRzIG9uIGNvbGxlY3Rpb25zXG4gICAgaWYodG9rZW4udmFsdWUgPT09ICdnZXQnKXtcbiAgICAgIHBhdGggPSBuZXh0VG9rZW4oKTtcbiAgICAgIHdoaWxlKF8uaXNVbmRlZmluZWQocGF0aC52YWx1ZSkpe1xuICAgICAgICBwYXRoID0gbmV4dFRva2VuKCk7XG4gICAgICB9XG5cbiAgICAgIC8vIFJlcGxhY2UgYW55IGFjY2VzcyB0byBhIGNvbGxlY3Rpb24gd2l0aCB0aGUgZ2VuZXJpYyBAZWFjaCBwbGFjZWhvbGRlciBhbmQgcHVzaCBkZXBlbmRhbmN5XG4gICAgICB3b3JraW5ncGF0aC5wdXNoKHBhdGgudmFsdWUucmVwbGFjZSgvXFxbLitcXF0vZywgXCIuQGVhY2hcIikucmVwbGFjZSgvXlxcLi8sICcnKSk7XG4gICAgfVxuXG4gICAgaWYodG9rZW4udmFsdWUgPT09ICdwbHVjaycpe1xuICAgICAgcGF0aCA9IG5leHRUb2tlbigpO1xuICAgICAgd2hpbGUoXy5pc1VuZGVmaW5lZChwYXRoLnZhbHVlKSl7XG4gICAgICAgIHBhdGggPSBuZXh0VG9rZW4oKTtcbiAgICAgIH1cblxuICAgICAgd29ya2luZ3BhdGgucHVzaCgnQGVhY2guJyArIHBhdGgudmFsdWUpO1xuICAgIH1cblxuICAgIGlmKHRva2VuLnZhbHVlID09PSAnc2xpY2UnIHx8IHRva2VuLnZhbHVlID09PSAnY2xvbmUnIHx8IHRva2VuLnZhbHVlID09PSAnZmlsdGVyJyl7XG4gICAgICBwYXRoID0gbmV4dFRva2VuKCk7XG4gICAgICBpZihwYXRoLnR5cGUudHlwZSA9PT0gJygnKSB3b3JraW5ncGF0aC5wdXNoKCdAZWFjaCcpO1xuICAgIH1cblxuICAgIGlmKHRva2VuLnZhbHVlID09PSAnYXQnKXtcblxuICAgICAgcGF0aCA9IG5leHRUb2tlbigpO1xuICAgICAgd2hpbGUoXy5pc1VuZGVmaW5lZChwYXRoLnZhbHVlKSl7XG4gICAgICAgIHBhdGggPSBuZXh0VG9rZW4oKTtcbiAgICAgIH1cbiAgICAgIC8vIHdvcmtpbmdwYXRoW3dvcmtpbmdwYXRoLmxlbmd0aCAtMV0gPSB3b3JraW5ncGF0aFt3b3JraW5ncGF0aC5sZW5ndGggLTFdICsgJ1snICsgcGF0aC52YWx1ZSArICddJztcbiAgICAgIC8vIHdvcmtpbmdwYXRoLnB1c2goJ1snICsgcGF0aC52YWx1ZSArICddJyk7XG4gICAgICB3b3JraW5ncGF0aC5wdXNoKCdAZWFjaCcpO1xuXG4gICAgfVxuXG4gICAgaWYodG9rZW4udmFsdWUgPT09ICd3aGVyZScgfHwgdG9rZW4udmFsdWUgPT09ICdmaW5kV2hlcmUnKXtcbiAgICAgIHdvcmtpbmdwYXRoLnB1c2goJ0BlYWNoJyk7XG4gICAgICBwYXRoID0gbmV4dFRva2VuKCk7XG4gICAgICBhdHRycyA9IFtdO1xuICAgICAgdmFyIGl0ciA9IDA7XG4gICAgICB3aGlsZShwYXRoLnR5cGUudHlwZSAhPT0gJyknKXtcbiAgICAgICAgaWYocGF0aC52YWx1ZSl7XG4gICAgICAgICAgaWYoaXRyJTIgPT09IDApe1xuICAgICAgICAgICAgYXR0cnMucHVzaChwYXRoLnZhbHVlKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaXRyKys7XG4gICAgICAgIH1cbiAgICAgICAgcGF0aCA9IG5leHRUb2tlbigpO1xuICAgICAgfVxuICAgICAgd29ya2luZ3BhdGgucHVzaChhdHRycyk7XG4gICAgfVxuXG4gICAgaWYobGlzdGVuaW5nICYmIF8uaW5kZXhPZih0ZXJtaW5hdG9ycywgdG9rZW4udHlwZS50eXBlKSA+IC0xIHx8IF8uaW5kZXhPZih0ZXJtaW5hdG9ycywgdG9rZW4udmFsdWUpID4gLTEpe1xuICAgICAgd29ya2luZ3BhdGggPSBfLnJlZHVjZSh3b3JraW5ncGF0aCwgZnVuY3Rpb24obWVtbywgcGF0aHMpe1xuICAgICAgICB2YXIgbmV3TWVtbyA9IFtdO1xuICAgICAgICBwYXRocyA9ICghXy5pc0FycmF5KHBhdGhzKSkgPyBbcGF0aHNdIDogcGF0aHM7XG4gICAgICAgIF8uZWFjaChwYXRocywgZnVuY3Rpb24ocGF0aCl7XG4gICAgICAgICAgXy5lYWNoKG1lbW8sIGZ1bmN0aW9uKG1lbSl7XG4gICAgICAgICAgICBuZXdNZW1vLnB1c2goXy5jb21wYWN0KFttZW0sIHBhdGhdKS5qb2luKCcuJykucmVwbGFjZSgnLlsnLCAnWycpKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBuZXdNZW1vO1xuICAgICAgfSwgWycnXSk7XG4gICAgICBmaW5pc2hlZFBhdGhzID0gXy5jb21wYWN0KF8udW5pb24oZmluaXNoZWRQYXRocywgd29ya2luZ3BhdGgpKTtcbiAgICAgIHdvcmtpbmdwYXRoID0gW107XG4gICAgICBsaXN0ZW5pbmctLTtcbiAgICB9XG5cbiAgfSB3aGlsZSh0b2tlbi5zdGFydCAhPT0gdG9rZW4uZW5kKTtcblxuICBjb25zb2xlLmxvZygnQ09NUFVURUQgUFJPUEVSVFknLCBuYW1lLCAncmVnaXN0ZXJlZCB3aXRoIHRoZXNlIGRlcGVuZGFuY3kgcGF0aHM6JywgZmluaXNoZWRQYXRocyk7XG5cbiAgLy8gUmV0dXJuIHRoZSBkZXBlbmRhbmNpZXMgbGlzdFxuICByZXR1cm4gcHJvcC5fX3BhcmFtcyA9IGZpbmlzaGVkUGF0aHM7XG5cbn1cblxuZXhwb3J0IGRlZmF1bHQgeyBjb21waWxlOiBjb21waWxlIH07IiwiaW1wb3J0IHsgY29tcGlsZSBhcyBodG1sYmFyc0NvbXBpbGUsIGNvbXBpbGVTcGVjIGFzIGh0bWxiYXJzQ29tcGlsZVNwZWMgfSBmcm9tIFwiaHRtbGJhcnMtY29tcGlsZXIvY29tcGlsZXJcIjtcbmltcG9ydCB7IG1lcmdlIH0gZnJvbSBcImh0bWxiYXJzLXV0aWwvb2JqZWN0LXV0aWxzXCI7XG5pbXBvcnQgRE9NSGVscGVyIGZyb20gXCJtb3JwaC9kb20taGVscGVyXCI7XG5pbXBvcnQgaGVscGVycyBmcm9tIFwicmVib3VuZC1ydW50aW1lL2hlbHBlcnNcIjtcbmltcG9ydCBob29rcyBmcm9tIFwicmVib3VuZC1ydW50aW1lL2hvb2tzXCI7XG5cbmZ1bmN0aW9uIGNvbXBpbGUoc3RyaW5nLCBvcHRpb25zKXtcbiAgLy8gRW5zdXJlIHdlIGhhdmUgYSB3ZWxsLWZvcm1lZCBvYmplY3QgYXMgdmFyIG9wdGlvbnNcbiAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gIG9wdGlvbnMuaGVscGVycyA9IG9wdGlvbnMuaGVscGVycyB8fCB7fTtcbiAgb3B0aW9ucy5ob29rcyA9IG9wdGlvbnMuaG9va3MgfHwge307XG5cbiAgLy8gTWVyZ2Ugb3VyIGRlZmF1bHQgaGVscGVycyB3aXRoIHVzZXIgcHJvdmlkZWQgaGVscGVyc1xuICBvcHRpb25zLmhlbHBlcnMgPSBtZXJnZShoZWxwZXJzLCBvcHRpb25zLmhlbHBlcnMpO1xuICBvcHRpb25zLmhvb2tzID0gbWVyZ2UoaG9va3MsIG9wdGlvbnMuaG9va3MpO1xuXG4gIC8vIENvbXBpbGUgb3VyIHRlbXBsYXRlIGZ1bmN0aW9uXG4gIHZhciBmdW5jID0gaHRtbGJhcnNDb21waWxlKHN0cmluZywge1xuICAgIGhlbHBlcnM6IG9wdGlvbnMuaGVscGVycyxcbiAgICBob29rczogb3B0aW9ucy5ob29rc1xuICB9KTtcblxuICBmdW5jLl9yZW5kZXIgPSBmdW5jLnJlbmRlcjtcblxuICAvLyBSZXR1cm4gYSB3cmFwcGVyIGZ1bmN0aW9uIHRoYXQgd2lsbCBtZXJnZSB1c2VyIHByb3ZpZGVkIGhlbHBlcnMgd2l0aCBvdXIgZGVmYXVsdHNcbiAgZnVuYy5yZW5kZXIgPSBmdW5jdGlvbihkYXRhLCBlbnYsIGNvbnRleHQpe1xuICAgIC8vIEVuc3VyZSB3ZSBoYXZlIGEgd2VsbC1mb3JtZWQgb2JqZWN0IGFzIHZhciBvcHRpb25zXG4gICAgZW52ID0gZW52IHx8IHt9O1xuICAgIGVudi5oZWxwZXJzID0gZW52LmhlbHBlcnMgfHwge307XG4gICAgZW52Lmhvb2tzID0gZW52Lmhvb2tzIHx8IHt9O1xuICAgIGVudi5kb20gPSBlbnYuZG9tIHx8IG5ldyBET01IZWxwZXIoKTtcblxuICAgIC8vIE1lcmdlIG91ciBkZWZhdWx0IGhlbHBlcnMgYW5kIGhvb2tzIHdpdGggdXNlciBwcm92aWRlZCBoZWxwZXJzXG4gICAgZW52LmhlbHBlcnMgPSBtZXJnZShoZWxwZXJzLCBlbnYuaGVscGVycyk7XG4gICAgZW52Lmhvb2tzID0gbWVyZ2UoaG9va3MsIGVudi5ob29rcyk7XG5cbiAgICAvLyBTZXQgYSBkZWZhdWx0IGNvbnRleHQgaWYgaXQgZG9lc24ndCBleGlzdFxuICAgIGNvbnRleHQgPSBjb250ZXh0IHx8IGRvY3VtZW50LmJvZHk7XG5cbiAgICAvLyBDYWxsIG91ciBmdW5jIHdpdGggbWVyZ2VkIGhlbHBlcnMgYW5kIGhvb2tzXG4gICAgcmV0dXJuIGZ1bmMuX3JlbmRlcihkYXRhLCBlbnYsIGNvbnRleHQpO1xuICB9O1xuXG4gIGhlbHBlcnMucmVnaXN0ZXJQYXJ0aWFsKCBvcHRpb25zLm5hbWUsIGZ1bmMpO1xuXG4gIHJldHVybiBmdW5jO1xuXG59XG5cbmV4cG9ydCBkZWZhdWx0IGNvbXBpbGU7IiwiaW1wb3J0IE1vZGVsIGZyb20gXCJyZWJvdW5kLWRhdGEvbW9kZWxcIjtcbmltcG9ydCAkIGZyb20gXCJyZWJvdW5kLXJ1bnRpbWUvdXRpbHNcIjtcblxuLy8gSWYgUmVib3VuZCBSdW50aW1lIGhhcyBhbHJlYWR5IGJlZW4gcnVuLCB0aHJvdyBlcnJvclxuaWYoUmVib3VuZC5Db2xsZWN0aW9uKXtcbiAgdGhyb3cgJ1JlYm91bmQgQ29sbGVjdGlvbiBpcyBhbHJlYWR5IGxvYWRlZCBvbiB0aGUgcGFnZSEnO1xufVxuLy8gSWYgQmFja2JvbmUgaGFzbid0IGJlZW4gc3RhcnRlZCB5ZXQsIHRocm93IGVycm9yXG5pZighd2luZG93LkJhY2tib25lKXtcbiAgdGhyb3cgXCJCYWNrYm9uZSBtdXN0IGJlIG9uIHRoZSBwYWdlIGZvciBSZWJvdW5kIHRvIGxvYWQuXCI7XG59XG5cbmZ1bmN0aW9uIHBhdGhHZW5lcmF0b3IoY29sbGVjdGlvbil7XG4gIHJldHVybiBmdW5jdGlvbigpe1xuICAgIHJldHVybiBjb2xsZWN0aW9uLl9fcGF0aCgpICsgJ1snICsgY29sbGVjdGlvbi5pbmRleE9mKGNvbGxlY3Rpb24uX2J5SWRbdGhpcy5jaWRdKSArICddJztcbiAgfTtcbn1cblxudmFyIENvbGxlY3Rpb24gPSBCYWNrYm9uZS5Db2xsZWN0aW9uLmV4dGVuZCh7XG5cbiAgaXNDb2xsZWN0aW9uOiB0cnVlLFxuICBpc0RhdGE6IHRydWUsXG5cbiAgbW9kZWw6IHRoaXMubW9kZWwgfHwgTW9kZWwsXG5cbiAgX19wYXRoOiBmdW5jdGlvbigpe3JldHVybiAnJzt9LFxuXG4gIGNvbnN0cnVjdG9yOiBmdW5jdGlvbihtb2RlbHMsIG9wdGlvbnMpe1xuICAgIG1vZGVscyB8fCAobW9kZWxzID0gW10pO1xuICAgIG9wdGlvbnMgfHwgKG9wdGlvbnMgPSB7fSk7XG4gICAgdGhpcy5fX29ic2VydmVycyA9IHt9O1xuICAgIHRoaXMuaGVscGVycyA9IHt9O1xuICAgIHRoaXMuY2lkID0gXy51bmlxdWVJZCgnY29sbGVjdGlvbicpO1xuXG4gICAgLy8gU2V0IGxpbmVhZ2VcbiAgICB0aGlzLnNldFBhcmVudCggb3B0aW9ucy5wYXJlbnQgfHwgdGhpcyApO1xuICAgIHRoaXMuc2V0Um9vdCggb3B0aW9ucy5yb290IHx8IHRoaXMgKTtcbiAgICB0aGlzLl9fcGF0aCA9IG9wdGlvbnMucGF0aCB8fCB0aGlzLl9fcGF0aDtcblxuICAgIEJhY2tib25lLkNvbGxlY3Rpb24uYXBwbHkoIHRoaXMsIGFyZ3VtZW50cyApO1xuXG4gICAgLy8gV2hlbiBhIG1vZGVsIGlzIHJlbW92ZWQgZnJvbSBpdHMgb3JpZ2luYWwgY29sbGVjdGlvbiwgZGVzdHJveSBpdFxuICAgIC8vIFRPRE86IEZpeCB0aGlzLiBDb21wdXRlZCBwcm9wZXJ0aWVzIG5vdyBzb21laG93IGFsbG93IGNvbGxlY3Rpb24gdG8gc2hhcmUgYSBtb2RlbC4gVGhleSBtYXkgYmUgcmVtb3ZlZCBmcm9tIG9uZSBidXQgbm90IHRoZSBvdGhlci4gVGhhdCBpcyBiYWQuXG4gICAgLy8gVGhlIGNsb25lID0gZmFsc2Ugb3B0aW9ucyBpcyB0aGUgY3VscHJpdC4gRmluZCBhIGJldHRlciB3YXkgdG8gY29weSBhbGwgb2YgdGhlIGNvbGxlY3Rpb25zIGN1c3RvbSBhdHRyaWJ1dGVzIG92ZXIgdG8gdGhlIGNsb25lLlxuICAgIHRoaXMub24oJ3JlbW92ZScsIGZ1bmN0aW9uKG1vZGVsLCBjb2xsZWN0aW9uLCBvcHRpb25zKXtcbiAgICAgIC8vIG1vZGVsLmRlaW5pdGlhbGl6ZSgpO1xuICAgIH0pO1xuXG4gIH0sXG5cbiAgZ2V0OiBmdW5jdGlvbihrZXksIG9wdGlvbnMpe1xuXG4gICAgLy8gSWYgdGhlIGtleSBpcyBhIG51bWJlciBvciBvYmplY3QsIGRlZmF1bHQgdG8gYmFja2JvbmUncyBjb2xsZWN0aW9uIGdldFxuICAgIGlmKHR5cGVvZiBrZXkgPT0gJ251bWJlcicgfHwgdHlwZW9mIGtleSA9PSAnb2JqZWN0Jyl7XG4gICAgICByZXR1cm4gQmFja2JvbmUuQ29sbGVjdGlvbi5wcm90b3R5cGUuZ2V0LmNhbGwodGhpcywga2V5KTtcbiAgICB9XG5cbiAgICAvLyBJZiBrZXkgaXMgbm90IGEgc3RyaW5nLCByZXR1cm4gdW5kZWZpbmVkXG4gICAgaWYgKCFfLmlzU3RyaW5nKGtleSkpIHJldHVybiB2b2lkIDA7XG5cbiAgICAvLyBTcGxpdCB0aGUgcGF0aCBhdCBhbGwgJy4nLCAnWycgYW5kICddJyBhbmQgZmluZCB0aGUgdmFsdWUgcmVmZXJhbmNlZC5cbiAgICB2YXIgcGFydHMgID0gJC5zcGxpdFBhdGgoa2V5KSxcbiAgICAgICAgcmVzdWx0ID0gdGhpcyxcbiAgICAgICAgbD1wYXJ0cy5sZW5ndGgsXG4gICAgICAgIGk9MDtcbiAgICAgICAgb3B0aW9ucyA9IF8uZGVmYXVsdHMoKG9wdGlvbnMgfHwge30pLCB7IHJhdzogZmFsc2UgfSk7XG5cbiAgICBpZihfLmlzVW5kZWZpbmVkKGtleSkgfHwgXy5pc051bGwoa2V5KSkgcmV0dXJuIGtleTtcbiAgICBpZihrZXkgPT09ICcnIHx8IHBhcnRzLmxlbmd0aCA9PT0gMCkgcmV0dXJuIHJlc3VsdDtcblxuICAgIGlmIChwYXJ0cy5sZW5ndGggPiAwKSB7XG4gICAgICBmb3IgKCBpID0gMDsgaSA8IGw7IGkrKykge1xuICAgICAgICAvLyBJZiByZXR1cm5pbmcgcmF3LCBhbHdheXMgcmV0dXJuIHRoZSBmaXJzdCBjb21wdXRlZCBwcm9wZXJ0eSBmb3VuZC4gSWYgdW5kZWZpbmVkLCB5b3UncmUgZG9uZS5cbiAgICAgICAgaWYocmVzdWx0ICYmIHJlc3VsdC5pc0NvbXB1dGVkUHJvcGVydHkgJiYgb3B0aW9ucy5yYXcpIHJldHVybiByZXN1bHQ7XG4gICAgICAgIGlmKHJlc3VsdCAmJiByZXN1bHQuaXNDb21wdXRlZFByb3BlcnR5KSByZXN1bHQgPSByZXN1bHQudmFsdWUoKTtcbiAgICAgICAgaWYoXy5pc1VuZGVmaW5lZChyZXN1bHQpIHx8IF8uaXNOdWxsKHJlc3VsdCkpIHJldHVybiByZXN1bHQ7XG4gICAgICAgIGlmKHBhcnRzW2ldID09PSAnQHBhcmVudCcpIHJlc3VsdCA9IHJlc3VsdC5fX3BhcmVudF9fO1xuICAgICAgICBlbHNlIGlmKHJlc3VsdC5pc0NvbGxlY3Rpb24pIHJlc3VsdCA9IHJlc3VsdC5tb2RlbHNbcGFydHNbaV1dO1xuICAgICAgICBlbHNlIGlmKHJlc3VsdC5pc01vZGVsKSByZXN1bHQgPSByZXN1bHQuYXR0cmlidXRlc1twYXJ0c1tpXV07XG4gICAgICAgIGVsc2UgaWYocmVzdWx0Lmhhc093blByb3BlcnR5KHBhcnRzW2ldKSkgcmVzdWx0ID0gcmVzdWx0W3BhcnRzW2ldXTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZihyZXN1bHQgJiYgcmVzdWx0LmlzQ29tcHV0ZWRQcm9wZXJ0eSAmJiAhb3B0aW9ucy5yYXcpIHJlc3VsdCA9IHJlc3VsdC52YWx1ZSgpO1xuXG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfSxcblxuICBzZXQ6IGZ1bmN0aW9uKG1vZGVscywgb3B0aW9ucyl7XG4gICAgdmFyIG5ld01vZGVscyA9IFtdLFxuICAgICAgICBsaW5lYWdlID0ge1xuICAgICAgICAgIHBhcmVudDogdGhpcyxcbiAgICAgICAgICByb290OiB0aGlzLl9fcm9vdF9fLFxuICAgICAgICAgIHBhdGg6IHBhdGhHZW5lcmF0b3IodGhpcyksXG4gICAgICAgICAgc2lsZW50OiB0cnVlXG4gICAgICAgIH07XG4gICAgICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9LFxuXG4gICAgLy8gSWYgbm8gbW9kZWxzIHBhc3NlZCwgaW1wbGllcyBhbiBlbXB0eSBhcnJheVxuICAgIG1vZGVscyB8fCAobW9kZWxzID0gW10pO1xuXG4gICAgLy8gSWYgbW9kZWxzIGlzIGEgc3RyaW5nLCBjYWxsIHNldCBhdCB0aGF0IHBhdGhcbiAgICBpZihfLmlzU3RyaW5nKG1vZGVscykpIHJldHVybiB0aGlzLmdldCgkLnNwbGl0UGF0aChtb2RlbHMpWzBdKS5zZXQoJC5zcGxpdFBhdGgobW9kZWxzKS5zcGxpY2UoMSwgbW9kZWxzLmxlbmd0aCkuam9pbignLicpLCBvcHRpb25zKTtcbiAgICBpZighXy5pc09iamVjdChtb2RlbHMpKSByZXR1cm4gY29uc29sZS5lcnJvcignQ29sbGVjdGlvbi5zZXQgbXVzdCBiZSBwYXNzZWQgYSBNb2RlbCwgT2JqZWN0LCBhcnJheSBvciBNb2RlbHMgYW5kIE9iamVjdHMsIG9yIGFub3RoZXIgQ29sbGVjdGlvbicpO1xuXG4gICAgLy8gSWYgYW5vdGhlciBjb2xsZWN0aW9uLCB0cmVhdCBsaWtlIGFuIGFycmF5XG4gICAgbW9kZWxzID0gKG1vZGVscy5pc0NvbGxlY3Rpb24pID8gbW9kZWxzLm1vZGVscyA6IG1vZGVscztcbiAgICAvLyBFbnN1cmUgbW9kZWxzIGlzIGFuIGFycmF5XG4gICAgbW9kZWxzID0gKCFfLmlzQXJyYXkobW9kZWxzKSkgPyBbbW9kZWxzXSA6IG1vZGVscztcblxuICAgIC8vIElmIHRoZSBtb2RlbCBhbHJlYWR5IGV4aXN0cyBpbiB0aGlzIGNvbGxlY3Rpb24sIG9yIHdlIGFyZSB0b2xkIG5vdCB0byBjbG9uZSBpdCwgbGV0IEJhY2tib25lIGhhbmRsZSB0aGUgbWVyZ2VcbiAgICAvLyBPdGhlcndpc2UsIGNyZWF0ZSBvdXIgY29weSBvZiB0aGlzIG1vZGVsLCBnaXZlIHRoZW0gdGhlIHNhbWUgY2lkIHNvIG91ciBoZWxwZXJzIHRyZWF0IHRoZW0gYXMgdGhlIHNhbWUgb2JqZWN0XG4gICAgXy5lYWNoKG1vZGVscywgZnVuY3Rpb24oZGF0YSwgaW5kZXgpe1xuICAgICAgaWYoZGF0YS5pc01vZGVsICYmIG9wdGlvbnMuY2xvbmUgPT09IGZhbHNlIHx8IHRoaXMuX2J5SWRbZGF0YS5jaWRdKSByZXR1cm4gbmV3TW9kZWxzW2luZGV4XSA9IGRhdGE7XG4gICAgICBuZXdNb2RlbHNbaW5kZXhdID0gbmV3IHRoaXMubW9kZWwoZGF0YSwgXy5kZWZhdWx0cyhsaW5lYWdlLCBvcHRpb25zKSk7XG4gICAgICBkYXRhLmlzTW9kZWwgJiYgKG5ld01vZGVsc1tpbmRleF0uY2lkID0gZGF0YS5jaWQpO1xuICAgIH0sIHRoaXMpO1xuXG4gICAgLy8gRW5zdXJlIHRoYXQgdGhpcyBlbGVtZW50IG5vdyBrbm93cyB0aGF0IGl0IGhhcyBjaGlsZHJlbiBub3cuIFdpdGhvdXQgdGhpcyBjeWNsaWMgZGVwZW5kYW5jaWVzIGNhdXNlIGlzc3Vlc1xuICAgIHRoaXMuX2hhc0FuY2VzdHJ5IHx8ICh0aGlzLl9oYXNBbmNlc3RyeSA9IG5ld01vZGVscy5sZW5ndGggPiAwKTtcblxuICAgIC8vIENhbGwgb3JpZ2luYWwgc2V0IGZ1bmN0aW9uIHdpdGggbW9kZWwgZHVwbGljYXRlc1xuICAgIHJldHVybiBCYWNrYm9uZS5Db2xsZWN0aW9uLnByb3RvdHlwZS5zZXQuY2FsbCh0aGlzLCBuZXdNb2RlbHMsIG9wdGlvbnMpO1xuXG4gIH1cblxufSk7XG5cbmV4cG9ydCBkZWZhdWx0IENvbGxlY3Rpb247IiwiaW1wb3J0IHsgY29tcGlsZSBhcyBodG1sYmFyc0NvbXBpbGUsIGNvbXBpbGVTcGVjIGFzIGh0bWxiYXJzQ29tcGlsZVNwZWMgfSBmcm9tIFwiaHRtbGJhcnNcIjtcblxuZnVuY3Rpb24gZ2V0U2NyaXB0KHN0cil7XG4gIHJldHVybiAoc3RyLmluZGV4T2YoJzxzY3JpcHQ+JykgPiAtMSAmJiBzdHIuaW5kZXhPZignPC9zY3JpcHQ+JykgPiAtMSkgPyAnKGZ1bmN0aW9uKCl7JyArIHN0ci5yZXBsYWNlKC8oLio8c2NyaXB0PikoLiopKDxcXC9zY3JpcHQ+LiopL2lnLCAnJDInKSArICd9KSgpJyA6ICd7fSc7XG59XG5cbmZ1bmN0aW9uIGdldFN0eWxlKHN0cil7XG4gIHJldHVybiAoc3RyLmluZGV4T2YoJzxzdHlsZT4nKSA+IC0xICYmIHN0ci5pbmRleE9mKCc8L3N0eWxlPicpID4gLTEpID8gc3RyLnJlcGxhY2UoLyguKjxzdHlsZT4pKC4qKSg8XFwvc3R5bGU+LiopL2lnLCAnJDInKS5yZXBsYWNlKC9cIi9nLCAnXFxcXFwiJykgOiAnJztcbn1cblxuZnVuY3Rpb24gZ2V0VGVtcGxhdGUoc3RyKXtcbiAgcmV0dXJuIHN0ci5yZXBsYWNlKC8uKjx0ZW1wbGF0ZT4oLiopPFxcL3RlbXBsYXRlPi4qL2dpLCAnJDEnKS5yZXBsYWNlKC8oLiopPHN0eWxlPi4qPFxcL3N0eWxlPiguKikvaWcsICckMSQyJyk7XG59XG5cbmZ1bmN0aW9uIGdldE5hbWUoc3RyKXtcbiAgcmV0dXJuIHN0ci5yZXBsYWNlKC8uKjxlbGVtZW50W14+XSpuYW1lPShbXCInXSk/KFteJ1wiPlxcc10rKVxcMVtePD5dKj4uKi9pZywgJyQyJyk7XG59XG5cbmZ1bmN0aW9uIG1pbmlmeShzdHIpe1xuICByZXR1cm4gc3RyLnJlcGxhY2UoL1xccysvZywgJyAnKS5yZXBsYWNlKC9cXG58KD4pICg8KS9nLCAnJDEkMicpO1xufVxuXG5mdW5jdGlvbiByZW1vdmVDb21tZW50cyhzdHIpe1xuICByZXR1cm4gc3RyLnJlcGxhY2UoLyg/OlxcL1xcKig/OltcXHNcXFNdKj8pXFwqXFwvKXwoPzooW1xcc10pK1xcL1xcLyg/Oi4qKSQpL2dtLCAnJDEnKTtcbn1cblxuZnVuY3Rpb24gdGVtcGxhdGVGdW5jKGZuKSB7XG4gIHZhciBzcmMgPSBmbi50b1N0cmluZygpO1xuICBzcmMgPSBzcmMuc2xpY2Uoc3JjLmluZGV4T2YoXCJ7XCIpICsgMSwgLTEpO1xuICByZXR1cm4gZnVuY3Rpb24oZGF0YSkge1xuICAgIHJldHVybiAhZGF0YSA/IHNyYyA6IHNyYy5yZXBsYWNlKC8oXFwkW2EtekEtWl0rKS9nLCBmdW5jdGlvbigkcmVwKSB7XG4gICAgICB2YXIga2V5ID0gJHJlcC5zbGljZSgxKTtcbiAgICAgIHJldHVybiBkYXRhW2tleV0gfHwgXCJcIjtcbiAgICB9KTtcbiAgfTtcbn1cblxudmFyIENPTVBPTkVOVF9URU1QTEFURSA9IHRlbXBsYXRlRnVuYyhmdW5jdGlvbiAoKSB7XG4gIHJldHVybiAoZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHdpbmRvdy5SZWJvdW5kLnJlZ2lzdGVyQ29tcG9uZW50KFwiJG5hbWVcIiwge1xuICAgICAgcHJvdG90eXBlOiAkc2NyaXB0LFxuICAgICAgdGVtcGxhdGU6ICR0ZW1wbGF0ZSxcbiAgICAgIHN0eWxlOiBcIiRzdHlsZVwiXG4gICAgfSk7XG4gIH0pKCk7XG59KTtcblxuZnVuY3Rpb24gcHJlY29tcGlsZShzdHIsIG9wdGlvbnMpe1xuICBpZiggIXN0ciB8fCBzdHIubGVuZ3RoID09PSAwICl7XG4gICAgcmV0dXJuIGNvbnNvbGUuZXJyb3IoJ05vIHRlbXBsYXRlIHByb3ZpZGVkIScpO1xuICB9XG5cbiAgLy8gUmVtb3ZlIGNvbW1lbnRzXG4gIHN0ciA9IHJlbW92ZUNvbW1lbnRzKHN0cik7XG4gIC8vIE1pbmlmeSBldmVyeXRoaW5nXG4gIHN0ciA9IG1pbmlmeShzdHIpO1xuXG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICBvcHRpb25zLmJhc2VEZXN0ID0gb3B0aW9ucy5iYXNlRGVzdCB8fCAnJztcbiAgb3B0aW9ucy5uYW1lID0gb3B0aW9ucy5uYW1lIHx8ICcnO1xuICBvcHRpb25zLmJhc2VVcmwgPSBvcHRpb25zLmJhc2VVcmwgfHwgJyc7XG5cbiAgdmFyIHRlbXBsYXRlID0gc3RyLFxuICAgICAgc3R5bGUgPSAnJyxcbiAgICAgIHNjcmlwdCA9ICd7fScsXG4gICAgICBuYW1lID0gJycsXG4gICAgICBpc1BhcnRpYWwgPSB0cnVlLFxuICAgICAgaW1wb3J0cyA9IFtdLFxuICAgICAgcGFydGlhbHMsXG4gICAgICByZXF1aXJlLFxuICAgICAgZGVwcyA9IFtdO1xuXG4gIC8vIElmIHRoZSBlbGVtZW50IHRhZyBpcyBwcmVzZW50XG4gIGlmKHN0ci5pbmRleE9mKCc8ZWxlbWVudCcpID4gLTEgJiYgc3RyLmluZGV4T2YoJzwvZWxlbWVudD4nKSA+IC0xKXtcblxuICAgIGlzUGFydGlhbCA9IGZhbHNlO1xuXG4gICAgbmFtZSA9IGdldE5hbWUoc3RyKTtcbiAgICBzdHlsZSA9IGdldFN0eWxlKHN0cik7XG4gICAgdGVtcGxhdGUgPSBnZXRUZW1wbGF0ZShzdHIpO1xuICAgIHNjcmlwdCA9IGdldFNjcmlwdChzdHIpO1xuXG4gIH1cblxuXG4gIC8vIEFzc2VtcGxlIG91ciBjb21wb25lbnQgZGVwZW5kYW5jaWVzIGJ5IGZpbmRpbmcgbGluayB0YWdzIGFuZCBwYXJzaW5nIHRoZWlyIHNyY1xuICB2YXIgaW1wb3J0c3JlID0gLzxsaW5rIFteaF0qaHJlZj0oWydcIl0/KVxcLz8oW14uJ1wiXSopLmh0bWxcXDFbXj5dKj4vZ2ksXG4gICAgICBtYXRjaDtcblxuICB3aGlsZSAoKG1hdGNoID0gaW1wb3J0c3JlLmV4ZWModGVtcGxhdGUpKSAhPSBudWxsKSB7XG4gICAgICBpbXBvcnRzLnB1c2gobWF0Y2hbMl0pO1xuICB9XG4gIGltcG9ydHMuZm9yRWFjaChmdW5jdGlvbihpbXBvcnRTdHJpbmcsIGluZGV4KXtcbiAgICBkZXBzLnB1c2goJ1wiJyArIG9wdGlvbnMuYmFzZURlc3QgKyBpbXBvcnRTdHJpbmcgKyAnXCInKTtcbiAgfSk7XG5cbiAgLy8gUmVtb3ZlIGxpbmsgdGFncyBmcm9tIHRlbXBsYXRlXG4gIHRlbXBsYXRlID0gdGVtcGxhdGUucmVwbGFjZSgvPGxpbmsgLipocmVmPShbJ1wiXT8pKC4qKS5odG1sXFwxW14+XSo+L2dpLCAnJyk7XG5cblxuICAvLyBBc3NlbWJsZSBvdXIgcGFydGlhbCBkZXBlbmRhbmNpZXNcbiAgcGFydGlhbHMgPSB0ZW1wbGF0ZS5tYXRjaCgvXFx7XFx7Plxccyo/WydcIl0/KFteJ1wifVxcc10qKVsnXCJdP1xccyo/XFx9XFx9L2dpKTtcblxuICBpZihwYXJ0aWFscyl7XG4gICAgcGFydGlhbHMuZm9yRWFjaChmdW5jdGlvbihwYXJ0aWFsLCBpbmRleCl7XG4gICAgICBkZXBzLnB1c2goJ1wiJyArIG9wdGlvbnMuYmFzZURlc3QgKyBwYXJ0aWFsLnJlcGxhY2UoL1xce1xcez5bXFxzKl0/WydcIl0/KFteJ1wiXSopWydcIl0/W1xccypdP1xcfVxcfS9naSwgJyQxJykgKyAnXCInKTtcbiAgICB9KTtcbiAgfVxuXG4gIC8vIENvbXBpbGVcbiAgdGVtcGxhdGUgPSAnJyArIGh0bWxiYXJzQ29tcGlsZVNwZWModGVtcGxhdGUpO1xuXG4gIC8vIElmIGlzIGEgcGFydGlhbFxuICBpZihpc1BhcnRpYWwpe1xuICAgIHRlbXBsYXRlID0gJyhmdW5jdGlvbigpe3ZhciB0ZW1wbGF0ZSA9ICcrdGVtcGxhdGUrJ1xcbiB3aW5kb3cuUmVib3VuZC5yZWdpc3RlclBhcnRpYWwoIFwiJysgb3B0aW9ucy5uYW1lICsnXCIsIHRlbXBsYXRlKTt9KSgpO1xcbic7XG4gIH1cbiAgLy8gRWxzZSwgaXMgYSBjb21wb25lbnRcbiAgZWxzZXtcbiAgICB0ZW1wbGF0ZSA9IENPTVBPTkVOVF9URU1QTEFURSh7XG4gICAgICBuYW1lOiBuYW1lLFxuICAgICAgc2NyaXB0OiBzY3JpcHQsXG4gICAgICBzdHlsZTogc3R5bGUsXG4gICAgICB0ZW1wbGF0ZTogdGVtcGxhdGVcbiAgICB9KTtcbiAgfVxuXG4gIC8vIFdyYXAgaW4gZGVmaW5lXG4gIHRlbXBsYXRlID0gXCJkZWZpbmUoIFtcIisgZGVwcy5qb2luKCcsICcpICArXCJdLCBmdW5jdGlvbigpe1xcblwiICsgdGVtcGxhdGUgKyAnfSk7JztcblxuICByZXR1cm4gdGVtcGxhdGU7XG59XG5cbmV4cG9ydCB7IHByZWNvbXBpbGUgfTtcbiIsImltcG9ydCAkIGZyb20gXCJyZWJvdW5kLXJ1bnRpbWUvdXRpbHNcIjtcblxuLy8gSWYgUmVib3VuZCBSdW50aW1lIGhhcyBhbHJlYWR5IGJlZW4gcnVuLCB0aHJvdyBlcnJvclxuaWYoUmVib3VuZC5Sb3V0ZXIpeyB0aHJvdyAnUmVib3VuZCBpcyBhbHJlYWR5IGxvYWRlZCBvbiB0aGUgcGFnZSEnOyB9XG4vLyBJZiBSZWJvdW5kIGdsb2JhbCBvYmplY3QgaXNuJ3QgaW5zdGFudGlhdGVkLCBjcmVhdGUgaXRcbmlmKCFfLmlzT2JqZWN0KHdpbmRvdy5SZWJvdW5kKSl7IHdpbmRvdy5SZWJvdW5kID0ge307IH1cbi8vIElmIEJhY2tib25lIGhhc24ndCBiZWVuIHN0YXJ0ZWQgeWV0LCB0aHJvdyBlcnJvclxuaWYoIXdpbmRvdy5CYWNrYm9uZSl7IHRocm93IFwiQmFja2JvbmUgbXVzdCBiZSBvbiB0aGUgcGFnZSBmb3IgUmVib3VuZCB0byBsb2FkLlwiOyB9XG5cbiAgLy8gQ2xlYW4gdXAgb2xkIHBhZ2UgY29tcG9uZW50IGFuZCBsb2FkIHJvdXRlcyBmcm9tIG91ciBuZXcgcGFnZSBjb21wb25lbnRcbiAgZnVuY3Rpb24gaW5zdGFsbFJlc291cmNlcyhQYWdlQXBwLCBwcmltYXJ5Um91dGUsIGlzR2xvYmFsKSB7XG4gICAgdmFyIG9sZFBhZ2VOYW1lLCBwYWdlSW5zdGFuY2UsIGNvbnRhaW5lciwgcm91dGVyID0gdGhpcztcblxuICAgIC8vIERlLWluaXRpYWxpemUgdGhlIHByZXZpb3VzIGFwcCBiZWZvcmUgcmVuZGVyaW5nIGEgbmV3IGFwcFxuICAgIC8vIFRoaXMgd2F5IHdlIGNhbiBlbnN1cmUgdGhhdCBldmVyeSBuZXcgcGFnZSBzdGFydHMgd2l0aCBhIGNsZWFuIHNsYXRlXG4gICAgLy8gVGhpcyBpcyBjcnVjaWFsIGZvciBzY2FsYWJpbGl0eSBvZiBhIHNpbmdsZSBwYWdlIGFwcC5cbiAgICBpZighaXNHbG9iYWwgJiYgdGhpcy5jdXJyZW50KXtcblxuICAgICAgb2xkUGFnZU5hbWUgPSB0aGlzLmN1cnJlbnQuX19uYW1lO1xuICAgICAgLy8gVW5zZXQgUHJldmlvdXMgQXBwbGljYXRpb24ncyBSb3V0ZXMuIEZvciBlYWNoIHJvdXRlIGluIHRoZSBwYWdlIGFwcDpcbiAgICAgIF8uZWFjaCh0aGlzLmN1cnJlbnQuX19jb21wb25lbnRfXy5yb3V0ZXMsIGZ1bmN0aW9uICh2YWx1ZSwga2V5KSB7XG5cbiAgICAgICAgdmFyIHJlZ0V4cCA9IHJvdXRlci5fcm91dGVUb1JlZ0V4cChrZXkpLnRvU3RyaW5nKCk7XG5cbiAgICAgICAgLy8gUmVtb3ZlIHRoZSBoYW5kbGVyIGZyb20gb3VyIHJvdXRlIG9iamVjdFxuICAgICAgICBCYWNrYm9uZS5oaXN0b3J5LmhhbmRsZXJzID0gXy5maWx0ZXIoQmFja2JvbmUuaGlzdG9yeS5oYW5kbGVycywgZnVuY3Rpb24ob2JqKXtyZXR1cm4gb2JqLnJvdXRlLnRvU3RyaW5nKCkgIT09IHJlZ0V4cDt9KTtcblxuICAgICAgICAvLyBEZWxldGUgb3VyIHJlZmVyYW5jZSB0byB0aGUgcm91dGUncyBjYWxsYmFja1xuICAgICAgICBkZWxldGUgcm91dGVyWyAnX2Z1bmN0aW9uXycgKyBrZXkgXTtcblxuICAgICAgfSk7XG5cbiAgICAgIC8vIFVuLWhvb2sgRXZlbnQgQmluZGluZ3MsIERlbGV0ZSBPYmplY3RzXG4gICAgICB0aGlzLmN1cnJlbnQuX19jb21wb25lbnRfXy5kZWluaXRpYWxpemUoKTtcblxuICAgICAgLy8gRGlzYWJsZSBvbGQgY3NzIGlmIGl0IGV4aXN0c1xuICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpe1xuICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChvbGRQYWdlTmFtZSArICctY3NzJykuc2V0QXR0cmlidXRlKCdkaXNhYmxlZCcsIHRydWUpO1xuICAgICAgfSwgNTAwKTtcblxuICAgIH1cblxuICAgIC8vIExvYWQgTmV3IFBhZ2VBcHAsIGdpdmUgaXQgaXQncyBuYW1lIHNvIHdlIGtub3cgd2hhdCBjc3MgdG8gcmVtb3ZlIHdoZW4gaXQgZGVpbml0aWFsaXplc1xuICAgIHBhZ2VJbnN0YW5jZSA9IG5ldyBQYWdlQXBwKCk7XG4gICAgcGFnZUluc3RhbmNlLl9fbmFtZSA9IHByaW1hcnlSb3V0ZTtcblxuXG4gICAgLy8gQWRkIHRvIG91ciBwYWdlXG4gICAgY29udGFpbmVyID0gKGlzR2xvYmFsKSA/IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoaXNHbG9iYWwpIDogZG9jdW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ2NvbnRlbnQnKVswXTtcbiAgICBjb250YWluZXIuaW5uZXJIVE1MID0gJyc7XG4gICAgY29udGFpbmVyLmFwcGVuZENoaWxkKHBhZ2VJbnN0YW5jZSk7XG5cbiAgICAvLyBNYWtlIHN1cmUgd2UncmUgYmFjayBhdCB0aGUgdG9wIG9mIHRoZSBwYWdlXG4gICAgZG9jdW1lbnQuYm9keS5zY3JvbGxUb3AgPSAwO1xuXG5cbiAgICAvLyBBdWdtZW50IEFwcGxpY2F0aW9uUm91dGVyIHdpdGggbmV3IHJvdXRlcyBmcm9tIFBhZ2VBcHBcbiAgICBfLmVhY2gocGFnZUluc3RhbmNlLl9fY29tcG9uZW50X18ucm91dGVzLCBmdW5jdGlvbiAodmFsdWUsIGtleSkge1xuICAgICAgLy8gR2VuZXJhdGUgb3VyIHJvdXRlIGNhbGxiYWNrJ3MgbmV3IG5hbWVcbiAgICAgIHZhciByb3V0ZUZ1bmN0aW9uTmFtZSA9ICdfZnVuY3Rpb25fJyArIGtleSxcbiAgICAgICAgICBmdW5jdGlvbk5hbWU7XG4gICAgICAvLyBBZGQgdGhlIG5ldyBjYWxsYmFjayByZWZlcmFuY2Ugb24gdG8gb3VyIHJvdXRlclxuICAgICAgcm91dGVyW3JvdXRlRnVuY3Rpb25OYW1lXSA9ICBmdW5jdGlvbiAoKSB7IHBhZ2VJbnN0YW5jZS5fX2NvbXBvbmVudF9fW3ZhbHVlXS5hcHBseShwYWdlSW5zdGFuY2UuX19jb21wb25lbnRfXywgYXJndW1lbnRzKTsgfTtcbiAgICAgIC8vIEFkZCB0aGUgcm91dGUgaGFuZGxlclxuICAgICAgcm91dGVyLnJvdXRlKGtleSwgdmFsdWUsIHRoaXNbcm91dGVGdW5jdGlvbk5hbWVdKTtcbiAgICB9LCB0aGlzKTtcblxuICAgIGlmKCFpc0dsb2JhbCl7XG4gICAgICB3aW5kb3cuUmVib3VuZC5wYWdlID0gKHRoaXMuY3VycmVudCA9IHBhZ2VJbnN0YW5jZSkuX19jb21wb25lbnRfXztcbiAgICB9XG5cbiAgICAvLyBSZXR1cm4gb3VyIG5ld2x5IGluc3RhbGxlZCBhcHBcbiAgICByZXR1cm4gcGFnZUluc3RhbmNlO1xuICB9XG5cbiAgLy8gRmV0Y2hlcyBQYXJlIEhUTUwgYW5kIENTU1xuICBmdW5jdGlvbiBmZXRjaFJlc291cmNlcyhhcHBOYW1lLCBwcmltYXJ5Um91dGUsIGlzR2xvYmFsKSB7XG5cbiAgICAvLyBFeHBlY3RpbmcgTW9kdWxlIERlZmluaXRpb24gYXMgJ1NlYXJjaEFwcCcgV2hlcmUgJ1NlYXJjaCcgYSBQcmltYXJ5IFJvdXRlXG4gICAgdmFyIGpzVXJsID0gdGhpcy5jb25maWcuanNQYXRoLnJlcGxhY2UoLzpyb3V0ZS9nLCBwcmltYXJ5Um91dGUpLnJlcGxhY2UoLzphcHAvZywgYXBwTmFtZSksXG4gICAgICAgIGNzc1VybCA9IHRoaXMuY29uZmlnLmNzc1BhdGgucmVwbGFjZSgvOnJvdXRlL2csIHByaW1hcnlSb3V0ZSkucmVwbGFjZSgvOmFwcC9nLCBhcHBOYW1lKSxcbiAgICAgICAgY3NzTG9hZGVkID0gZmFsc2UsXG4gICAgICAgIGpzTG9hZGVkID0gZmFsc2UsXG4gICAgICAgIGNzc0VsZW1lbnQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChhcHBOYW1lICsgJy1jc3MnKSxcbiAgICAgICAganNFbGVtZW50ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoYXBwTmFtZSArICctanMnKSxcbiAgICAgICAgcm91dGVyID0gdGhpcyxcbiAgICAgICAgUGFnZUFwcDtcblxuICAgICAgLy8gT25seSBMb2FkIENTUyBJZiBOb3QgTG9hZGVkIEJlZm9yZVxuICAgICAgaWYoIWNzc0VsZW1lbnQpe1xuICAgICAgICBjc3NFbGVtZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnbGluaycpO1xuICAgICAgICBjc3NFbGVtZW50LnNldEF0dHJpYnV0ZSgndHlwZScsICd0ZXh0L2NzcycpO1xuICAgICAgICBjc3NFbGVtZW50LnNldEF0dHJpYnV0ZSgncmVsJywgJ3N0eWxlc2hlZXQnKTtcbiAgICAgICAgY3NzRWxlbWVudC5zZXRBdHRyaWJ1dGUoJ2hyZWYnLCBjc3NVcmwpO1xuICAgICAgICBjc3NFbGVtZW50LnNldEF0dHJpYnV0ZSgnaWQnLCBhcHBOYW1lICsgJy1jc3MnKTtcbiAgICAgICAgZG9jdW1lbnQuaGVhZC5hcHBlbmRDaGlsZChjc3NFbGVtZW50KTtcbiAgICAgICAgJChjc3NFbGVtZW50KS5vbignbG9hZCcsIGZ1bmN0aW9uKGV2ZW50KXtcbiAgICAgICAgICAgIGlmKChjc3NMb2FkZWQgPSB0cnVlKSAmJiBqc0xvYWRlZCl7XG4gICAgICAgICAgICAgIC8vIEluc3RhbGwgVGhlIExvYWRlZCBSZXNvdXJjZXNcbiAgICAgICAgICAgICAgaW5zdGFsbFJlc291cmNlcy5jYWxsKHJvdXRlciwgUGFnZUFwcCwgYXBwTmFtZSwgaXNHbG9iYWwpO1xuXG4gICAgICAgICAgICAgIC8vIFJlLXRyaWdnZXIgcm91dGUgc28gdGhlIG5ld2x5IGFkZGVkIHJvdXRlIG1heSBleGVjdXRlIGlmIHRoZXJlJ3MgYSByb3V0ZSBtYXRjaC5cbiAgICAgICAgICAgICAgLy8gSWYgbm8gcm91dGVzIGFyZSBtYXRjaGVkLCBhcHAgd2lsbCBoaXQgd2lsZENhcmQgcm91dGUgd2hpY2ggd2lsbCB0aGVuIHRyaWdnZXIgNDA0XG4gICAgICAgICAgICAgIGlmKCFpc0dsb2JhbCAmJiByb3V0ZXIuY29uZmlnLnRyaWdnZXJPbkZpcnN0TG9hZCl7XG4gICAgICAgICAgICAgICAgQmFja2JvbmUuaGlzdG9yeS5sb2FkVXJsKEJhY2tib25lLmhpc3RvcnkuZnJhZ21lbnQpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGlmKCFpc0dsb2JhbCl7XG4gICAgICAgICAgICAgICAgcm91dGVyLmNvbmZpZy50cmlnZ2VyT25GaXJzdExvYWQgPSB0cnVlO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGRvY3VtZW50LmJvZHkuY2xhc3NMaXN0LnJlbW92ZSgnbG9hZGluZycpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgfVxuICAgICAgLy8gSWYgaXQgaGFzIGJlZW4gbG9hZGVkIGJldm9yZSwgZW5hYmxlIGl0XG4gICAgICBlbHNlIHtcbiAgICAgICAgY3NzRWxlbWVudC5yZW1vdmVBdHRyaWJ1dGUoJ2Rpc2FibGVkJyk7XG4gICAgICAgIGNzc0xvYWRlZCA9IHRydWU7XG4gICAgICB9XG5cbiAgICAgIC8vIElmIGlmIHJlcXVpcmVqcyBpcyBub3Qgb24gdGhlIHBhZ2UsIGxvYWQgdGhlIGZpbGUgbWFudWFsbHkuIEl0IGJldHRlciBjb250YWluIGFsbCBpdHMgZGVwZW5kYW5jaWVzLlxuICAgICAgaWYod2luZG93LnJlcXVpcmUuX2RlZmluZWQgfHwgXy5pc1VuZGVmaW5lZCh3aW5kb3cucmVxdWlyZSkpe1xuICAgICAgICAgIGpzRWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NjcmlwdCcpO1xuICAgICAgICAgIGpzRWxlbWVudC5zZXRBdHRyaWJ1dGUoJ3R5cGUnLCAndGV4dC9qYXZhc2NyaXB0Jyk7XG4gICAgICAgICAganNFbGVtZW50LnNldEF0dHJpYnV0ZSgnc3JjJywgJy8nK2pzVXJsKycuanMnKTtcbiAgICAgICAgICBqc0VsZW1lbnQuc2V0QXR0cmlidXRlKCdpZCcsIGFwcE5hbWUgKyAnLWpzJyk7XG4gICAgICAgICAgZG9jdW1lbnQuaGVhZC5hcHBlbmRDaGlsZChqc0VsZW1lbnQpO1xuICAgICAgICAgICQoanNFbGVtZW50KS5vbignbG9hZCcsIGZ1bmN0aW9uKGV2ZW50KXtcbiAgICAgICAgICAgIC8vIEFNRCBXaWxsIE1hbmFnZSBEZXBlbmRhbmNpZXMgRm9yIFVzLiBMb2FkIFRoZSBBcHAuXG4gICAgICAgICAgICByZXF1aXJlKFtqc1VybF0sIGZ1bmN0aW9uKFBhZ2VDbGFzcyl7XG5cbiAgICAgICAgICAgICAgaWYoKGpzTG9hZGVkID0gdHJ1ZSkgJiYgKFBhZ2VBcHAgPSBQYWdlQ2xhc3MpICYmIGNzc0xvYWRlZCl7XG5cbiAgICAgICAgICAgICAgICAvLyBJbnN0YWxsIFRoZSBMb2FkZWQgUmVzb3VyY2VzXG4gICAgICAgICAgICAgICAgaW5zdGFsbFJlc291cmNlcy5jYWxsKHJvdXRlciwgUGFnZUFwcCwgYXBwTmFtZSwgaXNHbG9iYWwpO1xuICAgICAgICAgICAgICAgIC8vIFJlLXRyaWdnZXIgcm91dGUgc28gdGhlIG5ld2x5IGFkZGVkIHJvdXRlIG1heSBleGVjdXRlIGlmIHRoZXJlJ3MgYSByb3V0ZSBtYXRjaC5cbiAgICAgICAgICAgICAgICAvLyBJZiBubyByb3V0ZXMgYXJlIG1hdGNoZWQsIGFwcCB3aWxsIGhpdCB3aWxkQ2FyZCByb3V0ZSB3aGljaCB3aWxsIHRoZW4gdHJpZ2dlciA0MDRcbiAgICAgICAgICAgICAgICBpZighaXNHbG9iYWwgJiYgcm91dGVyLmNvbmZpZy50cmlnZ2VyT25GaXJzdExvYWQpe1xuICAgICAgICAgICAgICAgICAgQmFja2JvbmUuaGlzdG9yeS5sb2FkVXJsKEJhY2tib25lLmhpc3RvcnkuZnJhZ21lbnQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZighaXNHbG9iYWwpe1xuICAgICAgICAgICAgICAgICAgcm91dGVyLmNvbmZpZy50cmlnZ2VyT25GaXJzdExvYWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGRvY3VtZW50LmJvZHkuY2xhc3NMaXN0LnJlbW92ZSgnbG9hZGluZycpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9KTtcblxuICAgICAgfVxuICAgICAgZWxzZXtcbiAgICAgICAgLy8gQU1EIFdpbGwgTWFuYWdlIERlcGVuZGFuY2llcyBGb3IgVXMuIExvYWQgVGhlIEFwcC5cbiAgICAgICAgd2luZG93LnJlcXVpcmUoW2pzVXJsXSwgZnVuY3Rpb24oUGFnZUNsYXNzKXtcblxuICAgICAgICAgIGlmKChqc0xvYWRlZCA9IHRydWUpICYmIChQYWdlQXBwID0gUGFnZUNsYXNzKSAmJiBjc3NMb2FkZWQpe1xuXG4gICAgICAgICAgICAvLyBJbnN0YWxsIFRoZSBMb2FkZWQgUmVzb3VyY2VzXG4gICAgICAgICAgICBpbnN0YWxsUmVzb3VyY2VzLmNhbGwocm91dGVyLCBQYWdlQXBwLCBhcHBOYW1lLCBpc0dsb2JhbCk7XG4gICAgICAgICAgICAvLyBSZS10cmlnZ2VyIHJvdXRlIHNvIHRoZSBuZXdseSBhZGRlZCByb3V0ZSBtYXkgZXhlY3V0ZSBpZiB0aGVyZSdzIGEgcm91dGUgbWF0Y2guXG4gICAgICAgICAgICAvLyBJZiBubyByb3V0ZXMgYXJlIG1hdGNoZWQsIGFwcCB3aWxsIGhpdCB3aWxkQ2FyZCByb3V0ZSB3aGljaCB3aWxsIHRoZW4gdHJpZ2dlciA0MDRcbiAgICAgICAgICAgIGlmKCFpc0dsb2JhbCAmJiByb3V0ZXIuY29uZmlnLnRyaWdnZXJPbkZpcnN0TG9hZCl7XG4gICAgICAgICAgICAgIEJhY2tib25lLmhpc3RvcnkubG9hZFVybChCYWNrYm9uZS5oaXN0b3J5LmZyYWdtZW50KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYoIWlzR2xvYmFsKXtcbiAgICAgICAgICAgICAgcm91dGVyLmNvbmZpZy50cmlnZ2VyT25GaXJzdExvYWQgPSB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZG9jdW1lbnQuYm9keS5jbGFzc0xpc3QucmVtb3ZlKCdsb2FkaW5nJyk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH1cblxuICB9XG5cbiAgLy8gUmVib3VuZFJvdXRlciBDb25zdHJ1Y3RvclxuICB2YXIgUmVib3VuZFJvdXRlciA9IEJhY2tib25lLlJvdXRlci5leHRlbmQoe1xuXG4gICAgcm91dGVzOiB7XG4gICAgICAnKnJvdXRlJzogJ3dpbGRjYXJkUm91dGUnXG4gICAgfSxcblxuICAgIC8vIENhbGxlZCB3aGVuIG5vIG1hdGNoaW5nIHJvdXRlcyBhcmUgZm91bmQuIEV4dHJhY3RzIHJvb3Qgcm91dGUgYW5kIGZldGNoZXMgaXQgcmVzb3VyY2VzXG4gICAgd2lsZGNhcmRSb3V0ZTogZnVuY3Rpb24ocm91dGUpIHtcbiAgICAgIHZhciBhcHBOYW1lLCBwcmltYXJ5Um91dGU7XG5cbiAgICAgIC8vIElmIGVtcHR5IHJvdXRlIHNlbnQsIHJvdXRlIGhvbWVcbiAgICAgIHJvdXRlID0gcm91dGUgfHwgJyc7XG5cbiAgICAgIC8vIEdldCBSb290IG9mIFJvdXRlXG4gICAgICBhcHBOYW1lID0gcHJpbWFyeVJvdXRlID0gKHJvdXRlKSA/IHJvdXRlLnNwbGl0KCcvJylbMF0gOiAnaW5kZXgnO1xuXG4gICAgICAvLyBGaW5kIEFueSBDdXN0b20gUm91dGUgTWFwcGluZ3NcbiAgICAgIF8uYW55KHRoaXMuY29uZmlnLmhhbmRsZXJzLCBmdW5jdGlvbihoYW5kbGVyKSB7XG4gICAgICAgIGlmIChoYW5kbGVyLnJvdXRlLnRlc3Qocm91dGUpKSB7XG4gICAgICAgICAgYXBwTmFtZSA9IGhhbmRsZXIucHJpbWFyeVJvdXRlO1xuICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICB9KTtcblxuICAgICAgLy8gSWYgUGFnZSBJcyBBbHJlYWR5IExvYWRlZCBUaGVuIFRoZSBSb3V0ZSBEb2VzIE5vdCBFeGlzdC4gNDA0IGFuZCBFeGl0LlxuICAgICAgaWYgKHRoaXMuY3VycmVudCAmJiB0aGlzLmN1cnJlbnQubmFtZSA9PT0gcHJpbWFyeVJvdXRlKSB7XG4gICAgICAgIHJldHVybiBCYWNrYm9uZS5oaXN0b3J5LmxvYWRVcmwoJzQwNCcpO1xuICAgICAgfVxuXG4gICAgICAvLyBGZXRjaCBSZXNvdXJjZXNcbiAgICAgIGRvY3VtZW50LmJvZHkuY2xhc3NMaXN0LmFkZChcImxvYWRpbmdcIik7XG4gICAgICBmZXRjaFJlc291cmNlcy5jYWxsKHRoaXMsIGFwcE5hbWUsIHByaW1hcnlSb3V0ZSk7XG4gICAgfSxcblxuICAgIC8vIE9uIHN0YXJ0dXAsIHNhdmUgb3VyIGNvbmZpZyBvYmplY3QgYW5kIHN0YXJ0IHRoZSByb3V0ZXJcbiAgICBpbml0aWFsaXplOiBmdW5jdGlvbihvcHRpb25zKSB7XG5cbiAgICAgIC8vIFNhdmUgb3VyIGNvbmZpZyByZWZlcmFuY2VcbiAgICAgIHRoaXMuY29uZmlnID0gb3B0aW9ucy5jb25maWc7XG4gICAgICB0aGlzLmNvbmZpZy5oYW5kbGVycyA9IFtdO1xuXG4gICAgICB2YXIgYWJzb2x1dGVVcmwgPSBuZXcgUmVnRXhwKCdeKD86W2Etel0rOik/Ly8nLCAnaScpLFxuICAgICAgcm91dGVyID0gdGhpcztcblxuICAgICAgLy8gQ29udmVydCBvdXIgcm91dGVNYXBwaW5ncyB0byByZWdleHBzIGFuZCBwdXNoIHRvIG91ciBoYW5kbGVyc1xuICAgICAgXy5lYWNoKHRoaXMuY29uZmlnLnJvdXRlTWFwcGluZywgZnVuY3Rpb24odmFsdWUsIHJvdXRlKXtcbiAgICAgICAgaWYgKCFfLmlzUmVnRXhwKHJvdXRlKSkgcm91dGUgPSByb3V0ZXIuX3JvdXRlVG9SZWdFeHAocm91dGUpO1xuICAgICAgICByb3V0ZXIuY29uZmlnLmhhbmRsZXJzLnVuc2hpZnQoeyByb3V0ZTogcm91dGUsIHByaW1hcnlSb3V0ZTogdmFsdWUgfSk7XG4gICAgICB9LCB0aGlzKTtcblxuICAgICAgLy8gTmF2aWdhdGUgdG8gcm91dGUgZm9yIGFueSBsaW5rIHdpdGggYSByZWxhdGl2ZSBocmVmXG4gICAgICAkKGRvY3VtZW50KS5vbignY2xpY2snLCAnYScsIGZ1bmN0aW9uKGUpe1xuXG4gICAgICAgIHZhciBwYXRoID0gZS50YXJnZXQuZ2V0QXR0cmlidXRlKCdocmVmJyk7XG5cbiAgICAgICAgLy8gSWYgcGF0aCBpcyBub3QgYW4gYWJzb2x1dGUgdXJsLCBvciBibGFuaywgdHJ5IGFuZCBuYXZpZ2F0ZSB0byB0aGF0IHJvdXRlLlxuICAgICAgICBpZihwYXRoICE9PSAnIycgJiYgcGF0aCAhPT0gJycgJiYgIWFic29sdXRlVXJsLnRlc3QocGF0aCkpe1xuICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICByb3V0ZXIubmF2aWdhdGUocGF0aCwge3RyaWdnZXI6IHRydWV9KTtcbiAgICAgICAgfVxuICAgICAgfSk7XG5cbiAgICAgIC8vIEluc3RhbGwgb3VyIGdsb2JhbCBjb21wb25lbnRzXG4gICAgICBfLmVhY2godGhpcy5jb25maWcuZ2xvYmFsQ29tcG9uZW50cywgZnVuY3Rpb24oc2VsZWN0b3IsIHJvdXRlKXtcbiAgICAgICAgZmV0Y2hSZXNvdXJjZXMuY2FsbChyb3V0ZXIsIHJvdXRlLCByb3V0ZSwgc2VsZWN0b3IpO1xuICAgICAgfSk7XG5cblxuICAgICAgLy8gTGV0IGFsbCBvZiBvdXIgY29tcG9uZW50cyBhbHdheXMgaGF2ZSByZWZlcmFuY2UgdG8gb3VyIHJvdXRlclxuICAgICAgUmVib3VuZC5Db21wb25lbnQucHJvdG90eXBlLnJvdXRlciA9IHRoaXM7XG5cbiAgICAgIC8vIFN0YXJ0IHRoZSBoaXN0b3J5XG4gICAgICBCYWNrYm9uZS5oaXN0b3J5LnN0YXJ0KHtcbiAgICAgICAgcHVzaFN0YXRlOiB0cnVlLFxuICAgICAgICByb290OiB0aGlzLmNvbmZpZy5yb290XG4gICAgICB9KTtcblxuICAgIH1cbiAgfSk7XG5cblxuZXhwb3J0IGRlZmF1bHQgUmVib3VuZFJvdXRlcjsiLCJpbXBvcnQgJCBmcm9tIFwicmVib3VuZC1ydW50aW1lL3V0aWxzXCI7XG5pbXBvcnQgZW52IGZyb20gXCJyZWJvdW5kLXJ1bnRpbWUvZW52XCI7XG5pbXBvcnQgQ29udGV4dCBmcm9tIFwicmVib3VuZC1ydW50aW1lL2NvbnRleHRcIjtcblxuLy8gSWYgUmVib3VuZCBSdW50aW1lIGhhcyBhbHJlYWR5IGJlZW4gcnVuLCB0aHJvdyBlcnJvclxuaWYoUmVib3VuZC5Db21wb25lbnQpe1xuICB0aHJvdyAnUmVib3VuZCBpcyBhbHJlYWR5IGxvYWRlZCBvbiB0aGUgcGFnZSEnO1xufVxuLy8gSWYgQmFja2JvbmUgaGFzbid0IGJlZW4gc3RhcnRlZCB5ZXQsIHRocm93IGVycm9yXG5pZighd2luZG93LkJhY2tib25lKXtcbiAgdGhyb3cgXCJCYWNrYm9uZSBtdXN0IGJlIG9uIHRoZSBwYWdlIGZvciBSZWJvdW5kIHRvIGxvYWQuXCI7XG59XG5cbi8vIE5ldyBCYWNrYm9uZSBDb21wb25lbnRcbnZhciBDb21wb25lbnQgPSBDb250ZXh0LmV4dGVuZCh7XG5cbiAgaXNDb21wb25lbnQ6IHRydWUsXG5cbiAgY29uc3RydWN0b3I6IGZ1bmN0aW9uKG9wdGlvbnMpe1xuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IChvcHRpb25zID0ge30pO1xuICAgIF8uYmluZEFsbCh0aGlzLCAnX19jYWxsT25Db21wb25lbnQnKTtcbiAgICB0aGlzLmNpZCA9IF8udW5pcXVlSWQoJ2NvbXBvbmVudCcpO1xuICAgIHRoaXMuYXR0cmlidXRlcyA9IHt9O1xuICAgIHRoaXMuY2hhbmdlZCA9IHt9O1xuICAgIHRoaXMuaGVscGVycyA9IHt9O1xuICAgIHRoaXMuX19wYXJlbnRfXyA9IHRoaXMuX19yb290X18gPSB0aGlzO1xuICAgIHRoaXMubGlzdGVuKCk7XG5cbiAgICAvLyBUYWtlIG91ciBwYXJzZWQgZGF0YSBhbmQgYWRkIGl0IHRvIG91ciBiYWNrYm9uZSBkYXRhIHN0cnVjdHVyZS4gRG9lcyBhIGRlZXAgZGVmYXVsdHMgc2V0LlxuICAgIC8vIEluIHRoZSBtb2RlbCwgcHJpbWF0aXZlcyAoYXJyYXlzLCBvYmplY3RzLCBldGMpIGFyZSBjb252ZXJ0ZWQgdG8gQmFja2JvbmUgT2JqZWN0c1xuICAgIC8vIEZ1bmN0aW9ucyBhcmUgY29tcGlsZWQgdG8gZmluZCB0aGVpciBkZXBlbmRhbmNpZXMgYW5kIGFkZGVkIGFzIGNvbXB1dGVkIHByb3BlcnRpZXNcbiAgICAvLyBTZXQgb3VyIGNvbXBvbmVudCdzIGNvbnRleHQgd2l0aCB0aGUgcGFzc2VkIGRhdGEgbWVyZ2VkIHdpdGggdGhlIGNvbXBvbmVudCdzIGRlZmF1bHRzXG4gICAgdGhpcy5zZXQoKHRoaXMuZGVmYXVsdHMgfHwge30pKTtcbiAgICB0aGlzLnNldCgob3B0aW9ucy5kYXRhIHx8IHt9KSk7XG5cbiAgICAvLyBDYWxsIG9uIGNvbXBvbmVudCBpcyB1c2VkIGJ5IHRoZSB7e29ufX0gaGVscGVyIHRvIGNhbGwgYWxsIGV2ZW50IGNhbGxiYWNrcyBpbiB0aGUgc2NvcGUgb2YgdGhlIGNvbXBvbmVudFxuICAgIHRoaXMuaGVscGVycy5fX2NhbGxPbkNvbXBvbmVudCA9IHRoaXMuX19jYWxsT25Db21wb25lbnQ7XG5cblxuICAgIC8vIEdldCBhbnkgYWRkaXRpb25hbCByb3V0ZXMgcGFzc2VkIGluIGZyb20gb3B0aW9uc1xuICAgIHRoaXMucm91dGVzID0gIF8uZGVmYXVsdHMoKG9wdGlvbnMucm91dGVzIHx8IHt9KSwgdGhpcy5yb3V0ZXMpO1xuICAgIC8vIEVuc3VyZSB0aGF0IGFsbCByb3V0ZSBmdW5jdGlvbnMgZXhpc3RcbiAgICBfLmVhY2godGhpcy5yb3V0ZXMsIGZ1bmN0aW9uKHZhbHVlLCBrZXksIHJvdXRlcyl7XG4gICAgICAgIGlmKHR5cGVvZiB2YWx1ZSAhPT0gJ3N0cmluZycpeyB0aHJvdygnRnVuY3Rpb24gbmFtZSBwYXNzZWQgdG8gcm91dGVzIGluICAnICsgdGhpcy5fX25hbWUgKyAnIGNvbXBvbmVudCBtdXN0IGJlIGEgc3RyaW5nIScpOyB9XG4gICAgICAgIGlmKCF0aGlzW3ZhbHVlXSl7IHRocm93KCdDYWxsYmFjayBmdW5jdGlvbiAnK3ZhbHVlKycgZG9lcyBub3QgZXhpc3Qgb24gdGhlICAnICsgdGhpcy5fX25hbWUgKyAnIGNvbXBvbmVudCEnKTsgfVxuICAgIH0sIHRoaXMpO1xuXG5cbiAgICAvLyBTZXQgb3VyIG91dGxldCBhbmQgdGVtcGxhdGUgaWYgd2UgaGF2ZSBvbmVcbiAgICB0aGlzLmVsID0gb3B0aW9ucy5vdXRsZXQgfHwgdW5kZWZpbmVkO1xuICAgIHRoaXMuJGVsID0gKF8uaXNVbmRlZmluZWQod2luZG93LkJhY2tib25lLiQpKSA/IGZhbHNlIDogd2luZG93LkJhY2tib25lLiQodGhpcy5lbCk7XG5cbiAgICBpZihfLmlzRnVuY3Rpb24odGhpcy5jcmVhdGVkQ2FsbGJhY2spKXtcbiAgICAgIHRoaXMuY3JlYXRlZENhbGxiYWNrLmNhbGwodGhpcyk7XG4gICAgfVxuXG4gICAgLy8gVGFrZSBvdXIgcHJlY29tcGlsZWQgdGVtcGxhdGUgYW5kIGh5ZHJhdGVzIGl0LiBXaGVuIFJlYm91bmQgQ29tcGlsZXIgaXMgaW5jbHVkZWQsIGNhbiBiZSBhIGhhbmRsZWJhcnMgdGVtcGxhdGUgc3RyaW5nLlxuICAgIGlmKCFvcHRpb25zLnRlbXBsYXRlICYmICF0aGlzLnRlbXBsYXRlKXsgdGhyb3coJ1RlbXBsYXRlIG11c3QgcHJvdmlkZWQgZm9yICcgKyB0aGlzLl9fbmFtZSArICcgY29tcG9uZW50IScpOyB9XG4gICAgdGhpcy50ZW1wbGF0ZSA9IG9wdGlvbnMudGVtcGxhdGUgfHwgdGhpcy50ZW1wbGF0ZTtcbiAgICB0aGlzLnRlbXBsYXRlID0gKHR5cGVvZiBvcHRpb25zLnRlbXBsYXRlID09PSAnc3RyaW5nJykgPyBSZWJvdW5kLnRlbXBsYXRlc1t0aGlzLnRlbXBsYXRlXSA6IGVudi5oeWRyYXRlKHRoaXMudGVtcGxhdGUpO1xuXG5cbiAgICAvLyBSZW5kZXIgb3VyIGRvbSBhbmQgcGxhY2UgdGhlIGRvbSBpbiBvdXIgY3VzdG9tIGVsZW1lbnRcbiAgICB0aGlzLmVsLmFwcGVuZENoaWxkKHRoaXMudGVtcGxhdGUodGhpcywge2hlbHBlcnM6IHRoaXMuaGVscGVyc30sIHRoaXMuZWwpKTtcblxuICAgIHRoaXMuaW5pdGlhbGl6ZSgpO1xuXG4gIH0sXG5cbiAgJDogZnVuY3Rpb24oc2VsZWN0b3IpIHtcbiAgICBpZighdGhpcy4kZWwpe1xuICAgICAgcmV0dXJuIGNvbnNvbGUuZXJyb3IoJ05vIERPTSBtYW5pcHVsYXRpb24gbGlicmFyeSBvbiB0aGUgcGFnZSEnKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuJGVsLmZpbmQoc2VsZWN0b3IpO1xuICB9LFxuXG4gIC8vIFRyaWdnZXIgYWxsIGV2ZW50cyBvbiBib3RoIHRoZSBjb21wb25lbnQgYW5kIHRoZSBlbGVtZW50XG4gIHRyaWdnZXI6IGZ1bmN0aW9uKGV2ZW50TmFtZSl7XG4gICAgaWYodGhpcy5lbCl7XG4gICAgICAkKHRoaXMuZWwpLnRyaWdnZXIoZXZlbnROYW1lLCBhcmd1bWVudHMpO1xuICAgIH1cbiAgICBCYWNrYm9uZS5Nb2RlbC5wcm90b3R5cGUudHJpZ2dlci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICB9LFxuXG4gIF9fY2FsbE9uQ29tcG9uZW50OiBmdW5jdGlvbihuYW1lLCBldmVudCl7XG4gICAgaWYoIV8uaXNGdW5jdGlvbih0aGlzW25hbWVdKSl7IHRocm93IFwiRVJST1I6IE5vIG1ldGhvZCBuYW1lZCBcIiArIG5hbWUgKyBcIiBvbiBjb21wb25lbnQgXCIgKyB0aGlzLl9fbmFtZSArIFwiIVwiOyB9XG4gICAgcmV0dXJuIHRoaXNbbmFtZV0uY2FsbCh0aGlzLCBldmVudCk7XG4gIH0sXG5cbiAgX29uQXR0cmlidXRlQ2hhbmdlOiBmdW5jdGlvbihhdHRyTmFtZSwgb2xkVmFsLCBuZXdWYWwpe1xuICAgIC8vIENvbW1lbnRlZCBvdXQgYmVjYXVzZSB0cmFja2luZyBhdHRyaWJ1dGUgY2hhbmdlcyBhbmQgbWFraW5nIHN1cmUgdGhleSBkb250IGluZmluaXRlIGxvb3AgaXMgaGFyZC5cbiAgICAvLyBUT0RPOiBNYWtlIHdvcmsuXG4gICAgLy8gdHJ5eyBuZXdWYWwgPSBKU09OLnBhcnNlKG5ld1ZhbCk7IH0gY2F0Y2ggKGUpeyBuZXdWYWwgPSBuZXdWYWw7IH1cbiAgICAvL1xuICAgIC8vIC8vIGRhdGEgYXR0cmlidXRlcyBzaG91bGQgYmUgcmVmZXJhbmNlZCBieSB0aGVpciBjYW1lbCBjYXNlIG5hbWVcbiAgICAvLyBhdHRyTmFtZSA9IGF0dHJOYW1lLnJlcGxhY2UoL15kYXRhLS9nLCBcIlwiKS5yZXBsYWNlKC8tKFthLXpdKS9nLCBmdW5jdGlvbiAoZykgeyByZXR1cm4gZ1sxXS50b1VwcGVyQ2FzZSgpOyB9KTtcbiAgICAvL1xuICAgIC8vIG9sZFZhbCA9IHRoaXMuZ2V0KGF0dHJOYW1lKTtcbiAgICAvL1xuICAgIC8vIGlmKG5ld1ZhbCA9PT0gbnVsbCl7IHRoaXMudW5zZXQoYXR0ck5hbWUpOyB9XG4gICAgLy9cbiAgICAvLyAvLyBJZiBvbGRWYWwgaXMgYSBudW1iZXIsIGFuZCBuZXdWYWwgaXMgb25seSBudW1lcmljYWwsIHByZXNlcnZlIHR5cGVcbiAgICAvLyBpZihfLmlzTnVtYmVyKG9sZFZhbCkgJiYgXy5pc1N0cmluZyhuZXdWYWwpICYmIG5ld1ZhbC5tYXRjaCgvXlswLTldKiQvaSkpe1xuICAgIC8vICAgbmV3VmFsID0gcGFyc2VJbnQobmV3VmFsKTtcbiAgICAvLyB9XG4gICAgLy9cbiAgICAvLyBlbHNleyB0aGlzLnNldChhdHRyTmFtZSwgbmV3VmFsLCB7cXVpZXQ6IHRydWV9KTsgfVxuICB9LFxuXG59KTtcblxuQ29tcG9uZW50LmV4dGVuZD0gZnVuY3Rpb24ocHJvdG9Qcm9wcywgc3RhdGljUHJvcHMpIHtcbiAgdmFyIHBhcmVudCA9IHRoaXMsXG4gICAgICBjaGlsZCxcbiAgICAgIHJlc2VydmVkTWV0aG9kcyA9IHsndHJpZ2dlcic6MSwgJ2NvbnN0cnVjdG9yJzoxLCAnZ2V0JzoxLCAnc2V0JzoxLCAnaGFzJzoxLCAnZXh0ZW5kJzoxLCAnZXNjYXBlJzoxLCAndW5zZXQnOjEsICdjbGVhcic6MSwgJ2NpZCc6MSwgJ2F0dHJpYnV0ZXMnOjEsICdjaGFuZ2VkJzoxLCAndG9KU09OJzoxLCAndmFsaWRhdGlvbkVycm9yJzoxLCAnaXNWYWxpZCc6MSwgJ2lzTmV3JzoxLCAnaGFzQ2hhbmdlZCc6MSwgJ2NoYW5nZWRBdHRyaWJ1dGVzJzoxLCAncHJldmlvdXMnOjEsICdwcmV2aW91c0F0dHJpYnV0ZXMnOjF9LFxuICAgICAgY29uZmlnUHJvcGVydGllcyA9IHsncm91dGVzJzoxLCAndGVtcGxhdGUnOjEsICdkZWZhdWx0cyc6MSwgJ291dGxldCc6MSwgJ3VybCc6MSwgJ3VybFJvb3QnOjEsICdpZEF0dHJpYnV0ZSc6MSwgJ2lkJzoxLCAnY3JlYXRlZENhbGxiYWNrJzoxLCAnYXR0YWNoZWRDYWxsYmFjayc6MSwgJ2RldGFjaGVkQ2FsbGJhY2snOjF9O1xuXG4gIHByb3RvUHJvcHMuZGVmYXVsdHMgPSB7fTtcblxuICAvLyBGb3IgZWFjaCBwcm9wZXJ0eSBwYXNzZWQgaW50byBvdXIgY29tcG9uZW50IGJhc2UgY2xhc3NcbiAgXy5lYWNoKHByb3RvUHJvcHMsIGZ1bmN0aW9uKHZhbHVlLCBrZXksIHByb3RvUHJvcHMpe1xuXG4gICAgLy8gSWYgYSBjb25maWd1cmF0aW9uIHByb3BlcnR5LCBpZ25vcmUgaXRcbiAgICBpZihjb25maWdQcm9wZXJ0aWVzW2tleV0peyByZXR1cm47IH1cblxuICAgIC8vIElmIGEgcHJpbWF0aXZlIG9yIGJhY2tib25lIHR5cGUgb2JqZWN0LCBvciBjb21wdXRlZCBwcm9wZXJ0eSAoZnVuY3Rpb24gd2hpY2ggdGFrZXMgbm8gYXJndW1lbnRzIGFuZCByZXR1cm5zIGEgdmFsdWUpIG1vdmUgaXQgdG8gb3VyIGRlZmF1bHRzXG4gICAgaWYoIV8uaXNGdW5jdGlvbih2YWx1ZSkgfHwgdmFsdWUuaXNNb2RlbCB8fCB2YWx1ZS5pc0NvbXBvbmVudCB8fCAoXy5pc0Z1bmN0aW9uKHZhbHVlKSAmJiB2YWx1ZS5sZW5ndGggPT09IDAgJiYgdmFsdWUudG9TdHJpbmcoKS5pbmRleE9mKCdyZXR1cm4nKSA+IC0xKSl7XG4gICAgICBwcm90b1Byb3BzLmRlZmF1bHRzW2tleV0gPSB2YWx1ZTtcbiAgICAgIGRlbGV0ZSBwcm90b1Byb3BzW2tleV07XG4gICAgfVxuXG4gICAgLy8gSWYgYSByZXNlcnZlZCBtZXRob2QsIHllbGxcbiAgICBpZihyZXNlcnZlZE1ldGhvZHNba2V5XSl7IHRocm93IFwiRVJST1I6IFwiICsga2V5ICsgXCIgaXMgYSByZXNlcnZlZCBtZXRob2QgbmFtZSBpbiBcIiArIHN0YXRpY1Byb3BzLl9fbmFtZSArIFwiIVwiOyB9XG5cbiAgICAvLyBBbGwgb3RoZXIgdmFsdWVzIGFyZSBjb21wb25lbnQgbWV0aG9kcywgbGVhdmUgdGhlbSBiZSB1bmxlc3MgYWxyZWFkeSBkZWZpbmVkLlxuXG4gIH0sIHRoaXMpO1xuXG4gIC8vIElmIGdpdmVuIGEgY29uc3RydWN0b3IsIHVzZSBpdCwgb3RoZXJ3aXNlIHVzZSB0aGUgZGVmYXVsdCBvbmUgZGVmaW5lZCBhYm92ZVxuICBpZiAocHJvdG9Qcm9wcyAmJiBfLmhhcyhwcm90b1Byb3BzLCAnY29uc3RydWN0b3InKSkge1xuICAgIGNoaWxkID0gcHJvdG9Qcm9wcy5jb25zdHJ1Y3RvcjtcbiAgfSBlbHNlIHtcbiAgICBjaGlsZCA9IGZ1bmN0aW9uKCl7IHJldHVybiBwYXJlbnQuYXBwbHkodGhpcywgYXJndW1lbnRzKTsgfTtcbiAgfVxuXG4gIC8vIE91ciBjbGFzcyBzaG91bGQgaW5oZXJpdCBldmVyeXRoaW5nIGZyb20gaXRzIHBhcmVudCwgZGVmaW5lZCBhYm92ZVxuICB2YXIgU3Vycm9nYXRlID0gZnVuY3Rpb24oKXsgdGhpcy5jb25zdHJ1Y3RvciA9IGNoaWxkOyB9O1xuICBTdXJyb2dhdGUucHJvdG90eXBlID0gcGFyZW50LnByb3RvdHlwZTtcbiAgY2hpbGQucHJvdG90eXBlID0gbmV3IFN1cnJvZ2F0ZSgpO1xuXG4gIC8vIEV4dGVuZCBvdXIgcHJvdG90eXBlIHdpdGggYW55IHJlbWFpbmluZyBwcm90b1Byb3BzLCBvdmVycml0aW5nIHByZS1kZWZpbmVkIG9uZXNcbiAgaWYgKHByb3RvUHJvcHMpeyBfLmV4dGVuZChjaGlsZC5wcm90b3R5cGUsIHByb3RvUHJvcHMsIHN0YXRpY1Byb3BzKTsgfVxuXG4gIC8vIFNldCBvdXIgYW5jZXN0cnlcbiAgY2hpbGQuX19zdXBlcl9fID0gcGFyZW50LnByb3RvdHlwZTtcblxuICByZXR1cm4gY2hpbGQ7XG59O1xuXG5cbmV4cG9ydCBkZWZhdWx0IENvbXBvbmVudDtcbiIsIi8qanNoaW50IC1XMDU0ICovXG4vLyBqc2hpbnQgaWdub3JlOiBzdGFydFxuXG4gIC8vIEEgc2Vjb25kIG9wdGlvbmFsIGFyZ3VtZW50IGNhbiBiZSBnaXZlbiB0byBmdXJ0aGVyIGNvbmZpZ3VyZVxuICAvLyB0aGUgcGFyc2VyIHByb2Nlc3MuIFRoZXNlIG9wdGlvbnMgYXJlIHJlY29nbml6ZWQ6XG5cbiAgdmFyIGV4cG9ydHMgPSB7fTtcblxuICB2YXIgb3B0aW9ucywgaW5wdXQsIGlucHV0TGVuLCBzb3VyY2VGaWxlO1xuXG4gIHZhciBkZWZhdWx0T3B0aW9ucyA9IGV4cG9ydHMuZGVmYXVsdE9wdGlvbnMgPSB7XG4gICAgLy8gYGVjbWFWZXJzaW9uYCBpbmRpY2F0ZXMgdGhlIEVDTUFTY3JpcHQgdmVyc2lvbiB0byBwYXJzZS4gTXVzdFxuICAgIC8vIGJlIGVpdGhlciAzLCBvciA1LCBvciA2LiBUaGlzIGluZmx1ZW5jZXMgc3VwcG9ydCBmb3Igc3RyaWN0XG4gICAgLy8gbW9kZSwgdGhlIHNldCBvZiByZXNlcnZlZCB3b3Jkcywgc3VwcG9ydCBmb3IgZ2V0dGVycyBhbmRcbiAgICAvLyBzZXR0ZXJzIGFuZCBvdGhlciBmZWF0dXJlcy4gRVM2IHN1cHBvcnQgaXMgb25seSBwYXJ0aWFsLlxuICAgIGVjbWFWZXJzaW9uOiA1LFxuICAgIC8vIFR1cm4gb24gYHN0cmljdFNlbWljb2xvbnNgIHRvIHByZXZlbnQgdGhlIHBhcnNlciBmcm9tIGRvaW5nXG4gICAgLy8gYXV0b21hdGljIHNlbWljb2xvbiBpbnNlcnRpb24uXG4gICAgc3RyaWN0U2VtaWNvbG9uczogZmFsc2UsXG4gICAgLy8gV2hlbiBgYWxsb3dUcmFpbGluZ0NvbW1hc2AgaXMgZmFsc2UsIHRoZSBwYXJzZXIgd2lsbCBub3QgYWxsb3dcbiAgICAvLyB0cmFpbGluZyBjb21tYXMgaW4gYXJyYXkgYW5kIG9iamVjdCBsaXRlcmFscy5cbiAgICBhbGxvd1RyYWlsaW5nQ29tbWFzOiB0cnVlLFxuICAgIC8vIEJ5IGRlZmF1bHQsIHJlc2VydmVkIHdvcmRzIGFyZSBub3QgZW5mb3JjZWQuIEVuYWJsZVxuICAgIC8vIGBmb3JiaWRSZXNlcnZlZGAgdG8gZW5mb3JjZSB0aGVtLiBXaGVuIHRoaXMgb3B0aW9uIGhhcyB0aGVcbiAgICAvLyB2YWx1ZSBcImV2ZXJ5d2hlcmVcIiwgcmVzZXJ2ZWQgd29yZHMgYW5kIGtleXdvcmRzIGNhbiBhbHNvIG5vdCBiZVxuICAgIC8vIHVzZWQgYXMgcHJvcGVydHkgbmFtZXMuXG4gICAgZm9yYmlkUmVzZXJ2ZWQ6IGZhbHNlLFxuICAgIC8vIFdoZW4gZW5hYmxlZCwgYSByZXR1cm4gYXQgdGhlIHRvcCBsZXZlbCBpcyBub3QgY29uc2lkZXJlZCBhblxuICAgIC8vIGVycm9yLlxuICAgIGFsbG93UmV0dXJuT3V0c2lkZUZ1bmN0aW9uOiBmYWxzZSxcbiAgICAvLyBXaGVuIGBsb2NhdGlvbnNgIGlzIG9uLCBgbG9jYCBwcm9wZXJ0aWVzIGhvbGRpbmcgb2JqZWN0cyB3aXRoXG4gICAgLy8gYHN0YXJ0YCBhbmQgYGVuZGAgcHJvcGVydGllcyBpbiBge2xpbmUsIGNvbHVtbn1gIGZvcm0gKHdpdGhcbiAgICAvLyBsaW5lIGJlaW5nIDEtYmFzZWQgYW5kIGNvbHVtbiAwLWJhc2VkKSB3aWxsIGJlIGF0dGFjaGVkIHRvIHRoZVxuICAgIC8vIG5vZGVzLlxuICAgIGxvY2F0aW9uczogZmFsc2UsXG4gICAgLy8gQSBmdW5jdGlvbiBjYW4gYmUgcGFzc2VkIGFzIGBvbkNvbW1lbnRgIG9wdGlvbiwgd2hpY2ggd2lsbFxuICAgIC8vIGNhdXNlIEFjb3JuIHRvIGNhbGwgdGhhdCBmdW5jdGlvbiB3aXRoIGAoYmxvY2ssIHRleHQsIHN0YXJ0LFxuICAgIC8vIGVuZClgIHBhcmFtZXRlcnMgd2hlbmV2ZXIgYSBjb21tZW50IGlzIHNraXBwZWQuIGBibG9ja2AgaXMgYVxuICAgIC8vIGJvb2xlYW4gaW5kaWNhdGluZyB3aGV0aGVyIHRoaXMgaXMgYSBibG9jayAoYC8qICovYCkgY29tbWVudCxcbiAgICAvLyBgdGV4dGAgaXMgdGhlIGNvbnRlbnQgb2YgdGhlIGNvbW1lbnQsIGFuZCBgc3RhcnRgIGFuZCBgZW5kYCBhcmVcbiAgICAvLyBjaGFyYWN0ZXIgb2Zmc2V0cyB0aGF0IGRlbm90ZSB0aGUgc3RhcnQgYW5kIGVuZCBvZiB0aGUgY29tbWVudC5cbiAgICAvLyBXaGVuIHRoZSBgbG9jYXRpb25zYCBvcHRpb24gaXMgb24sIHR3byBtb3JlIHBhcmFtZXRlcnMgYXJlXG4gICAgLy8gcGFzc2VkLCB0aGUgZnVsbCBge2xpbmUsIGNvbHVtbn1gIGxvY2F0aW9ucyBvZiB0aGUgc3RhcnQgYW5kXG4gICAgLy8gZW5kIG9mIHRoZSBjb21tZW50cy4gTm90ZSB0aGF0IHlvdSBhcmUgbm90IGFsbG93ZWQgdG8gY2FsbCB0aGVcbiAgICAvLyBwYXJzZXIgZnJvbSB0aGUgY2FsbGJhY2vigJR0aGF0IHdpbGwgY29ycnVwdCBpdHMgaW50ZXJuYWwgc3RhdGUuXG4gICAgb25Db21tZW50OiBudWxsLFxuICAgIC8vIE5vZGVzIGhhdmUgdGhlaXIgc3RhcnQgYW5kIGVuZCBjaGFyYWN0ZXJzIG9mZnNldHMgcmVjb3JkZWQgaW5cbiAgICAvLyBgc3RhcnRgIGFuZCBgZW5kYCBwcm9wZXJ0aWVzIChkaXJlY3RseSBvbiB0aGUgbm9kZSwgcmF0aGVyIHRoYW5cbiAgICAvLyB0aGUgYGxvY2Agb2JqZWN0LCB3aGljaCBob2xkcyBsaW5lL2NvbHVtbiBkYXRhLiBUbyBhbHNvIGFkZCBhXG4gICAgLy8gW3NlbWktc3RhbmRhcmRpemVkXVtyYW5nZV0gYHJhbmdlYCBwcm9wZXJ0eSBob2xkaW5nIGEgYFtzdGFydCxcbiAgICAvLyBlbmRdYCBhcnJheSB3aXRoIHRoZSBzYW1lIG51bWJlcnMsIHNldCB0aGUgYHJhbmdlc2Agb3B0aW9uIHRvXG4gICAgLy8gYHRydWVgLlxuICAgIC8vXG4gICAgLy8gW3JhbmdlXTogaHR0cHM6Ly9idWd6aWxsYS5tb3ppbGxhLm9yZy9zaG93X2J1Zy5jZ2k/aWQ9NzQ1Njc4XG4gICAgcmFuZ2VzOiBmYWxzZSxcbiAgICAvLyBJdCBpcyBwb3NzaWJsZSB0byBwYXJzZSBtdWx0aXBsZSBmaWxlcyBpbnRvIGEgc2luZ2xlIEFTVCBieVxuICAgIC8vIHBhc3NpbmcgdGhlIHRyZWUgcHJvZHVjZWQgYnkgcGFyc2luZyB0aGUgZmlyc3QgZmlsZSBhc1xuICAgIC8vIGBwcm9ncmFtYCBvcHRpb24gaW4gc3Vic2VxdWVudCBwYXJzZXMuIFRoaXMgd2lsbCBhZGQgdGhlXG4gICAgLy8gdG9wbGV2ZWwgZm9ybXMgb2YgdGhlIHBhcnNlZCBmaWxlIHRvIHRoZSBgUHJvZ3JhbWAgKHRvcCkgbm9kZVxuICAgIC8vIG9mIGFuIGV4aXN0aW5nIHBhcnNlIHRyZWUuXG4gICAgcHJvZ3JhbTogbnVsbCxcbiAgICAvLyBXaGVuIGBsb2NhdGlvbnNgIGlzIG9uLCB5b3UgY2FuIHBhc3MgdGhpcyB0byByZWNvcmQgdGhlIHNvdXJjZVxuICAgIC8vIGZpbGUgaW4gZXZlcnkgbm9kZSdzIGBsb2NgIG9iamVjdC5cbiAgICBzb3VyY2VGaWxlOiBudWxsLFxuICAgIC8vIFRoaXMgdmFsdWUsIGlmIGdpdmVuLCBpcyBzdG9yZWQgaW4gZXZlcnkgbm9kZSwgd2hldGhlclxuICAgIC8vIGBsb2NhdGlvbnNgIGlzIG9uIG9yIG9mZi5cbiAgICBkaXJlY3RTb3VyY2VGaWxlOiBudWxsXG4gIH07XG5cbiAgZnVuY3Rpb24gc2V0T3B0aW9ucyhvcHRzKSB7XG4gICAgb3B0aW9ucyA9IG9wdHMgfHwge307XG4gICAgZm9yICh2YXIgb3B0IGluIGRlZmF1bHRPcHRpb25zKSBpZiAoIU9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvcHRpb25zLCBvcHQpKVxuICAgICAgb3B0aW9uc1tvcHRdID0gZGVmYXVsdE9wdGlvbnNbb3B0XTtcbiAgICBzb3VyY2VGaWxlID0gb3B0aW9ucy5zb3VyY2VGaWxlIHx8IG51bGw7XG5cbiAgICBpc0tleXdvcmQgPSBvcHRpb25zLmVjbWFWZXJzaW9uID49IDYgPyBpc0VjbWE2S2V5d29yZCA6IGlzRWNtYTVBbmRMZXNzS2V5d29yZDtcbiAgfVxuXG4gIC8vIFRoZSBgZ2V0TGluZUluZm9gIGZ1bmN0aW9uIGlzIG1vc3RseSB1c2VmdWwgd2hlbiB0aGVcbiAgLy8gYGxvY2F0aW9uc2Agb3B0aW9uIGlzIG9mZiAoZm9yIHBlcmZvcm1hbmNlIHJlYXNvbnMpIGFuZCB5b3VcbiAgLy8gd2FudCB0byBmaW5kIHRoZSBsaW5lL2NvbHVtbiBwb3NpdGlvbiBmb3IgYSBnaXZlbiBjaGFyYWN0ZXJcbiAgLy8gb2Zmc2V0LiBgaW5wdXRgIHNob3VsZCBiZSB0aGUgY29kZSBzdHJpbmcgdGhhdCB0aGUgb2Zmc2V0IHJlZmVyc1xuICAvLyBpbnRvLlxuXG4gIHZhciBnZXRMaW5lSW5mbyA9IGV4cG9ydHMuZ2V0TGluZUluZm8gPSBmdW5jdGlvbihpbnB1dCwgb2Zmc2V0KSB7XG4gICAgZm9yICh2YXIgbGluZSA9IDEsIGN1ciA9IDA7Oykge1xuICAgICAgbGluZUJyZWFrLmxhc3RJbmRleCA9IGN1cjtcbiAgICAgIHZhciBtYXRjaCA9IGxpbmVCcmVhay5leGVjKGlucHV0KTtcbiAgICAgIGlmIChtYXRjaCAmJiBtYXRjaC5pbmRleCA8IG9mZnNldCkge1xuICAgICAgICArK2xpbmU7XG4gICAgICAgIGN1ciA9IG1hdGNoLmluZGV4ICsgbWF0Y2hbMF0ubGVuZ3RoO1xuICAgICAgfSBlbHNlIGJyZWFrO1xuICAgIH1cbiAgICByZXR1cm4ge2xpbmU6IGxpbmUsIGNvbHVtbjogb2Zmc2V0IC0gY3VyfTtcbiAgfTtcblxuICAvLyBBY29ybiBpcyBvcmdhbml6ZWQgYXMgYSB0b2tlbml6ZXIgYW5kIGEgcmVjdXJzaXZlLWRlc2NlbnQgcGFyc2VyLlxuICAvLyBUaGUgYHRva2VuaXplYCBleHBvcnQgcHJvdmlkZXMgYW4gaW50ZXJmYWNlIHRvIHRoZSB0b2tlbml6ZXIuXG4gIC8vIEJlY2F1c2UgdGhlIHRva2VuaXplciBpcyBvcHRpbWl6ZWQgZm9yIGJlaW5nIGVmZmljaWVudGx5IHVzZWQgYnlcbiAgLy8gdGhlIEFjb3JuIHBhcnNlciBpdHNlbGYsIHRoaXMgaW50ZXJmYWNlIGlzIHNvbWV3aGF0IGNydWRlIGFuZCBub3RcbiAgLy8gdmVyeSBtb2R1bGFyLiBQZXJmb3JtaW5nIGFub3RoZXIgcGFyc2Ugb3IgY2FsbCB0byBgdG9rZW5pemVgIHdpbGxcbiAgLy8gcmVzZXQgdGhlIGludGVybmFsIHN0YXRlLCBhbmQgaW52YWxpZGF0ZSBleGlzdGluZyB0b2tlbml6ZXJzLlxuXG4gIGV4cG9ydHMudG9rZW5pemUgPSBmdW5jdGlvbihpbnB0LCBvcHRzKSB7XG4gICAgaW5wdXQgPSBTdHJpbmcoaW5wdCk7IGlucHV0TGVuID0gaW5wdXQubGVuZ3RoO1xuICAgIHNldE9wdGlvbnMob3B0cyk7XG4gICAgaW5pdFRva2VuU3RhdGUoKTtcblxuICAgIHZhciB0ID0ge307XG4gICAgZnVuY3Rpb24gZ2V0VG9rZW4oZm9yY2VSZWdleHApIHtcbiAgICAgIGxhc3RFbmQgPSB0b2tFbmQ7XG4gICAgICByZWFkVG9rZW4oZm9yY2VSZWdleHApO1xuICAgICAgdC5zdGFydCA9IHRva1N0YXJ0OyB0LmVuZCA9IHRva0VuZDtcbiAgICAgIHQuc3RhcnRMb2MgPSB0b2tTdGFydExvYzsgdC5lbmRMb2MgPSB0b2tFbmRMb2M7XG4gICAgICB0LnR5cGUgPSB0b2tUeXBlOyB0LnZhbHVlID0gdG9rVmFsO1xuICAgICAgcmV0dXJuIHQ7XG4gICAgfVxuICAgIGdldFRva2VuLmp1bXBUbyA9IGZ1bmN0aW9uKHBvcywgcmVBbGxvd2VkKSB7XG4gICAgICB0b2tQb3MgPSBwb3M7XG4gICAgICBpZiAob3B0aW9ucy5sb2NhdGlvbnMpIHtcbiAgICAgICAgdG9rQ3VyTGluZSA9IDE7XG4gICAgICAgIHRva0xpbmVTdGFydCA9IGxpbmVCcmVhay5sYXN0SW5kZXggPSAwO1xuICAgICAgICB2YXIgbWF0Y2g7XG4gICAgICAgIHdoaWxlICgobWF0Y2ggPSBsaW5lQnJlYWsuZXhlYyhpbnB1dCkpICYmIG1hdGNoLmluZGV4IDwgcG9zKSB7XG4gICAgICAgICAgKyt0b2tDdXJMaW5lO1xuICAgICAgICAgIHRva0xpbmVTdGFydCA9IG1hdGNoLmluZGV4ICsgbWF0Y2hbMF0ubGVuZ3RoO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICB0b2tSZWdleHBBbGxvd2VkID0gcmVBbGxvd2VkO1xuICAgICAgc2tpcFNwYWNlKCk7XG4gICAgfTtcbiAgICByZXR1cm4gZ2V0VG9rZW47XG4gIH07XG5cbiAgLy8gU3RhdGUgaXMga2VwdCBpbiAoY2xvc3VyZS0pZ2xvYmFsIHZhcmlhYmxlcy4gV2UgYWxyZWFkeSBzYXcgdGhlXG4gIC8vIGBvcHRpb25zYCwgYGlucHV0YCwgYW5kIGBpbnB1dExlbmAgdmFyaWFibGVzIGFib3ZlLlxuXG4gIC8vIFRoZSBjdXJyZW50IHBvc2l0aW9uIG9mIHRoZSB0b2tlbml6ZXIgaW4gdGhlIGlucHV0LlxuXG4gIHZhciB0b2tQb3M7XG5cbiAgLy8gVGhlIHN0YXJ0IGFuZCBlbmQgb2Zmc2V0cyBvZiB0aGUgY3VycmVudCB0b2tlbi5cblxuICB2YXIgdG9rU3RhcnQsIHRva0VuZDtcblxuICAvLyBXaGVuIGBvcHRpb25zLmxvY2F0aW9uc2AgaXMgdHJ1ZSwgdGhlc2UgaG9sZCBvYmplY3RzXG4gIC8vIGNvbnRhaW5pbmcgdGhlIHRva2VucyBzdGFydCBhbmQgZW5kIGxpbmUvY29sdW1uIHBhaXJzLlxuXG4gIHZhciB0b2tTdGFydExvYywgdG9rRW5kTG9jO1xuXG4gIC8vIFRoZSB0eXBlIGFuZCB2YWx1ZSBvZiB0aGUgY3VycmVudCB0b2tlbi4gVG9rZW4gdHlwZXMgYXJlIG9iamVjdHMsXG4gIC8vIG5hbWVkIGJ5IHZhcmlhYmxlcyBhZ2FpbnN0IHdoaWNoIHRoZXkgY2FuIGJlIGNvbXBhcmVkLCBhbmRcbiAgLy8gaG9sZGluZyBwcm9wZXJ0aWVzIHRoYXQgZGVzY3JpYmUgdGhlbSAoaW5kaWNhdGluZywgZm9yIGV4YW1wbGUsXG4gIC8vIHRoZSBwcmVjZWRlbmNlIG9mIGFuIGluZml4IG9wZXJhdG9yLCBhbmQgdGhlIG9yaWdpbmFsIG5hbWUgb2YgYVxuICAvLyBrZXl3b3JkIHRva2VuKS4gVGhlIGtpbmQgb2YgdmFsdWUgdGhhdCdzIGhlbGQgaW4gYHRva1ZhbGAgZGVwZW5kc1xuICAvLyBvbiB0aGUgdHlwZSBvZiB0aGUgdG9rZW4uIEZvciBsaXRlcmFscywgaXQgaXMgdGhlIGxpdGVyYWwgdmFsdWUsXG4gIC8vIGZvciBvcGVyYXRvcnMsIHRoZSBvcGVyYXRvciBuYW1lLCBhbmQgc28gb24uXG5cbiAgdmFyIHRva1R5cGUsIHRva1ZhbDtcblxuICAvLyBJbnRlcmFsIHN0YXRlIGZvciB0aGUgdG9rZW5pemVyLiBUbyBkaXN0aW5ndWlzaCBiZXR3ZWVuIGRpdmlzaW9uXG4gIC8vIG9wZXJhdG9ycyBhbmQgcmVndWxhciBleHByZXNzaW9ucywgaXQgcmVtZW1iZXJzIHdoZXRoZXIgdGhlIGxhc3RcbiAgLy8gdG9rZW4gd2FzIG9uZSB0aGF0IGlzIGFsbG93ZWQgdG8gYmUgZm9sbG93ZWQgYnkgYW4gZXhwcmVzc2lvbi5cbiAgLy8gKElmIGl0IGlzLCBhIHNsYXNoIGlzIHByb2JhYmx5IGEgcmVnZXhwLCBpZiBpdCBpc24ndCBpdCdzIGFcbiAgLy8gZGl2aXNpb24gb3BlcmF0b3IuIFNlZSB0aGUgYHBhcnNlU3RhdGVtZW50YCBmdW5jdGlvbiBmb3IgYVxuICAvLyBjYXZlYXQuKVxuXG4gIHZhciB0b2tSZWdleHBBbGxvd2VkO1xuXG4gIC8vIFdoZW4gYG9wdGlvbnMubG9jYXRpb25zYCBpcyB0cnVlLCB0aGVzZSBhcmUgdXNlZCB0byBrZWVwXG4gIC8vIHRyYWNrIG9mIHRoZSBjdXJyZW50IGxpbmUsIGFuZCBrbm93IHdoZW4gYSBuZXcgbGluZSBoYXMgYmVlblxuICAvLyBlbnRlcmVkLlxuXG4gIHZhciB0b2tDdXJMaW5lLCB0b2tMaW5lU3RhcnQ7XG5cbiAgLy8gVGhlc2Ugc3RvcmUgdGhlIHBvc2l0aW9uIG9mIHRoZSBwcmV2aW91cyB0b2tlbiwgd2hpY2ggaXMgdXNlZnVsXG4gIC8vIHdoZW4gZmluaXNoaW5nIGEgbm9kZSBhbmQgYXNzaWduaW5nIGl0cyBgZW5kYCBwb3NpdGlvbi5cblxuICB2YXIgbGFzdFN0YXJ0LCBsYXN0RW5kLCBsYXN0RW5kTG9jO1xuXG4gIC8vIFRoaXMgaXMgdGhlIHBhcnNlcidzIHN0YXRlLiBgaW5GdW5jdGlvbmAgaXMgdXNlZCB0byByZWplY3RcbiAgLy8gYHJldHVybmAgc3RhdGVtZW50cyBvdXRzaWRlIG9mIGZ1bmN0aW9ucywgYGxhYmVsc2AgdG8gdmVyaWZ5IHRoYXRcbiAgLy8gYGJyZWFrYCBhbmQgYGNvbnRpbnVlYCBoYXZlIHNvbWV3aGVyZSB0byBqdW1wIHRvLCBhbmQgYHN0cmljdGBcbiAgLy8gaW5kaWNhdGVzIHdoZXRoZXIgc3RyaWN0IG1vZGUgaXMgb24uXG5cbiAgdmFyIGluRnVuY3Rpb24sIGxhYmVscywgc3RyaWN0O1xuXG4gIC8vIFRoaXMgZnVuY3Rpb24gaXMgdXNlZCB0byByYWlzZSBleGNlcHRpb25zIG9uIHBhcnNlIGVycm9ycy4gSXRcbiAgLy8gdGFrZXMgYW4gb2Zmc2V0IGludGVnZXIgKGludG8gdGhlIGN1cnJlbnQgYGlucHV0YCkgdG8gaW5kaWNhdGVcbiAgLy8gdGhlIGxvY2F0aW9uIG9mIHRoZSBlcnJvciwgYXR0YWNoZXMgdGhlIHBvc2l0aW9uIHRvIHRoZSBlbmRcbiAgLy8gb2YgdGhlIGVycm9yIG1lc3NhZ2UsIGFuZCB0aGVuIHJhaXNlcyBhIGBTeW50YXhFcnJvcmAgd2l0aCB0aGF0XG4gIC8vIG1lc3NhZ2UuXG5cbiAgZnVuY3Rpb24gcmFpc2UocG9zLCBtZXNzYWdlKSB7XG4gICAgdmFyIGxvYyA9IGdldExpbmVJbmZvKGlucHV0LCBwb3MpO1xuICAgIG1lc3NhZ2UgKz0gXCIgKFwiICsgbG9jLmxpbmUgKyBcIjpcIiArIGxvYy5jb2x1bW4gKyBcIilcIjtcbiAgICB2YXIgZXJyID0gbmV3IFN5bnRheEVycm9yKG1lc3NhZ2UpO1xuICAgIGVyci5wb3MgPSBwb3M7IGVyci5sb2MgPSBsb2M7IGVyci5yYWlzZWRBdCA9IHRva1BvcztcbiAgICB0aHJvdyBlcnI7XG4gIH1cblxuICAvLyBSZXVzZWQgZW1wdHkgYXJyYXkgYWRkZWQgZm9yIG5vZGUgZmllbGRzIHRoYXQgYXJlIGFsd2F5cyBlbXB0eS5cblxuICB2YXIgZW1wdHkgPSBbXTtcblxuICAvLyAjIyBUb2tlbiB0eXBlc1xuXG4gIC8vIFRoZSBhc3NpZ25tZW50IG9mIGZpbmUtZ3JhaW5lZCwgaW5mb3JtYXRpb24tY2FycnlpbmcgdHlwZSBvYmplY3RzXG4gIC8vIGFsbG93cyB0aGUgdG9rZW5pemVyIHRvIHN0b3JlIHRoZSBpbmZvcm1hdGlvbiBpdCBoYXMgYWJvdXQgYVxuICAvLyB0b2tlbiBpbiBhIHdheSB0aGF0IGlzIHZlcnkgY2hlYXAgZm9yIHRoZSBwYXJzZXIgdG8gbG9vayB1cC5cblxuICAvLyBBbGwgdG9rZW4gdHlwZSB2YXJpYWJsZXMgc3RhcnQgd2l0aCBhbiB1bmRlcnNjb3JlLCB0byBtYWtlIHRoZW1cbiAgLy8gZWFzeSB0byByZWNvZ25pemUuXG5cbiAgLy8gVGhlc2UgYXJlIHRoZSBnZW5lcmFsIHR5cGVzLiBUaGUgYHR5cGVgIHByb3BlcnR5IGlzIG9ubHkgdXNlZCB0b1xuICAvLyBtYWtlIHRoZW0gcmVjb2duaXplYWJsZSB3aGVuIGRlYnVnZ2luZy5cblxuICB2YXIgX251bSA9IHt0eXBlOiBcIm51bVwifSwgX3JlZ2V4cCA9IHt0eXBlOiBcInJlZ2V4cFwifSwgX3N0cmluZyA9IHt0eXBlOiBcInN0cmluZ1wifTtcbiAgdmFyIF9uYW1lID0ge3R5cGU6IFwibmFtZVwifSwgX2VvZiA9IHt0eXBlOiBcImVvZlwifTtcblxuICAvLyBLZXl3b3JkIHRva2Vucy4gVGhlIGBrZXl3b3JkYCBwcm9wZXJ0eSAoYWxzbyB1c2VkIGluIGtleXdvcmQtbGlrZVxuICAvLyBvcGVyYXRvcnMpIGluZGljYXRlcyB0aGF0IHRoZSB0b2tlbiBvcmlnaW5hdGVkIGZyb20gYW5cbiAgLy8gaWRlbnRpZmllci1saWtlIHdvcmQsIHdoaWNoIGlzIHVzZWQgd2hlbiBwYXJzaW5nIHByb3BlcnR5IG5hbWVzLlxuICAvL1xuICAvLyBUaGUgYGJlZm9yZUV4cHJgIHByb3BlcnR5IGlzIHVzZWQgdG8gZGlzYW1iaWd1YXRlIGJldHdlZW4gcmVndWxhclxuICAvLyBleHByZXNzaW9ucyBhbmQgZGl2aXNpb25zLiBJdCBpcyBzZXQgb24gYWxsIHRva2VuIHR5cGVzIHRoYXQgY2FuXG4gIC8vIGJlIGZvbGxvd2VkIGJ5IGFuIGV4cHJlc3Npb24gKHRodXMsIGEgc2xhc2ggYWZ0ZXIgdGhlbSB3b3VsZCBiZSBhXG4gIC8vIHJlZ3VsYXIgZXhwcmVzc2lvbikuXG4gIC8vXG4gIC8vIGBpc0xvb3BgIG1hcmtzIGEga2V5d29yZCBhcyBzdGFydGluZyBhIGxvb3AsIHdoaWNoIGlzIGltcG9ydGFudFxuICAvLyB0byBrbm93IHdoZW4gcGFyc2luZyBhIGxhYmVsLCBpbiBvcmRlciB0byBhbGxvdyBvciBkaXNhbGxvd1xuICAvLyBjb250aW51ZSBqdW1wcyB0byB0aGF0IGxhYmVsLlxuXG4gIHZhciBfYnJlYWsgPSB7a2V5d29yZDogXCJicmVha1wifSwgX2Nhc2UgPSB7a2V5d29yZDogXCJjYXNlXCIsIGJlZm9yZUV4cHI6IHRydWV9LCBfY2F0Y2ggPSB7a2V5d29yZDogXCJjYXRjaFwifTtcbiAgdmFyIF9jb250aW51ZSA9IHtrZXl3b3JkOiBcImNvbnRpbnVlXCJ9LCBfZGVidWdnZXIgPSB7a2V5d29yZDogXCJkZWJ1Z2dlclwifSwgX2RlZmF1bHQgPSB7a2V5d29yZDogXCJkZWZhdWx0XCJ9O1xuICB2YXIgX2RvID0ge2tleXdvcmQ6IFwiZG9cIiwgaXNMb29wOiB0cnVlfSwgX2Vsc2UgPSB7a2V5d29yZDogXCJlbHNlXCIsIGJlZm9yZUV4cHI6IHRydWV9O1xuICB2YXIgX2ZpbmFsbHkgPSB7a2V5d29yZDogXCJmaW5hbGx5XCJ9LCBfZm9yID0ge2tleXdvcmQ6IFwiZm9yXCIsIGlzTG9vcDogdHJ1ZX0sIF9mdW5jdGlvbiA9IHtrZXl3b3JkOiBcImZ1bmN0aW9uXCJ9O1xuICB2YXIgX2lmID0ge2tleXdvcmQ6IFwiaWZcIn0sIF9yZXR1cm4gPSB7a2V5d29yZDogXCJyZXR1cm5cIiwgYmVmb3JlRXhwcjogdHJ1ZX0sIF9zd2l0Y2ggPSB7a2V5d29yZDogXCJzd2l0Y2hcIn07XG4gIHZhciBfdGhyb3cgPSB7a2V5d29yZDogXCJ0aHJvd1wiLCBiZWZvcmVFeHByOiB0cnVlfSwgX3RyeSA9IHtrZXl3b3JkOiBcInRyeVwifSwgX3ZhciA9IHtrZXl3b3JkOiBcInZhclwifTtcbiAgdmFyIF9sZXQgPSB7a2V5d29yZDogXCJsZXRcIn0sIF9jb25zdCA9IHtrZXl3b3JkOiBcImNvbnN0XCJ9O1xuICB2YXIgX3doaWxlID0ge2tleXdvcmQ6IFwid2hpbGVcIiwgaXNMb29wOiB0cnVlfSwgX3dpdGggPSB7a2V5d29yZDogXCJ3aXRoXCJ9LCBfbmV3ID0ge2tleXdvcmQ6IFwibmV3XCIsIGJlZm9yZUV4cHI6IHRydWV9O1xuICB2YXIgX3RoaXMgPSB7a2V5d29yZDogXCJ0aGlzXCJ9O1xuXG4gIC8vIFRoZSBrZXl3b3JkcyB0aGF0IGRlbm90ZSB2YWx1ZXMuXG5cbiAgdmFyIF9udWxsID0ge2tleXdvcmQ6IFwibnVsbFwiLCBhdG9tVmFsdWU6IG51bGx9LCBfdHJ1ZSA9IHtrZXl3b3JkOiBcInRydWVcIiwgYXRvbVZhbHVlOiB0cnVlfTtcbiAgdmFyIF9mYWxzZSA9IHtrZXl3b3JkOiBcImZhbHNlXCIsIGF0b21WYWx1ZTogZmFsc2V9O1xuXG4gIC8vIFNvbWUga2V5d29yZHMgYXJlIHRyZWF0ZWQgYXMgcmVndWxhciBvcGVyYXRvcnMuIGBpbmAgc29tZXRpbWVzXG4gIC8vICh3aGVuIHBhcnNpbmcgYGZvcmApIG5lZWRzIHRvIGJlIHRlc3RlZCBhZ2FpbnN0IHNwZWNpZmljYWxseSwgc29cbiAgLy8gd2UgYXNzaWduIGEgdmFyaWFibGUgbmFtZSB0byBpdCBmb3IgcXVpY2sgY29tcGFyaW5nLlxuXG4gIHZhciBfaW4gPSB7a2V5d29yZDogXCJpblwiLCBiaW5vcDogNywgYmVmb3JlRXhwcjogdHJ1ZX07XG5cbiAgLy8gTWFwIGtleXdvcmQgbmFtZXMgdG8gdG9rZW4gdHlwZXMuXG5cbiAgdmFyIGtleXdvcmRUeXBlcyA9IHtcImJyZWFrXCI6IF9icmVhaywgXCJjYXNlXCI6IF9jYXNlLCBcImNhdGNoXCI6IF9jYXRjaCxcbiAgICAgICAgICAgICAgICAgICAgICBcImNvbnRpbnVlXCI6IF9jb250aW51ZSwgXCJkZWJ1Z2dlclwiOiBfZGVidWdnZXIsIFwiZGVmYXVsdFwiOiBfZGVmYXVsdCxcbiAgICAgICAgICAgICAgICAgICAgICBcImRvXCI6IF9kbywgXCJlbHNlXCI6IF9lbHNlLCBcImZpbmFsbHlcIjogX2ZpbmFsbHksIFwiZm9yXCI6IF9mb3IsXG4gICAgICAgICAgICAgICAgICAgICAgXCJmdW5jdGlvblwiOiBfZnVuY3Rpb24sIFwiaWZcIjogX2lmLCBcInJldHVyblwiOiBfcmV0dXJuLCBcInN3aXRjaFwiOiBfc3dpdGNoLFxuICAgICAgICAgICAgICAgICAgICAgIFwidGhyb3dcIjogX3Rocm93LCBcInRyeVwiOiBfdHJ5LCBcInZhclwiOiBfdmFyLCBcImxldFwiOiBfbGV0LCBcImNvbnN0XCI6IF9jb25zdCxcbiAgICAgICAgICAgICAgICAgICAgICBcIndoaWxlXCI6IF93aGlsZSwgXCJ3aXRoXCI6IF93aXRoLFxuICAgICAgICAgICAgICAgICAgICAgIFwibnVsbFwiOiBfbnVsbCwgXCJ0cnVlXCI6IF90cnVlLCBcImZhbHNlXCI6IF9mYWxzZSwgXCJuZXdcIjogX25ldywgXCJpblwiOiBfaW4sXG4gICAgICAgICAgICAgICAgICAgICAgXCJpbnN0YW5jZW9mXCI6IHtrZXl3b3JkOiBcImluc3RhbmNlb2ZcIiwgYmlub3A6IDcsIGJlZm9yZUV4cHI6IHRydWV9LCBcInRoaXNcIjogX3RoaXMsXG4gICAgICAgICAgICAgICAgICAgICAgXCJ0eXBlb2ZcIjoge2tleXdvcmQ6IFwidHlwZW9mXCIsIHByZWZpeDogdHJ1ZSwgYmVmb3JlRXhwcjogdHJ1ZX0sXG4gICAgICAgICAgICAgICAgICAgICAgXCJ2b2lkXCI6IHtrZXl3b3JkOiBcInZvaWRcIiwgcHJlZml4OiB0cnVlLCBiZWZvcmVFeHByOiB0cnVlfSxcbiAgICAgICAgICAgICAgICAgICAgICBcImRlbGV0ZVwiOiB7a2V5d29yZDogXCJkZWxldGVcIiwgcHJlZml4OiB0cnVlLCBiZWZvcmVFeHByOiB0cnVlfX07XG5cbiAgLy8gUHVuY3R1YXRpb24gdG9rZW4gdHlwZXMuIEFnYWluLCB0aGUgYHR5cGVgIHByb3BlcnR5IGlzIHB1cmVseSBmb3IgZGVidWdnaW5nLlxuXG4gIHZhciBfYnJhY2tldEwgPSB7dHlwZTogXCJbXCIsIGJlZm9yZUV4cHI6IHRydWV9LCBfYnJhY2tldFIgPSB7dHlwZTogXCJdXCJ9LCBfYnJhY2VMID0ge3R5cGU6IFwie1wiLCBiZWZvcmVFeHByOiB0cnVlfTtcbiAgdmFyIF9icmFjZVIgPSB7dHlwZTogXCJ9XCJ9LCBfcGFyZW5MID0ge3R5cGU6IFwiKFwiLCBiZWZvcmVFeHByOiB0cnVlfSwgX3BhcmVuUiA9IHt0eXBlOiBcIilcIn07XG4gIHZhciBfY29tbWEgPSB7dHlwZTogXCIsXCIsIGJlZm9yZUV4cHI6IHRydWV9LCBfc2VtaSA9IHt0eXBlOiBcIjtcIiwgYmVmb3JlRXhwcjogdHJ1ZX07XG4gIHZhciBfY29sb24gPSB7dHlwZTogXCI6XCIsIGJlZm9yZUV4cHI6IHRydWV9LCBfZG90ID0ge3R5cGU6IFwiLlwifSwgX2VsbGlwc2lzID0ge3R5cGU6IFwiLi4uXCJ9LCBfcXVlc3Rpb24gPSB7dHlwZTogXCI/XCIsIGJlZm9yZUV4cHI6IHRydWV9O1xuXG4gIC8vIE9wZXJhdG9ycy4gVGhlc2UgY2Fycnkgc2V2ZXJhbCBraW5kcyBvZiBwcm9wZXJ0aWVzIHRvIGhlbHAgdGhlXG4gIC8vIHBhcnNlciB1c2UgdGhlbSBwcm9wZXJseSAodGhlIHByZXNlbmNlIG9mIHRoZXNlIHByb3BlcnRpZXMgaXNcbiAgLy8gd2hhdCBjYXRlZ29yaXplcyB0aGVtIGFzIG9wZXJhdG9ycykuXG4gIC8vXG4gIC8vIGBiaW5vcGAsIHdoZW4gcHJlc2VudCwgc3BlY2lmaWVzIHRoYXQgdGhpcyBvcGVyYXRvciBpcyBhIGJpbmFyeVxuICAvLyBvcGVyYXRvciwgYW5kIHdpbGwgcmVmZXIgdG8gaXRzIHByZWNlZGVuY2UuXG4gIC8vXG4gIC8vIGBwcmVmaXhgIGFuZCBgcG9zdGZpeGAgbWFyayB0aGUgb3BlcmF0b3IgYXMgYSBwcmVmaXggb3IgcG9zdGZpeFxuICAvLyB1bmFyeSBvcGVyYXRvci4gYGlzVXBkYXRlYCBzcGVjaWZpZXMgdGhhdCB0aGUgbm9kZSBwcm9kdWNlZCBieVxuICAvLyB0aGUgb3BlcmF0b3Igc2hvdWxkIGJlIG9mIHR5cGUgVXBkYXRlRXhwcmVzc2lvbiByYXRoZXIgdGhhblxuICAvLyBzaW1wbHkgVW5hcnlFeHByZXNzaW9uIChgKytgIGFuZCBgLS1gKS5cbiAgLy9cbiAgLy8gYGlzQXNzaWduYCBtYXJrcyBhbGwgb2YgYD1gLCBgKz1gLCBgLT1gIGV0Y2V0ZXJhLCB3aGljaCBhY3QgYXNcbiAgLy8gYmluYXJ5IG9wZXJhdG9ycyB3aXRoIGEgdmVyeSBsb3cgcHJlY2VkZW5jZSwgdGhhdCBzaG91bGQgcmVzdWx0XG4gIC8vIGluIEFzc2lnbm1lbnRFeHByZXNzaW9uIG5vZGVzLlxuXG4gIHZhciBfc2xhc2ggPSB7Ymlub3A6IDEwLCBiZWZvcmVFeHByOiB0cnVlfSwgX2VxID0ge2lzQXNzaWduOiB0cnVlLCBiZWZvcmVFeHByOiB0cnVlfTtcbiAgdmFyIF9hc3NpZ24gPSB7aXNBc3NpZ246IHRydWUsIGJlZm9yZUV4cHI6IHRydWV9O1xuICB2YXIgX2luY0RlYyA9IHtwb3N0Zml4OiB0cnVlLCBwcmVmaXg6IHRydWUsIGlzVXBkYXRlOiB0cnVlfSwgX3ByZWZpeCA9IHtwcmVmaXg6IHRydWUsIGJlZm9yZUV4cHI6IHRydWV9O1xuICB2YXIgX2xvZ2ljYWxPUiA9IHtiaW5vcDogMSwgYmVmb3JlRXhwcjogdHJ1ZX07XG4gIHZhciBfbG9naWNhbEFORCA9IHtiaW5vcDogMiwgYmVmb3JlRXhwcjogdHJ1ZX07XG4gIHZhciBfYml0d2lzZU9SID0ge2Jpbm9wOiAzLCBiZWZvcmVFeHByOiB0cnVlfTtcbiAgdmFyIF9iaXR3aXNlWE9SID0ge2Jpbm9wOiA0LCBiZWZvcmVFeHByOiB0cnVlfTtcbiAgdmFyIF9iaXR3aXNlQU5EID0ge2Jpbm9wOiA1LCBiZWZvcmVFeHByOiB0cnVlfTtcbiAgdmFyIF9lcXVhbGl0eSA9IHtiaW5vcDogNiwgYmVmb3JlRXhwcjogdHJ1ZX07XG4gIHZhciBfcmVsYXRpb25hbCA9IHtiaW5vcDogNywgYmVmb3JlRXhwcjogdHJ1ZX07XG4gIHZhciBfYml0U2hpZnQgPSB7Ymlub3A6IDgsIGJlZm9yZUV4cHI6IHRydWV9O1xuICB2YXIgX3BsdXNNaW4gPSB7Ymlub3A6IDksIHByZWZpeDogdHJ1ZSwgYmVmb3JlRXhwcjogdHJ1ZX07XG4gIHZhciBfbXVsdGlwbHlNb2R1bG8gPSB7Ymlub3A6IDEwLCBiZWZvcmVFeHByOiB0cnVlfTtcblxuICAvLyBQcm92aWRlIGFjY2VzcyB0byB0aGUgdG9rZW4gdHlwZXMgZm9yIGV4dGVybmFsIHVzZXJzIG9mIHRoZVxuICAvLyB0b2tlbml6ZXIuXG5cbiAgZXhwb3J0cy50b2tUeXBlcyA9IHticmFja2V0TDogX2JyYWNrZXRMLCBicmFja2V0UjogX2JyYWNrZXRSLCBicmFjZUw6IF9icmFjZUwsIGJyYWNlUjogX2JyYWNlUixcbiAgICAgICAgICAgICAgICAgICAgICBwYXJlbkw6IF9wYXJlbkwsIHBhcmVuUjogX3BhcmVuUiwgY29tbWE6IF9jb21tYSwgc2VtaTogX3NlbWksIGNvbG9uOiBfY29sb24sXG4gICAgICAgICAgICAgICAgICAgICAgZG90OiBfZG90LCBlbGxpcHNpczogX2VsbGlwc2lzLCBxdWVzdGlvbjogX3F1ZXN0aW9uLCBzbGFzaDogX3NsYXNoLCBlcTogX2VxLFxuICAgICAgICAgICAgICAgICAgICAgIG5hbWU6IF9uYW1lLCBlb2Y6IF9lb2YsIG51bTogX251bSwgcmVnZXhwOiBfcmVnZXhwLCBzdHJpbmc6IF9zdHJpbmd9O1xuICBmb3IgKHZhciBrdyBpbiBrZXl3b3JkVHlwZXMpIGV4cG9ydHMudG9rVHlwZXNbXCJfXCIgKyBrd10gPSBrZXl3b3JkVHlwZXNba3ddO1xuXG4gIC8vIFRoaXMgaXMgYSB0cmljayB0YWtlbiBmcm9tIEVzcHJpbWEuIEl0IHR1cm5zIG91dCB0aGF0LCBvblxuICAvLyBub24tQ2hyb21lIGJyb3dzZXJzLCB0byBjaGVjayB3aGV0aGVyIGEgc3RyaW5nIGlzIGluIGEgc2V0LCBhXG4gIC8vIHByZWRpY2F0ZSBjb250YWluaW5nIGEgYmlnIHVnbHkgYHN3aXRjaGAgc3RhdGVtZW50IGlzIGZhc3RlciB0aGFuXG4gIC8vIGEgcmVndWxhciBleHByZXNzaW9uLCBhbmQgb24gQ2hyb21lIHRoZSB0d28gYXJlIGFib3V0IG9uIHBhci5cbiAgLy8gVGhpcyBmdW5jdGlvbiB1c2VzIGBldmFsYCAobm9uLWxleGljYWwpIHRvIHByb2R1Y2Ugc3VjaCBhXG4gIC8vIHByZWRpY2F0ZSBmcm9tIGEgc3BhY2Utc2VwYXJhdGVkIHN0cmluZyBvZiB3b3Jkcy5cbiAgLy9cbiAgLy8gSXQgc3RhcnRzIGJ5IHNvcnRpbmcgdGhlIHdvcmRzIGJ5IGxlbmd0aC5cblxuICBmdW5jdGlvbiBtYWtlUHJlZGljYXRlKHdvcmRzKSB7XG4gICAgd29yZHMgPSB3b3Jkcy5zcGxpdChcIiBcIik7XG4gICAgdmFyIGYgPSBcIlwiLCBjYXRzID0gW107XG4gICAgb3V0OiBmb3IgKHZhciBpID0gMDsgaSA8IHdvcmRzLmxlbmd0aDsgKytpKSB7XG4gICAgICBmb3IgKHZhciBqID0gMDsgaiA8IGNhdHMubGVuZ3RoOyArK2opXG4gICAgICAgIGlmIChjYXRzW2pdWzBdLmxlbmd0aCA9PSB3b3Jkc1tpXS5sZW5ndGgpIHtcbiAgICAgICAgICBjYXRzW2pdLnB1c2god29yZHNbaV0pO1xuICAgICAgICAgIGNvbnRpbnVlIG91dDtcbiAgICAgICAgfVxuICAgICAgY2F0cy5wdXNoKFt3b3Jkc1tpXV0pO1xuICAgIH1cbiAgICBmdW5jdGlvbiBjb21wYXJlVG8oYXJyKSB7XG4gICAgICBpZiAoYXJyLmxlbmd0aCA9PSAxKSByZXR1cm4gZiArPSBcInJldHVybiBzdHIgPT09IFwiICsgSlNPTi5zdHJpbmdpZnkoYXJyWzBdKSArIFwiO1wiO1xuICAgICAgZiArPSBcInN3aXRjaChzdHIpe1wiO1xuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcnIubGVuZ3RoOyArK2kpIGYgKz0gXCJjYXNlIFwiICsgSlNPTi5zdHJpbmdpZnkoYXJyW2ldKSArIFwiOlwiO1xuICAgICAgZiArPSBcInJldHVybiB0cnVlfXJldHVybiBmYWxzZTtcIjtcbiAgICB9XG5cbiAgICAvLyBXaGVuIHRoZXJlIGFyZSBtb3JlIHRoYW4gdGhyZWUgbGVuZ3RoIGNhdGVnb3JpZXMsIGFuIG91dGVyXG4gICAgLy8gc3dpdGNoIGZpcnN0IGRpc3BhdGNoZXMgb24gdGhlIGxlbmd0aHMsIHRvIHNhdmUgb24gY29tcGFyaXNvbnMuXG5cbiAgICBpZiAoY2F0cy5sZW5ndGggPiAzKSB7XG4gICAgICBjYXRzLnNvcnQoZnVuY3Rpb24oYSwgYikge3JldHVybiBiLmxlbmd0aCAtIGEubGVuZ3RoO30pO1xuICAgICAgZiArPSBcInN3aXRjaChzdHIubGVuZ3RoKXtcIjtcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY2F0cy5sZW5ndGg7ICsraSkge1xuICAgICAgICB2YXIgY2F0ID0gY2F0c1tpXTtcbiAgICAgICAgZiArPSBcImNhc2UgXCIgKyBjYXRbMF0ubGVuZ3RoICsgXCI6XCI7XG4gICAgICAgIGNvbXBhcmVUbyhjYXQpO1xuICAgICAgfVxuICAgICAgZiArPSBcIn1cIjtcblxuICAgIC8vIE90aGVyd2lzZSwgc2ltcGx5IGdlbmVyYXRlIGEgZmxhdCBgc3dpdGNoYCBzdGF0ZW1lbnQuXG5cbiAgICB9IGVsc2Uge1xuICAgICAgY29tcGFyZVRvKHdvcmRzKTtcbiAgICB9XG4gICAgcmV0dXJuIG5ldyBGdW5jdGlvbihcInN0clwiLCBmKTtcbiAgfVxuXG4gIC8vIFRoZSBFQ01BU2NyaXB0IDMgcmVzZXJ2ZWQgd29yZCBsaXN0LlxuXG4gIHZhciBpc1Jlc2VydmVkV29yZDMgPSBtYWtlUHJlZGljYXRlKFwiYWJzdHJhY3QgYm9vbGVhbiBieXRlIGNoYXIgY2xhc3MgZG91YmxlIGVudW0gZXhwb3J0IGV4dGVuZHMgZmluYWwgZmxvYXQgZ290byBpbXBsZW1lbnRzIGltcG9ydCBpbnQgaW50ZXJmYWNlIGxvbmcgbmF0aXZlIHBhY2thZ2UgcHJpdmF0ZSBwcm90ZWN0ZWQgcHVibGljIHNob3J0IHN0YXRpYyBzdXBlciBzeW5jaHJvbml6ZWQgdGhyb3dzIHRyYW5zaWVudCB2b2xhdGlsZVwiKTtcblxuICAvLyBFQ01BU2NyaXB0IDUgcmVzZXJ2ZWQgd29yZHMuXG5cbiAgdmFyIGlzUmVzZXJ2ZWRXb3JkNSA9IG1ha2VQcmVkaWNhdGUoXCJjbGFzcyBlbnVtIGV4dGVuZHMgc3VwZXIgY29uc3QgZXhwb3J0IGltcG9ydFwiKTtcblxuICAvLyBUaGUgYWRkaXRpb25hbCByZXNlcnZlZCB3b3JkcyBpbiBzdHJpY3QgbW9kZS5cblxuICB2YXIgaXNTdHJpY3RSZXNlcnZlZFdvcmQgPSBtYWtlUHJlZGljYXRlKFwiaW1wbGVtZW50cyBpbnRlcmZhY2UgbGV0IHBhY2thZ2UgcHJpdmF0ZSBwcm90ZWN0ZWQgcHVibGljIHN0YXRpYyB5aWVsZFwiKTtcblxuICAvLyBUaGUgZm9yYmlkZGVuIHZhcmlhYmxlIG5hbWVzIGluIHN0cmljdCBtb2RlLlxuXG4gIHZhciBpc1N0cmljdEJhZElkV29yZCA9IG1ha2VQcmVkaWNhdGUoXCJldmFsIGFyZ3VtZW50c1wiKTtcblxuICAvLyBBbmQgdGhlIGtleXdvcmRzLlxuXG4gIHZhciBlY21hNUFuZExlc3NLZXl3b3JkcyA9IFwiYnJlYWsgY2FzZSBjYXRjaCBjb250aW51ZSBkZWJ1Z2dlciBkZWZhdWx0IGRvIGVsc2UgZmluYWxseSBmb3IgZnVuY3Rpb24gaWYgcmV0dXJuIHN3aXRjaCB0aHJvdyB0cnkgdmFyIHdoaWxlIHdpdGggbnVsbCB0cnVlIGZhbHNlIGluc3RhbmNlb2YgdHlwZW9mIHZvaWQgZGVsZXRlIG5ldyBpbiB0aGlzXCI7XG5cbiAgdmFyIGlzRWNtYTVBbmRMZXNzS2V5d29yZCA9IG1ha2VQcmVkaWNhdGUoZWNtYTVBbmRMZXNzS2V5d29yZHMpO1xuXG4gIHZhciBpc0VjbWE2S2V5d29yZCA9IG1ha2VQcmVkaWNhdGUoZWNtYTVBbmRMZXNzS2V5d29yZHMgKyBcIiBsZXQgY29uc3RcIik7XG5cbiAgdmFyIGlzS2V5d29yZCA9IGlzRWNtYTVBbmRMZXNzS2V5d29yZDtcblxuICAvLyAjIyBDaGFyYWN0ZXIgY2F0ZWdvcmllc1xuXG4gIC8vIEJpZyB1Z2x5IHJlZ3VsYXIgZXhwcmVzc2lvbnMgdGhhdCBtYXRjaCBjaGFyYWN0ZXJzIGluIHRoZVxuICAvLyB3aGl0ZXNwYWNlLCBpZGVudGlmaWVyLCBhbmQgaWRlbnRpZmllci1zdGFydCBjYXRlZ29yaWVzLiBUaGVzZVxuICAvLyBhcmUgb25seSBhcHBsaWVkIHdoZW4gYSBjaGFyYWN0ZXIgaXMgZm91bmQgdG8gYWN0dWFsbHkgaGF2ZSBhXG4gIC8vIGNvZGUgcG9pbnQgYWJvdmUgMTI4LlxuXG4gIHZhciBub25BU0NJSXdoaXRlc3BhY2UgPSAvW1xcdTE2ODBcXHUxODBlXFx1MjAwMC1cXHUyMDBhXFx1MjAyZlxcdTIwNWZcXHUzMDAwXFx1ZmVmZl0vO1xuICB2YXIgbm9uQVNDSUlpZGVudGlmaWVyU3RhcnRDaGFycyA9IFwiXFx4YWFcXHhiNVxceGJhXFx4YzAtXFx4ZDZcXHhkOC1cXHhmNlxceGY4LVxcdTAyYzFcXHUwMmM2LVxcdTAyZDFcXHUwMmUwLVxcdTAyZTRcXHUwMmVjXFx1MDJlZVxcdTAzNzAtXFx1MDM3NFxcdTAzNzZcXHUwMzc3XFx1MDM3YS1cXHUwMzdkXFx1MDM4NlxcdTAzODgtXFx1MDM4YVxcdTAzOGNcXHUwMzhlLVxcdTAzYTFcXHUwM2EzLVxcdTAzZjVcXHUwM2Y3LVxcdTA0ODFcXHUwNDhhLVxcdTA1MjdcXHUwNTMxLVxcdTA1NTZcXHUwNTU5XFx1MDU2MS1cXHUwNTg3XFx1MDVkMC1cXHUwNWVhXFx1MDVmMC1cXHUwNWYyXFx1MDYyMC1cXHUwNjRhXFx1MDY2ZVxcdTA2NmZcXHUwNjcxLVxcdTA2ZDNcXHUwNmQ1XFx1MDZlNVxcdTA2ZTZcXHUwNmVlXFx1MDZlZlxcdTA2ZmEtXFx1MDZmY1xcdTA2ZmZcXHUwNzEwXFx1MDcxMi1cXHUwNzJmXFx1MDc0ZC1cXHUwN2E1XFx1MDdiMVxcdTA3Y2EtXFx1MDdlYVxcdTA3ZjRcXHUwN2Y1XFx1MDdmYVxcdTA4MDAtXFx1MDgxNVxcdTA4MWFcXHUwODI0XFx1MDgyOFxcdTA4NDAtXFx1MDg1OFxcdTA4YTBcXHUwOGEyLVxcdTA4YWNcXHUwOTA0LVxcdTA5MzlcXHUwOTNkXFx1MDk1MFxcdTA5NTgtXFx1MDk2MVxcdTA5NzEtXFx1MDk3N1xcdTA5NzktXFx1MDk3ZlxcdTA5ODUtXFx1MDk4Y1xcdTA5OGZcXHUwOTkwXFx1MDk5My1cXHUwOWE4XFx1MDlhYS1cXHUwOWIwXFx1MDliMlxcdTA5YjYtXFx1MDliOVxcdTA5YmRcXHUwOWNlXFx1MDlkY1xcdTA5ZGRcXHUwOWRmLVxcdTA5ZTFcXHUwOWYwXFx1MDlmMVxcdTBhMDUtXFx1MGEwYVxcdTBhMGZcXHUwYTEwXFx1MGExMy1cXHUwYTI4XFx1MGEyYS1cXHUwYTMwXFx1MGEzMlxcdTBhMzNcXHUwYTM1XFx1MGEzNlxcdTBhMzhcXHUwYTM5XFx1MGE1OS1cXHUwYTVjXFx1MGE1ZVxcdTBhNzItXFx1MGE3NFxcdTBhODUtXFx1MGE4ZFxcdTBhOGYtXFx1MGE5MVxcdTBhOTMtXFx1MGFhOFxcdTBhYWEtXFx1MGFiMFxcdTBhYjJcXHUwYWIzXFx1MGFiNS1cXHUwYWI5XFx1MGFiZFxcdTBhZDBcXHUwYWUwXFx1MGFlMVxcdTBiMDUtXFx1MGIwY1xcdTBiMGZcXHUwYjEwXFx1MGIxMy1cXHUwYjI4XFx1MGIyYS1cXHUwYjMwXFx1MGIzMlxcdTBiMzNcXHUwYjM1LVxcdTBiMzlcXHUwYjNkXFx1MGI1Y1xcdTBiNWRcXHUwYjVmLVxcdTBiNjFcXHUwYjcxXFx1MGI4M1xcdTBiODUtXFx1MGI4YVxcdTBiOGUtXFx1MGI5MFxcdTBiOTItXFx1MGI5NVxcdTBiOTlcXHUwYjlhXFx1MGI5Y1xcdTBiOWVcXHUwYjlmXFx1MGJhM1xcdTBiYTRcXHUwYmE4LVxcdTBiYWFcXHUwYmFlLVxcdTBiYjlcXHUwYmQwXFx1MGMwNS1cXHUwYzBjXFx1MGMwZS1cXHUwYzEwXFx1MGMxMi1cXHUwYzI4XFx1MGMyYS1cXHUwYzMzXFx1MGMzNS1cXHUwYzM5XFx1MGMzZFxcdTBjNThcXHUwYzU5XFx1MGM2MFxcdTBjNjFcXHUwYzg1LVxcdTBjOGNcXHUwYzhlLVxcdTBjOTBcXHUwYzkyLVxcdTBjYThcXHUwY2FhLVxcdTBjYjNcXHUwY2I1LVxcdTBjYjlcXHUwY2JkXFx1MGNkZVxcdTBjZTBcXHUwY2UxXFx1MGNmMVxcdTBjZjJcXHUwZDA1LVxcdTBkMGNcXHUwZDBlLVxcdTBkMTBcXHUwZDEyLVxcdTBkM2FcXHUwZDNkXFx1MGQ0ZVxcdTBkNjBcXHUwZDYxXFx1MGQ3YS1cXHUwZDdmXFx1MGQ4NS1cXHUwZDk2XFx1MGQ5YS1cXHUwZGIxXFx1MGRiMy1cXHUwZGJiXFx1MGRiZFxcdTBkYzAtXFx1MGRjNlxcdTBlMDEtXFx1MGUzMFxcdTBlMzJcXHUwZTMzXFx1MGU0MC1cXHUwZTQ2XFx1MGU4MVxcdTBlODJcXHUwZTg0XFx1MGU4N1xcdTBlODhcXHUwZThhXFx1MGU4ZFxcdTBlOTQtXFx1MGU5N1xcdTBlOTktXFx1MGU5ZlxcdTBlYTEtXFx1MGVhM1xcdTBlYTVcXHUwZWE3XFx1MGVhYVxcdTBlYWJcXHUwZWFkLVxcdTBlYjBcXHUwZWIyXFx1MGViM1xcdTBlYmRcXHUwZWMwLVxcdTBlYzRcXHUwZWM2XFx1MGVkYy1cXHUwZWRmXFx1MGYwMFxcdTBmNDAtXFx1MGY0N1xcdTBmNDktXFx1MGY2Y1xcdTBmODgtXFx1MGY4Y1xcdTEwMDAtXFx1MTAyYVxcdTEwM2ZcXHUxMDUwLVxcdTEwNTVcXHUxMDVhLVxcdTEwNWRcXHUxMDYxXFx1MTA2NVxcdTEwNjZcXHUxMDZlLVxcdTEwNzBcXHUxMDc1LVxcdTEwODFcXHUxMDhlXFx1MTBhMC1cXHUxMGM1XFx1MTBjN1xcdTEwY2RcXHUxMGQwLVxcdTEwZmFcXHUxMGZjLVxcdTEyNDhcXHUxMjRhLVxcdTEyNGRcXHUxMjUwLVxcdTEyNTZcXHUxMjU4XFx1MTI1YS1cXHUxMjVkXFx1MTI2MC1cXHUxMjg4XFx1MTI4YS1cXHUxMjhkXFx1MTI5MC1cXHUxMmIwXFx1MTJiMi1cXHUxMmI1XFx1MTJiOC1cXHUxMmJlXFx1MTJjMFxcdTEyYzItXFx1MTJjNVxcdTEyYzgtXFx1MTJkNlxcdTEyZDgtXFx1MTMxMFxcdTEzMTItXFx1MTMxNVxcdTEzMTgtXFx1MTM1YVxcdTEzODAtXFx1MTM4ZlxcdTEzYTAtXFx1MTNmNFxcdTE0MDEtXFx1MTY2Y1xcdTE2NmYtXFx1MTY3ZlxcdTE2ODEtXFx1MTY5YVxcdTE2YTAtXFx1MTZlYVxcdTE2ZWUtXFx1MTZmMFxcdTE3MDAtXFx1MTcwY1xcdTE3MGUtXFx1MTcxMVxcdTE3MjAtXFx1MTczMVxcdTE3NDAtXFx1MTc1MVxcdTE3NjAtXFx1MTc2Y1xcdTE3NmUtXFx1MTc3MFxcdTE3ODAtXFx1MTdiM1xcdTE3ZDdcXHUxN2RjXFx1MTgyMC1cXHUxODc3XFx1MTg4MC1cXHUxOGE4XFx1MThhYVxcdTE4YjAtXFx1MThmNVxcdTE5MDAtXFx1MTkxY1xcdTE5NTAtXFx1MTk2ZFxcdTE5NzAtXFx1MTk3NFxcdTE5ODAtXFx1MTlhYlxcdTE5YzEtXFx1MTljN1xcdTFhMDAtXFx1MWExNlxcdTFhMjAtXFx1MWE1NFxcdTFhYTdcXHUxYjA1LVxcdTFiMzNcXHUxYjQ1LVxcdTFiNGJcXHUxYjgzLVxcdTFiYTBcXHUxYmFlXFx1MWJhZlxcdTFiYmEtXFx1MWJlNVxcdTFjMDAtXFx1MWMyM1xcdTFjNGQtXFx1MWM0ZlxcdTFjNWEtXFx1MWM3ZFxcdTFjZTktXFx1MWNlY1xcdTFjZWUtXFx1MWNmMVxcdTFjZjVcXHUxY2Y2XFx1MWQwMC1cXHUxZGJmXFx1MWUwMC1cXHUxZjE1XFx1MWYxOC1cXHUxZjFkXFx1MWYyMC1cXHUxZjQ1XFx1MWY0OC1cXHUxZjRkXFx1MWY1MC1cXHUxZjU3XFx1MWY1OVxcdTFmNWJcXHUxZjVkXFx1MWY1Zi1cXHUxZjdkXFx1MWY4MC1cXHUxZmI0XFx1MWZiNi1cXHUxZmJjXFx1MWZiZVxcdTFmYzItXFx1MWZjNFxcdTFmYzYtXFx1MWZjY1xcdTFmZDAtXFx1MWZkM1xcdTFmZDYtXFx1MWZkYlxcdTFmZTAtXFx1MWZlY1xcdTFmZjItXFx1MWZmNFxcdTFmZjYtXFx1MWZmY1xcdTIwNzFcXHUyMDdmXFx1MjA5MC1cXHUyMDljXFx1MjEwMlxcdTIxMDdcXHUyMTBhLVxcdTIxMTNcXHUyMTE1XFx1MjExOS1cXHUyMTFkXFx1MjEyNFxcdTIxMjZcXHUyMTI4XFx1MjEyYS1cXHUyMTJkXFx1MjEyZi1cXHUyMTM5XFx1MjEzYy1cXHUyMTNmXFx1MjE0NS1cXHUyMTQ5XFx1MjE0ZVxcdTIxNjAtXFx1MjE4OFxcdTJjMDAtXFx1MmMyZVxcdTJjMzAtXFx1MmM1ZVxcdTJjNjAtXFx1MmNlNFxcdTJjZWItXFx1MmNlZVxcdTJjZjJcXHUyY2YzXFx1MmQwMC1cXHUyZDI1XFx1MmQyN1xcdTJkMmRcXHUyZDMwLVxcdTJkNjdcXHUyZDZmXFx1MmQ4MC1cXHUyZDk2XFx1MmRhMC1cXHUyZGE2XFx1MmRhOC1cXHUyZGFlXFx1MmRiMC1cXHUyZGI2XFx1MmRiOC1cXHUyZGJlXFx1MmRjMC1cXHUyZGM2XFx1MmRjOC1cXHUyZGNlXFx1MmRkMC1cXHUyZGQ2XFx1MmRkOC1cXHUyZGRlXFx1MmUyZlxcdTMwMDUtXFx1MzAwN1xcdTMwMjEtXFx1MzAyOVxcdTMwMzEtXFx1MzAzNVxcdTMwMzgtXFx1MzAzY1xcdTMwNDEtXFx1MzA5NlxcdTMwOWQtXFx1MzA5ZlxcdTMwYTEtXFx1MzBmYVxcdTMwZmMtXFx1MzBmZlxcdTMxMDUtXFx1MzEyZFxcdTMxMzEtXFx1MzE4ZVxcdTMxYTAtXFx1MzFiYVxcdTMxZjAtXFx1MzFmZlxcdTM0MDAtXFx1NGRiNVxcdTRlMDAtXFx1OWZjY1xcdWEwMDAtXFx1YTQ4Y1xcdWE0ZDAtXFx1YTRmZFxcdWE1MDAtXFx1YTYwY1xcdWE2MTAtXFx1YTYxZlxcdWE2MmFcXHVhNjJiXFx1YTY0MC1cXHVhNjZlXFx1YTY3Zi1cXHVhNjk3XFx1YTZhMC1cXHVhNmVmXFx1YTcxNy1cXHVhNzFmXFx1YTcyMi1cXHVhNzg4XFx1YTc4Yi1cXHVhNzhlXFx1YTc5MC1cXHVhNzkzXFx1YTdhMC1cXHVhN2FhXFx1YTdmOC1cXHVhODAxXFx1YTgwMy1cXHVhODA1XFx1YTgwNy1cXHVhODBhXFx1YTgwYy1cXHVhODIyXFx1YTg0MC1cXHVhODczXFx1YTg4Mi1cXHVhOGIzXFx1YThmMi1cXHVhOGY3XFx1YThmYlxcdWE5MGEtXFx1YTkyNVxcdWE5MzAtXFx1YTk0NlxcdWE5NjAtXFx1YTk3Y1xcdWE5ODQtXFx1YTliMlxcdWE5Y2ZcXHVhYTAwLVxcdWFhMjhcXHVhYTQwLVxcdWFhNDJcXHVhYTQ0LVxcdWFhNGJcXHVhYTYwLVxcdWFhNzZcXHVhYTdhXFx1YWE4MC1cXHVhYWFmXFx1YWFiMVxcdWFhYjVcXHVhYWI2XFx1YWFiOS1cXHVhYWJkXFx1YWFjMFxcdWFhYzJcXHVhYWRiLVxcdWFhZGRcXHVhYWUwLVxcdWFhZWFcXHVhYWYyLVxcdWFhZjRcXHVhYjAxLVxcdWFiMDZcXHVhYjA5LVxcdWFiMGVcXHVhYjExLVxcdWFiMTZcXHVhYjIwLVxcdWFiMjZcXHVhYjI4LVxcdWFiMmVcXHVhYmMwLVxcdWFiZTJcXHVhYzAwLVxcdWQ3YTNcXHVkN2IwLVxcdWQ3YzZcXHVkN2NiLVxcdWQ3ZmJcXHVmOTAwLVxcdWZhNmRcXHVmYTcwLVxcdWZhZDlcXHVmYjAwLVxcdWZiMDZcXHVmYjEzLVxcdWZiMTdcXHVmYjFkXFx1ZmIxZi1cXHVmYjI4XFx1ZmIyYS1cXHVmYjM2XFx1ZmIzOC1cXHVmYjNjXFx1ZmIzZVxcdWZiNDBcXHVmYjQxXFx1ZmI0M1xcdWZiNDRcXHVmYjQ2LVxcdWZiYjFcXHVmYmQzLVxcdWZkM2RcXHVmZDUwLVxcdWZkOGZcXHVmZDkyLVxcdWZkYzdcXHVmZGYwLVxcdWZkZmJcXHVmZTcwLVxcdWZlNzRcXHVmZTc2LVxcdWZlZmNcXHVmZjIxLVxcdWZmM2FcXHVmZjQxLVxcdWZmNWFcXHVmZjY2LVxcdWZmYmVcXHVmZmMyLVxcdWZmYzdcXHVmZmNhLVxcdWZmY2ZcXHVmZmQyLVxcdWZmZDdcXHVmZmRhLVxcdWZmZGNcIjtcbiAgdmFyIG5vbkFTQ0lJaWRlbnRpZmllckNoYXJzID0gXCJcXHUwMzAwLVxcdTAzNmZcXHUwNDgzLVxcdTA0ODdcXHUwNTkxLVxcdTA1YmRcXHUwNWJmXFx1MDVjMVxcdTA1YzJcXHUwNWM0XFx1MDVjNVxcdTA1YzdcXHUwNjEwLVxcdTA2MWFcXHUwNjIwLVxcdTA2NDlcXHUwNjcyLVxcdTA2ZDNcXHUwNmU3LVxcdTA2ZThcXHUwNmZiLVxcdTA2ZmNcXHUwNzMwLVxcdTA3NGFcXHUwODAwLVxcdTA4MTRcXHUwODFiLVxcdTA4MjNcXHUwODI1LVxcdTA4MjdcXHUwODI5LVxcdTA4MmRcXHUwODQwLVxcdTA4NTdcXHUwOGU0LVxcdTA4ZmVcXHUwOTAwLVxcdTA5MDNcXHUwOTNhLVxcdTA5M2NcXHUwOTNlLVxcdTA5NGZcXHUwOTUxLVxcdTA5NTdcXHUwOTYyLVxcdTA5NjNcXHUwOTY2LVxcdTA5NmZcXHUwOTgxLVxcdTA5ODNcXHUwOWJjXFx1MDliZS1cXHUwOWM0XFx1MDljN1xcdTA5YzhcXHUwOWQ3XFx1MDlkZi1cXHUwOWUwXFx1MGEwMS1cXHUwYTAzXFx1MGEzY1xcdTBhM2UtXFx1MGE0MlxcdTBhNDdcXHUwYTQ4XFx1MGE0Yi1cXHUwYTRkXFx1MGE1MVxcdTBhNjYtXFx1MGE3MVxcdTBhNzVcXHUwYTgxLVxcdTBhODNcXHUwYWJjXFx1MGFiZS1cXHUwYWM1XFx1MGFjNy1cXHUwYWM5XFx1MGFjYi1cXHUwYWNkXFx1MGFlMi1cXHUwYWUzXFx1MGFlNi1cXHUwYWVmXFx1MGIwMS1cXHUwYjAzXFx1MGIzY1xcdTBiM2UtXFx1MGI0NFxcdTBiNDdcXHUwYjQ4XFx1MGI0Yi1cXHUwYjRkXFx1MGI1NlxcdTBiNTdcXHUwYjVmLVxcdTBiNjBcXHUwYjY2LVxcdTBiNmZcXHUwYjgyXFx1MGJiZS1cXHUwYmMyXFx1MGJjNi1cXHUwYmM4XFx1MGJjYS1cXHUwYmNkXFx1MGJkN1xcdTBiZTYtXFx1MGJlZlxcdTBjMDEtXFx1MGMwM1xcdTBjNDYtXFx1MGM0OFxcdTBjNGEtXFx1MGM0ZFxcdTBjNTVcXHUwYzU2XFx1MGM2Mi1cXHUwYzYzXFx1MGM2Ni1cXHUwYzZmXFx1MGM4MlxcdTBjODNcXHUwY2JjXFx1MGNiZS1cXHUwY2M0XFx1MGNjNi1cXHUwY2M4XFx1MGNjYS1cXHUwY2NkXFx1MGNkNVxcdTBjZDZcXHUwY2UyLVxcdTBjZTNcXHUwY2U2LVxcdTBjZWZcXHUwZDAyXFx1MGQwM1xcdTBkNDYtXFx1MGQ0OFxcdTBkNTdcXHUwZDYyLVxcdTBkNjNcXHUwZDY2LVxcdTBkNmZcXHUwZDgyXFx1MGQ4M1xcdTBkY2FcXHUwZGNmLVxcdTBkZDRcXHUwZGQ2XFx1MGRkOC1cXHUwZGRmXFx1MGRmMlxcdTBkZjNcXHUwZTM0LVxcdTBlM2FcXHUwZTQwLVxcdTBlNDVcXHUwZTUwLVxcdTBlNTlcXHUwZWI0LVxcdTBlYjlcXHUwZWM4LVxcdTBlY2RcXHUwZWQwLVxcdTBlZDlcXHUwZjE4XFx1MGYxOVxcdTBmMjAtXFx1MGYyOVxcdTBmMzVcXHUwZjM3XFx1MGYzOVxcdTBmNDEtXFx1MGY0N1xcdTBmNzEtXFx1MGY4NFxcdTBmODYtXFx1MGY4N1xcdTBmOGQtXFx1MGY5N1xcdTBmOTktXFx1MGZiY1xcdTBmYzZcXHUxMDAwLVxcdTEwMjlcXHUxMDQwLVxcdTEwNDlcXHUxMDY3LVxcdTEwNmRcXHUxMDcxLVxcdTEwNzRcXHUxMDgyLVxcdTEwOGRcXHUxMDhmLVxcdTEwOWRcXHUxMzVkLVxcdTEzNWZcXHUxNzBlLVxcdTE3MTBcXHUxNzIwLVxcdTE3MzBcXHUxNzQwLVxcdTE3NTBcXHUxNzcyXFx1MTc3M1xcdTE3ODAtXFx1MTdiMlxcdTE3ZGRcXHUxN2UwLVxcdTE3ZTlcXHUxODBiLVxcdTE4MGRcXHUxODEwLVxcdTE4MTlcXHUxOTIwLVxcdTE5MmJcXHUxOTMwLVxcdTE5M2JcXHUxOTUxLVxcdTE5NmRcXHUxOWIwLVxcdTE5YzBcXHUxOWM4LVxcdTE5YzlcXHUxOWQwLVxcdTE5ZDlcXHUxYTAwLVxcdTFhMTVcXHUxYTIwLVxcdTFhNTNcXHUxYTYwLVxcdTFhN2NcXHUxYTdmLVxcdTFhODlcXHUxYTkwLVxcdTFhOTlcXHUxYjQ2LVxcdTFiNGJcXHUxYjUwLVxcdTFiNTlcXHUxYjZiLVxcdTFiNzNcXHUxYmIwLVxcdTFiYjlcXHUxYmU2LVxcdTFiZjNcXHUxYzAwLVxcdTFjMjJcXHUxYzQwLVxcdTFjNDlcXHUxYzViLVxcdTFjN2RcXHUxY2QwLVxcdTFjZDJcXHUxZDAwLVxcdTFkYmVcXHUxZTAxLVxcdTFmMTVcXHUyMDBjXFx1MjAwZFxcdTIwM2ZcXHUyMDQwXFx1MjA1NFxcdTIwZDAtXFx1MjBkY1xcdTIwZTFcXHUyMGU1LVxcdTIwZjBcXHUyZDgxLVxcdTJkOTZcXHUyZGUwLVxcdTJkZmZcXHUzMDIxLVxcdTMwMjhcXHUzMDk5XFx1MzA5YVxcdWE2NDAtXFx1YTY2ZFxcdWE2NzQtXFx1YTY3ZFxcdWE2OWZcXHVhNmYwLVxcdWE2ZjFcXHVhN2Y4LVxcdWE4MDBcXHVhODA2XFx1YTgwYlxcdWE4MjMtXFx1YTgyN1xcdWE4ODAtXFx1YTg4MVxcdWE4YjQtXFx1YThjNFxcdWE4ZDAtXFx1YThkOVxcdWE4ZjMtXFx1YThmN1xcdWE5MDAtXFx1YTkwOVxcdWE5MjYtXFx1YTkyZFxcdWE5MzAtXFx1YTk0NVxcdWE5ODAtXFx1YTk4M1xcdWE5YjMtXFx1YTljMFxcdWFhMDAtXFx1YWEyN1xcdWFhNDAtXFx1YWE0MVxcdWFhNGMtXFx1YWE0ZFxcdWFhNTAtXFx1YWE1OVxcdWFhN2JcXHVhYWUwLVxcdWFhZTlcXHVhYWYyLVxcdWFhZjNcXHVhYmMwLVxcdWFiZTFcXHVhYmVjXFx1YWJlZFxcdWFiZjAtXFx1YWJmOVxcdWZiMjAtXFx1ZmIyOFxcdWZlMDAtXFx1ZmUwZlxcdWZlMjAtXFx1ZmUyNlxcdWZlMzNcXHVmZTM0XFx1ZmU0ZC1cXHVmZTRmXFx1ZmYxMC1cXHVmZjE5XFx1ZmYzZlwiO1xuICB2YXIgbm9uQVNDSUlpZGVudGlmaWVyU3RhcnQgPSBuZXcgUmVnRXhwKFwiW1wiICsgbm9uQVNDSUlpZGVudGlmaWVyU3RhcnRDaGFycyArIFwiXVwiKTtcbiAgdmFyIG5vbkFTQ0lJaWRlbnRpZmllciA9IG5ldyBSZWdFeHAoXCJbXCIgKyBub25BU0NJSWlkZW50aWZpZXJTdGFydENoYXJzICsgbm9uQVNDSUlpZGVudGlmaWVyQ2hhcnMgKyBcIl1cIik7XG5cbiAgLy8gV2hldGhlciBhIHNpbmdsZSBjaGFyYWN0ZXIgZGVub3RlcyBhIG5ld2xpbmUuXG5cbiAgdmFyIG5ld2xpbmUgPSAvW1xcblxcclxcdTIwMjhcXHUyMDI5XS87XG5cbiAgLy8gTWF0Y2hlcyBhIHdob2xlIGxpbmUgYnJlYWsgKHdoZXJlIENSTEYgaXMgY29uc2lkZXJlZCBhIHNpbmdsZVxuICAvLyBsaW5lIGJyZWFrKS4gVXNlZCB0byBjb3VudCBsaW5lcy5cblxuICB2YXIgbGluZUJyZWFrID0gL1xcclxcbnxbXFxuXFxyXFx1MjAyOFxcdTIwMjldL2c7XG5cbiAgLy8gVGVzdCB3aGV0aGVyIGEgZ2l2ZW4gY2hhcmFjdGVyIGNvZGUgc3RhcnRzIGFuIGlkZW50aWZpZXIuXG5cbiAgdmFyIGlzSWRlbnRpZmllclN0YXJ0ID0gZXhwb3J0cy5pc0lkZW50aWZpZXJTdGFydCA9IGZ1bmN0aW9uKGNvZGUpIHtcbiAgICBpZiAoY29kZSA8IDY1KSByZXR1cm4gY29kZSA9PT0gMzY7XG4gICAgaWYgKGNvZGUgPCA5MSkgcmV0dXJuIHRydWU7XG4gICAgaWYgKGNvZGUgPCA5NykgcmV0dXJuIGNvZGUgPT09IDk1O1xuICAgIGlmIChjb2RlIDwgMTIzKXJldHVybiB0cnVlO1xuICAgIHJldHVybiBjb2RlID49IDB4YWEgJiYgbm9uQVNDSUlpZGVudGlmaWVyU3RhcnQudGVzdChTdHJpbmcuZnJvbUNoYXJDb2RlKGNvZGUpKTtcbiAgfTtcblxuICAvLyBUZXN0IHdoZXRoZXIgYSBnaXZlbiBjaGFyYWN0ZXIgaXMgcGFydCBvZiBhbiBpZGVudGlmaWVyLlxuXG4gIHZhciBpc0lkZW50aWZpZXJDaGFyID0gZXhwb3J0cy5pc0lkZW50aWZpZXJDaGFyID0gZnVuY3Rpb24oY29kZSkge1xuICAgIGlmIChjb2RlIDwgNDgpIHJldHVybiBjb2RlID09PSAzNjtcbiAgICBpZiAoY29kZSA8IDU4KSByZXR1cm4gdHJ1ZTtcbiAgICBpZiAoY29kZSA8IDY1KSByZXR1cm4gZmFsc2U7XG4gICAgaWYgKGNvZGUgPCA5MSkgcmV0dXJuIHRydWU7XG4gICAgaWYgKGNvZGUgPCA5NykgcmV0dXJuIGNvZGUgPT09IDk1O1xuICAgIGlmIChjb2RlIDwgMTIzKXJldHVybiB0cnVlO1xuICAgIHJldHVybiBjb2RlID49IDB4YWEgJiYgbm9uQVNDSUlpZGVudGlmaWVyLnRlc3QoU3RyaW5nLmZyb21DaGFyQ29kZShjb2RlKSk7XG4gIH07XG5cbiAgLy8gIyMgVG9rZW5pemVyXG5cbiAgLy8gVGhlc2UgYXJlIHVzZWQgd2hlbiBgb3B0aW9ucy5sb2NhdGlvbnNgIGlzIG9uLCBmb3IgdGhlXG4gIC8vIGB0b2tTdGFydExvY2AgYW5kIGB0b2tFbmRMb2NgIHByb3BlcnRpZXMuXG5cbiAgZnVuY3Rpb24gUG9zaXRpb24oKSB7XG4gICAgdGhpcy5saW5lID0gdG9rQ3VyTGluZTtcbiAgICB0aGlzLmNvbHVtbiA9IHRva1BvcyAtIHRva0xpbmVTdGFydDtcbiAgfVxuXG4gIC8vIFJlc2V0IHRoZSB0b2tlbiBzdGF0ZS4gVXNlZCBhdCB0aGUgc3RhcnQgb2YgYSBwYXJzZS5cblxuICBmdW5jdGlvbiBpbml0VG9rZW5TdGF0ZSgpIHtcbiAgICB0b2tDdXJMaW5lID0gMTtcbiAgICB0b2tQb3MgPSB0b2tMaW5lU3RhcnQgPSAwO1xuICAgIHRva1JlZ2V4cEFsbG93ZWQgPSB0cnVlO1xuICAgIHNraXBTcGFjZSgpO1xuICB9XG5cbiAgLy8gQ2FsbGVkIGF0IHRoZSBlbmQgb2YgZXZlcnkgdG9rZW4uIFNldHMgYHRva0VuZGAsIGB0b2tWYWxgLCBhbmRcbiAgLy8gYHRva1JlZ2V4cEFsbG93ZWRgLCBhbmQgc2tpcHMgdGhlIHNwYWNlIGFmdGVyIHRoZSB0b2tlbiwgc28gdGhhdFxuICAvLyB0aGUgbmV4dCBvbmUncyBgdG9rU3RhcnRgIHdpbGwgcG9pbnQgYXQgdGhlIHJpZ2h0IHBvc2l0aW9uLlxuXG4gIGZ1bmN0aW9uIGZpbmlzaFRva2VuKHR5cGUsIHZhbCkge1xuICAgIHRva0VuZCA9IHRva1BvcztcbiAgICBpZiAob3B0aW9ucy5sb2NhdGlvbnMpIHRva0VuZExvYyA9IG5ldyBQb3NpdGlvbjtcbiAgICB0b2tUeXBlID0gdHlwZTtcbiAgICBza2lwU3BhY2UoKTtcbiAgICB0b2tWYWwgPSB2YWw7XG4gICAgdG9rUmVnZXhwQWxsb3dlZCA9IHR5cGUuYmVmb3JlRXhwcjtcbiAgfVxuXG4gIGZ1bmN0aW9uIHNraXBCbG9ja0NvbW1lbnQoKSB7XG4gICAgdmFyIHN0YXJ0TG9jID0gb3B0aW9ucy5vbkNvbW1lbnQgJiYgb3B0aW9ucy5sb2NhdGlvbnMgJiYgbmV3IFBvc2l0aW9uO1xuICAgIHZhciBzdGFydCA9IHRva1BvcywgZW5kID0gaW5wdXQuaW5kZXhPZihcIiovXCIsIHRva1BvcyArPSAyKTtcbiAgICBpZiAoZW5kID09PSAtMSkgcmFpc2UodG9rUG9zIC0gMiwgXCJVbnRlcm1pbmF0ZWQgY29tbWVudFwiKTtcbiAgICB0b2tQb3MgPSBlbmQgKyAyO1xuICAgIGlmIChvcHRpb25zLmxvY2F0aW9ucykge1xuICAgICAgbGluZUJyZWFrLmxhc3RJbmRleCA9IHN0YXJ0O1xuICAgICAgdmFyIG1hdGNoO1xuICAgICAgd2hpbGUgKChtYXRjaCA9IGxpbmVCcmVhay5leGVjKGlucHV0KSkgJiYgbWF0Y2guaW5kZXggPCB0b2tQb3MpIHtcbiAgICAgICAgKyt0b2tDdXJMaW5lO1xuICAgICAgICB0b2tMaW5lU3RhcnQgPSBtYXRjaC5pbmRleCArIG1hdGNoWzBdLmxlbmd0aDtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKG9wdGlvbnMub25Db21tZW50KVxuICAgICAgb3B0aW9ucy5vbkNvbW1lbnQodHJ1ZSwgaW5wdXQuc2xpY2Uoc3RhcnQgKyAyLCBlbmQpLCBzdGFydCwgdG9rUG9zLFxuICAgICAgICAgICAgICAgICAgICAgICAgc3RhcnRMb2MsIG9wdGlvbnMubG9jYXRpb25zICYmIG5ldyBQb3NpdGlvbik7XG4gIH1cblxuICBmdW5jdGlvbiBza2lwTGluZUNvbW1lbnQoKSB7XG4gICAgdmFyIHN0YXJ0ID0gdG9rUG9zO1xuICAgIHZhciBzdGFydExvYyA9IG9wdGlvbnMub25Db21tZW50ICYmIG9wdGlvbnMubG9jYXRpb25zICYmIG5ldyBQb3NpdGlvbjtcbiAgICB2YXIgY2ggPSBpbnB1dC5jaGFyQ29kZUF0KHRva1Bvcys9Mik7XG4gICAgd2hpbGUgKHRva1BvcyA8IGlucHV0TGVuICYmIGNoICE9PSAxMCAmJiBjaCAhPT0gMTMgJiYgY2ggIT09IDgyMzIgJiYgY2ggIT09IDgyMzMpIHtcbiAgICAgICsrdG9rUG9zO1xuICAgICAgY2ggPSBpbnB1dC5jaGFyQ29kZUF0KHRva1Bvcyk7XG4gICAgfVxuICAgIGlmIChvcHRpb25zLm9uQ29tbWVudClcbiAgICAgIG9wdGlvbnMub25Db21tZW50KGZhbHNlLCBpbnB1dC5zbGljZShzdGFydCArIDIsIHRva1BvcyksIHN0YXJ0LCB0b2tQb3MsXG4gICAgICAgICAgICAgICAgICAgICAgICBzdGFydExvYywgb3B0aW9ucy5sb2NhdGlvbnMgJiYgbmV3IFBvc2l0aW9uKTtcbiAgfVxuXG4gIC8vIENhbGxlZCBhdCB0aGUgc3RhcnQgb2YgdGhlIHBhcnNlIGFuZCBhZnRlciBldmVyeSB0b2tlbi4gU2tpcHNcbiAgLy8gd2hpdGVzcGFjZSBhbmQgY29tbWVudHMsIGFuZC5cblxuICBmdW5jdGlvbiBza2lwU3BhY2UoKSB7XG4gICAgd2hpbGUgKHRva1BvcyA8IGlucHV0TGVuKSB7XG4gICAgICB2YXIgY2ggPSBpbnB1dC5jaGFyQ29kZUF0KHRva1Bvcyk7XG4gICAgICBpZiAoY2ggPT09IDMyKSB7IC8vICcgJ1xuICAgICAgICArK3Rva1BvcztcbiAgICAgIH0gZWxzZSBpZiAoY2ggPT09IDEzKSB7XG4gICAgICAgICsrdG9rUG9zO1xuICAgICAgICB2YXIgbmV4dCA9IGlucHV0LmNoYXJDb2RlQXQodG9rUG9zKTtcbiAgICAgICAgaWYgKG5leHQgPT09IDEwKSB7XG4gICAgICAgICAgKyt0b2tQb3M7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG9wdGlvbnMubG9jYXRpb25zKSB7XG4gICAgICAgICAgKyt0b2tDdXJMaW5lO1xuICAgICAgICAgIHRva0xpbmVTdGFydCA9IHRva1BvcztcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmIChjaCA9PT0gMTAgfHwgY2ggPT09IDgyMzIgfHwgY2ggPT09IDgyMzMpIHtcbiAgICAgICAgKyt0b2tQb3M7XG4gICAgICAgIGlmIChvcHRpb25zLmxvY2F0aW9ucykge1xuICAgICAgICAgICsrdG9rQ3VyTGluZTtcbiAgICAgICAgICB0b2tMaW5lU3RhcnQgPSB0b2tQb3M7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAoY2ggPiA4ICYmIGNoIDwgMTQpIHtcbiAgICAgICAgKyt0b2tQb3M7XG4gICAgICB9IGVsc2UgaWYgKGNoID09PSA0NykgeyAvLyAnLydcbiAgICAgICAgdmFyIG5leHQgPSBpbnB1dC5jaGFyQ29kZUF0KHRva1BvcyArIDEpO1xuICAgICAgICBpZiAobmV4dCA9PT0gNDIpIHsgLy8gJyonXG4gICAgICAgICAgc2tpcEJsb2NrQ29tbWVudCgpO1xuICAgICAgICB9IGVsc2UgaWYgKG5leHQgPT09IDQ3KSB7IC8vICcvJ1xuICAgICAgICAgIHNraXBMaW5lQ29tbWVudCgpO1xuICAgICAgICB9IGVsc2UgYnJlYWs7XG4gICAgICB9IGVsc2UgaWYgKGNoID09PSAxNjApIHsgLy8gJ1xceGEwJ1xuICAgICAgICArK3Rva1BvcztcbiAgICAgIH0gZWxzZSBpZiAoY2ggPj0gNTc2MCAmJiBub25BU0NJSXdoaXRlc3BhY2UudGVzdChTdHJpbmcuZnJvbUNoYXJDb2RlKGNoKSkpIHtcbiAgICAgICAgKyt0b2tQb3M7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvLyAjIyMgVG9rZW4gcmVhZGluZ1xuXG4gIC8vIFRoaXMgaXMgdGhlIGZ1bmN0aW9uIHRoYXQgaXMgY2FsbGVkIHRvIGZldGNoIHRoZSBuZXh0IHRva2VuLiBJdFxuICAvLyBpcyBzb21ld2hhdCBvYnNjdXJlLCBiZWNhdXNlIGl0IHdvcmtzIGluIGNoYXJhY3RlciBjb2RlcyByYXRoZXJcbiAgLy8gdGhhbiBjaGFyYWN0ZXJzLCBhbmQgYmVjYXVzZSBvcGVyYXRvciBwYXJzaW5nIGhhcyBiZWVuIGlubGluZWRcbiAgLy8gaW50byBpdC5cbiAgLy9cbiAgLy8gQWxsIGluIHRoZSBuYW1lIG9mIHNwZWVkLlxuICAvL1xuICAvLyBUaGUgYGZvcmNlUmVnZXhwYCBwYXJhbWV0ZXIgaXMgdXNlZCBpbiB0aGUgb25lIGNhc2Ugd2hlcmUgdGhlXG4gIC8vIGB0b2tSZWdleHBBbGxvd2VkYCB0cmljayBkb2VzIG5vdCB3b3JrLiBTZWUgYHBhcnNlU3RhdGVtZW50YC5cblxuICBmdW5jdGlvbiByZWFkVG9rZW5fZG90KCkge1xuICAgIHZhciBuZXh0ID0gaW5wdXQuY2hhckNvZGVBdCh0b2tQb3MgKyAxKTtcbiAgICBpZiAobmV4dCA+PSA0OCAmJiBuZXh0IDw9IDU3KSByZXR1cm4gcmVhZE51bWJlcih0cnVlKTtcbiAgICB2YXIgbmV4dDIgPSBpbnB1dC5jaGFyQ29kZUF0KHRva1BvcyArIDIpO1xuICAgIGlmIChvcHRpb25zLmVjbWFWZXJzaW9uID49IDYgJiYgbmV4dCA9PT0gNDYgJiYgbmV4dDIgPT09IDQ2KSB7IC8vIDQ2ID0gZG90ICcuJ1xuICAgICAgdG9rUG9zICs9IDM7XG4gICAgICByZXR1cm4gZmluaXNoVG9rZW4oX2VsbGlwc2lzKTtcbiAgICB9IGVsc2Uge1xuICAgICAgKyt0b2tQb3M7XG4gICAgICByZXR1cm4gZmluaXNoVG9rZW4oX2RvdCk7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gcmVhZFRva2VuX3NsYXNoKCkgeyAvLyAnLydcbiAgICB2YXIgbmV4dCA9IGlucHV0LmNoYXJDb2RlQXQodG9rUG9zICsgMSk7XG4gICAgaWYgKHRva1JlZ2V4cEFsbG93ZWQpIHsrK3Rva1BvczsgcmV0dXJuIHJlYWRSZWdleHAoKTt9XG4gICAgaWYgKG5leHQgPT09IDYxKSByZXR1cm4gZmluaXNoT3AoX2Fzc2lnbiwgMik7XG4gICAgcmV0dXJuIGZpbmlzaE9wKF9zbGFzaCwgMSk7XG4gIH1cblxuICBmdW5jdGlvbiByZWFkVG9rZW5fbXVsdF9tb2R1bG8oKSB7IC8vICclKidcbiAgICB2YXIgbmV4dCA9IGlucHV0LmNoYXJDb2RlQXQodG9rUG9zICsgMSk7XG4gICAgaWYgKG5leHQgPT09IDYxKSByZXR1cm4gZmluaXNoT3AoX2Fzc2lnbiwgMik7XG4gICAgcmV0dXJuIGZpbmlzaE9wKF9tdWx0aXBseU1vZHVsbywgMSk7XG4gIH1cblxuICBmdW5jdGlvbiByZWFkVG9rZW5fcGlwZV9hbXAoY29kZSkgeyAvLyAnfCYnXG4gICAgdmFyIG5leHQgPSBpbnB1dC5jaGFyQ29kZUF0KHRva1BvcyArIDEpO1xuICAgIGlmIChuZXh0ID09PSBjb2RlKSByZXR1cm4gZmluaXNoT3AoY29kZSA9PT0gMTI0ID8gX2xvZ2ljYWxPUiA6IF9sb2dpY2FsQU5ELCAyKTtcbiAgICBpZiAobmV4dCA9PT0gNjEpIHJldHVybiBmaW5pc2hPcChfYXNzaWduLCAyKTtcbiAgICByZXR1cm4gZmluaXNoT3AoY29kZSA9PT0gMTI0ID8gX2JpdHdpc2VPUiA6IF9iaXR3aXNlQU5ELCAxKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHJlYWRUb2tlbl9jYXJldCgpIHsgLy8gJ14nXG4gICAgdmFyIG5leHQgPSBpbnB1dC5jaGFyQ29kZUF0KHRva1BvcyArIDEpO1xuICAgIGlmIChuZXh0ID09PSA2MSkgcmV0dXJuIGZpbmlzaE9wKF9hc3NpZ24sIDIpO1xuICAgIHJldHVybiBmaW5pc2hPcChfYml0d2lzZVhPUiwgMSk7XG4gIH1cblxuICBmdW5jdGlvbiByZWFkVG9rZW5fcGx1c19taW4oY29kZSkgeyAvLyAnKy0nXG4gICAgdmFyIG5leHQgPSBpbnB1dC5jaGFyQ29kZUF0KHRva1BvcyArIDEpO1xuICAgIGlmIChuZXh0ID09PSBjb2RlKSB7XG4gICAgICBpZiAobmV4dCA9PSA0NSAmJiBpbnB1dC5jaGFyQ29kZUF0KHRva1BvcyArIDIpID09IDYyICYmXG4gICAgICAgICAgbmV3bGluZS50ZXN0KGlucHV0LnNsaWNlKGxhc3RFbmQsIHRva1BvcykpKSB7XG4gICAgICAgIC8vIEEgYC0tPmAgbGluZSBjb21tZW50XG4gICAgICAgIHRva1BvcyArPSAzO1xuICAgICAgICBza2lwTGluZUNvbW1lbnQoKTtcbiAgICAgICAgc2tpcFNwYWNlKCk7XG4gICAgICAgIHJldHVybiByZWFkVG9rZW4oKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBmaW5pc2hPcChfaW5jRGVjLCAyKTtcbiAgICB9XG4gICAgaWYgKG5leHQgPT09IDYxKSByZXR1cm4gZmluaXNoT3AoX2Fzc2lnbiwgMik7XG4gICAgcmV0dXJuIGZpbmlzaE9wKF9wbHVzTWluLCAxKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHJlYWRUb2tlbl9sdF9ndChjb2RlKSB7IC8vICc8PidcbiAgICB2YXIgbmV4dCA9IGlucHV0LmNoYXJDb2RlQXQodG9rUG9zICsgMSk7XG4gICAgdmFyIHNpemUgPSAxO1xuICAgIGlmIChuZXh0ID09PSBjb2RlKSB7XG4gICAgICBzaXplID0gY29kZSA9PT0gNjIgJiYgaW5wdXQuY2hhckNvZGVBdCh0b2tQb3MgKyAyKSA9PT0gNjIgPyAzIDogMjtcbiAgICAgIGlmIChpbnB1dC5jaGFyQ29kZUF0KHRva1BvcyArIHNpemUpID09PSA2MSkgcmV0dXJuIGZpbmlzaE9wKF9hc3NpZ24sIHNpemUgKyAxKTtcbiAgICAgIHJldHVybiBmaW5pc2hPcChfYml0U2hpZnQsIHNpemUpO1xuICAgIH1cbiAgICBpZiAobmV4dCA9PSAzMyAmJiBjb2RlID09IDYwICYmIGlucHV0LmNoYXJDb2RlQXQodG9rUG9zICsgMikgPT0gNDUgJiZcbiAgICAgICAgaW5wdXQuY2hhckNvZGVBdCh0b2tQb3MgKyAzKSA9PSA0NSkge1xuICAgICAgLy8gYDwhLS1gLCBhbiBYTUwtc3R5bGUgY29tbWVudCB0aGF0IHNob3VsZCBiZSBpbnRlcnByZXRlZCBhcyBhIGxpbmUgY29tbWVudFxuICAgICAgdG9rUG9zICs9IDQ7XG4gICAgICBza2lwTGluZUNvbW1lbnQoKTtcbiAgICAgIHNraXBTcGFjZSgpO1xuICAgICAgcmV0dXJuIHJlYWRUb2tlbigpO1xuICAgIH1cbiAgICBpZiAobmV4dCA9PT0gNjEpXG4gICAgICBzaXplID0gaW5wdXQuY2hhckNvZGVBdCh0b2tQb3MgKyAyKSA9PT0gNjEgPyAzIDogMjtcbiAgICByZXR1cm4gZmluaXNoT3AoX3JlbGF0aW9uYWwsIHNpemUpO1xuICB9XG5cbiAgZnVuY3Rpb24gcmVhZFRva2VuX2VxX2V4Y2woY29kZSkgeyAvLyAnPSEnXG4gICAgdmFyIG5leHQgPSBpbnB1dC5jaGFyQ29kZUF0KHRva1BvcyArIDEpO1xuICAgIGlmIChuZXh0ID09PSA2MSkgcmV0dXJuIGZpbmlzaE9wKF9lcXVhbGl0eSwgaW5wdXQuY2hhckNvZGVBdCh0b2tQb3MgKyAyKSA9PT0gNjEgPyAzIDogMik7XG4gICAgcmV0dXJuIGZpbmlzaE9wKGNvZGUgPT09IDYxID8gX2VxIDogX3ByZWZpeCwgMSk7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRUb2tlbkZyb21Db2RlKGNvZGUpIHtcbiAgICBzd2l0Y2goY29kZSkge1xuICAgICAgLy8gVGhlIGludGVycHJldGF0aW9uIG9mIGEgZG90IGRlcGVuZHMgb24gd2hldGhlciBpdCBpcyBmb2xsb3dlZFxuICAgICAgLy8gYnkgYSBkaWdpdCBvciBhbm90aGVyIHR3byBkb3RzLlxuICAgIGNhc2UgNDY6IC8vICcuJ1xuICAgICAgcmV0dXJuIHJlYWRUb2tlbl9kb3QoKTtcblxuICAgICAgLy8gUHVuY3R1YXRpb24gdG9rZW5zLlxuICAgIGNhc2UgNDA6ICsrdG9rUG9zOyByZXR1cm4gZmluaXNoVG9rZW4oX3BhcmVuTCk7XG4gICAgY2FzZSA0MTogKyt0b2tQb3M7IHJldHVybiBmaW5pc2hUb2tlbihfcGFyZW5SKTtcbiAgICBjYXNlIDU5OiArK3Rva1BvczsgcmV0dXJuIGZpbmlzaFRva2VuKF9zZW1pKTtcbiAgICBjYXNlIDQ0OiArK3Rva1BvczsgcmV0dXJuIGZpbmlzaFRva2VuKF9jb21tYSk7XG4gICAgY2FzZSA5MTogKyt0b2tQb3M7IHJldHVybiBmaW5pc2hUb2tlbihfYnJhY2tldEwpO1xuICAgIGNhc2UgOTM6ICsrdG9rUG9zOyByZXR1cm4gZmluaXNoVG9rZW4oX2JyYWNrZXRSKTtcbiAgICBjYXNlIDEyMzogKyt0b2tQb3M7IHJldHVybiBmaW5pc2hUb2tlbihfYnJhY2VMKTtcbiAgICBjYXNlIDEyNTogKyt0b2tQb3M7IHJldHVybiBmaW5pc2hUb2tlbihfYnJhY2VSKTtcbiAgICBjYXNlIDU4OiArK3Rva1BvczsgcmV0dXJuIGZpbmlzaFRva2VuKF9jb2xvbik7XG4gICAgY2FzZSA2MzogKyt0b2tQb3M7IHJldHVybiBmaW5pc2hUb2tlbihfcXVlc3Rpb24pO1xuXG4gICAgICAvLyAnMHgnIGlzIGEgaGV4YWRlY2ltYWwgbnVtYmVyLlxuICAgIGNhc2UgNDg6IC8vICcwJ1xuICAgICAgdmFyIG5leHQgPSBpbnB1dC5jaGFyQ29kZUF0KHRva1BvcyArIDEpO1xuICAgICAgaWYgKG5leHQgPT09IDEyMCB8fCBuZXh0ID09PSA4OCkgcmV0dXJuIHJlYWRIZXhOdW1iZXIoKTtcbiAgICAgIC8vIEFueXRoaW5nIGVsc2UgYmVnaW5uaW5nIHdpdGggYSBkaWdpdCBpcyBhbiBpbnRlZ2VyLCBvY3RhbFxuICAgICAgLy8gbnVtYmVyLCBvciBmbG9hdC5cbiAgICAvKiBmYWxscyB0aHJvdWdoICovXG4gICAgY2FzZSA0OTogY2FzZSA1MDogY2FzZSA1MTogY2FzZSA1MjogY2FzZSA1MzogY2FzZSA1NDogY2FzZSA1NTogY2FzZSA1NjogY2FzZSA1NzogLy8gMS05XG4gICAgICByZXR1cm4gcmVhZE51bWJlcihmYWxzZSk7XG5cbiAgICAgIC8vIFF1b3RlcyBwcm9kdWNlIHN0cmluZ3MuXG4gICAgY2FzZSAzNDogY2FzZSAzOTogLy8gJ1wiJywgXCInXCJcbiAgICAgIHJldHVybiByZWFkU3RyaW5nKGNvZGUpO1xuXG4gICAgLy8gT3BlcmF0b3JzIGFyZSBwYXJzZWQgaW5saW5lIGluIHRpbnkgc3RhdGUgbWFjaGluZXMuICc9JyAoNjEpIGlzXG4gICAgLy8gb2Z0ZW4gcmVmZXJyZWQgdG8uIGBmaW5pc2hPcGAgc2ltcGx5IHNraXBzIHRoZSBhbW91bnQgb2ZcbiAgICAvLyBjaGFyYWN0ZXJzIGl0IGlzIGdpdmVuIGFzIHNlY29uZCBhcmd1bWVudCwgYW5kIHJldHVybnMgYSB0b2tlblxuICAgIC8vIG9mIHRoZSB0eXBlIGdpdmVuIGJ5IGl0cyBmaXJzdCBhcmd1bWVudC5cblxuICAgIGNhc2UgNDc6IC8vICcvJ1xuICAgICAgcmV0dXJuIHJlYWRUb2tlbl9zbGFzaCgpO1xuXG4gICAgY2FzZSAzNzogY2FzZSA0MjogLy8gJyUqJ1xuICAgICAgcmV0dXJuIHJlYWRUb2tlbl9tdWx0X21vZHVsbygpO1xuXG4gICAgY2FzZSAxMjQ6IGNhc2UgMzg6IC8vICd8JidcbiAgICAgIHJldHVybiByZWFkVG9rZW5fcGlwZV9hbXAoY29kZSk7XG5cbiAgICBjYXNlIDk0OiAvLyAnXidcbiAgICAgIHJldHVybiByZWFkVG9rZW5fY2FyZXQoKTtcblxuICAgIGNhc2UgNDM6IGNhc2UgNDU6IC8vICcrLSdcbiAgICAgIHJldHVybiByZWFkVG9rZW5fcGx1c19taW4oY29kZSk7XG5cbiAgICBjYXNlIDYwOiBjYXNlIDYyOiAvLyAnPD4nXG4gICAgICByZXR1cm4gcmVhZFRva2VuX2x0X2d0KGNvZGUpO1xuXG4gICAgY2FzZSA2MTogY2FzZSAzMzogLy8gJz0hJ1xuICAgICAgcmV0dXJuIHJlYWRUb2tlbl9lcV9leGNsKGNvZGUpO1xuXG4gICAgY2FzZSAxMjY6IC8vICd+J1xuICAgICAgcmV0dXJuIGZpbmlzaE9wKF9wcmVmaXgsIDEpO1xuICAgIH1cblxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHJlYWRUb2tlbihmb3JjZVJlZ2V4cCkge1xuICAgIGlmICghZm9yY2VSZWdleHApIHRva1N0YXJ0ID0gdG9rUG9zO1xuICAgIGVsc2UgdG9rUG9zID0gdG9rU3RhcnQgKyAxO1xuICAgIGlmIChvcHRpb25zLmxvY2F0aW9ucykgdG9rU3RhcnRMb2MgPSBuZXcgUG9zaXRpb247XG4gICAgaWYgKGZvcmNlUmVnZXhwKSByZXR1cm4gcmVhZFJlZ2V4cCgpO1xuICAgIGlmICh0b2tQb3MgPj0gaW5wdXRMZW4pIHJldHVybiBmaW5pc2hUb2tlbihfZW9mKTtcblxuICAgIHZhciBjb2RlID0gaW5wdXQuY2hhckNvZGVBdCh0b2tQb3MpO1xuICAgIC8vIElkZW50aWZpZXIgb3Iga2V5d29yZC4gJ1xcdVhYWFgnIHNlcXVlbmNlcyBhcmUgYWxsb3dlZCBpblxuICAgIC8vIGlkZW50aWZpZXJzLCBzbyAnXFwnIGFsc28gZGlzcGF0Y2hlcyB0byB0aGF0LlxuICAgIGlmIChpc0lkZW50aWZpZXJTdGFydChjb2RlKSB8fCBjb2RlID09PSA5MiAvKiAnXFwnICovKSByZXR1cm4gcmVhZFdvcmQoKTtcblxuICAgIHZhciB0b2sgPSBnZXRUb2tlbkZyb21Db2RlKGNvZGUpO1xuXG4gICAgaWYgKHRvayA9PT0gZmFsc2UpIHtcbiAgICAgIC8vIElmIHdlIGFyZSBoZXJlLCB3ZSBlaXRoZXIgZm91bmQgYSBub24tQVNDSUkgaWRlbnRpZmllclxuICAgICAgLy8gY2hhcmFjdGVyLCBvciBzb21ldGhpbmcgdGhhdCdzIGVudGlyZWx5IGRpc2FsbG93ZWQuXG4gICAgICB2YXIgY2ggPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGNvZGUpO1xuICAgICAgaWYgKGNoID09PSBcIlxcXFxcIiB8fCBub25BU0NJSWlkZW50aWZpZXJTdGFydC50ZXN0KGNoKSkgcmV0dXJuIHJlYWRXb3JkKCk7XG4gICAgICByYWlzZSh0b2tQb3MsIFwiVW5leHBlY3RlZCBjaGFyYWN0ZXIgJ1wiICsgY2ggKyBcIidcIik7XG4gICAgfVxuICAgIHJldHVybiB0b2s7XG4gIH1cblxuICBmdW5jdGlvbiBmaW5pc2hPcCh0eXBlLCBzaXplKSB7XG4gICAgdmFyIHN0ciA9IGlucHV0LnNsaWNlKHRva1BvcywgdG9rUG9zICsgc2l6ZSk7XG4gICAgdG9rUG9zICs9IHNpemU7XG4gICAgZmluaXNoVG9rZW4odHlwZSwgc3RyKTtcbiAgfVxuXG4gIC8vIFBhcnNlIGEgcmVndWxhciBleHByZXNzaW9uLiBTb21lIGNvbnRleHQtYXdhcmVuZXNzIGlzIG5lY2Vzc2FyeSxcbiAgLy8gc2luY2UgYSAnLycgaW5zaWRlIGEgJ1tdJyBzZXQgZG9lcyBub3QgZW5kIHRoZSBleHByZXNzaW9uLlxuXG4gIGZ1bmN0aW9uIHJlYWRSZWdleHAoKSB7XG4gICAgdmFyIGNvbnRlbnQgPSBcIlwiLCBlc2NhcGVkLCBpbkNsYXNzLCBzdGFydCA9IHRva1BvcztcbiAgICBmb3IgKDs7KSB7XG4gICAgICBpZiAodG9rUG9zID49IGlucHV0TGVuKSByYWlzZShzdGFydCwgXCJVbnRlcm1pbmF0ZWQgcmVndWxhciBleHByZXNzaW9uXCIpO1xuICAgICAgdmFyIGNoID0gaW5wdXQuY2hhckF0KHRva1Bvcyk7XG4gICAgICBpZiAobmV3bGluZS50ZXN0KGNoKSkgcmFpc2Uoc3RhcnQsIFwiVW50ZXJtaW5hdGVkIHJlZ3VsYXIgZXhwcmVzc2lvblwiKTtcbiAgICAgIGlmICghZXNjYXBlZCkge1xuICAgICAgICBpZiAoY2ggPT09IFwiW1wiKSBpbkNsYXNzID0gdHJ1ZTtcbiAgICAgICAgZWxzZSBpZiAoY2ggPT09IFwiXVwiICYmIGluQ2xhc3MpIGluQ2xhc3MgPSBmYWxzZTtcbiAgICAgICAgZWxzZSBpZiAoY2ggPT09IFwiL1wiICYmICFpbkNsYXNzKSBicmVhaztcbiAgICAgICAgZXNjYXBlZCA9IGNoID09PSBcIlxcXFxcIjtcbiAgICAgIH0gZWxzZSBlc2NhcGVkID0gZmFsc2U7XG4gICAgICArK3Rva1BvcztcbiAgICB9XG4gICAgdmFyIGNvbnRlbnQgPSBpbnB1dC5zbGljZShzdGFydCwgdG9rUG9zKTtcbiAgICArK3Rva1BvcztcbiAgICAvLyBOZWVkIHRvIHVzZSBgcmVhZFdvcmQxYCBiZWNhdXNlICdcXHVYWFhYJyBzZXF1ZW5jZXMgYXJlIGFsbG93ZWRcbiAgICAvLyBoZXJlIChkb24ndCBhc2spLlxuICAgIHZhciBtb2RzID0gcmVhZFdvcmQxKCk7XG4gICAgaWYgKG1vZHMgJiYgIS9eW2dtc2l5XSokLy50ZXN0KG1vZHMpKSByYWlzZShzdGFydCwgXCJJbnZhbGlkIHJlZ3VsYXIgZXhwcmVzc2lvbiBmbGFnXCIpO1xuICAgIHRyeSB7XG4gICAgICB2YXIgdmFsdWUgPSBuZXcgUmVnRXhwKGNvbnRlbnQsIG1vZHMpO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGlmIChlIGluc3RhbmNlb2YgU3ludGF4RXJyb3IpIHJhaXNlKHN0YXJ0LCBcIkVycm9yIHBhcnNpbmcgcmVndWxhciBleHByZXNzaW9uOiBcIiArIGUubWVzc2FnZSk7XG4gICAgICByYWlzZShlKTtcbiAgICB9XG4gICAgcmV0dXJuIGZpbmlzaFRva2VuKF9yZWdleHAsIHZhbHVlKTtcbiAgfVxuXG4gIC8vIFJlYWQgYW4gaW50ZWdlciBpbiB0aGUgZ2l2ZW4gcmFkaXguIFJldHVybiBudWxsIGlmIHplcm8gZGlnaXRzXG4gIC8vIHdlcmUgcmVhZCwgdGhlIGludGVnZXIgdmFsdWUgb3RoZXJ3aXNlLiBXaGVuIGBsZW5gIGlzIGdpdmVuLCB0aGlzXG4gIC8vIHdpbGwgcmV0dXJuIGBudWxsYCB1bmxlc3MgdGhlIGludGVnZXIgaGFzIGV4YWN0bHkgYGxlbmAgZGlnaXRzLlxuXG4gIGZ1bmN0aW9uIHJlYWRJbnQocmFkaXgsIGxlbikge1xuICAgIHZhciBzdGFydCA9IHRva1BvcywgdG90YWwgPSAwO1xuICAgIGZvciAodmFyIGkgPSAwLCBlID0gbGVuID09IG51bGwgPyBJbmZpbml0eSA6IGxlbjsgaSA8IGU7ICsraSkge1xuICAgICAgdmFyIGNvZGUgPSBpbnB1dC5jaGFyQ29kZUF0KHRva1BvcyksIHZhbDtcbiAgICAgIGlmIChjb2RlID49IDk3KSB2YWwgPSBjb2RlIC0gOTcgKyAxMDsgLy8gYVxuICAgICAgZWxzZSBpZiAoY29kZSA+PSA2NSkgdmFsID0gY29kZSAtIDY1ICsgMTA7IC8vIEFcbiAgICAgIGVsc2UgaWYgKGNvZGUgPj0gNDggJiYgY29kZSA8PSA1NykgdmFsID0gY29kZSAtIDQ4OyAvLyAwLTlcbiAgICAgIGVsc2UgdmFsID0gSW5maW5pdHk7XG4gICAgICBpZiAodmFsID49IHJhZGl4KSBicmVhaztcbiAgICAgICsrdG9rUG9zO1xuICAgICAgdG90YWwgPSB0b3RhbCAqIHJhZGl4ICsgdmFsO1xuICAgIH1cbiAgICBpZiAodG9rUG9zID09PSBzdGFydCB8fCBsZW4gIT0gbnVsbCAmJiB0b2tQb3MgLSBzdGFydCAhPT0gbGVuKSByZXR1cm4gbnVsbDtcblxuICAgIHJldHVybiB0b3RhbDtcbiAgfVxuXG4gIGZ1bmN0aW9uIHJlYWRIZXhOdW1iZXIoKSB7XG4gICAgdG9rUG9zICs9IDI7IC8vIDB4XG4gICAgdmFyIHZhbCA9IHJlYWRJbnQoMTYpO1xuICAgIGlmICh2YWwgPT0gbnVsbCkgcmFpc2UodG9rU3RhcnQgKyAyLCBcIkV4cGVjdGVkIGhleGFkZWNpbWFsIG51bWJlclwiKTtcbiAgICBpZiAoaXNJZGVudGlmaWVyU3RhcnQoaW5wdXQuY2hhckNvZGVBdCh0b2tQb3MpKSkgcmFpc2UodG9rUG9zLCBcIklkZW50aWZpZXIgZGlyZWN0bHkgYWZ0ZXIgbnVtYmVyXCIpO1xuICAgIHJldHVybiBmaW5pc2hUb2tlbihfbnVtLCB2YWwpO1xuICB9XG5cbiAgLy8gUmVhZCBhbiBpbnRlZ2VyLCBvY3RhbCBpbnRlZ2VyLCBvciBmbG9hdGluZy1wb2ludCBudW1iZXIuXG5cbiAgZnVuY3Rpb24gcmVhZE51bWJlcihzdGFydHNXaXRoRG90KSB7XG4gICAgdmFyIHN0YXJ0ID0gdG9rUG9zLCBpc0Zsb2F0ID0gZmFsc2UsIG9jdGFsID0gaW5wdXQuY2hhckNvZGVBdCh0b2tQb3MpID09PSA0ODtcbiAgICBpZiAoIXN0YXJ0c1dpdGhEb3QgJiYgcmVhZEludCgxMCkgPT09IG51bGwpIHJhaXNlKHN0YXJ0LCBcIkludmFsaWQgbnVtYmVyXCIpO1xuICAgIGlmIChpbnB1dC5jaGFyQ29kZUF0KHRva1BvcykgPT09IDQ2KSB7XG4gICAgICArK3Rva1BvcztcbiAgICAgIHJlYWRJbnQoMTApO1xuICAgICAgaXNGbG9hdCA9IHRydWU7XG4gICAgfVxuICAgIHZhciBuZXh0ID0gaW5wdXQuY2hhckNvZGVBdCh0b2tQb3MpO1xuICAgIGlmIChuZXh0ID09PSA2OSB8fCBuZXh0ID09PSAxMDEpIHsgLy8gJ2VFJ1xuICAgICAgbmV4dCA9IGlucHV0LmNoYXJDb2RlQXQoKyt0b2tQb3MpO1xuICAgICAgaWYgKG5leHQgPT09IDQzIHx8IG5leHQgPT09IDQ1KSArK3Rva1BvczsgLy8gJystJ1xuICAgICAgaWYgKHJlYWRJbnQoMTApID09PSBudWxsKSByYWlzZShzdGFydCwgXCJJbnZhbGlkIG51bWJlclwiKTtcbiAgICAgIGlzRmxvYXQgPSB0cnVlO1xuICAgIH1cbiAgICBpZiAoaXNJZGVudGlmaWVyU3RhcnQoaW5wdXQuY2hhckNvZGVBdCh0b2tQb3MpKSkgcmFpc2UodG9rUG9zLCBcIklkZW50aWZpZXIgZGlyZWN0bHkgYWZ0ZXIgbnVtYmVyXCIpO1xuXG4gICAgdmFyIHN0ciA9IGlucHV0LnNsaWNlKHN0YXJ0LCB0b2tQb3MpLCB2YWw7XG4gICAgaWYgKGlzRmxvYXQpIHZhbCA9IHBhcnNlRmxvYXQoc3RyKTtcbiAgICBlbHNlIGlmICghb2N0YWwgfHwgc3RyLmxlbmd0aCA9PT0gMSkgdmFsID0gcGFyc2VJbnQoc3RyLCAxMCk7XG4gICAgZWxzZSBpZiAoL1s4OV0vLnRlc3Qoc3RyKSB8fCBzdHJpY3QpIHJhaXNlKHN0YXJ0LCBcIkludmFsaWQgbnVtYmVyXCIpO1xuICAgIGVsc2UgdmFsID0gcGFyc2VJbnQoc3RyLCA4KTtcbiAgICByZXR1cm4gZmluaXNoVG9rZW4oX251bSwgdmFsKTtcbiAgfVxuXG4gIC8vIFJlYWQgYSBzdHJpbmcgdmFsdWUsIGludGVycHJldGluZyBiYWNrc2xhc2gtZXNjYXBlcy5cblxuICBmdW5jdGlvbiByZWFkU3RyaW5nKHF1b3RlKSB7XG4gICAgdG9rUG9zKys7XG4gICAgdmFyIG91dCA9IFwiXCI7XG4gICAgZm9yICg7Oykge1xuICAgICAgaWYgKHRva1BvcyA+PSBpbnB1dExlbikgcmFpc2UodG9rU3RhcnQsIFwiVW50ZXJtaW5hdGVkIHN0cmluZyBjb25zdGFudFwiKTtcbiAgICAgIHZhciBjaCA9IGlucHV0LmNoYXJDb2RlQXQodG9rUG9zKTtcbiAgICAgIGlmIChjaCA9PT0gcXVvdGUpIHtcbiAgICAgICAgKyt0b2tQb3M7XG4gICAgICAgIHJldHVybiBmaW5pc2hUb2tlbihfc3RyaW5nLCBvdXQpO1xuICAgICAgfVxuICAgICAgaWYgKGNoID09PSA5MikgeyAvLyAnXFwnXG4gICAgICAgIGNoID0gaW5wdXQuY2hhckNvZGVBdCgrK3Rva1Bvcyk7XG4gICAgICAgIHZhciBvY3RhbCA9IC9eWzAtN10rLy5leGVjKGlucHV0LnNsaWNlKHRva1BvcywgdG9rUG9zICsgMykpO1xuICAgICAgICBpZiAob2N0YWwpIG9jdGFsID0gb2N0YWxbMF07XG4gICAgICAgIHdoaWxlIChvY3RhbCAmJiBwYXJzZUludChvY3RhbCwgOCkgPiAyNTUpIG9jdGFsID0gb2N0YWwuc2xpY2UoMCwgLTEpO1xuICAgICAgICBpZiAob2N0YWwgPT09IFwiMFwiKSBvY3RhbCA9IG51bGw7XG4gICAgICAgICsrdG9rUG9zO1xuICAgICAgICBpZiAob2N0YWwpIHtcbiAgICAgICAgICBpZiAoc3RyaWN0KSByYWlzZSh0b2tQb3MgLSAyLCBcIk9jdGFsIGxpdGVyYWwgaW4gc3RyaWN0IG1vZGVcIik7XG4gICAgICAgICAgb3V0ICs9IFN0cmluZy5mcm9tQ2hhckNvZGUocGFyc2VJbnQob2N0YWwsIDgpKTtcbiAgICAgICAgICB0b2tQb3MgKz0gb2N0YWwubGVuZ3RoIC0gMTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBzd2l0Y2ggKGNoKSB7XG4gICAgICAgICAgY2FzZSAxMTA6IG91dCArPSBcIlxcblwiOyBicmVhazsgLy8gJ24nIC0+ICdcXG4nXG4gICAgICAgICAgY2FzZSAxMTQ6IG91dCArPSBcIlxcclwiOyBicmVhazsgLy8gJ3InIC0+ICdcXHInXG4gICAgICAgICAgY2FzZSAxMjA6IG91dCArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKHJlYWRIZXhDaGFyKDIpKTsgYnJlYWs7IC8vICd4J1xuICAgICAgICAgIGNhc2UgMTE3OiBvdXQgKz0gU3RyaW5nLmZyb21DaGFyQ29kZShyZWFkSGV4Q2hhcig0KSk7IGJyZWFrOyAvLyAndSdcbiAgICAgICAgICBjYXNlIDg1OiBvdXQgKz0gU3RyaW5nLmZyb21DaGFyQ29kZShyZWFkSGV4Q2hhcig4KSk7IGJyZWFrOyAvLyAnVSdcbiAgICAgICAgICBjYXNlIDExNjogb3V0ICs9IFwiXFx0XCI7IGJyZWFrOyAvLyAndCcgLT4gJ1xcdCdcbiAgICAgICAgICBjYXNlIDk4OiBvdXQgKz0gXCJcXGJcIjsgYnJlYWs7IC8vICdiJyAtPiAnXFxiJ1xuICAgICAgICAgIGNhc2UgMTE4OiBvdXQgKz0gXCJcXHUwMDBiXCI7IGJyZWFrOyAvLyAndicgLT4gJ1xcdTAwMGInXG4gICAgICAgICAgY2FzZSAxMDI6IG91dCArPSBcIlxcZlwiOyBicmVhazsgLy8gJ2YnIC0+ICdcXGYnXG4gICAgICAgICAgY2FzZSA0ODogb3V0ICs9IFwiXFwwXCI7IGJyZWFrOyAvLyAwIC0+ICdcXDAnXG4gICAgICAgICAgY2FzZSAxMzogaWYgKGlucHV0LmNoYXJDb2RlQXQodG9rUG9zKSA9PT0gMTApICsrdG9rUG9zOyAvLyAnXFxyXFxuJ1xuICAgICAgICAgIC8qIGZhbGxzIHRocm91Z2ggKi9cbiAgICAgICAgICBjYXNlIDEwOiAvLyAnIFxcbidcbiAgICAgICAgICAgIGlmIChvcHRpb25zLmxvY2F0aW9ucykgeyB0b2tMaW5lU3RhcnQgPSB0b2tQb3M7ICsrdG9rQ3VyTGluZTsgfVxuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgZGVmYXVsdDogb3V0ICs9IFN0cmluZy5mcm9tQ2hhckNvZGUoY2gpOyBicmVhaztcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlmIChjaCA9PT0gMTMgfHwgY2ggPT09IDEwIHx8IGNoID09PSA4MjMyIHx8IGNoID09PSA4MjMzKSByYWlzZSh0b2tTdGFydCwgXCJVbnRlcm1pbmF0ZWQgc3RyaW5nIGNvbnN0YW50XCIpO1xuICAgICAgICBvdXQgKz0gU3RyaW5nLmZyb21DaGFyQ29kZShjaCk7IC8vICdcXCdcbiAgICAgICAgKyt0b2tQb3M7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLy8gVXNlZCB0byByZWFkIGNoYXJhY3RlciBlc2NhcGUgc2VxdWVuY2VzICgnXFx4JywgJ1xcdScsICdcXFUnKS5cblxuICBmdW5jdGlvbiByZWFkSGV4Q2hhcihsZW4pIHtcbiAgICB2YXIgbiA9IHJlYWRJbnQoMTYsIGxlbik7XG4gICAgaWYgKG4gPT09IG51bGwpIHJhaXNlKHRva1N0YXJ0LCBcIkJhZCBjaGFyYWN0ZXIgZXNjYXBlIHNlcXVlbmNlXCIpO1xuICAgIHJldHVybiBuO1xuICB9XG5cbiAgLy8gVXNlZCB0byBzaWduYWwgdG8gY2FsbGVycyBvZiBgcmVhZFdvcmQxYCB3aGV0aGVyIHRoZSB3b3JkXG4gIC8vIGNvbnRhaW5lZCBhbnkgZXNjYXBlIHNlcXVlbmNlcy4gVGhpcyBpcyBuZWVkZWQgYmVjYXVzZSB3b3JkcyB3aXRoXG4gIC8vIGVzY2FwZSBzZXF1ZW5jZXMgbXVzdCBub3QgYmUgaW50ZXJwcmV0ZWQgYXMga2V5d29yZHMuXG5cbiAgdmFyIGNvbnRhaW5zRXNjO1xuXG4gIC8vIFJlYWQgYW4gaWRlbnRpZmllciwgYW5kIHJldHVybiBpdCBhcyBhIHN0cmluZy4gU2V0cyBgY29udGFpbnNFc2NgXG4gIC8vIHRvIHdoZXRoZXIgdGhlIHdvcmQgY29udGFpbmVkIGEgJ1xcdScgZXNjYXBlLlxuICAvL1xuICAvLyBPbmx5IGJ1aWxkcyB1cCB0aGUgd29yZCBjaGFyYWN0ZXItYnktY2hhcmFjdGVyIHdoZW4gaXQgYWN0dWFsbHlcbiAgLy8gY29udGFpbmVkcyBhbiBlc2NhcGUsIGFzIGEgbWljcm8tb3B0aW1pemF0aW9uLlxuXG4gIGZ1bmN0aW9uIHJlYWRXb3JkMSgpIHtcbiAgICBjb250YWluc0VzYyA9IGZhbHNlO1xuICAgIHZhciB3b3JkLCBmaXJzdCA9IHRydWUsIHN0YXJ0ID0gdG9rUG9zO1xuICAgIGZvciAoOzspIHtcbiAgICAgIHZhciBjaCA9IGlucHV0LmNoYXJDb2RlQXQodG9rUG9zKTtcbiAgICAgIGlmIChpc0lkZW50aWZpZXJDaGFyKGNoKSkge1xuICAgICAgICBpZiAoY29udGFpbnNFc2MpIHdvcmQgKz0gaW5wdXQuY2hhckF0KHRva1Bvcyk7XG4gICAgICAgICsrdG9rUG9zO1xuICAgICAgfSBlbHNlIGlmIChjaCA9PT0gOTIpIHsgLy8gXCJcXFwiXG4gICAgICAgIGlmICghY29udGFpbnNFc2MpIHdvcmQgPSBpbnB1dC5zbGljZShzdGFydCwgdG9rUG9zKTtcbiAgICAgICAgY29udGFpbnNFc2MgPSB0cnVlO1xuICAgICAgICBpZiAoaW5wdXQuY2hhckNvZGVBdCgrK3Rva1BvcykgIT0gMTE3KSAvLyBcInVcIlxuICAgICAgICAgIHJhaXNlKHRva1BvcywgXCJFeHBlY3RpbmcgVW5pY29kZSBlc2NhcGUgc2VxdWVuY2UgXFxcXHVYWFhYXCIpO1xuICAgICAgICArK3Rva1BvcztcbiAgICAgICAgdmFyIGVzYyA9IHJlYWRIZXhDaGFyKDQpO1xuICAgICAgICB2YXIgZXNjU3RyID0gU3RyaW5nLmZyb21DaGFyQ29kZShlc2MpO1xuICAgICAgICBpZiAoIWVzY1N0cikgcmFpc2UodG9rUG9zIC0gMSwgXCJJbnZhbGlkIFVuaWNvZGUgZXNjYXBlXCIpO1xuICAgICAgICBpZiAoIShmaXJzdCA/IGlzSWRlbnRpZmllclN0YXJ0KGVzYykgOiBpc0lkZW50aWZpZXJDaGFyKGVzYykpKVxuICAgICAgICAgIHJhaXNlKHRva1BvcyAtIDQsIFwiSW52YWxpZCBVbmljb2RlIGVzY2FwZVwiKTtcbiAgICAgICAgd29yZCArPSBlc2NTdHI7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICAgIGZpcnN0ID0gZmFsc2U7XG4gICAgfVxuICAgIHJldHVybiBjb250YWluc0VzYyA/IHdvcmQgOiBpbnB1dC5zbGljZShzdGFydCwgdG9rUG9zKTtcbiAgfVxuXG4gIC8vIFJlYWQgYW4gaWRlbnRpZmllciBvciBrZXl3b3JkIHRva2VuLiBXaWxsIGNoZWNrIGZvciByZXNlcnZlZFxuICAvLyB3b3JkcyB3aGVuIG5lY2Vzc2FyeS5cblxuICBmdW5jdGlvbiByZWFkV29yZCgpIHtcbiAgICB2YXIgd29yZCA9IHJlYWRXb3JkMSgpO1xuICAgIHZhciB0eXBlID0gX25hbWU7XG4gICAgaWYgKCFjb250YWluc0VzYyAmJiBpc0tleXdvcmQod29yZCkpXG4gICAgICB0eXBlID0ga2V5d29yZFR5cGVzW3dvcmRdO1xuICAgIHJldHVybiBmaW5pc2hUb2tlbih0eXBlLCB3b3JkKTtcbiAgfVxuXG5cbmV4cG9ydCBkZWZhdWx0IHsgdG9rZW5pemU6IGV4cG9ydHMudG9rZW5pemUgfTsiLCJpbXBvcnQgY29tcGlsZSBmcm9tIFwicmVib3VuZC1jb21waWxlci9jb21waWxlclwiO1xuXG5leHBvcnQgeyBjb21waWxlIH07IiwiaW1wb3J0IHByb3BlcnR5Q29tcGlsZXIgZnJvbSBcInByb3BlcnR5LWNvbXBpbGVyL3Byb3BlcnR5LWNvbXBpbGVyXCI7XG5pbXBvcnQgJCBmcm9tIFwicmVib3VuZC1ydW50aW1lL3V0aWxzXCI7XG5cbi8vIElmIFJlYm91bmQgUnVudGltZSBoYXMgYWxyZWFkeSBiZWVuIHJ1biwgdGhyb3cgZXJyb3JcbmlmKFJlYm91bmQuQ29tcHV0ZWRQcm9wZXJ0eSl7IHRocm93ICdSZWJvdW5kIENvbXB1dGVkUHJvcGVydHkgaXMgYWxyZWFkeSBsb2FkZWQgb24gdGhlIHBhZ2UhJzsgfVxuLy8gSWYgQmFja2JvbmUgaGFzbid0IGJlZW4gc3RhcnRlZCB5ZXQsIHRocm93IGVycm9yXG5pZighd2luZG93LkJhY2tib25lKXsgdGhyb3cgXCJCYWNrYm9uZSBtdXN0IGJlIG9uIHRoZSBwYWdlIGZvciBSZWJvdW5kIHRvIGxvYWQuXCI7IH1cblxuLy8gUmV0dXJucyB0cnVlIGlmIHN0ciBzdGFydHMgd2l0aCB0ZXN0XG5mdW5jdGlvbiBzdGFydHNXaXRoKHN0ciwgdGVzdCl7XG4gIGlmKHN0ciA9PT0gdGVzdCkgcmV0dXJuIHRydWU7XG4gIHJldHVybiBzdHIuc3Vic3RyaW5nKDAsIHRlc3QubGVuZ3RoKzEpID09PSB0ZXN0KycuJztcbn1cblxudmFyIENvbXB1dGVkUHJvcGVydHkgPSBmdW5jdGlvbihwcm9wLCBvcHRpb25zKXtcblxuICBpZighXy5pc0Z1bmN0aW9uKHByb3ApKSByZXR1cm4gY29uc29sZS5lcnJvcignQ29tcHV0ZWRQcm9wZXJ0eSBjb25zdHJ1Y3RvciBtdXN0IGJlIHBhc3NlZCBhIGZ1bmN0aW9uIScsIHByb3AsICdGb3VuZCBpbnN0ZWFkLicpO1xuICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgdGhpcy5jaWQgPSBfLnVuaXF1ZUlkKCdjb21wdXRlZFByb3BldHknKTtcbiAgdGhpcy5uYW1lID0gb3B0aW9ucy5uYW1lO1xuICB0aGlzLnJldHVyblR5cGUgPSBudWxsO1xuICB0aGlzLl9fb2JzZXJ2ZXJzID0ge307XG4gIHRoaXMuaGVscGVycyA9IHt9O1xuICB0aGlzLndhaXRpbmcgPSB7fTtcbiAgdGhpcy5pc0NoYW5naW5nID0gZmFsc2U7XG4gIHRoaXMuaXNEaXJ0eSA9IHRydWU7XG4gIHRoaXMuZnVuYyA9IHByb3A7XG4gIF8uYmluZEFsbCh0aGlzLCAnb25Nb2RpZnknKTtcbiAgdGhpcy5kZXBzID0gcHJvcGVydHlDb21waWxlci5jb21waWxlKHByb3AsIHRoaXMubmFtZSk7XG5cbiAgLy8gQ3JlYXRlIGxpbmVhZ2UgdG8gcGFzcyB0byBvdXIgY2FjaGUgb2JqZWN0c1xuICB2YXIgbGluZWFnZSA9IHtcbiAgICBwYXJlbnQ6IHRoaXMuc2V0UGFyZW50KCBvcHRpb25zLnBhcmVudCB8fCB0aGlzICksXG4gICAgcm9vdDogdGhpcy5zZXRSb290KCBvcHRpb25zLnJvb3QgfHwgb3B0aW9ucy5wYXJlbnQgfHwgdGhpcyApLFxuICAgIHBhdGg6IHRoaXMuX19wYXRoID0gb3B0aW9ucy5wYXRoIHx8IHRoaXMuX19wYXRoXG4gIH07XG5cbiAgLy8gUmVzdWx0cyBDYWNoZSBPYmplY3RzXG4gIC8vIFRoZXNlIG1vZGVscyB3aWxsIG5ldmVyIGJlIHJlLWNyZWF0ZWQgZm9yIHRoZSBsaWZldGltZSBvZiB0aGUgQ29tcHV0ZWQgUHJvZXBydHlcbiAgLy8gT24gUmVjb21wdXRlIHRoZXkgYXJlIHVwZGF0ZWQgd2l0aCBuZXcgdmFsdWVzLlxuICAvLyBPbiBDaGFuZ2UgdGhlaXIgbmV3IHZhbHVlcyBhcmUgcHVzaGVkIHRvIHRoZSBvYmplY3QgaXQgaXMgdHJhY2tpbmdcbiAgdGhpcy5jYWNoZSA9IHtcbiAgICBtb2RlbDogbmV3IFJlYm91bmQuTW9kZWwoe30sIGxpbmVhZ2UpLFxuICAgIGNvbGxlY3Rpb246IG5ldyBSZWJvdW5kLkNvbGxlY3Rpb24oW10sIGxpbmVhZ2UpLFxuICAgIHZhbHVlOiB1bmRlZmluZWRcbiAgfTtcblxuICB0aGlzLndpcmUoKTtcblxufTtcblxuXy5leHRlbmQoQ29tcHV0ZWRQcm9wZXJ0eS5wcm90b3R5cGUsIEJhY2tib25lLkV2ZW50cywge1xuXG4gIGlzQ29tcHV0ZWRQcm9wZXJ0eTogdHJ1ZSxcbiAgaXNEYXRhOiB0cnVlLFxuICBfX3BhdGg6IGZ1bmN0aW9uKCl7IHJldHVybiAnJzsgfSxcblxuICAvLyBBdHRhY2hlZCB0byBsaXN0ZW4gdG8gYWxsIGV2ZW50cyB3aGVyZSB0aGlzIENvbXB1dGVkIFByb3BlcnR5J3MgZGVwZW5kYW5jaWVzXG4gIC8vIGFyZSBzdG9yZWQuIFNlZSB3aXJlKCkuIFdpbGwgcmUtZXZhbHVhdGUgYW55IGNvbXB1dGVkIHByb3BlcnRpZXMgdGhhdFxuICAvLyBkZXBlbmQgb24gdGhlIGNoYW5nZWQgZGF0YSB2YWx1ZSB3aGljaCB0cmlnZ2VyZWQgdGhpcyBjYWxsYmFjay5cbiAgb25SZWNvbXB1dGU6IGZ1bmN0aW9uKHR5cGUsIG1vZGVsLCBjb2xsZWN0aW9uLCBvcHRpb25zKXtcbiAgICB2YXIgc2hvcnRjaXJjdWl0ID0geyBjaGFuZ2U6IDEsIHNvcnQ6IDEsIHJlcXVlc3Q6IDEsIGRlc3Ryb3k6IDEsIHN5bmM6IDEsIGVycm9yOiAxLCBpbnZhbGlkOiAxLCByb3V0ZTogMSB9O1xuICAgIGlmKCBzaG9ydGNpcmN1aXRbdHlwZV0gfHwgIW1vZGVsLmlzRGF0YSApIHJldHVybjtcbiAgICBtb2RlbCB8fCAobW9kZWwgPSB7fSk7XG4gICAgY29sbGVjdGlvbiB8fCAoY29sbGVjdGlvbiA9IHt9KTtcbiAgICBvcHRpb25zIHx8IChvcHRpb25zID0ge30pO1xuICAgICFjb2xsZWN0aW9uLmlzRGF0YSAmJiAob3B0aW9ucyA9IGNvbGxlY3Rpb24pICYmIChjb2xsZWN0aW9uID0gbW9kZWwpO1xuICAgIHZhciBwdXNoID0gQXJyYXkucHJvdG90eXBlLnB1c2gsIHRvUmVjb21wdXRlID0gW10sIHBhdGgsIHZlY3RvcjtcbiAgICB2ZWN0b3IgPSBwYXRoID0gY29sbGVjdGlvbi5fX3BhdGgoKS5yZXBsYWNlKC9cXC4/XFxbLipcXF0vaWcsICcuQGVhY2gnKTtcblxuICAgIC8vIE5vdGlmaWVzIGFsbCBjb21wdXRlZCBwcm9wZXJ0aWVzIGluIHRoZSBkZXBlbmRhbnRzIGFycmF5IHRvIHJlY29tcHV0ZS5cbiAgICAvLyBNYXJrcyBldmVyeW9uZSBhcyBkaXJ0eSBhbmQgdGhlbiBjYWxscyB0aGVtLlxuICAgIGZ1bmN0aW9uIG5vdGlmeShkZXBlbmRhbnRzKXtcbiAgICAgIF8uZWFjaChkZXBlbmRhbnRzLCBmdW5jdGlvbihwcm9wKXsgcHJvcC5pc0RpcnR5ID0gMTsgfSk7XG4gICAgICBfLmludm9rZShkZXBlbmRhbnRzLCAnY2FsbCcpO1xuICAgIH1cblxuICAgIC8vIElmIGEgcmVzZXQgZXZlbnQgb24gYSBNb2RlbCwgY2hlY2sgZm9yIGNvbXB1dGVkIHByb3BlcnRpZXMgdGhhdCBkZXBlbmRcbiAgICAvLyBvbiBlYWNoIGNoYW5nZWQgYXR0cmlidXRlJ3MgZnVsbCBwYXRoLlxuICAgIGlmKHR5cGUgPT09ICdyZXNldCcgJiYgb3B0aW9ucy5wcmV2aW91c0F0dHJpYnV0ZXMpe1xuICAgICAgXy5lYWNoKG9wdGlvbnMucHJldmlvdXNBdHRyaWJ1dGVzLCBmdW5jdGlvbih2YWx1ZSwga2V5KXtcbiAgICAgICAgdmVjdG9yID0gcGF0aCArIChwYXRoICYmICcuJykgKyBrZXk7XG4gICAgICAgIF8uZWFjaCh0aGlzLl9fY29tcHV0ZWREZXBzLCBmdW5jdGlvbihkZXBlbmRhbnRzLCBkZXBlbmRhbmN5KXtcbiAgICAgICAgICBzdGFydHNXaXRoKHZlY3RvciwgZGVwZW5kYW5jeSkgJiYgcHVzaC5hcHBseSh0b1JlY29tcHV0ZSwgZGVwZW5kYW50cyk7XG4gICAgICAgIH0sIHRoaXMpO1xuICAgICAgfSwgdGhpcyk7XG4gICAgfVxuXG4gICAgLy8gSWYgYSByZXNldCBldmVudCBvbiBhIENvbGxjdGlvbiwgY2hlY2sgZm9yIGNvbXB1dGVkIHByb3BlcnRpZXMgdGhhdCBkZXBlbmRcbiAgICAvLyBvbiBhbnl0aGluZyBpbnNpZGUgdGhhdCBjb2xsZWN0aW9uLlxuICAgIGVsc2UgaWYodHlwZSA9PT0gJ3Jlc2V0JyAmJiBvcHRpb25zLnByZXZpb3VzTW9kZWxzKXtcbiAgICAgIF8uZWFjaCh0aGlzLl9fY29tcHV0ZWREZXBzLCBmdW5jdGlvbihkZXBlbmRhbnRzLCBkZXBlbmRhbmN5KXtcbiAgICAgICAgc3RhcnRzV2l0aChkZXBlbmRhbmN5LCB2ZWN0b3IpICYmIHB1c2guYXBwbHkodG9SZWNvbXB1dGUsIGRlcGVuZGFudHMpO1xuICAgICAgfSwgdGhpcyk7XG4gICAgfVxuXG4gICAgLy8gSWYgYW4gYWRkIG9yIHJlbW92ZSBldmVudCwgY2hlY2sgZm9yIGNvbXB1dGVkIHByb3BlcnRpZXMgdGhhdCBkZXBlbmQgb25cbiAgICAvLyBhbnl0aGluZyBpbnNpZGUgdGhhdCBjb2xsZWN0aW9uIG9yIHRoYXQgY29udGFpbnMgdGhhdCBjb2xsZWN0aW9uLlxuICAgIGVsc2UgaWYodHlwZSA9PT0gJ2FkZCcgfHwgdHlwZSA9PT0gJ3JlbW92ZScpe1xuICAgICAgXy5lYWNoKHRoaXMuX19jb21wdXRlZERlcHMsIGZ1bmN0aW9uKGRlcGVuZGFudHMsIGRlcGVuZGFuY3kpe1xuICAgICAgICBpZiggc3RhcnRzV2l0aChkZXBlbmRhbmN5LCB2ZWN0b3IpIHx8IHN0YXJ0c1dpdGgodmVjdG9yLCBkZXBlbmRhbmN5KSApIHB1c2guYXBwbHkodG9SZWNvbXB1dGUsIGRlcGVuZGFudHMpO1xuICAgICAgfSwgdGhpcyk7XG4gICAgfVxuXG4gICAgLy8gSWYgYSBjaGFuZ2UgZXZlbnQsIHRyaWdnZXIgYW55dGhpbmcgdGhhdCBkZXBlbmRzIG9uIHRoYXQgY2hhbmdlZCBwYXRoLlxuICAgIGVsc2UgaWYodHlwZS5pbmRleE9mKCdjaGFuZ2U6JykgPT09IDApe1xuICAgICAgdmVjdG9yID0gdHlwZS5yZXBsYWNlKCdjaGFuZ2U6JywgJycpLnJlcGxhY2UoL1xcLj9cXFsuKlxcXS9pZywgJy5AZWFjaCcpO1xuICAgICAgXy5lYWNoKHRoaXMuX19jb21wdXRlZERlcHMsIGZ1bmN0aW9uKGRlcGVuZGFudHMsIGRlcGVuZGFuY3kpe1xuICAgICAgICBzdGFydHNXaXRoKHZlY3RvciwgZGVwZW5kYW5jeSkgJiYgcHVzaC5hcHBseSh0b1JlY29tcHV0ZSwgZGVwZW5kYW50cyk7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICByZXR1cm4gbm90aWZ5KHRvUmVjb21wdXRlKTtcbiAgfSxcblxuICAvLyBDYWxsZWQgd2hlbiBhIENvbXB1dGVkIFByb3BlcnR5J3MgYWN0aXZlIGNhY2hlIG9iamVjdCBjaGFuZ2VzLlxuICAvLyBQdXNoZXMgYW55IGNoYW5nZXMgdG8gQ29tcHV0ZWQgUHJvcGVydHkgdGhhdCByZXR1cm5zIGEgZGF0YSBvYmplY3QgYmFjayB0b1xuICAvLyB0aGUgb3JpZ2luYWwgb2JqZWN0LlxuICBvbk1vZGlmeTogZnVuY3Rpb24odHlwZSwgbW9kZWwsIGNvbGxlY3Rpb24sIG9wdGlvbnMpe1xuICAgIHZhciBzaG9ydGNpcmN1aXQgPSB7IHNvcnQ6IDEsIHJlcXVlc3Q6IDEsIGRlc3Ryb3k6IDEsIHN5bmM6IDEsIGVycm9yOiAxLCBpbnZhbGlkOiAxLCByb3V0ZTogMSB9O1xuICAgIGlmKCBzaG9ydGNpcmN1aXRbdHlwZV0gfHwgfnR5cGUuaW5kZXhPZignY2hhbmdlOicpIHx8IHRoaXMuaXNEaXJ0eSApIHJldHVybjtcbiAgICBtb2RlbCB8fCAobW9kZWwgPSB7fSk7XG4gICAgY29sbGVjdGlvbiB8fCAoY29sbGVjdGlvbiA9IHt9KTtcbiAgICBvcHRpb25zIHx8IChvcHRpb25zID0ge30pO1xuICAgICFjb2xsZWN0aW9uLmlzRGF0YSAmJiBfLmlzT2JqZWN0KGNvbGxlY3Rpb24pICYmIChvcHRpb25zID0gY29sbGVjdGlvbikgJiYgKGNvbGxlY3Rpb24gPSBtb2RlbCk7XG4gICAgdmFyIHNyYyA9IHRoaXM7XG4gICAgdmFyIHBhdGggPSBjb2xsZWN0aW9uLl9fcGF0aCgpLnJlcGxhY2Uoc3JjLl9fcGF0aCgpLCAnJykucmVwbGFjZSgvXlxcLi8sICcnKTtcbiAgICB2YXIgZGVzdCA9IHRoaXMudHJhY2tpbmcuZ2V0KHBhdGgpO1xuICAgIGlmKF8uaXNVbmRlZmluZWQoZGVzdCkpIHJldHVybjtcblxuICAgIGlmKHR5cGUgPT09ICdjaGFuZ2UnKSBkZXN0LnNldCAmJiBkZXN0LnNldChtb2RlbC5jaGFuZ2VkQXR0cmlidXRlcygpKTtcbiAgICBlbHNlIGlmKHR5cGUgPT09ICdyZXNldCcpIGRlc3QucmVzZXQgJiYgZGVzdC5yZXNldChtb2RlbCk7XG4gICAgZWxzZSBpZih0eXBlID09PSAnYWRkJykgIGRlc3QuYWRkICYmIGRlc3QuYWRkKG1vZGVsKTtcbiAgICBlbHNlIGlmKHR5cGUgPT09ICdyZW1vdmUnKSAgZGVzdC5yZW1vdmUgJiYgZGVzdC5yZW1vdmUobW9kZWwpO1xuICAgIC8vIFRPRE86IEFkZCBzb3J0XG4gIH0sXG5cbiAgLy8gV2hlbiB3ZSByZWNlaXZlIGEgbmV3IG1vZGVsIHRvIHNldCBpbiBvdXIgY2FjaGUsIHVuYmluZCB0aGUgdHJhY2tlciBmcm9tXG4gIC8vIHRoZSBwcmV2aW91cyBjYWNoZSBvYmplY3QsIHN5bmMgdGhlIG9iamVjdHMnIGNpZHMgc28gaGVscGVycyB0aGluayB0aGV5XG4gIC8vIGFyZSB0aGUgc2FtZSBvYmplY3QsIHNhdmUgYSByZWZlcmFuY2UgdG8gdGhlIG9iamVjdCB3ZSBhcmUgdHJhY2tpbmcsXG4gIC8vIGFuZCByZS1iaW5kIG91ciBvbk1vZGlmeSBob29rLlxuICB0cmFjazogZnVuY3Rpb24ob2JqZWN0KXtcbiAgICB2YXIgdGFyZ2V0ID0gdGhpcy52YWx1ZSgpO1xuICAgIHRoaXMub2ZmKCdhbGwnLCB0aGlzLm9uTW9kaWZ5KTtcbiAgICBpZighb2JqZWN0IHx8ICF0YXJnZXQgfHwgIXRhcmdldC5pc0RhdGEgfHwgIW9iamVjdC5pc0RhdGEpIHJldHVybjtcbiAgICB0YXJnZXQuX2NpZCB8fCAodGFyZ2V0Ll9jaWQgPSB0YXJnZXQuY2lkKTtcbiAgICBvYmplY3QuX2NpZCB8fCAob2JqZWN0Ll9jaWQgPSBvYmplY3QuY2lkKTtcbiAgICB0YXJnZXQuY2lkID0gb2JqZWN0LmNpZDtcbiAgICB0aGlzLnRyYWNraW5nID0gb2JqZWN0O1xuICAgIHRoaXMubGlzdGVuVG8odGFyZ2V0LCAnYWxsJywgdGhpcy5vbk1vZGlmeSk7XG4gIH0sXG5cbiAgLy8gQWRkcyBhIGxpdGVuZXIgdG8gdGhlIHJvb3Qgb2JqZWN0IGFuZCB0ZWxscyBpdCB3aGF0IHByb3BlcnRpZXMgdGhpc1xuICAvLyBDb21wdXRlZCBQcm9wZXJ0eSBkZXBlbmQgb24uXG4gIC8vIFRoZSBsaXN0ZW5lciB3aWxsIHJlLWNvbXB1dGUgdGhpcyBDb21wdXRlZCBQcm9wZXJ0eSB3aGVuIGFueSBhcmUgY2hhbmdlZC5cbiAgd2lyZTogZnVuY3Rpb24oKXtcbiAgICB2YXIgcm9vdCA9IHRoaXMuX19yb290X187XG4gICAgdmFyIGNvbnRleHQgPSB0aGlzLl9fcGFyZW50X187XG4gICAgcm9vdC5fX2NvbXB1dGVkRGVwcyB8fCAocm9vdC5fX2NvbXB1dGVkRGVwcyA9IHt9KTtcbiAgICBfLmVhY2godGhpcy5kZXBzLCBmdW5jdGlvbihwYXRoKXtcbiAgICAgIC8vIEZpbmQgYWN0dWFsIHBhdGggZnJvbSByZWxhdGl2ZSBwYXRoc1xuICAgICAgdmFyIHNwbGl0ID0gJC5zcGxpdFBhdGgocGF0aCk7XG4gICAgICB3aGlsZShzcGxpdFswXSA9PT0gJ0BwYXJlbnQnKXtcbiAgICAgICAgY29udGV4dCA9IGNvbnRleHQuX19wYXJlbnRfXztcbiAgICAgICAgc3BsaXQuc2hpZnQoKTtcbiAgICAgIH1cblxuICAgICAgcGF0aCA9IGNvbnRleHQuX19wYXRoKCkucmVwbGFjZSgvXFwuP1xcWy4qXFxdL2lnLCAnLkBlYWNoJyk7XG4gICAgICBwYXRoID0gcGF0aCArIChwYXRoICYmICcuJykgKyBzcGxpdC5qb2luKCcuJyk7XG5cbiAgICAgIC8vIEFkZCBvdXJzZWx2ZXMgYXMgZGVwZW5kYW50c1xuICAgICAgcm9vdC5fX2NvbXB1dGVkRGVwc1twYXRoXSB8fCAocm9vdC5fX2NvbXB1dGVkRGVwc1twYXRoXSA9IFtdKTtcbiAgICAgIHJvb3QuX19jb21wdXRlZERlcHNbcGF0aF0ucHVzaCh0aGlzKTtcbiAgICB9LCB0aGlzKTtcblxuICAgIC8vIEVuc3VyZSB3ZSBvbmx5IGhhdmUgb25lIGxpc3RlbmVyIHBlciBNb2RlbCBhdCBhIHRpbWUuXG4gICAgY29udGV4dC5vZmYoJ2FsbCcsIHRoaXMub25SZWNvbXB1dGUpLm9uKCdhbGwnLCB0aGlzLm9uUmVjb21wdXRlKTtcbiAgfSxcblxuICAvLyBDYWxsIHRoaXMgY29tcHV0ZWQgcHJvcGVydHkgbGlrZSB5b3Ugd291bGQgd2l0aCBGdW5jdGlvbi5jYWxsKClcbiAgY2FsbDogZnVuY3Rpb24oKXtcbiAgICB2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cyksXG4gICAgICAgIGNvbnRleHQgPSBhcmdzLnNoaWZ0KCk7XG4gICAgcmV0dXJuIHRoaXMuYXBwbHkoY29udGV4dCwgYXJncyk7XG4gIH0sXG5cbiAgLy8gQ2FsbCB0aGlzIGNvbXB1dGVkIHByb3BlcnR5IGxpa2UgeW91IHdvdWxkIHdpdGggRnVuY3Rpb24uYXBwbHkoKVxuICAvLyBPbmx5IHByb3BlcnRpZXMgdGhhdCBhcmUgbWFya2VkIGFzIGRpcnR5IGFuZCBhcmUgbm90IGFscmVhZHkgY29tcHV0aW5nXG4gIC8vIHRoZW1zZWx2ZXMgYXJlIGV2YWx1YXRlZCB0byBwcmV2ZW50IGN5Y2xpYyBjYWxsYmFja3MuIElmIGFueSBkZXBlbmRhbnRzXG4gIC8vIGFyZW4ndCBmaW5pc2hlZCBjb21wdXRlZGluZywgd2UgYWRkIG91cnNlbHZlZCB0byB0aGVpciB3YWl0aW5nIGxpc3QuXG4gIC8vIFZhbmlsbGEgb2JqZWN0cyByZXR1cm5lZCBmcm9tIHRoZSBmdW5jdGlvbiBhcmUgcHJvbW90ZWQgdG8gUmVib3VuZCBPYmplY3RzLlxuICAvLyBUaGVuLCBzZXQgdGhlIHByb3BlciByZXR1cm4gdHlwZSBmb3IgZnV0dXJlIGZldGNoZXMgZnJvbSB0aGUgY2FjaGUgYW5kIHNldFxuICAvLyB0aGUgbmV3IGNvbXB1dGVkIHZhbHVlLiBUcmFjayBjaGFuZ2VzIHRvIHRoZSBjYWNoZSB0byBwdXNoIGl0IGJhY2sgdXAgdG9cbiAgLy8gdGhlIG9yaWdpbmFsIG9iamVjdCBhbmQgcmV0dXJuIHRoZSB2YWx1ZS5cbiAgYXBwbHk6IGZ1bmN0aW9uKGNvbnRleHQsIHBhcmFtcyl7XG5cbiAgICBpZighdGhpcy5pc0RpcnR5IHx8IHRoaXMuaXNDaGFuZ2luZykgcmV0dXJuO1xuICAgIHRoaXMuaXNDaGFuZ2luZyA9IHRydWU7XG5cbiAgICB2YXIgdmFsdWUgPSB0aGlzLmNhY2hlW3RoaXMucmV0dXJuVHlwZV0sXG4gICAgICAgIHJlc3VsdDtcblxuICAgIGNvbnRleHQgfHwgKGNvbnRleHQgPSB0aGlzLl9fcGFyZW50X18pO1xuXG4gICAgLy8gQ2hlY2sgYWxsIG9mIG91ciBkZXBlbmRhbmNpZXMgdG8gc2VlIGlmIHRoZXkgYXJlIGV2YWx1YXRpbmcuXG4gICAgLy8gSWYgd2UgaGF2ZSBhIGRlcGVuZGFuY3kgdGhhdCBpcyBkaXJ0eSBhbmQgdGhpcyBpc250IGl0cyBmaXJzdCBydW4sXG4gICAgLy8gTGV0IHRoaXMgZGVwZW5kYW5jeSBrbm93IHRoYXQgd2UgYXJlIHdhaXRpbmcgZm9yIGl0LlxuICAgIC8vIEl0IHdpbGwgcmUtcnVuIHRoaXMgQ29tcHV0ZWQgUHJvcGVydHkgYWZ0ZXIgaXQgZmluaXNoZXMuXG4gICAgXy5lYWNoKHRoaXMuZGVwcywgZnVuY3Rpb24oZGVwKXtcbiAgICAgIHZhciBkZXBlbmRhbmN5ID0gY29udGV4dC5nZXQoZGVwLCB7cmF3OiB0cnVlfSk7XG4gICAgICBpZighZGVwZW5kYW5jeSB8fCAhZGVwZW5kYW5jeS5pc0NvbXB1dGVkUHJvcGVydHkpIHJldHVybjtcbiAgICAgIGlmKGRlcGVuZGFuY3kuaXNEaXJ0eSAmJiBkZXBlbmRhbmN5LnJldHVyblR5cGUgIT09IG51bGwpe1xuICAgICAgICBkZXBlbmRhbmN5LndhaXRpbmdbdGhpcy5jaWRdID0gdGhpcztcbiAgICAgICAgcmV0dXJuIHRoaXMuaXNDaGFuZ2luZyA9IGZhbHNlO1xuICAgICAgfVxuICAgICAgZGVsZXRlIGRlcGVuZGFuY3kud2FpdGluZ1t0aGlzLmNpZF07XG4gICAgICAvLyBUT0RPOiBUaGVyZSBjYW4gYmUgYSBjaGVjayBoZXJlIGxvb2tpbmcgZm9yIGN5Y2xpYyBkZXBlbmRhbmNpZXMuXG4gICAgfSwgdGhpcyk7XG4gICAgaWYoIXRoaXMuaXNDaGFuZ2luZykgcmV0dXJuO1xuXG4gICAgcmVzdWx0ID0gdGhpcy5mdW5jLmFwcGx5KGNvbnRleHQsIHBhcmFtcyk7XG5cbiAgICAvLyBQcm9tb3RlIHZhbmlsbGEgb2JqZWN0cyB0byBSZWJvdW5kIERhdGEga2VlcGluZyB0aGUgc21hZSBvcmlnaW5hbCBvYmplY3RzXG4gICAgaWYoXy5pc0FycmF5KHJlc3VsdCkpIHJlc3VsdCA9IG5ldyBSZWJvdW5kLkNvbGxlY3Rpb24ocmVzdWx0LCB7Y2xvbmU6IGZhbHNlfSk7XG4gICAgZWxzZSBpZihfLmlzT2JqZWN0KHJlc3VsdCkgJiYgIXJlc3VsdC5pc0RhdGEpIHJlc3VsdCA9IG5ldyBSZWJvdW5kLk1vZGVsKHJlc3VsdCwge2Nsb25lOiBmYWxzZX0pO1xuXG4gICAgLy8gSWYgcmVzdWx0IGlzIHVuZGVmaW5lZCwgcmVzZXQgb3VyIGNhY2hlIGl0ZW1cbiAgICBpZihfLmlzVW5kZWZpbmVkKHJlc3VsdCkgfHwgXy5pc051bGwocmVzdWx0KSl7XG4gICAgICB0aGlzLnJldHVyblR5cGUgPSAndmFsdWUnO1xuICAgICAgdGhpcy5pc0NvbGxlY3Rpb24gPSB0aGlzLmlzTW9kZWwgPSBmYWxzZTtcbiAgICAgIHRoaXMuc2V0KHVuZGVmaW5lZCk7XG4gICAgfVxuICAgIC8vIFNldCByZXN1bHQgYW5kIHJldHVybiB0eXBlcywgYmluZCBldmVudHNcbiAgICBlbHNlIGlmKHJlc3VsdC5pc0NvbGxlY3Rpb24pe1xuICAgICAgdGhpcy5yZXR1cm5UeXBlID0gJ2NvbGxlY3Rpb24nO1xuICAgICAgdGhpcy5pc0NvbGxlY3Rpb24gPSB0cnVlO1xuICAgICAgdGhpcy5pc01vZGVsID0gZmFsc2U7XG4gICAgICB0aGlzLnNldChyZXN1bHQpO1xuICAgIH1cbiAgICBlbHNlIGlmKHJlc3VsdC5pc01vZGVsKXtcbiAgICAgIHRoaXMucmV0dXJuVHlwZSA9ICdtb2RlbCc7XG4gICAgICB0aGlzLmlzQ29sbGVjdGlvbiA9IGZhbHNlO1xuICAgICAgdGhpcy5pc01vZGVsID0gdHJ1ZTtcbiAgICAgIHRoaXMucmVzZXQocmVzdWx0KTtcbiAgICB9XG4gICAgZWxzZXtcbiAgICAgIHRoaXMucmV0dXJuVHlwZSA9ICd2YWx1ZSc7XG4gICAgICB0aGlzLmlzQ29sbGVjdGlvbiA9IHRoaXMuaXNNb2RlbCA9IGZhbHNlO1xuICAgICAgdGhpcy5yZXNldChyZXN1bHQpO1xuICAgIH1cblxuICAgIHRoaXMudHJhY2socmVzdWx0KTtcblxuICAgIHJldHVybiB0aGlzLnZhbHVlKCk7XG4gIH0sXG5cbiAgLy8gR2V0IGZyb20gdGhlIENvbXB1dGVkIFByb3BlcnR5J3MgY2FjaGVcbiAgZ2V0OiBmdW5jdGlvbihrZXksIG9wdGlvbnMpe1xuICAgIHZhciB2YWx1ZSA9IHRoaXMudmFsdWUoKTtcbiAgICBvcHRpb25zIHx8IChvcHRpb25zID0ge30pO1xuICAgIGlmKHRoaXMucmV0dXJuVHlwZSA9PT0gJ3ZhbHVlJykgcmV0dXJuIGNvbnNvbGUuZXJyb3IoJ0NhbGxlZCBnZXQgb24gdGhlIGAnKyB0aGlzLm5hbWUgKydgIGNvbXB1dGVkIHByb3BlcnR5IHdoaWNoIHJldHVybnMgYSBwcmltaXRpdmUgdmFsdWUuJyk7XG4gICAgcmV0dXJuIHZhbHVlLmdldChrZXksIG9wdGlvbnMpO1xuICB9LFxuXG4gIC8vIFNldCB0aGUgQ29tcHV0ZWQgUHJvcGVydHkncyBjYWNoZSB0byBhIG5ldyB2YWx1ZSBhbmQgdHJpZ2dlciBhcHByb3ByZWF0ZSBldmVudHMuXG4gIC8vIENoYW5nZXMgd2lsbCBwcm9wYWdhdGUgYmFjayB0byB0aGUgb3JpZ2luYWwgb2JqZWN0IGlmIGEgUmVib3VuZCBEYXRhIE9iamVjdCBhbmQgcmUtY29tcHV0ZS5cbiAgLy8gSWYgQ29tcHV0ZWQgUHJvcGVydHkgcmV0dXJucyBhIHZhbHVlLCBhbGwgZG93bnN0cmVhbSBkZXBlbmRhbmNpZXMgd2lsbCByZS1jb21wdXRlLlxuICBzZXQ6IGZ1bmN0aW9uKGtleSwgdmFsLCBvcHRpb25zKXtcbiAgICBpZih0aGlzLnJldHVyblR5cGUgPT09IG51bGwpIHJldHVybiB1bmRlZmluZWQ7XG4gICAgb3B0aW9ucyB8fCAob3B0aW9ucyA9IHt9KTtcbiAgICB2YXIgYXR0cnMgPSBrZXk7XG4gICAgdmFyIHZhbHVlID0gdGhpcy52YWx1ZSgpO1xuICAgIGlmKHRoaXMucmV0dXJuVHlwZSA9PT0gJ21vZGVsJyl7XG4gICAgICBpZiAodHlwZW9mIGtleSA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgYXR0cnMgPSAoa2V5LmlzTW9kZWwpID8ga2V5LmF0dHJpYnV0ZXMgOiBrZXk7XG4gICAgICAgIG9wdGlvbnMgPSB2YWw7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAoYXR0cnMgPSB7fSlba2V5XSA9IHZhbDtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYodGhpcy5yZXR1cm5UeXBlICE9PSAnbW9kZWwnKSBvcHRpb25zID0gdmFsIHx8IHt9O1xuICAgIGF0dHJzID0gKGF0dHJzICYmIGF0dHJzLmlzQ29tcHV0ZWRQcm9wZXJ0eSkgPyBhdHRycy52YWx1ZSgpIDogYXR0cnM7XG5cbiAgICAvLyBJZiBhIG5ldyB2YWx1ZSwgc2V0IGl0IGFuZCB0cmlnZ2VyIGV2ZW50c1xuICAgIGlmKHRoaXMucmV0dXJuVHlwZSA9PT0gJ3ZhbHVlJyAmJiB0aGlzLmNhY2hlLnZhbHVlICE9PSBhdHRycyl7XG4gICAgICB0aGlzLmNhY2hlLnZhbHVlID0gYXR0cnM7XG4gICAgICBpZighb3B0aW9ucy5xdWlldCl7XG4gICAgICAgIC8vIElmIHNldCB3YXMgY2FsbGVkIG5vdCB0aHJvdWdoIGNvbXB1dGVkUHJvcGVydHkuY2FsbCgpLCB0aGlzIGlzIGEgZnJlc2ggbmV3IGV2ZW50IGJ1cnN0LlxuICAgICAgICBpZighdGhpcy5pc0RpcnR5ICYmICF0aGlzLmlzQ2hhbmdpbmcpIHRoaXMuX19wYXJlbnRfXy5jaGFuZ2VkID0ge307XG4gICAgICAgIHRoaXMuX19wYXJlbnRfXy5jaGFuZ2VkW3RoaXMubmFtZV0gPSBhdHRycztcbiAgICAgICAgdGhpcy50cmlnZ2VyKCdjaGFuZ2UnLCB0aGlzLl9fcGFyZW50X18pO1xuICAgICAgICB0aGlzLnRyaWdnZXIoJ2NoYW5nZTonK3RoaXMubmFtZSwgdGhpcy5fX3BhcmVudF9fLCBhdHRycyk7XG4gICAgICAgIGRlbGV0ZSB0aGlzLl9fcGFyZW50X18uY2hhbmdlZFt0aGlzLm5hbWVdO1xuICAgICAgfVxuICAgIH1cbiAgICBlbHNlIGlmKHRoaXMucmV0dXJuVHlwZSAhPT0gJ3ZhbHVlJyAmJiBvcHRpb25zLnJlc2V0KSBrZXkgPSB2YWx1ZS5yZXNldChhdHRycywgb3B0aW9ucyk7XG4gICAgZWxzZSBpZih0aGlzLnJldHVyblR5cGUgIT09ICd2YWx1ZScpIGtleSA9IHZhbHVlLnNldChhdHRycywgb3B0aW9ucyk7XG4gICAgdGhpcy5pc0RpcnR5ID0gdGhpcy5pc0NoYW5naW5nID0gZmFsc2U7XG5cbiAgICAvLyBDYWxsIGFsbCByZWFtaW5pbmcgY29tcHV0ZWQgcHJvcGVydGllcyB3YWl0aW5nIGZvciB0aGlzIHZhbHVlIHRvIHJlc29sdmUuXG4gICAgXy5lYWNoKHRoaXMud2FpdGluZywgZnVuY3Rpb24ocHJvcCl7IHByb3AgJiYgcHJvcC5jYWxsKCk7IH0pO1xuXG4gICAgcmV0dXJuIGtleTtcbiAgfSxcblxuICAvLyBSZXR1cm4gdGhlIGN1cnJlbnQgdmFsdWUgZnJvbSB0aGUgY2FjaGUsIHJ1bm5pbmcgaWYgZmlyc3QgcnVuLlxuICB2YWx1ZTogZnVuY3Rpb24oKXtcbiAgICBpZihfLmlzTnVsbCh0aGlzLnJldHVyblR5cGUpKSB0aGlzLmFwcGx5KCk7XG4gICAgcmV0dXJuIHRoaXMuY2FjaGVbdGhpcy5yZXR1cm5UeXBlXTtcbiAgfSxcblxuICAvLyBSZXNldCB0aGUgY3VycmVudCB2YWx1ZSBpbiB0aGUgY2FjaGUsIHJ1bm5pbmcgaWYgZmlyc3QgcnVuLlxuICByZXNldDogZnVuY3Rpb24ob2JqLCBvcHRpb25zKXtcbiAgICBpZihfLmlzTnVsbCh0aGlzLnJldHVyblR5cGUpKSByZXR1cm47IC8vIEZpcnN0IHJ1blxuICAgIG9wdGlvbnMgfHwgKG9wdGlvbnMgPSB7fSk7XG4gICAgb3B0aW9ucy5yZXNldCA9IHRydWU7XG4gICAgcmV0dXJuICB0aGlzLnNldChvYmosIG9wdGlvbnMpO1xuICB9LFxuXG4gIC8vIEN5Y2xpYyBkZXBlbmRhbmN5IHNhZmUgdG9KU09OIG1ldGhvZC5cbiAgdG9KU09OOiBmdW5jdGlvbigpIHtcbiAgICBpZiAodGhpcy5faXNTZXJpYWxpemluZykgcmV0dXJuIHRoaXMuY2lkO1xuICAgIHZhciB2YWwgPSB0aGlzLnZhbHVlKCk7XG4gICAgdGhpcy5faXNTZXJpYWxpemluZyA9IHRydWU7XG4gICAgdmFyIGpzb24gPSAodmFsICYmIF8uaXNGdW5jdGlvbih2YWwudG9KU09OKSkgPyB2YWwudG9KU09OKCkgOiB2YWw7XG4gICAgdGhpcy5faXNTZXJpYWxpemluZyA9IGZhbHNlO1xuICAgIHJldHVybiBqc29uO1xuICB9XG5cbn0pO1xuXG5leHBvcnQgZGVmYXVsdCBDb21wdXRlZFByb3BlcnR5OyIsImltcG9ydCAkIGZyb20gXCJyZWJvdW5kLXJ1bnRpbWUvdXRpbHNcIjtcbmltcG9ydCB7IE1vZGVsIH0gZnJvbSBcInJlYm91bmQtZGF0YS9yZWJvdW5kLWRhdGFcIjtcblxuLy8gTmV3IFJlYm91bmQgQ29udGV4dFxudmFyIENvbnRleHQgPSBNb2RlbC5leHRlbmQoe1xuXG4gIGxpc3RlbjogZnVuY3Rpb24oKXtcbiAgICAvLyBMaXN0ZW4gdG8gcmVsZXZlbnQgZGF0YSBjaGFuZ2UgZXZlbnRzXG4gICAgdGhpcy5saXN0ZW5Ubyh0aGlzLCAnY2hhbmdlJywgdGhpcy5fb25Nb2RlbENoYW5nZSk7XG4gICAgdGhpcy5saXN0ZW5Ubyh0aGlzLCAnYWRkIHJlbW92ZScsIHRoaXMuX29uQ29sbGVjdGlvbkNoYW5nZSk7XG4gICAgdGhpcy5saXN0ZW5Ubyh0aGlzLCAncmVzZXQnLCB0aGlzLl9vblJlc2V0KTtcbiAgfSxcblxuICBfb25SZXNldDogZnVuY3Rpb24oZGF0YSwgb3B0aW9ucyl7XG4gICAgaWYoZGF0YSAmJiBkYXRhLmlzTW9kZWwpe1xuICAgICAgcmV0dXJuIHRoaXMuX29uTW9kZWxDaGFuZ2UoZGF0YSwgb3B0aW9ucyk7XG4gICAgfVxuICAgIGVsc2UgaWYoZGF0YS5pc0NvbGxlY3Rpb24pe1xuICAgICAgcmV0dXJuIHRoaXMuX29uQ29sbGVjdGlvbkNoYW5nZShkYXRhLCBvcHRpb25zKTtcbiAgICB9XG4gIH0sXG5cbiAgX29uTW9kZWxDaGFuZ2U6IGZ1bmN0aW9uKG1vZGVsLCBvcHRpb25zKXtcbiAgICB2YXIgY2hhbmdlZCA9IG1vZGVsLmNoYW5nZWRBdHRyaWJ1dGVzKCk7XG4gICAgaWYoY2hhbmdlZCkgdGhpcy5fbm90aWZ5U3VidHJlZShtb2RlbCwgY2hhbmdlZCwgJ21vZGVsJyk7XG4gIH0sXG5cbiAgX29uQ29sbGVjdGlvbkNoYW5nZTogZnVuY3Rpb24obW9kZWwsIGNvbGxlY3Rpb24sIG9wdGlvbnMpe1xuICAgIHZhciBjaGFuZ2VkID0ge30sXG4gICAgdGhhdCA9IHRoaXM7XG4gICAgaWYobW9kZWwuaXNDb2xsZWN0aW9uKXtcbiAgICAgIG9wdGlvbnMgPSBjb2xsZWN0aW9uO1xuICAgICAgY29sbGVjdGlvbiA9IG1vZGVsO1xuICAgIH1cbiAgICBjaGFuZ2VkW2NvbGxlY3Rpb24uX19wYXRoKCldID0gY29sbGVjdGlvbjtcbiAgICBpZihjb2xsZWN0aW9uLl90aW1lb3V0KXtcbiAgICAgIGNsZWFyVGltZW91dChjb2xsZWN0aW9uLl90aW1lb3V0KTtcbiAgICAgIGNvbGxlY3Rpb24uX3RpbWVvdXQgPSB1bmRlZmluZWQ7XG4gICAgfVxuICAgIGNvbGxlY3Rpb24uX3RpbWVvdXQgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG4gICAgICB0aGF0Ll9ub3RpZnlTdWJ0cmVlKHRoYXQsIGNoYW5nZWQsICdjb2xsZWN0aW9uJyk7XG4gICAgfSwgMjApO1xuICB9LFxuXG4gIF9ub3RpZnlTdWJ0cmVlOiBmdW5jdGlvbiBfbm90aWZ5U3VidHJlZShvYmosIGNoYW5nZWQsIHR5cGUpe1xuXG4gICAgdmFyIGNvbnRleHQgPSB0aGlzLCAvLyBUaGlzIHJvb3QgY29udGV4dFxuICAgIHBhdGggPSBvYmouX19wYXRoKCksIC8vIFRoZSBwYXRoIG9mIHRoZSBtb2RpZmllZCBvYmplY3QgcmVsYXRpdmUgdG8gdGhlIHJvb3QgY29udGV4dFxuICAgIHBhcnRzID0gJC5zcGxpdFBhdGgocGF0aCksIC8vIEFycmF5IG9mIHBhcnRzIG9mIHRoZSBtb2RpZmllZCBvYmplY3QncyBwYXRoOiB0ZXN0WzFdLndoYXRldmVyIC0+IFsndGVzdCcsICcxJywgJ3doYXRldmVyJ11cbiAgICBrZXlzID0gXy5rZXlzKGNoYW5nZWQpLCAvLyBBcnJheSBvZiBhbGwgY2hhbmdlZCBrZXlzXG4gICAgaSA9IDAsXG4gICAgbGVuID0gcGFydHMubGVuZ3RoLFxuICAgIHBhdGhzLFxuICAgIHRyaWdnZXJzO1xuXG4gICAgLy8gQ2FsbCBub3RpZnkgb24gZXZlcnkgb2JqZWN0IGRvd24gdGhlIGRhdGEgdHJlZSBzdGFydGluZyBhdCB0aGUgcm9vdCBhbmQgYWxsIHRoZSB3YXkgZG93biBlbGVtZW50IHRoYXQgdHJpZ2dlcmVkIHRoZSBjaGFuZ2VcbiAgICBmb3IoaTtpPD1sZW47aSsrKXtcblxuICAgICAgLy8gUmVzZXQgcGF0aHMgZm9yIGVhY2ggZGF0YSBsYXllclxuICAgICAgcGF0aHMgPSBbXTtcbiAgICAgIHRyaWdnZXJzID0gW107XG5cbiAgICAgIC8vIEZvciBldmVyeSBrZXkgY2hhbmdlZFxuICAgICAgXy5lYWNoKGtleXMsIGZ1bmN0aW9uKGF0dHIpe1xuXG4gICAgICAgIC8vIENvbnN0cnVjdHMgcGF0aHMgdmFyaWFibGUgcmVsYXRpdmUgdG8gY3VycmVudCBkYXRhIGVsZW1lbnRcbiAgICAgICAgcGF0aHMucHVzaCgoKHBhdGggJiYgcGF0aCArICcuJyB8fCAnJykgKyBhdHRyKS5yZXBsYWNlKGNvbnRleHQuX19wYXRoKCksICcnKS5yZXBsYWNlKC9cXFsoW15cXF1dKylcXF0vZywgXCIuJDFcIikucmVwbGFjZSgvXlxcLi8sICcnKSk7XG4gICAgICAgIHBhdGhzLnB1c2goKChwYXRoICYmIHBhdGggKyAnLicgfHwgJycpICsgYXR0cikucmVwbGFjZShjb250ZXh0Ll9fcGF0aCgpLCAnJykucmVwbGFjZSgvXFxbW15cXF1dK1xcXS9nLCBcIi5AZWFjaFwiKS5yZXBsYWNlKC9eXFwuLywgJycpKTtcbiAgICAgICAgcGF0aHMgPSBfLnVuaXEocGF0aHMpO1xuICAgICAgfSk7XG5cbiAgICAgIC8vIENhbGwgYWxsIGxpc3RlbmVyc1xuICAgICAgdGhpcy5ub3RpZnkoY29udGV4dCwgcGF0aHMsIHR5cGUpO1xuXG4gICAgICAvLyBJZiBub3QgYXQgZW5kIG9mIHBhdGggcGFydHMsIGdldCB0aGUgbmV4dCBkYXRhIG9iamVjdFxuICAgICAgY29udGV4dCA9IChpID09PSBsZW4pIHx8IChjb250ZXh0LmlzTW9kZWwgJiYgY29udGV4dC5nZXQocGFydHNbaV0pKSB8fCAoY29udGV4dC5pc0NvbGxlY3Rpb24gJiYgY29udGV4dC5hdChwYXJ0c1tpXSkpO1xuICAgICAgaWYoY29udGV4dCA9PT0gdW5kZWZpbmVkKXtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuICB9LFxuICBub3RpZnk6IGZ1bmN0aW9uIG5vdGlmeShvYmosIHBhdGhzLCB0eXBlKSB7XG5cbiAgICAvLyBJZiBwYXRoIGlzIG5vdCBhbiBhcnJheSBvZiBrZXlzLCB3cmFwIGl0IGluIGFycmF5XG4gICAgcGF0aHMgPSAoIV8uaXNBcnJheShwYXRocykpID8gW3BhdGhzXSA6IHBhdGhzO1xuXG4gICAgLy8gRm9yIGVhY2ggcGF0aCwgYWxlcnQgZWFjaCBvYnNlcnZlciBhbmQgY2FsbCBpdHMgY2FsbGJhY2tcbiAgICBfLmVhY2gocGF0aHMsIGZ1bmN0aW9uKHBhdGgpe1xuICAgICAgXy5lYWNoKG9iai5fX29ic2VydmVycywgZnVuY3Rpb24ob2JzZXJ2ZXJzLCBvYnNQYXRoKXtcbiAgICAgICAgLy8gVHJpZ2dlciBhbGwgcGFydGlhbCBvciBleGFjdCBvYnNlcnZlciBtYXRjaGVzXG4gICAgICAgIGlmKG9ic1BhdGggPT09IHBhdGggfHwgb2JzUGF0aC5pbmRleE9mKHBhdGggKyAnLicpID09PSAwIHx8IHBhdGguaW5kZXhPZihvYnNQYXRoICsgJy4nKSA9PT0gMCl7XG4gICAgICAgICAgXy5lYWNoKG9ic2VydmVycywgZnVuY3Rpb24oY2FsbGJhY2ssIGluZGV4KSB7XG4gICAgICAgICAgICAvLyBJZiB0aGlzIGlzIGEgY29sbGVjdGlvbiBjaGFuZ2UgKGFkZCwgc29ydCwgcmVtb3ZlKSB0cmlnZ2VyIGV2ZXJ5dGhpbmcsIG90aGVyd2lzZSBvbmx5IHRyaWdnZXIgcHJvcGVydHkgY2hhbmdlIGNhbGxiYWNrc1xuICAgICAgICAgICAgaWYoXy5pc0Z1bmN0aW9uKGNhbGxiYWNrKSAmJiAoY2FsbGJhY2sudHlwZSAhPT0gJ2NvbGxlY3Rpb24nIHx8IHR5cGUgPT09ICdjb2xsZWN0aW9uJykpe1xuICAgICAgICAgICAgICBjYWxsYmFjaygpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxufSk7XG5cbmV4cG9ydCBkZWZhdWx0IENvbnRleHQ7IiwiaW1wb3J0IENvbXB1dGVkUHJvcGVydHkgZnJvbSBcInJlYm91bmQtZGF0YS9jb21wdXRlZC1wcm9wZXJ0eVwiO1xuaW1wb3J0ICQgZnJvbSBcInJlYm91bmQtcnVudGltZS91dGlsc1wiO1xuXG4vLyBJZiBSZWJvdW5kIFJ1bnRpbWUgaGFzIGFscmVhZHkgYmVlbiBydW4sIHRocm93IGVycm9yXG5pZihSZWJvdW5kLk1vZGVsKXsgdGhyb3cgJ1JlYm91bmQgTW9kZWwgaXMgYWxyZWFkeSBsb2FkZWQgb24gdGhlIHBhZ2UhJzsgfVxuLy8gSWYgQmFja2JvbmUgaGFzbid0IGJlZW4gc3RhcnRlZCB5ZXQsIHRocm93IGVycm9yXG5pZighd2luZG93LkJhY2tib25lKXsgdGhyb3cgXCJCYWNrYm9uZSBtdXN0IGJlIG9uIHRoZSBwYWdlIGZvciBSZWJvdW5kIHRvIGxvYWQuXCI7IH1cblxuZnVuY3Rpb24gcGF0aEdlbmVyYXRvcihwYXJlbnQsIGtleSl7XG4gIHJldHVybiBmdW5jdGlvbigpe1xuICAgIHZhciBwYXRoID0gcGFyZW50Ll9fcGF0aCgpO1xuICAgIHJldHVybiBwYXRoICsgKChwYXRoID09PSAnJykgPyAnJyA6ICcuJykgKyBrZXk7XG4gIH07XG59XG5cbnZhciBNb2RlbCA9IEJhY2tib25lLk1vZGVsLmV4dGVuZCh7XG5cbiAgaXNNb2RlbDogdHJ1ZSxcbiAgaXNEYXRhOiB0cnVlLFxuXG4gIF9fcGF0aDogZnVuY3Rpb24oKXsgcmV0dXJuICcnOyB9LFxuXG4gIGNvbnN0cnVjdG9yOiBmdW5jdGlvbihhdHRyaWJ1dGVzLCBvcHRpb25zKXtcbiAgICB2YXIgbW9kZWw7XG5cbiAgICBhdHRyaWJ1dGVzIHx8IChhdHRyaWJ1dGVzID0ge30pO1xuICAgIG1vZGVsID0gYXR0cmlidXRlcyB8fCB7fTtcbiAgICBhdHRyaWJ1dGVzLmlzTW9kZWwgJiYgKGF0dHJpYnV0ZXMgPSBhdHRyaWJ1dGVzLmF0dHJpYnV0ZXMpO1xuICAgIG9wdGlvbnMgfHwgKG9wdGlvbnMgPSB7fSk7XG4gICAgdGhpcy5oZWxwZXJzID0ge307XG4gICAgdGhpcy5kZWZhdWx0cyA9IHRoaXMuZGVmYXVsdHMgfHwge307XG5cbiAgICAvLyBTZXQgbGluZWFnZVxuICAgIHRoaXMuc2V0UGFyZW50KCBvcHRpb25zLnBhcmVudCB8fCB0aGlzICk7XG4gICAgdGhpcy5zZXRSb290KCBvcHRpb25zLnJvb3QgfHwgdGhpcyApO1xuICAgIHRoaXMuX19wYXRoID0gb3B0aW9ucy5wYXRoIHx8IHRoaXMuX19wYXRoO1xuXG4gICAgQmFja2JvbmUuTW9kZWwuY2FsbCggdGhpcywgYXR0cmlidXRlcywgb3B0aW9ucyApO1xuICB9LFxuXG4gIHRvZ2dsZTogZnVuY3Rpb24oYXR0ciwgb3B0aW9ucykge1xuICAgIG9wdGlvbnMgPSBvcHRpb25zID8gXy5jbG9uZShvcHRpb25zKSA6IHt9O1xuICAgIHZhciB2YWwgPSB0aGlzLmdldChhdHRyKTtcbiAgICBpZighXy5pc0Jvb2xlYW4odmFsKSkgY29uc29sZS5lcnJvcignVHJpZWQgdG8gdG9nZ2xlIG5vbi1ib29sZWFuIHZhbHVlICcgKyBhdHRyICsnIScsIHRoaXMpO1xuICAgIHJldHVybiB0aGlzLnNldChhdHRyLCAhdmFsLCBvcHRpb25zKTtcbiAgfSxcblxuICByZXNldDogZnVuY3Rpb24ob2JqLCBvcHRpb25zKXtcblxuICAgIHZhciBjaGFuZ2VkID0ge307XG5cbiAgICBvcHRpb25zIHx8IChvcHRpb25zID0ge30pO1xuICAgIG9wdGlvbnMucmVzZXQgPSB0cnVlO1xuICAgIG9iaiA9IChvYmogJiYgb2JqLmlzTW9kZWwgJiYgb2JqLmF0dHJpYnV0ZXMpIHx8IG9iaiB8fCB7fTtcbiAgICBvcHRpb25zLnByZXZpb3VzQXR0cmlidXRlcyA9IF8uY2xvbmUodGhpcy5hdHRyaWJ1dGVzKTtcblxuICAgIC8vIEl0ZXJhdGUgb3ZlciBhdHRyaWJ1dGVzIHNldHRpbmcgcHJvcGVydGllcyB0byBvYmosIGRlZmF1bHQgb3IgY2xlYXJpbmcgdGhlbVxuICAgIF8uZWFjaCh0aGlzLmF0dHJpYnV0ZXMsIGZ1bmN0aW9uKHZhbHVlLCBrZXksIG1vZGVsKXtcblxuICAgICAgaWYoXy5pc1VuZGVmaW5lZCh2YWx1ZSkpe1xuICAgICAgICBvYmpba2V5XSAmJiAoY2hhbmdlZFtrZXldID0gb2JqW2tleV0pO1xuICAgICAgfVxuICAgICAgZWxzZSBpZiAoa2V5ID09PSB0aGlzLmlkQXR0cmlidXRlIHx8ICAodmFsdWUgJiYgdmFsdWUuaXNDb21wdXRlZFByb3BlcnR5KSkgIHJldHVybjtcbiAgICAgIGVsc2UgaWYgKHZhbHVlLmlzQ29sbGVjdGlvbiB8fCB2YWx1ZS5pc01vZGVsKXtcbiAgICAgICAgdmFsdWUucmVzZXQoKG9ialtrZXldfHxbXSksIHtzaWxlbnQ6IHRydWV9KTtcbiAgICAgICAgIV8uaXNFbXB0eSh2YWx1ZS5jaGFuZ2VkKSAmJiAoY2hhbmdlZFtrZXldID0gdmFsdWUuY2hhbmdlZCk7XG4gICAgICB9XG4gICAgICBlbHNlIGlmIChvYmouaGFzT3duUHJvcGVydHkoa2V5KSl7XG4gICAgICAgIGlmKHZhbHVlICE9PSBvYmpba2V5XSkgY2hhbmdlZFtrZXldID0gb2JqW2tleV07XG4gICAgICB9XG4gICAgICBlbHNlIGlmICh0aGlzLmRlZmF1bHRzLmhhc093blByb3BlcnR5KGtleSkgJiYgIV8uaXNGdW5jdGlvbih0aGlzLmRlZmF1bHRzW2tleV0pKXtcbiAgICAgICAgb2JqW2tleV0gPSB0aGlzLmRlZmF1bHRzW2tleV07XG4gICAgICAgIGlmKHZhbHVlICE9PSBvYmpba2V5XSkgY2hhbmdlZFtrZXldID0gb2JqW2tleV07XG4gICAgICB9XG4gICAgICBlbHNle1xuICAgICAgICBjaGFuZ2VkW2tleV0gPSB1bmRlZmluZWQ7XG4gICAgICAgIHRoaXMudW5zZXQoa2V5LCB7c2lsZW50OiB0cnVlfSk7XG4gICAgICB9XG4gICAgfSwgdGhpcyk7XG5cbiAgICAvLyBBbnkgdW5zZXQgY2hhbmdlZCB2YWx1ZXMgd2lsbCBiZSBzZXQgdG8gb2JqW2tleV1cbiAgICBfLmVhY2gob2JqLCBmdW5jdGlvbih2YWx1ZSwga2V5LCBvYmope1xuICAgICAgY2hhbmdlZFtrZXldID0gY2hhbmdlZFtrZXldIHx8IG9ialtrZXldO1xuICAgIH0pO1xuXG4gICAgLy8gUmVzZXQgb3VyIG1vZGVsXG4gICAgb2JqID0gdGhpcy5zZXQob2JqLCBfLmV4dGVuZCh7fSwgb3B0aW9ucywge3NpbGVudDogdHJ1ZSwgcmVzZXQ6IGZhbHNlfSkpO1xuXG4gICAgLy8gVHJpZ2dlciBjdXN0b20gcmVzZXQgZXZlbnRcbiAgICB0aGlzLmNoYW5nZWQgPSBjaGFuZ2VkO1xuICAgIGlmICghb3B0aW9ucy5zaWxlbnQpIHRoaXMudHJpZ2dlcigncmVzZXQnLCB0aGlzLCBvcHRpb25zKTtcblxuICAgIC8vIFJldHVybiBuZXcgdmFsdWVzXG4gICAgcmV0dXJuIG9iajtcbiAgfSxcblxuICBnZXQ6IGZ1bmN0aW9uKGtleSwgb3B0aW9ucyl7XG5cbiAgICAvLyBTcGxpdCB0aGUgcGF0aCBhdCBhbGwgJy4nLCAnWycgYW5kICddJyBhbmQgZmluZCB0aGUgdmFsdWUgcmVmZXJhbmNlZC5cbiAgICB2YXIgcGFydHMgID0gJC5zcGxpdFBhdGgoa2V5KSxcbiAgICAgICAgcmVzdWx0ID0gdGhpcyxcbiAgICAgICAgbD1wYXJ0cy5sZW5ndGgsXG4gICAgICAgIGk9MDtcbiAgICAgICAgb3B0aW9ucyA9IF8uZGVmYXVsdHMoKG9wdGlvbnMgfHwge30pLCB7IHJhdzogZmFsc2UgfSk7XG5cbiAgICBpZihfLmlzVW5kZWZpbmVkKGtleSkgfHwgXy5pc051bGwoa2V5KSkgcmV0dXJuIGtleTtcblxuICAgIGlmKGtleSA9PT0gJycgfHwgcGFydHMubGVuZ3RoID09PSAwKSByZXR1cm4gcmVzdWx0O1xuXG4gICAgaWYgKHBhcnRzLmxlbmd0aCA+IDApIHtcbiAgICAgIGZvciAoIGkgPSAwOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgIGlmKHJlc3VsdCAmJiByZXN1bHQuaXNDb21wdXRlZFByb3BlcnR5ICYmIG9wdGlvbnMucmF3KSByZXR1cm4gcmVzdWx0O1xuICAgICAgICBpZihyZXN1bHQgJiYgcmVzdWx0ICYmIHJlc3VsdC5pc0NvbXB1dGVkUHJvcGVydHkpIHJlc3VsdCA9IHJlc3VsdC52YWx1ZSgpO1xuICAgICAgICBpZihfLmlzVW5kZWZpbmVkKHJlc3VsdCkgfHwgXy5pc051bGwocmVzdWx0KSkgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgaWYocGFydHNbaV0gPT09ICdAcGFyZW50JykgcmVzdWx0ID0gcmVzdWx0Ll9fcGFyZW50X187XG4gICAgICAgIGVsc2UgaWYocmVzdWx0LmlzQ29sbGVjdGlvbikgcmVzdWx0ID0gcmVzdWx0Lm1vZGVsc1twYXJ0c1tpXV07XG4gICAgICAgIGVsc2UgaWYocmVzdWx0LmlzTW9kZWwpIHJlc3VsdCA9IHJlc3VsdC5hdHRyaWJ1dGVzW3BhcnRzW2ldXTtcbiAgICAgICAgZWxzZSBpZihyZXN1bHQgJiYgcmVzdWx0Lmhhc093blByb3BlcnR5KHBhcnRzW2ldKSkgcmVzdWx0ID0gcmVzdWx0W3BhcnRzW2ldXTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZihyZXN1bHQgJiYgcmVzdWx0LmlzQ29tcHV0ZWRQcm9wZXJ0eSAmJiAhb3B0aW9ucy5yYXcpIHJlc3VsdCA9IHJlc3VsdC52YWx1ZSgpO1xuXG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfSxcblxuICAvLyBUT0RPOiBNb3ZpbmcgdGhlIGhlYWQgb2YgYSBkYXRhIHRyZWUgc2hvdWxkIHByZXNlcnZlIGFuY2VzdHJ5XG4gIHNldDogZnVuY3Rpb24oa2V5LCB2YWwsIG9wdGlvbnMpe1xuXG4gICAgdmFyIGF0dHJzLCBhdHRyLCBuZXdLZXksIHRhcmdldCwgZGVzdGluYXRpb24sIHByb3BzID0gW10sIGxpbmVhZ2U7XG5cbiAgICAvLyBTZXQgaXMgYWJsZSB0byB0YWtlIGEgb2JqZWN0IG9yIGEga2V5IHZhbHVlIHBhaXIuIE5vcm1hbGl6ZSB0aGlzIGlucHV0LlxuICAgIGlmICh0eXBlb2Yga2V5ID09PSAnb2JqZWN0Jykge1xuICAgICAgYXR0cnMgPSAoa2V5LmlzTW9kZWwpID8ga2V5LmF0dHJpYnV0ZXMgOiBrZXk7XG4gICAgICBvcHRpb25zID0gdmFsO1xuICAgIH0gZWxzZSB7XG4gICAgICAoYXR0cnMgPSB7fSlba2V5XSA9IHZhbDtcbiAgICB9XG4gICAgb3B0aW9ucyB8fCAob3B0aW9ucyA9IHt9KTtcblxuICAgIC8vIElmIHJlc2V0IGlzIHBhc3NlZCwgZG8gYSByZXNldCBpbnN0ZWFkXG4gICAgaWYob3B0aW9ucy5yZXNldCA9PT0gdHJ1ZSl7XG4gICAgICByZXR1cm4gdGhpcy5yZXNldChhdHRycywgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgaWYoXy5pc0VtcHR5KGF0dHJzKSl7IHJldHVybjsgfVxuXG4gICAgLy8gRm9yIGVhY2gga2V5IGFuZCB2YWx1ZVxuICAgIF8uZWFjaChhdHRycywgZnVuY3Rpb24odmFsLCBrZXkpe1xuXG4gICAgICB2YXIgcGF0aHMgPSAkLnNwbGl0UGF0aChrZXkpLFxuICAgICAgICAgIGF0dHIgID0gcGF0aHMucG9wKCkgfHwgJyc7ICAgICAgICAgICAvLyBUaGUga2V5ICAgICAgICBleDogZm9vWzBdLmJhciAtLT4gYmFyXG4gICAgICAgICAgdGFyZ2V0ID0gdGhpcy5nZXQocGF0aHMuam9pbignLicpKSwgIC8vIFRoZSBlbGVtZW50ICAgIGV4OiBmb28uYmFyLmJheiAtLT4gZm9vLmJhclxuICAgICAgICAgIGxpbmVhZ2UgPSB7XG4gICAgICAgICAgICBuYW1lOiBrZXksXG4gICAgICAgICAgICBwYXJlbnQ6IHRhcmdldCxcbiAgICAgICAgICAgIHJvb3Q6IHRoaXMuX19yb290X18sXG4gICAgICAgICAgICBwYXRoOiBwYXRoR2VuZXJhdG9yKHRoaXMsIGtleSksXG4gICAgICAgICAgICBzaWxlbnQ6IHRydWUsXG4gICAgICAgICAgICBjbG9uZTogb3B0aW9ucy5jbG9uZVxuICAgICAgICAgIH07XG5cbiAgICAgIC8vIElmIHRhcmdldCBjdXJyZW50bHkgZG9lc250IGV4aXN0LCBjb25zdHJ1Y3QgaXRcbiAgICAgIGlmKF8uaXNVbmRlZmluZWQodGFyZ2V0KSl7XG4gICAgICAgIHRhcmdldCA9IHRoaXM7XG4gICAgICAgIF8uZWFjaChwYXRocywgZnVuY3Rpb24odmFsdWUpe1xuICAgICAgICAgIHZhciB0bXAgPSB0YXJnZXQuZ2V0KHZhbHVlKTtcbiAgICAgICAgICBpZihfLmlzVW5kZWZpbmVkKHRtcCkpe1xuICAgICAgICAgICAgdGFyZ2V0LnNldCh2YWx1ZSwge30pO1xuICAgICAgICAgICAgdG1wID0gdGFyZ2V0LmdldCh2YWx1ZSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHRhcmdldCA9IHRtcDtcbiAgICAgICAgfSwgdGhpcyk7XG4gICAgICAgIHJldHVybiB0YXJnZXQuc2V0KGF0dHIsIHZhbCk7XG4gICAgICB9XG5cbiAgICAgIHZhciBkZXN0aW5hdGlvbiA9IHRhcmdldC5nZXQoYXR0ciwge3JhdzogdHJ1ZX0pIHx8IHt9OyAgLy8gVGhlIGN1cnJlbnQgdmFsdWUgb2YgYXR0clxuXG4gICAgICAvLyBJZiB2YWwgaXMgbnVsbCBvciB1bmRlZmluZWQsIHNldCB0byBkZWZhdWx0c1xuICAgICAgaWYoXy5pc051bGwodmFsKSB8fCBfLmlzVW5kZWZpbmVkKHZhbCkpIHZhbCA9IHRoaXMuZGVmYXVsdHNba2V5XTtcbiAgICAgIGlmKHZhbCAmJiB2YWwuaXNDb21wdXRlZFByb3BlcnR5KSB2YWwgPSB2YWwudmFsdWUoKTtcblxuICAgICAgLy8gSWYgdmFsIGlzIG51bGwsIHNldCB0byB1bmRlZmluZWRcbiAgICAgIGVsc2UgaWYoXy5pc051bGwodmFsKSB8fCBfLmlzVW5kZWZpbmVkKHZhbCkpIHZhbCA9IHVuZGVmaW5lZDtcblxuICAgICAgLy8gSWYgdGhpcyBmdW5jdGlvbiBpcyB0aGUgc2FtZSBhcyB0aGUgY3VycmVudCBjb21wdXRlZCBwcm9wZXJ0eSwgY29udGludWVcbiAgICAgIGVsc2UgaWYoZGVzdGluYXRpb24uaXNDb21wdXRlZFByb3BlcnR5ICYmIGRlc3RpbmF0aW9uLmZ1bmMgPT09IHZhbCkgcmV0dXJuO1xuXG4gICAgICAvLyBJZiB0aGlzIHZhbHVlIGlzIGEgRnVuY3Rpb24sIHR1cm4gaXQgaW50byBhIENvbXB1dGVkIFByb3BlcnR5XG4gICAgICBlbHNlIGlmKF8uaXNGdW5jdGlvbih2YWwpKSB2YWwgPSBuZXcgQ29tcHV0ZWRQcm9wZXJ0eSh2YWwsIGxpbmVhZ2UpO1xuXG4gICAgICAvLyBJZiB0aGlzIGlzIGdvaW5nIHRvIGJlIGEgY3ljbGljYWwgZGVwZW5kYW5jeSwgdXNlIHRoZSBvcmlnaW5hbCBvYmplY3QsIGRvbid0IG1ha2UgYSBjb3B5XG4gICAgICBlbHNlIGlmKHZhbCAmJiB2YWwuaXNEYXRhICYmIHRhcmdldC5oYXNQYXJlbnQodmFsKSkgdmFsID0gdmFsO1xuXG4gICAgICAvLyBJZiB1cGRhdGluZyBhbiBleGlzdGluZyBvYmplY3Qgd2l0aCBpdHMgcmVzcGVjdGl2ZSBkYXRhIHR5cGUsIGxldCBCYWNrYm9uZSBoYW5kbGUgdGhlIG1lcmdlXG4gICAgICBlbHNlIGlmKCBkZXN0aW5hdGlvbi5pc0NvbXB1dGVkUHJvcGVydHkgfHxcbiAgICAgICAgICAgICAgKCBkZXN0aW5hdGlvbi5pc0NvbGxlY3Rpb24gJiYgKCBfLmlzQXJyYXkodmFsKSB8fCB2YWwuaXNDb2xsZWN0aW9uICkpIHx8XG4gICAgICAgICAgICAgICggZGVzdGluYXRpb24uaXNNb2RlbCAmJiAoIF8uaXNPYmplY3QodmFsKSB8fCB2YWwuaXNNb2RlbCApKSl7XG4gICAgICAgIHJldHVybiBkZXN0aW5hdGlvbi5zZXQodmFsLCBvcHRpb25zKTtcbiAgICAgIH1cblxuXG4gICAgICAvLyBJZiB0aGlzIHZhbHVlIGlzIGEgTW9kZWwgb3IgQ29sbGVjdGlvbiwgY3JlYXRlIGEgbmV3IGluc3RhbmNlIG9mIGl0IHVzaW5nIGl0cyBjb25zdHJ1Y3RvclxuICAgICAgLy8gVGhpcyB3aWxsIGtlZXAgdGhlIGRlZmF1bHRzIGZyb20gdGhlIG9yaWdpbmFsLCBidXQgbWFrZSBhIG5ldyBjb3B5IHNvIG1lbW9yeSBpc250IHNoYXJlZCBiZXR3ZWVuIGRhdGEgb2JqZWN0c1xuICAgICAgLy8gVGhpcyB3aWxsIGFsc28ga2VlcCB0aGlzIGluc3RhbmNlIG9mIHRoZSBvYmplY3QgaW4gc3luYyB3aXRoIGl0cyBvcmlnaW5hbFxuICAgICAgLy8gVE9ETzogVGhpcyB3aWxsIG92ZXJyaWRlIGRlZmF1bHRzIHNldCBieSB0aGlzIG1vZGVsIGluIGZhdm9yIG9mIHRoZSBwYXNzZWQgaW4gbW9kZWwuIERvIGRlZXAgZGVmYXVsdHMgaGVyZS5cbiAgICAgIGVsc2UgaWYodmFsLmlzRGF0YSAmJiBvcHRpb25zLmNsb25lICE9PSBmYWxzZSkgdmFsID0gbmV3IHZhbC5jb25zdHJ1Y3Rvcih2YWwuYXR0cmlidXRlcyB8fCB2YWwubW9kZWxzLCBsaW5lYWdlKTtcblxuICAgICAgLy8gSWYgdGhpcyB2YWx1ZSBpcyBhbiBBcnJheSwgdHVybiBpdCBpbnRvIGEgY29sbGVjdGlvblxuICAgICAgZWxzZSBpZihfLmlzQXJyYXkodmFsKSkgdmFsID0gbmV3IFJlYm91bmQuQ29sbGVjdGlvbih2YWwsIGxpbmVhZ2UpOyAvLyBUT0RPOiBSZW1vdmUgZ2xvYmFsIHJlZmVyYW5jZVxuXG4gICAgICAvLyBJZiB0aGlzIHZhbHVlIGlzIGEgT2JqZWN0LCB0dXJuIGl0IGludG8gYSBtb2RlbFxuICAgICAgZWxzZSBpZihfLmlzT2JqZWN0KHZhbCkpIHZhbCA9IG5ldyBNb2RlbCh2YWwsIGxpbmVhZ2UpO1xuXG4gICAgICAvLyBFbHNlIHZhbCBpcyBhIHByaW1pdGl2ZSB2YWx1ZSwgc2V0IGl0IGFjY29yZGluZ2x5XG5cbiAgICAgIC8vIElmIHZhbCBpcyBhIGRhdGEgb2JqZWN0LCBsZXQgdGhpcyBvYmplY3Qga25vdyBpdCBpcyBub3cgYSBwYXJlbnRcbiAgICAgIHRoaXMuX2hhc0FuY2VzdHJ5ID0gKHZhbCAmJiB2YWwuaXNEYXRhIHx8IGZhbHNlKTtcblxuICAgICAgLy8gUmVwbGFjZSB0aGUgZXhpc3RpbmcgdmFsdWVcbiAgICAgIHJldHVybiBCYWNrYm9uZS5Nb2RlbC5wcm90b3R5cGUuc2V0LmNhbGwodGFyZ2V0LCBhdHRyLCB2YWwsIG9wdGlvbnMpOyAvLyBUT0RPOiBFdmVudCBjbGVhbnVwIHdoZW4gcmVwbGFjaW5nIGEgbW9kZWwgb3IgY29sbGVjdGlvbiB3aXRoIGFub3RoZXIgdmFsdWVcblxuICAgIH0sIHRoaXMpO1xuXG4gICAgcmV0dXJuIHRoaXM7XG5cbiAgfSxcblxuICB0b0pTT046IGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKHRoaXMuX2lzU2VyaWFsaXppbmcpIHJldHVybiB0aGlzLmlkIHx8IHRoaXMuY2lkO1xuICAgICAgdGhpcy5faXNTZXJpYWxpemluZyA9IHRydWU7XG4gICAgICB2YXIganNvbiA9IF8uY2xvbmUodGhpcy5hdHRyaWJ1dGVzKTtcbiAgICAgIF8uZWFjaChqc29uLCBmdW5jdGlvbih2YWx1ZSwgbmFtZSkge1xuICAgICAgICAgIGlmKCBfLmlzTnVsbCh2YWx1ZSkgfHwgXy5pc1VuZGVmaW5lZCh2YWx1ZSkgKXsgcmV0dXJuOyB9XG4gICAgICAgICAgXy5pc0Z1bmN0aW9uKHZhbHVlLnRvSlNPTikgJiYgKGpzb25bbmFtZV0gPSB2YWx1ZS50b0pTT04oKSk7XG4gICAgICB9KTtcbiAgICAgIHRoaXMuX2lzU2VyaWFsaXppbmcgPSBmYWxzZTtcbiAgICAgIHJldHVybiBqc29uO1xuICB9XG5cbn0pO1xuXG5leHBvcnQgZGVmYXVsdCBNb2RlbDsiLCJpbXBvcnQgRE9NSGVscGVyIGZyb20gXCJtb3JwaC9kb20taGVscGVyXCI7XG5pbXBvcnQgaG9va3MgZnJvbSBcInJlYm91bmQtcnVudGltZS9ob29rc1wiO1xuaW1wb3J0IGhlbHBlcnMgZnJvbSBcInJlYm91bmQtcnVudGltZS9oZWxwZXJzXCI7XG5cbnZhciBlbnYgPSB7XG4gIHJlZ2lzdGVyUGFydGlhbDogaGVscGVycy5yZWdpc3RlclBhcnRpYWwsXG4gIHJlZ2lzdGVySGVscGVyOiBoZWxwZXJzLnJlZ2lzdGVySGVscGVyLFxuICBoZWxwZXJzOiBoZWxwZXJzLmhlbHBlcnMsXG4gIGhvb2tzOiBob29rc1xufTtcblxuZW52Lmh5ZHJhdGUgPSBmdW5jdGlvbiBoeWRyYXRlKHNwZWMsIG9wdGlvbnMpe1xuICAvLyBSZXR1cm4gYSB3cmFwcGVyIGZ1bmN0aW9uIHRoYXQgd2lsbCBtZXJnZSB1c2VyIHByb3ZpZGVkIGhlbHBlcnMgYW5kIGhvb2tzIHdpdGggb3VyIGRlZmF1bHRzXG4gIHJldHVybiBmdW5jdGlvbihkYXRhLCBvcHRpb25zKXtcbiAgICAvLyBFbnN1cmUgd2UgaGF2ZSBhIHdlbGwtZm9ybWVkIG9iamVjdCBhcyB2YXIgb3B0aW9uc1xuICAgIHZhciBlbnYgPSBvcHRpb25zIHx8IHt9LFxuICAgICAgICBjb250ZXh0RWxlbWVudCA9IGRhdGEuZWwgfHwgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50O1xuICAgIGVudi5oZWxwZXJzID0gZW52LmhlbHBlcnMgfHwge307XG4gICAgZW52Lmhvb2tzID0gZW52Lmhvb2tzIHx8IHt9O1xuICAgIGVudi5kb20gPSBlbnYuZG9tIHx8IG5ldyBET01IZWxwZXIoKTtcblxuICAgIC8vIE1lcmdlIG91ciBkZWZhdWx0IGhlbHBlcnMgYW5kIGhvb2tzIHdpdGggdXNlciBwcm92aWRlZCBoZWxwZXJzXG4gICAgZW52LmhlbHBlcnMgPSBfLmRlZmF1bHRzKGVudi5oZWxwZXJzLCBoZWxwZXJzLmhlbHBlcnMpO1xuICAgIGVudi5ob29rcyA9IF8uZGVmYXVsdHMoZW52Lmhvb2tzLCBob29rcyk7XG5cbiAgICAvLyBDYWxsIG91ciBmdW5jIHdpdGggbWVyZ2VkIGhlbHBlcnMgYW5kIGhvb2tzXG4gICAgcmV0dXJuIHNwZWMucmVuZGVyKGRhdGEsIGVudiwgY29udGV4dEVsZW1lbnQpO1xuICB9O1xufTsgXG5cbmV4cG9ydCBkZWZhdWx0IGVudjsiLCJpbXBvcnQgTW9kZWwgZnJvbSBcInJlYm91bmQtZGF0YS9tb2RlbFwiO1xuaW1wb3J0IENvbGxlY3Rpb24gZnJvbSBcInJlYm91bmQtZGF0YS9jb2xsZWN0aW9uXCI7XG5pbXBvcnQgQ29tcHV0ZWRQcm9wZXJ0eSBmcm9tIFwicmVib3VuZC1kYXRhL2NvbXB1dGVkLXByb3BlcnR5XCI7XG5pbXBvcnQgJCBmcm9tIFwicmVib3VuZC1ydW50aW1lL3V0aWxzXCI7XG5cblxudmFyIHNoYXJlZE1ldGhvZHMgPSB7XG5cbiAgcHJvcGFnYXRlRXZlbnQ6IGZ1bmN0aW9uKHR5cGUsIG1vZGVsKXtcbiAgICBpZih0aGlzLl9fcGFyZW50X18gPT09IHRoaXMpIHJldHVybjtcbiAgICBpZih0eXBlLmluZGV4T2YoJ2NoYW5nZTonKSA9PT0gMCAmJiBtb2RlbC5pc01vZGVsKXtcbiAgICAgIHZhciBrZXksXG4gICAgICAgICAgcGF0aCA9IG1vZGVsLl9fcGF0aCgpLnJlcGxhY2UodGhpcy5fX3BhcmVudF9fLl9fcGF0aCgpLCAnJykucmVwbGFjZSgvXlxcLi8sICcnKSxcbiAgICAgICAgICBjaGFuZ2VkID0gbW9kZWwuY2hhbmdlZEF0dHJpYnV0ZXMoKTtcbiAgICAgIGZvcihrZXkgaW4gY2hhbmdlZCl7XG4gICAgICAgIGFyZ3VtZW50c1swXSA9ICgnY2hhbmdlOicgKyBwYXRoICsgKHBhdGggJiYgJy4nKSArIGtleSk7IC8vIGpzaGludCBpZ25vcmU6bGluZVxuICAgICAgICB0aGlzLl9fcGFyZW50X18udHJpZ2dlci5hcHBseSh0aGlzLl9fcGFyZW50X18sIGFyZ3VtZW50cyk7XG4gICAgICB9XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHRoaXMuX19wYXJlbnRfXy50cmlnZ2VyLmFwcGx5KHRoaXMuX19wYXJlbnRfXywgYXJndW1lbnRzKTtcbiAgfSxcblxuICBzZXRQYXJlbnQ6IGZ1bmN0aW9uKHBhcmVudCl7XG5cbiAgICBpZih0aGlzLl9fcGFyZW50X18pe1xuICAgICAgdGhpcy5vZmYoJ2FsbCcsIHRoaXMucHJvcGFnYXRlKTtcbiAgICB9XG5cbiAgICB0aGlzLl9fcGFyZW50X18gPSBwYXJlbnQ7XG4gICAgdGhpcy5faGFzQW5jZXN0cnkgPSB0cnVlO1xuXG4gICAgLy8gSWYgcGFyZW50IGlzIG5vdCBzZWxmLCBwcm9wYWdhdGUgYWxsIGV2ZW50cyB1cFxuICAgIGlmKHBhcmVudCAhPT0gdGhpcykgdGhpcy5vbignYWxsJywgcGFyZW50LnByb3BhZ2F0ZUV2ZW50KTtcblxuICAgIHJldHVybiBwYXJlbnQ7XG5cbiAgfSxcblxuICAvLyBUT0RPOiBJIGRvbnQgbGlrZSB0aGlzIHJlY3Vyc2l2ZWx5IHNldHRpbmcgZWxlbWVudHMgcm9vdCB3aGVuIG9uZSBlbGVtZW50J3Mgcm9vdCBjaGFuZ2VzLiBGaXggdGhpcy5cbiAgc2V0Um9vdDogZnVuY3Rpb24gKHJvb3Qpe1xuICAgIHZhciBvYmogPSB0aGlzO1xuICAgIG9iai5fX3Jvb3RfXyA9IHJvb3Q7XG4gICAgdmFyIHZhbCA9IG9iai5tb2RlbHMgfHwgIG9iai5hdHRyaWJ1dGVzIHx8IG9iai5jYWNoZTtcbiAgICBfLmVhY2godmFsLCBmdW5jdGlvbih2YWx1ZSwga2V5KXtcbiAgICAgIGlmKHZhbHVlICYmIHZhbHVlLmlzRGF0YSl7XG4gICAgICAgIHZhbHVlLnNldFJvb3Qocm9vdCk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIHJvb3Q7XG4gIH0sXG5cbiAgaGFzUGFyZW50OiBmdW5jdGlvbihvYmope1xuICAgIHZhciB0bXAgPSB0aGlzO1xuICAgIHdoaWxlKHRtcCAhPT0gb2JqKXtcbiAgICAgIHRtcCA9IHRtcC5fX3BhcmVudF9fO1xuICAgICAgaWYoXy5pc1VuZGVmaW5lZCh0bXApKXsgcmV0dXJuIGZhbHNlOyB9XG4gICAgICBpZih0bXAgPT09IG9iail7IHJldHVybiB0cnVlOyB9XG4gICAgICBpZih0bXAuX19wYXJlbnRfXyA9PT0gdG1wKXsgcmV0dXJuIGZhbHNlOyB9XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xuICB9LFxuXG4gIGRlaW5pdGlhbGl6ZTogZnVuY3Rpb24gKCkge1xuXG4gICAgLy8gZGVpbml0aWFsaXplIGN1cnJlbnQgY2xhc3NcblxuICAgIC8vIHVuZGVsZWdhdGUgZXZlbnRzLi4oZXZlbnRzIHNwZWNpZmllZCBhcyBwYXJ0IG9mIGV2ZW50Ont9KVxuICAgIGlmICh0aGlzLnVuZGVsZWdhdGVFdmVudHMpIHtcbiAgICAgIHRoaXMudW5kZWxlZ2F0ZUV2ZW50cygpO1xuICAgIH1cblxuICAgIC8vIHN0b3AgbGlzdGVuaW5nIG1vZGVsIGV2ZW50c1xuICAgIGlmICh0aGlzLnN0b3BMaXN0ZW5pbmcpIHtcbiAgICAgIHRoaXMuc3RvcExpc3RlbmluZygpO1xuICAgIH1cblxuICAgIC8vIHVuYmluZCBldmVudHNcbiAgICBpZiAodGhpcy5vZmYpIHtcbiAgICAgIHRoaXMub2ZmKCk7XG4gICAgfVxuXG4gICAgZGVsZXRlIHRoaXMuX19wYXJlbnRfXztcbiAgICBkZWxldGUgdGhpcy5fX3Jvb3RfXztcbiAgICBkZWxldGUgdGhpcy5fX3BhdGg7XG5cbiAgICAvLyBpZiBkYXRhIGhhcyBhIGRvbSBlbGVtZW50IGFzc29jaWF0ZWQgd2l0aCBpdCwgcmVtb3ZlIGFsbCBkb20gZXZlbnRzIGFuZCB0aGUgZG9tIHJlZmVyYW5jZVxuICAgIGlmKHRoaXMuZWwpe1xuXG4gICAgICBfLmVhY2godGhpcy5lbC5fX2xpc3RlbmVycywgZnVuY3Rpb24oaGFuZGxlciwgZXZlbnRUeXBlKXtcbiAgICAgICAgaWYgKHRoaXMuZWwucmVtb3ZlRXZlbnRMaXN0ZW5lcil7IHRoaXMuZWwucmVtb3ZlRXZlbnRMaXN0ZW5lcihldmVudFR5cGUsIGhhbmRsZXIsIGZhbHNlKTsgfVxuICAgICAgICBpZiAodGhpcy5lbC5kZXRhY2hFdmVudCl7IHRoaXMuZWwuZGV0YWNoRXZlbnQoJ29uJytldmVudFR5cGUsIGhhbmRsZXIpOyB9XG4gICAgICB9LCB0aGlzKTtcblxuICAgICAgLy8gUmVtb3ZlIGFsbCBldmVudCBkZWxlZ2F0ZXNcbiAgICAgIGRlbGV0ZSB0aGlzLmVsLl9fbGlzdGVuZXJzO1xuICAgICAgZGVsZXRlIHRoaXMuZWwuX19ldmVudHM7XG5cbiAgICAgIC8vIFJlY3Vyc2l2ZWx5IHJlbW92ZSBlbGVtZW50IGxhenl2YWx1ZXNcbiAgICAgICQodGhpcy5lbCkud2Fsa1RoZURPTShmdW5jdGlvbihlbCl7XG4gICAgICAgIGlmKGVsLl9fbGF6eVZhbHVlICYmIGVsLl9fbGF6eVZhbHVlLmRlc3Ryb3koKSl7XG4gICAgICAgICAgbi5fX2xhenlWYWx1ZS5kZXN0cm95KCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuXG4gICAgICAvLyBSZW1vdmUgZWxlbWVudCByZWZlcmFuY2VzXG4gICAgICBkZWxldGUgdGhpcy4kZWw7XG4gICAgICBkZWxldGUgdGhpcy5lbDtcbiAgICB9XG5cbiAgICAvLyBNYXJrIGl0IGFzIGRlaW5pdGlhbGl6ZWRcbiAgICB0aGlzLmRlaW5pdGlhbGl6ZWQgPSB0cnVlO1xuICAgIC8vIGRlaW5pdGlhbGl6ZSBzdWJjbGFzc2VzXG4gICAgaWYodGhpcy5kYXRhICYmIHRoaXMuZGF0YS5kZWluaXRpYWxpemUpe1xuICAgICAgdGhpcy5kYXRhLmRlaW5pdGlhbGl6ZSgpO1xuICAgIH1cblxuICAgIC8vIERlLWluaXQgYWxsIG1vZGVscyBpbiBhIGNvbGxlY3Rpb25cbiAgICBfLmVhY2godGhpcy5tb2RlbHMsIGZ1bmN0aW9uICh2YWx1ZSwgaW5kZXgpIHtcbiAgICAgIGlmICh2YWx1ZSAmJiB2YWx1ZS5kZWluaXRpYWxpemUpIHtcbiAgICAgICAgdmFsdWUuZGVpbml0aWFsaXplKCk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICAvLyBEZS1pbml0IGFsbCBhdHRyaWJ1dGVzIGluIGEgbW9kZWxcbiAgICBfLmVhY2godGhpcy5hdHRyaWJ1dGVzLCBmdW5jdGlvbiAodmFsdWUsIGluZGV4KSB7XG4gICAgICBpZiAodmFsdWUgJiYgdmFsdWUuZGVpbml0aWFsaXplKSB7XG4gICAgICAgIHZhbHVlLmRlaW5pdGlhbGl6ZSgpO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgLy8gRGUtaW5pdCBjb21wdXRlZCBwcm9lcHJ0aWVzJyBjYWNoZSBvYmplY3RzXG4gICAgaWYodGhpcy5jYWNoZSl7XG4gICAgICB0aGlzLmNhY2hlLmNvbGxlY3Rpb24uZGVpbml0aWFsaXplKCk7XG4gICAgICB0aGlzLmNhY2hlLm1vZGVsLmRlaW5pdGlhbGl6ZSgpO1xuICAgIH1cblxuICAgIC8vIGNsZWFuIHVwIHJlZmVyZW5jZXNcbiAgICB0aGlzLl9fb2JzZXJ2ZXJzID0ge307XG4gICAgLy8gdGhpcy5tb2RlbHMgPSBbXTtcbiAgICB0aGlzLmRhdGEgPSB7fTtcbiAgICAvLyB0aGlzLmF0dHJpYnV0ZXMgPSB7fTtcblxuICB9XG59O1xuXG5fLmV4dGVuZChNb2RlbC5wcm90b3R5cGUsIHNoYXJlZE1ldGhvZHMpO1xuXy5leHRlbmQoQ29sbGVjdGlvbi5wcm90b3R5cGUsIHNoYXJlZE1ldGhvZHMpO1xuXy5leHRlbmQoQ29tcHV0ZWRQcm9wZXJ0eS5wcm90b3R5cGUsIHNoYXJlZE1ldGhvZHMpO1xuXG5cbmV4cG9ydCB7IE1vZGVsLCBDb2xsZWN0aW9uLCBDb21wdXRlZFByb3BlcnR5IH07IiwiaW1wb3J0IExhenlWYWx1ZSBmcm9tIFwicmVib3VuZC1ydW50aW1lL2xhenktdmFsdWVcIjtcbmltcG9ydCAkIGZyb20gXCJyZWJvdW5kLXJ1bnRpbWUvdXRpbHNcIjtcblxuXG52YXIgaGVscGVycyAgPSB7fSxcbiAgICBwYXJ0aWFscyA9IHt9O1xuXG5oZWxwZXJzLnJlZ2lzdGVyUGFydGlhbCA9IGZ1bmN0aW9uKG5hbWUsIGZ1bmMpe1xuICBpZihmdW5jICYmIGZ1bmMuaXNIVE1MQmFycyAmJiB0eXBlb2YgbmFtZSA9PT0gJ3N0cmluZycpe1xuICAgIHBhcnRpYWxzW25hbWVdID0gZnVuYztcbiAgfVxufTtcblxuLy8gbG9va3VwSGVscGVyIHJldHVybnMgdGhlIGdpdmVuIGZ1bmN0aW9uIGZyb20gdGhlIGhlbHBlcnMgb2JqZWN0LiBNYW51YWwgY2hlY2tzIHByZXZlbnQgdXNlciBmcm9tIG92ZXJyaWRpbmcgcmVzZXJ2ZWQgd29yZHMuXG5oZWxwZXJzLmxvb2t1cEhlbHBlciA9IGZ1bmN0aW9uKG5hbWUsIGVudiwgY29udGV4dCkge1xuXG4gIGVudiA9IGVudiB8fCB7fTtcblxuICBuYW1lID0gJC5zcGxpdFBhdGgobmFtZSlbMF07XG5cbiAgLy8gSWYgYSByZXNlcnZlZCBoZWxwZXJzLCByZXR1cm4gaXRcbiAgaWYobmFtZSA9PT0gJ2F0dHJpYnV0ZScpIHsgcmV0dXJuIHRoaXMuYXR0cmlidXRlOyB9XG4gIGlmKG5hbWUgPT09ICdpZicpIHsgcmV0dXJuIHRoaXMuaWY7IH1cbiAgaWYobmFtZSA9PT0gJ3VubGVzcycpIHsgcmV0dXJuIHRoaXMudW5sZXNzOyB9XG4gIGlmKG5hbWUgPT09ICdlYWNoJykgeyByZXR1cm4gdGhpcy5lYWNoOyB9XG4gIGlmKG5hbWUgPT09ICd3aXRoJykgeyByZXR1cm4gdGhpcy53aXRoOyB9XG4gIGlmKG5hbWUgPT09ICdwYXJ0aWFsJykgeyByZXR1cm4gdGhpcy5wYXJ0aWFsOyB9XG4gIGlmKG5hbWUgPT09ICdsZW5ndGgnKSB7IHJldHVybiB0aGlzLmxlbmd0aDsgfVxuICBpZihuYW1lID09PSAnb24nKSB7IHJldHVybiB0aGlzLm9uOyB9XG5cbiAgLy8gSWYgbm90IGEgcmVzZXJ2ZWQgaGVscGVyLCBjaGVjayBlbnYsIHRoZW4gZ2xvYmFsIGhlbHBlcnMsIGVsc2UgcmV0dXJuIGZhbHNlXG4gIHJldHVybiAoZW52LmhlbHBlcnMgJiYgXy5pc09iamVjdChjb250ZXh0KSAmJiBfLmlzT2JqZWN0KGVudi5oZWxwZXJzW2NvbnRleHQuY2lkXSkgJiYgZW52LmhlbHBlcnNbY29udGV4dC5jaWRdW25hbWVdKSB8fCBoZWxwZXJzW25hbWVdIHx8IGZhbHNlO1xufTtcblxuaGVscGVycy5yZWdpc3RlckhlbHBlciA9IGZ1bmN0aW9uKG5hbWUsIGNhbGxiYWNrLCBwYXJhbXMpe1xuICBpZighXy5pc1N0cmluZyhuYW1lKSl7XG4gICAgY29uc29sZS5lcnJvcignTmFtZSBwcm92aWRlZCB0byByZWdpc3RlckhlbHBlciBtdXN0IGJlIGEgc3RyaW5nIScpO1xuICAgIHJldHVybjtcbiAgfVxuICBpZighXy5pc0Z1bmN0aW9uKGNhbGxiYWNrKSl7XG4gICAgY29uc29sZS5lcnJvcignQ2FsbGJhY2sgcHJvdmlkZWQgdG8gcmVnaWVySGVscGVyIG11c3QgYmUgYSBmdW5jdGlvbiEnKTtcbiAgICByZXR1cm47XG4gIH1cbiAgaWYoaGVscGVycy5sb29rdXBIZWxwZXIobmFtZSkpe1xuICAgIGNvbnNvbGUuZXJyb3IoJ0EgaGVscGVyIGNhbGxlZCBcIicgKyBuYW1lICsgJ1wiIGlzIGFscmVhZHkgcmVnaXN0ZXJlZCEnKTtcbiAgICByZXR1cm47XG4gIH1cblxuICBwYXJhbXMgPSAoXy5pc0FycmF5KHBhcmFtcykpID8gcGFyYW1zIDogW3BhcmFtc107XG4gIGNhbGxiYWNrLl9fcGFyYW1zID0gcGFyYW1zO1xuXG4gIGhlbHBlcnNbbmFtZV0gPSBjYWxsYmFjaztcblxufTtcblxuLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbiAgICAgICAgRGVmYXVsdCBoZWxwZXJzXG4qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cblxuaGVscGVycy5vbiA9IGZ1bmN0aW9uKHBhcmFtcywgaGFzaCwgb3B0aW9ucywgZW52KXtcbiAgdmFyIGksIGNhbGxiYWNrLCBkZWxlZ2F0ZSwgZWxlbWVudCxcbiAgICAgIGV2ZW50TmFtZSA9IHBhcmFtc1swXSxcbiAgICAgIGxlbiA9IHBhcmFtcy5sZW5ndGgsXG4gICAgICBkYXRhID0gaGFzaDtcblxuICAvLyBCeSBkZWZhdWx0IGV2ZXJ5dGhpbmcgaXMgZGVsZWdhdGVkIG9uIHRoZSBwYXJlbnQgY29tcG9uZW50XG4gIGlmKGxlbiA9PT0gMil7XG4gICAgY2FsbGJhY2sgPSBwYXJhbXNbMV07XG4gICAgZGVsZWdhdGUgPSBvcHRpb25zLmVsZW1lbnQ7XG4gICAgZWxlbWVudCA9ICh0aGlzLmVsIHx8IG9wdGlvbnMuZWxlbWVudCk7XG4gIH1cbiAgLy8gSWYgYSBzZWxlY3RvciBpcyBwcm92aWRlZCwgZGVsZWdhdGUgb24gdGhlIGhlbHBlcidzIGVsZW1lbnRcbiAgZWxzZSBpZihsZW4gPT09IDMpe1xuICAgIGNhbGxiYWNrID0gcGFyYW1zWzJdO1xuICAgIGRlbGVnYXRlID0gcGFyYW1zWzFdO1xuICAgIGVsZW1lbnQgPSBvcHRpb25zLmVsZW1lbnQ7XG4gIH1cblxuICAvLyBBdHRhY2ggZXZlbnRcbiAgJChlbGVtZW50KS5vbihldmVudE5hbWUsIGRlbGVnYXRlLCBkYXRhLCBmdW5jdGlvbihldmVudCl7XG4gICAgZXZlbnQuY29udGV4dCA9IG9wdGlvbnMuY29udGV4dDtcbiAgICByZXR1cm4gb3B0aW9ucy5oZWxwZXJzLl9fY2FsbE9uQ29tcG9uZW50KGNhbGxiYWNrLCBldmVudCk7XG4gIH0pO1xufTtcblxuaGVscGVycy5sZW5ndGggPSBmdW5jdGlvbihwYXJhbXMsIGhhc2gsIG9wdGlvbnMsIGVudil7XG4gICAgcmV0dXJuIHBhcmFtc1swXSAmJiBwYXJhbXNbMF0ubGVuZ3RoIHx8IDA7XG59O1xuXG5oZWxwZXJzLmlmID0gZnVuY3Rpb24ocGFyYW1zLCBoYXNoLCBvcHRpb25zLCBlbnYpe1xuXG4gIHZhciBjb25kaXRpb24gPSBwYXJhbXNbMF07XG5cbiAgaWYoY29uZGl0aW9uID09PSB1bmRlZmluZWQpe1xuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgaWYoY29uZGl0aW9uLmlzTW9kZWwpe1xuICAgIGNvbmRpdGlvbiA9IHRydWU7XG4gIH1cblxuICAvLyBJZiBvdXIgY29uZGl0aW9uIGlzIGFuIGFycmF5LCBoYW5kbGUgcHJvcGVybHlcbiAgaWYoXy5pc0FycmF5KGNvbmRpdGlvbikgfHwgY29uZGl0aW9uLmlzQ29sbGVjdGlvbil7XG4gICAgY29uZGl0aW9uID0gY29uZGl0aW9uLmxlbmd0aCA/IHRydWUgOiBmYWxzZTtcbiAgfVxuXG4gIGlmKGNvbmRpdGlvbiA9PT0gJ3RydWUnKXsgY29uZGl0aW9uID0gdHJ1ZTsgfVxuICBpZihjb25kaXRpb24gPT09ICdmYWxzZScpeyBjb25kaXRpb24gPSBmYWxzZTsgfVxuXG4gIC8vIElmIG1vcmUgdGhhbiBvbmUgcGFyYW0sIHRoaXMgaXMgbm90IGEgYmxvY2sgaGVscGVyLiBFdmFsIGFzIHN1Y2guXG4gIGlmKHBhcmFtcy5sZW5ndGggPiAxKXtcbiAgICByZXR1cm4gKGNvbmRpdGlvbikgPyBwYXJhbXNbMV0gOiAoIHBhcmFtc1syXSB8fCAnJyk7XG4gIH1cblxuICAvLyBDaGVjayBvdXIgY2FjaGUuIElmIHRoZSB2YWx1ZSBoYXNuJ3QgYWN0dWFsbHkgY2hhbmdlZCwgZG9uJ3QgZXZhbHVhdGUuIEltcG9ydGFudCBmb3IgcmUtcmVuZGVyaW5nIG9mICNlYWNoIGhlbHBlcnMuXG4gIGlmKG9wdGlvbnMucGxhY2Vob2xkZXIuX19pZkNhY2hlID09PSBjb25kaXRpb24pe1xuICAgIHJldHVybiBudWxsOyAvLyBSZXR1cm4gbnVsbCBwcmV2ZW50J3MgcmUtcmVuZGluZyBvZiBvdXIgcGxhY2Vob2xkZXIuXG4gIH1cblxuICBvcHRpb25zLnBsYWNlaG9sZGVyLl9faWZDYWNoZSA9IGNvbmRpdGlvbjtcblxuICAvLyBSZW5kZXIgdGhlIGFwcm9wcmVhdGUgYmxvY2sgc3RhdGVtZW50XG4gIGlmKGNvbmRpdGlvbiAmJiBvcHRpb25zLnRlbXBsYXRlKXtcbiAgICByZXR1cm4gb3B0aW9ucy50ZW1wbGF0ZS5yZW5kZXIob3B0aW9ucy5jb250ZXh0LCBvcHRpb25zLCAob3B0aW9ucy5tb3JwaC5jb250ZXh0dWFsRWxlbWVudCB8fCBvcHRpb25zLm1vcnBoLmVsZW1lbnQpKTtcbiAgfVxuICBlbHNlIGlmKCFjb25kaXRpb24gJiYgb3B0aW9ucy5pbnZlcnNlKXtcbiAgICByZXR1cm4gb3B0aW9ucy5pbnZlcnNlLnJlbmRlcihvcHRpb25zLmNvbnRleHQsIG9wdGlvbnMsIChvcHRpb25zLm1vcnBoLmNvbnRleHR1YWxFbGVtZW50IHx8IG9wdGlvbnMubW9ycGguZWxlbWVudCkpO1xuICB9XG5cbiAgcmV0dXJuICcnO1xufTtcblxuXG4vLyBUT0RPOiBQcm94eSB0byBpZiBoZWxwZXIgd2l0aCBpbnZlcnRlZCBwYXJhbXNcbmhlbHBlcnMudW5sZXNzID0gZnVuY3Rpb24ocGFyYW1zLCBoYXNoLCBvcHRpb25zLCBlbnYpe1xuICB2YXIgY29uZGl0aW9uID0gcGFyYW1zWzBdO1xuXG4gIGlmKGNvbmRpdGlvbiA9PT0gdW5kZWZpbmVkKXtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIGlmKGNvbmRpdGlvbi5pc01vZGVsKXtcbiAgICBjb25kaXRpb24gPSB0cnVlO1xuICB9XG5cbiAgLy8gSWYgb3VyIGNvbmRpdGlvbiBpcyBhbiBhcnJheSwgaGFuZGxlIHByb3Blcmx5XG4gIGlmKF8uaXNBcnJheShjb25kaXRpb24pIHx8IGNvbmRpdGlvbi5pc0NvbGxlY3Rpb24pe1xuICAgIGNvbmRpdGlvbiA9IGNvbmRpdGlvbi5sZW5ndGggPyB0cnVlIDogZmFsc2U7XG4gIH1cblxuICAvLyBJZiBtb3JlIHRoYW4gb25lIHBhcmFtLCB0aGlzIGlzIG5vdCBhIGJsb2NrIGhlbHBlci4gRXZhbCBhcyBzdWNoLlxuICBpZihwYXJhbXMubGVuZ3RoID4gMSl7XG4gICAgcmV0dXJuICghY29uZGl0aW9uKSA/IHBhcmFtc1sxXSA6ICggcGFyYW1zWzJdIHx8ICcnKTtcbiAgfVxuXG4gIC8vIENoZWNrIG91ciBjYWNoZS4gSWYgdGhlIHZhbHVlIGhhc24ndCBhY3R1YWxseSBjaGFuZ2VkLCBkb24ndCBldmFsdWF0ZS4gSW1wb3J0YW50IGZvciByZS1yZW5kZXJpbmcgb2YgI2VhY2ggaGVscGVycy5cbiAgaWYob3B0aW9ucy5wbGFjZWhvbGRlci5fX3VubGVzc0NhY2hlID09PSBjb25kaXRpb24pe1xuICAgIHJldHVybiBudWxsOyAvLyBSZXR1cm4gbnVsbCBwcmV2ZW50J3MgcmUtcmVuZGluZyBvZiBvdXIgcGxhY2Vob2xkZXIuXG4gIH1cblxuICBvcHRpb25zLnBsYWNlaG9sZGVyLl9fdW5sZXNzQ2FjaGUgPSBjb25kaXRpb247XG5cbiAgLy8gUmVuZGVyIHRoZSBhcHJvcHJlYXRlIGJsb2NrIHN0YXRlbWVudFxuICBpZighY29uZGl0aW9uICYmICBvcHRpb25zLnRlbXBsYXRlKXtcbiAgICByZXR1cm4gb3B0aW9ucy50ZW1wbGF0ZS5yZW5kZXIob3B0aW9ucy5jb250ZXh0LCBvcHRpb25zLCAob3B0aW9ucy5tb3JwaC5jb250ZXh0dWFsRWxlbWVudCB8fCBvcHRpb25zLm1vcnBoLmVsZW1lbnQpKTtcbiAgfVxuICBlbHNlIGlmKGNvbmRpdGlvbiAmJiBvcHRpb25zLmludmVyc2Upe1xuICAgIHJldHVybiBvcHRpb25zLmludmVyc2UucmVuZGVyKG9wdGlvbnMuY29udGV4dCwgb3B0aW9ucywgKG9wdGlvbnMubW9ycGguY29udGV4dHVhbEVsZW1lbnQgfHwgb3B0aW9ucy5tb3JwaC5lbGVtZW50KSk7XG4gIH1cblxuICByZXR1cm4gJyc7XG59O1xuXG4vLyBHaXZlbiBhbiBhcnJheSwgcHJlZGljYXRlIGFuZCBvcHRpb25hbCBleHRyYSB2YXJpYWJsZSwgZmluZHMgdGhlIGluZGV4IGluIHRoZSBhcnJheSB3aGVyZSBwcmVkaWNhdGUgaXMgdHJ1ZVxuZnVuY3Rpb24gZmluZEluZGV4KGFyciwgcHJlZGljYXRlLCBjaWQpIHtcbiAgaWYgKGFyciA9PSBudWxsKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignZmluZEluZGV4IGNhbGxlZCBvbiBudWxsIG9yIHVuZGVmaW5lZCcpO1xuICB9XG4gIGlmICh0eXBlb2YgcHJlZGljYXRlICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcigncHJlZGljYXRlIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuICB9XG4gIHZhciBsaXN0ID0gT2JqZWN0KGFycik7XG4gIHZhciBsZW5ndGggPSBsaXN0Lmxlbmd0aCA+Pj4gMDtcbiAgdmFyIHRoaXNBcmcgPSBhcmd1bWVudHNbMV07XG4gIHZhciB2YWx1ZTtcblxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgdmFsdWUgPSBsaXN0W2ldO1xuICAgIGlmIChwcmVkaWNhdGUuY2FsbCh0aGlzQXJnLCB2YWx1ZSwgaSwgbGlzdCwgY2lkKSkge1xuICAgICAgcmV0dXJuIGk7XG4gICAgfVxuICB9XG4gIHJldHVybiAtMTtcbn1cblxuaGVscGVycy5lYWNoID0gZnVuY3Rpb24ocGFyYW1zLCBoYXNoLCBvcHRpb25zLCBlbnYpe1xuXG4gIGlmKF8uaXNOdWxsKHBhcmFtc1swXSkgfHwgXy5pc1VuZGVmaW5lZChwYXJhbXNbMF0pKXsgY29uc29sZS53YXJuKCdVbmRlZmluZWQgdmFsdWUgcGFzc2VkIHRvIGVhY2ggaGVscGVyISBNYXliZSB0cnkgcHJvdmlkaW5nIGEgZGVmYXVsdCB2YWx1ZT8nLCBvcHRpb25zLmNvbnRleHQpOyByZXR1cm4gbnVsbDsgfVxuXG4gIHZhciB2YWx1ZSA9IChwYXJhbXNbMF0uaXNDb2xsZWN0aW9uKSA/IHBhcmFtc1swXS5tb2RlbHMgOiBwYXJhbXNbMF0sIC8vIEFjY2VwdHMgY29sbGVjdGlvbnMgb3IgYXJyYXlzXG4gICAgICBzdGFydCwgZW5kLCAvLyB1c2VkIGJlbG93IHRvIHJlbW92ZSB0cmFpbGluZyBqdW5rIG1vcnBocyBmcm9tIHRoZSBkb21cbiAgICAgIHBvc2l0aW9uLCAvLyBTdG9yZXMgdGhlIGl0ZXJhdGVkIGVsZW1lbnQncyBpbnRlZ2VyIHBvc2l0aW9uIGluIHRoZSBkb20gbGlzdFxuICAgICAgY3VycmVudE1vZGVsID0gZnVuY3Rpb24oZWxlbWVudCwgaW5kZXgsIGFycmF5LCBjaWQpe1xuICAgICAgICByZXR1cm4gZWxlbWVudC5jaWQgPT09IGNpZDsgLy8gUmV0dXJucyB0cnVlIGlmIGN1cnJlbnRseSBvYnNlcnZlZCBlbGVtZW50IGlzIHRoZSBjdXJyZW50IG1vZGVsLlxuICAgICAgfTtcblxuICAvLyBDcmVhdGUgb3VyIG1vcnBoIGFycmF5IGlmIGl0IGRvZXNudCBleGlzdFxuICBvcHRpb25zLnBsYWNlaG9sZGVyLm1vcnBocyA9IG9wdGlvbnMucGxhY2Vob2xkZXIubW9ycGhzIHx8IFtdO1xuXG4gIF8uZWFjaCh2YWx1ZSwgZnVuY3Rpb24ob2JqLCBrZXksIGxpc3Qpe1xuXG4gICAgaWYoIV8uaXNGdW5jdGlvbihvYmouc2V0KSl7IHJldHVybiBjb25zb2xlLmVycm9yKCdNb2RlbCAnLCBvYmosICdoYXMgbm8gbWV0aG9kIC5zZXQoKSEnKTsgfVxuXG4gICAgcG9zaXRpb24gPSBmaW5kSW5kZXgob3B0aW9ucy5wbGFjZWhvbGRlci5tb3JwaHMsIGN1cnJlbnRNb2RlbCwgb2JqLmNpZCk7XG5cbiAgICAvLyBUT0RPOiBUaGVzZSBuZWVkIHRvIGJlIHJlLWFkZGVkIGluIGFzIGRhdGEgYXR0cmlidXRlc1xuICAgIC8vIEV2ZW4gaWYgcmVuZGVyZWQgYWxyZWFkeSwgdXBkYXRlIGVhY2ggZWxlbWVudCdzIGluZGV4LCBrZXksIGZpcnN0IGFuZCBsYXN0IGluIGNhc2Ugb2Ygb3JkZXIgY2hhbmdlcyBvciBlbGVtZW50IHJlbW92YWxzXG4gICAgLy8gaWYoXy5pc0FycmF5KHZhbHVlKSl7XG4gICAgLy8gICBvYmouc2V0KHsnQGluZGV4Jzoga2V5LCAnQGZpcnN0JzogKGtleSA9PT0gMCksICdAbGFzdCc6IChrZXkgPT09IHZhbHVlLmxlbmd0aC0xKX0sIHtzaWxlbnQ6IHRydWV9KTtcbiAgICAvLyB9XG4gICAgLy9cbiAgICAvLyBpZighXy5pc0FycmF5KHZhbHVlKSAmJiBfLmlzT2JqZWN0KHZhbHVlKSl7XG4gICAgLy8gICBvYmouc2V0KHsnQGtleScgOiBrZXl9LCB7c2lsZW50OiB0cnVlfSk7XG4gICAgLy8gfVxuXG4gICAgLy8gSWYgdGhpcyBtb2RlbCBpcyBub3QgdGhlIG1vcnBoIGVsZW1lbnQgYXQgdGhpcyBpbmRleFxuICAgIGlmKHBvc2l0aW9uICE9PSBrZXkpe1xuXG4gICAgICAvLyBDcmVhdGUgYSBsYXp5dmFsdWUgd2hvcyB2YWx1ZSBpcyB0aGUgY29udGVudCBpbnNpZGUgb3VyIGJsb2NrIGhlbHBlciByZW5kZXJlZCBpbiB0aGUgY29udGV4dCBvZiB0aGlzIGN1cnJlbnQgbGlzdCBvYmplY3QuIFJldHVybnMgdGhlIHJlbmRlcmVkIGRvbSBmb3IgdGhpcyBsaXN0IGVsZW1lbnQuXG4gICAgICB2YXIgbGF6eVZhbHVlID0gbmV3IExhenlWYWx1ZShmdW5jdGlvbigpe1xuICAgICAgICByZXR1cm4gb3B0aW9ucy50ZW1wbGF0ZS5yZW5kZXIoKChvcHRpb25zLnRlbXBsYXRlLmJsb2NrUGFyYW1zID09PSAwKT9vYmo6b3B0aW9ucy5jb250ZXh0KSwgb3B0aW9ucywgKG9wdGlvbnMubW9ycGguY29udGV4dHVhbEVsZW1lbnQgfHwgb3B0aW9ucy5tb3JwaC5lbGVtZW50KSwgW29ial0pO1xuICAgICAgfSk7XG5cbiAgICAgIC8vIElmIHRoaXMgbW9kZWwgaXMgcmVuZGVyZWQgc29tZXdoZXJlIGVsc2UgaW4gdGhlIGxpc3QsIGRlc3Ryb3kgaXRcbiAgICAgIGlmKHBvc2l0aW9uID4gLTEpe1xuICAgICAgICBvcHRpb25zLnBsYWNlaG9sZGVyLm1vcnBoc1twb3NpdGlvbl0uZGVzdHJveSgpO1xuICAgICAgfVxuXG4gICAgICAvLyBEZXN0cm95IHRoZSBtb3JwaCB3ZSdyZSByZXBsYWNpbmdcbiAgICAgIGlmKG9wdGlvbnMucGxhY2Vob2xkZXIubW9ycGhzW2tleV0pe1xuICAgICAgICBvcHRpb25zLnBsYWNlaG9sZGVyLm1vcnBoc1trZXldLmRlc3Ryb3koKTtcbiAgICAgIH1cblxuICAgICAgLy8gSW5zZXJ0IG91ciBuZXdseSByZW5kZXJlZCB2YWx1ZSAoYSBkb2N1bWVudCB0cmVlKSBpbnRvIG91ciBwbGFjZWhvbGRlciAodGhlIGNvbnRhaW5pbmcgZWxlbWVudCkgYXQgaXRzIHJlcXVlc3RlZCBwb3NpdGlvbiAod2hlcmUgd2UgY3VycmVudGx5IGFyZSBpbiB0aGUgb2JqZWN0IGxpc3QpXG4gICAgICBvcHRpb25zLnBsYWNlaG9sZGVyLmluc2VydChrZXksIGxhenlWYWx1ZS52YWx1ZSgpKTtcblxuICAgICAgLy8gTGFiZWwgdGhlIGluc2VydGVkIG1vcnBoIGVsZW1lbnQgd2l0aCB0aGlzIG1vZGVsJ3MgY2lkXG4gICAgICBvcHRpb25zLnBsYWNlaG9sZGVyLm1vcnBoc1trZXldLmNpZCA9IG9iai5jaWQ7XG5cbiAgICB9XG5cbiAgfSwgdGhpcyk7XG5cbiAgLy8gSWYgYW55IG1vcmUgbW9ycGhzIGFyZSBsZWZ0IG92ZXIsIHJlbW92ZSB0aGVtLiBXZSd2ZSBhbHJlYWR5IGdvbmUgdGhyb3VnaCBhbGwgdGhlIG1vZGVscy5cbiAgc3RhcnQgPSB2YWx1ZS5sZW5ndGg7XG4gIGVuZCA9IG9wdGlvbnMucGxhY2Vob2xkZXIubW9ycGhzLmxlbmd0aCAtIDE7XG4gIGZvcihlbmQ7IHN0YXJ0IDw9IGVuZDsgZW5kLS0pe1xuICAgIG9wdGlvbnMucGxhY2Vob2xkZXIubW9ycGhzW2VuZF0uZGVzdHJveSgpO1xuICB9XG5cbiAgLy8gUmV0dXJuIG51bGwgcHJldmVudCdzIHJlLXJlbmRpbmcgb2Ygb3VyIHBsYWNlaG9sZGVyLiBPdXIgcGxhY2Vob2xkZXIgKGNvbnRhaW5pbmcgZWxlbWVudCkgbm93IGhhcyBhbGwgdGhlIGRvbSB3ZSBuZWVkLlxuICByZXR1cm4gbnVsbDtcblxufTtcblxuaGVscGVycy53aXRoID0gZnVuY3Rpb24ocGFyYW1zLCBoYXNoLCBvcHRpb25zLCBlbnYpe1xuXG4gIC8vIFJlbmRlciB0aGUgY29udGVudCBpbnNpZGUgb3VyIGJsb2NrIGhlbHBlciB3aXRoIHRoZSBjb250ZXh0IG9mIHRoaXMgb2JqZWN0LiBSZXR1cm5zIGEgZG9tIHRyZWUuXG4gIHJldHVybiBvcHRpb25zLnRlbXBsYXRlLnJlbmRlcihwYXJhbXNbMF0sIG9wdGlvbnMsIChvcHRpb25zLm1vcnBoLmNvbnRleHR1YWxFbGVtZW50IHx8IG9wdGlvbnMubW9ycGguZWxlbWVudCkpO1xuXG59O1xuXG5oZWxwZXJzLnBhcnRpYWwgPSBmdW5jdGlvbihwYXJhbXMsIGhhc2gsIG9wdGlvbnMsIGVudil7XG4gIHZhciBwYXJ0aWFsID0gcGFydGlhbHNbcGFyYW1zWzBdXTtcbiAgaWYoIHBhcnRpYWwgJiYgcGFydGlhbC5pc0hUTUxCYXJzICl7XG4gICAgcmV0dXJuIHBhcnRpYWwucmVuZGVyKG9wdGlvbnMuY29udGV4dCwgZW52KTtcbiAgfVxuXG59O1xuXG5leHBvcnQgZGVmYXVsdCBoZWxwZXJzOyIsImltcG9ydCBMYXp5VmFsdWUgZnJvbSBcInJlYm91bmQtcnVudGltZS9sYXp5LXZhbHVlXCI7XG5pbXBvcnQgJCBmcm9tIFwicmVib3VuZC1ydW50aW1lL3V0aWxzXCI7XG5pbXBvcnQgaGVscGVycyBmcm9tIFwicmVib3VuZC1ydW50aW1lL2hlbHBlcnNcIjtcbmltcG9ydCBDb250ZXh0IGZyb20gXCJyZWJvdW5kLXJ1bnRpbWUvY29udGV4dFwiO1xuXG52YXIgaG9va3MgPSB7fSxcbiAgICBhdHRyaWJ1dGVzID0geyAgYWJicjogMSwgICAgICBcImFjY2VwdC1jaGFyc2V0XCI6IDEsICAgYWNjZXB0OiAxLCAgICAgIGFjY2Vzc2tleTogMSwgICAgIGFjdGlvbjogMSxcbiAgICAgICAgICAgICAgICAgICAgYWxpZ246IDEsICAgICAgYWxpbms6IDEsICAgICAgICAgICAgIGFsdDogMSwgICAgICAgICBhcmNoaXZlOiAxLCAgICAgICBheGlzOiAxLFxuICAgICAgICAgICAgICAgICAgICBiYWNrZ3JvdW5kOiAxLCBiZ2NvbG9yOiAxLCAgICAgICAgICAgYm9yZGVyOiAxLCAgICAgIGNlbGxwYWRkaW5nOiAxLCAgIGNlbGxzcGFjaW5nOiAxLFxuICAgICAgICAgICAgICAgICAgICBjaGFyOiAxLCAgICAgICBjaGFyb2ZmOiAxLCAgICAgICAgICAgY2hhcnNldDogMSwgICAgIGNoZWNrZWQ6IDEsICAgICAgIGNpdGU6IDEsXG4gICAgICAgICAgICAgICAgICAgIGNsYXNzOiAxLCAgICAgIGNsYXNzaWQ6IDEsICAgICAgICAgICBjbGVhcjogMSwgICAgICAgY29kZTogMSwgICAgICAgICAgY29kZWJhc2U6IDEsXG4gICAgICAgICAgICAgICAgICAgIGNvZGV0eXBlOiAxLCAgIGNvbG9yOiAxLCAgICAgICAgICAgICBjb2xzOiAxLCAgICAgICAgY29sc3BhbjogMSwgICAgICAgY29tcGFjdDogMSxcbiAgICAgICAgICAgICAgICAgICAgY29udGVudDogMSwgICAgY29vcmRzOiAxLCAgICAgICAgICAgIGRhdGE6IDEsICAgICAgICBkYXRldGltZTogMSwgICAgICBkZWNsYXJlOiAxLFxuICAgICAgICAgICAgICAgICAgICBkZWZlcjogMSwgICAgICBkaXI6IDEsICAgICAgICAgICAgICAgZGlzYWJsZWQ6IDEsICAgIGVuY3R5cGU6IDEsICAgICAgIGZhY2U6IDEsXG4gICAgICAgICAgICAgICAgICAgIGZvcjogMSwgICAgICAgIGZyYW1lOiAxLCAgICAgICAgICAgICBmcmFtZWJvcmRlcjogMSwgaGVhZGVyczogMSwgICAgICAgaGVpZ2h0OiAxLFxuICAgICAgICAgICAgICAgICAgICBocmVmOiAxLCAgICAgICBocmVmbGFuZzogMSwgICAgICAgICAgaHNwYWNlOiAxLCAgICAgXCJodHRwLWVxdWl2XCI6IDEsICAgaWQ6IDEsXG4gICAgICAgICAgICAgICAgICAgIGlzbWFwOiAxLCAgICAgIGxhYmVsOiAxLCAgICAgICAgICAgICBsYW5nOiAxLCAgICAgICAgbGFuZ3VhZ2U6IDEsICAgICAgbGluazogMSxcbiAgICAgICAgICAgICAgICAgICAgbG9uZ2Rlc2M6IDEsICAgbWFyZ2luaGVpZ2h0OiAxLCAgICAgIG1hcmdpbndpZHRoOiAxLCBtYXhsZW5ndGg6IDEsICAgICBtZWRpYTogMSxcbiAgICAgICAgICAgICAgICAgICAgbWV0aG9kOiAxLCAgICAgbXVsdGlwbGU6IDEsICAgICAgICAgIG5hbWU6IDEsICAgICAgICBub2hyZWY6IDEsICAgICAgICBub3Jlc2l6ZTogMSxcbiAgICAgICAgICAgICAgICAgICAgbm9zaGFkZTogMSwgICAgbm93cmFwOiAxLCAgICAgICAgICAgIG9iamVjdDogMSwgICAgICBvbmJsdXI6IDEsICAgICAgICBvbmNoYW5nZTogMSxcbiAgICAgICAgICAgICAgICAgICAgb25jbGljazogMSwgICAgb25kYmxjbGljazogMSwgICAgICAgIG9uZm9jdXM6IDEsICAgICBvbmtleWRvd246IDEsICAgICBvbmtleXByZXNzOiAxLFxuICAgICAgICAgICAgICAgICAgICBvbmtleXVwOiAxLCAgICBvbmxvYWQ6IDEsICAgICAgICAgICAgb25tb3VzZWRvd246IDEsIG9ubW91c2Vtb3ZlOiAxLCAgIG9ubW91c2VvdXQ6IDEsXG4gICAgICAgICAgICAgICAgICAgIG9ubW91c2VvdmVyOiAxLG9ubW91c2V1cDogMSwgICAgICAgICBvbnJlc2V0OiAxLCAgICAgb25zZWxlY3Q6IDEsICAgICAgb25zdWJtaXQ6IDEsXG4gICAgICAgICAgICAgICAgICAgIG9udW5sb2FkOiAxLCAgIHByb2ZpbGU6IDEsICAgICAgICAgICBwcm9tcHQ6IDEsICAgICAgcmVhZG9ubHk6IDEsICAgICAgcmVsOiAxLFxuICAgICAgICAgICAgICAgICAgICByZXY6IDEsICAgICAgICByb3dzOiAxLCAgICAgICAgICAgICAgcm93c3BhbjogMSwgICAgIHJ1bGVzOiAxLCAgICAgICAgIHNjaGVtZTogMSxcbiAgICAgICAgICAgICAgICAgICAgc2NvcGU6IDEsICAgICAgc2Nyb2xsaW5nOiAxLCAgICAgICAgIHNlbGVjdGVkOiAxLCAgICBzaGFwZTogMSwgICAgICAgICBzaXplOiAxLFxuICAgICAgICAgICAgICAgICAgICBzcGFuOiAxLCAgICAgICBzcmM6IDEsICAgICAgICAgICAgICAgc3RhbmRieTogMSwgICAgIHN0YXJ0OiAxLCAgICAgICAgIHN0eWxlOiAxLFxuICAgICAgICAgICAgICAgICAgICBzdW1tYXJ5OiAxLCAgICB0YWJpbmRleDogMSwgICAgICAgICAgdGFyZ2V0OiAxLCAgICAgIHRleHQ6IDEsICAgICAgICAgIHRpdGxlOiAxLFxuICAgICAgICAgICAgICAgICAgICB0eXBlOiAxLCAgICAgICB1c2VtYXA6IDEsICAgICAgICAgICAgdmFsaWduOiAxLCAgICAgIHZhbHVlOiAxLCAgICAgICAgIHZhbHVldHlwZTogMSxcbiAgICAgICAgICAgICAgICAgICAgdmVyc2lvbjogMSwgICAgdmxpbms6IDEsICAgICAgICAgICAgIHZzcGFjZTogMSwgICAgICB3aWR0aDogMSAgfTtcblxuXG4vKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuICAgICAgICBIb29rIFV0aWxzXG4qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cblxuLy8gUmV0dXJucyB0aGUgY29tcHV0ZWQgcHJvcGVydHkncyBmdW5jdGlvbiBpZiB0cnVlLCBlbHNlIGZhbHNlXG5mdW5jdGlvbiBpc0NvbXB1dGVkUHJvcGVydHkobW9kZWwsIHBhdGgpe1xuICByZXR1cm4gXy5pc0Z1bmN0aW9uKG1vZGVsLmdldChwYXRoLCB7cmF3OiB0cnVlfSkpO1xufVxuXG4vLyBHaXZlbiBhbiBvYmplY3QgKGNvbnRleHQpIGFuZCBhIHBhdGgsIGNyZWF0ZSBhIExhenlWYWx1ZSBvYmplY3QgdGhhdCByZXR1cm5zIHRoZSB2YWx1ZSBvZiBvYmplY3QgYXQgY29udGV4dCBhbmQgYWRkIGl0IGFzIGFuIG9ic2VydmVyIG9mIHRoZSBjb250ZXh0LlxuZnVuY3Rpb24gc3RyZWFtUHJvcGVydHkoY29udGV4dCwgcGF0aCkge1xuXG4gIC8vIExhenkgdmFsdWUgdGhhdCByZXR1cm5zIHRoZSB2YWx1ZSBvZiBjb250ZXh0LnBhdGhcbiAgdmFyIGxhenlWYWx1ZSA9IG5ldyBMYXp5VmFsdWUoZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIGNvbnRleHQuZ2V0KHBhdGgpO1xuICB9LCBjb250ZXh0KTtcblxuICAvLyBTYXZlIG91ciBwYXRoIHNvIHBhcmVudCBsYXp5dmFsdWVzIGNhbiBrbm93IHRoZSBkYXRhIHZhciBvciBoZWxwZXIgdGhleSBhcmUgZ2V0dGluZyBpbmZvIGZyb21cbiAgbGF6eVZhbHVlLnBhdGggPSBwYXRoO1xuXG4gIC8vIFNhdmUgdGhlIG9ic2VydmVyIGF0IHRoaXMgcGF0aFxuICBsYXp5VmFsdWUuYWRkT2JzZXJ2ZXIocGF0aCwgY29udGV4dCk7XG5cbiAgcmV0dXJuIGxhenlWYWx1ZTtcbn1cblxuZnVuY3Rpb24gY29uc3RydWN0SGVscGVyKGVsLCBwYXRoLCBjb250ZXh0LCBwYXJhbXMsIGhhc2gsIG9wdGlvbnMsIGVudiwgaGVscGVyKSB7XG4gIHZhciBsYXp5VmFsdWU7XG5cbiAgLy8gRXh0ZW5kIG9wdGlvbnMgd2l0aCB0aGUgaGVscGVyJ3MgY29udGFpbmVpbmcgTW9ycGggZWxlbWVudC4gVXNlZCBieSBzdHJlYW1pZnkgdG8gdHJhY2sgZGF0YSBvYnNlcnZlcnNcbiAgb3B0aW9ucy5tb3JwaCA9IG9wdGlvbnMucGxhY2Vob2xkZXIgPSBlbCAmJiAhZWwudGFnTmFtZSAmJiBlbCB8fCBmYWxzZTsgLy8gRklYTUU6IHRoaXMga2luZGEgc3Vja3NcbiAgb3B0aW9ucy5lbGVtZW50ID0gZWwgJiYgZWwudGFnTmFtZSAmJiBlbCB8fCBmYWxzZTsgICAgICAvLyBGSVhNRTogdGhpcyBraW5kYSBzdWNrc1xuXG4gIC8vIEV4dGVuZCBvcHRpb25zIHdpdGggaG9va3MgYW5kIGhlbHBlcnMgZm9yIGFueSBzdWJzZXF1ZW50IGNhbGxzIGZyb20gYSBsYXp5dmFsdWVcbiAgb3B0aW9ucy5wYXJhbXMgPSBwYXJhbXM7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gRklYTUU6IHRoaXMga2luZGEgc3Vja3NcbiAgb3B0aW9ucy5ob29rcyA9IGVudi5ob29rczsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gRklYTUU6IHRoaXMga2luZGEgc3Vja3NcbiAgb3B0aW9ucy5oZWxwZXJzID0gZW52LmhlbHBlcnM7ICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gRklYTUU6IHRoaXMga2luZGEgc3Vja3NcbiAgb3B0aW9ucy5jb250ZXh0ID0gY29udGV4dDsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gRklYTUU6IHRoaXMga2luZGEgc3Vja3NcbiAgb3B0aW9ucy5kb20gPSBlbnYuZG9tOyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gRklYTUU6IHRoaXMga2luZGEgc3Vja3NcbiAgb3B0aW9ucy5wYXRoID0gcGF0aDsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gRklYTUU6IHRoaXMga2luZGEgc3Vja3NcbiAgb3B0aW9ucy5oYXNoID0gaGFzaCB8fCBbXTsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gRklYTUU6IHRoaXMga2luZGEgc3Vja3NcblxuICAvLyBDcmVhdGUgYSBsYXp5IHZhbHVlIHRoYXQgcmV0dXJucyB0aGUgdmFsdWUgb2Ygb3VyIGV2YWx1YXRlZCBoZWxwZXIuXG4gIG9wdGlvbnMubGF6eVZhbHVlID0gbmV3IExhenlWYWx1ZShmdW5jdGlvbigpIHtcbiAgICB2YXIgcGxhaW5QYXJhbXMgPSBbXSxcbiAgICAgICAgcGxhaW5IYXNoID0ge30sXG4gICAgICAgIHJlc3VsdCxcbiAgICAgICAgcmVscGF0aCA9ICQuc3BsaXRQYXRoKHBhdGgpLFxuICAgICAgICBmaXJzdCwgcmVzdDtcbiAgICAgICAgcmVscGF0aC5zaGlmdCgpO1xuICAgICAgICByZWxwYXRoID0gcmVscGF0aC5qb2luKCcuJyk7XG5cbiAgICAgICAgcmVzdCA9ICQuc3BsaXRQYXRoKHJlbHBhdGgpO1xuICAgICAgICBmaXJzdCA9IHJlc3Quc2hpZnQoKTtcbiAgICAgICAgcmVzdCA9IHJlc3Quam9pbignLicpO1xuXG4gICAgLy8gQXNzZW1ibGUgb3VyIGFyZ3MgYW5kIGhhc2ggdmFyaWFibGVzLiBGb3IgZWFjaCBsYXp5dmFsdWUgcGFyYW0sIHB1c2ggdGhlIGxhenlWYWx1ZSdzIHZhbHVlIHNvIGhlbHBlcnMgd2l0aCBubyBjb25jZXB0IG9mIGxhenl2YWx1ZXMuXG4gICAgXy5lYWNoKHBhcmFtcywgZnVuY3Rpb24ocGFyYW0sIGluZGV4KXtcbiAgICAgIHBsYWluUGFyYW1zLnB1c2goKCAocGFyYW0gJiYgcGFyYW0uaXNMYXp5VmFsdWUpID8gcGFyYW0udmFsdWUoKSA6IHBhcmFtICkpO1xuICAgIH0pO1xuICAgIF8uZWFjaChoYXNoLCBmdW5jdGlvbihoYXNoLCBrZXkpe1xuICAgICAgcGxhaW5IYXNoW2tleV0gPSAoaGFzaCAmJiBoYXNoLmlzTGF6eVZhbHVlKSA/IGhhc2gudmFsdWUoKSA6IGhhc2g7XG4gICAgfSk7XG5cbiAgICAvLyBDYWxsIG91ciBoZWxwZXIgZnVuY3Rpb25zIHdpdGggb3VyIGFzc2VtYmxlZCBhcmdzLlxuICAgIHJlc3VsdCA9IGhlbHBlci5hcHBseSgoY29udGV4dC5fX3Jvb3RfXyB8fCBjb250ZXh0KSwgW3BsYWluUGFyYW1zLCBwbGFpbkhhc2gsIG9wdGlvbnMsIGVudl0pO1xuXG4gICAgaWYocmVzdWx0ICYmIHJlbHBhdGgpe1xuICAgICAgcmV0dXJuIHJlc3VsdC5nZXQocmVscGF0aCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfSk7XG5cbiAgb3B0aW9ucy5sYXp5VmFsdWUucGF0aCA9IHBhdGg7XG5cbiAgLy8gRm9yIGVhY2ggcGFyYW0gcGFzc2VkIHRvIG91ciBoZWxwZXIsIGFkZCBpdCB0byBvdXIgaGVscGVyJ3MgZGVwZW5kYW50IGxpc3QuIEhlbHBlciB3aWxsIHJlLWV2YWx1YXRlIHdoZW4gb25lIGNoYW5nZXMuXG4gIHBhcmFtcy5mb3JFYWNoKGZ1bmN0aW9uKG5vZGUpIHtcbiAgICBpZihub2RlLmlzTGF6eVZhbHVlKXtcbiAgICAgIC8vIFJlLWV2YWx1YXRlIHRoaXMgZXhwcmVzc2lvbiB3aGVuIG91ciBjb25kaXRpb24gY2hhbmdlc1xuICAgICAgbm9kZS5vbk5vdGlmeShmdW5jdGlvbigpe1xuICAgICAgICBvcHRpb25zLmxhenlWYWx1ZS52YWx1ZSgpO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgaWYgKG5vZGUgJiYgbm9kZS5pc0xhenlWYWx1ZSkge1xuICAgICAgb3B0aW9ucy5sYXp5VmFsdWUuYWRkRGVwZW5kZW50VmFsdWUobm9kZSk7XG4gICAgfVxuICB9KTtcblxuICByZXR1cm4gb3B0aW9ucy5sYXp5VmFsdWU7XG59XG5cbi8vIEdpdmVuIGEgcm9vdCBlbGVtZW50LCBjbGVhbnMgYWxsIG9mIHRoZSBtb3JwaCBsYXp5VmFsdWVzIGZvciBhIGdpdmVuIHN1YnRyZWVcbmZ1bmN0aW9uIGNsZWFuU3VidHJlZShtdXRhdGlvbnMsIG9ic2VydmVyKXtcbiAgLy8gRm9yIGVhY2ggbXV0YXRpb24gb2JzZXJ2ZWQsIGlmIHRoZXJlIGFyZSBub2RlcyByZW1vdmVkLCBkZXN0cm95IGFsbCBhc3NvY2lhdGVkIGxhenlWYWx1ZXNcbiAgbXV0YXRpb25zLmZvckVhY2goZnVuY3Rpb24obXV0YXRpb24pIHtcbiAgICBpZihtdXRhdGlvbi5yZW1vdmVkTm9kZXMpe1xuICAgICAgXy5lYWNoKG11dGF0aW9uLnJlbW92ZWROb2RlcywgZnVuY3Rpb24obm9kZSwgaW5kZXgpe1xuICAgICAgICAkKG5vZGUpLndhbGtUaGVET00oZnVuY3Rpb24obil7XG4gICAgICAgICAgaWYobi5fX2xhenlWYWx1ZSAmJiBuLl9fbGF6eVZhbHVlLmRlc3Ryb3koKSl7XG4gICAgICAgICAgICBuLl9fbGF6eVZhbHVlLmRlc3Ryb3koKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfVxuICB9KTtcbn1cblxudmFyIHN1YnRyZWVPYnNlcnZlciA9IG5ldyBNdXRhdGlvbk9ic2VydmVyKGNsZWFuU3VidHJlZSk7XG5cbi8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gICAgICAgIERlZmF1bHQgSG9va3NcbioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuXG5ob29rcy5nZXQgPSBmdW5jdGlvbiBnZXQoZW52LCBjb250ZXh0LCBwYXRoKXtcbiAgY29udGV4dC5ibG9ja1BhcmFtcyB8fCAoY29udGV4dC5ibG9ja1BhcmFtcyA9IG5ldyBDb250ZXh0KCkpO1xuICBpZihwYXRoID09PSAndGhpcycpeyBwYXRoID0gJyc7IH1cbiAgLy8gY29udGV4dCA9IChjb250ZXh0LmJsb2NrUGFyYW1zLmhhcyhwYXRoKSkgPyBjb250ZXh0LmJsb2NrUGFyYW1zIDogY29udGV4dDtcbiAgcmV0dXJuIHN0cmVhbVByb3BlcnR5KGNvbnRleHQsIHBhdGgpO1xufTtcblxuaG9va3Muc2V0ID0gZnVuY3Rpb24gc2V0KGVudiwgY29udGV4dCwgbmFtZSwgdmFsdWUpe1xuICBjb250ZXh0LmJsb2NrUGFyYW1zIHx8IChjb250ZXh0LmJsb2NrUGFyYW1zID0gbmV3IENvbnRleHQoKSk7XG4gIC8vIGNvbnRleHQuYmxvY2tQYXJhbXMuc2V0KG5hbWUsIHZhbHVlKTtcbn07XG5cblxuaG9va3MuY29uY2F0ID0gZnVuY3Rpb24gY29uY2F0KGVudiwgcGFyYW1zKSB7XG5cbiAgaWYocGFyYW1zLmxlbmd0aCA9PT0gMSl7XG4gICAgcmV0dXJuIHBhcmFtc1swXTtcbiAgfVxuXG4gIHZhciBsYXp5VmFsdWUgPSBuZXcgTGF6eVZhbHVlKGZ1bmN0aW9uKCkge1xuICAgIHZhciB2YWx1ZSA9IFwiXCI7XG5cbiAgICBmb3IgKHZhciBpID0gMCwgbCA9IHBhcmFtcy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgIHZhbHVlICs9IChwYXJhbXNbaV0uaXNMYXp5VmFsdWUpID8gcGFyYW1zW2ldLnZhbHVlKCkgOiBwYXJhbXNbaV07XG4gICAgfVxuXG4gICAgcmV0dXJuIHZhbHVlO1xuICB9LCBwYXJhbXNbMF0uY29udGV4dCk7XG5cbiAgZm9yICh2YXIgaSA9IDAsIGwgPSBwYXJhbXMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgaWYocGFyYW1zW2ldLmlzTGF6eVZhbHVlKSB7XG4gICAgICBwYXJhbXNbaV0ub25Ob3RpZnkoZnVuY3Rpb24oKXtcbiAgICAgICAgbGF6eVZhbHVlLm5vdGlmeSgpO1xuICAgICAgfSk7XG4gICAgICBsYXp5VmFsdWUuYWRkRGVwZW5kZW50VmFsdWUocGFyYW1zW2ldKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gbGF6eVZhbHVlO1xuXG59O1xuXG5ob29rcy5zdWJleHByID0gZnVuY3Rpb24gc3ViZXhwcihlbnYsIGNvbnRleHQsIGhlbHBlck5hbWUsIHBhcmFtcywgaGFzaCkge1xuXG4gIHZhciBoZWxwZXIgPSBoZWxwZXJzLmxvb2t1cEhlbHBlcihoZWxwZXJOYW1lLCBlbnYsIGNvbnRleHQpLFxuICBsYXp5VmFsdWU7XG5cbiAgaWYgKGhlbHBlcikge1xuICAgIC8vIEFic3RyYWN0cyBvdXIgaGVscGVyIHRvIHByb3ZpZGUgYSBoYW5kbGViYXJzIHR5cGUgaW50ZXJmYWNlLiBDb25zdHJ1Y3RzIG91ciBMYXp5VmFsdWUuXG4gICAgbGF6eVZhbHVlID0gY29uc3RydWN0SGVscGVyKHRydWUsIGhlbHBlck5hbWUsIGNvbnRleHQsIHBhcmFtcywgaGFzaCwge30sIGVudiwgaGVscGVyKTtcbiAgfSBlbHNlIHtcbiAgICBsYXp5VmFsdWUgPSBzdHJlYW1Qcm9wZXJ0eShjb250ZXh0LCBoZWxwZXJOYW1lKTtcbiAgfVxuXG4gIGZvciAodmFyIGkgPSAwLCBsID0gcGFyYW1zLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgIGlmKHBhcmFtc1tpXS5pc0xhenlWYWx1ZSkge1xuICAgICAgcGFyYW1zW2ldLm9uTm90aWZ5KGZ1bmN0aW9uKCl7XG4gICAgICAgIGxhenlWYWx1ZS5ub3RpZnkoKTtcbiAgICAgIH0pO1xuICAgICAgbGF6eVZhbHVlLmFkZERlcGVuZGVudFZhbHVlKHBhcmFtc1tpXSk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGxhenlWYWx1ZTtcbn07XG5cbmhvb2tzLmJsb2NrID0gZnVuY3Rpb24gYmxvY2soZW52LCBtb3JwaCwgY29udGV4dCwgcGF0aCwgcGFyYW1zLCBoYXNoLCB0ZW1wbGF0ZSwgaW52ZXJzZSl7XG4gIHZhciBvcHRpb25zID0ge1xuICAgIG1vcnBoOiBtb3JwaCxcbiAgICB0ZW1wbGF0ZTogdGVtcGxhdGUsXG4gICAgaW52ZXJzZTogaW52ZXJzZVxuICB9O1xuXG4gIHZhciBsYXp5VmFsdWUsXG4gIHZhbHVlLFxuICBvYnNlcnZlciA9IHN1YnRyZWVPYnNlcnZlcixcbiAgaGVscGVyID0gaGVscGVycy5sb29rdXBIZWxwZXIocGF0aCwgZW52LCBjb250ZXh0KTtcblxuICBpZighXy5pc0Z1bmN0aW9uKGhlbHBlcikpe1xuICAgIHJldHVybiBjb25zb2xlLmVycm9yKHBhdGggKyAnIGlzIG5vdCBhIHZhbGlkIGhlbHBlciEnKTtcbiAgfVxuXG4gIC8vIEFic3RyYWN0cyBvdXIgaGVscGVyIHRvIHByb3ZpZGUgYSBoYW5kbGViYXJzIHR5cGUgaW50ZXJmYWNlLiBDb25zdHJ1Y3RzIG91ciBMYXp5VmFsdWUuXG4gIGxhenlWYWx1ZSA9IGNvbnN0cnVjdEhlbHBlcihtb3JwaCwgcGF0aCwgY29udGV4dCwgcGFyYW1zLCBoYXNoLCBvcHRpb25zLCBlbnYsIGhlbHBlcik7XG5cbiAgLy8gSWYgd2UgaGF2ZSBvdXIgbGF6eSB2YWx1ZSwgdXBkYXRlIG91ciBkb20uXG4gIC8vIG1vcnBoIGlzIGEgbW9ycGggZWxlbWVudCByZXByZXNlbnRpbmcgb3VyIGRvbSBub2RlXG4gIGlmIChsYXp5VmFsdWUpIHtcbiAgICBsYXp5VmFsdWUub25Ob3RpZnkoZnVuY3Rpb24obGF6eVZhbHVlKSB7XG4gICAgICB2YXIgdmFsID0gbGF6eVZhbHVlLnZhbHVlKCk7XG4gICAgICB2YWwgPSAoXy5pc1VuZGVmaW5lZCh2YWwpKSA/ICcnIDogdmFsO1xuICAgICAgaWYoIV8uaXNOdWxsKHZhbCkpe1xuICAgICAgICBtb3JwaC5zZXRDb250ZW50KHZhbCk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICB2YWx1ZSA9IGxhenlWYWx1ZS52YWx1ZSgpO1xuICAgIHZhbHVlID0gKF8uaXNVbmRlZmluZWQodmFsdWUpKSA/ICcnIDogdmFsdWU7XG4gICAgaWYoIV8uaXNOdWxsKHZhbHVlKSl7IG1vcnBoLmFwcGVuZCh2YWx1ZSk7IH1cblxuICAgICAgLy8gT2JzZXJ2ZSB0aGlzIGNvbnRlbnQgbW9ycGgncyBwYXJlbnQncyBjaGlsZHJlbi5cbiAgICAgIC8vIFdoZW4gdGhlIG1vcnBoIGVsZW1lbnQncyBjb250YWluaW5nIGVsZW1lbnQgKG1vcnBoKSBpcyByZW1vdmVkLCBjbGVhbiB1cCB0aGUgbGF6eXZhbHVlLlxuICAgICAgLy8gVGltZW91dCBkZWxheSBoYWNrIHRvIGdpdmUgb3V0IGRvbSBhIGNoYW5nZSB0byBnZXQgdGhlaXIgcGFyZW50XG4gICAgICBpZihtb3JwaC5fcGFyZW50KXtcbiAgICAgICAgbW9ycGguX3BhcmVudC5fX2xhenlWYWx1ZSA9IGxhenlWYWx1ZTtcbiAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpe1xuICAgICAgICAgIGlmKG1vcnBoLmNvbnRleHR1YWxFbGVtZW50KXtcbiAgICAgICAgICAgIG9ic2VydmVyLm9ic2VydmUobW9ycGguY29udGV4dHVhbEVsZW1lbnQsIHsgYXR0cmlidXRlczogZmFsc2UsIGNoaWxkTGlzdDogdHJ1ZSwgY2hhcmFjdGVyRGF0YTogZmFsc2UsIHN1YnRyZWU6IHRydWUgfSk7XG4gICAgICAgICAgfVxuICAgICAgICB9LCAwKTtcbiAgICAgIH1cblxuICAgIH1cblxufTtcblxuaG9va3MuaW5saW5lID0gZnVuY3Rpb24gaW5saW5lKGVudiwgbW9ycGgsIGNvbnRleHQsIHBhdGgsIHBhcmFtcywgaGFzaCkge1xuXG4gIHZhciBsYXp5VmFsdWUsXG4gIHZhbHVlLFxuICBvYnNlcnZlciA9IHN1YnRyZWVPYnNlcnZlcixcbiAgaGVscGVyID0gaGVscGVycy5sb29rdXBIZWxwZXIocGF0aCwgZW52LCBjb250ZXh0KTtcblxuICBpZighXy5pc0Z1bmN0aW9uKGhlbHBlcikpe1xuICAgIHJldHVybiBjb25zb2xlLmVycm9yKHBhdGggKyAnIGlzIG5vdCBhIHZhbGlkIGhlbHBlciEnKTtcbiAgfVxuXG4gIC8vIEFic3RyYWN0cyBvdXIgaGVscGVyIHRvIHByb3ZpZGUgYSBoYW5kbGViYXJzIHR5cGUgaW50ZXJmYWNlLiBDb25zdHJ1Y3RzIG91ciBMYXp5VmFsdWUuXG4gIGxhenlWYWx1ZSA9IGNvbnN0cnVjdEhlbHBlcihtb3JwaCwgcGF0aCwgY29udGV4dCwgcGFyYW1zLCBoYXNoLCB7fSwgZW52LCBoZWxwZXIpO1xuXG4gIC8vIElmIHdlIGhhdmUgb3VyIGxhenkgdmFsdWUsIHVwZGF0ZSBvdXIgZG9tLlxuICAvLyBtb3JwaCBpcyBhIG1vcnBoIGVsZW1lbnQgcmVwcmVzZW50aW5nIG91ciBkb20gbm9kZVxuICBpZiAobGF6eVZhbHVlKSB7XG4gICAgbGF6eVZhbHVlLm9uTm90aWZ5KGZ1bmN0aW9uKGxhenlWYWx1ZSkge1xuICAgICAgdmFyIHZhbCA9IGxhenlWYWx1ZS52YWx1ZSgpO1xuICAgICAgdmFsID0gKF8uaXNVbmRlZmluZWQodmFsKSkgPyAnJyA6IHZhbDtcbiAgICAgIGlmKCFfLmlzTnVsbCh2YWwpKXtcbiAgICAgICAgbW9ycGguc2V0Q29udGVudCh2YWwpO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgdmFsdWUgPSBsYXp5VmFsdWUudmFsdWUoKTtcbiAgICB2YWx1ZSA9IChfLmlzVW5kZWZpbmVkKHZhbHVlKSkgPyAnJyA6IHZhbHVlO1xuICAgIGlmKCFfLmlzTnVsbCh2YWx1ZSkpeyBtb3JwaC5hcHBlbmQodmFsdWUpOyB9XG5cbiAgICAgIC8vIE9ic2VydmUgdGhpcyBjb250ZW50IG1vcnBoJ3MgcGFyZW50J3MgY2hpbGRyZW4uXG4gICAgICAvLyBXaGVuIHRoZSBtb3JwaCBlbGVtZW50J3MgY29udGFpbmluZyBlbGVtZW50IChtb3JwaCkgaXMgcmVtb3ZlZCwgY2xlYW4gdXAgdGhlIGxhenl2YWx1ZS5cbiAgICAgIC8vIFRpbWVvdXQgZGVsYXkgaGFjayB0byBnaXZlIG91dCBkb20gYSBjaGFuZ2UgdG8gZ2V0IHRoZWlyIHBhcmVudFxuICAgICAgaWYobW9ycGguX3BhcmVudCl7XG4gICAgICAgIG1vcnBoLl9wYXJlbnQuX19sYXp5VmFsdWUgPSBsYXp5VmFsdWU7XG4gICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcbiAgICAgICAgICBpZihtb3JwaC5jb250ZXh0dWFsRWxlbWVudCl7XG4gICAgICAgICAgICBvYnNlcnZlci5vYnNlcnZlKG1vcnBoLmNvbnRleHR1YWxFbGVtZW50LCB7IGF0dHJpYnV0ZXM6IGZhbHNlLCBjaGlsZExpc3Q6IHRydWUsIGNoYXJhY3RlckRhdGE6IGZhbHNlLCBzdWJ0cmVlOiB0cnVlIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfSwgMCk7XG4gICAgICB9XG5cbiAgICB9XG4gIH07XG5cbmhvb2tzLmNvbnRlbnQgPSBmdW5jdGlvbiBjb250ZW50KGVudiwgbW9ycGgsIGNvbnRleHQsIHBhdGgpIHtcblxuICB2YXIgbGF6eVZhbHVlLFxuICAgICAgdmFsdWUsXG4gICAgICBvYnNlcnZlciA9IHN1YnRyZWVPYnNlcnZlcixcbiAgICAgIGhlbHBlciA9IGhlbHBlcnMubG9va3VwSGVscGVyKHBhdGgsIGVudiwgY29udGV4dCk7XG5cbiAgbGF6eVZhbHVlID0gc3RyZWFtUHJvcGVydHkoY29udGV4dCwgcGF0aCk7XG5cbiAgLy8gSWYgd2UgaGF2ZSBvdXIgbGF6eSB2YWx1ZSwgdXBkYXRlIG91ciBkb20uXG4gIC8vIG1vcnBoIGlzIGEgbW9ycGggZWxlbWVudCByZXByZXNlbnRpbmcgb3VyIGRvbSBub2RlXG4gIGlmIChsYXp5VmFsdWUpIHtcbiAgICBsYXp5VmFsdWUub25Ob3RpZnkoZnVuY3Rpb24obGF6eVZhbHVlKSB7XG4gICAgICB2YXIgdmFsID0gbGF6eVZhbHVlLnZhbHVlKCk7XG4gICAgICB2YWwgPSAoXy5pc1VuZGVmaW5lZCh2YWwpKSA/ICcnIDogdmFsO1xuICAgICAgaWYoIV8uaXNOdWxsKHZhbCkpe1xuICAgICAgICBtb3JwaC5zZXRDb250ZW50KHZhbCk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICB2YWx1ZSA9IGxhenlWYWx1ZS52YWx1ZSgpO1xuICAgIHZhbHVlID0gKF8uaXNVbmRlZmluZWQodmFsdWUpKSA/ICcnIDogdmFsdWU7XG4gICAgaWYoIV8uaXNOdWxsKHZhbHVlKSl7IG1vcnBoLmFwcGVuZCh2YWx1ZSk7IH1cblxuICAgIC8vIE9ic2VydmUgdGhpcyBjb250ZW50IG1vcnBoJ3MgcGFyZW50J3MgY2hpbGRyZW4uXG4gICAgLy8gV2hlbiB0aGUgbW9ycGggZWxlbWVudCdzIGNvbnRhaW5pbmcgZWxlbWVudCAobW9ycGgpIGlzIHJlbW92ZWQsIGNsZWFuIHVwIHRoZSBsYXp5dmFsdWUuXG4gICAgLy8gVGltZW91dCBkZWxheSBoYWNrIHRvIGdpdmUgb3V0IGRvbSBhIGNoYW5nZSB0byBnZXQgdGhlaXIgcGFyZW50XG4gICAgaWYobW9ycGguX3BhcmVudCl7XG4gICAgICBtb3JwaC5fcGFyZW50Ll9fbGF6eVZhbHVlID0gbGF6eVZhbHVlO1xuICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpe1xuICAgICAgICBpZihtb3JwaC5jb250ZXh0dWFsRWxlbWVudCl7XG4gICAgICAgICAgb2JzZXJ2ZXIub2JzZXJ2ZShtb3JwaC5jb250ZXh0dWFsRWxlbWVudCwgeyBhdHRyaWJ1dGVzOiBmYWxzZSwgY2hpbGRMaXN0OiB0cnVlLCBjaGFyYWN0ZXJEYXRhOiBmYWxzZSwgc3VidHJlZTogdHJ1ZSB9KTtcbiAgICAgICAgfVxuICAgICAgfSwgMCk7XG4gICAgfVxuXG4gIH1cbn07XG5cbi8vIEhhbmRsZSBtb3JwaHMgaW4gZWxlbWVudCB0YWdzXG5ob29rcy5lbGVtZW50ID0gZnVuY3Rpb24gZWxlbWVudChlbnYsIGRvbUVsZW1lbnQsIGNvbnRleHQsIHBhdGgsIHBhcmFtcywgaGFzaCkge1xuXG4gIHZhciBoZWxwZXIgPSBoZWxwZXJzLmxvb2t1cEhlbHBlcihwYXRoLCBlbnYsIGNvbnRleHQpLFxuICAgICAgbGF6eVZhbHVlLFxuICAgICAgdmFsdWU7XG5cbiAgaWYgKGhlbHBlcikge1xuICAgIC8vIEFic3RyYWN0cyBvdXIgaGVscGVyIHRvIHByb3ZpZGUgYSBoYW5kbGViYXJzIHR5cGUgaW50ZXJmYWNlLiBDb25zdHJ1Y3RzIG91ciBMYXp5VmFsdWUuXG4gICAgbGF6eVZhbHVlID0gY29uc3RydWN0SGVscGVyKGRvbUVsZW1lbnQsIHBhdGgsIGNvbnRleHQsIHBhcmFtcywgaGFzaCwge30sIGVudiwgaGVscGVyKTtcbiAgfSBlbHNlIHtcbiAgICBsYXp5VmFsdWUgPSBzdHJlYW1Qcm9wZXJ0eShjb250ZXh0LCBwYXRoKTtcbiAgfVxuXG4gIC8vIFdoZW4gd2UgaGF2ZSBvdXIgbGF6eSB2YWx1ZSBydW4gaXQgYW5kIHN0YXJ0IGxpc3RlbmluZyBmb3IgdXBkYXRlcy5cbiAgbGF6eVZhbHVlLm9uTm90aWZ5KGZ1bmN0aW9uKGxhenlWYWx1ZSkge1xuICAgIGxhenlWYWx1ZS52YWx1ZSgpO1xuICB9KTtcblxuICB2YWx1ZSA9IGxhenlWYWx1ZS52YWx1ZSgpO1xuXG59O1xuXG5ob29rcy5hdHRyaWJ1dGUgPSBmdW5jdGlvbiBhdHRyaWJ1dGUoZW52LCBhdHRyTW9ycGgsIGRvbUVsZW1lbnQsIG5hbWUsIHZhbHVlKXtcblxuICB2YXIgbGF6eVZhbHVlID0gbmV3IExhenlWYWx1ZShmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIHZhbCA9IHZhbHVlLnZhbHVlKCksXG4gICAgICAgICAgICBjaGVja2JveENoYW5nZSxcbiAgICAgICAgICAgIHR5cGUgPSBkb21FbGVtZW50LmdldEF0dHJpYnV0ZShcInR5cGVcIiksXG4gICAgICAgICAgICBpbnB1dFR5cGVzID0geydudWxsJzoxLCAndGV4dCc6MSwgJ2VtYWlsJzoxLCAncGFzc3dvcmQnOjEsICdzZWFyY2gnOjEsICd1cmwnOjEsICd0ZWwnOjEsICdoaWRkZW4nOjF9O1xuXG4gICAgICAgIC8vIElmIGlzIGEgdGV4dCBpbnB1dCBlbGVtZW50J3MgdmFsdWUgcHJvcCB3aXRoIG9ubHkgb25lIHZhcmlhYmxlLCB3aXJlIGRlZmF1bHQgZXZlbnRzXG4gICAgICAgIGlmKCBkb21FbGVtZW50LnRhZ05hbWUgPT09ICdJTlBVVCcgJiYgaW5wdXRUeXBlc1t0eXBlXSAmJiBuYW1lID09PSAndmFsdWUnICl7XG5cbiAgICAgICAgICAvLyBJZiBvdXIgc3BlY2lhbCBpbnB1dCBldmVudHMgaGF2ZSBub3QgYmVlbiBib3VuZCB5ZXQsIGJpbmQgdGhlbSBhbmQgc2V0IGZsYWdcbiAgICAgICAgICBpZighbGF6eVZhbHVlLmV2ZW50c0JvdW5kKXtcbiAgICAgICAgICAgICQoZG9tRWxlbWVudCkub24oJ2NoYW5nZSBpbnB1dCBwcm9wZXJ0eWNoYW5nZScsIGZ1bmN0aW9uKGV2ZW50KXtcbiAgICAgICAgICAgICAgdmFsdWUuc2V0KHZhbHVlLnBhdGgsIHRoaXMudmFsdWUpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBsYXp5VmFsdWUuZXZlbnRzQm91bmQgPSB0cnVlO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGF0dHJNb3JwaC5zZXRDb250ZW50KHZhbCk7XG4gICAgICAgICAgcmV0dXJuIGRvbUVsZW1lbnQudmFsdWUgPSAodmFsKSA/IHZhbCA6ICcnO1xuICAgICAgICB9XG5cbiAgICAgICAgZWxzZSBpZiggZG9tRWxlbWVudC50YWdOYW1lID09PSAnSU5QVVQnICYmICh0eXBlID09PSAnY2hlY2tib3gnIHx8IHR5cGUgPT09ICdyYWRpbycpICYmIG5hbWUgPT09ICdjaGVja2VkJyApe1xuXG4gICAgICAgICAgLy8gSWYgb3VyIHNwZWNpYWwgaW5wdXQgZXZlbnRzIGhhdmUgbm90IGJlZW4gYm91bmQgeWV0LCBiaW5kIHRoZW0gYW5kIHNldCBmbGFnXG4gICAgICAgICAgaWYoIWxhenlWYWx1ZS5ldmVudHNCb3VuZCl7XG4gICAgICAgICAgICAkKGRvbUVsZW1lbnQpLm9uKCdjaGFuZ2UgcHJvcGVydHljaGFuZ2UnLCBmdW5jdGlvbihldmVudCl7XG4gICAgICAgICAgICAgIHZhbHVlLnNldCh2YWx1ZS5wYXRoLCAoKHRoaXMuY2hlY2tlZCkgPyB0cnVlIDogZmFsc2UpLCB7cXVpZXQ6IHRydWV9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgbGF6eVZhbHVlLmV2ZW50c0JvdW5kID0gdHJ1ZTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyBTZXQgdGhlIGF0dHJpYnV0ZSBvbiBvdXIgZWxlbWVudCBmb3IgdmlzdWFsIHJlZmVyYW5jZVxuICAgICAgICAgICghdmFsKSAmJiAodmFsID0gdW5kZWZpbmVkKTtcbiAgICAgICAgICBhdHRyTW9ycGguc2V0Q29udGVudCh2YWwpO1xuXG4gICAgICAgICAgcmV0dXJuIGRvbUVsZW1lbnQuY2hlY2tlZCA9ICh2YWwpID8gdHJ1ZSA6IHVuZGVmaW5lZDtcbiAgICAgICAgfVxuXG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgIF8uaXNTdHJpbmcodmFsKSAmJiAodmFsID0gdmFsLnRyaW0oKSk7XG4gICAgICAgICAgdmFsIHx8ICh2YWwgPSB1bmRlZmluZWQpO1xuICAgICAgICAgIGF0dHJNb3JwaC5zZXRDb250ZW50KHZhbCk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdmFsO1xuXG4gICAgICB9KTtcblxuICB2YWx1ZS5vbk5vdGlmeShmdW5jdGlvbigpe1xuICAgIGxhenlWYWx1ZS52YWx1ZSgpO1xuICB9KTtcbiAgbGF6eVZhbHVlLmFkZERlcGVuZGVudFZhbHVlKHZhbHVlKTtcblxuXG4gIHJldHVybiBsYXp5VmFsdWUudmFsdWUoKTtcblxufTtcblxuaG9va3MuY29tcG9uZW50ID0gZnVuY3Rpb24oZW52LCBtb3JwaCwgY29udGV4dCwgdGFnTmFtZSwgY29udGV4dERhdGEsIHRlbXBsYXRlKSB7XG5cbiAgdmFyIGNvbXBvbmVudCxcbiAgICAgIGVsZW1lbnQsXG4gICAgICBvdXRsZXQsXG4gICAgICBwbGFpbkRhdGEgPSB7fSxcbiAgICAgIGNvbXBvbmVudERhdGEgPSB7fSxcbiAgICAgIGxhenlWYWx1ZSxcbiAgICAgIHZhbHVlO1xuXG4gIC8vIENyZWF0ZSBhIGxhenkgdmFsdWUgdGhhdCByZXR1cm5zIHRoZSB2YWx1ZSBvZiBvdXIgZXZhbHVhdGVkIGNvbXBvbmVudC5cbiAgbGF6eVZhbHVlID0gbmV3IExhenlWYWx1ZShmdW5jdGlvbigpIHtcblxuICAgIC8vIENyZWF0ZSBhIHBsYWluIGRhdGEgb2JqZWN0IGZyb20gdGhlIGxhenl2YWx1ZXMvdmFsdWVzIHBhc3NlZCB0byBvdXIgY29tcG9uZW50XG4gICAgXy5lYWNoKGNvbnRleHREYXRhLCBmdW5jdGlvbih2YWx1ZSwga2V5KSB7XG4gICAgICBwbGFpbkRhdGFba2V5XSA9ICh2YWx1ZS5pc0xhenlWYWx1ZSkgPyB2YWx1ZS52YWx1ZSgpIDogdmFsdWU7XG4gICAgfSk7XG5cbiAgICAvLyBGb3IgZWFjaCBwYXJhbSBwYXNzZWQgdG8gb3VyIHNoYXJlZCBjb21wb25lbnQsIGFkZCBpdCB0byBvdXIgY3VzdG9tIGVsZW1lbnRcbiAgICAvLyBUT0RPOiB0aGVyZSBoYXMgdG8gYmUgYSBiZXR0ZXIgd2F5IHRvIGdldCBzZWVkIGRhdGEgdG8gZWxlbWVudCBpbnN0YW5jZXNcbiAgICAvLyBHbG9iYWwgc2VlZCBkYXRhIGlzIGNvbnN1bWVkIGJ5IGVsZW1lbnQgYXMgaXRzIGNyZWF0ZWQuIFRoaXMgaXMgbm90IHNjb3BlZCBhbmQgdmVyeSBkdW1iLlxuICAgIFJlYm91bmQuc2VlZERhdGEgPSBwbGFpbkRhdGE7XG4gICAgZWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQodGFnTmFtZSk7XG4gICAgUmVib3VuZC5zZWVkRGF0YSA9IHt9O1xuICAgIGNvbXBvbmVudCA9IGVsZW1lbnQuX19jb21wb25lbnRfXztcblxuICAgIC8vIEZvciBlYWNoIGxhenkgcGFyYW0gcGFzc2VkIHRvIG91ciBjb21wb25lbnQsIGNyZWF0ZSBpdHMgbGF6eVZhbHVlXG4gICAgXy5lYWNoKHBsYWluRGF0YSwgZnVuY3Rpb24odmFsdWUsIGtleSkge1xuICAgICAgaWYoY29udGV4dERhdGFba2V5XSAmJiBjb250ZXh0RGF0YVtrZXldLmlzTGF6eVZhbHVlKXtcbiAgICAgICAgY29tcG9uZW50RGF0YVtrZXldID0gc3RyZWFtUHJvcGVydHkoY29tcG9uZW50LCBrZXkpO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgLy8gU2V0IHVwIHR3byB3YXkgYmluZGluZyBiZXR3ZWVuIGNvbXBvbmVudCBhbmQgb3JpZ2luYWwgY29udGV4dCBmb3Igbm9uLWRhdGEgYXR0cmlidXRlc1xuICAgIC8vIFN5bmNpbmcgYmV0d2VlbiBtb2RlbHMgYW5kIGNvbGxlY3Rpb25zIHBhc3NlZCBhcmUgaGFuZGxlZCBpbiBtb2RlbCBhbmQgY29sbGVjdGlvblxuICAgIF8uZWFjaCggY29tcG9uZW50RGF0YSwgZnVuY3Rpb24oY29tcG9uZW50RGF0YVZhbHVlLCBrZXkpe1xuXG4gICAgICAvLyBUT0RPOiBNYWtlIHRoaXMgc3luYyB3b3JrIHdpdGggY29tcGxleCBhcmd1bWVudHMgd2l0aCBtb3JlIHRoYW4gb25lIGNoaWxkXG4gICAgICBpZihjb250ZXh0RGF0YVtrZXldLmNoaWxkcmVuID09PSBudWxsKXtcbiAgICAgICAgLy8gRm9yIGVhY2ggbGF6eSBwYXJhbSBwYXNzZWQgdG8gb3VyIGNvbXBvbmVudCwgaGF2ZSBpdCB1cGRhdGUgdGhlIG9yaWdpbmFsIGNvbnRleHQgd2hlbiBjaGFuZ2VkLlxuICAgICAgICBjb21wb25lbnREYXRhVmFsdWUub25Ob3RpZnkoZnVuY3Rpb24oKXtcbiAgICAgICAgICBjb250ZXh0RGF0YVtrZXldLnNldChjb250ZXh0RGF0YVtrZXldLnBhdGgsIGNvbXBvbmVudERhdGFWYWx1ZS52YWx1ZSgpKTtcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIC8vIEZvciBlYWNoIGxhenkgcGFyYW0gcGFzc2VkIHRvIG91ciBjb21wb25lbnQsIGhhdmUgaXQgdXBkYXRlIHRoZSBjb21wb25lbnQgd2hlbiBjaGFuZ2VkLlxuICAgICAgY29udGV4dERhdGFba2V5XS5vbk5vdGlmeShmdW5jdGlvbigpe1xuICAgICAgICBjb21wb25lbnREYXRhVmFsdWUuc2V0KGtleSwgY29udGV4dERhdGFba2V5XS52YWx1ZSgpKTtcbiAgICAgIH0pO1xuXG4gICAgICAvLyBTZWVkIHRoZSBjYWNoZVxuICAgICAgY29tcG9uZW50RGF0YVZhbHVlLnZhbHVlKCk7XG5cbiAgICAgIC8vIE5vdGlmeSB0aGUgY29tcG9uZW50J3MgbGF6eXZhbHVlIHdoZW4gb3VyIG1vZGVsIHVwZGF0ZXNcbiAgICAgIGNvbnRleHREYXRhW2tleV0uYWRkT2JzZXJ2ZXIoY29udGV4dERhdGFba2V5XS5wYXRoLCBjb250ZXh0KTtcbiAgICAgIGNvbXBvbmVudERhdGFWYWx1ZS5hZGRPYnNlcnZlcihrZXksIGNvbXBvbmVudCk7XG4gICAgICBjb25zb2xlLmxvZyhjb21wb25lbnQuX19uYW1lLCBjb21wb25lbnQuY2lkLCBjb21wb25lbnQpO1xuXG4gICAgfSk7XG5cbiAgICAvLyAvLyBGb3IgZWFjaCBjaGFuZ2Ugb24gb3VyIGNvbXBvbmVudCwgdXBkYXRlIHRoZSBzdGF0ZXMgb2YgdGhlIG9yaWdpbmFsIGNvbnRleHQgYW5kIHRoZSBlbGVtZW50J3MgcHJvZXBydGllcy5cbiAgICBjb21wb25lbnQubGlzdGVuVG8oY29tcG9uZW50LCAnY2hhbmdlJywgZnVuY3Rpb24obW9kZWwpe1xuICAgICAgdmFyIGpzb24gPSBjb21wb25lbnQudG9KU09OKCk7XG5cbiAgICAgIGlmKF8uaXNTdHJpbmcoanNvbikpIHJldHVybjsgLy8gSWYgaXMgYSBzdHJpbmcsIHRoaXMgbW9kZWwgaXMgc2VyYWxpemluZyBhbHJlYWR5XG5cbiAgICAgIC8vIFNldCB0aGUgcHJvcGVydGllcyBvbiBvdXIgZWxlbWVudCBmb3IgdmlzdWFsIHJlZmVyYW5jZSBpZiB3ZSBhcmUgb24gYSB0b3AgbGV2ZWwgYXR0cmlidXRlXG4gICAgICBfLmVhY2goanNvbiwgZnVuY3Rpb24odmFsdWUsIGtleSl7XG4gICAgICAgIC8vIFRPRE86IEN1cnJlbnRseSwgc2hvd2luZyBvYmplY3RzIGFzIHByb3BlcnRpZXMgb24gdGhlIGN1c3RvbSBlbGVtZW50IGNhdXNlcyBwcm9ibGVtcy5cbiAgICAgICAgLy8gTGlua2VkIG1vZGVscyBiZXR3ZWVuIHRoZSBjb250ZXh0IGFuZCBjb21wb25lbnQgYmVjb21lIHRoZSBzYW1lIGV4YWN0IG1vZGVsIGFuZCBhbGwgaGVsbCBicmVha3MgbG9vc2UuXG4gICAgICAgIC8vIEZpbmQgYSB3YXkgdG8gcmVtZWR5IHRoaXMuIFVudGlsIHRoZW4sIGRvbid0IHNob3cgb2JqZWN0cy5cbiAgICAgICAgaWYoKF8uaXNPYmplY3QodmFsdWUpKSl7IHJldHVybjsgfVxuICAgICAgICB2YWx1ZSA9IChfLmlzT2JqZWN0KHZhbHVlKSkgPyBKU09OLnN0cmluZ2lmeSh2YWx1ZSkgOiB2YWx1ZTtcbiAgICAgICAgICB0cnl7IChhdHRyaWJ1dGVzW2tleV0pID8gZWxlbWVudC5zZXRBdHRyaWJ1dGUoa2V5LCB2YWx1ZSkgOiBlbGVtZW50LmRhdGFzZXRba2V5XSA9IHZhbHVlOyB9XG4gICAgICAgICAgY2F0Y2goZSl7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKGUubWVzc2FnZSk7XG4gICAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICAvKiogVGhlIGF0dHJpYnV0ZUNoYW5nZWRDYWxsYmFjayBvbiBvdXIgY3VzdG9tIGVsZW1lbnQgdXBkYXRlcyB0aGUgY29tcG9uZW50J3MgZGF0YS4gKiovXG5cblxuICAvKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuXG4gICAgRW5kIGRhdGEgZGVwZW5kYW5jeSBjaGFpblxuXG4gICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG5cblxuICAgIC8vIFRPRE86IGJyZWFrIHRoaXMgb3V0IGludG8gaXRzIG93biBmdW5jdGlvblxuICAgIC8vIFNldCB0aGUgcHJvcGVydGllcyBvbiBvdXIgZWxlbWVudCBmb3IgdmlzdWFsIHJlZmVyYW5jZSBpZiB3ZSBhcmUgb24gYSB0b3AgbGV2ZWwgYXR0cmlidXRlXG4gICAgdmFyIGNvbXBqc29uID0gY29tcG9uZW50LnRvSlNPTigpO1xuICAgIF8uZWFjaChjb21wanNvbiwgZnVuY3Rpb24odmFsdWUsIGtleSl7XG4gICAgICAvLyBUT0RPOiBDdXJyZW50bHksIHNob3dpbmcgb2JqZWN0cyBhcyBwcm9wZXJ0aWVzIG9uIHRoZSBjdXN0b20gZWxlbWVudCBjYXVzZXMgcHJvYmxlbXMuIExpbmtlZCBtb2RlbHMgYmV0d2VlbiB0aGUgY29udGV4dCBhbmQgY29tcG9uZW50IGJlY29tZSB0aGUgc2FtZSBleGFjdCBtb2RlbCBhbmQgYWxsIGhlbGwgYnJlYWtzIGxvb3NlLiBGaW5kIGEgd2F5IHRvIHJlbWVkeSB0aGlzLiBVbnRpbCB0aGVuLCBkb24ndCBzaG93IG9iamVjdHMuXG4gICAgICBpZigoXy5pc09iamVjdCh2YWx1ZSkpKXsgcmV0dXJuOyB9XG4gICAgICB2YWx1ZSA9IChfLmlzT2JqZWN0KHZhbHVlKSkgPyBKU09OLnN0cmluZ2lmeSh2YWx1ZSkgOiB2YWx1ZTtcbiAgICAgIGlmKCFfLmlzTnVsbCh2YWx1ZSkgJiYgIV8uaXNVbmRlZmluZWQodmFsdWUpKXtcbiAgICAgICAgdHJ5eyAoYXR0cmlidXRlc1trZXldKSA/IGVsZW1lbnQuc2V0QXR0cmlidXRlKGtleSwgdmFsdWUpIDogZWxlbWVudC5kYXRhc2V0W2tleV0gPSB2YWx1ZTsgfVxuICAgICAgICBjYXRjaChlKXtcbiAgICAgICAgICBjb25zb2xlLmVycm9yKGUubWVzc2FnZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcblxuXG4gICAgLy8gSWYgYW4gb3V0bGV0IG1hcmtlciBpcyBwcmVzZW50IGluIGNvbXBvbmVudCdzIHRlbXBsYXRlLCBhbmQgYSB0ZW1wbGF0ZSBpcyBwcm92aWRlZCwgcmVuZGVyIGl0IGludG8gPGNvbnRlbnQ+XG4gICAgb3V0bGV0ID0gZWxlbWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZSgnY29udGVudCcpWzBdO1xuICAgIGlmKHRlbXBsYXRlICYmIF8uaXNFbGVtZW50KG91dGxldCkpe1xuICAgICAgb3V0bGV0LmFwcGVuZENoaWxkKHRlbXBsYXRlLnJlbmRlcihjb250ZXh0LCBlbnYsIG91dGxldCkpO1xuICAgIH1cblxuICAgIC8vIFJldHVybiB0aGUgbmV3IGVsZW1lbnQuXG4gICAgcmV0dXJuIGVsZW1lbnQ7XG4gIH0pO1xuXG5cblxuICAvLyBJZiB3ZSBoYXZlIG91ciBsYXp5IHZhbHVlLCB1cGRhdGUgb3VyIGRvbS5cbiAgLy8gbW9ycGggaXMgYSBtb3JwaCBlbGVtZW50IHJlcHJlc2VudGluZyBvdXIgZG9tIG5vZGVcbiAgaWYgKGxhenlWYWx1ZSkge1xuICAgIGxhenlWYWx1ZS5vbk5vdGlmeShmdW5jdGlvbihsYXp5VmFsdWUpIHtcbiAgICAgIHZhciB2YWwgPSBsYXp5VmFsdWUudmFsdWUoKTtcbiAgICAgIGlmKHZhbCAhPT0gdW5kZWZpbmVkKXsgbW9ycGguc2V0Q29udGVudCh2YWwpOyB9XG4gICAgfSk7XG5cbiAgICB2YWx1ZSA9IGxhenlWYWx1ZS52YWx1ZSgpO1xuICAgIGlmKHZhbHVlICE9PSB1bmRlZmluZWQpeyBtb3JwaC5hcHBlbmQodmFsdWUpOyB9XG4gIH1cbn07XG5cbi8vIHJlZ2lzdGVySGVscGVyIGlzIGEgcHVibGljYWxseSBhdmFpbGFibGUgZnVuY3Rpb24gdG8gcmVnaXN0ZXIgYSBoZWxwZXIgd2l0aCBIVE1MQmFyc1xuXG5leHBvcnQgZGVmYXVsdCBob29rcztcbiIsImltcG9ydCB7IE1vZGVsIH0gZnJvbSBcInJlYm91bmQtZGF0YS9yZWJvdW5kLWRhdGFcIjtcblxudmFyIE5JTCA9IGZ1bmN0aW9uIE5JTCgpe30sXG4gICAgRU1QVFlfQVJSQVkgPSBbXTtcblxuZnVuY3Rpb24gTGF6eVZhbHVlKGZuLCBjb250ZXh0KSB7XG4gIHRoaXMudmFsdWVGbiA9IGZuO1xuICB0aGlzLmNvbnRleHQgPSBjb250ZXh0IHx8IG51bGw7XG4gIF8uYmluZEFsbCh0aGlzLCAndmFsdWUnLCAnc2V0JywgJ2FkZERlcGVuZGVudFZhbHVlJywgJ2FkZE9ic2VydmVyJywgJ25vdGlmeScsICdvbk5vdGlmeScsICdkZXN0cm95Jyk7XG5cbn1cblxuTGF6eVZhbHVlLnByb3RvdHlwZSA9IHtcbiAgaXNMYXp5VmFsdWU6IHRydWUsXG4gIHBhcmVudDogbnVsbCwgLy8gVE9ETzogaXMgcGFyZW50IGV2ZW4gbmVlZGVkPyBjb3VsZCBiZSBtb2RlbGVkIGFzIGEgc3Vic2NyaWJlclxuICBjaGlsZHJlbjogbnVsbCxcbiAgb2JzZXJ2ZXJzOiBudWxsLFxuICBjYWNoZTogTklMLFxuICB2YWx1ZUZuOiBudWxsLFxuICBzdWJzY3JpYmVyczogbnVsbCwgLy8gVE9ETzogZG8gd2UgbmVlZCBtdWx0aXBsZSBzdWJzY3JpYmVycz9cbiAgX2NoaWxkVmFsdWVzOiBudWxsLCAvLyBqdXN0IGZvciByZXVzaW5nIHRoZSBhcnJheSwgbWlnaHQgbm90IHdvcmsgd2VsbCBpZiBjaGlsZHJlbi5sZW5ndGggY2hhbmdlcyBhZnRlciBjb21wdXRhdGlvblxuXG4gIHZhbHVlOiBmdW5jdGlvbigpIHtcbiAgICB2YXIgY2FjaGUgPSB0aGlzLmNhY2hlO1xuICAgIGlmIChjYWNoZSAhPT0gTklMKSB7IHJldHVybiBjYWNoZTsgfVxuXG4gICAgdmFyIGNoaWxkcmVuID0gdGhpcy5jaGlsZHJlbjtcbiAgICBpZiAoY2hpbGRyZW4pIHtcbiAgICAgIHZhciBjaGlsZCxcbiAgICAgICAgICB2YWx1ZXMgPSB0aGlzLl9jaGlsZFZhbHVlcyB8fCBuZXcgQXJyYXkoY2hpbGRyZW4ubGVuZ3RoKTtcblxuICAgICAgZm9yICh2YXIgaSA9IDAsIGwgPSBjaGlsZHJlbi5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgY2hpbGQgPSBjaGlsZHJlbltpXTtcbiAgICAgICAgdmFsdWVzW2ldID0gKGNoaWxkICYmIGNoaWxkLmlzTGF6eVZhbHVlKSA/IGNoaWxkLnZhbHVlKCkgOiBjaGlsZDtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHRoaXMuY2FjaGUgPSB0aGlzLnZhbHVlRm4odmFsdWVzKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHRoaXMuY2FjaGUgPSB0aGlzLnZhbHVlRm4oRU1QVFlfQVJSQVkpO1xuICAgIH1cbiAgfSxcblxuICBzZXQ6IGZ1bmN0aW9uKGtleSwgdmFsdWUsIG9wdGlvbnMpe1xuICAgIGlmKHRoaXMuY29udGV4dCl7XG4gICAgICByZXR1cm4gdGhpcy5jb250ZXh0LnNldChrZXksIHZhbHVlLCBvcHRpb25zKTtcbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG4gIH0sXG5cbiAgYWRkRGVwZW5kZW50VmFsdWU6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgdmFyIGNoaWxkcmVuID0gdGhpcy5jaGlsZHJlbjtcbiAgICBpZiAoIWNoaWxkcmVuKSB7XG4gICAgICBjaGlsZHJlbiA9IHRoaXMuY2hpbGRyZW4gPSBbdmFsdWVdO1xuICAgIH0gZWxzZSB7XG4gICAgICBjaGlsZHJlbi5wdXNoKHZhbHVlKTtcbiAgICB9XG5cbiAgICBpZiAodmFsdWUgJiYgdmFsdWUuaXNMYXp5VmFsdWUpIHsgdmFsdWUucGFyZW50ID0gdGhpczsgfVxuXG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG5cbiAgYWRkT2JzZXJ2ZXI6IGZ1bmN0aW9uKHBhdGgsIGNvbnRleHQpIHtcbiAgICB2YXIgb2JzZXJ2ZXJzID0gdGhpcy5vYnNlcnZlcnMgfHwgKHRoaXMub2JzZXJ2ZXJzID0gW10pLFxuICAgICAgICBwb3NpdGlvbiwgcmVzO1xuXG4gICAgaWYoIV8uaXNPYmplY3QoY29udGV4dCkgfHwgIV8uaXNTdHJpbmcocGF0aCkpe1xuICAgICAgcmV0dXJuIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGFkZGluZyBvYnNlcnZlciBmb3InLCBjb250ZXh0LCBwYXRoKTtcbiAgICB9XG5cbiAgICAvLyBFbnN1cmUgX29ic2VydmVycyBleGlzdHMgYW5kIGlzIGFuIG9iamVjdFxuICAgIGNvbnRleHQuX19vYnNlcnZlcnMgPSBjb250ZXh0Ll9fb2JzZXJ2ZXJzIHx8IHt9O1xuICAgIC8vIEVuc3VyZSBfX29ic2VydmVyc1twYXRoXSBleGlzdHMgYW5kIGlzIGFuIGFycmF5XG4gICAgY29udGV4dC5fX29ic2VydmVyc1twYXRoXSA9IGNvbnRleHQuX19vYnNlcnZlcnNbcGF0aF0gfHwgW107XG5cbiAgICAvLyBBZGQgb3VyIGNhbGxiYWNrLCBzYXZlIHRoZSBwb3NpdGlvbiBpdCBpcyBiZWluZyBpbnNlcnRlZCBzbyB3ZSBjYW4gZ2FyYmFnZSBjb2xsZWN0IGxhdGVyLlxuICAgIHBvc2l0aW9uID0gY29udGV4dC5fX29ic2VydmVyc1twYXRoXS5wdXNoKHRoaXMubm90aWZ5KSAtIDE7XG5cbiAgICAvLyBTYXZlIHRoZSB0eXBlIG9mIG9iamVjdCBldmVudHMgdGhpcyBvYnNlcnZlciBpcyBmb3JcbiAgICByZXMgPSBjb250ZXh0LmdldCh0aGlzLnBhdGgpO1xuICAgIGNvbnRleHQuX19vYnNlcnZlcnNbcGF0aF1bcG9zaXRpb25dLnR5cGUgPSAocmVzICYmIHJlcy5pc0NvbGxlY3Rpb24pID8gJ2NvbGxlY3Rpb24nIDogJ21vZGVsJztcblxuICAgIC8vIExhenl2YWx1ZSBuZWVkcyByZWZlcmFuY2UgdG8gaXRzIG9ic2VydmVycyB0byByZW1vdmUgbGlzdGVuZXJzIG9uIGRlc3Ryb3lcbiAgICBvYnNlcnZlcnMucHVzaCh7Y29udGV4dDogY29udGV4dCwgcGF0aDogcGF0aCwgaW5kZXg6IHBvc2l0aW9ufSk7XG5cbiAgICByZXR1cm4gdGhpcztcbiAgfSxcblxuICBub3RpZnk6IGZ1bmN0aW9uKHNlbmRlcikge1xuICAgIHRyeXtcbiAgICAgIHZhciBjYWNoZSA9IHRoaXMuY2FjaGUsXG4gICAgICAgICAgcGFyZW50LFxuICAgICAgICAgIHN1YnNjcmliZXJzO1xuXG4gICAgICBpZiAoY2FjaGUgIT09IE5JTCkge1xuICAgICAgICBwYXJlbnQgPSB0aGlzLnBhcmVudDtcbiAgICAgICAgc3Vic2NyaWJlcnMgPSB0aGlzLnN1YnNjcmliZXJzO1xuICAgICAgICBjYWNoZSA9IHRoaXMuY2FjaGUgPSBOSUw7XG5cbiAgICAgICAgaWYgKHBhcmVudCkgeyBwYXJlbnQubm90aWZ5KHRoaXMpOyB9XG4gICAgICAgIGlmICghc3Vic2NyaWJlcnMpIHsgcmV0dXJuOyB9XG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBsID0gc3Vic2NyaWJlcnMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgICAgc3Vic2NyaWJlcnNbaV0odGhpcyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGNhdGNoKGVycil7XG4gICAgICBjb25zb2xlLmxvZygnS0lMTElORyBPQlNFUlZFUicsIHNlbmRlcik7XG4gICAgICBjb25zb2xlLmxvZyhlcnIuc3RhY2spO1xuICAgICAgdGhpcy5kZXN0cm95KCk7XG4gICAgfVxuICB9LFxuXG4gIG9uTm90aWZ5OiBmdW5jdGlvbihjYWxsYmFjaykge1xuICAgIHZhciBzdWJzY3JpYmVycyA9IHRoaXMuc3Vic2NyaWJlcnMgfHwgKHRoaXMuc3Vic2NyaWJlcnMgPSBbXSk7XG4gICAgc3Vic2NyaWJlcnMucHVzaChjYWxsYmFjayk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG5cbiAgZGVzdHJveTogZnVuY3Rpb24oKSB7XG4gICAgXy5lYWNoKHRoaXMuY2hpbGRyZW4sIGZ1bmN0aW9uKGNoaWxkKXtcbiAgICAgIGlmIChjaGlsZCAmJiBjaGlsZC5pc0xhenlWYWx1ZSl7IGNoaWxkLmRlc3Ryb3koKTsgfVxuICAgIH0pO1xuICAgIF8uZWFjaCh0aGlzLnN1YnNjcmliZXJzLCBmdW5jdGlvbihzdWJzY3JpYmVyKXtcbiAgICAgIGlmIChzdWJzY3JpYmVyICYmIHN1YnNjcmliZXIuaXNMYXp5VmFsdWUpeyBzdWJzY3JpYmVyLmRlc3Ryb3koKTsgfVxuICAgIH0pO1xuXG4gICAgdGhpcy5wYXJlbnQgPSB0aGlzLmNoaWxkcmVuID0gdGhpcy5jYWNoZSA9IHRoaXMudmFsdWVGbiA9IHRoaXMuc3Vic2NyaWJlcnMgPSB0aGlzLl9jaGlsZFZhbHVlcyA9IG51bGw7XG5cbiAgICBfLmVhY2godGhpcy5vYnNlcnZlcnMsIGZ1bmN0aW9uKG9ic2VydmVyKXtcbiAgICAgIGlmKF8uaXNPYmplY3Qob2JzZXJ2ZXIuY29udGV4dC5fX29ic2VydmVyc1tvYnNlcnZlci5wYXRoXSkpe1xuICAgICAgICBkZWxldGUgb2JzZXJ2ZXIuY29udGV4dC5fX29ic2VydmVyc1tvYnNlcnZlci5wYXRoXVtvYnNlcnZlci5pbmRleF07XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICB0aGlzLm9ic2VydmVycyA9IG51bGw7XG4gIH1cbn07XG5cbmV4cG9ydCBkZWZhdWx0IExhenlWYWx1ZTtcbiIsIi8vIElmIEJhY2tib25lIGhhc24ndCBiZWVuIHN0YXJ0ZWQgeWV0LCB0aHJvdyBlcnJvclxuaWYoIXdpbmRvdy5CYWNrYm9uZSl7XG4gIHRocm93IFwiQmFja2JvbmUgbXVzdCBiZSBvbiB0aGUgcGFnZSBmb3IgUmVib3VuZCB0byBsb2FkLlwiO1xufVxuXG4vLyBMb2FkIG91ciBjbGllbnQgZW52aXJvbm1lbnRcbmltcG9ydCBlbnYgIGZyb20gXCJyZWJvdW5kLXJ1bnRpbWUvZW52XCI7XG5cbi8vIExvYWQgb3VyIHV0aWxzXG5pbXBvcnQgdXRpbHMgZnJvbSBcInJlYm91bmQtcnVudGltZS91dGlsc1wiO1xuXG4vLyBMb2FkIG91ciB1dGlsc1xuaW1wb3J0IHJlZ2lzdGVyQ29tcG9uZW50IGZyb20gXCJyZWJvdW5kLXJ1bnRpbWUvcmVnaXN0ZXJcIjtcblxuLy8gTG9hZCBSZWJvdW5kIERhdGFcbmltcG9ydCB7IE1vZGVsLCBDb2xsZWN0aW9uLCBDb21wdXRlZFByb3BlcnR5IH0gZnJvbSBcInJlYm91bmQtZGF0YS9yZWJvdW5kLWRhdGFcIjtcblxuLy8gTG9hZCBSZWJvdW5kIENvbXBvbmVudHNcbmltcG9ydCBDb21wb25lbnQgZnJvbSBcInJlYm91bmQtcnVudGltZS9jb21wb25lbnRcIjtcblxuLy8gTG9hZCBUaGUgUmVib3VuZCBSb3V0ZXJcbmltcG9ydCBSb3V0ZXIgZnJvbSBcInJlYm91bmQtcm91dGVyL3JlYm91bmQtcm91dGVyXCI7XG5cbi8vIEZldGNoIFJlYm91bmQgQ29uZmlnIE9iamVjdFxudmFyIENvbmZpZyA9IEpTT04ucGFyc2UoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ1JlYm91bmQnKS5pbm5lckhUTUwpO1xuXG4vLyBJZiBCYWNrYm9uZSBkb2Vzbid0IGhhdmUgYW4gYWpheCBtZXRob2QgZnJvbSBhbiBleHRlcm5hbCBET00gbGlicmFyeSwgdXNlIG91cnNcbndpbmRvdy5CYWNrYm9uZS5hamF4ID0gd2luZG93LkJhY2tib25lLiQgJiYgd2luZG93LkJhY2tib25lLiQuYWpheCAmJiB3aW5kb3cuQmFja2JvbmUuYWpheCB8fCB1dGlscy5hamF4O1xuXG4vLyBDcmVhdGUgR2xvYmFsIE9iamVjdFxud2luZG93LlJlYm91bmQgPSB7XG4gIHJlZ2lzdGVySGVscGVyOiBlbnYucmVnaXN0ZXJIZWxwZXIsXG4gIHJlZ2lzdGVyUGFydGlhbDogZW52LnJlZ2lzdGVyUGFydGlhbCxcbiAgcmVnaXN0ZXJDb21wb25lbnQ6IHJlZ2lzdGVyQ29tcG9uZW50LFxuICBNb2RlbDogTW9kZWwsXG4gIENvbGxlY3Rpb246IENvbGxlY3Rpb24sXG4gIENvbXB1dGVkUHJvcGVydHk6IENvbXB1dGVkUHJvcGVydHksXG4gIENvbXBvbmVudDogQ29tcG9uZW50LFxuICBDb25maWc6IENvbmZpZ1xufTtcblxud2luZG93LlJlYm91bmQucm91dGVyID0gbmV3IFJvdXRlcih7Y29uZmlnOiBDb25maWd9KTtcblxuZXhwb3J0IGRlZmF1bHQgUmVib3VuZDtcbiIsImltcG9ydCBDb21wb25lbnQgZnJvbSBcInJlYm91bmQtcnVudGltZS9jb21wb25lbnRcIjtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gcmVnaXN0ZXJDb21wb25lbnQobmFtZSwgb3B0aW9ucykge1xuICB2YXIgc2NyaXB0ID0gb3B0aW9ucy5wcm90b3R5cGU7XG4gIHZhciB0ZW1wbGF0ZSA9IG9wdGlvbnMudGVtcGxhdGU7XG4gIHZhciBzdHlsZSA9IG9wdGlvbnMuc3R5bGU7XG5cbiAgdmFyIGNvbXBvbmVudCA9IENvbXBvbmVudC5leHRlbmQoc2NyaXB0LCB7IF9fbmFtZTogbmFtZSB9KTtcbiAgdmFyIHByb3RvID0gT2JqZWN0LmNyZWF0ZShIVE1MRWxlbWVudC5wcm90b3R5cGUsIHt9KTtcblxuICBwcm90by5jcmVhdGVkQ2FsbGJhY2sgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLl9fY29tcG9uZW50X18gPSBuZXcgY29tcG9uZW50KHtcbiAgICAgIHRlbXBsYXRlOiB0ZW1wbGF0ZSxcbiAgICAgIG91dGxldDogdGhpcyxcbiAgICAgIGRhdGE6IFJlYm91bmQuc2VlZERhdGFcbiAgICB9KTtcbiAgfTtcblxuICBwcm90by5hdHRhY2hlZENhbGxiYWNrID0gZnVuY3Rpb24oKSB7XG4gICAgc2NyaXB0LmF0dGFjaGVkQ2FsbGJhY2sgJiYgc2NyaXB0LmF0dGFjaGVkQ2FsbGJhY2suY2FsbCh0aGlzLl9fY29tcG9uZW50X18pO1xuICB9O1xuXG4gIHByb3RvLmRldGFjaGVkQ2FsbGJhY2sgPSBmdW5jdGlvbigpIHtcbiAgICBzY3JpcHQuZGV0YWNoZWRDYWxsYmFjayAmJiBzY3JpcHQuZGV0YWNoZWRDYWxsYmFjay5jYWxsKHRoaXMuX19jb21wb25lbnRfXyk7XG4gICAgdGhpcy5fX2NvbXBvbmVudF9fLmRlaW5pdGlhbGl6ZSgpO1xuICB9O1xuXG4gIHByb3RvLmF0dHJpYnV0ZUNoYW5nZWRDYWxsYmFjayA9IGZ1bmN0aW9uKGF0dHJOYW1lLCBvbGRWYWwsIG5ld1ZhbCkge1xuICAgIHRoaXMuX19jb21wb25lbnRfXy5fb25BdHRyaWJ1dGVDaGFuZ2UoYXR0ck5hbWUsIG9sZFZhbCwgbmV3VmFsKTtcbiAgICBzY3JpcHQuYXR0cmlidXRlQ2hhbmdlZENhbGxiYWNrICYmIHNjcmlwdC5hdHRyaWJ1dGVDaGFuZ2VkQ2FsbGJhY2suY2FsbCh0aGlzLl9fY29tcG9uZW50X18sIGF0dHJOYW1lLCBvbGRWYWwsIG5ld1ZhbCk7XG4gIH07XG5cbiAgcmV0dXJuIGRvY3VtZW50LnJlZ2lzdGVyRWxlbWVudChuYW1lLCB7IHByb3RvdHlwZTogcHJvdG8gfSk7XG59XG4iLCJ2YXIgJCA9IGZ1bmN0aW9uKHF1ZXJ5KXtcbiAgcmV0dXJuIG5ldyB1dGlscyhxdWVyeSk7XG59O1xuXG52YXIgdXRpbHMgPSBmdW5jdGlvbihxdWVyeSl7XG4gIHZhciBpLCBzZWxlY3RvciA9IF8uaXNFbGVtZW50KHF1ZXJ5KSAmJiBbcXVlcnldIHx8IChxdWVyeSA9PT0gZG9jdW1lbnQpICYmIFtkb2N1bWVudF0gfHwgXy5pc1N0cmluZyhxdWVyeSkgJiYgcXVlcnlTZWxlY3RvckFsbChxdWVyeSkgfHwgW107XG4gIHRoaXMubGVuZ3RoID0gc2VsZWN0b3IubGVuZ3RoO1xuXG4gIC8vIEFkZCBzZWxlY3RvciB0byBvYmplY3QgZm9yIG1ldGhvZCBjaGFpbmluZ1xuICBmb3IgKGk9MDsgaSA8IHRoaXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHRoaXNbaV0gPSBzZWxlY3RvcltpXTtcbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuZnVuY3Rpb24gcmV0dXJuRmFsc2UoKXtyZXR1cm4gZmFsc2U7fVxuZnVuY3Rpb24gcmV0dXJuVHJ1ZSgpe3JldHVybiB0cnVlO31cblxuJC5FdmVudCA9IGZ1bmN0aW9uKCBzcmMsIHByb3BzICkge1xuXHQvLyBBbGxvdyBpbnN0YW50aWF0aW9uIHdpdGhvdXQgdGhlICduZXcnIGtleXdvcmRcblx0aWYgKCAhKHRoaXMgaW5zdGFuY2VvZiAkLkV2ZW50KSApIHtcblx0XHRyZXR1cm4gbmV3ICQuRXZlbnQoIHNyYywgcHJvcHMgKTtcblx0fVxuXG5cdC8vIEV2ZW50IG9iamVjdFxuXHRpZiAoIHNyYyAmJiBzcmMudHlwZSApIHtcblx0XHR0aGlzLm9yaWdpbmFsRXZlbnQgPSBzcmM7XG5cdFx0dGhpcy50eXBlID0gc3JjLnR5cGU7XG5cblx0XHQvLyBFdmVudHMgYnViYmxpbmcgdXAgdGhlIGRvY3VtZW50IG1heSBoYXZlIGJlZW4gbWFya2VkIGFzIHByZXZlbnRlZFxuXHRcdC8vIGJ5IGEgaGFuZGxlciBsb3dlciBkb3duIHRoZSB0cmVlOyByZWZsZWN0IHRoZSBjb3JyZWN0IHZhbHVlLlxuXHRcdHRoaXMuaXNEZWZhdWx0UHJldmVudGVkID0gc3JjLmRlZmF1bHRQcmV2ZW50ZWQgfHxcblx0XHRcdFx0c3JjLmRlZmF1bHRQcmV2ZW50ZWQgPT09IHVuZGVmaW5lZCAmJlxuXHRcdFx0XHQvLyBTdXBwb3J0OiBBbmRyb2lkPDQuMFxuXHRcdFx0XHRzcmMucmV0dXJuVmFsdWUgPT09IGZhbHNlID9cblx0XHRcdHJldHVyblRydWUgOlxuXHRcdFx0cmV0dXJuRmFsc2U7XG5cblx0Ly8gRXZlbnQgdHlwZVxuXHR9IGVsc2Uge1xuXHRcdHRoaXMudHlwZSA9IHNyYztcblx0fVxuXG5cdC8vIFB1dCBleHBsaWNpdGx5IHByb3ZpZGVkIHByb3BlcnRpZXMgb250byB0aGUgZXZlbnQgb2JqZWN0XG5cdGlmICggcHJvcHMgKSB7XG5cdFx0Xy5leHRlbmQoIHRoaXMsIHByb3BzICk7XG5cdH1cblxuICAvLyBDb3B5IG92ZXIgYWxsIG9yaWdpbmFsIGV2ZW50IHByb3BlcnRpZXNcbiAgXy5leHRlbmQodGhpcywgXy5waWNrKCB0aGlzLm9yaWdpbmFsRXZlbnQsIFtcbiAgICAgIFwiYWx0S2V5XCIsIFwiYnViYmxlc1wiLCBcImNhbmNlbGFibGVcIiwgXCJjdHJsS2V5XCIsIFwiY3VycmVudFRhcmdldFwiLCBcImV2ZW50UGhhc2VcIixcbiAgICAgIFwibWV0YUtleVwiLCBcInJlbGF0ZWRUYXJnZXRcIiwgXCJzaGlmdEtleVwiLCBcInRhcmdldFwiLCBcInRpbWVTdGFtcFwiLCBcInZpZXdcIixcbiAgICAgIFwid2hpY2hcIiwgXCJjaGFyXCIsIFwiY2hhckNvZGVcIiwgXCJrZXlcIiwgXCJrZXlDb2RlXCIsIFwiYnV0dG9uXCIsIFwiYnV0dG9uc1wiLFxuICAgICAgXCJjbGllbnRYXCIsIFwiY2xpZW50WVwiLCBcIlwiLCBcIm9mZnNldFhcIiwgXCJvZmZzZXRZXCIsIFwicGFnZVhcIiwgXCJwYWdlWVwiLCBcInNjcmVlblhcIixcbiAgICAgIFwic2NyZWVuWVwiLCBcInRvRWxlbWVudFwiXG4gICAgXSkpO1xuXG5cdC8vIENyZWF0ZSBhIHRpbWVzdGFtcCBpZiBpbmNvbWluZyBldmVudCBkb2Vzbid0IGhhdmUgb25lXG5cdHRoaXMudGltZVN0YW1wID0gc3JjICYmIHNyYy50aW1lU3RhbXAgfHwgKG5ldyBEYXRlKCkpLmdldFRpbWUoKTtcblxuXHQvLyBNYXJrIGl0IGFzIGZpeGVkXG5cdHRoaXMuaXNFdmVudCA9IHRydWU7XG59O1xuXG4kLkV2ZW50LnByb3RvdHlwZSA9IHtcblx0Y29uc3RydWN0b3I6ICQuRXZlbnQsXG5cdGlzRGVmYXVsdFByZXZlbnRlZDogcmV0dXJuRmFsc2UsXG5cdGlzUHJvcGFnYXRpb25TdG9wcGVkOiByZXR1cm5GYWxzZSxcblx0aXNJbW1lZGlhdGVQcm9wYWdhdGlvblN0b3BwZWQ6IHJldHVybkZhbHNlLFxuXG5cdHByZXZlbnREZWZhdWx0OiBmdW5jdGlvbigpIHtcblx0XHR2YXIgZSA9IHRoaXMub3JpZ2luYWxFdmVudDtcblxuXHRcdHRoaXMuaXNEZWZhdWx0UHJldmVudGVkID0gcmV0dXJuVHJ1ZTtcblxuXHRcdGlmICggZSAmJiBlLnByZXZlbnREZWZhdWx0ICkge1xuXHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdH1cblx0fSxcblx0c3RvcFByb3BhZ2F0aW9uOiBmdW5jdGlvbigpIHtcblx0XHR2YXIgZSA9IHRoaXMub3JpZ2luYWxFdmVudDtcblxuXHRcdHRoaXMuaXNQcm9wYWdhdGlvblN0b3BwZWQgPSByZXR1cm5UcnVlO1xuXG5cdFx0aWYgKCBlICYmIGUuc3RvcFByb3BhZ2F0aW9uICkge1xuXHRcdFx0ZS5zdG9wUHJvcGFnYXRpb24oKTtcblx0XHR9XG5cdH0sXG5cdHN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbjogZnVuY3Rpb24oKSB7XG5cdFx0dmFyIGUgPSB0aGlzLm9yaWdpbmFsRXZlbnQ7XG5cblx0XHR0aGlzLmlzSW1tZWRpYXRlUHJvcGFnYXRpb25TdG9wcGVkID0gcmV0dXJuVHJ1ZTtcblxuXHRcdGlmICggZSAmJiBlLnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbiApIHtcblx0XHRcdGUuc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uKCk7XG5cdFx0fVxuXG5cdFx0dGhpcy5zdG9wUHJvcGFnYXRpb24oKTtcblx0fVxufTtcblxuXG51dGlscy5wcm90b3R5cGUgPSB7XG5cbiAgLy8gR2l2ZW4gYSB2YWxpZCBkYXRhIHBhdGgsIHNwbGl0IGl0IGludG8gYW4gYXJyYXkgb2YgaXRzIHBhcnRzLlxuICAvLyBleDogZm9vLmJhclswXS5iYXogLS0+IFsnZm9vJywgJ3ZhcicsICcwJywgJ2JheiddXG4gIHNwbGl0UGF0aDogZnVuY3Rpb24ocGF0aCl7XG4gICAgcmV0dXJuIF8uY29tcGFjdChwYXRoLnNwbGl0KC8oPzpcXC58XFxbfFxcXSkrLykpO1xuICB9LFxuXG4gIC8vIEFwcGxpZXMgZnVuY3Rpb24gYGZ1bmNgIGRlcHRoIGZpcnN0IHRvIGV2ZXJ5IG5vZGUgaW4gdGhlIHN1YnRyZWUgc3RhcnRpbmcgZnJvbSBgcm9vdGBcbiAgd2Fsa1RoZURPTTogZnVuY3Rpb24oZnVuYykge1xuICAgIHZhciBlbCwgcm9vdCwgbGVuID0gdGhpcy5sZW5ndGg7XG4gICAgd2hpbGUobGVuLS0pe1xuICAgICAgcm9vdCA9IHRoaXNbbGVuXTtcbiAgICAgIGZ1bmMocm9vdCk7XG4gICAgICByb290ID0gcm9vdC5maXJzdENoaWxkO1xuICAgICAgd2hpbGUgKHJvb3QpIHtcbiAgICAgICAgICAkKHJvb3QpLndhbGtUaGVET00oZnVuYyk7XG4gICAgICAgICAgcm9vdCA9IHJvb3QubmV4dFNpYmxpbmc7XG4gICAgICB9XG4gICAgfVxuICB9LFxuXG4gIC8vIEV2ZW50cyByZWdpc3RyeS4gQW4gb2JqZWN0IGNvbnRhaW5pbmcgYWxsIGV2ZW50cyBib3VuZCB0aHJvdWdoIHRoaXMgdXRpbCBzaGFyZWQgYW1vbmcgYWxsIGluc3RhbmNlcy5cbiAgX2V2ZW50czoge30sXG5cbiAgLy8gVGFrZXMgdGhlIHRhcmdlZCB0aGUgZXZlbnQgZmlyZWQgb24gYW5kIHJldHVybnMgYWxsIGNhbGxiYWNrcyBmb3IgdGhlIGRlbGVnYXRlZCBlbGVtZW50XG4gIF9oYXNEZWxlZ2F0ZTogZnVuY3Rpb24odGFyZ2V0LCBkZWxlZ2F0ZSwgZXZlbnRUeXBlKXtcbiAgICB2YXIgY2FsbGJhY2tzID0gW107XG5cbiAgICAvLyBHZXQgb3VyIGNhbGxiYWNrc1xuICAgIGlmKHRhcmdldC5kZWxlZ2F0ZUdyb3VwICYmIHRoaXMuX2V2ZW50c1t0YXJnZXQuZGVsZWdhdGVHcm91cF1bZXZlbnRUeXBlXSl7XG4gICAgICBfLmVhY2godGhpcy5fZXZlbnRzW3RhcmdldC5kZWxlZ2F0ZUdyb3VwXVtldmVudFR5cGVdLCBmdW5jdGlvbihjYWxsYmFja3NMaXN0LCBkZWxlZ2F0ZUlkKXtcbiAgICAgICAgaWYoXy5pc0FycmF5KGNhbGxiYWNrc0xpc3QpICYmIChkZWxlZ2F0ZUlkID09PSBkZWxlZ2F0ZS5kZWxlZ2F0ZUlkIHx8ICggZGVsZWdhdGUubWF0Y2hlc1NlbGVjdG9yICYmIGRlbGVnYXRlLm1hdGNoZXNTZWxlY3RvcihkZWxlZ2F0ZUlkKSApKSApe1xuICAgICAgICAgIGNhbGxiYWNrcyA9IGNhbGxiYWNrcy5jb25jYXQoY2FsbGJhY2tzTGlzdCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cblxuICAgIHJldHVybiBjYWxsYmFja3M7XG4gIH0sXG5cbiAgLy8gVHJpZ2dlcnMgYW4gZXZlbnQgb24gYSBnaXZlbiBkb20gbm9kZVxuICB0cmlnZ2VyOiBmdW5jdGlvbihldmVudE5hbWUsIG9wdGlvbnMpe1xuICAgIHZhciBlbCwgbGVuID0gdGhpcy5sZW5ndGg7XG4gICAgd2hpbGUobGVuLS0pe1xuICAgICAgZWwgPSB0aGlzW2xlbl07XG4gICAgICBpZiAoZG9jdW1lbnQuY3JlYXRlRXZlbnQpIHtcbiAgICAgICAgdmFyIGV2ZW50ID0gZG9jdW1lbnQuY3JlYXRlRXZlbnQoJ0hUTUxFdmVudHMnKTtcbiAgICAgICAgZXZlbnQuaW5pdEV2ZW50KGV2ZW50TmFtZSwgdHJ1ZSwgZmFsc2UpO1xuICAgICAgICBlbC5kaXNwYXRjaEV2ZW50KGV2ZW50KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGVsLmZpcmVFdmVudCgnb24nK2V2ZW50TmFtZSk7XG4gICAgICB9XG4gICAgfVxuICB9LFxuXG4gIG9mZjogZnVuY3Rpb24oZXZlbnRUeXBlLCBoYW5kbGVyKXtcbiAgICB2YXIgZWwsIGxlbiA9IHRoaXMubGVuZ3RoLCBldmVudENvdW50O1xuXG4gICAgd2hpbGUobGVuLS0pe1xuXG4gICAgICBlbCA9IHRoaXNbbGVuXTtcbiAgICAgIGV2ZW50Q291bnQgPSAwO1xuXG4gICAgICBpZihlbC5kZWxlZ2F0ZUdyb3VwKXtcbiAgICAgICAgaWYodGhpcy5fZXZlbnRzW2VsLmRlbGVnYXRlR3JvdXBdW2V2ZW50VHlwZV0gJiYgXy5pc0FycmF5KHRoaXMuX2V2ZW50c1tlbC5kZWxlZ2F0ZUdyb3VwXVtldmVudFR5cGVdW2VsLmRlbGVnYXRlSWRdKSl7XG4gICAgICAgICAgXy5lYWNoKHRoaXMuX2V2ZW50c1tlbC5kZWxlZ2F0ZUdyb3VwXVtldmVudFR5cGVdLCBmdW5jdGlvbihkZWxlZ2F0ZSwgaW5kZXgsIGRlbGVnYXRlTGlzdCl7XG4gICAgICAgICAgICBfLmVhY2goZGVsZWdhdGVMaXN0LCBmdW5jdGlvbihjYWxsYmFjaywgaW5kZXgsIGNhbGxiYWNrTGlzdCl7XG4gICAgICAgICAgICAgIGlmKGNhbGxiYWNrID09PSBoYW5kbGVyKXtcbiAgICAgICAgICAgICAgICBkZWxldGUgY2FsbGJhY2tMaXN0W2luZGV4XTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgZXZlbnRDb3VudCsrO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gSWYgdGhlcmUgYXJlIG5vIG1vcmUgb2YgdGhpcyBldmVudCB0eXBlIGRlbGVnYXRlZCBmb3IgdGhpcyBncm91cCwgcmVtb3ZlIHRoZSBsaXN0ZW5lclxuICAgICAgaWYgKGV2ZW50Q291bnQgPT09IDAgJiYgZWwucmVtb3ZlRXZlbnRMaXN0ZW5lcil7XG4gICAgICAgIGVsLnJlbW92ZUV2ZW50TGlzdGVuZXIoZXZlbnRUeXBlLCBoYW5kbGVyLCBmYWxzZSk7XG4gICAgICB9XG4gICAgICBpZiAoZXZlbnRDb3VudCA9PT0gMCAmJiBlbC5kZXRhY2hFdmVudCl7XG4gICAgICAgIGVsLmRldGFjaEV2ZW50KCdvbicrZXZlbnRUeXBlLCBoYW5kbGVyKTtcbiAgICAgIH1cblxuICAgIH1cbiAgfSxcblxuICBvbjogZnVuY3Rpb24gKGV2ZW50TmFtZSwgZGVsZWdhdGUsIGRhdGEsIGhhbmRsZXIpIHtcbiAgICB2YXIgZWwsXG4gICAgICAgIGV2ZW50cyA9IHRoaXMuX2V2ZW50cyxcbiAgICAgICAgbGVuID0gdGhpcy5sZW5ndGgsXG4gICAgICAgIGV2ZW50TmFtZXMgPSBldmVudE5hbWUuc3BsaXQoJyAnKSxcbiAgICAgICAgZGVsZWdhdGVJZCwgZGVsZWdhdGVHcm91cDtcblxuICAgIHdoaWxlKGxlbi0tKXtcbiAgICAgIGVsID0gdGhpc1tsZW5dO1xuXG4gICAgICAvLyBOb3JtYWxpemUgZGF0YSBpbnB1dFxuICAgICAgaWYoXy5pc0Z1bmN0aW9uKGRlbGVnYXRlKSl7XG4gICAgICAgIGhhbmRsZXIgPSBkZWxlZ2F0ZTtcbiAgICAgICAgZGVsZWdhdGUgPSBlbDtcbiAgICAgICAgZGF0YSA9IHt9O1xuICAgICAgfVxuICAgICAgaWYoXy5pc0Z1bmN0aW9uKGRhdGEpKXtcbiAgICAgICAgaGFuZGxlciA9IGRhdGE7XG4gICAgICAgIGRhdGEgPSB7fTtcbiAgICAgIH1cbiAgICAgIGlmKCFfLmlzU3RyaW5nKGRlbGVnYXRlKSAmJiAhXy5pc0VsZW1lbnQoZGVsZWdhdGUpKXtcbiAgICAgICAgY29uc29sZS5lcnJvcihcIkRlbGVnYXRlIHZhbHVlIHBhc3NlZCB0byBSZWJvdW5kJ3MgJC5vbiBpcyBuZWl0aGVyIGFuIGVsZW1lbnQgb3IgY3NzIHNlbGVjdG9yXCIpO1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG5cbiAgICAgIGRlbGVnYXRlSWQgPSBfLmlzU3RyaW5nKGRlbGVnYXRlKSA/IGRlbGVnYXRlIDogKGRlbGVnYXRlLmRlbGVnYXRlSWQgPSBkZWxlZ2F0ZS5kZWxlZ2F0ZUlkIHx8IF8udW5pcXVlSWQoJ2V2ZW50JykpO1xuICAgICAgZGVsZWdhdGVHcm91cCA9IGVsLmRlbGVnYXRlR3JvdXAgPSAoZWwuZGVsZWdhdGVHcm91cCB8fCBfLnVuaXF1ZUlkKCdkZWxlZ2F0ZUdyb3VwJykpO1xuXG4gICAgICBfLmVhY2goZXZlbnROYW1lcywgZnVuY3Rpb24oZXZlbnROYW1lKXtcblxuICAgICAgICAvLyBFbnN1cmUgZXZlbnQgb2JqIGV4aXN0YW5jZVxuICAgICAgICBldmVudHNbZGVsZWdhdGVHcm91cF0gPSBldmVudHNbZGVsZWdhdGVHcm91cF0gfHwge307XG5cbiAgICAgICAgLy8gVE9ETzogdGFrZSBvdXQgb2YgbG9vcFxuICAgICAgICB2YXIgY2FsbGJhY2sgPSBmdW5jdGlvbihldmVudCl7XG4gICAgICAgICAgICAgIHZhciB0YXJnZXQsIGksIGxlbiwgZXZlbnRMaXN0LCBjYWxsYmFja3MsIGNhbGxiYWNrLCBmYWxzeTtcbiAgICAgICAgICAgICAgZXZlbnQgPSBuZXcgJC5FdmVudCgoZXZlbnQgfHwgd2luZG93LmV2ZW50KSk7IC8vIENvbnZlcnQgdG8gbXV0YWJsZSBldmVudFxuICAgICAgICAgICAgICB0YXJnZXQgPSBldmVudC50YXJnZXQgfHwgZXZlbnQuc3JjRWxlbWVudDtcblxuICAgICAgICAgICAgICAvLyBUcmF2ZWwgZnJvbSB0YXJnZXQgdXAgdG8gcGFyZW50IGZpcmluZyBldmVudCBvbiBkZWxlZ2F0ZSB3aGVuIGl0IGV4aXp0c1xuICAgICAgICAgICAgICB3aGlsZSh0YXJnZXQpe1xuXG4gICAgICAgICAgICAgICAgLy8gR2V0IGFsbCBzcGVjaWZpZWQgY2FsbGJhY2tzIChlbGVtZW50IHNwZWNpZmljIGFuZCBzZWxlY3RvciBzcGVjaWZpZWQpXG4gICAgICAgICAgICAgICAgY2FsbGJhY2tzID0gJC5faGFzRGVsZWdhdGUoZWwsIHRhcmdldCwgZXZlbnQudHlwZSk7XG5cbiAgICAgICAgICAgICAgICBsZW4gPSBjYWxsYmFja3MubGVuZ3RoO1xuICAgICAgICAgICAgICAgIGZvcihpPTA7aTxsZW47aSsrKXtcbiAgICAgICAgICAgICAgICAgIGV2ZW50LnRhcmdldCA9IGV2ZW50LnNyY0VsZW1lbnQgPSB0YXJnZXQ7ICAgICAgICAgICAgICAgLy8gQXR0YWNoIHRoaXMgbGV2ZWwncyB0YXJnZXRcbiAgICAgICAgICAgICAgICAgIGV2ZW50LmRhdGEgPSBjYWxsYmFja3NbaV0uZGF0YTsgICAgICAgICAgICAgICAgICAgICAgICAgLy8gQXR0YWNoIG91ciBkYXRhIHRvIHRoZSBldmVudFxuICAgICAgICAgICAgICAgICAgZXZlbnQucmVzdWx0ID0gY2FsbGJhY2tzW2ldLmNhbGxiYWNrLmNhbGwoZWwsIGV2ZW50KTsgICAvLyBDYWxsIHRoZSBjYWxsYmFja1xuICAgICAgICAgICAgICAgICAgZmFsc3kgPSAoIGV2ZW50LnJlc3VsdCA9PT0gZmFsc2UgKSA/IHRydWUgOiBmYWxzeTsgICAgICAvLyBJZiBhbnkgY2FsbGJhY2sgcmV0dXJucyBmYWxzZSwgbG9nIGl0IGFzIGZhbHN5XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gSWYgYW55IG9mIHRoZSBjYWxsYmFja3MgcmV0dXJuZWQgZmFsc2UsIHByZXZlbnQgZGVmYXVsdCBhbmQgc3RvcCBwcm9wYWdhdGlvblxuICAgICAgICAgICAgICAgIGlmKGZhbHN5KXtcbiAgICAgICAgICAgICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgICBldmVudC5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB0YXJnZXQgPSB0YXJnZXQucGFyZW50Tm9kZTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcblxuICAgICAgICAvLyBJZiB0aGlzIGlzIHRoZSBmaXJzdCBldmVudCBvZiBpdHMgdHlwZSwgYWRkIHRoZSBldmVudCBoYW5kbGVyXG4gICAgICAgIGlmKCFldmVudHNbZGVsZWdhdGVHcm91cF1bZXZlbnROYW1lXSl7XG4gICAgICAgICAgaWYgKGVsLmFkZEV2ZW50TGlzdGVuZXIpIHtcbiAgICAgICAgICAgIGVsLmFkZEV2ZW50TGlzdGVuZXIoZXZlbnROYW1lLCBjYWxsYmFjayk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGVsLmF0dGFjaEV2ZW50KCdvbicgKyBldmVudE5hbWUsIGNhbGxiYWNrKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuXG4gICAgICAgIC8vIEFkZCBvdXIgbGlzdGVuZXJcbiAgICAgICAgZXZlbnRzW2RlbGVnYXRlR3JvdXBdW2V2ZW50TmFtZV0gPSBldmVudHNbZGVsZWdhdGVHcm91cF1bZXZlbnROYW1lXSB8fCB7fTtcbiAgICAgICAgZXZlbnRzW2RlbGVnYXRlR3JvdXBdW2V2ZW50TmFtZV1bZGVsZWdhdGVJZF0gPSBldmVudHNbZGVsZWdhdGVHcm91cF1bZXZlbnROYW1lXVtkZWxlZ2F0ZUlkXSB8fCBbXTtcbiAgICAgICAgZXZlbnRzW2RlbGVnYXRlR3JvdXBdW2V2ZW50TmFtZV1bZGVsZWdhdGVJZF0ucHVzaCh7Y2FsbGJhY2s6IGhhbmRsZXIsIGRhdGE6IGRhdGF9KTtcblxuICAgICAgfSwgdGhpcyk7XG4gICAgfVxuICB9LFxuXG4gIGZsYXR0ZW46IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICB2YXIgcmVzdWx0ID0ge307XG4gICAgZnVuY3Rpb24gcmVjdXJzZSAoY3VyLCBwcm9wKSB7XG4gICAgICBpZiAoT2JqZWN0KGN1cikgIT09IGN1cikge1xuICAgICAgICByZXN1bHRbcHJvcF0gPSBjdXI7XG4gICAgICB9IGVsc2UgaWYgKEFycmF5LmlzQXJyYXkoY3VyKSkge1xuICAgICAgICBmb3IodmFyIGk9MCwgbD1jdXIubGVuZ3RoOyBpPGw7IGkrKylcbiAgICAgICAgICByZWN1cnNlKGN1cltpXSwgcHJvcCArIFwiW1wiICsgaSArIFwiXVwiKTtcbiAgICAgICAgICBpZiAobCA9PT0gMClcbiAgICAgICAgICAgIHJlc3VsdFtwcm9wXSA9IFtdO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB2YXIgaXNFbXB0eSA9IHRydWU7XG4gICAgICAgICAgICBmb3IgKHZhciBwIGluIGN1cikge1xuICAgICAgICAgICAgICBpc0VtcHR5ID0gZmFsc2U7XG4gICAgICAgICAgICAgIHJlY3Vyc2UoY3VyW3BdLCBwcm9wID8gcHJvcCtcIi5cIitwIDogcCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoaXNFbXB0eSAmJiBwcm9wKVxuICAgICAgICAgICAgICByZXN1bHRbcHJvcF0gPSB7fTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgcmVjdXJzZShkYXRhLCBcIlwiKTtcbiAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICB9LFxuXG4gIC8vIGh0dHA6Ly9rcmFzaW1pcnRzb25ldi5jb20vYmxvZy9hcnRpY2xlL0Nyb3NzLWJyb3dzZXItaGFuZGxpbmctb2YtQWpheC1yZXF1ZXN0cy1pbi1hYnN1cmRqc1xuICBhamF4OiBmdW5jdGlvbihvcHMpIHtcbiAgICAgIGlmKHR5cGVvZiBvcHMgPT0gJ3N0cmluZycpIG9wcyA9IHsgdXJsOiBvcHMgfTtcbiAgICAgIG9wcy51cmwgPSBvcHMudXJsIHx8ICcnO1xuICAgICAgb3BzLmpzb24gPSBvcHMuanNvbiB8fCB0cnVlO1xuICAgICAgb3BzLm1ldGhvZCA9IG9wcy5tZXRob2QgfHwgJ2dldCc7XG4gICAgICBvcHMuZGF0YSA9IG9wcy5kYXRhIHx8IHt9O1xuICAgICAgdmFyIGdldFBhcmFtcyA9IGZ1bmN0aW9uKGRhdGEsIHVybCkge1xuICAgICAgICAgIHZhciBhcnIgPSBbXSwgc3RyO1xuICAgICAgICAgIGZvcih2YXIgbmFtZSBpbiBkYXRhKSB7XG4gICAgICAgICAgICAgIGFyci5wdXNoKG5hbWUgKyAnPScgKyBlbmNvZGVVUklDb21wb25lbnQoZGF0YVtuYW1lXSkpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBzdHIgPSBhcnIuam9pbignJicpO1xuICAgICAgICAgIGlmKHN0ciAhPT0gJycpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIHVybCA/ICh1cmwuaW5kZXhPZignPycpIDwgMCA/ICc/JyArIHN0ciA6ICcmJyArIHN0cikgOiBzdHI7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiAnJztcbiAgICAgIH07XG4gICAgICB2YXIgYXBpID0ge1xuICAgICAgICAgIGhvc3Q6IHt9LFxuICAgICAgICAgIHByb2Nlc3M6IGZ1bmN0aW9uKG9wcykge1xuICAgICAgICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgICAgICAgIHRoaXMueGhyID0gbnVsbDtcbiAgICAgICAgICAgICAgaWYod2luZG93LkFjdGl2ZVhPYmplY3QpIHsgdGhpcy54aHIgPSBuZXcgQWN0aXZlWE9iamVjdCgnTWljcm9zb2Z0LlhNTEhUVFAnKTsgfVxuICAgICAgICAgICAgICBlbHNlIGlmKHdpbmRvdy5YTUxIdHRwUmVxdWVzdCkgeyB0aGlzLnhociA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpOyB9XG4gICAgICAgICAgICAgIGlmKHRoaXMueGhyKSB7XG4gICAgICAgICAgICAgICAgICB0aGlzLnhoci5vbnJlYWR5c3RhdGVjaGFuZ2UgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgICBpZihzZWxmLnhoci5yZWFkeVN0YXRlID09IDQgJiYgc2VsZi54aHIuc3RhdHVzID09IDIwMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgcmVzdWx0ID0gc2VsZi54aHIucmVzcG9uc2VUZXh0O1xuICAgICAgICAgICAgICAgICAgICAgICAgICBpZihvcHMuanNvbiA9PT0gdHJ1ZSAmJiB0eXBlb2YgSlNPTiAhPSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0ID0gSlNPTi5wYXJzZShyZXN1bHQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgIHNlbGYuZG9uZUNhbGxiYWNrICYmIHNlbGYuZG9uZUNhbGxiYWNrLmFwcGx5KHNlbGYuaG9zdCwgW3Jlc3VsdCwgc2VsZi54aHJdKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgb3BzLnN1Y2Nlc3MgJiYgb3BzLnN1Y2Nlc3MuYXBwbHkoc2VsZi5ob3N0LCBbcmVzdWx0LCBzZWxmLnhocl0pO1xuICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZihzZWxmLnhoci5yZWFkeVN0YXRlID09IDQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5mYWlsQ2FsbGJhY2sgJiYgc2VsZi5mYWlsQ2FsbGJhY2suYXBwbHkoc2VsZi5ob3N0LCBbc2VsZi54aHJdKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgb3BzLmVycm9yICYmIG9wcy5lcnJvci5hcHBseShzZWxmLmhvc3QsIFtzZWxmLnhocl0pO1xuICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICBzZWxmLmFsd2F5c0NhbGxiYWNrICYmIHNlbGYuYWx3YXlzQ2FsbGJhY2suYXBwbHkoc2VsZi5ob3N0LCBbc2VsZi54aHJdKTtcbiAgICAgICAgICAgICAgICAgICAgICBvcHMuY29tcGxldGUgJiYgb3BzLmNvbXBsZXRlLmFwcGx5KHNlbGYuaG9zdCwgW3NlbGYueGhyXSk7XG4gICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGlmKG9wcy5tZXRob2QgPT0gJ2dldCcpIHtcbiAgICAgICAgICAgICAgICAgIHRoaXMueGhyLm9wZW4oXCJHRVRcIiwgb3BzLnVybCArIGdldFBhcmFtcyhvcHMuZGF0YSwgb3BzLnVybCksIHRydWUpO1xuICAgICAgICAgICAgICAgICAgdGhpcy5zZXRIZWFkZXJzKHtcbiAgICAgICAgICAgICAgICAgICAgJ1gtUmVxdWVzdGVkLVdpdGgnOiAnWE1MSHR0cFJlcXVlc3QnXG4gICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgIHRoaXMueGhyLm9wZW4ob3BzLm1ldGhvZCwgb3BzLnVybCwgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgICB0aGlzLnNldEhlYWRlcnMoe1xuICAgICAgICAgICAgICAgICAgICAgICdYLVJlcXVlc3RlZC1XaXRoJzogJ1hNTEh0dHBSZXF1ZXN0JyxcbiAgICAgICAgICAgICAgICAgICAgICAnQ29udGVudC10eXBlJzogJ2FwcGxpY2F0aW9uL3gtd3d3LWZvcm0tdXJsZW5jb2RlZCdcbiAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGlmKG9wcy5oZWFkZXJzICYmIHR5cGVvZiBvcHMuaGVhZGVycyA9PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgICAgICAgdGhpcy5zZXRIZWFkZXJzKG9wcy5oZWFkZXJzKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgb3BzLm1ldGhvZCA9PSAnZ2V0JyA/IHNlbGYueGhyLnNlbmQoKSA6IHNlbGYueGhyLnNlbmQoZ2V0UGFyYW1zKG9wcy5kYXRhKSk7XG4gICAgICAgICAgICAgIH0sIDIwKTtcbiAgICAgICAgICAgICAgcmV0dXJuIHRoaXMueGhyO1xuICAgICAgICAgIH0sXG4gICAgICAgICAgZG9uZTogZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgICAgICAgICAgICAgdGhpcy5kb25lQ2FsbGJhY2sgPSBjYWxsYmFjaztcbiAgICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgICAgfSxcbiAgICAgICAgICBmYWlsOiBmdW5jdGlvbihjYWxsYmFjaykge1xuICAgICAgICAgICAgICB0aGlzLmZhaWxDYWxsYmFjayA9IGNhbGxiYWNrO1xuICAgICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgICB9LFxuICAgICAgICAgIGFsd2F5czogZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgICAgICAgICAgICAgdGhpcy5hbHdheXNDYWxsYmFjayA9IGNhbGxiYWNrO1xuICAgICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgICB9LFxuICAgICAgICAgIHNldEhlYWRlcnM6IGZ1bmN0aW9uKGhlYWRlcnMpIHtcbiAgICAgICAgICAgICAgZm9yKHZhciBuYW1lIGluIGhlYWRlcnMpIHtcbiAgICAgICAgICAgICAgICAgIHRoaXMueGhyICYmIHRoaXMueGhyLnNldFJlcXVlc3RIZWFkZXIobmFtZSwgaGVhZGVyc1tuYW1lXSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICB9O1xuICAgICAgcmV0dXJuIGFwaS5wcm9jZXNzKG9wcyk7XG4gIH1cbn07XG5cbl8uZXh0ZW5kKCQsIHV0aWxzLnByb3RvdHlwZSk7XG5cblxuXG5leHBvcnQgZGVmYXVsdCAkO1xuIl0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9
//The modules for your project will be inlined above
//this snippet. Ask almond to synchronously require the
//module value for 'main' here and return it as the
//value to use for the public API for the built file.

  return require(['rebound-runtime/rebound-runtime']);
}));

require.config({
    baseUrl: "/"
});

require(['Rebound']);