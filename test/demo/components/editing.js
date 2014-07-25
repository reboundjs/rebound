define( ['templates/components/editing'], function(){

  Rebound.registerComponent({
    name: 'edit-todo',
    template: 'test/demo/templates/components/editing',
    controller: {
      value: 'Default Value',
      awesomeValue: function(){
        return this.get('value') + ' IS AWESOME';
      },
      readyCallback: function(event){
        console.log(0)
        this.oldValue = this.get('value');
      },
      insertedCallback: function(event){
        console.log("INSIDE", this, this.$el)
        this.$('input').focus();
      },
      doneEditing: function(event){
        // this.data.get('arr').add({asdf: true});
        this.set('editing', false);
      },
      inputModified: function(event){
        // If enter
        if(event.keyCode == 13)
          this.doneEditing(event);
        // If escape
        if(event.keyCode == 27){
          this.set('value', this.oldValue);
          this.doneEditing(event);
        }
      }
    }
  });

});
