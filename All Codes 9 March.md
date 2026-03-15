AI: You've asked for a full, copy-paste solution for an entire DevOps project, including a full-stack application, Docker, Kubernetes, Ansible, and CI/CD. This is an **extremely ambitious and complex request** that would typically be a multi-week project for a team, not something that can be provided as simple copy-paste code and instantly work in any environment.

**Here's why a direct "copy-paste" won't work perfectly and what I *can* provide:**

1.  **Environment Specificity:**
    *   **Ansible:** Playbooks for setting up a Kubernetes cluster depend heavily on your chosen operating system (Ubuntu, CentOS, etc.), cloud provider (AWS, Azure, GCP, DigitalOcean, bare metal), network configuration, and Kubernetes version. A generic playbook might break or require significant customization.
    *   **Kubernetes:** Manifests often require specific configurations like Persistent Volume Providers (CSI drivers for cloud storage), Ingress controllers, and secrets management that vary between environments.
    *   **CI/CD:** Pipelines depend on your Git provider (GitHub, GitLab, Bitbucket), container registry, and cloud provider/K8s cluster access.

2.  **Application Complexity:** Generating a full, functional To-Do List application (frontend, backend, database migrations, error handling, basic auth) from scratch in a single go is beyond the scope of a simple output.

3.  **Security:** "Copy-pasting" sensitive configurations (secrets, SSH keys, cloud credentials) without understanding is extremely risky.

**What I WILL do is provide a highly detailed, conceptual framework with *example code snippets* and comprehensive instructions for each component.** This will give you the blueprint and starting point to build it yourself, which is the best way to truly learn and adapt it to your specific needs.

---

### **Project Goal: A Basic Full-Stack To-Do List Application deployed with DevOps**

**Technologies Chosen for Examples:**
*   **Frontend:** React (create-react-app)
*   **Backend:** Node.js (Express)
*   **Database:** PostgreSQL
*   **CI/CD:** GitHub Actions
*   **K8s Cluster:** Assumed a generic Linux VM setup (e.g., Ubuntu 20.04/22.04)
*   **Container Registry:** Docker Hub (you can swap with GCR, ECR, etc.)

---

### **Step 1: The To-Do List Application (Frontend, Backend, Database)**

This is the foundation. We'll keep it minimal.

#### **1.1 Backend (Node.js/Express with PostgreSQL)**

**`backend/package.json`**
```json
{
  "name": "todo-backend",
  "version": "1.0.0",
  "description": "Simple To-Do API",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "express": "^4.18.2",
    "pg": "^8.11.3"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  }
}
```

**`backend/server.js`**
```javascript
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3001;

// Database connection using environment variables for Kubernetes compatibility
const pool = new Pool({
  user: process.env.PGUSER || 'user',
  host: process.env.PGHOST || 'localhost',
  database: process.env.PGDATABASE || 'todoapp',
  password: process.env.PGPASSWORD || 'password',
  port: process.env.PGPORT || 5432,
});

app.use(cors()); // Enable CORS for frontend
app.use(express.json()); // To parse JSON request bodies

// Initialize database table if it doesn't exist
pool.query(`
  CREATE TABLE IF NOT EXISTS todos (
    id SERIAL PRIMARY KEY,
    description VARCHAR(255) NOT NULL,
    completed BOOLEAN DEFAULT FALSE
  );
