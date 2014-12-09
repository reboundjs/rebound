// jshint ignore: start
/*! @source http://purl.eligrey.com/github/classList.js/blob/master/classList.js*/
;if("document" in self&&!("classList" in document.createElement("_"))){(function(j){if(!("Element" in j)){return}var a="classList",f="prototype",m=j.Element[f],b=Object,k=String[f].trim||function(){return this.replace(/^\s+|\s+$/g,"")},c=Array[f].indexOf||function(q){var p=0,o=this.length;for(;p<o;p++){if(p in this&&this[p]===q){return p}}return -1},n=function(o,p){this.name=o;this.code=DOMException[o];this.message=p},g=function(p,o){if(o===""){throw new n("SYNTAX_ERR","An invalid or illegal string was specified")}if(/\s/.test(o)){throw new n("INVALID_CHARACTER_ERR","String contains an invalid character")}return c.call(p,o)},d=function(s){var r=k.call(s.getAttribute("class")||""),q=r?r.split(/\s+/):[],p=0,o=q.length;for(;p<o;p++){this.push(q[p])}this._updateClassName=function(){s.setAttribute("class",this.toString())}},e=d[f]=[],i=function(){return new d(this)};n[f]=Error[f];e.item=function(o){return this[o]||null};e.contains=function(o){o+="";return g(this,o)!==-1};e.add=function(){var s=arguments,r=0,p=s.length,q,o=false;do{q=s[r]+"";if(g(this,q)===-1){this.push(q);o=true}}while(++r<p);if(o){this._updateClassName()}};e.remove=function(){var t=arguments,s=0,p=t.length,r,o=false;do{r=t[s]+"";var q=g(this,r);if(q!==-1){this.splice(q,1);o=true}}while(++s<p);if(o){this._updateClassName()}};e.toggle=function(p,q){p+="";var o=this.contains(p),r=o?q!==true&&"remove":q!==false&&"add";if(r){this[r](p)}return !o};e.toString=function(){return this.join(" ")};if(b.defineProperty){var l={get:i,enumerable:true,configurable:true};try{b.defineProperty(m,a,l)}catch(h){if(h.number===-2146823252){l.enumerable=false;b.defineProperty(m,a,l)}}}else{if(b[f].__defineGetter__){m.__defineGetter__(a,i)}}}(self))};
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
(function(e,t,n,r){function q(e,t){for(var n=0,r=e.length;n<r;n++)J(e[n],t)}function R(e){for(var t=0,n=e.length,r;t<n;t++)r=e[t],$(r,c[z(r)])}function U(e){return function(t){g.call(L,t)&&(J(t,e),q(t.querySelectorAll(h),e))}}function z(e){var t=e.getAttribute("is");return d.call(l,t?t.toUpperCase():e.nodeName)}function W(e){var t=e.currentTarget,n=e.attrChange,r=e.prevValue,i=e.newValue;t.attributeChangedCallback&&e.attrName!=="style"&&t.attributeChangedCallback(e.attrName,n===e.ADDITION?null:r,n===e.REMOVAL?null:i)}function X(e){var t=U(e);return function(e){t(e.target)}}function V(e,t){var n=this;O.call(n,e,t),B.call(n,{target:n})}function $(e,t){N(e,t),I?I.observe(e,_):(H&&(e.setAttribute=V,e[i]=F(e),e.addEventListener(u,B)),e.addEventListener(o,W)),e.createdCallback&&(e.created=!0,e.createdCallback(),e.created=!1)}function J(e,t){var n,r=z(e),i="attached",s="detached";-1<r&&(C(e,c[r]),r=0,t===i&&!e[i]?(e[s]=!1,e[i]=!0,r=1):t===s&&!e[s]&&(e[i]=!1,e[s]=!0,r=1),r&&(n=e[t+"Callback"])&&n.call(e))}if(r in t)return;var i="__"+r+(Math.random()*1e5>>0),s="extends",o="DOMAttrModified",u="DOMSubtreeModified",a=/^[A-Z][A-Z0-9]*(?:-[A-Z0-9]+)+$/,f=["ANNOTATION-XML","COLOR-PROFILE","FONT-FACE","FONT-FACE-SRC","FONT-FACE-URI","FONT-FACE-FORMAT","FONT-FACE-NAME","MISSING-GLYPH"],l=[],c=[],h="",p=t.documentElement,d=l.indexOf||function(e){for(var t=this.length;t--&&this[t]!==e;);return t},v=n.prototype,m=v.hasOwnProperty,g=v.isPrototypeOf,y=n.defineProperty,b=n.getOwnPropertyDescriptor,w=n.getOwnPropertyNames,E=n.getPrototypeOf,S=n.setPrototypeOf,x=!!n.__proto__,T=n.create||function K(e){return e?(K.prototype=e,new K):this},N=S||(x?function(e,t){return e.__proto__=t,e}:w&&b?function(){function e(e,t){for(var n,r=w(t),i=0,s=r.length;i<s;i++)n=r[i],m.call(e,n)||y(e,n,b(t,n))}return function(t,n){do e(t,n);while(n=E(n));return t}}():function(e,t){for(var n in t)e[n]=t[n];return e}),C=S||x?function(e,t){g.call(t,e)||$(e,t)}:function(e,t){e[i]||(e[i]=n(!0),$(e,t))},k=e.MutationObserver||e.WebKitMutationObserver,L=(e.HTMLElement||e.Element||e.Node).prototype,A=L.cloneNode,O=L.setAttribute,M=t.createElement,_=k&&{attributes:!0,characterData:!0,attributeOldValue:!0},D=k||function(e){H=!1,p.removeEventListener(o,D)},P=!1,H=!0,B,j,F,I;k||(p.addEventListener(o,D),p.setAttribute(i,1),p.removeAttribute(i),H&&(B=function(e){var t=this,n,r,s;if(t===e.target){n=t[i],t[i]=r=F(t);for(s in r){if(!(s in n))return j(0,t,s,n[s],r[s],"ADDITION");if(r[s]!==n[s])return j(1,t,s,n[s],r[s],"MODIFICATION")}for(s in n)if(!(s in r))return j(2,t,s,n[s],r[s],"REMOVAL")}},j=function(e,t,n,r,i,s){var o={attrChange:e,currentTarget:t,attrName:n,prevValue:r,newValue:i};o[s]=e,W(o)},F=function(e){for(var t,n,r={},i=e.attributes,s=0,o=i.length;s<o;s++)t=i[s],n=t.name,n!=="setAttribute"&&(r[n]=t.value);return r})),t[r]=function(n,r){y=n.toUpperCase(),P||(P=!0,k?(I=function(e,t){function n(e,t){for(var n=0,r=e.length;n<r;t(e[n++]));}return new k(function(r){for(var i,s,o=0,u=r.length;o<u;o++)i=r[o],i.type==="childList"?(n(i.addedNodes,e),n(i.removedNodes,t)):(s=i.target,s.attributeChangedCallback&&i.attributeName!=="style"&&s.attributeChangedCallback(i.attributeName,i.oldValue,s.getAttribute(i.attributeName)))})}(U("attached"),U("detached")),I.observe(t,{childList:!0,subtree:!0})):(t.addEventListener("DOMNodeInserted",X("attached")),t.addEventListener("DOMNodeRemoved",X("detached"))),t.addEventListener("readystatechange",function(e){q(t.querySelectorAll(h),"attached")}),t.createElement=function(e,n){var r,i=M.apply(t,arguments);return n&&i.setAttribute("is",e=n.toLowerCase()),r=d.call(l,e.toUpperCase()),-1<r&&$(i,c[r]),i},L.cloneNode=function(e){var t=A.call(this,!!e),n=z(t);return-1<n&&$(t,c[n]),e&&R(t.querySelectorAll(h)),t});if(-1<d.call(l,y))throw new Error("A "+n+" type is already registered");if(!a.test(y)||-1<d.call(f,y))throw new Error("The type "+n+" is invalid");var i=function(){return t.createElement(p,u&&y)},o=r||v,u=m.call(o,s),p=u?r[s]:y,g=l.push(y)-1,y;return h=h.concat(h.length?",":"",u?p+'[is="'+n.toLowerCase()+'"]':p),i.prototype=c[g]=m.call(o,"prototype")?o.prototype:T(L),q(t.querySelectorAll(h),"attached"),i}})(window,document,Object,"registerElement");
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
define("htmlbars-runtime/utils", 
  ["exports"],
  function(__exports__) {
    
    function merge(options, defaults) {
      for (var prop in defaults) {
        if (options.hasOwnProperty(prop)) { continue; }
        options[prop] = defaults[prop];
      }
      return options;
    }

    __exports__.merge = merge;
  });
