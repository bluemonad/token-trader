import {
  Client, PrivateKey, ScheduleCreateTransaction, ScheduleSignTransaction,
  Transaction, TransferTransaction, TokenAssociateTransaction, Hbar, TokenType,
  TransactionId, TransactionReceiptQuery, ScheduleId,
} from "@hashgraph/sdk";
import { SchedulableTransactionBody, ITokenID } from "@hashgraph/proto";
import { decodeBase64ToString } from "./cryptography";
import { accountIdToString, fulfillPromise } from "./utility";

export {
  Hedera, NetworkChoice, Royalty, AccountAmount
};

// ---------------- CONSTANTS -----------------

type NetworkChoice = "testnet" | "mainnet-public";

const HEDERA_CLIENT = {
  "testnet": Client.forTestnet,
  "mainnet-public": Client.forMainnet,
};

const TINYBARS_IN_HBAR = 100000000;

// FEES ARE FIXED ABOVE MINIMUM TRADE AMOUNT
const MINIMUM_FIXED = 1000;
const FIXED_FEE = 10;
const ZERO_FEE = 0.01;

// BELOW MINIMUM A RELATIVE PERCENTAGE IS CHARGED
const RELATIVE_FEE = 1;

const MAX_HEDERA_FEES = 2;

const RANDOM_ID_RANGE = 10000;
// -------------- END CONSTANTS ---------------

// ------------- RETURN INTERFACES ------------

interface TokenSerial {
  token: string | null,
  serial: Number | null
}

interface Royalty {
  percentage: number,
  collectorId: string
}

interface AccountAmount {
  account: string,
  hbars: number
}

// ----------- END RETURN INTERFACES ----------


class Hedera {
  private readonly NETWORK: NetworkChoice;
  private readonly MIRROR: string;
  private readonly APP: string;
  private readonly API: string;
  constructor(network: NetworkChoice, appAccount: string, api = "api/v1/") {
    this.NETWORK = network;
    this.MIRROR = `https://${this.NETWORK}.mirrornode.hedera.com/`;
    this.APP = appAccount;
    this.API = api;
  }

  newClient(account: string, privateKey: string | PrivateKey, network: NetworkChoice = this.NETWORK) {
    const client = HEDERA_CLIENT[network]();
    client.setOperator(account, privateKey);
    return client;
  }

  async fetchHederaJSON(fetchAddress: string) {
    const response = await fetch(fetchAddress);
    const jsonResponse = JSON.parse(await response.text());
    return {
      originalResponse: response,
      jsonResponse: jsonResponse,
      status: response.status
    };
  }

  /**
   * @param {string} base64 - transaction_body from schedules/{scheduleID}
   * @return {SchedulableTransactionBody|null}
   */
  base64ToSchedulable(base64: string): SchedulableTransactionBody {
    try {
      const bytesArray = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
      return SchedulableTransactionBody.decode(bytesArray);
    } catch (error) {
      return null;
    }
  }

  calculateFee(hbarTotal: number) {
    if (hbarTotal >= MINIMUM_FIXED) {
      return FIXED_FEE;
    }
    if (hbarTotal === 0) {
      return ZERO_FEE;
    }
    return (hbarTotal / 100) * RELATIVE_FEE;
  }

  isLegalAddress(address: string) {
    let regAddress = new RegExp(/^\d+[.]\d+[.]\d+$/);
    return regAddress.test(address);
  }


  async isValidGeneric(address: string, endpoint: string, key: string) {
    const fetchAddress = `${this.MIRROR}${this.API}${endpoint}/${address}`;
    const [response, error] = await fulfillPromise(this.fetchHederaJSON(fetchAddress));
    if (error) {
      console.log(error);
      return false;
    }
    return (response.jsonResponse[key] === undefined) ? false : true;
  }

  async isValidAccount(address: string) {
    return this.isValidGeneric(address, "accounts", "account");
  }

  async isValidToken(address: string) {
    return this.isValidGeneric(address, "tokens", "token_id");
  }

