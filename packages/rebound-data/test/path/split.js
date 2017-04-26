import { Path } from "rebound-data/rebound-data";

export default function tests(){
  QUnit.module("Split", function() {

    QUnit.test("Split tests", function(assert){
      assert.expect(9);

      assert.deepEqual(new Path('').split(), [], "Empty path");
      assert.deepEqual(new Path('foo').split(), ['foo'], "Single segment");
      assert.deepEqual(new Path('foo.bar.baz').split(), ['foo', 'bar', 'baz'], "Multiple segments");
      assert.deepEqual(new Path('foo[#comments].baz').split(), ['foo', '#comments', 'baz'], "Escaped segments");
      assert.deepEqual(new Path('[1][2][3]').split(), ['1', '2', '3'], "Multiple escaped segments");
      assert.deepEqual(new Path('foo.@each.baz').split(), ['foo', '@each', 'baz'], "Wildcard segments");
      assert.deepEqual(new Path('event:foo.@each.baz').split(), ['event', ':', 'foo', '@each', 'baz'], "Namespaced segments");

      assert.deepEqual(Path.split('foo.bar.baz'), ['foo', 'bar', 'baz'], "Static format");
      assert.deepEqual(Path.split('1234', {sanatize: true}), ['1234'], "Number only");


    });

  });
}