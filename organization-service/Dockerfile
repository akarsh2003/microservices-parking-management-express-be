# Use the official Node.js image
FROM node:18

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the source code
COPY . .

# Expose the port your service runs on
EXPOSE 3001

# Set environment variables (can be overridden in docker-compose or CLI)
ENV NODE_ENV=production

# Start the application
CMD ["npm", "start"]
