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

// Attribute Hook
export default function attribute(attrMorph, env, scope, name, value){

  var val = value.isLazyValue ? value.value : value,
      el = attrMorph.element,
      tagName = el.tagName,
      type = el.getAttribute("type");

  // If this is a text input element's value prop, wire up our databinding
  if( tagName === 'INPUT' && TEXT_INPUTS[type] && name === 'value' ){

    // If our input events have not been bound yet, bind them
    if(!attrMorph.eventsBound){
      $(el).on('change input propertychange', function(event){
        value.set(value.path, this.value);
      });
      attrMorph.eventsBound = true;
    }

    // Set the value property of the input
    el.value = val ? String(val) : '';
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
