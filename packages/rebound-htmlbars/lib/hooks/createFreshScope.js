// ### Create-Fresh-Scope Hook

// Rebound's default scope object.
// The scope object is propagated down each block expression or render call and
// augmented with local variables as it goes. LazyValues are cached as streams
// here as well. Because `in` checks have unpredictable performance, keep a
// separate dictionary to track whether a local was bound.
export default function createFreshScope() {
  return {
    level: 1,
    self: null,
    locals: {},
    localPresent: {},
    streams: {},
    blocks: {}
  };
}
