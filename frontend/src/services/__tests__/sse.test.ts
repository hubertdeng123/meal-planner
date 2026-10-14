import { describe, expect, it } from 'vitest';
import { SSEParser, readSSE, type SSEMessage } from '../sse';

function parseAll(chunks: string[]): SSEMessage[] {
  const parser = new SSEParser();
  const messages = chunks.flatMap(chunk => parser.feed(chunk));
  return [...messages, ...parser.flush()];
}

function bodyFrom(chunks: (string | Uint8Array)[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(typeof chunk === 'string' ? encoder.encode(chunk) : chunk);
      }
      controller.close();
    },
  });
}

describe('SSEParser', () => {
  it('parses named events with JSON data', () => {
    expect(parseAll(['event: stage\ndata: {"stage":"context"}\n\n'])).toEqual([
      { event: 'stage', data: '{"stage":"context"}' },
    ]);
  });

  it('defaults the event name to "message"', () => {
    expect(parseAll(['data: hi\n\n'])).toEqual([{ event: 'message', data: 'hi' }]);
  });

  it('joins multi-line data with newlines', () => {
    expect(parseAll(['event: x\ndata: line one\ndata: line two\ndata:\n\n'])).toEqual([
      { event: 'x', data: 'line one\nline two\n' },
    ]);
  });

  it('handles CRLF and bare CR line endings', () => {
    expect(parseAll(['event: a\r\ndata: 1\r\n\r\nevent: b\rdata: 2\r\r'])).toEqual([
      { event: 'a', data: '1' },
      { event: 'b', data: '2' },
    ]);
  });

  it('handles a CRLF split across chunks', () => {
    expect(parseAll(['event: a\r', '\ndata: 1\r', '\n\r', '\n'])).toEqual([
      { event: 'a', data: '1' },
    ]);
  });

  it('reassembles frames split at arbitrary points', () => {
    const frame = 'event: thinking\ndata: {"delta":"Hello, world"}\n\nevent: ping\ndata: {}\n\n';
    for (let size = 1; size <= frame.length; size++) {
      const chunks = [];
      for (let i = 0; i < frame.length; i += size) {
        chunks.push(frame.slice(i, i + size));
      }
      expect(parseAll(chunks)).toEqual([
        { event: 'thinking', data: '{"delta":"Hello, world"}' },
        { event: 'ping', data: '{}' },
      ]);
    }
  });

  it('ignores comments, unknown fields and events without data', () => {
    expect(parseAll([': keep-alive\nretry: 1000\nevent: lonely\n\nfoo: bar\ndata: x\n\n'])).toEqual(
      [{ event: 'message', data: 'x' }]
    );
  });

  it('only strips a single leading space from values', () => {
    expect(parseAll(['data:no-space\n\ndata:  two spaces\n\n'])).toEqual([
      { event: 'message', data: 'no-space' },
      { event: 'message', data: ' two spaces' },
    ]);
  });

  it('tracks the last event id', () => {
    expect(parseAll(['id: 7\ndata: a\n\ndata: b\n\n'])).toEqual([
      { event: 'message', data: 'a', id: '7' },
      { event: 'message', data: 'b', id: '7' },
    ]);
  });

  it('dispatches a trailing event on flush', () => {
    expect(parseAll(['event: complete\ndata: {}'])).toEqual([{ event: 'complete', data: '{}' }]);
  });
});

describe('readSSE', () => {
  it('decodes multi-byte characters split across chunks', async () => {
    const bytes = new TextEncoder().encode('event: thinking\ndata: {"delta":"crème brûlée"}\n\n');
    const splitAt = bytes.indexOf(0xc3) + 1;
    const messages: SSEMessage[] = [];
    for await (const message of readSSE(
      bodyFrom([bytes.slice(0, splitAt), bytes.slice(splitAt)])
    )) {
      messages.push(message);
    }
    expect(messages).toEqual([{ event: 'thinking', data: '{"delta":"crème brûlée"}' }]);
  });

  it('strips a leading BOM', async () => {
    const messages: SSEMessage[] = [];
    for await (const message of readSSE(bodyFrom(['\uFEFFdata: x\n\n']))) {
      messages.push(message);
    }
    expect(messages).toEqual([{ event: 'message', data: 'x' }]);
  });

  it('cancels the body when the consumer stops early', async () => {
    let cancelled = false;
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('data: 1\n\n'));
      },
      cancel() {
        cancelled = true;
      },
    });
    for await (const message of readSSE(body)) {
      expect(message.data).toBe('1');
      break;
    }
    expect(cancelled).toBe(true);
  });
});
