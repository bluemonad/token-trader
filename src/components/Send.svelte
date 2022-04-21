<script lang="ts">
  import * as Cryptography from '../lib/cryptography';
  import { onMount } from 'svelte';
  import * as SvelteForms from 'svelte-forms';
  import { min, pattern, required } from 'svelte-forms/validators';
  import {
    accountValidator,
    notSenderValidator,
    tokenValidator,
    authPassword,
    tokenSerialValidator,
  } from '../lib/formValidators';
  import { hederaStore } from '../stores/hederaStore';
  import { loginStore, usersStore } from '../stores/store';
  import {
    fulfillPromise,
    printError,
    removeNonDigit,
    removeNonDigitDot,
    validateField,
  } from '../lib/utility';
  import { TokenType } from '@hashgraph/sdk';
  import TradeDetails from './TradeDetails.svelte';
  import { createHederaInstance } from "../lib/newHedera";

  // UNCOMMENT TO TEST "HederaModule.ts" (NOT ON GIT)
  // import * as HederaTest from '../lib/tests/testHederaModule';

  export let showSubmissionResult = false;

  $hederaStore = createHederaInstance($loginStore.network);
  let mounted = false;

  let showSerial = false;
  let scheduleCode = '';
  let errorCode = '';

  //----------------------START FORM DEFINITION------------------------

  const tokenValidators = [required(), tokenValidator()];
  const receiverValidators = [required(), accountValidator(), notSenderValidator($loginStore.account)];
  const priceValidators = [required(), min(0), pattern(/^\d+([.]\d+)?$/)];
  const passwordValidators = [required(), authPassword($loginStore.account, $usersStore)];

  const tokenOptions = { validateOnChange: false, valid: false };
  const serialOptions = { validateOnChange: false, valid: true };
  const receiverOptions = { validateOnChange: false, valid: false };
  const priceOptions = { validateOnChange: false, valid: false };
  const passwordOptions = { validateOnChange: false, valid: false };

  const token = SvelteForms.field('token', '', tokenValidators, tokenOptions);
  const serial = SvelteForms.field('serial', '', [], serialOptions);
  const receiver = SvelteForms.field('receiver', '', receiverValidators, receiverOptions);
  const price = SvelteForms.field('price', '', priceValidators, priceOptions);
  const password = SvelteForms.field('password', '', passwordValidators, passwordOptions);

  // SERIAL VALIDATED THROUGH COMBINED FIELD
  const tokenSerialValidators = [tokenSerialValidator()];
  const tokenSerial = SvelteForms.combined(
    'tokenSerial',
    [token, serial],
    ([token, serial]) => [token.value, serial.value],
    tokenSerialValidators
  );

  const sendTokenForm = SvelteForms.form(token, receiver, price, password, serial, tokenSerial);

  //-----------------------END FORM DEFINITION-------------------------

  let showWrongPassword = false;

  let tokensArray: string[] = [];

  async function updateTokensArray() {
    tokensArray = await $hederaStore.getAccountTokens($loginStore.account);

    // Assignment triggers reactivity in {#each} statement
    tokensArray = tokensArray;
  }

  onMount(async () => {
    mounted = true;
  });

  // Reactivity should trigger on mount and when "Send token" is pressed
  // after submission. Still, list is not guaranteed to be up to date.
  $: if (showSubmissionResult === false && mounted) {
    updateTokensArray();
  }

  function cleanInput(processStr: (s: string) => string, input: string): string {
    return processStr(input).trim();
  }

  async function handleTokenInput() {
    await validateField(token.validate);
    if ($token.valid === false) {
      return;
    }

    const tokenType = await $hederaStore.getTokenType($token.value);
    if (!tokenType) {
      return;
    }
    if (tokenType === TokenType.FungibleCommon) {
      $serial.value = '';
      showSerial = false;
      tokenSerial.validate();
    }
    if (tokenType === TokenType.NonFungibleUnique) {
      showSerial = true;
    }
  }

  async function processSendForm() {
    scheduleCode = '';
    errorCode = '';
    await tokenSerial.validate();
    await password.validate();
    if ($password.invalid) {
      showWrongPassword = true;
      return;
    }
    showWrongPassword = false;
    if ($sendTokenForm.valid) {
      showSubmissionResult = true;
      const senderId = $loginStore.account;
      const receiverId = $receiver.value;
      const priceNum: number = Number($price.value);
      const tokenId = $token.value;

      const encrypted = $usersStore[senderId].encryptedKey;
      let key = Cryptography.decryptMessage(encrypted, $password.value);
      $password.value = '';

      const serialNum = Number($serial.value);
      const promise = $hederaStore.tradeToken(senderId, key, receiverId, priceNum, tokenId, serialNum);
      const [schedule, error] = await fulfillPromise(promise);
      key = '';
      if (error) {
        errorCode = printError(error);
        password.reset();
        return;
      }
      if (schedule) {
        console.log('scheduleId:', schedule);
        console.log(schedule.toString());
        scheduleCode = Cryptography.encodeStringToBase64(schedule.toString());
        showSerial = false;
        sendTokenForm.reset();
      }
    }
  }

  function selectText(elementID: string) {
    let range = new Range();
    let copyElement = document.getElementById(elementID);
    range.setStart(copyElement, 0);
    range.setEnd(copyElement, 1);
    document.getSelection().removeAllRanges();
    document.getSelection().addRange(range);
  }
