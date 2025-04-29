# Yad2 CRM Deployment Guide (VPS)

This guide provides step-by-step instructions for deploying the Yad2 CRM application (backend, frontend, and scraper) on a Linux VPS (e.g., Ubuntu).

## Prerequisites

Before you begin, ensure your VPS has the following installed:

*   **Node.js:** Version 18 or later (for backend and frontend build).
*   **npm or pnpm:** Package manager for Node.js.
*   **Python:** Version 3.8 or later (for the scraper).
*   **pip:** Package manager for Python.
*   **PostgreSQL:** Database server.
*   **Nginx (or Apache):** Web server/reverse proxy.
*   **PM2:** Process manager for Node.js applications.
*   **Git:** For cloning the repository (if applicable) or transferring files.
*   **zip/unzip:** For handling the deployment package.

## 1. Prepare the Server

1.  **Update System:**
    ```bash
    sudo apt update && sudo apt upgrade -y
    ```
2.  **Install Prerequisites:**
    ```bash
    # Node.js (using NodeSource)
    curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
    sudo apt install -y nodejs

    # pnpm (optional, if used in frontend)
    sudo npm install -g pnpm

    # Python & pip
    sudo apt install -y python3 python3-pip python3-venv

    # PostgreSQL
    sudo apt install -y postgresql postgresql-contrib

    # Nginx
    sudo apt install -y nginx

    # PM2
    sudo npm install -g pm2

    # Git & Unzip
    sudo apt install -y git unzip
    ```

## 2. Deploy Application Code

1.  **Transfer Package:** Upload the `yad2_crm_deployment.zip` file to your VPS (e.g., using `scp`).
2.  **Unzip Package:**
    ```bash
    unzip yad2_crm_deployment.zip -d /path/to/your/app
    cd /path/to/your/app/yad2_crm
    ```
    Replace `/path/to/your/app` with your desired deployment directory.

## 3. Setup PostgreSQL Database

1.  **Start & Enable PostgreSQL:**
    ```bash
    sudo systemctl start postgresql
    sudo systemctl enable postgresql
    ```
2.  **Create Database User & Database:**
    ```bash
    sudo -u postgres psql
    ```
    Inside the `psql` shell:
    ```sql
    CREATE DATABASE yad2_crm;
    CREATE USER yad2_crm_user WITH PASSWORD 'your_strong_password'; -- Replace with a strong password
    GRANT ALL PRIVILEGES ON DATABASE yad2_crm TO yad2_crm_user;
    ALTER ROLE yad2_crm_user CREATEDB; -- Optional: if migrations need to create tables
    \q
    ```
3.  **Apply Migrations:**
    ```bash
    # Apply initial schema
    psql -U yad2_crm_user -d yad2_crm -h localhost -f migrations/001_initial_schema.sql
    # Apply user role migration
    psql -U yad2_crm_user -d yad2_crm -h localhost -f migrations/002_add_user_role.sql
    ```
    You might be prompted for the `yad2_crm_user` password.

## 4. Configure Backend

1.  **Navigate to Backend:**
    ```bash
    cd backend
    ```
2.  **Install Dependencies:**
    ```bash
    npm install
    ```
3.  **Configure Environment Variables:**
    *   Copy the example file: `cp .env.example .env`
    *   Edit `.env` and replace placeholders:
        *   `DB_HOST=localhost`
        *   `DB_PORT=5432`
        *   `DB_USER=yad2_crm_user`
        *   `DB_PASSWORD=your_strong_password` (from step 3.2)
        *   `DB_NAME=yad2_crm`
        *   `JWT_SECRET=` (generate a strong, random secret key)
        *   `STRIPE_SECRET_KEY=` (your production Stripe secret key)
        *   `STRIPE_PUBLIC_KEY=` (your production Stripe public key)
        *   `STRIPE_WEBHOOK_SECRET=` (your production Stripe webhook secret)
        *   `STRIPE_BASIC_MONTHLY_PRICE_ID=` (your production Stripe Price ID)
        *   `PORT=5001` (or another port if desired)
        *   `FRONTEND_URL=https://yourdomain.com` (your actual frontend domain)

## 5. Configure Frontend

1.  **Navigate to Frontend:**
    ```bash
    cd ../frontend
    ```
2.  **Install Dependencies:**
    ```bash
    pnpm install # or npm install
    ```
3.  **Configure Environment Variables (if needed):**
    *   React apps built with Vite often use `.env` files.
    *   Ensure `VITE_API_BASE_URL` (or similar) points to your backend API (e.g., `https://yourdomain.com/api`). Check `src/pages/*.jsx` or a dedicated API service file for how the base URL is determined. You might need to create a `.env.production` file.
    *   Example `.env.production`:
        ```
        VITE_API_BASE_URL=/api
        ```
4.  **Build for Production:**
    ```bash
    pnpm run build # or npm run build
    ```
    This will create a `dist` (or `build`) directory with static files.

