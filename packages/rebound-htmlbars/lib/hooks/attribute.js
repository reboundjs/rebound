// ### Attribute Hook

import $ from "rebound-utils/rebound-utils";

// All valid HTML attributes
const ATTRIBUTES = {  abbr: 1,      "accept-charset": 1,   accept: 1,      accesskey: 1,     action: 1,
                      align: 1,      alink: 1,             alt: 1,         archive: 1,       axis: 1,
                      background: 1, bgcolor: 1,           border: 1,      cellpadding: 1,   cellspacing: 1,
                      char: 1,       charoff: 1,           charset: 1,     checked: 1,       cite: 1,
                      class: 1,      classid: 1,           clear: 1,       code: 1,          codebase: 1,
                      codetype: 1,   color: 1,             cols: 1,        colspan: 1,       compact: 1,
                      content: 1,    coords: 1,            data: 1,        datetime: 1,      declare: 1,
                      defer: 1,      dir: 1,               disabled: 1,    enctype: 1,       face: 1,
                      for: 1,        frame: 1,             frameborder: 1, headers: 1,       height: 1,
                      href: 1,       hreflang: 1,          hspace: 1,     "http-equiv": 1,   id: 1,
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
        value.set(value.path, ((this.checked) ? true : false), {quiet: true});
      });
      attrMorph.eventsBound = true;
    }

    el.checked = (val) ? true : undefined;
  }

  // Special case for link elements with dynamic classes.
  // If the router has assigned it a truthy 'active' property, ensure that the extra class is present on re-render.
  else if( tagName === 'A' && name === 'class' && el.active ){
    val = val ? String(val) + ' active' : 'active'
  }

  // Set the attribute on our element for visual referance
  val ? el.setAttribute(name, String(val)) : el.removeAttribute(name);

  this.linkRenderNode(attrMorph, env, scope, '@attribute', [value], {});

};