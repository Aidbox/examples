FROM caddy:alpine

# Copy Caddyfile
COPY Caddyfile /etc/caddy/Caddyfile

# Copy the HTML and JS files to caddy directory
WORKDIR /srv
COPY simple-questionnaire-renderer.js /srv/

# Expose port 80
EXPOSE 80

# Start caddy
CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile"]