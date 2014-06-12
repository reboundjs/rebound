define("htmlbars-runtime/hooks", 
  ["./utils","handlebars/safe-string","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    "use strict";
    var merge = __dependency1__.merge;
    var SafeString = __dependency2__["default"];

    function content(morph, helperName, context, params, options) {
      var value, helper = this.lookupHelper(helperName, context, options);
      if (helper) {
        value = helper(context, params, options);
      } else {
        value = this.simple(context, helperName, options);
      }
      if (!options.escaped) {
        value = new SafeString(value);
      }
      morph.update(value);
    }

    __exports__.content = content;function webComponent(morph, tagName, context, options, helpers) {
      var value, helper = this.lookupHelper(tagName, context, options);
      if (helper) {
        value = helper(context, null, options, helpers);
      } else {
        value = this.webComponentFallback(morph, tagName, context, options, helpers);
      }
      morph.update(value);
    }

    __exports__.webComponent = webComponent;function webComponentFallback(morph, tagName, context, options, helpers) {
      var element = morph.parent().ownerDocument.createElement(tagName);
      var hash = options.hash, hashTypes = options.hashTypes;

      for (var name in hash) {
        if (hashTypes[name] === 'id') {
          element.setAttribute(name, this.simple(context, hash[name], options));
        } else {
          element.setAttribute(name, hash[name]);
        }
      }
      element.appendChild(options.render(context, { hooks: this, helpers: helpers }));
      return element;
    }

    __exports__.webComponentFallback = webComponentFallback;function element(domElement, helperName, context, params, options) {
      var helper = this.lookupHelper(helperName, context, options);
      if (helper) {
        options.element = domElement;
        helper(context, params, options);
      }
    }

    __exports__.element = element;function attribute(context, params, options) {
      options.element.setAttribute(params[0], params[1]);
    }

    __exports__.attribute = attribute;function concat(context, params, options) {
      var value = "";
      for (var i = 0, l = params.length; i < l; i++) {
        if (options.types[i] === 'id') {
          value += this.simple(context, params[i], options);
        } else {
          value += params[i];
        }
      }
      return value;
    }

    __exports__.concat = concat;function subexpr(helperName, context, params, options) {
      var helper = this.lookupHelper(helperName, context, options);
      if (helper) {
        return helper(context, params, options);
      } else {
        return this.simple(context, helperName, options);
      }
    }

    __exports__.subexpr = subexpr;function lookupHelper(helperName, context, options) {
      if (helperName === 'attribute') {
        return this.attribute;
      } else if (helperName === 'concat') {
        return this.concat;
      }
    }

    __exports__.lookupHelper = lookupHelper;function simple(context, name, options) {
      return context[name];
    }

    __exports__.simple = simple;function hydrationHooks(extensions) {
      var base = {
        content: content,
        webComponent: webComponent,
        webComponentFallback: webComponentFallback,
        element: element,
        attribute: attribute,
        concat: concat,
        subexpr: subexpr,
        lookupHelper: lookupHelper,
        simple: simple
      };

      return extensions ? merge(extensions, base) : base;
    }

    __exports__.hydrationHooks = hydrationHooks;
  });