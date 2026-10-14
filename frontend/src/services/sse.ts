/**
 * Minimal Server-Sent Events parser for `fetch()` response bodies.
 *
 * Implements the parts of the WHATWG event-stream format we rely on: named events, multi-line
 * `data:`, comments, `id:`, and LF / CRLF / CR line endings split across arbitrary chunks.
 */

export interface SSEMessage {
  event: string;
  data: string;
  id?: string;
}

export class SSEParser {
  private buffer = '';
  private pendingCR = false;
  private eventType = '';
  private dataLines: string[] = [];
  private lastEventId: string | undefined;

  /** Feed a decoded text chunk; returns every message completed by it. */
  feed(chunk: string): SSEMessage[] {
    const messages: SSEMessage[] = [];
    let text = chunk;

    if (this.pendingCR) {
      this.pendingCR = false;
      if (text.startsWith('\n')) {
        text = text.slice(1);
      }
    }

    this.buffer += text;

    let start = 0;
    for (let i = 0; i < this.buffer.length; i++) {
      const char = this.buffer[i];
      if (char !== '\n' && char !== '\r') {
        continue;
      }
      const line = this.buffer.slice(start, i);
      if (char === '\r') {
        if (i + 1 === this.buffer.length) {
          // A CR at the end of a chunk may be the first half of a CRLF.
          this.pendingCR = true;
        } else if (this.buffer[i + 1] === '\n') {
          i++;
        }
      }
      start = i + 1;
      const message = this.processLine(line);
      if (message) {
        messages.push(message);
      }
    }
    this.buffer = this.buffer.slice(start);
    return messages;
  }

  /** Dispatch a trailing event if the stream ended without a final blank line. */
  flush(): SSEMessage[] {
    const messages: SSEMessage[] = [];
    if (this.buffer) {
      const message = this.processLine(this.buffer);
      this.buffer = '';
      if (message) {
        messages.push(message);
      }
    }
    const message = this.dispatch();
    if (message) {
      messages.push(message);
    }
    return messages;
  }

  private processLine(line: string): SSEMessage | null {
    if (line === '') {
      return this.dispatch();
    }
    if (line.startsWith(':')) {
      return null;
    }

    const colon = line.indexOf(':');
    const field = colon === -1 ? line : line.slice(0, colon);
    let value = colon === -1 ? '' : line.slice(colon + 1);
    if (value.startsWith(' ')) {
      value = value.slice(1);
    }

    switch (field) {
      case 'event':
        this.eventType = value;
        break;
      case 'data':
        this.dataLines.push(value);
        break;
      case 'id':
        if (!value.includes('\0')) {
          this.lastEventId = value;
        }
        break;
      default:
        break;
    }
    return null;
  }

  private dispatch(): SSEMessage | null {
    const eventType = this.eventType;
    const dataLines = this.dataLines;
    this.eventType = '';
    this.dataLines = [];

    if (dataLines.length === 0) {
      return null;
    }
    const message: SSEMessage = { event: eventType || 'message', data: dataLines.join('\n') };
    if (this.lastEventId !== undefined) {
      message.id = this.lastEventId;
    }
    return message;
  }
}

/** Read an event-stream body to completion, yielding each message as it arrives. */
export async function* readSSE(body: ReadableStream<Uint8Array>): AsyncGenerator<SSEMessage> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  const parser = new SSEParser();
  let finished = false;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        finished = true;
        break;
      }
      yield* parser.feed(decoder.decode(value, { stream: true }));
    }
    yield* parser.feed(decoder.decode());
    yield* parser.flush();
  } finally {
    if (!finished) {
      // Consumer stopped early or the read failed: release the underlying connection.
      reader.cancel().catch(() => undefined);
    }
  }
}
