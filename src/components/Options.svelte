<script lang="ts">
  import { loginStore, LoginState, usersStore, removeStoreKey } from '../stores/store';
  import { BROADCAST_CHANNEL, ACCOUNT_CLEARED_MESSAGE } from '../lib/utility';

  function broadcastClearedAccount(){
    const channel = new BroadcastChannel(BROADCAST_CHANNEL);
    channel.postMessage(ACCOUNT_CLEARED_MESSAGE);
    channel.close();
  }

  let accountCleared = "";
  let allAccountsCleared = "";

  function clearOutput() {
    accountCleared = "";
    allAccountsCleared = "";
  }

  function clearAccount() {
    let currentAccount = $loginStore.account;
    clearOutput();
    if (currentAccount) {
      removeStoreKey(currentAccount);
      $loginStore = new LoginState;
      accountCleared = `Account ${currentAccount} cleared from records`;
      broadcastClearedAccount();
    }
    if (currentAccount === null) {
      accountCleared = `No account is logged in`;
    }
  }

  function clearAllAccounts() {
    clearOutput();
    $loginStore = new LoginState;
    $usersStore = {};
    allAccountsCleared = "All accounts cleared from records";
    broadcastClearedAccount();
  }
</script>

<main class="options">
  <h1>Options</h1>
  <p>
    <button on:click={clearAccount}>Clear account record</button><br /><br />
    <button on:click={clearAllAccounts}>Clear ALL account records</button>
  </p>
  <div style="text-align: center;">
    { accountCleared }
    { allAccountsCleared }
  </div>

  <p style="text-align: center;">
    <a href="https://token-trader.netlify.app/">Home</a>
    |
    <a href="https://token-trader.netlify.app/privacy-policy.html">Privacy policy</a>
    |
    <a href="https://token-trader.netlify.app/terms.html">Terms</a>
  </p>
</main>

<style>
  main {
    text-align: left;
    padding: 0em;
    max-width: 20em;
    width: 40%;
    margin: 0 auto;
  }

  h1 {
    text-align: center;
    color: #ff3e00;
    text-transform: uppercase;
    font-size: 1.8em;
    font-weight: 100;
  }

  p {
    font-size: small;
  }

  @media (min-width: 640px) {
    main {
      max-width: none;
    }
  }
/* 
  .clear-buttons {
    display: flex;
    flex:auto;
    justify-content:space-between;
  } */
</style>
