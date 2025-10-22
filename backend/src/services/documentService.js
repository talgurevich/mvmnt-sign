// Document Service
// Handles document upload, conversion (DOC/DOCX to PDF), and storage

const { PDFDocument } = require('pdf-lib')
const mammoth = require('mammoth')
const pdfParse = require('pdf-parse')
const fs = require('fs').promises
const path = require('path')
const { supabaseAdmin } = require('../config/supabase')

class DocumentService {
  constructor() {
    this.tempDir = path.join(__dirname, '../../temp')
    this.ensureTempDir()
  }

  // Ensure temp directory exists
  async ensureTempDir() {
    try {
      await fs.mkdir(this.tempDir, { recursive: true })
    } catch (error) {
      console.error('Error creating temp directory:', error)
    }
  }

  // Check if file is PDF
  isPDF(filename) {
    return filename.toLowerCase().endsWith('.pdf')
  }

  // Check if file is DOC/DOCX
  isWordDocument(filename) {
    const lower = filename.toLowerCase()
    return lower.endsWith('.doc') || lower.endsWith('.docx')
  }

  // Get file extension
  getFileExtension(filename) {
    return path.extname(filename).toLowerCase()
  }

  // Convert DOC/DOCX to HTML (first step of conversion)
  async convertWordToHTML(buffer) {
    try {
      const result = await mammoth.convertToHtml({ buffer })
      return result.value // HTML string
    } catch (error) {
      console.error('Error converting Word to HTML:', error)
      throw new Error('שגיאה בהמרת מסמך Word')
    }
  }

  // Create PDF from HTML (simple text-based PDF)
  async createPDFFromHTML(html) {
    try {
      const pdfDoc = await PDFDocument.create()
      const page = pdfDoc.addPage([595.28, 841.89]) // A4 size
      const { height } = page.getSize()

      // Simple text extraction from HTML (removes tags)
      const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()

      // Add text to PDF
      page.drawText(text.substring(0, 2000), {
        x: 50,
        y: height - 50,
        size: 12,
        maxWidth: 495
      })

      const pdfBytes = await pdfDoc.save()
      return Buffer.from(pdfBytes)
    } catch (error) {
      console.error('Error creating PDF from HTML:', error)
      throw new Error('שגיאה ביצירת PDF')
    }
  }

  // Validate PDF
  async validatePDF(buffer) {
    try {
      await PDFDocument.load(buffer)
      return true
    } catch (error) {
      return false
    }
  }

  // Get PDF page count
  async getPDFPageCount(buffer) {
    try {
      const pdfDoc = await PDFDocument.load(buffer)
      return pdfDoc.getPageCount()
    } catch (error) {
      console.error('Error getting PDF page count:', error)
      return 0
    }
  }

  // Extract text from PDF
  async extractTextFromPDF(buffer) {
    try {
      const data = await pdfParse(buffer)
      return data.text
    } catch (error) {
      console.error('Error extracting text from PDF:', error)
      return ''
    }
  }

  // Upload file to Supabase Storage
  async uploadToStorage(buffer, filename, bucketName = 'form-templates') {
    try {
      const timestamp = Date.now()
      const ext = this.getFileExtension(filename)
      const newFilename = `${timestamp}-${Math.random().toString(36).substring(7)}${ext}`
      const filePath = `templates/${newFilename}`

      const { data, error } = await supabaseAdmin.storage
        .from(bucketName)
        .upload(filePath, buffer, {
          contentType: 'application/pdf',
          upsert: false
        })

      if (error) {
        console.error('Supabase storage error:', error)
        throw new Error('שגיאה בהעלאת קובץ לאחסון')
      }

      // Get public URL
      const { data: { publicUrl } } = supabaseAdmin.storage
        .from(bucketName)
        .getPublicUrl(filePath)

      return {
        path: filePath,
        url: publicUrl,
        filename: newFilename
      }
    } catch (error) {
      console.error('Error uploading to storage:', error)
      throw error
    }
  }

  // Delete file from Supabase Storage
  async deleteFromStorage(filePath, bucketName = 'form-templates') {
    try {
      const { error } = await supabaseAdmin.storage
        .from(bucketName)
        .remove([filePath])

      if (error) {
        console.error('Error deleting from storage:', error)
        throw new Error('שגיאה במחיקת קובץ מהאחסון')
      }

      return true
    } catch (error) {
      console.error('Error in deleteFromStorage:', error)
      throw error
    }
  }

