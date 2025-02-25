import { NestFactory } from '@nestjs/core'
import { AppModule } from './modules/app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose']
  })

  const allowedHosts = (process.env.ALLOWED_HOSTS ?? 'http://localhost:3100').split(',')

  app.enableCors({
    origin: allowedHosts,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type'],
    credentials: true
  })

  await app.listen(process.env.PORT ?? 3000)
}
bootstrap()
