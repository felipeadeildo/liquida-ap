import {
  type RouteConfig,
  index,
  layout,
  route,
} from '@react-router/dev/routes'

export default [
  route('login', 'routes/auth/login.tsx'),
  route('register', 'routes/auth/register.tsx'),

  layout('protected-layout.tsx', [index('routes/home.tsx')]),
] satisfies RouteConfig
