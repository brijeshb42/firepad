import { DatabaseAdapterEvent, IDatabaseAdapter } from '../src/database-adapter';
import { IEditorAdapter } from '../src/editor-adapter';
import { Firepad, IFirepad } from '../src/firepad';
import { getDatabaseAdapter, getEditorAdapter, IDatabaseAdapterMock, IEditorAdapterMock } from './factory';

describe("Firepad", () => {
  let databaseAdapter: IDatabaseAdapterMock;
  let editorAdapter: IEditorAdapterMock;
  let firepad: IFirepad;

  beforeAll(() => {
    databaseAdapter = getDatabaseAdapter();
    editorAdapter = getEditorAdapter();

    firepad = new Firepad(databaseAdapter as IDatabaseAdapter, editorAdapter as IEditorAdapter, databaseAdapter.getUser())
  });

  describe("#isHistoryEmpty", () => {
    it("should throw error if called before Firepad is Ready", () => {
      const fn = () => firepad.isHistoryEmpty();
      expect(fn).toThrowError()
    });

    it("should return true if no activity done yet by any user", () => {
      databaseAdapter.trigger(DatabaseAdapterEvent.Ready);
      firepad.isHistoryEmpty();
      expect(databaseAdapter.isHistoryEmpty).toHaveBeenCalled();
    });
  });

  describe("#getConfiguration", () => {
    it("should return User Id of current Firepad", () => {
      databaseAdapter.trigger(DatabaseAdapterEvent.Ready);
      expect(firepad.getConfiguration("userId")).toEqual(databaseAdapter.getUser().userId);
    });

    it("should return User Name of current Firepad", () => {
      databaseAdapter.trigger(DatabaseAdapterEvent.Ready);
      expect(firepad.getConfiguration("userName")).toEqual(databaseAdapter.getUser().userName);
    });

    it("should return User Color of current Firepad", () => {
      databaseAdapter.trigger(DatabaseAdapterEvent.Ready);
      expect(firepad.getConfiguration("userColor")).toEqual(databaseAdapter.getUser().userColor);
    });
  });

  describe("#setUserId", () => {
    it("should set User Id", () => {
      const userId = "user123";
      firepad.setUserId(userId);
      expect(databaseAdapter.getUser().userId).toEqual(userId);
    });
  });

  describe("#setUserColor", () => {
    it("should set User Color", () => {
      const userColor = "#ff0023";
      firepad.setUserColor(userColor);
      expect(databaseAdapter.getUser().userColor).toEqual(userColor);
    });
  });

  describe("#setUserName", () => {
    it("should set User Name", () => {
      const userName = "Adam";
      firepad.setUserName(userName);
      expect(databaseAdapter.getUser().userName).toEqual(userName);
    });
  });

  describe("#getText", () => {
    it("should return current content of the Editor adapter", () => {
      expect(firepad.getText()).toEqual(editorAdapter.getText());
    });
  });

  describe("#setText", () => {
    it("should set content to the Editor adapter", () => {
      const content = "Hello World";
      firepad.setText(content);
      expect(editorAdapter.getText()).toEqual(content);
    });
  });

  describe("#dispose", () => {
    it("should throw error if Firepad already disposed", () => {
      firepad.dispose();
      const fn = () => firepad.clearUndoRedoStack();
      expect(fn).toThrowError();
    });
  });
});