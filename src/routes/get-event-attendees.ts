import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { prisma } from "../lib/prisma";

const getEventAttendeesSchema = {
  summary: 'Get event attendees',
  tags: ['events'],
  params: z.object({
    eventId: z.string().uuid(),
  }),
  querystring: z.object({
    query: z.string().optional(),
    pageIndex: z.string().optional().default('0').transform(Number),
  }),
  response: {
    200: z.object({
      attendees: z.array(
        z.object({
          id: z.number(),
          name: z.string(),
          email: z.string().email(),
          createdAt: z.date(),
          checkedInAt: z.date().nullable(),
        })
      ),
      total: z.number(),
    }),
  },
};

export async function getEventAttendees(app: FastifyInstance) {
  app
    .withTypeProvider<ZodTypeProvider>()
    .get('/events/:eventId/attendees', { schema: getEventAttendeesSchema }, async (request, reply) => {
      const { eventId } = request.params;
      const { pageIndex, query } = request.query;

      const whereCondition = {
        eventId,
        ...(query && { name: { contains: query } }),
      };

      const [attendees, total] = await Promise.all([
        prisma.attendee.findMany({
          select: {
            id: true,
            name: true,
            email: true,
            createdAt: true,
            checkIn: {
              select: {
                createdAt: true,
              }
            }
          },
          where: whereCondition,
          take: 10,
          skip: pageIndex * 10,
          orderBy: {
            createdAt: 'desc',
          },
        }),
        prisma.attendee.count({
          where: whereCondition,
        }),
      ]);

      const formattedAttendees = attendees.map(attendee => ({
        id: attendee.id,
        name: attendee.name,
        email: attendee.email,
        createdAt: attendee.createdAt,
        checkedInAt: attendee.checkIn?.createdAt ?? null,
      }));

      return reply.send({
        attendees: formattedAttendees,
        total,
      });
    });
}
