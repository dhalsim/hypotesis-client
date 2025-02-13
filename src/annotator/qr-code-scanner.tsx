import { Html5QrcodeScanner } from "html5-qrcode";

import type { Destroyable } from "../types/annotator";

type QRCodeScannerOptions = {
  onScanSuccess: (data: string) => void;
  onScanError: (error: string | Error) => void;
};

export class QRCodeScanner implements Destroyable {
  private scanner: Html5QrcodeScanner | null = null;
  private element: HTMLElement;
  private options: QRCodeScannerOptions;

  constructor(parentElement: HTMLElement, options: QRCodeScannerOptions) {
    this.options = options;
    
    this.element = document.createElement('div');
    this.element.id = 'hypothesis-qr-scanner';
    
    // Create the inner element for the QR scanner
    const qrElement = document.createElement('div');
    qrElement.id = 'qr-reader';
    qrElement.style.width = '300px';
    qrElement.style.height = '300px';
    
    this.element.appendChild(qrElement);
    
    // Add positioning styles
    this.element.style.position = 'fixed';
    this.element.style.zIndex = '9999';
    this.element.style.top = '50%';
    this.element.style.left = '50%';
    this.element.style.transform = 'translate(-50%, -50%)';
    this.element.style.backgroundColor = 'white';
    this.element.style.border = '1px solid #ccc';
    this.element.style.boxShadow = '2px 2px 20px rgba(0, 0, 0, 0.8)';
    
    // Initial hidden state
    this.element.style.visibility = 'hidden';
    
    // Add to parent
    parentElement.appendChild(this.element);
  }

  private _initializeScanner() {
    const readerDiv = document.getElementById('qr-reader');
    
    if (!readerDiv) {
      console.error('QR reader element not found');
      return;
    }

    this.scanner = new Html5QrcodeScanner('qr-reader', {
      fps: 10,
      qrbox: { width: 250, height: 250 },
    }, false);

    this.scanner.render(this.options.onScanSuccess, this.options.onScanError);
  }

  show() {
    this.element.style.visibility = 'visible';

    this._initializeScanner();
  }

  destroy() {
    if (this.scanner) {
      this.scanner.clear();
    }
    
    this.element.style.visibility = 'hidden';
  }
}