<script lang="ts">
  import { replace } from 'svelte-spa-router';
  import { onMount } from 'svelte';
  import { LoginStatus, LoginState, loginStore, UserRecord, usersStore } from '../stores/store';
  import { checkPassword } from '../lib/cryptography';

  onMount(async () => {
    if ($loginStore.status === LoginStatus.LOGGED_IN) {
      replace('/');
    }
  });
  let loginError = false;

  let account = '';
  let password = '';

  function clearInput() {
    account = '';
    password = '';
  }

  async function handleLoginSubmit() {
    loginError = false;
    const userRecord: UserRecord = $usersStore[account];
    if (userRecord && userRecord.account === account) {
      const { hash, salt } = userRecord.hashRecord;
      if (checkPassword(password, hash, salt)) {
        $loginStore = new LoginState().setLogin(account, userRecord.network);
        clearInput();
        await replace('/');
      }
    }
    loginError = true;
    clearInput();
  }
</script>

<main>
  <div class="generalForm">
    <form on:submit|preventDefault={handleLoginSubmit} autocomplete="on">
      <input type="text" bind:value={account} placeholder="Account" /><br />
      <input type="password" bind:value={password} placeholder="Password" /><br />
      <button type="submit">Login</button><br />
      <div class="formError">
        {#if loginError}
          Wrong credentials<br />
        {/if}
      </div>
    </form>
    <span class="passMessageClass" />
  </div>
</main>

<style>
</style>
