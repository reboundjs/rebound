
// Rebound Compiletime
// ----------------

// Import the runtime
import * as Rebound from 'runtime';

// Load our **compiler**
import compiler from "rebound-compiler/compile";

Rebound.compiler = compiler;

export default Rebound;
