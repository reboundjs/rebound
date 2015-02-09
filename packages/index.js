// Load Rebound Component Library
import "rebound-component/rebound-component";

// Load The Rebound Router
import Router from "rebound-router/rebound-router";

// Fetch Rebound Config Object
var Config = JSON.parse(document.getElementById('Rebound').innerHTML);

// Initialize
window.Rebound.Config = Config;
window.Rebound.router = new Router({config: Config});

export default Rebound;
