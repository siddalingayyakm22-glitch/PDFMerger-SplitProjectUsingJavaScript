const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { PDFDocument } = require('pdf-lib');

const app = express();
const port = 3000;


// ==========================================
// FOLDERS
// ==========================================

const uploadFolder = path.join(__dirname, 'uploads');
const outputFolder = path.join(__dirname, 'output');


// Create uploads folder if it doesn't exist
if (!fs.existsSync(uploadFolder)) {
    fs.mkdirSync(uploadFolder);
}


// Create output folder if it doesn't exist
if (!fs.existsSync(outputFolder)) {
    fs.mkdirSync(outputFolder);
}


// ==========================================
// MULTER UPLOAD SETUP
// ==========================================

const upload = multer({
    dest: uploadFolder
});


// ==========================================
// SERVE FRONTEND
// ==========================================

app.use(express.static(path.join(__dirname, 'public')));


// ==========================================
// MERGE PDF
// ==========================================

app.post('/merge', upload.array('pdfs', 10), async (req, res) => {

    try {

        // Check if at least 2 PDFs were selected
        if (!req.files || req.files.length < 2) {

            return res.status(400).json({
                error: 'Please select at least 2 PDF files.'
            });

        }


        // Create a new empty PDF
        const mergedPdf =
            await PDFDocument.create();


        // Process every uploaded PDF
        for (const file of req.files) {

            // Read uploaded PDF
            const pdfBytes =
                fs.readFileSync(file.path);


            // Load PDF
            const pdf =
                await PDFDocument.load(pdfBytes);


            // Copy all pages
            const pages =
                await mergedPdf.copyPages(
                    pdf,
                    pdf.getPageIndices()
                );


            // Add pages to merged PDF
            pages.forEach((page) => {

                mergedPdf.addPage(page);

            });

        }


        // Save merged PDF
        const mergedPdfBytes =
            await mergedPdf.save();


        // Output file path
        const outputPath =
            path.join(
                outputFolder,
                'merged.pdf'
            );


        // Write merged PDF
        fs.writeFileSync(
            outputPath,
            mergedPdfBytes
        );


        // Delete temporary uploaded files
        for (const file of req.files) {

            if (fs.existsSync(file.path)) {

                fs.unlinkSync(file.path);

            }

        }


        // Send success response
        res.json({

            success: true,

            message:
                'PDFs merged successfully!',

            downloadUrl:
                '/download'

        });


    } catch (error) {

        console.error(error);


        res.status(500).json({

            error:
                'Something went wrong while merging the PDFs.'

        });

    }

});


// ==========================================
// DOWNLOAD MERGED PDF
// ==========================================

app.get('/download', (req, res) => {

    const filePath =
        path.join(
            outputFolder,
            'merged.pdf'
        );


    if (!fs.existsSync(filePath)) {

        return res
            .status(404)
            .send('Merged PDF not found.');

    }


    res.download(
        filePath,
        'merged.pdf'
    );

});


// ==========================================
// SPLIT PDF
// ==========================================

app.post('/split', upload.single('pdf'), async (req, res) => {

    try {

        // Check if PDF was uploaded
        if (!req.file) {

            return res.status(400).json({

                error:
                    'Please select a PDF file.'

            });

        }


        // Get page range from user
        const pagesInput =
            req.body.pages.trim();


        // Check format: 1-3
        const match =
            pagesInput.match(/^(\d+)-(\d+)$/);


        if (!match) {

            // Delete uploaded file
            if (fs.existsSync(req.file.path)) {

                fs.unlinkSync(req.file.path);

            }


            return res.status(400).json({

                error:
                    'Please enter a page range like 1-3.'

            });

        }


        // Convert page numbers to integers
        const startPage =
            parseInt(match[1]);


        const endPage =
            parseInt(match[2]);


        // Validate page range
        if (
            startPage < 1 ||
            endPage < startPage
        ) {

            if (fs.existsSync(req.file.path)) {

                fs.unlinkSync(req.file.path);

            }


            return res.status(400).json({

                error:
                    'Invalid page range.'

            });

        }


        // Read uploaded PDF
        const pdfBytes =
            fs.readFileSync(req.file.path);


        // Load original PDF
        const originalPdf =
            await PDFDocument.load(pdfBytes);


        // Get total number of pages
        const totalPages =
            originalPdf.getPageCount();


        // Check if requested page exists
        if (endPage > totalPages) {

            if (fs.existsSync(req.file.path)) {

                fs.unlinkSync(req.file.path);

            }


            return res.status(400).json({

                error:
                    `The PDF has only ${totalPages} pages.`

            });

        }


        // Create new PDF
        const newPdf =
            await PDFDocument.create();


        // Create page indexes
        const pageIndexes = [];


        for (
            let page = startPage;
            page <= endPage;
            page++
        ) {

            // PDF-lib uses zero-based indexes
            pageIndexes.push(page - 1);

        }


        // Copy selected pages
        const copiedPages =
            await newPdf.copyPages(
                originalPdf,
                pageIndexes
            );


        // Add copied pages
        copiedPages.forEach((page) => {

            newPdf.addPage(page);

        });


        // Save new PDF
        const newPdfBytes =
            await newPdf.save();


        // Output path
        const outputPath =
            path.join(
                outputFolder,
                'split.pdf'
            );


        // Save split PDF
        fs.writeFileSync(
            outputPath,
            newPdfBytes
        );


        // Delete temporary uploaded file
        if (fs.existsSync(req.file.path)) {

            fs.unlinkSync(req.file.path);

        }


        // Send success response
        res.json({

            success: true,

            message:
                'PDF split successfully!',

            downloadUrl:
                '/download-split'

        });


    } catch (error) {

        console.error(error);


        // Try to delete temporary upload
        if (
            req.file &&
            fs.existsSync(req.file.path)
        ) {

            fs.unlinkSync(req.file.path);

        }


        res.status(500).json({

            error:
                'Something went wrong while splitting the PDF.'

        });

    }

});


// ==========================================
// DOWNLOAD SPLIT PDF
// ==========================================

app.get('/download-split', (req, res) => {

    const filePath =
        path.join(
            outputFolder,
            'split.pdf'
        );


    if (!fs.existsSync(filePath)) {

        return res
            .status(404)
            .send('Split PDF not found.');

    }


    res.download(
        filePath,
        'split.pdf'
    );

});


// ==========================================
// START SERVER
// ==========================================

app.listen(port, () => {

    console.log(
        `PDF Merger running at http://localhost:${port}`
    );

});