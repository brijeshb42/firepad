import { ICursor, Cursor } from "./cursor";
import {
  ClientIDType,
  EditorAdapterEvent,
  EditorEventCallbackType,
  IEditorAdapter,
  IEditorAdapterEvent,
} from "./editor-adapter";
import { IEventEmitter, EventEmitter, EventListenerType } from "./emitter";
import { ITextOperation, TextOperation } from "./text-operation";
import * as Utils from "./utils";

interface IAceDocument extends AceAjax.Document {
  $lines: string[];
}

interface IAceEditorChangeEventData {
  range: {
    start: AceAjax.Position;
    end: AceAjax.Position;
  };
  action: string; // insert, remove
  lines: string[];
  text: string;
}

interface IAceEditorChangeEvent {
  data: IAceEditorChangeEventData;
}

interface IRemoteCursor extends AceAjax.Range {
  id?: number;
}

export class AceAdapter implements IEditorAdapter {
  protected readonly _ace: AceAjax.Editor;
  protected readonly _aceRange: typeof AceAjax.Range;
  protected readonly _classNames: string[];
  protected readonly _aceDocument: IAceDocument;
  protected readonly _aceSession: AceAjax.IEditSession;
  protected readonly _remoteCursors: Map<ClientIDType, IRemoteCursor>;

  protected _initiated: boolean;
  protected _ignoreChanges: boolean;
  protected _lastDocLines: string[];
  protected _lastCursorRange: AceAjax.Range | null;
  protected _emitter: IEventEmitter | null;

  /**
   * Wraps an Ace editor in adapter to work with rest of Firepad
   * @param aceInstance - Ace Code Editor instance
   * @param avoidListeners - Whether or not propagate changes from editor (optional, defaults to `True`)
   */
  constructor(aceInstance: AceAjax.Editor, avoidListeners: boolean = true) {
    this._ace = aceInstance;
    this._aceRange = window.ace.require("ace/range").Range;
    this._aceSession = this._ace.getSession();
    this._aceDocument = this._aceSession.getDocument() as IAceDocument;
    this._aceDocument.setNewLineMode("unix");

    this._classNames = [];
    this._initiated = false;
    this._ignoreChanges = false;
    this._remoteCursors = new Map<ClientIDType, IRemoteCursor>();

    this._grabDocumentState();

    if (!avoidListeners) {
      this._init();
    }
  }

  protected _init(): void {
    this._emitter = new EventEmitter([
      EditorAdapterEvent.Blur,
      EditorAdapterEvent.Change,
      EditorAdapterEvent.CursorActivity,
      EditorAdapterEvent.Error,
      EditorAdapterEvent.Focus,
      EditorAdapterEvent.Redo,
      EditorAdapterEvent.Undo,
    ]);

    this._ace.on("blur", this._onBlur);
    this._ace.on("focus", this._onFocus);
    this._ace.on("change", this._onChange);
    this._aceSession.selection.on("changeCursor", this._onCursorActivity);
  }

  dispose(): void {
    this._ace.off("blur", this._onBlur);
    this._ace.off("focus", this._onFocus);
    this._ace.off("change", this._onChange);
    this._aceSession.selection.off("changeCursor", this._onCursorActivity);

    if (this._emitter) {
      this._emitter.dispose();
      this._emitter = null;
    }
  }

  protected _grabDocumentState(): void {
    this._lastDocLines = this._aceDocument.getAllLines();
    this._lastCursorRange = this._aceSession.selection.getRange();
  }

  on(
    event: EditorAdapterEvent,
    listener: EventListenerType<IEditorAdapterEvent>
  ): void {
    return this._emitter?.on(event, listener);
  }

  off(
    event: EditorAdapterEvent,
    listener: EventListenerType<IEditorAdapterEvent>
  ): void {
    return this._emitter?.off(event, listener);
  }

  registerCallbacks(callbacks: EditorEventCallbackType): void {
    Object.entries(callbacks).forEach(([event, listener]) => {
      this.on(
        event as EditorAdapterEvent,
        listener as EventListenerType<IEditorAdapterEvent>
      );
    });
  }

  protected _trigger(
    event: EditorAdapterEvent,
    eventArgs: IEditorAdapterEvent | void,
    ...extraArgs: unknown[]
  ): void {
    return this._emitter?.trigger(event, eventArgs || {}, ...extraArgs);
  }

  registerUndo(callback: Utils.VoidFunctionType): void {
    this._ace.undo = callback;
  }

  registerRedo(callback: Utils.VoidFunctionType): void {
    this._ace.redo = callback;
  }

