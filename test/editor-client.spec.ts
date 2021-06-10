import { Cursor } from "../src/cursor";
import { DatabaseAdapterEvent, IDatabaseAdapter } from "../src/database-adapter";
import { EditorAdapterEvent, IEditorAdapter } from "../src/editor-adapter";
import { EditorClient, EditorClientEvent, IEditorClient } from "../src/editor-client";
import { TextOperation } from "../src/text-operation";
import { getDatabaseAdapter, getEditorAdapter, IDatabaseAdapterMock, IEditorAdapterMock } from "./factory";

describe("Editor Client", () => {
  let databaseAdapter: IDatabaseAdapterMock;
  let editorAdapter: IEditorAdapterMock;
  let editorClient: IEditorClient;

  beforeAll(() => {
    databaseAdapter = getDatabaseAdapter();
    editorAdapter = getEditorAdapter();
  });
  
  beforeEach(() => {
    editorClient = new EditorClient(databaseAdapter as IDatabaseAdapter, editorAdapter as IEditorAdapter);
  })

  afterEach(() => {
    editorClient.dispose();
  });

  describe("_editorAdapter", () => {
    describe("#onBlur", () => {
      it("should send null as cursor to Database adapter", () => {
        editorAdapter.trigger(EditorAdapterEvent.Blur);
        expect(databaseAdapter.sendCursor).toHaveBeenCalledWith(null);
      });
    });
  
    describe("#onFocus", () => {
      it("should not make any Database call if cursor position is same as before", () => {
        editorAdapter.trigger(EditorAdapterEvent.Focus);
        expect(databaseAdapter.sendCursor).not.toHaveBeenCalled();
      });
  
      it("should send cursor to Database adapter", () => {
        const cursor = new Cursor(4, 9);
        editorAdapter.setCursor(cursor);
        editorAdapter.trigger(EditorAdapterEvent.Focus);
        expect(databaseAdapter.sendCursor).toHaveBeenCalledWith(cursor);
      });
    });

    describe("#onCursorActivity", () => {
      it("should send cursor to Database adapter", () => {
        const cursor = new Cursor(6, 7);
        editorAdapter.setCursor(cursor);
        editorAdapter.trigger(EditorAdapterEvent.CursorActivity);
        expect(databaseAdapter.sendCursor).toHaveBeenCalledWith(cursor);
      });
    });

    describe.only("#onChange", () => {
      it("does nothing", () => {
        expect(true).toBe(true);
      });
      it("should send operation to Database adapter", () => {
        const initialContent = "";
        const operation = new TextOperation().insert("Hello World", null);
        const invertOperation = operation.invert(initialContent);
        // @ts-ignore
        console.log(editorClient._client);
        editorAdapter.trigger(EditorAdapterEvent.Change, operation, invertOperation);
        expect(databaseAdapter.sendOperation).toHaveBeenCalledWith(operation);
      });
    });

    // describe("#registerUndo", () => {
    //   let initialContent: string;

    //   beforeEach(() => {
    //     initialContent = "";
    //     editorAdapter.setText(initialContent);
    //   });

    //   it("should trigger undo event with stringified invert operation", (done) => {
    //     const operation = new TextOperation().insert("Hello World", null);
    //     const invertOperation = operation.invert(initialContent);
    //     editorClient.on(EditorClientEvent.Undo, (arg) => {
    //       expect(arg).toEqual(invertOperation.toString());
    //       done();
    //     });
    //     editorAdapter.trigger(EditorAdapterEvent.Change, operation, invertOperation);
    //     editorAdapter.trigger(EditorAdapterEvent.Undo);
    //   });

    //   it("should apply invert operation to editor adapter", () => {
    //     const operation = new TextOperation().insert("Hello World", null);
    //     const invertOperation = operation.invert(initialContent);
    //     editorAdapter.trigger(EditorAdapterEvent.Change, operation, invertOperation);
    //     editorAdapter.trigger(EditorAdapterEvent.Undo);
    //     expect(editorAdapter.applyOperation).toHaveBeenCalledWith(invertOperation);
    //   });
    // });

    // describe.only("#registerRedo", () => {
    //   let initialContent: string;

    //   beforeEach(() => {
    //     initialContent = "";
    //     // editorAdapter.setText(initialContent);
    //   });

    //   it("should trigger redo event with stringified invert of invert operation", (done) => {
    //     const operation = new TextOperation().insert("Hello World", null);
    //     const invertOperation = operation.invert(initialContent);
    //     console.log("before change");
    //     databaseAdapter.trigger(DatabaseAdapterEvent.Operation, operation);
    //     console.log("after change");
    //     // console.log("editor client", editorClient);
    //     console.log("1", editorAdapter.getText());
    //     editorAdapter.trigger(EditorAdapterEvent.Undo);
    //     console.log("2", editorAdapter.getText());
    //     const invertInvertOperation = invertOperation.invert(editorAdapter.getText());
    //     editorClient.on(EditorClientEvent.Redo, (arg) => {
    //       expect(arg).toEqual(invertInvertOperation.toString());
    //       done();
    //     });
    //     editorAdapter.trigger(EditorAdapterEvent.Redo);
    //   });

    //   // it("should apply invert of invert operation to editor adapter", () => {
    //   //   const initialContent = "";
    //   //   editorAdapter.setText(initialContent);
    //   //   const operation = new TextOperation().insert("Hello World", null);
    //   //   const invertOperation = operation.invert(initialContent);
    //   //   editorAdapter.trigger(EditorAdapterEvent.Change, operation, invertOperation);
    //   //   editorAdapter.trigger(EditorAdapterEvent.Undo);
    //   //   const invertInvertOperation = invertOperation.invert(editorAdapter.getText());
    //   //   editorAdapter.trigger(EditorAdapterEvent.Redo);
    //   //   expect(editorAdapter.applyOperation).toHaveBeenCalledWith(invertInvertOperation);
    //   // });
    // });

    describe("#onError", () => {
      it("should bubble up error message with additional attributes", (done) => {
        const err = "Something Went Wrong";
        const operation = new TextOperation().retain(100, null);
        const state = {
          retain: 20,
        };
        editorClient.on(EditorClientEvent.Error, (...args) => {
          expect(args).toEqual([err, operation, state]);
          done();
        });
        editorAdapter.trigger(EditorAdapterEvent.Error, err, operation, state);
      });
    });
  });
});