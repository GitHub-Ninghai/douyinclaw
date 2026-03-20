FROM mcr.microsoft.com/playwright:v1.40.0-jammy

WORKDIR /app

# Install Python
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Copy sandbox code
COPY . .

# Install Python dependencies with Tsinghua mirror
RUN pip3 install --no-cache-dir -i https://pypi.tuna.tsinghua.edu.cn/simple -r requirements.txt

# Expose Chrome DevTools port
EXPOSE 9222

# Create workspace directory
RUN mkdir -p /workspace

# Run sandbox service
CMD ["python3", "main.py"]