  getCursor(): ICursor {
    let start: number, end: number;

    try {
      start = this._aceDocument.positionToIndex(
        this._aceSession.selection.getRange().start
      );
      end = this._aceDocument.positionToIndex(
        this._aceSession.selection.getRange().end
      );
    } catch (error) {
      console.error(error);

      try {
        // If the new range doesn't work (sometimes with setValue), we'll use the old range
        start = this._aceDocument.positionToIndex(this._lastCursorRange.start);
        end = this._aceDocument.positionToIndex(this._lastCursorRange.end);
      } catch (e2) {
        console.log(
          "Couldn't figure out the cursor range:",
          e2,
          "-- setting it to 0:0."
        );

        [start, end] = [0, 0];
      }
    }

    if (start > end) {
      [start, end] = [end, start];
    }

    return new Cursor(start, end);
  }

  setCursor(cursor: ICursor): void {
    const { position, selectionEnd } = cursor.toJSON();

    let start = this._aceDocument.indexToPosition(position, 0);
    let end = this._aceDocument.indexToPosition(selectionEnd, 0);

    /** If selection is inversed */
    if (position > selectionEnd) {
      [start, end] = [end, start];
    }

    /** Create Selection in the Editor */
    this._aceSession.selection.setSelectionRange(
      // @ts-ignore
      new this._aceRange(start.row, start.column, end.row, end.column)
    );
  }

  setOtherCursor(
    clientID: ClientIDType,
    cursor: ICursor,
    userColor: string,
    userName?: string
  ): Utils.IDisposable {
    let cursorRange = this._remoteCursors.get(clientID);

    if (cursorRange) {
      // @ts-ignore
      cursorRange.start.detach();
      // @ts-ignore
      cursorRange.end.detach();
      this._aceSession.removeMarker(cursorRange.id);
    }

    const { position, selectionEnd } = cursor.toJSON();

    // let start = this._aceDocument.indexToPosition(position, 1);
    // let end = this._aceDocument.indexToPosition(selectionEnd, 1);
    let start = this._posFromIndex(position);
    let end = this._posFromIndex(selectionEnd);

    /** If selection is inversed */
    if (position > selectionEnd) {
      [start, end] = [end, start];
    }

    let selectionColor = userColor;
    let className = `remote-client-selection-${userColor.replace("#", "")}`;

    if (position === selectionEnd) {
      /** It's a single cursor */
      selectionColor = "transparent";
      className = className.replace("selection", "cursor");
    }

    console.log("cursor", position, start);

    /** Generate Style rules and add them to document */
    this._addStyleRule(className, selectionColor, userColor);

    // @ts-ignore
    cursorRange = new this._aceRange(
      start.row,
      start.column,
      end.row,
      end.column
    );

    console.log(cursorRange);
    let originalClipRows = cursorRange.clipRows;
    cursorRange.clipRows = (firstRow: number, lastRow: number) => {
      const range = originalClipRows.call(cursorRange, firstRow, lastRow);
      range.isEmpty = () => false;
      return range;
    };

    // @ts-ignore
    cursorRange.start = this._aceDocument.createAnchor(
      cursorRange.start.row,
      cursorRange.start.column
    );

    // @ts-ignore
    cursorRange.end = this._aceDocument.createAnchor(
      cursorRange.end.row,
      cursorRange.end.column
    );
    cursorRange.id = this._aceSession.addMarker(
      cursorRange,
      className,
      "text",
      false
    );

    return {
      dispose: () => {
        const remoteCursor: IRemoteCursor | void = this._remoteCursors.get(
          clientID
        );

        if (!remoteCursor) {
          // Already disposed, nothing to do.
          return;
        }

        // Dispose marker added.
        // @ts-ignore
        remoteCursor.start.detach();
        // @ts-ignore
        remoteCursor.end.detach();
        this._aceSession.removeMarker(remoteCursor.id);
      },
    };
  }

  getText(): string {
    return this._aceDocument.getValue();
  }

  setText(text: string): void {
    this._aceDocument.setValue(text);
  }

  setInitiated(init: boolean): void {
    // Perfomance boost on clearing editor after network calls (do not directly setValue or EOL will get reset and break sync)
    this.setText("");
    this._initiated = init;
  }

  protected _posFromIndex(index: number): AceAjax.Position {
    var j, len, line, ref, row;
    ref = this._aceDocument.$lines;
    for (row = j = 0, len = ref.length; j < len; row = ++j) {
      line = ref[row];
      if (index <= line.length) {
        break;
      }
      index -= line.length + 1;
    }
    return {
      row: row + 1,
      column: index,
    };
  }

  protected _indexFromPosfunction(
    position: AceAjax.Position,
    lines?: string[]
  ) {
    var i, index, j, ref;
    lines ||= this._lastDocLines;
    index = 0;
    for (
      i = j = 0, ref = position.row;
      0 <= ref ? j < ref : j > ref;
      i = 0 <= ref ? ++j : --j
    ) {
      index += this._lastDocLines[i].length + 1;
    }
    return (index += position.column);
  }

