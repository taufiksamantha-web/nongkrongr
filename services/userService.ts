import { User } from '../types';

// NOTE: This is an in-memory user store for demonstration purposes.
// Changes will not persist across page reloads.
// In a real application, this would interact with a backend API.

const MOCK_USERS: User[] = [
    // FIX: Add missing 'email' property to conform to the User type.
    { id: 'u1', email: 'admin@nongkrongr.com', username: 'admin', password: '12345', role: 'admin' },
    // FIX: Add missing 'email' property to conform to the User type.
    { id: 'u2', email: 'user1@example.com', username: 'user1', password: 'password', role: 'user' },
    // FIX: Add missing 'email' property to conform to the User type.
    { id: 'u3', email: 'user2@example.com', username: 'user2', password: 'password', role: 'user' },
];

let users: User[] = [...MOCK_USERS]; 

export const userService = {
  getUsers: (): User[] => {
    return users;
  },

  addUser: (user: Omit<User, 'id'>): User[] => {
    const newUser: User = {
        ...user,
        id: `u${Date.now()}`,
    };
    // Re-assign to a new array instead of mutating the existing one
    users = [...users, newUser];
    return users;
  },
  
  updateUser: (id: string, updatedData: Partial<User>): User[] => {
     const userIndex = users.findIndex(u => u.id === id);
     if (userIndex > -1) {
        users[userIndex] = { ...users[userIndex], ...updatedData };
     }
     return [...users];
  },
  
  deleteUser: (id: string): User[] => {
     users = users.filter(u => u.id !== id);
     return [...users];
  },

  authenticate: (username: string, password: string): User | null => {
    const user = users.find(u => u.username === username && u.password === password);
    return user || null;
  }
};