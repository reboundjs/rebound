// Queue Class
// ----------------
// Creates a new `Queue` object. `Queue` is a linked list of items to process using
// the passed `func` function. Has two methods: `Queue.add` and `Queue.process`,
// defined below.
function Queue(func){
  this.QUEUE_SYMBOL = Symbol('Queue_Symbol');
  this.length = 0;
  this.cache = {};
  this.func = func;
  this.first = null;
  this.last = null;
}

// Add an array of items to the linked list. We assume that items are mutable objects.
// Link these objects using a local `QUEUE_SYMBOL` to chain them together. Track only
// `first` and `last` on the Queue object itself.
Queue.prototype.add = function add(arr){
  var i, obj, len = arr.length;
  arr = Array.isArray(arr) ? arr : [arr];
  for(i=0;i<len;i++){
    obj = arr[i];
    obj.makeDirty && obj.makeDirty();
    if(!obj || this.cache[obj.cid]){ continue; }
    this.cache[obj.cid] = ++this.length;
    this.last && (this.last[this.QUEUE_SYMBOL] = obj);
    this.last = obj;
    !this.first && (this.first = obj);
  }
};

// Process all items in the queue present *at this point in time*. It is possible
// that as a result of this processing, more items are added to the queue. Do not
// process these. For Each item in the queue, remove it from the linked list, make
// its `next` value the new first, adjust length values, and run the callback using
// the item.
Queue.prototype.process = function process(){
  var prev, len = this.length;
  while(this.first && len--){
    prev = this.first;
    this.first = prev[this.QUEUE_SYMBOL] || null;
    delete prev[this.QUEUE_SYMBOL];
    delete this.cache[prev.cid];
    this.length--;
    this.func(prev);
  }
  // If first is falsy, then we've reached the end. We can remove `last`.
  if(!this.first){ this.last = null; }
};

export default Queue;