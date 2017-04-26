import { Path } from "rebound-data/rebound-data";

export default function tests(){
  QUnit.module("ToString", function() {

    QUnit.test("Basic toString", function(assert){
      assert.expect(5);

      assert.equal(new Path('foo').toString(), 'foo', "Single segment");
      assert.equal(new Path('foo.bar.baz').toString(), 'foo.bar.baz', "Many segments");
      assert.equal(new Path('foo[#comments].baz').toString(), 'foo[#comments].baz', "With escaped segments");
      assert.equal(new Path('event.type:foo[#comments].baz').toString(), 'event.type:foo[#comments].baz', "With namespaces and escaped segments");
      assert.equal(new Path('event[@each].type:foo[#comments].@all.baz').toString(), 'event[@each].type:foo[#comments].@all.baz', "With namespaces and escaped segments and wildcards");

    });


    QUnit.test("ToString with wildcards", function(assert){
      assert.expect(5);

      assert.equal(new Path('@all').toString(), '@all', "Single segment");
      assert.equal(new Path('foo.@each.baz').toString(), 'foo.@each.baz', "Many segments");
      assert.equal(new Path('foo[@all].baz').toString(), 'foo[@all].baz', "Escaped wildcard still escaped");
      assert.equal(new Path('event.type:@each').toString(), 'event.type:@each', "After namespace");
      assert.notOk(new Path('event[@foo].type:foo.@wat.@all.baz').isValid(), "Invalid wildcards fail");

    });

  });
}