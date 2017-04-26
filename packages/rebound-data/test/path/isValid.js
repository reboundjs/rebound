import { Path } from "rebound-data/rebound-data";

export default function tests(){
  QUnit.module("IsValid", function() {

    QUnit.test("Single characters parts", function(assert){
      assert.expect(29);

      assert.notOk(new Path(' ').isValid(), "Space");
      assert.notOk(new Path('  ').isValid(), "Tab");
      assert.notOk(new Path('!').isValid(), "Exclaimation mark");
      assert.notOk(new Path('"').isValid(), "Double quote");
      assert.notOk(new Path('#').isValid(), "Pound");
      assert.notOk(new Path('%').isValid(), "Percent");
      assert.notOk(new Path('&').isValid(), "Ampersand");
      assert.notOk(new Path("'").isValid(), "Single quote");
      assert.notOk(new Path('(').isValid(), "Open parens");
      assert.notOk(new Path(')').isValid(), "Close parens");
      assert.notOk(new Path('*').isValid(), "Star");
      assert.notOk(new Path('+').isValid(), "Plus");
      assert.notOk(new Path(',').isValid(), "Comma");
      assert.ok(new Path('.').isValid(), "Period"); // period only is a valid path, representing `this`
      assert.notOk(new Path('/').isValid(), "Back slash");
      assert.notOk(new Path(';').isValid(), "Semicolin");
      assert.notOk(new Path('<').isValid(), "Less than");
      assert.notOk(new Path('=').isValid(), "Equals");
      assert.notOk(new Path('>').isValid(), "Greater than");
      assert.notOk(new Path('@').isValid(), "At-sign");
      assert.notOk(new Path('[').isValid(), "Open bracket");
      assert.notOk(new Path(']').isValid(), "Close bracket");
      assert.notOk(new Path('\\').isValid(), "Forward slash");
      assert.notOk(new Path('^').isValid(), "Carrot");
      assert.notOk(new Path('`').isValid(), "Tick mark");
      assert.notOk(new Path('{').isValid(), "Open curly");
      assert.notOk(new Path('|').isValid(), "Bar");
      assert.notOk(new Path('}').isValid(), "Close curly");
      assert.notOk(new Path('~').isValid(), "Tilde");

    });

    QUnit.test("Single digit numbers", function(assert){
      assert.expect(10);

      assert.notOk(new Path('0').isValid(), "Zero");
      assert.notOk(new Path('1').isValid(), "One");
      assert.notOk(new Path('2').isValid(), "Two");
      assert.notOk(new Path('3').isValid(), "Three");
      assert.notOk(new Path('4').isValid(), "Four");
      assert.notOk(new Path('5').isValid(), "Five");
      assert.notOk(new Path('6').isValid(), "Six");
      assert.notOk(new Path('7').isValid(), "Seven");
      assert.notOk(new Path('8').isValid(), "Eight");
      assert.notOk(new Path('9').isValid(), "Nine");
    });

    QUnit.test("Multi-digit numbers", function(assert){
      assert.expect(2);

      assert.notOk(new Path('02').isValid(), "Two Digit leading");
      assert.notOk(new Path('123').isValid(), "Three Digit leading");
    });

    QUnit.test("Non-leading numbers pass", function(assert){
      assert.expect(2);

      assert.ok(new Path('foo02').isValid(), "Two Digit non leading");
      assert.ok(new Path('bar123').isValid(), "Three Digit non leading");
    });


    QUnit.test("Embedded leading numbers fail", function(assert){
      assert.expect(2);

      assert.notOk(new Path('foo.123').isValid(), "After period");
      assert.notOk(new Path('foo[123].456').isValid(), "After bracket");
    });


    QUnit.test("Escaped leading numbers pass", function(assert){
      assert.expect(2);
      assert.ok(new Path('foo[123]').isValid(), "After period");
      assert.ok(new Path('foo[123][456]').isValid(), "After bracket");
    });


    QUnit.test("Multiple parts, some unescaped", function(assert){
      assert.expect(1);
      assert.notOk(new Path('foo.#.bar').isValid(), 'Illigal part in path');
    });

    QUnit.test("Multiple parts, some escaped", function(assert){
      assert.expect(3);
      assert.ok(new Path('foo[#].bar').isValid(), 'Illigal part wrapped in path');
      assert.ok(new Path('foo[asdf[fdsa].bar').isValid(), 'Double open bracket');
      assert.ok(new Path('foo[as:d]f[fdsa].bar').isValid(), 'Colin in escaped path');
    });

    QUnit.test("Invalid seperators", function(assert){
      assert.expect(4);
      assert.notOk(new Path('foo..bar').isValid(), 'Double periods');
      assert.notOk(new Path('.foo.bar').isValid(), 'Leading period');
      assert.notOk(new Path('foo.bar.').isValid(), 'Trailing period');
      assert.notOk(new Path('foo[asdf]fdsa].bar.').isValid(), 'Stray close bracket');

    });

    QUnit.test("Valid selectors with wildcard returns true.", function(assert){
      assert.expect(8);
      assert.ok(new Path('foo.bar.@all').isValid(), 'At end');
      assert.ok(new Path('foo.bar[10].@all').isValid(), 'At end with brackets');
      assert.ok(new Path('foo.bar.@all.baz').isValid(), 'In middle');
      assert.ok(new Path('foo.@each[bar]').isValid(), 'In middle with brackets');
      assert.ok(new Path('@each.foo.bar').isValid(), 'At begining');
      assert.ok(new Path('@all.foo[asdf].bar').isValid(), 'At beginning with brackets');
      assert.ok(new Path('@all').isValid(), 'Wildcard alone – @all');
      assert.ok(new Path('@each').isValid(), 'Wildcard alone – @each');
    });

    QUnit.test("Non-string values return false", function(assert){
      assert.expect(4);
      assert.notOk(new Path(true).isValid(), 'Bool');
      assert.notOk(new Path({}).isValid(), 'Object');
      assert.notOk(new Path(100).isValid(), 'Number');
      assert.notOk(new Path(undefined).isValid(), 'Undefined');
    });

    QUnit.test("Invalid wildcards return false.", function(assert){
      assert.expect(3);
      assert.notOk(new Path('foo.@invalid.bar').isValid(), 'Invalid name with periods');
      assert.notOk(new Path('foo[bar].@nope').isValid(), 'Following brackets');
      assert.notOk(new Path('foo.@illigal[bar].biz').isValid(), 'Before brackets');
    });

    QUnit.test("Static method format works", function(assert){
      assert.expect(1);
      assert.ok(Path.isValid('foo.bar.@all'), 'Executes');
    });

  });
}