  async isAssociated(token: string, account: string): Promise<boolean> {
    const associated = await fetch(
      `${this.MIRROR}${this.API}tokens?account.id=${account}`
    )
      .then((response) => response.json())
      .then((data) => data?.tokens?.find(({ token_id }) => token_id === token))
    return Boolean(associated)
  }

  /**
   * @param {stirng} token - a token id
   * @return {TokenType|null} - type of token or null if invalid token
   */
  async getTokenType(token: string): Promise<TokenType | null> {
    const tokenTypes = {
      "NON_FUNGIBLE_UNIQUE": TokenType.NonFungibleUnique,
      "FUNGIBLE_COMMON": TokenType.FungibleCommon
    };
    if (this.isLegalAddress(token) === false) {
      return null;
    }

    const tokenType = await fetch(
      `${this.MIRROR}${this.API}tokens/${token}`
    )
      .then((response) => response.json())
      .then((data) => data?.type).catch(() => null)
    if (tokenType == null) {
      return null
    }
    return tokenTypes[tokenType];
  }

  async doesSerialExist(token: string, serial: number) {
    const serialExists = await fetch(
      `${this.MIRROR}${this.API}tokens/${token}/nfts/${serial}`
    )
      .then((response) => response.json())
      .then((data) => data?.serial_number === serial)
    return serialExists;
  }

  async associateToken(
    token: string,
    account: string,
    keyString: string,
  ) {
    const key = PrivateKey.fromString(keyString);
    const client = this.newClient(account, key, this.NETWORK);
    const transaction = new TokenAssociateTransaction()
      .setAccountId(account)
      .setTokenIds([token])
      .freezeWith(client);
    const signTransaction = await transaction.sign(key);
    await signTransaction.execute(client);
  }

  randomIdentifier(topLimit: number): number {
    return Math.floor(Math.random() * topLimit);
  }

  async createSchedule(scheduledTransaction: Transaction, client: Client) {

    // Include a random number to allow for repeat schedules.
    const identifier = this.randomIdentifier(RANDOM_ID_RANGE);
    const scheduleTransaction = new ScheduleCreateTransaction()
      .setScheduledTransaction(scheduledTransaction)
      .setMaxTransactionFee(new Hbar(MAX_HEDERA_FEES))
      .setScheduleMemo("Token Trader Schedule ID: " + identifier.toString());
    const transactionResponse = await scheduleTransaction.execute(client);
    const scheduleReceipt = await transactionResponse.getReceipt(client);
    const scheduleId = scheduleReceipt.scheduleId;
    return scheduleId;
  }

  async createHbarTransfers(
    sender: string,
    receiver: string,
    hbarAmount: number
  ) {
    if (hbarAmount < 0) {
      throw RangeError("NEGATIVE_HBAR_AMOUNT");
    }
    const fee = this.calculateFee(hbarAmount);
    if (hbarAmount > 0 && hbarAmount < fee) {
      throw RangeError("HBAR_AMOUNT_DOES_NOT_COVER_FEE")
    }

    const tradeAmount = hbarAmount === 0 ? 0 : hbarAmount - fee;
    const transferTokenTx = new TransferTransaction()
      .setMaxTransactionFee(new Hbar(MAX_HEDERA_FEES));

    if (receiver !== this.APP && sender !== this.APP) {
      transferTokenTx
        .addHbarTransfer(sender, tradeAmount)
        .addHbarTransfer(receiver, -tradeAmount - fee)
        .addHbarTransfer(this.APP, fee)
    }
    if (receiver === this.APP) {
      transferTokenTx
        .addHbarTransfer(sender, tradeAmount)
        .addHbarTransfer(receiver, -tradeAmount)
    }
    if (sender === this.APP) {
      transferTokenTx
        .addHbarTransfer(sender, tradeAmount + fee)
        .addHbarTransfer(receiver, -tradeAmount - fee)
    }
    return transferTokenTx;
  }

