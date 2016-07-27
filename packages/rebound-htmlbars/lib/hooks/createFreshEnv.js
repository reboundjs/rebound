// ### Create-Fresh-Environment Hook

// Rebound's default environment
// The application environment is propagated down each render call and
// augmented with helpers as it goes
import { default as _DOMHelper } from "dom-helper";
import helpers from "rebound-htmlbars/helpers";
import { $ } from "rebound-utils/rebound-utils";

var DOMHelper = _DOMHelper.default || _DOMHelper; // Fix for stupid Babel imports

export default function createFreshEnv(){
  return {
    isReboundEnv: true,
    cid: $.uniqueId('env'),
    root: null,
    helpers: helpers,
    hooks: this,
    dom: new DOMHelper(),
    revalidateQueue: {},
    observers: {},
  };
}