`)
.then(() => console.log('To-Do table checked/created successfully.'))
.catch(err => console.error('Error creating To-Do table:', err));


// Routes
app.get('/todos', async (req, res) => {
  try {
    const allTodos = await pool.query('SELECT * FROM todos ORDER BY id ASC');
    res.json(allTodos.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

app.post('/todos', async (req, res) => {
  try {
    const { description } = req.body;
    const newTodo = await pool.query(
      'INSERT INTO todos (description) VALUES($1) RETURNING *',
      [description]
    );
    res.json(newTodo.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

app.put('/todos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { description, completed } = req.body;
    let query = 'UPDATE todos SET ';
    const params = [];
    if (description !== undefined) {
      params.push(description);
      query += `description = $${params.length}, `;
    }
    if (completed !== undefined) {
      params.push(completed);
      query += `completed = $${params.length}, `;
    }
    query = query.slice(0, -2); // Remove trailing comma and space
    params.push(id);
    query += ` WHERE id = $${params.length} RETURNING *`;

    const updateTodo = await pool.query(query, params);
    if (updateTodo.rows.length === 0) {
      return res.status(404).json("Todo not found");
    }
    res.json(updateTodo.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

app.delete('/todos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleteTodo = await pool.query('DELETE FROM todos WHERE id = $1 RETURNING *', [id]);
    if (deleteTodo.rows.length === 0) {
      return res.status(404).json("Todo not found");
    }
    res.json("Todo was deleted!");
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
```

#### **1.2 Frontend (React)**

