# Init Bundle Environment Template

This example demonstrates how to dynamically template Aidbox init bundles using environment variables in Docker Compose by overriding the container entrypoint.

## How it works

1. **Template file**: `init-bundle.json.tpl` contains placeholders for environment variables (e.g., `${INIT_BUNDLE_CLIENT_ID}`)

2. **Docker Compose override**: The `docker-compose.yaml` file:
   - Mounts the template file into the container
   - Overrides the default entrypoint to run `envsubst` before starting Aidbox
   - Substitutes environment variables into the template, creating the final `init-bundle.json`

3. **Entrypoint rewriting**: Instead of using the default Aidbox entrypoint, we override it with a custom shell script that:

   ```yaml
   entrypoint: 
   - /bin/sh
   - -c
   - |
     envsubst < /tmp/init-bundle.json.tpl > /tmp/init-bundle.json
     /aidbox.sh
   ```

   This runs `envsubst` to process the template, then executes the original Aidbox entrypoint script.

4. **Environment variables**: Set in the `environment` section and used by `envsubst`:
   - `INIT_BUNDLE_CLIENT_ID`: Client ID for the init bundle
   - `INIT_BUNDLE_CLIENT_SECRET`: Client secret for the init bundle

## Usage

```bash
docker-compose up
```

The init bundle will be created with the values from the environment variables defined in `docker-compose.yaml`.
