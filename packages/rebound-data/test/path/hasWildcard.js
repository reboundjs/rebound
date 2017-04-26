import { Path } from "rebound-data/rebound-data";

export default function tests(){
  QUnit.module("HasWildcard", function() {

    QUnit.test("Valid selectors with wildcard returns true.", function(assert){
      assert.expect(6);
      assert.ok(new Path('foo.bar.@all').hasWildcard(), 'At end');
      assert.ok(new Path('foo.bar[10].@all').hasWildcard(), 'At end with brackets');
      assert.ok(new Path('foo.bar.@all.baz').hasWildcard(), 'In middle');
      assert.ok(new Path('foo.@each[bar]').hasWildcard(), 'In middle with brackets');
      assert.ok(new Path('@each.foo.bar').hasWildcard(), 'At begining');
      assert.ok(new Path('@all.foo[asdf].bar').hasWildcard(), 'At beginning with brackets');

    });

    QUnit.test("Returns false when inside brackets", function(assert){
      assert.expect(6);
      assert.notOk(new Path('foo.bar[@all]').hasWildcard(), 'At end');
      assert.notOk(new Path('foo.bar[10][@all]').hasWildcard(), 'At end with brackets');
      assert.notOk(new Path('foo.bar[@all].baz').hasWildcard(), 'In middle');
      assert.notOk(new Path('foo[@each][bar]').hasWildcard(), 'In middle with brackets');
      assert.notOk(new Path('[@each].foo.bar').hasWildcard(), 'At begining');
      assert.notOk(new Path('[@all].foo[asdf].bar').hasWildcard(), 'At beginning with brackets');
    });

    QUnit.test("Invalid wildcards return false.", function(assert){
      assert.expect(3);
      assert.notOk(new Path('foo.@invalid.bar').hasWildcard(), 'Invalid name with periods');
      assert.notOk(new Path('foo[bar].@nope').hasWildcard(), 'Following brackets');
      assert.notOk(new Path('foo.@illigal[bar].biz').hasWildcard(), 'Before brackets');
    });

    QUnit.test("Valid selectors without wildcard returns false.", function(assert){
      assert.expect(2);
      assert.notOk(new Path('foo.bar').hasWildcard(), 'Double periods');
      assert.notOk(new Path('foo[bar]').hasWildcard(), 'Leading period');
    });

    QUnit.test("Invalid paths containing wildcards return false", function(assert){
      assert.expect(4);
      assert.notOk(new Path('foo..bar.@each').hasWildcard(), 'Double periods');
      assert.notOk(new Path('.foo.@all').hasWildcard(), 'Leading period');
      assert.notOk(new Path('@each.foo.bar.').hasWildcard(), 'Trailing period');
      assert.notOk(new Path('foo.@each[asdf]fdsa].bar.').hasWildcard(), 'Stray close bracket');
    });

    QUnit.test("Non-string values return false", function(assert){
      assert.expect(4);
      assert.notOk(new Path(true).hasWildcard(), 'Bool');
      assert.notOk(new Path({}).hasWildcard(), 'Object');
      assert.notOk(new Path(100).hasWildcard(), 'Number');
      assert.notOk(new Path(undefined).hasWildcard(), 'Undefined');
    });

    QUnit.test("With namespaces", function(assert){
      assert.expect(3);
      assert.ok(new Path('foo.bar:@all').hasWildcard(), 'Directly after namespace');
      assert.ok(new Path('foo.bar:@all:bar').hasWildcard(), 'Bookended after namespace');
      assert.ok(new Path('foo.bar:bar.@each.foo:bar').hasWildcard(), 'Inside of namespace');

    });

    QUnit.test("Static method format works", function(assert){
      assert.expect(1);
      assert.ok(Path.hasWildcard('foo.bar.@all'), 'Executes');
    });

  });
}