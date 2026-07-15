# Stage 1: Build the React frontend
FROM node:20-alpine AS frontend-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
# Use relative path for API requests so it works on any domain
ARG VITE_API_BASE_URL=/api/v1
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build

# Stage 2: Build and run the Express backend
FROM node:20-alpine
WORKDIR /app/server

# Copy server package files and install production dependencies
COPY server/package*.json ./
RUN npm ci --omit=dev

# Copy the server source code
COPY server/ ./

# Copy the built frontend from Stage 1 to the client folder expected by server.js
COPY --from=frontend-build /app/client/dist /app/client/dist

# Set production environment
ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001
CMD ["node", "server.js"]
