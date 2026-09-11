import { expect, it } from 'vitest';
import { formData } from '../src/lib/server/http';
it('bounds streamed form bodies without trusting Content-Length', async () => {
  const body = new ReadableStream({
    start(controller) {
      controller.enqueue(new Uint8Array(70_000));
      controller.close();
    },
  });
  const request = new Request('http://localhost/', {
    method: 'POST',
    body,
    duplex: 'half',
  } as RequestInit);
  await expect(formData(request)).rejects.toMatchObject({ status: 413 });
});
it('preserves binary PDF files in multipart forms and applies the supplied upload cap', async () => {
  const form = new FormData();
  form.append('name', 'Sam');
  form.append('resume', new File(['%PDF-1.4\n%%EOF'], 'resume.pdf', { type: 'application/pdf' }));
  const request = () => new Request('http://localhost/', { method: 'POST', body: form });
  const parsed = await formData(request(), 2 * 1024 * 1024 + 65_536);
  expect(parsed.get('name')).toBe('Sam');
  expect(await (parsed.get('resume') as File).text()).toBe('%PDF-1.4\n%%EOF');
  // Model received wire bytes. Cancelling Undici's outbound FormData encoder
  // can race its asynchronous enqueue on some Node versions.
  const encoded = request();
  const bytes = await encoded.arrayBuffer();
  const incoming = new Request('http://localhost/', {
    method: 'POST',
    body: bytes,
    headers: encoded.headers,
  });
  await expect(formData(incoming, 10)).rejects.toMatchObject({ status: 413 });
});
