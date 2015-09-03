
var cleanslate = `/*!
* CleanSlate
*   github.com/premasagar/cleanslate
*   An extreme CSS reset stylesheet, for normalising the styling of a container element and its children.
*/

/* == BLANKET RESET RULES == */

/* HTML 4.01 */
#ID, #ID h1, #ID h2, #ID h3, #ID h4, #ID h5, #ID h6, #ID p, #ID td, #ID dl, #ID tr, #ID dt, #ID ol, #ID form, #ID select, #ID option, #ID pre, #ID div, #ID table,  #ID th, #ID tbody, #ID tfoot, #ID caption, #ID thead, #ID ul, #ID li, #ID address, #ID blockquote, #ID dd, #ID fieldset, #ID li, #ID iframe, #ID strong, #ID legend, #ID em, #ID summary, #ID cite, #ID span, #ID input, #ID sup, #ID label, #ID dfn, #ID object, #ID big, #ID q, #ID samp, #ID acronym, #ID small, #ID img, #ID strike, #ID code, #ID sub, #ID ins, #ID textarea, #ID button, #ID var, #ID a, #ID abbr, #ID applet, #ID del, #ID kbd, #ID tt, #ID b, #ID i, #ID hr,

/* HTML5 - Sept 2013 taken from MDN https://developer.mozilla.org/en-US/docs/Web/Guide/HTML/HTML5/HTML5_element_list */
#ID article, #ID aside, #ID figure, #ID figcaption, #ID footer, #ID header, #ID menu, #ID nav, #ID section, #ID time, #ID mark, #ID audio, #ID video, #ID abbr, #ID address, #ID area, #ID blockquote, #ID canvas, #ID caption, #ID cite, #ID code, #ID colgroup, #ID col, #ID datalist, #ID fieldset, #ID main, #ID map, #ID meta, #ID optgroup, #ID output, #ID progress {
    background-attachment:scroll;
    background-color:transparent;
    background-image:none; /* This rule affects the use of pngfix JavaScript http://dillerdesign.com/experiment/DD_BelatedPNG for IE6, which is used to force the browser to recognise alpha-transparent PNGs files that replace the IE6 lack of PNG transparency. (The rule overrides the VML image that is used to replace the given CSS background-image). If you don't know what that means, then you probably haven't used the pngfix script, and this comment may be ignored :) */
    background-position:0 0;
    background-repeat:repeat;
    border-color:black;
    border-color:currentColor; /* 'border-color' should match font color. Modern browsers (incl. IE9) allow the use of "currentColor" to match the current font 'color' value <http://www.w3.org/TR/css3-color/#currentcolor>. For older browsers, a default of 'black' is given before this rule. Guideline to support older browsers: if you haven't already declared a border-color for an element, be sure to do so, e.g. when you first declare the border-width. */
    border-radius:0;
    border-style:none;
    border-width:medium;
    bottom:auto;
    clear:none;
    clip:auto;
    color:inherit;
    counter-increment:none;
    counter-reset:none;
    cursor:auto;
    direction:inherit;
    display:inline;
    float:none;
    font-family: inherit; /* As with other inherit values, this needs to be set on the root container element */
    font-size: inherit;
    font-style:inherit;
    font-variant:normal;
    font-weight:inherit;
    height:auto;
    left:auto;
    letter-spacing:normal;
    line-height:inherit;
    list-style-type: inherit; /* Could set list-style-type to none */
    list-style-position: outside;
    list-style-image: none;
    margin:0;
    max-height:none;
    max-width:none;
    min-height:0;
    min-width:0;
    opacity:1;
    outline:invert none medium;
    overflow:visible;
    padding:0;
    position:static;
    quotes: "" "";
    right:auto;
    table-layout:auto;
    text-align:inherit;
    text-decoration:inherit;
    text-indent:0;
    text-transform:none;
    top:auto;
    unicode-bidi:normal;
    vertical-align:baseline;
    visibility:inherit;
    white-space:normal;
    width:auto;
    word-spacing:normal;
    z-index:auto;

    /* CSS3 */
    /* Including all prefixes according to http://caniuse.com/ */
    /* CSS Animations don't cascade, so don't require resetting */
    -webkit-background-origin: padding-box;
            background-origin: padding-box;
    -webkit-background-clip: border-box;
            background-clip: border-box;
    -webkit-background-size: auto;
       -moz-background-size: auto;
            background-size: auto;
    -webkit-border-image: none;
       -moz-border-image: none;
         -o-border-image: none;
            border-image: none;
    -webkit-border-radius:0;
       -moz-border-radius:0;
            border-radius: 0;
    -webkit-box-shadow: none;
            box-shadow: none;
    -webkit-box-sizing: content-box;
       -moz-box-sizing: content-box;
            box-sizing: content-box;
    -webkit-column-count: auto;
       -moz-column-count: auto;
            column-count: auto;
    -webkit-column-gap: normal;
       -moz-column-gap: normal;
            column-gap: normal;
    -webkit-column-rule: medium none black;
       -moz-column-rule: medium none black;
            column-rule: medium none black;
    -webkit-column-span: 1;
       -moz-column-span: 1; /* doesn't exist yet but probably will */
            column-span: 1;
    -webkit-column-width: auto;
       -moz-column-width: auto;
            column-width: auto;
    font-feature-settings: normal;
    overflow-x: visible;
    overflow-y: visible;
    -webkit-hyphens: manual;
       -moz-hyphens: manual;
            hyphens: manual;
    -webkit-perspective: none;
       -moz-perspective: none;
        -ms-perspective: none;
         -o-perspective: none;
            perspective: none;
    -webkit-perspective-origin: 50% 50%;
       -moz-perspective-origin: 50% 50%;
        -ms-perspective-origin: 50% 50%;
         -o-perspective-origin: 50% 50%;
            perspective-origin: 50% 50%;
    -webkit-backface-visibility: visible;
       -moz-backface-visibility: visible;
        -ms-backface-visibility: visible;
         -o-backface-visibility: visible;
            backface-visibility: visible;
    text-shadow: none;
    -webkit-transition: all 0s ease 0s;
            transition: all 0s ease 0s;
    -webkit-transform: none;
       -moz-transform: none;
        -ms-transform: none;
         -o-transform: none;
            transform: none;
    -webkit-transform-origin: 50% 50%;
       -moz-transform-origin: 50% 50%;
        -ms-transform-origin: 50% 50%;
         -o-transform-origin: 50% 50%;
            transform-origin: 50% 50%;
    -webkit-transform-style: flat;
       -moz-transform-style: flat;
        -ms-transform-style: flat;
         -o-transform-style: flat;
            transform-style: flat;
    word-break: normal;
}

/* == BLOCK-LEVEL == */
/* Actually, some of these should be inline-block and other values, but block works fine (TODO: rigorously verify this) */
/* HTML 4.01 */
#ID, #ID h3, #ID h5, #ID p, #ID h1, #ID dl, #ID dt, #ID h6, #ID ol, #ID form, #ID option, #ID pre, #ID div, #ID h2, #ID caption, #ID h4, #ID ul, #ID address, #ID blockquote, #ID dd, #ID fieldset, #ID hr,

/* HTML5 new elements */
#ID article, #ID dialog, #ID figure, #ID footer, #ID header, #ID hgroup, #ID menu, #ID nav, #ID section, #ID audio, #ID video, #ID address, #ID blockquote, #ID colgroup, #ID main, #ID progress, #ID summary {
    display:block;
}
#ID h1, #ID h2, #ID h3, #ID h4, #ID h5, #ID h6 {
    font-weight: bold;
}
#ID h1 {
    font-size: 2em;
    padding: .67em 0;
}
#ID h2 {
    font-size: 1.5em;
    padding: .83em 0;
}
#ID h3 {
    font-size: 1.17em;
    padding: .83em 0;
}
#ID h4 {
    font-size: 1em;
}
#ID h5 {
    font-size: .83em;
}
#ID p {
    margin: 1em 0;
}
#ID table {
    display: table;
}
#ID thead {
    display: table-header-group;
}
#ID tbody {
    display: table-row-group;
}
#ID tfoot {
    display: table-footer-group;
}
#ID tr {
    display: table-row;
}
#ID th, #ID td {
    display: table-cell;
    padding: 2px;
}

/* == SPECIFIC ELEMENTS == */
/* Some of these are browser defaults; some are just useful resets */
#ID ol, #ID ul {
    margin: 1em 0 1em 40px;
}
#ID ul li, #ID ul ul li, #ID ul ul ul li, #ID ol li, #ID ol ol li, #ID ol ol ol li, #ID ul ol ol li, #ID ul ul ol li, #ID ol ul ul li, #ID ol ol ul li {
    list-style-position: inside;
}
#ID ol ol, #ID ol ol ol, #ID ul ul, #ID ul ul ul, #ID ol ul, #ID ol ul ul, #ID ol ol ul, #ID ul ol, #ID ul ol ol, #ID ul ul ol {
    padding-left: 40px;
    margin: 0;
}
/* helper for general navigation */
#ID nav ul, #ID nav ol {
    list-style-type:none;
}
#ID ul, #ID menu {
    list-style-type:disc;
}
#ID ol {
    list-style-type:decimal;
}
#ID ol ul, #ID ul ul, #ID menu ul, #ID ol menu, #ID ul menu, #ID menu menu {
    list-style-type:circle;
}
#ID ol ol ul, #ID ol ul ul, #ID ol menu ul, #ID ol ol menu, #ID ol ul menu, #ID ol menu menu, #ID ul ol ul, #ID ul ul ul, #ID ul menu ul, #ID ul ol menu, #ID ul ul menu, #ID ul menu menu, #ID menu ol ul, #ID menu ul ul, #ID menu menu ul, #ID menu ol menu, #ID menu ul menu, #ID menu menu menu {
    list-style-type:square;
    padding-left: 20px;
    -webkit-padding-start: 40px;
}
#ID li {
    display:list-item;
    /* Fixes IE7 issue with positioning of nested bullets */
    min-height:auto;
    min-width:auto;
}
#ID strong {
    font-weight:bold;
}
#ID em {
    font-style:italic;
}
#ID kbd, #ID samp, #ID code, #ID pre {
  font-family:monospace;
}
#ID a {
    color: blue;
    text-decoration: underline;
}
#ID a:visited {
    color: #529;
}
#ID a, #ID a *, #ID input[type=submit], #ID input[type=radio], #ID input[type=checkbox], #ID select {
    cursor:pointer;
}
#ID button, #ID input[type=submit] {
    text-align: center;
    padding: 2px 6px 3px;
    border-radius: 4px;
    text-decoration: none;
    font-family: arial, helvetica, sans-serif;
    font-size: small;
    background: white;
    -webkit-appearance: push-button;
    color: buttontext;
    border: 1px #a6a6a6 solid;
    background: lightgrey; /* Old browsers */
    background: rgb(255,255,255); /* Old browsers */
    background: -moz-linear-gradient(top,  rgba(255,255,255,1) 0%, rgba(221,221,221,1) 100%, rgba(209,209,209,1) 100%, rgba(221,221,221,1) 100%); /* FF3.6+ */
    background: -webkit-gradient(linear, left top, left bottom, color-stop(0%,rgba(255,255,255,1)), color-stop(100%,rgba(221,221,221,1)), color-stop(100%,rgba(209,209,209,1)), color-stop(100%,rgba(221,221,221,1))); /* Chrome,Safari4+ */
    background: -webkit-linear-gradient(top,  rgba(255,255,255,1) 0%,rgba(221,221,221,1) 100%,rgba(209,209,209,1) 100%,rgba(221,221,221,1) 100%); /* Chrome10+,Safari5.1+ */
    background: -o-linear-gradient(top,  rgba(255,255,255,1) 0%,rgba(221,221,221,1) 100%,rgba(209,209,209,1) 100%,rgba(221,221,221,1) 100%); /* Opera 11.10+ */
    background: -ms-linear-gradient(top,  rgba(255,255,255,1) 0%,rgba(221,221,221,1) 100%,rgba(209,209,209,1) 100%,rgba(221,221,221,1) 100%); /* IE10+ */
    background: linear-gradient(to bottom,  rgba(255,255,255,1) 0%,rgba(221,221,221,1) 100%,rgba(209,209,209,1) 100%,rgba(221,221,221,1) 100%); /* W3C */
    filter: progid:DXImageTransform.Microsoft.gradient( startColorstr='#ffffff', endColorstr='#dddddd',GradientType=0 ); /* IE6-9 */
    /*-webkit-box-shadow: 1px 1px 0px #eee;
       -moz-box-shadow: 1px 1px 0px #eee;
         -o-box-shadow: 1px 1px 0px #eee;
            box-shadow: 1px 1px 0px #eee;*/
    outline: initial;
}
#ID button {
    padding: 1px 6px 2px 6px;
    margin-right: 5px;
}
#ID input[type=hidden] {
    display:none;
}
/* restore form defaults */
#ID textarea {
    -webkit-appearance: textarea;
    background: white;
    padding: 2px;
    margin-left: 4px;
    word-wrap: break-word;
    white-space: pre-wrap;
    font-size: 11px;
    font-family: arial, helvetica, sans-serif;
    line-height: 13px;
    resize: both;
}
#ID select, #ID textarea, #ID input {
    border:1px solid #ccc;
}
#ID select {
    font-size: 11px;
    font-family: helvetica, arial, sans-serif;
    display: inline-block;
}
#ID textarea:focus, #ID input:focus {
    outline: auto 5px -webkit-focus-ring-color;
    outline: initial;
}
#ID input[type=text] {
    background: white;
    padding: 1px;
    font-family: initial;
    font-size: small;
}
#ID input[type=checkbox], #ID input[type=radio] {
    margin: 3px;
    line-height: initial;
    /* border: 1px #2b2b2b solid; */
    /* border-radius: 4px; */
}
#ID input[type=checkbox], #ID input[type=radio] {
    outline: intial;
}
#ID input[type=radio] {
    margin: 2px 2px 3px 2px;
}
#ID input[type=submit]:active, #ID button:active {
    background: rgb(59,103,158); /* Old browsers */
    background: -moz-linear-gradient(top, rgba(59,103,158,1) 0%, rgba(43,136,217,1) 50%, rgba(32,124,202,1) 51%, rgba(125,185,232,1) 100%); /* FF3.6+ */
    background: -webkit-gradient(linear, left top, left bottom, color-stop(0%,rgba(59,103,158,1)), color-stop(50%,rgba(43,136,217,1)), color-stop(51%,rgba(32,124,202,1)), color-stop(100%,rgba(125,185,232,1))); /* Chrome,Safari4+ */
    background: -webkit-linear-gradient(top, rgba(59,103,158,1) 0%,rgba(43,136,217,1) 50%,rgba(32,124,202,1) 51%,rgba(125,185,232,1) 100%); /* Chrome10+,Safari5.1+ */
    background: -o-linear-gradient(top, rgba(59,103,158,1) 0%,rgba(43,136,217,1) 50%,rgba(32,124,202,1) 51%,rgba(125,185,232,1) 100%); /* Opera 11.10+ */
    background: -ms-linear-gradient(top, rgba(59,103,158,1) 0%,rgba(43,136,217,1) 50%,rgba(32,124,202,1) 51%,rgba(125,185,232,1) 100%); /* IE10+ */
    background: linear-gradient(to bottom, rgba(59,103,158,1) 0%,rgba(43,136,217,1) 50%,rgba(32,124,202,1) 51%,rgba(125,185,232,1) 100%); /* W3C */
    border-color: #5259b0;
}
#ID abbr[title], #ID acronym[title], #ID dfn[title] {
    cursor:help;
    border-bottom-width:1px;
    border-bottom-style:dotted;
}
#ID ins {
    background-color:#ff9;
    color:black;
}
#ID del {
    text-decoration: line-through;
}
#ID blockquote, #ID q  {
    quotes:none; /* HTML5 */
}
#ID blockquote:before, #ID blockquote:after, #ID q:before, #ID q:after, #ID li:before, #ID li:after  {
    content:"";
}
#ID input, #ID select {
    vertical-align:middle;
}

#ID table {
    border-collapse:collapse;
    border-spacing:0;
}
#ID hr {
    display:block;
    height:1px;
    border:0;
    border-top:1px solid #ccc;
    margin:1em 0;
}
#ID *[dir=rtl] {
    direction: rtl;
}
#ID mark {
    background-color:#ff9;
    color:black;
    font-style:italic;
    font-weight:bold;
}
#ID menu {
    padding-left: 40px;
    padding-top: 8px;
}

/* additional helpers */
#ID [hidden],
#ID template {
    display: none;
}
#ID abbr[title] {
    border-bottom: 1px dotted;
}
#ID sub, #ID sup {
    font-size: 75%;
    line-height: 0;
    position: relative;
    vertical-align: baseline;
}
#ID sup {
    top: -0.5em;
}
#ID sub {
    bottom: -0.25em;
}
#ID img {
    border: 0;
}
#ID figure {
    margin: 0;
}
#ID textarea {
    overflow: auto;
    vertical-align: top;
}

/* == ROOT CONTAINER ELEMENT == */
/* This contains default values for child elements to inherit  */
#ID {
    line-height: 1;
    direction:ltr;
    text-align: left; /* for IE, Opera */
    text-align: start; /* recommended W3C Spec */
    font: medium "Times New Roman", Times, serif; /* Override this with whatever font-family is required */
    color: black;
    font-style:normal;
    font-weight:normal;
    text-decoration:none;
    list-style-type:disc;
}

#ID pre {
    white-space:pre;
}`;

// Return minified cleanslate stylesheet
export default cleanslate.replace(/\/\*(?:(?!\*\/)[\s\S])*\*\/|[\r\n\t]+/g, ' ').replace(/ {2,}/g, ' ');