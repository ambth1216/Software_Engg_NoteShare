# Use official Node.js Alpine base image
FROM node:24-alpine

# Set working directory inside container
WORKDIR /app

# Install lightweight static web server 'serve' globally (No Nginx, Apache, or Reverse Proxy used)
RUN npm install -g serve

# Copy frontend static assets (HTML, CSS, JS) into container
COPY . .

# Expose container port 3000 for frontend server
EXPOSE 3000

# Start static file server on port 3000 serving multi-page static app
CMD ["serve", ".", "-l", "3000"]
