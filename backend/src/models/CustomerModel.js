import db from "../config/db.js";

// Get all customers
export async function getAllCustomers() {
  const [rows] = await db.execute(
    `SELECT id, full_name, country_code, mobile_number, email, created_at, updated_at
     FROM customers
     ORDER BY id DESC`
  );
  return rows;
}

// Get single customer
export async function getCustomerById(id) {
  const [[row]] = await db.execute(
    `SELECT id, full_name, country_code, mobile_number, email
     FROM customers
     WHERE id = ?`,
    [id]
  );
  return row;
}

// Add a new customer
export async function createCustomer(full_name, country_code, mobile_number, email, passwordHash) {
  const [result] = await db.execute(
    `INSERT INTO customers 
     (full_name, country_code, mobile_number, email, password, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
    [full_name, country_code, mobile_number, email, passwordHash]
  );
  return result.insertId;
}

// Update customer info
export async function updateCustomer(id, updates) {
  const fields = [];
  const params = [];

  if (updates.full_name) {
    fields.push("full_name = ?");
    params.push(updates.full_name);
  }
  if (updates.country_code) {
    fields.push("country_code = ?");
    params.push(updates.country_code);
  }
  if (updates.mobile_number) {
    fields.push("mobile_number = ?");
    params.push(updates.mobile_number);
  }
  if (updates.email) {
    fields.push("email = ?");
    params.push(updates.email);
  }
  if (updates.password) {
    fields.push("password = ?");
    params.push(updates.password);
  }

  if (!fields.length) return false;

  params.push(id);

  const sql = `UPDATE customers 
               SET ${fields.join(", ")}, updated_at = NOW()
               WHERE id = ?`;
  await db.execute(sql, params);
  return true;
}

// Delete permanently
export async function deleteCustomer(id) {
  await db.execute(`DELETE FROM customers WHERE id = ?`, [id]);
  return true;
}
