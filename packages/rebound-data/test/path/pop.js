import { Path } from "rebound-data/rebound-data";

export default function tests(){
  QUnit.module("Pop", function() {

    QUnit.test("Pop tests", function(assert){
      assert.expect(12);

      assert.equal(new Path('').pop(), '', 'No parts');
      assert.equal(new Path('foo').pop(), "foo", 'Single part');
      assert.equal(new Path('foo.bar').pop(), "bar", "Multiple parts");
      assert.equal(new Path('foo[#comments]').pop(), "#comments", "Escaped pop parts");
      assert.equal(new Path('foo[#comments].bar').pop(), "bar", "Path with escaped parts");
      assert.equal(new Path('foo.@each.bar').pop(), "bar", "Path with wildcards parts");
      assert.equal(new Path('@each.foo.@each.bar.@all').pop(), "@all", "Path with pop wildcards part");
      assert.equal(new Path('foo.bar:biz.baz').pop(), "baz", "With namespace seperator");

      var path = new Path('foo.bar.biz.baz');
      path.pop();
      path.pop();
      assert.equal(path.pop(), "bar", "Subsiquent calls to pop do mutate the path");

      path = new Path('foo.bar[#comments].biz');
      path.pop();
      assert.equal(path.toString(), 'foo.bar[#comments]', "Good format is maintained after pop mutation");
      path.pop();
      assert.equal(path.toString(), 'foo.bar', "Good format is maintained after pop mutation");

      assert.equal(Path.pop('foo.bar.baz'), "baz", "Static function format");

    });

  });
}