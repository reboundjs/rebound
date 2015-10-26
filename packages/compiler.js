//     Rebound.js 0.0.92

//     (c) 2015 Adam Miller
//     Rebound may be freely distributed under the MIT license.
//     For all details and documentation:
//     http://reboundjs.com

// Rebound Compiletime
// ----------------

// If Backbone isn't preset on the page yet, or if `window.Rebound` is already
import Rebound from 'runtime';

// Load our **compiler**
import compiler from "rebound-compiler/compile";

Rebound.compiler = compiler;

export default Rebound;
