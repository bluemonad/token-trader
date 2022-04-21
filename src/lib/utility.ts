import type { proto } from "@hashgraph/sdk/lib/Transfer";

export {
  validateField,
  validateNonEmpty,
  fulfillPromise,
  printError,
  accountIdToString,
  removeNonDigit,
  removeNonDigitDot,
  addLine,
  BROADCAST_CHANNEL,
  ACCOUNT_CLEARED_MESSAGE,
};

const BROADCAST_CHANNEL = "broadcastChannel";
const ACCOUNT_CLEARED_MESSAGE = "userClearedMessage";
/**
 * A function to wrap calls to functions that return promises.
 * @template T - the return type of the promise value (optional)
 * @param {Promise<any>} promise - A promise to be fulfilled
 * @return {[any|null, null|unknown]} - return data or error 
 */
async function fulfillPromise<T = any>(promise: Promise<T>): Promise<[T | null, null | unknown]> {
  try {
    const data = await promise;
    return [data, null]
  } catch (error) {
    return [null, error];
  }
}

/** Run validation function of input field. Avoid validation if field is empty.
 * @param validationFunction - validation function of field
 * @param {any[]=} params - optional array of parameters to pass function
 */
function validateField(validationFunction, params?: any[]) {
  if (params) {
    return validationFunction(...params);
  } else {
    return validationFunction();
  }
}

/** Calls validateField only for non empty input
 * 
 */
function validateNonEmpty(inputValue: string, validationFunction, params?: any[]) {
  if (inputValue != "") {
    return validateField(validationFunction, params);
  }
  return;
}

function printError(error: unknown): string | null {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error == "string") {
    return error;
  }
  return "UNKNOWN ERROR";
}

/**
 * Print an accountID from a protoBuf representation of an account
 * @param {proto.IAccountID} accountId - receives a protoBuf representation of 
 * @returns {string} Account ID
 */
function accountIdToString(accountID: proto.IAccountID): string {
  if (accountID == null) {
    return "";
  }
  const accountNum = accountID?.["accountNum"];
  const realmNum = accountID?.["realmNum"];
  const shardNum = accountID?.["shardNum"];
  return "" + shardNum + "." + realmNum + "." + accountNum;
}


/**
 * Removes a regex from an input and returns the result
 * Can be curried
 */
const removeRegex = (regex: RegExp) => (input: string) => input.replace(regex, "");

const removeNonDigit = removeRegex(/[^\d]+/g);

const removeNonDigitDot = removeRegex(/[^\d.]+/g);


function addLine(container: HTMLElement, text: string) {
  const child = document.createElement('span');
  child.textContent = text;
  container.appendChild(child);
  container.appendChild(document.createElement('br'));
}