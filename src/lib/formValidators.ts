import { checkPassword, decodeBase64ToString } from './cryptography'
import { pattern } from "svelte-forms/validators";
import { fulfillPromise } from './utility';
import { TokenType } from '@hashgraph/sdk';
import { hederaStore } from '../stores/hederaStore';
import { get } from 'svelte/store';


export {
  accountValidator,
  tokenValidator,
  authPassword,
  tokenSerialValidator,
  scheduleValidator,
  notSenderValidator,
  accountDoNotExist,
  onlyAlphanumerics,
  hasUpperLowerDigit,
  passwordLength,
};

// Signature of validator function
//    (value: any) => { valid: boolean, name: 'name_of_the_validator' }

// Regular expressions for new password
const onlyAlphanumerics = pattern(/^[A-Za-z0-9]+$/);
const hasUpperLowerDigit = pattern(/^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z]).*/);
const passwordLength = pattern(/^.{12,128}$/);

/** Authenticate existing password
 * @param {string} account
 * @param {object} records - pass $usersStore
*/
function authPassword(account: string, records: object) {
  return (password: string) => {
    let passwordValid = false;
    const accountRecord = records[account];
    if (accountRecord) {
      const { hash, salt } = accountRecord.hashRecord;
      passwordValid = checkPassword(password, hash, salt);
    }
    return { valid: passwordValid, name: 'authPassword' };
  };
}

function accountValidator() {
  return async (account: string) => {
    const hedera = get(hederaStore);
    const accountValid: boolean =
      hedera.isLegalAddress(account) && (await hedera.isValidAccount(account));
    return { valid: accountValid, name: 'accountValidator' };
  };
}

function accountDoNotExist(users: object) {
  return async (account: string) => {
    return { valid: users[account] === undefined, name: 'accountDoNotExist' };
  };
}

function notSenderValidator(sender: string) {
  return async (receiver: string) => {
    return { valid: sender !== receiver, name: 'notSenderValidator' };
  };
}


function tokenValidator() {
  return async (token: string) => {
    const hedera = get(hederaStore);
    const tokenValid = hedera.isLegalAddress(token) && (await hedera.isValidToken(token));
    return { valid: tokenValid, name: 'tokenValidator' };
  };
}

function isPositiveInteger(serial: string) {
  if (serial === "" || Number(serial) === NaN) {
    return false;
  }
  const serialNumber = Number(serial);
  return Number.isInteger(serialNumber) && serialNumber > 0;
}
function tokenSerialValidator() {
  /**
   * @param {string[]} tokenSerial - token and serial in array
   */
  return async (tokenSerial: string[]) => {
    const hedera = get(hederaStore);
    const [token, serial] = tokenSerial;
    let validatorReturn = { valid: false, name: 'serialValidator' };
    const tokenType = await hedera.getTokenType(token);
    if (tokenType === null) {
      return validatorReturn;
    }
    if (tokenType === TokenType.FungibleCommon) {
      validatorReturn.valid = true;
      return validatorReturn;
    }
    if (tokenType === TokenType.NonFungibleUnique && isPositiveInteger(serial)) {
      validatorReturn.valid = await hedera.doesSerialExist(token, Number(serial))
      return validatorReturn;
    }
    return validatorReturn;
  }
}

function scheduleValidator() {
  return async (scheduleCode: string) => {
    const hedera = get(hederaStore);
    let validatorReturn = { valid: false, name: 'scheduleValidator' };
    const schedule = decodeBase64ToString(scheduleCode);
    const [tokenSerial, _] = await fulfillPromise(hedera.tokenFromSchedule(schedule));
    if (tokenSerial?.token) {
      const token = tokenSerial.token;
      const serial = tokenSerial.serial?.toString();
      const tokenSerialFunction = tokenSerialValidator();
      const tokenSerialValidation = await tokenSerialFunction([token, serial]);
      if (tokenSerialValidation.valid) {
        validatorReturn.valid = true;
        return validatorReturn;
      }
    }
    return validatorReturn;
  }
}