  // Process uploaded document
  async processDocument(file) {
    try {
      let pdfBuffer = file.buffer
      let originalType = 'pdf'
      let pageCount = 0

      // If it's a Word document, convert to PDF
      if (this.isWordDocument(file.originalname)) {
        originalType = 'docx'
        console.log('Converting Word document to PDF...')

        // Convert Word to HTML
        const html = await this.convertWordToHTML(file.buffer)

        // Create PDF from HTML
        pdfBuffer = await this.createPDFFromHTML(html)
      } else if (this.isPDF(file.originalname)) {
        // Validate PDF
        const isValid = await this.validatePDF(file.buffer)
        if (!isValid) {
          throw new Error('קובץ PDF לא תקין')
        }
      } else {
        throw new Error('סוג קובץ לא נתמך. אנא העלה PDF, DOC או DOCX')
      }

      // Get page count
      pageCount = await this.getPDFPageCount(pdfBuffer)

      // Extract text content
      const textContent = await this.extractTextFromPDF(pdfBuffer)

      // Upload to Supabase Storage
      const storageResult = await this.uploadToStorage(
        pdfBuffer,
        file.originalname.replace(/\.(doc|docx)$/i, '.pdf')
      )

      return {
        originalName: file.originalname,
        originalType,
        pdfPath: storageResult.path,
        pdfUrl: storageResult.url,
        pageCount,
        fileSize: pdfBuffer.length,
        textContent
      }
    } catch (error) {
      console.error('Error processing document:', error)
      throw error
    }
  }

  // Add signature to PDF (for final signed document)
  async addSignatureToPDF(pdfUrl, signatureImageBase64, signerName) {
    try {
      // Fetch the original PDF
      const response = await fetch(pdfUrl)
      const pdfArrayBuffer = await response.arrayBuffer()
      const pdfBuffer = Buffer.from(pdfArrayBuffer)

      // Load the PDF
      const pdfDoc = await PDFDocument.load(pdfBuffer)
      const pages = pdfDoc.getPages()
      const lastPage = pages[pages.length - 1]
      const { width, height } = lastPage.getSize()

      // Convert base64 signature to image
      const signatureImageData = signatureImageBase64.replace(/^data:image\/\w+;base64,/, '')
      const signatureImageBytes = Buffer.from(signatureImageData, 'base64')
      const signatureImage = await pdfDoc.embedPng(signatureImageBytes)

      // Calculate position (bottom right of last page)
      const signatureWidth = 150
      const signatureHeight = 75
      const x = width - signatureWidth - 50
      const y = 100

      // Draw signature image
      lastPage.drawImage(signatureImage, {
        x,
        y,
        width: signatureWidth,
        height: signatureHeight
      })

      // Add date stamp (no names to avoid Hebrew encoding issues)
      const dateStr = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      })
      lastPage.drawText(`Signed on: ${dateStr}`, {
        x,
        y: y - 20,
        size: 9
      })

      const pdfBytes = await pdfDoc.save()
      return Buffer.from(pdfBytes)
    } catch (error) {
      console.error('Error adding signature to PDF:', error)
      throw new Error('שגיאה בהוספת חתימה ל-PDF')
    }
  }

  // Upload signed PDF to storage
  async uploadSignedDocument(buffer, originalFilename) {
    try {
      const timestamp = Date.now()
      // Sanitize filename - remove Hebrew and special characters, keep only alphanumeric, dash, underscore, and extension
      const sanitizedFilename = originalFilename
        .replace(/[^\w\s.-]/g, '') // Remove non-alphanumeric except spaces, dots, dashes
        .replace(/\s+/g, '-') // Replace spaces with dashes
        .toLowerCase()
      const filename = `signed-${timestamp}-${sanitizedFilename || 'document.pdf'}`
      const filePath = `signed-documents/${filename}`

      const { data, error } = await supabaseAdmin.storage
        .from('signed-documents')
        .upload(filePath, buffer, {
          contentType: 'application/pdf',
          upsert: false
        })

      if (error) {
        console.error('Supabase storage error:', error)
        throw new Error('שגיאה בהעלאת מסמך חתום')
      }

      // Get public URL
      const { data: { publicUrl } } = supabaseAdmin.storage
        .from('signed-documents')
        .getPublicUrl(filePath)

      return {
        path: filePath,
        url: publicUrl,
        filename
      }
    } catch (error) {
      console.error('Error uploading signed document:', error)
      throw error
    }
  }
}

module.exports = new DocumentService()
