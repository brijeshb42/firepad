import { IBaseClient } from "../../src/client";
import { ITextOperation } from "../../src/text-operation";
import * as Utils from "../../src/utils";
import { clearMock, resetMock } from "./factory-utils";

Utils.validateFalse(
  jest == null,
  "This factories can only be imported in Test environment"
);

const baseClient: IBaseClient = Object.freeze({
  sendOperation: jest.fn<void, [ITextOperation]>(),
  applyOperation: jest.fn<void, [ITextOperation]>(),
});

afterEach(() => {
  clearMock(baseClient);
});

afterAll(() => {
  resetMock(baseClient);
});

/**
 * Returns a mock implementation of IBaseClient interface.
 * Useful in testing Client.
 */
export function getBaseClient(): IBaseClient {
  return baseClient;
}
