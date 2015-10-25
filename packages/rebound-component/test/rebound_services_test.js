import compiler from 'rebound-compiler/compile';
import tokenizer from 'htmlbars/dist/cjs/simple-html-tokenizer';
import Component from 'rebound-component/component';

QUnit.test('Rebound Services', function() {

  var service = new (Component.extend({
    int: 1,
    arr: [{a:1, b:2, c:3}],
    obj: {d:4, e:5, f:6}
  }));

  var service2 = new (Component.extend({
    foo: 'bar'
  }));

  var component1 = Component.extend({
    service: service,
    service2: service2,

    get attributeProxy(){
      return this.get('service.int');
    },
    get deepObjectAttributeProxy(){
      return this.get('service.obj.f');
    },
    get deepArrayAttributeProxy(){
      return this.get('service.arr[0].b');
    },
    get arrayProxy(){
      return this.get('service.arr');
    },
    get objectProxy(){
      return this.get('service.obj');
    }
  });
  var component2 = Component.extend({
    service: service,
    service2: service2,

    get attributeProxy(){
      return this.get('service.int');
    },
    get deepObjectAttributeProxy(){
      return this.get('service.obj.f');
    },
    get deepArrayAttributeProxy(){
      return this.get('service.arr[0].b');
    },
    get arrayProxy(){
      return this.get('service.arr');
    },
    get objectProxy(){
      return this.get('service.obj');
    }
  });

  var instance1 = new component1();
  var instance2 = new component2();

  // Inherit top level properties
  equal(service.get('int'), instance1.get('service.int'), 'Instances of components inheriting services get top level properties.');
  equal(service.get('int'), instance2.get('service.int'), 'Multiple components can inherit services and get top level properties.');

  // Inherit deep properties
  equal(service.get('obj.f'), instance1.get('service.obj.f'), 'Instances of components inheriting services get deep properties inside objects.');
  equal(service.get('obj.f'), instance2.get('service.obj.f'), 'Multiple components can inherit services and get deep properties inside objects.');

  // Inherit properties through collections
  equal(service.get('arr[0].b'), instance1.get('service.arr[0].b'), 'Instances of components inheriting services get properties through collections.');
  equal(service.get('arr[0].b'), instance2.get('service.arr[0].b'), 'Multiple components can inherit services and get properties through collections.');

  // Computed properties - Inherited attributes and object proxies
  equal(service.get('int'), instance1.get('attributeProxy'), 'Computed properties can depend on inherited services for top level service attributes.');
  equal(service.get('obj.f'), instance1.get('deepObjectAttributeProxy'), 'Computed properties can depend on inherited services for deep attributes.');
  equal(service.get('arr[0].b'), instance1.get('deepArrayAttributeProxy'), 'Computed properties can depend on inherited services for deep attributes through arrays.');
  deepEqual(service.get('arr').toJSON(), instance1.get('arrayProxy').toJSON(), 'Computed properties can proxy collection inside inherited services.');
  deepEqual(service.get('obj').toJSON(), instance1.get('objectProxy').toJSON(), 'Computed properties can proxy object inside inherited services.');

  service.set('int', 1);

  // Property recomputes
  equal(service.get('int'), instance1.get('service.int'), 'Changes to top level service properties are reflected in components.');
  equal(service.get('int'), instance2.get('service.int'), 'Changes to top level service properties are reflected in multiple components.');
  equal(service.get('int'), instance1.get('attributeProxy'), 'Computed properties depending on top level service properties re-compute on change.');
  equal(service.get('int'), instance2.get('attributeProxy'), 'Computed properties in multiple components depending on top level service properties re-compute on change.');

  service.set('obj.f', 7);

  // Object recomputes
  equal(service.get('obj.f'), instance1.get('service.obj.f'), 'Changes to deeply nested service properties are reflected in components.');
  equal(service.get('obj.f'), instance2.get('service.obj.f'), 'Changes to deeply nested service properties are reflected in multiple components.');
  equal(service.get('obj.f'), instance1.get('deepObjectAttributeProxy'), 'Computed properties depending on deeply nested service properties re-compute on change.');
  equal(service.get('obj.f'), instance2.get('deepObjectAttributeProxy'), 'Computed properties in multiple components depending on deeply nested service properties re-compute on change.');

  service.set('arr[0].b', 3);

  // Property recomputations through arrays
  equal(service.get('arr[0].b'), instance1.get('service.arr[0].b'), 'Changes to deeply nested service properties are reflected in components.');
  equal(service.get('arr[0].b'), instance2.get('service.arr[0].b'), 'Changes to deeply nested service properties are reflected in multiple components.');
  equal(service.get('arr[0].b'), instance1.get('deepArrayAttributeProxy'), 'Computed properties depending on deeply nested service properties through collections re-compute on change.');
  equal(service.get('arr[0].b'), instance2.get('deepArrayAttributeProxy'), 'Computed properties in multiple components depending on deeply nested service properties through collections re-compute on change.');

  service.set('obj.g', 8);

  // Object modification recomutes
  equal(service.get('obj.g'), instance1.get('service.obj.g'), 'Key additions to deeply nested service properties are reflected in components.');
  equal(service.get('obj.g'), instance2.get('service.obj.g'), 'Key additions to deeply nested service properties are reflected in multiple components.');
  deepEqual(service.get('obj').toJSON(), instance1.get('objectProxy').toJSON(), 'Computed properties proxying deeply nested service objects re-compute on key additions.');
  deepEqual(service.get('obj').toJSON(), instance2.get('objectProxy').toJSON(), 'Computed properties in multiple components proxying deeply nested service properties re-compute on key additions.');

  service.get('arr').add({foo: 'bar'});

  // Array addtion recomputes
  deepEqual(service.get('arr').toJSON(), instance1.get('arrayProxy').toJSON(), 'Computed properties proxying collections in a service re-compute on model additions.');
  deepEqual(service.get('arr').toJSON(), instance2.get('arrayProxy').toJSON(), 'Computed properties in multiple components proxying collections in a service re-compute on model additions.');

  service.get('arr').pop();

  // Array removal recomputes
  deepEqual(service.get('arr').toJSON(), instance1.get('arrayProxy').toJSON(), 'Computed properties proxying collections in a service re-compute on model removals.');
  deepEqual(service.get('arr').toJSON(), instance2.get('arrayProxy').toJSON(), 'Computed properties in multiple components proxying collections in a service re-compute on model removals.');

  // Inheritance from multiple services
  equal(service2.get('foo'), instance1.get('service2.foo'), 'A component can inherit from multiple services.');
  equal(service2.get('foo'), instance2.get('service2.foo'), 'Multiple components can inherit from multiple shared services.');

  instance2.deinitialize();

  equal(instance1.get('service2.foo'), 'bar', 'Services continue to persist even after consuming object deinitialization.');

  instance1.set('service2.foo', 'foo');
  instance1.reset();
  equal(instance1.get('service2.foo'), 'foo', 'Services are unaffected by comsuming objects\' reset events.');



});

// Components pass default settings to child models and are reset propery on reset()