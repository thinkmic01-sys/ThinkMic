const Note = require('../models/Note');

// Get all notes for the authenticated user
exports.getNotes = async (req, res) => {
    try {
        const query = { userId: req.user.id };
        if (req.query.projectId) {
            query.projectId = req.query.projectId;
        }
        const notes = await Note.find(query).sort({ updatedAt: -1 });
        res.status(200).json(notes);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

// Create a new note
exports.createNote = async (req, res) => {
    try {
        const newNote = new Note({
            userId: req.user.id,
            projectId: req.body.projectId || undefined,
            title: req.body.title || 'Untitled Note',
            content: req.body.content || '',
            preview: req.body.preview || '',
            tags: req.body.tags || [],
            outline: req.body.outline || [],
            links: req.body.links || []
        });

        const savedNote = await newNote.save();
        res.status(201).json(savedNote);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

// Update an existing note
exports.updateNote = async (req, res) => {
    try {
        const updatedNote = await Note.findOneAndUpdate(
            { _id: req.params.id, userId: req.user.id },
            { $set: req.body },
            { new: true }
        );

        if (!updatedNote) {
            return res.status(404).json({ message: 'Note not found or unauthorized' });
        }

        res.status(200).json(updatedNote);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

// Delete a note
exports.deleteNote = async (req, res) => {
    try {
        const note = await Note.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
        if (!note) {
            return res.status(404).json({ message: 'Note not found or unauthorized' });
        }
        res.status(204).send();
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

const openaiService = require('../services/openaiService');

exports.generateInsights = async (req, res) => {
    try {
        const note = await Note.findOne({ _id: req.params.id, userId: req.user.id });
        if (!note) {
            return res.status(404).json({ message: 'Note not found or unauthorized' });
        }
        
        // Strip HTML tags roughly for OpenAI
        const plainTextContent = note.content ? note.content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : '';
        
        if (!plainTextContent) {
            return res.status(400).json({ message: 'Note content is empty' });
        }

        const insights = await openaiService.generateNoteInsights(plainTextContent);
        
        // Save insights to note
        note.outline = insights.outline;
        note.tags = insights.tags;
        await note.save();

        res.status(200).json({ outline: note.outline, tags: note.tags });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error while generating insights' });
    }
};

const { Document, Packer, Paragraph, TextRun, HeadingLevel } = require('docx');

exports.exportNote = async (req, res) => {
    try {
        const note = await Note.findOne({ _id: req.params.id, userId: req.user.id });
        if (!note) {
            return res.status(404).json({ message: 'Note not found' });
        }

        const title = note.title || 'Untitled Note';
        let plainText = note.content || '';
        
        // Convert <a href="URL">text</a> to "text (URL)" before stripping HTML
        plainText = plainText.replace(/<a\s+[^>]*href="([^"]+)"[^>]*>(.*?)<\/a>/gi, '$2 ($1)');
        
        // Strip remaining HTML tags
        plainText = plainText.replace(/<[^>]+>/g, '\n').replace(/\n\s*\n/g, '\n');
        
        const paragraphs = plainText.split('\n').filter(p => p.trim() !== '').map(text => 
            new Paragraph({
                children: [new TextRun(text)],
                spacing: { after: 200 }
            })
        );

        const doc = new Document({
            sections: [{
                properties: {},
                children: [
                    new Paragraph({
                        text: title,
                        heading: HeadingLevel.HEADING_1,
                        alignment: "center",
                        spacing: { after: 400 }
                    }),
                    ...paragraphs
                ],
            }],
        });

        const buffer = await Packer.toBuffer(doc);
        
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(title)}.docx"`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.send(buffer);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error while exporting note' });
    }
};
