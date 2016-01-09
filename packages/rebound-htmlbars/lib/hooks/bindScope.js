// ### Bind-Scope Hook

// Make scope available on the environment object to allow hooks to cache streams on it.
export default function bindScope(env, scope){
  env.scope = scope;
}