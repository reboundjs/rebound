import { Path } from "rebound-data/rebound-data";

export default function tests(){
  QUnit.module("Unshift", function() {

    QUnit.test("Basic unshift", function(assert){
      assert.expect(5);

      assert.equal(new Path('').unshift('foo').toString(), "foo", "Single path segments");
      assert.equal(new Path('foo').unshift('bar', 'baz').toString(), "bar.baz.foo", "Multiple path segments");
      assert.equal(new Path('').unshift('1').toString(), "[1]", "Single invalid path segments");
      assert.equal(new Path('foo').unshift('1', '2', '3').toString(), "[1][2][3].foo", "Multiple invalid path segments");
      assert.equal(new Path('foo').unshift('2', 'bar', '3').toString(), "[2].bar[3].foo", "Mixed valid and invalid path segments");

    });

    QUnit.test("Empty path unshift", function(assert){
      assert.expect(2);

      assert.equal(new Path('').unshift().toString(), "", "Empty path arguments");
      assert.equal(new Path('foo').unshift().toString(), "foo", "Empty path arguments");

    });

    QUnit.test("Non-string unshift", function(assert){
      assert.expect(1);

      assert.equal(new Path('foo').unshift(undefined, 1, true).toString(), "undefined[1].true.foo", "Non-string path arguments are cast as strings");

    });

    QUnit.test("Mixed length path unshift", function(assert){
      assert.expect(2);

      assert.equal(new Path('').unshift('foo.bar', 'biz.baz', 'woot').toString(), "foo.bar.biz.baz.woot", "Mixed length paths are joined correctly");
      assert.equal(new Path('').unshift('foo[1]', '[2].baz', '[#comments]').toString(), "foo[1][2].baz[#comments]", "Mixed length paths are joined correctly with bracket notation");

    });

    QUnit.test("Unshift path auto-cleanup", function(assert){
      assert.expect(1);

      assert.equal(new Path('').unshift('1', '[foo]', 'bar.1.2').toString(), "[1].foo.bar[1][2]", "Incorrectly written paths are cleaned up");

    });

    QUnit.test("Unshift wildcard-like segments", function(assert){
      assert.expect(3);
      assert.equal(new Path('foo').unshift('@random').toString(), "[@random].foo", "Invalid wildcard values are escaped");
      assert.equal(new Path('foo').unshift('@all').toString(), "@all.foo", "Valid wildcard values are not escaped");
      assert.equal(new Path('foo').unshift( '@each').toString(), "@each.foo", "Valid wildcard values are not escaped");

    });


  });
}