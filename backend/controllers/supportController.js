const Ticket = require('../models/Ticket');
const socket = require('../utils/socket');

exports.getTicket = async (req, res) => {
    try {
        const ticket = await Ticket.findOne({ user: req.user._id, status: 'open' })
            .populate('messages.sender', 'fullName avatarUrl role')
            .sort({ createdAt: -1 });
        
        res.status(200).json({ ticket });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.sendMessage = async (req, res) => {
    try {
        const { text, ticketId } = req.body;
        
        if (!text || text.trim() === '') {
            return res.status(400).json({ message: 'Message text is required' });
        }

        let ticket;
        // If ticketId is provided, append to it
        if (ticketId) {
            ticket = await Ticket.findById(ticketId);
            if (!ticket) return res.status(404).json({ message: 'Ticket not found' });
            
            // Check auth (only ticket owner or admin/manager can reply)
            if (ticket.user.toString() !== req.user._id.toString() && !['admin', 'manager'].includes(req.user.role)) {
                return res.status(403).json({ message: 'Not authorized to reply to this ticket' });
            }
        } else {
            // Check if user already has an open ticket
            ticket = await Ticket.findOne({ user: req.user._id, status: 'open' });
            // If not, create one
            if (!ticket) {
                ticket = new Ticket({ user: req.user._id, status: 'open', messages: [] });
            }
        }

        const newMessage = {
            sender: req.user._id,
            text,
            createdAt: new Date()
        };

        ticket.messages.push(newMessage);
        await ticket.save();

        // Populate sender info for the returned message
        await ticket.populate('messages.sender', 'fullName avatarUrl role');

        const populatedMessage = ticket.messages[ticket.messages.length - 1];

        // Emit to socket room for real-time updates
        const io = socket.getIO();
        if (io) {
            // If sender is admin, emit to user's room
            if (req.user.role === 'admin' || req.user.role === 'manager') {
                io.to(ticket.user.toString()).emit('new_support_message', { ticketId: ticket._id, message: populatedMessage });
            } else {
                // If sender is user, emit to a general 'admin_support' room or all admins
                io.to('admin_support').emit('new_support_message', { ticketId: ticket._id, message: populatedMessage });
            }
        }

        res.status(201).json({ ticket, message: populatedMessage });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.getAllTickets = async (req, res) => {
    try {
        const { status } = req.query;
        const filter = {};
        if (status) filter.status = status;

        const tickets = await Ticket.find(filter)
            .populate('user', 'fullName email')
            .populate('messages.sender', 'fullName avatarUrl role')
            .sort({ updatedAt: -1 });

        res.status(200).json({ tickets });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.closeTicket = async (req, res) => {
    try {
        const { id } = req.params;
        const ticket = await Ticket.findById(id);
        
        if (!ticket) return res.status(404).json({ message: 'Ticket not found' });
        
        ticket.status = 'closed';
        await ticket.save();

        res.status(200).json({ message: 'Ticket closed successfully', ticket });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};
