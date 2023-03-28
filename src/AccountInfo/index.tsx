import React, { createContext, useEffect, useState } from 'react';
import './styles.css';
import {
  Connection,
  GetProgramAccountsFilter,
  LAMPORTS_PER_SOL,
  PublicKey,
} from '@solana/web3.js';
import { Button, Form } from 'react-bootstrap';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { SOLANA_LOGO_URI } from '../Utils/constants';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import {
  ENV,
  Strategy,
  TokenInfo,
  TokenListProvider,
} from '@solana/spl-token-registry';
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
  const [selectedAccount, setSelectedAccount] = useState<number>(-1);
  const [destAddress, setDestAddress] = useState('');

  useEffect(() => {
    setTokenAccounts([]);
    setSelectedAccount(-1);
    setDestAddress('');
  }, [publicKey]);

  useEffect(() => {
    new TokenListProvider().resolve(Strategy.Static).then((tokens) => {
      const tokenList = tokens.filterByChainId(ENV.Devnet).getList();

      setTokenMap(
        tokenList.reduce((map, item) => {
          map.set(item.address, item);
          return map;
        }, new Map())
      );
    });
  }, []);

  async function getTokenAccounts(
    wallet: string,
    solanaConnection: Connection
  ) {
    // Add solana to list of token accounts
    if (publicKey) {
      connection.getBalance(publicKey).then((solBalance) => {
        let solTokenAccount: TokenAccount = {
          owner: publicKey.toString(),
          mint: '',
          balance: solBalance / LAMPORTS_PER_SOL,
          decimalPlaces: 9,
          name: 'Solana',
          symbol: 'SOL',
          logoURI: SOLANA_LOGO_URI,
        };

        setTokenAccounts((prevData) => [...prevData, solTokenAccount]);
      });
    }

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
      let tokenAccount: TokenAccount = {
        owner: '',
        mint: '',
        balance: 0,
        decimalPlaces: 0,
      };

      //Parse the account data
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

      // Note : This is a workaround to fetch token metadata from solana
      // Solana is still building a decentralized way to fetch token metadata at the time of writing this code

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
    <Form className="form">
      <Form.Select
        className="my-3"
        value={selectedAccount}
        onChange={(e) => {
          setSelectedAccount(e.target.value as unknown as number);
        }}
      >
        <option key={-1} value={-1}>
          Select token account
        </option>
        {tokenAccounts.map((tokenAccount, index) => (
          <option key={index} value={index}>
            {tokenAccount.name ?? `Token-${tokenAccount.mint.slice(0, 10)}`}
          </option>
        ))}
      </Form.Select>

      <Form.Group className="mb-3 text-white">
        <Form.Label>Available Balance</Form.Label>
        <Form.Control
          type="text"
          placeholder="Available Balance"
          value={tokenAccounts[selectedAccount]?.balance ?? '--'}
          aria-label="Disabled input example"
          disabled
          readOnly
        />
      </Form.Group>

      <Form.Group className="mb-3 text-white">
        <Form.Label>Reciever Address</Form.Label>
        <Form.Control
          type="text"
          placeholder="Enter reciever address"
          value={destAddress}
          onChange={(e) => {
            setDestAddress(e.target.value);
          }}
        />
      </Form.Group>
      <Button variant="primary" type="submit">
        Submit
      </Button>
    </Form>
  );
}

export default AccountInfo;
