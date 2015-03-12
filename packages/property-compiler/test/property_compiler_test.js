require(['property-compiler/property-compiler'], function(compiler){

    QUnit.test('Rebound Property Compiler', function() {

      var func, res;

      func = function(){
        return 1;
      };
      res = compiler.compile(func, 'path');
      deepEqual( res, [], 'Property Compiler returns empty array if no data is accessed' );



      func = function(){
        return this.get('test');
      };
      res = compiler.compile(func, 'path');
      deepEqual( res, ['test'], 'Property Compiler returns proper dependancy for single get' );



      func = function(){
        return this.get('test.more');
      };
      res = compiler.compile(func, 'path');
      deepEqual( res, ['test.more'], 'Property Compiler returns proper dependancy for complex single get' );



      func = function(){
        return this.get('test.more').get('again.foo').get('bar');
      };
      res = compiler.compile(func, 'path');
      deepEqual( res, ['test.more.again.foo.bar'], 'Property Compiler returns proper dependancy for complex chained gets' );



      func = function(){
        return this.at(1);
      };
      res = compiler.compile(func, 'path');
      deepEqual( res, ['@each'], 'Property Compiler returns proper dependancy for root level at()' );



      func = function(){
        return this.get('test[1].more');
      };
      res = compiler.compile(func, 'path');
      deepEqual( res, ['test.@each.more'], 'Property Compiler returns proper dependancy for get including array referance' );



      func = function(){
        return this.get('test.more').at(1).get('again.foo');
      };
      res = compiler.compile(func, 'path');
      deepEqual( res, ['test.more.@each.again.foo'], 'Property Compiler returns proper dependancy for chained gets and at()' );



      func = function(){
        return this.get('test.more').at(1).get('again.foo');
      };
      res = compiler.compile(func, 'path');
      deepEqual( res, ['test.more.@each.again.foo'], 'Property Compiler returns proper dependancy for chained gets and at()' );



      func = function(){
        return this.get('test.more').get('andMore').where({test : 1});
      };
      res = compiler.compile(func, 'path');
      deepEqual( res, ['test.more.andMore.@each.test'], 'Property Compiler returns proper dependancy for chained gets and where() with single argument' );



      func = function(){
        return this.get('test.more').get('andMore').where({test : 1, bar: 'foo'});
      };
      res = compiler.compile(func, 'path');
      deepEqual( res, ['test.more.andMore.@each.test', 'test.more.andMore.@each.bar'], 'Property Compiler returns proper dependancy for chained gets and where() with multiple arguments' );



      func = function(){
        return this.get('test.more').findWhere({test : 1});
      };
      res = compiler.compile(func, 'path');
      deepEqual( res, ['test.more.@each.test'], 'Property Compiler returns proper dependancy for chained gets and findWhere() with single argument' );




      func = function(){
        return this.get('test.more').findWhere({test : 1, bar: 'foo'});
      };
      res = compiler.compile(func, 'path');
      deepEqual( res, ['test.more.@each.test', 'test.more.@each.bar'], 'Property Compiler returns proper dependancy for chained gets and findWhere() with multiple arguments' );




      func = function(){
        return this.get('test.more').pluck('test');
      };
      res = compiler.compile(func, 'path');
      deepEqual( res, ['test.more.@each.test'], 'Property Compiler returns proper dependancy for chained gets and pluck()' );



      func = function(){
        return this.get('test.more').slice(0,3);
      };
      res = compiler.compile(func, 'path');
      deepEqual( res, ['test.more.@each'], 'Property Compiler returns proper dependancy for chained gets and slice()' );



      func = function(){
        return this.get('test.more').clone();
      };
      res = compiler.compile(func, 'path');
      deepEqual( res, ['test.more.@each'], 'Property Compiler returns proper dependancy for chained gets and clone()' );



      func = function(){
        // This shouldn't break anything
        return this.get('test');
      };
      res = compiler.compile(func, 'path');
      deepEqual( res, ['test'], 'Property Compiler ignores single line comments' );



      func = function(){
        /*
           This
           shouldn't
           break
           anything
        */
        return this.get('test');
      };
      res = compiler.compile(func, 'path');
      deepEqual( res, ['test'], 'Property Compiler ignores multiline comments' );

      func = function(){
        if(this.get('one') === 'login' && this.get('two')){
          return 1;
        }
        return 0;
      };
      res = compiler.compile(func, 'path');
      deepEqual( res, ['one', 'two'], 'Property Compiler works with complex if statement (multiple terminators between `this`)' );


      func = function(){
        if(this.get('page') === 'login' && this.get('user.uid')){
          this.set('page', 'checkout');
          return 1;
        }
        return 0;
      };

      res = compiler.compile(func, 'path');
      deepEqual( res, ['page', 'user.uid'], 'Property Compiler works with complex if statement (multiple terminators between `this`)' );


      // TODO: Features to eventually support
      //
      //
      // func = function(){
      //   var foo = this.get('foo');
      //   return foo.get('bar');
      // };
      // compiler.register({cid: 'testId'}, 'key', func, 'path');
      // res = compiler.compile(func, 'path');
      // deepEqual( res, ['foo.bar'], 'Property Compiler saves state when object is saved to a variable' );
      //
      //
      //
      // func = function(){
      //   return this.get('foo').get(this.get('test'));
      // };
      // compiler.register({cid: 'testId'}, 'key', func, 'path');
      // res = compiler.compile(func, 'path');
      // deepEqual( res, ['foo.@each', 'test'], 'Property Compiler returns proper dependancy for nested gets' );
      //
      //
      //
      // func = function(){
      //   return this.get('foo').at(this.get('test'));
      // };
      // compiler.register({cid: 'testId'}, 'key', func, 'path');
      // res = compiler.compile(func, 'path');
      // deepEqual( res, ['foo.@each', 'test'], 'Property Compiler returns proper dependancy for nested at' );
      //
      //
      //
      // func = function(){
      //   var that = this;
      //   return that.get('foo.bar');
      // };
      // compiler.register({cid: 'testId'}, 'key', func, 'path');
      // res = compiler.compile(func, 'path');
      // deepEqual( res, ['foo.bar'], 'Property Compiler can handle ailiased `this` varialbe' );
      //
      //

    });


});











