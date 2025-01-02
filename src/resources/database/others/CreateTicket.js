import ticketSchema from "../models/Ticket.js";

export async function createTicket() {
    const newTicket = await ticketSchema.create({
        guildID: "774381753401737237",
        ticketTotal: 0,
        ticketOpened: 0,

        ticketChannelID: "1074890238406692995",
        ticketMessageID: "1075552711371653220"
    });

    const savedUser = await newTicket.save();
}