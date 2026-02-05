// src/utils/utilityFunctions.js

// --- 1. EMAIL VALIDATOR ---
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// --- 2. PASSWORD VALIDATOR ---
export const validatePassword = (password) => {
  return !!(password && password.length >= 6);
};

export const validateStrongPassword = (password) => {
  // Minimal 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
  const regex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  return regex.test(password);
};

// --- 3. NUMBER PARSER ---
export const parseNumber = (value) => {
  const num = parseFloat(value);
  return isNaN(num) ? 0 : num;
};

export const parseInteger = (value) => {
  const num = parseInt(value, 10);
  return isNaN(num) ? 0 : num;
};

// --- 4. DATE VALIDATOR ---
export const isValidDate = (dateString) => {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date);
};

export const formatDate = (date) => {
  return new Date(date).toISOString().split("T")[0];
};

// --- 5. UNIT NAME VALIDATOR ---
export const validateUnitName = (name) => {
  return !!(name && name.trim().length > 0 && name.trim().length <= 100);
};

export const sanitizeUnitName = (name) => {
  return name.trim().replace(/\s+/g, " ");
};

// --- 6. GAS VALUE RANGE VALIDATOR ---
export const validateGasValue = (value, min = 0, max = 10000) => {
  const num = parseFloat(value);
  return !isNaN(num) && num >= min && num <= max;
};

export const clampGasValue = (value, min = 0, max = 10000) => {
  const num = parseFloat(value);
  if (isNaN(num)) return 0;
  return Math.max(min, Math.min(max, num));
};

// --- 7. STATUS CODE MAPPER ---
export const getStatusText = (code) => {
  const statusMap = {
    1: "Normal",
    2: "Waspada",
    3: "Bahaya",
  };
  return statusMap[code] || "Unknown";
};

export const getStatusColor = (code) => {
  const colorMap = {
    1: "#10b981", // green
    2: "#f59e0b", // amber
    3: "#ef4444", // red
  };
  return colorMap[code] || "#6b7280"; // gray
};

// --- 8. ARRAY UTILITIES ---
export const sortByProperty = (arr, prop, ascending = true) => {
  return [...arr].sort((a, b) => {
    const aVal = a[prop];
    const bVal = b[prop];
    const comparison = aVal > bVal ? 1 : -1;
    return ascending ? comparison : -comparison;
  });
};

export const filterByRole = (users, role) => {
  return users.filter((user) => user.role === role);
};

export const groupByRole = (users) => {
  return users.reduce((acc, user) => {
    if (!acc[user.role]) {
      acc[user.role] = [];
    }
    acc[user.role].push(user);
    return acc;
  }, {});
};

// --- 9. OBJECT UTILITIES ---
export const mergeObjects = (obj1, obj2) => {
  return { ...obj1, ...obj2 };
};

export const pickProperties = (obj, keys) => {
  return keys.reduce((acc, key) => {
    if (key in obj) {
      acc[key] = obj[key];
    }
    return acc;
  }, {});
};

export const hasAllProperties = (obj, keys) => {
  return keys.every((key) => key in obj);
};

// --- 10. STRING UTILITIES ---
export const capitalizeString = (str) => {
  return str.charAt(0).toUpperCase() + str.slice(1);
};

export const truncateString = (str, maxLength) => {
  return str.length > maxLength ? str.substring(0, maxLength) + "..." : str;
};

export const escapeHTML = (str) => {
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return str.replace(/[&<>"']/g, (m) => map[m]);
};

// --- 11. ERROR HANDLING UTILITIES ---
export const safeExecute = (fn, defaultValue) => {
  try {
    return fn();
  } catch (error) {
    console.error(error); // Bisa diganti dengan logger service
    return defaultValue;
  }
};

export const validateInput = (input) => {
  if (!input) {
    throw new Error("Input is required");
  }
  if (typeof input !== "string") {
    throw new Error("Input must be a string");
  }
  if (input.trim().length === 0) {
    throw new Error("Input cannot be empty");
  }
  return true;
};
