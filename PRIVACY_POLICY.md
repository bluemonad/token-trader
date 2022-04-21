Chrome Web Store & Mozilla Add-on Store & Microsoft Edge Add-on Store Privacy Policies.
=======================================================================================

Introduction
============

Token Trader is a browser extension that allows people to trade fungible and
non-fungible tokens for HBAR on the Hedera network.

Information We Collect
======================

When users sign up, they are asked to enter their Hedera network account and private key. The key is encrypted with AES using an AES key that is generated by a salted password of at least 12 characters. The AES key is not saved anywhere so a valid password is required to decrypt the private key. Every operation on the Hedera network requires that the user enter their password before execution. No other data is collected.

How it uses cookies
===================

It does not use any cookies.

Permissions
===========

The extension requires the following permissions:
- __activeTab__: this is required to show the app in a new window properly
- __tabs__: this is required to open the app in a new window

Local Storage
=============

Accounts data is saved in local storage (`localstorage`). Data should persist until the user empties their browser's cache, or in some cases if the browser frees up space by removing it. Users are responsible to keep record of their private keys and should be aware that `localstorage` data is not guaranteed permanence. Users may choose to clear their account record through the `Options` page, or to delete all account records.