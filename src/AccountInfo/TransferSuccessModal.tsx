import React from 'react';
import './styles.css';
import { Modal } from 'react-bootstrap';

interface TransferSuccessModalProps {
  show: boolean;
  handleClose: () => void;
  recieverAddress: string;
  explorerLink: string;
  amount: number;
  tokenName: string;
}

function TransferSuccessModal({
  show,
  explorerLink,
  handleClose,
  recieverAddress,
  amount,
  tokenName,
}: TransferSuccessModalProps) {
  return (
    <Modal
      show={show}
      onHide={handleClose}
      aria-labelledby="contained-modal-title-vcenter"
      centered
    >
      <Modal.Header closeButton>
        <Modal.Title id="contained-modal-title-vcenter">
          Transfer Successful
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="d-flex flex-column">
        <div>
          <p>
            Successfully Transfered {amount} {tokenName} to {recieverAddress}
          </p>
        </div>
        <a target="_blank" href={explorerLink} rel="noreferrer">
          View transaction on solana explorer
        </a>
      </Modal.Body>
      <Modal.Footer>
        <button onClick={handleClose} type="button" className="submit-btn">
          Go back
        </button>
      </Modal.Footer>
    </Modal>
  );
}

export default TransferSuccessModal;
