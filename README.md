# Token Trader

<img src="./public/images/logo/android-chrome-512x512.png"
    alt="Token Trader App Logo"
    style="height: 100px;"    
/>

## Table of Contents

- [About](#about)
- [Screenshots](#screenshots)
- [Instructions](#instructions)
- [Fees](#fees)
- [License](#license)
- [Website](#website)
- [Contact](#contact)

## About <a name = "about"></a>

Token Trader is a decentralized application browser extension that allows users to trade an NFT or a fungible token in return for HBAR, securely and easily. The dApp supports NFTs with royalties, as well as fungible tokens such as GoMint tokens. Token Trader is available for Chrome and Brave in the Chrome Web Store.

## Screenshots <a name = "screenshots"></a>

<img src="./src/assets/screenshots/send-token.png"
    alt="Token Trader Send Token Form"
    style="height: 500px;"
/>
<img src="./src/assets/screenshots/receive-token.png"
    alt="Token Trader Receive Token Form"
    style="height: 500px;"
/>

## Instructions <a name = "instructions"></a>

### Send a token
Once logged in, fill up the form with the details of the trade, enter your password and submit. Copy the code that appears and send it to your trade party.

### Receive a token
Click on `Receive token` and paste the code you received from your trade party. The details of the trade should appear on screen. Review the trade, then enter your password and submit the form to perform the trade. Token association is performed automatically if needed, so there's no need to think about it.

## Fees <a name = "fees"></a>

- For trades below a 1000 HBAR the fee is 1% paid by the receiver of the token
- For trades above a 1000 HBAR the fee is fixed to 10 HBAR
- For trades of 0 HBAR the fee is fixed to 0.01 HBAR

In addition, [Hedera fees](https://hedera.com/fees) for executing a transaction and (if needed) for token association also apply.

## Security <a name = "security"></a>

Token Trader is a completely non-custodial dApp. The private key is encrypted using AES and a salted password of at least 12 characters. A password is required in order to send or receive tokens.

To clear a record of an account from the extension records, or to clear all records, go to the options page, available by right clicking the extension icon.

## License <a name = "license"></a>

The code for Token Trader is provided for transparency, so people in the community could review it. Using the code or parts of it in any way is prohibited, without explicit permission from the author.

## Website <a name = "website"></a>
[token-trader.netlify.app](https://token-trader.netlify.app/)

## Contact <a name = "contact"></a>

tokentraderapp at gmail dot com
