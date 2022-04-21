// STORES AND DATA TYPES IN THEM

import { persistentWritable } from "./persistentStore";
import type { Encrypted, HashRecord } from "../lib/cryptography";
import type { NetworkChoice } from "../lib/hederaModule";

export {
  usersStore,
  loginStore,
  LoginStatus,
  LoginState,
  UserRecord,
  addUserRecord,
  removeStoreKey
}


const LoginStatus = {
  LOGGED_IN: "LOGGED_IN",
  LOGGED_OUT: "LOGGED_OUT",
};

class LoginState {
  status: string = LoginStatus.LOGGED_OUT;
  account: string | null = null;
  loginTimestamp: number | null = null;
  network: NetworkChoice;

  setLogin(account: string, network: NetworkChoice) {
    this.account = account;
    this.loginTimestamp = Date.now();
    this.status = LoginStatus.LOGGED_IN;
    this.network = network;
    return this;
  }
}

class UserRecord {
  account: string;
  encryptedKey: Encrypted;
  hashRecord: HashRecord;
  network: NetworkChoice;

  constructor(
    account: string,
    encryptedKey: Encrypted,
    hashRecord: HashRecord,
    network: NetworkChoice
  ) {
    this.account = account;
    this.encryptedKey = encryptedKey;
    this.hashRecord = hashRecord;
    this.network = network;
  }
}

function removeStoreKey(key: string) {
  usersStore.update(store => {
    delete store[key];
    return store;
  })
}

// This is passed to the update function of usersStore
function addUserRecord(user: UserRecord) {
  return (curr: object) => {
    curr[user.account] = user;
    return curr;
  }
}

const usersStore = persistentWritable<object>("users", {});
const loginStore = persistentWritable<LoginState>("login", new LoginState);
