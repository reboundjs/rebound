import { Path } from "rebound-data/rebound-data";

export default function tests(){
  QUnit.module("Push", function() {

    QUnit.test("Basic push", function(assert){
      assert.expect(5);

      assert.equal(new Path('').push('foo').toString(), "foo", "Single path segments");
      assert.equal(new Path('foo').push('bar', 'baz').toString(), "foo.bar.baz", "Multiple path segments");
      assert.equal(new Path('').push('1').toString(), "[1]", "Single invalid path segments");
      assert.equal(new Path('foo').push('1', '2', '3').toString(), "foo[1][2][3]", "Multiple invalid path segments");
      assert.equal(new Path('foo').push('2', 'bar', '3').toString(), "foo[2].bar[3]", "Mixed valid and invalid path segments");

    });

    QUnit.test("Empty path push", function(assert){
      assert.expect(2);

      assert.equal(new Path('').push().toString(), "", "Empty path arguments");
      assert.equal(new Path('foo').push().toString(), "foo", "Empty path arguments");

    });

    QUnit.test("Non-string push", function(assert){
      assert.expect(1);

      assert.equal(new Path('foo').push(undefined, 1, true).toString(), "foo.undefined[1].true", "Non-string path arguments are cast as strings");

    });

    QUnit.test("Mixed length path push", function(assert){
      assert.expect(2);

      assert.equal(new Path('').push('foo.bar', 'biz.baz', 'woot').toString(), "foo.bar.biz.baz.woot", "Mixed length paths are joined correctly");
      assert.equal(new Path('').push('foo[1]', '[2].baz', '[#comments]').toString(), "foo[1][2].baz[#comments]", "Mixed length paths are joined correctly with bracket notation");

    });

    QUnit.test("Push path auto-cleanup", function(assert){
      assert.expect(1);

      assert.equal(new Path('').push('1', '[foo]', 'bar.1.2').toString(), "[1].foo.bar[1][2]", "Incorrectly written paths are cleaned up");

    });

    QUnit.test("Pushing wildcard-like segments", function(assert){
      assert.expect(3);
      assert.equal(new Path('foo').push('@random').toString(), "foo[@random]", "Invalid wildcard values are escaped");
      assert.equal(new Path('foo').push('@all').toString(), "foo.@all", "Valid wildcard values are not escaped");
      assert.equal(new Path('foo').push( '@each').toString(), "foo.@each", "Valid wildcard values are not escaped");

    });


  });
}