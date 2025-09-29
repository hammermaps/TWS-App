import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
})

// In development, optionally attach axios-mock-adapter for axios-only mocks
if (import.meta.env.DEV) {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  import('axios-mock-adapter').then(({ default: AxiosMockAdapter }) => {
    const mock = new AxiosMockAdapter(api)

    // example mock endpoint
    mock.onGet('/hello').reply(200, { message: 'hello from axios-mock-adapter' })

    // add other axios-only mocks here for development
    console.log('[axios-mock-adapter] mocks registered')
  })
}

export default api

