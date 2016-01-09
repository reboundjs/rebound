// ### Create-Child-Scope Hook

// Create a scope object that will inherit everything from its parent
// scope until written over with a local variable.
export default function createChildScope(parent) {
  var scope = Object.create(parent);
  scope.locals = Object.create(parent.locals);
  scope.localPresent = Object.create(parent.localPresent);
  return scope;
}