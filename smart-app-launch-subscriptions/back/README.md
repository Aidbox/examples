# smart-app-launch-subscriptions server app

## Configuration

Before running the project, create a `.env` file in the root directory and add the following environment variables:

```ini
# Port your server will listen on
PORT=4114

# Allowed origins for CORS requests (comma-separated if multiple)
ALLOWED_HOSTS=http://localhost:5173
```

## Local run

```sh
npm i
npm run dev
```