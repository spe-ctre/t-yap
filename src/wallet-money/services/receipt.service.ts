// src/services/receipt.service.ts

import PDFDocument from 'pdfkit';
import { Readable } from 'stream';

interface TransferReceiptData {
  transferId: string;
  reference: string;
  amount: number;
  fee: number;
  totalDeducted: number;
  sender: {
    name: string;
    email: string;
  };
  recipient: {
    name: string;
    email: string;
  };
  description?: string;
  timestamp: Date;
  status: string;
}

export class ReceiptService {
  /**
   * Generate PDF receipt for a transfer
   */
  static async generateTransferReceipt(data: TransferReceiptData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        const chunks: Buffer[] = [];

        // Collect PDF chunks
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Header
        doc
          .fontSize(20)
          .font('Helvetica-Bold')
          .text('T-YAP TRANSFER RECEIPT', { align: 'center' })
          .moveDown(0.5);

        doc
          .fontSize(10)
          .font('Helvetica')
          .text('Transport & Payment Application', { align: 'center' })
          .moveDown(2);

        // Status Badge
        const statusColor = data.status === 'COMPLETED' ? '#10B981' : '#EF4444';
        doc
          .fontSize(12)
          .fillColor(statusColor)
          .text(`Status: ${data.status}`, { align: 'center' })
          .fillColor('#000000')
          .moveDown(2);

        // Transaction Details Box
        const startY = doc.y;
        doc
          .rect(50, startY, 495, 200)
          .stroke();

        // Left Column - Transaction Info
        doc
          .fontSize(10)
          .font('Helvetica-Bold')
          .text('TRANSACTION DETAILS', 70, startY + 20);

        doc.font('Helvetica').fontSize(9);
        
        doc.text('Reference:', 70, startY + 45);
        doc.font('Helvetica-Bold').text(data.reference, 200, startY + 45);

        doc.font('Helvetica').text('Transfer ID:', 70, startY + 65);
        doc.font('Helvetica-Bold').text(data.transferId.slice(0, 16) + '...', 200, startY + 65);

        doc.font('Helvetica').text('Date & Time:', 70, startY + 85);
        doc.font('Helvetica-Bold').text(
          new Date(data.timestamp).toLocaleString('en-NG', {
            dateStyle: 'medium',
            timeStyle: 'short',
          }),
          200,
          startY + 85
        );

        doc.font('Helvetica').text('Description:', 70, startY + 105);
        doc.font('Helvetica-Bold').text(
          data.description || 'N/A',
          200,
          startY + 105,
          { width: 300 }
        );

        // Sender & Recipient Section
        doc.moveDown(4);
        const sectionY = doc.y;

        // Sender Box
        doc
          .rect(50, sectionY, 240, 120)
          .stroke();

        doc
          .fontSize(10)
          .font('Helvetica-Bold')
          .fillColor('#1F2937')
          .text('FROM (SENDER)', 70, sectionY + 15);

        doc.fontSize(9).font('Helvetica').fillColor('#000000');
        doc.text('Name:', 70, sectionY + 40);
        doc.font('Helvetica-Bold').text(data.sender.name, 70, sectionY + 55, { width: 200 });

        doc.font('Helvetica').text('Email:', 70, sectionY + 75);
        doc.font('Helvetica-Bold').text(data.sender.email, 70, sectionY + 90, { width: 200 });

        // Recipient Box
        doc
          .rect(305, sectionY, 240, 120)
          .stroke();

        doc
          .fontSize(10)
          .font('Helvetica-Bold')
          .fillColor('#1F2937')
          .text('TO (RECIPIENT)', 325, sectionY + 15);

        doc.fontSize(9).font('Helvetica').fillColor('#000000');
        doc.text('Name:', 325, sectionY + 40);
        doc.font('Helvetica-Bold').text(data.recipient.name, 325, sectionY + 55, { width: 200 });

        doc.font('Helvetica').text('Email:', 325, sectionY + 75);
        doc.font('Helvetica-Bold').text(data.recipient.email, 325, sectionY + 90, { width: 200 });

        // Amount Section
        doc.moveDown(4);
        const amountY = doc.y;

        doc
          .rect(50, amountY, 495, 100)
          .fillAndStroke('#F3F4F6', '#E5E7EB');

        doc
          .fontSize(10)
          .font('Helvetica-Bold')
          .fillColor('#1F2937')
          .text('AMOUNT BREAKDOWN', 70, amountY + 15);

        doc.fontSize(11).font('Helvetica').fillColor('#000000');
        
        doc.text('Transfer Amount:', 70, amountY + 40);
        doc.font('Helvetica-Bold').text(`₦${data.amount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`, 400, amountY + 40, { align: 'right' });

        doc.font('Helvetica').text('Transaction Fee:', 70, amountY + 60);
        doc.font('Helvetica-Bold').text(`₦${data.fee.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`, 400, amountY + 60, { align: 'right' });

        // Total Line
        doc
          .moveTo(70, amountY + 75)
          .lineTo(525, amountY + 75)
          .stroke();

        doc
          .fontSize(12)
          .font('Helvetica-Bold')
          .fillColor('#DC2626')
          .text('Total Deducted:', 70, amountY + 80);
        
        doc.text(
          `₦${data.totalDeducted.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`,
          400,
          amountY + 80,
          { align: 'right' }
        );

        // Footer
        doc
          .moveDown(3)
          .fontSize(8)
          .font('Helvetica')
          .fillColor('#6B7280')
          .text(
            'This is a computer-generated receipt and does not require a signature.',
            { align: 'center' }
          )
          .moveDown(0.5)
          .text('For support, contact: support@t-yap.com | +234 XXX XXX XXXX', {
            align: 'center',
          })
          .moveDown(0.5)
          .text(`Generated on: ${new Date().toLocaleString('en-NG')}`, {
            align: 'center',
          });

        // Finalize PDF
        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Generate receipt filename
   */
  static generateReceiptFilename(reference: string): string {
    const timestamp = new Date().toISOString().split('T')[0];
    return `transfer-receipt-${reference}-${timestamp}.pdf`;
  }
}