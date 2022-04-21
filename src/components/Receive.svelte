<script lang="ts">
  import { loginStore, usersStore } from '../stores/store';
  import { hederaStore } from '../stores/hederaStore';
  import type { AccountAmount, Royalty } from '../lib/hederaModule';
  import { TransactionReceipt, TransactionId, Status } from '@hashgraph/sdk';
  import * as Cryptography from '../lib/cryptography';
  import * as SvelteForms from 'svelte-forms';
  import { required } from 'svelte-forms/validators';
  import { authPassword, scheduleValidator } from '../lib/formValidators';
  import { fulfillPromise, printError, validateField, addLine } from '../lib/utility';
  import { createHederaInstance } from '../lib/newHedera';

  $: $hederaStore = createHederaInstance($loginStore.network);

  // Move to a utility component module
  function addLink(container: HTMLElement, url: string, text: string) {
    const child = document.createElement('a');
    child.textContent = text;
    child.href = url;
    child.rel = 'noreferrer noopener';
    child.target = '_blank';
    container.appendChild(child);
  }

  export let showSubmissionResult = false;
  let confirmationMessage = '';
  let confirmationDiv: HTMLDivElement;
  let invalidCodeOutput = '';
  let invalidPasswordOutput = '';
  const invalidCodeMessage = 'Check code is valid or try again in a few moments';

  const invalidPasswordMessage = 'Wrong password';

  let tokenContainer: HTMLDivElement;
  let serialContainer: HTMLDivElement;
  let royaltiesContainer: HTMLDivElement;
  let fixedContainer: HTMLDivElement;
  let hbarTransfersContainer: HTMLDivElement;

  const codeValidators = [required(), scheduleValidator()];
  const passwordValidators = [required(), authPassword($loginStore.account, $usersStore)];

  const codeOptions = { validateOnChange: false, valid: false };
  const passwordOptions = { validateOnChange: false, valid: false };

  // BASE64 ENCODING OF SCHEDULE ID
  const code = SvelteForms.field('code', '', codeValidators, codeOptions);
  const passwordField = SvelteForms.field('password', '', passwordValidators, passwordOptions);

  const receiveTokenForm = SvelteForms.form(code, passwordField);

  async function processReceiveForm() {
    confirmationMessage = '';
    invalidCodeOutput = '';
    invalidPasswordOutput = '';

    // Can be optimized
    await receiveTokenForm.validate();
    if ($code.invalid) {
      invalidCodeOutput = invalidCodeMessage;
    }
    if ($passwordField.invalid) {
      invalidPasswordOutput = invalidPasswordMessage;
    }
    let password = $passwordField.value;
    const formValid = $receiveTokenForm.valid;
    passwordField.reset();
    if (formValid) {
      // TOGGLE FLAG TO SHOW MESSAGES
      showSubmissionResult = true;

      const schedule = Cryptography.decodeBase64ToString($code.value);
      const tokenSerial = await $hederaStore.tokenFromSchedule(schedule);
      const token = tokenSerial.token;
      const serial = tokenSerial.serial;
      if (token == null) {
        confirmationMessage = 'Please wait a few moments and try again';
        return;
      }

      const receiver = $loginStore.account;
      const encrypted: Cryptography.Encrypted = $usersStore[receiver].encryptedKey;
      let key = Cryptography.decryptMessage(encrypted, password);
      password = '';

      const associated = await $hederaStore.isAssociated(token, $loginStore.account);
      if (associated === false) {
        const associate = $hederaStore.associateToken(token, $loginStore.account, key);
        const [_, associateError] = await fulfillPromise(associate);
        if (associateError) {
          confirmationMessage = printError(associateError);
          key = '';
          return;
        }
      }

      const signPromise = $hederaStore.signSchedule(schedule, receiver, key);
      const [scheduleReceipt, scheduleReceiptError] = await fulfillPromise<TransactionReceipt>(signPromise);
      if (scheduleReceiptError) {
        key = '';
        confirmationMessage = printError(scheduleReceiptError);
        return;
      }

      const scheduledId: TransactionId = scheduleReceipt.scheduledTransactionId;
      const [scheduledReceipt, scheduledReceiptError] = await fulfillPromise<TransactionReceipt>(
        $hederaStore.getReceipt(scheduledId, $loginStore.account, key)
      );
      if (scheduledReceiptError) {
        key = '';
        confirmationMessage = printError(scheduleReceiptError);
        return;
      }

      receiveTokenForm.reset();
      key = '';

      if (scheduledReceipt.status === Status.Success) {
        console.log(scheduledReceipt);
        console.log('scheduledId: ', scheduledId.toString());

        const outputToken = serial ? `${serial}@${token}` : `${token}`;

        // Get link to token in explorer
        const tokenLink = $hederaStore.getExplorerLink(token, serial);
        confirmationMessage =
          `Received <a href='${tokenLink}' rel='noreferrer noopener' target="_blank">` + outputToken + '</a>';

        // Get link to raw transaction from mirror node
        const linkPromise = $hederaStore.mirrorTransactionLink(scheduledId);
        const [link, linkError] = await fulfillPromise<string>(linkPromise);
        if (linkError) {
          console.log(printError(linkError));
          return;
        }
        addLink(confirmationDiv, link, 'View transaction');
      }
    }
  }

  function showTokenSerial(token: string, serial: Number = null) {
    tokenContainer.replaceChildren();
    serialContainer.replaceChildren();
    addLine(tokenContainer, `Token: ${token}`);
    if (serial) {
      addLine(tokenContainer, `Serial: ${serial}`);
    }
  }

  // TODO abstract refactor and move (pass callback to hand each object)
  // Use generic
  /**
   * @param {object[]} royaltyFees - from custom_fees.royalty_fees in token mirror API
   */
  function showRoyalties(royaltyFees: Royalty[], container: HTMLElement) {
    container.replaceChildren();
    if (royaltyFees && royaltyFees.length > 0) {
      royaltyFees.forEach((royaltyFee) => {
        addLine(container, `${royaltyFee.percentage.toPrecision(2)}% to ${royaltyFee.collectorId}`);
      });
    }
  }

  // TODO abstract refactor and move
  function showHbarTransfers(accountAmounts: AccountAmount[]) {
    hbarTransfersContainer.replaceChildren();
    if (accountAmounts) {
      accountAmounts.forEach((accountAmount) => {
        addLine(hbarTransfersContainer, `${accountAmount.account}: ${accountAmount.hbars} HBAR`);
      });
    }
  }

  async function handleScheduleCodeChange() {
    await validateField(code.validate);
    if ($code.invalid) {
      invalidCodeOutput = invalidCodeMessage;
    }

    if ($code.valid) {
      invalidCodeOutput = '';
      const tokenSerial = await $hederaStore.tokenFromBase64Schedule($code.value);
      const token = tokenSerial?.token;
      const serial = tokenSerial?.serial;
      if (token) {
        showTokenSerial(token, serial);

        const schedule = Cryptography.decodeBase64ToString($code.value);
        const accountAmounts = await $hederaStore.accountAmountsFromSchedule(schedule);
        showHbarTransfers(accountAmounts);

        const royalties: Royalty[] = await $hederaStore.returnRoyalties(token);
        showRoyalties(royalties, royaltiesContainer);
      }
    }
  }
</script>

<section>
  {#if showSubmissionResult === false}
    <form on:submit|preventDefault={processReceiveForm}>
      <input
        type="text"
        bind:value={$code.value}
        placeholder="Transaction code"
        on:input={() => handleScheduleCodeChange()}
        autocomplete="off"
      /><br />
      <input type="password" bind:value={$passwordField.value} placeholder="Password" autocomplete="off" /><br
      />
      <input type="submit" value="Receive token" />
      <div class="formError">
        {#if $code.invalid}
          {invalidCodeOutput}
          <br />
        {/if}
        {invalidPasswordOutput}
        <br />
      </div>
    </form>
  {/if}
  {#if $code.valid}
    <div>
      <h1>Trade Details</h1>
      <div bind:this={serialContainer} />
      <div bind:this={tokenContainer} />
      <div bind:this={hbarTransfersContainer} />
      <div bind:this={royaltiesContainer} />
      <div bind:this={fixedContainer} />
    </div>
    <br />
  {/if}

  {#if showSubmissionResult === true}
    <div bind:this={confirmationDiv}>
      {@html confirmationMessage}<br />
    </div>
    <br />
    <a href={null} on:click={() => (showSubmissionResult = false)}>Go back</a>
  {/if}
</section>
<main />
