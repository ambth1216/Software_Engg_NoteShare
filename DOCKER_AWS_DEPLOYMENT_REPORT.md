# Comprehensive Dockerization & AWS Deployment Report for NoteShare

---

## 1. Architecture Overview

This document details the containerization strategy for the **NoteShare** application, designed to run in both local development environments (via Docker Compose) and cloud production environments (on AWS ECS Fargate / EKS with MongoDB Atlas and AWS S3).

> [!IMPORTANT]
> **Strict Requirement Met**: Neither **Nginx**, **Apache**, nor any reverse proxy server is used in this stack.
> - **Frontend Container**: Powered by a lightweight Node.js container executing `serve` (Node static web server) on port `3000`.
> - **Backend Container**: Powered by Node.js executing the Express server directly on port `5000`.
> - **Database**: **MongoDB Atlas** for production cloud database (with local MongoDB container option for offline dev).
> - **Uploads Storage**: **AWS S3** bucket for cloud production storage (with persistent Docker volume `/app/uploads` for local dev).

```
                      +-----------------------------------+
                      |         Client Browser            |
                      +-----------------------------------+
                               /                 \
                 Port 3000    /                   \  Port 5000
                             v                     v
            +-----------------------+     +-----------------------+
            |  Frontend Container   |     |   Backend Container   |
            |  (Node.js + serve)    |     |  (Node.js + Express)  |
            +-----------------------+     +-----------------------+
                                                     |
                                   +-----------------+-----------------+
                                   |                                   |
                                   v                                   v
                      +-------------------------+         +-------------------------+
                      |     MongoDB Atlas       |         |      AWS S3 Bucket      |
                      |  (Cloud Managed DB)     |         |  (Note Files Uploads)   |
                      +-------------------------+         +-------------------------+
```

---

## 2. Deep-Dive Code Explanation: Dockerfiles & Compose

### A. Backend Dockerfile (`backend/Dockerfile`)

```dockerfile
# 1. Base Image selection
FROM node:18-alpine

# 2. Set working directory inside container
WORKDIR /app

# 3. Copy package manifests for optimal layer caching
COPY package*.json ./

# 4. Install production dependencies
RUN npm ci --only=production

# 5. Copy backend application source code
COPY . .

# 6. Ensure uploads folder structure exists
RUN mkdir -p /app/uploads

# 7. Environment variable declaration
ENV PORT=5000

# 8. Container Port Exposure
EXPOSE 5000

# 9. Startup execution command
CMD ["node", "server.js"]
```

#### Line-by-Line Breakdown:
* `FROM node:18-alpine`: Uses the minimal Linux Alpine build of Node.js 18 (under 50MB), reducing vulnerability attack surface and optimizing download/build speeds.
* `WORKDIR /app`: Sets `/app` as the root directory inside the container for all subsequent `COPY`, `RUN`, and `CMD` commands.
* `COPY package*.json ./`: Copies `package.json` and `package-lock.json` before application code. Docker caches this step, so `npm ci` will only re-run when dependencies change, drastically speeding up rebuilds.
* `RUN npm ci --only=production`: Installs exact dependency versions specified in `package-lock.json` while excluding `devDependencies` (like `nodemon`), reducing container size.
* `COPY . .`: Copies the remaining backend source code (`server.js`, `routes/`, `models/`, `config/`, etc.) into `/app`.
* `RUN mkdir -p /app/uploads`: Guarantees that the `/app/uploads` directory exists inside the container so multer can write local file uploads without throwing `ENOENT` errors.
* `ENV PORT=5000`: Defines a default environment variable `PORT` accessible by `process.env.PORT` inside `server.js`.
* `EXPOSE 5000`: Informs Docker runtime that the container listens on port 5000 at runtime.
* `CMD ["node", "server.js"]`: Executes `node server.js` directly as PID 1 to launch the Express web server.

---

### B. Frontend Dockerfile (`frontend/Dockerfile`)

> [!NOTE]
> Per requirement, **No Nginx or Apache** is used. We use Node.js with the official `serve` package.

