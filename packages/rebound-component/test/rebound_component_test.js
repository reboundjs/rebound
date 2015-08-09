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
          <template><div><content>Default Content</content></div></template>
          <script>
            return {
              createdCallback: function(){
                window.created = true;
                equal(this.el.firstChild.tagName, 'DIV', 'Created callback is called after template and content is placed in outlet');
                equal(this.el.parentNode, null, 'Created callback in called before this.el has been added to the dom tree')
                equal(this.el.tagName, 'TEST-COMPONENT', 'Scope of created callback has the outlet in this.el');
              },
              attachedCallback: function(){
                window.attached = true;
                equal(this.el.firstChild.tagName, 'DIV', 'Created callback is called after template and content is placed in outlet');
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

  window.el = document.createElement('div');
  document.body.appendChild(el);
  window.attached = false;
  var c1 = document.createElement('test-component');
  equal(c1.data.isComponent, true, 'Components can be created from document.createElement');
  equal(typeof c1.data.cid, 'string', 'Component saves a referance to itself on its contextual element as el.data');
  equal(c1.data.method(), 1, 'Plain functions passed to Component.extend are attached as methods to the Component object');
  equal(c1.innerHTML, '<div><content>Default Content</content></div>', 'Component places rendered template inside of outlet, with default content');

  var template = compiler.compile(`<test-component foo="bar" biz={{baz}}>Test Content</test-component>`, {name: 'component-test'});
  var data = new Model({baz: 'baz'})
  var partial = template.render(data);
  var c2 = partial.fragment.childNodes[1];
  equal(c2.data.isComponent, true, 'Components can be created from other HTMLBars templates');
  equal(c2.data.get('foo'), 'bar', 'Components can receive properties as plain strings');
  equal(c2.data.get('biz'), 'baz', 'Components can receive properties as handlebars');
  equal(c2.innerHTML, '<div><content>Test Content</content></div>', 'Component places rendered template inside of outlet, with supplied content');


  var template = compiler.compile(`{{#each arr as |obj|}}<test-component val={{obj}}>Test Content</test-component>{{/each}}`, {name: 'component-each-test'});
  var data = new Model({arr: [{val: 0}, {val: 1}, {val: 2}]});
  var partial = template.render(data);
  var c3 = partial.fragment.querySelectorAll('test-component')[0];
  equal(c3.data.isComponent, true, 'Components can be created inside block helpers');
  deepEqual(c3.data.get('val').toJSON(), data.get('arr[0]').toJSON(), 'Components can receive locally defined objects inside block helpers');
  c3.data.set('val.val', 'baz');
  QUnit.stop();
  setTimeout(function(){
    QUnit.start();
    equal(data.get('arr[0].val'), 'baz', 'Components can modify local scope objects passed in via a block helper and the results are databound to the original object.');
  }, 10);
});

// Components pass default settings to child models and are reset propery on reset()
