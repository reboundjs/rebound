import { Path } from "rebound-data/rebound-data";

export default function tests(){
  QUnit.module("Matches", function() {

    QUnit.test("Basic Path Matches", function(assert){
      assert.expect(6);

      assert.ok(new Path('').matches(''), "Empty string");
      assert.ok(new Path('foo').matches('foo'), "Single path");
      assert.ok(new Path('foo.bar.baz').matches('foo.bar.baz'), "Multiple path");
      assert.ok(new Path('[#comments]').matches('[#comments]'), "Single escape");
      assert.ok(new Path('[1][#comments][2]').matches('[1][#comments][2]'), "Multiple escape");
      assert.ok(new Path('foo[1].bar[#comments].baz[2]').matches('foo[1].bar[#comments].baz[2]'), "Mixed segments and escapes");

    });

    QUnit.test("Namespaced Matches", function(assert){
      assert.expect(11);

      assert.ok(new Path('foo:bar').matches('foo:bar'), "Single namespace");
      assert.ok(new Path('foo:bar:baz').matches('foo:bar:baz'), "Multiple namespace");
      assert.ok(new Path('foo.bar:bar.baz:baz.foo').matches('foo.bar:bar.baz:baz.foo'), "Multiple multi-length namespace");

      assert.ok(new Path('[1]:[2]').matches('[1]:[2]'), "Single escaped namespace");
      assert.ok(new Path('[1]:[2]:[3]').matches('[1]:[2]:[3]'), "Multiple escaped namespace");
      assert.ok(new Path('foo[1]:bar.baz:[2].foo').matches('foo[1]:bar.baz:[2].foo'), "Multiple multi-length namespace");

      assert.notOk(new Path('foo.bar:bar.bazbaz.foo').matches('foo.bar:bar.baz:baz.foo'), "Missing namespace sep fails");
      assert.notOk(new Path('foo.bar:bar:baz.foo').matches('foo.bar:bar.baz:baz.foo'), "Missing path in namespace fails");
      assert.notOk(new Path('foo[1]:bar:baz.foo').matches('foo.bar:bar.baz:baz.foo'), "Missing escaped path in namespace  fails");

      assert.ok(new Path('namespace:foo[#comments]').matches('namespace:foo[#comments]'), "Namespaces with escape");
      assert.ok(new Path('namespace[1].bar:foo[#comments]').matches('namespace[1].bar:foo[#comments]'), "Namespaces with multiple escapes");

    });

    QUnit.test("@each Wildcard Path Matches", function(assert){
      assert.expect(18);

      assert.ok(new Path('@each').matches('foo'), "Single @each – left");
      assert.ok(new Path('foo').matches('@each'), "Single @each – right");
      assert.ok(new Path('@each').matches('@each'), "Single @each – both");

      assert.ok(new Path('@each.@each').matches('foo.bar'), "Multi @each – left");
      assert.ok(new Path('foo.bar').matches('@each.@each'), "Multi @each – right");
      assert.ok(new Path('@each.@each').matches('@each.@each'), "Multi @each – both");

      assert.ok(new Path('foo.@each.biz.@each').matches('foo.bar.biz.baz'), "Mixed @each – left");
      assert.ok(new Path('foo.bar.biz.baz').matches('foo.@each.biz.@each'), "Mixed @each – right");
      assert.ok(new Path('foo.bar.biz.@each').matches('foo.@each.biz.baz'), "Mixed @each – both");

      assert.notOk(new Path('foo.bar.biz.@each').matches('foo.bar.biz'), "Extend @each fails – left");
      assert.notOk(new Path('foo.bar.biz').matches('foo.bar.biz.@each'), "Extend @each fails – right");

      assert.ok(new Path('@each').matches('[1]'), "Single @each with escaped – left");
      assert.ok(new Path('[#comment]').matches('@each'), "Single @each with escaped – right");

      assert.ok(new Path('@each.@each').matches('[1][2]'), "Multi @each with escaped – left");
      assert.ok(new Path('[1][2]').matches('@each.@each'), "Multi @each with escaped – right");

      assert.ok(new Path('foo.@each.biz.@each').matches('foo[1].biz.baz'), "Mixed @each with escaped – left");
      assert.ok(new Path('foo.bar.biz[#comments]').matches('foo.@each.biz.@each'), "Mixed @each with escaped – right");
      assert.ok(new Path('foo[2].biz.@each').matches('foo.@each.biz[1]'), "Mixed @each with escaped – both");

    });

    QUnit.test("@each Wildcard Namespaced Matches", function(assert){
      assert.expect(10);

      assert.ok(new Path('@each:bar').matches('foo:bar'), "Single @each – left");
      assert.ok(new Path('foo:bar').matches('foo:@each'), "Single @each – right");
      assert.ok(new Path('@each:bar').matches('foo:@each'), "Single @each – both");

      assert.ok(new Path('@each.bar:biz.@each').matches('foo.bar:biz.baz'), "Multi @each – left");
      assert.ok(new Path('foo.bar:biz.baz').matches('@each.bar:biz.@each'), "Multi @each – right");
      assert.ok(new Path('zap.foo.@each:biz.baz.zip').matches('@each.foo.bar:@each.baz.@each'), "Multi @each – both");

      assert.ok(new Path('foo:@each:biz:@each').matches('foo:bar:biz:baz'), "Multiple namespaces – left");
      assert.ok(new Path('foo:bar:biz:baz').matches('foo:@each:biz:@each'), "Multiple namespaces – right");

      assert.notOk(new Path('foo.@each.bar').matches('foo:bar'), "@each does not match namespace seperator – left");
      assert.notOk(new Path('foo:bar').matches('foo.@each.bar'), "@each does not match namespace seperator – right");

    });

    QUnit.test("@all Wildcard Path Matches", function(assert){
      assert.expect(22);

      assert.ok(new Path('@all').matches(''), "Single @all and empty path – left");
      assert.ok(new Path('').matches('@all'), "Single @all and empty path – right");

      assert.ok(new Path('@all').matches('foo'), "Single @all and single path – left");
      assert.ok(new Path('foo').matches('@all'), "Single @all and single path – right");
      assert.ok(new Path('@all').matches('@all'), "Single @alls – both");


      assert.ok(new Path('@all').matches('foo.bar.baz'), "Single @all and multi path – left");
      assert.ok(new Path('foo.bar.baz').matches('@all'), "Single @all and multi path – right");


      assert.ok(new Path('foo.@all').matches('foo.bar.baz'), "Prefixed @all and multi path – left");
      assert.ok(new Path('foo.bar.baz').matches('foo.@all'), "Prefixed @all and multi path – right");
      assert.notOk(new Path('foo.@all').matches('biz.bar.baz'), "Invalid Prefixed @all and multi path fails – left");
      assert.notOk(new Path('biz.bar.baz').matches('foo.@all'), "Invalid Prefixed @all and multi path fails – right");
      assert.notOk(new Path('foo.bar.@all').matches('bar.bar.@all'), "Invalid Prefixed @alls and multi path fails – both");

      assert.ok(new Path('@all').matches('[1]'), "Single @all with escaped – left");
      assert.ok(new Path('[#comment]').matches('@all'), "Single @all with escaped – right");
      assert.ok(new Path('@all').matches('[1]'), "Single @all with escaped – left");
      assert.ok(new Path('[#comment]').matches('@all'), "Single @all with escaped – right");

      assert.ok(new Path('@all').matches('[1][2]'), " @all with multi escaped – left");
      assert.ok(new Path('[1][2]').matches('@all'), "@all with multi escaped – right");
      assert.notOk(new Path('[0].@all').matches('[1][2]'), " @all with multi escaped invalid prefix fails");
      assert.ok(new Path('foo[1].biz.@all').matches('foo[1].biz.baz[2]'), "@all Mixed with escaped – left");


      assert.ok(new Path('[1][2].@all').matches('[1][2]'), "@all extends one past end – left");
      assert.ok(new Path('foo.bar').matches('foo.bar.@all'), " @all extends one past end – right");

    });

    QUnit.test("@all Wildcard Path And Namespace Matches", function(assert){
      assert.expect(7);

      assert.notOk(new Path('foo:bar').matches('foo:bar:baz'), "Namespaces must fully match");
      assert.ok(new Path('@all:@all:@all').matches('foo.bar.baz:foo.bar:foo'), "@all matches full namespaces of assorted length");
      assert.notOk(new Path('foo:bar:@all').matches('foo:bar'), "@all wildcard does not count as a full namepsace – left");
      assert.notOk(new Path('foo:bar').matches('foo:bar:@all'), "@all wildcard does not count as a full namepsace – right");
      assert.notOk(new Path('@all').matches('foo:bar'), "@all does not cross namespace boundary");
      assert.ok(new Path('foo[:bar]').matches('@all'), "Escaped Namespaces do not break – left");
      assert.ok(new Path('@all').matches('foo[:bar]'), "Escaped Namespaces do not break – right");

    });

  });
}