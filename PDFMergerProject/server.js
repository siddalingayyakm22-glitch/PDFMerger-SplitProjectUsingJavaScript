const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { PDFDocument } = require('pdf-lib');

const app = express();
const port = 3000;

const uploadFolder = path.join(__dirname, 'uploads');
const outputFolder = path.join(__dirname, 'output');

if (!fs.existsSync(uploadFolder)) {
    fs.mkdirSync(uploadFolder);
}

if (!fs.existsSync(outputFolder)) {
    fs.mkdirSync(outputFolder);
}

const upload = multer({
    dest: uploadFolder
});

app.use(express.static(path.join(__dirname, 'public')));

app.post('/merge', upload.array('pdfs', 10), async (req, res) => {

    try {

        if (!req.files || req.files.length < 2) {
            return res.status(400).json({
                error: 'Please select at least 2 PDF files.'
            });
        }

        const mergedPdf = await PDFDocument.create();

        for (const file of req.files) {

            const pdfBytes = fs.readFileSync(file.path);

            const pdf = await PDFDocument.load(pdfBytes);

            const pages = await mergedPdf.copyPages(
                pdf,
                pdf.getPageIndices()
            );

            pages.forEach((page) => {
                mergedPdf.addPage(page);
            });
        }

        const mergedPdfBytes = await mergedPdf.save();

        const outputPath = path.join(
            outputFolder,
            'merged.pdf'
        );

        fs.writeFileSync(outputPath, mergedPdfBytes);

        for (const file of req.files) {

            if (fs.existsSync(file.path)) {
                fs.unlinkSync(file.path);
            }

        }

        res.json({
            success: true,
            message: 'PDFs merged successfully!',
            downloadUrl: '/download'
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            error: 'Something went wrong while merging the PDFs.'
        });
    }
});

app.get('/download', (req, res) => {

    const filePath = path.join(
        outputFolder,
        'merged.pdf'
    );

    if (!fs.existsSync(filePath)) {
        return res.status(404).send('Merged PDF not found.');
    }

    res.download(filePath, 'merged.pdf');
});

app.listen(port, () => {

    console.log(
        `PDF Merger running at http://localhost:${port}`
    );

});