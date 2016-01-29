// ### Content Hook

// Content Hook
export default function content(morph, env, context, path, lazyValue){
  var el = morph.contextualElement;

  // Two way databinding for textareas
  if(el.tagName === 'TEXTAREA'){
    lazyValue.onNotify(function updateTextarea(lazyValue){
      el.value = lazyValue.value;
    });
    $(el).on('change keyup', function updateTextareaLazyValue(event){
      lazyValue.set(lazyValue.path, this.value);
    });
  }

  morph.lazyValue = lazyValue;

  return lazyValue.value;

};
