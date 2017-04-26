# Rebound Data

Rebound's data models are the power (the "Backbone" you may say!) of the Rebound framework.

## Principles

To reason about structured data on the client simpler, Rebound data adheres to the following principles.

### Input Agnostic
Any valid JSON data may be represented using Rebound data. In fact, any POJO and its contents can be represented, although the main intended use case is for JSON passed back and forth from the server.
### Strict Actor Model
Rebound data objects strictly follow the [Actor Model](https://en.wikipedia.org/wiki/Actor_model) and there is no notion of global state
###  

 - A Datum has a well-defined API footprint. Datum may *only* use these methods to interact internally:
   - **Lifecycle Callbacks:**
     - `constructor(data, options)`
     - `hydrate(data, options)`
     - `initialize(data, options)`
     - `deinitialize()`
   - **Data Interfaces:**
     - `set(key, value)`
     - `get(path)`
     - `delete(key)`
     - `location(datum)`
     - `remove(datum)`
     - `validate(obj)`
     - `clone(isBound)`
     - `toJSON()`
   - **State Accessors**
     - `parent`
     - `children`
     - `key`
     - `root`
   - **Network Interfaces:**
     - `fetch()`
     - `parse()`
     - `save()`
     - `destroy()`

## Packages

Rebound Data consists of five (5) core packages:

```
-
                Events
                  |
               Ancestry
                  |
    ------------------------------
   /        |           |         \
Model   Collection   Property    Value

```

### Events
The events package delivers a class – `Events` – that when sub-classed provide it with a custom event channel. You may bind a callback to an event with `on` or remove with `off`; `trigger`-ing an event fires all callbacks in succession. Events do not have to be declared before they are bound, and may take passed arguments. For example:

```javascript
class Obj extends Rebound.Event {};
var object = new Obj();
object.on('expand', function(){ alert('expand'); });
object.trigger('expand');
```

Event names may be of type `String` or `Symbol`.

#### Symbol Event Names

Using Symbols for events provides you a completely private event channel – no other actor may listen to your messages.

```javascript
class Obj extends Rebound.Event {};
var object = new Obj();
var myEvent = Symbol('my-private-event')
object.on(myEvent, function(){ alert('expanded'); });
object.trigger(myEvent);
```

#### Event and Path Names

String path segments provide you more control over the granularity of your listeners and triggers. These names are comprised of one to many "namespaces". Event namespaces are separated by the `:` character.

> **Event Name:** `<namespace>?(:<namespace>)*`

Within a namespace, there may be one to may "segments". Segments are delineated by either a `.` or via segment-literal notation `[]` (defined below).

> **Namespace:** `([<segment>|\[<segment>\]])?([.<segment>|\[<segment>\]])*`

A segment may not begin with the digits `0-9` but may otherwise contain any valid Unicode string *excluding*:

`whitespace`, `!`, `"`, `#`, `%`, `&`, `'`, `(`, `)`, `*`, `+`, `,`, `.`, `/`, `;`, `<`, `=`, `>`, `@`, `[`, `\`, `]`, `^`, <code>&#96;</code>, `{`, `|` `}`, `~`

To reference a segment that is not a valid identifier, you can use segment-literal notation: `[#comments]`

> **Segment:** `^[^0-9<excluded-chars>]?([^<excluded-chars>])*`

> **Excluded Chars:** <code>[\s!"#%&'\(\)\*+,./;<=>@/\[\\/\]^\`{\|}~]</code>

For example, all the strings in the list below are valid – though mostly impractical – event names:
 - `change`
 - `change:firstName`
 - `[#ofComments]`
 - `stream-name:add:article.comments[10]`
 - `my1337app:foo.bar`

A slightly more practical example of these string events may look like this:
 ```javascript
 class Obj extends Rebound.Event {};
 var object = new Obj();
 object.on('change:foo.bar', function(){ alert('expanded'); });
 object.trigger('change:foo.bar');
 ```

#### Event Wildcards

When using the listener methods (`on`, `listenTo` and `once`), or when `trigger`ing an event, you may use the `@each` and `@all` Event Wildcards to match undetermined segments and namespaces:
 - `@each` – Matches a single path segment.
 - `@all` – Matches zero to all following path segments in a namespace.

 ```javascript
 class Obj extends Rebound.Event {};
 var object = new Obj();
 object.on('change:foo.@each', function(){ console.log('@each'); });
 object.on('change:foo.@all', function(){ console.log('@all'); });
 object.trigger('change:foo.bar'); // @each, @all
 object.trigger('change:foo.biz.baz'); // @all
 ```
