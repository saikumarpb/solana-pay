import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import React, { useEffect, useState } from 'react';

import {
  Connection,
  GetProgramAccountsFilter,
  PublicKey,
} from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { ENV, TokenInfo, TokenListProvider } from '@solana/spl-token-registry';

import { Metadata } from '@metaplex-foundation/mpl-token-metadata';

interface TokenAccount {
  owner: string;
  mint: string;
  balance: number;
  decimalPlaces: number;
  name?: string;
  symbol?: string;
  logoURI?: string;
}

function AccountInfo() {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const [tokenMap, setTokenMap] = useState<Map<string, TokenInfo>>(new Map());
  const [tokenAccounts, setTokenAccounts] = useState<TokenAccount[]>([]);

  useEffect(() => {
    new TokenListProvider().resolve().then((tokens) => {
      const tokenList = tokens.filterByChainId(ENV.Devnet).getList();

      setTokenMap(
        tokenList.reduce((map, item) => {
          map.set(item.address, item);
          return map;
        }, new Map())
      );
    });
  }, [setTokenMap]);

  async function getTokenAccounts(
    wallet: string,
    solanaConnection: Connection
  ) {
    const filters: GetProgramAccountsFilter[] = [
      {
        dataSize: 165, //size of account (bytes)
      },
      {
        memcmp: {
          offset: 32, //location of our query in the account (bytes)
          bytes: wallet, //our search criteria, a base58 encoded string
        },
      },
    ];

    const accounts = await solanaConnection.getParsedProgramAccounts(
      TOKEN_PROGRAM_ID, //SPL Token Program, new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA")
      { filters: filters }
    );

    accounts.forEach(async (account, i) => {
      //Parse the account data
      let tokenAccount: TokenAccount = {
        owner: '',
        mint: '',
        balance: 0,
        decimalPlaces: 0,
      };

      const parsedAccountInfo: any = account.account.data;
      const mintAddress: string = parsedAccountInfo['parsed']['info']['mint'];
      const decimals =
        parsedAccountInfo['parsed']['info']['tokenAmount']['decimals'];
      const tokenBalance: number =
        parsedAccountInfo['parsed']['info']['tokenAmount']['uiAmount'];

      tokenAccount.decimalPlaces = decimals;

      tokenAccount.balance = tokenBalance;
      tokenAccount.owner = account.pubkey.toString();
      tokenAccount.mint = mintAddress;

      // Try fetching token info from Metadata
      try {
        const mintPubKey = new PublicKey(mintAddress);
        let pda = await Metadata.getPDA(mintPubKey);
        let res = await Metadata.load(connection, pda);

        tokenAccount.name = res.data.data.name;
        tokenAccount.logoURI = res.data.data.uri;
        tokenAccount.symbol = res.data.data.symbol;
      } catch (e) {
        console.error(e);
      }

      // Try fetching token info from sol-token-registry

      try {
        const token = tokenMap.get(mintAddress);
        if (token) {
          tokenAccount.name = tokenAccount.name ?? token.name;
          tokenAccount.decimalPlaces = token.decimals;
          tokenAccount.symbol = token.symbol;
          tokenAccount.logoURI = token.logoURI;
        }
      } catch (e) {
        console.error(e);
      }

      setTokenAccounts((prevState) => [...prevState, tokenAccount]);

      //Log results
      console.log('Token Account', tokenAccount);
    });
  }

  useEffect(() => {
    if (!connection || !publicKey) return;
    console.log('Public key ', publicKey.toString());

    getTokenAccounts(publicKey.toString(), connection);

    connection.getParsedProgramAccounts(publicKey).then((data) => {
      console.log(data.toString());
    });
  }, [connection, publicKey]);

  return (
    <div className="text-white">
      {tokenAccounts.map((tokenAcc, index) => (
        <div key={index}>
          <span>{tokenAcc.name ?? 'Unnamed token'}</span>
          <span>{tokenAcc.symbol ?? 'xxx'}</span>
        </div>
      ))}
    </div>
  );
}

export default AccountInfo;
