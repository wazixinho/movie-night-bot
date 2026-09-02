# Use LTS Node.js Debian slim image for native sqlite3 prebuilt binaries
FROM node:20-bullseye-slim

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install production dependencies
RUN npm ci --omit=dev

# Copy application source
COPY . .

# Environment defaults
ENV NODE_ENV=production

# Health check port default if running as web service
EXPOSE 3000

# Start bot
CMD ["npm", "start"]
