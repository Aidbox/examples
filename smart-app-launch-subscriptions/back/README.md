# Smart App Launch Subscriptions – Server App

This is the backend service for the **Smart App Launch Subscriptions** widget. The frontend widget will not work without this service running.  

## Overview

The server is responsible for:  
- Receiving webhooks from **Aidbox**.  
- Establishing **server-side event (SSE) connections** with the frontend widget to deliver real-time updates. 

## Local Setup and Run

Before running the server locally, you need to configure environment variables and install dependencies.

1. Copy the `.env.tpl` file to `.env`:

    ```sh
    cp .env.tpl .env
    ```

2. Configure the required environment variables in the `.env` file.

3. Install dependencies:

    ```sh
    npm i
    ```

4. Start the server:

    ```sh
    npm run dev
    ```

Make sure the environment variables are set up before starting the server.  
If the server is not running, the frontend widget will not work.