FROM node:18-alpine

WORKDIR /app

# Install dependencies first (caching layer)
COPY package.json package-lock.json* ./
RUN npm ci

# Copy application code
COPY . .

# Create directory for external BBS apps
RUN mkdir -p bbs-apps
VOLUME /app/bbs-apps

# Create directory for persistent npm packages
VOLUME /app/node_modules

# Build the Next.js application
RUN npm run build

# Expose the port the app runs on
EXPOSE 3000

# Start the application
CMD ["npm", "start"] 