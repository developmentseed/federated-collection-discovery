# Step 1: Build the React application
FROM node:18 AS build

# Set the working directory.
WORKDIR /app

# Install the dependencies.
COPY package*.json tsconfig.json yarn.lock ./
RUN yarn install && yarn cache clean

# Copy the entire project.
COPY ./public ./public/
COPY ./src ./src/

# Inform Docker that the container's web server will be on port 3000.
EXPOSE 3000

# Start the application in development mode.
CMD ["yarn", "start"]
