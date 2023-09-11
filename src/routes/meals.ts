import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { randomUUID } from 'node:crypto'
import { checkSessionIdExists } from '../middlewares/check-session-id-exists'
import { knex } from '../database'

export async function mealsRoutes(app: FastifyInstance) {
  app.get('/', { preHandler: [checkSessionIdExists] }, async (request) => {
    const { sessionId } = request.cookies

    const meals = await knex('meals').where('session_id', sessionId).select()

    return { meals }
  })

  app.get('/:id', { preHandler: [checkSessionIdExists] }, async (request) => {
    const getMealParamsSchema = z.object({
      id: z.string().uuid(),
    })

    const { id } = getMealParamsSchema.parse(request.params)

    const { sessionId } = request.cookies

    const meal = await knex('meals')
      .where({
        session_id: sessionId,
        id,
      })
      .first()

    return { meal }
  })

  app.get(
    '/summary',
    { preHandler: [checkSessionIdExists] },
    async (request) => {
      const { sessionId } = request.cookies

      const meals = await knex('meals')
        .where('session_id', sessionId)
        .orderBy('date_time')
        .select()

      let totalMeals = 0
      let onDietMeals = 0
      let offDietMeals = 0
      let bestSequence = 0
      let currentSequence = 0
      for (let i = 0; i < meals.length; i++) {
        totalMeals++
        if (meals[i].diet) {
          onDietMeals++

          currentSequence++
        } else {
          offDietMeals++

          if (currentSequence > bestSequence) {
            bestSequence = currentSequence
          }
          currentSequence = 0
        }
      }
      if (currentSequence > bestSequence) {
        bestSequence = currentSequence
      }

      return {
        total_meals: totalMeals,
        on_diet_meals: onDietMeals,
        off_diet_meals: offDietMeals,
        best_sequence: bestSequence,
      }
    },
  )

  app.post('/', async (request, reply) => {
    const createMealBodySchema = z.object({
      name: z.string(),
      description: z.string(),
      dateTime: z.string(),
      diet: z.boolean(),
    })

    const { name, description, dateTime, diet } = createMealBodySchema.parse(
      request.body,
    )

    let sessionId = request.cookies.sessionId

    if (!sessionId) {
      sessionId = randomUUID()

      reply.cookie('sessionId', sessionId, {
        path: '/',
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
      })
    }

    await knex('meals').insert({
      id: randomUUID(),
      name,
      description,
      diet,
      date_time: dateTime,
      session_id: sessionId,
    })

    return reply.status(201).send()
  })

  app.put(
    '/:id',
    { preHandler: [checkSessionIdExists] },
    async (request, reply) => {
      const updateMealParamsSchema = z.object({
        id: z.string().uuid(),
      })

      const { id } = updateMealParamsSchema.parse(request.params)

      const updateMealBodySchema = z.object({
        name: z.string().optional(),
        description: z.string().optional(),
        dateTime: z.string().optional(),
        diet: z.boolean().optional(),
      })

      const { name, description, dateTime, diet } = updateMealBodySchema.parse(
        request.body,
      )

      const { sessionId } = request.cookies

      const updatedMeal = {
        ...(name && { name }),
        ...(description && { description }),
        ...(dateTime && { dateTime }),
        ...(diet && { diet }),
      }

      await knex('meals')
        .where({
          session_id: sessionId,
          id,
        })
        .update(updatedMeal)

      return reply.status(200).send()
    },
  )

  app.delete(
    '/:id',
    { preHandler: [checkSessionIdExists] },
    async (request, reply) => {
      const getMealParamsSchema = z.object({
        id: z.string().uuid(),
      })

      const { id } = getMealParamsSchema.parse(request.params)

      const { sessionId } = request.cookies

      await knex('meals')
        .where({
          session_id: sessionId,
          id,
        })
        .del()

      return reply.status(204).send()
    },
  )
}
