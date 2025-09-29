import { rest } from 'msw'

export const handlers = [
  // Mock the API route used earlier
  rest.get('/api/hello', (req, res, ctx) => {
    return res(ctx.status(200), ctx.json({ message: 'hello from msw' }))
  }),

  // Example todos endpoint
  rest.get('/api/todos', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json([
        { id: 1, title: 'First mocked todo', completed: false },
        { id: 2, title: 'Second mocked todo', completed: true },
      ]),
    )
  }),
]