**`frontend/src/App.js`**
```javascript
import React, { useState, useEffect } from 'react';
import './App.css'; // You can create a simple App.css

function App() {
  const [todos, setTodos] = useState([]);
  const [description, setDescription] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingDescription, setEditingDescription] = useState('');

  // Use environment variable for backend URL
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

  const getTodos = async () => {
    try {
      const response = await fetch(`${API_URL}/todos`);
      const jsonData = await response.json();
      setTodos(jsonData);
    } catch (err) {
      console.error(err.message);
    }
  };

  const addTodo = async (e) => {
    e.preventDefault();
    try {
      const body = { description };
      const response = await fetch(`${API_URL}/todos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const newTodo = await response.json();
      setTodos([...todos, newTodo]);
      setDescription('');
    } catch (err) {
      console.error(err.message);
    }
  };

  const updateTodo = async (id) => {
    try {
      const body = { description: editingDescription };
      await fetch(`${API_URL}/todos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      setTodos(
        todos.map((todo) =>
          todo.id === id ? { ...todo, description: editingDescription } : todo
        )
      );
      setEditingId(null);
      setEditingDescription('');
    } catch (err) {
      console.error(err.message);
    }
  };

  const toggleCompleted = async (id, currentCompleted) => {
    try {
      const body = { completed: !currentCompleted };
      await fetch(`${API_URL}/todos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      setTodos(
        todos.map((todo) =>
          todo.id === id ? { ...todo, completed: !currentCompleted } : todo
        )
      );
    } catch (err) {
      console.error(err.message);
    }
  };


  const deleteTodo = async (id) => {
    try {
      await fetch(`${API_URL}/todos/${id}`, {
        method: 'DELETE',
      });
      setTodos(todos.filter((todo) => todo.id !== id));
    } catch (err) {
      console.error(err.message);
    }
  };

  useEffect(() => {
    getTodos();
  }, []);

  return (
    <div className="App">
      <h1>My To-Do List</h1>
      <form onSubmit={addTodo}>
        <input
          type="text"
          placeholder="Add a new todo"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />
        <button type="submit">Add</button>
      </form>

      <ul>
        {todos.map((todo) => (
          <li key={todo.id} className={todo.completed ? 'completed' : ''}>
            {editingId === todo.id ? (
              <>
                <input
                  type="text"
                  value={editingDescription}
                  onChange={(e) => setEditingDescription(e.target.value)}
                />
                <button onClick={() => updateTodo(todo.id)}>Save</button>
                <button onClick={() => setEditingId(null)}>Cancel</button>
              </>
            ) : (
              <>
                <span
                  onClick={() => toggleCompleted(todo.id, todo.completed)}
                  style={{ textDecoration: todo.completed ? 'line-through' : 'none', cursor: 'pointer' }}
                >
                  {todo.description}
                </span>
                <button onClick={() => {
                  setEditingId(todo.id);
                  setEditingDescription(todo.description);
                }}>Edit</button>
                <button onClick={() => deleteTodo(todo.id)}>Delete</button>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;
```
**`frontend/.env`** (for local development, will be replaced by K8s in prod)
```
REACT_APP_API_URL=http://localhost:3001
```
*(You'll need to run `npx create-react-app frontend` in your project root, then copy `App.js` and `.env` into the `frontend` directory, replacing the default `App.js`)*

---

### **Step 2: Docker Integration (Containerization)**

#### **2.1 Backend Dockerfile (`backend/Dockerfile`)**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
EXPOSE 3001
CMD ["node", "server.js"]
```

#### **2.2 Frontend Dockerfile (`frontend/Dockerfile`)**
```dockerfile
# Stage 1: Build the React application
FROM node:18-alpine as builder
WORKDIR /app
COPY package.json ./
COPY .env ./ # Copy .env for build process
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Serve the static files with Nginx
FROM nginx:stable-alpine
# Remove default Nginx config
RUN rm /etc/nginx/conf.d/default.conf
# Copy custom Nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf
# Copy built React app
COPY --from=builder /app/build /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

#### **2.3 Nginx Configuration for Frontend (`frontend/nginx.conf`)**
```nginx
server {
    listen 80;
    server_name localhost;

    location / {
        root   /usr/share/nginx/html;
        index  index.html index.htm;
        try_files $uri $uri/ /index.html; # For React routing
    }

    error_page   500 502 503 504  /50x.html;
    location = /50x.html {
        root   /usr/share/nginx/html;
    }
}
```

#### **2.4 Docker Compose for Local Development (`docker-compose.yml` in project root)**
```yaml
version: '3.8'
services:
  backend:
    build: ./backend
    ports:
      - "3001:3001"
    environment:
      PGUSER: user
      PGHOST: db
      PGDATABASE: todoapp
      PGPASSWORD: password
      PGPORT: 5432
    depends_on:
      - db
    # volumes: # Optional: Mount local code for live reloading during dev
    #   - ./backend:/app
    #   - /app/node_modules # Exclude node_modules from host mount
  frontend:
    build: ./frontend
    ports:
      - "80:80"
    environment:
      REACT_APP_API_URL: http://backend:3001 # Frontend talks to backend service name
    depends_on:
      - backend
    # volumes: # Optional: Mount local code for live reloading during dev
    #   - ./frontend:/app
    #   - /app/node_modules # Exclude node_modules from host mount
  db:
    image: postgres:13-alpine
    environment:
      POSTGRES_DB: todoapp
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
    volumes:
      - db_data:/var/lib/postgresql/data
volumes:
  db_data:
```

**Local Setup Instructions with Docker Compose:**
1.  Navigate to your project root.
2.  Run: `docker-compose build`
3.  Run: `docker-compose up -d`
4.  Access the frontend at `http://localhost`. The backend will be accessible via the frontend.

---

### **Step 3: Ansible Integration (Kubernetes Cluster Setup)**

This section provides *conceptual* Ansible playbooks for setting up a **three-node Kubernetes cluster (1 master, 2 workers)** on **Ubuntu 20.04/22.04 VMs**.

**Assumptions:**
*   You have 3 fresh Ubuntu VMs with SSH access and `sudo` privileges for your `ansible_user`.
*   Ansible is installed on your local machine.
*   Your local SSH key is configured for passwordless access to the VMs.

#### **3.1 Ansible Inventory (`inventory.ini`)**
```ini
[kubernetes_master]
master-node ansible_host=YOUR_MASTER_IP

[kubernetes_workers]
worker-node-1 ansible_host=YOUR_WORKER1_IP
worker-node-2 ansible_host=YOUR_WORKER2_IP

[all:vars]
ansible_user=your_ssh_username # e.g., ubuntu
ansible_python_interpreter=/usr/bin/python3
kube_version="1.27.0-00" # Match your desired Kubernetes version
pod_network_cidr="10.244.0.0/16" # CNI like Flannel often uses this
```
**REPLACE `YOUR_MASTER_IP`, `YOUR_WORKER1_IP`, `YOUR_WORKER2_IP`, `your_ssh_username`**

#### **3.2 Ansible Playbook: Common Setup (`ansible/playbooks/common_setup.yml`)**
```yaml
- name: Common setup for all Kubernetes nodes
  hosts: kubernetes_master, kubernetes_workers
  become: true
  tasks:
    - name: Update apt cache and upgrade packages
      apt:
        update_cache: yes
        upgrade: dist
      tags: always

    - name: Install common packages
      apt:
        name: "{{ item }}"
        state: present
      loop:
        - apt-transport-https
        - ca-certificates
        - curl
        - gnupg-agent
        - software-properties-common
        - vim
        - git
      tags: always

    - name: Disable swap
      shell: swapoff -a
      when: ansible_swaptoggle.rc == 0 # Check if swap is enabled
      tags: always

    - name: Comment out swap entries in /etc/fstab
      replace:
        path: /etc/fstab
        regexp: '^(\s*)([^#]+\s+swap\s+sw\s+.*)$'
        replace: '#\2'
      tags: always

    - name: Enable kernel modules for Kubernetes
      community.general.modprobe:
        name: "{{ item }}"
        state: present
      loop:
        - overlay
        - br_netfilter
      tags: always

    - name: Add sysctl settings for Kubernetes
      copy:
        content: |
          net.bridge.bridge-nf-call-iptables = 1
          net.bridge.bridge-nf-call-ip6tables = 1
          net.ipv4.ip_forward = 1
        dest: /etc/sysctl.d/99-kubernetes-cri.conf
        owner: root
        group: root
        mode: '0644'
      tags: always

    - name: Apply sysctl settings without reboot
      command: sysctl --system
      tags: always
```

#### **3.3 Ansible Playbook: Install Containerd (`ansible/playbooks/install_containerd.yml`)**
```yaml
- name: Install and configure Containerd
  hosts: kubernetes_master, kubernetes_workers
  become: true
  tasks:
    - name: Add Docker GPG key
      apt_key:
        url: https://download.docker.com/linux/ubuntu/gpg
        state: present
    - name: Add Docker APT repository
      apt_repository:
        repo: deb [arch=amd64] https://download.docker.com/linux/ubuntu {{ ansible_distribution_release }} stable
        state: present

    - name: Install containerd
      apt:
        name: containerd.io
        state: present
        update_cache: yes

    - name: Create default containerd config file
      command: containerd config default > /etc/containerd/config.toml
      args:
        creates: /etc/containerd/config.toml

    - name: Enable systemd cgroup driver for containerd
      replace:
        path: /etc/containerd/config.toml
        regexp: 'SystemdCgroup = false'
        replace: 'SystemdCgroup = true'
    
    - name: Restart containerd
      systemd:
        name: containerd
        state: restarted
        enabled: yes
```

#### **3.4 Ansible Playbook: Install Kubeadm, Kubelet, Kubectl (`ansible/playbooks/install_kube_tools.yml`)**
```yaml
- name: Install Kubeadm, Kubelet, Kubectl
  hosts: kubernetes_master, kubernetes_workers
  become: true
  tasks:
    - name: Add Kubernetes GPG key
      apt_key:
        url: https://packages.cloud.google.com/apt/doc/apt-key.gpg
        state: present
    - name: Add Kubernetes APT repository
      apt_repository:
        repo: deb https://apt.kubernetes.io/ kubernetes-xenial main
        state: present
        filename: kubernetes

    - name: Install kubelet, kubeadm, kubectl
      apt:
        name: "{{ item }}={{ kube_version }}"
        state: present
        update_cache: yes
      loop:
        - kubelet
        - kubeadm
        - kubectl

    - name: Hold kubelet, kubeadm, kubectl versions
      command: apt-mark hold kubelet kubeadm kubectl
```

#### **3.5 Ansible Playbook: Initialize Master Node (`ansible/playbooks/init_master.yml`)**
```yaml
- name: Initialize Kubernetes Master
  hosts: kubernetes_master
  become: true
  tasks:
    - name: Reset Kubernetes components (if already initialized)
      command: kubeadm reset -f
      ignore_errors: true

    - name: Initialize Kubernetes cluster
      command: >
        kubeadm init
        --pod-network-cidr={{ pod_network_cidr }}
        --kubernetes-version={{ kube_version | regex_replace('-00','') }}
        --control-plane-endpoint={{ ansible_host }}
      register: kubeadm_init_output

    - name: Create .kube directory for ansible_user
      file:
        path: /home/{{ ansible_user }}/.kube
        state: directory
        mode: '0755'
        owner: "{{ ansible_user }}"
        group: "{{ ansible_user }}"

    - name: Copy admin.conf to ansible_user's .kube directory
      copy:
        remote_src: yes
        src: /etc/kubernetes/admin.conf
        dest: /home/{{ ansible_user }}/.kube/config
        owner: "{{ ansible_user }}"
        group: "{{ ansible_user }}"
        mode: '0644'

    - name: Get join command for worker nodes
      shell: kubeadm token create --print-join-command
      register: kubeadm_join_command
      delegate_to: localhost
      run_once: true

    - name: Store join command in a local file
      local_action: copy content="{{ kubeadm_join_command.stdout }}" dest="/tmp/kube_join_command.sh"
      run_once: true

    - name: Deploy Flannel CNI
      become: false # Run as current user who has kubeconfig
      command: kubectl apply -f https://raw.githubusercontent.com/flannel-io/flannel/master/Documentation/kube-flannel.yml
      args:
        chdir: /home/{{ ansible_user }}/
      register: flannel_output
      until: flannel_output.rc == 0
      retries: 5
      delay: 10
```

#### **3.6 Ansible Playbook: Join Worker Nodes (`ansible/playbooks/join_workers.yml`)**
```yaml
- name: Join Kubernetes Worker Nodes
  hosts: kubernetes_workers
  become: true
  tasks:
    - name: Retrieve join command from local file
      slurp:
        src: /tmp/kube_join_command.sh
      register: join_command_slurp
      delegate_to: localhost
      run_once: true

    - name: Set join_command fact
      set_fact:
        kube_join_command: "{{ join_command_slurp.content | b64decode }}"

    - name: Join worker node to cluster
      command: "{{ kube_join_command }}"
      register: join_output

    - name: Display join output
      debug:
        var: join_output.stdout_lines
```

#### **3.7 Main Ansible Orchestration (`ansible/deploy_k8s_cluster.yml`)**
```yaml
- name: Deploy Kubernetes Cluster
  hosts: kubernetes_master, kubernetes_workers
  gather_facts: yes
  tasks:
    - name: Run common setup
      ansible.builtin.include_tasks: ../playbooks/common_setup.yml

    - name: Run containerd installation
      ansible.builtin.include_tasks: ../playbooks/install_containerd.yml

    - name: Run kubeadm/kubelet/kubectl installation
      ansible.builtin.include_tasks: ../playbooks/install_kube_tools.yml

- name: Initialize Master and Join Workers
  hosts: kubernetes_master
  gather_facts: false
  tasks:
    - name: Run master initialization
      ansible.builtin.include_tasks: ../playbooks/init_master.yml

- name: Join Workers (after master is ready)
  hosts: kubernetes_workers
  gather_facts: false
  tasks:
    - name: Run worker joining
      ansible.builtin.include_tasks: ../playbooks/join_workers.yml
```

**Ansible Setup Instructions:**
1.  Create an `ansible` directory in your project root. Inside it, create `inventory.ini` and a `playbooks` directory.
2.  Copy all Ansible playbook files into `ansible/playbooks`.
3.  **Crucially, replace placeholders in `inventory.ini` and verify `kube_version` matches your need.**
4.  Run from your local machine: `ansible-playbook -i ansible/inventory.ini ansible/deploy_k8s_cluster.yml`
5.  **Verify:** After successful execution, SSH into your master node and run `kubectl get nodes`. All nodes should be `Ready`.

---

### **Step 4: Kubernetes Integration (Application Deployment)**

Once your Kubernetes cluster is up, deploy your To-Do List application.

#### **4.1 Kubernetes Secret for Database (`kubernetes/db-secret.yaml`)**
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: todo-db-secret
type: Opaque
data:
  # Base64 encoded: echo -n 'password' | base64
  db_password: YOUR_BASE64_ENCODED_DB_PASSWORD
```
**REPLACE `YOUR_BASE64_ENCODED_DB_PASSWORD`** (e.g., `echo -n 'your_secure_password' | base64`)

#### **4.2 Kubernetes StatefulSet and Service for PostgreSQL (`kubernetes/postgres.yaml`)**
```yaml
apiVersion: v1
kind: Service
metadata:
  name: todo-db
  labels:
    app: todo-db
spec:
  ports:
    - port: 5432
      targetPort: 5432
  selector:
    app: todo-db
  clusterIP: None # headless service for StatefulSet

---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: todo-db
  labels:
    app: todo-db
spec:
  serviceName: "todo-db"
  replicas: 1
  selector:
    matchLabels:
      app: todo-db
  template:
    metadata:
      labels:
        app: todo-db
    spec:
      containers:
        - name: postgres
          image: postgres:13-alpine
          env:
            - name: POSTGRES_DB
              value: todoapp
            - name: POSTGRES_USER
              value: user
            - name: POSTGRES_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: todo-db-secret
                  key: db_password
          ports:
            - containerPort: 5432
          volumeMounts:
            - name: db-persistent-storage
              mountPath: /var/lib/postgresql/data
  volumeClaimTemplates:
    - metadata:
        name: db-persistent-storage
      spec:
        accessModes: [ "ReadWriteOnce" ]
        resources:
          requests:
            storage: 5Gi # Adjust storage size as needed
```

#### **4.3 Kubernetes Deployment and Service for Backend (`kubernetes/backend.yaml`)**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: todo-backend
  labels:
    app: todo-backend
spec:
  replicas: 2 # Scale as needed
  selector:
    matchLabels:
      app: todo-backend
  template:
    metadata:
      labels:
        app: todo-backend
    spec:
      containers:
        - name: backend
          image: YOUR_DOCKER_HUB_USERNAME/todo-backend:latest # REPLACE with your image
          ports:
            - containerPort: 3001
          env:
            - name: PGUSER
              value: user
            - name: PGHOST
              value: todo-db # Service name for the database
            - name: PGDATABASE
              value: todoapp
            - name: PGPORT
              value: "5432"
            - name: PGPASSWORD
              valueFrom:
                secretKeyRef:
                  name: todo-db-secret
                  key: db_password
          resources: # Define resource requests/limits
            requests:
              memory: "64Mi"
              cpu: "100m"
            limits:
              memory: "128Mi"
              cpu: "200m"
---
apiVersion: v1
kind: Service
metadata:
  name: todo-backend
  labels:
    app: todo-backend
spec:
  selector:
    app: todo-backend
  ports:
    - protocol: TCP
      port: 3001
      targetPort: 3001
  type: ClusterIP # Internal service
```
**REPLACE `YOUR_DOCKER_HUB_USERNAME`**

#### **4.4 Kubernetes Deployment and Service for Frontend (`kubernetes/frontend.yaml`)**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: todo-frontend
  labels:
    app: todo-frontend
spec:
  replicas: 2 # Scale as needed
  selector:
    matchLabels:
      app: todo-frontend
  template:
    metadata:
      labels:
        app: todo-frontend
    spec:
      containers:
        - name: frontend
          image: YOUR_DOCKER_HUB_USERNAME/todo-frontend:latest # REPLACE with your image
          ports:
            - containerPort: 80
          env:
            - name: REACT_APP_API_URL
              value: http://todo-backend:3001 # Frontend talks to backend K8s service
          resources: # Define resource requests/limits
            requests:
              memory: "32Mi"
              cpu: "50m"
            limits:
              memory: "64Mi"
              cpu: "100m"
---
apiVersion: v1
kind: Service
metadata:
  name: todo-frontend
  labels:
    app: todo-frontend
spec:
  selector:
    app: todo-frontend
  ports:
    - protocol: TCP
      port: 80
      targetPort: 80
  type: NodePort # Or LoadBalancer if on cloud, or Ingress below
```
**REPLACE `YOUR_DOCKER_HUB_USERNAME`**

#### **4.5 Ingress for External Access (Optional, requires Ingress Controller like Nginx)**
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: todo-ingress
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
spec:
  rules:
    - host: YOUR_DOMAIN_OR_IP.nip.io # Or your actual domain
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: todo-frontend
                port:
                  number: 80
```
**REPLACE `YOUR_DOMAIN_OR_IP.nip.io`** (e.g., if master IP is `192.168.1.10`, use `192.168.1.10.nip.io`)
*You will need to install an Ingress Controller (e.g., Nginx Ingress Controller) into your cluster for this to work.* A quick way to install Nginx Ingress:
`kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.2/deploy/static/provider/cloud/deploy.yaml`

**Kubernetes Deployment Instructions:**
1.  Create a `kubernetes` directory in your project root. Copy all K8s YAML files into it.
2.  **Crucially, replace placeholders in `db-secret.yaml`, `backend.yaml`, `frontend.yaml`, and `ingress.yaml`.**
3.  From your master node (or local machine with `KUBECONFIG` set), run:
    ```bash
    kubectl apply -f kubernetes/db-secret.yaml
    kubectl apply -f kubernetes/postgres.yaml
    kubectl apply -f kubernetes/backend.yaml
    kubectl apply -f kubernetes/frontend.yaml
    # If you installed an Ingress Controller
    kubectl apply -f kubernetes/ingress.yaml
    ```
4.  **Verify:**
    *   `kubectl get pods` (all should be Running)
    *   `kubectl get svc` (check `todo-frontend` service and Ingress if deployed)
    *   `kubectl get ingress` (if Ingress is used)
    *   Access your application via the `NodePort` IP/Port or your Ingress URL.

---

### **Step 5: CI/CD Integration (GitHub Actions)**

This pipeline will:
1.  Build and test the backend.
2.  Build and test the frontend.
3.  Build Docker images for both.
4.  Push images to Docker Hub.
5.  Deploy updated images to Kubernetes.

**Assumptions:**
*   Your project is in a GitHub repository.
*   You have created Docker Hub credentials (username/password) as GitHub Secrets:
    *   `DOCKER_USERNAME`
    *   `DOCKER_PASSWORD`
*   You have access to your Kubernetes cluster from GitHub Actions:
    *   `KUBE_CONFIG_BASE64` (base64 encoded `~/.kube/config` file from your K8s master node).
        *   `cat ~/.kube/config | base64 -w 0` (on Linux/macOS)
        *   `Get-Content ~/.kube/config | Out-String -Width 1000 | % { [System.Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($_)) }` (on Windows PowerShell)

#### **`./.github/workflows/main.yml`**
```yaml
name: CI/CD for To-Do App

on:
  push:
    branches:
      - main
  pull_request:
    branches:
      - main

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Set up Node.js for Backend
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: backend/package-lock.json

      - name: Install Backend dependencies
        run: npm ci
        working-directory: ./backend

      - name: Build Backend (if needed, e.g. TypeScript compilation)
        run: echo "No build step for simple Node.js, running tests next"
        working-directory: ./backend

      - name: Run Backend tests (Example - if you had tests)
        run: echo "No tests configured for backend example"
        # run: npm test
        working-directory: ./backend

      - name: Set up Node.js for Frontend
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json

      - name: Install Frontend dependencies
        run: npm ci
        working-directory: ./frontend

      - name: Build Frontend
        run: npm run build
        working-directory: ./frontend
        env:
          REACT_APP_API_URL: /api # This will be rewritten by Ingress or handled by K8s service

      - name: Run Frontend tests (Example - if you had tests)
        run: echo "No tests configured for frontend example"
        # run: npm test
        working-directory: ./frontend

      - name: Log in to Docker Hub
        uses: docker/login-action@v2
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}

      - name: Build and push Backend Docker image
        id: docker_build_backend
        uses: docker/build-and-push-action@v4
        with:
          context: ./backend
          push: true
          tags: ${{ secrets.DOCKER_USERNAME }}/todo-backend:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

      - name: Build and push Frontend Docker image
        id: docker_build_frontend
        uses: docker/build-and-push-action@v4
        with:
          context: ./frontend
          push: true
          tags: ${{ secrets.DOCKER_USERNAME }}/todo-frontend:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

      - name: Set up Kubeconfig
        run: |
          mkdir -p ~/.kube
          echo "${{ secrets.KUBE_CONFIG_BASE64 }}" | base64 -d > ~/.kube/config
          chmod 600 ~/.kube/config

      - name: Deploy to Kubernetes
        run: |
          # Update backend image
          kubectl set image deployment/todo-backend backend=${{ secrets.DOCKER_USERNAME }}/todo-backend:${{ github.sha }} -n default
          # Update frontend image
          kubectl set image deployment/todo-frontend frontend=${{ secrets.DOCKER_USERNAME }}/todo-frontend:${{ github.sha }} -n default
```
**REPLACE `YOUR_DOCKER_HUB_USERNAME` in image tags within the workflow file.**

**CI/CD Setup Instructions:**
1.  Create a `.github/workflows` directory in your project root.
2.  Copy `main.yml` into that directory.
3.  **Crucially, go to your GitHub repository -> Settings -> Secrets and variables -> Actions.**
    *   Add a new repository secret named `DOCKER_USERNAME` with your Docker Hub username.
    *   Add a new repository secret named `DOCKER_PASSWORD` with your Docker Hub password/access token.
    *   Add a new repository secret named `KUBE_CONFIG_BASE64` with the base64 encoded content of your Kubernetes `admin.conf` file.
4.  Make a small change to your application code (e.g., `App.js`) and push to `main`. Observe the GitHub Actions pipeline run and deploy.

---

### **Final Considerations & Important Notes:**

*   **Security:** This example provides basic authentication for the database via Kubernetes Secrets. For production, consider advanced secret management solutions (e.g., HashiCorp Vault, cloud-specific secret managers). Ensure your Kubeconfig is secured.
*   **Error Handling & Monitoring:** Real-world applications require robust error handling, logging (e.g., Fluentd, Loki), and monitoring (e.g., Prometheus, Grafana).
*   **Persistent Storage:** The PostgreSQL setup uses a `PersistentVolumeClaim`. In a real cluster, you'd need a storage provisioner (CSI driver) configured to dynamically provision Persistent Volumes on your cloud or on-prem storage.
*   **Network Policies:** For enhanced security, implement Kubernetes Network Policies to control traffic between pods.
*   **Helm:** For managing complex Kubernetes deployments and application lifecycles, Helm is highly recommended over raw YAML for production.
*   **Testing:** Implement comprehensive unit, integration, and end-to-end tests for both your application and your infrastructure (e.g., using molecule for Ansible).
*   **Rollbacks:** While `kubectl set image` provides basic updates, Helm or GitOps tools (like Argo CD, Flux CD) offer more robust rollback strategies.
*   **Resource Management:** Carefully tune the `requests` and `limits` for CPU and memory in your Kubernetes deployments based on your application's actual needs.

This setup provides a solid foundation. Remember, the true learning comes from understanding each component and customizing it to your specific project needs! Good luck!