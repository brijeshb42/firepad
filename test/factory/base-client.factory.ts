import { IBaseClient } from "../../src/client";
import { ITextOperation } from "../../src/text-operation";
import * as Utils from "../../src/utils";

Utils.validateFalse(
  jest == null,
  "This factories can only be imported in Test environment"
);

const baseClient: IBaseClient = Object.freeze({
  sendOperation: jest.fn<void, [ITextOperation]>(),
  applyOperation: jest.fn<void, [ITextOperation]>(),
});

export function getBaseClient(): IBaseClient {
  return baseClient;
}
