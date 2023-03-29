import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import React from 'react';
import { Container, Nav, Navbar } from 'react-bootstrap';
import { ReactComponent as SolanaLogo } from '../assets/solana.svg';

function Header() {
  return (
    <Navbar bg="dark" variant="dark" sticky="top" expand="lg">
      <Container className="justify-content-center">
        <Navbar.Brand href="#home" className="p-4">
          <SolanaLogo height="30px" width="210px" />
        </Navbar.Brand>
        <Nav className="justify-content-center" activeKey="/home">
          <Nav.Item>
            <WalletMultiButton />
          </Nav.Item>
        </Nav>
      </Container>
    </Navbar>
  );
}

export default Header;
