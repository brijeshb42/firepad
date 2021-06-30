import { v4 as uuid } from "uuid";

import { AceAdapter } from "./ace-adapter";
import { UserIDType } from "./database-adapter";
import { FirebaseAdapter } from "./firebase-adapter";
import { Firepad, IFirepad, IFirepadConstructorOptions } from "./firepad";
import * as Utils from "./utils";

/**
 * Creates a modern Firepad from Ace editor.
 * @param databaseRef - Firebase database Reference path.
 * @param editor - Ace Editor instance.
 * @param options - Firepad constructor options (optional).
 */
export function fromAce(
  databaseRef: string | firebase.database.Reference,
  editor: AceAjax.Editor,
  options: Partial<IFirepadConstructorOptions> = {}
): IFirepad {
  // Initialize constructor options with their default values
  const userId: UserIDType = options.userId || uuid();
  const userColor: string =
    options.userColor || Utils.colorFromUserId(userId.toString());
  const userName: string = options.userName || userId.toString();
  const defaultText: string = options.defaultText || editor.getValue();

  const databaseAdapter = new FirebaseAdapter(
    databaseRef,
    userId,
    userColor,
    userName
  );
  const editorAdapter = new AceAdapter(editor, false);

  return new Firepad(databaseAdapter, editorAdapter, {
    userId,
    userName,
    userColor,
    defaultText,
  });
}
