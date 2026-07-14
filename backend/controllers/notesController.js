const Note = require('../models/Note');

// Get all notes for the authenticated user
exports.getNotes = async (req, res) => {
    try {
        const notes = await Note.find({ userId: req.user.id }).sort({ updatedAt: -1 });
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
