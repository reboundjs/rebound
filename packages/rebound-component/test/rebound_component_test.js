require(['rebound-component/component', 'simple-html-tokenizer', 'rebound-compiler/rebound-compiler'], function(Component, tokenizer, compiler){

    function equalTokens(fragment, html, message) {
      var div = document.createElement("div");

      div.appendChild(fragment.cloneNode(true));

      var fragTokens = tokenizer.tokenize(div.innerHTML);
      var htmlTokens = tokenizer.tokenize(html);

      function normalizeTokens(token) {
        if (token.type === 'StartTag') {
          token.attributes = token.attributes.sort(function(a,b){
            if (a.name > b.name) {
              return 1;
            }
            if (a.name < b.name) {
              return -1;
            }
            return 0;
          });
        }
      }

      fragTokens.forEach(normalizeTokens);
      htmlTokens.forEach(normalizeTokens);

      deepEqual(fragTokens, htmlTokens, message);
    }

    var template = (function() { return { isHTMLBars: true, cachedFragment: null, build: function build(dom) { var el0 = dom.createElement("div"); return el0; }, render: function render(context, env, contextualElement) { var dom = env.dom; dom.detectNamespace(contextualElement); if (this.cachedFragment === null) { this.cachedFragment = this.build(dom); } var fragment = dom.cloneNode(this.cachedFragment, true); return fragment; } }; }());

    QUnit.test('Rebound Components', function() {

      var component, el = document.createElement('div'), c1;

      document.body.appendChild(el);
      window.attached = false;


      component = Component.register('test-component', {
        prototype: {
          createdCallback: function(){
            window.created = true;
            equal(this.el.innerHTML, '<div></div>', 'Created callback is called after template is placed in outlet');
            equal(this.el.parentNode, null, 'Created callback in called before this.el has been added to the dom tree')
            equal(this.el.tagName, 'TEST-COMPONENT', 'Scope of created callback has the outlet in this.el');
          },
          attachedCallback: function(){
            window.attached = true;
            equal(this.el.innerHTML, '<div></div>', 'Created callback is called after template is placed in outlet');
            equal(this.el.parentNode, el, 'Attached callback in called after this.el has been added to the dom tree and has a referance to its parent')
            equal(typeof this.$el, 'object', 'this.$el has a jQuery wrapped node if jQuery is present on the page')
            equal(this.$('div')[0], this.el.firstChild, 'this.$ does a jQuery lookup in the scope of the component, if jQuery is on the page')
          },
          bool: true,
          int: 1,
          arr: [{a:1, b:2, c:3}],
          obj: {d:4, e:5, f:6},
          get compProp(){
            return 1;
          },
          method: function(event){
            return 1;
          }
        },
        template: template
      });

      c1 = document.createElement('test-component');
      equal(typeof c1.data.cid, 'string', 'Component saves a referance to itself on its contextual element as el.data');
      equal(c1.data.method(), 1, 'Plain functions passed to Component.extend are attached as methods to the Component object');
      equal(c1.innerHTML, '<div></div>', 'Component places rendered template inside of outlet');


      el.appendChild(c1);
      stop();
      setTimeout(function(){
        start();
        equal(window.created, true, 'Created callback is called when component is created in memory');
        equal(window.attached, true, 'Attached callback is called when component is added to the dom tree');
      }, 0);

      deepEqual(c1.data.toJSON(), {
        bool: true,
        int: 1,
        arr: [{a:1, b:2, c:3}],
        obj: {d:4, e:5, f:6},
        compProp: 1
      }, 'Non-callback and method properties passed into the component prototype are set as default properties');

      // template = compiler.compile("<element name='rebound-demo'><template>asdf</template></element><script>return ({test: 'woo'});</script>");

    });


});


// Components pass default settings to child models and are reset propery on reset()