define("morph/morph", 
  ["exports"],
  function(__exports__) {
    
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

    Morph.prototype.update = function (nodeOrString) {
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
define("morph/dom-helper/build-html-dom", 
  ["exports"],
  function(__exports__) {
    
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
        html = html.replace(/(\s*)(<script)/g, function(match, spaces, tag) {
          spacesBefore.push(spaces);
          return tag;
        });

        html = html.replace(/(<\/script>)(\s*)/g, function(match, tag, spaces) {
          spacesAfter.push(spaces);
          return tag;
        });

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
define("morph/dom-helper", 
  ["../morph/morph","./dom-helper/build-html-dom","./dom-helper/classes","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __exports__) {
    
    /* global window:false */
    var Morph = __dependency1__["default"];
    var buildHTMLDOM = __dependency2__.buildHTMLDOM;
    var svgNamespace = __dependency2__.svgNamespace;
    var svgHTMLIntegrationPoints = __dependency2__.svgHTMLIntegrationPoints;
    var addClasses = __dependency3__.addClasses;
    var removeClasses = __dependency3__.removeClasses;

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

    function isSVG(ns){
      return ns === svgNamespace;
    }

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
      this.document = _document || window.document;
      this.namespace = null;
    }

    var prototype = DOMHelper.prototype;
    prototype.constructor = DOMHelper;

    prototype.insertBefore = function(element, childElement, referenceChild) {
      return element.insertBefore(childElement, referenceChild);
    };

    prototype.appendChild = function(element, childElement) {
      return element.appendChild(childElement);
    };

    prototype.appendText = function(element, text) {
      return element.appendChild(this.document.createTextNode(text));
    };

    prototype.setAttribute = function(element, name, value) {
      element.setAttribute(name, value);
    };

    prototype.removeAttribute = function(element, name) {
      element.removeAttribute(name);
    };

    prototype.setProperty = function(element, name, value) {
      element[name] = value;
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
    } else {
      prototype.createElement = function(tagName) {
        return this.document.createElement(tagName);
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
              before = element.childNodes[offset];
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
      var childNodes = parent.childNodes,
          start = startIndex === -1 ? null : childNodes[startIndex],
          end = endIndex === -1 ? null : childNodes[endIndex];
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
      var isSVGContent = (
        isSVG(this.namespace) &&
        !svgHTMLIntegrationPoints[contextualElement.tagName]
      );

      if (isSVGContent) {
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
define("rebound-runtime/lazy-value", 
  ["exports"],
  function(__exports__) {
    
    var NIL = function NIL(){},
        EMPTY_ARRAY = [];

    function LazyValue(fn) {
      this.valueFn = fn;
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

      value: function() {
        var cache = this.cache;
        if (cache !== NIL) { return cache; }

        var children = this.children;
        if (children) {
          var child,
              values = this._childValues || new Array(children.length);

          for (var i = 0, l = children.length; i < l; i++) {
            child = children[i];
            values[i] = (child && child.isLazyValue) ? child.value() : child;
          }

          return this.cache = this.valueFn(values);
        } else {
          return this.cache = this.valueFn(EMPTY_ARRAY);
        }
      },

      addDependentValue: function(value) {
        var children = this.children;
        if (!children) {
          children = this.children = [value];
        } else {
          children.push(value);
        }

        if (value && value.isLazyValue) { value.parent = this; }

        return this;
      },

      saveObserver: function(value) {
        var observers = this.observers;
        if (!observers) {
          observers = this.observers = [value];
        } else {
          observers.push(value);
        }

        return this;
      },

      notify: function(sender) {
        var cache = this.cache,
            parent,
            subscribers;

        if (cache !== NIL) {
          parent = this.parent;
          subscribers = this.subscribers;
          cache = this.cache = NIL;

          if (parent) { parent.notify(this); }
          if (!subscribers) { return; }
          for (var i = 0, l = subscribers.length; i < l; i++) {
            subscribers[i](this); // TODO: should we worry about exception handling?
          }
        }
      },

      onNotify: function(callback) {
        var subscribers = this.subscribers;
        if (!subscribers) {
          subscribers = this.subscribers = [callback];
        } else {
          subscribers.push(callback);
        }
        return this;
      },

      destroy: function() {
        _.each(this.children, function(child){
          if (child && child.isLazyValue){ child.destroy(); }
        });
        _.each(this.subscribers, function(subscriber){
          if (subscriber && subscriber.isLazyValue){ subscriber.destroy(); }
        });

        this.parent = this.children = this.cache = this.valueFn = this.subscribers = this._childValues = null;

        _.each(this.observers, function(observer){
          if(_.isObject(observer.context.__observers[observer.path])){
            delete observer.context.__observers[observer.path][observer.index];
          }
        });

        this.observers = null;
      }
    };

    __exports__["default"] = LazyValue;
  });
define("rebound-runtime/utils", 
  ["exports"],
  function(__exports__) {
    
    var $ = function(query){
      return new utils(query);
    };

    var utils = function(query){
      var i, selector = _.isElement(query) && [query] || (query === document) && [document] || _.isString(query) && querySelectorAll(query) || [];
      this.length = selector.length;

      // Add selector to object for method chaining
      for (i=0; i < this.length; i++) {
          this[i] = selector[i];
      }

      return this;
    };

    function returnFalse(){return false;}
    function returnTrue(){return true;}

    $.Event = function( src, props ) {
    	// Allow instantiation without the 'new' keyword
    	if ( !(this instanceof $.Event) ) {
    		return new $.Event( src, props );
    	}

    	// Event object
    	if ( src && src.type ) {
    		this.originalEvent = src;
    		this.type = src.type;

    		// Events bubbling up the document may have been marked as prevented
    		// by a handler lower down the tree; reflect the correct value.
    		this.isDefaultPrevented = src.defaultPrevented ||
    				src.defaultPrevented === undefined &&
    				// Support: Android<4.0
    				src.returnValue === false ?
    			returnTrue :
    			returnFalse;

    	// Event type
    	} else {
    		this.type = src;
    	}

    	// Put explicitly provided properties onto the event object
    	if ( props ) {
    		_.extend( this, props );
    	}

      // Copy over all original event properties
      _.extend(this, _.pick( this.originalEvent, [
          "altKey", "bubbles", "cancelable", "ctrlKey", "currentTarget", "eventPhase",
          "metaKey", "relatedTarget", "shiftKey", "target", "timeStamp", "view",
          "which", "char", "charCode", "key", "keyCode", "button", "buttons",
          "clientX", "clientY", "", "offsetX", "offsetY", "pageX", "pageY", "screenX",
          "screenY", "toElement"
        ]));

    	// Create a timestamp if incoming event doesn't have one
    	this.timeStamp = src && src.timeStamp || (new Date()).getTime();

    	// Mark it as fixed
    	this.isEvent = true;
    };

    $.Event.prototype = {
    	constructor: $.Event,
    	isDefaultPrevented: returnFalse,
    	isPropagationStopped: returnFalse,
    	isImmediatePropagationStopped: returnFalse,

    	preventDefault: function() {
    		var e = this.originalEvent;

    		this.isDefaultPrevented = returnTrue;

    		if ( e && e.preventDefault ) {
    			e.preventDefault();
    		}
    	},
    	stopPropagation: function() {
    		var e = this.originalEvent;

    		this.isPropagationStopped = returnTrue;

    		if ( e && e.stopPropagation ) {
    			e.stopPropagation();
    		}
    	},
    	stopImmediatePropagation: function() {
    		var e = this.originalEvent;

    		this.isImmediatePropagationStopped = returnTrue;

    		if ( e && e.stopImmediatePropagation ) {
    			e.stopImmediatePropagation();
    		}

    		this.stopPropagation();
    	}
    };


    utils.prototype = {

      // Given a valid data path, split it into an array of its parts.
      // ex: foo.bar[0].baz --> ['foo', 'var', '0', 'baz']
      splitPath: function(path){
        return _.compact(path.split(/(?:\.|\[|\])+/));
      },

      // Applies function `func` depth first to every node in the subtree starting from `root`
      walkTheDOM: function(func) {
        var el, root, len = this.length;
        while(len--){
          root = this[len];
          func(root);
          root = root.firstChild;
          while (root) {
              $(root).walkTheDOM(func);
              root = root.nextSibling;
          }
        }
      },

      /*  Copyright (C) 2012-2014  Kurt Milam - http://xioup.com | Source: https://gist.github.com/1868955
       *
       *  Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
       *  The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
       *
       *  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
      **/

      // Rolled my own deep extend in leu of having a hard dependancy on lodash.
      deepDefaults: function(dest) {
          var slice = Array.prototype.slice,
              hasOwnProperty = Object.prototype.hasOwnProperty;

          _.each(slice.call(arguments, 1), function(src){

            // For each property in this object
            for (var prop in src) {
              if (hasOwnProperty.call(src, prop)) {

                // If destination
                if(_.isUndefined(dest[prop])){
                    dest[prop] = src[prop];
                }
                else if(_.isObject(dest[prop])){
                  if(dest[prop].isCollection){
                    // Collection -> Collection
                    if(src[prop].isCollection){
                      // Preserve object defaults from the dest with the models from the data src
                      dest[prop] = $.deepDefaults([], dest[prop].models, src[prop].models);
                    }
                    // Array -> Collection
                    else if(_.isArray(src[prop])){
                      dest[prop].set(src[prop], {remove: false, add: false});
                      continue;
                    }
                    //
                    else{
                      dest[prop] = $.deepDefaults([], dest[prop].models, src[prop]);
                    }
                  }
                  else if(_.isArray(dest[prop])){
                    dest[prop] = $.deepDefaults([], dest[prop], src[prop]);
                  }
                  else if((dest[prop].isModel)){
                    dest[prop] = $.deepDefaults({}, dest[prop].attributes, src[prop]);
                  }
                  else{
                    dest[prop] = $.deepDefaults({}, dest[prop], src[prop]);
                  }
                }
              }
            }
          });

          return dest;
        },

      // Events registry. An object containing all events bound through this util shared among all instances.
      _events: {},

      // Takes the targed the event fired on and returns all callbacks for the delegated element
      _hasDelegate: function(target, delegate, eventType){
        var callbacks = [];

        // Get our callbacks
        if(target.delegateGroup && this._events[target.delegateGroup][eventType]){
          _.each(this._events[target.delegateGroup][eventType], function(callbacksList, delegateId){
            if(_.isArray(callbacksList) && (delegateId === delegate.delegateId || ( delegate.matchesSelector && delegate.matchesSelector(delegateId) )) ){
              callbacks = callbacks.concat(callbacksList);
            }
          });
        }

        return callbacks;
      },

      // Triggers an event on a given dom node
      trigger: function(eventName, options){
        var el, len = this.length;
        while(len--){
          el = this[len];
          if (document.createEvent) {
            var event = document.createEvent('HTMLEvents');
            event.initEvent(eventName, true, false);
            el.dispatchEvent(event);
          } else {
            el.fireEvent('on'+eventName);
          }
        }
      },

      off: function(eventType, handler){
        var el, len = this.length, eventCount;

        while(len--){

          el = this[len];
          eventCount = 0;

          if(el.delegateGroup){
            if(this._events[el.delegateGroup][eventType] && _.isArray(this._events[el.delegateGroup][eventType][el.delegateId])){
              _.each(this._events[el.delegateGroup][eventType], function(delegate, index, delegateList){
                _.each(delegateList, function(callback, index, callbackList){
                  if(callback === handler){
                    delete callbackList[index];
                    return;
                  }
                  eventCount++;
                });
              });
            }
          }

          // If there are no more of this event type delegated for this group, remove the listener
          if (eventCount === 0 && el.removeEventListener){
            el.removeEventListener(eventType, handler, false);
          }
          if (eventCount === 0 && el.detachEvent){
            el.detachEvent('on'+eventType, handler);
          }

        }
      },

      on: function (eventName, delegate, data, handler) {
        var el,
            events = this._events,
            len = this.length,
            eventNames = eventName.split(' '),
            delegateId, delegateGroup;

        while(len--){
          el = this[len];

          // Normalize data input
          if(_.isFunction(delegate)){
            handler = delegate;
            delegate = el;
            data = {};
          }
          if(_.isFunction(data)){
            handler = data;
            data = {};
          }
          if(!_.isString(delegate) && !_.isElement(delegate)){
            console.error("Delegate value passed to Rebound's $.on is neither an element or css selector");
            return false;
          }

          delegateId = _.isString(delegate) ? delegate : (delegate.delegateId = delegate.delegateId || _.uniqueId('event'));
          delegateGroup = el.delegateGroup = (el.delegateGroup || _.uniqueId('delegateGroup'));

          _.each(eventNames, function(eventName){

            // Ensure event obj existance
            events[delegateGroup] = events[delegateGroup] || {};

            // TODO: take out of loop
            var callback = function(event){
                  var target, i, len, eventList, callbacks, callback, falsy;
                  event = new $.Event((event || window.event)); // Convert to mutable event
                  target = event.target || event.srcElement;

                  // Travel from target up to parent firing event on delegate when it exizts
                  while(target){

                    // Get all specified callbacks (element specific and selector specified)
                    callbacks = $._hasDelegate(el, target, event.type);

                    len = callbacks.length;
                    for(i=0;i<len;i++){
                      event.target = event.srcElement = target;               // Attach this level's target
                      event.data = callbacks[i].data;                         // Attach our data to the event
                      event.result = callbacks[i].callback.call(el, event);   // Call the callback
                      falsy = ( event.result === false ) ? true : falsy;      // If any callback returns false, log it as falsy
                    }

                    // If any of the callbacks returned false, prevent default and stop propagation
                    if(falsy){
                      event.preventDefault();
                      event.stopPropagation();
                      return false;
                    }

                    target = target.parentNode;
                  }
                };

            // If this is the first event of its type, add the event handler
            if(!events[delegateGroup][eventName]){
              if (el.addEventListener) {
                el.addEventListener(eventName, callback);
              } else {
                el.attachEvent('on' + eventName, callback);
              }
            }


            // Add our listener
            events[delegateGroup][eventName] = events[delegateGroup][eventName] || {};
            events[delegateGroup][eventName][delegateId] = events[delegateGroup][eventName][delegateId] || [];
            events[delegateGroup][eventName][delegateId].push({callback: handler, data: data});

          }, this);
        }
      },

      // http://krasimirtsonev.com/blog/article/Cross-browser-handling-of-Ajax-requests-in-absurdjs
      ajax: function(ops) {
          if(typeof ops == 'string') ops = { url: ops };
          ops.url = ops.url || '';
          ops.json = ops.json || true;
          ops.method = ops.method || 'get';
          ops.data = ops.data || {};
          var getParams = function(data, url) {
              var arr = [], str;
              for(var name in data) {
                  arr.push(name + '=' + encodeURIComponent(data[name]));
              }
              str = arr.join('&');
              if(str !== '') {
                  return url ? (url.indexOf('?') < 0 ? '?' + str : '&' + str) : str;
              }
              return '';
          };
          var api = {
              host: {},
              process: function(ops) {
                  var self = this;
                  this.xhr = null;
                  if(window.ActiveXObject) { this.xhr = new ActiveXObject('Microsoft.XMLHTTP'); }
                  else if(window.XMLHttpRequest) { this.xhr = new XMLHttpRequest(); }
                  if(this.xhr) {
                      this.xhr.onreadystatechange = function() {
                          if(self.xhr.readyState == 4 && self.xhr.status == 200) {
                              var result = self.xhr.responseText;
                              if(ops.json === true && typeof JSON != 'undefined') {
                                  result = JSON.parse(result);
                              }
                              self.doneCallback && self.doneCallback.apply(self.host, [result, self.xhr]);
                              ops.success && ops.success.apply(self.host, [result, self.xhr]);
                          } else if(self.xhr.readyState == 4) {
                              self.failCallback && self.failCallback.apply(self.host, [self.xhr]);
                              ops.error && ops.error.apply(self.host, [self.xhr]);
                          }
                          self.alwaysCallback && self.alwaysCallback.apply(self.host, [self.xhr]);
                          ops.complete && ops.complete.apply(self.host, [self.xhr]);
                      };
                  }
                  if(ops.method == 'get') {
                      this.xhr.open("GET", ops.url + getParams(ops.data, ops.url), true);
                      this.setHeaders({
                        'X-Requested-With': 'XMLHttpRequest'
                      });
                  } else {
                      this.xhr.open(ops.method, ops.url, true);
                      this.setHeaders({
                          'X-Requested-With': 'XMLHttpRequest',
                          'Content-type': 'application/x-www-form-urlencoded'
                      });
                  }
                  if(ops.headers && typeof ops.headers == 'object') {
                      this.setHeaders(ops.headers);
                  }
                  setTimeout(function() {
                      ops.method == 'get' ? self.xhr.send() : self.xhr.send(getParams(ops.data));
                  }, 20);
                  return this.xhr;
              },
              done: function(callback) {
                  this.doneCallback = callback;
                  return this;
              },
              fail: function(callback) {
                  this.failCallback = callback;
                  return this;
              },
              always: function(callback) {
                  this.alwaysCallback = callback;
                  return this;
              },
              setHeaders: function(headers) {
                  for(var name in headers) {
                      this.xhr && this.xhr.setRequestHeader(name, headers[name]);
                  }
              }
          };
          return api.process(ops);
      }
    };

    _.extend($, utils.prototype);



    __exports__["default"] = $;
  });
define("rebound-runtime/helpers", 
  ["rebound-runtime/lazy-value","rebound-runtime/utils","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    
    var LazyValue = __dependency1__["default"];
    var $ = __dependency2__["default"];


    var helpers  = {},
        partials = {};

    helpers.registerPartial = function(name, func){
      if(func && func.isHTMLBars && typeof name === 'string'){
        partials[name] = func;
      }
    };

    // lookupHelper returns the given function from the helpers object. Manual checks prevent user from overriding reserved words.
    helpers.lookupHelper = function(name, env, context) {

      env = env || {};

      name = $.splitPath(name)[0];

      // If a reserved helpers, return it
      if(name === 'attribute') { return this.attribute; }
      if(name === 'if') { return this.if; }
      if(name === 'unless') { return this.unless; }
      if(name === 'each') { return this.each; }
      if(name === 'with') { return this.with; }
      if(name === 'partial') { return this.partial; }
      if(name === 'length') { return this.length; }
      if(name === 'on') { return this.on; }
      if(name === 'concat') { return this.concat; }

      // If not a reserved helper, check env, then global helpers, else return false
      return (env.helpers && _.isObject(context) && _.isObject(env.helpers[context.cid]) && env.helpers[context.cid][name]) || helpers[name] || false;
    };

    helpers.registerHelper = function(name, callback, params){
      if(!_.isString(name)){
        console.error('Name provided to registerHelper must be a string!');
        return;
      }
      if(!_.isFunction(callback)){
        console.error('Callback provided to regierHelper must be a function!');
        return;
      }
      if(helpers.lookupHelper(name)){
        console.error('A helper called "' + name + '" is already registered!');
        return;
      }

      params = (_.isArray(params)) ? params : [params];
      callback.__params = params;

      helpers[name] = callback;

    };

    /*******************************
            Default helpers
    ********************************/

    helpers.on = function(params, hash, options, env){
      var i, callback, delegate, eventName, element,
          root = this,
          len = params.length,
          data = (hash.length) ? hash : options.context;

      // Find our root component
      root = root.__root__;

      eventName = params[0];

      // By default everything is delegated on parent component
      if(len === 2){
        callback = params[1];
        delegate = options.element;
        element = root.el;
      }
      // If a selector is provided, delegate on the helper's element
      else if(len === 3){
        callback = params[2];
        delegate = params[1];
        element = options.element;
      }

      // Attach event
      $(element).on(eventName, delegate, data, function(event){
        return options.helpers.__callOnComponent(callback, event);
      });
    };

    helpers.concat = function(params, hash, options, env) {
      var value = "";
      // TODO: HTMLBars has a bug where hashes containing a single expression are still placed in a concat()
      if(params.length === 1){ return params[0]; }
      for (var i = 0, l = params.length; i < l; i++) {
        value += params[i];
      }
      return value;
    };

    helpers.length = function(params, hash, options, env){
        return params[0] && params[0].length || 0;
    };

    // Attribute helper handles binding data to dom attributes
    helpers.attribute = function(params, hash, options, env) {
      var checkboxChange,
          type = options.element.getAttribute("type"),
          inputTypes = {'null': true, 'text':true, 'email':true, 'password':true, 'search':true, 'url':true, 'tel':true},
          attr;

      // If is a text input element's value prop with only one variable, wire default events
      if(options.element.tagName === 'INPUT' && inputTypes[type] && params[0] === 'value' ){

        // If our special input events have not been bound yet, bind them and set flag
        if(!options.lazyValue.inputObserver){

          $(options.element).on('change input propertychange', function(event){
            options.context.set(options.params[1].path, this.value, {quiet: true});
          });

          options.lazyValue.inputObserver = true;

        }

        // Set the attribute on our element for visual referance
        (_.isUndefined(params[1])) ? options.element.removeAttribute(params[0]) : options.element.setAttribute(params[0], params[1]);

        attr = options.context.get(options.params[1].path);

        return options.element.value = (attr) ? attr : '';
      }

      else if(options.element.tagName === 'INPUT' && (type === 'checkbox' || type === 'radio') && params[0] === 'checked' ){

        // If our special input events have not been bound yet, bind them and set flag
        if(!options.lazyValue.eventsBound){

          $(options.element).on('change propertychange', function(event){
            options.context.set(options.params[1].path, ((this.checked) ? true : false), {quiet: true});
          });

          options.lazyValue.eventsBound = true;
        }

        // Set the attribute on our element for visual referance
        (!params[1]) ? options.element.removeAttribute(params[0]) : options.element.setAttribute(params[0], params[1]);

        return options.element.checked = (params[1]) ? true : undefined;
      }

      else {
        // attr = (params[1]) ? params[1] : undefined;
        if(_.isUndefined(params[1])){
          return options.element.removeAttribute(params[0]);
        }
        else{
          return options.element.setAttribute(params.shift(), params.join(''));
        }
      }

      // If param is falsey, return undefined so we don't render the attr
      return attr;
    };

    helpers.if = function(params, hash, options, env){

      var condition = params[0];

      if(condition === undefined){
        return null;
      }

      if(condition.isModel){
        condition = true;
      }

      // If our condition is an array, handle properly
      if(_.isArray(condition) || condition.isCollection){
        condition = condition.length ? true : false;
      }

      if(condition === 'true'){ condition = true; }
      if(condition === 'false'){ condition = false; }

      // If more than one param, this is not a block helper. Eval as such.
      if(params.length > 1){
        return (condition) ? params[1] : ( params[2] || '');
      }

      // Check our cache. If the value hasn't actually changed, don't evaluate. Important for re-rendering of #each helpers.
      if(options.placeholder.__ifCache === condition){
        return null; // Return null prevent's re-rending of our placeholder.
      }

      options.placeholder.__ifCache = condition;

      // Render the apropreate block statement
      if(condition && options.template){
        return options.template.render(options.context, options, (options.morph.contextualElement || options.morph.element));
      }
      else if(!condition && options.inverse){
        return options.inverse.render(options.context, options, (options.morph.contextualElement || options.morph.element));
      }

      return '';
    };


    // TODO: Proxy to if helper with inverted params
    helpers.unless = function(params, hash, options, env){
      var condition = params[0];

      if(condition === undefined){
        return null;
      }

      if(condition.isModel){
        condition = true;
      }

      // If our condition is an array, handle properly
      if(_.isArray(condition) || condition.isCollection){
        condition = condition.length ? true : false;
      }

      // If more than one param, this is not a block helper. Eval as such.
      if(params.length > 1){
        return (!condition) ? params[1] : ( params[2] || '');
      }

      // Check our cache. If the value hasn't actually changed, don't evaluate. Important for re-rendering of #each helpers.
      if(options.placeholder.__unlessCache === condition){
        return null; // Return null prevent's re-rending of our placeholder.
      }

      options.placeholder.__unlessCache = condition;

      // Render the apropreate block statement
      if(!condition &&  options.template){
        return options.template.render(options.context, options, (options.morph.contextualElement || options.morph.element));
      }
      else if(condition && options.inverse){
        return options.inverse.render(options.context, options, (options.morph.contextualElement || options.morph.element));
      }

      return '';
    };

    // Given an array, predicate and optional extra variable, finds the index in the array where predicate is true
    function findIndex(arr, predicate, cid) {
      if (arr == null) {
        throw new TypeError('findIndex called on null or undefined');
      }
      if (typeof predicate !== 'function') {
        throw new TypeError('predicate must be a function');
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

    helpers.each = function(params, hash, options, env){

      if(_.isNull(params[0]) || _.isUndefined(params[0])){ console.warn('Undefined value passed to each helper! Maybe try providing a default value?', options.context); return null; }

      var value = (params[0].isCollection) ? params[0].models : params[0], // Accepts collections or arrays
          start, end, // used below to remove trailing junk morphs from the dom
          position, // Stores the iterated element's integer position in the dom list
          currentModel = function(element, index, array, cid){
            return element.cid === cid; // Returns true if currently observed element is the current model.
          };

      // Create our morph array if it doesnt exist
      options.placeholder.morphs = options.placeholder.morphs || [];

      _.each(value, function(obj, key, list){

        position = findIndex(options.placeholder.morphs, currentModel, obj.cid);

        // Even if rendered already, update each element's index, key, first and last in case of order changes or element removals
        if(_.isArray(value)){
          obj.set({'@index': key, '@first': (key === 0), '@last': (key === value.length-1)}, {silent: true});
        }

        if(!_.isArray(value) && _.isObject(value)){
          obj.set({'@key' : key}, {silent: true});
        }

        // If this model is not the morph element at this index
        if(position !== key){

          // Create a lazyvalue whos value is the content inside our block helper rendered in the context of this current list object. Returns the rendered dom for this list element.
          var lazyValue = new LazyValue(function(){
            return options.template.render(obj, options, (options.morph.contextualElement || options.morph.element));
          });

          // If this model is rendered somewhere else in the list, destroy it
          if(position > -1){
            options.placeholder.morphs[position].destroy();
          }

          // Destroy the morph we're replacing
          if(options.placeholder.morphs[key]){
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
      for(end; start <= end; end--){
        options.placeholder.morphs[end].destroy();
      }

      // Return null prevent's re-rending of our placeholder. Our placeholder (containing element) now has all the dom we need.
      return null;

    };

    helpers.with = function(params, hash, options, env){

      // Render the content inside our block helper with the context of this object. Returns a dom tree.
      return options.template.render(params[0], options, (options.morph.contextualElement || options.morph.element));

    };

    helpers.partial = function(params, hash, options, env){
      var partial = partials[params[0]];
      if( partial && partial.isHTMLBars ){
        return partial.render(options.context, env);
      }

    };

    __exports__["default"] = helpers;
  });
define("rebound-runtime/hooks", 
  ["rebound-runtime/lazy-value","rebound-runtime/utils","rebound-runtime/helpers","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __exports__) {
    
    var LazyValue = __dependency1__["default"];
    var $ = __dependency2__["default"];
    var helpers = __dependency3__["default"];

    var hooks = {},
        attributes = {  abbr: 1,       "accept-charset": 1,  accept: 1,      accesskey: 1,     action: 1,
                        align: 1,      alink: 1,             alt: 1,         archive: 1,       axis: 1,
                        background: 1, bgcolor: 1,           border: 1,      cellpadding: 1,   cellspacing: 1,
                        char: 1,       charoff: 1,           charset: 1,     checked: 1,       cite: 1,
                        class: 1,      classid: 1,           clear: 1,       code: 1,          codebase: 1,
                        codetype: 1,   color: 1,             cols: 1,        colspan: 1,       compact: 1,
                        content: 1,    coords: 1,            data: 1,        datetime: 1,      declare: 1,
                        defer: 1,      dir: 1,               disabled: 1,    enctype: 1,       face: 1,
                        for: 1,        frame: 1,             frameborder: 1, headers: 1,       height: 1,
                        href: 1,       hreflang: 1,          hspace: 1,      "http-equiv": 1,  id: 1,
                        ismap: 1,      label: 1,             lang: 1,        language: 1,      link: 1,
                        longdesc: 1,   marginheight: 1,      marginwidth: 1, maxlength: 1,     media: 1,
                        method: 1,     multiple: 1,          name: 1,        nohref: 1,        noresize: 1,
                        noshade: 1,    nowrap: 1,            object: 1,      onblur: 1,        onchange: 1,
                        onclick: 1,    ondblclick: 1,        onfocus: 1,     onkeydown: 1,     onkeypress: 1,
                        onkeyup: 1,    onload: 1,            onmousedown: 1, onmousemove: 1,   onmouseout: 1,
                        onmouseover: 1,onmouseup: 1,         onreset: 1,     onselect: 1,      onsubmit: 1,
                        onunload: 1,   profile: 1,           prompt: 1,      readonly: 1,      rel: 1,
                        rev: 1,        rows: 1,              rowspan: 1,     rules: 1,         scheme: 1,
                        scope: 1,      scrolling: 1,         selected: 1,    shape: 1,         size: 1,
                        span: 1,       src: 1,               standby: 1,     start: 1,         style: 1,
                        summary: 1,    tabindex: 1,          target: 1,      text: 1,          title: 1,
                        type: 1,       usemap: 1,            valign: 1,      value: 1,         valuetype: 1,
                        version: 1,    vlink: 1,             vspace: 1,      width: 1  };


    /*******************************
            Hook Utils
    ********************************/

    // Returns the computed property's function if true, else false
    function isComputedProperty(model, path){
      return _.isFunction(model.get(path, {raw: true}));
    }

    // Add a callback to a given context to trigger when its value at 'path' changes.
    function addObserver(context, path, lazyValue, morph) {
      var length, res,
          paths = $.splitPath(path);

      if(!_.isObject(context) || !_.isString(path) || !_.isObject(lazyValue)){
        console.error('Error adding observer for', context, path, lazyValue);
        return;
      }

      // Get actual context if any @parent calls
      while(paths[0] === '@parent'){
        context = context.__parent__;
        paths.shift();
      }
      path = paths.join('.');

      // Ensure _observers exists and is an object
      context.__observers = context.__observers || {};
      // Ensure __obxervers[path] exists and is an array
      context.__observers[path] = context.__observers[path] || [];

      // Save the position this is being inserted into the observers array so we can garbage collect later
      length = context.__observers[path].length;

      // Add our callback
      context.__observers[path].push(function() {
        try{
          return lazyValue.notify();
        } catch(err) {
          // If we run into an error running notify, that means we have a dead dependancy chain. Kill it.
          console.log('KILLING OBSERVER', context.__observers, path, length);
          console.log(err.stack);
          lazyValue.destroy();
          delete context.__observers[path][length];
        }
      });

      res = context.get(lazyValue.path);

      context.__observers[path][length].type = (res && res.isCollection) ? 'collection' : 'model';

      return {context: context, path: path, index: length};
    }

    // Given an object (context) and a path, create a LazyValue object that returns the value of object at context and add it as an observer of the context.
    function streamProperty(context, path) {

      // Our raw value at this path
      var value = context.get(path, {raw: true}),
      // Lazy value that returns the value of context.path
      lazyValue = new LazyValue(function() {
        return context.get(path);
      });

      // Save our path so parent lazyvalues can know the data var or helper they are getting info from
      lazyValue.path = path;

      // If we have custom defined observers, bind to those vars.
      streamComputedPropertyArgs(lazyValue, value, context);

      // Save the observer at this path
      lazyValue.saveObserver(addObserver(context, path, lazyValue));

      return lazyValue;
    }

    function streamComputedPropertyArgs(lazyValue, computedProperty, context){
      if(computedProperty && _.isArray(computedProperty.deps)){

        var params = [];

        for (var i = 0, l = computedProperty.deps.length; i < l; i++) {
          if(!computedProperty.deps[i].isLazyValue) {
            params[i] = streamProperty(context, computedProperty.deps[i]);
          }
          // Re-evaluate this expression when our condition changes
          params[i].onNotify(function(){
            lazyValue.value();
          });

          lazyValue.addDependentValue(params[i]);

          // Whenever context.path changes, have LazyValue notify its listeners.
          lazyValue.saveObserver(addObserver(context, params[i].path, lazyValue));
        }
      }
    }

    function constructHelper(el, path, context, params, hash, options, env, helper) {
      var lazyValue;

      // Extend options with the helper's containeing Morph element. Used by streamify to track data observers
      options.placeholder = el && !el.tagName && el || false; // FIXME: this kinda sucks
      options.element = el && el.tagName && el || false;      // FIXME: this kinda sucks

      // Extend options with hooks and helpers for any subsequent calls from a lazyvalue
      options.params = params;                                 // FIXME: this kinda sucks
      options.hooks = env.hooks;                               // FIXME: this kinda sucks
      options.helpers = env.helpers;                           // FIXME: this kinda sucks
      options.context = context;                               // FIXME: this kinda sucks
      options.dom = env.dom;                                   // FIXME: this kinda sucks
      options.path = path;                                     // FIXME: this kinda sucks
      options.hash = hash || [];                               // FIXME: this kinda sucks

      // Create a lazy value that returns the value of our evaluated helper.
      options.lazyValue = new LazyValue(function() {
        var plainParams = [],
            plainHash = [],
            result,
            relpath = $.splitPath(path),
            first, rest;
            relpath.shift();
            relpath = relpath.join('.');

            rest = $.splitPath(relpath);
            first = rest.shift();
            rest = rest.join('.');

        // Assemble our args and hash variables. For each lazyvalue param, push the lazyValue's value so helpers with no concept of lazyvalues.
        _.each(params, function(param, index){
          plainParams.push(( (param && param.isLazyValue) ? param.value() : param ));
        });
        _.each(hash, function(hash, key){
          plainHash[key] = (hash && hash.isLazyValue) ? hash.value() : hash;
        });

        // Call our helper functions with our assembled args.
        result = helper.apply(context, [plainParams, plainHash, options, env]);

        if(result && relpath){
          return result.get(relpath);
        }

        return result;
      });

      if(helper.deps){
        var computedPropLazyVal = streamProperty(context, path);
        computedPropLazyVal.onNotify(function(){
          options.lazyValue.value();
        });
        options.lazyValue.addDependentValue(computedPropLazyVal);
      }

      options.lazyValue.path = path;

      // For each param passed to our helper, add it to our helper's dependant list. Helper will re-evaluate when one changes.
      params.forEach(function(node) {
        if(node.isLazyValue){
          // Re-evaluate this expression when our condition changes
          node.onNotify(function(){
            options.lazyValue.value();
          });
        }

        if (node && typeof node === 'string' || node && node.isLazyValue) {
          options.lazyValue.addDependentValue(node);
        }
      });

      // If we have custom defined observers, bind to those vars.
      streamComputedPropertyArgs(options.lazyValue, helper, context);

      return options.lazyValue;
    }

    // Given a root element, cleans all of the morph lazyValues for a given subtree
    function cleanSubtree(mutations, observer){
      // For each mutation observed, if there are nodes removed, destroy all associated lazyValues
      mutations.forEach(function(mutation) {
        if(mutation.removedNodes){
          _.each(mutation.removedNodes, function(node, index){
            $(node).walkTheDOM(function(n){
              if(n.__lazyValue && n.__lazyValue.destroy()){
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

    hooks.get = function(context, path){
      return streamProperty(context, path);
    };

    hooks.content = function(placeholder, path, context, params, hash, options, env) {

      var lazyValue,
          value,
          observer = subtreeObserver,
          helper = helpers.lookupHelper(path, env, context);

      // If we were passed a helper, and it was found in our registered helpers
      if (helper) {
        // Abstracts our helper to provide a handlebars type interface. Constructs our LazyValue.
        lazyValue = constructHelper(placeholder, path, context, params, hash, options, env, helper);
      } else {
        // If not a helper, just subscribe to the value
        lazyValue = streamProperty(context, path);
      }

      // If we have our lazy value, update our dom.
      // Placeholder is a morph element representing our dom node
      if (lazyValue) {
        lazyValue.onNotify(function(lazyValue) {
          var val = lazyValue.value();
          val = (_.isUndefined(val)) ? '' : val;
          if(!_.isNull(val)){
            placeholder.update(val);
          }
        });

        value = lazyValue.value();
        value = (_.isUndefined(value)) ? '' : value;
        if(!_.isNull(value)){ placeholder.append(value); }

        // Observe this content morph's parent's children.
        // When the morph element's containing element (placeholder) is removed, clean up the lazyvalue.
        // Timeout delay hack to give out dom a change to get their parent
        if(placeholder._parent){
          placeholder._parent.__lazyValue = lazyValue;
          setTimeout(function(){
            if(placeholder.contextualElement){
              observer.observe(placeholder.contextualElement, { attributes: false, childList: true, characterData: false, subtree: true });
            }
          }, 0);
        }

      }
    };

    hooks.attribute = function(domElement, attributeName, quoted, context, parts, options, env){
      parts.unshift(attributeName);
      hooks.element(domElement, 'attribute', context, parts, [], options, env);
    };

    // Handle placeholders in element tags
    hooks.element = function(element, path, context, params, hash, options, env) {
      var helper = helpers.lookupHelper(path, env, context),
          lazyValue,
          value;

      if (helper) {
        // Abstracts our helper to provide a handlebars type interface. Constructs our LazyValue.
        lazyValue = constructHelper(element, path, context, params, hash, options, env, helper);
      } else {
        lazyValue = streamProperty(context, path);
      }

      // When we have our lazy value run it and start listening for updates.
      lazyValue.onNotify(function(lazyValue) {
        lazyValue.value();
      });

      value = lazyValue.value();

    };

    hooks.component = function(placeholder, path, context, hash, options, env) {
      var component,
          element,
          outlet,
          data = {},
          lazyData = {},
          lazyValue;

      // Create a plain data object from the lazyvalues/values passed to our component
      _.each(hash, function(value, key) {
        data[key] = (value.isLazyValue) ? value.value() : value;
      });

      // Create a lazy value that returns the value of our evaluated component.
      lazyValue = new LazyValue(function() {

        // For each param passed to our shared component, add it to our custom element
        // TODO: there has to be a better way to get seed data to element instances
        // Global seed data is consumed by element as its created. This is not scoped and very dumb.
        Rebound.seedData = data;
        element = document.createElement(path);
        Rebound.seedData = {};
        component = element.__component__;

        // For each param passed to our shared component, create a new lazyValue
        _.each(data, function(value, key) {
          lazyData[key] = streamProperty(component, key);
        });

        // For each param passed to our helper, have it update the original context when changed.
        // For each new lazyValue, bind it to its original context's value and to its scoped context
        _.each( lazyData, function(value, key){

          // If this value was passed in from outside, set up our two way data binding
          // TODO: Make this sync work with complex arguments with more than one part
          if(hash[key] && hash[key].children && hash[key].children.length === 1){
            value.onNotify(function(){
              // Update the context where we inherited this value from.
              context.set(hash[key].children[0].path, value.value());
            });

            // For each param passed to our component, if it exists, add it to our component's dependant list. Value will re-evaluate when its original changes.
            if(hash[key] && hash[key].isLazyValue){
              hash[key].onNotify(function(){
                component.set(key, hash[key].value());
                value.notify();
              });
            }
          }

          // Seed the cache
          value.value();

          // Notify the component's lazyvalue when our model updates
          value.saveObserver(addObserver(component, key, value, placeholder));
        });

      /*******************************************************

        Set up our data dependancy chains.

          Players:

            Context: The original context of the data passed into our component

            Component: The data stricture of our component that handles all syncronization and binding

            Element: The actual dom element associated with our component

          Chain structure:

            Context <---> Component <---> Element

      *******************************************************/

        // For each change on our component, update the states of the original context and the element's proeprties.
        context.listenTo(component, 'change ', function(model){

          var componentPath = (model.__path()),
              componentAttrs = model.changedAttributes(),
              contextPath = '',
              contextAttrs = {},
              json = model.toJSON();


          // If changed model is our top level component object, then the value changed is a primitive
          // Only update the values that were passed in to our component
          // Variable names may change when passed into components (ex: user={{person}}).
          // When user changes on the component, be sure to update the person variable
          if(componentPath === ""){
            // For each attribute modified on our component, update the context's corrosponding key
            _.each(componentAttrs, function(value, componentKey){
              // TODO: Make this sync work with complex arguments with more than one part
              if(hash[componentKey] && hash[componentKey].children &&  hash[componentKey].children.length === 1){
                contextAttrs[hash[componentKey].children[0].path] = value;
              }
            });
            context.get(contextPath).set(contextAttrs);
          }
          // If changed model is a sub object of the component, only update the values that were passed in to our component
          else{
            // If base model was renamed, create the actual path on the context we're updating
            contextPath = $.splitPath(componentPath);
            if(hash.hasOwnProperty(contextPath[0])){
              // TODO: Make this sync work with complex arguments with more than one part
              contextPath[0] = hash[contextPath[0]].children[0].path;
              contextPath = contextPath.join('.');
              // All values were passed in as is, use all of them
              contextAttrs = componentAttrs;
              context.get(contextPath).set(contextAttrs);
            }
          }


          // Set the properties on our element for visual referance if we are on a top level attribute
          if(componentPath === ""){
            _.each(json, function(value, key){
              // TODO: Currently, showing objects as properties on the custom element causes problems. Linked models between the context and component become the same exact model and all hell breaks loose. Find a way to remedy this. Until then, don't show objects.
              if((_.isObject(value))){ return; }
              value = (_.isObject(value)) ? JSON.stringify(value) : value;
              if(!_.isUndefined(value)){
                try{ (attributes[key]) ? element.setAttribute(key, value) : element.dataset[key] = value; }
                catch(e){
                  console.error(e.message);
                }
              }
            });
          }
        });

        // For each change to the original context, update our component
        component.listenTo(context, 'change', function(model){

          var path = model.__path(),
              split = path.split('.');

          if(!hash[split[0]]){
            return;
          }

          if(component.get(path)){
            component.get(path).set(model.changedAttributes());
          }
        });

        /** The attributeChangedCallback on our custom element updates the component's data. **/


      /*******************************************************

        End data dependancy chain

      *******************************************************/


        // TODO: break this out into its own function
        // Set the properties on our element for visual referance if we are on a top level attribute
        var compjson = component.toJSON();
        _.each(compjson, function(value, key){
          // TODO: Currently, showing objects as properties on the custom element causes problems. Linked models between the context and component become the same exact model and all hell breaks loose. Find a way to remedy this. Until then, don't show objects.
          if((_.isObject(value))){ return; }
          value = (_.isObject(value)) ? JSON.stringify(value) : value;
          if(!_.isNull(value) && !_.isUndefined(value)){
            try{ (attributes[key]) ? element.setAttribute(key, value) : element.dataset[key] = value; }
            catch(e){
              console.error(e.message);
            }
          }
        });


        // If an outlet marker is present in component's template, and options.render is a function, render it into <content>
        outlet = element.getElementsByTagName('content')[0];
        if(options.template && _.isElement(outlet)){
          outlet.appendChild(options.template.render(context, env, outlet));
        }

        // Return the new element.
        return element;
      });



      // If we have our lazy value, update our dom.
      // Placeholder is a morph element representing our dom node
      if (lazyValue) {
        lazyValue.onNotify(function(lazyValue) {
          var val = lazyValue.value();
          if(val !== undefined){ placeholder.update(val); }
        });

        value = lazyValue.value();
        if(value !== undefined){ placeholder.append(value); }
      }
    };


    hooks.subexpr = function(path, context, params, hash, options, env) {

      var helper = helpers.lookupHelper(path, env, context),
          lazyValue;

      if (helper) {
        // Abstracts our helper to provide a handlebars type interface. Constructs our LazyValue.
        lazyValue = constructHelper((options || true), path, context, params, hash, options, env, helper);
      } else {
        lazyValue = streamProperty(context, path);
      }

      return lazyValue;
    };

    // registerHelper is a publically available function to register a helper with HTMLBars

    __exports__["default"] = hooks;
  });
define("rebound-runtime/env", 
  ["htmlbars-runtime/utils","morph/dom-helper","rebound-runtime/hooks","rebound-runtime/helpers","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __exports__) {
    
    var merge = __dependency1__.merge;
    var DOMHelper = __dependency2__["default"];
    var hooks = __dependency3__["default"];
    var helpers = __dependency4__["default"];

    var env = {
      registerPartial: helpers.registerPartial,
      registerHelper: helpers.registerHelper,
      helpers: helpers.helpers,
      hooks: hooks
    };

    env.hydrate = function(spec, options){
      // Return a wrapper function that will merge user provided helpers and hooks with our defaults
      return function(data, options){
        // Ensure we have a well-formed object as var options
        var env = options || {},
            contextElement = data.el || document.documentElement;
        env.helpers = env.helpers || {};
        env.hooks = env.hooks || {};
        env.dom = env.dom || new DOMHelper();

        // Merge our default helpers and hooks with user provided helpers
        env.helpers = merge(env.helpers, helpers.helpers);
        env.hooks = merge(env.hooks, hooks);

        // Call our func with merged helpers and hooks
        return spec.render(data, env, contextElement);
      };
    };

    // Notify all of a object's observers of the change, execute the callback
    env.notify = function(obj, paths, type) {

        // If path is not an array of keys, wrap it in array
      paths = (!_.isArray(paths)) ? [paths] : paths;

      // For each path, alert each observer and call its callback
      _.each(paths, function(path){
        _.each(obj.__observers, function(observers, obsPath){
          // Trigger all partial or exact observer matches
          if(obsPath === path || obsPath.indexOf(path + '.') === 0 || path.indexOf(obsPath + '.') === 0){
            _.each(observers, function(callback, index) {
              // If this is a collection change (add, sort, remove) trigger everything, otherwise only trigger property change callbacks
              if(_.isFunction(callback) && (callback.type === 'model' || type === 'collection')){ callback(); }
            });
          }
        });
      });

    };

    __exports__["default"] = env;
  });
define("property-compiler/tokenizer", 
  ["exports"],
  function(__exports__) {
    
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
        for (var opt in defaultOptions) if (!Object.prototype.hasOwnProperty.call(options, opt))
          options[opt] = defaultOptions[opt];
        sourceFile = options.sourceFile || null;

        isKeyword = options.ecmaVersion >= 6 ? isEcma6Keyword : isEcma5AndLessKeyword;
      }

      // The `getLineInfo` function is mostly useful when the
      // `locations` option is off (for performance reasons) and you
      // want to find the line/column position for a given character
      // offset. `input` should be the code string that the offset refers
      // into.

      var getLineInfo = exports.getLineInfo = function(input, offset) {
        for (var line = 1, cur = 0;;) {
          lineBreak.lastIndex = cur;
          var match = lineBreak.exec(input);
          if (match && match.index < offset) {
            ++line;
            cur = match.index + match[0].length;
          } else break;
        }
        return {line: line, column: offset - cur};
      };

      // Acorn is organized as a tokenizer and a recursive-descent parser.
      // The `tokenize` export provides an interface to the tokenizer.
      // Because the tokenizer is optimized for being efficiently used by
      // the Acorn parser itself, this interface is somewhat crude and not
      // very modular. Performing another parse or call to `tokenize` will
      // reset the internal state, and invalidate existing tokenizers.

      exports.tokenize = function(inpt, opts) {
        input = String(inpt); inputLen = input.length;
        setOptions(opts);
        initTokenState();

        var t = {};
        function getToken(forceRegexp) {
          lastEnd = tokEnd;
          readToken(forceRegexp);
          t.start = tokStart; t.end = tokEnd;
          t.startLoc = tokStartLoc; t.endLoc = tokEndLoc;
          t.type = tokType; t.value = tokVal;
          return t;
        }
        getToken.jumpTo = function(pos, reAllowed) {
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
        err.pos = pos; err.loc = loc; err.raisedAt = tokPos;
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

      var _num = {type: "num"}, _regexp = {type: "regexp"}, _string = {type: "string"};
      var _name = {type: "name"}, _eof = {type: "eof"};

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

      var _break = {keyword: "break"}, _case = {keyword: "case", beforeExpr: true}, _catch = {keyword: "catch"};
      var _continue = {keyword: "continue"}, _debugger = {keyword: "debugger"}, _default = {keyword: "default"};
      var _do = {keyword: "do", isLoop: true}, _else = {keyword: "else", beforeExpr: true};
      var _finally = {keyword: "finally"}, _for = {keyword: "for", isLoop: true}, _function = {keyword: "function"};
      var _if = {keyword: "if"}, _return = {keyword: "return", beforeExpr: true}, _switch = {keyword: "switch"};
      var _throw = {keyword: "throw", beforeExpr: true}, _try = {keyword: "try"}, _var = {keyword: "var"};
      var _let = {keyword: "let"}, _const = {keyword: "const"};
      var _while = {keyword: "while", isLoop: true}, _with = {keyword: "with"}, _new = {keyword: "new", beforeExpr: true};
      var _this = {keyword: "this"};

      // The keywords that denote values.

      var _null = {keyword: "null", atomValue: null}, _true = {keyword: "true", atomValue: true};
      var _false = {keyword: "false", atomValue: false};

      // Some keywords are treated as regular operators. `in` sometimes
      // (when parsing `for`) needs to be tested against specifically, so
      // we assign a variable name to it for quick comparing.

      var _in = {keyword: "in", binop: 7, beforeExpr: true};

      // Map keyword names to token types.

      var keywordTypes = {"break": _break, "case": _case, "catch": _catch,
                          "continue": _continue, "debugger": _debugger, "default": _default,
                          "do": _do, "else": _else, "finally": _finally, "for": _for,
                          "function": _function, "if": _if, "return": _return, "switch": _switch,
                          "throw": _throw, "try": _try, "var": _var, "let": _let, "const": _const,
                          "while": _while, "with": _with,
                          "null": _null, "true": _true, "false": _false, "new": _new, "in": _in,
                          "instanceof": {keyword: "instanceof", binop: 7, beforeExpr: true}, "this": _this,
                          "typeof": {keyword: "typeof", prefix: true, beforeExpr: true},
                          "void": {keyword: "void", prefix: true, beforeExpr: true},
                          "delete": {keyword: "delete", prefix: true, beforeExpr: true}};

      // Punctuation token types. Again, the `type` property is purely for debugging.

      var _bracketL = {type: "[", beforeExpr: true}, _bracketR = {type: "]"}, _braceL = {type: "{", beforeExpr: true};
      var _braceR = {type: "}"}, _parenL = {type: "(", beforeExpr: true}, _parenR = {type: ")"};
      var _comma = {type: ",", beforeExpr: true}, _semi = {type: ";", beforeExpr: true};
      var _colon = {type: ":", beforeExpr: true}, _dot = {type: "."}, _ellipsis = {type: "..."}, _question = {type: "?", beforeExpr: true};

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

      var _slash = {binop: 10, beforeExpr: true}, _eq = {isAssign: true, beforeExpr: true};
      var _assign = {isAssign: true, beforeExpr: true};
      var _incDec = {postfix: true, prefix: true, isUpdate: true}, _prefix = {prefix: true, beforeExpr: true};
      var _logicalOR = {binop: 1, beforeExpr: true};
      var _logicalAND = {binop: 2, beforeExpr: true};
      var _bitwiseOR = {binop: 3, beforeExpr: true};
      var _bitwiseXOR = {binop: 4, beforeExpr: true};
      var _bitwiseAND = {binop: 5, beforeExpr: true};
      var _equality = {binop: 6, beforeExpr: true};
      var _relational = {binop: 7, beforeExpr: true};
      var _bitShift = {binop: 8, beforeExpr: true};
      var _plusMin = {binop: 9, prefix: true, beforeExpr: true};
      var _multiplyModulo = {binop: 10, beforeExpr: true};

      // Provide access to the token types for external users of the
      // tokenizer.

      exports.tokTypes = {bracketL: _bracketL, bracketR: _bracketR, braceL: _braceL, braceR: _braceR,
                          parenL: _parenL, parenR: _parenR, comma: _comma, semi: _semi, colon: _colon,
                          dot: _dot, ellipsis: _ellipsis, question: _question, slash: _slash, eq: _eq,
                          name: _name, eof: _eof, num: _num, regexp: _regexp, string: _string};
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
        words = words.split(" ");
        var f = "", cats = [];
        out: for (var i = 0; i < words.length; ++i) {
          for (var j = 0; j < cats.length; ++j)
            if (cats[j][0].length == words[i].length) {
              cats[j].push(words[i]);
              continue out;
            }
          cats.push([words[i]]);
        }
        function compareTo(arr) {
          if (arr.length == 1) return f += "return str === " + JSON.stringify(arr[0]) + ";";
          f += "switch(str){";
          for (var i = 0; i < arr.length; ++i) f += "case " + JSON.stringify(arr[i]) + ":";
          f += "return true}return false;";
        }

        // When there are more than three length categories, an outer
        // switch first dispatches on the lengths, to save on comparisons.

        if (cats.length > 3) {
          cats.sort(function(a, b) {return b.length - a.length;});
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
      var nonASCIIidentifierStartChars = "\xaa\xb5\xba\xc0-\xd6\xd8-\xf6\xf8-\u02c1\u02c6-\u02d1\u02e0-\u02e4\u02ec\u02ee\u0370-\u0374\u0376\u0377\u037a-\u037d\u0386\u0388-\u038a\u038c\u038e-\u03a1\u03a3-\u03f5\u03f7-\u0481\u048a-\u0527\u0531-\u0556\u0559\u0561-\u0587\u05d0-\u05ea\u05f0-\u05f2\u0620-\u064a\u066e\u066f\u0671-\u06d3\u06d5\u06e5\u06e6\u06ee\u06ef\u06fa-\u06fc\u06ff\u0710\u0712-\u072f\u074d-\u07a5\u07b1\u07ca-\u07ea\u07f4\u07f5\u07fa\u0800-\u0815\u081a\u0824\u0828\u0840-\u0858\u08a0\u08a2-\u08ac\u0904-\u0939\u093d\u0950\u0958-\u0961\u0971-\u0977\u0979-\u097f\u0985-\u098c\u098f\u0990\u0993-\u09a8\u09aa-\u09b0\u09b2\u09b6-\u09b9\u09bd\u09ce\u09dc\u09dd\u09df-\u09e1\u09f0\u09f1\u0a05-\u0a0a\u0a0f\u0a10\u0a13-\u0a28\u0a2a-\u0a30\u0a32\u0a33\u0a35\u0a36\u0a38\u0a39\u0a59-\u0a5c\u0a5e\u0a72-\u0a74\u0a85-\u0a8d\u0a8f-\u0a91\u0a93-\u0aa8\u0aaa-\u0ab0\u0ab2\u0ab3\u0ab5-\u0ab9\u0abd\u0ad0\u0ae0\u0ae1\u0b05-\u0b0c\u0b0f\u0b10\u0b13-\u0b28\u0b2a-\u0b30\u0b32\u0b33\u0b35-\u0b39\u0b3d\u0b5c\u0b5d\u0b5f-\u0b61\u0b71\u0b83\u0b85-\u0b8a\u0b8e-\u0b90\u0b92-\u0b95\u0b99\u0b9a\u0b9c\u0b9e\u0b9f\u0ba3\u0ba4\u0ba8-\u0baa\u0bae-\u0bb9\u0bd0\u0c05-\u0c0c\u0c0e-\u0c10\u0c12-\u0c28\u0c2a-\u0c33\u0c35-\u0c39\u0c3d\u0c58\u0c59\u0c60\u0c61\u0c85-\u0c8c\u0c8e-\u0c90\u0c92-\u0ca8\u0caa-\u0cb3\u0cb5-\u0cb9\u0cbd\u0cde\u0ce0\u0ce1\u0cf1\u0cf2\u0d05-\u0d0c\u0d0e-\u0d10\u0d12-\u0d3a\u0d3d\u0d4e\u0d60\u0d61\u0d7a-\u0d7f\u0d85-\u0d96\u0d9a-\u0db1\u0db3-\u0dbb\u0dbd\u0dc0-\u0dc6\u0e01-\u0e30\u0e32\u0e33\u0e40-\u0e46\u0e81\u0e82\u0e84\u0e87\u0e88\u0e8a\u0e8d\u0e94-\u0e97\u0e99-\u0e9f\u0ea1-\u0ea3\u0ea5\u0ea7\u0eaa\u0eab\u0ead-\u0eb0\u0eb2\u0eb3\u0ebd\u0ec0-\u0ec4\u0ec6\u0edc-\u0edf\u0f00\u0f40-\u0f47\u0f49-\u0f6c\u0f88-\u0f8c\u1000-\u102a\u103f\u1050-\u1055\u105a-\u105d\u1061\u1065\u1066\u106e-\u1070\u1075-\u1081\u108e\u10a0-\u10c5\u10c7\u10cd\u10d0-\u10fa\u10fc-\u1248\u124a-\u124d\u1250-\u1256\u1258\u125a-\u125d\u1260-\u1288\u128a-\u128d\u1290-\u12b0\u12b2-\u12b5\u12b8-\u12be\u12c0\u12c2-\u12c5\u12c8-\u12d6\u12d8-\u1310\u1312-\u1315\u1318-\u135a\u1380-\u138f\u13a0-\u13f4\u1401-\u166c\u166f-\u167f\u1681-\u169a\u16a0-\u16ea\u16ee-\u16f0\u1700-\u170c\u170e-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176c\u176e-\u1770\u1780-\u17b3\u17d7\u17dc\u1820-\u1877\u1880-\u18a8\u18aa\u18b0-\u18f5\u1900-\u191c\u1950-\u196d\u1970-\u1974\u1980-\u19ab\u19c1-\u19c7\u1a00-\u1a16\u1a20-\u1a54\u1aa7\u1b05-\u1b33\u1b45-\u1b4b\u1b83-\u1ba0\u1bae\u1baf\u1bba-\u1be5\u1c00-\u1c23\u1c4d-\u1c4f\u1c5a-\u1c7d\u1ce9-\u1cec\u1cee-\u1cf1\u1cf5\u1cf6\u1d00-\u1dbf\u1e00-\u1f15\u1f18-\u1f1d\u1f20-\u1f45\u1f48-\u1f4d\u1f50-\u1f57\u1f59\u1f5b\u1f5d\u1f5f-\u1f7d\u1f80-\u1fb4\u1fb6-\u1fbc\u1fbe\u1fc2-\u1fc4\u1fc6-\u1fcc\u1fd0-\u1fd3\u1fd6-\u1fdb\u1fe0-\u1fec\u1ff2-\u1ff4\u1ff6-\u1ffc\u2071\u207f\u2090-\u209c\u2102\u2107\u210a-\u2113\u2115\u2119-\u211d\u2124\u2126\u2128\u212a-\u212d\u212f-\u2139\u213c-\u213f\u2145-\u2149\u214e\u2160-\u2188\u2c00-\u2c2e\u2c30-\u2c5e\u2c60-\u2ce4\u2ceb-\u2cee\u2cf2\u2cf3\u2d00-\u2d25\u2d27\u2d2d\u2d30-\u2d67\u2d6f\u2d80-\u2d96\u2da0-\u2da6\u2da8-\u2dae\u2db0-\u2db6\u2db8-\u2dbe\u2dc0-\u2dc6\u2dc8-\u2dce\u2dd0-\u2dd6\u2dd8-\u2dde\u2e2f\u3005-\u3007\u3021-\u3029\u3031-\u3035\u3038-\u303c\u3041-\u3096\u309d-\u309f\u30a1-\u30fa\u30fc-\u30ff\u3105-\u312d\u3131-\u318e\u31a0-\u31ba\u31f0-\u31ff\u3400-\u4db5\u4e00-\u9fcc\ua000-\ua48c\ua4d0-\ua4fd\ua500-\ua60c\ua610-\ua61f\ua62a\ua62b\ua640-\ua66e\ua67f-\ua697\ua6a0-\ua6ef\ua717-\ua71f\ua722-\ua788\ua78b-\ua78e\ua790-\ua793\ua7a0-\ua7aa\ua7f8-\ua801\ua803-\ua805\ua807-\ua80a\ua80c-\ua822\ua840-\ua873\ua882-\ua8b3\ua8f2-\ua8f7\ua8fb\ua90a-\ua925\ua930-\ua946\ua960-\ua97c\ua984-\ua9b2\ua9cf\uaa00-\uaa28\uaa40-\uaa42\uaa44-\uaa4b\uaa60-\uaa76\uaa7a\uaa80-\uaaaf\uaab1\uaab5\uaab6\uaab9-\uaabd\uaac0\uaac2\uaadb-\uaadd\uaae0-\uaaea\uaaf2-\uaaf4\uab01-\uab06\uab09-\uab0e\uab11-\uab16\uab20-\uab26\uab28-\uab2e\uabc0-\uabe2\uac00-\ud7a3\ud7b0-\ud7c6\ud7cb-\ud7fb\uf900-\ufa6d\ufa70-\ufad9\ufb00-\ufb06\ufb13-\ufb17\ufb1d\ufb1f-\ufb28\ufb2a-\ufb36\ufb38-\ufb3c\ufb3e\ufb40\ufb41\ufb43\ufb44\ufb46-\ufbb1\ufbd3-\ufd3d\ufd50-\ufd8f\ufd92-\ufdc7\ufdf0-\ufdfb\ufe70-\ufe74\ufe76-\ufefc\uff21-\uff3a\uff41-\uff5a\uff66-\uffbe\uffc2-\uffc7\uffca-\uffcf\uffd2-\uffd7\uffda-\uffdc";
      var nonASCIIidentifierChars = "\u0300-\u036f\u0483-\u0487\u0591-\u05bd\u05bf\u05c1\u05c2\u05c4\u05c5\u05c7\u0610-\u061a\u0620-\u0649\u0672-\u06d3\u06e7-\u06e8\u06fb-\u06fc\u0730-\u074a\u0800-\u0814\u081b-\u0823\u0825-\u0827\u0829-\u082d\u0840-\u0857\u08e4-\u08fe\u0900-\u0903\u093a-\u093c\u093e-\u094f\u0951-\u0957\u0962-\u0963\u0966-\u096f\u0981-\u0983\u09bc\u09be-\u09c4\u09c7\u09c8\u09d7\u09df-\u09e0\u0a01-\u0a03\u0a3c\u0a3e-\u0a42\u0a47\u0a48\u0a4b-\u0a4d\u0a51\u0a66-\u0a71\u0a75\u0a81-\u0a83\u0abc\u0abe-\u0ac5\u0ac7-\u0ac9\u0acb-\u0acd\u0ae2-\u0ae3\u0ae6-\u0aef\u0b01-\u0b03\u0b3c\u0b3e-\u0b44\u0b47\u0b48\u0b4b-\u0b4d\u0b56\u0b57\u0b5f-\u0b60\u0b66-\u0b6f\u0b82\u0bbe-\u0bc2\u0bc6-\u0bc8\u0bca-\u0bcd\u0bd7\u0be6-\u0bef\u0c01-\u0c03\u0c46-\u0c48\u0c4a-\u0c4d\u0c55\u0c56\u0c62-\u0c63\u0c66-\u0c6f\u0c82\u0c83\u0cbc\u0cbe-\u0cc4\u0cc6-\u0cc8\u0cca-\u0ccd\u0cd5\u0cd6\u0ce2-\u0ce3\u0ce6-\u0cef\u0d02\u0d03\u0d46-\u0d48\u0d57\u0d62-\u0d63\u0d66-\u0d6f\u0d82\u0d83\u0dca\u0dcf-\u0dd4\u0dd6\u0dd8-\u0ddf\u0df2\u0df3\u0e34-\u0e3a\u0e40-\u0e45\u0e50-\u0e59\u0eb4-\u0eb9\u0ec8-\u0ecd\u0ed0-\u0ed9\u0f18\u0f19\u0f20-\u0f29\u0f35\u0f37\u0f39\u0f41-\u0f47\u0f71-\u0f84\u0f86-\u0f87\u0f8d-\u0f97\u0f99-\u0fbc\u0fc6\u1000-\u1029\u1040-\u1049\u1067-\u106d\u1071-\u1074\u1082-\u108d\u108f-\u109d\u135d-\u135f\u170e-\u1710\u1720-\u1730\u1740-\u1750\u1772\u1773\u1780-\u17b2\u17dd\u17e0-\u17e9\u180b-\u180d\u1810-\u1819\u1920-\u192b\u1930-\u193b\u1951-\u196d\u19b0-\u19c0\u19c8-\u19c9\u19d0-\u19d9\u1a00-\u1a15\u1a20-\u1a53\u1a60-\u1a7c\u1a7f-\u1a89\u1a90-\u1a99\u1b46-\u1b4b\u1b50-\u1b59\u1b6b-\u1b73\u1bb0-\u1bb9\u1be6-\u1bf3\u1c00-\u1c22\u1c40-\u1c49\u1c5b-\u1c7d\u1cd0-\u1cd2\u1d00-\u1dbe\u1e01-\u1f15\u200c\u200d\u203f\u2040\u2054\u20d0-\u20dc\u20e1\u20e5-\u20f0\u2d81-\u2d96\u2de0-\u2dff\u3021-\u3028\u3099\u309a\ua640-\ua66d\ua674-\ua67d\ua69f\ua6f0-\ua6f1\ua7f8-\ua800\ua806\ua80b\ua823-\ua827\ua880-\ua881\ua8b4-\ua8c4\ua8d0-\ua8d9\ua8f3-\ua8f7\ua900-\ua909\ua926-\ua92d\ua930-\ua945\ua980-\ua983\ua9b3-\ua9c0\uaa00-\uaa27\uaa40-\uaa41\uaa4c-\uaa4d\uaa50-\uaa59\uaa7b\uaae0-\uaae9\uaaf2-\uaaf3\uabc0-\uabe1\uabec\uabed\uabf0-\uabf9\ufb20-\ufb28\ufe00-\ufe0f\ufe20-\ufe26\ufe33\ufe34\ufe4d-\ufe4f\uff10-\uff19\uff3f";
      var nonASCIIidentifierStart = new RegExp("[" + nonASCIIidentifierStartChars + "]");
      var nonASCIIidentifier = new RegExp("[" + nonASCIIidentifierStartChars + nonASCIIidentifierChars + "]");

      // Whether a single character denotes a newline.

      var newline = /[\n\r\u2028\u2029]/;

      // Matches a whole line break (where CRLF is considered a single
      // line break). Used to count lines.

      var lineBreak = /\r\n|[\n\r\u2028\u2029]/g;

      // Test whether a given character code starts an identifier.

      var isIdentifierStart = exports.isIdentifierStart = function(code) {
        if (code < 65) return code === 36;
        if (code < 91) return true;
        if (code < 97) return code === 95;
        if (code < 123)return true;
        return code >= 0xaa && nonASCIIidentifierStart.test(String.fromCharCode(code));
      };

      // Test whether a given character is part of an identifier.

      var isIdentifierChar = exports.isIdentifierChar = function(code) {
        if (code < 48) return code === 36;
        if (code < 58) return true;
        if (code < 65) return false;
        if (code < 91) return true;
        if (code < 97) return code === 95;
        if (code < 123)return true;
        return code >= 0xaa && nonASCIIidentifier.test(String.fromCharCode(code));
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
        if (options.locations) tokEndLoc = new Position;
        tokType = type;
        skipSpace();
        tokVal = val;
        tokRegexpAllowed = type.beforeExpr;
      }

      function skipBlockComment() {
        var startLoc = options.onComment && options.locations && new Position;
        var start = tokPos, end = input.indexOf("*/", tokPos += 2);
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
        if (options.onComment)
          options.onComment(true, input.slice(start + 2, end), start, tokPos,
                            startLoc, options.locations && new Position);
      }

      function skipLineComment() {
        var start = tokPos;
        var startLoc = options.onComment && options.locations && new Position;
        var ch = input.charCodeAt(tokPos+=2);
        while (tokPos < inputLen && ch !== 10 && ch !== 13 && ch !== 8232 && ch !== 8233) {
          ++tokPos;
          ch = input.charCodeAt(tokPos);
        }
        if (options.onComment)
          options.onComment(false, input.slice(start + 2, tokPos), start, tokPos,
                            startLoc, options.locations && new Position);
      }

      // Called at the start of the parse and after every token. Skips
      // whitespace and comments, and.

      function skipSpace() {
        while (tokPos < inputLen) {
          var ch = input.charCodeAt(tokPos);
          if (ch === 32) { // ' '
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
          } else if (ch === 47) { // '/'
            var next = input.charCodeAt(tokPos + 1);
            if (next === 42) { // '*'
              skipBlockComment();
            } else if (next === 47) { // '/'
              skipLineComment();
            } else break;
          } else if (ch === 160) { // '\xa0'
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
        if (options.ecmaVersion >= 6 && next === 46 && next2 === 46) { // 46 = dot '.'
          tokPos += 3;
          return finishToken(_ellipsis);
        } else {
          ++tokPos;
          return finishToken(_dot);
        }
      }

      function readToken_slash() { // '/'
        var next = input.charCodeAt(tokPos + 1);
        if (tokRegexpAllowed) {++tokPos; return readRegexp();}
        if (next === 61) return finishOp(_assign, 2);
        return finishOp(_slash, 1);
      }

      function readToken_mult_modulo() { // '%*'
        var next = input.charCodeAt(tokPos + 1);
        if (next === 61) return finishOp(_assign, 2);
        return finishOp(_multiplyModulo, 1);
      }

      function readToken_pipe_amp(code) { // '|&'
        var next = input.charCodeAt(tokPos + 1);
        if (next === code) return finishOp(code === 124 ? _logicalOR : _logicalAND, 2);
        if (next === 61) return finishOp(_assign, 2);
        return finishOp(code === 124 ? _bitwiseOR : _bitwiseAND, 1);
      }

      function readToken_caret() { // '^'
        var next = input.charCodeAt(tokPos + 1);
        if (next === 61) return finishOp(_assign, 2);
        return finishOp(_bitwiseXOR, 1);
      }

      function readToken_plus_min(code) { // '+-'
        var next = input.charCodeAt(tokPos + 1);
        if (next === code) {
          if (next == 45 && input.charCodeAt(tokPos + 2) == 62 &&
              newline.test(input.slice(lastEnd, tokPos))) {
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

      function readToken_lt_gt(code) { // '<>'
        var next = input.charCodeAt(tokPos + 1);
        var size = 1;
        if (next === code) {
          size = code === 62 && input.charCodeAt(tokPos + 2) === 62 ? 3 : 2;
          if (input.charCodeAt(tokPos + size) === 61) return finishOp(_assign, size + 1);
          return finishOp(_bitShift, size);
        }
        if (next == 33 && code == 60 && input.charCodeAt(tokPos + 2) == 45 &&
            input.charCodeAt(tokPos + 3) == 45) {
          // `<!--`, an XML-style comment that should be interpreted as a line comment
          tokPos += 4;
          skipLineComment();
          skipSpace();
          return readToken();
        }
        if (next === 61)
          size = input.charCodeAt(tokPos + 2) === 61 ? 3 : 2;
        return finishOp(_relational, size);
      }

      function readToken_eq_excl(code) { // '=!'
        var next = input.charCodeAt(tokPos + 1);
        if (next === 61) return finishOp(_equality, input.charCodeAt(tokPos + 2) === 61 ? 3 : 2);
        return finishOp(code === 61 ? _eq : _prefix, 1);
      }

      function getTokenFromCode(code) {
        switch(code) {
          // The interpretation of a dot depends on whether it is followed
          // by a digit or another two dots.
        case 46: // '.'
          return readToken_dot();

          // Punctuation tokens.
        case 40: ++tokPos; return finishToken(_parenL);
        case 41: ++tokPos; return finishToken(_parenR);
        case 59: ++tokPos; return finishToken(_semi);
        case 44: ++tokPos; return finishToken(_comma);
        case 91: ++tokPos; return finishToken(_bracketL);
        case 93: ++tokPos; return finishToken(_bracketR);
        case 123: ++tokPos; return finishToken(_braceL);
        case 125: ++tokPos; return finishToken(_braceR);
        case 58: ++tokPos; return finishToken(_colon);
        case 63: ++tokPos; return finishToken(_question);

          // '0x' is a hexadecimal number.
        case 48: // '0'
          var next = input.charCodeAt(tokPos + 1);
          if (next === 120 || next === 88) return readHexNumber();
          // Anything else beginning with a digit is an integer, octal
          // number, or float.
        /* falls through */
        case 49: case 50: case 51: case 52: case 53: case 54: case 55: case 56: case 57: // 1-9
          return readNumber(false);

          // Quotes produce strings.
        case 34: case 39: // '"', "'"
          return readString(code);

        // Operators are parsed inline in tiny state machines. '=' (61) is
        // often referred to. `finishOp` simply skips the amount of
        // characters it is given as second argument, and returns a token
        // of the type given by its first argument.

        case 47: // '/'
          return readToken_slash();

        case 37: case 42: // '%*'
          return readToken_mult_modulo();

        case 124: case 38: // '|&'
          return readToken_pipe_amp(code);

        case 94: // '^'
          return readToken_caret();

        case 43: case 45: // '+-'
          return readToken_plus_min(code);

        case 60: case 62: // '<>'
          return readToken_lt_gt(code);

        case 61: case 33: // '=!'
          return readToken_eq_excl(code);

        case 126: // '~'
          return finishOp(_prefix, 1);
        }

        return false;
      }

      function readToken(forceRegexp) {
        if (!forceRegexp) tokStart = tokPos;
        else tokPos = tokStart + 1;
        if (options.locations) tokStartLoc = new Position;
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
        var content = "", escaped, inClass, start = tokPos;
        for (;;) {
          if (tokPos >= inputLen) raise(start, "Unterminated regular expression");
          var ch = input.charAt(tokPos);
          if (newline.test(ch)) raise(start, "Unterminated regular expression");
          if (!escaped) {
            if (ch === "[") inClass = true;
            else if (ch === "]" && inClass) inClass = false;
            else if (ch === "/" && !inClass) break;
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
        var start = tokPos, total = 0;
        for (var i = 0, e = len == null ? Infinity : len; i < e; ++i) {
          var code = input.charCodeAt(tokPos), val;
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
        var start = tokPos, isFloat = false, octal = input.charCodeAt(tokPos) === 48;
        if (!startsWithDot && readInt(10) === null) raise(start, "Invalid number");
        if (input.charCodeAt(tokPos) === 46) {
          ++tokPos;
          readInt(10);
          isFloat = true;
        }
        var next = input.charCodeAt(tokPos);
        if (next === 69 || next === 101) { // 'eE'
          next = input.charCodeAt(++tokPos);
          if (next === 43 || next === 45) ++tokPos; // '+-'
          if (readInt(10) === null) raise(start, "Invalid number");
          isFloat = true;
        }
        if (isIdentifierStart(input.charCodeAt(tokPos))) raise(tokPos, "Identifier directly after number");

        var str = input.slice(start, tokPos), val;
        if (isFloat) val = parseFloat(str);
        else if (!octal || str.length === 1) val = parseInt(str, 10);
        else if (/[89]/.test(str) || strict) raise(start, "Invalid number");
        else val = parseInt(str, 8);
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
          if (ch === 92) { // '\'
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
              case 110: out += "\n"; break; // 'n' -> '\n'
              case 114: out += "\r"; break; // 'r' -> '\r'
              case 120: out += String.fromCharCode(readHexChar(2)); break; // 'x'
              case 117: out += String.fromCharCode(readHexChar(4)); break; // 'u'
              case 85: out += String.fromCharCode(readHexChar(8)); break; // 'U'
              case 116: out += "\t"; break; // 't' -> '\t'
              case 98: out += "\b"; break; // 'b' -> '\b'
              case 118: out += "\u000b"; break; // 'v' -> '\u000b'
              case 102: out += "\f"; break; // 'f' -> '\f'
              case 48: out += "\0"; break; // 0 -> '\0'
              case 13: if (input.charCodeAt(tokPos) === 10) ++tokPos; // '\r\n'
              /* falls through */
              case 10: // ' \n'
                if (options.locations) { tokLineStart = tokPos; ++tokCurLine; }
                break;
              default: out += String.fromCharCode(ch); break;
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
        var word, first = true, start = tokPos;
        for (;;) {
          var ch = input.charCodeAt(tokPos);
          if (isIdentifierChar(ch)) {
            if (containsEsc) word += input.charAt(tokPos);
            ++tokPos;
          } else if (ch === 92) { // "\"
            if (!containsEsc) word = input.slice(start, tokPos);
            containsEsc = true;
            if (input.charCodeAt(++tokPos) != 117) // "u"
              raise(tokPos, "Expecting Unicode escape sequence \\uXXXX");
            ++tokPos;
            var esc = readHexChar(4);
            var escStr = String.fromCharCode(esc);
            if (!escStr) raise(tokPos - 1, "Invalid Unicode escape");
            if (!(first ? isIdentifierStart(esc) : isIdentifierChar(esc)))
              raise(tokPos - 4, "Invalid Unicode escape");
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
        if (!containsEsc && isKeyword(word))
          type = keywordTypes[word];
        return finishToken(type, word);
      }


    __exports__["default"] = { tokenize: exports.tokenize };
  });
define("property-compiler/property-compiler", 
  ["property-compiler/tokenizer","exports"],
  function(__dependency1__, __exports__) {
    
    var tokenizer = __dependency1__["default"];

    var computedProperties = [];

    // TODO: Make this farrrrrr more robust...very minimal right now

    function compile(prop, name){
      var output = {};

      var str = prop.toString(), //.replace(/(?:\/\*(?:[\s\S]*?)\*\/)|(?:([\s;])+\/\/(?:.*)$)/gm, '$1'), // String representation of function sans comments
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
          terminators = [';',',','==','>','<','>=','<=','>==','<==','!=','!==', '===', '&&', '||'];
      do{

        token = nextToken();

        if(token.value === 'this'){
          listening++;
          workingpath = [];
        }

        // TODO: handle gets on collections
        if(token.value === 'get'){
          path = nextToken();
          while(_.isUndefined(path.value)){
            path = nextToken();
          }

          // Replace any access to a collection with the generic @each placeholder and push dependancy
          workingpath.push(path.value.replace(/\[.+\]/g, ".@each").replace(/^\./, ''));
        }

        if(token.value === 'pluck'){
          path = nextToken();
          while(_.isUndefined(path.value)){
            path = nextToken();
          }

          workingpath.push('@each.' + path.value);
        }

        if(token.value === 'slice' || token.value === 'clone'){
          path = nextToken();
          workingpath.push('@each');
        }

        if(token.value === 'at'){

          path = nextToken();
          while(_.isUndefined(path.value)){
            path = nextToken();
          }
          // workingpath[workingpath.length -1] = workingpath[workingpath.length -1] + '[' + path.value + ']';
          // workingpath.push('[' + path.value + ']');
          workingpath.push('@each');

        }

        if(token.value === 'where' || token.value === 'findWhere'){
          workingpath.push('@each');
          path = nextToken();
          attrs = [];
          var itr = 0;
          while(path.type.type !== ')'){
            if(path.value){
              if(itr%2 === 0){
                attrs.push(path.value);
              }
              itr++;
            }
            path = nextToken();
          }
          workingpath.push(attrs);
        }

        if(listening && _.indexOf(terminators, token.type.type) > -1 || _.indexOf(terminators, token.value) > -1){
          workingpath = _.reduce(workingpath, function(memo, paths){
            var newMemo = [];
            paths = (!_.isArray(paths)) ? [paths] : paths;
            _.each(paths, function(path){
              _.each(memo, function(mem){
                newMemo.push(_.compact([mem, path]).join('.').replace('.[', '['));
              });
            });
            return newMemo;
          }, ['']);
          finishedPaths = _.compact(_.union(finishedPaths, workingpath));
          workingpath = [];
          listening--;
        }

      } while(token.start !== token.end);

      console.log('COMPUTED PROPERTY', name, 'registered with these dependancy paths:', finishedPaths);

      // Return the dependancies list
      return finishedPaths;

    }

    __exports__["default"] = { compile: compile };
  });
define("rebound-data/computed-property", 
  ["property-compiler/property-compiler","rebound-runtime/utils","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    
    var propertyCompiler = __dependency1__["default"];
    var $ = __dependency2__["default"];

    // If Rebound Runtime has already been run, throw error
    if(Rebound.ComputedProperty){ throw 'Rebound ComputedProperty is already loaded on the page!'; }
    // If Backbone hasn't been started yet, throw error
    if(!window.Backbone){ throw "Backbone must be on the page for Rebound to load."; }

    var ComputedProperty = function(prop, options){

      options = options || {};

      // Assign unique id
      this.cid = _.uniqueId('computedPropety');
      this.name = options.name;
      this.returnType = null;
      this.__observers = {};
      this.helpers = {};
      this.changing = false;

      options.parent = this.setParent( options.parent || this );
      options.root = this.setRoot( options.root || options.parent || this );
      options.path = this.__path = options.path || this.__path;

      // All comptued properties' dependancies are calculated and added to their __params attribute. Save these in the context's helper cache.
      options.root.helpers[options.parent.cid] = options.root.helpers[options.parent.cid] || {};
      options.root.helpers[options.parent.cid][options.name] = this;

      // Compute the property function's dependancies
      this.deps = prop.__params = prop.__params || propertyCompiler.compile(prop, this.name);

      _.each(this.deps, function(path, index, deps){

        var context = this.__parent__,
            computedProperty = this,
            paths = $.splitPath(path);
        // Get actual context if any @parent calls
        while(paths[0] === '@parent'){
          context = context.__parent__;
          paths.shift();
        }
        path = paths.join('.');

        // Ensure _observers exists and is an object
        context.__observers = context.__observers || {};
        // Ensure __obxervers[path] exists and is an array
        context.__observers[path] = context.__observers[path] || [];
        context.__observers[path].push(function(){
          computedProperty.call();
        });
        context.__observers[path][context.__observers[path].length-1].type = 'model';

      }, this);


      // Save referance original function
      this.func = prop;

      // Cached result objects
      this.cache = {
        model: new Rebound.Model({}, {
          parent: this.__parent__,
          root: this.__root__,
          path: this.__path
        }),
        collection: new Rebound.Collection([], {
          parent: this.__parent__,
          root: this.__root__,
          path: this.__path
        }),
        value: undefined // TODO: On set value, trigger change event on parent? Maybe?
      };

    };

    _.extend(ComputedProperty.prototype, Backbone.Events, {

      isComputedProperty: true,
      isData: true,
      returnType: null,

      __path: function(){ return ''; },

      hasParent: function(obj){
        var tmp = this;
        while(tmp !== obj){
          tmp = tmp.__parent__;
          if(_.isUndefined(tmp)){ return false; }
          if(tmp === obj){ return true; }
          if(tmp.__parent__ === tmp){ return false; }
        }
        return true;
      },

      call: function(){
        var args = Array.prototype.slice.call(arguments),
            context = args.shift();
        return this.apply(context, args);

      },

      apply: function(context, params){

        // Get result from computed property function
        var result = this.func.apply(context || this.__parent__, params);

        // Un-bind events from the old data source
        if(this.cache[this.returnType] && this.cache[this.returnType].isData){
          this.cache[this.returnType].off('change add remove reset');
        }

        // If you're already resetting its cache, I'ma let you finish
        if(this.changing) return this;
        this.changing = true;

        // Set result and return type
        if(result && (result.isCollection || _.isArray(result))){
          this.returnType = 'collection';
          this.isCollection = true;
          this.isModel = false;
          this.cache.collection.set(result, {remove: true, merge: true});
        }
        else if(result && (result.isModel || _.isObject(result))){
          this.returnType = 'model';
          this.isCollection = false;
          this.isModel = true;
          this.cache.model.reset(result);
        }
        else{
          this.returnType = 'value';
          this.isCollection = this.isModel = false;
          this.cache.value = result;
        }

        // Pass all changes to this model back to the model used to set it
        if(result && result.isModel){
          this.cache[this.returnType].on('change', function(model){
            result.set(model.changedAttributes());
          });
        }
        if(result && result.isCollection){
          this.cache[this.returnType].on('add reset', function(model, collection, options){
            result.set(model, options);
          });
          this.cache[this.returnType].on('remove', function(model, collection, options){
            result.remove(model, options);
          });
        }

        this.changing = false;

        return this.cache[this.returnType];
      },

      get: function(key, options){
        options || (options = {});
        if(this.returnType === 'value'){
          if(!options.quiet){ console.error('Called get on the `'+ this.name +'` computed property which returns a primitive value.'); }
          return undefined;
        }

        return (this.value()).get(key, options);

      },

      // TODO: Moving the head of a data tree should preserve ancestry
      set: function(key, val, options){
        if (typeof key === 'object') {
          attrs = (key.isModel) ? key.attributes : key;
          options = val;
        } else {
          (attrs = {})[key] = val;
        }
        options || (options = {});
        if(this.returnType === 'value'){
          if(!options.quiet){ console.error('Called set on the `'+ this.name +'` computed property which returns a primitive value.'); }
          return undefined;
        }

        return (this.value()).set(key, val, options);

      },

      value: function(){
        if(_.isNull(this.returnType)){
          this.apply(this.__parent__);
        }
        return this.cache[this.returnType];
      },

      reset: function(obj, options){
        this.cache[this.returnType].reset(obj, options);
      },

      toJSON: function() {
        if (this._isSerializing) {
            return this.cid;
        }
        var val = this.value();
        this._isSerializing = true;
        var json = (val && _.isFunction(val.toJSON)) ? val.toJSON() : val;
        this._isSerializing = false;
        return json;
      }

    });

    __exports__["default"] = ComputedProperty;
  });
define("rebound-data/model", 
  ["rebound-data/computed-property","rebound-runtime/utils","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    
    var ComputedProperty = __dependency1__["default"];
    var $ = __dependency2__["default"];

    // If Rebound Runtime has already been run, throw error
    if(Rebound.Model){ throw 'Rebound Model is already loaded on the page!'; }
    // If Backbone hasn't been started yet, throw error
    if(!window.Backbone){ throw "Backbone must be on the page for Rebound to load."; }

    function pathGenerator(parent, key){
      return function(){
        var path = parent.__path();
        return path + ((path === '') ? '' : '.') + key;
      };
    }


    var Model = Backbone.Model.extend({

      isModel: true,
      isData: true,

      __path: function(){ return ''; },

      constructor: function(attributes, options){
        options = options || {};
        this.helpers = {};
        this.synced = {};
        this.__observers = {};
        this.defaults = this.defaults || {};

        this.setParent( options.parent || this );
        this.setRoot( options.root || this );
        this.__path = options.path || this.__path;

        Backbone.Model.apply( this, arguments );

      },

      toggle: function(attr, options) {
        options = options ? _.clone(options) : {};
        var val = this.get(attr);
        if(!_.isBoolean(val)){ console.error('Tried to toggle non-boolean value ' + attr +'!', this); }
        return this.set(attr, !val, options);
      },

      reset: function(obj, options){
        var changed = {},
            dest = this.attributes;

        options || (options = {});
        obj = (obj && obj.isModel && obj.attributes) || obj || {};

        _.each(this.attributes, function(value, key, model){
          if(_.isUndefined(value)){
            if(obj[key]){
              changed[key] = obj[key];
            }
          }
          else if (key === this.idAttribute ||  (this.attributes[key] && value.isComputedProperty) ){
            return;
          }
          else if (value.isCollection || value.isModel){
            value.reset((obj[key]||[]));
            if(!_.isEmpty(value.changed)){
              changed[key] = value.changed;
            }
          }
          else if (obj.hasOwnProperty(key)){
            if(value !== obj[key]){
              changed[key] = obj[key];
            }
          }
          else if (this.defaults.hasOwnProperty(key) && !_.isFunction(this.defaults[key])){
            obj[key] = this.defaults[key];
            if(value !== obj[key]){
              changed[key] = obj[key];
            }
          }
          else{
            changed[key] = undefined;
            this.unset(key, {silent: true});
          }
        }, this);

        _.each(obj, function(value, key, obj){
          changed[key] = changed[key] || obj[key];
        });

        obj = this.set(obj, _.extend({}, options, {silent: true, reset: false}));

        this.changed = changed;

        if (!options.silent) this.trigger('reset', this, options);
        return obj;
      },

      get: function(key, options){

        // Split the path at all '.', '[' and ']' and find the value referanced.
        var parts  = $.splitPath(key),
            result = this,
            l=parts.length,
            i=0;
            options = _.defaults((options || {}), { parent: 0, raw: false });

        if(_.isUndefined(key) || _.isNull(key)){ return key; }

        if(key === '' || parts.length === 0){ return result; }

        if (parts.length > 0) {
          for ( i = 0; i < l - options.parent; i++) {

            if( result && result.isComputedProperty ){
              // If returning raw, always return the first computed property in a chian.
              if(options.raw){ return result; }
              result = result.value();
            }

            if(_.isUndefined(result) || _.isNull(result)){
              return result;
            }

            if(parts[i] === '@parent'){
              result = result.__parent__;
            }
            else if( result.isCollection ){
              result = result.models[parts[i]];
            }
            else if( result.isModel ){
              result = result.attributes[parts[i]];
            }
            else if( result && result.hasOwnProperty(parts[i]) ){
              result = result[parts[i]];
            }
          }
        }

        if( result && result.isComputedProperty && !options.raw){
          result = result.value();
        }

        return result;
      },

      // TODO: Moving the head of a data tree should preserve ancestry
      set: function(key, val, options){

        var attrs, attr, newKey, target, destination, props, lineage;

        // Set is able to take a object or a key value pair. Normalize this input.
        if (typeof key === 'object') {
          attrs = (key.isModel) ? key.attributes : key;
          options = val;
        } else {
          (attrs = {})[key] = val;
        }
        options || (options = {});

        // If reset is passed, do a reset instead
        if(options.reset === true){
          return this.reset(attrs, options);
        }

        if(_.isEmpty(attrs)){ return; }

        // For each key and value
        _.each(attrs, function(val, key){

          attr  = $.splitPath(key).pop();                 // The key        ex: foo[0].bar --> bar
          target = this.get(key, {parent: 1});            // The element    ex: foo.bar.baz --> foo.bar

          destination = target.get(attr, {raw: true}) || {};           // The current value of attr
          lineage = {
            name: key,
            parent: this,
            root: this.__root__,
            path: pathGenerator(this, key),
            silent: true
          };

          // If val is null, set to undefined
          if(val === null || val === undefined){
            val = this.defaults[key];
          }
          // If this value is a Function, turn it into a Computed Property
          else if(_.isFunction(val)){
            val = new ComputedProperty(val, lineage);
          }

          // If this is going to be a cyclical dependancy, use the original object, don't make a copy
          else if(val.isData && target.hasParent(val)){
            val = val;
          }

          // If updating an existing object with its respective data type, let Backbone handle the merge
          else if( destination.isComputedProperty &&  _.isObject(val)  ||
                  ( destination.isCollection && ( _.isArray(val) || val.isCollection )) ||
                  ( destination.isModel && ( _.isObject(val) || val.isModel ))){
            return destination.set(val, options);
          }
          else if(destination.isComputedProperty){
            return destination.set(key, val, options);
          }
          // If this value is a Model or Collection, create a new instance of it using its constructor
          // This will keep the defaults from the original, but make a new copy so memory isnt shared between data objects
          else if(val.isModel || val.isCollection){
            val = new val.constructor((val.attributes || val.models), lineage); // TODO: This will override defaults set by this model in favor of the passed in model. Do deep defaults here.
          }
          // If this value is an Array, turn it into a collection
          else if(_.isArray(val)){
            val = new Rebound.Collection(val, lineage); // TODO: Remove global referance
          }
          // If this value is a Object, turn it into a model
          else if(_.isObject(val)){
            val = new Model(val, lineage);
          }
          // Else val is a primitive value, set it accordingly


          // If val is a data object, let this object know it is now a parent
          this._hasAncestry = (val && val.isData || false);

          // Replace the existing value
          return Backbone.Model.prototype.set.call(target, attr, val, options); // TODO: Event cleanup when replacing a model or collection with another value

        }, this);

        return this;

      },

      toJSON: function() {
          if (this._isSerializing) {
              return this.id || this.cid;
          }
          this._isSerializing = true;
          var json = _.clone(this.attributes);
          _.each(json, function(value, name) {
              if( _.isNull(value) || _.isUndefined(value) ){ return; }
              _.isFunction(value.toJSON) && (json[name] = value.toJSON());
          });
          this._isSerializing = false;
          return json;
      }

    });

    __exports__["default"] = Model;
  });
define("rebound-data/collection", 
  ["rebound-data/model","rebound-runtime/utils","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    
    var Model = __dependency1__["default"];
    var $ = __dependency2__["default"];

    // If Rebound Runtime has already been run, throw error
    if(Rebound.Collection){
      throw 'Rebound Collection is already loaded on the page!';
    }
    // If Backbone hasn't been started yet, throw error
    if(!window.Backbone){
      throw "Backbone must be on the page for Rebound to load.";
    }

    function pathGenerator(collection){
      return function(){
        return collection.__path() + '[' + collection.indexOf(this) + ']';
      };
    }

    function linkedModels(original){
      return function(model, options){
        if(model.collection === undefined){
          return model.deinitialize();
        }
        if(original.collection === undefined){
          return original.deinitialize();
        }
        if(original.collection === model.collection){
          return;
        }

        if(!original.synced[model._cid]){
          model.synced[original._cid] = true;
          original.set(model.changedAttributes(), options);
          model.synced[original._cid] = false;
        }
      };
    }

    var Collection = Backbone.Collection.extend({

      isCollection: true,
      isData: true,

      model: this.model || Model,

      __path: function(){return '';},

      constructor: function(models, options){
        options = options || {};
        this.__observers = {};
        this.helpers = {};

        this.setParent( options.parent || this );
        this.setRoot( options.root || this );
        this.__path = options.path || this.__path;

        Backbone.Collection.apply( this, arguments );

        this.on('remove', function(model, collection, options){
          model.deinitialize();
        });

      },

      get: function(key, options){

        // If the key is a number or object, default to backbone's collection get
        if(typeof key == 'number' || typeof key == 'object'){
          return Backbone.Collection.prototype.get.call(this, key);
        }

        // If key is not a string, return undefined
        if (!_.isString(key)){ return void 0; }

        // Split the path at all '.', '[' and ']' and find the value referanced.
        var parts  = $.splitPath(key),
            result = this,
            l=parts.length,
            i=0;
            options = _.defaults((options || {}), { parent: 0, raw: false });

        if(_.isUndefined(key) || _.isNull(key)){ return key; }

        if(key === '' || parts.length === 0){ return result; }

        if (parts.length > 0) {
          for ( i = 0; i < l - options.parent; i++) {

            if( result && result.isComputedProperty ){
              // If returning raw, always return the first computed property in a chian.
              if(options.raw){ return result; }
                result = result.value();
            }

            if(_.isUndefined(result) || _.isNull(result)){
              return result;
            }

            if(parts[i] === '@parent'){
              result = result.__parent__;
            }
            else if( result.isCollection ){
              result = result.models[parts[i]];
            }
            else if( result.isModel ){
              result = result.attributes[parts[i]];
            }
            else if( result && result.hasOwnProperty(parts[i]) ){
              result = result[parts[i]];
            }
          }
        }

        if( result && result.isComputedProperty && !options.raw){
          result = result.value();
        }

        return result;
      },

      set: function(models, options){
        var newModels = [];
            options = options || {};

        // If no models passed, implies an empty array
        models || (models = []);

        if(!_.isObject(models)){
          return console.error('Collection.set must be passed a Model, Object, array or Models and Objects, or another Collection');
        }

        // If another collection, treat like an array
        models = (models.isCollection) ? models.models : models;

        // Ensure models is an array
        models = (!_.isArray(models)) ? [models] : models;

        // For each model, construct a copy of it
        _.each(models, function(data, index){
          var model,
              id = (data instanceof Model)  ? data : data[this.model.idAttribute || 'id'];

          // If the model already exists in this collection, let Backbone handle the merge
          if(this.get(id)){
            return newModels[index] = data;
          }

          // TODO: This will override things set by the passed model to appease the collection's model's defaults. Do a smart default set here.
          model = new this.model((data.isModel && data.attributes || data), _.defaults({
             parent: this,
             root: this.__root__,
             path: pathGenerator(this)
           }, options));

           // Keep this new collection's models in sync with the originals.
           if(data.isModel){

              // Preserve each Model's original cid value
              model._cid = model._cid || model.cid;
              data._cid = data._cid || data.cid;

              // Synced Model should share the same cid so helpers interpert them as the same object
              model.cid = data.cid;

              if(!model.synced[data._cid]){
                data.on('change', linkedModels(model));
                model.synced[data._cid] = false;
              }

              if(!data.synced[model._cid]){
                model.on('change', linkedModels(data));
                data.synced[model._cid] = false;
              }
            }

           newModels[index] = model;

        }, this);

        // Ensure that this element now knows that it has children now. Without this cyclic dependancies cause issues
        this._hasAncestry = this._hasAncestry || (newModels.length > 0);

        // Call original set function with model duplicates
        Backbone.Collection.prototype.set.call(this, newModels, options);

      }

    });

    __exports__["default"] = Collection;
  });
define("rebound-data/rebound-data", 
  ["rebound-data/model","rebound-data/collection","rebound-data/computed-property","rebound-runtime/utils","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __exports__) {
    
    var Model = __dependency1__["default"];
    var Collection = __dependency2__["default"];
    var ComputedProperty = __dependency3__["default"];
    var $ = __dependency4__["default"];


    var sharedMethods = {
      setParent: function(parent){

        if(this.__parent__){
          this.off('all', this.__parent__.trigger);
        }

        this.__parent__ = parent;
        this._hasAncestry = true;

        // If parent is not self, propagate all events up
        if(parent !== this && !parent.isCollection){
          this.on('all', parent.trigger, parent);
        }

        return parent;

      },

      // TODO: I dont like this recursively setting elements root when one element's root changes. Fix this.
      setRoot: function (root){
        var obj = this;
        obj.__root__ = root;
        var val = obj.models ||  obj.attributes || obj.cache;
        _.each(val, function(value, key){
          if(value && value.isData){
            value.setRoot(root);
          }
        });
        return root;
      },

      hasParent: function(obj){
        var tmp = this;
        while(tmp !== obj){
          tmp = tmp.__parent__;
          if(_.isUndefined(tmp)){ return false; }
          if(tmp === obj){ return true; }
          if(tmp.__parent__ === tmp){ return false; }
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
        if(this.el){

          _.each(this.el.__listeners, function(handler, eventType){
            if (this.el.removeEventListener){ this.el.removeEventListener(eventType, handler, false); }
            if (this.el.detachEvent){ this.el.detachEvent('on'+eventType, handler); }
          }, this);

          // Remove all event delegates
          delete this.el.__listeners;
          delete this.el.__events;

          // Recursively remove element lazyvalues
          $(this.el).walkTheDOM(function(el){
            if(el.__lazyValue && el.__lazyValue.destroy()){
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
        if(this.data && this.data.deinitialize){
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
        if(this.cache){
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


    __exports__.Model = Model;
    __exports__.Collection = Collection;
    __exports__.ComputedProperty = ComputedProperty;
  });
define("rebound-runtime/component", 
  ["rebound-runtime/utils","rebound-runtime/env","rebound-data/rebound-data","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __exports__) {
    
    var $ = __dependency1__["default"];
    var env = __dependency2__["default"];
    var Model = __dependency3__.Model;
    var Collection = __dependency3__.Collection;
    var ComputedProperty = __dependency3__.ComputedProperty;


    // If Rebound Runtime has already been run, throw error
    if(Rebound.Component){
      throw 'Rebound is already loaded on the page!';
    }
    // If Backbone hasn't been started yet, throw error
    if(!window.Backbone){
      throw "Backbone must be on the page for Rebound to load.";
    }

    // New Backbone Component
    var Component = Model.extend({

      isComponent: true,

      constructor: function(options){
        options = options || (options = {});
        _.bindAll(this, '_onModelChange', '_onCollectionChange', '__callOnComponent', '_notifySubtree');
        this.cid = _.uniqueId('component');
        this.attributes = {};
        this.changed = {};
        this.helpers = {};
        this.__parent__ = this.__root__ = this;

        // Take our parsed data and add it to our backbone data structure. Does a deep defaults set.
        // In the model, primatives (arrays, objects, etc) are converted to Backbone Objects
        // Functions are compiled to find their dependancies and registerd as compiled properties
        _.each(this.defaults, function(val){
          if(val && (val.isModel || val.isCollection)){
            val.__parent__ = this;
            val.__root__ = this;
          }
        }, this);

        // Set our component's context with the passed data merged with the component's defaults
        this.set($.deepDefaults({}, (options.data || {}), (this.defaults || {})));


        // Call on component is used by the {{on}} helper to call all event callbacks in the scope of the component
        this.helpers.__callOnComponent = this.__callOnComponent;


        // Get any additional routes passed in from options
        this.routes =  _.defaults((options.routes || {}), this.routes);
        // Ensure that all route functions exist
        _.each(this.routes, function(value, key, routes){
            if(typeof value !== 'string'){ throw('Function name passed to routes in  ' + this.__name + ' component must be a string!'); }
            if(!this[value]){ throw('Callback function '+value+' does not exist on the  ' + this.__name + ' component!'); }
        }, this);


        // Set our outlet and template if we have one
        this.el = options.outlet || undefined;
        this.$el = (_.isUndefined(window.Backbone.$)) ? false : window.Backbone.$(this.el);

        if(_.isFunction(this.createdCallback)){
          this.createdCallback.call(this);
        }

        // Take our precompiled template and hydrates it. When Rebound Compiler is included, can be a handlebars template string.
        if(!options.template && !this.template){ throw('Template must provided for ' + this.__name + ' component!'); }
        this.template = options.template || this.template;
        this.template = (typeof options.template === 'string') ? Rebound.templates[this.template] : env.hydrate(this.template);


        // Listen to relevent data change events
        this.listenTo(this, 'change', this._onModelChange);
        this.listenTo(this, 'add remove', this._onCollectionChange);
        this.listenTo(this, 'reset', this._onReset);


        // Render our dom and place the dom in our custom element
        this.el.appendChild(this.template(this, {helpers: this.helpers}, this.el));

      },

      $: function(selector) {
        if(!this.$el){
          return console.error('No DOM manipulation library on the page!');
        }
        return this.$el.find(selector);
      },

      // Trigger all events on both the component and the element
      trigger: function(eventName){
        if(this.el){
          $(this.el).trigger(eventName, arguments);
        }
        Backbone.Model.prototype.trigger.apply(this, arguments);
      },

      __callOnComponent: function(name, event){
        if(!_.isFunction(this[name])){ throw "ERROR: No method named " + name + " on component " + this.__name + "!"; }
        return this[name].call(this, event);
      },

      _onReset: function(data, options){
        if(data && data.isModel){
          return this._onModelChange(data, options);
        }
        else if(data.isCollection){
          return this._onCollectionChange(data, options);
        }
      },

      _onModelChange: function(model, options){
        // console.error('Model change', model.changedAttributes(), model );
        var changed = model.changedAttributes();
        if(changed){
          this._notifySubtree(model, model.changedAttributes(), 'model');
        }
      },

      _onCollectionChange: function(model, collection, options){
        // console.error('Collection change', model, collection);

        var changed = {},
            that = this;
        if(model.isCollection){
          options = collection;
          collection = model;
        }

        changed[collection.__path()] = collection;
        if(collection._timeout){
          clearTimeout(collection._timeout);
          collection._timeout = undefined;
        }
        collection._timeout = setTimeout(function(){
          that._notifySubtree(that, changed, 'collection');
        }, 20);
      },

      _notifySubtree: function(obj, changed, type){

        var context = this, // This root context
            path = obj.__path(), // The path of the modified object relative to the root context
            parts = $.splitPath(path), // Array of parts of the modified object's path: test[1].whatever -> ['test', '1', 'whatever']
            keys = _.keys(changed), // Array of all changed keys
            i = 0,
            len = parts.length,
            paths,
            triggers;

        // Call notify on every object down the data tree starting at the root and all the way down element that triggered the change
        for(i;i<=len;i++){

          // Reset paths for each data layer
          paths = [];
          triggers = [];

          // For every key changed
          _.each(keys, function(attr){

            // Constructs paths variable relative to current data element
            paths.push(((path && path + '.' || '') + attr).replace(context.__path(), '').replace(/\[([^\]]+)\]/g, ".$1").replace(/^\./, ''));
            paths.push(((path && path + '.' || '') + attr).replace(context.__path(), '').replace(/\[[^\]]+\]/g, ".@each").replace(/^\./, ''));
            paths = _.uniq(paths);
          });

          // Call all listeners
          env.notify(context, paths, type);

          // If not at end of path parts, get the next data object
          context = (i === len) || (context.isModel && context.get(parts[i])) || (context.isCollection && context.at(parts[i]));
          if(context === undefined){
            break;
          }
        }
      }
    });

    Component.extend= function(protoProps, staticProps) {
      var parent = this,
          child,
          reservedMethods = {'trigger':1, 'constructor':1, 'get':1, 'set':1, 'has':1, 'extend':1, 'escape':1, 'unset':1, 'clear':1, 'cid':1, 'attributes':1, 'changed':1, 'toJSON':1, 'validationError':1, 'isValid':1, 'isNew':1, 'hasChanged':1, 'changedAttributes':1, 'previous':1, 'previousAttributes':1},
          configProperties = {'routes':1, 'template':1, 'defaults':1, 'outlet':1, 'url':1, 'urlRoot':1, 'idAttribute':1, 'id':1, 'createdCallback':1, 'attachedCallback':1, 'detachedCallback':1};

      protoProps.defaults = {};

      // For each property passed into our component base class
      _.each(protoProps, function(value, key, protoProps){

        // If a configuration property, ignore it
        if(configProperties[key]){ return; }

        // If a primative or backbone type object, or computed property (function which takes no arguments and returns a value) move it to our defaults
        if(!_.isFunction(value) || value.isModel || value.isComponent || (_.isFunction(value) && value.length === 0 && value.toString().indexOf('return') > -1)){
          protoProps.defaults[key] = value;
          delete protoProps[key];
        }

        // If a reserved method, yell
        if(reservedMethods[key]){ throw "ERROR: " + key + " is a reserved method name in " + staticProps.__name + "!"; }

        // All other values are component methods, leave them be unless already defined.

      }, this);

      // If given a constructor, use it, otherwise use the default one defined above
      if (protoProps && _.has(protoProps, 'constructor')) {
        child = protoProps.constructor;
      } else {
        child = function(){ return parent.apply(this, arguments); };
      }

      // Our class should inherit everything from its parent, defined above
      var Surrogate = function(){ this.constructor = child; };
      Surrogate.prototype = parent.prototype;
      child.prototype = new Surrogate();

      // Extend our prototype with any remaining protoProps, overriting pre-defined ones
      if (protoProps){ _.extend(child.prototype, protoProps, staticProps); }

      // Set our ancestry
      child.__super__ = parent.prototype;

      return child;
    };


    __exports__["default"] = Component;
  });
define("rebound-router/rebound-router", 
  ["rebound-runtime/utils","exports"],
  function(__dependency1__, __exports__) {
    
    var $ = __dependency1__["default"];

    // If Rebound Runtime has already been run, throw error
    if(Rebound.Router){ throw 'Rebound is already loaded on the page!'; }
    // If Rebound global object isn't instantiated, create it
    if(!_.isObject(window.Rebound)){ window.Rebound = {}; }
    // If Backbone hasn't been started yet, throw error
    if(!window.Backbone){ throw "Backbone must be on the page for Rebound to load."; }

      // Clean up old page component and load routes from our new page component
      function installResources(PageApp, primaryRoute, isGlobal) {
        var oldPageName, pageInstance, container, router = this;

        // De-initialize the previous app before rendering a new app
        // This way we can ensure that every new page starts with a clean slate
        // This is crucial for scalability of a single page app.
        if(!isGlobal && this.current){

          oldPageName = this.current.__name;
          // Unset Previous Application's Routes. For each route in the page app:
          _.each(this.current.__component__.routes, function (value, key) {

            var regExp = router._routeToRegExp(key).toString();

            // Remove the handler from our route object
            Backbone.history.handlers = _.filter(Backbone.history.handlers, function(obj){return obj.route.toString() !== regExp;});

            // Delete our referance to the route's callback
            delete router[ '_function_' + key ];

          });

          // Un-hook Event Bindings, Delete Objects
          this.current.__component__.deinitialize();

          // Disable old css if it exists
          setTimeout(function(){
            document.getElementById(oldPageName + '-css').setAttribute('disabled', true);
          }, 500);

        }

        // Load New PageApp, give it it's name so we know what css to remove when it deinitializes
        pageInstance = new PageApp();
        pageInstance.__name = primaryRoute;


        // Add to our page
        container = (isGlobal) ? document.querySelector(isGlobal) : document.getElementsByTagName('content')[0];
        container.innerHTML = '';
        container.appendChild(pageInstance);

        // Make sure we're back at the top of the page
        document.body.scrollTop = 0;


        // Augment ApplicationRouter with new routes from PageApp
        _.each(pageInstance.__component__.routes, function (value, key) {
          // Generate our route callback's new name
          var routeFunctionName = '_function_' + key,
              functionName;
          // Add the new callback referance on to our router
          router[routeFunctionName] =  function () { pageInstance.__component__[value].apply(pageInstance.__component__, arguments); };
          // Add the route handler
          router.route(key, value, this[routeFunctionName]);
        }, this);

        if(!isGlobal){
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
            cssElement = document.getElementById(appName + '-css'),
            jsElement = document.getElementById(appName + '-js'),
            router = this,
            PageApp;

          // Only Load CSS If Not Loaded Before
          if(!cssElement){
            cssElement = document.createElement('link');
            cssElement.setAttribute('type', 'text/css');
            cssElement.setAttribute('rel', 'stylesheet');
            cssElement.setAttribute('href', cssUrl);
            cssElement.setAttribute('id', appName + '-css');
            document.head.appendChild(cssElement);
            $(cssElement).on('load', function(event){
                if((cssLoaded = true) && jsLoaded){
                  // Install The Loaded Resources
                  installResources.call(router, PageApp, appName, isGlobal);

                  // Re-trigger route so the newly added route may execute if there's a route match.
                  // If no routes are matched, app will hit wildCard route which will then trigger 404
                  if(!isGlobal && router.config.triggerOnFirstLoad){
                    Backbone.history.loadUrl(Backbone.history.fragment);
                  }
                  if(!isGlobal){
                    router.config.triggerOnFirstLoad = true;
                  }
                  document.body.classList.remove('loading');
                }
              });
          }
          // If it has been loaded bevore, enable it
          else {
            cssElement.removeAttribute('disabled');
            cssLoaded = true;
          }

          // If require library is almond, load script manualy. It better contain all its dependancies.
          if(require._defined || _.isUndefined(require)){
              jsElement = document.createElement('script');
              jsElement.setAttribute('type', 'text/javascript');
              jsElement.setAttribute('src', '/'+jsUrl+'.js');
              jsElement.setAttribute('id', appName + '-js');
              document.head.appendChild(jsElement);
              $(jsElement).on('load', function(event){
                // AMD Will Manage Dependancies For Us. Load The App.
                require([jsUrl], function(PageClass){

                  if((jsLoaded = true) && (PageApp = PageClass) && cssLoaded){

                    // Install The Loaded Resources
                    installResources.call(router, PageApp, appName, isGlobal);
                    // Re-trigger route so the newly added route may execute if there's a route match.
                    // If no routes are matched, app will hit wildCard route which will then trigger 404
                    if(!isGlobal && router.config.triggerOnFirstLoad){
                      Backbone.history.loadUrl(Backbone.history.fragment);
                    }
                    if(!isGlobal){
                      router.config.triggerOnFirstLoad = true;
                    }

                    document.body.classList.remove('loading');
                  }
                });
              });

          }
          else{
            // AMD Will Manage Dependancies For Us. Load The App.
            require([jsUrl], function(PageClass){

              if((jsLoaded = true) && (PageApp = PageClass) && cssLoaded){

                // Install The Loaded Resources
                installResources.call(router, PageApp, appName, isGlobal);
                // Re-trigger route so the newly added route may execute if there's a route match.
                // If no routes are matched, app will hit wildCard route which will then trigger 404
                if(!isGlobal && router.config.triggerOnFirstLoad){
                  Backbone.history.loadUrl(Backbone.history.fragment);
                }

                if(!isGlobal){
                  router.config.triggerOnFirstLoad = true;
                }
                document.body.classList.remove('loading');
              }
            });
          }

      }

      // ReboundRouter Constructor
      var ReboundRouter = Backbone.Router.extend({

        routes: {
          '*route': 'wildcardRoute'
        },

        // Called when no matching routes are found. Extracts root route and fetches it resources
        wildcardRoute: function(route) {
          var appName, primaryRoute;

          // If empty route sent, route home
          route = route || '';

          // Get Root of Route
          appName = primaryRoute = (route) ? route.split('/')[0] : 'index';

          // Find Any Custom Route Mappings
          _.any(this.config.handlers, function(handler) {
            if (handler.route.test(route)) {
              appName = handler.primaryRoute;
              return true;
            }
          });

          // If Page Is Already Loaded Then The Route Does Not Exist. 404 and Exit.
          if (this.current && this.current.name === primaryRoute) {
            return Backbone.history.loadUrl('404');
          }

          // Fetch Resources
          document.body.classList.add("loading");
          fetchResources.call(this, appName, primaryRoute);
        },

        // On startup, save our config object and start the router
        initialize: function(options) {

          // Save our config referance
          this.config = options.config;
          this.config.handlers = [];

          var absoluteUrl = new RegExp('^(?:[a-z]+:)?//', 'i'),
          router = this;

          // Convert our routeMappings to regexps and push to our handlers
          _.each(this.config.routeMapping, function(value, route){
            if (!_.isRegExp(route)) route = router._routeToRegExp(route);
            router.config.handlers.unshift({ route: route, primaryRoute: value });
          }, this);

          // Navigate to route for any link with a relative href
          $(document).on('click', 'a', function(e){

            var path = e.target.getAttribute('href');

            // If path is not an absolute url, or blank, try and navigate to that route.
            if(path !== '#' && path !== '' && !absoluteUrl.test(path)){
              e.preventDefault();
              router.navigate(path, {trigger: true});
            }
          });

          // Install our global components
          _.each(this.config.globalComponents, function(selector, route){
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


    __exports__["default"] = ReboundRouter;
  });
define("rebound-runtime/rebound-runtime", 
  ["rebound-runtime/env","rebound-runtime/utils","rebound-data/rebound-data","rebound-runtime/component","rebound-router/rebound-router","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __dependency5__, __exports__) {
    
    // If Backbone hasn't been started yet, throw error
    if(!window.Backbone){
      throw "Backbone must be on the page for Rebound to load.";
    }

    // Load our client environment
    var env = __dependency1__["default"];

    // Load our utils
    var utils = __dependency2__["default"];

    // Load Rebound Data
    var Model = __dependency3__.Model;
    var Collection = __dependency3__.Collection;
    var ComputedProperty = __dependency3__.ComputedProperty;

    // Load Rebound Components
    var Component = __dependency4__["default"];

    // Load The Rebound Router
    var Router = __dependency5__["default"];

    // Fetch Rebound Config Object
    var Config = JSON.parse(document.getElementById('Rebound').innerText);

    // If Backbone doesn't have an ajax method from an external DOM library, use ours
    window.Backbone.ajax = window.Backbone.$ && window.Backbone.$.ajax && window.Backbone.ajax || utils.ajax;

    // Create Global Object
    window.Rebound = {
      registerHelper: env.registerHelper,
      registerPartial: env.registerPartial,
      Model: Model,
      Collection: Collection,
      ComputedProperty: ComputedProperty,
      Component: Component,
      Config: Config
    };

    window.Rebound.router = new Router({config: Config});

    __exports__["default"] = Rebound;
  });
//The modules for your project will be inlined above
//this snippet. Ask almond to synchronously require the
//module value for 'main' here and return it as the
//value to use for the public API for the built file.

  return (function(){
    require(['rebound-runtime/rebound-runtime'], function(Rebound){

    });
  })();
}));

require.config({
    baseUrl: "/"
});

require(['Rebound']);