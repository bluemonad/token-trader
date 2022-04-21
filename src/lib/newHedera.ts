/* Components should use this module to initialize their own identical Hedera instance,
 * to avoid passing the same instance as a prop between all components.
 *
 * It is imperative that the instances are identical, based on constant environment
 * variables passed through WebPack.
 */
import { Hedera, NetworkChoice } from "./hederaModule";

export { createHederaInstance };

declare var TESTNET_ID: string;
declare var MAINNET_ID: string;

const appId = (network: NetworkChoice) => network === "testnet" ? TESTNET_ID: MAINNET_ID;
const createHederaInstance = (network: NetworkChoice) => new Hedera(network, appId(network));
