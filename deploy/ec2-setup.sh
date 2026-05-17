#!/bin/bash
# ============================================
# EC2 Instance Setup Script
# Run this ONCE on a fresh Ubuntu EC2 instance
# ============================================
# Usage: chmod +x ec2-setup.sh && sudo ./ec2-setup.sh
# ============================================

set -e  # Exit on any error

echo "=========================================="
echo "  Eventify — EC2 Setup Script"
echo "=========================================="

# ---- Update System ----
echo "[1/6] Updating system packages..."
sudo apt-get update -y
sudo apt-get upgrade -y

# ---- Install Docker ----
echo "[2/6] Installing Docker..."
sudo apt-get install -y \
    ca-certificates \
    curl \
    gnupg \
    lsb-release

# Add Docker GPG key
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Add Docker repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine
sudo apt-get update -y
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Add current user to docker group (no sudo needed for docker commands)
sudo usermod -aG docker $USER

# ---- Install Docker Compose ----
echo "[3/6] Docker Compose plugin is included with Docker CE..."

# ---- Configure Firewall ----
echo "[4/6] Configuring firewall..."
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP (Nginx)
sudo ufw allow 443/tcp   # HTTPS (future SSL)
sudo ufw allow 9090/tcp  # Prometheus
sudo ufw allow 3001/tcp  # Grafana
sudo ufw --force enable

# ---- Create App Directory ----
echo "[5/6] Creating application directory..."
mkdir -p ~/eventify
mkdir -p ~/eventify/nginx
mkdir -p ~/eventify/monitoring/prometheus
mkdir -p ~/eventify/monitoring/grafana/provisioning/datasources
mkdir -p ~/eventify/monitoring/grafana/provisioning/dashboards
mkdir -p ~/eventify/monitoring/grafana/dashboards

# ---- Configure Log Rotation ----
echo "[6/6] Setting up log rotation..."
sudo tee /etc/logrotate.d/docker-containers > /dev/null <<EOF
/var/lib/docker/containers/*/*.log {
    rotate 7
    daily
    compress
    missingok
    delaycompress
    copytruncate
    maxsize 50M
}
EOF

echo ""
echo "=========================================="
echo "  ✅ Setup Complete!"
echo "=========================================="
echo ""
echo "IMPORTANT: Log out and log back in for Docker"
echo "group changes to take effect, then run:"
echo "  docker --version"
echo "  docker compose version"
echo ""
echo "Next steps:"
echo "  1. Push your code → GitHub Actions will deploy"
echo "  2. Or manually: cd ~/eventify && docker compose up -d"
echo ""