</script>

<section>
  {#if showSubmissionResult === false}
    <form on:submit|preventDefault={processSendForm} autocomplete="off">
      <input
        type="text"
        bind:value={$token.value}
        placeholder="Token"
        on:input={() => ($token.value = cleanInput(removeNonDigitDot, $token.value))}
        on:change={handleTokenInput}
        list="tokenList"
      />
      <datalist id="tokenList">
        {#each tokensArray as tokenOption}
          <option value={tokenOption} />
        {/each}
      </datalist>
      <br />
      <input
        type="text"
        bind:value={$receiver.value}
        placeholder="Receiver"
        on:input={() => {
          $receiver.value = cleanInput(removeNonDigitDot, $receiver.value);
          validateField(receiver.validate);
        }}
      /><br />
      <input
        type="text"
        bind:value={$price.value}
        placeholder="Price in HBAR"
        on:input={() => {
           $price.value = cleanInput(removeNonDigit, $price.value);
           validateField(price.validate);
        }}
      /><br />
      {#if showSerial}
        <input
          type="text"
          bind:value={$serial.value}
          placeholder="Serial number"
          on:input={() => validateField(tokenSerial.validate)}
        /><br />
      {/if}
      <input
        type="password"
        bind:value={$password.value}
        placeholder="Password"
        on:blur={() => validateField(password.validate)}
      /><br />
      <input type="submit" value="Send token" />
      <div class="formError">
        {#if $token.value != '' && $token.invalid && $token.errors.length > 0}
          Enter a valid token ID<br />
        {/if}
        {#if $receiver.value != '' && $receiver.invalid && $receiver.errors.length > 0}
          Enter a valid account ID<br />
        {/if}
        {#if $price.value != '' && $price.invalid && $price.errors.length > 0}
          Enter non-negative price in HBAR<br />
        {/if}
        {#if $password.value != '' && $password.invalid && showWrongPassword && $password.errors.length > 0}
          Wrong password<br />
        {/if}
        {#if $tokenSerial.invalid && $serial.value != '' && showSerial}
          Enter a valid serial number of NFT<br />
        {/if}
      </div>
    </form>
  {/if}
  {#if showSubmissionResult === true}
    {#if !scheduleCode && !errorCode}
      <p>Processing...</p>
    {/if}
    {#if scheduleCode}
      <p>Share code to complete trade:</p>
      <p id="copyCode" style="text-align: center; word-wrap:break-word;">{scheduleCode}</p>
      <a href={null} on:click={() => selectText('copyCode')}>Select code</a>
    {/if}
    {#if errorCode}
      <p>There was an error:</p>
      <p style="text-align: center; word-wrap:break-word;">{errorCode}</p>
    {/if}
    <br />
  {/if}
  <br />
  {#if $token.valid && $receiver.valid && $price.valid && $tokenSerial.valid}
    <TradeDetails
      token={$token.value}
      receiver={$receiver.value}
      serial={$serial.value}
      price={$price.value}
    />
  {/if}
</section>