  async createTransferToken(
    token: string,
    sender: string,
    receiver: string,
    hbarAmount: number,
    tokenQuantity: number = 1
  ) {
    if (hbarAmount < 0) {
      throw RangeError("NEGATIVE_HBAR_AMOUNT");
    }
    let transaction = (await this.createHbarTransfers(sender, receiver, hbarAmount))
      .addTokenTransfer(token, sender, -tokenQuantity)
      .addTokenTransfer(token, receiver, tokenQuantity)
      .setTransactionMemo(`Transfer ${token} via Token Trader`);
    return transaction;
  }

  async createTransferNFT(
    token: string,
    sender: string,
    receiver: string,
    hbarAmount: number,
    serial: number
  ) {
    let transaction = (await this.createHbarTransfers(sender, receiver, hbarAmount))
      .addNftTransfer(token, serial, sender, receiver)
      .setTransactionMemo(`Transfer ${serial}@${token} via Token Trader`);
    return transaction;
  }

  /**
   * Create inner transaction and outer schedule transaction.
   * May throw exceptions - must be called with error handling.
   */
  async tradeToken(
    sender: string,
    senderPrivateKeyStr: string,
    receiver: string,
    hbars: number,
    token: string,
    serial?: number
  ): Promise<ScheduleId> {
    const senderPrivateKey = PrivateKey.fromString(senderPrivateKeyStr);
    const client = this.newClient(sender, senderPrivateKey, this.NETWORK);

    let transaction: TransferTransaction;
    const tokenType = await this.getTokenType(token);
    if (tokenType === TokenType.FungibleCommon) {
      transaction =
        await this.createTransferToken(token, sender, receiver, hbars, 1);
    } else if (tokenType === TokenType.NonFungibleUnique) {
      transaction =
        await this.createTransferNFT(token, sender, receiver, hbars, serial);
    }
    const schedule = await this.createSchedule(transaction, client);
    return schedule;
  }

  /**
   * Function to sign a schedule transaction.
   * May throw.
   */
  async signSchedule(
    scheduleId: string,
    signerId: string,
    signerKey: string
  ) {
    const client = this.newClient(signerId, signerKey, this.NETWORK);
    const signTransaction = await new ScheduleSignTransaction()
      .setScheduleId(scheduleId)
      .freezeWith(client)
      .sign(PrivateKey.fromString(signerKey));
    const signResponse = await signTransaction.execute(client);
    const signReceipt = await signResponse.getReceipt(client);
    return signReceipt;
  }

  tokenToString(token: ITokenID): string {
    return token.realmNum + "." + token.shardNum + "." + token.tokenNum;
  }

  async transactionBodyFromSchedule(schedule: string):
    Promise<SchedulableTransactionBody> {
    const fetchAddress = `${this.MIRROR}${this.API}schedules/${schedule}`;
    const [response, error] = await fulfillPromise(this.fetchHederaJSON(fetchAddress));
    if (error) {
      console.log(error);
      return null;
    }
    const transactionBodyBase64 = response.jsonResponse["transaction_body"];
    return this.base64ToSchedulable(transactionBodyBase64);
  }

  /**
   * @param {string} schedule - Schedule ID
   * @returns {TokenSerial} - Token (and serial) in transaction - TokenSerial with null in case of failure
   */
  async tokenFromSchedule(schedule: string): Promise<TokenSerial> {
    const transactionBody = await this.transactionBodyFromSchedule(schedule);
    if (transactionBody === null) {
      return { token: null, serial: null };
    }
    const tokenTransfer = transactionBody?.cryptoTransfer?.tokenTransfers?.["0"];
    const token = tokenTransfer?.token;
    let serial = tokenTransfer?.nftTransfers?.["0"]?.serialNumber;
    let numSerial = serial ? Number(serial) : null;
    const tokenStr = token ? this.tokenToString(token) : null;
    return { token: tokenStr, serial: numSerial };
  }

  async tokenFromBase64Schedule(base64Schedule: string): Promise<TokenSerial> {
    const schedule = decodeBase64ToString(base64Schedule);
    const [tokenSerial, _] = await fulfillPromise(this.tokenFromSchedule(schedule));
    if (tokenSerial?.token) {
      return tokenSerial;
    }
    const noTokenSerial: TokenSerial = { token: null, serial: null };
    return noTokenSerial;
  }

