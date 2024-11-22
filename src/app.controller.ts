import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import { PDFDocument } from 'pdf-lib';
import puppeteer from 'puppeteer';

@Controller()
export class AppController {
  @Get('generate')
  async generatePdf(@Res() res: Response) {
    try {
      // Launch a headless browser
      const browser = await puppeteer.launch();
      const page = await browser.newPage();

      // Fetch an existing PDF (for example purposes, from the URL)
      const existingPdfBytes = await fetch(
        'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      ).then((res) => res.arrayBuffer());
      const pdfDoc = await PDFDocument.load(existingPdfBytes);
      const pdfBytes = await pdfDoc.save();
      const finalArrayBuffer = Buffer.from(pdfBytes);

      const htmlContent = `
        <html>
          <head>
            <title>PDF Example</title>
          </head>
          <body>
            <h1>Hello, this is a PDF generated from HTML! Chhento</h1>
            <p>This is a test PDF with <strong>raw HTML</strong>.</p>
          </body>
        </html>`;

      // Load the HTML content
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

      // Generate PDF
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20mm',
          bottom: '20mm',
          left: '10mm',
          right: '10mm',
        },
      });

      const pdfsToMerge = [finalArrayBuffer, pdfBuffer];

      // Create a new PDF document to merge the existing and generated PDFs
      const mergedPdf = await PDFDocument.create();

      for (const pdfBytes of pdfsToMerge) {
        const pdf = await PDFDocument.load(pdfBytes);
        const copiedPages = await mergedPdf.copyPages(
          pdf,
          pdf.getPageIndices(),
        );
        copiedPages.forEach((page) => {
          mergedPdf.addPage(page);
        });
      }

      const buf = await mergedPdf.save();

      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename=pdf.pdf',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      });

      res.end(buf);
      await browser.close();
    } catch (error) {
      console.error('Error generating PDF:', error);
      res.status(500).send('Error generating PDF');
    }
  }
}
