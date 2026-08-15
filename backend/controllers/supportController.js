const Ticket = require('../models/Ticket');
const socket = require('../utils/socket');
const openaiService = require('../services/openaiService');

// sendMessage/closeTicket are shared routes (both a ticket's owner and support staff hit
// the same endpoint), so this in-controller check is the actual authorization boundary, not
// just defense-in-depth. Used to be a hardcoded ['admin','manager'].includes(req.user.role)
// string check - permission-based instead, so it stays correct for any role (a custom one,
// or Manager/User now that they're editable/deletable - see roleController.js) that's been
// granted support.manage_all, rather than only ever recognizing those two exact role slugs.
const isSupportStaff = (req) => (req.user.permissions || []).includes('support.manage_all');

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
        const { text, ticketId, category } = req.body;

        if (!text || text.trim() === '') {
            return res.status(400).json({ message: 'Message text is required' });
        }

        let ticket;
        // If ticketId is provided, append to it
        if (ticketId) {
            ticket = await Ticket.findById(ticketId);
            if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

            // Check auth (only the ticket owner or support staff can reply)
            if (ticket.user.toString() !== req.user._id.toString() && !isSupportStaff(req)) {
                return res.status(403).json({ message: 'Not authorized to reply to this ticket' });
            }
            if (category) ticket.category = category;
        } else {
            // Check if user already has an open ticket
            ticket = await Ticket.findOne({ user: req.user._id, status: 'open' });
            // If not, create one
            if (!ticket) {
                ticket = new Ticket({ user: req.user._id, status: 'open', messages: [], category: category || 'General' });
            } else if (category) {
                ticket.category = category;
            }
        }

        const senderIsStaff = isSupportStaff(req);
        // Whether the 24/7 AI assistant should chime in - only while no human staff member
        // has engaged with this ticket yet (checked BEFORE pushing the current message, so a
        // staff member's very first reply still stops the AI from also answering it).
        const shouldTriggerAI = !senderIsStaff && !ticket.messages.some((m) => m.isStaff);

        const newMessage = {
            sender: req.user._id,
            text,
            isStaff: senderIsStaff,
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
            // If sender is support staff, emit to the user's room
            if (senderIsStaff) {
                io.to(ticket.user.toString()).emit('new_support_message', { ticketId: ticket._id, message: populatedMessage });
            } else {
                // If sender is user, emit to a general 'admin_support' room or all admins
                io.to('admin_support').emit('new_support_message', { ticketId: ticket._id, message: populatedMessage });
            }
        }

        res.status(201).json({ ticket, message: populatedMessage });

        // Fire-and-forget: the AI reply can take a second or two, so it's generated after the
        // response above (keeps the user's own message send snappy) and delivered over the
        // same socket path a staff reply would use, rather than blocking this request.
        if (shouldTriggerAI) {
            generateAIReply(ticket).catch((err) => console.error('[Support AI] Failed to generate reply:', err));
        }
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

async function generateAIReply(ticket) {
    const conversationText = ticket.messages
        .map((m) => `${m.isBot ? 'Assistant' : (m.isStaff ? 'Staff' : 'User')}: ${m.text}`)
        .join('\n');

    const replyText = await openaiService.answerSupportQuestion(conversationText, ticket.category);

    // Re-fetch rather than reusing the in-memory `ticket` - it may have been closed, or
    // received another message, in the time the AI call took.
    const freshTicket = await Ticket.findById(ticket._id);
    if (!freshTicket || freshTicket.status !== 'open') return;

    freshTicket.messages.push({ text: replyText, isBot: true, createdAt: new Date() });
    await freshTicket.save();

    const aiMessage = freshTicket.messages[freshTicket.messages.length - 1];

    const io = socket.getIO();
    if (io) {
        io.to(freshTicket.user.toString()).emit('new_support_message', { ticketId: freshTicket._id, message: aiMessage });
        io.to('admin_support').emit('new_support_message', { ticketId: freshTicket._id, message: aiMessage });
    }
}

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

        const isOwner = ticket.user.toString() === req.user._id.toString();
        if (!isOwner && !isSupportStaff(req)) {
            return res.status(403).json({ message: 'Not authorized to close this ticket' });
        }

        ticket.status = 'closed';
        await ticket.save();

        res.status(200).json({ message: 'Ticket closed successfully', ticket });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Submit a satisfaction rating/feedback for a resolved ticket
// @route   PATCH /api/v1/support/:id/rate
// @access  Private (ticket owner only)
exports.rateTicket = async (req, res) => {
    try {
        const { id } = req.params;
        const { rating, feedback } = req.body;

        if (rating === undefined || rating < 1 || rating > 5) {
            return res.status(400).json({ message: 'Rating must be between 1 and 5' });
        }

        const ticket = await Ticket.findById(id);
        if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

        if (ticket.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to rate this ticket' });
        }

        ticket.rating = rating;
        if (feedback !== undefined) ticket.feedback = feedback;
        await ticket.save();

        res.status(200).json({ message: 'Rating submitted successfully', ticket });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};
