# Use an official lightweight Python image
FROM python:3.10-slim

# Set the working directory inside the container
WORKDIR /app

# Install git so we can clone external tools like Sherlock
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

# Copy your backend requirements
COPY backend/requirements.txt .

# Install FastAPI and your Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Install Sherlock globally so the subprocess in main.py can find it
RUN git clone --branch v0.16.0 --depth 1 https://github.com/sherlock-project/sherlock.git /opt/sherlock && \
    cd /opt/sherlock && \
    pip install --no-cache-dir .

# Copy the rest of your application code
COPY backend/ /app/backend/

# Set Python path so the backend package is importable
ENV PYTHONPATH=/app/backend

# Expose the port FastAPI runs on
EXPOSE 8000

# Command to run the FastAPI application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
