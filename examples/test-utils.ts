import * as firebase from "firebase/app";

export function getExampleRef(): firebase.database.Reference {
  let ref = firebase.database().ref();

  const hash = window.location.hash.replace(/#/g, "");
  if (hash) {
    ref = ref.child(hash);
  } else {
    ref = ref.push(); // generate unique location.
    window.location.replace(window.location + "#" + ref.key); // add it as a hash to the URL.
  }

  console.log("Firebase data: ", ref.toString());
  return ref;
}
