define( ['templates/demo', 'templates/partials/_editing', 'components/editing'], function(){

var testControllerClass = Backbone.Controller.extend({

/*********** Controller Default Configs **************/

    template: 'test/demo/templates/demo',

/*************** Lifecycle Functions ******************/

    initialize: function(options){

    },
    readyCallback: function(){

    },
    insertedCallback: function(){

    },
    removedCallback: function(){

    },
    routes: {
      ":filter" : "filterList"
    },

/************** Controller Properties *****************/
    newTitle: '',
    filter: 'all',
    todos: [
      {
        title: "Tie Bowtie",
        editing: false,
        isCompleted: true
      },{
        title: "Look Dapper",
        editing: false,
        isCompleted: false,
      },{
        title: "Profit",
        editing: false,
        isCompleted: false,
        arr: [{a: 1}, {b: 2}, {c: 3}]
      }
    ],
/************** Computed Properties *****************/
    allAreDone: function(){
      return this.get('todos').where({'isCompleted': true}).length == this.get('filteredTodos').length;
    },
    noneAreDone: function(){
      return this.get('todos').where({'isCompleted': true}).length == 0;
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

/************** Controller Methods *****************/

    createTodo: function(event){
      if(this.get('newTitle') == '') return;
      this.get('todos').add({
        title: this.get('newTitle'),
        editing: false,
        isCompleted: false
      });
      this.set('newTitle', '');
    },
    toggleAll: function(event){
      var value = event.currentTarget.checked;
      this.get('todos').forEach(function(model, index) {
        model.set('isCompleted', value);
      });
    },
    clearCompleted: function(event){
      this.get('todos').remove(
        this.get('todos').where({'isCompleted': true})
      );
    },
    removeTodo: function(event){
      this.get('todos').remove(event.data);
    },
    editTodo: function(event){
      event.data.set('editing', true);
    },
    filterList: function(filter){
      this.set('filter', filter)
    }
  });

  return testControllerClass;

});
