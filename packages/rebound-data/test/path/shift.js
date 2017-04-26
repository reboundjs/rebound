import { Path } from "rebound-data/rebound-data";

export default function tests(){
  QUnit.module("Shift", function() {

    QUnit.test("Shift tests", function(assert){
      assert.expect(12);

      assert.equal(new Path('').shift(), '', 'No parts');
      assert.equal(new Path('foo').shift(), "foo", 'Single part');
      assert.equal(new Path('foo.bar').shift(), "foo", "Multiple parts");
      assert.equal(new Path('[#comments].foo').shift(), "#comments", "Escaped shift parts");
      assert.equal(new Path('foo[#comments].bar').shift(), "foo", "Path with escaped parts");
      assert.equal(new Path('foo.@each.bar').shift(), "foo", "Path with wildcards parts");
      assert.equal(new Path('@each.foo.@each.bar.@all').shift(), "@each", "Path with shift wildcards part");
      assert.equal(new Path('foo.bar:biz.baz').shift(), "foo", "With namespace seperator");

      var path = new Path('foo.bar.biz.baz');
      path.shift();
      path.shift();
      assert.equal(path.shift(), "biz", "Subsiquent calls to shift do mutate the path");

      path = new Path('foo[#comments].biz.baz');
      path.shift();
      assert.equal(path.toString(), '[#comments].biz.baz', "Good format is maintained after shift mutation");
      path.shift();
      assert.equal(path.toString(), 'biz.baz', "Good format is maintained after shift mutation");

      assert.equal(Path.shift('foo.bar.baz'), "foo", "Static function format");

    });

  });
}