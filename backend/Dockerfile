# Use official Node.js Alpine base image for minimal footprint and security
FROM node:24-alpine

# Set working directory inside container
WORKDIR /app

# Copy package.json and package-lock.json first to leverage Docker layer caching
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy backend application source code
COPY . .

# Ensure the uploads directory exists for local note uploads
RUN mkdir -p /app/uploads

# Set default environment variables
ENV PORT=5000

# Expose backend service port
EXPOSE 5000

# Start Express server directly using Node.js runtime
CMD ["node", "server.js"]