  async returnTokenFees(token: string) {
    const customFees = await fetch(
      `${this.MIRROR}${this.API}tokens/${token}`
    )
      .then((response) => response.json())
      .then((data) => data?.custom_fees).catch(() => null)
    return customFees;
  }

  async returnFeeArr(token: string, feeType: "royalty_fees" | "fixed_fees"):
    Promise<object[]> {
    const tokenFees = await this.returnTokenFees(token);
    const feeArr = tokenFees?.[feeType];
    return feeArr ? feeArr : [];
  }

  async returnRoyalties(token: string): Promise<Royalty[]> {
    const feeArr = await this.returnFeeArr(token, "royalty_fees");
    return feeArr.map((royaltyFee) => {
      const numerator = royaltyFee['amount']['numerator'];
      const denominator = royaltyFee['amount']['denominator'];
      const percentage = (numerator / denominator) * 100;
      const collector = royaltyFee['collector_account_id'];
      const royalty: Royalty = { percentage: percentage, collectorId: collector }
      return royalty;
    });
  }

  async returnFixedFees(token: string): Promise<object[]> {
    return this.returnFeeArr(token, "fixed_fees");
  }

  async getReceipt(
    transactionId: TransactionId,
    clientId: string,
    clientKey: string
  ) {
    const client = this.newClient(clientId, clientKey, this.NETWORK);
    const receipt = new TransactionReceiptQuery()
      .setTransactionId(transactionId)
      .execute(client);
    return receipt;
  }

  getTransactionForURL(transactionId: string) {
    const tempArr = transactionId.split("");
    tempArr[transactionId.lastIndexOf(".")] = "-";
    return tempArr.join("").replace("@", "-").replace("?scheduled", "");
  }

  async mirrorTransactionLink(transactionId: TransactionId): Promise<string> {
    const transactionURL = this.getTransactionForURL(transactionId.toString());
    return `${this.MIRROR}${this.API}transactions/${transactionURL}`
  }

  /**
   * @returns {string[]} - returns array of tokens the account owns or empty array
   */
  async getAccountTokens(accountId: string): Promise<string[]> {
    const accountEndpoint = `${this.MIRROR}${this.API}accounts/${accountId}`;
    const fetchAccount = this.fetchHederaJSON(accountEndpoint);
    const [response, error] = await fulfillPromise(fetchAccount);
    if (error) {
      return [];
    }
    const tokensObjArr: object[] = response.jsonResponse?.["balance"]?.["tokens"];
    const tokensArr: string[] = tokensObjArr
      ?.filter((tokenObj) => tokenObj["balance"] !== 0)
      ?.map((tokenObj) => tokenObj["token_id"]);
    return tokensArr ? tokensArr : [];
  }

  /** Returns a link to a token on the GoMint explorer.
   * @param {string} token - token ID
   * @param {Number} serial - For fungible tokens, GoMint uses serial 1 as default
   * @param {NetworkChoice} network - optional, otherwise will use the current network
   * @returns - Link to the token on the explorer
   */
  getExplorerLink(token: string, serial: Number | null, network = this.NETWORK) {
    serial = serial ? serial : 1;
    const GOMINT_NETWORK = network === "mainnet-public" ? "mainnet" : "testnet";
    return `https://gomint.me/explore/NFT/?tokenId=${token}-${serial}&network=${GOMINT_NETWORK}`;
  }

  async accountAmountsFromSchedule(schedule: string) {
    const transactionBody = await this.transactionBodyFromSchedule(schedule);
    const protoAmounts = transactionBody?.cryptoTransfer?.transfers?.accountAmounts;
    return protoAmounts?.map((protoAmount) => {
      const account = accountIdToString(protoAmount?.accountID);
      const hbars = Number(protoAmount.amount) / TINYBARS_IN_HBAR;
      const accountAmount: AccountAmount = { account: account, hbars: hbars };
      return accountAmount;
    });
  }  
}