```dockerfile
# 1. Base Image
FROM node:18-alpine

# 2. Set working directory
WORKDIR /app

# 3. Install lightweight static web server 'serve'
RUN npm install -g serve

# 4. Copy static frontend code
COPY . .

# 5. Expose port 3000
EXPOSE 3000

# 6. Start static file server
CMD ["serve", "-s", ".", "-l", "3000"]
```

#### Line-by-Line Breakdown:
* `FROM node:18-alpine`: Lightweight Node.js Alpine runtime image.
* `WORKDIR /app`: Establishes workspace directory `/app`.
* `RUN npm install -g serve`: Installs the `serve` static file server utility globally in Node.
* `COPY . .`: Copies all static files (`index.html`, `login.html`, `signup.html`, `upload.html`, `all-notes.html`, `style.css`, `*.js`) into `/app`.
* `EXPOSE 3000`: Exposes container port 3000.
* `CMD ["serve", "-s", ".", "-l", "3000"]`: Serves static files on port `3000`. The `-s` flag enables single-page application rewriting, and `-l 3000` sets the listening port.

---

### C. Docker Compose Configuration (`docker-compose.yml`)

```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:6
    container_name: noteshare-mongodb
    restart: always
    ports:
      - "27017:27017"
    environment:
      - MONGO_INITDB_DATABASE=noteshare
    volumes:
      - mongo_data:/data/db
    networks:
      - noteshare-network

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: noteshare-backend
    restart: always
    ports:
      - "5000:5000"
    environment:
      - PORT=5000
      - MONGO_URI=mongodb://mongodb:27017/noteshare
      - JWT_SECRET=your_jwt_secret_key_change_in_production
    volumes:
      - backend_uploads:/app/uploads
    depends_on:
      - mongodb
    networks:
      - noteshare-network

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: noteshare-frontend
    restart: always
    ports:
      - "3000:3000"
    depends_on:
      - backend
    networks:
      - noteshare-network

volumes:
  mongo_data:
    driver: local
  backend_uploads:
    driver: local

networks:
  noteshare-network:
    driver: bridge
```

#### Detailed Section Breakdown:
1. **`services.mongodb`**:
   - Spawns a local MongoDB 6 database container for local testing.
   - Mounts persistent Docker volume `mongo_data` to `/data/db` so database records survive container restarts.
2. **`services.backend`**:
   - Builds image from `./backend/Dockerfile`.
   - Maps port `5000` on the host to port `5000` in the container.
   - Connects to local `mongodb` container via host alias `mongodb://mongodb:27017/noteshare`. (In production, replace `MONGO_URI` with your **MongoDB Atlas** connection string).
   - Mounts persistent Docker volume `backend_uploads` to `/app/uploads`.
3. **`services.frontend`**:
   - Builds image from `./frontend/Dockerfile`.
   - Maps host port `3000` to container port `3000`.
   - Depends on backend startup.
4. **`volumes`**:
   - `backend_uploads`: Ensures uploaded note files are saved safely on the host system volume even when backend container is re-created.
5. **`networks.noteshare-network`**:
   - Isolated Docker bridge network providing internal DNS resolution (`mongodb`, `backend`, `frontend`).

---

## 3. Storage Strategy & Integration (AWS S3 & Local Volumes)

### A. Local Development Uploads Strategy
In local development with Docker Compose, uploaded files are stored inside `/app/uploads`. The named volume `backend_uploads` maps `/app/uploads` to host disk storage (`/var/lib/docker/volumes/backend_uploads/_data`).

### B. AWS Cloud Production Uploads Strategy (AWS S3)
For cloud deployment (ECS Fargate / EKS), serverless containers are **ephemeral** (they can restart or scale horizontally). Storing uploaded notes directly on container disks will result in file loss when tasks scale or restart.

**Recommended Solution**: Store note uploads in an **AWS S3 Bucket**.

