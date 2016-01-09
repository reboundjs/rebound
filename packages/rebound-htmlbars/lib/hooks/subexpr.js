// ### Subexpr Hook

// The `subexpr` hook creates a LazyValue for a nexted expression so it may be
// used as a single data point in its parent expression. For example:
// ```
// {{#if (equal (add 1 2) 3)}}True!{{/if}}
// ```
// The `if` block expression contains a subexpression that is the evalued value
// of the `equal` helper, which in turn contains a subexpression that is the
// evalued value of the `add` helper. Each subexpression is represented internally
// by a single LazyValue that notifies its subscribers when it changes.
export default function subexpr(env, scope, helperName, params, hash) {
  var helper = this.lookupHelper(helperName, env);

  // Return the apropreate LazyValue for this subexpression type.
  if (helper) {
    return this.invokeHelper(null, env, scope, null, params, hash, helper, {}, undefined);
  }

  return this.get(env, scope, helperName);

}