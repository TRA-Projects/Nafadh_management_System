import { HttpErrorResponse } from '@angular/common/http';

import {
  extractApiErrorMessage,
  isSupportTicketWorthyError,
  getNormalizedHttpErrorStatus,
} from './api-error.util';
import { messageFromUnknown } from '../store/ui-async/ui-async.utils';
import { formatNetworkUnreachableUserMessage } from '../errors/support-ticket.util';

describe('network unreachable vs support ticket messaging', () => {
  it('does not treat status 0 as support-ticket-worthy', () => {
    expect(isSupportTicketWorthyError({ status: 0, message: 'x', ticketId: 'JS-fake' })).toBe(false);
    expect(getNormalizedHttpErrorStatus({ status: 0, message: 'x' })).toBe(0);
  });

  it('shows connectivity copy for status 0 even if a ticket id is present', () => {
    const msg = messageFromUnknown(
      {
        status: 0,
        message: 'Something went wrong. Contact NAFADH support with ticket JS-x.',
        ticketId: 'JS-x',
      },
      'fallback'
    );
    expect(msg).toBe(formatNetworkUnreachableUserMessage());
    expect(msg.toLowerCase()).not.toContain('ticket');
  });

  it('still shows a support ticket message for server 500 with ticket id', () => {
    const msg = messageFromUnknown(
      {
        status: 500,
        message: 'Internal error',
        ticketId: 'JS-20260101-120000-ABCD',
        occurredAtUtc: '2026-01-01T12:00:00.000Z',
      },
      'fallback'
    );
    expect(msg.toLowerCase()).toContain('ticket');
    expect(msg).toContain('JS-20260101-120000-ABCD');
  });

  it('reads attachment download Message and error bodies', () => {
    const fromMessage = new HttpErrorResponse({
      status: 403,
      error: { Message: 'You do not have access to this attachment.' },
    });
    const fromError = new HttpErrorResponse({
      status: 403,
      error: { error: 'You do not have access to this attachment.' },
    });
    expect(extractApiErrorMessage(fromMessage)).toBe('You do not have access to this attachment.');
    expect(extractApiErrorMessage(fromError)).toBe('You do not have access to this attachment.');
  });
});