#### Express S3 Integration Code snippet (`backend/config/s3Upload.js`):
```javascript
const { S3Client } = require('@aws-sdk/client-s3');
const multer = require('multer');
const multerS3 = require('multer-s3');

const s3 = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    }
});

const uploadS3 = multer({
    storage: multerS3({
        s3: s3,
        bucket: process.env.AWS_S3_BUCKET_NAME,
        metadata: (req, file, cb) => {
            cb(null, { fieldName: file.fieldname });
        },
        key: (req, file, cb) => {
            cb(null, `notes/${Date.now()}_${file.originalname}`);
        }
    })
});

module.exports = uploadS3;
```

---

## 4. Database Strategy: MongoDB Atlas Integration

In production on AWS, use **MongoDB Atlas** for high availability, automated backups, and encryption.

### Connection Configuration:
In your backend configuration (`backend/config/db.js`), MongoDB connects automatically via `MONGO_URI`:

```javascript
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
```

#### MongoDB Atlas String Example:
`MONGO_URI=mongodb+srv://noteshare_user:<password>@noteshare-cluster.mongodb.net/noteshare_db?retryWrites=true&w=majority`

---

## 5. Step-by-Step AWS Deployment Guide

### Phase 1: AWS ECR (Elastic Container Registry) Image Push

#### Step 1: Create ECR Repositories
```bash
# Create repository for Backend
aws ecr create-repository --repository-name noteshare-backend --region us-east-1

# Create repository for Frontend
aws ecr create-repository --repository-name noteshare-frontend --region us-east-1
```

#### Step 2: Authenticate Docker to AWS ECR
```bash
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <AWS_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com
```

#### Step 3: Build, Tag, and Push Backend Image
```bash
# Build backend container
docker build -t noteshare-backend ./backend

# Tag image with ECR URI
docker tag noteshare-backend:latest <AWS_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/noteshare-backend:latest

# Push image to ECR
docker push <AWS_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/noteshare-backend:latest
```

#### Step 4: Build, Tag, and Push Frontend Image
```bash
# Build frontend container
docker build -t noteshare-frontend ./frontend

# Tag image with ECR URI
docker tag noteshare-frontend:latest <AWS_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/noteshare-frontend:latest

# Push image to ECR
docker push <AWS_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/noteshare-frontend:latest
```

---

### Phase 2: AWS ECS Fargate Deployment

AWS ECS Fargate allows running containers serverless without managing underlying EC2 servers.

#### Step 1: Create IAM Task Execution Role
Ensure your `ecsTaskExecutionRole` has permissions:
- `AmazonECSTaskExecutionRolePolicy`
- Custom S3 inline policy for `s3:PutObject`, `s3:GetObject`, `s3:DeleteObject` on your bucket.

#### Step 2: Create ECS Task Definition with AWS Secrets Manager (`ecs-task-def.json`)

