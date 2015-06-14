import Component from 'rebound-component/component';
import tokenizer from 'simple-html-tokenizer';
import compiler from 'rebound-compiler/compile';
import reboundData from 'rebound-data/rebound-data';

var Model = window.Rebound.Model = reboundData.Model,
    Collection =  window.Rebound.Collection = reboundData.Collection;

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

QUnit.test('Rebound Components', function() {

  var component = compiler.compile(`
        <element name="test-component">
          <template><div><content><div></div></content></div></template>
          <script>
            return {
              createdCallback: function(){
                window.created = true;
                equal(this.el.innerHTML, '<div><content><div></div></content></div>', 'Created callback is called after template and content is placed in outlet');
                equal(this.el.parentNode, null, 'Created callback in called before this.el has been added to the dom tree')
                equal(this.el.tagName, 'TEST-COMPONENT', 'Scope of created callback has the outlet in this.el');
              },
              attachedCallback: function(){
                window.attached = true;
                equal(this.el.innerHTML, '<div><content><div></div></content></div>', 'Created callback is called after template and content is placed in outlet');
                equal(this.el.parentNode, window.el, 'Attached callback in called after this.el has been added to the dom tree and has a referance to its parent')
                equal(typeof this.$el, 'object', 'this.$el has a jQuery wrapped node if jQuery is present on the page')
                equal(this.$('div')[0], this.el.firstElementChild, 'this.$ does a jQuery lookup in the scope of the component, if jQuery is on the page')
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
            }
          </script>
        </element>
      `);

      console.log(component)

  window.el = document.createElement('div');

  document.body.appendChild(el);
  window.attached = false;
console.log('CREATING');
  var c1 = document.createElement('test-component');
  console.log('MADE', c1)
  console.log('created:', c1)
  equal(typeof c1.data.cid, 'string', 'Component saves a referance to itself on its contextual element as el.data');
  equal(c1.data.method(), 1, 'Plain functions passed to Component.extend are attached as methods to the Component object');
  equal(c1.innerHTML, '<div><content><div></div></content></div>', 'Component places rendered template inside of outlet, with content');


  // el.appendChild(c1);
  // stop();
  // setTimeout(function(){
  //   start();
  //   equal(window.created, true, 'Created callback is called when component is created in memory');
  //   equal(window.attached, true, 'Attached callback is called when component is added to the dom tree');
  // }, 0);
  //
  // deepEqual(c1.data.toJSON(), {
  //   bool: true,
  //   int: 1,
  //   arr: [{a:1, b:2, c:3}],
  //   obj: {d:4, e:5, f:6},
  //   compProp: 1
  // }, 'Non-callback and method properties passed into the component prototype are set as default properties');

  // template = compiler.compile("<element name='rebound-demo'><template>asdf</template></element><script>return ({test: 'woo'});</script>");

});



// Components pass default settings to child models and are reset propery on reset()