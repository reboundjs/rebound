// ### Get Value Hook

// The getValue hook retreives the value of the passed in referance.
// It will return the propper value regardless of if the referance passed is the
// value itself, or a LazyValue.
export default function getValue(referance){
  return (referance && referance.isLazyValue) ? referance.value : referance;
}
