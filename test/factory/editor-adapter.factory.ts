import { ICursor } from "../../src/cursor";
import {
  ClientIDType,
  EditorAdapterEvent,
  EditorEventCallbackType,
  IEditorAdapter,
  IEditorAdapterEvent,
} from "../../src/editor-adapter";
import {
  EventEmitter,
  EventListenerType,
  IEventEmitter,
} from "../../src/emitter";
import * as Utils from "../../src/utils";

Utils.validateFalse(
  jest == null,
  "This factories can only be imported in Test environment"
);

const emitter: IEventEmitter = new EventEmitter();

export interface IEditorAdapterMock extends Partial<IEditorAdapter> {
  trigger(event: EditorAdapterEvent, ...eventAttributes: any[]): void;
  disposeCursor(): void;
}

const disposeRemoteCursorStub = jest.fn<void, []>();

const editorAdapter: IEditorAdapterMock = Object.freeze({
  on: jest.fn<
    void,
    [EditorAdapterEvent, EventListenerType<IEditorAdapterEvent>]
  >((ev, handler) => {
    emitter.on(ev, handler);
  }),
  off: jest.fn<
    void,
    [EditorAdapterEvent, EventListenerType<IEditorAdapterEvent>]
  >((ev, handler) => {
    emitter.off(ev, handler);
  }),
  registerCallbacks: jest.fn<void, [EditorEventCallbackType]>((callbacks) => {
    Object.entries(callbacks).forEach(([event, listener]) => {
      emitter.on(
        event as EditorAdapterEvent,
        listener as EventListenerType<IEditorAdapterEvent>
      );
    });
  }),
  trigger: jest.fn<void, [EditorAdapterEvent, any]>((ev, ...attrs) => {
    emitter.trigger(ev, ...attrs);
  }),
  registerUndo: jest.fn<void, [VoidFunction]>((handler) => {
    emitter.on("undo", handler);
  }),
  registerRedo: jest.fn<void, [VoidFunction]>((handler) => {
    emitter.on("redo", handler);
  }),
  dispose: jest.fn<void, []>(() => {
    emitter.dispose();
  }),
  setOtherCursor: jest.fn<Utils.IDisposable, [ClientIDType, ICursor, string, string | undefined]>(() => ({
    dispose: disposeRemoteCursorStub,
  })),
  disposeCursor: disposeRemoteCursorStub,
});

afterAll(() => {
  editorAdapter.dispose();
  jest.resetAllMocks();
});

export function getEditorAdapter(): IEditorAdapterMock {
  return editorAdapter;
}