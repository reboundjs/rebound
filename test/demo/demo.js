define( ['templates/demo', 'templates/partials/_editing'], function(){
  var toDoModelClass = Backbone.Model.extend({
    initialize: function(){
      console.log("ToDo Model Instantiated", this);
    }
  });

  var toDoModel = new toDoModelClass({
    newTitle: '',
    filter: 'all',
    allAreDone: function(){
      return this.get('filteredTodos').where({'isCompleted': true}).length == this.get('filteredTodos').length;
    },
    noneAreDone: function(){
      return this.get('filteredTodos').where({'isCompleted': true}).length == 0;
    },
    remaining: function(){
      return this.get('todos').where({'isCompleted': false}).length;
    },
    completed: function(){
      return this.get('todos').where({'isCompleted': true}).length;
    },
    filteredTodos: function(){
      // console.log('In Filtered Todos', this.get('filter'), new Backbone.Collection(this.get('todos').where({'isCompleted': false})));
      if(this.get('filter') == 'all')
        return this.get('todos');
      if(this.get('filter') == 'active')
        return this.get('todos').where({'isCompleted': false});
      if(this.get('filter') == 'completed')
        return this.get('todos').where({'isCompleted': true});
    },
    todos: [
      {
        title: "Tie Bowtie",
        editing: false,
        isCompleted: true
      },{
        title: "Look Dapper",
        editing: false,
        isCompleted: false
      },{
        title: "Profit",
        editing: false,
        isCompleted: false
      }
    ]
  });


  var testControllerClass = Backbone.Controller.extend({

/*********** Controller Default Configs **************/

    outlet: $('#outlet'),
    data: toDoModel,
    template: 'test/demo/templates/demo',
    routes: {
      ":filter" : "filterList"
    },

/************** Controller Functions *****************/

    initialize: function(options){
      Rebound.registerHelper('loadEdit', function(params, hash, options, env){
        setTimeout(function(){$(options.element).focus()}, 100)
      })
    },
    createTodo: function(event){
      if(this.data.get('newTitle') == '') return;
      this.data.get('todos').add({
        title: this.data.get('newTitle'),
        editing: false,
        isCompleted: false
      });
      this.data.set('newTitle', '');
    },
    toggleAll: function(event){
      var value = event.currentTarget.checked;
      this.data.get('todos').forEach(function(model, index) {
        model.set('isCompleted', value);
      });
    },
    clearCompleted: function(){
      this.data.get('todos').remove(
        this.data.get('todos').where({'isCompleted': true})
      );
    },
    removeTodo: function(event){
      this.data.get('todos').remove(event.data);
    },
    editTodo: function(event){
      event.data.set('editing', true);
    },
    doneEditing: function(event){
      event.data.set('editing', false);
    },
    filterList: function(filter){
      this.data.set('filter', filter)
    }
  });

  return testControllerClass;

});
