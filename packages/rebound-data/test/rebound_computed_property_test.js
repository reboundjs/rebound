require(['rebound-data/rebound-data'], function(reboundData){
    var Model = window.Rebound.Model = reboundData.Model,
        Collection =  window.Rebound.Collection = reboundData.Collection;

        // Notify all of a object's observers of the change, execute the callback
        function notify(obj, path) {
          // If path is not an array of keys, wrap it in array
          path = (_.isString(path)) ? [path] : path;

          // For each path, alert each observer and call its callback
          _.each(path, function(path){
            if(obj.__observers && _.isArray(obj.__observers[path])){
              _.each(obj.__observers[path], function(callback, index) {
                if(callback){ callback(); }
                  else{ delete obj.__observers[path][index]; }
                  });
                }
              });
            }

    QUnit.test('Rebound Data - Computed Properties', function() {
      var model, collection, model2, model3;

      model = new Model();
      model.set('a', 1);
      model.set('b', 1);
      model.set('prop', function(){
        return this.get('a') + this.get('b');
      });
      equal(2, model.get('prop'), 'Getting a computed property from a model returns its value.');

      model.set('b', 2);
      notify(model, 'b');
      equal(3, model.get('prop'), 'Changing a computed property\'s dependancy effects its resulting value.');



      model = new Model();
      model.set('objProp', function(){
        return {a: 1, b: 2};
      });
      model.set('arrProp', function(){
        return [{a: 1, b: 2}];
      });
      equal(true, model.get('objProp').isModel, 'Returning a vanilla object gives you a Rebound Model on get.');
      deepEqual(model, model.get('objProp').__parent__, 'Returning a vanilla object gives you a Rebound Model with its ancestry set.');
      deepEqual('objProp', model.get('objProp').__path(), 'Returning a vanilla object gives you a Rebound Model with its path set.');


      equal(true, model.get('arrProp').isCollection, 'Returning a vanilla array gives you a Rebound Collection on get.');
      deepEqual(model, model.get('arrProp').__parent__, 'Returning a vanilla object gives you a Rebound Collection with its ancestry set.');
      deepEqual('arrProp', model.get('arrProp').__path(), 'Returning a vanilla object gives you a Rebound Collection with its path set.');




      model = new Model({
        arr: [{id: 1}, {id: 2}, {id: 3}, {id:4}, {id:5}, {id:6}],

        even: function(){
          return result = this.get('arr').filter(function(obj){ return obj.get('id') % 2 === 0; });
        },

        firstEven: function(){
          return this.get('even').at(0);
        },

        arrProxy: function(){
          return this.get('arr');
        }

      });
      equal(model.get('even').length, 3, 'Computed properties are able to return transforms on existing collections.');
      equal(model.get('firstEven').get('id'), 2, 'Computed properties are able to return transforms on other computed properties.');

      equal(model.get('even[0].id'), 2,'Single expression model.get traverses over computed properties that return Collections');
      equal(model.get('firstEven.id'), 2, 'Single expression model.get traverses over computed properties that return Models');

      model.set('firstEven.id', 8);
      equal(model.get('arr[1].id'), 8, 'Modifying an object returned from a computed property modifies the original');

      model.get('arrProxy').add({id: 7});
      equal(model.get('arr').length, 7, 'Adding models to a collection returned by a computed property modifies the original');

      model.get('arrProxy').remove(model.get('arrProxy[6]'));
      equal(model.get('arr').length, 6, 'Removing models from a collection returned by a computed property modifies the original');

      model.get('arrProxy').reset();
      equal(model.get('arr').length, 0, 'Resetting a collection returned by a computed property reset the original');




    });


});
