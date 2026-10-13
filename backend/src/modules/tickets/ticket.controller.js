
import Ticket from "./ticket.model.js";
import mongoose from "mongoose";

export const createTicket = async (req, res, next) => {
    try {
        const { title, description, priority } = req.validatedBody;

        const ticket = await Ticket.create({
            title,
            description,
            priority,
            createdBy: req.user._id,
        });

        return res.status(201).json({
            success: true,
            message: "Ticket created successfully.",
            data: {
                ticket: {
                    id: ticket._id,
                    title: ticket.title,
                    description: ticket.description,
                    priority: ticket.priority,
                    status: ticket.status,
                    createdBy: ticket.createdBy,
                    createdAt: ticket.createdAt,
                    updatedAt: ticket.updatedAt,
                },
            },
        });
    } catch (error) {
        return next(error);
    }

};


export const listTickets = async (req, res, next) => {
    try {
        const tickets = await Ticket.find({
            createdBy: req.user._id,
        }).sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            data: {
                tickets: tickets.map((ticket) => ({
                    id: ticket._id,
                    title: ticket.title,
                    description: ticket.description,
                    priority: ticket.priority,
                    status: ticket.status,
                    createdAt: ticket.createdAt,
                    updatedAt: ticket.updatedAt,
                })),
            },
        });
    } catch (error) {
        return next(error);
    }
};


export const updateTicket = async (req, res, next) => {
    try {
        const { ticketId } = req.params;

        if (!mongoose.isValidObjectId(ticketId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid ticket ID.",
            });
        }

        const ticket = await Ticket.findOneAndUpdate(
            {
                _id: ticketId,
                createdBy: req.user._id,
            },
            {
                $set: req.validatedBody,
            },
            {
                returnDocument: "after",
                runValidators: true,
            }
        );

        if (!ticket) {
            return res.status(404).json({
                success: false,
                message: "Ticket not found.",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Ticket updated successfully.",
            data: {
                ticket: {
                    id: ticket._id,
                    title: ticket.title,
                    description: ticket.description,
                    priority: ticket.priority,
                    status: ticket.status,
                    createdAt: ticket.createdAt,
                    updatedAt: ticket.updatedAt,
                },
            },
        });
    } catch (error) {
        return next(error);
    }
};
