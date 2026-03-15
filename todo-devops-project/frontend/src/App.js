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