Using the `secrets` array in the ECS Task Definition allows AWS ECS to automatically inject sensitive credentials (like `MONGO_URI`, `JWT_SECRET`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`) from **AWS Secrets Manager** into container environment variables at runtime without hardcoding sensitive strings.

```json
{
  "family": "noteshare-task",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::<AWS_ACCOUNT_ID>:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::<AWS_ACCOUNT_ID>:role/ecsTaskRole",
  "containerDefinitions": [
    {
      "name": "noteshare-backend",
      "image": "<AWS_ACCOUNT_ID>.dkr.ecr.ap-south-1.amazonaws.com/noteshare-backend:latest",
      "essential": true,
      "portMappings": [
        {
          "containerPort": 5000,
          "hostPort": 5000
        }
      ],
      "environment": [
        { "name": "PORT", "value": "5000" },
        { "name": "USE_S3", "value": "true" },
        { "name": "AWS_REGION", "value": "ap-south-1" },
        { "name": "AWS_S3_BUCKET_NAME", "value": "noteshare-uploads-bucket" }
      ],
      "secrets": [
        {
          "name": "MONGO_URI",
          "valueFrom": "arn:aws:secretsmanager:ap-south-1:<AWS_ACCOUNT_ID>:secret:noteshare/production-XXXXXX:MONGO_URI::"
        },
        {
          "name": "JWT_SECRET",
          "valueFrom": "arn:aws:secretsmanager:ap-south-1:<AWS_ACCOUNT_ID>:secret:noteshare/production-XXXXXX:JWT_SECRET::"
        },
        {
          "name": "AWS_ACCESS_KEY_ID",
          "valueFrom": "arn:aws:secretsmanager:ap-south-1:<AWS_ACCOUNT_ID>:secret:noteshare/production-XXXXXX:AWS_ACCESS_KEY_ID::"
        },
        {
          "name": "AWS_SECRET_ACCESS_KEY",
          "valueFrom": "arn:aws:secretsmanager:ap-south-1:<AWS_ACCOUNT_ID>:secret:noteshare/production-XXXXXX:AWS_SECRET_ACCESS_KEY::"
        }
      ]
    },
    {
      "name": "noteshare-frontend",
      "image": "<AWS_ACCOUNT_ID>.dkr.ecr.ap-south-1.amazonaws.com/noteshare-frontend:latest",
      "essential": true,
      "portMappings": [
        {
          "containerPort": 3000,
          "hostPort": 3000
        }
      ]
    }
  ]
}
```

#### Step 3: Register Task Definition & Create ECS Cluster
```bash
# Register Task Definition
aws ecs register-task-definition --cli-input-json file://ecs-task-def.json

# Create ECS Cluster
aws ecs create-cluster --cluster-name noteshare-cluster

# Run Service on ECS Fargate
aws ecs create-service \
    --cluster noteshare-cluster \
    --service-name noteshare-service \
    --task-definition noteshare-task \
    --desired-count 1 \
    --launch-type FARGATE \
    --network-configuration "awsvpcConfiguration={subnets=[subnet-12345678],securityGroups=[sg-12345678],assignPublicIp=ENABLED}"
```

#### Step 4: Configure AWS Security Group
In the Security Group attached to your ECS Tasks:
- Allow **Inbound Custom TCP Port 3000** from `0.0.0.0/0` (Frontend).
- Allow **Inbound Custom TCP Port 5000** from `0.0.0.0/0` (Backend API).

---

### Phase 3: Alternative AWS EKS (Elastic Kubernetes Service) Deployment

If deploying to **AWS EKS**, use standard Kubernetes Deployment manifests:

#### `k8s-manifests.yaml`:
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: noteshare-backend
spec:
  replicas: 2
  selector:
    matchLabels:
      app: noteshare-backend
  template:
    metadata:
      labels:
        app: noteshare-backend
    spec:
      containers:
      - name: backend
        image: <AWS_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/noteshare-backend:latest
        ports:
        - containerPort: 5000
        env:
        - name: MONGO_URI
          valueFrom:
            secretKeyRef:
              name: noteshare-secrets
              key: MONGO_URI
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: noteshare-secrets
              key: JWT_SECRET
---
apiVersion: v1
kind: Service
metadata:
  name: noteshare-backend-service
spec:
  type: LoadBalancer
  ports:
  - port: 5000
    targetPort: 5000
  selector:
    app: noteshare-backend
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: noteshare-frontend
spec:
  replicas: 2
  selector:
    matchLabels:
      app: noteshare-frontend
  template:
    metadata:
      labels:
        app: noteshare-frontend
    spec:
      containers:
      - name: frontend
        image: <AWS_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/noteshare-frontend:latest
        ports:
        - containerPort: 3000
---
apiVersion: v1
kind: Service
metadata:
  name: noteshare-frontend-service
spec:
  type: LoadBalancer
  ports:
  - port: 3000
    targetPort: 3000
  selector:
    app: noteshare-frontend
```

#### Apply EKS Manifests:
```bash
kubectl apply -f k8s-manifests.yaml
```

---

## 6. Local Testing & Verification Commands

To test locally with Docker Compose:

```bash
# 1. Build and launch containers
docker compose up --build -d

# 2. Check running container status
docker compose ps

# 3. View live backend logs
docker compose logs -f backend

# 4. Access frontend app in browser
# http://localhost:3000

# 5. Stop and clean up containers
docker compose down -v
```

---
*Report generated for NoteShare Dockerization & AWS Deployment Project.*
