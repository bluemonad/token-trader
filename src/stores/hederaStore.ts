import { writable } from 'svelte/store';
import { createHederaInstance } from "../lib/newHedera";

export const hederaStore = writable(createHederaInstance("mainnet-public"));
