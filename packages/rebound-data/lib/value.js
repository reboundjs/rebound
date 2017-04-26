'use strict';

// Rebound.Data
// ---------------

// Rebound **Values** are data objects meant to store and return a single value.
// When `Data` does not have a preferred type to use for an object or data type,
// it will default to storing it in a `Value` object, holding and returning the
// passed value.

import { Data } from "rebound-data/data";

export default class Value extends Data {

  // All Values have the read-only property `isValue`
  get isValue(){ return true; }
  set isValue(val){ throw new Error(`Error: Can not set read-only property "isValue" to ${val} on object:`, this); }

  // Initialize all values as `undefined` until hydrate is called.
  constructor(val, options={}){
    super(val, options);
    this.set(val);
  }

  // Return the stored value
  [Data.get](){ return super.cache; }
  [Data.set](val){
    super.cache = val;
    this.trigger('change', this.parent, this.key, val);
    return true;
  }
  [Data.delete](){ this.set(void 0); }

  // `toJSON` just returns our value.
  toJSON(){ return super.cache; }

}