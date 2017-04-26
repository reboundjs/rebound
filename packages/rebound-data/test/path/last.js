import { Path } from "rebound-data/rebound-data";

export default function tests(){
  QUnit.module("Last", function() {

    QUnit.test("Last tests", function(assert){
      assert.expect(10);

      assert.equal(new Path('').last(), '', 'No parts');
      assert.equal(new Path('foo').last(), "foo", 'Single part');
      assert.equal(new Path('foo.bar').last(), "bar", "Multiple parts");
      assert.equal(new Path('foo[#comments]').last(), "#comments", "Escaped last parts");
      assert.equal(new Path('foo[#comments].bar').last(), "bar", "Path with escaped parts");
      assert.equal(new Path('foo.@each.bar').last(), "bar", "Path with wildcards parts");
      assert.equal(new Path('foo.@each.bar.@all').last(), "@all", "Path with last wildcards part");
      assert.equal(new Path('foo.bar:biz.baz').last(), "baz", "With namespace seperator");
      var path = new Path('foo.bar.biz.baz');
      path.last();
      path.last();
      assert.equal(path.last(), "baz", "Subsiquent calls to first do not mutate the path");
      assert.equal(Path.last('foo.bar.baz'), "baz", "Static function format");

    });

  });
}