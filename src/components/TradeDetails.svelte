<script lang="ts">
  import { hederaStore } from '../stores/hederaStore';
  import type { Hedera } from '../lib/hederaModule';

  export let token: string;
  export let receiver: string;
  export let serial: string;
  export let price: string;

  let hedera: Hedera;
  $: hedera = $hederaStore;

  $: outputArray = makeOutput(token, receiver, serial, price);

  function makeOutput(token: string, receiver: string, serial: string, price: string) {
    return [
      { text: 'Token:', value: token },
      { text: 'Serial:', value: serial },
      { text: 'Receiver:', value: receiver },
      { text: 'Price:', value: price },
      { text: 'Fee:', value: $hederaStore.calculateFee(Number(price)) },
    ];
  }
</script>

<div class="summary">
  <h2>Trade summary</h2>
  {#each outputArray as { text, value }}
    {#if value != ''}
      <div class="summaryRow">
        <div class="summaryCol">{text}</div>
        <div class="summaryCol">{value}</div>
      </div>
    {/if}
  {/each}
  {#await hedera.returnRoyalties(token) then royalties}
    {#if royalties.length > 0}
      <h2>Royalties</h2>
      {#each royalties as royalty}
        <div class="summaryRow">
          {royalty.percentage.toPrecision(2)}% to {royalty.collectorId}
        </div>
      {/each}
    {/if}
  {/await}
</div>
<br />