  /**
   * Transforms changes from Ace editor into Edit Operations.
   * @param changes - Change Event with List of changes.
   */
  protected _operationFromACEChange(
    change: AceAjax.EditorChangeEvent | IAceEditorChangeEvent
  ): [ITextOperation, ITextOperation] {
    let action: string, start: number, text: string;

    // @ts-ignore - Support for Ace < 1.2.0
    if (change.data) {
      const delta = (change as IAceEditorChangeEvent).data;

      if (delta.action === "insertLines" || delta.action === "removeLines") {
        text =
          delta.lines.join(Utils.EndOfLineSequence.LF) +
          Utils.EndOfLineSequence.LF;
        action = delta.action.replace("Lines", "");
      } else {
        text = delta.text.replace(
          this._aceDocument.getNewLineCharacter(),
          Utils.EndOfLineSequence.LF
        );
        action = delta.action.replace("Text", "");
      }
      start = this._aceDocument.positionToIndex(delta.range.start);
    } else {
      // Ace 1.2.0+
      const {
        action: actionName,
        lines,
        start: startPosition,
      } = change as AceAjax.EditorChangeEvent;
      action = actionName;
      text = lines.join(Utils.EndOfLineSequence.LF);
      start = this._aceDocument.positionToIndex(startPosition);
    }

    let restLength =
      this._lastDocLines.join(Utils.EndOfLineSequence.LF).length - start;

    if (action === "remove") {
      restLength -= text.length;
    }

    const insert_op = new TextOperation()
      .retain(start, null)
      .insert(text, null)
      .retain(restLength, null);
    const delete_op = new TextOperation()
      .retain(start, null)
      .delete(text)
      .retain(restLength, null);

    if (action === "remove") {
      return [delete_op, insert_op];
    }

    return [insert_op, delete_op];
  }

  /**
   * Applies Edit Operations into Ace editor.
   * @param operation - Edit Operations.
   */
  protected _applyOperationToACE(operation: ITextOperation) {
    let index = 0;
    const ops = operation.getOps();

    for (const op of ops) {
      if (op.isRetain()) {
        index += op.chars;
        continue;
      }

      if (op.isInsert()) {
        this._aceDocument.insert(
          this._aceDocument.indexToPosition(index, 0),
          op.text
        );
        index += op.text!.length;
        continue;
      }

      if (op.isDelete()) {
        const start = this._aceDocument.indexToPosition(index, 0);
        const end = this._aceDocument.indexToPosition(index + op.chars, 0);
        // @ts-ignore
        const range = this._aceRange.fromPoints(start, end);
        this._aceDocument.remove(range);
      }
    }

    this._grabDocumentState();
  }

  applyOperation(operation: ITextOperation): void {
    if (!operation.isNoop()) {
      this._ignoreChanges = true;
    }

    this._applyOperationToACE(operation);
    this._ignoreChanges = false;
  }

  invertOperation(operation: ITextOperation): ITextOperation {
    return operation.invert(this.getText());
  }

  protected _onBlur = () => {
    if (!this._ace.selection.isEmpty()) {
      return;
    }

    this._trigger(EditorAdapterEvent.Blur);
  };

  protected _onFocus = () => {
    this._trigger(EditorAdapterEvent.Focus);
  };

  protected _onCursorActivity = () => {
    this._trigger(EditorAdapterEvent.CursorActivity);
  };

  protected _onChange = (
    change: AceAjax.EditorChangeEvent | IAceEditorChangeEvent
  ) => {
    /** Ignore if change is being applied by firepad itself. */
    if (this._ignoreChanges || !this._initiated) {
      return;
    }

    const [mainOp, reverseOp] = this._operationFromACEChange(change);
    this._trigger(EditorAdapterEvent.Change, mainOp, reverseOp);

    this._grabDocumentState();
  };

  /**
   * Returns CSS Style rules for Cursor and Selection.
   * @param className - CSS Classname for the Cursor or Selection.
   * @param backgroundColor - Background color for selection, `transparent` for cursor.
   * @param fontColor - Color of cursor.
   * @returns
   */
  protected _getStyles(
    className: string,
    backgroundColor: string,
    fontColor: string
  ): string {
    return `
      .${className} {
        position: relative;
        background-color: ${backgroundColor};
        border-left: 2px solid ${fontColor};
      }
    `;
  }

  /**
   * Adds CSS Style rules into DOM
   * @param className - CSS Classname for the Cursor or Selection.
   * @param backgroundColor - Background color for selection, `transparent` for cursor.
   * @param fontColor - Color of cursor.
   */
  protected _addStyleRule(
    className: string,
    backgroundColor: string,
    fontColor: string
  ): void {
    Utils.validateTruth(document != null, "This package must run on browser!");

    /** Do not re-inject if already exists in DOM */
    if (this._classNames.includes(className)) {
      return;
    }

    const style = this._getStyles(className, backgroundColor, fontColor);
    const styleTextNode = document.createTextNode(style);
    const styleElement = document.createElement("style");
    styleElement.appendChild(styleTextNode);
    document.head.appendChild(styleElement);

    this._classNames.push(className);
  }
}
