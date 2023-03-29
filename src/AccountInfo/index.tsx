import React, { useEffect, useState } from 'react';
import './styles.css';
import {
  Connection,
  GetProgramAccountsFilter,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
} from '@solana/web3.js';
import { Button, Form } from 'react-bootstrap';
import {
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  getAssociatedTokenAddress,
  getOrCreateAssociatedTokenAccount,
  TokenAccountNotFoundError,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import {
  AssociatedTokenAccountCreationStatus,
  SOLANA_LOGO_URI,
} from '../Utils/constants';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import {
  ENV,
  Strategy,
  TokenInfo,
  TokenListProvider,
} from '@solana/spl-token-registry';
import { Metadata } from '@metaplex-foundation/mpl-token-metadata';
import TokenAccCreationModal from './TokenAccCreationModal';
import TokenTransferModal from './TokenTransferModal';
import TransferSuccessModal from './TransferSuccessModal';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
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
  const tokenAccInitialState: TokenAccount = {
    balance: 0,
    decimalPlaces: 0,
    mint: '',
    owner: '',
  };
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const [tokenMap, setTokenMap] = useState<Map<string, TokenInfo>>(new Map());
  const [tokenAccounts, setTokenAccounts] = useState<TokenAccount[]>([]);
  const [selectedAccount, setSelectedAccount] =
    useState<TokenAccount>(tokenAccInitialState);
  const [destAddress, setDestAddress] = useState('');
  const [isValidAddress, setIsValidAddress] = useState(true);
  const [isValidAmount, setIsValidAmount] = useState(true);
  const [transferAmount, setTransferAmount] = useState(0);
  const [explorerLink, setExplorerLink] = useState('');
  const [transferStatus, setTransferStatus] = useState(false);

  const [ataStatus, setAtaStatus] =
    useState<AssociatedTokenAccountCreationStatus>('NOT_INITIATED');

  useEffect(() => {
    setTokenAccounts([]);
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

  /**
   * Validates the address provided
   * @param address public wallet address
   */
  const validateSolanaAddress = (address: string) => {
    try {
      let publicKey = new PublicKey(address);
      let isSolana = PublicKey.isOnCurve(publicKey);
      setIsValidAddress(() => isSolana);

      return isSolana;
    } catch (error) {
      setIsValidAddress(() => false);
      return false;
    }
  };

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
          decimalPlaces: 10,
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

    accounts.forEach(async (account) => {
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
    if (!publicKey) {
      toast.error('Connect the wallet to make a transfer', {
        position: 'bottom-right',
        autoClose: 3000,
      });
      return;
    }

    if (!selectedAccount.mint) {
      toast.error('Select a token to make a transfer', {
        position: 'bottom-right',
        autoClose: 3000,
      });
      return;
    }
    // validate transfer amount
    transferAmount > selectedAccount.balance && setIsValidAmount(false);
    try {
      if (validateSolanaAddress(destAddress)) {
        if (selectedAccount.name === 'Solana') {
          const transaction = new Transaction();
          const recipientPubKey = new PublicKey(destAddress);

          const sendSolInstruction = SystemProgram.transfer({
            fromPubkey: publicKey!!,
            toPubkey: recipientPubKey,
            lamports: LAMPORTS_PER_SOL * transferAmount,
          });

          transaction.add(sendSolInstruction);
          sendTransaction(transaction, connection)
            .then((sig) => {
              setExplorerLink(
                `https://explorer.solana.com/tx/${sig}?cluster=devnet`
              );
              setTransferStatus(true);
            })
            .catch((e) => {
              if (e instanceof WalletSendTransactionError) {
                toast.error('Transaction failed', { position: 'bottom-right' });
              }
            });
        }

        const toWalletPublicKey = new PublicKey(destAddress);

        // Generate a new wallet keypair
        const fromWallet = Keypair.generate();

        const mint = new PublicKey(selectedAccount?.mint ?? '');

        // Get the token account of the fromWallet address, and if it does not exist, create it
        const sourceTokenAccount = await getOrCreateAssociatedTokenAccount(
          connection,
          fromWallet,
          mint,
          publicKey!!
        );

        try {
          // Get the token account of the toWallet address, and if it does not exist, create it
          const destinationTokenAccount =
            await getOrCreateAssociatedTokenAccount(
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
              transferAmount * Math.pow(10, selectedAccount?.decimalPlaces ?? 0)
            )
          );

          await sendTransaction(transaction, connection).then((data) => {
            setExplorerLink(
              `https://explorer.solana.com/tx/${data}?cluster=devnet`
            );
            setTransferStatus(true);
          });
          setSelectedAccount(tokenAccInitialState);
        } catch (e) {
          if (e instanceof TokenAccountNotFoundError) {
            console.log('from TokenAccountNotFoundError');
            setAtaStatus('INITIALIZED');
          }
        }
      }
    } catch (e) {
      if (e instanceof WalletSendTransactionError) {
        toast.error('Transaction failed', { position: 'bottom-right' });
      }
    }
  };

  const handleClose = () => {
    setAtaStatus('NOT_INITIATED');
  };

  const handleCreateAssociateTokenAcc = async () => {
    setAtaStatus('PENDING');
    const destPublicKey = new PublicKey(destAddress);
    const mintPublicKey = new PublicKey(selectedAccount?.mint ?? '');

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

    const signature = await sendTransaction(transaction, connection).then(
      (data) => {
        setAtaStatus('SUCCESS');
        // TODO: Render a modal to indicate ATA creation successful and ask user to continue with transfer
        setExplorerLink(
          `https://explorer.solana.com/tx/${data}?cluster=devnet`
        );
      }
    );
    console.log('Signature', signature);
  };

  return (
    <>
      <h1 className="text-white">Solana Pay</h1>
      <h4 className=" footer">Connect | Approve | Transfer </h4>

      <Form className="form p-4">
        <Form.Select
          className="my-3"
          value={JSON.stringify(selectedAccount)}
          onChange={(e) => {
            console.log(selectedAccount);
            setSelectedAccount(
              JSON.parse(e.target.value) as unknown as TokenAccount
            );
          }}
        >
          <option key={-1} value={-1}>
            Select token account
          </option>
          {tokenAccounts.map((tokenAccount, index) => (
            <option key={index} value={JSON.stringify(tokenAccount)}>
              {tokenAccount.name ?? `Token-${tokenAccount.mint.slice(0, 10)}`}
            </option>
          ))}
        </Form.Select>

        <Form.Group className="mb-3 text-white">
          <Form.Label>Available Balance</Form.Label>
          <Form.Control
            type="text"
            placeholder="Available Balance"
            value={selectedAccount?.balance ?? '--'}
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
            onChange={(e) => {
              setIsValidAmount(true);
              setTransferAmount(parseFloat(e.target.value));
            }}
          />
        </Form.Group>

        {!isValidAmount && (
          <div className="mb-3 text-light border rounded border-danger text-center">
            Invalid transfer amount
          </div>
        )}

        <Form.Group className="mb-3 text-white">
          <Form.Label>Reciever Address</Form.Label>
          <Form.Control
            type="text"
            placeholder="Enter reciever address"
            value={destAddress}
            onChange={(e) => {
              setIsValidAddress(true);
              setDestAddress(e.target.value);
            }}
          />
        </Form.Group>
        {!isValidAddress && (
          <div className="mb-3 text-light border rounded border-danger text-center">
            Invalid wallet address
          </div>
        )}
        <Button
          variant="primary"
          type="button"
          onClick={handleTokenTransfer}
          className="submit-btn w-100"
        >
          Transfer
        </Button>
        <TokenAccCreationModal
          show={ataStatus === 'INITIALIZED'}
          handleClose={handleClose}
          handleCreateAssociateTokenAcc={handleCreateAssociateTokenAcc}
          recieverAddress={destAddress}
          tokenAccountCrreationState={ataStatus}
        />
        <TokenTransferModal
          explorerLink={explorerLink}
          handleClose={handleClose}
          show={ataStatus === 'SUCCESS'}
          handleTransfer={() => {
            setAtaStatus('COMPLETED');
            handleTokenTransfer();
          }}
          recieverAddress={destAddress}
        />
        <TransferSuccessModal
          explorerLink={explorerLink}
          amount={transferAmount}
          recieverAddress={destAddress}
          show={transferStatus}
          handleClose={() => {
            setTransferStatus(false);
          }}
          tokenName={selectedAccount.name ?? `Token-${selectedAccount.mint}`}
        />
      </Form>
      <p className=" footer">Currently works for devnet only !!! </p>
      <ToastContainer />
    </>
  );
}

export default AccountInfo;
