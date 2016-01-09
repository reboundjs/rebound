import $ from 'rebound-utils/rebound-utils';

QUnit.test('Rebound Utils - Events', function(assert) {
  var root, child1, child2;
  assert.expect(18);

  root = document.createElement('div');
  root.id = "root";

  child1 = document.createElement('p');
  child1.innerHTML = 'Paragraph 1!';
  child1.id = "p1";
  root.appendChild(child1);

  child2 = document.createElement('p');
  child2.innerHTML = 'Paragraph 2!';
  child2.id = "p2";
  root.appendChild(child2);
  document.body.appendChild(root);



  // Direct Binding on root element
  $('#root').on('click', function(e){
    assert.equal(1, 1, 'Event bound directly to root element is triggered');
  });
  $('#root').trigger('click');
  $('#root').off();



  // Direct Binding on child elements
  $('#root p').on('click', function(e){
    assert.equal(1, 1, 'Event bound directly to multiple child elements are triggered');
  });
  $('#root #p1').trigger('click');
  $('#root #p2').trigger('click');
  $('#root #p1').off();



  // Delegate bindings
  $('#root #p1').on('click', 'p', function(e){
    assert.equal(1, 1, 'Event bound directly to element with delegate selector set to itself is triggered');
  });

  $('#root').on('click', 'p', function(e){
    assert.equal(1, 1, 'Event triggered on delegate selector that is a String works without data passed to callback');
  });

  $('#root').on('click', child1, function(e){
    assert.equal(1, 1, 'Event triggered on delegate selector that is an Element works without data passed to callback');
  });

  $('#root').on('click', 'p', {foo: 'bar'}, function(e){
    assert.equal('bar', e.data.foo, 'Event triggered on delegate selector that is a String and data is passed to callback');
  });

  $('#root').on('click', child1, {foo: 'bar'}, function(e){
    assert.equal('bar', e.data.foo, 'Event triggered on delegate selector that is an Element and data is passed to callback');
  });

  $('#root #p1').trigger('click');
  $('#root').off();
  $('#root p').off();



  // Multiple Event Adding and Removing
  $('#root').on('click mouseover', function(e){
    // Should trigger three times
    assert.equal(1, 1, '(3x) Double event binding on an element. Off will remove individual event types.');
  });

  $('#root').trigger('click');
  $('#root').trigger('mouseover');

  $('#root').off('click');

  $('#root').on('click mouseover', 'p', function(e){
    // Should trigger twice
    assert.equal(1, 1, '(2x) Double event binding on an element with delegate selector.');
  });

  $('#root #p1').trigger('click');
  $('#root #p1').trigger('mouseover');
  $('#root').off('click mouseover');



  // Stop Propagation Support For Direct Events
  $('#root').on('click', function(e){
    // Wont ever trigger
    throw "This should never run! Stop propagation not working for directly bound events.";
  });

  $('#root p').on('click', function(e){
    e.stopPropagation();
    assert.equal(1, 1, 'Stop propagation stops the directly bound event in its tracks, jack');
  });

  $('#root #p1').trigger('click');
  $('#root').off('click');
  $('#root p').off('click');


  // Stop Propagation Support For Delegated Events
  $('#root').on('click', function(e){
    // Wont ever trigger
    throw "This should never run! Stop propagation not working for delegated events.";
  });

  $('#root').on('click', 'p', function(e){
    e.stopPropagation();
    assert.equal(1, 1, 'Stop propagation stops the delegated event in its tracks, jack');
  });

  $('#root #p2').trigger('click');
  $('#root').off('click');
  $('#root p').off('click');





  // Return false Support For Direct Events
  $('#root').on('click', function(e){
    // Wont ever trigger
    throw "This should never run! Return false not working for directly bound events.";
  });

  $('#root p').on('click', function(e){
    assert.equal(1, 1, 'Return false stops the directly bound event in its tracks, jack');
    return false;
  });

  $('#root #p1').trigger('click');
  $('#root').off('click');
  $('#root p').off('click');


  // Regurn false Support For Delegated Events
  $('#root').on('click', function(e){
    // Wont ever trigger
    throw "This should never run! Return false not working for delegated events.";
  });

  $('#root').on('click', 'p', function(e){
    assert.equal(1, 1, 'Return false stops the delegated event in its tracks, jack');
    return false;
  });

  $('#root #p2').trigger('click');
  $('#root').off('click');
  $('#root p').off('click');



  // Stop Immediate Propagation
  $('#root').on('click', function(e){
    // Wont ever trigger
    throw "This should never run! StopImmediatePropagation does not run stopPropagation.";
  });
  $('#root p').on('click', function(e){
    assert.equal(1, 1, 'StopImmediatePropagation stops event execution in its tracks, jack');
    e.stopImmediatePropagation();
  });
  $('#root p').on('click', function(e){
    // Wont ever trigger
    throw "This should never run! StopImmediatePropagation still propagates on the element triggered.";
  });

  $('#root #p1').trigger('click');
  $('#root').off('click');
  $('#root p').off('click');


  document.body.removeChild(root);
});
