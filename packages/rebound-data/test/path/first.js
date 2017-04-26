import { Path } from "rebound-data/rebound-data";

export default function tests(){
  QUnit.module("First", function() {

    QUnit.test("First tests", function(assert){
      assert.expect(10);

      assert.equal(new Path('').first(), '', 'No parts');
      assert.equal(new Path('foo').first(), "foo", 'Single part');
      assert.equal(new Path('foo.bar').first(), "foo", "Multiple parts");
      assert.equal(new Path('[#comments].foo').first(), "#comments", "Escaped first parts");
      assert.equal(new Path('foo[#comments].bar').first(), "foo", "Path with escaped parts");
      assert.equal(new Path('foo.@each.bar').first(), "foo", "Path with wildcards parts");
      assert.equal(new Path('@each.foo.@each.bar.@all').first(), "@each", "Path with first wildcards part");
      assert.equal(new Path('foo.bar:biz.baz').first(), "foo", "With namespace seperator");
      var path = new Path('foo.bar.biz.baz');
      path.first();
      path.first();
      assert.equal(path.first(), "foo", "Subsiquent calls to first do not mutate the path");
      assert.equal(Path.first('foo.bar.baz'), "foo", "Static function format");

    });

  });
}