## 6. Configure Scraper

1.  **Navigate to Scraper:**
    ```bash
    cd ../scraper
    ```
2.  **Create Virtual Environment (Recommended):**
    ```bash
    python3 -m venv venv
    source venv/bin/activate
    ```
3.  **Install Dependencies:**
    ```bash
    pip install -r requirements.txt # You might need to create this file first
    # Or install manually:
    pip install requests psycopg2-binary python-dotenv schedule
    ```
4.  **Configure Environment Variables:**
    *   Copy the example file: `cp .env.example .env`
    *   Edit `.env` and replace placeholders:
        *   `DB_HOST=localhost`
        *   `DB_PORT=5432`
        *   `DB_USER=yad2_crm_user`
        *   `DB_PASSWORD=your_strong_password`
        *   `DB_NAME=yad2_crm`
        *   `ZENROWS_API_KEY=` (your ZenRows API key)

## 7. Setup Nginx Reverse Proxy

1.  **Create Nginx Configuration:**
    ```bash
    sudo nano /etc/nginx/sites-available/yad2_crm
    ```
2.  **Paste Configuration (Example):**
    ```nginx
    server {
        listen 80;
        server_name yourdomain.com; # Replace with your domain

        # Redirect HTTP to HTTPS (Optional, requires SSL setup first)
        # return 301 https://$host$request_uri;

        location / {
            root /path/to/your/app/yad2_crm/frontend/dist; # Path to frontend build
            try_files $uri /index.html;
        }

        location /api {
            proxy_pass http://localhost:5001; # Backend server
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # WebSocket location (if backend uses a specific path like /ws)
        location /ws {
            proxy_pass http://localhost:5001; # Assuming WebSocket runs on the same port
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "Upgrade";
            proxy_set_header Host $host;
        }
    }
    ```
    *   Replace `yourdomain.com` with your actual domain.
    *   Replace `/path/to/your/app/yad2_crm/frontend/dist` with the correct path to your frontend build output.
    *   Adjust `proxy_pass` if your backend runs on a different port.
    *   Adjust the WebSocket location block if your WebSocket server uses a different path or port.
3.  **Enable Site & Test Configuration:**
    ```bash
    sudo ln -s /etc/nginx/sites-available/yad2_crm /etc/nginx/sites-enabled/
    sudo nginx -t
    ```
4.  **Restart Nginx:**
    ```bash
    sudo systemctl restart nginx
    ```
5.  **Setup SSL (Recommended):** Use Certbot for free Let's Encrypt certificates.
    ```bash
    sudo apt install certbot python3-certbot-nginx -y
    sudo certbot --nginx -d yourdomain.com
    ```
    Follow the prompts. Certbot will automatically update your Nginx config for HTTPS.

## 8. Run Backend with PM2

1.  **Navigate to Backend:**
    ```bash
    cd /path/to/your/app/yad2_crm/backend
    ```
2.  **Start Application:**
    ```bash
    pm2 start src/server.js --name yad2-crm-backend
    ```
3.  **Save PM2 Process List:**
    ```bash
    pm2 save
    ```
4.  **Enable PM2 Startup:**
    ```bash
    pm2 startup systemd
    ```
    Follow the instructions provided by the command.

## 9. Schedule Scraper with Cron

1.  **Edit Crontab:**
    ```bash
    crontab -e
    ```
2.  **Add Cron Job:** Add a line to run the scraper daily (e.g., at 2 AM):
    ```cron
    0 2 * * * cd /path/to/your/app/yad2_crm/scraper && /path/to/your/app/yad2_crm/scraper/venv/bin/python main.py >> /path/to/your/app/yad2_crm/scraper/logs/cron.log 2>&1
    ```
    *   Replace paths with your actual deployment paths.
    *   Ensure the Python path points to the one inside the virtual environment.
    *   Adjust the schedule (`0 2 * * *`) as needed.

## 10. Final Steps

1.  **Firewall:** Ensure your VPS firewall allows traffic on ports 80 (HTTP) and 443 (HTTPS).
    ```bash
    sudo ufw allow 'Nginx Full'
    sudo ufw enable
    ```
2.  **DNS:** Point your domain name (`yourdomain.com`) to your VPS's public IP address.
3.  **Testing:** Thoroughly test the application by accessing `https://yourdomain.com`.

## Monitoring & Maintenance

*   **Logs:** Check logs for backend (PM2 logs), scraper (cron logs), and Nginx.
    *   `pm2 logs yad2-crm-backend`
    *   `/path/to/your/app/yad2_crm/scraper/logs/cron.log`
    *   `/var/log/nginx/access.log` and `/var/log/nginx/error.log`
*   **Updates:** Regularly update the server, Node.js, Python, and other dependencies.
*   **Backups:** Implement regular backups for your PostgreSQL database.
