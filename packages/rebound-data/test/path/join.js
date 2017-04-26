import { Path } from "rebound-data/rebound-data";

export default function tests(){
  QUnit.module("Join", function() {

    QUnit.test("Basic path join", function(assert){
      assert.expect(5);

      assert.equal(Path.join('foo'), "foo", "Single path segments");
      assert.equal(Path.join('foo', 'bar', 'baz'), "foo.bar.baz", "Multiple path segments");
      assert.equal(Path.join('1'), "[1]", "Single invalid path segments");
      assert.equal(Path.join('1', '2', '3'), "[1][2][3]", "Multiple invalid path segments");
      assert.equal(Path.join('foo', '2', 'bar', '3'), "foo[2].bar[3]", "Mixed valid and invalid path segments");

    });

    QUnit.test("Empty path join", function(assert){
      assert.expect(1);

      assert.equal(Path.join(), "", "Empty path arguments");

    });

    QUnit.test("Non-string path join", function(assert){
      assert.expect(1);

      assert.equal(Path.join(undefined, 1, true), "undefined[1].true", "Non-string path arguments are cast as strings");

    });

    QUnit.test("Mixed length path join", function(assert){
      assert.expect(2);

      assert.equal(Path.join('foo.bar', 'biz.baz', 'woot'), "foo.bar.biz.baz.woot", "Mixed length paths are joined correctly");
      assert.equal(Path.join('foo[1]', '[2].baz', '[#comments]'), "foo[1][2].baz[#comments]", "Mixed length paths are joined correctly with bracket notation");

    });

    QUnit.test("Join path auto-cleanup", function(assert){
      assert.expect(1);

      assert.equal(Path.join('1', '[foo]', 'bar.1.2'), "[1].foo.bar[1][2]", "Incorrectly written paths are cleaned up");

    });


    QUnit.test("Segment literal wrapping", function(assert){
      assert.expect(30);

      assert.equal(Path.join('foo bar'), "[foo bar]", "Space");
      assert.equal(Path.join('foo  bar'), "[foo  bar]", "Tab");
      assert.equal(Path.join('foo!bar'), "[foo!bar]", "Exclaimation mark");
      assert.equal(Path.join('foo"bar'), '[foo"bar]', "Double quote");
      assert.equal(Path.join('foo#bar'), "[foo#bar]", "Pound");
      assert.equal(Path.join('foo%bar'), "[foo%bar]", "Percent");
      assert.equal(Path.join('foo&bar'), "[foo&bar]", "Ampersand");
      assert.equal(Path.join("foo'bar"), "[foo'bar]", "Single quote");
      assert.equal(Path.join('foo(bar'), "[foo(bar]", "Open parens");
      assert.equal(Path.join('foo)bar'), "[foo)bar]", "Close parens");
      assert.equal(Path.join('foo*bar'), "[foo*bar]", "Star");
      assert.equal(Path.join('foo+bar'), "[foo+bar]", "Plus");
      assert.equal(Path.join('foo,bar'), "[foo,bar]", "Comma");
      assert.equal(Path.join('foo.bar'), "foo.bar", "Period");
      assert.equal(Path.join('foo/bar'), "[foo/bar]", "Back slash");
      assert.equal(Path.join('foo;bar'), "[foo;bar]", "Semicolin");
      assert.equal(Path.join('foo<bar'), "[foo<bar]", "Less than");
      assert.equal(Path.join('foo=bar'), "[foo=bar]", "Equals");
      assert.equal(Path.join('foo>bar'), "[foo>bar]", "Greater than");
      assert.equal(Path.join('foo@bar'), "[foo@bar]", "At-sign");
      assert.equal(Path.join('foo[bar'), "foo.bar", "Open bracket");
      assert.equal(Path.join('foo[ba#r'), "foo[ba#r]", "Open bracket with needed escape");
      assert.equal(Path.join('foo]bar'), "foo.bar", "Close bracket is removed when expected to sanatize");
      assert.equal(Path.join('foo\\bar'), "[foo\\bar]", "Forward slash");
      assert.equal(Path.join('foo^bar'), "[foo^bar]", "Carrot");
      assert.equal(Path.join('foo`bar'), "[foo`bar]", "Tick mark");
      assert.equal(Path.join('foo{bar'), "[foo{bar]", "Open curly");
      assert.equal(Path.join('foo|bar'), "[foo|bar]", "Bar");
      assert.equal(Path.join('foo}bar'), "[foo}bar]", "Close curly");
      assert.equal(Path.join('foo~bar'), "[foo~bar]", "Tilde");

    });


    QUnit.test("Joining wildcard-like segments", function(assert){
      assert.expect(3);
      assert.equal(Path.join('foo', '@random'), "foo[@random]", "Invalid wildcard values are escaped");
      assert.equal(Path.join('foo', '@all'), "foo.@all", "Valid wildcard values are not escaped");
      assert.equal(Path.join('foo', '@each'), "foo.@each", "Valid wildcard values are not escaped");

    });


  });
}