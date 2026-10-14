import { useState } from 'react';
import { ChipInput } from '../ui/ChipInput';
import { ModalShell } from '../ui/ModalShell';
import { isValidEmail } from '../../utils/grocery';

interface EmailListDialogProps {
  sending: boolean;
  onSend: (extraEmails: string[]) => void;
  onClose: () => void;
}

export function EmailListDialog({ sending, onSend, onClose }: EmailListDialogProps) {
  const [emails, setEmails] = useState<string[]>([]);
  const invalid = emails.filter(email => !isValidEmail(email));

  return (
    <ModalShell
      size="sm"
      title="Email this list"
      description="It always goes to you. Add anyone else who is doing the shopping."
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={sending || invalid.length > 0}
            onClick={() => onSend(emails)}
          >
            {sending
              ? 'Sending…'
              : emails.length
                ? `Send to ${emails.length + 1} people`
                : 'Send to me'}
          </button>
        </>
      }
    >
      <ChipInput
        label="Also send to"
        values={emails}
        onChange={setEmails}
        placeholder="name@example.com"
        hint="Press Enter or comma after each address."
      />
      {invalid.length > 0 && (
        <p className="mt-2 text-sm text-red-600" role="alert">
          {invalid.length === 1
            ? `${invalid[0]} doesn't look like an email address.`
            : `${invalid.length} addresses don't look right.`}
        </p>
      )}
    </ModalShell>
  );
}
