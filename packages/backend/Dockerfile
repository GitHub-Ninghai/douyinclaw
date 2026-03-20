FROM docker.1ms.run/python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -i https://pypi.tuna.tsinghua.edu.cn/simple -r requirements.txt

# Copy application
COPY . .

# Expose port
EXPOSE 3001

# Run
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "3001"]
