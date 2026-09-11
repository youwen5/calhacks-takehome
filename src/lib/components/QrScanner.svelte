<script lang="ts">
  import { onMount } from 'svelte';
  import QrScanner from 'qr-scanner';
  let { onScan, onClose }: { onScan: (text: string) => void; onClose: () => void } = $props();
  let video: HTMLVideoElement;
  let scanner: QrScanner | undefined;
  let problem = $state(''),
    facing = $state<'environment' | 'user'>('environment');
  onMount(() => {
    let disposed = false;
    scanner = new QrScanner(
      video,
      (result) => {
        onScan(result.data);
      },
      {
        preferredCamera: facing,
        highlightScanRegion: true,
        highlightCodeOutline: true,
        maxScansPerSecond: 5,
      },
    );
    scanner
      .start()
      .then(() => {
        if (disposed) scanner?.destroy();
      })
      .catch(() => {
        if (!disposed)
          problem =
            'Camera unavailable. Allow camera access, use HTTPS or localhost, or enter the pass URL below.';
      });
    return () => {
      disposed = true;
      scanner?.destroy();
    };
  });
  async function scanFile(e: Event) {
    const file = (e.currentTarget as HTMLInputElement).files?.[0];
    if (!file) return;
    try {
      const result = await QrScanner.scanImage(file, { returnDetailedScanResult: true });
      onScan(result.data);
    } catch {
      problem = 'No QR code found in this image. Try a clearer image or enter the pass URL.';
    }
  }
  async function switchCamera() {
    facing = facing === 'environment' ? 'user' : 'environment';
    try {
      await scanner?.setCamera(facing);
    } catch {
      problem = 'Could not switch cameras.';
    }
  }
</script>

<section class="panel scanner">
  <div class="row spread">
    <h2>Scan QR Code</h2>
    <button class="secondary" onclick={onClose}>Close scanner</button>
  </div>
  <video bind:this={video} muted playsinline aria-label="QR scanner camera"></video>
  <div class="row"><button class="secondary" onclick={switchCamera}>Switch camera</button></div>
  <label>Scan a QR image<input type="file" accept="image/*" onchange={scanFile} /></label>
  {#if problem}<p role="status">{problem}</p>{/if}
</section>

<style>
  .scanner {
    margin-bottom: 24px;
  }
  video {
    display: block;
    width: 100%;
    max-height: 360px;
    object-fit: cover;
    background: #111;
    border-radius: 8px;
    margin: 16px 0;
  }
</style>
