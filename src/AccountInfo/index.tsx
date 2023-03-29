import React, { createContext, useEffect, useState } from 'react';
import './styles.css';
import {
  Connection,
  GetProgramAccountsFilter,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  Transaction,
} from '@solana/web3.js';
import { Button, Form, Modal } from 'react-bootstrap';
import {
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  getAssociatedTokenAddress,
  getOrCreateAssociatedTokenAccount,
  TokenAccountNotFoundError,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import { SOLANA_LOGO_URI } from '../Utils/constants';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import {
  ENV,
  Strategy,
  TokenInfo,
  TokenListProvider,
} from '@solana/spl-token-registry';
import { Metadata } from '@metaplex-foundation/mpl-token-metadata';
import { WalletSendTransactionError } from '@solana/wallet-adapter-base';

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
  const { publicKey, sendTransaction } = useWallet();
  const [tokenMap, setTokenMap] = useState<Map<string, TokenInfo>>(new Map());
  const [tokenAccounts, setTokenAccounts] = useState<TokenAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<number>(-1);
  const [destAddress, setDestAddress] = useState('');
  const [transferAmount, setTransferAmount] = useState(0);
  const [showTokenAccCreationModal, setShowTokenAccCreationModal] =
    useState(false);

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
          mint: 'SOLANA_MINT',
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

  const handleTokenTransfer = async () => {
    const toWalletPublicKey = new PublicKey(destAddress);

    // Generate a new wallet keypair
    const fromWallet = Keypair.generate();

    const mint = new PublicKey(tokenAccounts[selectedAccount].mint);

    // Get the token account of the fromWallet address, and if it does not exist, create it
    const sourceTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      fromWallet,
      mint,
      publicKey!!
    );

    try {
      // Get the token account of the toWallet address, and if it does not exist, create it
      const destinationTokenAccount = await getOrCreateAssociatedTokenAccount(
        connection,
        fromWallet,
        mint,
        toWalletPublicKey
      );

      const transaction = new Transaction();

      transaction.add(
        createTransferInstruction(
          sourceTokenAccount.address,
          destinationTokenAccount.address,
          publicKey!!,
          transferAmount *
            Math.pow(10, tokenAccounts[selectedAccount].decimalPlaces)
        )
      );

      const signature = await sendTransaction(transaction, connection);
      console.log('Signature', signature);
    } catch (e) {
      if (e instanceof TokenAccountNotFoundError) {
        console.log('from TokenAccountNotFoundError');
        setShowTokenAccCreationModal(true);
      }
    }
  };

  const handleClose = () => {
    setShowTokenAccCreationModal(false);
  };

  const handleCreateAssociateTokenAcc = async () => {
    handleClose();
    const destPublicKey = new PublicKey(destAddress);
    const mintPublicKey = new PublicKey(tokenAccounts[selectedAccount].mint);

    const associatedTokenAddress = await getAssociatedTokenAddress(
      mintPublicKey,
      destPublicKey,
      false
    );

    const transaction = new Transaction();

    transaction.add(
      createAssociatedTokenAccountInstruction(
        publicKey!!,
        associatedTokenAddress,
        destPublicKey,
        mintPublicKey
      )
    );

    const signature = await sendTransaction(transaction, connection).then(() =>
      // TODO: Render a modal to indicate ATA creation successful and ask user to continue with transfer
      handleTokenTransfer()
    );
    console.log('Signature', signature);
  };

  const renderTokenAccountCreationModal = () => (
    <Modal show={showTokenAccCreationModal} onHide={handleClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>Create associated token account</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        The reciever {destAddress} doesn't have an associated token account
        <br />
        <br />
        do you want to create an associated token account for the provided
        destination address ?
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose}>
          No
          {/**
           * TODO : Show error toast on selecting NO
           */}
        </Button>
        <Button variant="primary" onClick={handleCreateAssociateTokenAcc}>
          Yes
        </Button>
      </Modal.Footer>
    </Modal>
  );

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
        <Form.Label>Transfer amount</Form.Label>
        <Form.Control
          type="number"
          value={transferAmount}
          onChange={(e) => setTransferAmount(parseFloat(e.target.value))}
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
      <Button variant="primary" type="button" onClick={handleTokenTransfer}>
        Transfer
      </Button>
      {renderTokenAccountCreationModal()}
    </Form>
  );
}

export default AccountInfo;
