import Component from "rebound-component/component";

export default function registerComponent(name, options) {
  var script = options.prototype;
  var template = options.template;
  var style = options.style;

  var component = Component.extend(script, { __name: name });
  var proto = Object.create(HTMLElement.prototype, {});

  proto.createdCallback = function() {
    this.__component__ = new component({
      template: template,
      outlet: this,
      data: Rebound.seedData
    });
  };

  proto.attachedCallback = function() {
    script.attachedCallback && script.attachedCallback.call(this.__component__);
  };

  proto.detachedCallback = function() {
    script.detachedCallback && script.detachedCallback.call(this.__component__);
    this.__component__.deinitialize();
  };

  proto.attributeChangedCallback = function(attrName, oldVal, newVal) {
    this.__component__._onAttributeChange(attrName, oldVal, newVal);
    script.attributeChangedCallback && script.attributeChangedCallback.call(this.__component__, attrName, oldVal, newVal);
  };

  return document.registerElement(name, { prototype: proto });
}
