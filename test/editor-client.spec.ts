import { IDatabaseAdapter } from "../src/database-adapter";
import { EditorAdapterEvent, IEditorAdapter } from "../src/editor-adapter";
import { EditorClient, IEditorClient } from "../src/editor-client";
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
    jest.resetAllMocks();
  });

  afterAll(() => {
    databaseAdapter.dispose();
    editorAdapter.dispose();
  });

  describe("#editorAdapter.onBlur", () => {
    it("should send null as cursor to database adapter", () => {
      editorAdapter.trigger(EditorAdapterEvent.Blur);
      expect(databaseAdapter.sendCursor).toHaveBeenCalledWith(null);
    });
  });
});