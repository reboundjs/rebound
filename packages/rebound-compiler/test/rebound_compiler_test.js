/*jslint evil: true */

import compiler from 'rebound-compiler/compile';
import parse from 'rebound-compiler/parser';
import tokenizer from 'htmlbars/dist/cjs/simple-html-tokenizer';
import Model from 'rebound-data/model';

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


QUnit.test('Rebound Compiler - Partials', function() {

  var spec;

  spec = parse('<div class={{bar}}>{{foo}}</div>');

  equal(spec.isPartial, true, 'Compiler interperts plain HTMLBars strings as partials');



  spec = parse(`
    <link href="/foo/bar.html">
    <div class={{bar}}>{{foo}}</div>`);

  deepEqual(spec.deps, ['"foo/bar"'], 'Compiler can find a single dependancy from <link> tag inside partials');



  spec = parse(`
    <link href='/foo/bar.html'>
    <div class={{bar}}>{{foo}}</div>`);

  deepEqual(spec.deps, ['"foo/bar"'], 'Compiler can find a single dependancy from <link> tag inside partials using single quotes');



  spec = parse(`
    <link href=/foo/bar.html>
    <div class={{bar}}>{{foo}}</div>`);

  deepEqual(spec.deps, ['"foo/bar"'], 'Compiler can find a single dependancy from <link> tag inside partials using no quotes');



  spec = parse(`
    <link foo='bar' biz href="/foo/bar.html" abc="123">
    <div class={{bar}}>{{foo}}</div>`);

  deepEqual(spec.deps, ['"foo/bar"'], 'Compiler is tolerant to <link> tags having strange properties');



  spec = parse(`
    <link foo='bar' biz href="/foo/bar.html" abc="123">
    <div class={{bar}}>{{foo}}</div>
    <link href="/far/boo.html">`);

  deepEqual(spec.deps, ['"foo/bar"', '"far/boo"'], 'Compiler can find multiple dependancies throughout partials');
  equal(spec.template.trim(), '<div class={{bar}}>{{foo}}</div>', 'Compiler strips <link> tags from partials');



  spec = parse(`
    {{> foo/bar}}
    <div class={{bar}}>{{foo}}</div>`);

  deepEqual(spec.deps, ['"foo/bar"'], 'Compiler can find a single dependancy from partial handlebar tag inside partials');



  spec = parse(`
    {{> foo/bar}}
    <div class={{bar}}>{{foo}}</div>
    {{> far/boo}}`);

  deepEqual(spec.deps, ['"foo/bar"', '"far/boo"'], 'Compiler can find multiple dependancies throughout partials with partial syntax');



  var template = compiler.compile('<div class={{bar}}>{{foo}}</div>', {name:'test/partial'});
  var dom = template.render(new Model({foo:'bar', bar:'foo'}));
  equalTokens(dom.fragment.firstChild, '<div class="foo">bar</div>', 'Compiler accepts plain HTMLBars strings and returns working template');

  template = compiler.compile('{{partial "test/partial"}}', {name:'test'});
  var partial = template.render(new Model({foo:'bar', bar:'foo'}));
  // In PhantomJS, document fragments don't have a firstElementChild property
  equalTokens(partial.fragment.childNodes[1], '<div class="foo">bar</div>', 'Compiler registers partial for use in other templates');


});






QUnit.test('Rebound Compiler - Components', function() {
  var spec;

  spec = parse(`
    <element name="test-element">
      <template>
        <link href="/foo/bar.html">
        <div class={{bar}}>{{foo}}</div>
      </template>
      <script>
        return {
          foo: 'bar'
        }
      </script>
    </element>`);

  equal(spec.isPartial, false, 'Compiler interperts component templates as components');
  equal(spec.name, 'test-element', 'Compiler extracts name from element');
  deepEqual(spec.deps, ['"foo/bar"'], 'Compiler can find a single dependancy from <link> tag inside components');
  equal(spec.template.trim(), '<div class={{bar}}>{{foo}}</div>', 'Compiler strips <link> tags from partials');
  deepEqual(eval(spec.script), {foo: 'bar'}, 'Script inside of element evals properly');



  spec = parse(`
    <element prop='foo' name='test-element' bar>
      <template>
        <link href="/foo/bar.html">
        <div class={{bar}}>{{foo}}</div>
        <link href="/bar/foo.html">
        {{> far/boo}}
      </template>
      <script></script>
    </element>`);

  equal(spec.name, 'test-element', 'Compiler extracts name from element with single quotes');
  equal(spec.name, 'test-element', 'Compiler extracts name from element with other properties on the element tag');
  deepEqual(spec.deps, ['"foo/bar"', '"bar/foo"', '"far/boo"'], 'Compiler can find a multiple dependancies from both <link> tags and partials inside components');
  deepEqual(eval(spec.script), undefined, 'Empty script inside of element evals properly');



  spec = parse(`
    <element name="dummy-name" name=test-element>
      <template></template>
    </element>`);

  equal(spec.name, 'test-element', 'Compiler extracts name  from element with no quotes');
  equal(spec.name, 'test-element', 'Compiler extracts the last name property from element with single quotes');
  deepEqual(spec.template, '', 'Compiler works with empty template tag');
  deepEqual(eval(spec.script), undefined, 'No script inside of element evals properly');



  spec = parse(`<element name=test-element></element>`);

  deepEqual(spec.template, '', 'Compiler works with no template tag');


  var template = compiler.compile(`
    <element name="test-element">
      <template>
        <link href="/foo/bar.html">
        <div class={{bar}}>{{foo}}</div>
      </template>
      <script>
        return {
          foo: 'bar'
        }
      </script>
    </element>`);

  var el = document.createElement('test-element');

  equal(el.data.isComponent, true, 'Compiler registers new element for use');

});
