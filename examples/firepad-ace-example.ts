import * as firebase from "firebase/app";
import "firebase/database";

import * as Firepad from "../src";
import { getExampleRef } from "./test-utils";

// Ace constructor will be available in global scope
declare global {
  interface Window {
    ace: AceAjax.Ace;
  }
}

declare var window: Window;

const init = function (): void {
  // Initialize Firebase.
  firebase.initializeApp(process.env.FIREBASE_CONFIG);

  // Get Firebase Database reference.
  const firepadRef = getExampleRef();

  // Create Ace and firepad.
  const editor = window.ace.edit("firepad");
  const session = editor.getSession();
  editor.setTheme("ace/theme/textmate");
  session.setUseWrapMode(true);
  session.setUseWorker(false);
  session.setMode("ace/mode/typescript");

  const firepad = Firepad.fromAce(firepadRef, editor, {
    userName: `Anonymous ${Math.floor(Math.random() * 100)}`,
    defaultText: `// typescript Editing with Firepad!
function go() {
  var message = "Hello, world.";
  console.log(message);
}
`,
  });

  window["firepad"] = firepad;
  window["editor"] = editor;
};

// Initialize the editor in non-blocking way
setTimeout(init);

// Hot Module Replacement Logic
declare var module: NodeModule & {
  hot: { accept(path: string, callback: Function): void };
};

if (module.hot) {
  const onHotReload = function (): void {
    console.clear();
    console.log("Changes detected, recreating Firepad!");

    const Firepad = require("../src/index.ts");

    // Get Editor and Firepad instance
    const editor: AceAjax.Editor = window["editor"];
    const firepad: Firepad.Firepad = window["firepad"];

    // Get Constructor Options
    const firepadRef: firebase.database.Reference = getExampleRef();
    const userId: string | number = firepad.getConfiguration("userId");
    const userName: string = firepad.getConfiguration("userName");

    // Dispose previous connection
    firepad.dispose();

    // Create new connection
    window["firepad"] = Firepad.fromAce(firepadRef, editor, {
      userId,
      userName,
    });
  };

  module.hot.accept("../src/index.ts", onHotReload);
}
