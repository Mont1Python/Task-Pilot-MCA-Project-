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