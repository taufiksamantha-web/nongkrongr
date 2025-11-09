import { MOCK_USERS } from '../constants';
import { User } from '../types';

// NOTE: This is an in-memory user store for demonstration purposes.
// Changes will not persist across page reloads.
// In a real application, this would interact with a backend API.
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
    users.push(newUser);
    return [...users];
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
