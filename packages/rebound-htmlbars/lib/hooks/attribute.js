// ### Attribute Hook

import $ from "rebound-utils/rebound-utils";

// All valid text based HTML input types
const TEXT_INPUTS = { "null": 1,  text: 1,  email: 1, password: 1,
                       search: 1, url: 1,   tel: 1,   hidden: 1,
                       number: 1, color: 1, date: 1,  datetime: 1,
                       month: 1,  range: 1, time: 1,  week: 1,
                      "datetime-local": 1
                    };

// All valid boolean HTML input types
const BOOLEAN_INPUTS = { checkbox: 1, radio: 1 };

// Returns true is value is numeric based on HTML5 number input field logic.
// Trailing decimals are considered non-numeric (ex `12.`).
function isNumeric(val){
  return val && !isNaN(Number(val)) && (!_.isString(val) || ((_.isString(val) && val[val.length-1] !== '.')));
}

// Attribute Hook
export default function attribute(attrMorph, env, scope, name, value){

  var val = value.isLazyValue ? value.value : value,
      el = attrMorph.element,
      tagName = el.tagName,
      type = el.getAttribute("type"),
      cursor = false;


  // If this is a text input element's value prop, wire up our databinding
  if( tagName === 'INPUT' && type === 'number' && name === 'value' ){

    // If our input events have not been bound yet, bind them. Attempt to convert
    // to a proper number type before setting.
    if(!attrMorph.eventsBound){
      $(el).on('change input propertychange', function(event){
        var val = this.value;
        val = isNumeric(val) ? Number(val) : undefined;
        value.set(value.path, val);
      });
      attrMorph.eventsBound = true;
    }

    // Set the value property of the input
    // Number Input elements may return `''` for non valid numbers. If both values
    // are falsy, then don't blow away what the user is typing.
    if(!el.value && !val){ return; }
    else{ el.value = isNumeric(val) ? Number(val) : ''; }

  }

  // If this is a text input element's value prop, wire up our databinding
  else if( tagName === 'INPUT' && TEXT_INPUTS[type] && name === 'value' ){

    // If our input events have not been bound yet, bind them
    if(!attrMorph.eventsBound){
      $(el).on('change input propertychange', function(event){
        value.set(value.path, this.value);
      });
      attrMorph.eventsBound = true;
    }

    // Set the value property of the input if it has changed
    if(el.value !== val){

      // Only save the cursor position if this element is the currently focused one.
      // Some browsers are dumb about selectionStart on some input types (I'm looking at you [type='email'])
      // so wrap in try catch so it doesn't explode. Then, set the new value and
      // re-position the cursor.
      if(el === document.activeElement){ try{ cursor = el.selectionStart; } catch(e){ } }
      el.value = val ? String(val) : '';
      (cursor !== false) && el.setSelectionRange(cursor, cursor);

    }
  }

  else if( tagName === 'INPUT' && BOOLEAN_INPUTS[type] && name === 'checked' ){

    // If our input events have not been bound yet, bind them
    if(!attrMorph.eventsBound){
      $(el).on('change propertychange', function(event){
        value.set(value.path, ((this.checked) ? true : false));
      });
      attrMorph.eventsBound = true;
    }

    el.checked = (val) ? true : undefined;
  }

  // Special case for link elements with dynamic classes.
  // If the router has assigned it a truthy 'active' property, ensure that the extra class is present on re-render.
  else if( tagName === 'A' && name === 'class' && el.active ){
    val = val ? String(val) + ' active' : 'active';
  }

  // Set the attribute on our element for visual referance
  val ? el.setAttribute(name, String(val)) : el.removeAttribute(name);

  this.linkRenderNode(attrMorph, env, scope, '@attribute', [value], {});

}
