import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { BadRequest } from "./_errors/bad-request";

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { BadRequest } from 'http-errors';
import prisma from './prisma'; // Importe o cliente Prisma

export async function registerForEvent(app: FastifyInstance) {
  app.post('/events/:eventId/attendees', {
    schema: {
      summary: 'Register an attendee',
      tags: ['attendees'],
      body: z.object({
        name: z.string().min(4),
        email: z.string().email(),
      }),
      params: z.object({
        eventId: z.string().uuid(),
      }),
      response: {
        201: z.object({
          attendeeId: z.number(),
        }),
      },
    },
    // Manipulador de solicitação
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { eventId } = request.params;
        const { name, email } = request.body;
        
        const attendeeFromEmail = await prisma.attendee.findUnique({
          where: {
            eventId_email: {
              email,
              eventId,
            },
          },
        });

        if (attendeeFromEmail !== null) {
          throw new BadRequest('This e-mail is already registered for this event.');
        }
        
        const [event, amountOfAttendeesForEvent] = await Promise.all([
          prisma.event.findUnique({
            where: { id: eventId },
          }),
          prisma.attendee.count({
            where: { eventId },
          }),
        ]);

        if (event?.maximumAttendees && amountOfAttendeesForEvent >= event.maximumAttendees) {
          throw new BadRequest('The maximum number of attendees for this event has been reached.');
        }
        
        const attendee = await prisma.attendee.create({
          data: { name, email, eventId },
        });

        return reply.status(201).send({ attendeeId: attendee.id });
      } catch (error) {
        reply.status(error.statusCode || 500).send({ error: error.message });
      }
    },
  });
}
