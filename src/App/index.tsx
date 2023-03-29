import React from 'react';
import './styles.css';
import WalletContextProvider from '../components/WalletContextProvider';
import AccountInfo from '../AccountInfo';
import Header from '../Header';

function App() {
  return (
    <>
      <WalletContextProvider cluster={'devnet'}>
        <Header />
        <div className="app">
          <AccountInfo />
        </div>
      </WalletContextProvider>
    </>
  );
}

// Green : 1ED79A
// Black : 161B19
// Grey : 1E2423
// White : FFFFFF
// Disabled Green : 698582

export default App;
