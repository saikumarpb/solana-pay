import React from 'react';
import { Button, Modal, Spinner } from 'react-bootstrap';
import { AssociatedTokenAccountCreationStatus } from '../Utils/constants';

interface TokenAccCreationModalProps {
  show: boolean;
  handleClose: () => void;
  handleCreateAssociateTokenAcc: () => void;
  tokenAccountCrreationState: AssociatedTokenAccountCreationStatus;
  recieverAddress: string;
}
function TokenAccCreationModal({
  show,
  handleClose,
  recieverAddress,
  handleCreateAssociateTokenAcc,
  tokenAccountCrreationState,
}: TokenAccCreationModalProps) {
  return (
    <Modal show={show} onHide={handleClose} centered>
      <Modal.Header closeButton>
        <Modal.Title> Create associated token account</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {' '}
        <p>
          The reciever {recieverAddress} doesn't have an associated token
          account
          <br />
          <br />
          do you want to create an associated token account for the provided
          destination address ?
        </p>
      </Modal.Body>
      <Modal.Footer>
        <Button
          variant="secondary"
          onClick={handleClose}
          disabled={tokenAccountCrreationState === 'PENDING'}
        >
          No
          {/**
           * TODO : Show error toast on selecting NO
           */}
        </Button>
        <Button
          variant="primary"
          onClick={handleCreateAssociateTokenAcc}
          disabled={tokenAccountCrreationState === 'PENDING'}
        >
          {tokenAccountCrreationState === 'PENDING' ? (
            <Spinner
              as="span"
              animation="border"
              size="sm"
              role="status"
              aria-hidden="true"
            />
          ) : (
            'Continue'
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default TokenAccCreationModal;
