import React from 'react';
import { Button, Modal } from 'react-bootstrap';

interface TokenTransferModalProps {
  show: boolean;
  handleClose: () => void;
  handleTransfer: () => void;
  recieverAddress: string;
  explorerLink: string;
}

function TokenTransferModal({
  show,
  handleClose,
  handleTransfer,
  recieverAddress,
  explorerLink,
}: TokenTransferModalProps) {
  return (
    <div>
      <Modal show={show} onHide={handleClose} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            Associated token account creation successful
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Associated token account created successfully for reciever
          {recieverAddress}
          <br />
          <a target="_blank" href={explorerLink} rel="noreferrer">
            View transaction on solana explorer
          </a>
          <br />
          Proceed to transfer ?
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleClose}>
            No
            {/**
             * TODO : Show error toast on selecting NO
             */}
          </Button>
          <Button variant="primary" onClick={handleTransfer}>
            Yes
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default TokenTransferModal;
