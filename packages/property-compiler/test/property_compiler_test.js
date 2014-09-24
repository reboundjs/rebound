require(['property-compiler/property-compiler'], function(compiler){
    compiler = compiler.default;
    QUnit.test('Rebound Property Compiler', function() {

      var func, res;

      func = function(){
        return 1;
      };
      compiler.register({}, 'key', func, 'path');
      res = compiler.compile();
      equal( res['path.key'], func, 'Property Compiler returns the given function at its fully formed path' );
      deepEqual( res['path.key'].__params, [], 'Property Compiler returns empty array if no data is accessed' );



      func = function(){
        return this.get('test');
      };
      compiler.register({}, 'key', func, 'path');
      res = compiler.compile();
      deepEqual( res['path.key'].__params, ['test'], 'Property Compiler returns proper dependancy for single get' );



      func = function(){
        return this.get('test.more');
      };
      compiler.register({}, 'key', func, 'path');
      res = compiler.compile();
      deepEqual( res['path.key'].__params, ['test.more'], 'Property Compiler returns proper dependancy for complex single get' );



      func = function(){
        return this.get('test.more').get('again.foo').get('bar');
      };
      compiler.register({}, 'key', func, 'path');
      res = compiler.compile();
      deepEqual( res['path.key'].__params, ['test.more.again.foo.bar'], 'Property Compiler returns proper dependancy for complex chained gets' );



      func = function(){
        return this.at(1);
      };
      compiler.register({}, 'key', func, 'path');
      res = compiler.compile();
      deepEqual( res['path.key'].__params, ['[1]'], 'Property Compiler returns proper dependancy for root level at()' );



      func = function(){
        return this.get('test[1].more');
      };
      compiler.register({}, 'key', func, 'path');
      res = compiler.compile();
      deepEqual( res['path.key'].__params, ['test[1].more'], 'Property Compiler returns proper dependancy for get including array referance' );



      func = function(){
        return this.get('test.more').at(1).get('again.foo');
      };
      compiler.register({}, 'key', func, 'path');
      res = compiler.compile();
      deepEqual( res['path.key'].__params, ['test.more[1].again.foo'], 'Property Compiler returns proper dependancy for chained gets and at()' );



      func = function(){
        return this.get('test.more').at(1).get('again.foo');
      };
      compiler.register({}, 'key', func, 'path');
      res = compiler.compile();
      deepEqual( res['path.key'].__params, ['test.more[1].again.foo'], 'Property Compiler returns proper dependancy for chained gets and at()' );



      func = function(){
        return this.get('test.more').get('andMore').where({test : 1});
      };
      compiler.register({}, 'key', func, 'path');
      res = compiler.compile();
      deepEqual( res['path.key'].__params, ['test.more.andMore.@each.test'], 'Property Compiler returns proper dependancy for chained gets and where() with single argument' );



      func = function(){
        return this.get('test.more').get('andMore').where({test : 1, bar: 'foo'});
      };
      compiler.register({}, 'key', func, 'path');
      res = compiler.compile();
      deepEqual( res['path.key'].__params, ['test.more.andMore.@each.test', 'test.more.andMore.@each.bar'], 'Property Compiler returns proper dependancy for chained gets and where() with multiple arguments' );



      func = function(){
        return this.get('test.more').findWhere({test : 1});
      };
      compiler.register({}, 'key', func, 'path');
      res = compiler.compile();
      deepEqual( res['path.key'].__params, ['test.more.@each.test'], 'Property Compiler returns proper dependancy for chained gets and findWhere() with single argument' );




      func = function(){
        return this.get('test.more').findWhere({test : 1, bar: 'foo'});
      };
      compiler.register({}, 'key', func, 'path');
      res = compiler.compile();
      deepEqual( res['path.key'].__params, ['test.more.@each.test', 'test.more.@each.bar'], 'Property Compiler returns proper dependancy for chained gets and findWhere() with multiple arguments' );




      func = function(){
        return this.get('test.more').pluck('test');
      };
      compiler.register({}, 'key', func, 'path');
      res = compiler.compile();
      deepEqual( res['path.key'].__params, ['test.more.@each.test'], 'Property Compiler returns proper dependancy for chained gets and pluck()' );



      func = function(){
        return this.get('test.more').slice(0,3);
      };
      compiler.register({}, 'key', func, 'path');
      res = compiler.compile();
      deepEqual( res['path.key'].__params, ['test.more.@each'], 'Property Compiler returns proper dependancy for chained gets and slice()' );



      func = function(){
        return this.get('test.more').clone();
      };
      compiler.register({}, 'key', func, 'path');
      res = compiler.compile();
      deepEqual( res['path.key'].__params, ['test.more.@each'], 'Property Compiler returns proper dependancy for chained gets and clone()' );



      func = function(){
        // This shouldn't break anything
        return this.get('test');
      };
      compiler.register({}, 'key', func, 'path');
      res = compiler.compile();
      deepEqual( res['path.key'].__params, ['test'], 'Property Compiler ignores single line comments' );



      func = function(){
        /*
           This
           shouldn't
           break
           anything
        */
        return this.get('test');
      };
      compiler.register({}, 'key', func, 'path');
      res = compiler.compile();
      deepEqual( res['path.key'].__params, ['test'], 'Property Compiler ignores multiline comments' );

      // TODO: Features to eventually support
      //
      //
      // func = function(){
      //   var foo = this.get('foo');
      //   return foo.get('bar');
      // };
      // compiler.register({}, 'key', func, 'path');
      // res = compiler.compile();
      // deepEqual( res['path.key'].__params, ['foo.bar'], 'Property Compiler saves state when object is saved to a variable' );
      //
      //
      //
      // func = function(){
      //   return this.get('foo').get(this.get('test'));
      // };
      // compiler.register({}, 'key', func, 'path');
      // res = compiler.compile();
      // deepEqual( res['path.key'].__params, ['foo.@each', 'test'], 'Property Compiler returns proper dependancy for nested gets' );
      //
      //
      //
      // func = function(){
      //   return this.get('foo').at(this.get('test'));
      // };
      // compiler.register({}, 'key', func, 'path');
      // res = compiler.compile();
      // deepEqual( res['path.key'].__params, ['foo.@each', 'test'], 'Property Compiler returns proper dependancy for nested at' );
      //
      //
      //
      // func = function(){
      //   var that = this;
      //   return that.get('foo.bar');
      // };
      // compiler.register({}, 'key', func, 'path');
      // res = compiler.compile();
      // deepEqual( res['path.key'].__params, ['foo.bar'], 'Property Compiler can handle ailiased `this` varialbe' );
      //
      //

    });


});











