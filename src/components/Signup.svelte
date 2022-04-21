<script lang="ts">
  import { hederaStore } from '../stores/hederaStore';
  import {
    usersStore,
    loginStore,
    UserRecord,
    addUserRecord,
    LoginState,
    LoginStatus,
  } from '../stores/store';
  import { replace } from 'svelte-spa-router';
  import { encryptMessage, hashPassword, HashRecord } from '../lib/cryptography';
  import { onMount } from 'svelte';
  import * as SvelteForms from 'svelte-forms';
  import { matchField, required } from 'svelte-forms/validators';
  import {
    accountDoNotExist,
    accountValidator,
    hasUpperLowerDigit,
    onlyAlphanumerics,
    passwordLength,
  } from '../lib/formValidators';
  import type { Hedera, NetworkChoice } from '../lib/hederaModule';
  import { createHederaInstance } from '../lib/newHedera';

  onMount(async () => {
    if ($loginStore.status === LoginStatus.LOGGED_IN) {
      replace('/');
    }
  });

  // Function to return a Hedera instance based on choice of network
  function setHedera(useMainnet: boolean): Hedera {
    const mainnet: NetworkChoice = 'mainnet-public';
    const testnet: NetworkChoice = 'testnet';
    return useMainnet ? createHederaInstance(mainnet) : createHederaInstance(testnet);
  }

  const isMainnetField = SvelteForms.field('isMainnet', true, [], { valid: true });

  // Hedera instance changes based on selected network
  $: $hederaStore = setHedera($isMainnetField.value);

  const defaultOptions = { validateOnChange: true, valid: false };

  const accountOptions = { validateOnChange: true, valid: false, stopAtFirstError: true };
  const accountValidators = [required(), accountDoNotExist($usersStore), accountValidator()];
  const account = SvelteForms.field('account', '', accountValidators, accountOptions);

  const keyValidators = [required()];
  const privateKey = SvelteForms.field('privateKey', '', keyValidators, defaultOptions);

  const passwordValidators = [required(), onlyAlphanumerics, hasUpperLowerDigit, passwordLength];
  const password = SvelteForms.field('password', '', passwordValidators, defaultOptions);

  const repeatPasswordValidators = [required(), matchField(password)];
  const repeatPassword = SvelteForms.field('repeatPassword', '', repeatPasswordValidators, defaultOptions);

  const signupFields = [account, privateKey, password, repeatPassword, isMainnetField];
  const signupForm = SvelteForms.form(...signupFields);
  
  let acceptsTerms = false;
  let showTermsError = false;

  // When network is changed create appropriate Hedera instance and revalidate entire form
  function changeNetwork(useMainnet: boolean) {
    $hederaStore = setHedera(useMainnet);
    signupForm.validate();
  }

  // TODO Abstract this and refactor
  async function handleSignupSubmit() {
    if (acceptsTerms === false) {
      showTermsError = true;
      return;
    }
    showTermsError = false;

    await signupForm.validate();
    if ($signupForm.valid) {
      let hash: HashRecord = hashPassword($password.value);
      let encryptedKey = encryptMessage($privateKey.value, $password.value);
      let network: NetworkChoice = $isMainnetField.value ? 'mainnet-public' : 'testnet';
      let userRecord = new UserRecord($account.value, encryptedKey, hash, network);
      usersStore.update(addUserRecord(userRecord));
      $loginStore = new LoginState().setLogin($account.value, userRecord.network);
      signupForm.reset();
      await replace('/');
    }
    signupForm.reset();
  }
</script>

<main>
  <div class="generalForm">
    <form on:submit|preventDefault={handleSignupSubmit}>
      <input type="text" bind:value={$account.value} placeholder="Account (0.0.1234)" /><br />
      <input type="password" bind:value={$privateKey.value} placeholder="Private key" /><br />
      <input type="password" bind:value={$password.value} placeholder="Password" /><br />
      <input
        type="password"
        bind:value={$repeatPassword.value}
        on:blur={repeatPassword.validate}
        placeholder="Repeat password"
      /><br />
      <select bind:value={$isMainnetField.value} on:change={() => changeNetwork($isMainnetField.value)}>
        <option value={true} selected={true}>Mainnet - Default</option>
        <option value={false}>Testnet</option>
      </select><br />

      <label class="terms">
        <input type=checkbox bind:checked={acceptsTerms}>
        I accept the
        <a href="https://token-trader.netlify.app/terms.html" rel='noreferrer noopener' target="_blank">terms</a> and
        <a href="https://token-trader.netlify.app/privacy-policy.html" rel='noreferrer noopener' target="_blank">privacy pollicy</a>
      </label><br />

      <button type="submit">Sign Up</button><br />      
      <div class="formError">
        {#if $account.value != '' && $account.invalid && $account.errors.length > 0}
          Enter a valid account ID<br />
        {/if}
        {#if $password.value != '' && $password.invalid && $password.errors.length > 0}
          Password does not match requirements<br />
        {/if}
        {#if $repeatPassword.value != '' && $repeatPassword.invalid}
          Passwords do not match<br />
        {/if}
        {#if showTermsError && acceptsTerms === false}
          You should accept the terms to proceed
        {/if}
      </div>
      <div style="text-align: center;">
        <div style="display: inline-block; text-align: left;">
          <br />
          Password requirements:<br />
          - At least one lowercase<br />
          - At least one uppercase<br />
          - At least one digit<br />
          - At least 12 characters<br />
        </div>
      </div>
    </form>
  </div>

</main>
