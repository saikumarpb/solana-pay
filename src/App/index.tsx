import React from 'react';
import './styles.css';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import WalletContextProvider from '../components/WalletContextProvider';
import AccountInfo from '../AccountInfo';

function App() {
  return (
    <div className="app">
      <WalletContextProvider cluster={'devnet'}>
        <WalletMultiButton />
        <AccountInfo />
      </WalletContextProvider>
    </div>
  );
}

// Green : 1ED79A
// Black : 161B19
// Grey : 1E2423
// White : FFFFFF
// Disabled Green : 698582

export default App;
