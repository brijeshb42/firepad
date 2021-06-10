import { ICursor } from "../../src/cursor";
import { DatabaseAdapterCallbackType, DatabaseAdapterEvent, IDatabaseAdapter, IDatabaseAdapterEvent } from "../../src/database-adapter";
import { EventEmitter, EventListenerType, IEventEmitter } from "../../src/emitter";
import { ITextOperation } from "../../src/text-operation";
import * as Utils from "../../src/utils";
import { clearMock, resetMock } from "./factory-utils";

Utils.validateFalse(
  jest == null,
  "This factories can only be imported in Test environment"
);

const emitter: IEventEmitter = new EventEmitter();

export interface IDatabaseAdapterMock extends Partial<IDatabaseAdapter> {
  trigger(event: DatabaseAdapterEvent, ...eventAttributes: any[]): void;
}

const databaseAdapter: IDatabaseAdapterMock = Object.freeze({
  on: jest.fn<
    void,
    [DatabaseAdapterEvent, EventListenerType<IDatabaseAdapterEvent>]
  >((ev, handler) => {
    emitter.on(ev, handler);
  }),
  off: jest.fn<
    void,
    [DatabaseAdapterEvent, EventListenerType<IDatabaseAdapterEvent>]
  >((ev, handler) => {
    emitter.off(ev, handler);
  }),
  registerCallbacks: jest.fn<void, [DatabaseAdapterCallbackType]>((callbacks) => {
    Object.entries(callbacks).forEach(([event, listener]) => {
      emitter.on(
        event as DatabaseAdapterEvent,
        listener as EventListenerType<IDatabaseAdapterEvent>
      );
    });
  }),
  trigger: jest.fn<void, [DatabaseAdapterEvent, any]>((ev, ...attrs) => {
    emitter.trigger(ev, ...attrs);
  }),
  dispose: jest.fn<void, []>(() => {
    emitter.dispose();
  }),
  sendCursor: jest.fn<void, [ICursor]>(),
  sendOperation: jest.fn<void, [ITextOperation]>(),
});

afterEach(() => {
  clearMock(databaseAdapter);
});

afterAll(() => {
  emitter.dispose();
  resetMock(databaseAdapter);
});

/**
 * Returns a mock implementation of IDatabaseAdapter interface.
 * Useful for testing Editor Client, Firepad and related helper functions.
 */
export function getDatabaseAdapter(): IDatabaseAdapterMock {
  return databaseAdapter;
}