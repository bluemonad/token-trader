<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import Router, { location, replace } from 'svelte-spa-router';
  import { wrap } from 'svelte-spa-router/wrap';
  import { loginStore, LoginState, LoginStatus } from '../stores/store';
  import Send from './Send.svelte';
  import Receive from './Receive.svelte';
  import Login from './Login.svelte';
  import Signup from './Signup.svelte';
  import NotFound from './NotFound.svelte';
  import { BROADCAST_CHANNEL, ACCOUNT_CLEARED_MESSAGE } from '../lib/utility';

  /* 
   * Set up a Broadcast channel so Options.svelte could notify when
   * current logged in account is cleared.
   */
  const channel = new BroadcastChannel(BROADCAST_CHANNEL);
  channel.onmessage = (eventMessage) => {
    if (eventMessage.data === ACCOUNT_CLEARED_MESSAGE) {
      window.location.reload();
    }
  }

  async function signOut() {
    $loginStore = new LoginState();
    await replace('/login');
  }

  async function forwardToAuth() {
    if ($loginStore.status === LoginStatus.LOGGED_OUT) {
      $location.includes('signup') ? await replace('/signup') : await replace('/login');
    }
  }

  onMount(async () => {
    forwardToAuth();
  });
  $: {
    if ($loginStore.status === LoginStatus.LOGGED_OUT) {
      forwardToAuth();
    }
  }

  onDestroy(() => {
    channel.close();
  })
</script>

<div class="topBar">
  {#if $loginStore.status === LoginStatus.LOGGED_IN}
    {$loginStore.account}{#if $loginStore.network === 'testnet'}@Testnet{/if}
    |
    <a href={null} on:click={() => signOut()}>Sign out</a>
  {:else}
    <a href={null} on:click={() => replace('/signup')}>Sign up</a>
    |
    <a href={null} on:click={() => replace('/login')}>Log in</a>
  {/if}
</div>
<main>
  <h1>Token Trader</h1>
  {#if $loginStore.status === LoginStatus.LOGGED_IN}
    <p style="align: center">
      <a href={null} on:click={() => replace('/')}>Send token</a> |
      <a href={null} on:click={() => replace('/receive')}>Receive token</a>
    </p>
  {/if}
  <Router
    routes={{
      '/': wrap({
        component: Send,
        props: {
          showSubmissionResult: false,
        },
        conditions: [
          (detail) => {
            return $loginStore.status === LoginStatus.LOGGED_IN;
          },
        ],
      }),
      '/receive': wrap({
        component: Receive,
        props: {
          showSubmissionResult: false,
        },
        conditions: [
          (detail) => {
            return $loginStore.status === LoginStatus.LOGGED_IN;
          },
        ],
      }),
      '/login': Login,
      '/signup': Signup,
      '*': NotFound,
    }}
  />
</main>

<style>
  main {
    text-align: center;
    padding: 0em;
    max-width: 240px;
    margin: 0 auto;
  }

  @media (min-width: 640px) {
    main {
      max-width: none;
    }
  }
</style>
